import React, { useState, useEffect } from 'react';
import { Layers, X, Loader2, Check } from 'lucide-react';

const MAX_TABS = 5;

const ContextSelector = ({ files = [], onTabsChange, onFilesChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tabs');
  const [tabs, setTabs] = useState([]);
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loadingTabs, setLoadingTabs] = useState(new Set());
  const [completedTabs, setCompletedTabs] = useState(new Set());

  // Fetch tabs when component mounts
  useEffect(() => {
    const getTabs = async () => {
      try {
        const allTabs = await chrome.tabs.query({});
        setTabs(allTabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          url: tab.url
        })));
      } catch (error) {
        console.error('Error fetching tabs:', error);
      }
    };

    getTabs();
  }, []);

  // Update selected files when new files are added
  useEffect(() => {
    if (files.length > 0) {
      const indices = files.map((_, idx) => idx);
      setSelectedFiles(indices);
      onFilesChange && onFilesChange(files);
    } else {
      setSelectedFiles([]);
    }
  }, [files]);

  // Clear completed status after 2 seconds
  useEffect(() => {
    const timeouts = [];
    completedTabs.forEach(tabId => {
      const timeout = setTimeout(() => {
        setCompletedTabs(prev => {
          const newSet = new Set(prev);
          newSet.delete(tabId);
          return newSet;
        });
      }, 2000);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(timeout => clearTimeout(timeout));
  }, [completedTabs]);

  const handleTabSelect = async (tabId) => {
    // Check if we're adding or removing
    const isAdding = !selectedTabs.includes(tabId);

    // If adding, check max limit
    if (isAdding && selectedTabs.length >= MAX_TABS) {
      alert(`You can only select up to ${MAX_TABS} tabs`);
      return;
    }

    if (isAdding) {
      // Start loading state
      setLoadingTabs(prev => new Set([...prev, tabId]));

      try {
        // Send message to background script
        await chrome.runtime.sendMessage({
          action: 'processTab',
          tabId: tabId
        });

        // Mock API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update selected tabs
        setSelectedTabs(prev => [...prev, tabId]);

        // Remove loading state and show completed state
        setLoadingTabs(prev => {
          const newSet = new Set(prev);
          newSet.delete(tabId);
          return newSet;
        });
        setCompletedTabs(prev => new Set([...prev, tabId]));

        // Notify parent
        onTabsChange && onTabsChange([...selectedTabs, tabId]);
      } catch (error) {
        console.error('Error processing tab:', error);
        setLoadingTabs(prev => {
          const newSet = new Set(prev);
          newSet.delete(tabId);
          return newSet;
        });
        alert('Failed to process tab');
      }
    } else {
      // Remove tab from selection
      setSelectedTabs(prev => prev.filter(id => id !== tabId));
      onTabsChange && onTabsChange(selectedTabs.filter(id => id !== tabId));
    }
  };

  const handleFileSelect = (index) => {
    setSelectedFiles(prev => {
      const newSelection = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index];
      onFilesChange && onFilesChange(newSelection.map(i => files[i]));
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (activeTab === 'tabs') {
      const allTabIds = tabs.map(tab => tab.id);
      setSelectedTabs(prev => prev.length === tabs.length ? [] : allTabIds);
      onTabsChange && onTabsChange(selectedTabs.length === tabs.length ? [] : allTabIds);
    } else {
      const allFileIndices = files.map((_, idx) => idx);
      setSelectedFiles(prev => prev.length === files.length ? [] : allFileIndices);
      onFilesChange && onFilesChange(selectedFiles.length === files.length ? [] : files);
    }
  };

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-gray-100 rounded-full relative"
        title="Select context"
      >
        <Layers className="w-5 h-5 text-gray-500" />
        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {selectedTabs.length + selectedFiles.length}
        </span>
      </button>

      {isOpen && (
  <>
    <div 
      className="fixed inset-0 bg-black bg-opacity-30"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }}
    />
    <div 
      className="absolute bottom-full mb-2 right-0 w-80 bg-white rounded-lg shadow-lg border border-gray-200"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-medium">Select Context</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-gray-200">
              <button
                type="button" // Add type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab('tabs');
                }}
                className={`flex-1 p-2 text-sm font-medium ${activeTab === 'tabs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                  }`}
              >
                Tabs ({selectedTabs.length})
              </button>
              <button
                type="button" // Add type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab('files');
                }}
                className={`flex-1 p-2 text-sm font-medium ${activeTab === 'files' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                  }`}
              >
                Files ({selectedFiles.length})
              </button>
            </div>

            <div className="p-2 border-b border-gray-200">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {activeTab === 'tabs'
                  ? (selectedTabs.length === tabs.length ? 'Deselect All' : 'Select All')
                  : (selectedFiles.length === files.length ? 'Deselect All' : 'Select All')
                }
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(50vh - 400px)' }}>
              {activeTab === 'tabs' ? (
                <div className="p-2 space-y-1">
                  {tabs.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No tabs available
                    </div>
                  ) : (
                    tabs.map(tab => (
                      <label
                        key={tab.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTabs.includes(tab.id)}
                          onChange={() => handleTabSelect(tab.id)}
                          disabled={loadingTabs.has(tab.id) || (!selectedTabs.includes(tab.id) && selectedTabs.length >= MAX_TABS)}
                          className="mr-3"
                        />
                        <span className="mr-2">🔍</span>
                        <span className="text-sm truncate flex-1">{tab.title}</span>
                        {loadingTabs.has(tab.id) && (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-2" />
                        )}
                        {completedTabs.has(tab.id) && (
                          <Check className="w-4 h-4 text-green-500 ml-2" />
                        )}
                      </label>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {files.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No files uploaded
                    </div>
                  ) : (
                    files.map((file, index) => (
                      <label
                        key={index}
                        className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(index)}
                          onChange={() => handleFileSelect(index)}
                          className="mr-3"
                        />
                        <span className="mr-2">📄</span>
                        <span className="text-sm truncate">{file.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContextSelector;