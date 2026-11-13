import { loadJson, saveJson } from './storage';

/** The kinds of paper the notebook is drawn on. The choice is drawn by `body[data-paper]` in notebook.css. */
export interface PaperStyle {
  id: string;
  name: string;
}

export const PAPERS: PaperStyle[] = [
  { id: 'squared', name: 'Squared paper' },
  { id: 'lined', name: 'Lined paper' },
  { id: 'dotted', name: 'Dotted paper' },
  { id: 'plain', name: 'Plain paper' },
];

/** Applies a paper style to the page. */
export function applyPaper(id: string, el: HTMLElement = document.body): PaperStyle {
  const paper = PAPERS.find((p) => p.id === id) ?? PAPERS[0];
  el.dataset.paper = paper.id;
  return paper;
}

export const loadPaper = () => {
  const id = loadJson<string>('paper');
  return typeof id === 'string' && PAPERS.some((p) => p.id === id) ? id : PAPERS[0].id;
};
export const savePaper = (id: string) => saveJson('paper', id);
