import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import Uno from './Uno';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Uno />
  </StrictMode>,
);
