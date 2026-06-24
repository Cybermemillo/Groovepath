import { NOTES } from './constants.js';
import { noteToDisplay } from './constants.js';
import { $ } from '../utils/dom.js';
import { TUNINGS, TUNING_LABELS } from './constants.js';
import { noteToTuningMidi, getScaleNotes, getChordNotes } from './theory.js';
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
import * as practiceTime from './practice-time.js';
import * as routines from './routines.js';
import * as routinesUi from './routines-ui.js';
import * as intervalTrainer from './interval-trainer.js';
import * as itUi from './interval-trainer-ui.js';
import * as achievements from './achievements.js';
import * as eastereggs from './eastereggs.js';
import { addPointsWithToast } from './achievements-ui.js';
import { initTooltip } from './tooltip.js';
import { initHelpModal } from './help-modal.js';
import { initNewsModal } from './news-modal.js';
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
  notation:        'english',
  customTuningMidi:   [43, 38, 33, 28],
  customTuningLabels: ['G', 'D', 'A', 'E'],
  customTuningNotes:  ['E', 'A', 'D', 'G'],
};

const improvisationState = { chordTones: null, scaleNotes: null };

let _settingsLoaded = false;

function improChordDisplay(root, type, notation) {
  const labels = {
    'major': '', 'minor': 'm', 'major_7': 'maj7', 'minor_7': 'm7',
    'dominant_7': '7', 'minor_7b5': 'm7b5', 'diminished': 'dim', 'augmented': 'aug',
    'power': '', 'major_triad': '', 'minor_triad': 'm',
  };
  return noteToDisplay(root, notation) + (labels[type] || '');
}

function improUpcomingDisplay(upcoming, notation) {
  return upcoming.map(u => improChordDisplay(u.chord, u.type, notation));
}

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
    dailyGoalMinutes: stats.getDailyGoal(),
    notation: state.notation,
  });
}

