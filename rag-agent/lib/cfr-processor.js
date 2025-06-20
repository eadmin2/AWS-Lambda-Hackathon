import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "us-east-2" });

export const getCFRData = async (condition) => {
  try {
    console.log("Getting CFR data for condition:", condition);
    
    // Ensure we have valid data to send
    if (!condition || !condition.name) {
      console.log("No valid condition data provided");
      return null;
    }

    // Format the payload to match what the eCFR Lambda expects
    const payload = {
      condition: condition.name,
      bodySystem: condition.bodySystem || extractBodySystemFromCondition(condition.name),
      keywords: condition.keywords && Array.isArray(condition.keywords) && condition.keywords.length > 0 
        ? condition.keywords 
        : [condition.name] // Fallback to condition name if no keywords
    };

    console.log("Calling eCFR Lambda with payload:", payload);

    const command = new InvokeCommand({
      FunctionName: process.env.ECFR_LAMBDA_NAME || 'eCFRSearchFunction',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload)
    });

    const response = await lambdaClient.send(command);
    
    if (!response.Payload) {
      console.log("No payload in eCFR Lambda response");
      return null;
    }

    const payloadStr = new TextDecoder().decode(response.Payload);
    console.log("Raw Lambda response payload:", payloadStr);
    
    const parsedResponse = JSON.parse(payloadStr);
    console.log("Parsed response payload:", parsedResponse);

    // Check for error status codes
    if (parsedResponse.statusCode && parsedResponse.statusCode !== 200) {
      const errorBody = typeof parsedResponse.body === 'string' 
        ? JSON.parse(parsedResponse.body) 
        : parsedResponse.body;
      
      console.error("eCFR Lambda returned error status", parsedResponse.statusCode, ":", errorBody);
      throw new Error(`eCFR Lambda returned error status ${parsedResponse.statusCode}: ${JSON.stringify(errorBody)}`);
    }

    // Parse the response body if it's a string
    let responseData = parsedResponse;
    if (parsedResponse.body) {
      responseData = typeof parsedResponse.body === 'string' 
        ? JSON.parse(parsedResponse.body) 
        : parsedResponse.body;
    }

    // Check if we got sections back
    if (responseData.sections && responseData.sections.length > 0) {
      // Return the first/best matching section
      const bestSection = responseData.sections[0];
      return {
        id: bestSection.identifier,
        title: bestSection.label,
        content: bestSection.content || bestSection.description,
        identifier: bestSection.identifier
      };
    }

    console.log("No CFR sections found for condition:", condition.name);
    return null;

  } catch (error) {
    console.error("Error calling eCFR Lambda:", error);
    
    // Don't throw the error - just return null so processing can continue
    return null;
  }
};

// Helper function to extract body system from condition name
const extractBodySystemFromCondition = (conditionName) => {
  const name = conditionName.toLowerCase();
  
  if (name.includes('mental') || name.includes('anxiety') || name.includes('depression') || name.includes('ptsd')) {
    return 'mental';
  }
  if (name.includes('shoulder') || name.includes('knee') || name.includes('back') || name.includes('joint') || name.includes('muscle')) {
    return 'musculoskeletal';
  }
  if (name.includes('heart') || name.includes('cardiac') || name.includes('blood')) {
    return 'cardiovascular';
  }
  if (name.includes('lung') || name.includes('respiratory') || name.includes('breathing')) {
    return 'respiratory';
  }
  if (name.includes('ear') || name.includes('hearing') || name.includes('tinnitus')) {
    return 'hearing';
  }
  if (name.includes('eye') || name.includes('vision') || name.includes('sight')) {
    return 'vision';
  }
  if (name.includes('digestive') || name.includes('stomach') || name.includes('intestine')) {
    return 'digestive';
  }
  if (name.includes('thyroid') || name.includes('diabetes') || name.includes('hormone')) {
    return 'endocrine';
  }
  if (name.includes('skin') || name.includes('dermatitis')) {
    return 'skin';
  }
  
  return 'general';
};

export const generateCFRLink = (identifier) => {
  if (!identifier) return null;
  return `https://www.ecfr.gov/current/title-38/chapter-I/part-4/section-4.${identifier}`;
};