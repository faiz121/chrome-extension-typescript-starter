import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatInterface from './components/ChatInterface'; // Make sure this path is correct

const root = ReactDOM.createRoot(document.body);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTabContent') {
    try {
      const content = document.body.innerText;
      sendResponse({ content });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
  return true; // Will respond asynchronously
});

// if (!document.getElementById('my-chat-container')) {
//   console.log("Before root.render");
//   root.render(<ChatInterface />);
//   console.log("After root.render");

//   const sendMessageToBackground = (action, data, callback) => {
//     chrome.runtime.sendMessage({ action, ...data }, callback);
//   };

//   const summarizeButton = document.getElementById('summarize-tab');
//   const sendMessage = document.getElementById('send-message');
//   const messageInput = document.getElementById('message-input');
//   const messages = document.getElementById('messages')

//   summarizeButton?.addEventListener('click', async () => {
//     sendMessageToBackground("summarizeTab", {}, (response) => {
//       displayMessage(response.summary, "assistant");
//     });
//   });

//   sendMessage?.addEventListener('click', () => {
//     const message = messageInput?.value;
//     if (!message) return;
//     displayMessage(message, "user");
//     sendMessageToBackground("performSearch", { query: message }, (response) => {
//       if (response && response.error) { // Check if response exists before accessing properties
//         displayMessage("Error: " + response.error, "assistant");
//       } else if (response) {
//         displayResults(response.results);
//       }
//     });
//     messageInput.value = '';
//   });

//   function displayMessage(message, sender) {
//     if (messages) {
//       messages.insertAdjacentHTML('beforeend', `<div class="message ${sender}">${message}</div>`);
//       messages.scrollTop = messages.scrollHeight;
//     }
//   }

//   function displayResults(results) {
//         if (!messages) return;
//     if (!results || results.length === 0) {
//       displayMessage("No results found.", "assistant");
//       return;
//     }
//     let resultsHTML = "<ul>";
//     results.forEach(result => {
//       resultsHTML += `<li><a href="${result.url}" target="_blank">${result.content.substring(0, 100)}...</a></li>`;
//     });
//     resultsHTML += "</ul>";
//     displayMessage(resultsHTML, "assistant");
//   }
// }