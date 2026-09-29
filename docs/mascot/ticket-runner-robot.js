/*
 * <ticket-runner-robot> — the ticket-runner mascot, as a Web Component.
 *
 * The landing page is one static file with no build step, so the mascot is
 * vanilla JavaScript rather than React: it has to load the way the page does,
 * from a <script> tag. It is also the single source of the drawing — the
 * favicon, the standalone SVG, the Open Graph image and the sheet of states
 * are all written from this module by `node scripts/mascot.mjs`, never drawn
 * twice. Nothing here touches the DOM at import time, so Node can import it.
 *
 * Three tables make the robot, and extending it means adding a row to one of
 * them, never copying the drawing:
 *
 *   PALETTES     the colours, as CSS variables (--robot-body, --robot-eye…),
 *                for a light and a dark background;
 *   STATES       each reaction: which layer gets which style and which
 *                keyframes (declared in KEYFRAMES);
 *   ACCESSORIES  bits of SVG dropped into the `accessories` layer.
 *
 *   <script src="mascot/ticket-runner-robot.js" type="module"></script>
 *   <ticket-runner-robot state="thinking" theme="dark" size="96"></ticket-runner-robot>
 *
 * Attributes: `state` (a key of STATES, idle by default), `theme` (light,
 * dark, or auto — the default, which follows prefers-color-scheme),
 * `size` (pixels; without it the robot takes the width of its container),
 * `accessories` (space-separated keys of ACCESSORIES), `still` (hold the pose,
 * never move nor blink — what a list of a hundred robots asks for, where only
 * the ones that are doing something should look like it).
 *
 * The web console bundles this very file rather than a copy of it: a hundred
 * robots on one board is a hundred shadow roots, so they share one stylesheet
 * and clone one parsed drawing instead of each parsing their own.
 */

export const PALETTES = {
  light: {
    '--robot-body': '#3b82f6',
    '--robot-body-shade': '#1d4ed8',
    '--robot-screen': '#0f172a',
    '--robot-eye': '#d5f95a',
    '--robot-accent': '#d5f95a',
    '--robot-alert': '#ef4444',
    '--robot-ink': '#0f172a',
    '--robot-shadow': 'rgba(15, 23, 42, .16)',
  },
  dark: {
    '--robot-body': '#3b82f6',
    '--robot-body-shade': '#7cb0ff',
    '--robot-screen': '#0b0d12',
    '--robot-eye': '#d5f95a',
    '--robot-accent': '#d5f95a',
    '--robot-alert': '#f87171',
    '--robot-ink': '#94a3b8',
    '--robot-shadow': 'rgba(124, 176, 255, .16)',
  },
};

/*
 * The drawing, on a 128 × 128 grid. Every group carries a `data-layer`: the
 * main layers (base, body, head, eyes, eyelids, antenna, arm-left, arm-right,
 * accessories, fx) and the parts a state may need to reach inside them.
 * `rig` is everything that moves with the robot — the base and its shadow
 * stay on the floor when it jumps.
 */
