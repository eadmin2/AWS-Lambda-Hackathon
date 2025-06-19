import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockRuntimeClient({ 
    region: process.env.AWS_REGION || 'us-east-2' 
});

// Bedrock Agent configuration
const bedrockAgentClient = new BedrockAgentRuntimeClient({ region: "us-east-2" });
const AGENT_ID = process.env.BEDROCK_AGENT_ID || "S9KQ4LEVEI";
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID || "YKOOLY6ZHJ";

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

    try {
        console.log('Calling Bedrock Agent for recommendation');
        
        const commandParams = {
            agentId: AGENT_ID,
            agentAliasId: AGENT_ALIAS_ID,
            sessionId: `recommendation-${condition.id || condition.name}-${Date.now()}`, // Create a unique session ID
            inputText: prompt
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
        
        console.log('Raw Agent response:', fullResponse);
        
        if (!fullResponse) {
            throw new Error('No response text found in Bedrock Agent response');
        }
        
        // Try to extract JSON from the response text
        let jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON object found in response text');
        }
        
        // Parse the JSON response
        const recommendation = JSON.parse(jsonMatch[0]);
        console.log('Parsed recommendation:', JSON.stringify(recommendation, null, 2));
        
        return recommendation;
    } catch (error) {
        console.error('Error calling Bedrock Agent:', error);
        if (error.name === 'ValidationException') {
            console.error('Agent validation error. Available agents may have changed.');
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