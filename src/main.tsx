import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/layout.css';
import './styles/inspector.css';
import './styles/search.css';
import './styles/cheatsheet.css';
import './styles/lab.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);