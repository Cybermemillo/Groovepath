import { $ } from '../utils/dom.js';
import { BACKING_STYLES } from './constants.js';

const playBtn  = $('#backingPlay');
const volSlider = $('#backingVolume');
const bpmSlider = $('#bpmSlider');
const bpmValue  = $('#bpmValue');
const styleBtns = $('#backingStyles').querySelectorAll('.style-btn');
const trackFile = $('#trackFile');

export function render(state) {
  volSlider.value = state.volume;
  bpmSlider.value = state.bpm;
  bpmValue.textContent = state.bpm;
  styleBtns.forEach(b => {
    const isFree = b.dataset.style === 'free';
    const isActive = b.dataset.style === state.style;
    b.classList.toggle('active', isActive && !isFree);
    b.classList.toggle('free-active', isActive && isFree);
  });
}

export function setStyleButtonsEnabled(enabled) {
  styleBtns.forEach(b => {
    if (b.dataset.style === 'free') return;
    b.disabled = !enabled;
    b.style.opacity = enabled ? '' : '0.4';
  });
}

export function onVolumeChange(fn) {
  volSlider.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (typeof fn === 'function') fn(v);
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
      if (typeof onClick === 'function') onClick(btn.dataset.style);
    });
  });
}

export function setFreeActive(on) {
  const freeBtn = document.querySelector('.style-free');
  if (freeBtn) {
    freeBtn.classList.toggle('free-active', on);
  }
}

export function onFreeClick(fn) {
  const freeBtn = document.querySelector('.style-free');
  if (freeBtn) {
    freeBtn.addEventListener('click', () => {
      if (typeof fn === 'function') fn();
    });
  }
}

export function onFileChange(fn) {
  trackFile.addEventListener('change', (e) => {
    if (typeof fn === 'function') fn(e.target.files);
  });
}
