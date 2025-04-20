document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveOptions').addEventListener('click', saveOptions);
document.getElementById('useLocalLLM').addEventListener('change', toggleOllamaSettings);
document.getElementById('testConnection').addEventListener('click', testOllamaConnection);

function toggleOllamaSettings() {
    const useLocalLLM = document.getElementById('useLocalLLM').checked;
    const ollamaSettings = document.getElementById('ollamaSettings');
    ollamaSettings.classList.toggle('hidden', !useLocalLLM);
}


async function testOllamaConnection() {
    const ollamaIP = document.getElementById('ollamaIP').value;
    const ollamaPort = document.getElementById('ollamaPort').value;
    const statusDiv = document.getElementById('testConnectionStatus');
    console.log("Testing connection to:", `http://${ollamaIP}:${ollamaPort}/api/tags`);
      if(!ollamaIP || !ollamaPort) {
        statusDiv.textContent = "Please provide IP and Port to test";
        return
    }
    statusDiv.textContent = "Testing Connection...";

    try {
        const response = await fetch(`http://${ollamaIP}:${ollamaPort}/api/tags`);
        if (response.ok) {
            statusDiv.textContent = "Connection Successful";
            statusDiv.style.color = "green"
        } else {
            statusDiv.textContent = `Connection Failed: ${response.status} ${response.statusText}`;
            statusDiv.style.color = "red";
        }
    } catch (error) {
        statusDiv.textContent = `Connection Failed: ${error.message}`;
        statusDiv.style.color = "red";
    }
}


function saveOptions() {
    const useLocalLLM = document.getElementById('useLocalLLM').checked;
    const ollamaIP = document.getElementById('ollamaIP').value;
    const ollamaPort = document.getElementById('ollamaPort').value;
    const jiraAPIKey = document.getElementById('jiraAPIKey').value;
    const modelName = document.getElementById('modelName').value;


    chrome.storage.sync.set({
        useLocalLLM: useLocalLLM,
        ollamaIP: ollamaIP,
        ollamaPort: ollamaPort,
        jiraAPIKey: jiraAPIKey,
        modelName: modelName
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 1500);
    });
}

function restoreOptions() {
    chrome.storage.sync.get({
        useLocalLLM: false,
        ollamaIP: '',
        ollamaPort: '',
        jiraAPIKey: '',
        modelName: 'llama3.2'
    }, items => {
        document.getElementById('useLocalLLM').checked = items.useLocalLLM;
        document.getElementById('ollamaIP').value = items.ollamaIP;
        document.getElementById('ollamaPort').value = items.ollamaPort;
        document.getElementById('jiraAPIKey').value = items.jiraAPIKey;
        document.getElementById('modelName').value = items.modelName;
         toggleOllamaSettings(); // Call toggle initially to show or hide fields on load
    });
}
