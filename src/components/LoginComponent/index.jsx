import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const LoginComponent = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Mock SSO flow - will be replaced with actual PKCE flow
      window.open('https://mock-sso-url.com', '_blank');
      
      // Mock successful auth after 2 seconds
      setTimeout(() => {
        const mockSession = {
          username: 'testuser@example.com',
          token: 'mock-token'
        };
        
        // Save to storage
        chrome.storage.local.set({ session: mockSession }, () => {
          setIsLoading(false);
          onLogin(mockSession);
        });
      }, 2000);
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-2xl font-light text-gray-700">Welcome to Helion</h2>
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <span>Sign in to continue</span>
        )}
      </button>
    </div>
  );
};

export default LoginComponent;