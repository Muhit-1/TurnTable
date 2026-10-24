import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Hex from './Hex';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Hex />
  </StrictMode>,
);
