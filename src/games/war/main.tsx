import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import War from './War';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <War />
  </StrictMode>,
);
