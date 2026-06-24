import { ACHIEVEMENTS } from './achievements-data.js';
import { EASTEREGGS } from './eastereggs-data.js';
import * as practiceTime from './practice-time.js';

const STORAGE_KEY = 'basslab_achievements';

const ALL_DEFS = [...ACHIEVEMENTS, ...EASTEREGGS];

// ── Tracking accumulators (persisted) ──
const TRACKER_KEY = 'basslab_achievements_tracker';

function getTracker() {
  try {
    return JSON.parse(localStorage.getItem(TRACKER_KEY)) || getDefaultTracker();
  } catch {
    return getDefaultTracker();
  }
}

function saveTracker(t) {
  try {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(t));
  } catch { /* ignore */ }
}

function getDefaultTracker() {
  return {
    trainingStringsHit: [false, false, false, false],
    tunerStringsSeen: [false, false, false, false],
    tunerFretsSeen: [],
    tunerFirstStringTime: 0,
    tunerAllStarted: false,
    tunerFastDone: false,
    intervalsTypesHit: [],
    routinesPredefinedCompleted: 0,
    routinesCustomCompleted: 0,
    routinesCustomCreated: 0,
    routinesMarathonDone: false,
    routinesWeekDates: [],
    uploadedTracksCount: 0,
    trainingCombinedMaxStreak: 0,
    intervalsCombinedMaxStreak: 0,
    practicedLateNight: false,
    practicedEarlyMorning: false,
    sourcesSeen: [],
    dailyGoalAwardedDate: '',
    improvisationGuidedSessions: 0,
    improvisationBootsySessions: 0,
    improvisationMaxStreak: 0,
    improvisationJazzSeconds: 0,
  };
}

// ── Public API ──

export function recordTrainingResult({ correct, maxStreak, stringsHit }) {
  const t = getTracker();
  if (stringsHit !== undefined) {
    stringsHit.forEach(idx => { if (idx >= 0 && idx < 4) t.trainingStringsHit[idx] = true; });
  }
  if (maxStreak !== undefined && maxStreak > t.trainingCombinedMaxStreak) {
    t.trainingCombinedMaxStreak = maxStreak;
  }
  saveTracker(t);
}

export function recordIntervalResult({ correct, maxStreak, typesHit }) {
  const t = getTracker();
  if (typesHit !== undefined) {
    typesHit.forEach(type => { if (!t.intervalsTypesHit.includes(type)) t.intervalsTypesHit.push(type); });
  }
  if (maxStreak !== undefined && maxStreak > t.intervalsCombinedMaxStreak) {
    t.intervalsCombinedMaxStreak = maxStreak;
  }
  saveTracker(t);
}

export function recordImprovisationResult({ difficulty, guided, maxStreak, style, durationSec }) {
  const t = getTracker();
  if (guided && t.improvisationGuidedSessions < 999) t.improvisationGuidedSessions++;
  if (difficulty === 'bootsy_level' && t.improvisationBootsySessions < 999) t.improvisationBootsySessions++;
  if (maxStreak !== undefined && maxStreak > t.improvisationMaxStreak) {
    t.improvisationMaxStreak = maxStreak;
  }
  if (style === 'jazz' && durationSec) {
    t.improvisationJazzSeconds += durationSec;
  }
  saveTracker(t);
}

export function recordTunerPitch({ stringIndex, fret }) {
  const t = getTracker();
  if (stringIndex !== undefined && stringIndex >= 0 && stringIndex < 4) {
    if (!t.tunerStringsSeen[stringIndex]) {
      const now = Date.now();
      if (t.tunerAllStarted && !t.tunerFastDone) {
        // check if all 4 seen and under 30s
        const allSeen = t.tunerStringsSeen.every(v => v);
        if (allSeen && (now - t.tunerFirstStringTime) <= 30000) {
          t.tunerFastDone = true;
        }
      } else if (!t.tunerAllStarted) {
        t.tunerAllStarted = true;
        t.tunerFirstStringTime = now;
        // reset tracking on first seen
        t.tunerStringsSeen = [false, false, false, false];
      }
      t.tunerStringsSeen[stringIndex] = true;
    }
  }
  if (fret !== undefined && fret > 0 && !t.tunerFretsSeen.includes(fret)) {
    t.tunerFretsSeen.push(fret);
  }
  saveTracker(t);
}

