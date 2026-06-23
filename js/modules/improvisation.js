import { getScaleNotes, noteIndex } from './theory.js';
import { NOTES } from './constants.js';

let session = null;
let callbacks = {};
let noteHits = 0;

export function setCallbacks(cbs) {
  callbacks = cbs;
}

export function start(root, scale) {
  session = {
    active: true,
    root,
    scale,
    currentChord: null,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctChord: 0,
    correctScale: 0,
    wrong: 0,
    total: 0,
    lastPlayed: null,
    startTime: Date.now(),
  };
  noteHits = 0;
}

export function stop() {
  if (!session) return null;
  session.active = false;
  const duration = Math.floor((Date.now() - session.startTime) / 1000);
  const results = {
    root: session.root,
    scale: session.scale,
    score: session.score,
    correctChord: session.correctChord,
    correctScale: session.correctScale,
    wrong: session.wrong,
    total: session.total,
    maxStreak: session.maxStreak,
    duration,
  };
  session = null;
  return results;
}

export function setChord(chordNote) {
  if (!session) return;
  session.currentChord = chordNote;
  if (callbacks.onChordChange) {
    callbacks.onChordChange({ chord: chordNote });
  }
}

export function evaluatePitch(note, cents) {
  if (!session || !session.active || !session.currentChord) return;

  const scaleNotes = getScaleNotes(session.root, session.scale);
  const rootIdx = noteIndex(session.currentChord);
  const chordTones = [session.currentChord, NOTES[(rootIdx + 7) % 12]];

  if (session.lastPlayed === note && Math.abs(cents) <= 30) {
    noteHits++;
  } else {
    noteHits = 1;
    session.lastPlayed = note;
  }

  if (noteHits < 3) return;

  noteHits = 0;
  session.lastPlayed = null;
  session.total++;

  const inChord = chordTones.includes(note);
  const inScale = scaleNotes.includes(note);

  if (inChord) {
    let points = 150;
    if (Math.abs(cents) <= 8) points += 50;
    session.correctChord++;
    session.streak++;
    if (session.streak > session.maxStreak) session.maxStreak = session.streak;
    if (session.streak > 0 && session.streak % 5 === 0) points = Math.floor(points * 1.15);
    session.score += points;
    if (callbacks.onCorrect) {
      callbacks.onCorrect({ note, points, streak: session.streak, score: session.score, type: 'chord' });
    }
  } else if (inScale) {
    let points = 80;
    session.correctScale++;
    session.streak++;
    if (session.streak > session.maxStreak) session.maxStreak = session.streak;
    if (session.streak > 0 && session.streak % 5 === 0) points = Math.floor(points * 1.15);
    session.score += points;
    if (callbacks.onCorrect) {
      callbacks.onCorrect({ note, points, streak: session.streak, score: session.score, type: 'scale' });
    }
  } else {
    session.wrong++;
    session.streak = 0;
    if (callbacks.onWrong) {
      callbacks.onWrong({ note, score: session.score, streak: session.streak });
    }
  }
}

export function isActive() {
  return session && session.active;
}
