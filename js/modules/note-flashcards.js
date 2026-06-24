import { NOTES } from './constants.js';

let state = {
  playing: false,
  currentTarget: null,
  round: 0,
  totalRounds: 20,
  score: 0,
  streak: 0,
  maxStreak: 0,
  correct: 0,
  wrong: 0,
  notePool: 'all',
  timePerNote: 10,
  startTime: 0,
};

let callbacks = {};
let timerInterval = null;
let usedNotes = [];

export function setCallbacks(cbs) { callbacks = cbs; }

export function setSettings({ notePool, timePerNote, totalRounds }) {
  if (notePool !== undefined) state.notePool = notePool;
  if (timePerNote !== undefined) state.timePerNote = timePerNote;
  if (totalRounds !== undefined) state.totalRounds = totalRounds;
}

function getPool() {
  if (Array.isArray(state.notePool)) return [...state.notePool];
  if (state.notePool === 'natural') return ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  return [...NOTES]; // all
}

function pickTarget() {
  const pool = getPool();
  if (pool.length === 0) return null;
  // Avoid immediate repeats when possible
  let available = pool.filter(n => n !== state.currentTarget || pool.length === 1);
  if (available.length === 0) available = pool;
  return available[Math.floor(Math.random() * available.length)];
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
  usedNotes = [];

  if (callbacks.onStart) callbacks.onStart();
  nextRound();
}

function nextRound() {
  if (!state.playing) return;
  if (state.totalRounds > 0 && state.round >= state.totalRounds) {
    finish();
    return;
  }

  const target = pickTarget();
  if (!target) { finish(); return; }
  state.currentTarget = target;
  state.startTime = Date.now();
  state.round++;

  if (callbacks.onTarget) callbacks.onTarget({ target, timePerNote: state.timePerNote });
  startTimer();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  if (state.timePerNote <= 0) return;

  timerInterval = setInterval(() => {
    if (!state.playing) { clearInterval(timerInterval); return; }
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const remaining = Math.max(0, state.timePerNote - elapsed);
    if (callbacks.onTick) callbacks.onTick({ remaining });
    if (remaining <= 0) {
      clearInterval(timerInterval);
      state.wrong++;
      state.streak = 0;
      if (callbacks.onTimeout) callbacks.onTimeout({ target: state.currentTarget });
      setTimeout(nextRound, 1500);
    }
  }, 200);
}

export function evaluatePitch(noteName) {
  if (!state.playing || !state.currentTarget) return;

  if (noteName === state.currentTarget) {
    clearInterval(timerInterval);
    state.correct++;
    state.streak++;
    if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    const points = 100 + (state.streak > 1 ? Math.floor(state.streak / 3) * 10 : 0);
    state.score += points;
    if (callbacks.onCorrect) callbacks.onCorrect({ note: noteName, points, streak: state.streak, score: state.score });
    setTimeout(nextRound, 800);
  } else {
    // Don't end round, just show wrong feedback
    if (callbacks.onWrong) callbacks.onWrong({ played: noteName, expected: state.currentTarget });
  }
}

function finish() {
  state.playing = false;
  clearInterval(timerInterval);
  const results = {
    score: state.score,
    correct: state.correct,
    wrong: state.wrong,
    maxStreak: state.maxStreak,
    rounds: state.round - 1,
  };
  if (callbacks.onFinish) callbacks.onFinish(results);
}

export function stop() {
  state.playing = false;
  clearInterval(timerInterval);
  const results = {
    score: state.score,
    correct: state.correct,
    wrong: state.wrong,
    maxStreak: state.maxStreak,
    rounds: state.round - 1,
  };
  return results;
}

export function isPlaying() { return state.playing; }
export function getState() { return { ...state }; }
