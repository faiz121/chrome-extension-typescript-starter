import { pipeline, env } from '@huggingface/transformers';
import {isDataWithinSession, recursiveTextSplitter, decodeJwt, processTranscriptData} from './helpers/utils';

const MAX_CONCURRENT_CALLS = 3; // You can change this value as needed
const CLIENT_ID = "";
// Configure transformers environment
env.useBrowserCache = true;
env.allowLocalModels = false;
env.useWasmThreads = false; // Disable threaded WASM to avoid CSP issues

// Store pending request callbacks
let isIncognitoMode = false;
const pendingRequests = new Map();
let nextRequestId = 1;

// Model variables
let textGenerationPipeline = null;
let isModelInitialized = false;
let isModelLoading = false;

// Debug logging function
function debugLog(message) {
  console.log(`[Background Debug] ${message}`);
  // Forward to UI
  broadcastToTabs({
    type: "debug-log",
    message: message
  });
}
// Function to create the offscreen document
// Function to create the offscreen document
async function createOffscreenDocument() {
  console.log("Attempting to create offscreen document...");
  try {
    // Check if document already exists
    if ('getContexts' in chrome.runtime) {
      console.log("Checking for existing offscreen documents...");
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL('offscreen.html')]
      });
      
      console.log("Existing contexts:", existingContexts);
      if (existingContexts.length > 0) {
        console.log("Offscreen document already exists");
        return;
      }
    }
    
    // Log the URL we're trying to use
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    console.log("Creating offscreen document with URL:", offscreenUrl);
    
    // Create an offscreen document with a valid reason
    await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ['DOM_PARSER'], // Valid reason from the error list
      justification: 'Running machine learning models that require DOM access'
    });
    console.log("Offscreen document created successfully");
    return true;
  } catch (e) {
    console.error("Error creating offscreen document:", e);
    console.error("Error details:", e.message, e.stack);
    throw e;
  }
}

// Function to close the offscreen document
async function closeOffscreenDocument() {
  try {
    await chrome.offscreen.closeDocument();
  } catch (e) {
    console.error("Error closing offscreen document:", e);
  }
}
// Check if incognito mode was enabled in previous session
chrome.storage.local.get('incognitoMode', (result) => {
  if (result.hasOwnProperty('incognitoMode')) {
    console.log("Retrieved incognito mode from storage:", result.incognitoMode);
    isIncognitoMode = result.incognitoMode;
    // If incognito mode was enabled, recreate the offscreen document and initialize model
    if (isIncognitoMode) {
      console.log("Auto-enabling incognito mode from previous session");
      initializeModel();
    }
  }
});

// Function to forward messages to all tabs
function broadcastToTabs(message) {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Ignore errors if content script is not loaded in tab
      });
    });
  });
}

// Function to send progress updates
function sendProgressUpdate(progress) {
  broadcastToTabs({
    type: "load-progress", 
    modelType: "llm", 
    progress
  });
}

// Initialize model in background
async function initializeModel() {
  if (isModelInitialized) {
    debugLog("Model already initialized");
    broadcastToTabs({ type: "ai-initialized", success: true });
    return;
  }
  
  if (isModelLoading) {
    debugLog("Model already loading");
    return;
  }
  
  isModelLoading = true;
  debugLog("Starting model initialization in background");
  
  try {
    // Initial progress update
    sendProgressUpdate(0);
    
    // Use a tiny model for testing
    const modelId = "Xenova/distilgpt2";
    debugLog(`Using model: ${modelId}`);
    
    // Create the pipeline with progress callback
    textGenerationPipeline = await pipeline(
      'text-generation',
      modelId,
      {
        progress_callback: (progress) => {
          debugLog(`Loading progress: ${Math.round(progress)}%`);
          sendProgressUpdate(progress);
        },
        quantized: true  // Use smaller model size
      }
    );
    
    // Final progress update
    sendProgressUpdate(100);
    
    // Mark as initialized
    isModelInitialized = true;
    isModelLoading = false;
    
    // Notify of successful initialization
    broadcastToTabs({ 
      type: "ai-initialized", 
      success: true 
    });
    
    debugLog("Model initialization complete");
  } catch (error) {
    debugLog(`Error initializing model: ${error.message}`);
    console.error("Full error:", error);
    
    // Send error notification
    broadcastToTabs({ 
      type: "ai-error", 
      error: error.message 
    });
    
    isModelLoading = false;
    
  }
}

