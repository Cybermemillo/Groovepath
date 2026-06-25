import { $ } from '../utils/dom.js';

const panel     = $('#trainingPanel');
const countdown = $('#trainingCountdown');
const targetEl  = $('#trainingTarget');
const targetNoteEl = $('#targetNote');
const scoreEl   = $('#trainingScore');
const streakEl  = $('#trainingStreak');
const feedbackEl = $('#trainingFeedback');
const feedbackText = $('#feedbackText');
const startBtn  = $('#trainingStart');
const resultsEl = $('#trainingResults');
const silenceEl = $('#trainingSilence');
const speedEl   = $('#trainingSpeed');
const progressWrap = $('#trainingProgress');
const progressFill = $('#trainingProgressFill');
const floatsEl  = $('#trainingFloats');

const PREV_STREAK_KEY = '__basslabPrevStreak';
let lastStreak = 0;

export function renderIdle() {
  countdown.style.display = 'none';
  targetEl.style.display = 'none';
  feedbackEl.style.display = 'none';
  resultsEl.style.display = 'none';
  if (silenceEl) silenceEl.style.display = 'none';
  if (progressWrap) progressWrap.style.display = 'none';
  if (progressFill) progressFill.style.width = '0%';
  if (floatsEl) floatsEl.innerHTML = '';
  startBtn.textContent = 'Empezar entrenamiento';
  startBtn.classList.remove('stop');
  scoreEl.textContent = '0';
  streakEl.textContent = '0';
  streakEl.className = 'stat-value';
  lastStreak = 0;
  if (speedEl) speedEl.textContent = '\u2014';
}

export function renderCountdown(n) {
  countdown.style.display = 'flex';
  countdown.classList.remove('n3', 'n2', 'n1', 'go');
  countdown.textContent = n;
  if (typeof n === 'number') {
    countdown.classList.add('n' + n);
  }
  countdown.style.animation = 'none';
  void countdown.offsetWidth;
  countdown.style.animation = '';
  if (n === '¡YA!') {
    countdown.classList.add('go');
    setTimeout(() => {
      countdown.style.display = 'none';
      countdown.classList.remove('go');
    }, 500);
  }
}

export function renderStart(target) {
  targetEl.style.display = 'flex';
  targetNoteEl.textContent = target.note;
  feedbackEl.style.display = 'none';
  startBtn.textContent = 'Detener';
  startBtn.classList.add('stop');
  countdown.style.display = 'none';
  if (silenceEl) silenceEl.style.display = 'none';

  targetEl.classList.remove('correct-flash', 'wrong-flash', 'shake');
  targetNoteEl.classList.remove('pop');
  void targetEl.offsetWidth;
  targetNoteEl.classList.add('pop');

  if (progressWrap) {
    progressWrap.style.display = 'block';
    if (typeof target.currentIndex === 'number' && typeof target.totalTargets === 'number') {
      const pct = target.totalTargets > 0
        ? Math.min(100, (target.currentIndex / target.totalTargets) * 100)
        : 0;
      progressFill.style.width = pct + '%';
    }
  }
}

export function renderProgress(currentIndex, totalTargets) {
  if (!progressFill || !progressWrap) return;
  progressWrap.style.display = 'block';
  if (!totalTargets || totalTargets === 0) {
    progressFill.classList.add('indeterminate');
    return;
  }
  progressFill.classList.remove('indeterminate');
  const pct = Math.min(100, Math.max(0, (currentIndex / totalTargets) * 100));
  progressFill.style.width = pct + '%';
}

export function renderCorrect({ points, streak, score, cents, currentIndex, totalTargets }) {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  applyStreakColor(streak);

  feedbackText.textContent = '+' + points;
  feedbackEl.className = 'training-feedback correct';
  feedbackEl.style.display = 'flex';
  feedbackEl.classList.remove('pop');
  void feedbackEl.offsetWidth;
  feedbackEl.classList.add('pop');

  targetEl.classList.add('correct-flash');
  targetEl.classList.remove('shake');
  targetNoteEl.classList.remove('pop');
  void targetNoteEl.offsetWidth;
  targetNoteEl.classList.add('pop');

  if (floatsEl) {
    showFloating(floatsEl, '+' + points, 'float-correct');
    if (Math.abs(cents) <= 8) {
      showFloating(floatsEl, '¡PERFECTO!', 'float-perfect');
    }
  }

  if (typeof currentIndex === 'number' && typeof totalTargets === 'number') {
    renderProgress(currentIndex, totalTargets);
  }

  setTimeout(() => {
    feedbackEl.classList.remove('pop');
    targetNoteEl.classList.remove('pop');
    targetEl.classList.remove('correct-flash');
  }, 700);
}

