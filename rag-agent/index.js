import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
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

export const handler = async (event) => {
  try {
    console.log("Event received:", JSON.stringify(event));

    // Handle different HTTP methods and routes
    if (event.httpMethod === "GET" && event.resource === "/rag-agent/{userId}") {
      // Get all conditions for a user
      const userId = event.pathParameters.userId;
      
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

    if (event.httpMethod === "POST" && event.resource === "/rag-agent/{userId}/reprocess") {
      const userId = event.pathParameters.userId;
      const { document_id } = JSON.parse(event.body);

      // Get the document chunks from Supabase
      const { data: chunks, error: chunksError } = await supabase
        .from("document_chunks")
        .select("content")
        .eq("document_id", document_id)
        .order("chunk_index");

      if (chunksError || !chunks || chunks.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "No document chunks found" })
        };
      }

      // Combine all chunks into one text
      const documentText = chunks.map(chunk => chunk.content).join("\n\n");

      // Use Bedrock to analyze the text and identify conditions
      const bedrockResponse = await bedrock.send(new InvokeModelCommand({
        modelId: "anthropic.claude-v2",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          prompt: `
            You are a VA disability claims expert. Analyze the following medical document text and identify potential VA disability conditions.
            For each condition found, provide the following in JSON format:
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

            Provide your analysis in valid JSON format only.
          `,
          max_tokens: 2048,
          temperature: 0.2
        })
      }));

      const analysis = parseBedrockResponse(bedrockResponse.body);
      
      if (!analysis || !analysis.conditions) {
        throw new Error("Failed to parse conditions from Bedrock response");
      }

      // Process each identified condition
      const processedConditions = [];
      for (const condition of analysis.conditions) {
        // Calculate rating if not provided
        const rating = condition.rating || calculateRating(condition.keywords, condition.severity);

        // Insert or update the disability_estimates table
        const { data: upsertedCondition, error: upsertError } = await supabase
          .from("disability_estimates")
          .upsert({
            user_id: userId,
            document_id,
            condition: condition.name,
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

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Document processed successfully",
          conditions: processedConditions
        })
      };
    }

    if (event.httpMethod === "GET" && event.resource === "/rag-agent/{userId}/conditions/{id}") {
      // Get specific condition
      const { userId, id } = event.pathParameters;
      
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