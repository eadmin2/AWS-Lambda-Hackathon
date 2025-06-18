import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ 
    region: process.env.AWS_REGION || 'us-east-2' 
});

export async function getCFRData(condition) {
    const payload = {
        condition: condition.name,
        bodySystem: condition.body_system,
        keywords: condition.keywords || []
    };

    const params = {
        FunctionName: process.env.ECFR_LAMBDA_FUNCTION_NAME,
        Payload: JSON.stringify(payload)
    };

    try {
        const command = new InvokeCommand(params);
        const response = await lambdaClient.send(command);
        const rawPayload = response.Payload ? new TextDecoder().decode(response.Payload) : '';
        
        console.log('Raw Lambda response payload:', rawPayload);
        
        if (!rawPayload) {
            throw new Error('eCFR Lambda returned an empty payload');
        }
        
        let responsePayload;
        try {
            responsePayload = JSON.parse(rawPayload);
        } catch (err) {
            throw new Error('eCFR Lambda returned invalid JSON: ' + rawPayload);
        }
        
        console.log('Parsed response payload:', JSON.stringify(responsePayload, null, 2));
        
        // Handle direct invocation response format
        if (responsePayload.statusCode) {
            if (responsePayload.statusCode !== 200) {
                throw new Error(`eCFR Lambda returned error status ${responsePayload.statusCode}: ${responsePayload.body || 'Unknown error'}`);
            }
            
            // Parse the body field
            let bodyData;
            try {
                bodyData = JSON.parse(responsePayload.body);
            } catch (parseErr) {
                throw new Error('Failed to parse response body as JSON: ' + responsePayload.body);
            }
            
            return bodyData;
        }
        
        // Handle legacy Bedrock Agent response format
        if (responsePayload.errorMessage) {
            throw new Error(responsePayload.errorMessage);
        }
        
        // Check if responsePayload.body exists and is not undefined
        if (!responsePayload.body) {
            console.error('Response payload structure:', responsePayload);
            throw new Error('eCFR Lambda response missing body field. Full response: ' + JSON.stringify(responsePayload));
        }
        
        // If body is already an object, return it directly
        if (typeof responsePayload.body === 'object') {
            return responsePayload.body;
        }
        
        // If body is a string, try to parse it
        if (typeof responsePayload.body === 'string') {
            try {
                return JSON.parse(responsePayload.body);
            } catch (parseErr) {
                throw new Error('Failed to parse response body as JSON: ' + responsePayload.body);
            }
        }
        
        throw new Error('Unexpected response body type: ' + typeof responsePayload.body);
        
    } catch (error) {
        console.error('Error calling eCFR Lambda:', error);
        throw error;
    }
}

export function generateCFRLink(section) {
    const baseUrl = 'https://www.ecfr.gov/current/title-38/chapter-I/part-4';
    return `${baseUrl}/section-4.${section}`;
}