import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Checkers from './Checkers';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Checkers />
  </StrictMode>,
);
