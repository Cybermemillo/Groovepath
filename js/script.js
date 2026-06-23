/* =====================================================
   BassLab — script.js
   Módulos: Music Theory · Fretboard · Tuner (Web Audio API)
   ===================================================== */

'use strict';

/* ─────────────────────────────────────────────────────────
   1. MUSIC THEORY
   Constantes y helpers para notas, escalas e intervalos
───────────────────────────────────────────────────────── */

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const ENHARMONICS = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
};

/** Intervalos (semitonos) de cada tipo de escala */
const SCALES = {
  minor_pentatonic: [0, 3, 5, 7, 10],
  major_pentatonic: [0, 2, 4, 7, 9],
  major:            [0, 2, 4, 5, 7, 9, 11],
  minor:            [0, 2, 3, 5, 7, 8, 10],
  blues:            [0, 3, 5, 6, 7, 10],
  dorian:           [0, 2, 3, 5, 7, 9, 10],
  mixolydian:       [0, 2, 4, 5, 7, 9, 10],
  phrygian:         [0, 1, 3, 5, 7, 8, 10],
  lydian:           [0, 2, 4, 6, 7, 9, 11],
  locrian:          [0, 1, 3, 5, 6, 8, 10],
};

/** Afinaciones estándar (nota MIDI del traste 0 de cada cuerda) */
const TUNINGS = {
  standard:   [43, 38, 33, 28],  // G3 D3 A2 E2
  drop_d:     [43, 38, 33, 26],  // G3 D3 A2 D2
  d_standard: [41, 36, 31, 26],  // F3 C3 G2 D2
};

const TUNING_LABELS = {
  standard:   ['G', 'D', 'A', 'E'],
  drop_d:     ['G', 'D', 'A', 'D'],
  d_standard: ['F', 'C', 'G', 'D'],
};

/** Trastes con marcadores visuales */
const MARKER_FRETS   = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_MARKERS = [12, 24];
const ALL_MARKERS    = new Set([...MARKER_FRETS, ...DOUBLE_MARKERS]);

const NUM_FRETS   = 24;
const NUM_STRINGS = 4;

/** Devuelve el nombre de nota a partir de un número MIDI */
function midiToNote(midi) {
  return NOTES[midi % 12];
}

/** Devuelve el índice de nota en NOTES */
function noteIndex(note) {
  return NOTES.indexOf(note);
}

/** Calcula las notas pertenecientes a la escala */
function getScaleNotes(root, scaleType) {
  const rootIdx = noteIndex(root);
  const intervals = SCALES[scaleType] || [];
  return intervals.map(i => NOTES[(rootIdx + i) % 12]);
}

/** Obtiene la frecuencia de referencia para una nota MIDI */
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/* ─────────────────────────────────────────────────────────
   2. STATE — único objeto de estado de la aplicación
───────────────────────────────────────────────────────── */

const state = {
  rootNote:    'A',
  scaleType:   'minor_pentatonic',
  tuning:      'standard',
  showAllNotes: true,
  darkMode:    true,
  // Audio
  micActive:   false,
  detectedNote: null,
  detectedMidi: null,
  detectedCents: 0,
  detectedFreq:  0,
};

/* ─────────────────────────────────────────────────────────
   3. FRETBOARD RENDERER
───────────────────────────────────────────────────────── */

const fretboard  = document.getElementById('fretboard');
const fretNumbers = document.getElementById('fretNumbers');

/**
 * Construye la grilla del diapasón.
 * Crea las celdas de cada traste × cuerda, la línea de cuerda
 * y los marcadores de posición.
 */
