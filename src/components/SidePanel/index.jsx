import React, { useState, useEffect, useRef } from 'react';
import { Menu, ChevronUp, ChevronDown, Send, Loader2, FileText, List, DatabaseZap, Layers, CircuitBoard, ArrowRight, Brain, Sparkles, Network } from 'lucide-react';
import FileUpload from '../FileUpload';
import SlidingPanel from '../SlidingPanel'; // Add this import
import ContextSelector from '../ContextSelector';
import LoginComponent from '../LoginComponent';
import { marked } from 'marked';
import SystemMessageBubble from '../SystemMessageBubble'
import AIGateway from '../AIGateway';
import Switch from '../Switch';
import ThemeSelector from '../ThemeSelector';
import SettingsPage from '../SettingsPage';

const SidePanel = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [isChevronVisible, setIsChevronVisible] = useState(false);
  const [isAnimatingChevron, setIsAnimatingChevron] = useState(false);
  const chevronRef = useRef(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(true);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const suggestionsPanelRef = useRef(null); // Ref for suggestions panel
  const [isContextSearchActive, setIsContextSearchActive] = useState(true);
  const [selectedTabs, setSelectedTabs] = useState([]);  // To store tab info
  const [selectedFiles, setSelectedFiles] = useState([]); // You already have this
  const [selectedContext, setSelectedContext] = useState(['Current Tab']);
  const [currentTab, setCurrentTab] = useState(null);
  const messagesEndRef = useRef(null);
  const [currentView, setCurrentView] = useState('ragonfly');
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const [currentGradient, setCurrentGradient] = useState(
    "linear-gradient(180deg, #E879F9 0%, #818CF8 50%, #38BDF8 100%)" // Ocean Sunrise as default
  );
  const chatContainerRef = useRef(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_FILES = 5;
  const dropdownRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Only focus if there's no messages (initial state)
    if (messages.length === 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsViewDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          setCurrentTab({ ...tab, currentTab: true });
          setSelectedTabs([{ id: tab.id, processed: false }]);
        }
      } catch (error) {
        console.error('Error getting current tab:', error);
      }
    };

    getCurrentTab();
  }, []);

  useEffect(() => {
    const getPageContent = async () => {
      try {
        setIsLoading(true);
      } catch (error) {
        console.error('Error getting page content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getPageContent();
  }, []);

  useEffect(() => {
    setSelectedContext([
      ...selectedTabs.map(tab => tab.title),
      ...selectedFiles.map(file => `${file.name}.${file.extension}`)
    ]);
  }, [selectedTabs, selectedFiles]);

  useEffect(() => {
    chrome.storage.local.get(['session'], (result) => {
      if (result.session?.username) {
        setSession(result.session);
      }
      setIsLoadingSession(false);
    });

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

  const renderMarkdown = (content) => {
    return { __html: marked.parse(content) };
  };

  const suggestionButtons = [
    { title: 'Summarize', subtitle: 'this page', icon: FileText },
    { title: 'Give me', subtitle: 'key highlights', icon: List },
  ];

  // const validateFile = (file) => {
  //   if (file.size > MAX_FILE_SIZE) {
  //     throw new Error(`File exceeds 5MB limit`);
  //   }
  //   if (!file.name.toLowerCase().endsWith('.pdf')) {
  //     throw new Error(`Only PDF files are allowed`);
  //   }
  // };

  // const fileToBase64 = (file) => {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.readAsDataURL(file);
  //     reader.onload = () => resolve(reader.result.split(',')[1]);
  //     reader.onerror = (error) => reject(error);
  //   });
  // };

  // const handleFileUpload = async (fileList) => {
  //   const newFiles = Array.from(fileList);

  //   try {
  //     if (files.length + newFiles.length > MAX_FILES) {
  //       throw new Error(`Maximum ${MAX_FILES} files allowed per chat`);
  //     }

  //     newFiles.forEach(validateFile);

  //     const duplicates = newFiles.filter((newFile) =>
  //       files.some((existingFile) => existingFile.name === newFile.name)
  //     );
  //     if (duplicates.length > 0) {
  //       throw new Error('Some files have already been added');
  //     }

  //     const filesWithStatus = newFiles.map((file) => ({
  //       file,
  //       name: file.name,
  //       status: 'uploading',
  //     }));

  //     setFiles((prev) => [...prev, ...filesWithStatus]);
  //     setSelectedFiles((prev) => [...prev, ...filesWithStatus]);

  //     for (const fileData of filesWithStatus) {
  //       try {
  //         await chrome.runtime.sendMessage({
  //           action: 'uploadFile',
  //           file: await fileToBase64(fileData.file),
  //         });

  //         setFiles((prev) =>
  //           prev.map((f) => (f.name === fileData.name ? { ...f, status: 'completed' } : f))
  //         );
  //       } catch (error) {
  //         setFiles((prev) => prev.filter((f) => f.name !== fileData.name));
  //         setSelectedFiles((prev) => prev.filter((f) => f.name !== fileData.name));
  //         console.error(`Error uploading ${fileData.name}:`, error);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error processing files:', error);
  //     alert(error.message);
  //   }
  // };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSuggestionClick = async (suggestion) => {
    const suggestionsPanel = document.querySelector('.suggestions-panel');
    const chevron = document.querySelector('.chevron-button');

    if (suggestionsPanel && chevron) {
      const chevronRect = chevron.getBoundingClientRect();
      const panelRect = suggestionsPanel.getBoundingClientRect();

      const translateX = chevronRect.left - panelRect.left;
      const translateY = chevronRect.bottom - panelRect.bottom;

      suggestionsPanel.style.transition = 'all 700ms cubic-bezier(0.4, 0, 0.2, 1)';
      suggestionsPanel.style.transformOrigin = 'bottom left';

      requestAnimationFrame(() => {
        suggestionsPanel.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.1)`;
        suggestionsPanel.style.opacity = '0';
      });

      setTimeout(() => {
        // setIsAnimating(false);
        setIsFirstInteraction(false);
        setIsChevronVisible(true);
        setIsSuggestionsVisible(false); // Ensure suggestions are hidden

        if (chevronRef.current) {
          setIsAnimatingChevron(true);
          setTimeout(() => setIsAnimatingChevron(false), 300);
        }
      }, 700);
    } else {
      setIsChevronVisible(true);
      setIsSuggestionsVisible(false);
      if (chevronRef.current) {
        setIsAnimatingChevron(true);
        setTimeout(() => setIsAnimatingChevron(false), 300);
      }
    }


    try {
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          content: 'Loading...', // This will show the loading state
          isLoading: true,
          isSuggestion: true
        }
      ]);

      // setIsProcessing(true);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.runtime.sendMessage(
        {
          action: suggestion.title.toLowerCase(),
          tabId: tab.id
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError.message);
            // setIsProcessing(false);
            return;
          }

          setMessages(prev => prev.map((msg, idx) =>
            idx === prev.length - 1
              ? {
                type: 'system',
                content: response.data.message,
                isLoading: false,
                isSuggestion: true
              }
              : msg
          ));
          // setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error('Error getting current tab:', error);
      setIsProcessing(false);
    }
  };

  const toggleSuggestions = () => {
    setIsSuggestionsVisible(!isSuggestionsVisible);
    // setIsChevronVisible(true); // Always show chevron when toggling
    if (chevronRef.current) {
      setIsAnimatingChevron(true);
      setTimeout(() => setIsAnimatingChevron(false), 300);
    }
    if (suggestionsPanelRef.current) {
      suggestionsPanelRef.current.style.transform = '';
      suggestionsPanelRef.current.style.opacity = 1;
      suggestionsPanelRef.current.style.display = 'block';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!inputValue.trim() && selectedFiles.length === 0) return;

    const newMessage = {
      type: 'user',
      content: inputValue,
      isContextualSearch: selectedContext.length > 0,
      context: {
        tabs: selectedTabs.map(tab => ({
          id: tab.id,
          title: tab.title
        })),
        files: selectedFiles.map(file => ({
          name: file.name,
          extension: file.extension
        }))
      }
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setIsProcessing(true);
    // const response = await yourAPI.sendMessage({
    //   message: inputValue,
    //   context: {
    //     tabs: selectedTabs,
    //     files: selectedFiles
    //   }
    // });

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: 'This is a simulated response This is a simulated response This is a simulated response This is a simulated response This is a simulated response This is a simulated response This is a simulated response This is a simulated responsev...',
          isSuggestion: false,
          isContextualSearch: selectedContext.length > 0
        },
      ]);
      setIsProcessing(false);
    }, 1000);
  };

  if (isLoadingSession) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='w-8 h-8 text-blue-500 animate-spin' />
      </div>
    );
  }

  if (!session) {
    return (
      <div className='flex h-screen items-center justify-center bg-white'>
        <LoginComponent onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen">
      {/* Gradient Background Layer */}
      <div 
  className="absolute inset-0 pointer-events-none" 
  style={{
    background: currentGradient,
    opacity: 0.1
  }} 
/>

      {/* Content Layer */}
      <div className="relative flex flex-col h-full">
      <SlidingPanel
          isOpen={isSidePanelOpen}
          onClose={() => setIsSidePanelOpen(false)}
          username={session?.username}
          onSettingsClick={() => {
            setIsSidePanelOpen(false);
            setIsSettingsOpen(true);
          }}
        />

      {isSettingsOpen && (
        <SettingsPage 
          onClose={() => {
            setIsSettingsOpen(false);
            // Optionally reopen sliding panel if desired
            // setIsSidePanelOpen(true);
          }} 
        />
      )}

<div className="flex-shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm">
  <div className="flex items-center p-3">
    <button 
      onClick={() => setIsSidePanelOpen(true)}
      className="p-1 hover:bg-gray-100 rounded-full mr-3 text-gray-600"
    >
      <Menu className="w-5 h-5" />
    </button>
    <div className="flex items-center gap-2 flex-1" ref={dropdownRef}>
      <div className="relative">
        <button
          onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
          className="flex items-center gap-2"
        >
          <h1 className="text-xl font-medium flex items-center gap-2">
            {currentView === 'ragonfly' ? (
              <div className="flex items-center gap-2">
                <DatabaseZap className="w-5 h-5 text-blue-500" />
                <span>RAG on fly</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CircuitBoard className="w-5 h-5 text-violet-500" />
                <span>AI Gateway</span>
              </div>
            )}
          </h1>
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </button>
        
        {isViewDropdownOpen && (
          <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
            <button
              onClick={() => {
                setCurrentView(currentView === 'ragonfly' ? 'gateway' : 'ragonfly');
                setIsViewDropdownOpen(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center gap-2"
            >
              {currentView === 'ragonfly' ? (
                <>
                  <CircuitBoard className="w-5 h-5 text-teal-500" />
                  <span>AI Gateway</span>
                </>
              ) : (
                <>
                  <DatabaseZap className="w-5 h-5 text-teal-500" />
                  <span>RAG on fly</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
            <div className="flex items-center gap-2">
  <ThemeSelector 
    currentGradient={currentGradient}
    onGradientChange={setCurrentGradient}
  />
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">

    F
  </div>
</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {currentView === 'ragonfly' ? (
            <>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col h-full">
                    {messages.length === 0 ? (
                      <div className="flex flex-col h-full">
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <h2 className="text-4xl leading-tight tracking-normal font-light">
                              <span className="text-blue-500">Hello</span>
                              <span className="text-gray-400">, </span>
                              <span className="text-gray-900">how </span>
                              <span className="text-gray-900">can </span>
                              <span className="text-gray-900">I </span>
                              <span className="text-gray-900">help </span>
                              <br />
                              <span className="text-blue-500">you </span>
                              <span className="text-gray-900">today</span>
                              <span className="text-gray-400">?</span>
                            </h2>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-4">
                        <div className="space-y-4">
                          {messages.map((message, index) => {
                            const isSystemOrAssistant = message.type === 'system' || message.type === 'assistant';
                            return (
                              isSystemOrAssistant ? (
                                <SystemMessageBubble
                                  key={index}
                                  content={message.content}
                                  isLoading={message.isLoading}
                                  title={message.isSuggestion ? "Summary" : null}
                                  contextIndicator={message.isContextualSearch ? "Contextual Search" : null}
                                />
                              ) : (
                                <div
                                  key={index}
                                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`message-bubble font-sans relative max-w-[85%] p-3 rounded-lg shadow-sm ${message.type === "user"
                                        ? "bg-blue-500 text-white rounded-br-none"
                                        : "bg-gray-100 text-gray-900 rounded-bl-none"
                                      }`}
                                  >
                                    <div
                                      className="prose prose-sm max-w-none"
                                      style={{ fontSize: "16px", lineHeight: "1.5" }}
                                      dangerouslySetInnerHTML={renderMarkdown(message.content)}
                                    />
                                  </div>
                                </div>
                              )
                            );
                          })}
                          {isProcessing && (
                            <div className="flex items-start">
                              <SystemMessageBubble
                                key="loading"
                                content="Loading..."
                                isLoading={true}
                              />
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div
                className={`suggestions-panel transition-all duration-300 ease-in-out origin-center
                  ${!isFirstInteraction ? (isSuggestionsVisible ? 'max-h-96 opacity-100 visible' : 'max-h-0 opacity-0 invisible overflow-hidden') : ''}
                  ${isAnimatingChevron ? 'pointer-events-none' : ''}`
                }
                ref={suggestionsPanelRef}
              >
                <div className="px-4 pt-4 border-t border-gray-200" style={{ marginBottom: '10px' }}>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {suggestionButtons.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-left px-4 py-3 bg-white shadow-sm rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors flex items-start space-x-2"
                      >
                        <suggestion.icon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{suggestion.title}</div>
                          <div className="text-sm text-gray-500">{suggestion.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3">
                <div className="relative bg-white shadow-sm rounded-3xl border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                  <div className={`absolute top-0 left-0 right-0 ${selectedContext.length > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'} text-xs px-3 py-1.5 rounded-t-3xl border-b ${selectedContext.length > 0 ? 'border-blue-100' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedContext.length > 0}
                          onChange={(checked) => {
                            if (!checked) {
                              setSelectedContext([]);
                              setSelectedTabs([]);
                              setSelectedFiles([]);
                            } else {
                              if (currentTab) {
                                setSelectedTabs([{ id: currentTab.id, processed: false }]);
                                setSelectedContext([currentTab.title]);
                              }
                            }
                          }}
                        />
                        <span>Search in context</span>
                      </div>
                      <div className="flex items-center text-xs">
                        <span>Click</span>
                        <button className={`mx-1 ${selectedContext.length > 0 ? 'text-blue-700' : 'text-gray-700'} hover:underline inline-flex items-center`}>
                          <Layers className="w-3 h-3" />
                        </button>
                        <span>to update context</span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="flex items-center pt-8">
                    <button
                      type="button"
                      onClick={toggleSuggestions}
                      className="chevron-button p-2 hover:bg-gray-100 rounded-full ml-2"
                    >
                      {!isSuggestionsVisible ? (
                        <ChevronUp className="w-5 h-5 text-gray-500 transition duration-300" />
                      ) : (
                        !isFirstInteraction && <ChevronDown className="w-5 h-5 text-gray-500 transition duration-300" />
                      )}
                    </button>
                    <input
                      type="text"
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={selectedContext.length > 0 ? 'Search within selected context' : "Why is ocean blue?"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (inputValue.trim() || selectedFiles.length > 0) {
                            handleSubmit(e);
                          }
                        }
                      }}
                      className="flex-1 px-3 py-3 bg-transparent border-none text-base focus:outline-none leading-normal placeholder:text-sm"
                      style={{ minHeight: '56px', fontSize: '14px' }}
                    />
                    <div className="flex items-center space-x-1 pr-2">
                      <ContextSelector
                        files={files}
                        setFiles={setFiles}
                        checkedFiles={selectedFiles}
                        setCheckedFiles={setSelectedFiles}
                        selectedTabs={selectedTabs}
                        setSelectedTabs={setSelectedTabs}
                        currentTab={currentTab}
                        onRemoveFile={handleRemoveFile}
                        isContextSearchActive={selectedContext.length > 0}
                        setIsProcessing={setIsProcessing}
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
            </>
          ) : <AIGateway />}
        </div>
      </div>
    </div>
  );
}

export default SidePanel;