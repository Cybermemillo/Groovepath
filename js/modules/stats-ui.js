import { getStats, getDailyGoal, setDailyGoal } from './stats.js';
import { getDailyMinutes, getTodayMinutes, getStreaks } from './practice-time.js';
import { $ } from '../utils/dom.js';

const globalEl   = $('#statsGlobal');
const chartEl    = $('#statsChart');
const historyEl  = $('#statsHistory');
const filterSel  = $('#statsFilter');
const typeTabs   = $('#statsTypeTabs');
const streakCur  = $('#streakCurrent');
const streakMax  = $('#streakMax');
const streakToday= $('#streakToday');
const goalInput  = $('#dailyGoalInput');
const goalFill   = $('#goalFill');
const goalText   = $('#goalText');
const heatmapEl  = $('#heatmapContainer');

const FORMATTER = new Intl.DateTimeFormat('es', { month: 'short', day: 'numeric' });

let currentScaleFilter = null;
let currentType = 'all';

function formatTime(sec) {
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  return m + 'm';
}

function barColor(correct, total) {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 1) return 'var(--scale-note)';
  if (ratio >= 0.7) return '#D4A017';
  if (ratio >= 0.4) return '#C07020';
  return 'var(--accent)';
}

/* ─── Calendar / streaks ─── */
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAY_NAMES = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

function heatmapLevel(minutes) {
  if (minutes <= 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}

function renderCalendar() {
  const daily = getDailyMinutes();
  const streaks = getStreaks();
  const today = getTodayMinutes();
  const goal = getDailyGoal();

  streakCur.textContent = streaks.current;
  streakMax.textContent = streaks.max;
  streakToday.textContent = today;

  // Goal
  const goalPct = Math.min(100, Math.round((today / goal) * 100));
  goalFill.style.width = goalPct + '%';
  goalInput.value = goal;
  if (today >= goal) {
    goalText.textContent = '\u2713 \u00A1Objetivo de hoy alcanzado!';
    goalText.className = 'goal-text done';
  } else {
    goalText.textContent = today + ' / ' + goal + ' min';
    goalText.className = 'goal-text';
  }

  // Heatmap — proper calendar weeks (Mon–Sun)
  const now = new Date();
  const todayWeekDay = (now.getDay() + 6) % 7; // Mon=0 … Sun=6

  // Find the Monday of the current week
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - todayWeekDay);
  thisMonday.setHours(0, 0, 0, 0);

  // Start 52 weeks before this Monday
  const start = new Date(thisMonday);
  start.setDate(start.getDate() - 52 * 7);

  // Build flat list of days from start to today
  const days = [];
  const cursor = new Date(start);
  while (cursor <= now) {
    const key = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0') + '-' + String(cursor.getDate()).padStart(2, '0');
    const mins = daily[key] || 0;
    days.push({ date: new Date(cursor), key, mins, level: heatmapLevel(mins) });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Group into columns of 7 (Mon–Sun). First column may be partial.
  const weeks = [];
  const firstDayOfWeek = (days[0].date.getDay() + 6) % 7; // Mon=0
  if (firstDayOfWeek > 0) {
    // Fill empty cells at top of first column
    const padding = [];
    for (let p = 0; p < firstDayOfWeek; p++) {
      padding.push(null);
    }
    weeks.push([...padding, ...days.splice(0, 7 - firstDayOfWeek)]);
  }
  while (days.length > 0) {
    weeks.push(days.splice(0, 7));
  }

  const numCols = weeks.length;

  // Month labels above heatmap
  let monthHTML = '<div class="heatmap-months">';
  let lastM = -1;
  for (let c = 0; c < numCols; c++) {
    // Find first non-null cell in this week column
    const firstDay = weeks[c].find(d => d !== null);
    if (firstDay) {
      const m = firstDay.date.getMonth();
      if (m !== lastM) {
        monthHTML += '<span class="hm-label">' + MONTHS[m] + '</span>';
        lastM = m;
      } else {
        monthHTML += '<span class="hm-cell"></span>';
      }
    } else {
      monthHTML += '<span class="hm-cell"></span>';
    }
  }
  monthHTML += '</div>';

  // Heatmap grid
  let gridHTML = '<div class="heatmap-grid">';
  for (let c = 0; c < numCols; c++) {
    gridHTML += '<div class="heatmap-col">';
    for (let r = 0; r < 7; r++) {
      const cell = weeks[c][r] || null;
      if (cell) {
        const title = cell.date.toLocaleDateString('es', { day:'numeric', month:'short' }) + ': ' + cell.mins + ' min';
        gridHTML += '<div class="heatmap-cell" data-level="' + cell.level + '" title="' + title + '"></div>';
      } else {
        gridHTML += '<div class="heatmap-cell hm-empty-cell"></div>';
      }
    }
    gridHTML += '</div>';
  }
  gridHTML += '</div>';

  const legend =
    '<div class="heatmap-legend">' +
      '<span>Menos</span>' +
      '<div class="heatmap-legend-cell" style="background:var(--border)"></div>' +
      '<div class="heatmap-legend-cell" style="background:#1A4A3A"></div>' +
      '<div class="heatmap-legend-cell" style="background:#218060"></div>' +
      '<div class="heatmap-legend-cell" style="background:#2EAD80"></div>' +
      '<div class="heatmap-legend-cell" style="background:#4EC9B0"></div>' +
      '<span>Más</span>' +
    '</div>';

  heatmapEl.innerHTML = monthHTML + gridHTML + legend;
}

export function init() {
  typeTabs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      typeTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
      if (currentType !== 'all') {
        filterSel.value = '';
        currentScaleFilter = null;
        filterSel.innerHTML = '<option value="">Global</option>';
      }
      render();
    });
  });

  goalInput.addEventListener('change', () => {
    const val = parseInt(goalInput.value) || 30;
    setDailyGoal(val);
    renderCalendar();
  });

  goalInput.value = getDailyGoal();
}

