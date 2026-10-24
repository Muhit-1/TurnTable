import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Nim from './Nim';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Nim />
  </StrictMode>,
);
