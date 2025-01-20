// ThemeSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';

const themes = [
  {
    name: "Ocean Sunrise",
    gradient: "linear-gradient(180deg, #E879F9 0%, #818CF8 50%, #38BDF8 100%)",
  },
  {
    name: "Sunset Vibes",
    gradient: "linear-gradient(180deg, #FB923C 0%, #F472B6 50%, #818CF8 100%)",
  },
  {
    name: "Spring Bloom",
    gradient: "linear-gradient(180deg, #F472B6 0%, #C084FC 50%, #818CF8 100%)",
  },
  {
    name: "Electric Violet",
    gradient: "linear-gradient(180deg, #A78BFA 0%, #6366F1 50%, #3B82F6 100%)",
  },
  {
    name: "Cyber Punch",
    gradient: "linear-gradient(180deg, #67E8F9 0%, #2DD4BF 50%, #0EA5E9 100%)",
  },
  {
    name: "Aurora Borealis",
    gradient: "linear-gradient(180deg, #4F46E5 0%, #818CF8 50%, #C7D2FE 100%)",
  },
  {
    name: "Cool Mint",
    gradient: "linear-gradient(180deg, #6EE7B7 0%, #3B82F6 50%, #6366F1 100%)",
  },
  {
    name: "Warm Rose",
    gradient: "linear-gradient(180deg, #FCA5A5 0%, #F472B6 50%, #C084FC 100%)",
  }
];

const ThemeSelector = ({ currentGradient, onGradientChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
        aria-label="Change theme"
      >
        <Palette className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
          <div className="space-y-1">
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => {
                  onGradientChange(theme.gradient);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  currentGradient === theme.gradient ? 'bg-gray-100' : ''
                }`}
              >
                <span className="text-sm text-gray-700">{theme.name}</span>
                <div 
                  className="w-8 h-8 rounded-full shadow-inner"
                  style={{ background: theme.gradient }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;