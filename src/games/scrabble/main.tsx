import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Scrabble from './Scrabble';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Scrabble />
  </StrictMode>,
);