const DRAWING = `
  <g data-layer="base">
    <ellipse class="shadow" cx="64" cy="117" rx="30" ry="4.5"/>
    <rect class="ink" x="47" y="104" width="34" height="10" rx="5"/>
  </g>
  <g data-layer="rig">
    <g data-layer="body">
      <rect class="ink" x="57" y="66" width="14" height="9" rx="3"/>
      <rect class="shell" x="38" y="72" width="52" height="36" rx="13"/>
      <rect class="plate" x="50" y="80" width="28" height="18" rx="6"/>
      <path class="chevron" d="M60 84.5 L66 89 L60 93.5"/>
    </g>
    <g data-layer="head">
      <g data-layer="antenna">
        <path class="stem" d="M64 27 L64 13"/>
        <circle data-layer="bulb" class="bulb" cx="64" cy="10" r="5.5"/>
      </g>
      <rect class="bolt" x="18" y="41" width="8" height="14" rx="4"/>
      <rect class="bolt" x="102" y="41" width="8" height="14" rx="4"/>
      <rect class="shell" x="24" y="26" width="80" height="44" rx="16"/>
      <rect class="screen" x="32" y="33" width="64" height="30" rx="10"/>
      <g data-layer="eyes">
        <g data-layer="eye-left">
          <g data-layer="eye-open-left" class="eye-open">
            <rect class="eye" x="44" y="40" width="12" height="16" rx="6"/>
            <circle class="glint" cx="47.5" cy="44" r="1.8"/>
          </g>
          <path data-layer="eye-joy-left" class="eye-line eye-joy" d="M44 51 Q50 41 56 51"/>
          <path data-layer="eye-closed-left" class="eye-line eye-closed" d="M44 48 Q50 53 56 48"/>
        </g>
        <g data-layer="eye-right">
          <g data-layer="eye-open-right" class="eye-open">
            <rect class="eye" x="72" y="40" width="12" height="16" rx="6"/>
            <circle class="glint" cx="75.5" cy="44" r="1.8"/>
          </g>
          <path data-layer="eye-joy-right" class="eye-line eye-joy" d="M72 51 Q78 41 84 51"/>
          <path data-layer="eye-closed-right" class="eye-line eye-closed" d="M72 48 Q78 53 84 48"/>
        </g>
      </g>
      <g data-layer="eyelids">
        <rect data-layer="lid-left" class="lid" x="41" y="35" width="18" height="22"/>
        <rect data-layer="lid-right" class="lid" x="69" y="35" width="18" height="22"/>
      </g>
    </g>
    <g data-layer="arm-left">
      <path class="limb" d="M40 83 L31 92"/>
      <g data-layer="forearm-left">
        <path class="limb" d="M31 92 L29 101"/>
        <circle class="hand" cx="29" cy="102" r="4.5"/>
      </g>
    </g>
    <g data-layer="arm-right">
      <path class="limb" d="M88 83 L97 92"/>
      <g data-layer="forearm-right">
        <path class="limb" d="M97 92 L99 101"/>
        <circle class="hand" cx="99" cy="102" r="4.5"/>
      </g>
    </g>
    <g data-layer="accessories"></g>
  </g>
  <g data-layer="fx">
    <g data-layer="fx-zzz" class="fx-zzz">
      <path data-layer="z1" class="z" d="M90 20 h6 l-6 7 h6"/>
      <path data-layer="z2" class="z" d="M100 10 h5 l-5 6 h5"/>
      <path data-layer="z3" class="z" d="M109 2 h4 l-4 5 h4"/>
    </g>
    <g data-layer="fx-dots" class="fx-dots">
      <circle data-layer="dot1" class="dot" cx="96" cy="18" r="2.8"/>
      <circle data-layer="dot2" class="dot" cx="104.5" cy="18" r="2.8"/>
      <circle data-layer="dot3" class="dot" cx="113" cy="18" r="2.8"/>
    </g>
    <g data-layer="fx-sparks" class="fx-sparks">
      <path class="spark" d="M52 6 l-4 3 l3 1 l-4 3"/>
      <path class="spark" d="M76 6 l4 3 l-3 1 l4 3"/>
    </g>
    <g data-layer="fx-stars" class="fx-stars">
      <path class="star" d="M16 22 l1.8 4 l4 1.8 l-4 1.8 l-1.8 4 l-1.8 -4 l-4 -1.8 l4 -1.8 z"/>
      <path class="star" d="M112 26 l1.4 3 l3 1.4 l-3 1.4 l-1.4 3 l-1.4 -3 l-3 -1.4 l3 -1.4 z"/>
    </g>
  </g>`;

/*
 * Where each layer turns. The origins are in the drawing's own units
 * (transform-box: view-box), so a state can rotate an arm without knowing
 * how big the robot is drawn.
 */
const PIVOTS = {
  rig: '64px 108px',
  head: '64px 70px',
  antenna: '64px 27px',
  'arm-left': '40px 83px',
  'arm-right': '88px 83px',
  'forearm-left': '31px 92px',
  'forearm-right': '97px 92px',
  'lid-left': '50px 35px',
  'lid-right': '78px 35px',
  bulb: '64px 10px',
  z1: '93px 23px', z2: '102px 13px', z3: '111px 4px',
};

const BASE_STYLE = `
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  [data-layer] { transform-box: view-box; }
  ${Object.entries(PIVOTS).map(([layer, at]) => `[data-layer="${layer}"] { transform-origin: ${at}; }`).join('\n  ')}
  .shadow { fill: var(--robot-shadow); }
  .ink { fill: var(--robot-ink); }
  .shell { fill: var(--robot-body); }
  .plate { fill: var(--robot-screen); }
  .chevron { fill: none; stroke: var(--robot-accent); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
  .limb { fill: none; stroke: var(--robot-body-shade); stroke-width: 6; stroke-linecap: round; }
  .hand, .bolt { fill: var(--robot-body-shade); }
  .stem { fill: none; stroke: var(--robot-ink); stroke-width: 3.5; stroke-linecap: round; }
  .bulb { fill: var(--robot-accent); }
  .screen, .lid { fill: var(--robot-screen); }
  .eye { fill: var(--robot-eye); }
  .glint { fill: var(--robot-screen); opacity: .55; }
  .eye-line { fill: none; stroke: var(--robot-eye); stroke-width: 4.5; stroke-linecap: round; }
  .eye-joy, .eye-closed { opacity: 0; }
  .lid { transform: scaleY(0); transition: transform .07s ease-in; }
  .z { fill: none; stroke: var(--robot-body-shade); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .spark { fill: none; stroke: var(--robot-alert); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .star { fill: var(--robot-accent); }
  .dot { fill: var(--robot-body-shade); }
  .fx-zzz, .fx-sparks, .fx-stars, .fx-dots { opacity: 0; }
  svg.blinking[data-state] [data-layer^="lid-"] { transform: scaleY(1); }
`;

/*
 * The keyframes a state may name. They are prefixed `robot-` when written out,
 * so two robots on the same page — or the page itself — never collide.
 */
export const KEYFRAMES = {
  breathe: '0%, 100% { transform: translateY(0) } 50% { transform: translateY(1.6px) scaleY(.985) }',
  sway: '0%, 100% { transform: rotate(-4deg) } 50% { transform: rotate(5deg) }',
  scan: '0%, 100% { transform: translate(-4px, -2px) } 45%, 55% { transform: translate(4px, -2px) }',
  beacon: '0%, 100% { opacity: 1 } 50% { opacity: .2 }',
  'type-left': '0%, 100% { transform: rotate(40deg) } 50% { transform: rotate(62deg) }',
  'type-right': '0%, 100% { transform: rotate(-62deg) } 50% { transform: rotate(-40deg) }',
  nod: '0%, 100% { transform: rotate(0) } 50% { transform: rotate(1.5deg) translateY(.8px) }',
  hop: '0%, 55%, 100% { transform: translateY(0) scale(1, 1) } 8% { transform: translateY(0) scale(1.06, .92) } 24% { transform: translateY(-14px) scale(.97, 1.04) } 42% { transform: translateY(0) scale(1.05, .94) }',
  'wave-left': '0%, 100% { transform: rotate(15deg) } 50% { transform: rotate(55deg) }',
  'wave-right': '0%, 100% { transform: rotate(-15deg) } 50% { transform: rotate(-55deg) }',
  twinkle: '0%, 100% { opacity: 0; transform: scale(.4) } 30%, 60% { opacity: 1; transform: scale(1) }',
  crackle: '0%, 18%, 36%, 100% { opacity: 1 } 9%, 27%, 60% { opacity: 0 }',
  jitter: '0%, 100% { transform: rotate(0) } 20% { transform: rotate(-7deg) } 40% { transform: rotate(6deg) } 60% { transform: rotate(-3deg) } 80% { transform: rotate(4deg) }',
  flicker: '0%, 30%, 62%, 100% { fill: var(--robot-alert) } 15%, 50% { fill: var(--robot-screen) }',
  snooze: '0%, 100% { transform: translateY(0) rotate(-6deg) } 50% { transform: translateY(1.4px) rotate(-6deg) scaleY(.98) }',
  drift: '0% { opacity: 0; transform: translate(0, 4px) scale(.6) } 25%, 70% { opacity: 1 } 100% { opacity: 0; transform: translate(4px, -6px) scale(1.1) }',
  tick: '0%, 60%, 100% { opacity: .25 } 30% { opacity: 1 }',
};

