import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/saira';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import App from './App';
import { RegistryProvider } from './registry/RegistryContext';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <RegistryProvider>
      <App />
    </RegistryProvider>
  </StrictMode>,
);
