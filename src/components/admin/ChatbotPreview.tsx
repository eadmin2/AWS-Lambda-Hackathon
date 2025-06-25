import React from 'react';
import { Bot, X } from 'lucide-react';

interface ChatbotPreviewProps {
  botName: string;
  welcomeMessage: string;
  statusMessage: string;
  inputPlaceholder: string;
  primaryColor: string;
  headerColor: string;
  userTextColor: string;
  position: 'bottom-right' | 'bottom-left';
}

const ChatbotPreview: React.FC<ChatbotPreviewProps> = ({
  botName,
  welcomeMessage,
  statusMessage,
  inputPlaceholder,
  primaryColor,
  headerColor,
  userTextColor,
  position,
}) => {
  return (
    <div
      className={`fixed ${position === 'bottom-right' ? 'right-4' : 'left-4'} bottom-4 w-[360px] h-[600px] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden border border-gray-200`}
      style={{ zIndex: 1000 }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex items-center space-x-3">
          <Bot className="h-6 w-6" style={{ color: primaryColor }} />
          <div>
            <h3 className="font-medium text-gray-900">{botName}</h3>
            <p className="text-sm text-gray-500">{statusMessage}</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {/* Welcome Message */}
        <div className="flex items-start space-x-2 mb-4">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-gray-800">{welcomeMessage}</p>
            </div>
          </div>
        </div>

        {/* Example User Message */}
        <div className="flex items-start space-x-2 justify-end mb-4">
          <div className="flex-1 flex justify-end">
            <div
              className="p-3 rounded-lg shadow-sm max-w-[80%]"
              style={{ backgroundColor: primaryColor }}
            >
              <p style={{ color: userTextColor }}>This is a sample user message</p>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-1 p-2 border border-gray-300 rounded-lg"
            placeholder={inputPlaceholder}
            readOnly
          />
          <button
            className="p-2 rounded-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPreview; 