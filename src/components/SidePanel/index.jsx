import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  ChevronUp,
  ChevronDown,
  Send,
  Loader2,
  DatabaseZap,
  Layers,
  CircuitBoard,
  PencilLine,
} from 'lucide-react';
import FileUpload from './FileUpload';
import SlidingPanel, { saveChatToHistory } from '../SlidingPanel'; // Add this import
import ContextSelector from '../ContextSelector';
import LoginComponent from '../LoginComponent';
import { marked } from 'marked';
import MessageBubble from '../MessageBubble';
import AIGateway from '../AIGateway';
import Switch from '../Switch';
import ThemeSelector from '../ThemeSelector';
import SettingsPage from '../SettingsPage';
import DataDisclaimer from './DataDisclaimer';
import { getSuggestionButtonsForUrl } from '../helpers/utils';

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
  const [selectedTabs, setSelectedTabs] = useState([]); // To store tab info
  const [selectedFiles, setSelectedFiles] = useState([]); // You already have this
  const [selectedContext, setSelectedContext] = useState([]);
  const [currentTab, setCurrentTab] = useState(null);
  const messagesEndRef = useRef(null);
  const [currentView, setCurrentView] = useState('ragonfly');
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const [validationError, setValidationError] = useState(null);
  const [recentChatsKey, setRecentChatsKey] = useState(Date.now());
  const [currentGradient, setCurrentGradient] = useState(
    'linear-gradient(180deg, #E879F9 0%, #818CF8 50%, #38BDF8 100%)' // Ocean Sunrise as default
  );
  const chatContainerRef = useRef(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_FILES = 5;
  const dropdownRef = useRef(null);
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const [suggestionButtons, setSuggestionButtons] = useState([]);
  const [suggestionError, setSuggestionError] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      setValidationError('');
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
    const handleTabUpdate = async () => {
      await checkAndUpdateCurrentTab();
      // setIsContextSearchActive(false);
    };

    // Add event listeners
    chrome.tabs.onActivated.addListener(handleTabUpdate);
    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    // Cleanup
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabUpdate);
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    };
  }, []);

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !isValidTab(tab)) {
          setIsContextSearchActive(false);
          setSuggestionButtons([]);
          return;
        }
        if (tab) {
          setCurrentTab({ ...tab, currentTab: true });
          const buttons = await getSuggestionButtonsForUrl(tab.url);
          setSuggestionButtons(buttons)
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
    setSelectedContext([...selectedTabs.map((tab) => tab.name), ...selectedFiles]);
  }, [selectedTabs, selectedFiles]);

  useEffect(() => {
    chrome.storage.local.get(['session'], (result) => {
      const sessionData = result.session;
     if(sessionData?.username) {
         if (sessionData && sessionData?.loginTimestamp) {
              const now = Date.now();
              const timeElapsedSinceLastLogin = now - sessionData.loginTimestamp
              console.log('timeElapsedSinceLastLogin', timeElapsedSinceLastLogin)
              if (timeElapsedSinceLastLogin > THREE_DAYS_MS) {
                chrome.storage.local.remove('session', () => {
                  setSession(null);
                  setIsLoadingSession(false);
                });
                return;
              }
          }
          setSession(sessionData);
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

  const validateContextualSearch = () => {
    if (selectedContext.length === 0 && isContextSearchActive) {
      setValidationError(
        'Please select at least one source for contextual search or turn off "Search in context"'
      );
      return false;
    }
    setValidationError(null);
    return true;
  };

  const checkAndUpdateCurrentTab = async () => {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Skip if it's a chrome page or new tab
      if (!isValidTab(tab)) {
        setCurrentTab(null);
        setSuggestionButtons([]);
        return;
      }

      // Check if the tab info has changed from our current state
      if (!currentTab || currentTab.id !== tab.id || currentTab.url !== tab.url) {
        setCurrentTab({ ...tab, currentTab: true });
        const buttons = await getSuggestionButtonsForUrl(tab.url);
        setSuggestionButtons(buttons)
      }
    } catch (error) {
      console.error('Error processing tab:', error);
    }
  };

  const isValidTab = (tab) => {
    return !(
      tab.url?.startsWith('chrome://extensions') ||
      tab.url === 'chrome://newtab/' ||
      tab.url === ''
    );
  };

  const handleTabsSubmit = async (tabId, tabName) => {
    console.log('tabname', tabName);
    if (!session || !session?.username) return;
    // if (selectedTabs.length === 0) return;

    setIsProcessing(true);
    // setError('');

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'ingestTabContent',
            tabId,
            tabName,
            username: session.username,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to process tabs');
      }
    } catch (err) {
      // setError(err.message);
      setSelectedTabs((prev) => prev.filter((tab) => tab.id !== tabId));
      // setTimeout(() => {
      //   setError('');
      // }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = (newSession) => {
    setSession(newSession);
  };

  const renderMarkdown = (content) => {
    return { __html: marked.parse(content) };
  };

  const handleSignOut = () => {
    // Clear user session from storage or state
    chrome.storage.local.remove('session', () => {
      setSession(null);
      setIsSidePanelOpen(false);
    });
  };

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
        setIsFirstInteraction(false);
        setIsChevronVisible(true);
        setIsSuggestionsVisible(false);

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
    setSuggestionError(null)

    try {
      setMessages((prev) => [
        ...prev,
        {
          type: 'system',
          content: 'Loading...', // This will show the loading state
          isLoading: true,
          isSuggestion: true,
          key: suggestion.key,
        },
      ]);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.runtime.sendMessage(
        {
          action: suggestion.key,
          tabId: tab.id,
        },
        (response) => {
          if (response.error) {
            console.error('Error:', response.error);
             if (response.error === "Could not establish connection. Receiving end does not exist.") {
              setSuggestionError(response.error); 
              setMessages((prev) => prev.map((msg, idx) => idx === prev.length -1 ? {...msg, isLoading:false, content: '', isSuggestion: true}: msg))
              // chrome.tabs.reload(tab.id)
             } else {
               setSuggestionError(response.error);
               setMessages((prev) => prev.map((msg, idx) => idx === prev.length -1 ? {...msg, isLoading: false}: msg))
             }
            return;
          }

          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1
                ? {
                    type: 'system',
                    content: response.data,
                    isLoading: false,
                    isSuggestion: true,
                  }
                : msg
            )
          );
          // setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error('Error getting current tab:', error);
      setSuggestionError(error.message || "An error occurred");
      setMessages((prev) => prev.map((msg, idx) => idx === prev.length -1 ? {...msg, isLoading:false}: msg))
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
    setSuggestionError(null)
    e.preventDefault();
    e.stopPropagation();

    if (!inputValue.trim()) return;

    if (!validateContextualSearch()) {
      return;
    }

    let history = messages
      .filter((message) => message.type !== 'system') // Filter out system messages
      .map((message) => `${message.type}: ${message.content}`) // Format each message
      .join('\n'); // Join messages with newline

    const newMessage = {
      type: 'user',
      content: inputValue,
      isContextSearchActive,
      context: {
        tabs: selectedTabs.map((tab) => ({
          id: tab.id,
          title: tab.title,
        })),
        files: selectedFiles.map((file) => ({
          name: file.name,
          extension: file.extension,
        })),
      },
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setIsProcessing(true);

    const currentChatState = [...messages, newMessage];

    chrome.runtime.sendMessage(
      {
        action: 'askquestion',
        question: inputValue,
        sources: selectedContext,
        username: session.username,
        isContextSearchActive,
        history,
      },
      async (response) => {
        console.log('respon', response);
        // setMessages((prev) => [...prev, newMessage]);
        setInputValue('');

        const newResponse = {
          type: 'assistant',
          content: response.data,
          isContextualSearch: isContextSearchActive,
          isLoading: false,
        };

        const updatedChatState = [...currentChatState, newResponse];

        if (messages.length === 0 && session?.username) {
          chrome.runtime.sendMessage(
            {
              action: 'generateChatTitle',
              userMessage: inputValue,
              aiResponse: response.data,
              username: session.username,
            },
            (titleResponse) => {
              // Save chat with generated title
              handleSaveNewChat(
                titleResponse?.title || `${inputValue.substring(0, 30)}...`,
                updatedChatState
              );
            }
          );
        } else {
          // Continuously save chat state
          handleSaveNewChat(null, updatedChatState);
        }

        setMessages((prev) => [...prev, newResponse]);
        setIsProcessing(false);
      }
    );
  };

  const handleSaveNewChat = (title, messages) => {
    if (!session?.username) return;

    chrome.storage.local.get([`recentChats_${session.username}`], (result) => {
      const existingChats = result[`recentChats_${session.username}`] || [];

      const newChat = title
        ? {
            id: Date.now(),
            title,
            firstMessage: messages[0].content,
            timestamp: new Date().toISOString(),
          }
        : null;

      // Update recent chats if new title generated
      if (newChat) {
        const updatedChats = [newChat, ...existingChats].slice(0, 10);
        chrome.storage.local.set({
          [`recentChats_${session.username}`]: updatedChats,
          [`chatMessages_${session.username}_${newChat.id}`]: messages,
        });
        chrome.storage.local.get([`recentChats_${session.username}`], (verifyResult) => {
          console.log('Verified Chats:', verifyResult[`recentChats_${session.username}`]);
        });
      } else {
        // Update last chat's messages
        const lastChatId = existingChats[0]?.id;
        if (lastChatId) {
          chrome.storage.local.set({
            [`chatMessages_${session.username}_${lastChatId}`]: messages,
          });
        }
      }
    });
  };

  const handleChatSelect = (chat) => {
    if (!session?.username) return;

    const storageKey = `chatMessages_${session.username}_${chat.id}`;
    chrome.storage.local.get([storageKey], (result) => {
      const chatMessages = result[storageKey];
      if (chatMessages) {
        setMessages(chatMessages);
      }
    });
    setIsSidePanelOpen(false);
  };

  const handleNewChat = () => {
    setMessages([]);
    if (inputRef.current) {
         inputRef.current.focus();
     }
  };

  const handleDeleteChat = (chatId) => {
    if (!session?.username) return;

    chrome.storage.local.get(
      [`recentChats_${session.username}`, `chatMessages_${session.username}_${chatId}`],
      (result) => {
        const existingChats = result[`recentChats_${session.username}`] || [];
        const updatedChats = existingChats.filter((chat) => chat.id !== chatId);

        chrome.storage.local.set(
          {
            [`recentChats_${session.username}`]: updatedChats,
          },
          () => {
            // Remove specific chat messages
            chrome.storage.local.remove([`chatMessages_${session.username}_${chatId}`]);
            if (messages.length > 0 && messages[0]?.id === chatId) {
              setMessages([]);
            }
            setRecentChatsKey(Date.now());
          }
        );
      }
    );
    
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
    <div className='relative flex flex-col h-screen'>
      {/* Gradient Background Layer */}
      <div
        className='absolute inset-0 pointer-events-none'
        style={{
          background: currentGradient,
          opacity: 0.1,
        }}
      />

      <DataDisclaimer />

      {/* Content Layer */}
      <div className='relative flex flex-col h-full'>
        <SlidingPanel
          key={recentChatsKey} // Add key to force re-render
          isOpen={isSidePanelOpen}
          onClose={() => setIsSidePanelOpen(false)}
          username={session?.username}
          onSettingsClick={() => {
            setIsSidePanelOpen(false);
            setIsSettingsOpen(true);
          }}
          onChatSelect={handleChatSelect}
          onDeleteChat={handleDeleteChat}
          currentMessages={messages} // Pass current messages
          onSignOut={handleSignOut}
        />

        <div className='flex-shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm'>
          <div className='flex items-center p-3'>
            <button
              onClick={() => setIsSidePanelOpen(true)}
              className='p-1 hover:bg-gray-100 rounded-full mr-3 text-gray-600'
            >
              <Menu className='w-5 h-5' />
            </button>
            <div className='flex items-center gap-2 flex-1' ref={dropdownRef}>
              <div className='relative'>
                <button
                  onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                  className='flex items-center gap-2'
                >
                  <h1 className='text-xl font-medium flex items-center gap-2'>
                    {currentView === 'ragonfly' ? (
                      <div className='flex items-center gap-2'>
                        <DatabaseZap className='w-5 h-5 text-blue-500' />
                        <span>RAG on fly</span>
                      </div>
                    ) : (
                      <div className='flex items-center gap-2'>
                        <CircuitBoard className='w-5 h-5 text-violet-500' />
                        <span>AI Gateway</span>
                      </div>
                    )}
                  </h1>
                  <ChevronDown className='w-5 h-5 text-gray-500' />
                </button>

                {isViewDropdownOpen && (
                  <div className='absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg'>
                    <button
                      onClick={() => {
                        setCurrentView(currentView === 'ragonfly' ? 'gateway' : 'ragonfly');
                        setIsViewDropdownOpen(false);
                      }}
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center gap-2'
                    >
                      {currentView === 'ragonfly' ? (
                        <>
                          <CircuitBoard className='w-5 h-5 text-teal-500' />
                          <span>AI Gateway</span>
                        </>
                      ) : (
                        <>
                          <DatabaseZap className='w-5 h-5 text-teal-500' />
                          <span>RAG on fly</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <ThemeSelector
                currentGradient={currentGradient}
                onGradientChange={setCurrentGradient}
              />
              <button
                onClick={handleNewChat}
                className='flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors'
              >
                <PencilLine className='w-5 h-5' />
            </button>
            </div>
          </div>
        </div>

        <div className='flex-1 flex flex-col min-h-0'>
          {currentView === 'ragonfly' ? (
            <>
              <div className='flex-1 overflow-y-auto'>
                {isLoading ? (
                  <div className='flex-1 flex items-center justify-center'>
                    <div className='w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' />
                  </div>
                ) : (
                  <div className='flex-1 flex flex-col h-full'>
                    {messages.length === 0 ? (
                      <div className='flex flex-col h-full'>
                        <div className='flex-1 flex items-center justify-center'>
                          <div className='text-center'>
                            <h2 className='text-4xl leading-tight tracking-normal font-light'>
                              <span className='text-blue-500'>Hello</span>
                              <span className='text-gray-400'>, </span>
                              <span className='text-gray-900'>how </span>
                              <span className='text-gray-900'>can </span>
                              <span className='text-gray-900'>I </span>
                              <span className='text-gray-900'>help </span>
                              <br />
                              <span className='text-blue-500'>you </span>
                              <span className='text-gray-900'>today</span>
                              <span className='text-gray-400'>?</span>
                            </h2>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='px-4 py-4'>
                        <div className='space-y-4'>
                          {messages.map((message, index) => {
                            const isSystemOrAssistant =
                              message.type === 'system' || message.type === 'assistant';
                            return isSystemOrAssistant ? (
                              <MessageBubble
                                key={index}
                                content={message.content}
                                isLoading={message.isLoading}
                                title={message.isSuggestion ? message.key : null}
                                contextIndicator={
                                  message.isContextualSearch ? 'Contextual Search' : null
                                }
                              />
                            ) : (
                              <div
                                key={index}
                                className={`flex ${
                                  message.type === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`message-bubble font-sans relative max-w-[85%] p-3 rounded-lg shadow-sm ${
                                    message.type === 'user'
                                      ? 'bg-blue-500 text-white rounded-br-none'
                                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                                  }`}
                                >
                                  <div
                                    className='prose prose-sm max-w-none'
                                    style={{ fontSize: '16px', lineHeight: '1.5' }}
                                    dangerouslySetInnerHTML={renderMarkdown(message.content)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          {isProcessing && (
                            <div className='flex items-start'>
                              <MessageBubble key='loading' content='Loading...' isLoading={true} />
                            </div>
                          )}
                          {suggestionError && (
                            <div className="text-red-500 text-sm">
                                {suggestionError}
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
                  ${
                    !isFirstInteraction
                      ? isSuggestionsVisible
                        ? 'max-h-96 opacity-100 visible'
                        : 'max-h-0 opacity-0 invisible overflow-hidden'
                      : ''
                  }
                  ${isAnimatingChevron ? 'pointer-events-none' : ''}`}
                ref={suggestionsPanelRef}
              >
                <div
                  className='px-4 pt-4 border-t border-gray-200'
                  style={{ marginBottom: '10px' }}
                >
                  <div className='grid grid-cols-2 gap-2 w-full'>
                    {currentTab &&
                      isValidTab(currentTab) &&
                      suggestionButtons.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className='text-left px-4 py-3 bg-white shadow-sm rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors flex items-start space-x-2'
                        >
                          <suggestion.icon className='w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5' />
                          <div>
                            <div className='text-sm font-medium text-gray-900'>
                              {suggestion.title}
                            </div>
                            <div className='text-sm text-gray-500'>{suggestion.subtitle}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className='px-4 py-3'>
                <div className='relative bg-white shadow-sm rounded-3xl border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all'>
                  <div
                    className={`absolute top-0 left-0 right-0 ${
                      isContextSearchActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-gray-50 text-gray-600'
                    } text-xs px-3 py-1.5 rounded-t-3xl border-b ${
                      isContextSearchActive ? 'border-blue-100' : 'border-gray-100'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Switch
                          checked={isContextSearchActive}
                          onChange={(checked) => {
                            setIsContextSearchActive(checked);
                            if (!checked) {
                              setSelectedContext([]);
                              setSelectedTabs([]);
                              setSelectedFiles([]);
                            } else {
                              if (currentTab && isValidTab(currentTab)) {
                                setSelectedTabs([
                                  { id: currentTab.id, processed: false, name: currentTab.title },
                                ]);
                                setSelectedContext([currentTab.title]);
                              }
                            }
                            // Clear validation error when toggling
                            setValidationError(null);
                          }}
                        />
                        <span>Search in context</span>
                      </div>
                      {isContextSearchActive && (
                        <div className='flex items-center text-xs'>
                          <span>Click</span>
                          <button
                            className={`mx-1 ${
                              isContextSearchActive ? 'text-blue-700' : 'text-gray-700'
                            } hover:underline inline-flex items-center`}
                          >
                            <Layers className='w-3 h-3' />
                          </button>
                          <span>to update context</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main input form */}
                  <form onSubmit={handleSubmit} className='flex flex-col pt-8'>
                    <div className='flex items-center'>
                      <button
                        type='button'
                        onClick={toggleSuggestions}
                        className='chevron-button p-2 hover:bg-gray-100 rounded-full ml-2'
                      >
                        {!isSuggestionsVisible ? (
                          <ChevronUp className='w-5 h-5 text-gray-500 transition duration-300' />
                        ) : (
                          !isFirstInteraction && (
                            <ChevronDown className='w-5 h-5 text-gray-500 transition duration-300' />
                          )
                        )}
                      </button>
                      <input
                        type='text'
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => {
                          const newInputValue = e.target.value;
                          if (newInputValue.length > 3000) {
                              setValidationError("Input limited to 3000 characters");
                              setInputValue(newInputValue.slice(0,3000));
                          } else {
                              setInputValue(newInputValue);
                              if (validationError) {
                                  setValidationError(null);
                                }
                          }
                        }}
                        placeholder={
                          isContextSearchActive
                            ? 'Search within selected context'
                            : 'Why is ocean blue?'
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (inputValue.trim() || selectedFiles.length > 0) {
                              handleSubmit(e);
                            }
                          }
                        }}
                        className='flex-1 px-3 py-3 bg-transparent border-none text-base focus:outline-none leading-normal placeholder:text-sm'
                        style={{ minHeight: '56px', fontSize: '14px' }}
                      />
                      <div className='flex items-center space-x-1 pr-2'>
                        <ContextSelector
                          files={files}
                          setFiles={setFiles}
                          checkedFiles={selectedFiles}
                          setCheckedFiles={setSelectedFiles}
                          selectedTabs={selectedTabs}
                          setSelectedTabs={setSelectedTabs}
                          currentTab={currentTab}
                          onRemoveFile={handleRemoveFile}
                          isContextSearchActive={isContextSearchActive}
                          setIsProcessing={setIsProcessing}
                          handleTabsSubmit={handleTabsSubmit}
                        />
                        <button
                          type='submit'
                          disabled={!inputValue.trim() && selectedFiles.length === 0}
                          className='p-1.5 text-gray-500 hover:bg-gray-100 rounded-full disabled:opacity-50'
                        >
                          <Send className='w-5 h-5' />
                        </button>
                      </div>
                    </div>

                    {/* Error message section */}
                    {validationError && (
                      <div className='px-3 pb-2 text-red-500 text-xs'>{validationError}</div>
                    )}
                  </form>
                </div>
              </div>
            </>
          ) : (
            <AIGateway currentGradient={currentGradient} username={session?.username}/>
          )}
        </div>
      </div>
      {isSettingsOpen && (
        <SettingsPage
          onClose={() => {
            setIsSettingsOpen(false);
            // Optionally reopen sliding panel if desired
            // setIsSidePanelOpen(true);
          }}
        />
      )}
    </div>
  );
};

export default SidePanel;
