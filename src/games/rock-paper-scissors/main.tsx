import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import RockPaperScissors from './RockPaperScissors';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RockPaperScissors />
  </StrictMode>,
);
