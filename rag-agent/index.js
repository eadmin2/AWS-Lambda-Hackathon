import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { createClient } from "@supabase/supabase-js";
import { getUserConditions } from './lib/supabase.js';
import { generateRecommendation } from './lib/bedrock.js';
import { getCFRData, generateCFRLink } from './lib/cfr-processor.js';
import { 
    formatConditionResponse, 
    createErrorResponse, 
    createSuccessResponse 
} from './utils/helpers.js';
import { SQSClient } from "@aws-sdk/client-sqs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

// Bedrock Agent configuration
const bedrockAgentClient = new BedrockAgentRuntimeClient({ region: "us-east-2" });
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

const AGENT_ID = process.env.BEDROCK_AGENT_ID;
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID;

if (!AGENT_ID || !AGENT_ALIAS_ID) {
  throw new Error(
    "Missing required environment variables: BEDROCK_AGENT_ID and/or BEDROCK_AGENT_ALIAS_ID must be set."
  );
}

const sqs = new SQSClient({ region: AWS_REGION });

// Configuration for batch processing
const CHUNK_BATCH_SIZE = 3; // Process 3 chunks per Bedrock call for efficiency

// Helper function to parse Bedrock Agent responses and extract conditions
const parseAgentResponse = (response) => {
  try {
    console.log("Raw agent response:", response.substring(0, 1000)); // Log first 1000 chars for debugging
    
    let jsonStr = null;

    // 1. Try to find a JSON markdown block first
    const markdownMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      jsonStr = markdownMatch[1];
      console.log("Found JSON in markdown block.");
    } else {
      // 2. If not found, try to find a raw JSON object
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
        console.log("Found raw JSON object.");
      }
    }

    if (jsonStr) {
      // Clean the string to remove potential non-standard characters (like trailing commas)
      const cleanedJsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
      console.log("Attempting to parse JSON:", cleanedJsonStr.substring(0, 500));
      
      const parsed = JSON.parse(cleanedJsonStr);
      if (parsed.conditions && Array.isArray(parsed.conditions)) {
        console.log(`✅ Successfully parsed ${parsed.conditions.length} conditions from JSON`);
        return parsed;
      } else {
        console.warn("❌ Parsed JSON but no conditions array found:", Object.keys(parsed));
      }
    }
    
    // If no JSON found, try to extract conditions from text
    // This is a fallback for when the agent doesn't return structured JSON
    console.warn("⚠️ Could not find valid JSON in agent response. Falling back to text parsing.");
    console.log("Response to parse:", response);
    
    const conditions = [];
    
    // Look for common medical condition patterns in the text
    const medicalPatterns = [
      /(?:diagnosed with|diagnosis of|suffering from|treated for|condition:)\s*([^.\n]+)/gi,
      /(?:pain in|injury to|surgery on|therapy for)\s*([^.\n]+)/gi,
      /(?:chronic|acute|severe|mild)\s+([a-zA-Z\s]+?)(?:\s|,|\.)/gi
    ];
    
    for (const pattern of medicalPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const conditionName = match[1].trim();
        if (conditionName.length > 3 && conditionName.length < 100) { // Basic validation
          conditions.push({
            name: conditionName,
            rating: 10,
            severity: 'mild',
            excerpt: match[0],
            cfrCriteria: 'TBD',
            keywords: conditionName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
          });
        }
      }
    }
    
    // Remove duplicates
    const uniqueConditions = conditions.filter((condition, index, self) => 
      index === self.findIndex(c => c.name.toLowerCase() === condition.name.toLowerCase())
    );
    
    console.log(`📝 Text parsing fallback found ${uniqueConditions.length} potential conditions`);
    return { conditions: uniqueConditions };
    
  } catch (error) {
    console.error("💥 Error parsing agent response:", error);
    console.error("🔍 Original response that failed parsing:", response); // Log the problematic response
    return { conditions: [] }; // Return empty array instead of null
  }
};

// Enhanced condition normalization for better deduplication
function normalizeConditionName(name) {
  if (!name) return 'unknown';
  
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\b(left|right|bilateral|l|r)\b/g, '') // Remove laterality
    .replace(/\b(chronic|acute|severe|mild|moderate)\b/g, '') // Remove severity modifiers
    .trim();
}

