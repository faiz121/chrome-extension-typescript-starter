import React, { useState, useRef, useEffect } from 'react';
import { Send, Save, Check, X } from 'lucide-react';
import SystemMessageBubble from './SystemMessageBubble';

const AIGateway = ({ username, currentGradient }) => {
  const [model, setModel] = useState('auto');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isPromptPanelVisible, setIsPromptPanelVisible] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [promptName, setPromptName] = useState('');
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    chrome.storage.local.get([`savedPrompts_${username}`], (result) => {
      const userPrompts = result[`savedPrompts_${username}`] || [
        { name: 'Content Summary', prompt: 'Write a concise summary of the following content while retaining key information and maintaining the original tone.' },
        { name: 'Email Rewrite', prompt: 'Rewrite this email to be more professional and concise while keeping the main points.' }
      ];
      setSavedPrompts(userPrompts);
    });
  }, [username]);

  const getCurrentPromptName = () => {
    const currentPrompt = savedPrompts.find(p => p.prompt === systemPrompt);
    return currentPrompt ? currentPrompt.name : 'Create new prompt';
  };

  const saveMessageTimeoutRef = useRef(null);

  const savePrompt = () => {
    if (!systemPrompt.trim() || !promptName.trim()) return;
    
    const newPrompts = [...savedPrompts, { name: promptName, prompt: systemPrompt }];
    chrome.storage.local.set({
      [`savedPrompts_${username}`]: newPrompts
    });
    setSavedPrompts(newPrompts);
    setSaveMessage('Prompt saved successfully');
    setIsSaving(false);
    setPromptName('');
    
    if (saveMessageTimeoutRef.current) {
      clearTimeout(saveMessageTimeoutRef.current);
    }
    saveMessageTimeoutRef.current = setTimeout(() => {
      setSaveMessage('');
    }, 3000);
  };

  const loadPrompt = (selectedPrompt) => {
    const found = savedPrompts.find(p => p.prompt === selectedPrompt);
    if (found) setSystemPrompt(found.prompt);
  };

  const models = [
    { id: 'auto', name: 'Auto (Recommended)' },
    { id: 'gemini-1.5', name: 'Gemini 1.5' },
    { id: 'claude-3.5', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-haiku', name: 'Claude Haiku' },
    { id: 'gpt4-mini', name: 'GPT-4 Mini' }
  ];

  const handleSend = async () => {
    if (!userPrompt.trim()) return;
    const message = { prompt: systemPrompt, text: userPrompt };
    
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
    setUserPrompt('');
    setIsPromptPanelVisible(false);
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockResponse = `Here's a simulated response to: "${userPrompt}"`;
    setMessages(prev => [...prev, { role: 'assistant', content: mockResponse }]);
    setIsLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="absolute inset-0" style={{ background: currentGradient, opacity: 0.05 }} />
      
      <div className="flex-1 overflow-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className="mb-4">
            {message.role === 'assistant' ? (
              <SystemMessageBubble content={message.content} />
            ) : (
              <div className="flex justify-end">
                <div className="bg-blue-500 text-white rounded-lg px-4 py-2 max-w-[85%]">
                  {message.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && <SystemMessageBubble content="Loading..." isLoading={true} />}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="relative p-4 border-t border-gray-200 space-y-4">
        <div className={`transition-all duration-300 origin-bottom bg-white rounded-lg mx-auto w-full shadow-lg ${
          isPromptPanelVisible ? 'max-h-96 p-4' : 'max-h-0 overflow-hidden'
        }`}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">System Prompt</label>
                <button
                  onClick={() => setIsSaving(true)}
                  disabled={!systemPrompt.trim()}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
              <select
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setSystemPrompt('');
                  } else {
                    loadPrompt(e.target.value);
                  }
                }}
                value={savedPrompts.find(p => p.prompt === systemPrompt)?.prompt || 'new'}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer text-sm mb-2"
              >
                <option value="new">Create new prompt</option>
                {savedPrompts.map((p, index) => (
                  <option key={index} value={p.prompt}>
                    {p.name}
                  </option>
                ))}
              </select>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system instructions..."
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-base focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-32 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative bg-white shadow-sm rounded-3xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            {!isPromptPanelVisible && (
              <div 
                className="flex items-center justify-between text-sm px-4 py-1.5 rounded-t-3xl bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100"
                onClick={() => setIsPromptPanelVisible(true)}
              >
                <span className="text-gray-600">Prompt: <span className="text-blue-500">{getCurrentPromptName()}</span></span>
                <span className="text-gray-600">Model: <span className="text-blue-500">{model === 'auto' ? 'Auto' : model}</span></span>
              </div>
            )}
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Enter your message..."
              className="w-full px-4 py-3 bg-transparent border-none rounded-3xl focus:outline-none resize-none text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:bg-gray-100 rounded-full"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-80">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Save Prompt</h3>
              <button onClick={() => setIsSaving(false)} className="text-gray-500 hover:bg-gray-100 rounded-full p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Enter prompt name"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsSaving(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={savePrompt}
                disabled={!promptName.trim()}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {saveMessage && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm flex items-center gap-1">
            <Check className="w-4 h-4" />
            {saveMessage}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIGateway;