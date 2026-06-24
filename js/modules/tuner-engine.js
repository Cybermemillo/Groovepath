import { getAudioContext } from './audio-engine.js';
import { midiToNote } from './theory.js';

let audioCtx    = null;
let analyser    = null;
let sourceNode  = null;
let lowpassNode = null;
let mediaStream = null;
let rafId       = null;
let buffer      = null;
let corrBuf     = null;

let callbacks     = {};
let lastPitchNote = null;
let noteHistory   = [];
let silenceFrames = 0;
let detectSkip    = 0;

const DETECT_INTERVAL  = 2;       // detect every 2nd rAF (~30 fps)
const HISTORY_SIZE     = 6;       // note history for mode filter
const SILENCE_FRAMES   = 6;       // frames before triggering silence
const RMS_THRESHOLD    = 0.01;    // slightly lower for faster response

export function setCallbacks({ onPitch, onSilence }) {
  callbacks = { onPitch, onSilence };
}

export async function startMic() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    audioCtx     = getAudioContext();
    analyser     = audioCtx.createAnalyser();
    analyser.fftSize = 4096;

    lowpassNode = audioCtx.createBiquadFilter();
    lowpassNode.type = 'lowpass';
    lowpassNode.frequency.setValueAtTime(250, audioCtx.currentTime);
    lowpassNode.Q.setValueAtTime(0.5, audioCtx.currentTime);

    sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    sourceNode.connect(lowpassNode);
    lowpassNode.connect(analyser);

    buffer  = new Float32Array(analyser.fftSize);
    corrBuf = new Float32Array(analyser.fftSize);

    lastPitchNote = null;
    noteHistory   = [];
    silenceFrames = 0;
    detectSkip    = 0;
    loop();
    return { success: true };
  } catch (err) {
    console.error('Error al acceder al micrófono:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'denied', message: 'Permiso de micrófono denegado. Actívalo en los permisos del navegador y recarga.' };
    }
    if (err.name === 'NotFoundError') {
      return { success: false, error: 'notfound', message: 'No se ha detectado ningún micrófono. Conecta uno y vuelve a intentarlo.' };
    }
    return { success: false, error: 'unknown', message: err.message || 'Error desconocido al acceder al micrófono.' };
  }
}

export function stopMic() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
  if (lowpassNode) { lowpassNode.disconnect(); lowpassNode = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  lastPitchNote = null;
  noteHistory   = [];
}

function loop() {
  rafId = requestAnimationFrame(loop);
  detectSkip++;
  if (detectSkip < DETECT_INTERVAL) return;
  detectSkip = 0;

  analyser.getFloatTimeDomainData(buffer);
  const freq = detectFrequency(buffer, audioCtx.sampleRate);

  if (freq > 20 && freq < 2000) {
    const { midi, cents } = freqToMidi(freq);
    const note = midiToNote(midi);

    noteHistory.push(note);
    if (noteHistory.length > HISTORY_SIZE) noteHistory.shift();
    silenceFrames = 0;

    const currentNote = modeOf(noteHistory);
    const changed = currentNote !== lastPitchNote;

    if (changed || lastPitchNote === null) {
      lastPitchNote = currentNote;
      if (callbacks.onPitch) {
        callbacks.onPitch({ note: currentNote, midi, freq, cents, changed: true });
      }
    } else if (callbacks.onPitch) {
      callbacks.onPitch({ note: currentNote, midi, freq, cents, changed: false });
    }
  } else {
    if (lastPitchNote !== null) {
      silenceFrames++;
      if (silenceFrames >= SILENCE_FRAMES) {
        lastPitchNote = null;
        noteHistory = [];
        if (callbacks.onSilence) callbacks.onSilence();
      }
    }
  }
}

function modeOf(arr) {
  const counts = {};
  let max = 0, best = arr[0];
  for (let i = 0; i < arr.length; i++) {
    const n = arr[i];
    counts[n] = (counts[n] || 0) + 1;
    if (counts[n] > max) { max = counts[n]; best = n; }
  }
  return best;
}

function detectFrequency(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < RMS_THRESHOLD) return -1;

  corrBuf.fill(0);
  for (let i = 0; i < SIZE; i++) {
    let sum = 0;
    const limit = SIZE - i;
    for (let j = 0; j < limit; j++) {
      sum += buf[j] * buf[j + i];
    }
    corrBuf[i] = sum;
  }

  let d = 0;
  while (d < SIZE - 1 && corrBuf[d] > corrBuf[d + 1]) d++;

  let maxVal = -1, maxPos = -1;
  for (let i = d; i < SIZE; i++) {
    if (corrBuf[i] > maxVal) { maxVal = corrBuf[i]; maxPos = i; }
  }

  if (corrBuf[0] === 0) return -1;
  const clarity = maxVal / corrBuf[0];
  if (clarity < 0.4) return -1;

  const subPeriod = Math.floor(maxPos * 2);
  if (subPeriod < SIZE) {
    const win2 = Math.floor(maxPos * 0.1);
    let subMax = -1, subPos = -1;
    const start = Math.max(d, subPeriod - win2);
    const end   = Math.min(SIZE - 1, subPeriod + win2);
    for (let i = start; i <= end; i++) {
      if (corrBuf[i] > subMax) { subMax = corrBuf[i]; subPos = i; }
    }
    if (subMax > (maxVal * 0.5)) maxPos = subPos;
  }

  let T0 = maxPos;
  if (T0 > 0 && T0 < SIZE - 1) {
    const x1 = corrBuf[T0 - 1], x2 = corrBuf[T0], x3 = corrBuf[T0 + 1];
    const denom = 2 * (x1 - 2 * x2 + x3);
    if (denom !== 0) T0 = T0 + (x1 - x3) / denom;
  }

  return sampleRate / T0;
}

function freqToMidi(freq) {
  const midi    = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  const cents   = (midi - rounded) * 100;
  return { midi: rounded, cents };
}
