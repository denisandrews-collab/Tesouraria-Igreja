import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App, { ErrorBoundary } from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket errors that can't be fixed in this environment
if (typeof window !== 'undefined') {
  const isBenignError = (msg: string) => 
    msg.includes('WebSocket') || 
    msg.includes('vite') || 
    msg.includes('failed to connect to websocket') ||
    msg.includes('WebSocket closed without opened') ||
    msg.includes('HMR') ||
    msg.includes('The width(-1) and height(-1) of chart should be greater than 0');

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = (reason?.message || reason || '').toString();
    if (isBenignError(msg)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    const msg = (event.message || event.error?.message || '').toString();
    if (isBenignError(msg)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
