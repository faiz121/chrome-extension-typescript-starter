import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  MessageSquare, 
  ChevronDown, 
  Search, 
  Network, 
  Globe, 
  Trash2,
  ExternalLink,
  LogOut
} from 'lucide-react';

const SlidingPanel = ({ 
  isOpen, 
  onClose, 
  username, 
  onSettingsClick, 
  onChatSelect, 
  onDeleteChat,
  onSignOut
}) => {
  const [recentChats, setRecentChats] = useState([]);

  useEffect(() => {
    if (!isOpen || !username) return;

    chrome.storage.local.get([`recentChats_${username}`], (result) => {
      const userChats = result[`recentChats_${username}`] || [];
      setRecentChats(userChats);
    });
  }, [isOpen, username]);

  const handleDeleteChat = (chatId) => {
    onDeleteChat(chatId);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40
          ${isOpen ? 'bg-opacity-50 pointer-events-auto' : 'bg-opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-lg transform 
          transition-transform duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">Helion Assistant</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col h-[calc(100%-56px)]">
          {/* Search Options */}
          <div className="flex justify-around py-3 border-b border-gray-100">
            <button 
              className="flex flex-col items-center text-xs text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
            >
              <Globe className="w-6 h-6 text-blue-500 mb-1" />
              Perplexity
            </button>
            <button 
              className="flex flex-col items-center text-xs text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
            >
              <Network className="w-6 h-6 text-green-500 mb-1" />
              Cosmos
            </button>
            <button 
              className="flex flex-col items-center text-xs text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
            >
              <Search className="w-6 h-6 text-purple-500 mb-1" />
              Local
            </button>
          </div>

          {/* Recent Chats */}
          <div className="flex-1 overflow-y-auto px-4 pt-4">
            <h3 className="text-base text-gray-500 mb-2">Recent</h3>
            <div className="space-y-4">
              {recentChats.map((chat) => (
                <div 
                  key={chat.id}
                  className="group flex items-stretch border rounded-lg overflow-hidden hover:bg-gray-100 border-transparent"
                >
                  <button
                    onClick={() => onChatSelect && onChatSelect(chat)}
                    className="flex-1 flex items-center gap-3 text-left p-2 min-w-0"
                  >
                      <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-sm">
                          {chat.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {chat.firstMessage.substring(0, 30)}...
                        </div>
                      </div>
                      </button>
                  <div className="flex items-center border-l">
                    <button 
                      onClick={() => handleDeleteChat(chat.id)}
                      className="p-2 hover:bg-red-100 transition-colors"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Section */}
          <div className="mt-auto border-t">
            <a 
              href="https://forms.office.com/r/asBrWc3ECQ"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-base border-b"
            >
              <ExternalLink className="w-5 h-5 text-gray-400" />
              <span>Feedback</span>
            </a>
            <button 
              className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-base border-b"
            >
              <ExternalLink className="w-5 h-5 text-gray-400" />
              <span>Bug Report</span>
            </button>
            <button 
              onClick={onSettingsClick}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-base border-b"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              <span>Settings</span>
            </button>
            <button
              onClick={onSignOut}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-base"
            >
              <LogOut className="w-5 h-5 text-gray-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default SlidingPanel;