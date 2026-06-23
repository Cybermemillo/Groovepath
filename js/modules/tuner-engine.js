import { getAudioContext } from './audio-engine.js';
import { midiToNote } from './theory.js';

let audioCtx    = null;
let analyser    = null;
let sourceNode  = null;
let lowpassNode = null;
let mediaStream = null;
let rafId       = null;
let buffer      = null;

let callbacks     = {};
let lastPitchNote = null;
let smoothCents   = 0;

export function setCallbacks({ onPitch, onSilence }) {
  callbacks = { onPitch, onSilence };
}

export async function startMic() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    audioCtx     = getAudioContext();
    analyser     = audioCtx.createAnalyser();
    analyser.fftSize = 8192;

    lowpassNode = audioCtx.createBiquadFilter();
    lowpassNode.type = 'lowpass';
    lowpassNode.frequency.setValueAtTime(250, audioCtx.currentTime);
    lowpassNode.Q.setValueAtTime(0.5, audioCtx.currentTime);

    sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    sourceNode.connect(lowpassNode);
    lowpassNode.connect(analyser);

    buffer = new Float32Array(analyser.fftSize);

    lastPitchNote = null;
    smoothCents   = 0;
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
  if (rafId) { clearTimeout(rafId); rafId = null; }
  if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
  if (lowpassNode) { lowpassNode.disconnect(); lowpassNode = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  lastPitchNote = null;
  smoothCents   = 0;
}

function loop() {
  rafId = setTimeout(loop, 100);

  analyser.getFloatTimeDomainData(buffer);
  const freq = detectFrequency(buffer, audioCtx.sampleRate);

  if (freq > 20 && freq < 2000) {
    const { midi, cents } = freqToMidi(freq);
    const note = midiToNote(midi);

    smoothCents = (lastPitchNote === note)
      ? smoothCents * 0.7 + cents * 0.3
      : cents;

    const changed = note !== lastPitchNote;
    lastPitchNote = note;

    if (callbacks.onPitch) {
      callbacks.onPitch({ note, midi, freq, cents: smoothCents, changed });
    }
  } else {
    if (lastPitchNote !== null) {
      lastPitchNote = null;
      smoothCents   = 0;
      if (callbacks.onSilence) callbacks.onSilence();
    }
  }
}

function detectFrequency(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.012) return -1;

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

  const clarity = maxVal / corr[0];
  if (clarity < 0.45) return -1;

  const subPeriod = Math.floor(maxPos * 2);
  if (subPeriod < SIZE) {
    const window = Math.floor(maxPos * 0.1);
    let subMaxVal = -1, subMaxPos = -1;

    const startIdx = Math.max(d, subPeriod - window);
    const endIdx   = Math.min(SIZE - 1, subPeriod + window);

    for (let i = startIdx; i <= endIdx; i++) {
      if (corr[i] > subMaxVal) { subMaxVal = corr[i]; subMaxPos = i; }
    }

    if (subMaxVal > (maxVal * 0.55)) {
      maxPos = subMaxPos;
    }
  }

  let T0 = maxPos;
  if (T0 > 0 && T0 < SIZE - 1) {
    const x1 = corr[T0 - 1], x2 = corr[T0], x3 = corr[T0 + 1];
    T0 = T0 + (x1 - x3) / (2 * (x1 - 2 * x2 + x3));
  }

  return sampleRate / T0;
}

function freqToMidi(freq) {
  const midi    = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  const cents   = (midi - rounded) * 100;
  return { midi: rounded, cents };
}