/*
 * The reactions. Each is a label, what it means on the board, and a map of
 * layer → CSS declarations. The plain declarations are the pose (what stays
 * when prefers-reduced-motion switches every animation off); `animation`
 * names keyframes from KEYFRAMES without their prefix. `blink` lets the
 * component close the eyelids at random moments.
 */
export const STATES = {
  idle: {
    label: 'Idle',
    means: 'waiting for a ticket',
    blink: true,
    layers: {
      rig: { animation: 'breathe 3.6s ease-in-out infinite' },
      antenna: { animation: 'sway 3.6s ease-in-out infinite' },
    },
  },
  thinking: {
    label: 'Thinking',
    means: 'a ticket is in progress',
    layers: {
      eyes: { transform: 'translate(3px, -2px)', animation: 'scan 2.6s ease-in-out infinite' },
      bulb: { animation: 'beacon .8s ease-in-out infinite' },
      head: { transform: 'rotate(3deg)' },
    },
  },
  working: {
    label: 'Working',
    means: 'Claude Code is at it',
    blink: true,
    layers: {
      'lid-left': { transform: 'scaleY(.3)' },
      'lid-right': { transform: 'scaleY(.3)' },
      'arm-left': { transform: 'rotate(40deg)', animation: 'type-left .32s ease-in-out infinite' },
      'arm-right': { transform: 'rotate(-40deg)', animation: 'type-right .32s ease-in-out infinite' },
      'forearm-left': { transform: 'rotate(-50deg)' },
      'forearm-right': { transform: 'rotate(50deg)' },
      head: { animation: 'nod .64s ease-in-out infinite' },
    },
  },
  success: {
    label: 'Success',
    means: 'the pull request is open',
    layers: {
      rig: { animation: 'hop 1.5s ease-out infinite' },
      'eye-open-left': { opacity: '0' },
      'eye-open-right': { opacity: '0' },
      'eye-joy-left': { opacity: '1' },
      'eye-joy-right': { opacity: '1' },
      'arm-left': { transform: 'rotate(95deg)' },
      'arm-right': { transform: 'rotate(-95deg)' },
      'forearm-left': { transform: 'rotate(40deg)', animation: 'wave-left .5s ease-in-out infinite' },
      'forearm-right': { transform: 'rotate(-40deg)', animation: 'wave-right .5s ease-in-out infinite' },
      'fx-stars': { opacity: '1' },
      '.star': { animation: 'twinkle 1.5s ease-in-out infinite', 'transform-box': 'fill-box', 'transform-origin': 'center' },
    },
  },
  error: {
    label: 'Error',
    means: 'the ticket is blocked',
    layers: {
      rig: { transform: 'translateY(2px)' },
      head: { transform: 'rotate(-4deg)' },
      'lid-left': { transform: 'rotate(-16deg) scaleY(.48)' },
      'lid-right': { transform: 'rotate(16deg) scaleY(.48)' },
      eyes: { transform: 'translateY(2px)' },
      'arm-left': { transform: 'rotate(-12deg)' },
      'arm-right': { transform: 'rotate(12deg)' },
      antenna: { animation: 'jitter .35s linear infinite' },
      bulb: { fill: 'var(--robot-alert)', animation: 'flicker .9s steps(1) infinite' },
      'fx-sparks': { opacity: '1', animation: 'crackle .9s steps(1) infinite' },
    },
  },
  sleep: {
    label: 'Sleep',
    means: 'the queue is empty',
    layers: {
      rig: { transform: 'translateY(1px)' },
      head: { transform: 'rotate(-6deg)', animation: 'snooze 4s ease-in-out infinite' },
      'eye-open-left': { opacity: '0' },
      'eye-open-right': { opacity: '0' },
      'eye-closed-left': { opacity: '1' },
      'eye-closed-right': { opacity: '1' },
      bulb: { opacity: '.3' },
      'fx-zzz': { opacity: '1' },
      z1: { animation: 'drift 3s ease-in-out infinite' },
      z2: { animation: 'drift 3s ease-in-out 1s infinite' },
      z3: { animation: 'drift 3s ease-in-out 2s infinite' },
    },
  },
  waiting: {
    label: 'Waiting',
    means: 'waiting on a person',
    blink: true,
    layers: {
      rig: { animation: 'breathe 4.8s ease-in-out infinite' },
      head: { transform: 'rotate(-5deg)' },
      eyes: { transform: 'translate(4px, -3px)' },
      'fx-dots': { opacity: '1' },
      dot1: { animation: 'tick 1.8s ease-in-out infinite' },
      dot2: { animation: 'tick 1.8s ease-in-out .3s infinite' },
      dot3: { animation: 'tick 1.8s ease-in-out .6s infinite' },
    },
  },
};

