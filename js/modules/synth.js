import { getAudioContext } from './audio-engine.js';
import { midiToFreq } from './theory.js';

export function playNote(midi, duration = 800) {
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(midiToFreq(midi), ctx.currentTime);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, ctx.currentTime);
  filter.Q.setValueAtTime(1, ctx.currentTime);

  const now = ctx.currentTime;
  const end = now + duration / 1000;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
  gain.gain.setValueAtTime(0.2, end - 0.05);
  gain.gain.linearRampToValueAtTime(0, end);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(end);
}
