import { getScaleNotes, getChordNotes } from './theory.js';

let session = null;
let callbacks = {};
let noteHits = 0;
let guidedInterval = null;

const DIFFICULTY_CONFIG = {
  'four_strings':   { minHits: 2, centThreshold: 40, chordPoints: 150, scalePoints: 0,  bonusCents: 12, scaleAllowed: false, wrongBreaks: false },
  'walking_bass':   { minHits: 3, centThreshold: 30, chordPoints: 120, scalePoints: 60,  bonusCents: 8,  scaleAllowed: true,  wrongBreaks: true },
  'funk_machine':   { minHits: 3, centThreshold: 18, chordPoints: 100, scalePoints: 0,   bonusCents: 5,  scaleAllowed: false, wrongBreaks: true },
  'bootsy_level':   { minHits: 4, centThreshold: 12, chordPoints: 80,  scalePoints: 0,   bonusCents: 3,  scaleAllowed: false, wrongBreaks: true },
};

export function setCallbacks(cbs) {
  callbacks = cbs;
}

export function getState() {
  return session;
}

export function start(root, scale, opts = {}) {
  const difficulty = opts.difficulty || 'walking_bass';
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.walking_bass;
  session = {
    active: true,
    root,
    scale,
    difficulty,
    cfg,
    currentChord: null,
    currentChordType: 'power',
    currentChordTones: [],
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctChord: 0,
    correctScale: 0,
    wrong: 0,
    total: 0,
    lastPlayed: null,
    startTime: Date.now(),
    guided: opts.guided || false,
    guidedSource: opts.guidedSource || 'chord',
    guidedSpeed: opts.guidedSpeed || 'bar',
    guidedBpm: opts.bpm || 100,
    targetNote: null,
    targetHits: 0,
    correctTarget: 0,
    needsChange: false,
    lastScoredNote: null,
  };
  noteHits = 0;
  if (session.guided) {
    scheduleGuidedTarget();
  }
}

export function stop() {
  if (guidedInterval) { clearInterval(guidedInterval); guidedInterval = null; }
  if (!session) return null;
  session.active = false;
  const duration = Math.floor((Date.now() - session.startTime) / 1000);
  const results = {
    root: session.root,
    scale: session.scale,
    difficulty: session.difficulty,
    guided: session.guided,
    score: session.score,
    correctChord: session.correctChord,
    correctScale: session.correctScale,
    wrong: session.wrong,
    total: session.total,
    maxStreak: session.maxStreak,
    correctTarget: session.correctTarget || 0,
    duration,
  };
  session = null;
  return results;
}

export function setChord(chordNote, chordType) {
  if (!session) return;
  session.currentChord = chordNote;
  session.currentChordType = chordType || 'power';
  session.currentChordTones = getChordNotes(chordNote, session.currentChordType);
  if (callbacks.onChordChange) {
    const chordLabel = chordType && chordType !== 'power'
      ? formatChordLabel(chordNote, chordType)
      : chordNote;
    callbacks.onChordChange({ chord: chordNote, type: session.currentChordType, label: chordLabel });
  }
  if (session.guided && session.guidedSource !== 'scale') {
    scheduleGuidedTarget();
  }
}

export function setGuided(enabled, source, speed, bpm) {
  if (!session) return;
  session.guided = enabled;
  session.guidedSource = source || 'chord';
  session.guidedSpeed = speed || 'bar';
  session.guidedBpm = bpm || session.guidedBpm || 100;
  if (enabled && session.currentChord) {
    scheduleGuidedTarget();
  } else {
    if (guidedInterval) { clearInterval(guidedInterval); guidedInterval = null; }
    if (callbacks.onTargetChange) {
      callbacks.onTargetChange({ note: null });
    }
  }
}

function formatChordLabel(root, type) {
  const typeLabels = {
    'major': '', 'minor': 'm', 'major_7': 'maj7', 'minor_7': 'm7',
    'dominant_7': '7', 'minor_7b5': 'm7b5', 'diminished': 'dim', 'augmented': 'aug',
    'power': '', 'major_triad': '', 'minor_triad': 'm',
  };
  return root + (typeLabels[type] || '');
}

function scheduleGuidedTarget() {
  if (guidedInterval) clearInterval(guidedInterval);
  if (!session || !session.currentChord) return;

  const bpm = session.guidedBpm || 100;
  const beatMs = (60 / bpm) * 1000;

  const speedMs = {
    'beat2': beatMs * 2,
    'bar': beatMs * 4,
    'bar2': beatMs * 8,
  };

  const intervalMs = speedMs[session.guidedSpeed] || beatMs * 4;

  pickGuidedTarget();

  guidedInterval = setInterval(() => {
    if (!session || !session.active) {
      clearInterval(guidedInterval);
      guidedInterval = null;
      return;
    }
    pickGuidedTarget();
  }, intervalMs);
}

function pickGuidedTarget() {
  if (!session || !session.currentChord) return;

  let candidates;
  if (session.guidedSource === 'chord') {
    candidates = [...session.currentChordTones];
  } else if (session.guidedSource === 'scale') {
    const scaleNotes = getScaleNotes(session.root, session.scale);
    candidates = [...scaleNotes];
  } else if (session.guidedSource === 'voice') {
    candidates = [...session.currentChordTones];
    const scaleNotes = getScaleNotes(session.root, session.scale);
    scaleNotes.forEach(n => { if (!candidates.includes(n)) candidates.push(n); });
  }

  if (!candidates || candidates.length === 0) return;

  const prev = session.targetNote;
  if (prev && session.guidedSource === 'voice' && candidates.length > 1) {
    const prevIdx = candidates.indexOf(prev);
    const nextIdx = (prevIdx + 1) % candidates.length;
    session.targetNote = candidates[nextIdx];
  } else {
    let next;
    do {
      next = candidates[Math.floor(Math.random() * candidates.length)];
    } while (candidates.length > 1 && next === prev);
    session.targetNote = next;
  }

  if (callbacks.onTargetChange) {
    callbacks.onTargetChange({ note: session.targetNote });
  }
}

export function setSilence() {
  if (session) {
    session.needsChange = false;
    session.lastScoredNote = null;
  }
}

export function evaluatePitch(note, cents) {
  if (!session || !session.active || !session.currentChord) return;

  if (session.needsChange && note === session.lastScoredNote) return;
  if (session.needsChange && note !== session.lastScoredNote) {
    session.needsChange = false;
    session.lastScoredNote = null;
    session.lastPlayed = note;
    noteHits = 1;
  }

  const cfg = session.cfg;
  const scaleNotes = getScaleNotes(session.root, session.scale);
  const chordTones = session.currentChordTones.length > 0
    ? session.currentChordTones
    : [session.currentChord];

  if (session.lastPlayed === note && Math.abs(cents) <= cfg.centThreshold) {
    noteHits++;
  } else {
    noteHits = 1;
    session.lastPlayed = note;
  }

  if (noteHits < cfg.minHits) {
    if (session.guided && session.guidedSource !== 'scale') {
      // Check target hit even under threshold
    }
    return;
  }

  noteHits = 0;
  session.lastPlayed = null;
  session.total++;

  const inChord = chordTones.includes(note);
  const inScale = scaleNotes.includes(note);
  const isTarget = session.guided && note === session.targetNote;

  if (isTarget) {
    let points = cfg.chordPoints;
    if (Math.abs(cents) <= cfg.bonusCents) points += 50;
    session.correctChord++;
    session.streak++;
    session.correctTarget++;
    if (session.streak > session.maxStreak) session.maxStreak = session.streak;
    if (session.streak > 0 && session.streak % 5 === 0) points = Math.floor(points * 1.15);
    session.score += points;
    if (callbacks.onCorrect) {
      callbacks.onCorrect({ note, points, streak: session.streak, score: session.score, type: 'target' });
    }
    pickGuidedTarget();
  } else if (inChord) {
    let points = cfg.chordPoints;
    if (Math.abs(cents) <= cfg.bonusCents) points += 50;
    session.correctChord++;
    session.streak++;
    if (session.streak > session.maxStreak) session.maxStreak = session.streak;
    if (session.streak > 0 && session.streak % 5 === 0) points = Math.floor(points * 1.15);
    session.score += points;
    if (callbacks.onCorrect) {
      callbacks.onCorrect({ note, points, streak: session.streak, score: session.score, type: 'chord' });
    }
  } else if (inScale && cfg.scaleAllowed) {
    let points = cfg.scalePoints;
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
    if (cfg.wrongBreaks) session.streak = 0;
    if (callbacks.onWrong) {
      callbacks.onWrong({ note, score: session.score, streak: session.streak });
    }
  }

  session.needsChange = true;
  session.lastScoredNote = note;
}

export function isActive() {
  return session && session.active;
}
