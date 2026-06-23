import { $ } from '../utils/dom.js';
import { BACKING_STYLES } from './constants.js';

const playBtn  = $('#backingPlay');
const bpmSlider = $('#bpmSlider');
const bpmValue  = $('#bpmValue');
const styleBtns = $('#backingStyles').querySelectorAll('.style-btn');
const trackFile = $('#trackFile');

export function render(state) {
  bpmSlider.value = state.bpm;
  bpmValue.textContent = state.bpm;
  styleBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.style === state.style);
  });
}

export function setPlayIcon(playing) {
  playBtn.textContent = playing ? '\u25A0' : '\u25B6';
  playBtn.classList.toggle('active', playing);
}

export function onPlayClick(fn) {
  playBtn.addEventListener('click', fn);
}

export function onBpmChange(fn) {
  bpmSlider.addEventListener('input', (e) => {
    const bpm = parseInt(e.target.value);
    bpmValue.textContent = bpm;
    if (typeof fn === 'function') fn(bpm);
  });
}

export function bindStyleButtons(onClick) {
  styleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      styleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (typeof onClick === 'function') onClick(btn.dataset.style);
    });
  });
}

export function onFileChange(fn) {
  trackFile.addEventListener('change', (e) => {
    if (typeof fn === 'function') fn(e.target.files);
  });
}
