// Self-hosted typography — bundled with the app so no external font CDN
// can fail and degrade the UI (fallback type + raw icon-name words).
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Lets us confirm which commit a browser is actually running, so "nothing
// changed" can be diagnosed as a stale deploy or cache rather than guessed at.
// eslint-disable-next-line no-undef
console.log(`Dobium build ${__BUILD_SHA__} — ${__BUILD_TIME__}`);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
