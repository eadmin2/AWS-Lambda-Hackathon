import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { createClient } from "@supabase/supabase-js";
import { getUserConditions } from './lib/supabase.js';
import { generateRecommendation } from './lib/bedrock.js';
import { getCFRData, generateCFRLink } from './lib/cfr-processor.js';
import { 
    validateUserId, 
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
const MAX_RETRIES = 2; // Retry failed chunks

// Helper function to parse Bedrock's response and extract conditions
const parseBedrockResponse = (response) => {
  try {
    // Remove any non-JSON content from the response
    const jsonStr = response.match(/\{[\s\S]*\}/)[0];
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error parsing Bedrock response:", error);
    return null;
  }
};

// Enhanced helper function to parse Bedrock Agent responses and extract conditions
const parseAgentResponse = (response) => {
  try {
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
      
      const parsed = JSON.parse(cleanedJsonStr);
      if (parsed.conditions && Array.isArray(parsed.conditions)) {
        return parsed;
      }
    }
    
    // If no JSON found, try to extract conditions from text
    // This is a fallback for when the agent doesn't return structured JSON
    console.warn("Could not find valid JSON in agent response. Falling back to text parsing.", { response });
    const conditions = [];
    const lines = response.split('\n');
    let currentCondition = null;
    
    for (const line of lines) {
      if (line.includes('condition:') || line.includes('name:')) {
        if (currentCondition) {
          conditions.push(currentCondition);
        }
        currentCondition = { 
          name: line.split(':')[1]?.trim() || 'Unknown Condition',
          keywords: [],
          severity: 'mild'
        };
      } else if (line.includes('rating:') && currentCondition) {
        const ratingMatch = line.match(/(\d+)%?/);
        currentCondition.rating = ratingMatch ? parseInt(ratingMatch[1]) : 10;
      } else if (line.includes('severity:') && currentCondition) {
        currentCondition.severity = line.split(':')[1]?.trim() || 'mild';
      } else if (line.includes('excerpt:') && currentCondition) {
        currentCondition.excerpt = line.split(':')[1]?.trim() || '';
      }
    }
    
    if (currentCondition) {
      conditions.push(currentCondition);
    }
    
    return { conditions };
  } catch (error) {
    console.error("Error parsing agent response:", error);
    console.error("Original response that failed parsing:", response); // Log the problematic response
    return { conditions: [] }; // Return empty array instead of null
  }
};

