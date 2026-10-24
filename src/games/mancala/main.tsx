import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Mancala from './Mancala';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Mancala />
  </StrictMode>,
);