// Generate text using the model in background
async function generateText(prompt, requestId) {
  if (!isModelInitialized) {
    // If model not initialized in background, try offscreen simulation
    debugLog("Model not initialized, forwarding to offscreen simulation");
    chrome.runtime.sendMessage({
      type: "generate-text",
      prompt: prompt,
      requestId: requestId
    });
    return;
  }
  
  try {
    debugLog(`Generating text for prompt: ${prompt.substring(0, 30)}...`);
    
    // Use the pipeline to generate text
    const result = await textGenerationPipeline(prompt, {
      max_new_tokens: 50,
      temperature: 0.7,
      callback_function: (output) => {
        // Send streaming updates
        const callbacks = pendingRequests.get(requestId);
        if (callbacks && callbacks.onChunk) {
          callbacks.onChunk(output);
        }
      }
    });
    
    // Signal completion
    const callbacks = pendingRequests.get(requestId);
    if (callbacks && callbacks.onComplete) {
      callbacks.onComplete();
      pendingRequests.delete(requestId);
    }
    
    debugLog("Text generation complete");
  } catch (error) {
    debugLog(`Error generating text: ${error.message}`);
    
    // Handle error
    const callbacks = pendingRequests.get(requestId);
    if (callbacks && callbacks.onError) {
      callbacks.onError(error.message);
      pendingRequests.delete(requestId);
    }
    
    // Fallback to simulation if model generation fails
    chrome.runtime.sendMessage({
      type: "generate-text",
      prompt: prompt,
      requestId: requestId
    });
  }
}
async function generate_highlights_llm_helper(transcript) {
  const url =
    '';
  const chunkSize = 32000; // Adjust as needed, based on token limit.
  const chunkOverlap = 200; //  Adjust as needed.
  const delimiters = ['\n\n', '\n', '. ', ' ', '']; // delimiters for splitting
  const maxTokens = 3000;

  // Function to process each chunk and return results
  async function processChunk(chunk, combined = false) {
    const prompt = `
    You are an advanced AI assistant tasked with extracting only the most significant highlights from a transcript, focusing on impactful technical decisions, architectural changes, or critical business impacts.

    Key Criteria for a Significant Highlight:
    - Must involve a technical decision that affects the system architecture
    - Changes that impact multiple services or teams
    - Business decisions with measurable impact
    - Major process changes or workflow updates
    - Breaking changes or backward-incompatible updates
    - Security or performance-related decisions

    Avoid including:
    - General discussions without concrete decisions
    - Questions or clarifications
    - Minor updates or routine changes
    - Individual opinions without team consensus
    - Process explanations without decisions
    - Debug or troubleshooting discussions

    **Format Requirements**:
    - Start with "### Highlights"
    - Each highlight must:
      - Begin with "#####" for the title
      - Include timestamp on the next line (e.g., MM:SS - MM:SS)
      - Provide a concise description focusing on the decision and its impact
    - Separate each highlight with one blank line
    - Return a MAXIMUM of 5 highlights, only if they meet the significance criteria
    - ${
      combined
        ? `**If the transcripts contains highlights already then it means you are combining the 
      highlights, it is possible that there are more than 5 highlights, if so, find the most important ones and restrict it to only 5`
        : ''
    } 

    Analyze the transcript and extract the most significant highlights:
    \`\`\`
    ${chunk}
    \`\`\`
  `;
    return llmApiCall(prompt, url, maxTokens);
  }
  const splits = recursiveTextSplitter(transcript, chunkSize, chunkOverlap, delimiters);

  console.log('splits size', splits.length);

  async function recursiveHighlightGenerator(parts) {
    if (parts.length === 1) {
      console.log('combined highlights');
      return await processChunk(parts[0], true);
    }

    let combinedHighlights = '';
    // Process chunks in batches to control concurrency
    for (let i = 0; i < parts.length; i += MAX_CONCURRENT_CALLS) {
      const batch = parts.slice(i, i + MAX_CONCURRENT_CALLS);
      const chunkedHighlights = await Promise.all(batch.map((chunk) => processChunk(chunk)));
      combinedHighlights += chunkedHighlights.join('\n');
    }


    const newSplits = recursiveTextSplitter(
      combinedHighlights,
      chunkSize,
      chunkOverlap,
      delimiters
    );
    return recursiveHighlightGenerator(newSplits);
  }
  return recursiveHighlightGenerator(splits);
}

