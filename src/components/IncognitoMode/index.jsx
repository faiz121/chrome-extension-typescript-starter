// src/components/IncognitoMode/index.jsx
import React, { useState, useEffect, useRef } from 'react';
import { EyeOff, Shield, Cpu, ChevronDown, ChevronUp, Send } from 'lucide-react';
import './incognitoMode.css';

// Main IncognitoMode component that works with the offscreen document
const IncognitoMode = ({ currentGradient, username }) => {
  // Core state management
  const [isIncognitoEnabled, setIsIncognitoEnabled] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ llm: 0, embeddings: 0 });
  
  // Diagnostic state
  const [supportsWebGPU, setSupportsWebGPU] = useState(false);
  const [webGPUDetails, setWebGPUDetails] = useState(null);
  const [aiStatus, setAiStatus] = useState("Not initialized");
  const [debugInfo, setDebugInfo] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(true); // Show by default for testing
  
  // Test input state
  const [testInput, setTestInput] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");

  // Add debug message
  const addDebugMessage = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev, `${timestamp}: ${message}`].slice(-20)); // Keep last 20 messages
  };

  // Check WebGPU support on mount
  useEffect(() => {
    const checkWebGPU = async () => {
      try {
        addDebugMessage("Checking WebGPU support...");
        if (navigator.gpu) {
          // Further check by requesting an adapter
          try {
            const adapter = await navigator.gpu.requestAdapter();
            const supported = !!adapter;
            setSupportsWebGPU(supported);
            
            if (supported && adapter) {
              try {
                const info = await adapter.requestAdapterInfo();
                setWebGPUDetails({
                  vendor: info.vendor || "Unknown",
                  architecture: info.architecture || "Unknown",
                  device: info.device || "Unknown",
                  description: info.description || "No description available"
                });
                addDebugMessage(`WebGPU supported - ${info.vendor || "Unknown vendor"}`);
              } catch (infoError) {
                addDebugMessage(`WebGPU adapter info error: ${infoError.message}`);
                setWebGPUDetails({
                  vendor: "Unknown (info error)",
                  architecture: "Unknown",
                  device: "Unknown",
                  description: infoError.message
                });
              }
            } else {
              addDebugMessage("WebGPU adapter request failed or returned null");
            }
          } catch (adapterError) {
            addDebugMessage(`WebGPU adapter request error: ${adapterError.message}`);
            setSupportsWebGPU(false);
          }
        } else {
          setSupportsWebGPU(false);
          addDebugMessage("WebGPU not supported in this browser (navigator.gpu is undefined)");
        }
      } catch (e) {
        console.warn("Error checking WebGPU support:", e);
        setSupportsWebGPU(false);
        addDebugMessage(`WebGPU general check error: ${e.message}`);
      }
    };
    
    checkWebGPU();
    
    // Check incognito status
    chrome.runtime.sendMessage({ action: "getIncognitoStatus" }, (response) => {
      if (response && response.hasOwnProperty('isIncognitoMode')) {
        setIsIncognitoEnabled(response.isIncognitoMode);
        addDebugMessage(`Incognito mode status from background: ${response.isIncognitoMode ? 'Enabled' : 'Disabled'}`);
        
        if (response.isIncognitoMode) {
          setAiStatus("Initializing");
          setIsModelLoading(true);
          addDebugMessage("Incognito mode is already enabled, waiting for model loading updates");
        }
      }
    });
    
    // Set up message listener for model loading progress
    const handleMessages = (message) => {
      // Handle load progress messages
      if (message.type === "load-progress") {
        const { modelType, progress } = message;
        setLoadProgress(prev => ({
          ...prev,
          [modelType]: progress
        }));
        setIsModelLoading(true);
        
        if (progress % 20 === 0 || progress >= 99) { // Log less frequently
          addDebugMessage(`${modelType.toUpperCase()} loading: ${Math.round(progress)}%`);
        }
      }
      
      // Handle initialization success
      if (message.type === "ai-initialized") {
        setIsModelLoaded(true);
        setIsModelLoading(false);
        setLoadProgress({ llm: 100, embeddings: 100 });
        setAiStatus("Models loaded");
        addDebugMessage("All models loaded successfully");
      }
      
      // Handle initialization error
      if (message.type === "ai-error") {
        setIsModelLoading(false);
        setAiStatus(`Error: ${message.error}`);
        addDebugMessage(`AI initialization error: ${message.error}`);
      }
      
      // Handle debug logs from offscreen
      if (message.type === "debug-log") {
        addDebugMessage(`Offscreen: ${message.message}`);
      }
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(handleMessages);
    
    // Cleanup on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessages);
    };
  }, []);
  
  // Handle toggling incognito mode
  const handleToggleChange = () => {
    const newState = !isIncognitoEnabled;
    addDebugMessage(`Toggling incognito mode to: ${newState}`);
    
    // Reset UI state if turning off
    if (!newState) {
      setIsModelLoaded(false);
      setIsModelLoading(false);
      setLoadProgress({ llm: 0, embeddings: 0 });
      setAiStatus("Not initialized");
    } else {
      // Prepare for loading if turning on
      setIsModelLoading(true);
      setAiStatus("Initializing");
    }
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
      action: "toggleIncognitoMode", 
      enabled: newState 
    }, response => {
      if (response && response.success) {
        setIsIncognitoEnabled(newState);
        addDebugMessage(`Incognito mode toggle successful: ${newState}`);
      } else if (response && response.error) {
        addDebugMessage(`Error toggling incognito mode: ${response.error}`);
        // Revert UI state on error
        setIsIncognitoEnabled(!newState);
        setIsModelLoading(false);
        setAiStatus("Error");
      }
    });
  };
  
  // Process test input through the background script
  const processTestInput = async (input) => {
    addDebugMessage(`Processing test input: "${input.substring(0, 20)}${input.length > 20 ? '...' : ''}"`);
    
    return new Promise((resolve, reject) => {
      // Create stream handler function to update UI
      const handleStreamUpdate = (chunk) => {
        setStreamingResponse(prev => prev + chunk);
      };
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: "generateText",
        prompt: input,
        onChunk: handleStreamUpdate,
        onComplete: () => {
          addDebugMessage("Text generation completed");
          resolve();
        },
        onError: (error) => {
          addDebugMessage(`Text generation error: ${error}`);
          reject(new Error(error));
        }
      }, response => {
        if (response && response.error) {
          addDebugMessage(`Failed to initiate text generation: ${response.error}`);
          reject(new Error(response.error));
        } else {
          addDebugMessage(`Text generation request sent, ID: ${response.requestId}`);
        }
      });
    });
  };
  
  // Handle test input submission
  const handleTestSubmit = async (e) => {
    e.preventDefault();
    
    if (!testInput.trim() || !isIncognitoEnabled || !isModelLoaded) {
      return;
    }
    
    setIsProcessing(true);
    setTestResponse('');
    setStreamingResponse('');
    
    try {
      await processTestInput(testInput);
      
      // Once complete, set the full response
      setTestResponse(streamingResponse);
    } catch (error) {
      console.error('Error processing input:', error);
      setTestResponse(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="incognito-mode-container">
      <div className="incognito-header">
        <h2>
          <EyeOff className="w-5 h-5 text-gray-500 mr-2" />
          Privacy-First Document Analysis
        </h2>
        <div className="incognito-toggle-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isIncognitoEnabled}
              onChange={handleToggleChange}
              disabled={isModelLoading}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">
            {isIncognitoEnabled ? 'On' : 'Off'}
          </span>
        </div>
      </div>
      
      <div className="incognito-status">
        {!isIncognitoEnabled ? (
          <div className="status-message warning">
            <p>
              Incognito mode is disabled. Enable it to process AI requests locally without sending data to any servers.
            </p>
          </div>
        ) : isModelLoading ? (
          <div className="status-message loading">
            <p>Loading AI models... <span className="font-mono">[{aiStatus}]</span></p>
            <div className="progress-container">
              <div className="progress-label">LLM: {Math.round(loadProgress.llm)}%</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${loadProgress.llm}%`}}></div>
              </div>
            </div>
            <div className="progress-container">
              <div className="progress-label">Embeddings: {Math.round(loadProgress.embeddings)}%</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${loadProgress.embeddings}%`}}></div>
              </div>
            </div>
          </div>
        ) : isModelLoaded ? (
          <div className="status-message success">
            <p>
              ✓ Local AI models loaded and ready - <span className="font-mono">[{aiStatus}]</span>
              <br />
              {supportsWebGPU 
                ? `Using WebGPU acceleration: ${webGPUDetails?.vendor || 'Unknown'}`
                : 'Using CPU-only mode (WebGPU not available)'}
            </p>
          </div>
        ) : null}
      </div>

      {isIncognitoEnabled && isModelLoaded && (
        <div className="test-input-container">
          <h3>Test the local AI model</h3>
          <form onSubmit={handleTestSubmit}>
            <div className="input-row">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Type a message to test the local model..."
                disabled={isProcessing}
                className="test-input"
              />
              <button 
                type="submit" 
                disabled={isProcessing || !testInput.trim()}
                className="test-submit"
              >
                {isProcessing ? 'Processing...' : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
          
          {streamingResponse || testResponse ? (
            <div className="test-response-container">
              <h4>Response:</h4>
              <div className="test-response-content">
                {isProcessing ? streamingResponse : testResponse}
                {isProcessing && <span className="blinking-cursor">|</span>}
              </div>
            </div>
          ) : null}
        </div>
      )}
      
      <div className="diagnostic-panel">
        <button 
          className="diagnostic-toggle" 
          onClick={() => setShowDebugPanel(!showDebugPanel)}
        >
          <Cpu className="w-4 h-4 mr-1" />
          Diagnostics
          {showDebugPanel ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>
        
        {showDebugPanel && (
          <div className="debug-panel">
            <div className="debug-section">
              <h4>WebGPU Status</h4>
              <p>Supported: {supportsWebGPU ? 'Yes' : 'No'}</p>
              {webGPUDetails && (
                <div className="webgpu-details">
                  <p>Vendor: {webGPUDetails.vendor}</p>
                  <p>Architecture: {webGPUDetails.architecture}</p>
                  <p>Device: {webGPUDetails.device}</p>
                </div>
              )}
            </div>
            
            <div className="debug-section">
              <h4>AI Status</h4>
              <p>State: {aiStatus}</p>
              <p>Model loading: {isModelLoading ? 'In progress' : isModelLoaded ? 'Complete' : 'Not started'}</p>
              <p>Incognito mode: {isIncognitoEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            
            <div className="debug-section">
              <h4>Debug Log</h4>
              <div className="debug-log">
                {debugInfo.map((msg, i) => (
                  <div key={i} className="debug-message">{msg}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="incognito-info">
        <h3>How Incognito Mode Works</h3>
        <ul>
          <li>Your messages are processed entirely in your browser</li>
          <li>No data is sent to remote servers</li>
          <li>Uses compact AI models optimized for browser performance</li>
          <li>{supportsWebGPU 
            ? 'Leverages your GPU for faster processing via WebGPU' 
            : 'Uses your CPU for processing (enable WebGPU in browser settings for better performance)'}</li>
        </ul>
      </div>
    </div>
  );
};

export default IncognitoMode;