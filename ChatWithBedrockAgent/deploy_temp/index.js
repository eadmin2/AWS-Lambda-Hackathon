const {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} = require("@aws-sdk/client-bedrock-agent-runtime");
const AWSXRay = require('aws-xray-sdk-core');

// Initialize X-Ray
const bedrockClient = AWSXRay.captureAWSv3Client(new BedrockAgentRuntimeClient({ region: "us-east-2" }));

async function handleBedrockAgentChat(event, requestId) {
  // Create a new X-Ray subsegment
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('handleBedrockAgentChat');
  
  try {
    const body = JSON.parse(event.body || "{}");
    const { input, sessionId } = body;

    console.log("Parsed body:", JSON.stringify(body, null, 2));
    console.log("Input text:", input?.text);
    console.log("Session ID:", sessionId);

    if (!input?.text || !sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing input.text or sessionId", requestId }),
      };
    }

    const commandParams = {
      agentId: "S9KQ4LEVEI",
      agentAliasId: "YKOOLY6ZHJ",
      sessionId,
      inputText: input.text,
    };

    console.log("Command params:", JSON.stringify(commandParams, null, 2));

    const command = new InvokeAgentCommand(commandParams);

    const response = await bedrockClient.send(command);
    
    // Add detailed logging of the response
    console.log("Bedrock response:", JSON.stringify(response, null, 2));
    
    if (!response || !response.completion) {
      console.error("Invalid response from Bedrock:", response);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Invalid response from Bedrock agent",
          requestId,
        }),
      };
    }

    // Process the streaming response
    let fullResponse = '';
    for await (const chunk of response.completion) {
      if (chunk.chunk?.bytes) {
        const text = new TextDecoder().decode(chunk.chunk.bytes);
        fullResponse += text;
      }
    }

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        message: fullResponse || null,
        sessionId,
        requestId,
      }),
    };
  } catch (error) {
    console.error("Error invoking Bedrock agent:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error.message || "Agent invocation failed",
        requestId,
      }),
    };
  } finally {
      subsegment.close();
  }
}

exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || "no-request-id";
  
  // Handle preflight OPTIONS requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: ""
    };
  }
  
  return await handleBedrockAgentChat(event, requestId);
};