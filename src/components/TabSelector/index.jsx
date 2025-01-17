import React, { useState, useEffect } from 'react';
import { Layers, X, ChevronDown } from 'lucide-react';

const TabSelector = ({ onTabsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [selectedTabs, setSelectedTabs] = useState([]);

  useEffect(() => {
    // Get relevant tabs from Chrome
    const getTabs = async () => {
      try {
        // Query for Confluence and SharePoint tabs
        const allTabs = await chrome.tabs.query({});

        console.log('allTabs---', allTabs)

        // Filter tabs for Confluence and SharePoint
        // const tabs = allTabs.filter(tab => 
        //   tab.url.includes('.atlassian.net/wiki/') || 
        //   tab.url.includes('.sharepoint.com/')
        // );

        const tabs = allTabs;

        setTabs(tabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          type: tab.url.includes('sharepoint') ? 'sharepoint' : 'confluence',
          url: tab.url
        })));
      } catch (error) {
        console.error('Error fetching tabs:', error);
      }
    };

    getTabs();
  }, []);

  const handleTabSelect = (tabId) => {
    setSelectedTabs(prev => {
      const newSelection = prev.includes(tabId)
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId];
      
      onTabsChange(newSelection);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const allTabIds = tabs.map(tab => tab.id);
    setSelectedTabs(prev => 
      prev.length === tabs.length ? [] : allTabIds
    );
    onTabsChange(selectedTabs.length === tabs.length ? [] : allTabIds);
  };

  const getTypeIcon = (type) => {
    return type === 'sharepoint' ? '📹' : '📄';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-gray-100 rounded-full relative"
        title="Select tabs for context"
      >
        <Layers className="w-5 h-5 text-gray-500" />
        {selectedTabs.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {selectedTabs.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setIsOpen(false)}
          />

          {/* Tab Selection Panel */}
          <div className="absolute bottom-full mb-2 right-0 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-hidden">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-medium">Select Tabs for Context</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 border-b border-gray-200">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedTabs.length === tabs.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="overflow-y-auto max-h-72">
              {tabs.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No Confluence or Teams Recording tabs found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {tabs.map(tab => (
                    <label
                      key={tab.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTabs.includes(tab.id)}
                        onChange={() => handleTabSelect(tab.id)}
                        className="mr-3"
                      />
                      <span className="mr-2">{getTypeIcon(tab.type)}</span>
                      <span className="text-sm truncate">{tab.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TabSelector;