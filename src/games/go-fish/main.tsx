import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import GoFish from './GoFish';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <GoFish />
  </StrictMode>,
);
