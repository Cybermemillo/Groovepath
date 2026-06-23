import { $ } from '../utils/dom.js';

const detectedNoteEl = $('#detectedNote');
const detectedOctave = $('#detectedOctave');
const tunerFreqEl    = $('#tunerFreq');
const tunerStatus    = $('#tunerStatus');
const meterNeedle    = $('#meterNeedle');
const meterFill      = $('#meterFill');

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
    return;
  }

  const octave = midi !== null ? Math.floor(midi / 12) - 1 : '';
  detectedNoteEl.textContent = note;
  detectedOctave.textContent = `oct. ${octave}`;
  tunerFreqEl.textContent    = `${freq.toFixed(1)} Hz`;

  const clampedCents = Math.max(-50, Math.min(50, cents));
  const needlePos    = 50 + clampedCents;

  meterNeedle.style.left = `${needlePos}%`;

  const absCents = Math.abs(clampedCents);
  meterFill.style.left   = cents >= 0 ? '50%' : `${needlePos}%`;
  meterFill.style.width  = `${absCents}%`;

  if (absCents <= 8) {
    tunerStatus.textContent = '\u2713 Afinado';
    tunerStatus.className   = 'tuner-status in-tune';
    meterFill.className     = 'meter-fill in-tune';
  } else if (cents < 0) {
    tunerStatus.textContent = '\u25BC Bajo';
    tunerStatus.className   = 'tuner-status flat';
    meterFill.className     = 'meter-fill flat';
  } else {
    tunerStatus.textContent = '\u25B2 Alto';
    tunerStatus.className   = 'tuner-status sharp';
    meterFill.className     = 'meter-fill sharp';
  }
}
