import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Memory from './Memory';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Memory />
  </StrictMode>,
);