/* ─── Tuner callbacks ─── */
tunerEngine.setCallbacks({
  onPitch({ note, midi, freq, cents, changed }) {
    state.detectedNote  = note;
    state.detectedMidi  = midi;
    state.detectedFreq  = freq;
    state.detectedCents = cents;
    tunerUi.updateTunerDisplay(note, freq, cents, midi, state.notation);

    eastereggs.onNoteDetected(midi, state.customTuningMidi);
    const si = findStringFret(midi, state.customTuningMidi);
    if (si) {
      achievements.recordTunerPitch({ stringIndex: si.string, fret: si.fret });
    }

    if (state.trainingActive) {
      training.evaluatePitch(note, cents);
    }
    if (state.improvisationActive) {
      improvisation.evaluatePitch(note, cents);
    }
    if (intervalTrainer.isPlaying()) {
      intervalTrainer.evaluatePitch(note);
    }
    if (!state.trainingActive && !intervalTrainer.isPlaying() && changed) {
      if (state.improvisationActive && improvisationState.chordTones && improvisationState.scaleNotes) {
        fretboard.renderImprovisation(state, improvisationState.chordTones, improvisationState.scaleNotes);
      } else {
        fretboard.renderScale(state);
      }
    }
  },
  onSilence() {
    state.detectedNote  = null;
    state.detectedMidi  = null;
    state.detectedCents = 0;
    state.detectedFreq  = 0;
    tunerUi.updateTunerDisplay(null, 0, 0);
    if (state.trainingActive) training.setSilence(true);
    if (state.improvisationActive) improvisation.setSilence();
    if (intervalTrainer.isPlaying()) intervalTrainer.setSilence(true);
    if (!state.trainingActive) {
      if (state.improvisationActive && improvisationState.chordTones && improvisationState.scaleNotes) {
        fretboard.renderImprovisation(state, improvisationState.chordTones, improvisationState.scaleNotes);
      } else {
        fretboard.renderScale(state);
      }
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
    const display = noteToDisplay(note, state.notation);
    const btn = document.createElement('button');
    btn.className = 'note-btn' + (note === state.rootNote ? ' active' : '');
    btn.textContent = display;
    btn.dataset.note = note;
    btn.addEventListener('click', () => {
      state.rootNote = note;
      grid.querySelectorAll('.note-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.note === note)
      );
      backing.setRootScale(state.rootNote, state.scaleType);
      if (state.improvisationActive) {
        improvisationState.scaleNotes = getScaleNotes(state.rootNote, state.scaleType);
        fretboard.renderImprovisation(state, improvisationState.chordTones || [], improvisationState.scaleNotes);
      } else {
        fretboard.renderScale(state);
      }
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

function findStringFret(midi, tuningMidi) {
  for (let s = 0; s < tuningMidi.length; s++) {
    const f = midi - tuningMidi[s];
    if (f >= 0 && f <= 24) return { string: s, fret: f };
  }
  return null;
}

let currentTrainingTarget = null; // { note, midi, string, fret } for achievement tracking

function setupTrainingCallbacks() {
  training.setCallbacks({
    onCountdown(n) {
      trainingUi.renderCountdown(n);
    },
    onStart(target) {
      currentTrainingTarget = target;
      fretboard.highlightTarget(target.note);
      const display = { ...target, note: noteToDisplay(target.note, state.notation) };
      trainingUi.renderStart(display);
    },
    onCorrect({ note, points, streak, score, reactionMs }) {
      trainingUi.renderCorrect({ points, streak, score });
      if (reactionMs) trainingUi.showSpeed(reactionMs);
      synth.playFeedback(true);
      trainingUi.showSilenceMessage('Suelta la cuerda...');
      addPointsWithToast(10, 'training', 'Nota correcta');
      if (currentTrainingTarget && currentTrainingTarget.string !== undefined) {
        achievements.recordTrainingResult({ correct: true, stringsHit: [currentTrainingTarget.string] });
      }
    },
    onWrong({ expected, played, streak, score }) {
      trainingUi.renderWrong({ expected, played, streak, score });
      synth.playFeedback(false);
      trainingUi.showSilenceMessage('Suelta la cuerda...');
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
        avgReactionMs: results.avgReactionMs || 0,
        fastestMs: results.fastestMs || 0,
      });
      achievements.recordTrainingResult({ maxStreak: results.maxStreak });
      achievements.checkAchievements();
      statsUi.render();
      populateStatsFilter();
      trainingUi.renderResults(results);
      fretboard.clearTarget();
      state.trainingActive = false;
      currentTrainingTarget = null;
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

  const rounds = parseInt($('#trainingRounds').value) || 10;
  const started = training.startTraining({ ...state }, rounds);
  if (started) {
    state.trainingActive = true;
    achievements.recordSource('training');
    practiceTime.start('training');
  }
}

function stopTraining() {
  const results = training.stopTraining();
  practiceTime.stop('training');
  if (results && results.maxStreak) {
    achievements.recordTrainingResult({ maxStreak: results.maxStreak });
  }
  achievements.checkAchievements();
  statsUi.render();
  fretboard.clearTarget();
  if (results) {
    trainingUi.renderResults(results);
  } else {
    trainingUi.renderIdle();
  }
  state.trainingActive = false;
  currentTrainingTarget = null;
}

function populateStatsFilter() { statsUi.populateFilter(); }

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
  state.notation       = saved.notation || 'english';
  updateNotationUI();
  state.customTuningNotes = saved.customTuningNotes || ['E', 'A', 'D', 'G'];

  if (saved.dailyGoalMinutes) {
    stats.setDailyGoal(saved.dailyGoalMinutes);
  }

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
  initNewsModal();

  setTheme(saved.theme === 'dark');

  backing.setStyle(saved.backingStyle);
  backing.setBpm(saved.bpm);
  backing.setVolume(saved.backingVolume);

  _settingsLoaded = true;

  setupTrainingCallbacks();

  improvisation.setCallbacks({
    onCorrect({ note, points, streak, score, type }) {
      improUi.updateScore(score, streak);
      improUi.showFeedback(noteToDisplay(note, state.notation), points, type);
    },
    onWrong({ note, score, streak }) {
      improUi.updateScore(score, streak);
      improUi.showWrong(noteToDisplay(note, state.notation));
    },
    onChordChange({ chord, type, label }) {
      const ct = getChordNotes(chord, type);
      const sn = getScaleNotes(state.rootNote, state.scaleType);
      improvisationState.chordTones = ct;
      improvisationState.scaleNotes = sn;
      improUi.updateChord(improChordDisplay(chord, type || 'power', state.notation));
      fretboard.renderImprovisation(state, ct, sn);
    },
    onTargetChange({ note }) {
      fretboard.highlightTarget(note);
      improUi.showTarget(noteToDisplay(note, state.notation));
    },
  });

  backing.setCallbacks({
    onBarStart({ chord, type, upcoming }) {
      improvisation.setChord(chord, type);
      if (upcoming) improUi.updateUpcoming(improUpcomingDisplay(upcoming, state.notation));
      const tl = backing.getTimelineData();
      improUi.renderTimeline(tl.bars, tl.current, state.notation);
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
    const mob = document.getElementById('volumeSliderMobile');
    if (mob) mob.value = e.target.value;
    autoSave();
  });

  $('#scaleSelect').addEventListener('change', (e) => {
    state.scaleType = e.target.value;
    backing.setRootScale(state.rootNote, state.scaleType);
    if (state.improvisationActive) {
      improvisationState.scaleNotes = getScaleNotes(state.rootNote, state.scaleType);
      fretboard.renderImprovisation(state, improvisationState.chordTones || [], improvisationState.scaleNotes);
    } else {
      fretboard.renderScale(state);
    }
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

  $('#statsBtn').addEventListener('click', () => {
    statsUi.toggle();
  });
  const hssEl = $('#headerStatsSummary');
  if (hssEl) {
    hssEl.addEventListener('click', () => statsUi.open());
  }
  statsUi.renderHeaderSummary();

  $('#notationToggle').addEventListener('click', () => {
    state.notation = state.notation === 'spanish' ? 'english' : 'spanish';
    updateNotationUI();
    if (state.improvisationActive && improvisationState.chordTones && improvisationState.scaleNotes) {
      fretboard.renderImprovisation(state, improvisationState.chordTones, improvisationState.scaleNotes);
      if (improvisation.isActive()) {
        const ses = improvisation.getState();
        if (ses && ses.currentChord) {
          improUi.updateChord(improChordDisplay(ses.currentChord, ses.currentChordType, state.notation));
        }
        if (ses && ses.targetNote) {
          improUi.showTarget(noteToDisplay(ses.targetNote, state.notation));
        }
        const tl = backing.getTimelineData();
        improUi.renderTimeline(tl.bars, tl.current, state.notation);
        const up = backing.getUpcomingChords(3);
        if (up) improUi.updateUpcoming(improUpcomingDisplay(up, state.notation));
      }
    } else {
      fretboard.renderScale(state);
    }
    buildRootNoteGrid();
    autoSave();
  });

  function updateNotationUI() {
    const btn = $('#notationToggle');
    if (btn) {
      const span = btn.querySelector('span');
      if (span) {
        span.textContent = state.notation === 'spanish' ? 'Do' : 'C';
      }
      btn.title = state.notation === 'spanish' ? 'Notación: española (Do Re Mi)' : 'Notación: inglesa (C D E)';
    }
  }

  /* ─── Mobile menu & volume popover ─── */
  const volumeSliderMobile = document.getElementById('volumeSliderMobile');
  if (volumeSliderMobile) {
    volumeSliderMobile.value = state.volume;
    volumeSliderMobile.addEventListener('input', (e) => {
      state.volume = parseFloat(e.target.value);
      synth.setVolume(state.volume);
      document.getElementById('volumeSlider').value = e.target.value;
      autoSave();
    });
  }

  const volumeIconBtn = document.getElementById('volumeIconBtn');
  const volumePopover = document.getElementById('volumePopover');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (volumeIconBtn && volumePopover) {
    const volumeWrap = volumePopover.parentElement;
    volumeIconBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      volumeWrap?.classList.toggle('active');
      mobileMenu?.classList.remove('active');
    });
  }

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
      const vw = document.querySelector('.volume-mobile-wrap');
      vw?.classList.remove('active');
    });
  }

  const closeMobileMenu = () => {
    mobileMenu?.classList.remove('active');
    const vw = document.querySelector('.volume-mobile-wrap');
    vw?.classList.remove('active');
  };
  document.getElementById('mobileStatsBtn')?.addEventListener('click', () => { closeMobileMenu(); statsUi.open(); });
  document.getElementById('mobileHelpBtn')?.addEventListener('click', () => { closeMobileMenu(); document.getElementById('helpBtn')?.click(); });
  document.getElementById('mobileExportBtn')?.addEventListener('click', () => { closeMobileMenu(); document.getElementById('exportBtn')?.click(); });
  document.getElementById('mobileImportBtn')?.addEventListener('click', () => { closeMobileMenu(); document.getElementById('importBtn')?.click(); });

  document.addEventListener('click', (e) => {
    if (mobileMenu && !mobileMenu.contains(e.target) && e.target !== mobileMenuBtn) {
      mobileMenu.classList.remove('active');
    }
    const vw = document.querySelector('.volume-mobile-wrap');
    if (vw && !vw.contains(e.target) && e.target !== volumeIconBtn) {
      vw.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      mobileMenu?.classList.remove('active');
      const vw = document.querySelector('.volume-mobile-wrap');
      vw?.classList.remove('active');
    }
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
        const elapsed = practiceTime.stop('improvisation');
        const mins = Math.floor(elapsed / 60);
        if (mins > 0) addPointsWithToast(mins * 8, 'improvisation', mins + ' min improvisaci\u00f3n');
        if (results) {
          achievements.recordImprovisationResult({
            difficulty: results.difficulty,
            guided: results.guided,
            maxStreak: results.maxStreak,
            style: backing.getState().style,
            durationSec: results.duration,
          });
          stats.recordImprovisation(results);
          statsUi.render();
          populateStatsFilter();
        }
        improUi.renderResults(results);
        fretboard.clearTarget();
        fretboard.renderScale(state);
        improvisationState.chordTones = null;
        improvisationState.scaleNotes = null;
      }
      if (intervalTrainer.isPlaying()) {
        const results = intervalTrainer.stop();
        if (results && results.rounds > 0) {
          stats.recordFlashcards(results);
          achievements.recordIntervalResult({ maxStreak: results.maxStreak });
          achievements.checkAchievements();
          statsUi.render();
          populateStatsFilter();
        }
        itUi.renderIdle();
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

  backingUi.onPlayClick(() => {
    if (audioEl && state.audioMode === 'file') {
      if (audioEl.paused) {
        audioEl.play().catch(() => {});
        state.backingActive = true;
        backingUi.setPlayIcon(true);
        practiceTime.start('backing');
      } else {
        audioEl.pause();
        state.backingActive = false;
        backingUi.setPlayIcon(false);
        const elapsed = practiceTime.stop('backing');
        const mins = Math.floor(elapsed / 60);
        if (mins > 0) addPointsWithToast(mins * 4, 'backing', mins + ' min pista');
      }
      return;
    }
    if (backing.isPlaying()) {
      backing.stop();
      const bElapsed = practiceTime.stop('backing');
      const bMins = Math.floor(bElapsed / 60);
      if (bMins > 0) addPointsWithToast(bMins * 4, 'backing', bMins + ' min pista');
      state.backingActive = false;
      backingUi.setPlayIcon(false);
      if (state.improvisationActive) {
        const results = improvisation.stop();
        const iElapsed = practiceTime.stop('improvisation');
        const iMins = Math.floor(iElapsed / 60);
        if (iMins > 0) addPointsWithToast(iMins * 8, 'improvisation', iMins + ' min improvisaci\u00f3n');
        if (results) {
          achievements.recordImprovisationResult({
            difficulty: results.difficulty,
            guided: results.guided,
            maxStreak: results.maxStreak,
            style: backing.getState().style,
            durationSec: results.duration,
          });
          stats.recordImprovisation(results);
          statsUi.render();
          populateStatsFilter();
        }
        improUi.renderResults(results);
        fretboard.clearTarget();
        fretboard.renderScale(state);
        improvisationState.chordTones = null;
        improvisationState.scaleNotes = null;
      }
    } else {
      backing.stop();
      if (audioEl) { audioEl.pause(); audioEl = null; }
      state.audioMode = 'generated';
      state.backingActive = true;
      backing.setRootScale(state.rootNote, state.scaleType);
      backing.start();
      achievements.recordSource('backing');
      practiceTime.start('backing');
      backingUi.setPlayIcon(true);
      if (state.improvisationActive) {
        improvisation.stop();
        const diff = improUi.getDifficulty();
        const guided = improUi.isGuided();
        const bs = backing.getState();
        improvisation.start(state.rootNote, state.scaleType, {
          difficulty: diff,
          bpm: bs.bpm,
          guided,
          guidedSource: guided ? improUi.getGuidedSource() : 'chord',
          guidedSpeed: guided ? improUi.getGuidedSpeed() : 'bar',
        });
        practiceTime.start('improvisation');
        improUi.renderActive('\u2014');
        const tl2 = backing.getTimelineData();
        improUi.renderTimeline(tl2.bars, tl2.current, state.notation);
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
      const elapsed = practiceTime.stop('metronome');
      const mins = Math.floor(elapsed / 60);
      if (mins > 0) addPointsWithToast(mins * 4, 'metronome', mins + ' min metrónomo');
    } else {
      metronome.start();
      achievements.recordSource('metronome');
      practiceTime.start('metronome');
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

  /* ─── Routines ─── */
  routinesUi.init();

  let stepModeActive = null;

  function applyStep(step) {
    if (step.root !== 'current') state.rootNote = step.root;
    if (step.scaleType) state.scaleType = step.scaleType;
    state.arpeggioType = step.arpeggioType || 'none';
    state.soloArpeggio = step.soloArpeggio || false;
    state.fretFrom = step.fretFrom || 1;
    state.fretTo = step.fretTo || 12;

    fretboard.renderScale(state);
    fretboard.applyFretRange(state);
    updateStepSelects();
    $('#rootNoteGrid').querySelectorAll('.note-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.note === state.rootNote)
    );

    stepModeActive = null;
    stopModes();

    if (step.metronome && !metronome.isPlaying()) {
      metronome.start();
      achievements.recordSource('metronome');
      practiceTime.start('metronome');
      metroUi.render(metronome.getState());
    }

    if (step.backingStyle && step.backingStyle !== 'none') {
      backing.setStyle(step.backingStyle);
      backing.setBpm(step.bpm || 100);
      backing.setRootScale(state.rootNote, state.scaleType);
      backing.start();
      achievements.recordSource('backing');
      practiceTime.start('backing');
      backingUi.setPlayIcon(true);
      backingUi.render(backing.getState());
    }

    if (step.mode === 'training') {
      stepModeActive = 'training';
      training.startTraining({ ...state }, 10);
      achievements.recordSource('training');
      practiceTime.start('training');
      state.trainingActive = true;
    } else if (step.mode === 'improvisation') {
      stepModeActive = 'improvisation';
      const diff = improUi.getDifficulty();
      const guided = improUi.isGuided();
      const bs = backing.getState();
      improvisation.start(state.rootNote, state.scaleType, {
        difficulty: diff,
        bpm: bs.bpm,
        guided,
        guidedSource: guided ? improUi.getGuidedSource() : 'chord',
        guidedSpeed: guided ? improUi.getGuidedSpeed() : 'bar',
      });
      achievements.recordSource('improvisation');
      practiceTime.start('improvisation');
      state.improvisationActive = true;
      improUi.renderActive(step.backingStyle || '\u2014');
      const tlR = backing.getTimelineData();
      improUi.renderTimeline(tlR.bars, tlR.current, state.notation);
    }
  }

  function stopModes() {
    if (state.trainingActive) {
      training.stopTraining();
      practiceTime.stop('training');
      fretboard.clearTarget();
      trainingUi.renderIdle();
      state.trainingActive = false;
    }
    if (state.improvisationActive) {
      const results = improvisation.stop();
      const elapsed = practiceTime.stop('improvisation');
      const mins = Math.floor(elapsed / 60);
      if (mins > 0) addPointsWithToast(mins * 8, 'improvisation', mins + ' min improvisaci\u00f3n');
      if (results) {
        achievements.recordImprovisationResult({
          difficulty: results.difficulty,
          guided: results.guided,
          maxStreak: results.maxStreak,
          style: backing.getState().style,
          durationSec: results.duration,
        });
      }
      improUi.renderResults(results);
      fretboard.clearTarget();
      fretboard.renderScale(state);
      improvisationState.chordTones = null;
      improvisationState.scaleNotes = null;
      state.improvisationActive = false;
    }
    if (backing.isPlaying()) {
      backing.stop();
      const bElapsed = practiceTime.stop('backing');
      const bMins = Math.floor(bElapsed / 60);
      if (bMins > 0) addPointsWithToast(bMins * 4, 'backing', bMins + ' min pista');
      backingUi.setPlayIcon(false);
      state.backingActive = false;
    }
    if (metronome.isPlaying() && !routines.isPlaying()) {
      metronome.stop();
      const mElapsed = practiceTime.stop('metronome');
      const mMins = Math.floor(mElapsed / 60);
      if (mMins > 0) addPointsWithToast(mMins * 4, 'metronome', mMins + ' min metrónomo');
      metroUi.render(metronome.getState());
    }
  }

  function updateStepSelects() {
    $('#scaleSelect').value = state.scaleType;
    $('#arpeggioSelect').value = state.arpeggioType;
    $('#soloArpeggio').checked = state.soloArpeggio;
    $('#fretFrom').value = state.fretFrom;
    $('#fretTo').value = state.fretTo;
    const presets = $('#rangePresets');
    if (presets) {
      presets.querySelectorAll('.preset-btn').forEach(b => {
        const match = RANGE_PRESETS.find(p => p.from === state.fretFrom && p.to === state.fretTo);
        b.classList.toggle('active', match && b.textContent === match.label);
      });
    }
  }

  routinesUi.onPlay((id) => {
    const all = routines.getAll();
    const r = all.find(r => r.id === id);
    if (!r || !r.steps.length) return;

    stopModes();
    routines.startPlayer(r);
  });

  routinesUi.onStop(() => {
    routines.stopPlayer();
    stopModes();
    routinesUi.hidePlayer();
    fretboard.renderScale(state);
  });

  routinesUi.onPause(() => { routines.pausePlayer(); });
  routinesUi.onResume(() => { routines.resumePlayer(); });
  routinesUi.onSkip(() => { routines.skipStep(); });

  routines.setPlayerCallbacks({
    onStepStart({ stepIndex, totalSteps, step }) {
      applyStep(step);
      const info = routines.getPlayerInfo();
      routinesUi.showPlayer(info.routineName, step, stepIndex, totalSteps, step.duration);
      routinesUi.setPlayerButtons(true, false);
    },
    onTick({ stepIndex, totalSteps, remaining }) {
      routinesUi.updatePlayerTimer(remaining);
      const info = routines.getPlayerInfo();
      if (info && info.routine && info.routine.steps[stepIndex + 1]) {
        routinesUi.updatePlayerNext(info.routine.steps[stepIndex + 1].root + ' ' + info.routine.steps[stepIndex + 1].mode);
      }
    },
    onStepEnd() {
      stopModes();
    },
    onPaused() {
      routinesUi.setPlayerButtons(true, true);
    },
    onResumed() {
      routinesUi.setPlayerButtons(true, false);
    },
    onFinish({ totalTime, stepsCompleted, builtin }) {
      stopModes();
      const pts = builtin ? 75 : 125;
      addPointsWithToast(pts, 'routine', builtin ? 'Rutina predefinida completada' : 'Rutina personalizada completada');
      achievements.recordRoutineCompleted({ isBuiltin: !!builtin, duration: totalTime, date: new Date().toISOString() });
      achievements.checkAchievements();
      routinesUi.showPlayerResults(totalTime, stepsCompleted);
      routinesUi.setPlayerButtons(false, false);
      fretboard.renderScale(state);
    },
  });

  /* ─── Interval trainer ─── */
  itUi.init();

  intervalTrainer.setCallbacks({
    onStart() {
      const mode = state.micActive ? 'play' : 'choose';
      intervalTrainer.setMode(mode);
      itUi.renderPlaying(mode);
    },
    onRound({ root, interval, mode }) {
      itUi.showRound(noteToDisplay(root, state.notation), interval, mode);
    },
    onCorrect({ points, streak, score, interval, reactionMs }) {
      itUi.updateScore(score, streak);
      itUi.showCorrect(interval, points);
      if (reactionMs) itUi.showSpeed(reactionMs);
      if (intervalTrainer.getState().mode === 'play') itUi.showSilenceMessage('Silencia la nota...');
      addPointsWithToast(12, 'interval', 'Intervalo correcto');
      if (interval) {
        achievements.recordIntervalResult({ typesHit: [interval.name] });
      }
    },
    onWrong({ played, expected, interval }) {
      const p = played ? noteToDisplay(played, state.notation) : null;
      const e = expected ? noteToDisplay(expected, state.notation) : null;
      itUi.showWrong(interval, p, e);
      itUi.updateScore(intervalTrainer.getState().score, 0);
      if (intervalTrainer.getState().mode === 'play') itUi.showSilenceMessage('Silencia la nota...');
    },
    onSkip({ interval }) {
      itUi.showSkip(interval);
      itUi.updateScore(intervalTrainer.getState().score, 0);
      if (intervalTrainer.getState().mode === 'play') itUi.showSilenceMessage('Silencia la nota...');
    },
    onFinish(results) {
      stats.recordFlashcards(results);
      achievements.recordIntervalResult({ maxStreak: results.maxStreak });
      achievements.checkAchievements();
      statsUi.render();
      populateStatsFilter();
      itUi.showResults(results);
    },
  });

  itUi.onStart(async () => {
    if (intervalTrainer.isPlaying()) {
      const results = intervalTrainer.stop();
      if (results && results.rounds > 0) {
        stats.recordFlashcards(results);
        achievements.recordIntervalResult({ maxStreak: results.maxStreak });
        achievements.checkAchievements();
        statsUi.render();
        populateStatsFilter();
      }
      itUi.renderIdle();
      return;
    }

    if (!state.micActive) {
      intervalTrainer.setMode('choose');
    } else {
      intervalTrainer.setMode('play');
    }

    const settings = itUi.getSettings();
    intervalTrainer.setSettings(settings);
    intervalTrainer.start();
    achievements.recordSource('intervals');
  });

  itUi.onAnswer((name) => {
    intervalTrainer.answerInterval(name);
  });

  itUi.onSkip(() => {
    intervalTrainer.skipRound();
  });

  backingUi.bindStyleButtons((style) => {
    if (style === 'upload') {
      const iElapsed = practiceTime.stop('improvisation');
      const iMins = Math.floor(iElapsed / 60);
      if (iMins > 0) addPointsWithToast(iMins * 8, 'improvisation', iMins + ' min improvisación');
      const bElapsed = practiceTime.stop('backing');
      const bMins = Math.floor(bElapsed / 60);
      if (bMins > 0) addPointsWithToast(bMins * 4, 'backing', bMins + ' min pista');
      if (improvisation.isActive()) { improvisation.stop(); improUi.renderIdle(); }
      if (audioEl) {
        backing.stop();
        state.audioMode = 'file';
        state.backingActive = true;
        audioEl.play().catch(() => {});
        backingUi.setPlayIcon(true);
        practiceTime.start('backing');
      } else {
        $('#trackFile').click();
      }
      return;
    }
    const iElapsed2 = practiceTime.stop('improvisation');
    const iMins2 = Math.floor(iElapsed2 / 60);
    if (iMins2 > 0) addPointsWithToast(iMins2 * 8, 'improvisation', iMins2 + ' min improvisación');
    const bElapsed2 = practiceTime.stop('backing');
    const bMins2 = Math.floor(bElapsed2 / 60);
    if (bMins2 > 0) addPointsWithToast(bMins2 * 4, 'backing', bMins2 + ' min pista');
    if (audioEl) { audioEl.pause(); audioEl = null; }
    state.audioMode = 'generated';
    backing.stop();
    backing.setStyle(style);
    backingUi.render(backing.getState());
    autoSave();
    if (state.backingActive) {
      backing.setRootScale(state.rootNote, state.scaleType);
      backing.start();
      practiceTime.start('backing');
    }
    backingUi.setPlayIcon(state.backingActive);
  });

  backingUi.onFileChange((files) => {
    if (!files || !files[0]) return;
    backing.stop();
    const bElapsed3 = practiceTime.stop('backing');
    const bMins3 = Math.floor(bElapsed3 / 60);
    if (bMins3 > 0) addPointsWithToast(bMins3 * 4, 'backing', bMins3 + ' min pista');
    const iElapsed3 = practiceTime.stop('improvisation');
    const iMins3 = Math.floor(iElapsed3 / 60);
    if (iMins3 > 0) addPointsWithToast(iMins3 * 8, 'improvisation', iMins3 + ' min improvisación');
    if (improvisation.isActive()) { improvisation.stop(); improUi.renderIdle(); }
    if (audioEl) { audioEl.pause(); audioEl = null; }
    state.backingActive = false;
    backingUi.setPlayIcon(false);

    achievements.recordUploadedTrack();

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
        const diff = improUi.getDifficulty();
        const guided = improUi.isGuided();
        const bs = backing.getState();
        improvisation.start(state.rootNote, state.scaleType, {
          difficulty: diff,
          bpm: bs.bpm,
          guided,
          guidedSource: guided ? improUi.getGuidedSource() : 'chord',
          guidedSpeed: guided ? improUi.getGuidedSpeed() : 'bar',
        });
        achievements.recordSource('improvisation');
        practiceTime.start('improvisation');
        improUi.renderActive('\u2014');
        const tl3 = backing.getTimelineData();
        improUi.renderTimeline(tl3.bars, tl3.current, state.notation);
      } else {
        improUi.renderActive('\u2014', false);
      }
    } else {
      if (improvisation.isActive()) {
        const results = improvisation.stop();
        const iElapsed4 = practiceTime.stop('improvisation');
        const iMins4 = Math.floor(iElapsed4 / 60);
        if (iMins4 > 0) addPointsWithToast(iMins4 * 8, 'improvisation', iMins4 + ' min improvisaci\u00f3n');
        if (results) {
          achievements.recordImprovisationResult({
            difficulty: results.difficulty,
            guided: results.guided,
            maxStreak: results.maxStreak,
            style: backing.getState().style,
            durationSec: results.duration,
          });
          stats.recordImprovisation(results);
          statsUi.render();
          populateStatsFilter();
        }
        improUi.renderResults(results);
        fretboard.clearTarget();
        fretboard.renderScale(state);
        improvisationState.chordTones = null;
        improvisationState.scaleNotes = null;
      }
    }
  });

  if ($('#improGuided')) {
    $('#improGuided').addEventListener('change', () => {
      improUi.updateGuidedConfigVisibility();
      if (improvisation.isActive()) {
        const guided = improUi.isGuided();
        const bs = backing.getState();
        improvisation.setGuided(guided, improUi.getGuidedSource(), improUi.getGuidedSpeed(), bs.bpm);
        if (!guided) {
          fretboard.clearTarget();
          improUi.hideTarget();
        }
      }
    });
    $('#improGuidedSource').addEventListener('change', () => {
      if (improvisation.isActive() && improUi.isGuided()) {
        const bs = backing.getState();
        improvisation.setGuided(true, improUi.getGuidedSource(), improUi.getGuidedSpeed(), bs.bpm);
      }
    });
    $('#improGuidedSpeed').addEventListener('change', () => {
      if (improvisation.isActive() && improUi.isGuided()) {
        const bs = backing.getState();
        improvisation.setGuided(true, improUi.getGuidedSource(), improUi.getGuidedSpeed(), bs.bpm);
      }
    });
  }

  if ($('#improDifficulty')) {
    $('#improDifficulty').addEventListener('change', () => {
      improUi.updateDiffDescription();
    });
    improUi.updateDiffDescription();
  }

  if ($('#improResultClose')) {
    $('#improResultClose').addEventListener('click', () => {
      improUi.renderIdle();
    });
  }
}
