import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Chess from './Chess';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Chess />
  </StrictMode>,
);
