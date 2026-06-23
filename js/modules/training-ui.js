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

export function renderIdle() {
  countdown.style.display = 'none';
  targetEl.style.display = 'none';
  feedbackEl.style.display = 'none';
  resultsEl.style.display = 'none';
  startBtn.textContent = 'Empezar entrenamiento';
  startBtn.classList.remove('stop');
  scoreEl.textContent = '0';
  streakEl.textContent = '0';
}

export function renderCountdown(n) {
  countdown.style.display = 'flex';
  countdown.textContent = n;
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

  targetEl.classList.remove('correct-flash', 'wrong-flash');
  void targetEl.offsetWidth;
}

export function renderCorrect({ points, streak, score }) {
  scoreEl.textContent = score;
  streakEl.textContent = streak;

  feedbackText.textContent = '+' + points;
  feedbackEl.className = 'training-feedback correct';
  feedbackEl.style.display = 'flex';
  targetEl.classList.add('correct-flash');

  setTimeout(() => {
    feedbackEl.style.display = 'none';
    targetEl.classList.remove('correct-flash');
  }, 700);
}

export function renderWrong({ expected, played, streak, score }) {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  feedbackText.textContent = expected + ' \u2190 ' + played;
  feedbackEl.className = 'training-feedback wrong';
  feedbackEl.style.display = 'flex';
  targetEl.classList.add('wrong-flash');

  setTimeout(() => {
    targetNoteEl.textContent = expected;
    setTimeout(() => {
      feedbackEl.style.display = 'none';
      targetEl.classList.remove('wrong-flash');
    }, 400);
  }, 300);
}

export function renderResults({ score, correct, wrong, maxStreak, total }) {
  targetEl.style.display = 'none';
  countdown.style.display = 'none';
  feedbackEl.style.display = 'none';
  resultsEl.style.display = 'flex';
  startBtn.textContent = 'Empezar entrenamiento';
  startBtn.classList.remove('stop');

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  resultsEl.innerHTML =
    '<div class="results-header">Sesión terminada</div>' +
    '<div class="results-grid">' +
      '<div class="result-item"><span class="result-val">' + score + '</span><span class="result-lbl">Puntos</span></div>' +
      '<div class="result-item"><span class="result-val">' + accuracy + '%</span><span class="result-lbl">Precisión</span></div>' +
      '<div class="result-item"><span class="result-val">' + correct + '/' + total + '</span><span class="result-lbl">Aciertos</span></div>' +
      '<div class="result-item"><span class="result-val">' + maxStreak + '</span><span class="result-lbl">Mejor racha</span></div>' +
    '</div>';
}

export function showError(msg) {
  feedbackText.textContent = msg;
  feedbackEl.className = 'training-feedback wrong';
  feedbackEl.style.display = 'flex';
  setTimeout(() => { feedbackEl.style.display = 'none'; }, 3000);
}
