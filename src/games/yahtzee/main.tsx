import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Yahtzee from './Yahtzee';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Yahtzee />
  </StrictMode>,
);
