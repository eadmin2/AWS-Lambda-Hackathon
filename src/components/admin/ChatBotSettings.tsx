import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Bot, Palette, MessageSquare, Settings, Eye, EyeOff, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { useChatBotConfig } from '../../hooks/useChatBotConfig';
import Chatbot from '../chat/Chatbot';

interface ChatBotSettingsFormData {
  botName: string;
  welcomeMessage: string;
  statusMessage: string;
  inputPlaceholder: string;
  primaryColor: string;
  headerColor: string;
  enabled: boolean;
  position: 'bottom-right' | 'bottom-left';
}

const ChatBotSettings = () => {
  const { config, loading, updateConfig } = useChatBotConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ChatBotSettingsFormData>({
    defaultValues: {
      botName: config?.botName || 'VA Assistant',
      welcomeMessage: config?.welcomeMessage || "Hi! I'm your VA Rating Assistant. How can I help you today?",
      statusMessage: config?.statusMessage || 'Online • Typically replies instantly',
      inputPlaceholder: config?.inputPlaceholder || 'Type your message...',
      primaryColor: config?.primaryColor || '#3b82f6',
      headerColor: config?.headerColor || '#f8fafc',
      enabled: config?.enabled ?? true,
      position: config?.position || 'bottom-right',
    },
  });

  // Watch form values for live preview
  const watchedValues = watch();

  React.useEffect(() => {
    if (config) {
      setValue('botName', config.botName);
      setValue('welcomeMessage', config.welcomeMessage);
      setValue('statusMessage', config.statusMessage);
      setValue('inputPlaceholder', config.inputPlaceholder);
      setValue('primaryColor', config.primaryColor);
      setValue('headerColor', config.headerColor);
      setValue('enabled', config.enabled);
      setValue('position', config.position);
    }
  }, [config, setValue]);

  const onSubmit = async (data: ChatBotSettingsFormData) => {
    try {
      setIsUpdating(true);
      setUpdateSuccess(false);
      setUpdateError(null);

      await updateConfig({
        ...data,
        updated_at: new Date().toISOString(),
      });

      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating chatbot config:', error);
      setUpdateError('Failed to update chatbot settings. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const presetColors = [
    { name: 'Primary Blue', value: '#3b82f6' },
    { name: 'VA Navy', value: '#0A2463' },
    { name: 'Success Green', value: '#22c55e' },
    { name: 'Warning Orange', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Red', value: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chatbot Settings</h1>
          <p className="text-gray-600">Configure your VA Rating Assistant chatbot</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowPreview(!showPreview)}
            leftIcon={showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {updateSuccess && (
        <div className="bg-success-100 border border-success-200 p-4 rounded-md">
          <p className="text-success-700 text-sm font-medium">
            Chatbot settings updated successfully!
          </p>
        </div>
      )}

      {updateError && (
        <div className="bg-error-100 border border-error-200 p-4 rounded-md">
          <p className="text-error-700 text-sm">{updateError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2" />
                  Basic Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bot Name
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    {...register('botName', { required: 'Bot name is required' })}
                  />
                  {errors.botName && (
                    <p className="text-error-500 text-xs mt-1">{errors.botName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Welcome Message
                  </label>
                  <textarea
                    rows={3}
                    className="input w-full"
                    {...register('welcomeMessage', { required: 'Welcome message is required' })}
                  />
                  {errors.welcomeMessage && (
                    <p className="text-error-500 text-xs mt-1">{errors.welcomeMessage.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Message
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    {...register('statusMessage', { required: 'Status message is required' })}
                  />
                  {errors.statusMessage && (
                    <p className="text-error-500 text-xs mt-1">{errors.statusMessage.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Input Placeholder
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    {...register('inputPlaceholder', { required: 'Input placeholder is required' })}
                  />
                  {errors.inputPlaceholder && (
                    <p className="text-error-500 text-xs mt-1">{errors.inputPlaceholder.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="enabled"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    {...register('enabled')}
                  />
                  <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                    Enable Chatbot
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-3 mb-3">
                    <input
                      type="color"
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      {...register('primaryColor')}
                    />
                    <input
                      type="text"
                      className="input flex-1"
                      {...register('primaryColor')}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setValue('primaryColor', color.value)}
                        className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 text-xs"
                      >
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: color.value }}
                        />
                        <span>{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Header Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      {...register('headerColor')}
                    />
                    <input
                      type="text"
                      className="input flex-1"
                      {...register('headerColor')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select className="input w-full" {...register('position')}>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              type="submit"
              isLoading={isUpdating}
              leftIcon={<Save className="h-4 w-4" />}
              className="w-full"
            >
              Save Settings
            </Button>
          </form>
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg p-4 min-h-[400px] relative">
                <p className="text-sm text-gray-600 mb-4">
                  Preview of how your chatbot will appear to users:
                </p>
                
                {/* Mock Chat Window */}
                <div className="absolute bottom-4 right-4 w-80 h-96 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
                  {/* Header */}
                  <div 
                    className="flex items-center justify-between p-4 border-b border-gray-200"
                    style={{ backgroundColor: watchedValues.headerColor }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: watchedValues.primaryColor }}
                      >
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {watchedValues.botName}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {watchedValues.statusMessage}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 p-4 space-y-3">
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: watchedValues.primaryColor }}
                        >
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                        <div className="bg-gray-100 px-3 py-2 rounded-2xl text-sm max-w-[200px]">
                          {watchedValues.welcomeMessage}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <div 
                        className="px-3 py-2 rounded-2xl text-sm text-white max-w-[200px]"
                        style={{ backgroundColor: watchedValues.primaryColor }}
                      >
                        Hello! I need help with my VA rating.
                      </div>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder={watchedValues.inputPlaceholder}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm"
                        disabled
                      />
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: watchedValues.primaryColor }}
                      >
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Chatbot Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">1,234</div>
                  <div className="text-sm text-gray-600">Total Conversations</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">89%</div>
                  <div className="text-sm text-gray-600">Resolution Rate</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">2.3</div>
                  <div className="text-sm text-gray-600">Avg Messages</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">4.8</div>
                  <div className="text-sm text-gray-600">User Rating</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Chatbot Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Live Chatbot Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-gray-600 mb-4">
              This is how your chatbot will appear to users on your website.
            </p>
            <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
              <Chatbot />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBotSettings; 