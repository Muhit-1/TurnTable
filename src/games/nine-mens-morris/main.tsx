import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import NineMensMorris from './NineMensMorris';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <NineMensMorris />
  </StrictMode>,
);
