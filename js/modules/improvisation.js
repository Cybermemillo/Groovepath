import { getScaleNotes, getChordNotes } from './theory.js';
import { getAudioContext } from './audio-engine.js';

let session = null;
let callbacks = {};
let noteHits = 0;
let guidedTimer = null;
let freeAdvanceTimer = null;
let previewTimer = null;
const PREVIEW_REPEAT_MS = 1800;

const CHALLENGE_POOL = [
  {
    id: 'chord_streak_5',
    label: '5 notas del acorde seguidas',
    target: 5,
    bonus: 250,
    needsGuided: false,
  },
  {
    id: 'target_quick_3',
    label: 'Acierta 3 objetivos del modo guiado',
    target: 3,
    bonus: 350,
    needsGuided: true,
  },
  {
    id: 'downbeat_3',
    label: '3 notas en el primer beat de compás',
    target: 3,
    bonus: 300,
    needsGuided: false,
  },
  {
    id: 'note_diversity_5',
    label: 'Toca 5 notas distintas del acorde',
    target: 5,
    bonus: 200,
    needsGuided: false,
  },
  {
    id: 'clean_run_2',
    label: '0 fallos durante 2 compases seguidos',
    target: 2,
    bonus: 300,
    needsGuided: false,
  },
  {
    id: 'streak_8',
    label: 'Consigue una racha de 8',
    target: 8,
    bonus: 250,
    needsGuided: false,
  },
];

function pickChallenge(guided) {
  const eligible = CHALLENGE_POOL.filter(c => guided || !c.needsGuided);
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

function updateChallengeProgress(event) {
  if (!session || !session.challenge || session.challengeCompleted) return;
  const c = session.challenge;
  let newProgress = session.challengeProgress;
  let completed = false;
  switch (c.id) {
    case 'chord_streak_5':
      if (event.type === 'chord' || event.type === 'target') {
        newProgress = session.streak;
      }
      if (newProgress >= c.target) completed = true;
      break;
    case 'target_quick_3':
      if (event.type === 'target') newProgress = session.correctTarget;
      if (newProgress >= c.target) completed = true;
      break;
    case 'downbeat_3':
      if (event.beat === 0 && (event.type === 'chord' || event.type === 'target')) {
        session.downbeatsHit.add(session.currentBar);
        newProgress = session.downbeatsHit.size;
      }
      if (newProgress >= c.target) completed = true;
      break;
    case 'note_diversity_5':
      if (event.type === 'chord' || event.type === 'target') {
        session.chordNoteSet.add(event.note);
        newProgress = session.chordNoteSet.size;
      }
      if (newProgress >= c.target) completed = true;
      break;
    case 'clean_run_2':
      if (event.type === 'wrong') {
        session.cleanRunBarCount = 0;
      } else if (event.beat === 0 && (event.type === 'chord' || event.type === 'target' || event.type === 'scale')) {
        session.cleanRunBarCount++;
      }
      newProgress = session.cleanRunBarCount;
      if (newProgress >= c.target) completed = true;
      break;
    case 'streak_8':
      newProgress = session.streak;
      if (newProgress >= c.target) completed = true;
      break;
  }
  session.challengeProgress = Math.min(newProgress, c.target);
  if (callbacks.onChallengeProgress && newProgress !== session.challengeProgress) {
    callbacks.onChallengeProgress({
      id: c.id,
      label: c.label,
      progress: session.challengeProgress,
      target: c.target,
      completed: false,
    });
  }
  if (completed && !session.challengeCompleted) {
    session.challengeCompleted = true;
    session.score += c.bonus;
    if (callbacks.onChallengeComplete) {
      callbacks.onChallengeComplete({ id: c.id, label: c.label, bonus: c.bonus });
    }
  }
}

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
    targetStartTime: 0,
    targetEndTime: 0,
    targetInterval: 0,
    targetBuildHits: 0,
    targetHits: 0,
    correctTarget: 0,
    needsChange: false,
    lastScoredNote: null,
    freeMode: !!opts.freeMode,
    freeAdvance: opts.freeAdvance || 'root',
    freeBpm: opts.bpm || 100,
    freeDegree: 0,
    chordStats: {},
    currentBeat: -1,
    beatsPerBar: 4,
    timingBonusGiven: 0,
    notePerformance: {},
    challenge: pickChallenge(opts.guided),
    challengeProgress: 0,
    challengeCompleted: false,
    cleanRunBarCount: 0,
    downbeatsHit: new Set(),
    chordNoteSet: new Set(),
    adaptiveEnabled: !!opts.adaptive,
    rollingAccuracy: [],
    adaptiveSuggestion: null,
    adaptiveStableBars: 0,
  };
  noteHits = 0;
  if (opts.freeMode && opts.startChord) {
    const arpType = opts.startChordType || 'power';
    setChord(opts.startChord, arpType, true);
  }
  if (session.guided) {
    scheduleGuidedTarget();
  }
  if (opts.freeMode && opts.freeAdvance && opts.freeAdvance !== 'root') {
    startFreeAdvance();
  }
  if (callbacks.onChallengeStart) {
    callbacks.onChallengeStart({ ...session.challenge });
  }
}

