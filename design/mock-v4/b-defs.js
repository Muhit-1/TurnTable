// Shared SVG definitions for Direction B: the pencil wobble and the pen-hatch fills. Injected once per page.
document.body.insertAdjacentHTML(
  'afterbegin',
  `<svg class="defs" aria-hidden="true" focusable="false">
    <defs>
      <filter id="wobble" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <pattern id="hatch-blue" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-48)">
        <rect width="4" height="4" fill="#e3eafc"/><line x1="0" y1="2" x2="4" y2="2" stroke="#1f47c4" stroke-width="1.5"/>
      </pattern>
      <pattern id="hatch-red" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(42)">
        <rect width="4" height="4" fill="#fbe1df"/><line x1="0" y1="2" x2="4" y2="2" stroke="#d5332a" stroke-width="1.5"/>
      </pattern>
      <pattern id="hatch-grey" width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-52)">
        <line x1="0" y1="2" x2="4.5" y2="2" stroke="#2a2d36" stroke-width="0.9" opacity="0.55"/>
      </pattern>
    </defs>
  </svg>`,
);

// Tally marks: four strokes and a slash for every five.
window.tally = (n) => {
  let d = '';
  let x = 4;
  for (let i = 0; i < n; i++) {
    if (i % 5 === 4) {
      d += `M${x - 38} 25 L${x - 3} 6 `;
      x += 12;
    } else {
      d += `M${x} ${4 + (i % 2)} L${x + (i % 3) - 1} 27 `;
      x += 9;
    }
  }
  const w = Math.max(x + 2, 12);
  return `<svg class="tally" viewBox="0 0 ${w} 31" width="${w}" height="31" role="img" aria-label="${n} ${n === 1 ? 'game' : 'games'} won"><path d="${d}"/></svg>`;
};
