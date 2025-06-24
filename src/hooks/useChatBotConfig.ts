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
  connectionState: 'connecting' | 'open' | 'closed' | 'error';
}

export function useChatBotConfig(): UseChatBotConfigReturn {
  const [config, setConfig] = useState<ChatBotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed' | 'error'>('closed');

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
    await supabase
      .from('chatbot_config')
      .update(updateObj)
      .eq('id', config.id);
    // No need to setConfig here, real-time will handle it
  };

  useEffect(() => {
    fetchConfig();
    let mounted = true;
    let retryCount = 0;
    let channel: any = null;
    let retryTimeout: any = null;
    // Use a unique channel name per instance to avoid multiple subscribe errors
    const channelName = 'chatbot_config_' + (config?.id || 'default');
    const subscribe = () => {
      setConnectionState('connecting');
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chatbot_config' },
          (payload) => {
            if (!mounted) return;
            const newConfig = payload.new;
            setConfig({
              ...newConfig,
              quickReplies: typeof newConfig.quick_replies === 'string' ? JSON.parse(newConfig.quick_replies) : newConfig.quick_replies,
              botName: newConfig.bot_name,
              welcomeMessage: newConfig.welcome_message,
              statusMessage: newConfig.status_message,
              inputPlaceholder: newConfig.input_placeholder,
              primaryColor: newConfig.primary_color,
              headerColor: newConfig.header_color,
              userTextColor: newConfig.user_text_color,
              position: newConfig.position,
              created_at: newConfig.created_at,
              updated_at: newConfig.updated_at,
              enabled: newConfig.enabled,
              id: newConfig.id,
            });
          }
        )
        .subscribe((status: any) => {
          if (!mounted) return;
          if (status === 'SUBSCRIBED') {
            setConnectionState('open');
            retryCount = 0;
          } else if (status === 'CLOSED') {
            setConnectionState('closed');
            if (retryCount < 3) {
              retryCount++;
              retryTimeout = setTimeout(subscribe, 1000 * retryCount);
            } else {
              setConnectionState('error');
            }
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionState('error');
          }
        });
    };
    subscribe();
    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [config?.id]);

  return {
    config,
    loading,
    error,
    updateConfig,
    connectionState,
  };
}