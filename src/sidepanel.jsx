import React from 'react';
import { createRoot } from 'react-dom/client';
import SidePanel from './components/SidePanel';

console.log('Sidepanel script loaded');

const container = document.getElementById('root');
console.log('Container element:', container);

if (!container) {
  console.error('Failed to find the root element');
  throw new Error('Failed to find the root element');
}

const root = createRoot(container);
console.log('Root created');

root.render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>
);

console.log('Render called');