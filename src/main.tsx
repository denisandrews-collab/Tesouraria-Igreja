import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket errors that can't be fixed in this environment
if (typeof window !== 'undefined') {
  const isBenignError = (msg: string) => 
    msg.includes('WebSocket') || 
    msg.includes('vite') || 
    msg.includes('failed to connect to websocket');

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    if (isBenignError(msg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (isBenignError(msg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
