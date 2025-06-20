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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

// Bedrock Agent configuration
const bedrockAgentClient = new BedrockAgentRuntimeClient({ region: "us-east-2" });
const AGENT_ID = process.env.BEDROCK_AGENT_ID || "S9KQ4LEVEI";
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID || "YKOOLY6ZHJ";

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

// Helper function to parse Bedrock Agent responses and extract conditions
const parseAgentResponse = (response) => {
  try {
    // The agent might return JSON directly or wrapped in markdown
    // First, try to find JSON in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no JSON found, try to extract conditions from text
    // This is a fallback for when the agent doesn't return structured JSON
    const conditions = [];
    const lines = response.split('\n');
    let currentCondition = null;
    
    for (const line of lines) {
      if (line.includes('condition:') || line.includes('name:')) {
        if (currentCondition) {
          conditions.push(currentCondition);
        }
        currentCondition = { name: line.split(':')[1]?.trim() || 'Unknown Condition' };
      } else if (line.includes('rating:') && currentCondition) {
        const ratingMatch = line.match(/(\d+)%/);
        currentCondition.rating = ratingMatch ? parseInt(ratingMatch[1]) : 10;
      } else if (line.includes('severity:') && currentCondition) {
        currentCondition.severity = line.split(':')[1]?.trim() || 'mild';
      }
    }
    
    if (currentCondition) {
      conditions.push(currentCondition);
    }
    
    return { conditions };
  } catch (error) {
    console.error("Error parsing agent response:", error);
    return null;
  }
};

// Helper function to calculate VA disability rating
const calculateRating = (symptoms, severity) => {
  // This is a simplified version - you might want to make this more sophisticated
  const baseRatings = {
    mild: 10,
    moderate: 30,
    severe: 50,
    total: 100
  };
  return baseRatings[severity] || 10;
};

function normalizeConditionName(name) {
  return name.trim().toLowerCase();
}

