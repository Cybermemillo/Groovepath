import { ENHARMONICS } from './constants.js';
import { $ } from '../utils/dom.js';

const tooltip = $('#noteTooltip');

export function showTooltip(e, note, octave) {
  const enharmonic = ENHARMONICS[note] ? ` / ${ENHARMONICS[note]}` : '';
  tooltip.textContent = `${note}${enharmonic}  (oct. ${octave})`;
  tooltip.style.display = 'block';
  moveTooltip(e);
}

function moveTooltip(e) {
  tooltip.style.left = (e.clientX + 14) + 'px';
  tooltip.style.top  = (e.clientY - 28) + 'px';
}

export function hideTooltip() {
  tooltip.style.display = 'none';
}

export function initTooltip() {
  document.addEventListener('mousemove', (e) => {
    if (tooltip.style.display === 'block') moveTooltip(e);
  });
}
