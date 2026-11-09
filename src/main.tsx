import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { initAppIndexedDB } from '@/lib/local-api';

import './index.css';

// Inicializa armazenamento de alta capacidade em IndexedDB (+100.000 registos)
initAppIndexedDB().catch(() => {});

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