export function stop() {
  if (guidedTimer) { clearTimeout(guidedTimer); guidedTimer = null; }
  if (freeAdvanceTimer) { clearTimeout(freeAdvanceTimer); freeAdvanceTimer = null; }
  clearPreviewRepeat();
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
    chordStats: session.chordStats || {},
    freeMode: session.freeMode || false,
    notePerformance: session.notePerformance || {},
    challenge: session.challenge ? { ...session.challenge } : null,
    challengeProgress: session.challengeProgress || 0,
    challengeCompleted: !!session.challengeCompleted,
  };
  session = null;
  return results;
}

export function setChord(chordNote, chordType, fromInternal = false) {
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
    session.targetBuildHits = 0;
    scheduleGuidedTarget();
  }
  if (!fromInternal && freeAdvanceTimer) {
    clearTimeout(freeAdvanceTimer);
    freeAdvanceTimer = null;
  }
}

export function getGuidedTimeLeft() {
  if (!session || !session.targetEndTime) return 0;
  const ctx = getAudioContext();
  return Math.max(0, session.targetEndTime - ctx.currentTime);
}

export function getGuidedTargetInterval() {
  return session ? session.targetInterval || 4000 : 4000;
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
    if (guidedTimer) { clearTimeout(guidedTimer); guidedTimer = null; }
    clearPreviewRepeat();
    session.targetBuildHits = 0;
    if (callbacks.onTargetChange) {
      callbacks.onTargetChange({ note: null, intervalMs: 0 });
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
  if (guidedTimer) { clearTimeout(guidedTimer); guidedTimer = null; }
  if (!session || !session.currentChord) return;

  const bpm = session.guidedBpm || 100;
  const beatMs = (60 / bpm) * 1000;

  const speedMs = {
    'beat2': beatMs * 2,
    'bar': beatMs * 4,
    'bar2': beatMs * 8,
  };

  const intervalMs = speedMs[session.guidedSpeed] || beatMs * 4;

  const ctx = getAudioContext();
  const startTime = ctx.currentTime + 0.05;
  const endTime = startTime + intervalMs / 1000;

  pickGuidedTarget(intervalMs, startTime, endTime);

  const delay = Math.max(0, (endTime - ctx.currentTime) * 1000);
  guidedTimer = setTimeout(() => {
    if (!session || !session.active) {
      guidedTimer = null;
      return;
    }
    scheduleGuidedTarget();
  }, delay);
}

function pickGuidedTarget(intervalMs = 4000, startTime, endTime) {
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

  const ctx = getAudioContext();
  if (startTime === undefined) startTime = ctx.currentTime;
  if (endTime === undefined) endTime = startTime + intervalMs / 1000;

  session.targetStartTime = startTime;
  session.targetEndTime = endTime;
  session.targetInterval = intervalMs;
  session.targetBuildHits = 0;

  if (callbacks.onTargetChange) {
    callbacks.onTargetChange({ note: session.targetNote, intervalMs });
  }

  if (session.guided) {
    playTargetPreview();
    schedulePreviewRepeat();
  }
}

export function setSilence() {
  if (session) {
    session.needsChange = false;
    session.lastScoredNote = null;
  }
}

export function updateBeat(beatInfo) {
  if (!session || !session.active) return;
  if (typeof beatInfo.beat === 'number') session.currentBeat = beatInfo.beat;
  if (typeof beatInfo.bar === 'number') session.currentBar = beatInfo.bar;
  if (typeof beatInfo.beatsPerBar === 'number') session.beatsPerBar = beatInfo.beatsPerBar;
}

function playTargetPreview() {
  if (!session || !session.targetNote) return;
  if (callbacks.onTargetPreview) {
    callbacks.onTargetPreview({ note: session.targetNote });
  }
}

function schedulePreviewRepeat() {
  if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
  if (!session || !session.guided || !session.targetNote) return;
  previewTimer = setTimeout(() => {
    if (!session || !session.guided || !session.targetNote) {
      previewTimer = null;
      return;
    }
    playTargetPreview();
    schedulePreviewRepeat();
  }, PREVIEW_REPEAT_MS);
}

function clearPreviewRepeat() {
  if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
}

function startFreeAdvance() {
  if (freeAdvanceTimer) { clearTimeout(freeAdvanceTimer); freeAdvanceTimer = null; }
  if (!session || !session.freeMode) return;
  const bars = parseInt(session.freeAdvance, 10) || 4;
  const beatMs = (60 / (session.freeBpm || 100)) * 1000;
  const barMs = beatMs * 4;
  const totalMs = barMs * bars;
  freeAdvanceTimer = setTimeout(() => {
    if (!session || !session.active) {
      freeAdvanceTimer = null;
      return;
    }
    const scaleNotes = getScaleNotes(session.root, session.scale);
    if (scaleNotes.length === 0) {
      freeAdvanceTimer = null;
      return;
    }
    session.freeDegree = (session.freeDegree + 1) % scaleNotes.length;
    const newChord = scaleNotes[session.freeDegree];
    setChord(newChord, 'power', true);
    startFreeAdvance();
  }, totalMs);
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

  const withinThreshold = Math.abs(cents) <= cfg.centThreshold;
  const isTarget = session.guided && note === session.targetNote;

  if (isTarget && withinThreshold && noteHits < cfg.minHits) {
    if (callbacks.onTargetBuild) {
      callbacks.onTargetBuild({ progress: noteHits / cfg.minHits });
    }
  }

  if (noteHits < cfg.minHits) {
    return;
  }

  noteHits = 0;
  session.lastPlayed = null;
  session.total++;

  const inChord = chordTones.includes(note);
  const inScale = scaleNotes.includes(note);
  const isCorrect = inChord || (inScale && cfg.scaleAllowed) || isTarget;

  const chordLabel = formatChordLabel(session.currentChord, session.currentChordType);
  if (!session.chordStats[chordLabel]) {
    session.chordStats[chordLabel] = { correct: 0, wrong: 0, target: 0, total: 0 };
  }
  const cs = session.chordStats[chordLabel];
  cs.total++;

  if (!session.notePerformance[note]) {
    session.notePerformance[note] = { correct: 0, wrong: 0 };
  }
  const np = session.notePerformance[note];

  const isStrongBeat = (session.currentBeat === 0 || session.currentBeat === 2);
  const timingBonus = isStrongBeat ? 20 : 0;
  const beat = session.currentBeat;

  if (isTarget) {
    let points = cfg.chordPoints;
    if (Math.abs(cents) <= cfg.bonusCents) points += 50;
    if (isStrongBeat) points += timingBonus;
    session.correctChord++;
    session.streak++;
    session.correctTarget++;
    cs.correct++;
    cs.target++;
    np.correct++;
    if (session.streak > session.maxStreak) session.maxStreak = session.streak;
    if (session.streak > 0 && session.streak % 5 === 0) points = Math.floor(points * 1.15);
    session.score += points;
    if (callbacks.onCorrect) {
      callbacks.onCorrect({ note, points, streak: session.streak, score: session.score, type: 'target' });
    }
    if (guidedTimer) { clearTimeout(guidedTimer); guidedTimer = null; }
    clearPreviewRepeat();
    scheduleGuidedTarget();
    updateChallengeProgress({ type: 'target', note, beat });
  } else if (inChord) {
    let points = cfg.chordPoints;
    if (Math.abs(cents) <= cfg.bonusCents) points += 50;
    if (isStrongBeat) points += timingBonus;
    session.correctChord++;
    session.streak++;
    cs.correct++;
    np.correct++;
    if (session.streak > session.maxStreak) session.maxStreak = session.streak;
    if (session.streak > 0 && session.streak % 5 === 0) points = Math.floor(points * 1.15);
    session.score += points;
    if (callbacks.onCorrect) {
      callbacks.onCorrect({ note, points, streak: session.streak, score: session.score, type: 'chord' });
    }
    updateChallengeProgress({ type: 'chord', note, beat });
  } else if (inScale && cfg.scaleAllowed) {
    let points = cfg.scalePoints;
    if (isStrongBeat) points += Math.floor(timingBonus * 0.5);
    session.correctScale++;
    session.streak++;
    cs.correct++;
    np.correct++;
    if (session.streak > session.maxStreak) session.maxStreak = session.streak;
    if (session.streak > 0 && session.streak % 5 === 0) points = Math.floor(points * 1.15);
    session.score += points;
    if (callbacks.onCorrect) {
      callbacks.onCorrect({ note, points, streak: session.streak, score: session.score, type: 'scale' });
    }
    updateChallengeProgress({ type: 'scale', note, beat });
  } else {
    session.wrong++;
    cs.wrong++;
    np.wrong++;
    if (cfg.wrongBreaks) session.streak = 0;
    if (callbacks.onWrong) {
      callbacks.onWrong({ note, score: session.score, streak: session.streak });
    }
    updateChallengeProgress({ type: 'wrong', note, beat });
  }

  session.needsChange = true;
  session.lastScoredNote = note;
}

export function isActive() {
  return session && session.active;
}
