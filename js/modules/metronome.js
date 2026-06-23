import { getAudioContext, resumeAudioContext, getMasterNode } from './audio-engine.js';

const TIME_SIGNATURES = {
  '4/4': { beats: 4, subBeats: 1 },
  '3/4': { beats: 3, subBeats: 1 },
  '6/8': { beats: 2, subBeats: 3 },
  '5/4': { beats: 5, subBeats: 1 },
};

const SUBDIVISIONS = {
  quarter:  1,
  eighth:   2,
  sixteenth: 4,
  triplet:  3,
};

let state = {
  playing: false,
  bpm: 100,
  subdivision: 'quarter',
  timeSignature: '4/4',
  volume: 0.7,
  accentOn: true,
};

let schedulerTimer = null;
let nextClickTime = 0;
let beatIndex = 0;
let subBeatIndex = 0;
let stepLength = 0;

let tapTimes = [];

function clickSound(time, freq, vol) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);

  const v = vol * state.volume;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(v, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

  osc.connect(gain);
  gain.connect(getMasterNode());
  osc.start(time);
  osc.stop(time + 0.05);
}

function scheduler() {
  if (!state.playing) return;

  const ctx = getAudioContext();
  const ts = TIME_SIGNATURES[state.timeSignature];
  const subDiv = SUBDIVISIONS[state.subdivision];
  const totalSubBeats = ts.beats * subDiv;

  while (nextClickTime < ctx.currentTime + 0.15) {
    const absStep = beatIndex * subDiv + subBeatIndex;
    const isDownbeat = absStep === 0;

    let freq, vol;
    if (isDownbeat && state.accentOn) {
      freq = 1800;
      vol = 0.9;
    } else if (subBeatIndex === 0) {
      freq = 1000;
      vol = 0.6;
    } else {
      freq = 800;
      vol = 0.35;
    }

    clickSound(nextClickTime, freq, vol);

    subBeatIndex++;
    if (subBeatIndex >= subDiv) {
      subBeatIndex = 0;
      beatIndex++;
      if (beatIndex >= ts.beats) {
        beatIndex = 0;
      }
    }

    nextClickTime += stepLength / subDiv;
  }

  schedulerTimer = setTimeout(scheduler, 25);
}

export function start() {
  if (state.playing) return;
  resumeAudioContext();
  const ctx = getAudioContext();

  stepLength = 60 / state.bpm;

  beatIndex = 0;
  subBeatIndex = 0;
  nextClickTime = ctx.currentTime + 0.05;
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

export function isPlaying() { return state.playing; }
export function getState() { return { ...state }; }

export function setBpm(bpm) {
  state.bpm = Math.max(40, Math.min(240, bpm));
  stepLength = 60 / state.bpm;
}

export function setSubdivision(sub) {
  if (SUBDIVISIONS[sub]) state.subdivision = sub;
}

export function setTimeSignature(ts) {
  if (TIME_SIGNATURES[ts]) {
    state.timeSignature = ts;
    beatIndex = 0;
    subBeatIndex = 0;
  }
}

export function setVolume(v) {
  state.volume = Math.max(0, Math.min(1, v));
}

export function setAccent(on) {
  state.accentOn = !!on;
}

export function tapTempo() {
  const now = performance.now();
  tapTimes.push(now);
  if (tapTimes.length > 8) tapTimes.shift();
  if (tapTimes.length < 2) return null;
  const intervals = [];
  for (let i = 1; i < tapTimes.length; i++) {
    intervals.push(tapTimes[i] - tapTimes[i - 1]);
  }
  const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round(60000 / avgMs);
  setBpm(Math.max(40, Math.min(240, bpm)));
  return state.bpm;
}

export function resetTap() {
  tapTimes = [];
}
