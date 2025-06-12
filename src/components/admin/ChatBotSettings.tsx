import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Button from "../ui/Button";

interface ChatBotConfig {
  enabled: boolean;
  welcome_message: string;
  max_tokens: number;
  temperature: number;
  model: string;
}

const ChatBotSettings = () => {
  const [config, setConfig] = useState<ChatBotConfig>({
    enabled: true,
    welcome_message: "Hello! How can I help you today?",
    max_tokens: 1000,
    temperature: 0.7,
    model: "gpt-4",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("chatbot_config")
          .select("*")
          .single();

        if (error) throw error;
        if (data) setConfig(data);
      } catch (error) {
        console.error("Error fetching chatbot config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("chatbot_config")
        .upsert([config], { onConflict: "id" });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving chatbot config:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading chatbot configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Enable ChatBot</h3>
          <p className="text-sm text-gray-500">
            Toggle the chatbot functionality for all users
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={config.enabled}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, enabled: e.target.checked }))
            }
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Welcome Message
        </label>
        <textarea
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          rows={3}
          value={config.welcome_message}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, welcome_message: e.target.value }))
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Max Tokens
          </label>
          <input
            type="number"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={config.max_tokens}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                max_tokens: parseInt(e.target.value),
              }))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Temperature
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={config.temperature}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                temperature: parseFloat(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Model</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          value={config.model}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, model: e.target.value }))
          }
        >
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
        </select>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          disabled={isSaving}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default ChatBotSettings; 