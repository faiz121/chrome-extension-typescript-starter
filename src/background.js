import { pipeline, env } from '@xenova/transformers';

// Skip initial check for local models
env.allowLocalModels = false;

// Disable multithreading (workaround for onnxruntime-web bug)
env.backends.onnx.wasm.numThreads = 1;

class PipelineSingleton {
    static task = 'summarization'; // Change the task here
    static model = 'facebook/bart-large-cnn'; // Change the model here
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            try {
                this.instance = await pipeline(this.task, this.model, { progress_callback });
            } catch (error) {
                console.error("Error loading pipeline:", error);
                // Handle the error appropriately, e.g., display an error message to the user
                return null; // Return null to indicate failure
            }
        }
        return this.instance;
    }
}

const performTask = async (text, taskSpecificOptions = {}) => {
    let model = await PipelineSingleton.getInstance((data) => {
        // Handle progress if needed
    });

    if (model === null) {
      return {error: "Model failed to load"}
    }

    try {
        let result = await model(text, taskSpecificOptions);
        return result;
    } catch (error) {
        console.error("Error during model inference:", error);
        return { error: error.message }; // Return error message
    }
};

async function handleSummarization(text) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { message: 'Here is your long summarized text' };
}

async function handleFileUpload(fileData) {
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Here you would make your actual API call
    // const response = await fetch('your-upload-endpoint', {
    //   method: 'POST',
    //   body: JSON.stringify({ file: fileData }),
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    // });
    // return response.json();
    
    return { message: 'File uploaded successfully' };
  }
  
  async function processTab(tabId) {
    try {
      // Send message to content script to get content
      const response = await chrome.tabs.sendMessage(tabId, { action: 'getTabContent' });
      
      if (!response || !response.content) {
        throw new Error('Failed to get tab content');
      }
  
      // Mock API call for ingestion
      // In reality, you would make an actual API call here
      await mockIngestionApi(response.content);
  
      return { success: true };
    } catch (error) {
      console.error('Error processing tab:', error);
      throw error;
    }
  }
  
  async function mockIngestionApi(content) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Content ingested:', content.slice(0, 100) + '...');
    return { success: true };
  }

  chrome.commands.onCommand.addListener((command) => {
    console.log(`Command "${command}" triggered`);
    if (command === '_execute_side_panel') {
      chrome.sidePanel.open();
    }
  });

  chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTH_SUCCESS') {
        // Broadcast session update to all extension views
        chrome.runtime.sendMessage({
          type: 'SESSION_UPDATE',
          session: message.session
        });
      }
    if (message.action === 'uploadFile') {
        handleFileUpload(message.file)
          .then(response => sendResponse({ success: true, data: response }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
      }
      if (message.action === 'processTab') {
        processTab(message.tabId)
          .then(response => sendResponse(response))
          .catch(error => sendResponse({ error: error.message }));
        return true; // Will respond asynchronously
      }
    if (message.action === 'summarize') {
        handleSummarization()
            .then(response => {
                console.log('response--->', response)
                sendResponse({success: true, data: response})
            })
            .catch(error => sendResponse({ error: error.message }));
        return true; // Will respond asynchronously
    }
    if (message.action === "performTask") {
        // const result = await performTask(message.text, { max_length: 150, min_length: 30 });
        sendResponse(result);
    }
    // if (message.action === "performSearch") {
    //     try {
    //         const queryEmbedding = await generateEmbeddings(message.query);
    //         const tabEmbeddings = getTabEmbeddings(); // Get embeddings from your storage
    //         const results = performSearch(queryEmbedding, tabEmbeddings); // Your search logic
    //         sendResponse({ results });
    //     } catch (error) {
    //         console.error("Search Error:", error);
    //         sendResponse({ error: error.message });
    //     }
    // }
    else if (message.action === 'getTabContent') {
        try {
            chrome.scripting.executeScript({
                target: { tabId: sender.tab?.id },
                function: () => document.body.innerText
            }, async (injectionResults) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ content: "Error getting tab content." });
                    return;
                }
                const content = injectionResults[0].result;
                sendResponse({ content });
            });
        } catch (error) {
            sendResponse({ content: "Error getting tab content." });
        }
    }
    return true; // Important for asynchronous responses
});


// ... (generateEmbeddings, performSearch, cosineSimilarity, processTab, splitIntoChunks functions from previous responses)

async function generateEmbeddings(text) {
    if (embeddingCache.has(text)) {
        return embeddingCache.get(text);
    }
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const embedding = output.data;
    embeddingCache.set(text, embedding);
    return embedding;
}

function getTabEmbeddings() {
    return tabEmbeddings;
}

function performSearch(queryEmbedding, tabEmbeddings) {
    const results = [];
    for (const [tabId, data] of tabEmbeddings) {
        if (!data || !data.embeddings) continue;
        data.embeddings.forEach(emb => {
            const similarity = cosineSimilarity(queryEmbedding, emb.embedding);
            results.push({ ...emb, score: similarity });
        });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

function cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    if (magnitudeA && magnitudeB) {
        return dotProduct / (magnitudeA * magnitudeB);
    } else {
        return 0;
    }
}

// async function processTab(tabId, content, url) {
//     const chunks = splitIntoChunks(content);
//     const embeddings = [];
//     for (const chunk of chunks) {
//         const embedding = await generateEmbeddings(chunk);
//         embeddings.push({ content: chunk, embedding, url });
//     }
//     tabEmbeddings.set(tabId, { embeddings, url });
// }

function splitIntoChunks(text, maxLength = 500) {
    const sentences = text.split(/[.!?]+/);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks.filter(chunk => chunk.length > 0);
}