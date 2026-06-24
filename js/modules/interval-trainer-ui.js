import { $ } from '../utils/dom.js';

const startBtn     = $('#itStart');
const targetEl     = $('#itTarget');
const scoreEl      = $('#itScore');
const streakEl     = $('#itStreak');
const feedbackEl   = $('#itFeedback');
const modeInfoEl   = $('#itModeInfo');
const choicesEl    = $('#itChoices');
const roundsSel    = $('#itRounds');
const resultsEl    = $('#itResults');
const configWrap   = $('#itConfig');
const silenceEl    = $('#itSilence');
const speedEl      = $('#itSpeed');

const INTERVAL_BTNS = [
  { name: '2m', label: '2m' },
  { name: '2M', label: '2M' },
  { name: '3m', label: '3m' },
  { name: '3M', label: '3M' },
  { name: '4J', label: '4J' },
  { name: 'TT', label: 'TT' },
  { name: '5J', label: '5J' },
  { name: '6m', label: '6m' },
  { name: '6M', label: '6M' },
  { name: '7m', label: '7m' },
  { name: '7M', label: '7M' },
  { name: '8J', label: '8J' },
];

let _onStart = null;
let _onAnswer = null;
let _onSkip = null;

export function init() {
  startBtn.addEventListener('click', () => {
    if (_onStart) _onStart();
  });

  choicesEl.innerHTML = '';
  INTERVAL_BTNS.forEach(ib => {
    const btn = document.createElement('button');
    btn.className = 'it-choice-btn';
    btn.textContent = ib.label;
    btn.addEventListener('click', () => {
      if (_onAnswer) _onAnswer(ib.name);
    });
    choicesEl.appendChild(btn);
  });
}

export function onStart(fn)   { _onStart  = fn; }
export function onAnswer(fn)  { _onAnswer = fn; }
export function onSkip(fn)    { _onSkip   = fn; }

export function getSettings() {
  return {
    totalRounds: parseInt(roundsSel.value) || 20,
  };
}

export function renderIdle() {
  startBtn.textContent = 'Empezar intervalos';
  startBtn.classList.remove('active');
  targetEl.textContent = '\u2014';
  scoreEl.textContent = '0';
  streakEl.textContent = '0';
  feedbackEl.style.display = 'none';
  choicesEl.style.display = 'none';
  modeInfoEl.textContent = '';
  resultsEl.style.display = 'none';
  resultsEl.innerHTML = '';
  configWrap.style.display = '';
  if (silenceEl) silenceEl.style.display = 'none';
  if (speedEl) speedEl.textContent = '\u2014';
}

export function renderPlaying(mode) {
  startBtn.textContent = 'Detener';
  startBtn.classList.add('active');
  configWrap.style.display = 'none';
  resultsEl.style.display = 'none';
  feedbackEl.style.display = 'none';
  modeInfoEl.textContent = mode === 'choose' ? 'Elige el intervalo' : 'Toca el intervalo';
  if (mode === 'choose') {
    choicesEl.style.display = 'flex';
  } else {
    choicesEl.style.display = 'none';
  }
  if (speedEl) speedEl.textContent = '\u2014';
}

export function showRound(root, interval, mode) {
  targetEl.textContent = root + ' \u2192 ?';
  feedbackEl.style.display = 'none';
  if (silenceEl) silenceEl.style.display = 'none';
  if (mode === 'play') {
    targetEl.textContent = 'Toca ' + interval.label + ' desde ' + root;
  }
}

export function updateScore(score, streak) {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
}

export function showCorrect(interval, points) {
  feedbackEl.style.display = 'block';
  feedbackEl.textContent = '\u2713 ' + interval.label + ' +' + points;
  feedbackEl.className = 'it-feedback correct';
  targetEl.textContent = interval.label;
}

export function showWrong(interval, played, expected) {
  feedbackEl.style.display = 'block';
  if (played && expected) {
    feedbackEl.innerHTML = '\u2717 Tocada: <strong>' + played + '</strong> &rarr; Era: <strong>' + expected + '</strong> (' + interval.label + ')';
  } else {
    feedbackEl.textContent = '\u2717 Era ' + interval.label;
  }
  feedbackEl.className = 'it-feedback wrong';
  targetEl.textContent = interval.label;
}

export function showSkip(interval) {
  feedbackEl.style.display = 'block';
  feedbackEl.textContent = 'Saltado: ' + interval.label;
  feedbackEl.className = 'it-feedback wrong';
  targetEl.textContent = interval.label;
}

export function showSpeed(ms) {
  if (speedEl) {
    speedEl.textContent = (ms / 1000).toFixed(1) + 's';
    if (ms < 1500) speedEl.style.color = '#4caf50';
    else if (ms < 3000) speedEl.style.color = '#ffcc00';
    else speedEl.style.color = '';
  }
}

export function showResults(results) {
  resultsEl.style.display = 'block';
  if (silenceEl) silenceEl.style.display = 'none';
  const avgSpeed = results.avgReactionMs > 0 ? (results.avgReactionMs / 1000).toFixed(1) + 's' : '—';
  const fastest = results.fastestMs > 0 ? (results.fastestMs / 1000).toFixed(1) + 's' : '—';
  resultsEl.innerHTML =
    '<div class="it-results-title">Resultados</div>' +
    '<div class="it-results-grid">' +
      '<div class="it-res-card"><span class="it-res-val">' + results.score + '</span><span>Puntos</span></div>' +
      '<div class="it-res-card"><span class="it-res-val">' + results.correct + '/' + (results.correct + results.wrong) + '</span><span>Aciertos</span></div>' +
      '<div class="it-res-card"><span class="it-res-val">' + results.maxStreak + '</span><span>Mejor racha</span></div>' +
      '<div class="it-res-card"><span class="it-res-val">' + avgSpeed + '</span><span>Velocidad media</span></div>' +
      '<div class="it-res-card"><span class="it-res-val">' + fastest + '</span><span>Más rápido</span></div>' +
    '</div>';
  targetEl.textContent = '\u2014';
  startBtn.textContent = 'Empezar intervalos';
  startBtn.classList.remove('active');
  configWrap.style.display = '';
  choicesEl.style.display = 'none';
  if (speedEl) speedEl.textContent = '\u2014';
}

export function showSilenceMessage(text) {
  if (silenceEl) {
    silenceEl.textContent = text || 'Silencia la nota...';
    silenceEl.style.display = 'block';
  }
}