export function setScaleFilter(filter) {
  currentScaleFilter = filter;
}

export function render() {
  const filter = currentType === 'improvisation' ? null : currentScaleFilter;
  const data = getStats(filter, currentType);

  renderCalendar();

  if (!data) {
    globalEl.innerHTML = '<p class="stats-empty">Sin datos aún. ¡Completa una sesión!</p>';
    chartEl.innerHTML = '';
    historyEl.innerHTML = '';
    return;
  }

  globalEl.innerHTML =
    '<div class="stats-grid">' +
      '<div class="stat-card"><span class="sc-val">' + data.sessions + '</span><span class="sc-lbl">Sesiones</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + data.accuracy + '%</span><span class="sc-lbl">Precisión</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + data.bestScore + '</span><span class="sc-lbl">Mejor punt.</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + data.avgScore + '</span><span class="sc-lbl">Promedio</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + data.bestStreak + '</span><span class="sc-lbl">Mejor racha</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + formatTime(data.practiceTime) + '</span><span class="sc-lbl">Práctica est.</span></div>' +
    '</div>';

  if (data.recent.length > 0) {
    const maxScore = Math.max(...data.recent.map(s => s.score || 0)) || 1;
    let chartHTML = '<div class="chart-title">Últimas sesiones</div><div class="chart-bars">';
    data.recent.forEach(s => {
      const score = s.score || 0;
      const correct = s.correct || 0;
      const total = s.total || (s.correct + s.wrong || 10);
      const h = Math.max(4, Math.round((score / maxScore) * 100));
      const dateStr = FORMATTER.format(new Date(s.date));
      chartHTML +=
        '<div class="chart-col" title="' + dateStr + '\n' + score + ' pts (' + correct + '/' + total + ')">' +
          '<div class="chart-bar" style="height:' + h + '%;background:' + barColor(correct, total) + '"></div>' +
          '<span class="chart-label">' + dateStr + '</span>' +
        '</div>';
    });
    chartHTML += '</div>';
    chartEl.innerHTML = chartHTML;
  } else {
    chartEl.innerHTML = '';
  }

  if (data.recent.length > 0) {
    let histHTML = '<div class="history-title">Historial</div><div class="history-list">';
    data.recent.slice(0, 10).forEach(s => {
      let mode, timeStr;
      if (s.type === 'improvisation') {
        mode = '\uD83C\uDFB5 Impro ' + s.root + ' ' + (s.scale || '').replace(/_/g, ' ');
        timeStr = s.duration ? formatTime(s.duration) : '—';
      } else if (s.type === 'flashcards') {
        mode = '\uD83C\uDCA0 Identifica notas';
        timeStr = (s.correct || 0) + '/' + (s.total || 10);
      } else if (s.arpeggio && s.arpeggio !== 'none') {
        mode = s.root + ' arp ' + (s.arpeggio || '').replace(/_/g, ' ');
        timeStr = (s.correct || 0) + '/' + (s.total || 10);
      } else {
        mode = s.root + ' ' + (s.scale || '').replace(/_/g, ' ');
        timeStr = (s.correct || 0) + '/' + (s.total || 10);
      }
      histHTML +=
        '<div class="history-row">' +
          '<span class="hr-date">' + FORMATTER.format(new Date(s.date)) + '</span>' +
          '<span class="hr-mode">' + mode + '</span>' +
          '<span class="hr-score">' + (s.score || 0) + ' pts</span>' +
          '<span class="hr-acc">' + timeStr + '</span>' +
        '</div>';
    });
    histHTML += '</div>';
    historyEl.innerHTML = histHTML;
  } else {
    historyEl.innerHTML = '';
  }
}
