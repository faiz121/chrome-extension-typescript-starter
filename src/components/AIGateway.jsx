import React, { useState } from 'react';
import { ChevronDown, Send } from 'lucide-react';

const AIGateway = () => {
  const [model, setModel] = useState('auto');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const models = [
    { id: 'auto', name: 'Auto (Recommended)' },
    { id: 'gemini-1.5', name: 'Gemini 1.5' },
    { id: 'claude-3.5', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-haiku', name: 'Claude Haiku' },
    { id: 'gpt4-mini', name: 'GPT-4 Mini' }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Main content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Model Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="w-full px-3 py-2 text-left bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 flex items-center justify-between"
          >
            <span>{models.find(m => m.id === model)?.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
          
          {isModelDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setModel(m.id);
                    setIsModelDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter system instructions..."
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-32 resize-none"
          />
        </div>
      </div>

      {/* User Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative bg-white shadow-sm rounded-3xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Enter your message..."
            className="w-full px-4 py-3 bg-transparent border-none rounded-3xl focus:outline-none resize-none"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
          <button className="absolute right-2 bottom-2 p-1.5 text-gray-500 hover:bg-gray-100 rounded-full">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIGateway;