import { getArpeggioNotes, getScaleNotes } from './theory.js';
import { TUNINGS, NUM_STRINGS, NOTES } from './constants.js';

let session = null;
let callbacks = {};
let targetHits = 0;
let wrongHits = 0;
let lastNote = null;
let awaitingSilence = false;
let totalReactionMs = 0;
let fastestMs = 0;

const HIT_THRESHOLD = 4;
const WRONG_THRESHOLD = 5;

export function setCallbacks(cbs) {
  callbacks = cbs;
}

function getPool(state) {
  const pool = [];
  const tuningMidi = state.customTuningMidi || TUNINGS[state.tuning];

  const arp = state.arpeggioType !== 'none'
    ? getArpeggioNotes(state.rootNote, state.arpeggioType)
    : null;

  const scaleNotes = state.arpeggioType === 'none'
    ? getScaleNotes(state.rootNote, state.scaleType)
    : null;

  const showAll = state.showAllNotes;

  for (let s = 0; s < NUM_STRINGS; s++) {
    for (let f = state.fretFrom; f <= state.fretTo; f++) {
      if (f <= 0) continue;
      const midi = tuningMidi[s] + f;
      const note = NOTES[midi % 12];

      if (arp) {
        if (arp.notes.includes(note)) {
          pool.push({ note, midi, fret: f, string: s });
        }
      } else if (scaleNotes) {
        if (scaleNotes.includes(note)) {
          pool.push({ note, midi, fret: f, string: s });
        }
      } else if (showAll) {
        pool.push({ note, midi, fret: f, string: s });
      }
    }
  }

  if (pool.length === 0 && state.showAllNotes) {
    for (let s = 0; s < NUM_STRINGS; s++) {
      for (let f = state.fretFrom; f <= state.fretTo; f++) {
        if (f <= 0) continue;
        const midi = tuningMidi[s] + f;
        const note = NOTES[midi % 12];
        pool.push({ note, midi, fret: f, string: s });
      }
    }
  }

  return pool;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextTarget() {
  awaitingSilence = false;
  if (session.currentIndex >= session.totalTargets) {
    finishSession();
    return;
  }

  const pool = getPool(session.state);
  if (pool.length === 0) {
    endTraining();
    return;
  }

  const target = pool[Math.floor(Math.random() * pool.length)];
  session.target = target;
  session.targetTime = Date.now();
  targetHits = 0;
  wrongHits = 0;
  lastNote = null;

  if (callbacks.onStart) callbacks.onStart(target);
}

function onCorrect(cents) {
  if (!session || !session.target) return;

  const elapsed = Date.now() - session.targetTime;
  totalReactionMs += elapsed;
  if (fastestMs === 0 || elapsed < fastestMs) fastestMs = elapsed;

  let points = 100;

  if (Math.abs(cents) <= 8) points += 50;

  const speedFactor = Math.max(0, 1 - elapsed / 10000);
  points += Math.floor(speedFactor * 50);

  session.streak++;
  if (session.streak > session.maxStreak) session.maxStreak = session.streak;
  if (session.streak > 0 && session.streak % 3 === 0) {
    points = Math.floor(points * 1.1);
  }

  session.score += points;
  session.correct++;
  session.currentIndex++;

  awaitingSilence = true;
  targetHits = 0;
  wrongHits = 0;

  if (callbacks.onCorrect) {
    callbacks.onCorrect({ note: session.target.note, points, streak: session.streak, score: session.score, reactionMs: elapsed });
  }
}

function onWrong(played) {
  if (!session) return;
  session.wrong++;
  session.streak = 0;
  session.currentIndex++;

  awaitingSilence = true;
  targetHits = 0;
  wrongHits = 0;

  if (callbacks.onWrong) {
    callbacks.onWrong({ expected: session.target.note, played, streak: session.streak, score: session.score });
  }
}

function finishSession() {
  if (!session) return;
  session.active = false;
  awaitingSilence = false;

  const avgMs = session.correct > 0 ? Math.round(totalReactionMs / session.correct) : 0;

  if (callbacks.onFinish) {
    callbacks.onFinish({
      score: session.score,
      correct: session.correct,
      wrong: session.wrong,
      maxStreak: session.maxStreak,
      total: session.totalTargets,
      avgReactionMs: avgMs,
      fastestMs,
    });
  }
  session = null;
  totalReactionMs = 0;
  fastestMs = 0;
}

function runCountdown(cb) {
  let i = 3;
  const tick = () => {
    if (i > 0) {
      if (typeof cb === 'function') cb(i);
      i--;
      setTimeout(tick, 1000);
    } else {
      if (typeof cb === 'function') cb('¡YA!');
      setTimeout(() => nextTarget(), 600);
    }
  };
  tick();
}

export function startTraining(stateOverride, totalTargets = 10) {
  if (session && session.active) return;

  awaitingSilence = false;
  totalReactionMs = 0;
  fastestMs = 0;
  session = {
    active: true,
    state: { ...stateOverride },
    target: null,
    targetTime: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correct: 0,
    wrong: 0,
    totalTargets,
    currentIndex: 0,
  };

  const pool = getPool(session.state);
  if (pool.length === 0) {
    session = null;
    if (callbacks.onError) callbacks.onError('No hay notas en el rango seleccionado');
    return false;
  }

  targetHits = 0;
  wrongHits = 0;
  lastNote = null;

  runCountdown(callbacks.onCountdown);
  return true;
}

export function stopTraining() {
  if (!session) return null;
  session.active = false;
  awaitingSilence = false;
  const avgMs = session.correct > 0 ? Math.round(totalReactionMs / session.correct) : 0;
  const results = {
    score: session.score,
    correct: session.correct,
    wrong: session.wrong,
    maxStreak: session.maxStreak,
    total: session.totalTargets,
    avgReactionMs: avgMs,
    fastestMs,
  };
  session = null;
  totalReactionMs = 0;
  fastestMs = 0;
  targetHits = 0;
  wrongHits = 0;
  lastNote = null;
  return results;
}

function endTraining() {
  if (!session) return;
  session.active = false;
  awaitingSilence = false;
  if (callbacks.onError) callbacks.onError('No hay notas disponibles en el rango actual');
  session = null;
}

export function setSilence(isSilent) {
  if (awaitingSilence && isSilent && session) {
    if (session.currentIndex < session.totalTargets) {
      nextTarget();
    } else {
      finishSession();
    }
  }
}

export function evaluatePitch(note, cents) {
  if (!session || !session.active || !session.target || awaitingSilence) return;

  if (note === session.target.note && Math.abs(cents) <= 25) {
    targetHits++;
    wrongHits = 0;

    if (targetHits >= HIT_THRESHOLD) {
      targetHits = 0;
      onCorrect(cents);
    }
  } else if (note !== session.target.note && Math.abs(cents) <= 50 && session.target) {
    if (lastNote === note) {
      wrongHits++;
    } else {
      wrongHits = 1;
    }
    targetHits = Math.max(0, targetHits - 1);

    if (wrongHits >= WRONG_THRESHOLD) {
      wrongHits = 0;
      onWrong(note);
    }
  } else {
    targetHits = Math.max(0, targetHits - 1);
    wrongHits = Math.max(0, wrongHits - 1);
  }
  lastNote = note;
}

export function isActive() {
  return session && session.active;
}

export function isAwaitingSilence() {
  return awaitingSilence;
}
