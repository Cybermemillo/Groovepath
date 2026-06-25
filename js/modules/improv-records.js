const STORAGE_KEY = 'basslab_improv_records';

const MASTERY_THRESHOLDS = {
  minSessions: 3,
  minAccuracy: 80,
  minStreak: 10,
  minScore: 1500,
};

function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded */
  }
}

export function getKey(style, difficulty, guided, freeMode) {
  return [
    style || 'any',
    difficulty || 'walking_bass',
    guided ? 'guided' : 'free',
    freeMode ? 'libre' : 'backed',
  ].join('|');
}

export function getBest(style, difficulty, guided, freeMode) {
  const data = getData();
  const key = getKey(style, difficulty, guided, freeMode);
  return data[key] || null;
}

export function getAll() {
  return getData();
}

export function updateBest(result, opts) {
  if (!result) return null;
  const data = getData();
  const key = getKey(opts.style, opts.difficulty, opts.guided, opts.freeMode);
  const prev = data[key] || {
    bestScore: 0,
    bestAccuracy: 0,
    bestStreak: 0,
    sessions: 0,
    mastered: false,
    lastDate: null,
  };
  const total = result.total || 0;
  const correct = (result.correctChord || 0) + (result.correctScale || 0);
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  const next = {
    bestScore: Math.max(prev.bestScore, result.score || 0),
    bestAccuracy: Math.max(prev.bestAccuracy, acc),
    bestStreak: Math.max(prev.bestStreak, result.maxStreak || 0),
    sessions: prev.sessions + 1,
    lastDate: new Date().toISOString().slice(0, 10),
  };

  if (!prev.mastered && next.sessions >= MASTERY_THRESHOLDS.minSessions) {
    if (
      next.bestAccuracy >= MASTERY_THRESHOLDS.minAccuracy &&
      next.bestStreak >= MASTERY_THRESHOLDS.minStreak &&
      next.bestScore >= MASTERY_THRESHOLDS.minScore
    ) {
      next.mastered = true;
    } else {
      next.mastered = false;
    }
  } else {
    next.mastered = prev.mastered;
  }

  data[key] = next;
  saveData(data);

  const isNewRecord = (result.score || 0) > prev.bestScore;
  const isNewMastery = next.mastered && !prev.mastered;

  return { prev, next, isNewRecord, isNewMastery };
}

export function isMastered(style, difficulty, guided, freeMode) {
  const data = getData();
  const key = getKey(style, difficulty, guided, freeMode);
  return !!(data[key] && data[key].mastered);
}

export function getMasteryProgress(style, difficulty, guided, freeMode) {
  const data = getData();
  const key = getKey(style, difficulty, guided, freeMode);
  const rec = data[key] || { bestAccuracy: 0, bestStreak: 0, bestScore: 0, sessions: 0 };
  const accPct = Math.min(100, Math.round((rec.bestAccuracy / MASTERY_THRESHOLDS.minAccuracy) * 100));
  const streakPct = Math.min(100, Math.round((rec.bestStreak / MASTERY_THRESHOLDS.minStreak) * 100));
  const scorePct = Math.min(100, Math.round((rec.bestScore / MASTERY_THRESHOLDS.minScore) * 100));
  const sessionsPct = Math.min(100, Math.round((rec.sessions / MASTERY_THRESHOLDS.minSessions) * 100));
  const overall = Math.round((accPct * 0.4 + streakPct * 0.2 + scorePct * 0.2 + sessionsPct * 0.2));
  return {
    sessions: rec.sessions,
    targetSessions: MASTERY_THRESHOLDS.minSessions,
    accuracy: rec.bestAccuracy,
    targetAccuracy: MASTERY_THRESHOLDS.minAccuracy,
    streak: rec.bestStreak,
    targetStreak: MASTERY_THRESHOLDS.minStreak,
    score: rec.bestScore,
    targetScore: MASTERY_THRESHOLDS.minScore,
    accPct,
    streakPct,
    scorePct,
    sessionsPct,
    overall,
  };
}

export function getAllMasteries() {
  const data = getData();
  return Object.entries(data)
    .filter(([, v]) => v && v.mastered)
    .map(([k, v]) => ({ key: k, ...v }));
}

export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}
