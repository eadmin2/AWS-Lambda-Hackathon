import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { useChatBotConfig } from '../../hooks/useChatBotConfig';
import { sendMessageToBedrockAgent } from '../../services/bedrockAgent';
import { v4 as uuidv4 } from 'uuid';
import DOMPurify from 'dompurify';
import LinkifyIt from 'linkify-it';

const linkify = new LinkifyIt();

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'quick-reply' | 'card';
  metadata?: any;
}

interface ChatBotProps {
  className?: string;
}

function linkifyAndSanitize(text: string): string {
  // Find all links in the text
  const matches = linkify.match(text);
  if (!matches) return DOMPurify.sanitize(text);

  let result = '';
  let lastIndex = 0;
  for (const match of matches) {
    // Append text before the link
    result += DOMPurify.sanitize(text.slice(lastIndex, match.index));
    // Append the link as an anchor tag
    result += `<a href="${match.url}" target="_blank" rel="noopener noreferrer">${match.text}</a>`;
    lastIndex = match.lastIndex;
  }
  // Append any remaining text after the last link
  result += DOMPurify.sanitize(text.slice(lastIndex));
  return result;
}

const ChatBot: React.FC<ChatBotProps> = ({ className = '' }) => {
  const { config, loading: configLoading } = useChatBotConfig();
  const [sessionId] = useState(() => uuidv4()); // Generate a unique session ID when component mounts

  // Chat state
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Initialize chat with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: config?.welcomeMessage || "Hi! I'm your VA Rating Assistant. How can I help you today?",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, config?.welcomeMessage]);

  const sendMessage = async (content: string, type: 'text' | 'quick-reply' = 'text') => {
    if (!content.trim()) return;

    // Add user message (with hyperlinks)
    const userMessage: Message = {
      id: Date.now().toString(),
      content: linkifyAndSanitize(content),
      sender: 'user',
      timestamp: new Date(),
      type
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await sendMessageToBedrockAgent(content, sessionId);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: linkifyAndSanitize(response.message),
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: linkifyAndSanitize(error instanceof Error ? error.message : "I'm sorry, I'm having trouble responding right now. Please try again or contact our support team."),
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  if (configLoading) return null;

  return (
    <div className="chatbot-container" style={{ position: 'fixed', zIndex: 9999 }}>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <m.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              config?.primaryColor || 'bg-primary-700 hover:bg-primary-800'
            } text-white ${className}`}
            style={{
              backgroundColor: config?.primaryColor,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
          </m.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className={`fixed bottom-6 right-6 z-[9999] w-96 max-w-[calc(100vw-2rem)] ${
              isMinimized ? 'h-16' : 'h-[600px] max-h-[calc(100vh-3rem)]'
            } bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden ${className}`}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b border-gray-200"
              style={{ backgroundColor: config?.headerColor || '#f8fafc' }}
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: config?.primaryColor || '#1e3a7a' }}
                >
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {config?.botName || 'VA Assistant'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {config?.statusMessage || 'Online • Typically replies instantly'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label={isMinimized ? 'Maximize chat' : 'Minimize chat'}
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Minimize2 className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[80%]`}>
                        {message.sender === 'bot' && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                            style={{ backgroundColor: config?.primaryColor || '#1e3a7a' }}
                          >
                            <Bot className="h-3 w-3 text-white" />
                          </div>
                        )}

                        <div
                          className={`px-3 py-2 rounded-2xl text-sm ${
                            message.sender === 'user'
                              ? ''
                              : 'bg-gray-100 text-gray-900'
                          }`}
                          style={{
                            backgroundColor: message.sender === 'user'
                              ? config?.primaryColor || '#1e3a7a'
                              : undefined,
                            color: message.sender === 'user'
                              ? config?.userTextColor || '#fff'
                              : undefined
                          }}
                        >
                          <div 
                            dangerouslySetInnerHTML={{ __html: message.content }} 
                            className={`prose prose-sm max-w-none ${
                              message.sender === 'user'
                                ? '[&_a]:text-white text-white [&_a]:underline [&_a]:hover:opacity-80'
                                : '[&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800'
                            }`}
                          />
                        </div>

                        {message.sender === 'user' && (
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="h-3 w-3 text-gray-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: config?.primaryColor || '#1e3a7a' }}
                        >
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                        <div className="bg-gray-100 px-3 py-2 rounded-2xl">
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={config?.inputPlaceholder || "Type your message..."}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      autoComplete="off"
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => sendMessage(inputValue)}
                      disabled={!inputValue.trim() || isLoading}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: config?.primaryColor || '#1e3a7a' }}
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatBot;
