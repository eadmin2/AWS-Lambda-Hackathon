import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'quick-reply' | 'card';
  metadata?: any;
}

interface QuickReply {
  id: string;
  text: string;
  action: string;
}

interface ChatBotProps {
  className?: string;
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

  // Quick reply options
  const quickReplies: QuickReply[] = [
    { id: '1', text: 'Calculate my rating', action: 'calculator' },
    { id: '2', text: 'Upload documents', action: 'upload' },
    { id: '3', text: 'Pricing info', action: 'pricing' },
    { id: '4', text: 'Contact support', action: 'support' },
  ];

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

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
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
        content: response.message,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error ? error.message : "I'm sorry, I'm having trouble responding right now. Please try again or contact our support team.",
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

  const handleQuickReply = (reply: QuickReply) => {
    switch (reply.action) {
      case 'calculator':
        sendMessage('I want to calculate my VA disability rating', 'quick-reply');
        break;
      case 'upload':
        sendMessage('How do I upload my medical documents?', 'quick-reply');
        break;
      case 'pricing':
        sendMessage('What are your pricing options?', 'quick-reply');
        break;
      case 'support':
        sendMessage('I need help from support', 'quick-reply');
        break;
      default:
        sendMessage(reply.text, 'quick-reply');
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
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              config?.primaryColor || 'bg-primary-600 hover:bg-primary-700'
            } text-white ${className}`}
            style={{
              backgroundColor: config?.primaryColor,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
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
                  style={{ backgroundColor: config?.primaryColor || '#3b82f6' }}
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
                            style={{ backgroundColor: config?.primaryColor || '#3b82f6' }}
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
                              ? config?.primaryColor || '#3b82f6'
                              : undefined,
                            color: message.sender === 'user'
                              ? config?.userTextColor || '#fff'
                              : undefined
                          }}
                        >
                          <div 
                            dangerouslySetInnerHTML={{ __html: message.content }} 
                            className="prose prose-sm max-w-none [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800"
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
                          style={{ backgroundColor: config?.primaryColor || '#3b82f6' }}
                        >
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                        <div className="bg-gray-100 px-3 py-2 rounded-2xl">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies */}
                {messages.length > 0 && (
                  <div className="px-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((reply) => (
                        <button
                          key={reply.id}
                          onClick={() => handleQuickReply(reply)}
                          className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                          style={{
                            borderColor: config?.primaryColor,
                            color: config?.primaryColor
                          }}
                        >
                          {reply.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => sendMessage(inputValue)}
                      disabled={!inputValue.trim() || isLoading}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: config?.primaryColor || '#3b82f6' }}
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatBot;
