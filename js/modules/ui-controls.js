import { NOTES } from './constants.js';
import { $ } from '../utils/dom.js';
import * as fretboard from './fretboard.js';
import * as tunerEngine from './tuner-engine.js';
import * as tunerUi from './tuner-ui.js';
import { initTooltip } from './tooltip.js';

/* ─── State ─── */
const state = {
  rootNote:     'A',
  scaleType:    'minor_pentatonic',
  tuning:       'standard',
  showAllNotes: true,
  darkMode:     true,
  micActive:    false,
  detectedNote:  null,
  detectedMidi:  null,
  detectedCents: 0,
  detectedFreq:  0,
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

/* ─── Init ─── */
export function init() {
  buildRootNoteGrid();
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
