/* Table colours for the mock: a plain-JS port of tableThemeStyle() from the game-board site (src/shared/theme/tableThemes.ts).
   Pick a wood and the page background, every panel colour, the shadows and the text colour sitting on the table all follow it. */
(function () {
  var THEMES = [
    { id: 'ironwood', name: 'Ironwood Tavern', hex: '#3C2A1C' },
    { id: 'ivory', name: 'Ivory Oak', hex: '#E6D1AC' },
    { id: 'natural', name: 'Natural Oak', hex: '#E8CCB0' },
    { id: 'blush', name: 'Blush Oak', hex: '#DBB093' },
    { id: 'caramel', name: 'Caramel Oak', hex: '#C88354' },
    { id: 'chestnut', name: 'Chestnut Oak', hex: '#A56142' },
    { id: 'walnut', name: 'Walnut', hex: '#875C39' },
    { id: 'espresso', name: 'Espresso Wood', hex: '#462F20' }
  ];
  var IRONWOOD_BG =
    'radial-gradient(1100px 700px at 12% -10%, rgba(201,144,63,.17), transparent 55%), radial-gradient(900px 600px at 100% 10%, rgba(181,80,46,.13), transparent 50%), #2b2016';

  function hexToHsl(hex) {
    var n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }
  function luminance(hex) {
    var n = parseInt(hex.slice(1), 16);
    var ch = function (v) { var c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  }
  function contrast(a, b) { var l = [luminance(a), luminance(b)].sort(function (x, y) { return y - x; }); return (l[0] + 0.05) / (l[1] + 0.05); }
  function lighten(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var mix = function (v) { return Math.round(v + (255 - v) * amt); };
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return mix(v).toString(16).padStart(2, '0'); }).join('');
  }
  function inkFor(hex) {
    var dark = { ink: '#2b1c10', dim: '#3f2c1b' }, light = { ink: '#f6ecd6', dim: '#eadfc4' };
    var worst = function (ink) { return Math.min(contrast(ink, hex), contrast(ink, lighten(hex, 0.12))); };
    return worst(dark.dim) >= worst(light.dim) ? dark : light;
  }
  function hslChannels(h, s, l) {
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { var k = (n + h / 30) % 12; return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); };
    return f(0) + ' ' + f(8) + ' ' + f(4);
  }
  var hsl = function (h, s, l) { return 'hsl(' + h.toFixed(0) + ' ' + (s * 100).toFixed(0) + '% ' + (l * 100).toFixed(0) + '%)'; };

  var VARS = ['--walnut-rgb', '--walnut-2-rgb', '--charred-oak-rgb', '--shadow-card', '--shadow-deep', '--table-shadow', '--on-table', '--on-table-dim'];

  function apply(id, el) {
    el = el || document.body;
    var theme = THEMES.filter(function (t) { return t.id === id; })[0] || THEMES[0];
    VARS.forEach(function (v) { el.style.removeProperty(v); });
    if (theme.id === 'ironwood') {
      el.style.background = '';
      el.style.removeProperty('background');
      el.style.setProperty('--on-table', '#ede1c8');
      el.style.setProperty('--on-table-dim', '#d8cbae');
      el.dataset.table = theme.id;
      return theme;
    }
    var c = hexToHsl(theme.hex), dark = c.l < 0.3, panel = dark ? 0.27 : 0.17, s = Math.min(c.s, 0.5), text = inkFor(theme.hex);
    var shadow = function (a) { return 'hsl(' + c.h.toFixed(0) + ' ' + (s * 100).toFixed(0) + '% 6% / ' + a + ')'; };
    el.style.background = 'linear-gradient(135deg, ' + hsl(c.h, c.s, Math.min(c.l + 0.08, 0.93)) + ', ' + theme.hex + ' 50%, ' + hsl(c.h, c.s, Math.max(c.l - 0.11, 0.05)) + ')';
    el.style.backgroundAttachment = 'fixed';
    el.style.setProperty('--walnut-rgb', hslChannels(c.h, s, panel));
    el.style.setProperty('--walnut-2-rgb', hslChannels(c.h, s, panel + 0.06));
    el.style.setProperty('--charred-oak-rgb', hslChannels(c.h, s, Math.max(panel - 0.07, 0.06)));
    el.style.setProperty('--shadow-card', '0 8px 20px ' + shadow(0.35));
    el.style.setProperty('--shadow-deep', '0 24px 60px ' + shadow(0.5));
    el.style.setProperty('--table-shadow', shadow(0.4));
    el.style.setProperty('--on-table', text.ink);
    el.style.setProperty('--on-table-dim', text.dim);
    el.dataset.table = theme.id;
    return theme;
  }

  /** Fills `container` with one round swatch per wood; calls onPick(id) after applying. */
  function swatches(container, current, onPick) {
    container.innerHTML = '';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch'; b.title = t.name; b.setAttribute('aria-label', t.name);
      b.setAttribute('aria-pressed', String(t.id === current));
      b.style.background = t.hex;
      b.addEventListener('click', function () {
        apply(t.id);
        try { localStorage.setItem('tt-table', t.id); } catch (e) { /* private mode */ }
        container.querySelectorAll('.swatch').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (onPick) onPick(t);
      });
      container.appendChild(b);
    });
  }

  function saved() { try { return localStorage.getItem('tt-table') || 'ironwood'; } catch (e) { return 'ironwood'; } }

  window.TavernTable = { THEMES: THEMES, apply: apply, swatches: swatches, saved: saved, IRONWOOD_BG: IRONWOOD_BG };
})();
