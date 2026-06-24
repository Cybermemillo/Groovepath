import { $ } from '../utils/dom.js';
import * as achievements from './achievements.js';
import * as userPoints from './user-points.js';
import { showToast } from './toast.js';

let modalBuilt = false;
let currentTab = 'achievements';

const RARITY_LABELS = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  platinum: 'Platino',
  special: 'Especial',
};

const RARITY_POINTS = {
  bronze: 75,
  silver: 200,
  gold: 400,
  platinum: 800,
  special: 0,
};

const SOURCE_ICONS = {
  training: 'fa-solid fa-music',
  interval: 'fa-solid fa-wave-square',
  improvisation: 'fa-solid fa-compact-disc',
  metronome: 'fa-solid fa-clock',
  backing: 'fa-solid fa-drum',
  routine: 'fa-solid fa-list-check',
  daily_goal: 'fa-solid fa-bullseye',
  achievement: 'fa-solid fa-trophy',
  spend: 'fa-solid fa-cart-shopping',
};

function buildModal() {
  if (modalBuilt) return;
  modalBuilt = true;

  const backdrop = document.createElement('div');
  backdrop.className = 'ach-backdrop';
  backdrop.id = 'achBackdrop';

  const modal = document.createElement('div');
  modal.className = 'ach-modal';
  modal.innerHTML = `
    <button class="ach-close" id="achClose">&times;</button>
    <div class="ach-header">
      <h2 class="ach-title">Logros y puntos</h2>
      <div class="ach-header-stats">
        <span class="ach-points" id="achUserPoints">0 pts</span>
        <span class="ach-counter" id="achCounter">0 / ${achievements.getAllAchievements().length}</span>
      </div>
    </div>
    <div class="ach-tabs">
      <button class="ach-tab active" data-tab="achievements" id="achTabAchievements">Logros</button>
      <button class="ach-tab" data-tab="history" id="achTabHistory">Historial de puntos</button>
    </div>
    <div class="ach-grid ach-grid-active" id="achGrid"></div>
    <div class="ach-history" id="achHistory" style="display:none"></div>
  `;
  backdrop.appendChild(modal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.body.appendChild(backdrop);

  document.getElementById('achClose').addEventListener('click', closeModal);

  document.getElementById('achTabAchievements').addEventListener('click', () => switchTab('achievements'));
  document.getElementById('achTabHistory').addEventListener('click', () => switchTab('history'));
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('achGrid').style.display = tab === 'achievements' ? '' : 'none';
  document.getElementById('achHistory').style.display = tab === 'history' ? '' : 'none';
  document.getElementById('achTabAchievements').classList.toggle('active', tab === 'achievements');
  document.getElementById('achTabHistory').classList.toggle('active', tab === 'history');
  if (tab === 'achievements') renderGrid();
  if (tab === 'history') renderHistory();
}

function closeModal() {
  const backdrop = document.getElementById('achBackdrop');
  if (backdrop) backdrop.classList.remove('ach-backdrop-active');
}

function openModal() {
  buildModal();
  const backdrop = document.getElementById('achBackdrop');
  if (backdrop) {
    backdrop.classList.add('ach-backdrop-active');
    switchTab(currentTab);
    updateHeaderStats();
  }
}

function updateHeaderStats() {
  const ptsEl = $('#achUserPoints');
  if (ptsEl) ptsEl.textContent = userPoints.getTotal() + ' pts';
  $('#achCounter').textContent = `${achievements.getUnlockedCount()} / ${achievements.getAllAchievements().length}`;
}

function renderGrid() {
  const grid = $('#achGrid');
  if (!grid) return;
  const all = achievements.getAllAchievements();
  const unlocked = all.filter(a => a.unlocked).length;

  grid.innerHTML = '';
  all.forEach(ach => {
    const card = document.createElement('div');
    card.className = 'ach-card' + (ach.unlocked ? ' ach-unlocked' : '') + (ach.rarity ? ' ach-' + ach.rarity : '');

    let body;
    if (ach.secret && !ach.unlocked) {
      body = `<div class="ach-icon">?</div><div class="ach-name">???</div><div class="ach-desc">??</div>
        <div class="ach-bottom"><span class="ach-rarity ach-rarity-special">Secreto</span></div>`;
    } else {
      let progressBar = '';
      if (!ach.unlocked && ach.progress && ach.progress.target > 1) {
        const pct = Math.min(100, Math.round((ach.progress.current / ach.progress.target) * 100));
        progressBar = `<div class="ach-progress"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
          <span class="ach-progress-text">${ach.progress.current}/${ach.progress.target}</span>`;
      }
      body = `<div class="ach-icon"><i class="${ach.icon || ''}"></i></div>
        <div class="ach-name">${ach.title}</div>
        <div class="ach-desc">${ach.description}</div>
        ${progressBar}
        <div class="ach-bottom">
          <span class="ach-rarity">${RARITY_LABELS[ach.rarity] || ach.rarity}</span>
          ${ach.unlocked ? `<span class="ach-date">${formatDate(ach.unlockedAt)}</span>` : ''}
          ${RARITY_POINTS[ach.rarity] ? `<span class="ach-pts">+${RARITY_POINTS[ach.rarity]}</span>` : ''}
        </div>`;
    }
    card.innerHTML = body;
    grid.appendChild(card);
  });
}

function renderHistory() {
  const container = $('#achHistory');
  if (!container) return;
  const history = userPoints.getHistory(60);
  const total = userPoints.getTotal();
  if (history.length === 0) {
    container.innerHTML = '<p class="ach-empty">Sin historial de puntos todavía.</p>';
    return;
  }
  let html = `<div class="ach-history-total">Total acumulado: <strong>${total} pts</strong></div>`;
  html += '<div class="ach-history-list">';
  history.forEach(entry => {
    const icon = SOURCE_ICONS[entry.source] || 'fa-solid fa-coins';
    const date = formatDate(entry.date);
    const time = formatTime(entry.date);
    const cls = entry.amount >= 0 ? 'ach-h-positive' : 'ach-h-negative';
    html += `<div class="ach-history-entry">
      <span class="ach-h-icon"><i class="${icon}"></i></span>
      <span class="ach-h-desc">${entry.description}</span>
      <span class="ach-h-date">${date} ${time}</span>
      <span class="ach-h-amount ${cls}">${entry.amount >= 0 ? '+' : ''}${entry.amount}</span>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ── Accumulated points toast ──
let pendingPoints = null;
let pendingTimer = null;

function flushPendingToast() {
  if (!pendingPoints || pendingPoints.amount <= 0) {
    pendingPoints = null;
    return;
  }
  const p = pendingPoints;
  pendingPoints = null;
  showToast({
    title: 'Puntos ganados',
    message: p.details.length > 1 ? p.details.join(' · ') : p.details[0],
    icon: '<i class="fa-solid fa-coins"></i>',
    duration: 3000,
  });
}

function enqueuePointToast(amount, description) {
  if (!pendingPoints) {
    pendingPoints = { amount: 0, details: [] };
  }
  pendingPoints.amount += amount;
  pendingPoints.details.push('+' + amount + ' ' + description);
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(flushPendingToast, 3000);
}

// ── Header badge ──
function updateBadge() {
  const badge = document.getElementById('achBadge');
  if (!badge) return;
  const unseen = achievements.getUnseenCount();
  const countEl = badge.querySelector('.ach-badge-count');
  if (countEl) {
    countEl.textContent = unseen;
    countEl.style.display = unseen > 0 ? '' : 'none';
  }
}

function ensureBadge() {
  if (document.getElementById('achBadge')) return;
  const headerControls = document.querySelector('.header-controls');
  if (!headerControls) return;

  const container = document.createElement('span');
  container.className = 'ach-badge-wrap';
  container.innerHTML = `
    <span class="ach-header-points" id="achUserPointsHeader">0 pts</span>
    <button id="achBadge" class="btn-icon ach-badge-btn" title="Logros y puntos" aria-label="Logros y puntos">
      <i class="fa-solid fa-trophy"></i>
      <span class="ach-badge-count">0</span>
    </button>
  `;
  headerControls.insertBefore(container, headerControls.firstChild);
  updateBadge();
}

// ── Public API ──
export function init() {
  buildModal();

  achievements.onUnlocked((entry) => {
    const def = achievements.getAllAchievements().find(a => a.id === entry.id);
    if (!def) return;

    const title = def.secret && !entry.seen ? '???' : def.title;
    const msg = def.secret && !entry.seen ? 'Has encontrado algo especial...' : def.description;

    showToast({
      title: '¡Logro desbloqueado!',
      message: `<strong>${title}</strong><br>${msg}`,
      icon: '<i class="' + (def.icon || 'fa-solid fa-trophy') + '"></i>',
      rarity: def.rarity,
      duration: 5000,
    });

    // Award points for the achievement
    const pts = RARITY_POINTS[def.rarity] || 0;
    if (pts > 0) {
      addPointsQuick(pts, 'achievement', 'Logro: ' + title);
    }

    updateBadge();
  });

  achievements.onDailyGoalMet(() => {
    addPointsQuick(200, 'daily_goal', 'Objetivo diario cumplido');
    showToast({
      title: 'Objetivo diario',
      message: '¡Has cumplido tu objetivo diario! +200 pts',
      icon: '<i class="fa-solid fa-bullseye"></i>',
      duration: 4000,
    });
  });

  ensureBadge();

  const badge = document.getElementById('achBadge');
  if (badge) {
    badge.addEventListener('click', () => {
      openModal();
      achievements.getUnlockData().unlocked.forEach(u => {
        if (!u.seen) achievements.markSeen(u.id);
      });
      updateBadge();
    });
  }

  // Periodic header points update
  setInterval(updateHeaderPoints, 10000);
}

export function addPointsWithToast(amount, source, description) {
  const result = userPoints.addPoints(amount, source, description);
  if (result) {
    updateHeaderPoints();
    if (amount >= 50) {
      showToast({
        title: 'Puntos ganados',
        message: '<span class="ach-h-positive">+' + amount + '</span> ' + description,
        icon: '<i class="fa-solid fa-coins"></i>',
        duration: 3000,
      });
    } else {
      enqueuePointToast(amount, description);
    }
  }
  return result;
}

function addPointsQuick(amount, source, description) {
  const result = userPoints.addPoints(amount, source, description);
  if (result) updateHeaderPoints();
  return result;
}

export function updateHeaderPoints() {
  const el = document.getElementById('achUserPointsHeader');
  if (el) el.textContent = userPoints.getTotal() + ' pts';
}

export function refreshUI() {
  if (currentTab === 'achievements') renderGrid();
  if (currentTab === 'history') renderHistory();
  updateHeaderStats();
}
