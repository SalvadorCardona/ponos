#!/usr/bin/env node
/*
 * Writes every file of the mascot from its one source,
 * docs/mascot/ticket-runner-robot.js:
 *
 *   docs/mascot/robot.svg     the whole robot, layers and variables kept
 *   docs/mascot/favicon.svg   the bust, following the browser's colour scheme
 *   docs/mascot/og.png        the Open Graph card, 1200 × 630
 *   docs/mascot/states.png    every state, light and dark, and the sizes
 *
 *   node scripts/mascot.mjs
 *
 * Node, not Python like release.py: the drawing is a JavaScript module, and
 * importing it is the only way to be sure the files say what the page shows.
 * The PNGs are screenshots from headless Chrome ($CHROME, or google-chrome on
 * the PATH) — the only rasteriser that reads the SVG exactly as a browser
 * does. The robot on the page stays vector; the PNGs are only for the places
 * that will not take an SVG (social cards, a pull request).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'mascot');
const source = readFileSync(join(out, 'ticket-runner-robot.js'), 'utf8');
const { STATES, standalone } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

writeFileSync(join(out, 'robot.svg'), standalone({ title: 'ticket-runner — the robot' }));
writeFileSync(join(out, 'favicon.svg'), standalone({ viewBox: '18 -6 92 92' }));

const fonts = '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">';

const og = `<!doctype html><meta charset="utf-8">${fonts}
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { background: radial-gradient(700px 420px at 30% 20%, rgba(59,130,246,.22), transparent 70%), #0b0d12;
         color: #e9ecf3; font-family: Inter, sans-serif; display: flex; align-items: center; gap: 36px; padding: 0 80px; box-sizing: border-box; }
  .bot { width: 400px; flex: none; }
  h1 { font: 400 104px/1 'Instrument Serif', serif; margin: 0; letter-spacing: -.02em; }
  h1 span { color: #3b82f6; }
  p { font-size: 29px; line-height: 1.4; color: #c6cddb; margin: 24px 0 0; }
  code { font: 20px 'JetBrains Mono', monospace; color: #7cb0ff; display: block; margin-top: 30px; }
</style>
<div class="bot">${standalone({ state: 'success', theme: 'dark' })}</div>
<div><h1>ticket&#8209;runner<span>.</span></h1>
<p>Move a Notion ticket to Ready. A few minutes later, a pull request.</p>
<code>cardona.digital/ticket-runner</code></div>`;

const cells = (theme) => Object.entries(STATES).map(([name, s]) => `
  <figure><div class="bot">${standalone({ state: name, theme })}</div><figcaption><b>${name}</b>${s.means}</figcaption></figure>`).join('');
const sizes = [24, 32, 48, 96, 160].map((px) => `<div style="width:${px}px">${standalone({ theme: 'dark' })}</div>`).join('');

const sheet = `<!doctype html><meta charset="utf-8">${fonts}
<style>
  html, body { margin: 0; width: 1200px; }
  body { font-family: Inter, sans-serif; }
  .row { display: grid; grid-template-columns: repeat(${Object.keys(STATES).length}, 1fr); gap: 12px; padding: 28px 28px 20px; }
  .light { background: #f4f2ee; color: #0f172a; }
  .dark { background: #0b0d12; color: #e9ecf3; }
  figure { margin: 0; text-align: center; }
  .bot { width: min(150px, 100%); margin: 0 auto; }
  figcaption { font-size: 13px; opacity: .75; margin-top: 8px; }
  figcaption b { display: block; font: 600 15px 'JetBrains Mono', monospace; opacity: 1; margin-bottom: 2px; }
  .sizes { display: flex; align-items: flex-end; gap: 36px; padding: 16px 28px 32px; }
  .sizes span { font: 13px 'JetBrains Mono', monospace; opacity: .6; margin-left: auto; align-self: center; }
</style>
<div class="row light">${cells('light')}</div>
<div class="dark"><div class="row">${cells('dark')}</div>
<div class="sizes">${sizes}<span>24 · 32 · 48 · 96 · 160 px — one SVG</span></div></div>`;

const chrome = process.env.CHROME || 'google-chrome';
const scratch = mkdtempSync(join(tmpdir(), 'mascot-'));
function shoot(html, file, width, height) {
  const page = join(scratch, `${file}.html`);
  writeFileSync(page, html);
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${width},${height}`, '--virtual-time-budget=4000',
    `--screenshot=${join(out, file)}`, pathToFileURL(page).href,
  ], { stdio: 'ignore' });
}
try {
  shoot(og, 'og.png', 1200, 630);
  shoot(sheet, 'states.png', 1200, 696);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
console.log('docs/mascot: robot.svg, favicon.svg, og.png, states.png');
