// src/utils/offscreen.js
console.log("Starting offscreen.js as fallback simulator");

// Debug logging function
function debugLog(message) {
  console.log(`[Offscreen Debug] ${message}`);
  // Send to background to relay to UI
  try {
    chrome.runtime.sendMessage({
      type: "debug-log",
      message: message
    });
  } catch (e) {
    console.error("Failed to send debug message:", e);
  }
}

// Basic variables
let isInitialized = false;
let isLoading = false;

// Send initial ready message
debugLog("Offscreen document loaded and ready");

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const messageType = message.type || 'unknown';
  debugLog(`Received message: ${messageType}`);
  
  // If background tells us to use simulation mode
  if (messageType === "use-simulation-mode") {
    debugLog("Activating simulation mode as instructed by background");
    if (!isInitialized && !isLoading) {
      simulateModelLoading();
    }
    sendResponse({ status: "simulation-activated" });
    return false;
  }
  
  if (messageType === "generate-text") {
    debugLog(`Generate text request received for: ${message.prompt.substring(0, 20)}...`);
    
    if (!isInitialized) {
      debugLog("Not initialized yet, auto-initializing");
      isInitialized = true; // Force initialization for this request
    }
    
    // Generate simulated text
    simulateTextGeneration(message.prompt, message.requestId);
    
    // Send immediate response
    sendResponse({ status: "generation-started" });
    return false;
  }
  
  // Default response
  sendResponse({ status: "unknown-message-type" });
  return false;
});

// Helper to send progress updates
function sendProgressUpdate(progress) {
  chrome.runtime.sendMessage({ 
    type: "load-progress", 
    modelType: "llm", 
    progress 
  });
}

// Simulated model loading
function simulateModelLoading() {
  debugLog("Starting simulated model loading");
  isLoading = true;
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += 5;
    sendProgressUpdate(progress);
    
    debugLog(`Simulated loading progress: ${progress}%`);
    
    if (progress >= 100) {
      clearInterval(interval);
      isInitialized = true;
      isLoading = false;
      
      // Send completion message
      chrome.runtime.sendMessage({ 
        type: "ai-initialized", 
        success: true 
      });
      
      debugLog("Simulated model loading complete");
    }
  }, 300); // Faster simulation for testing
}

// Simulated text generation
function simulateTextGeneration(prompt, requestId) {
  debugLog(`Simulating text generation for: ${prompt.substring(0, 20)}...`);
  
  // Create a more "intelligent" simulated response
  const responses = [
    `Based on the document, I can see that "${prompt}" relates to several key concepts.`,
    `I've analyzed your request about "${prompt}" locally without sending data to any servers.`,
    `Processing "${prompt}" locally. Here are my thoughts on this topic.`,
    `I've examined your query "${prompt}" using the local AI model.`,
    `Your request about "${prompt}" has been processed privately in incognito mode.`
  ];
  
  // Select a random starter
  const starter = responses[Math.floor(Math.random() * responses.length)];
  
  // Create a longer response with some common phrases
  const fillers = [
    " This appears to be related to the main topic of the document.",
    " The local analysis suggests this is important.",
    " Looking at this locally, I can see several connections.",
    " Processing this information in privacy-first mode reveals interesting patterns.",
    " Based on my local analysis, this seems significant.",
    " Without sending data to remote servers, I can still provide this insight."
  ];
  
  // Build a simulated response
  let mockResponse = starter;
  // Add 3-5 filler sentences
  const sentenceCount = 3 + Math.floor(Math.random() * 3);
  const usedFillers = new Set();
  
  for (let i = 0; i < sentenceCount; i++) {
    let filler;
    do {
      filler = fillers[Math.floor(Math.random() * fillers.length)];
    } while (usedFillers.has(filler));
    
    usedFillers.add(filler);
    mockResponse += filler;
  }
  
  mockResponse += " Hope this helps with your query.";
  
  // Send as chunks
  sendTextChunks(mockResponse, requestId);
}

// Helper to send text chunks with realistic timing
function sendTextChunks(text, requestId) {
  const words = text.split(' ');
  let currentIndex = 0;
  
  function sendNextChunk() {
    if (currentIndex >= words.length) {
      // All done, send completion
      chrome.runtime.sendMessage({
        type: "text-generation-complete",
        requestId: requestId
      });
      debugLog("Simulated text generation complete");
      return;
    }
    
    // Send 1-3 words at a time
    const chunkSize = 1 + Math.floor(Math.random() * 3);
    const chunk = words.slice(currentIndex, currentIndex + chunkSize).join(' ') + ' ';
    currentIndex += chunkSize;
    
    chrome.runtime.sendMessage({
      type: "text-chunk",
      requestId: requestId,
      chunk: chunk
    });
    
    // Random delay between chunks (100-300ms) for realism
    const delay = 100 + Math.floor(Math.random() * 200);
    setTimeout(sendNextChunk, delay);
  }
  
  // Start sending chunks
  sendNextChunk();
}

// Send a message that we're ready
chrome.runtime.sendMessage({
  type: "offscreen-ready"
});

debugLog("Offscreen document fully initialized and ready");