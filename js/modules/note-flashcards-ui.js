import { $ } from '../utils/dom.js';

const startBtn      = $('#fcStart');
const targetEl      = $('#fcTarget');
const scoreEl       = $('#fcScore');
const streakEl      = $('#fcStreak');
const timerEl       = $('#fcTimer');
const feedbackEl    = $('#fcFeedback');
const fcConfigWrap  = $('#fcConfig');
const fcResultsWrap = $('#fcResults');
const poolSel       = $('#fcPool');
const timeSel       = $('#fcTime');
const roundsSel     = $('#fcRounds');

let _onStart = null;
let _onStop  = null;

export function getSettings() {
  const poolVal = poolSel.value;
  return {
    notePool: poolVal === 'all' ? 'all' : poolVal === 'natural' ? 'natural' : 'all',
    timePerNote: parseInt(timeSel.value) || 10,
    totalRounds: parseInt(roundsSel.value) || 20,
  };
}

export function onStart(fn) { _onStart = fn; }
export function onStop(fn)  { _onStop  = fn; }

export function init() {
  startBtn.addEventListener('click', () => {
    if (_onStart) _onStart();
  });
}

export function renderIdle() {
  startBtn.textContent = 'Empezar identificación';
  startBtn.classList.remove('active');
  targetEl.textContent = '\u2014';
  targetEl.classList.remove('active');
  scoreEl.textContent = '0';
  streakEl.textContent = '0';
  timerEl.textContent = '';
  timerEl.classList.remove('urgent');
  feedbackEl.style.display = 'none';
  fcConfigWrap.style.display = '';
  fcResultsWrap.style.display = 'none';
  fcResultsWrap.innerHTML = '';
}

export function renderPlaying() {
  startBtn.textContent = 'Detener';
  startBtn.classList.add('active');
  fcConfigWrap.style.display = 'none';
  fcResultsWrap.style.display = 'none';
}

export function showTarget(note, time) {
  targetEl.textContent = note;
  targetEl.classList.add('active');
  updateTimer(time);
  feedbackEl.style.display = 'none';
}

export function updateScore(score, streak) {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
}

export function updateTimer(remaining) {
  timerEl.textContent = remaining;
  if (remaining <= 3) timerEl.classList.add('urgent');
  else timerEl.classList.remove('urgent');
}

export function showCorrect(points) {
  feedbackEl.style.display = 'block';
  feedbackEl.textContent = '\u2713 +' + points;
  feedbackEl.className = 'fc-feedback correct';
}

export function showWrong() {
  feedbackEl.style.display = 'block';
  feedbackEl.textContent = '\u2717';
  feedbackEl.className = 'fc-feedback wrong';
}

export function showTimeout(note) {
  feedbackEl.style.display = 'block';
  feedbackEl.textContent = '\u23F0 Era ' + note;
  feedbackEl.className = 'fc-feedback wrong';
}

export function showResults(results) {
  fcResultsWrap.style.display = 'block';
  fcResultsWrap.innerHTML =
    '<div class="fc-results-title">Resultados</div>' +
    '<div class="fc-results-grid">' +
      '<div class="fc-res-card"><span class="fc-res-val">' + results.score + '</span><span>Puntos</span></div>' +
      '<div class="fc-res-card"><span class="fc-res-val">' + results.correct + '/' + (results.correct + results.wrong) + '</span><span>Aciertos</span></div>' +
      '<div class="fc-res-card"><span class="fc-res-val">' + results.maxStreak + '</span><span>Mejor racha</span></div>' +
    '</div>';
  targetEl.textContent = '\u2014';
  targetEl.classList.remove('active');
  timerEl.textContent = '';
  startBtn.textContent = 'Empezar identificación';
  startBtn.classList.remove('active');
  fcConfigWrap.style.display = '';
}
