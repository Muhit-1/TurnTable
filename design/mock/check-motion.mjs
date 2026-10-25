// Verifies the preserved hover/animation CSS is byte-identical to the original prototypes,
// and that tavern.css never re-declares motion properties on the preserved selectors.
// Run: node design/mock/check-motion.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), 'utf8');
const style = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];
const norm = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();

let failed = 0;
const check = (ok, msg) => { if (!ok) { failed++; console.error('FAIL', msg); } else console.log('ok  ', msg); };

for (const [proto, kept] of [['../homepage-prototype.html', 'preserved-hub.css'], ['../tic-tac-toe-prototype.html', 'preserved-game.css']]) {
  check(norm(style(read(proto))) === norm(read(kept)), `${kept} matches ${proto}`);
}

// The copies shipped in the app must equal the mock's preserved files.
for (const [mock, app] of [['preserved-hub.css', '../../src/home/preserved-hub.css'], ['preserved-game.css', '../../src/styles/preserved-game.css']]) {
  check(read(mock) === read(app), `${app} is identical to ${mock}`);
}

const MOTION = /(transition|animation[\w-]*|transform(-origin)?|box-shadow|height|opacity|pointer-events)\s*:/;
const PRESERVED = /(\.icd-|\.mg-(?!soon)|\.filters button|\.gp-btn|\.gp-back|\.gp-modal-close|\.gp-play)/;
const original = new Set(
  [...norm(read('preserved-hub.css') + read('preserved-game.css')).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => m[1].trim()),
);
const offenders = [];
for (const m of norm(read('../../src/styles/tavern.css')).matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
  const sel = m[1].trim();
  if (!/^[\d%., ]+$|^from$|^to$/.test(sel) && original.has(sel) && MOTION.test(m[2])) offenders.push(sel);
}
check(offenders.length === 0, `tavern.css leaves motion of preserved selectors alone${offenders.length ? ': ' + offenders.join(' | ') : ''}`);
process.exit(failed ? 1 : 0);
