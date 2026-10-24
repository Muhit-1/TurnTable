import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Reversi from './Reversi';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Reversi />
  </StrictMode>,
);
