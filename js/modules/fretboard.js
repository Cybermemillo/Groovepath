import {
  TUNINGS, TUNING_LABELS,
  MARKER_FRETS, DOUBLE_MARKERS, ALL_MARKERS,
  NUM_FRETS, NUM_STRINGS,
} from './constants.js';
import { midiToNote, getScaleNotes, getArpeggioNotes } from './theory.js';
import { noteToDisplay } from './constants.js';
import { showTooltip, hideTooltip } from './tooltip.js';
import * as synth from './synth.js';
import { $ } from '../utils/dom.js';

let dotsCache = [];
let targetNote = null;

export function buildFretboard(state) {
  const board = $('#fretboard');
  const nums  = $('#fretNumbers');

  board.innerHTML = '';
  nums.innerHTML  = '';

  const tuningMidi = state.customTuningMidi
    ? state.customTuningMidi
    : TUNINGS[state.tuning];
  const tuningLabels = state.customTuningLabels
    ? state.customTuningLabels
    : TUNING_LABELS[state.tuning];

  for (let s = 0; s < NUM_STRINGS; s++) {
    for (let f = 0; f <= NUM_FRETS; f++) {
      const cell = document.createElement('div');
      cell.classList.add('fret-cell', `string-row-${s}`);
      cell.dataset.string = s;
      cell.dataset.fret   = f;

      const midi     = tuningMidi[s] + f;
      const noteName = midiToNote(midi);
      const octave   = Math.floor(midi / 12) - 1;
      cell.dataset.note   = noteName;
      cell.dataset.midi   = midi;
      cell.dataset.octave = octave;

      if (f === 0) {
        cell.classList.add('nut');
        cell.textContent = tuningLabels[s];
      } else {
        const stringLine = document.createElement('div');
        stringLine.className = 'string-line';
        cell.appendChild(stringLine);

        if (s === 3) {
          if (MARKER_FRETS.includes(f)) {
            const m = document.createElement('div');
            m.className = 'fret-marker';
            cell.appendChild(m);
          }
          if (DOUBLE_MARKERS.includes(f)) {
            const m1 = document.createElement('div');
            m1.className = 'fret-marker double';
            const m2 = document.createElement('div');
            m2.className = 'fret-marker double';
            m1.style.bottom = '5px';
            m1.style.left   = '30%';
            m2.style.bottom = '5px';
            m2.style.left   = '70%';
            cell.appendChild(m1);
            cell.appendChild(m2);
          }
        }

        const dot = document.createElement('div');
        dot.className = 'note-dot';
        dot.dataset.dotNote   = noteName;
        dot.dataset.dotString = s;
        dot.dataset.dotFret   = f;
        dot.innerHTML = '<span class="dot-text">' + noteName + '</span>';
        cell.appendChild(dot);
      }

      cell.addEventListener('mouseenter', (e) => {
        const n = noteToDisplay(noteName, state.notation || 'english');
        showTooltip(e, n, octave);
      });
      cell.addEventListener('mouseleave', hideTooltip);

      if (f > 0) {
        cell.addEventListener('click', () => {
          synth.playNote(midi);
          const dot = cell.querySelector('.note-dot');
          if (dot) {
            dot.classList.add('playing');
            setTimeout(() => dot.classList.remove('playing'), 220);
          }
        });
      }

      board.appendChild(cell);
    }
  }

  const nutNum = document.createElement('div');
  nutNum.className = 'fret-num';
  nums.appendChild(nutNum);

  for (let f = 1; f <= NUM_FRETS; f++) {
    const num = document.createElement('div');
    num.className = 'fret-num';
    if (ALL_MARKERS.has(f)) num.classList.add('marker-fret');
    num.textContent = f;
    nums.appendChild(num);
  }

  dotsCache = Array.from(board.querySelectorAll('.note-dot'));
  renderScale(state);
  applyFretRange(state);
}

export function renderScale(state) {
  const scaleNotes   = getScaleNotes(state.rootNote, state.scaleType);
  const arpeggio     = getArpeggioNotes(state.rootNote, state.arpeggioType);
  const rootNote     = state.rootNote;
  const detectedNote = state.detectedNote;
  const showAll      = state.showAllNotes;
  const showNames    = state.showNoteNames;
  const fretFrom     = state.fretFrom;
  const fretTo       = state.fretTo;
  const soloArpeggio = state.soloArpeggio;
  const notation     = state.notation || 'english';

  dotsCache.forEach(dot => {
    const note     = dot.dataset.dotNote;
    const fret     = parseInt(dot.dataset.dotFret);
    const textSpan = dot.querySelector('.dot-text');

    if (fret < fretFrom || fret > fretTo) {
      dot.className = 'note-dot';
      return;
    }

    const isArpeggio = arpeggio && arpeggio.notes.includes(note);

    if (soloArpeggio && !isArpeggio) {
      dot.className = 'note-dot';
      return;
    }

    if (textSpan) {
      textSpan.textContent = isArpeggio
        ? arpeggio.degrees[note]
        : (showNames ? noteToDisplay(note, notation) : '');
    }

    const isRoot     = note === rootNote;
    const inScale    = scaleNotes.includes(note);
    const isDetected = detectedNote && note === detectedNote;

    let cls = 'note-dot';

    if (isDetected) cls += ' detected';
    if (isArpeggio) cls += ' arpeggio';
    else if (isRoot) cls += ' tonic';
    else if (inScale) cls += ' scale-note';
    else if (showAll) cls += ' off-scale';

    if (isDetected || isArpeggio || isRoot || inScale || showAll) {
      cls += ' visible';
    }

    dot.className = cls;
    if (targetNote && note === targetNote) dot.classList.add('target');
  });
}

