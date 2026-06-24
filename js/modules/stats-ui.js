import { getStats, getDailyGoal, setDailyGoal, clearStats, getFilters } from './stats.js';
import { getDailyMinutes, getTodayMinutes, getStreaks, getTotalMinutes, getMinutesBySource } from './practice-time.js';
import { $ } from '../utils/dom.js';

const backdropEl = $('#statsModalBackdrop');
const modalEl    = $('#statsModalContent');
const closeBtn   = $('#statsModalClose');

const globalEl   = $('#statsGlobal');
const chartEl    = $('#statsChart');
const historyEl  = $('#statsHistory');
const filterSel  = $('#statsFilter');
const typeTabs   = $('#statsTypeTabs');
const streakCur  = $('#streakCurrent');
const streakMax  = $('#streakMax');
const streakToday = $('#streakToday');
const goalInput  = $('#dailyGoalInput');
const goalFill   = $('#goalFill');
const goalText   = $('#goalText');
const heatmapEl  = $('#heatmapContainer');
const overviewEl = $('#statsOverview');
const sourcesEl  = $('#statsSources');
const clearBtn   = $('#statsClear');

const FORMATTER = new Intl.DateTimeFormat('es', { month: 'short', day: 'numeric' });

let currentScaleFilter = null;
let currentType = 'all';

function fmtTime(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}

function formatTimeSec(sec) {
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

function getLevel(minutes) {
  if (minutes >= 6000) return 'Leyenda';
  if (minutes >= 3000) return 'Virtuoso';
  if (minutes >= 1000) return 'Profesional';
  if (minutes >= 300) return 'Avanzado';
  if (minutes >= 60) return 'Intermedio';
  return 'Principiante';
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

  const now = new Date();
  const todayWeekDay = (now.getDay() + 6) % 7;

  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - todayWeekDay);
  thisMonday.setHours(0, 0, 0, 0);

  const start = new Date(thisMonday);
  start.setDate(start.getDate() - 52 * 7);

  const days = [];
  const cursor = new Date(start);
  while (cursor <= now) {
    const key = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0') + '-' + String(cursor.getDate()).padStart(2, '0');
    const mins = daily[key] || 0;
    days.push({ date: new Date(cursor), key, mins, level: heatmapLevel(mins) });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks = [];
  const firstDayOfWeek = (days[0].date.getDay() + 6) % 7;
  if (firstDayOfWeek > 0) {
    const padding = [];
    for (let p = 0; p < firstDayOfWeek; p++) padding.push(null);
    weeks.push([...padding, ...days.splice(0, 7 - firstDayOfWeek)]);
  }
  while (days.length > 0) {
    weeks.push(days.splice(0, 7));
  }

  const numCols = weeks.length;

  let monthHTML = '<div class="heatmap-months">';
  let lastM = -1;
  for (let c = 0; c < numCols; c++) {
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

function renderOverview() {
  const totalMin = getTotalMinutes();
  const streaks = getStreaks();
  const sources = getMinutesBySource();

  // Total sessions
  let totalSessions = 0;
  try {
    const sessions = JSON.parse(localStorage.getItem('basslab_stats')) || [];
    totalSessions = sessions.length;
  } catch {}

  // Trend last 7 days
  const daily = getDailyMinutes();
  let last7 = 0;
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    last7 += daily[key] || 0;
  }

  // Top root/scale
  let topLabel = '\u2014';
  try {
    const sessions = JSON.parse(localStorage.getItem('basslab_stats')) || [];
    const counts = {};
    sessions.forEach(s => {
      if (s.type === 'training') {
        const k = s.root + ' ' + (s.scale || '').replace(/_/g, ' ');
        counts[k] = (counts[k] || 0) + 1;
      }
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) topLabel = top[0] + ' (' + top[1] + ')';
  } catch {}

  // Best day
  let bestDay = '\u2014';
  let bestMins = 0;
  for (const [date, mins] of Object.entries(daily)) {
    if (mins > bestMins) { bestMins = mins; bestDay = date; }
  }
  if (bestDay !== '\u2014') {
    const d = new Date(bestDay + 'T00:00:00');
    bestDay = d.toLocaleDateString('es', { day:'numeric', month:'short' }) + ' · ' + bestMins + 'm';
  }

  const lvl = getLevel(totalMin);

  overviewEl.innerHTML =
    '<div class="stats-grid">' +
      '<div class="stat-card"><span class="sc-val">' + fmtTime(totalMin) + '</span><span class="sc-lbl">Tiempo total</span><span class="sc-lvl">' + lvl + '</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + streaks.current + '</span><span class="sc-lbl">Racha actual</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + totalSessions + '</span><span class="sc-lbl">Sesiones</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + last7 + 'm</span><span class="sc-lbl">Últimos 7 días</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + topLabel.split(' (')[0] + '</span><span class="sc-lbl">Más practicado</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + bestDay.split(' · ')[0] + '</span><span class="sc-lbl">Mejor día</span></div>' +
    '</div>';

  // Source breakdown
  const srcLabels = { training: 'Entrenamiento', improvisation: 'Improvisación', backing: 'Pistas', metronome: 'Metrónomo' };
  const allMins = Object.values(sources).reduce((a, b) => a + b, 0) || 1;
  let srcHTML = '';
  for (const [src, label] of Object.entries(srcLabels)) {
    const mins = sources[src] || 0;
    const pct = Math.round((mins / allMins) * 100);
    srcHTML +=
      '<div class="stats-source-bar">' +
        '<span class="ssb-label">' + label + '</span>' +
        '<span class="ssb-value">' + fmtTime(mins) + '</span>' +
        '<div class="ssb-bar-bg"><div class="ssb-bar-fill" style="width:' + pct + '%;background:' + (src === 'improvisation' ? 'var(--detected)' : src === 'metronome' ? '#D4A017' : 'var(--scale-note)') + '"></div></div>' +
      '</div>';
  }
  sourcesEl.innerHTML = srcHTML;
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

  // Close modal
  closeBtn.addEventListener('click', close);
  backdropEl.addEventListener('click', (e) => {
    if (e.target === backdropEl) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdropEl.classList.contains('active')) close();
  });

  // Clear stats
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('¿Borrar todas las estadísticas? Esta acción no se puede deshacer.')) {
        clearStats();
        render();
      }
    });
  }

  filterSel.addEventListener('change', () => {
    const val = filterSel.value;
    if (val === '') {
      setScaleFilter(null);
    } else {
      const parts = val.split(':');
      if (parts[0] === 'arp') {
        const [root, arp] = parts[1].split('|');
        setScaleFilter({ root, scale: '', arpeggio: arp });
      } else {
        const [root, scale] = parts[0].split('|');
        setScaleFilter({ root, scale, arpeggio: 'none' });
      }
    }
    render();
  });
}