export const handler = async (event) => {
  try {
    console.log("Event received:", JSON.stringify(event));

    // Handle API Gateway v2 format
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    const routeKey = event.routeKey;
    const pathParameters = event.pathParameters;

    // Handle different HTTP methods and routes
    if (httpMethod === "GET" && (routeKey === "GET /rag-agent/{userId}" || event.resource === "/rag-agent/{userId}")) {
      // Get all conditions for a user
      const userId = pathParameters?.userId || event.pathParameters?.userId;
      
      const { data, error } = await supabase
        .from("disability_estimates")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    if (httpMethod === "POST" && (routeKey === "POST /rag-agent/{userId}/reprocess" || event.resource === "/rag-agent/{userId}/reprocess")) {
      const userId = pathParameters?.userId || event.pathParameters?.userId;
      const { document_id } = JSON.parse(event.body);

      console.log(`Processing document ${document_id} for user ${userId}`);

      // First, let's check the document metadata
      const { data: document, error: docError } = await supabase
        .from("documents")
        .select("id, file_name, total_chunks, total_pages, textract_confidence, processing_status")
        .eq("id", document_id)
        .single();

      if (docError) {
        console.error("Error fetching document:", docError);
      } else {
        console.log("Document metadata:", document);
      }

      // Check Textract job details
      const { data: textractJob, error: jobError } = await supabase
        .from("textract_jobs")
        .select("id, aws_job_id, status, started_at, completed_at, error_message")
        .eq("document_id", document_id)
        .order("started_at", { ascending: false })
        .limit(1);

      if (jobError) {
        console.error("Error fetching Textract job:", jobError);
      } else {
        console.log("Textract job details:", textractJob);
      }

      // First, let's check if chunks exist without RLS restrictions
      const { data: allChunks, error: allChunksError } = await supabase
        .from("document_chunks")
        .select("content, chunk_index, page_number, char_count")
        .eq("document_id", document_id)
        .order("chunk_index");

      console.log(`Total chunks in database for document: ${allChunks?.length || 0}`);

      // Get the document chunks from Supabase (this will respect RLS)
      const { data: chunks, error: chunksError } = await supabase
        .from("document_chunks")
        .select("content, chunk_index, page_number, char_count")
        .eq("document_id", document_id)
        .order("chunk_index");

      if (chunksError || !chunks || chunks.length === 0) {
        console.error("No document chunks found:", chunksError);
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "No document chunks found" })
        };
      }

      console.log(`Found ${chunks.length} document chunks`);
      console.log("Chunk details:", chunks.map(chunk => ({
        index: chunk.chunk_index,
        page: chunk.page_number,
        charCount: chunk.char_count,
        contentLength: chunk.content?.length || 0
      })));

      // Combine all chunks into one text
      const documentText = chunks.map(chunk => chunk.content).join("\n\n");

      console.log("Document text length:", documentText.length);

      // Use Bedrock Agent to analyze the text and identify conditions
      const commandParams = {
        agentId: AGENT_ID,
        agentAliasId: AGENT_ALIAS_ID,
        sessionId: `${userId}-${document_id}`, // Create a unique session ID
        inputText: `Analyze this medical document and identify potential VA disability conditions. For each condition found, provide the following in JSON format:
        {
          "conditions": [
            {
              "name": "condition name",
              "rating": estimated rating percentage (10, 30, 50, 70, or 100),
              "severity": "mild/moderate/severe/total",
              "excerpt": "relevant text excerpt",
              "cfrCriteria": "relevant CFR citation",
              "keywords": ["matched", "keywords"]
            }
          ]
        }

        Consider VA rating criteria, symptoms described, and frequency/severity of symptoms.
        Be specific with CFR citations (e.g., "38 CFR §4.130 - Mental Disorders").

        Medical Document Text:
        ${documentText}

        Provide your analysis in valid JSON format only.`
      };

      const command = new InvokeAgentCommand(commandParams);
      const agentResponse = await bedrockAgentClient.send(command);

      // Process the streaming response
      let fullResponse = '';
      for await (const chunk of agentResponse.completion) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          fullResponse += text;
        }
      }

      console.log("Agent response:", fullResponse);

      // Parse the agent response
      const analysis = parseAgentResponse(fullResponse);
      
      if (!analysis || !analysis.conditions) {
        throw new Error("Failed to parse conditions from Bedrock Agent response");
      }

      console.log(`Found ${analysis.conditions.length} conditions`);

      // Process each identified condition
      const processedConditions = [];
      for (const condition of analysis.conditions) {
        // Calculate rating if not provided
        const rating = condition.rating || calculateRating(condition.keywords, condition.severity);

        // Normalize condition name for deduplication
        const normalizedConditionName = normalizeConditionName(condition.name);

        // Insert or update the disability_estimates table
        const { data: upsertedCondition, error: upsertError } = await supabase
          .from("disability_estimates")
          .upsert({
            user_id: userId,
            document_id,
            condition: normalizedConditionName,
            condition_display: condition.name, // Store original for display
            estimated_rating: rating,
            excerpt: condition.excerpt,
            cfr_criteria: condition.cfrCriteria,
            matched_keywords: condition.keywords,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,document_id,condition',
            returning: true
          });

        if (upsertError) {
          console.error("Error upserting condition:", upsertError);
          continue;
        }

        processedConditions.push(upsertedCondition);
      }

      console.log(`Successfully processed ${processedConditions.length} conditions`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Document processed successfully",
          conditions: processedConditions
        })
      };
    }

    if (httpMethod === "GET" && (routeKey === "GET /rag-agent/{userId}/conditions/{id}" || event.resource === "/rag-agent/{userId}/conditions/{id}")) {
      // Get specific condition
      const { userId, id } = pathParameters || event.pathParameters;
      
      const { data, error } = await supabase
        .from("disability_estimates")
        .select("*")
        .eq("user_id", userId)
        .eq("id", id)
        .single();

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    console.log("Invalid endpoint - httpMethod:", httpMethod, "routeKey:", routeKey);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid endpoint" })
    };

  } catch (error) {
    console.error("Error in rag-agent:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Main processing function
async function processAllConditions(userId) {
    // Step 1: Query Supabase for user conditions
    const conditions = await getUserConditions(userId);
    
    if (!conditions || conditions.length === 0) {
        return createSuccessResponse({
            message: 'No conditions found for user',
            conditions: []
        });
    }

    console.log(`Found ${conditions.length} conditions for user`);

    // Step 2: Process each condition
    const processedConditions = [];
    
    for (const condition of conditions) {
        try {
            console.log(`Processing condition: ${condition.name}`);

            // Step 3: Get CFR data for the condition
            const cfrData = await getCFRData(condition);
            
            // Step 4: Generate recommendation using Bedrock
            const recommendation = await generateRecommendation(condition, cfrData);
            
            // Step 5: Format the response
            const formattedCondition = formatConditionResponse(
                condition, 
                cfrData, 
                recommendation
            );
            
            processedConditions.push(formattedCondition);
            
        } catch (conditionError) {
            console.error(`Error processing condition ${condition.name}:`, conditionError);
            
            // Add error condition to results
            processedConditions.push({
                id: condition.id,
                title: condition.name,
                error: 'Failed to process condition',
                errorDetails: conditionError.message
            });
        }
    }

    // Step 6: Return structured response
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
        const cfrData = await getCFRData(data);
        const recommendation = await generateRecommendation(data, cfrData);
        const formattedCondition = formatConditionResponse(data, cfrData, recommendation);
        
        return createSuccessResponse(formattedCondition);
    } catch (error) {
        return createErrorResponse(500, 'Error processing condition: ' + error.message);
    }
}

// Handle reprocessing request
async function handleReprocess(userId) {
    // Add any special reprocessing logic here
    // For now, just call the main processing function
    return await processAllConditions(userId);
};