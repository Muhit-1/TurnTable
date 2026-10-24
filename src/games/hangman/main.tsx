import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Hangman from './Hangman';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Hangman />
  </StrictMode>,
);
