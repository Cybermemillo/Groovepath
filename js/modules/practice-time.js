const STORAGE_KEY = 'basslab_practice_time';

const activeTimers = {};

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function migrateOldFormat(data) {
  let migrated = false;
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'number') {
      data[key] = { default: val };
      migrated = true;
    }
  }
  if (migrated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  return data;
}

function getData() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return migrateOldFormat(raw);
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function start(source) {
  stop(source);
  activeTimers[source] = Date.now();
}

export function stop(source) {
  if (!activeTimers[source]) return 0;
  const elapsed = Math.round((Date.now() - activeTimers[source]) / 1000);
  delete activeTimers[source];
  if (elapsed <= 0) return 0;

  const data = getData();
  const key = todayKey();
  if (!data[key] || typeof data[key] === 'number') {
    data[key] = {};
  }
  data[key][source] = (data[key][source] || 0) + elapsed;
  saveData(data);
  return elapsed;
}

export function getTodayMinutes(source) {
  const data = getData();
  const day = data[todayKey()];
  if (!day) return 0;
  if (typeof day === 'number') return Math.round(day / 60);
  if (source) return Math.round((day[source] || 0) / 60);
  return Math.round(Object.values(day).reduce((a, b) => a + b, 0) / 60);
}

export function getDailyMinutes() {
  const data = getData();
  const map = {};
  for (const [date, value] of Object.entries(data)) {
    if (typeof value === 'number') {
      map[date] = Math.round(value / 60);
    } else {
      map[date] = Math.round(Object.values(value).reduce((a, b) => a + b, 0) / 60);
    }
  }
  return map;
}

export function getTotalMinutes() {
  const data = getData();
  let total = 0;
  for (const value of Object.values(data)) {
    if (typeof value === 'number') {
      total += value;
    } else {
      total += Object.values(value).reduce((a, b) => a + b, 0);
    }
  }
  return Math.round(total / 60);
}

export function getMinutesBySource() {
  const data = getData();
  const sources = {};
  for (const value of Object.values(data)) {
    if (typeof value === 'number') {
      sources.default = (sources.default || 0) + value;
    } else {
      for (const [src, secs] of Object.entries(value)) {
        sources[src] = (sources[src] || 0) + secs;
      }
    }
  }
  const result = {};
  for (const [src, secs] of Object.entries(sources)) {
    result[src] = Math.round(secs / 60);
  }
  return result;
}

export function getStreaks() {
  const daily = getDailyMinutes();
  const dates = Object.keys(daily).sort();

  if (dates.length === 0) return { current: 0, max: 0 };

  const practiceDays = new Set(dates);

  let current = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    const key = check.getFullYear() + '-' + String(check.getMonth() + 1).padStart(2, '0') + '-' + String(check.getDate()).padStart(2, '0');
    if (practiceDays.has(key)) {
      current++;
    } else {
      break;
    }
  }

  let max = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    const d1 = new Date(dates[i] + 'T00:00:00');
    if (i === 0) {
      run = 1;
    } else {
      const d0 = new Date(dates[i - 1] + 'T00:00:00');
      const diff = (d1 - d0) / 86400000;
      if (diff === 1) {
        run++;
      } else {
        run = 1;
      }
    }
    if (run > max) max = run;
  }

  return { current, max };
}

export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}