function buildFretboard() {
  fretboard.innerHTML = '';
  fretNumbers.innerHTML = '';

  const tuningMidi   = TUNINGS[state.tuning];
  const tuningLabels = TUNING_LABELS[state.tuning];

  for (let string = 0; string < NUM_STRINGS; string++) {
    for (let fret = 0; fret <= NUM_FRETS; fret++) {
      const cell = document.createElement('div');
      cell.classList.add('fret-cell', `string-row-${string}`);
      cell.dataset.string = string;
      cell.dataset.fret   = fret;

      const midi = tuningMidi[string] + fret;
      const noteName = midiToNote(midi);
      const octave   = Math.floor(midi / 12) - 1;
      cell.dataset.note   = noteName;
      cell.dataset.midi   = midi;
      cell.dataset.octave = octave;

      // Traste 0 = cejilla (nut)
      if (fret === 0) {
        cell.classList.add('nut');
        cell.textContent = tuningLabels[string];
      } else {
        // Línea de cuerda
        const stringLine = document.createElement('div');
        stringLine.className = 'string-line';
        cell.appendChild(stringLine);

        // Marcadores de diapasón (sólo en la última cuerda visualmente)
        // Los ponemos en la celda central del diapasón (entre cuerdas 2 y 3)
        if (string === 3) {
          if (MARKER_FRETS.includes(fret)) {
            const m = document.createElement('div');
            m.className = 'fret-marker';
            cell.appendChild(m);
          }
          if (DOUBLE_MARKERS.includes(fret)) {
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

        // Nota dot
        const dot = document.createElement('div');
        dot.className = 'note-dot';
        dot.dataset.dotNote   = noteName;
        dot.dataset.dotString = string;
        dot.dataset.dotFret   = fret;
        dot.textContent = noteName;
        cell.appendChild(dot);
      }

      // Tooltip al hover
      cell.addEventListener('mouseenter', (e) => showTooltip(e, noteName, octave));
      cell.addEventListener('mouseleave', hideTooltip);

      fretboard.appendChild(cell);
    }
  }

  // Fila de números de traste
  // Columna vacía para el nut
  const nutNum = document.createElement('div');
  nutNum.className = 'fret-num';
  fretNumbers.appendChild(nutNum);

  for (let fret = 1; fret <= NUM_FRETS; fret++) {
    const num = document.createElement('div');
    num.className = 'fret-num';
    if (ALL_MARKERS.has(fret)) num.classList.add('marker-fret');
    num.textContent = fret;
    fretNumbers.appendChild(num);
  }

  renderScale();
}

/**
 * Actualiza la visualización de los dots según la escala seleccionada
 * y (si hay nota detectada) resalta esas posiciones.
 */
function renderScale() {
  const scaleNotes  = getScaleNotes(state.rootNote, state.scaleType);
  const rootNote    = state.rootNote;
  const detectedNote = state.detectedNote;
  const showAll     = state.showAllNotes;

  const dots = fretboard.querySelectorAll('.note-dot');
  dots.forEach(dot => {
    const note   = dot.dataset.dotNote;
    const isRoot = note === rootNote;
    const inScale = scaleNotes.includes(note);
    const isDetected = detectedNote && note === detectedNote;

    // Elimina clases de estado anteriores
    dot.classList.remove('tonic', 'scale-note', 'off-scale', 'visible', 'detected');

    if (isDetected) {
      dot.classList.add('detected', 'visible');
    } else if (isRoot) {
      dot.classList.add('tonic', 'visible');
    } else if (inScale) {
      dot.classList.add('scale-note', 'visible');
    } else if (showAll) {
      dot.classList.add('off-scale', 'visible');
    }
  });
}

/* ─────────────────────────────────────────────────────────
   4. TOOLTIP
───────────────────────────────────────────────────────── */

const tooltip = document.getElementById('noteTooltip');

function showTooltip(e, note, octave) {
  const enharmonic = ENHARMONICS[note] ? ` / ${ENHARMONICS[note]}` : '';
  tooltip.textContent = `${note}${enharmonic}  (oct. ${octave})`;
  tooltip.style.display = 'block';
  moveTooltip(e);
}

function moveTooltip(e) {
  tooltip.style.left = (e.clientX + 14) + 'px';
  tooltip.style.top  = (e.clientY - 28) + 'px';
}

function hideTooltip() {
  tooltip.style.display = 'none';
}

document.addEventListener('mousemove', (e) => {
  if (tooltip.style.display === 'block') moveTooltip(e);
});

/* ─────────────────────────────────────────────────────────
   5. UI CONTROLS — root note, scale, tuning, toggle, theme
───────────────────────────────────────────────────────── */

/** Genera los botones de selección de nota raíz */
function buildRootNoteGrid() {
  const grid = document.getElementById('rootNoteGrid');
  grid.innerHTML = '';
  NOTES.forEach(note => {
    const btn = document.createElement('button');
    btn.className = 'note-btn' + (note === state.rootNote ? ' active' : '');
    btn.textContent = note;
    btn.dataset.note = note;
    btn.setAttribute('aria-label', `Nota raíz ${note}`);
    btn.addEventListener('click', () => {
      state.rootNote = note;
      grid.querySelectorAll('.note-btn').forEach(b => b.classList.toggle('active', b.dataset.note === note));
      renderScale();
    });
    grid.appendChild(btn);
  });
}

/** Escucha cambios del selector de escala */
document.getElementById('scaleSelect').addEventListener('change', (e) => {
  state.scaleType = e.target.value;
  renderScale();
});

/** Escucha cambios de afinación */
document.getElementById('tuningSelect').addEventListener('change', (e) => {
  state.tuning = e.target.value;
  buildFretboard();   // reconstruye todo con la nueva afinación
});

/** Toggle mostrar todas las notas */
document.getElementById('showAllNotes').addEventListener('change', (e) => {
  state.showAllNotes = e.target.checked;
  renderScale();
});

/** Toggle modo oscuro/claro */
document.getElementById('themeToggle').addEventListener('click', () => {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark',  state.darkMode);
  document.body.classList.toggle('light', !state.darkMode);
  document.getElementById('themeIconDark').style.display  = state.darkMode  ? '' : 'none';
  document.getElementById('themeIconLight').style.display = state.darkMode  ? 'none' : '';
});

/* ─────────────────────────────────────────────────────────
   6. PITCH DETECTION — Web Audio API (Optimizada para Bajo)
───────────────────────────────────────────────────────── */

let audioCtx       = null;
let analyser       = null;
let sourceNode     = null;
let lowpassNode    = null;
let mediaStream    = null;
let rafId          = null;
let buffer         = null;

/** Inicia la captura de audio y el bucle de análisis */
async function startMic() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser  = audioCtx.createAnalyser();
    
    // 1. Ampliamos la ventana a ~170ms para capturar bien las ondas graves
    analyser.fftSize = 8192; 

    // 2. Creamos un filtro Paso-Bajo para atenuar el trasteo y los brillos
    lowpassNode = audioCtx.createBiquadFilter();
    lowpassNode.type = 'lowpass';
    lowpassNode.frequency.setValueAtTime(250, audioCtx.currentTime); 
    lowpassNode.Q.setValueAtTime(0.5, audioCtx.currentTime); 

    sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    
    // Cadena: Micrófono ──> Filtro ──> Analizador
    sourceNode.connect(lowpassNode);
    lowpassNode.connect(analyser);

    buffer = new Float32Array(analyser.fftSize);

    setMicUI(true);
    detectPitch();
  } catch (err) {
    console.error('Error al acceder al micrófono:', err);
    setMicUI(false);
    document.getElementById('micStatusText').textContent = 'Sin acceso al micrófono';
  }
}

