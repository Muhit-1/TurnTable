import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Go from './Go';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Go />
  </StrictMode>,
);