export function applyFretRange(state) {
  const board = $('#fretboard');
  const nums  = $('#fretNumbers');
  const { fretFrom, fretTo } = state;

  board.querySelectorAll('.fret-cell').forEach(cell => {
    const fret = parseInt(cell.dataset.fret);
    cell.classList.toggle('off-range', fret > 0 && (fret < fretFrom || fret > fretTo));
  });

  nums.querySelectorAll('.fret-num').forEach((num, i) => {
    num.classList.toggle('off-range', i > 0 && (i < fretFrom || i > fretTo));
  });
}

export function highlightTarget(note) {
  clearTarget();
  targetNote = note;
  dotsCache.forEach(dot => {
    if (dot.dataset.dotNote === note) {
      dot.classList.add('target');
    }
  });
}

export function clearTarget() {
  targetNote = null;
  dotsCache.forEach(dot => dot.classList.remove('target', 'target-hit'));
}

export function pulseTarget(note) {
  dotsCache.forEach(dot => {
    if (dot.dataset.dotNote === note) {
      dot.classList.remove('target-hit');
      void dot.offsetWidth;
      dot.classList.add('target-hit');
      setTimeout(() => dot.classList.remove('target-hit'), 600);
    }
  });
}

let guidedTargetNote = null;

export function highlightGuidedTarget(note) {
  clearGuidedTarget();
  if (!note) return;
  guidedTargetNote = note;
  dotsCache.forEach(dot => {
    if (dot.dataset.dotNote === note) {
      dot.classList.add('guided-target');
    }
  });
}

export function clearGuidedTarget() {
  guidedTargetNote = null;
  dotsCache.forEach(dot => dot.classList.remove('guided-target'));
}

export function clearImprovisation() {
  dotsCache.forEach(dot => {
    dot.classList.remove('chord-tone', 'scale-passing', 'out-scale', 'visible', 'guided-target');
    dot.style.opacity = '';
  });
  guidedTargetNote = null;
}

export function renderImprovisation(state, chordTones, scaleNotes, degreeMap) {
  const detectedNote = state.detectedNote;
  const showFunctions = state.showChordFunctions && degreeMap;

  dotsCache.forEach(dot => {
    const note = dot.dataset.dotNote;
    const fret = parseInt(dot.dataset.dotFret);
    const textSpan = dot.querySelector('.dot-text');
    const notation = state.notation || 'english';
    const showNames = state.showNoteNames;

    if (fret < state.fretFrom || fret > state.fretTo) {
      dot.className = 'note-dot';
      return;
    }

    const isDetected = detectedNote && note === detectedNote;
    const inChord = chordTones && chordTones.includes(note);
    const inScale = scaleNotes && scaleNotes.includes(note);

    if (textSpan) {
      if (showFunctions && inChord && degreeMap[note]) {
        textSpan.textContent = degreeMap[note];
      } else {
        textSpan.textContent = showNames ? noteToDisplay(note, notation) : '';
      }
    }

    let cls = 'note-dot';

    if (isDetected) cls += ' detected';
    if (inChord) {
      cls += ' chord-tone visible';
    } else if (inScale) {
      cls += ' scale-passing visible';
    } else if (state.showAllNotes) {
      cls += ' out-scale visible';
    }

    if (targetNote && note === targetNote) cls += ' target';

    dot.className = cls;
  });
}

export function renderHeatmap(state, notePerformance) {
  const perf = notePerformance || {};
  let maxPlays = 0;
  for (const k of Object.keys(perf)) {
    const total = (perf[k].correct || 0) + (perf[k].wrong || 0);
    if (total > maxPlays) maxPlays = total;
  }
  dotsCache.forEach(dot => {
    const note = dot.dataset.dotNote;
    const fret = parseInt(dot.dataset.dotFret);

    if (fret < state.fretFrom || fret > state.fretTo) {
      dot.className = 'note-dot';
      return;
    }

    const p = perf[note];
    let cls = 'note-dot';
    if (!p) {
      cls += ' heatmap-miss';
    } else {
      const total = (p.correct || 0) + (p.wrong || 0);
      const acc = total > 0 ? p.correct / total : 0;
      if (acc >= 0.85) cls += ' heatmap-hot';
      else if (acc >= 0.6) cls += ' heatmap-warm';
      else cls += ' heatmap-cold';
    }
    dot.className = cls;
  });
  guidedTargetNote = null;
  targetNote = null;
}