export function renderWrong({ expected, played, streak, score, currentIndex, totalTargets }) {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  applyStreakColor(streak);

  feedbackText.textContent = expected + ' \u2190 ' + played;
  feedbackEl.className = 'training-feedback wrong';
  feedbackEl.style.display = 'flex';
  feedbackEl.classList.remove('pop');
  void feedbackEl.offsetWidth;
  feedbackEl.classList.add('pop');

  targetEl.classList.remove('correct-flash');
  targetEl.classList.remove('shake');
  void targetEl.offsetWidth;
  targetEl.classList.add('shake');
  targetEl.classList.add('wrong-flash');

  if (floatsEl) {
    showFloating(floatsEl, played, 'float-wrong');
  }

  if (typeof currentIndex === 'number' && typeof totalTargets === 'number') {
    renderProgress(currentIndex, totalTargets);
  }

  setTimeout(() => {
    feedbackEl.classList.remove('pop');
    targetEl.classList.remove('shake');
    targetEl.classList.remove('wrong-flash');
  }, 1000);
}

export function renderResults({ score, correct, wrong, maxStreak, total, avgReactionMs, fastestMs }) {
  targetEl.style.display = 'none';
  countdown.style.display = 'none';
  feedbackEl.style.display = 'none';
  if (silenceEl) silenceEl.style.display = 'none';
  if (progressWrap) progressWrap.style.display = 'none';
  if (floatsEl) floatsEl.innerHTML = '';
  resultsEl.style.display = 'flex';
  startBtn.textContent = 'Empezar entrenamiento';
  startBtn.classList.remove('stop');

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const avgSpeed = avgReactionMs > 0 ? (avgReactionMs / 1000).toFixed(1) + 's' : '—';
  const fastest = fastestMs > 0 ? (fastestMs / 1000).toFixed(1) + 's' : '—';
  const rank = computeRank(accuracy);

  resultsEl.innerHTML =
    '<div class="results-header">Sesión terminada</div>' +
    '<div class="results-rank" data-rank="' + rank + '">' + rank + '</div>' +
    '<div class="results-grid">' +
      '<div class="result-item"><span class="result-val" data-count="' + score + '">0</span><span class="result-lbl">Puntos</span></div>' +
      '<div class="result-item"><span class="result-val">' + accuracy + '%</span><span class="result-lbl">Precisión</span></div>' +
      '<div class="result-item"><span class="result-val">' + correct + '/' + total + '</span><span class="result-lbl">Aciertos</span></div>' +
      '<div class="result-item"><span class="result-val">' + maxStreak + '</span><span class="result-lbl">Mejor racha</span></div>' +
      '<div class="result-item"><span class="result-val">' + avgSpeed + '</span><span class="result-lbl">Velocidad media</span></div>' +
      '<div class="result-item"><span class="result-val">' + fastest + '</span><span class="result-lbl">Más rápido</span></div>' +
    '</div>';

  animateCountUp(resultsEl, '.result-val[data-count]', score, 900);
  if (speedEl) speedEl.textContent = '\u2014';
}

export function showError(msg) {
  feedbackText.textContent = msg;
  feedbackEl.className = 'training-feedback wrong';
  feedbackEl.style.display = 'flex';
  setTimeout(() => { feedbackEl.style.display = 'none'; }, 3000);
}

export function showSilenceMessage(text) {
  if (silenceEl) {
    silenceEl.textContent = text || 'Suelta la cuerda...';
    silenceEl.style.display = 'block';
  }
}

export function showSpeed(ms) {
  if (speedEl) {
    speedEl.textContent = (ms / 1000).toFixed(1) + 's';
    speedEl.className = 'stat-value';
    if (ms < 1000) speedEl.classList.add('fast');
    else if (ms < 2000) speedEl.classList.add('ok');
    else speedEl.classList.add('slow');
  }
}

function applyStreakColor(streak) {
  streakEl.classList.remove('streak-warm', 'streak-hot', 'streak-fire', 'streak-pop');
  if (streak >= 15) streakEl.classList.add('streak-fire');
  else if (streak >= 10) streakEl.classList.add('streak-hot');
  else if (streak >= 5) streakEl.classList.add('streak-warm');

  if (streak > 0 && streak % 5 === 0 && streak !== lastStreak) {
    void streakEl.offsetWidth;
    streakEl.classList.add('streak-pop');
    setTimeout(() => streakEl.classList.remove('streak-pop'), 500);
    if (floatsEl) {
      showFloating(floatsEl, '¡Racha x' + streak + '!', 'float-streak');
    }
  }
  lastStreak = streak;
}

function showFloating(container, text, type) {
  const el = document.createElement('span');
  el.className = 'training-float ' + type;
  el.textContent = text;
  container.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1000);
}

function computeRank(accuracy) {
  if (accuracy >= 95) return 'S';
  if (accuracy >= 85) return 'A';
  if (accuracy >= 75) return 'B';
  return 'C';
}

function animateCountUp(root, selector, target, duration) {
  const el = root.querySelector(selector);
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