export function recordRoutineCompleted({ isBuiltin, duration, date }) {
  const t = getTracker();
  if (isBuiltin) {
    t.routinesPredefinedCompleted++;
  } else {
    t.routinesCustomCompleted++;
  }
  if (duration >= 1200) {
    t.routinesMarathonDone = true;
  }
  if (date) {
    const d = new Date(date).toISOString().slice(0, 10);
    if (!t.routinesWeekDates.includes(d)) t.routinesWeekDates.push(d);
  }
  saveTracker(t);
}

export function recordRoutineCreated() {
  const t = getTracker();
  t.routinesCustomCreated++;
  saveTracker(t);
}

export function recordUploadedTrack() {
  const t = getTracker();
  t.uploadedTracksCount++;
  saveTracker(t);
}

export function recordPracticeTime(minutes) {
  const t = getTracker();
  const h = new Date().getHours();
  if (h >= 22 || h <= 4) t.practicedLateNight = true;
  if (h >= 5 && h <= 7) t.practicedEarlyMorning = true;
  saveTracker(t);
}

export function recordSource(source) {
  const t = getTracker();
  if (!t.sourcesSeen.includes(source)) {
    t.sourcesSeen.push(source);
    saveTracker(t);
  }
}

// ── Snapshot builder ──

function getGoalStreak(dailyMs) {
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(now);
    check.setDate(check.getDate() - i);
    const key = check.getFullYear() + '-' + String(check.getMonth() + 1).padStart(2, '0') + '-' + String(check.getDate()).padStart(2, '0');
    const m = dailyMs[key] || 0;
    if (m >= 1) { // just need any practice on that day, goal check done via dailyGoalMinutes
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getGoalDaysInRow(dailyMs, goalMinutes) {
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(now);
    check.setDate(check.getDate() - i);
    const key = check.getFullYear() + '-' + String(check.getMonth() + 1).padStart(2, '0') + '-' + String(check.getDate()).padStart(2, '0');
    const m = dailyMs[key] || 0;
    if (m >= goalMinutes) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function buildSnapshot(unlockedIds) {
  const tracker = getTracker();
  const dailyMs = practiceTime.getDailyMinutes();
  const streaks = practiceTime.getStreaks();
  const totalMinutes = Object.values(dailyMs).reduce((a, b) => a + b, 0);

  const today = new Date();
  const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  // Compute training totals from stats
  let trainingTotalRounds = 0, trainingCorrect = 0, trainingWrong = 0, trainingMaxStreak = 0, trainingTotalScore = 0;
  try {
    const sessions = JSON.parse(localStorage.getItem('basslab_stats')) || [];
    sessions.filter(s => s.type === 'training').forEach(s => {
      trainingTotalRounds += (s.total || 0);
      trainingCorrect += (s.correct || 0);
      trainingWrong += (s.wrong || 0);
      if ((s.maxStreak || 0) > trainingMaxStreak) trainingMaxStreak = s.maxStreak;
      trainingTotalScore += (s.score || 0);
    });
  } catch {}

  // Compute interval totals
  let intervalsTotalRounds = 0, intervalsCorrect = 0, intervalsWrong = 0, intervalsMaxStreak = 0;
  try {
    const sessions = JSON.parse(localStorage.getItem('basslab_stats')) || [];
    sessions.filter(s => s.type === 'flashcards').forEach(s => {
      intervalsTotalRounds += (s.total || 0);
      intervalsCorrect += (s.correct || 0);
      intervalsWrong += (s.wrong || 0);
      if ((s.maxStreak || 0) > intervalsMaxStreak) intervalsMaxStreak = s.maxStreak;
    });
  } catch {}

  const avgReactionTime = trainingCorrect > 0 ? 2.5 : 999; // approximate fallback

  const settings = (() => {
    try {
      return JSON.parse(localStorage.getItem('basslab_settings')) || {};
    } catch { return {}; }
  })();

  const isCustomTuning = settings.tuning === 'custom';

  return {
    totalPracticeMinutes: totalMinutes,
    dailyGoalMinutes: settings.dailyGoalMinutes || 30,
    todayMinutes: dailyMs[todayKey] || 0,
    todayKey,
    streak: streaks,
    goalStreak: getGoalDaysInRow(dailyMs, settings.dailyGoalMinutes || 30),
    practicedLateNight: tracker.practicedLateNight,
    practicedEarlyMorning: tracker.practicedEarlyMorning,
    improvisationMinutes: dailyMs['improvisation'] || 0,
    improvisation: {
      guidedSessions: tracker.improvisationGuidedSessions || 0,
      bootsySessions: tracker.improvisationBootsySessions || 0,
      maxStreak: tracker.improvisationMaxStreak || 0,
      jazzMinutes: Math.floor((tracker.improvisationJazzSeconds || 0) / 60),
    },
    training: {
      totalRounds: trainingTotalRounds,
      correct: trainingCorrect,
      wrong: trainingWrong,
      maxStreak: Math.max(trainingMaxStreak, tracker.trainingCombinedMaxStreak),
      totalScore: trainingTotalScore,
      avgReactionTime: avgReactionTime,
      stringsHit: tracker.trainingStringsHit.filter(Boolean).length,
    },
    intervals: {
      totalRounds: intervalsTotalRounds,
      correct: intervalsCorrect,
      wrong: intervalsWrong,
      maxStreak: Math.max(intervalsMaxStreak, tracker.intervalsCombinedMaxStreak),
      typesHit: tracker.intervalsTypesHit.length,
    },
    routines: {
      predefinedCompleted: tracker.routinesPredefinedCompleted,
      customCompleted: tracker.routinesCustomCompleted,
      customCreated: tracker.routinesCustomCreated,
      marathonCompleted: tracker.routinesMarathonDone,
      weeklyCompleted: tracker.routinesWeekDates.length,
    },
    tuner: {
      stringsSeen: tracker.tunerStringsSeen.filter(Boolean).length,
      fastAttempt: tracker.tunerFastDone,
      fretsSeen: tracker.tunerFretsSeen.length,
    },
    settings: {
      tuning: settings.tuning || 'standard',
      customTuning: isCustomTuning,
    },
    backingMinutes: dailyMs['backing'] || 0,
    metronomeMinutes: 0, // computed below
    uploadedTracksCount: tracker.uploadedTracksCount,
    combinedMaxStreak: Math.max(tracker.trainingCombinedMaxStreak, tracker.intervalsCombinedMaxStreak),
    totalUnlocked: unlockedIds.length,
    categoryCount: 0,
  };
}

// Compute backing/metronome minutes from practice data
function enrichSnapshot(snap) {
  const tracker = getTracker();

  // Count distinct activity categories from sessions + tracker sources
  const categories = new Set();
  try {
    const sessions = JSON.parse(localStorage.getItem('basslab_stats')) || [];
    sessions.forEach(s => {
      if (s.type === 'training') categories.add('training');
      if (s.type === 'improvisation') categories.add('improvisation');
      if (s.type === 'flashcards') categories.add('intervals');
    });
  } catch {}
  if (tracker.sourcesSeen.includes('metronome')) categories.add('metronome');
  if (tracker.sourcesSeen.includes('backing')) categories.add('backing');

  return { ...snap, categoryCount: categories.size };
}

// ── Check and unlock ──

let onUnlockedCallback = null;
let onDailyGoalCallback = null;

export function onUnlocked(cb) {
  onUnlockedCallback = cb;
}

export function onDailyGoalMet(cb) {
  onDailyGoalCallback = cb;
}

export function checkAchievements() {
  // Auto-track late night / early morning based on current hour
  const t = getTracker();
  const h = new Date().getHours();
  if (h >= 22 || h <= 4) t.practicedLateNight = true;
  if (h >= 5 && h <= 7) t.practicedEarlyMorning = true;
  saveTracker(t);

  const data = getUnlockData();
  const snapshot = enrichSnapshot(buildSnapshot(data.unlocked.map(u => u.id)));
  const newlyUnlocked = [];

  ALL_DEFS.forEach(def => {
    if (data.unlocked.find(u => u.id === def.id)) return;
    if (def.condition && def.condition(snapshot)) {
      const entry = { id: def.id, date: new Date().toISOString(), seen: false };
      data.unlocked.push(entry);
      newlyUnlocked.push(entry);
    }
  });

  if (newlyUnlocked.length > 0) {
    saveUnlockData(data);
    if (onUnlockedCallback) {
      newlyUnlocked.forEach(entry => onUnlockedCallback(entry));
    }
  }

  // Check daily goal
  const dailyMs = practiceTime.getDailyMinutes();
  const today = new Date();
  const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const todayMinutes = dailyMs[todayKey] || 0;
  const goal = (() => { try { return JSON.parse(localStorage.getItem('basslab_settings') || '{}').dailyGoalMinutes || 30; } catch { return 30; } })();
  if (todayMinutes >= goal && t.dailyGoalAwardedDate !== todayKey) {
    t.dailyGoalAwardedDate = todayKey;
    saveTracker(t);
    if (onDailyGoalCallback) onDailyGoalCallback(todayKey);
  }

  return { all: data, newlyUnlocked };
}

export function checkEasteregg(id) {
  const data = getUnlockData();
  if (data.unlocked.find(u => u.id === id)) return null;
  const entry = { id, date: new Date().toISOString(), seen: false };
  data.unlocked.push(entry);
  saveUnlockData(data);
  if (onUnlockedCallback) onUnlockedCallback(entry);
  return entry;
}

export function markSeen(id) {
  const data = getUnlockData();
  const entry = data.unlocked.find(u => u.id === id);
  if (entry) entry.seen = true;
  saveUnlockData(data);
}

export function getUnlockData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { unlocked: [] };
  } catch {
    return { unlocked: [] };
  }
}

export function getUnseenCount() {
  return getUnlockData().unlocked.filter(u => !u.seen).length;
}

export function getUnlockedIds() {
  return getUnlockData().unlocked.map(u => u.id);
}

export function getUnlockedCount() {
  return getUnlockData().unlocked.length;
}

export function getTotalPoints() {
  const unlocked = getUnlockData().unlocked.map(u => u.id);
  let points = 0;
  ALL_DEFS.forEach(def => {
    if (unlocked.includes(def.id)) {
    switch (def.rarity) {
        case 'bronze': points += 75; break;
        case 'silver': points += 200; break;
        case 'gold': points += 400; break;
        case 'platinum': points += 800; break;
        case 'special': break;
      }
    }
  });
  return points;
}

export function getProgress(defId) {
  const def = ALL_DEFS.find(d => d.id === defId);
  if (!def || !def.progress) return null;
  const snapshot = enrichSnapshot(buildSnapshot(getUnlockedIds()));
  return def.progress(snapshot);
}

export function getAllAchievements() {
  return ALL_DEFS.map(def => {
    const data = getUnlockData();
    const unlocked = data.unlocked.find(u => u.id === def.id);
    let progress = null;
    if (!unlocked && def.progress) {
      progress = def.progress(enrichSnapshot(buildSnapshot(data.unlocked.map(u => u.id))));
    }
    return {
      ...def,
      unlocked: !!unlocked,
      unlockedAt: unlocked ? unlocked.date : null,
      seen: unlocked ? unlocked.seen : false,
      progress,
    };
  });
}

function saveUnlockData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}
