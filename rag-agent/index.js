import { getUserConditions } from './lib/supabase.js';
import { generateRecommendation } from './lib/bedrock.js';
import { getCFRData, generateCFRLink } from './lib/cfr-processor.js';
import { 
    validateUserId, 
    formatConditionResponse, 
    createErrorResponse, 
    createSuccessResponse 
} from './utils/helpers.js';

export const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    try {
        // Extract user ID from path parameters
        const userId = event.pathParameters?.userId;
        const conditionId = event.pathParameters?.conditionId;
        const httpMethod = event.httpMethod;
        const resource = event.resource;
        
        validateUserId(userId);

        // Handle different routes
        if (httpMethod === 'GET' && resource === '/rag-agent/{userId}/conditions/{conditionId}') {
            return await handleSingleCondition(userId, conditionId);
        }
        
        if (httpMethod === 'POST' && resource === '/rag-agent/{userId}/reprocess') {
            return await handleReprocess(userId);
        }
        
        // Default: process all conditions
        return await processAllConditions(userId);

        console.log(`Processing conditions for user: ${userId}`);

        return await processAllConditions(userId);

    } catch (error) {
        console.error('Lambda execution error:', error);
        return createErrorResponse(500, 'Internal server error: ' + error.message);
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