/** Detiene la captura */
function stopMic() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
  if (lowpassNode) { lowpassNode.disconnect(); lowpassNode = null; }
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }

  state.detectedNote  = null;
  state.detectedMidi  = null;
  state.detectedFreq  = 0;
  state.detectedCents = 0;

  setMicUI(false);
  updateTunerDisplay(null, 0, 0);
  renderScale();
}

/** Actualiza la UI del botón/estado del micrófono */
function setMicUI(active) {
  state.micActive = active;
  const btn  = document.getElementById('micToggle');
  const dot  = document.getElementById('micDot');
  const text = document.getElementById('micStatusText');
  const label = document.getElementById('micLabel');

  btn.classList.toggle('active', active);
  dot.classList.toggle('active', active);
  text.textContent  = active ? 'Escuchando...' : 'Micrófono inactivo';
  label.textContent = active ? 'Detener micrófono' : 'Activar micrófono';
}

document.getElementById('micToggle').addEventListener('click', () => {
  state.micActive ? stopMic() : startMic();
});

/* ─── Algoritmo ACF2+ Modificado para Frecuencias Graves ─── */

function detectFrequency(buf, sampleRate) {
  const SIZE  = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.012) return -1; // Silencio

  const corr = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      corr[i] += buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (d < SIZE && corr[d] > corr[d + 1]) d++;

  let maxVal = -1, maxPos = -1;
  for (let i = d; i < SIZE; i++) {
    if (corr[i] > maxVal) { maxVal = corr[i]; maxPos = i; }
  }

  if (corr[0] === 0) return -1;

  // CORRECCIÓN A: Bajamos la exigencia de claridad de 0.90 a 0.45
  const clarity = maxVal / corr[0];
  if (clarity < 0.45) return -1;

  // CORRECCIÓN B: Verificación de Sub-Armónico (Anti-Octave Lock)
  // Miramos si existe un pico decente exactamente al doble de distancia (mitad de frecuencia)
  const subPeriod = Math.floor(maxPos * 2);
  if (subPeriod < SIZE) {
    const window = Math.floor(maxPos * 0.1); // Margen de búsqueda de ±10%
    let subMaxVal = -1, subMaxPos = -1;
    
    const startIdx = Math.max(d, subPeriod - window);
    const endIdx   = Math.min(SIZE - 1, subPeriod + window);

    for (let i = startIdx; i <= endIdx; i++) {
      if (corr[i] > subMaxVal) { subMaxVal = corr[i]; subMaxPos = i; }
    }

    // Si el pico lejano tiene al menos un 55% de la fuerza del armónico, ES la fundamental
    if (subMaxVal > (maxVal * 0.55)) {
      maxPos = subMaxPos;
    }
  }

  // Interpolación parabólica
  let T0 = maxPos;
  if (T0 > 0 && T0 < SIZE - 1) {
    const x1 = corr[T0 - 1], x2 = corr[T0], x3 = corr[T0 + 1];
    T0 = T0 + (x1 - x3) / (2 * (x1 - 2 * x2 + x3));
  }

  return sampleRate / T0;
}

