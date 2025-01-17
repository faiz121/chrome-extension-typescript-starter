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
  const [error, setError] = useState(null);

  // Fetch tabs when component mounts
  useEffect(() => {
    const fetchTabs = async () => {
      try {
        // Log that we're starting to fetch tabs
        console.log('Fetching tabs...');
        
        // Clear any previous errors
        setError(null);
        
        // Mock data for testing if chrome.tabs is not available
        if (!window.chrome?.tabs?.query) {
          console.log('Chrome tabs API not available, using mock data');
          const mockTabs = [
            { id: 1, title: 'Test Tab 1', url: 'https://test1.com' },
            { id: 2, title: 'Test Tab 2', url: 'https://test2.com' },
          ];
          setTabs(mockTabs);
          return;
        }

        const allTabs = await chrome.tabs.query({});
        console.log('Fetched tabs:', allTabs);
        
        const formattedTabs = allTabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          url: tab.url
        }));
        
        setTabs(formattedTabs);
      } catch (error) {
        console.error('Error fetching tabs:', error);
        setError('Failed to fetch tabs');
      }
    };

    fetchTabs();
  }, []);

  // Update selected files when new files are added
  useEffect(() => {
    if (files.length > 0) {
      setSelectedFiles(files.map((_, idx) => idx));
      onFilesChange?.(files);
    }
  }, [files, onFilesChange]);

  const handleTabSelect = async (tabId) => {
    if (selectedTabs.includes(tabId)) {
      // Remove tab
      const newSelection = selectedTabs.filter(id => id !== tabId);
      setSelectedTabs(newSelection);
      onTabsChange?.(newSelection);
    } else if (selectedTabs.length < MAX_TABS) {
      // Add tab
      setLoadingTabs(prev => new Set([...prev, tabId]));
      
      try {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newSelection = [...selectedTabs, tabId];
        setSelectedTabs(newSelection);
        onTabsChange?.(newSelection);
        
        setCompletedTabs(prev => new Set([...prev, tabId]));
        setTimeout(() => {
          setCompletedTabs(prev => {
            const next = new Set(prev);
            next.delete(tabId);
            return next;
          });
        }, 2000);
      } finally {
        setLoadingTabs(prev => {
          const next = new Set(prev);
          next.delete(tabId);
          return next;
        });
      }
    }
  };

  const handleFileSelect = (index) => {
    setSelectedFiles(prev => {
      const newSelection = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index];
      onFilesChange?.(newSelection.map(i => files[i]));
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (activeTab === 'tabs') {
      const newSelection = selectedTabs.length === tabs.length ? [] : tabs.map(tab => tab.id);
      setSelectedTabs(newSelection);
      onTabsChange?.(newSelection);
    } else {
      const newSelection = selectedFiles.length === files.length ? [] : files.map((_, i) => i);
      setSelectedFiles(newSelection);
      onFilesChange?.(newSelection.map(i => files[i]));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-gray-100 rounded-full relative"
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
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full mb-2 right-0 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96">
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
                onClick={() => setActiveTab('tabs')}
                className={`flex-1 p-2 text-sm font-medium ${
                  activeTab === 'tabs' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500'
                }`}
              >
                Tabs ({selectedTabs.length})
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 p-2 text-sm font-medium ${
                  activeTab === 'files' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500'
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

            <div className="overflow-y-auto max-h-64">
              {activeTab === 'tabs' ? (
                <div className="p-2 space-y-1">
                  {error ? (
                    <div className="p-4 text-center text-red-500">
                      {error}
                    </div>
                  ) : tabs.length === 0 ? (
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