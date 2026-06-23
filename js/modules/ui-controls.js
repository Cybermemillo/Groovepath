import { NOTES } from './constants.js';
import { $ } from '../utils/dom.js';
import { TUNINGS, TUNING_LABELS } from './constants.js';
import { noteToTuningMidi } from './theory.js';
import * as fretboard from './fretboard.js';
import * as tunerEngine from './tuner-engine.js';
import * as tunerUi from './tuner-ui.js';
import * as synth from './synth.js';
import * as training from './training.js';
import * as trainingUi from './training-ui.js';
import * as stats from './stats.js';
import * as statsUi from './stats-ui.js';
import * as backing from './backing-track.js';
import * as backingUi from './backing-track-ui.js';
import * as improvisation from './improvisation.js';
import * as improUi from './improvisation-ui.js';
import * as metronome from './metronome.js';
import * as metroUi from './metronome-ui.js';
import { initTooltip } from './tooltip.js';
import { initHelpModal } from './help-modal.js';
import { loadSettings, saveSettings } from './settings.js';

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
  volume:         0.5,
  darkMode:      true,
  micActive:     false,
  detectedNote:   null,
  detectedMidi:   null,
  detectedCents:  0,
  detectedFreq:   0,
  trainingActive:  false,
  backingActive:   false,
  audioMode:       'generated',
  improvisationActive: false,
  customTuningMidi:   [43, 38, 33, 28],
  customTuningLabels: ['G', 'D', 'A', 'E'],
  customTuningNotes:  ['E', 'A', 'D', 'G'],
};

let _settingsLoaded = false;
function autoSave() {
  if (!_settingsLoaded) return;
  const bs = backing.getState();
  saveSettings({
    rootNote: state.rootNote,
    scaleType: state.scaleType,
    arpeggioType: state.arpeggioType,
    soloArpeggio: state.soloArpeggio,
    showNames: state.showNoteNames,
    minFret: state.fretFrom,
    maxFret: state.fretTo,
    backingStyle: bs.style,
    bpm: bs.bpm,
    backingVolume: bs.volume,
    synthVolume: state.volume,
    theme: state.darkMode ? 'dark' : 'light',
    tuning: state.tuning,
    customTuningNotes: state.customTuningNotes,
  });
}

