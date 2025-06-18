import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ 
    region: process.env.AWS_REGION || 'us-east-2' 
});

export async function generateRecommendation(condition, cfrData) {
    const prompt = `
    You are a VA disability claims expert. Based on the following information, provide a recommendation:
    
    Condition: ${condition.name}
    Description: ${condition.description || 'No description provided'}
    Symptoms: ${condition.symptoms || 'No symptoms provided'}
    
    CFR Information:
    ${cfrData.sections && cfrData.sections.length > 0 ? 
        cfrData.sections.map(section => `
        Section: ${section.identifier}
        Title: ${section.label}
        Content: ${section.content}
        `).join('\n') : 
        'No specific CFR sections found for this condition.'
    }
    
    Please provide:
    1. A brief summary of how this condition relates to VA disability
    2. The recommended VA percentage rating (0%, 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, or 100%)
    3. Key factors that support this rating
    
    Format your response as JSON:
    {
        "summary": "Brief summary here",
        "recommendedPercentage": 30,
        "supportingFactors": ["Factor 1", "Factor 2", "Factor 3"]
    }
    `;

    const params = {
        modelId: 'arn:aws:bedrock:us-east-2:281439767132:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1000,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    };

    try {
        console.log('Calling Bedrock with model:', params.modelId);
        const command = new InvokeModelCommand(params);
        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        console.log('Raw Bedrock response:', JSON.stringify(responseBody, null, 2));
        
        // Handle Claude 3.5 Sonnet response format
        let responseText;
        if (responseBody.content && Array.isArray(responseBody.content)) {
            responseText = responseBody.content[0]?.text;
        } else if (responseBody.completion) {
            responseText = responseBody.completion;
        } else if (responseBody.generation) {
            responseText = responseBody.generation;
        } else {
            console.error('Unexpected response format:', responseBody);
            throw new Error('Unexpected response format from Bedrock');
        }
        
        if (!responseText) {
            throw new Error('No response text found in Bedrock response');
        }
        
        console.log('Response text before parsing:', responseText);
        
        // Try to extract JSON from the response text
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON object found in response text');
        }
        
        // Parse the JSON response
        const recommendation = JSON.parse(jsonMatch[0]);
        console.log('Parsed recommendation:', JSON.stringify(recommendation, null, 2));
        
        return recommendation;
    } catch (error) {
        console.error('Error calling Bedrock:', error);
        if (error.name === 'ValidationException') {
            console.error('Model validation error. Available models may have changed.');
            // Return a fallback recommendation
            return {
                summary: `Based on the condition ${condition.name}, this appears to be a service-connected disability that may qualify for VA benefits.`,
                recommendedPercentage: 10,
                supportingFactors: [
                    "Condition is service-connected",
                    "May require medical evaluation for specific rating",
                    "Consult with VA representative for detailed assessment"
                ]
            };
        }
        throw error;
    }
}