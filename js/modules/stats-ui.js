import { getStats } from './stats.js';
import { $ } from '../utils/dom.js';

const globalEl   = $('#statsGlobal');
const chartEl    = $('#statsChart');
const historyEl  = $('#statsHistory');
const filterSel  = $('#statsFilter');
const typeTabs   = $('#statsTypeTabs');

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
}

export function setScaleFilter(filter) {
  currentScaleFilter = filter;
}

export function render() {
  const filter = currentType === 'improvisation' ? null : currentScaleFilter;
  const data = getStats(filter, currentType);

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
      const mode = s.type === 'improvisation'
        ? '🎵 Impro ' + s.root + ' ' + (s.scale || '').replace(/_/g, ' ')
        : (s.arpeggio !== 'none'
          ? s.root + ' arp ' + (s.arpeggio || '').replace(/_/g, ' ')
          : s.root + ' ' + (s.scale || '').replace(/_/g, ' '));
      const timeStr = s.type === 'improvisation' && s.duration
        ? formatTime(s.duration)
        : (s.correct || 0) + '/' + (s.total || 10);
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
