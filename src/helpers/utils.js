// src/helpers/utils.js
import { FileText, List, Brain } from 'lucide-react';
import config from '../suggestionButtonsConfig.json';
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // Milliseconds in a day
export const getSuggestionButtonsForUrl = async (url) => {
    try {
      console.log('config---', config)
        const matchingConfig = config.find((item) => {
        //  if(item.urlPattern === "*") {
           return true
        //  }
            // const regex = new RegExp(item.urlPattern);
            // return regex.test(url);
        });

        if (matchingConfig) {
           return matchingConfig.buttons.map(button => {
              let icon;
             if (button.icon === "FileText") {
                 icon = FileText;
             } else if (button.icon === "List") {
                 icon = List;
             } else if (button.icon === "Brain") {
                 icon = Brain;
             }
              return { ...button, icon};
          });
        }
     return [];

    } catch (error) {
     console.error('Error fetching or processing button config:', error);
      return [];
    }
};

export const isDataWithinSession = async (key, id, name, type) => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['session'], (result) => {
      const session = result.session || {};
      if (!session[type]) {
        resolve(false);
        return;
      }
        const existingEntry = session[type][id];
        if (!existingEntry) {
            resolve(false)
          return;
        }
        if (existingEntry.name !== name) {
          resolve(false)
            return;
        }


        const timeDiff = Date.now() - existingEntry.timestamp;
        resolve(timeDiff < ONE_DAY_MS);
    });
  });
}

export const recursiveTextSplitter = (text, chunkSize, chunkOverlap, delimiters) => {
  if (text.length <= chunkSize) return [text];

  for (const delimiter of delimiters) {
    const splitText = text.split(delimiter);
    if (splitText.length > 1) {
      const chunks = [];
      let currentChunk = '';

      for (const part of splitText) {
        // More efficient loop
        if ((currentChunk + part + delimiter).length <= chunkSize) {
          currentChunk += part + delimiter;
        } else {
          chunks.push(currentChunk.slice(0, -delimiter.length).trim()); // Remove trailing delimiter before trimming
          currentChunk = part + delimiter;
        }
      }
      if (currentChunk) chunks.push(currentChunk.slice(0, -delimiter.length).trim()); // Remove trailing delimiter and trim the last chunk

      //Simplified overlap handling. More efficient for larger arrays
      if (chunkOverlap > 0) {
        for (let i = 0; i < chunks.length - 1; i++) {
          chunks[i] += chunks[i + 1].slice(0, chunkOverlap);
        }
      }
      return chunks; // Return chunks immediately upon successful split
    }
  }

  // Fallback: If all delimiters fail, split by chunkSize exactly to avoid infinite recursion
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize)); // Use substring
  }

  return chunks;
}

export const decodeJwt = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    return {
      header: header,
      payload: payload,

    };
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

export const processTranscriptData= (data) => {
  return data.entries.map((entry) => ({
    text: entry.text,
    startOffset: entry.startOffset,
    endOffset: entry.endOffset,
    speaker: entry?.speakerDisplayName ?? 'Unknown',
  }));
}