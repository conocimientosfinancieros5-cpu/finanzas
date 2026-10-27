import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
const blocks = [...css.matchAll(/:root(?:\[data-theme="dark"\])?\s*\{([^}]+)\}/g)];
function luminance(hex) {
  const rgb = hex.match(/[a-f0-9]{2}/gi).map(c => parseInt(c, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
for (const [i, block] of blocks.entries()) {
  const colors = Object.fromEntries([...block[1].matchAll(/--([\w-]+):\s*(#[a-f0-9]{6})/g)].map(m => [m[1], m[2]]));
  console.log(i ? 'Oscuro' : 'Claro');
  for (const [fg, bg] of [['text','bg'], ['text','card'], ['muted','bg'], ['muted','card'], ['on-accent','accent'], ['text','good'], ['text','bad']]) {
    const a = luminance(colors[fg]), b = luminance(colors[bg]);
    const ratio = (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
    assert(ratio >= 4.5, fg + '/' + bg + ': ' + ratio);
    console.log('  ' + fg + '/' + bg + ': ' + ratio.toFixed(2) + ':1');
  }
}
assert.equal(blocks.length, 2);
