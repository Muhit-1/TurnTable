/**
 * Shared SVG definitions for the pen drawings: the slight wobble of a hand-drawn line and the hatching that
 * fills a shape. Render once per page; the game drawings on the homepage refer to these ids.
 */
export function PenDefs() {
  return (
    <svg className="pen-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter id="wobble" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="2.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <pattern
          id="hatch-blue"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-48)"
        >
          <rect width="4" height="4" fill="#e3eafc" />
          <line x1="0" y1="2" x2="4" y2="2" stroke="#1f47c4" strokeWidth="1.5" />
        </pattern>
        <pattern
          id="hatch-red"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(42)"
        >
          <rect width="4" height="4" fill="#fbe1df" />
          <line x1="0" y1="2" x2="4" y2="2" stroke="#d5332a" strokeWidth="1.5" />
        </pattern>
        <pattern
          id="hatch-grey"
          width="4.5"
          height="4.5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-52)"
        >
          <line x1="0" y1="2" x2="4.5" y2="2" stroke="#2a2d36" strokeWidth="0.9" opacity="0.55" />
        </pattern>
      </defs>
    </svg>
  );
}