/* Accessories: SVG on the same 128 grid, drawn above the body and the head. */
export const ACCESSORIES = {
  bowtie: `<path fill="var(--robot-accent)" d="M64 72 L55 67.5 Q53 72 55 76.5 Z M64 72 L73 67.5 Q75 72 73 76.5 Z"/>
           <circle fill="var(--robot-accent)" cx="64" cy="72" r="2.6"/>`,
  headset: `<path fill="none" stroke="var(--robot-ink)" stroke-width="3" stroke-linecap="round" d="M22 43 Q22 20 44 20"/>
            <path fill="none" stroke="var(--robot-ink)" stroke-width="2.4" stroke-linecap="round" d="M22 55 Q24 66 38 66"/>
            <circle fill="var(--robot-accent)" cx="39" cy="66" r="2.6"/>`,
};

const DEFAULT_STATE = 'idle';

function declarations(styles, animate) {
  return Object.entries(styles)
    .filter(([prop]) => animate || prop !== 'animation')
    .map(([prop, value]) => `${prop}: ${prop === 'animation' ? value.replace(/^(\S+)/, 'robot-$1') : value};`)
    .join(' ');
}

function stateStyle(animate) {
  const rules = [];
  for (const [name, state] of Object.entries(STATES)) {
    for (const [layer, styles] of Object.entries(state.layers)) {
      const target = layer.startsWith('.') ? layer : `[data-layer="${layer}"]`;
      const body = declarations(styles, animate);
      if (body) rules.push(`svg[data-state="${name}"] ${target} { ${body} }`);
    }
  }
  if (animate) {
    for (const [name, frames] of Object.entries(KEYFRAMES)) rules.push(`@keyframes robot-${name} { ${frames} }`);
    rules.push('@media (prefers-reduced-motion: reduce) { svg, svg * { animation: none !important; transition: none !important; } }');
  }
  return rules.join('\n');
}

function vars(palette) {
  return Object.entries(PALETTES[palette]).map(([k, v]) => `${k}: ${v};`).join(' ');
}

/*
 * The palette sits on the outermost element — :host for the component, the
 * <svg> for a standalone file — so a page can still set --robot-body on the
 * element itself and win.
 */
function paletteStyle(root, themed) {
  return `
  ${root} { ${vars('light')} }
  ${themed('dark')} { ${vars('dark')} }
  @media (prefers-color-scheme: dark) { ${themed('auto')} { ${vars('dark')} } }`;
}

function accessoriesMarkup(names) {
  return (names || []).map((n) => ACCESSORIES[n] || '').join('');
}

/**
 * A self-contained SVG file: the same layers and the same variables, with a
 * pose instead of an animation. `viewBox` crops it (the favicon keeps the
 * bust); `theme` pins a palette, or leaves `auto` to follow the colour scheme.
 */