// Helper function to calculate VA disability rating
const calculateRating = (keywords, severity) => {
  const baseRatings = {
    mild: 10,
    moderate: 30,
    severe: 50,
    total: 100
  };
  
  // Enhanced rating calculation based on keywords
  let rating = baseRatings[severity] || 10;
  
  // Boost rating for certain serious conditions
  if (keywords && Array.isArray(keywords)) {
    const keywordStr = keywords.join(' ').toLowerCase();
    if (keywordStr.includes('ptsd') || keywordStr.includes('traumatic')) rating = Math.max(rating, 50);
    if (keywordStr.includes('cancer') || keywordStr.includes('malignant')) rating = Math.max(rating, 100);
    if (keywordStr.includes('amputation') || keywordStr.includes('paralysis')) rating = Math.max(rating, 70);
  }
  
  return Math.min(rating, 100); // Cap at 100%
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

    // 🆕 ADD THIS: Handle Bedrock Agent function calls
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
        .from("disability_estimates")
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

// 🆕 ADD THIS FUNCTION: Handle Bedrock Agent calls
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
    
    // Fetch existing conditions for the user to deduplicate against
    const { data: existingUserConditions, error: fetchError } = await supabase
      .from("user_conditions")
      .select("*") // Select all fields to preserve them
      .eq("user_id", userId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error("Warning: Could not fetch existing user conditions. Deduplication will only occur within the document.", fetchError);
    }
    
    const combinedConditions = [
        ...(existingUserConditions || []), 
        ...allConditions.map(c => ({...c, isNew: true})) // Tag new conditions
    ];

    console.log(`Analyzing a total of ${combinedConditions.length} conditions (existing + new).`);

    // Enhanced deduplication logic using a map for O(n) complexity
    const conditionMap = new Map();

    for (const condition of combinedConditions) {
        const normalizedName = normalizeConditionName(condition.name);
        const existing = conditionMap.get(normalizedName);

        if (!existing) {
            // First time seeing this normalized condition
            conditionMap.set(normalizedName, {
                ...condition,
                isModified: condition.isNew || false,
                name_normalized: normalizedName,
            });
        } else {
            // This is a duplicate, merge it into the existing entry
            console.log(`Deduplicating: "${condition.name}" is a variant of "${existing.name}". Merging.`);
            
            // Merge logic: Combine summaries, keywords, and take the highest rating
            if (condition.summary && !(existing.summary || '').includes(condition.summary)) {
                existing.summary = (existing.summary ? existing.summary + ' | ' : '') + condition.summary;
                existing.isModified = true;
            }
            if (condition.keywords && condition.keywords.length > 0) {
                const originalKeywordCount = (existing.keywords || []).length;
                existing.keywords = [...new Set([...(existing.keywords || []), ...condition.keywords])];
                if (existing.keywords.length > originalKeywordCount) {
                    existing.isModified = true;
                }
            }
            if ((condition.rating || 0) > (existing.rating || 0)) {
                existing.rating = condition.rating;
                existing.isModified = true;
            }
            
            // If we are merging a new condition into an existing one, mark the master as modified.
            if (condition.isNew) {
                existing.isModified = true;
            }
        }
    }

    const uniqueConditions = Array.from(conditionMap.values());
    const finalConditionCount = uniqueConditions.length;
    console.log(`Resulting in ${finalConditionCount} unique conditions after deduplication.`);
    
    // Now, let's enrich all unique conditions, not just modified ones.
    // This ensures existing records get enriched if they are missing data.
    const conditionsToProcess = uniqueConditions;
    console.log(`Enriching all ${conditionsToProcess.length} unique conditions.`);

    const finalConditions = [];
    for (const condition of conditionsToProcess) {
        console.log(`Enriching data for condition: ${condition.name}`);
        try {
            const cfrData = await getCFRData(condition);
            const recommendation = await generateRecommendation(condition, cfrData);
            
            const enrichedCondition = {
                ...condition,
                name_normalized: normalizeConditionName(condition.name),
                body_system: cfrData.bodySystem || 'general',
                cfr_data: cfrData,
                cfr_link: generateCFRLink(cfrData),
                recommendation: recommendation,
            };
            finalConditions.push(enrichedCondition);
        } catch (err) {
            console.error(`Could not fully process condition ${condition.name}:`, err);
            finalConditions.push({ 
              ...condition, 
              recommendation: {
                rating_explanation: "Could not generate a full recommendation due to an error.",
                cfr_link: "",
                tooltip_definitions: [],
                confidence_indicator: { score: "Low", reasoning: `An error occurred during processing: ${err.message}` },
                disclaimer: "This is a non-medical recommendation based on your documents. Consult a VSO or licensed expert before filing."
              }
            });
        }
    }

    if (finalConditions.length > 0) {
        const dbPayloads = finalConditions.map(c => ({
            id: c.id, // Will be undefined for new conditions
            user_id: userId,
            name: c.name,
            name_normalized: c.name_normalized,
            summary: c.summary,
            body_system: c.body_system || 'general',
            keywords: c.keywords,
            rating: c.rating,
            cfr_criteria: c.cfrCriteria,
            recommendation: c.recommendation, // Save the detailed recommendation
        }));

        // Upsert handles both inserts and updates in one go
        console.log(`Upserting ${dbPayloads.length} new/modified conditions.`);
        const { error: upsertError } = await supabase
            .from("user_conditions")
            .upsert(dbPayloads, { onConflict: 'user_id, name_normalized' });

        if (upsertError) {
            console.error("Error upserting conditions into DB:", upsertError);
            // Don't halt, still try to delete duplicates
        }
    }

    // Update document status to 'completed'
    await supabase
        .from("documents")
        .update({ processing_status: 'completed', rag_status: 'completed' })
        .eq("id", documentId);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Document processing and consolidation complete in ${duration}s. Final condition count: ${finalConditionCount}.`);

    return createSuccessResponse({
        message: "Document processed and conditions consolidated successfully",
        uniqueConditionsFound: finalConditionCount,
        conditions: uniqueConditions // Return the final clean list
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
        .from('disability_estimates')
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