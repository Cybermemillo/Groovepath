import { $ } from '../utils/dom.js';

const panel    = $('#improPanel');
const scoreEl  = $('#improScore');
const streakEl = $('#improStreak');
const chordEl  = $('#improChord');
const timeEl   = $('#improTime');
const feedbackEl = $('#improFeedback');
const feedbackText = $('#improFeedbackText');

let timerInterval = null;

export function renderIdle() {
  panel.classList.remove('active');
  scoreEl.textContent = '0';
  streakEl.textContent = '0';
  chordEl.textContent = '—';
  timeEl.textContent = '0:00';
  feedbackEl.className = 'impro-feedback';
  feedbackEl.style.display = 'none';
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

export function renderActive(chord) {
  panel.classList.add('active');
  chordEl.textContent = chord || '—';
  scoreEl.textContent = '0';
  streakEl.textContent = '0';
  timeEl.textContent = '0:00';
  feedbackEl.style.display = 'none';

  timerInterval = setInterval(() => {
    if (timeEl.textContent.startsWith('0:')) {
      const [m, s] = timeEl.textContent.split(':').map(Number);
      const total = (m || 0) * 60 + (s || 0) + 1;
      timeEl.textContent = Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
    }
  }, 1000);
}

export function updateChord(chord) {
  chordEl.textContent = chord || '—';
}

export function updateScore(score, streak) {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
}

export function showFeedback(note, points, type) {
  const color = type === 'chord' ? 'var(--scale-note)' : '#D4A017';
  feedbackText.innerHTML = note + ' <span style="color:' + color + '">+' + points + '</span>';
  feedbackEl.className = 'impro-feedback correct';
  feedbackEl.style.display = 'block';
  clearTimeout(feedbackEl._timeout);
  feedbackEl._timeout = setTimeout(() => {
    feedbackEl.style.display = 'none';
  }, 900);
}

export function showWrong(note) {
  feedbackText.textContent = note + ' ✗';
  feedbackEl.className = 'impro-feedback wrong';
  feedbackEl.style.display = 'block';
  clearTimeout(feedbackEl._timeout);
  feedbackEl._timeout = setTimeout(() => {
    feedbackEl.style.display = 'none';
  }, 900);
}

export function renderResults(results) {
  panel.classList.remove('active');
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
