import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Gomoku from './Gomoku';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Gomoku />
  </StrictMode>,
);
