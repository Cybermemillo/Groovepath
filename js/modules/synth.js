import { getAudioContext, resumeAudioContext } from './audio-engine.js';
import { midiToFreq } from './theory.js';

let volume = 0.5;
let activeGain = null;
let activeOsc  = null;
let stopTimer  = null;

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
}

export function playNote(midi, duration = 800) {
  resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const end = now + duration / 1000;

  // Stop previous note gracefully
  if (activeGain) {
    if (stopTimer) clearTimeout(stopTimer);
    activeGain.gain.cancelScheduledValues(now);
    activeGain.gain.setValueAtTime(activeGain.gain.value, now);
    activeGain.gain.linearRampToValueAtTime(0, now + 0.015);
    try { activeOsc.stop(now + 0.02); } catch (e) { /* already stopped */ }
    activeGain = null;
    activeOsc = null;
    stopTimer = null;
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(midiToFreq(midi), now);

  // Filter envelope: bright attack → warm body
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1500, now);
  filter.frequency.linearRampToValueAtTime(350, now + 0.10);
  filter.frequency.setValueAtTime(260, now + 0.22);
  filter.Q.setValueAtTime(1.2, now);

  // Amp envelope ADSR
  const v = volume;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(v * 0.70, now + 0.010);  // attack
  gain.gain.linearRampToValueAtTime(v * 0.35, now + 0.06);   // decay
  gain.gain.setValueAtTime(v * 0.26, now + 0.08);             // sustain
  gain.gain.linearRampToValueAtTime(0, end);                   // release

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(end + 0.1);

  activeOsc = osc;
  activeGain = gain;

  stopTimer = setTimeout(() => {
    activeOsc = null;
    activeGain = null;
    stopTimer = null;
  }, duration + 120);
}
