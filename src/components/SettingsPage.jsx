import React, { useState, useEffect } from 'react';
import { Cog, Database, Network, Radio } from 'lucide-react';

const COSMOS_PROFILES = [
  'dpe_search', 
  'Risk_platforms', 
  'xbot', 
  'compliance_gfci', 
  'amps_solutions', 
  'FI-Domain'
];

const SettingsPage = ({ onClose }) => {
  const [useLocalLLM, setUseLocalLLM] = useState(false);
  const [ollamaIP, setOllamaIP] = useState('127.0.0.1');
  const [ollamaPort, setOllamaPort] = useState(11434);
  const [modelName, setModelName] = useState('');
  const [vectorDBPath, setVectorDBPath] = useState('');
  const [selectedCosmosProfile, setSelectedCosmosProfile] = useState('');

  useEffect(() => {
    // Retrieve existing settings from chrome storage when component mounts
    chrome.storage.sync.get([
      'useLocalLLM', 
      'ollamaIP', 
      'ollamaPort', 
      'modelName', 
      'vectorDBPath',
      'cosmosProfile'
    ], (result) => {
      setUseLocalLLM(result.useLocalLLM || false);
      setOllamaIP(result.ollamaIP || '127.0.0.1');
      setOllamaPort(result.ollamaPort || 11434);
      setModelName(result.modelName || '');
      setVectorDBPath(result.vectorDBPath || '');
      setSelectedCosmosProfile(result.cosmosProfile || '');
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Save settings to chrome storage
    chrome.storage.sync.set({
      useLocalLLM,
      ollamaIP,
      ollamaPort,
      modelName,
      vectorDBPath,
      cosmosProfile: selectedCosmosProfile
    }, () => {
      // Optional: Show a success message or toast
      console.log('Settings saved successfully');
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div 
        className="bg-white p-6 rounded-md shadow-2xl w-96 relative"
        style={{ zIndex: 10000, width: '94vw' }}
      >
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Cog className="w-6 h-6 text-blue-500" />
          Settings
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Local LLM Toggle */}
          <div className="mb-4 flex items-center">
            <label className="block text-gray-700 text-sm font-bold mr-2">
              Use Local LLM
            </label>
            <input 
              type="checkbox" 
              checked={useLocalLLM}
              onChange={(e) => setUseLocalLLM(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
          </div>

          {/* Ollama Connection Settings */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Ollama IP
            </label>
            <input 
              type="text" 
              value={ollamaIP}
              onChange={(e) => setOllamaIP(e.target.value)}
              placeholder="127.0.0.1"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Ollama Port
            </label>
            <input 
              type="number" 
              value={ollamaPort}
              onChange={(e) => setOllamaPort(Number(e.target.value))}
              placeholder="11434"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Model Name
            </label>
            <input 
              type="text" 
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Enter model name"
              className="w-full p-2 border rounded-md"
            />
          </div>

          {/* Vector DB Path */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Vector DB Path (Qdrant)
            </label>
            <input 
              type="text" 
              value={vectorDBPath}
              onChange={(e) => setVectorDBPath(e.target.value)}
              placeholder="/path/to/qdrant"
              className="w-full p-2 border rounded-md"
            />
          </div>

          {/* Cosmos Profile Dropdown */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Default Cosmos Profile
            </label>
            <select
              value={selectedCosmosProfile}
              onChange={(e) => setSelectedCosmosProfile(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select a Cosmos Profile</option>
              {COSMOS_PROFILES.map((profile) => (
                <option key={profile} value={profile}>
                  {profile}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-gray-300 px-4 py-2 rounded-md mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;