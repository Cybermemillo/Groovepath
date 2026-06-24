import { NOTES } from './constants.js';
import { noteIndex, midiToNote } from './theory.js';
import * as synth from './synth.js';

const INTERVALS = [
  { semitones: 1,  name: '2m', label: '2\u00AA menor' },
  { semitones: 2,  name: '2M', label: '2\u00AA mayor' },
  { semitones: 3,  name: '3m', label: '3\u00AA menor' },
  { semitones: 4,  name: '3M', label: '3\u00AA mayor' },
  { semitones: 5,  name: '4J', label: '4\u00AA justa' },
  { semitones: 6,  name: 'TT', label: 'Tritono' },
  { semitones: 7,  name: '5J', label: '5\u00AA justa' },
  { semitones: 8,  name: '6m', label: '6\u00AA menor' },
  { semitones: 9,  name: '6M', label: '6\u00AA mayor' },
  { semitones: 10, name: '7m', label: '7\u00AA menor' },
  { semitones: 11, name: '7M', label: '7\u00AA mayor' },
  { semitones: 12, name: '8J', label: 'Octava' },
];

let state = {
  playing: false,
  mode: 'choose',
  currentRoot: null,
  currentInterval: null,
  totalRounds: 20,
  round: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  correct: 0,
  wrong: 0,
};

let callbacks = {};
let synthTimer = null;
let awaitingSilence = false;
let roundStartTime = 0;
let totalReactionMs = 0;
let fastestMs = 0;
let minAdvanceTime = 0;

export function setCallbacks(cbs) { callbacks = cbs; }

export function setSettings({ totalRounds }) {
  if (totalRounds !== undefined) state.totalRounds = totalRounds;
}

export function setMode(m) { state.mode = m; }

function pickRound() {
  const root = NOTES[Math.floor(Math.random() * NOTES.length)];
  const interval = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
  return { root, interval };
}

export function start() {
  if (state.playing) return;
  state.playing = true;
  state.round = 0;
  state.score = 0;
  state.streak = 0;
  state.maxStreak = 0;
  state.correct = 0;
  state.wrong = 0;
  awaitingSilence = false;
  totalReactionMs = 0;
  fastestMs = 0;
  if (callbacks.onStart) callbacks.onStart();
  nextRound();
}

function nextRound() {
  awaitingSilence = false;
  roundStartTime = performance.now();
  if (!state.playing) return;
  if (state.totalRounds > 0 && state.round >= state.totalRounds) {
    finish();
    return;
  }
  const { root, interval } = pickRound();
  state.currentRoot = root;
  state.currentInterval = interval;
  state.round++;

  const rootMidi = 40 + noteIndex(root);
  const targetMidi = rootMidi + interval.semitones;
  const targetNote = midiToNote(targetMidi);

  if (callbacks.onRound) callbacks.onRound({ root, interval, mode: state.mode });

  if (state.mode === 'choose') {
    synth.playNote(rootMidi, 600);
    synthTimer = setTimeout(() => {
      synth.playNote(targetMidi, 600);
    }, 1200);
  } else {
    synth.playNote(rootMidi, 600);
  }
}

export function answerInterval(intervalName) {
  if (!state.playing || state.mode !== 'choose' || awaitingSilence) return;
  if (synthTimer) clearTimeout(synthTimer);
  const correct = state.currentInterval && (state.currentInterval.name === intervalName);
  evaluate(correct, null, intervalName);
}

export function evaluatePitch(noteName) {
  if (!state.playing || state.mode !== 'play' || awaitingSilence) return;
  const rootIdx = noteIndex(state.currentRoot);
  const targetIdx = (rootIdx + state.currentInterval.semitones) % 12;
  const expected = NOTES[targetIdx];
  const correct = noteName === expected;
  evaluate(correct, noteName, expected);
}

function evaluate(correct, played, expected) {
  const reactionMs = Math.round(performance.now() - roundStartTime);
  if (correct) {
    state.correct++;
    state.streak++;
    if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    const points = 100 + (state.streak > 1 ? Math.floor(state.streak / 3) * 10 : 0);
    state.score += points;
    totalReactionMs += reactionMs;
    if (fastestMs === 0 || reactionMs < fastestMs) fastestMs = reactionMs;
    if (callbacks.onCorrect) callbacks.onCorrect({ points, streak: state.streak, score: state.score, interval: state.currentInterval, reactionMs });
  } else {
    state.wrong++;
    state.streak = 0;
    if (callbacks.onWrong) callbacks.onWrong({ played, expected, interval: state.currentInterval });
  }
  synth.playFeedback(correct);

  if (state.mode === 'choose') {
    setTimeout(nextRound, correct ? 800 : 2800);
  } else {
    awaitingSilence = true;
    minAdvanceTime = performance.now() + (correct ? 800 : 2500);
  }
}

export function skipRound() {
  if (!state.playing) return;
  if (synthTimer) clearTimeout(synthTimer);
  state.wrong++;
  state.streak = 0;
  if (callbacks.onSkip) callbacks.onSkip({ interval: state.currentInterval });
  if (state.mode === 'choose') {
    setTimeout(nextRound, 800);
  } else {
    awaitingSilence = true;
    minAdvanceTime = performance.now() + 2500;
  }
}

export function setSilence(isSilent) {
  if (!awaitingSilence || !isSilent || !state.playing) return;
  const now = performance.now();
  if (now >= minAdvanceTime) {
    nextRound();
  } else {
    setTimeout(nextRound, minAdvanceTime - now);
  }
}

function finish() {
  state.playing = false;
  awaitingSilence = false;
  if (synthTimer) clearTimeout(synthTimer);
  const avgMs = state.correct > 0 ? Math.round(totalReactionMs / state.correct) : 0;
  const results = {
    score: state.score,
    correct: state.correct,
    wrong: state.wrong,
    maxStreak: state.maxStreak,
    rounds: state.round - 1,
    avgReactionMs: avgMs,
    fastestMs,
  };
  if (callbacks.onFinish) callbacks.onFinish(results);
  totalReactionMs = 0;
  fastestMs = 0;
}

export function stop() {
  state.playing = false;
  awaitingSilence = false;
  if (synthTimer) clearTimeout(synthTimer);
  const avgMs = state.correct > 0 ? Math.round(totalReactionMs / state.correct) : 0;
  const r = {
    score: state.score,
    correct: state.correct,
    wrong: state.wrong,
    maxStreak: state.maxStreak,
    rounds: state.round - 1,
    avgReactionMs: avgMs,
    fastestMs,
  };
  totalReactionMs = 0;
  fastestMs = 0;
  return r;
}

export function isPlaying() { return state.playing; }
export function getState() { return { ...state }; }
export function isAwaitingSilence() { return awaitingSilence; }
