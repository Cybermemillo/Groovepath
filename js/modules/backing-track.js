import { getAudioContext, resumeAudioContext, getMasterNode } from './audio-engine.js';
import { getChordRoot, noteIndex, getChordNotes } from './theory.js';
import { NOTES, BACKING_STYLES, PROGRESSIONS } from './constants.js';

let state = {
  playing: false,
  style: 'rock',
  bpm: 100,
  root: 'A',
  scale: 'minor_pentatonic',
  volume: 0.8,
};

let schedulerTimer = null;
let currentStep = 0;
let currentBar = 0;
let currentChordIndex = 0;
let stepLength = 0;
let totalSteps = 0;
let nextStepTime = 0;

let btCallbacks = {};

export function setCallbacks(cbs) {
  btCallbacks = cbs;
}

export function getState() { return state; }

export function setRootScale(root, scale) {
  state.root = root;
  state.scale = scale;
}

export function setStyle(style) {
  state.style = style;
  state.bpm = BACKING_STYLES[style].bpm;
}

export function setBpm(bpm) {
  state.bpm = bpm;
  stepLength = 60 / bpm / 4;
}

export function setVolume(v) {
  state.volume = Math.max(0, Math.min(1, v));
}

export function isPlaying() {
  return state.playing;
}

function playKick(time, vol) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.06);
  gain.gain.setValueAtTime(0.9 * vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  osc.connect(gain);
  gain.connect(getMasterNode());
  osc.start(time);
  osc.stop(time + 0.3);
}

function playSnare(time, vol) {
  const ctx = getAudioContext();
  const bufSize = Math.floor(ctx.sampleRate * 0.15);
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nGain = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(1000, time);
  nGain.gain.setValueAtTime(0.4 * vol, time);
  nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, time);
  oGain.gain.setValueAtTime(0.5 * vol, time);
  oGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

  noise.connect(hp); hp.connect(nGain); nGain.connect(getMasterNode());
  osc.connect(oGain); oGain.connect(getMasterNode());
  noise.start(time); noise.stop(time + 0.18);
  osc.start(time); osc.stop(time + 0.08);
}

function playHat(time, vol) {
  const ctx = getAudioContext();
  const bufSize = Math.floor(ctx.sampleRate * 0.06);
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(8500, time);
  bp.Q.setValueAtTime(0.5, time);
  gain.gain.setValueAtTime(0.12 * vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

  noise.connect(bp); bp.connect(gain); gain.connect(getMasterNode());
  noise.start(time); noise.stop(time + 0.08);
}

function playChordNote(midi, time, duration, vol) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), time);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, time);
  filter.Q.setValueAtTime(0.5, time);

  const gv = 0.12 * vol;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(gv, time + 0.02);
  gain.gain.linearRampToValueAtTime(gv * 0.7, time + 0.05);
  gain.gain.setValueAtTime(0, time + duration);

  osc.connect(filter); filter.connect(gain); gain.connect(getMasterNode());
  osc.start(time); osc.stop(time + duration + 0.03);
}

function playBass(midi, time, vol) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), time);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, time);
  filter.Q.setValueAtTime(1.5, time);

  const gv = 0.25 * vol;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(gv, time + 0.015);
  gain.gain.linearRampToValueAtTime(gv * 0.4, time + 0.08);
  gain.gain.setValueAtTime(0, time + 0.35);

  osc.connect(filter); filter.connect(gain); gain.connect(getMasterNode());
  osc.start(time); osc.stop(time + 0.4);
}

function scheduleStep(step) {
  const ctx = getAudioContext();
  const styleDef = BACKING_STYLES[state.style];
  const stepsPerBar = styleDef.kick.length;
  const barInProg = step % stepsPerBar;

  if (barInProg === 0 && step > 0) {
    currentChordIndex++;
  }

  const prog = PROGRESSIONS[state.style];
  const chordIdx = currentChordIndex % prog.length;
  const degree = prog[chordIdx].degree;
  const chordType = prog[chordIdx].type || 'power';
  const chordRoot = getChordRoot(state.root, state.scale, degree);

  if (barInProg === 0 && btCallbacks.onBarStart) {
    const upcoming = getUpcomingChords(3);
    btCallbacks.onBarStart({ chord: chordRoot, type: chordType, upcoming });
  }

  const now = nextStepTime;
  const v = state.volume;

  if (barInProg === 0) {
    const chordMidis = getChordNotes(chordRoot, chordType);
    const rootIdx = noteIndex(chordRoot);
    const bassMidi = (12 * 3) + rootIdx + 12;
    const barDuration = stepLength * stepsPerBar;

    chordMidis.forEach((note, i) => {
      const ni = noteIndex(note);
      const midi = (12 * 5) + ni;
      const vol = i === 0 ? v : v * (0.7 - i * 0.1);
      playChordNote(midi, now, barDuration * 0.9, Math.max(0.3, vol));
    });
  }

  const rootIdx2 = noteIndex(chordRoot);
  const bassMidi = (12 * 3) + rootIdx2 + 12;

  if (styleDef.kick[barInProg]) playKick(now, v);
  if (styleDef.snare[barInProg]) playSnare(now, v);
  if (styleDef.hat[barInProg]) playHat(now, v);

  if (styleDef.bass[barInProg]) playBass(bassMidi - 12, now, v);
}

function scheduler() {
  if (!state.playing) return;

  const ctx = getAudioContext();
  const styleDef = BACKING_STYLES[state.style];
  const stepsPerBar = styleDef.kick.length;

  while (nextStepTime < ctx.currentTime + 0.15) {
    scheduleStep(currentStep);
    nextStepTime += stepLength;
    currentStep++;
  }

  schedulerTimer = setTimeout(scheduler, 25);
}

export function getUpcomingChords(count = 3) {
  const prog = PROGRESSIONS[state.style];
  return Array.from({ length: count }, (_, i) => {
    const idx = (currentChordIndex + i) % prog.length;
    return {
      chord: getChordRoot(state.root, state.scale, prog[idx].degree),
      type: prog[idx].type || 'power',
    };
  });
}

export function getTimelineData() {
  const prog = PROGRESSIONS[state.style];
  return {
    bars: prog.map(p => ({
      chord: getChordRoot(state.root, state.scale, p.degree),
      type: p.type || 'power',
    })),
    current: currentChordIndex % prog.length,
  };
}

export function start() {
  if (state.playing) return;
  resumeAudioContext();
  const ctx = getAudioContext();

  const styleDef = BACKING_STYLES[state.style];
  stepLength = 60 / state.bpm / 4; // 16th note

  currentStep = 0;
  currentBar = 0;
  currentChordIndex = 0;
  nextStepTime = ctx.currentTime + 0.05;
  totalSteps = 9999;

  state.playing = true;
  scheduler();
}

export function stop() {
  state.playing = false;
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
}