// Enhanced similarity check for better deduplication
function areConditionsSimilar(name1, name2) {
  const norm1 = normalizeConditionName(name1);
  const norm2 = normalizeConditionName(name2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // Check if one contains the other (for variants)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Check for common medical synonyms
  const synonyms = {
    'tinnitus': ['ringing ears', 'ear ringing'],
    'ptsd': ['post traumatic stress', 'posttraumatic stress'],
    'anxiety': ['anxious', 'panic'],
    'depression': ['depressive', 'mood disorder'],
    'sleep apnea': ['sleep disorder', 'breathing disorder'],
    'hypertension': ['high blood pressure', 'elevated blood pressure']
  };

  for (const [key, values] of Object.entries(synonyms)) {
    if ((norm1.includes(key) || values.some(v => norm1.includes(v))) &&
        (norm2.includes(key) || values.some(v => norm2.includes(v)))) {
      return true;
    }
  }

  return false;
}

// Simplified RAG Agent Handler - only processes work messages
export const handler = async (event) => {
  try {
    console.log("Event received:", JSON.stringify(event, null, 2));

    // Handle SQS event trigger - now only receives RAG work messages
    if (event.Records && event.Records[0] && event.Records[0].eventSource === "aws:sqs") {
      console.log("✅ SQS work message detected. Processing document...");

      const sqsRecord = event.Records[0];
      const body = JSON.parse(sqsRecord.body);
      console.log("RAG Work Message:", body);

      // This queue now ONLY receives RAG work messages with user_id and document_id
      const { user_id, document_id, source } = body;

      if (!user_id || !document_id) {
        console.error("❌ Invalid work message format:", body);
        return createErrorResponse(400, "Invalid work message format");
      }

      console.log(`🚀 Processing document ${document_id} for user ${user_id} (source: ${source || 'unknown'})`);
      return await processDocument(user_id, document_id);
    }

    // Handle Bedrock Agent function calls
    if (event.messageVersion && event.function && event.agent) {
      console.log("🤖 Bedrock Agent function call detected");
      return await handleBedrockAgentCall(event);
    }

    // --- Handle API Gateway / Direct Invocation ---
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    const routeKey = event.routeKey;
    const pathParameters = event.pathParameters;

    if (httpMethod === "POST" && (routeKey === "POST /rag-agent/{userId}/reprocess" || event.resource === "/rag-agent/{userId}/reprocess")) {
      const userId = pathParameters?.userId || event.pathParameters?.userId;
      const { document_id } = JSON.parse(event.body);
      console.log(`📋 API reprocess call for user ${userId} and document ${document_id}`);
      return await processDocument(userId, document_id);
    }

    if (httpMethod === "GET" && (routeKey === "GET /rag-agent/{userId}" || event.resource === "/rag-agent/{userId}")) {
      const userId = pathParameters?.userId || event.pathParameters?.userId;
      console.log(`📋 GET request for user ${userId} conditions`);

      const { data, error } = await supabase
        .from("user_conditions")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return createSuccessResponse(data);
    }

    console.error("❓ Invalid endpoint or event type");
    return createErrorResponse(400, "Invalid endpoint or event type");

  } catch (error) {
    console.error("💥 Handler error:", error);
    return createErrorResponse(500, error.message);
  }
};

// Handle Bedrock Agent calls
async function handleBedrockAgentCall(event) {
  const { function: functionName, parameters, agent, sessionId } = event;
  
  console.log(`Bedrock Agent calling function: ${functionName}`);
  console.log(`Agent ID: ${agent.id}, Alias: ${agent.alias}`);
  console.log(`Parameters:`, parameters);

  try {
    if (functionName === 'searchCFR') {
      // Extract search query from parameters
      const searchQueryParam = parameters.find(p => p.name === 'searchQuery');
      const searchQuery = searchQueryParam ? searchQueryParam.value : '';
      
      console.log(`Searching CFR for: ${searchQuery}`);
      
      // Call your eCFR Lambda function
      const cfrResult = await getCFRData({
        name: searchQuery,
        keywords: searchQuery.split(' ')
      });
      
      // Format response for Bedrock Agent
      let responseText = '';
      if (cfrResult && cfrResult.sections) {
        responseText = `Found ${cfrResult.sections.length} CFR sections related to "${searchQuery}":\n\n`;
        cfrResult.sections.slice(0, 3).forEach(section => {
          responseText += `**38 CFR § ${section.identifier}** - ${section.label}\n`;
          if (section.content) {
            responseText += `${section.content.substring(0, 200)}...\n\n`;
          }
        });
      } else {
        responseText = `No specific CFR sections found for "${searchQuery}". This condition may need manual review or may fall under general disability rating criteria.`;
      }

      // Return in Bedrock Agent format
      return {
        messageVersion: "1.0",
        response: {
          actionGroup: event.actionGroup,
          function: functionName,
          functionResponse: {
            responseBody: {
              "TEXT": {
                "body": responseText
              }
            }
          }
        }
      };
    }
    
    // Handle other functions if needed
    throw new Error(`Unknown function: ${functionName}`);
    
  } catch (error) {
    console.error(`Error in Bedrock Agent function ${functionName}:`, error);
    
    return {
      messageVersion: "1.0",
      response: {
        actionGroup: event.actionGroup,
        function: functionName,
        functionResponse: {
          responseBody: {
            "TEXT": {
              "body": `Error processing ${functionName}: ${error.message}`
            }
          }
        }
      }
    };
  }
}

// Enhanced document processing with batch optimization
async function processDocument(userId, documentId) {
    console.log(`Processing document ${documentId} for user ${userId}`);
    const startTime = Date.now();

    // Get document metadata and chunks
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, file_name, total_chunks, total_pages, textract_confidence, processing_status")
      .eq("id", documentId)
      .single();

    if (docError) {
      console.error("Error fetching document:", docError);
      return createErrorResponse(500, "Failed to fetch document metadata.");
    }
    console.log("Document metadata:", document);

    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, content, page_number")
      .eq("document_id", documentId)
      .order("page_number");

    if (chunksError) {
      console.error("Error fetching chunks:", chunksError);
      return createErrorResponse(500, "Failed to fetch document chunks.");
    }
    console.log(`Found ${chunks.length} document chunks`);

    if (chunks.length === 0) {
      console.log("No chunks found for this document. Nothing to process.");
      return createSuccessResponse({ message: "No content to process." });
    }

    // Process chunks in batches
    const chunkBatches = [];
    for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
      chunkBatches.push(chunks.slice(i, i + CHUNK_BATCH_SIZE));
    }
    console.log(`Processing ${chunks.length} chunks in ${chunkBatches.length} batches`);

    let allConditions = [];
    for (let i = 0; i < chunkBatches.length; i++) {
        const batch = chunkBatches[i];
        const progress = Math.round(((i + 1) / chunkBatches.length) * 100);
        console.log(`Processing batch ${i + 1}/${chunkBatches.length} (chunks ${batch[0].page_number-1}-${batch[batch.length-1].page_number-1})`);

        const batchText = batch.map(c => `Page ${c.page_number}: ${c.content}`).join('\\n\\n');

        // --- REVISED PROMPT TO AVOID GUARDRAILS ---
        const prompt = `
          Analyze the following document excerpts and extract any phrases that appear to be medical conditions, diagnoses, or symptoms. 
          
          For each identified phrase, format it as a JSON object with the following keys: "name", "rating", "severity", "excerpt", "cfrCriteria", and "keywords".
          
          - "name": The name of the condition.
          - "rating": An estimated rating if mentioned, otherwise default to 10.
          - "severity": "mild", "moderate", or "severe". If not mentioned, default to "mild".
          - "excerpt": The exact text from the document where the condition was found.
          - "cfrCriteria": The Code of Federal Regulations citation, if available.
          - "keywords": A list of keywords related to the condition.
          
          Document Excerpts:
          """
          ${batchText}
          """
          
          Your entire response must be a single JSON object. Do not include any other text.
          The structure should be:
          {
            "conditions": [
              {
                "name": "Example Condition",
                "rating": 10,
                "severity": "mild",
                "excerpt": "...",
                "cfrCriteria": "38 CFR §X.XX",
                "keywords": ["example"]
              }
            ]
          }
        `;

        const command = new InvokeAgentCommand({
            agentId: AGENT_ID,
            agentAliasId: AGENT_ALIAS_ID,
            sessionId: `${userId}-${documentId}-${i}`,
            inputText: prompt,
        });

        try {
            const agentResponse = await bedrockAgentClient.send(command);
            let fullResponse = '';
            for await (const item of agentResponse.completion) {
                if (item.chunk?.bytes) {
                    fullResponse += new TextDecoder().decode(item.chunk.bytes);
                }
            }

            console.log(`Agent response for batch ${i}:`, fullResponse);
            const parsed = parseAgentResponse(fullResponse);

            if (parsed && parsed.conditions) {
                console.log(`Found ${parsed.conditions.length} conditions in batch ${i}`);
                allConditions = allConditions.concat(parsed.conditions);
            }
            console.log(`Progress: ${progress}% (${(i + 1) * CHUNK_BATCH_SIZE}/${chunks.length} chunks)`);
        } catch (err) {
            console.error(`Error processing batch ${i}:`, err);
            // Optional: Implement retry logic here if needed
        }
    }

    console.log(`Found a total of ${allConditions.length} conditions across all chunks (before deduplication).`);

    // Enhanced deduplication logic
    const uniqueConditions = [];
    allConditions.forEach(condition => {
        const existingCondition = uniqueConditions.find(uc => areConditionsSimilar(uc.name, condition.name));
        if (!existingCondition) {
            uniqueConditions.push(condition);
        } else {
            console.log(`Deduplicating: "${condition.name}" (similar to existing condition)`);
            // Merge excerpts or keywords if desired
            existingCondition.excerpt += ` | ${condition.excerpt}`;
            if(condition.keywords) {
              existingCondition.keywords = [...new Set([...(existingCondition.keywords || []), ...condition.keywords])];
            }
        }
    });

    console.log(`Found ${uniqueConditions.length} unique conditions after enhanced deduplication.`);

    // Final processing and database insertion
    const finalConditions = [];
    for (const condition of uniqueConditions) {
        console.log(`Getting CFR data for condition: ${condition.name}`);
        try {
            // Pass the full condition object to getCFRData
            const cfrData = await getCFRData(condition);
            const enrichedCondition = {
                ...condition,
                body_system: cfrData.bodySystem || 'general', // Get body system from CFR data
                cfr_data: cfrData,
                cfr_link: generateCFRLink(cfrData),
            };
            finalConditions.push(enrichedCondition);
        } catch (cfrError) {
            console.error(`Could not get CFR data for ${condition.name}:`, cfrError);
            finalConditions.push({ ...condition, cfr_data: null, cfr_link: null }); // Add condition even if CFR lookup fails
        }
    }

    if (finalConditions.length > 0) {
        // Insert into user_conditions table (existing functionality)
        const userConditionsPayload = finalConditions.map(c => ({
            user_id: userId,
            name: c.name,
            summary: c.excerpt, // Using excerpt as summary
            body_system: c.body_system || 'general', // Fallback for body_system
            keywords: c.keywords,
            rating: c.rating,
            cfr_criteria: c.cfrCriteria,
        }));

        console.log("🗃️ Preparing to insert into user_conditions:", JSON.stringify(userConditionsPayload, null, 2));

        const { error: upsertError } = await supabase
            .from("user_conditions")
            .upsert(userConditionsPayload, { onConflict: 'user_id, name' });

        if (upsertError) {
            console.error("❌ Error upserting conditions into user_conditions:", upsertError);
            return createErrorResponse(500, "Failed to store analysis results.");
        }

        // ALSO insert into disability_estimates table (for detailed report page)
        const disabilityEstimatesPayload = finalConditions.map(c => ({
            document_id: documentId,
            user_id: userId,
            condition: c.name,
            condition_display: c.name,
            estimated_rating: c.rating || 10,
            combined_rating: Math.max(...finalConditions.map(cond => cond.rating || 10)),
            cfr_criteria: c.cfrCriteria,
            excerpt: c.excerpt,
            matched_keywords: c.keywords,
            severity: c.severity || 'mild',
            created_at: new Date().toISOString()
        }));

        console.log("🗃️ Preparing to insert into disability_estimates:", JSON.stringify(disabilityEstimatesPayload, null, 2));

        const { data: insertedData, error: disabilityEstimatesError } = await supabase
            .from("disability_estimates")
            .upsert(disabilityEstimatesPayload, { 
                onConflict: 'user_id, document_id, condition',
                ignoreDuplicates: false 
            })
            .select();

        if (disabilityEstimatesError) {
            console.error("❌ Error upserting conditions into disability_estimates:", disabilityEstimatesError);
            console.error("❌ Failed payload:", JSON.stringify(disabilityEstimatesPayload, null, 2));
            return createErrorResponse(500, "Failed to store detailed analysis results.");
        }

        console.log(`✅ Successfully inserted ${finalConditions.length} conditions into user_conditions table`);
        console.log(`✅ Successfully inserted ${insertedData?.length || 0} conditions into disability_estimates table`);
        console.log(`📊 Inserted data:`, JSON.stringify(insertedData, null, 2));
    }

    // Update document status to 'completed'
    await supabase
        .from("documents")
        .update({ processing_status: 'completed', rag_status: 'completed' })
        .eq("id", documentId);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Document processing complete in ${duration}s. Found ${finalConditions.length} unique conditions.`);

    return createSuccessResponse({
        message: "Document processed successfully",
        uniqueConditionsFound: finalConditions.length,
        conditions: finalConditions
    });
}

// Main processing function
async function processAllConditions(userId) {
    const conditions = await getUserConditions(userId);

    if (!conditions || conditions.length === 0) {
        return createSuccessResponse({
            message: 'No conditions found for user',
            conditions: []
        });
    }

    console.log(`Found ${conditions.length} conditions for user`);

    const processedConditions = [];

    for (const condition of conditions) {
        try {
            console.log(`Processing condition: ${condition.name}`);

            let cfrData = null;
            try {
                if (condition.keywords && Array.isArray(condition.keywords) && condition.keywords.length > 0) {
                    cfrData = await getCFRData(condition);
                }
            } catch (cfrError) {
                console.error(`Error getting CFR data for condition ${condition.name}:`, cfrError);
            }

            const recommendation = await generateRecommendation(condition, cfrData);
            const formattedCondition = formatConditionResponse(condition, cfrData, recommendation);

            processedConditions.push(formattedCondition);

        } catch (conditionError) {
            console.error(`Error processing condition ${condition.name}:`, conditionError);

            processedConditions.push({
                id: condition.id,
                title: condition.name,
                error: 'Failed to process condition',
                errorDetails: conditionError.message
            });
        }
    }

    return createSuccessResponse({
        userId,
        totalConditions: conditions.length,
        processedConditions: processedConditions.length,
        conditions: processedConditions
    });
}

// Handle single condition lookup
async function handleSingleCondition(userId, conditionId) {
    const { data, error } = await supabase
        .from('user_conditions')
        .select('*')
        .eq('user_id', userId)
        .eq('id', conditionId)
        .single();

    if (error || !data) {
        return createErrorResponse(404, 'Condition not found');
    }

    try {
        let cfrData = null;
        try {
            if (data.matched_keywords && Array.isArray(data.matched_keywords) && data.matched_keywords.length > 0) {
                cfrData = await getCFRData({
                  name: data.condition_display,
                  keywords: data.matched_keywords
                });
            }
        } catch (cfrError) {
            console.error(`Error getting CFR data:`, cfrError);
        }

        const recommendation = await generateRecommendation(data, cfrData);
        const formattedCondition = formatConditionResponse(data, cfrData, recommendation);

        return createSuccessResponse(formattedCondition);
    } catch (error) {
        return createErrorResponse(500, 'Error processing condition: ' + error.message);
    }
}

// Handle reprocessing request
async function handleReprocess(userId) {
    return await processAllConditions(userId);
}