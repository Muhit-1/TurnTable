import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Ludo from './Ludo';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Ludo />
  </StrictMode>,
);
