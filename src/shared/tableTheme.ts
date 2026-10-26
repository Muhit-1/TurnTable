import { loadJson, saveJson } from './storage';

/** Felt colours for the table. Picking one re-tints the page, the panels and the rails (see `body[data-table]` in baize.css). */
export interface TableTheme {
  id: string;
  name: string;
  hex: string;
}

export const TABLE_THEMES: TableTheme[] = [
  { id: 'baize', name: 'Baize green', hex: '#0f3b2e' },
  { id: 'claret', name: 'Claret', hex: '#4a1620' },
  { id: 'navy', name: 'Midnight blue', hex: '#14243f' },
  { id: 'slate', name: 'Slate', hex: '#26303a' },
];

/** Applies a table colour to the page. */
export function applyTable(id: string, el: HTMLElement = document.body): TableTheme {
  const theme = TABLE_THEMES.find((t) => t.id === id) ?? TABLE_THEMES[0];
  el.dataset.table = theme.id;
  return theme;
}

export const loadTable = () => {
  const id = loadJson<string>('table');
  return typeof id === 'string' && TABLE_THEMES.some((t) => t.id === id) ? id : 'baize';
};
export const saveTable = (id: string) => saveJson('table', id);
