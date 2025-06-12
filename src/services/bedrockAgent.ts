import axios from 'axios';

const API_URL = 'https://ow0lv5yaw7.execute-api.us-east-2.amazonaws.com/chat-with-agent';

export interface BedrockAgentResponse {
  message: string;
  sessionId: string;
  requestId: string;
}

export interface BedrockAgentError {
  error: string;
  requestId: string;
}

export async function sendMessageToBedrockAgent(
  message: string,
  sessionId: string
): Promise<BedrockAgentResponse> {
  try {
    const response = await axios.post(API_URL, {
      input: {
        text: message
      },
      sessionId
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Failed to communicate with the assistant');
    }
    throw error;
  }
} 