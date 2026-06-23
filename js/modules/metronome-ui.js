import { $ } from '../utils/dom.js';

const widget    = $('#metronomeWidget');
const toggle    = $('#metroToggle');
const panel     = $('#metroPanel');
const miniBpm   = $('#metroMiniBpm');
const miniStat  = $('#metroMiniStatus');
const playBtn   = $('#metroPlay');
const bpmDisp   = $('#metroBpmDisplay');
const bpmSlider = $('#metroBpmSlider');
const tapBtn    = $('#metroTap');
const volSlider = $('#metroVolume');
const subBtns   = panel.querySelectorAll('.metro-sub-btn');
const tsBtns    = panel.querySelectorAll('.metro-ts-btn');
const accentChk = $('#metroAccent');

let _onPlay    = null;
let _onBpm     = null;
let _onTap     = null;
let _onSub     = null;
let _onTs      = null;
let _onVolume  = null;
let _onAccent  = null;

function setMini(bpm, playing) {
  miniBpm.textContent = bpm;
  miniStat.textContent = playing ? 'ON' : '';
  miniStat.classList.toggle('active', playing);
}

export function render(state) {
  bpmDisp.textContent = state.bpm;
  bpmSlider.value = state.bpm;
  volSlider.value = state.volume;
  accentChk.checked = state.accentOn;

  subBtns.forEach(b =>
    b.classList.toggle('active', b.dataset.sub === state.subdivision)
  );
  tsBtns.forEach(b =>
    b.classList.toggle('active', b.dataset.ts === state.timeSignature)
  );

  const icon = state.playing ? '\u25A0' : '\u25B6';
  playBtn.textContent = icon;
  playBtn.classList.toggle('active', state.playing);

  setMini(state.bpm, state.playing);
}

export function onPlay(fn)   { _onPlay   = fn; }
export function onBpm(fn)    { _onBpm    = fn; }
export function onTap(fn)    { _onTap    = fn; }
export function onSub(fn)    { _onSub    = fn; }
export function onTs(fn)     { _onTs     = fn; }
export function onVolume(fn) { _onVolume = fn; }
export function onAccent(fn) { _onAccent = fn; }

export function init() {
  toggle.addEventListener('click', () => {
    widget.classList.toggle('expanded');
  });

  playBtn.addEventListener('click', () => {
    if (_onPlay) _onPlay();
  });

  bpmSlider.addEventListener('input', () => {
    const bpm = parseInt(bpmSlider.value);
    bpmDisp.textContent = bpm;
    if (_onBpm) _onBpm(bpm);
  });

  tapBtn.addEventListener('click', () => {
    if (_onTap) _onTap();
  });

  volSlider.addEventListener('input', () => {
    if (_onVolume) _onVolume(parseFloat(volSlider.value));
  });

  accentChk.addEventListener('change', () => {
    if (_onAccent) _onAccent(accentChk.checked);
  });

  subBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (_onSub) _onSub(btn.dataset.sub);
    });
  });

  tsBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tsBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (_onTs) _onTs(btn.dataset.ts);
    });
  });

  // Close panel when clicking outside (if expanded)
  document.addEventListener('click', (e) => {
    if (widget.classList.contains('expanded') &&
        !widget.contains(e.target)) {
      widget.classList.remove('expanded');
    }
  });
}
