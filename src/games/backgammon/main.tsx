import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Backgammon from './Backgammon';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Backgammon />
  </StrictMode>,
);