export function setScaleFilter(filter) {
  currentScaleFilter = filter;
}

export function populateFilter() {
  const val = filterSel.value;
  filterSel.innerHTML = '<option value="">Global</option>';
  getFilters().forEach(f => {
    const label = f.arpeggio !== 'none'
      ? f.root + ' arp ' + f.arpeggio.replace(/_/g, ' ')
      : f.root + ' ' + f.scale.replace(/_/g, ' ');
    const key = f.arpeggio !== 'none'
      ? 'arp:' + f.root + '|' + f.arpeggio
      : f.root + '|' + f.scale;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = label;
    if (key === val) opt.selected = true;
    filterSel.appendChild(opt);
  });
}

export function open() {
  backdropEl.classList.add('active');
  document.body.style.overflow = 'hidden';
  render();
}

export function close() {
  backdropEl.classList.remove('active');
  document.body.style.overflow = '';
}

export function toggle() {
  if (backdropEl.classList.contains('active')) {
    close();
  } else {
    open();
  }
}

export function render() {
  renderHeaderSummary();
  const filter = currentType === 'improvisation' ? null : currentScaleFilter;
  const data = getStats(filter, currentType);

  renderCalendar();
  renderOverview();

  if (!data) {
    globalEl.innerHTML = '<p class="stats-empty">Sin datos aún. ¡Completa una sesión!</p>';
    chartEl.innerHTML = '';
    historyEl.innerHTML = '';
    return;
  }

  const accuracy = data.accuracy || 0;
  globalEl.innerHTML =
    '<div class="stats-grid">' +
      '<div class="stat-card"><span class="sc-val">' + data.sessions + '</span><span class="sc-lbl">Sesiones</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + accuracy + '%</span><span class="sc-lbl">Precisión</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + data.bestScore + '</span><span class="sc-lbl">Mejor punt.</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + data.avgScore + '</span><span class="sc-lbl">Promedio</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + data.bestStreak + '</span><span class="sc-lbl">Mejor racha</span></div>' +
      '<div class="stat-card"><span class="sc-val">' + formatTimeSec(data.practiceTime) + '</span><span class="sc-lbl">Práctica est.</span></div>' +
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
        timeStr = s.duration ? formatTimeSec(s.duration) : '\u2014';
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

export function renderHeaderSummary() {
  const el = $('#headerStatsSummary');
  if (!el) return;
  const totalMin = getTotalMinutes();
  const streaks = getStreaks();
  el.innerHTML = '<span class="hss-strong">' + fmtTime(totalMin) + '</span><span class="hss-icon">\u00B7</span><span class="hss-strong">\uD83D\uDD25 ' + streaks.current + '</span>';
}
