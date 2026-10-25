import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import '../styles/fonts.css';
import './preserved-hub.css';
import '../styles/tavern.css';
import Home from './Home';

document.body.classList.add('theme-hub');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