async function ingestTabData(userId, content, source) {
  const url = '';

  const data = {
    data: [
      {
        content: content,
        metadata: {
          source: source,
        },
      },
    ],
  };

  const headers = {
    'user-id': userId,
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error ingesting tab data:', error);
    throw error;
  }
}


async function uploadFile(formData, userId) {
  const url = '';
  const headers = {
      'user-id': userId
  };

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: formData,
          timeout: 0,
          processData: false,
          "mimeType": "multipart/form-data",
      });

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }
      return await response.json();
  } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
  }
}

async function llmApiCall(prompt, url, maxTokens) {
  const data = {
    parameters: {
      extra: {
        max_new_tokens: maxTokens,
        temperature: 0.7,
      },
    },
    inputs: [
      {
        name: 'input',
        shape: [1],
        datatype: 'str',
        data: [prompt],
      },
    ],
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    if (response.status_code === 403) {
      throw new Error('Access denied: You do not have permission to access this resource.');
    } else if (response.ok) {
      const responseJson = await response.json();
      const responseText = responseJson['outputs'][0]['data'][0];
      const formattedResponse = responseText.replace(/\\n/g, '\n');
      return formattedResponse;
    } else {
      throw new Error(`Unexpected status code: ${response.status_code}\n${await response.text()}`);
    }
  } catch (error) {
    console.error('Error in llmApiCall:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

async function customLLMCall(systemPrompt, userPrompt) {
  const url =
    '';
    const maxTokens = 3000;
  
    const chunkSize = 3000;
    const chunkOverlap = 200;
    const delimiters = ['\n\n', '\n', '. ', ' ', ''];

  async function processText(text) {

      const basePrompt = `
      You are an advanced AI assistant. Your task is to analyze the content based on the provided instruction.

      ### Instruction:
      ${systemPrompt}

      ### Content:
      \`\`\`
      ${text}
      \`\`\`

    `;
    return llmApiCall(basePrompt, url, maxTokens);
  }
   if (userPrompt.length > chunkSize) {

     const splits = recursiveTextSplitter(userPrompt, chunkSize, chunkOverlap, delimiters);

    async function recursiveProcessor(parts) {
        if (parts.length === 1) {
          return await processText(parts[0]); // Base case: single chunk
        }
    
        let summaries = [];
        for (const part of parts) {
          const summary = await processText(part);
          summaries.push(summary); 
        }
        const combinedSummary = summaries.join('\n');
    
        if (combinedSummary.length <= chunkSize) {
          return combinedSummary; // Return the combined summary directly
        }
    
        // Split again for recursion
        const newSplits = recursiveTextSplitter(combinedSummary, chunkSize, chunkOverlap, delimiters);
        return recursiveProcessor(newSplits);
      }
      return recursiveProcessor(splits);

   } else {
      return processText(userPrompt);
   }
}


async function summarization_llm_helper(content) {
  const url =
    '';
  const chunkSize = 32000;
  const chunkOverlap = 200;
  const delimiters = ['\n\n', '\n', '. ', ' ', ''];
  const maxTokens = 3000;
    const finalSummaryMaxWords = 200;

  const basePrompt = `
  <|begin_of_text|>
  <|start_header_id|>system<|end_header_id|>
  Use below contexts and answer user question. Use only relevant contexts information.<|eot_id|>
  <|start_header_id|>user<|end_header_id|>
  Context: {context}\n
  User question: Summarize the following content without omitting any important details. The summary should not be more than ${finalSummaryMaxWords} words. In addition to the headings below, carefully review the content and identify any other important details. Create appropriate headings for these details. Reference speaker or author name if available. Return the summary in markdown and do not use # or ## for headings. Title can be in ###.

  Possible headings (include only if relevant information is found in the content):
  - Key Findings
  - Action Items
  - Issues Discussed
  - Deadlines
  - Timelines
  - Potential solutions, if any and their limitations

  {content}<|eot_id|>
  <|start_header_id|>assistant<|end_header_id|>
`;

    const finalSummaryPrompt = `
    <|begin_of_text|>
    <|start_header_id|>system<|end_header_id|>
     You are an advanced summarization model.
    Your task is to analyze the content and summarize without omitting any important details. The summary should not be more than ${finalSummaryMaxWords} words and return the summary in markdown.
    
    Formatting rules:
    - Never use # or ## for headings
    - Only use ### or #### for headings
    - Format example: ### Section Title
    - All headings must start with ### or ####
    <|eot_id|>
    <|start_header_id|>user<|end_header_id|>
    {content}<|eot_id|>
    <|start_header_id|>assistant<|end_header_id|>
  `;

  async function summarizeText(text) {
    const prompt = basePrompt.replace('{context}', text).replace('{content}', text);
    return llmApiCall(prompt, url, maxTokens);
  }

    async function summarizeFinalText(text) {
        const prompt = finalSummaryPrompt.replace('{content}', text)
        return llmApiCall(prompt, url, maxTokens)
    }


  const splits = recursiveTextSplitter(content, chunkSize, chunkOverlap, delimiters);

  async function recursiveSummarizer(parts) {
    if (parts.length === 1) {
        return await summarizeText(parts[0]);
    }

    let combinedSummary = '';
    // Process chunks in batches to control concurrency
    for (let i = 0; i < parts.length; i += MAX_CONCURRENT_CALLS) {
      const batch = parts.slice(i, i + MAX_CONCURRENT_CALLS);
      const summaries = await Promise.all(batch.map(summarizeText));
      combinedSummary += summaries.join('\n');
    }


      if (combinedSummary.length <= chunkSize) {
          return  await summarizeFinalText(combinedSummary) ;
      }

    // Split again for the next level of recursion, using character length
    const newSplits = recursiveTextSplitter(combinedSummary, chunkSize, chunkOverlap, delimiters);
    return recursiveSummarizer(newSplits);
  }

  return recursiveSummarizer(splits);
}

async function requestTokens(authorizationCode, codeVerifier) {
  const extensionId = chrome.runtime.id;
  const redirectUri = `chrome-extension://${extensionId}/redirect.html`;
  const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', authorizationCode);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', CLIENT_ID);
    params.append('code_verifier', codeVerifier);
    params.append('code_challenge_method', 'S256')

    console.log('codeVerifier', codeVerifier)

    console.log('params---', params)

  const response = await fetch('https://sso.a.com/as/token.oauth2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const res = await response.json()
  const decodedToken = decodeJwt(res.id_token);
    if (!response.ok) {
        const errorBody = await response.text();
      console.error('Token request failed with status:', response.status, ' and body', errorBody);
        throw new Error(`Token request failed: ${response.status} - ${errorBody}`);
    }
    console.log('decodedToken.payload', decodedToken.payload)
    return decodedToken.payload
}

async function askGeneralQuestion(question, history = "") {
  const url =
  '';
  const maxTokens = 3000;
  const prompt = `
        <|begin_of_text|>
        <|start_header_id|>system<|end_header_id|>
        You are an AI assistant. Your task is to answer the user's question in a concise and direct manner, taking into account the conversation history.<|eot_id|>
        <|start_header_id|>user<|end_header_id|>
          ${history ? `### Previous Conversation:\n${history}\n\n` : ''}
        User question: ${question}

       ### Important Instructions:
        - **Prioritize finding an answer from the provided context.**
        - If using information from other tabs, cite the source URL.
        - If the question cannot be answered from the context, say: "The answer is not available from the provided context, but based on general knowledge, here is the answer"
        - **When providing a timestamp or time reference, format it as "X minutes and Y seconds".**
        - Only include speaker name or timestamp if explicitly asked.
        - **Do not repeat information from previous answers. Focus on providing new information.**
        - Return the response in markdown format.
        - **Do not use H1 or H2 headings. Use H3 or smaller for headings.**
        - When citing content from other tabs, use the format: [Source: URL]
        - **Fix grammatical errors and transcription mistakes silently - do not explain the corrections.**
        - **Keep responses clear, concise, and free of contradictions.**
        - **Focus on accurately conveying what was actually said, even if it means stating "No" or "This wasn't mentioned".**
        - **For technical terms, ensure correct spelling and capitalization.**
        <|eot_id|>
        <|start_header_id|>assistant<|end_header_id|>
      `;



  const data = {
    parameters: {
      extra: {
        max_new_tokens: maxTokens,
        temperature: 0.7,
      },
    },
    inputs: [
      {
        name: 'input',
        shape: [1],
        datatype: 'str',
        data: [prompt],
      },
    ],
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result?.outputs?.[0]?.data?.[0] ?? 'The answer is not available';
  } catch (error) {
    console.error('Error asking question:', error);
      return 'Error answering the question';
  }
}


async function askQuestionWithSource(question, userId, sources, history) {
    const url = '';
  
    // Construct the expression based on the source array.
    // if there is only one source, it would be source == 'source1' and if there are multiple it would be source == 'source1' or source == 'source2' or source == 'source3'
    let sourceExpression = '';
    if (sources && sources.length > 0) {
      const formattedSources = sources.map(source => {
        if (typeof source === 'string') {
          return `"${source}"`;
        }
        return source;
      });
    
      if (formattedSources.length > 1) {
        sourceExpression = `source in [${formattedSources.join(', ')}]`;
      } else {
        sourceExpression = `source == ${formattedSources[0]}`;
      }
    }
    
    
    const expr = sourceExpression ? `(${sourceExpression}) and (user_id == "${userId}")` : `(user_id == "${userId}")`;
  
  
    const requestBody = {
      parameters: {
        llm: {
          temperature: 0.2,
          enable_delta: 1
        },
        vector_store: {
          k: 4,
          expr: expr  // ensure 'expr' is set to the correct value in your frontend code
        }
      },
      inputs: [
        {
          name: "input",
          data: [question]  // ensure 'question' is dynamically set based on user input
        },
        {
          name: "history",
          data: [""]  // ensure 'history' is correctly set, could be an empty string or an array
        }
      ]
    };
    
  
    const headers = {
        'Content-Type': 'application/json',
    };
  
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
        });
  
        if (!response.ok) {
          const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
        }
  
        const jsonResponse = await response.json();
        if(jsonResponse?.outputs[0]?.data[0]){
          return jsonResponse.outputs[0].data[0];
       } else {
          console.error("Error: Invalid response structure:", jsonResponse)
         return "Something went wrong";
       }
    } catch (error) {
        console.error('Error asking question with source:', error);
        throw error;
    }
}

async function generateChatTitle(userMessage, aiResponse) {
  const url =
    '';
  const maxTokens = 3000; // You might need to adjust this based on your needs

  const prompt = `
        <|begin_of_text|>
        <|start_header_id|>system<|end_header_id|>
        You are an AI assistant. Your task is to generate a very short title (max 10 words) for a chat conversation, summarizing the main topic.<|eot_id|>
        <|start_header_id|>user<|end_header_id|>
        User message: ${userMessage}
        AI response: ${aiResponse}

        ### Important Instructions:
          - Return only the title, without any extra text or markdown.
          - The title should be very concise and capture the essence of the conversation.
        <|eot_id|>
        <|start_header_id|>assistant<|end_header_id|>
      `;

  const data = {
    parameters: {
      extra: {
        max_new_tokens: maxTokens,
        temperature: 0.7, //You can also remove this if you want to keep it default
      },
    },
    inputs: [
      {
        name: 'input',
        shape: [1],
        datatype: 'str',
        data: [prompt],
      },
    ],
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseJson = await response.json();
    const title = responseJson?.outputs?.[0]?.data?.[0]; // Adjust based on actual response structure

    return title ? title.trim() : `${userMessage.substring(0, 30)}...`; // Fallback
  } catch (error) {
    console.error('Error generating chat title:', error);
    return `${userMessage.substring(0, 30)}...`; // Fallback
  }
}

chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (details.tabId === -1) {
      return;
    }
    if (details.type === 'xmlhttprequest') {
      const url = new URL(details.url);
      // Extract transcript ID from the URL path
      const transcriptId = url.pathname
        .split('/')
        .find((part) =>
          /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(part)
        );

      fetch(details.url)
        .then((response) => response.json())
        .then((data) => {
          const processedData = processTranscriptData(data);
          if (details.tabId && details.tabId !== -1) {
            chrome.tabs.sendMessage(details.tabId, {
              action: 'transcriptDataReceived',
              data: processedData,
              transcriptId: transcriptId,
            });
          } else {
            console.warn('Invalid tabId:', details.tabId); // Log a warning
          }
        })
        .catch((error) => console.error('Error:', error));
    }
  },
  { urls: ['*://asd-my.sharepoint.com/*/streamContent?format=json&applymediaedits=false*'] }
);

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action || request.type);
  
  // Handle debug logs
  if (request.type === "debug-log") {
    console.log(`[Debug] ${request.message}`);
    return false;
  }
  
  // Handle messages from offscreen for forwarding to UI
  if (
    request.type === "text-chunk" || 
    request.type === "text-generation-complete" || 
    request.type === "generation-error"
  ) {
    // Forward to UI (broadcast to all tabs)
    broadcastToTabs(request);
    return false;
  }
  
  // Handle incognito mode toggle
  if (request.action === "toggleIncognitoMode") {
    console.log(`Toggling incognito mode to: ${request.enabled}`);
    isIncognitoMode = request.enabled;
    
    if (isIncognitoMode) {
      // Create the offscreen document first
      try { 
        initializeModel();
        sendResponse({ success: true, isIncognitoMode });
      } 
      catch {

      }

    } else {
      // closeOffscreenDocument()
      //   .then(() => {
        
      //   })
      //   .catch(error => {
      //     sendResponse({ success: false, error: error.message });
      //   });
    }
    
    // Store the state
    chrome.storage.local.set({ incognitoMode: isIncognitoMode });
    
    return true;
  }
  
  // Handle get incognito status request
  if (request.action === "getIncognitoStatus") {
    console.log(`Reporting incognito status: ${isIncognitoMode}`);
    sendResponse({ isIncognitoMode });
    return false;
  }
  
  // Handle text generation request
  if (request.action === "generateText") {
    if (!isIncognitoMode) {
      console.log("Text generation requested but incognito mode is disabled");
      sendResponse({ error: "Incognito mode is not enabled" });
      return false;
    }
    
    console.log("Handling text generation request");
    
    // Create a request ID
    const requestId = nextRequestId++;
    
    // Store the callbacks
    pendingRequests.set(requestId, {
      onChunk: request.onChunk,
      onComplete: request.onComplete,
      onError: request.onError
    });
    
    // Generate text - try in background first, fallback to offscreen
    generateText(request.prompt, requestId);
    
    // Send immediate response
    sendResponse({ success: true, requestId });
    return false;
  }
    
  
  // Handle embedding creation request
  if (request.action === "createEmbeddings") {
    if (!isIncognitoMode) {
      sendResponse({ error: "Incognito mode is not enabled" });
      return true;
    }
    
    // Create a request ID
    const requestId = nextRequestId++;
    
    // Define callbacks
    const callbacks = {
      onComplete: request.onComplete,
      onError: request.onError
    };
    
    // Store the callbacks
    pendingRequests.set(requestId, callbacks);
    
    // Forward the request to offscreen document
    chrome.runtime.sendMessage({
      type: "create-embeddings",
      text: request.text,
      requestId: requestId
    });
    
    sendResponse({ success: true, requestId });
    return true;
  }
  
  // Handle embedding search request
  if (request.action === "searchEmbeddings") {
    if (!isIncognitoMode) {
      sendResponse({ error: "Incognito mode is not enabled" });
      return true;
    }
    
    // Create a request ID
    const requestId = nextRequestId++;
    
    // Define callbacks
    const callbacks = {
      onResults: request.onResults,
      onError: request.onError
    };
    
    // Store the callbacks
    pendingRequests.set(requestId, callbacks);
    
    // Forward the request to offscreen document
    chrome.runtime.sendMessage({
      type: "search-embeddings",
      query: request.query,
      limit: request.limit || 5,
      requestId: requestId
    });
    
    sendResponse({ success: true, requestId });
    return true;
  }
  
  // Handle messages from offscreen document for forwarding to UI
  if (request.type === "load-progress" || 
      request.type === "ai-initialized" || 
      request.type === "ai-error") {
    // Forward to all tabs
    broadcastToTabs(request);
  }
  
  // Handle text generation streaming results
  if (request.type === "text-chunk" && request.requestId) {
    const callbacks = pendingRequests.get(request.requestId);
    if (callbacks && callbacks.onChunk) {
      try {
        callbacks.onChunk(request.chunk);
      } catch (e) {
        console.error(`Error calling onChunk for request ${request.requestId}:`, e);
      }
    } else {
      console.warn(`No callback found for text chunk, request ID: ${request.requestId}`);
    }
    return false;
  }
  
  // Handle text generation completion
  if (request.type === "text-generation-complete" && request.requestId) {
    const callbacks = pendingRequests.get(request.requestId);
    if (callbacks && callbacks.onComplete) {
      try {
        callbacks.onComplete();
      } catch (e) {
        console.error(`Error calling onComplete for request ${request.requestId}:`, e);
      }
      pendingRequests.delete(request.requestId);
    } else {
      console.warn(`No callback found for generation complete, request ID: ${request.requestId}`);
    }
    return false;
  }
  
  // Handle embeddings creation completion
  if (request.type === "embeddings-created" && request.requestId) {
    const callbacks = pendingRequests.get(request.requestId);
    if (callbacks && callbacks.onComplete) {
      callbacks.onComplete(request.embeddingId);
      pendingRequests.delete(request.requestId);
    }
  }
  
  // Handle embeddings search results
  if (request.type === "embeddings-search-results" && request.requestId) {
    const callbacks = pendingRequests.get(request.requestId);
    if (callbacks && callbacks.onResults) {
      callbacks.onResults(request.results);
      pendingRequests.delete(request.requestId);
    }
  }
  
  // Handle all error messages
  if ((request.type === "generation-error" || 
       request.type === "embeddings-error") && 
      request.requestId) {
    const callbacks = pendingRequests.get(request.requestId);
    if (callbacks && callbacks.onError) {
      callbacks.onError(request.error);
      pendingRequests.delete(request.requestId);
    }
  }
  if (request.action === 'generateChatTitle') {
    // Call your API to generate a title
    generateChatTitle(request.userMessage, request.aiResponse)
    .then(title => {
      sendResponse({ title });
    })
    .catch(error => {
      console.error('Error generating chat title:', error);
      sendResponse({ 
        title: `${request.userrequest.substring(0, 30)}...` 
      });
    });
    
    // Return true to indicate you wish to send a response asynchronously
    return true;
  }
  if (request.action === 'summarize') {
    chrome.tabs.sendMessage(request.tabId, { action: 'extract'}, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        // Handle the summarization
        summarization_llm_helper(response.text, response.source)
          .then((summary) => {
            try {
              console.log('summary--->', summary);
              sendResponse({ data: summary });
            } catch (error) {
              console.error('Error sending response:', error);
            }
          })
          .catch((error) => {
            console.error('Error in summarization:', error);
            try {
              sendResponse({ error: 'Failed to summarize text' });
            } catch (sendError) {
              console.error('Error sending error response:', sendError);
            }
          });
      }
    });

    // Indicate that the response will be sent asynchronously
    return true;
  } 
  if (request.action === 'highlights') {
    chrome.tabs.sendMessage(request.tabId, { action: 'extract'}, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        // Handle the summarization
        generate_highlights_llm_helper(response.text)
          .then((res) => {
            try {
              console.log('response--->', res);
              sendResponse({ data: res });
            } catch (error) {
              console.error('Error sending response:', error);
            }
          })
          .catch((error) => {
            console.error('Error in generating highlights:', error);
            try {
              sendResponse({ error: 'Failed to get highlights' });
            } catch (sendError) {
              console.error('Error sending error response:', sendError);
            }
          });
      }
    });

    // Indicate that the response will be sent asynchronously
    return true;
  }
  if (request.action === 'ingestTabContent') {
    console.log('ingestTabContent', request)
    const { username, tabId, tabName } = request;

      isDataWithinSession(tabId, tabId, tabName, 'tabs').then(async (isWithinSession) => {
        if (isWithinSession) {
           console.log('Tab data is within the session and less than 24 hours old.');
          sendResponse({ success: true });
           return;
         }
         console.log('Tab data is not within session');

         chrome.tabs.sendMessage(tabId, { action: 'extract'}, (response) => {
        console.log('tab data', response)
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError.message);
              sendResponse({ error: chrome.runtime.lastError.message });
            } else {
          ingestTabData(username, response.text, tabName)
          .then(res => {
              if (res.message === 'Ingestion Completed') {
                chrome.storage.local.get(['session'], (result) => {
                    const session = result.session || {};
                    if(!session.tabs){
                      session.tabs = {};
                    }
                    session.tabs[tabId] = {
                      name: tabName,
                        timestamp: Date.now()
                    };
                    chrome.storage.local.set({ session: session }, () => {
                      sendResponse({ success: true });
                    });
                });
              } else {
                sendResponse({ success: false, error: 'Ingestion failed' });
              }
            })
            .catch(err => {
              sendResponse({ success: false, error: err.message });
            });
            }
          });
        });
       return true;
    }
  if(request.action === 'askquestion') {
    console.log('askquestion', request)
    if(!request.isContextSearchActive) {
      askGeneralQuestion(request.question, request.history).then((res) => {
        console.log('res---', res)
        sendResponse({ success: true, data: res })
      })
    } else {
      askQuestionWithSource(request.question, request.username, request.sources, request.history).then((res) => {
        console.log('res---', res)
        sendResponse({ success: true, data: res })
      })
    }
    return true
  }
  if (request.action === 'start_sso_flow') {
        chrome.tabs.create({ url: request.authUrl });
  }
  else if (request.action === 'sso_redirect') {
        // Handle the redirect from the SSO provider
      if (request.error) {
        console.log('Error in redirect: ', request.error);
          chrome.runtime.sendMessage({
          action: 'sso_tokens',
          error: request.error
        });
        return;
      }
       chrome.storage.local.get(['session'], async (result) => {
        const codeVerifier = result?.session?.pkce_code_verifier;
        const tabId = result?.session?.tabId;
        if (!codeVerifier) {
             chrome.runtime.sendMessage({
               action: 'sso_tokens',
                error: 'code_verifier not found in session'
              });
          return;
        }
    
        try {
          const { sub: username, country } = await requestTokens(request.code, codeVerifier);
          if (country && country.toLowerCase() === 'china') {
            chrome.runtime.sendMessage({
              action: 'sso_tokens',
              error: 'Access is not allowed from your current location.'
            });
            return;
          }
            // clear code verifier
          delete result.session.pkce_code_verifier;
          delete result.session.tabId;
            await chrome.storage.local.set({'session': result.session});
            chrome.runtime.sendMessage({
              action: 'sso_tokens',
              username,
              country
             });
            
         } catch (error) {
            console.error('Error requesting tokens', error);
            chrome.runtime.sendMessage(
              {
                action: 'sso_tokens',
                 error: error.message
              },
               {
                tabId: tabId
              }, (response) => {
                 if (chrome.runtime.lastError) {
                   console.error('Error sending message:', chrome.runtime.lastError.message);
                 }
              }
            );
        }
      });
  } 
  else if (request.action === 'uploadFile') {
      const { username, fileData, fileName, fileType } = request;
      console.log('uploadFile', fileName)

        isDataWithinSession(fileName, fileName, fileName, 'files').then(async (isWithinSession) => {
            if (isWithinSession) {
                console.log('File data is within the session and less than 24 hours old.');
                sendResponse({ success: true, message: 'File upload skipped due to session.' });
                return;
            }
             try {
                // Create file from base64
                const byteCharacters = atob(fileData);
                const byteNumbers = new Array(byteCharacters.length);
                
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: fileType });
                
                // Create a File object instead of Blob
                const file = new File([blob], fileName, { 
                  type: fileType,
                  lastModified: new Date().getTime()
                });
          
                // Create FormData
                const formData = new FormData();
                formData.append('file', file);
                formData.append('userId', username);

                   uploadFile(formData, username).then((res) => {
                         if (res?.message === 'Ingestion Completed') {
                          chrome.storage.local.get(['session'], (result) => {
                             const session = result.session || {};
                            if(!session.files){
                                session.files = {};
                            }
                             session.files[fileName] = {
                                 name: fileName,
                                 timestamp: Date.now()
                             };
                             chrome.storage.local.set({ session: session }, () => {
                               sendResponse({ success: true, message: 'File uploaded successfully', data: res });
                             });
                          });

                         } else {
                             sendResponse({ success: false, message: 'File upload failed' });
                         }
                     }).catch((err) => {
                         sendResponse({ success: false, message: 'File upload failed', error: err.message });
                     });
               } catch (error) {
                console.error('Error processing file:', error);
                sendResponse({ success: false, message: 'Error processing file', error: error.message });
              }

        });
     return true;
  }
  if (request.action === 'customLLMCall') {
    const { prompt, text } = request.message;
    customLLMCall(prompt, text)
        .then(response => sendResponse({data: response}))
        .catch(error => sendResponse({ error: error.message || "An error occurred" }));

    return true; // Indicate that sendResponse will be called asynchronously
  }
})

// Initialize on installation or update
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed or updated");
});