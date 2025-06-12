import { useState, useEffect } from 'react';

export interface ChatBotConfig {
  id: string;
  botName: string;
  welcomeMessage: string;
  statusMessage: string;
  inputPlaceholder: string;
  primaryColor: string;
  headerColor: string;
  enabled: boolean;
  position: 'bottom-right' | 'bottom-left';
  quickReplies: Array<{
    id: string;
    text: string;
    action: string;
  }>;
  created_at: string;
  updated_at: string;
  userTextColor?: string;
}

interface UseChatBotConfigReturn {
  config: ChatBotConfig | null;
  loading: boolean;
  error: string | null;
  updateConfig: (updates: Partial<ChatBotConfig>) => Promise<void>;
}

export function useChatBotConfig(): UseChatBotConfigReturn {
  const [config, setConfig] = useState<ChatBotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, use default config since we don't have the API endpoint yet
      const defaultConfig: ChatBotConfig = {
        id: 'default',
        botName: 'VA Assistant',
        welcomeMessage: "Hi! I'm your VA Rating Assistant. How can I help you today?",
        statusMessage: 'Online • Typically replies instantly',
        inputPlaceholder: 'Type your message...',
        primaryColor: '#3b82f6',
        headerColor: '#f8fafc',
        enabled: true,
        position: 'bottom-right',
        quickReplies: [
          { id: '1', text: 'Calculate my rating', action: 'calculator' },
          { id: '2', text: 'Upload documents', action: 'upload' },
          { id: '3', text: 'Pricing info', action: 'pricing' },
          { id: '4', text: 'Contact support', action: 'support' },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        userTextColor: '#ffffff',
      };
      
      setConfig(defaultConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chatbot config';
      setError(errorMessage);
      console.error('Error fetching chatbot config:', err);
      
      // Fallback to default config
      setConfig({
        id: 'default',
        botName: 'VA Assistant',
        welcomeMessage: "Hi! I'm your VA Rating Assistant. How can I help you today?",
        statusMessage: 'Online • Typically replies instantly',
        inputPlaceholder: 'Type your message...',
        primaryColor: '#3b82f6',
        headerColor: '#f8fafc',
        enabled: true,
        position: 'bottom-right',
        quickReplies: [
          { id: '1', text: 'Calculate my rating', action: 'calculator' },
          { id: '2', text: 'Upload documents', action: 'upload' },
          { id: '3', text: 'Pricing info', action: 'pricing' },
          { id: '4', text: 'Contact support', action: 'support' },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        userTextColor: '#ffffff',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<ChatBotConfig>) => {
    try {
      // For now, just update local state
      // TODO: Replace with actual API call when backend is ready
      if (config) {
        const updatedConfig = { ...config, ...updates };
        setConfig(updatedConfig);
        
        // Store in localStorage for persistence during development
        localStorage.setItem('chatbot_config', JSON.stringify(updatedConfig));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update chatbot config';
      setError(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    // Try to load from localStorage first
    const savedConfig = localStorage.getItem('chatbot_config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        // Ensure enabled is true
        parsedConfig.enabled = true;
        setConfig(parsedConfig);
        setLoading(false);
        // Don't return here, so we still set up the storage listener
      } catch (err) {
        console.error('Error parsing saved config:', err);
      }
    }
    
    fetchConfig();

    // Listen for localStorage changes (from other tabs/components)
    function handleStorage(event: StorageEvent) {
      if (event.key === 'chatbot_config' && event.newValue) {
        try {
          const parsedConfig = JSON.parse(event.newValue);
          parsedConfig.enabled = true;
          setConfig(parsedConfig);
        } catch (err) {
          // ignore
        }
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    config,
    loading,
    error,
    updateConfig,
  };
}