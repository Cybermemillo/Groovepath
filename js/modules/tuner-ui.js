import { $ } from '../utils/dom.js';

const detectedNoteEl = $('#detectedNote');
const detectedOctave = $('#detectedOctave');
const tunerFreqEl    = $('#tunerFreq');
const tunerStatus    = $('#tunerStatus');
const meterNeedle    = $('#meterNeedle');
const meterFill      = $('#meterFill');
const micErrorBanner = $('#micErrorBanner');
const micErrorText   = $('#micErrorText');

let activeTuningMidi = [43, 38, 33, 28];

// ── Smoothing state ──
let smoothCents      = 0;
let smoothFreq       = 0;
let lastStableNote   = null;
let sameNoteFrames   = 0;
const FACTOR         = 0.35;
const DEADBAND       = 3;
const CLAMP          = 50;

export function setTuningMidi(midiArray) {
  activeTuningMidi = midiArray || [43, 38, 33, 28];
}

export function showMicError(msg) {
  micErrorText.textContent = msg;
  micErrorBanner.style.display = 'flex';
}

export function clearMicError() {
  micErrorBanner.style.display = 'none';
  micErrorText.textContent = '';
}

export function updateTunerDisplay(note, freq, cents, midi = null) {
  if (!note) {
    detectedNoteEl.textContent = '\u2014';
    detectedOctave.textContent = '';
    tunerFreqEl.textContent    = '\u2014 Hz';
    tunerStatus.textContent    = '\u2014';
    tunerStatus.className      = 'tuner-status';
    meterNeedle.style.left     = '50%';
    meterFill.style.width      = '0';
    meterFill.className        = 'meter-fill';
    smoothCents   = 0;
    smoothFreq    = 0;
    lastStableNote = null;
    sameNoteFrames = 0;
    return;
  }

  // Reset smoothing on note change
  if (note !== lastStableNote) {
    lastStableNote = note;
    smoothCents    = cents;
    smoothFreq     = freq;
    sameNoteFrames = 0;
  } else {
    sameNoteFrames++;

    // Only apply smoothing if outside deadband
    if (Math.abs(cents - smoothCents) >= DEADBAND) {
      smoothCents = smoothCents * (1 - FACTOR) + cents * FACTOR;
    }
    smoothFreq = smoothFreq * (1 - FACTOR) + freq * FACTOR;
  }

  const octave = midi !== null ? Math.floor(midi / 12) - 1 : '';
  detectedNoteEl.textContent = note;
  detectedOctave.textContent = `oct. ${octave}`;
  tunerFreqEl.textContent    = `${smoothFreq.toFixed(1)} Hz`;

  const clamped = Math.max(-CLAMP, Math.min(CLAMP, smoothCents));
  const needlePos = 50 + clamped;
  meterNeedle.style.left = `${needlePos}%`;

  const absCents = Math.abs(clamped);
  meterFill.style.left   = smoothCents >= 0 ? '50%' : `${needlePos}%`;
  meterFill.style.width  = `${absCents}%`;

  if (absCents <= 8) {
    tunerStatus.textContent = '\u2713 Afinado';
    tunerStatus.className   = 'tuner-status in-tune';
    meterFill.className     = 'meter-fill in-tune';
  } else if (smoothCents < 0) {
    tunerStatus.textContent = '\u25BC Bajo';
    tunerStatus.className   = 'tuner-status flat';
    meterFill.className     = 'meter-fill flat';
  } else {
    tunerStatus.textContent = '\u25B2 Alto';
    tunerStatus.className   = 'tuner-status sharp';
    meterFill.className     = 'meter-fill sharp';
  }
}
