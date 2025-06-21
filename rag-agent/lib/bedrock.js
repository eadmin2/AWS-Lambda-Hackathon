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
    You are an AI assistant trained to help veterans understand VA disability rating criteria based on 38 CFR Part 4. You are **not a doctor** and must not give medical advice. Instead, you explain how medical records might relate to VA criteria using official guidelines.

    Given the following inputs:
    - **Condition Name**: ${condition.name}
    - **Recommended VA Rating**: ${condition.rating}%
    - **Matched CFR Section**: ${cfrData.sections && cfrData.sections.length > 0 ? `38 CFR §${cfrData.sections[0].identifier}` : 'Not specified'}
    - **Detected Keywords**: ${JSON.stringify(condition.keywords || [])}
    - **Summary from Medical Records**: ${condition.summary || condition.excerpt || 'No summary available.'}

    Generate the following output sections in a single JSON object. Do not include any other text.

    1. **rating_explanation**: (String) Explain in clear, human language why this condition matches the suggested rating level according to 38 CFR. Compare all possible ratings for this condition and justify why the selected one is appropriate based on the available data.
    2. **cfr_link**: (String) Provide the official link to the relevant CFR section. Example: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/section-4.97"
    3. **tooltip_definitions**: (Array of Objects) For each important medical or legal term, create a tooltip object with "term" and "definition".
    4. **confidence_indicator**: (Object) Provide a "score" (High, Medium, or Low) and a "reasoning" (String) for that score based on keyword matches and document clarity.
    5. **disclaimer**: (String) Include the text: "This is a non-medical recommendation based on your documents. Consult a VSO or licensed expert before filing."

    Your entire response must be a single JSON object with the keys: "rating_explanation", "cfr_link", "tooltip_definitions", "confidence_indicator", and "disclaimer".
    `;

    try {
        console.log('Calling Bedrock Agent for recommendation with new prompt');
        
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
                rating_explanation: `Based on the condition ${condition.name}, this appears to be a disability that may qualify for VA benefits. An official rating requires a medical evaluation.`,
                cfr_link: "https://www.ecfr.gov/current/title-38/chapter-I/part-4",
                tooltip_definitions: [
                    { term: "CFR", definition: "Code of Federal Regulations, where VA laws are published." },
                    { term: "VSO", definition: "A Veterans Service Officer, who can help you with your claim."}
                ],
                confidence_indicator: { score: "Low", reasoning: "A system error occurred. This is a fallback response." },
                disclaimer: "This is a non-medical recommendation based on your documents. Consult a VSO or licensed expert before filing."
            };
        }
        throw error;
    }
}