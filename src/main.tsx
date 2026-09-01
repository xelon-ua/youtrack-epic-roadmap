import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { relayFragmentToParent } from './auth/silentRefresh';

// Inside our own silent-refresh iframe: hand the token to the parent and render nothing.
if (!relayFragmentToParent()) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
