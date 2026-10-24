import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import DotsAndBoxes from './DotsAndBoxes';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <DotsAndBoxes />
  </StrictMode>,
);
