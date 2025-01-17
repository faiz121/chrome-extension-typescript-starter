import React, { useState, useEffect, useRef } from 'react';
import { Menu, Upload, Send, ChevronDown, Loader2 } from 'lucide-react';
import FileUpload from '../FileUpload';
import ContextSelector from '../ContextSelector';
import LoginComponent from '../LoginComponent';

const SidePanel = () => {
  const [session, setSession] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageContent, setPageContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const chatContainerRef = useRef(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_FILES = 5;

  useEffect(() => {
    const getPageContent = async () => {
      try {
        setIsLoading(true);
        // Remove this since we don't actually need the page content for suggestions
        // const content = document.body.innerText;
        setPageContent(true);  // Just set it to true since we only use it as a boolean check
      } catch (error) {
        console.error('Error getting page content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getPageContent();
  }, []);

  useEffect(() => {
    // Check for existing session
    chrome.storage.local.get(['session'], (result) => {
      if (result.session?.username) {
        setSession(result.session);
      }
      setIsLoadingSession(false);
    });

    // Listen for session updates from background script
    const handleMessage = (message) => {
      if (message.type === 'SESSION_UPDATE') {
        setSession(message.session);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleLogin = (newSession) => {
    setSession(newSession);
  };

  const suggestionButtons = [
    { title: "Summarize", subtitle: "this page" },
    { title: "Give me", subtitle: "key highlights" },
    { title: "Extract", subtitle: "action items" },
    { title: "Find", subtitle: "main topics" }
  ];

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File exceeds 5MB limit`);
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error(`Only PDF files are allowed`);
    }
  };

  const handleFileUpload = async (fileList) => {
    const newFiles = Array.from(fileList);

    try {
      // Check total number of files
      if (files.length + newFiles.length > MAX_FILES) {
        throw new Error(`Maximum ${MAX_FILES} files allowed per chat`);
      }

      // Validate each file
      newFiles.forEach(validateFile);

      // Check for duplicates
      const duplicates = newFiles.filter(newFile =>
        files.some(existingFile => existingFile.name === newFile.name)
      );
      if (duplicates.length > 0) {
        throw new Error('Some files have already been added');
      }

      // Add all files with uploading status
      const filesWithStatus = newFiles.map(file => ({
        file,
        name: file.name,
        status: 'uploading'
      }));

      setFiles(prev => [...prev, ...filesWithStatus]);
      setSelectedFiles(prev => [...prev, ...filesWithStatus]); // Auto-select new files

      // Upload files sequentially
      for (const fileData of filesWithStatus) {
        try {
          await chrome.runtime.sendMessage({
            action: 'uploadFile',
            file: await fileToBase64(fileData.file)
          });

          // Update status to completed
          setFiles(prev => prev.map(f =>
            f.name === fileData.name
              ? { ...f, status: 'completed' }
              : f
          ));
        } catch (error) {
          // Remove failed file
          setFiles(prev => prev.filter(f => f.name !== fileData.name));
          setSelectedFiles(prev => prev.filter(f => f.name !== fileData.name));
          console.error(`Error uploading ${fileData.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing files:', error);
      alert(error.message);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSuggestionClick = (suggestion) => {
    setIsProcessing(true);
    chrome.runtime.sendMessage({ action: suggestion.title.toLowerCase() }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError.message);
        setIsProcessing(false);
        return;
      }
  
      setMessages((prev) => [...prev, {
        type: 'assistant',
        content: response.data.message,
      }]);
      setIsProcessing(false);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't submit if there's no input and no files
    if (!inputValue.trim() && selectedFiles.length === 0) return;

    const newMessage = {
      type: 'user',
      content: inputValue,
      files: selectedFiles.map(f => f.name)
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Keep files in the attachment selector but remove the pills
    setIsProcessing(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: 'This is a simulated response...'
      }]);
      setIsProcessing(false);
    }, 1000);
  };

  const handleAttachmentsChange = (selected) => {
    setSelectedFiles(selected);
  };

  if (isLoadingSession) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <LoginComponent onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100"> {/* Using a darker gray background */}
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10 shadow-sm">
        <div className="flex items-center p-3">
          <button className="p-1 hover:bg-gray-100 rounded-full mr-3">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-medium">Helion Assistant</h1>
          <ChevronDown className="w-5 h-5 text-gray-500 ml-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col w-full pt-14">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-gray-100 pointer-events-none" />
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center relative">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Welcome Message */}
            <div className="flex-1 flex flex-col relative">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center px-4">
                  <h2 className="text-5xl leading-tight tracking-normal font-light" style={{ fontSize: '48px' }}>
                    <span className="text-blue-500">Hello</span>
                    <span className="text-gray-400">, </span>
                    <span className="text-emerald-500">how </span>
                    <span className="text-violet-500">can </span>
                    <span className="text-amber-500">I </span>
                    <span className="text-rose-500">help </span>
                    <span className="text-indigo-500">you </span>
                    <span className="text-teal-500">today</span>
                    <span className="text-gray-400">?</span>
                  </h2>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4 relative">
                  <div className="space-y-6">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'items-start'}`}>
                        {message.type === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-medium mr-3 mt-2">
                            H
                          </div>
                        )}
                        <div
                          className={`max-w-2/3 p-4 rounded-2xl ${message.type === 'user'
                            ? 'bg-blue-500 text-white text-lg'
                            : 'bg-gray-100 text-gray-900 text-lg'
                            }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-medium mr-3">
                          H
                        </div>
                        <div className="bg-gray-100 rounded-2xl p-4">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Section */}
              <div className="px-4 space-y-4 mb-4 relative">
                {/* Suggestion Buttons - moved outside input container */}
                {messages.length === 0 && (  // Removed pageContent condition
                  <div className="grid grid-cols-2 gap-2">
                    {suggestionButtons.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-left px-4 py-3 bg-white shadow-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900">{suggestion.title}</div>
                        <div className="text-sm text-gray-500">{suggestion.subtitle}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Files display - moved outside input container */}
                {messages.length === 0 && files.length > 0 && (
                  <div className="mb-2">
                    <FileUpload files={files} onRemoveFile={handleRemoveFile} />
                  </div>
                )}

                {/* Input Area */}
                <div className="relative bg-white shadow-sm rounded-3xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (inputValue.trim() || selectedFiles.length > 0) {
                        handleSubmit(e);
                      }
                    }}
                    className="flex items-center"
                  >
                    <div className="pl-2">
                      <label
                        className="cursor-pointer p-1.5 hover:bg-gray-100 rounded-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(e.target.files)}
                          className="hidden"
                          accept=".pdf"
                          multiple
                        />
                        <Upload className="w-5 h-5 text-gray-500" />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Message Helion..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (inputValue.trim() || selectedFiles.length > 0) {
                            handleSubmit(e);
                          }
                        }
                      }}
                      className="flex-1 px-3 h-[45px] bg-transparent border-none text-base focus:outline-none"
                    />
                    <div className="flex items-center space-x-1 pr-2">
                      <ContextSelector
                        files={files}
                        onTabsChange={(selectedTabs) => {
                          console.log('Selected tabs:', selectedTabs);
                        }}
                        onFilesChange={handleAttachmentsChange}
                      />
                      <button
                        type="submit"
                        disabled={!inputValue.trim() && selectedFiles.length === 0}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SidePanel;