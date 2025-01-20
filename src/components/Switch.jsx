import React from 'react';

const Switch = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
      checked ? 'bg-blue-500' : 'bg-gray-200'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

export default Switch;