function freqToMidi(freq) {
  const midi  = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  const cents   = (midi - rounded) * 100;
  return { midi: rounded, cents };
}

function detectPitch() {
  rafId = requestAnimationFrame(detectPitch);

  analyser.getFloatTimeDomainData(buffer);
  const freq = detectFrequency(buffer, audioCtx.sampleRate);

  if (freq > 20 && freq < 2000) {
    const { midi, cents } = freqToMidi(freq);
    const note = midiToNote(midi);

    if (note !== state.detectedNote || Math.abs(cents - state.detectedCents) > 1) {
      state.detectedNote  = note;
      state.detectedMidi  = midi;
      state.detectedCents = cents;
      state.detectedFreq  = freq;
      updateTunerDisplay(note, freq, cents);
      renderScale();
    }
  } else {
    if (state.detectedNote !== null) {
      state.detectedNote  = null;
      state.detectedMidi  = null;
      state.detectedCents = 0;
      state.detectedFreq  = 0;
      updateTunerDisplay(null, 0, 0);
      renderScale();
    }
  }
}

/* ─────────────────────────────────────────────────────────
   7. TUNER UI
───────────────────────────────────────────────────────── */

const detectedNoteEl = document.getElementById('detectedNote');
const detectedOctave = document.getElementById('detectedOctave');
const tunerFreqEl    = document.getElementById('tunerFreq');
const tunerStatus    = document.getElementById('tunerStatus');
const meterNeedle    = document.getElementById('meterNeedle');
const meterFill      = document.getElementById('meterFill');

/**
 * Actualiza el display del afinador:
 * nota, frecuencia, indicador de cents y aguja.
 */
function updateTunerDisplay(note, freq, cents) {
  if (!note) {
    detectedNoteEl.textContent = '—';
    detectedOctave.textContent = '';
    tunerFreqEl.textContent    = '— Hz';
    tunerStatus.textContent    = '—';
    tunerStatus.className      = 'tuner-status';
    meterNeedle.style.left     = '50%';
    meterFill.style.width      = '0';
    meterFill.className        = 'meter-fill';
    return;
  }

  // Nombre y octava
  const octave = state.detectedMidi !== null ? Math.floor(state.detectedMidi / 12) - 1 : '';
  detectedNoteEl.textContent = note;
  detectedOctave.textContent = `oct. ${octave}`;
  tunerFreqEl.textContent    = `${freq.toFixed(1)} Hz`;

  // Cents → posición de aguja (0%=bajo, 50%=centro, 100%=alto)
  // Rango visual: ±50 cents
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const needlePos    = 50 + clampedCents;  // %

  meterNeedle.style.left = `${needlePos}%`;

  // Fill del medidor
  const absCents = Math.abs(clampedCents);
  meterFill.style.left   = cents >= 0 ? '50%' : `${needlePos}%`;
  meterFill.style.width  = `${absCents}%`;

  // Estado: afinado ±8 cents
  if (absCents <= 8) {
    tunerStatus.textContent = '✓ Afinado';
    tunerStatus.className   = 'tuner-status in-tune';
    meterFill.className     = 'meter-fill in-tune';
  } else if (cents < 0) {
    tunerStatus.textContent = '▼ Bajo';
    tunerStatus.className   = 'tuner-status flat';
    meterFill.className     = 'meter-fill flat';
  } else {
    tunerStatus.textContent = '▲ Alto';
    tunerStatus.className   = 'tuner-status sharp';
    meterFill.className     = 'meter-fill sharp';
  }
}

/* ─────────────────────────────────────────────────────────
   8. INIT — arranca la aplicación
───────────────────────────────────────────────────────── */

function init() {
  buildRootNoteGrid();
  buildFretboard();

  // Aplica tema inicial
  document.body.classList.add('dark');
  document.getElementById('themeIconDark').style.display  = '';
  document.getElementById('themeIconLight').style.display = 'none';
}

init();
