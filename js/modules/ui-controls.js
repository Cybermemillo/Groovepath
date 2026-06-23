import { NOTES } from './constants.js';
import { $ } from '../utils/dom.js';
import * as fretboard from './fretboard.js';
import * as tunerEngine from './tuner-engine.js';
import * as tunerUi from './tuner-ui.js';
import { initTooltip } from './tooltip.js';

/* ─── State ─── */
const state = {
  rootNote:      'A',
  scaleType:     'minor_pentatonic',
  tuning:        'standard',
  showAllNotes:  true,
  showNoteNames:  true,
  fretFrom:       0,
  fretTo:         24,
  arpeggioType:   'none',
  soloArpeggio:   false,
  darkMode:      true,
  micActive:     false,
  detectedNote:   null,
  detectedMidi:   null,
  detectedCents:  0,
  detectedFreq:   0,
};

/* ─── Tuner callbacks ─── */
tunerEngine.setCallbacks({
  onPitch({ note, midi, freq, cents, changed }) {
    state.detectedNote  = note;
    state.detectedMidi  = midi;
    state.detectedFreq  = freq;
    state.detectedCents = cents;
    tunerUi.updateTunerDisplay(note, freq, cents, midi);
    if (changed) fretboard.renderScale(state);
  },
  onSilence() {
    state.detectedNote  = null;
    state.detectedMidi  = null;
    state.detectedCents = 0;
    state.detectedFreq  = 0;
    tunerUi.updateTunerDisplay(null, 0, 0);
    fretboard.renderScale(state);
  },
});

/* ─── Theme ─── */
const darkIcon  = $('#themeIconDark');
const lightIcon = $('#themeIconLight');

function setTheme(isDark) {
  state.darkMode = isDark;
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('light', !isDark);
  darkIcon.style.display  = isDark ? '' : 'none';
  lightIcon.style.display = isDark ? 'none' : '';
}

/* ─── Root note grid ─── */
function buildRootNoteGrid() {
  const grid = document.getElementById('rootNoteGrid');
  if (!grid) return;
  grid.innerHTML = '';
  NOTES.forEach(note => {
    const btn = document.createElement('button');
    btn.className = 'note-btn' + (note === state.rootNote ? ' active' : '');
    btn.textContent = note;
    btn.dataset.note = note;
    btn.addEventListener('click', () => {
      state.rootNote = note;
      grid.querySelectorAll('.note-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.note === note)
      );
      fretboard.renderScale(state);
    });
    grid.appendChild(btn);
  });
}

/* ─── Mic UI ─── */
const micStatusText = $('#micStatusText');
const micDot        = $('#micDot');
const micLabel      = $('#micLabel');
const micToggle     = $('#micToggle');

function setMicUI(active) {
  state.micActive = active;
  micToggle.classList.toggle('active', active);
  micDot.classList.toggle('active', active);
  micLabel.textContent = active ? 'Detener micrófono' : 'Activar micrófono';
  micStatusText.textContent = active ? 'Escuchando...' : 'Micrófono inactivo';
}

/* ─── Fret range ─── */
const RANGE_PRESETS = [
  { label: 'Todo', from: 0, to: 24 },
  { label: 'Cuerdas al aire', from: 0, to: 4 },
  { label: '1–12', from: 1, to: 12 },
  { label: '5–12', from: 5, to: 12 },
  { label: '12–24', from: 12, to: 24 },
];

function buildFretRange() {
  const fromSel = $('#fretFrom');
  const toSel   = $('#fretTo');
  const presets = $('#rangePresets');

  fromSel.innerHTML = '';
  toSel.innerHTML   = '';

  for (let f = 0; f <= 24; f++) {
    const optFrom = document.createElement('option');
    optFrom.value = f;
    optFrom.textContent = f;
    if (f === state.fretFrom) optFrom.selected = true;
    fromSel.appendChild(optFrom);

    const optTo = document.createElement('option');
    optTo.value = f;
    optTo.textContent = f;
    if (f === state.fretTo) optTo.selected = true;
    toSel.appendChild(optTo);
  }

  presets.innerHTML = '';
  RANGE_PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn' + (p.from === state.fretFrom && p.to === state.fretTo ? ' active' : '');
    btn.textContent = p.label;
    btn.addEventListener('click', () => {
      state.fretFrom = p.from;
      state.fretTo   = p.to;
      fromSel.value  = p.from;
      toSel.value    = p.to;
      presets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fretboard.renderScale(state);
      fretboard.applyFretRange(state);
    });
    presets.appendChild(btn);
  });
}

function updateRange() {
  state.fretFrom = parseInt($('#fretFrom').value);
  state.fretTo   = parseInt($('#fretTo').value);

  if (state.fretFrom > state.fretTo) {
    state.fretTo = state.fretFrom;
    $('#fretTo').value = state.fretTo;
  }

  const presets = $('#rangePresets');
  presets.querySelectorAll('.preset-btn').forEach(b => {
    const match = RANGE_PRESETS.find(p => p.from === state.fretFrom && p.to === state.fretTo);
    b.classList.toggle('active', match && b.textContent === match.label);
  });

  fretboard.renderScale(state);
  fretboard.applyFretRange(state);
}

/* ─── Init ─── */
export function init() {
  buildRootNoteGrid();
  buildFretRange();
  fretboard.buildFretboard(state);
  initTooltip();

  setTheme(true);

  $('#scaleSelect').addEventListener('change', (e) => {
    state.scaleType = e.target.value;
    fretboard.renderScale(state);
  });

  $('#tuningSelect').addEventListener('change', (e) => {
    state.tuning = e.target.value;
    fretboard.buildFretboard(state);
  });

  $('#showAllNotes').addEventListener('change', (e) => {
    state.showAllNotes = e.target.checked;
    fretboard.renderScale(state);
  });

  $('#showNoteNames').addEventListener('change', (e) => {
    state.showNoteNames = e.target.checked;
    fretboard.renderScale(state);
  });

  $('#arpeggioSelect').addEventListener('change', (e) => {
    state.arpeggioType = e.target.value;
    fretboard.renderScale(state);
  });

  $('#soloArpeggio').addEventListener('change', (e) => {
    state.soloArpeggio = e.target.checked;
    fretboard.renderScale(state);
  });

  $('#fretFrom').addEventListener('change', updateRange);
  $('#fretTo').addEventListener('change', updateRange);

  $('#themeToggle').addEventListener('click', () => {
    setTheme(!state.darkMode);
  });

  micToggle.addEventListener('click', async () => {
    if (state.micActive) {
      tunerEngine.stopMic();
      setMicUI(false);
      tunerUi.updateTunerDisplay(null, 0, 0);
      fretboard.renderScale(state);
    } else {
      const ok = await tunerEngine.startMic();
      setMicUI(ok);
      if (!ok) {
        micStatusText.textContent = 'Sin acceso al micrófono';
      }
    }
  });
}
