import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

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

  // Fetch config from Supabase
  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    const { data, error }: PostgrestSingleResponse<any> = await supabase
      .from('chatbot_config')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data && data.length > 0) {
      // Parse quickReplies if needed
      const cfg = {
        ...data[0],
        quickReplies: typeof data[0].quick_replies === 'string' ? JSON.parse(data[0].quick_replies) : data[0].quick_replies,
        botName: data[0].bot_name,
        welcomeMessage: data[0].welcome_message,
        statusMessage: data[0].status_message,
        inputPlaceholder: data[0].input_placeholder,
        primaryColor: data[0].primary_color,
        headerColor: data[0].header_color,
        userTextColor: data[0].user_text_color,
        position: data[0].position,
        created_at: data[0].created_at,
        updated_at: data[0].updated_at,
        enabled: data[0].enabled,
        id: data[0].id,
      };
      setConfig(cfg);
    }
    setLoading(false);
  };

  // Update config in Supabase
  const updateConfig = async (updates: Partial<ChatBotConfig>) => {
    if (!config) return;
    const updateObj: any = { ...updates };
    // Map camelCase to snake_case for DB
    if (updateObj.botName) updateObj.bot_name = updateObj.botName;
    if (updateObj.welcomeMessage) updateObj.welcome_message = updateObj.welcomeMessage;
    if (updateObj.statusMessage) updateObj.status_message = updateObj.statusMessage;
    if (updateObj.inputPlaceholder) updateObj.input_placeholder = updateObj.inputPlaceholder;
    if (updateObj.primaryColor) updateObj.primary_color = updateObj.primaryColor;
    if (updateObj.headerColor) updateObj.header_color = updateObj.headerColor;
    if (updateObj.userTextColor) updateObj.user_text_color = updateObj.userTextColor;
    if (updateObj.quickReplies) updateObj.quick_replies = JSON.stringify(updateObj.quickReplies);
    delete updateObj.botName;
    delete updateObj.welcomeMessage;
    delete updateObj.statusMessage;
    delete updateObj.inputPlaceholder;
    delete updateObj.primaryColor;
    delete updateObj.headerColor;
    delete updateObj.userTextColor;
    delete updateObj.quickReplies;
    const { error } = await supabase
      .from('chatbot_config')
      .update(updateObj)
      .eq('id', config.id);
    if (!error) {
      // Manually update config state
      setConfig({ ...config, ...updates });
    }
  };

  useEffect(() => {
    fetchConfig();
    // No realtime subscription
  }, []);

  return {
    config,
    loading,
    error,
    updateConfig,
  };
}