/* ─── Tuner callbacks ─── */
tunerEngine.setCallbacks({
  onPitch({ note, midi, freq, cents, changed }) {
    state.detectedNote  = note;
    state.detectedMidi  = midi;
    state.detectedFreq  = freq;
    state.detectedCents = cents;
    tunerUi.updateTunerDisplay(note, freq, cents, midi);

    if (state.trainingActive) {
      training.evaluatePitch(note, cents);
    }
    if (state.improvisationActive) {
      improvisation.evaluatePitch(note, cents);
    }
    if (!state.trainingActive && !state.improvisationActive && changed) {
      fretboard.renderScale(state);
    }
  },
  onSilence() {
    state.detectedNote  = null;
    state.detectedMidi  = null;
    state.detectedCents = 0;
    state.detectedFreq  = 0;
    tunerUi.updateTunerDisplay(null, 0, 0);
    if (!state.trainingActive) {
      fretboard.renderScale(state);
    }
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
      backing.setRootScale(state.rootNote, state.scaleType);
      fretboard.renderScale(state);
      autoSave();
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
      autoSave();
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
  autoSave();
}

function applyTuning() {
  const ctPanel = $('#customTuningNotes');
  if (state.tuning === 'custom') {
    ctPanel.style.display = 'flex';
    $('#ctNote3').value = state.customTuningNotes[0];
    $('#ctNote2').value = state.customTuningNotes[1];
    $('#ctNote1').value = state.customTuningNotes[2];
    $('#ctNote0').value = state.customTuningNotes[3];
    buildCustomTuning();
  } else {
    ctPanel.style.display = 'none';
    state.customTuningMidi = [...TUNINGS[state.tuning]];
    state.customTuningLabels = [...TUNING_LABELS[state.tuning]];
  }
  tunerUi.setTuningMidi(state.customTuningMidi);
  fretboard.buildFretboard(state);
  autoSave();
}

function buildCustomTuning() {
  const notes = [
    $('#ctNote3').value.trim().toUpperCase().replace(/^B$/,'B') || 'E',
    $('#ctNote2').value.trim().toUpperCase() || 'A',
    $('#ctNote1').value.trim().toUpperCase() || 'D',
    $('#ctNote0').value.trim().toUpperCase() || 'G',
  ];
  // Normalize via NOTES
  const valid = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const normalized = notes.map(n => {
    const found = valid.find(v => v.toLowerCase() === n.toLowerCase());
    return found || n;
  });
  state.customTuningNotes = normalized;
  const midiArr = normalized.map((n, i) => noteToTuningMidi(n, 3 - i));
  state.customTuningMidi = midiArr.every(m => m !== null) ? midiArr : [43, 38, 33, 28];
  state.customTuningLabels = [...normalized].reverse();
}

/* ─── Training ─── */
let audioEl = null; // uploaded file reference

function setupTrainingCallbacks() {
  training.setCallbacks({
    onCountdown(n) {
      trainingUi.renderCountdown(n);
    },
    onStart(target) {
      fretboard.highlightTarget(target.note);
      trainingUi.renderStart(target);
    },
    onCorrect({ note, points, streak, score }) {
      trainingUi.renderCorrect({ points, streak, score });
      synth.playFeedback(true);
    },
    onWrong({ expected, played, streak, score }) {
      trainingUi.renderWrong({ expected, played, streak, score });
      synth.playFeedback(false);
    },
    onFinish(results) {
      stats.recordSession({
        root: state.rootNote,
        scale: state.scaleType,
        arpeggio: state.arpeggioType,
        range: state.fretFrom + '-' + state.fretTo,
        score: results.score,
        correct: results.correct,
        wrong: results.wrong,
        maxStreak: results.maxStreak,
        total: results.total,
      });
      statsUi.render();
      populateStatsFilter();
      trainingUi.renderResults(results);
      fretboard.clearTarget();
      state.trainingActive = false;
    },
    onError(msg) {
      trainingUi.showError(msg);
      fretboard.clearTarget();
      trainingUi.renderIdle();
      state.trainingActive = false;
    },
  });
}

async function startTraining() {
  if (state.trainingActive) return;

  if (!state.micActive) {
    const result = await tunerEngine.startMic();
    if (!result.success) {
      tunerUi.showMicError(result.message);
      return;
    }
    setMicUI(true);
  }

  const started = training.startTraining({ ...state });
  if (started) {
    state.trainingActive = true;
  }
}

function stopTraining() {
  const results = training.stopTraining();
  fretboard.clearTarget();
  if (results) {
    trainingUi.renderResults(results);
  } else {
    trainingUi.renderIdle();
  }
  state.trainingActive = false;
}

function populateStatsFilter() {
  const sel = $('#statsFilter');
  const val = sel.value;
  sel.innerHTML = '<option value="">Global</option>';
  stats.getFilters().forEach(f => {
    const label = f.arpeggio !== 'none'
      ? f.root + ' arp ' + f.arpeggio.replace(/_/g, ' ')
      : f.root + ' ' + f.scale.replace(/_/g, ' ');
    const key = f.arpeggio !== 'none'
      ? 'arp:' + f.root + '|' + f.arpeggio
      : f.root + '|' + f.scale;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = label;
    if (key === val) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ─── Init ─── */
export function init() {
  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const saved = loadSettings(isMobile);
  state.rootNote      = saved.rootNote;
  state.scaleType     = saved.scaleType;
  state.arpeggioType  = saved.arpeggioType;
  state.soloArpeggio  = saved.soloArpeggio;
  state.showNoteNames = saved.showNames;
  state.fretFrom      = saved.minFret;
  state.fretTo        = saved.maxFret;
  state.volume        = saved.synthVolume;
  state.tuning        = saved.tuning;
  state.customTuningNotes = saved.customTuningNotes || ['E', 'A', 'D', 'G'];

  if (state.tuning === 'custom') {
    state.customTuningMidi = state.customTuningNotes
      .map((n, i) => noteToTuningMidi(n, 3 - i));
    state.customTuningLabels = [...state.customTuningNotes].reverse();
  } else {
    state.customTuningMidi = TUNINGS[state.tuning]
      ? [...TUNINGS[state.tuning]] : [43, 38, 33, 28];
    state.customTuningLabels = TUNING_LABELS[state.tuning]
      ? [...TUNING_LABELS[state.tuning]] : ['G', 'D', 'A', 'E'];
  }

  // Set initial tuner tuning
  tunerUi.setTuningMidi(state.customTuningMidi);

  // Sync tuning select and custom inputs
  $('#tuningSelect').value = state.tuning;
  if (state.tuning === 'custom') {
    $('#customTuningNotes').style.display = 'flex';
    $('#ctNote3').value = state.customTuningNotes[0];
    $('#ctNote2').value = state.customTuningNotes[1];
    $('#ctNote1').value = state.customTuningNotes[2];
    $('#ctNote0').value = state.customTuningNotes[3];
  }

  buildRootNoteGrid();
  buildFretRange();
  fretboard.buildFretboard(state);
  initTooltip();
  initHelpModal();

  setTheme(saved.theme === 'dark');

  backing.setStyle(saved.backingStyle);
  backing.setBpm(saved.bpm);
  backing.setVolume(saved.backingVolume);

  _settingsLoaded = true;

  setupTrainingCallbacks();

  improvisation.setCallbacks({
    onCorrect({ note, points, streak, score, type }) {
      improUi.updateScore(score, streak);
      improUi.showFeedback(note, points, type);
    },
    onWrong({ note, score, streak }) {
      improUi.updateScore(score, streak);
      improUi.showWrong(note);
    },
    onChordChange({ chord }) {
      improUi.updateChord(chord);
    },
  });

  backing.setCallbacks({
    onBarStart({ chord }) {
      improvisation.setChord(chord);
    },
  });

  statsUi.init();

  statsUi.render();
  populateStatsFilter();

  backing.setRootScale(state.rootNote, state.scaleType);
  backingUi.render(backing.getState());

  $('#soloArpeggio').disabled = true;

  synth.setVolume(state.volume);

  const arpNone = state.arpeggioType === 'none';
  $('#soloArpeggio').disabled = arpNone;
  if (arpNone) { $('#soloArpeggio').checked = false; state.soloArpeggio = false; }
  else { $('#soloArpeggio').checked = state.soloArpeggio; }

  $('#volumeSlider').value = state.volume;
  $('#arpeggioSelect').value = state.arpeggioType;
  $('#scaleSelect').value = state.scaleType;
  $('#showNoteNames').checked = state.showNoteNames;
  $('#fretFrom').value = state.fretFrom;
  $('#fretTo').value = state.fretTo;

  $('#volumeSlider').addEventListener('input', (e) => {
    state.volume = parseFloat(e.target.value);
    synth.setVolume(state.volume);
    autoSave();
  });

  $('#scaleSelect').addEventListener('change', (e) => {
    state.scaleType = e.target.value;
    backing.setRootScale(state.rootNote, state.scaleType);
    fretboard.renderScale(state);
    autoSave();
  });

  $('#tuningSelect').addEventListener('change', (e) => {
    state.tuning = e.target.value;
    applyTuning();
  });

  ['ctNote3', 'ctNote2', 'ctNote1', 'ctNote0'].forEach(id => {
    $('#' + id).addEventListener('input', () => {
      if (state.tuning !== 'custom') return;
      buildCustomTuning();
      tunerUi.setTuningMidi(state.customTuningMidi);
      fretboard.buildFretboard(state);
      autoSave();
    });
  });

  $('#showAllNotes').addEventListener('change', (e) => {
    state.showAllNotes = e.target.checked;
    fretboard.renderScale(state);
  });

  $('#showNoteNames').addEventListener('change', (e) => {
    state.showNoteNames = e.target.checked;
    fretboard.renderScale(state);
    autoSave();
  });

  $('#arpeggioSelect').addEventListener('change', (e) => {
    state.arpeggioType = e.target.value;
    const isNone = state.arpeggioType === 'none';
    $('#soloArpeggio').disabled = isNone;
    if (isNone) {
      $('#soloArpeggio').checked = false;
      state.soloArpeggio = false;
    }
    fretboard.renderScale(state);
    autoSave();
  });

  $('#soloArpeggio').addEventListener('change', (e) => {
    state.soloArpeggio = e.target.checked;
    fretboard.renderScale(state);
    autoSave();
  });

  $('#fretFrom').addEventListener('change', updateRange);
  $('#fretTo').addEventListener('change', updateRange);

  $('#themeToggle').addEventListener('click', () => {
    setTheme(!state.darkMode);
    autoSave();
  });

  $('#trainingStart').addEventListener('click', () => {
    if (state.trainingActive) {
      stopTraining();
    } else {
      startTraining();
    }
  });

  micToggle.addEventListener('click', async () => {
    if (state.micActive) {
      tunerEngine.stopMic();
      setMicUI(false);
      tunerUi.updateTunerDisplay(null, 0, 0);
      if (state.trainingActive) {
        stopTraining();
        return;
      }
      if (state.improvisationActive) {
        const results = improvisation.stop();
        if (results) {
          stats.recordImprovisation(results);
          statsUi.render();
          populateStatsFilter();
        }
        improUi.renderIdle();
      }
      fretboard.renderScale(state);
    } else {
      const result = await tunerEngine.startMic();
      if (result.success) {
        setMicUI(true);
        tunerUi.clearMicError();
      } else {
        tunerUi.showMicError(result.message);
      }
    }
  });

  $('#statsFilter').addEventListener('change', () => {
    const val = $('#statsFilter').value;
    if (val === '') {
      statsUi.render();
    } else {
      const parts = val.split(':');
      if (parts[0] === 'arp') {
        const [root, arp] = parts[1].split('|');
        statsUi.render({ root, scale: '', arpeggio: arp });
      } else {
        const [root, scale] = parts[0].split('|');
        statsUi.render({ root, scale, arpeggio: 'none' });
      }
    }
  });

  $('#statsClear').addEventListener('click', () => {
    if (confirm('¿Borrar todas las estadísticas?')) {
      stats.clearStats();
      statsUi.render();
      populateStatsFilter();
    }
  });

  backingUi.onPlayClick(() => {
    if (audioEl && state.audioMode === 'file') {
      if (audioEl.paused) {
        audioEl.play().catch(() => {});
        state.backingActive = true;
        backingUi.setPlayIcon(true);
      } else {
        audioEl.pause();
        state.backingActive = false;
        backingUi.setPlayIcon(false);
      }
      return;
    }
    if (backing.isPlaying()) {
      backing.stop();
      state.backingActive = false;
      backingUi.setPlayIcon(false);
      if (state.improvisationActive) {
        const results = improvisation.stop();
        if (results) {
          stats.recordImprovisation(results);
          statsUi.render();
          populateStatsFilter();
        }
        improUi.renderIdle();
      }
    } else {
      backing.stop();
      if (audioEl) { audioEl.pause(); audioEl = null; }
      state.audioMode = 'generated';
      state.backingActive = true;
      backing.setRootScale(state.rootNote, state.scaleType);
      backing.start();
      backingUi.setPlayIcon(true);
      if (state.improvisationActive) {
        improvisation.start(state.rootNote, state.scaleType);
        improUi.renderActive('—');
      }
    }
  });

  backingUi.onBpmChange((bpm) => {
    backing.setBpm(bpm);
    autoSave();
  });

  backingUi.onVolumeChange((v) => {
    backing.setVolume(v);
    autoSave();
  });

  metroUi.init();
  metroUi.render(metronome.getState());

  metroUi.onPlay(() => {
    if (metronome.isPlaying()) {
      metronome.stop();
    } else {
      metronome.start();
    }
    metroUi.render(metronome.getState());
  });

  metroUi.onBpm((bpm) => {
    metronome.setBpm(bpm);
    metroUi.render(metronome.getState());
  });

  metroUi.onTap(() => {
    const bpm = metronome.tapTempo();
    if (bpm !== null) metroUi.render(metronome.getState());
  });

  metroUi.onSub((sub) => {
    metronome.setSubdivision(sub);
  });

  metroUi.onTs((ts) => {
    metronome.setTimeSignature(ts);
  });

  metroUi.onVolume((v) => {
    metronome.setVolume(v);
  });

  metroUi.onAccent((on) => {
    metronome.setAccent(on);
  });

  backingUi.bindStyleButtons((style) => {
    if (style === 'upload') {
      if (improvisation.isActive()) { improvisation.stop(); improUi.renderIdle(); }
      if (audioEl) {
        backing.stop();
        state.audioMode = 'file';
        state.backingActive = true;
        audioEl.play().catch(() => {});
        backingUi.setPlayIcon(true);
      } else {
        $('#trackFile').click();
      }
      return;
    }
    if (improvisation.isActive()) { improvisation.stop(); improUi.renderIdle(); }
    if (audioEl) { audioEl.pause(); audioEl = null; }
    state.audioMode = 'generated';
    backing.stop();
    backing.setStyle(style);
    backingUi.render(backing.getState());
    autoSave();
    if (state.backingActive) {
      backing.setRootScale(state.rootNote, state.scaleType);
      backing.start();
    }
    backingUi.setPlayIcon(state.backingActive);
  });

  backingUi.onFileChange((files) => {
    if (!files || !files[0]) return;
    backing.stop();
    if (improvisation.isActive()) { improvisation.stop(); improUi.renderIdle(); }
    if (audioEl) { audioEl.pause(); audioEl = null; }
    state.backingActive = false;
    backingUi.setPlayIcon(false);

    const file = files[0];
    const btn = $('#trackFile').parentElement.querySelector('.track-file-btn');
    if (btn) { btn.textContent = file.name.length > 18 ? file.name.slice(0, 15) + '...' : file.name; }
    $('#trackFile').parentElement.classList.add('has-file');

    const url = URL.createObjectURL(file);
    audioEl = new Audio(url);
    audioEl.loop = true;
    state.audioMode = 'file';

    $('#backingStyles').querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    const uploadBtn = $('#backingStyles').querySelector('[data-style="upload"]');
    if (uploadBtn) uploadBtn.classList.add('active');

    audioEl.addEventListener('ended', () => {
      state.backingActive = false;
      state.audioMode = 'generated';
      backingUi.setPlayIcon(false);
      audioEl = null;
      $('#trackFile').parentElement.classList.remove('has-file');
      if (btn) { btn.textContent = '+ Subir pista'; }
    });
  });

  $('#improToggle').addEventListener('change', (e) => {
    state.improvisationActive = e.target.checked;
    if (state.improvisationActive) {
      if (backing.isPlaying()) {
        improvisation.start(state.rootNote, state.scaleType);
        improUi.renderActive('—');
      } else {
        improUi.renderIdle();
      }
    } else {
      if (improvisation.isActive()) {
        const results = improvisation.stop();
        if (results) {
          stats.recordImprovisation(results);
          statsUi.render();
          populateStatsFilter();
        }
        improUi.renderIdle();
      }
    }
  });
}
