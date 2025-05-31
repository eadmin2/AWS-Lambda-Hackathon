import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { cn } from '../../lib/utils';

interface AuthTabsProps {
  defaultTab?: 'login' | 'register';
  onSuccess?: () => void;
}

const AuthTabs: React.FC<AuthTabsProps> = ({ 
  defaultTab = 'login',
  onSuccess 
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);

  return (
    <div className="w-full max-w-md">
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('login')}
          className={cn(
            'flex-1 py-3 text-center font-medium text-sm border-b-2 focus:outline-none transition-colors',
            activeTab === 'login'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Sign In
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={cn(
            'flex-1 py-3 text-center font-medium text-sm border-b-2 focus:outline-none transition-colors',
            activeTab === 'register'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Create Account
        </button>
      </div>

      {activeTab === 'login' ? (
        <LoginForm onSuccess={onSuccess} />
      ) : (
        <RegisterForm onSuccess={onSuccess} />
      )}
    </div>
  );
};

export default AuthTabs;