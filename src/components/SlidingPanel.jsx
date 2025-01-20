import React from 'react';
import { Settings, MessageSquare, ChevronDown } from 'lucide-react';

const SlidingPanel = ({ isOpen, onClose, username, onSettingsClick }) => {
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
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">Helion Assistant</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
          <div style={{ width: '32px', height: '32px' }} className="rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
            F
          </div>
        </div>

        <div className="flex flex-col h-[calc(100%-56px)]">
          {/* Recent chats section */}
          <div className="px-4 pt-4">
            <h3 className="text-base text-gray-500 mb-2">Recent</h3>
            <div className="space-y-4">
              {[
                'Pythagorean Theorem Explanation',
                'System Message Bubble Component',
                'Chrome Extension for Work'
              ].map((chat, index) => (
                <button
                  key={index}
                  className="w-full text-left flex items-center gap-3 text-base hover:bg-gray-100 rounded-lg"
                >
                  <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{chat}</span>
                </button>
              ))}
            </div>
          </div>
          
          <button className="w-full text-left px-4 py-4 text-base text-gray-600 hover:bg-gray-50">
            Show more
          </button>

          {/* Settings at the bottom */}
          <div className="mt-auto">
            <button 
              onClick={onSettingsClick}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-base"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SlidingPanel;