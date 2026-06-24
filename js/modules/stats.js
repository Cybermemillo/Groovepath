const STORAGE_KEY = 'basslab_stats';

function getSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-50)));
}

export function recordSession(data) {
  const sessions = getSessions();
  sessions.push({
    type: 'training',
    date: new Date().toISOString(),
    root: data.root,
    scale: data.scale,
    arpeggio: data.arpeggio,
    range: data.range,
    score: data.score,
    correct: data.correct,
    wrong: data.wrong,
    maxStreak: data.maxStreak,
    total: data.total,
  });
  saveSessions(sessions);
}

export function recordImprovisation(data) {
  const sessions = getSessions();
  sessions.push({
    type: 'improvisation',
    date: new Date().toISOString(),
    root: data.root,
    scale: data.scale,
    score: data.score,
    correct: data.correctChord + data.correctScale,
    wrong: data.wrong,
    maxStreak: data.maxStreak,
    duration: data.duration,
  });
  saveSessions(sessions);
}

export function recordFlashcards(data) {
  const sessions = getSessions();
  sessions.push({
    type: 'flashcards',
    date: new Date().toISOString(),
    score: data.score,
    correct: data.correct,
    wrong: data.wrong,
    maxStreak: data.maxStreak,
    total: data.rounds,
  });
  saveSessions(sessions);
}

export function clearStats() {
  localStorage.removeItem(STORAGE_KEY);
}

const GOAL_KEY = 'basslab_daily_goal';

export function getDailyGoal() {
  try {
    return parseInt(localStorage.getItem(GOAL_KEY)) || 30;
  } catch {
    return 30;
  }
}

export function setDailyGoal(minutes) {
  localStorage.setItem(GOAL_KEY, String(Math.max(1, Math.min(600, minutes))));
}

export function getFilters(type) {
  const sessions = getSessions().filter(s => !type || s.type === (type === 'all' ? s.type : type));
  const seen = new Set();
  const filters = [];

  sessions.forEach(s => {
    if (s.type !== 'training') return;
    const key = s.arpeggio !== 'none'
      ? `arp:${s.root}|${s.arpeggio}`
      : `${s.root}|${s.scale}`;
    if (!seen.has(key)) {
      seen.add(key);
      filters.push({ root: s.root, scale: s.scale, arpeggio: s.arpeggio });
    }
  });

  filters.sort((a, b) => (a.root + a.scale + a.arpeggio).localeCompare(b.root + b.scale + b.arpeggio));
  return filters;
}

export function getStats(filter = null, typeFilter = null) {
  let sessions = getSessions();

  if (typeFilter && typeFilter !== 'all') {
    sessions = sessions.filter(s => s.type === typeFilter);
  }

  if (filter) {
    sessions = sessions.filter(s =>
      s.root === filter.root &&
      s.scale === filter.scale &&
      s.arpeggio === filter.arpeggio
    );
  }

  const total = sessions.length;
  if (total === 0) return null;

  const correct = sessions.reduce((sum, s) => sum + (s.correct || 0), 0);
  const wrong = sessions.reduce((sum, s) => sum + (s.wrong || 0), 0);
  const totalNotes = correct + wrong;
  const accuracy = totalNotes > 0 ? Math.round((correct / totalNotes) * 100) : 0;
  const bestScore = Math.max(...sessions.map(s => s.score || 0));
  const bestStreak = Math.max(...sessions.map(s => s.maxStreak || 0));
  const avgScore = Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / total);
  const practiceTime = sessions.reduce((sum, s) => sum + (s.duration || (s.total || 0) * 15), 0);

  return {
    sessions: total,
    correct,
    wrong,
    totalNotes,
    accuracy,
    bestScore,
    bestStreak,
    avgScore,
    practiceTime,
    recent: sessions.slice(-10).reverse(),
    all: sessions,
  };
}
