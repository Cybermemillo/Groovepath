import { getAudioContext, resumeAudioContext, getMasterNode } from './audio-engine.js';
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
  gain.connect(getMasterNode());

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

export function playFeedback(success, streak = 0, perfect = false) {
  resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  if (success) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(660, now);
    osc2.frequency.setValueAtTime(990, now + 0.05);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(getMasterNode());
    osc1.start(now);
    osc2.start(now + 0.05);
    osc1.stop(now + 0.30);
    osc2.stop(now + 0.30);

    if (perfect) {
      const osc3 = ctx.createOscillator();
      const g3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1320, now + 0.08);
      g3.gain.setValueAtTime(0, now + 0.08);
      g3.gain.linearRampToValueAtTime(0.05, now + 0.10);
      g3.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc3.connect(g3);
      g3.connect(getMasterNode());
      osc3.start(now + 0.08);
      osc3.stop(now + 0.34);
    }

    if (streak >= 10) {
      const osc4 = ctx.createOscillator();
      const g4 = ctx.createGain();
      osc4.type = 'sine';
      osc4.frequency.setValueAtTime(1760, now + 0.12);
      g4.gain.setValueAtTime(0, now + 0.12);
      g4.gain.linearRampToValueAtTime(0.04, now + 0.14);
      g4.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc4.connect(g4);
      g4.connect(getMasterNode());
      osc4.start(now + 0.12);
      osc4.stop(now + 0.38);
    }
  } else {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.10, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(getMasterNode());
    osc.start(now);
    osc.stop(now + 0.24);
  }
}

export function playTick() {
  resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.04, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(getMasterNode());
  osc.start(now);
  osc.stop(now + 0.06);
}
