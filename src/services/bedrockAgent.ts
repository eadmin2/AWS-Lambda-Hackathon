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

export interface StreamChunk {
  type: 'chunk' | 'done' | 'connected';
  content?: string;
  sessionId: string;
  requestId: string;
}

export type StreamCallback = (chunk: StreamChunk) => void;

export async function sendMessageToBedrockAgent(
  message: string,
  sessionId: string,
  onChunk?: StreamCallback
): Promise<BedrockAgentResponse> {
  try {
    console.log('Sending message to Bedrock agent:', { message, sessionId });

    const response = await axios.post(API_URL, {
      input: { text: message },
      sessionId
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Add timeout and validation
      timeout: 30000, // 30 seconds
      validateStatus: (status) => status === 200
    });

    console.log('Received response:', response.data);

    if (!response.data.message) {
      throw new Error('Invalid response format: missing message');
    }

    // If we have a streaming callback, simulate streaming with the full response
    if (onChunk && response.data.message) {
      // Split the message into smaller chunks (e.g., by words)
      const words = response.data.message.split(' ');
      let accumulatedText = '';
      
      // Simulate streaming by sending chunks with small delays
      for (const word of words) {
        accumulatedText += (accumulatedText ? ' ' : '') + word;
        onChunk({
          type: 'chunk',
          content: accumulatedText,
          sessionId: response.data.sessionId,
          requestId: response.data.requestId
        });
        // Add a small delay between chunks to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Send the final chunk
      onChunk({
        type: 'done',
        sessionId: response.data.sessionId,
        requestId: response.data.requestId
      });
    }

    return response.data;
  } catch (error) {
    console.error('Error in sendMessageToBedrockAgent:', error);

    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      const requestId = error.response?.data?.requestId;
      
      console.error('Axios error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: errorMessage
      });

      throw new Error(
        `Failed to communicate with the assistant: ${errorMessage}` +
        (requestId ? ` (Request ID: ${requestId})` : '')
      );
    }

    throw error;
  }
} 