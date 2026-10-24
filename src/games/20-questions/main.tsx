import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import TwentyQuestions from './TwentyQuestions';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <TwentyQuestions />
  </StrictMode>,
);