export function standalone({ state = DEFAULT_STATE, theme = 'auto', viewBox = '0 0 128 128', accessories = [], title = 'ticket-runner' } = {}) {
  const themed = (t) => (t === 'auto' ? 'svg:not([data-theme="light"])' : `svg[data-theme="${t}"]`);
  const style = paletteStyle('svg', themed) + BASE_STYLE + stateStyle(false);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" data-state="${state}" data-theme="${theme}" role="img">
<title>${title}</title>
<style>${style.replace(/\n\s*/g, '\n')}</style>${DRAWING.replace('<g data-layer="accessories"></g>', `<g data-layer="accessories">${accessoriesMarkup(accessories)}</g>`)}
</svg>
`;
}

const SHADOW_STYLE = `
  :host { display: inline-block; width: 100%; aspect-ratio: 1; vertical-align: middle; }
  :host([hidden]) { display: none; }
  :host([still]) svg, :host([still]) svg * { animation: none !important; transition: none !important; }
  ${paletteStyle(':host', (t) => (t === 'auto' ? ':host(:not([theme="light"]))' : `:host([theme="${t}"])`))}
  ${BASE_STYLE}
  ${stateStyle(true)}
`;

if (typeof customElements !== 'undefined' && !customElements.get('ticket-runner-robot')) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Parsed once for every robot on the page: the stylesheet adopted where the
     browser can share one, and the drawing cloned rather than parsed again. */
  let shared = null;
  if ('adoptedStyleSheets' in Document.prototype) {
    shared = new CSSStyleSheet();
    shared.replaceSync(SHADOW_STYLE);
  }
  const template = document.createElement('template');
  template.innerHTML = `${shared ? '' : `<style>${SHADOW_STYLE}</style>`}<svg viewBox="0 0 128 128" role="img" aria-hidden="true">${DRAWING}</svg>`;

  class TicketRunnerRobot extends HTMLElement {
    static observedAttributes = ['state', 'size', 'accessories', 'still'];

    labelled = false;

    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      if (shared) root.adoptedStyleSheets = [shared];
      root.appendChild(template.content.cloneNode(true));
      this.svg = root.querySelector('svg');
      this.blinkTimer = 0;
    }

    get state() { return this.svg.dataset.state; }
    set state(value) { this.setAttribute('state', value); }

    connectedCallback() {
      this.render();
      this.scheduleBlink();
    }

    disconnectedCallback() {
      clearTimeout(this.blinkTimer);
    }

    attributeChangedCallback(name) {
      this.render();
      if (name === 'still' && this.isConnected) this.scheduleBlink();
    }

    render() {
      const asked = this.getAttribute('state');
      this.svg.dataset.state = asked in STATES ? asked : DEFAULT_STATE;
      const size = parseFloat(this.getAttribute('size'));
      this.style.width = size > 0 ? `${size}px` : '';
      const accessories = accessoriesMarkup((this.getAttribute('accessories') || '').split(/\s+/).filter(Boolean));
      const layer = this.svg.querySelector('[data-layer="accessories"]');
      if (layer.innerHTML !== accessories) layer.innerHTML = accessories;
      if (!this.hasAttribute('role')) this.setAttribute('role', 'img');
      if (!this.hasAttribute('aria-label') || this.labelled) {
        this.labelled = true;
        this.setAttribute('aria-label', `ticket-runner robot — ${STATES[this.state].label.toLowerCase()}`);
      }
    }

    /* A blink every few seconds, never on the beat: a fixed rhythm reads as a machine.
       A robot holding still has no timer at all — a board of them would be a
       hundred timers for eyes nobody sees move. */
    scheduleBlink() {
      clearTimeout(this.blinkTimer);
      if (this.hasAttribute('still')) return;
      this.blinkTimer = setTimeout(() => {
        if (this.isConnected && !reduced.matches && STATES[this.state].blink) {
          this.svg.classList.add('blinking');
          setTimeout(() => this.svg.classList.remove('blinking'), 140);
        }
        if (this.isConnected) this.scheduleBlink();
      }, 1800 + Math.random() * 4200);
    }
  }

  customElements.define('ticket-runner-robot', TicketRunnerRobot);
}
