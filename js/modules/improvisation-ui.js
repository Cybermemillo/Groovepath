import { $ } from '../utils/dom.js';
import { getAudioContext } from './audio-engine.js';
import * as synth from './synth.js';

const panel       = $('#improPanel');
const scoreEl     = $('#improScore');
const streakEl    = $('#improStreak');
const chordEl     = $('#improChord');
const timeEl      = $('#improTime');
const feedbackEl  = $('#improFeedback');
const feedbackText = $('#improFeedbackText');
const upcomingEl  = $('#improUpcoming');
const targetEl    = $('#improTarget');
const targetNoteEl = $('#improTargetNote');
const ringFill    = $('#improRingFill');
const targetRing  = $('#improTargetRing');
const diffSelect  = $('#improDifficulty');
const guidedToggle = $('#improGuided');
const guidedSourceSelect = $('#improGuidedSource');
const guidedSpeedSelect  = $('#improGuidedSpeed');
const guidedConfig       = $('#improGuidedConfig');
const freeAdvanceSelect  = $('#improFreeAdvance');
const freeConfig         = $('#improFreeConfig');
const timelineEl  = $('#improTimeline');
const timelineProgressEl = $('#improTimelineProgress');
const beatsEl     = $('#improBeats');
const diffDescEl  = $('#improDiffDesc');
const resultsEl   = $('#improResults');
const resultsScoreEl = $('#improResultScore');
const resultsAccEl  = $('#improResultAcc');
const resultsHitEl  = $('#improResultHit');
const resultsStreakEl = $('#improResultStreak');
const resultsTargetEl = $('#improResultTarget');
const resultsDetailEl = $('#improResultDetail');
const resultsChordsEl = $('#improResultChords');
const resultsTipEl    = $('#improResultTip');
const resultsCloseEl = $('#improResultClose');
const resultsHeatmapBtn = $('#improResultHeatmapBtn');
const challengeEl    = $('#improChallenge');
const challengeTextEl = $('#improChallengeText');
const challengeProgressEl = $('#improChallengeProgress');
const dailyStreakEl = $('#improDailyStreak');
const heatmapEl = $('#improHeatmap');
const heatmapCloseEl = $('#improHeatmapClose');
const heatmapStatsEl = $('#improHeatmapStats');
const floatsEl    = $('#improFloats');

const DIFF_DESCRIPTIONS = {
  'four_strings': 'Solo acorde · afinación ±40¢ · fallos no rompen racha',
  'walking_bass':  'Acorde + escala · afinación ±30¢ · fallo rompe racha',
  'funk_machine':  'Solo acorde · afinación ±18¢ · fallo rompe racha',
  'bootsy_level':  'Solo acorde · afinación ±12¢ · 4 hits necesarios',
};

const DIFF_LABELS = {
  'four_strings': 'Four Strings', 'walking_bass': 'Walking Bass',
  'funk_machine': 'Funk Machine', 'bootsy_level': 'Bootsy Level',
};

let timerInterval = null;
let targetRaf = null;
let targetEndTime = 0;
let targetStartTime = 0;
let targetIntervalMs = 4000;
let lastStreak = 0;
let lastBeat = -1;
let beatsPerBar = 4;
let currentBar = 0;
let countdownBar = -1;
let barProgress = 0;
let improvActive = false;

const CIRCUMFERENCE = 2 * Math.PI * 15.9155;

if (ringFill) {
  ringFill.style.strokeDasharray = CIRCUMFERENCE + ' ' + CIRCUMFERENCE;
  ringFill.style.strokeDashoffset = '0';
}

export function renderIdle() {
  panel.classList.remove('active');
  improvActive = false;
  scoreEl.textContent = '0';
  streakEl.textContent = '0';
  streakEl.className = 'impro-stat-val';
  lastStreak = 0;
  chordEl.textContent = '\u2014';
  chordEl.classList.remove('countdown');
  timeEl.textContent = '0:00';
  feedbackEl.className = 'impro-feedback';
  feedbackEl.style.display = 'none';
  if (upcomingEl) { upcomingEl.textContent = ''; upcomingEl.style.display = ''; upcomingEl.classList.remove('countdown'); }
  stopTargetTimer();
  if (targetEl) targetEl.style.display = 'none';
  if (timelineEl) { timelineEl.innerHTML = ''; timelineEl.style.display = ''; }
  if (timelineProgressEl) timelineProgressEl.style.width = '0%';
  if (resultsEl) resultsEl.style.display = 'none';
  if (floatsEl) floatsEl.innerHTML = '';
  resetBeats();
  const bars = panel.querySelectorAll('.impro-bar');
  bars.forEach(b => b.style.display = '');
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

export function renderActive(chord, startTimer = true) {
  panel.classList.add('active');
  improvActive = true;
  const bars = panel.querySelectorAll('.impro-bar');
  bars.forEach(b => b.style.display = '');
  if (upcomingEl) upcomingEl.style.display = '';
  if (timelineEl) timelineEl.style.display = '';
  if (resultsEl) resultsEl.style.display = 'none';
  chordEl.textContent = chord || '\u2014';
  chordEl.classList.remove('countdown');
  scoreEl.textContent = '0';
  streakEl.textContent = '0';
  streakEl.className = 'impro-stat-val';
  lastStreak = 0;
  timeEl.textContent = '0:00';
  feedbackEl.style.display = 'none';
  feedbackEl.className = 'impro-feedback';
  stopTargetTimer();
  if (targetEl) targetEl.style.display = 'none';
  if (upcomingEl) upcomingEl.textContent = '';
  if (timelineEl) timelineEl.innerHTML = '';
  if (timelineProgressEl) timelineProgressEl.style.width = '0%';
  if (resultsEl) resultsEl.style.display = 'none';
  if (floatsEl) floatsEl.innerHTML = '';
  resetBeats();
  lastBeat = -1;
  currentBar = 0;
  countdownBar = -1;
  barProgress = 0;

  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (startTimer) {
    timerInterval = setInterval(() => {
      const [m, s] = timeEl.textContent.split(':').map(Number);
      const total = (m || 0) * 60 + (s || 0) + 1;
      timeEl.textContent = Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
    }, 1000);
  }
}

export function updateChord(chord, type) {
  chordEl.textContent = chord || '\u2014';
}

export function updateUpcoming(labels) {
  if (!upcomingEl) return;
  if (!labels || labels.length === 0) {
    upcomingEl.textContent = '';
    return;
  }
  upcomingEl.textContent = labels.join(' \u2192 ');
}

function formatShortLabel(root, type, notation) {
  const labels = {
    'major': '', 'minor': 'm', 'major_7': 'maj7', 'minor_7': 'm7',
    'dominant_7': '7', 'minor_7b5': 'm7b5', 'diminished': 'dim', 'augmented': 'aug',
    'power': '', 'major_triad': '', 'minor_triad': 'm',
  };
  const r = (notation === 'spanish')
    ? ({ 'C':'Do','C#':'Do#','D':'Re','D#':'Re#','E':'Mi','F':'Fa','F#':'Fa#','G':'Sol','G#':'Sol#','A':'La','A#':'La#','B':'Si' }[root] || root)
    : root;
  return r + (labels[type] || '');
}

export function showTarget(note, intervalMs) {
  if (!targetEl || !targetNoteEl) return;
  if (!note || intervalMs <= 0) {
    hideTarget();
    return;
  }
  targetEl.style.display = 'flex';
  targetEl.classList.remove('entering');
  void targetEl.offsetWidth;
  targetEl.classList.add('entering');
  targetNoteEl.textContent = note;
  if (ringFill) {
    ringFill.classList.remove('urgent', 'building');
    ringFill.style.strokeDashoffset = '0';
  }
  targetIntervalMs = intervalMs;
  try {
    const ctx = getAudioContext();
    targetStartTime = ctx.currentTime;
    targetEndTime = targetStartTime + intervalMs / 1000;
  } catch {
    targetStartTime = Date.now() / 1000;
    targetEndTime = targetStartTime + intervalMs / 1000;
  }
  startTargetTimer();
}

export function hideTarget() {
  stopTargetTimer();
  if (targetEl) targetEl.style.display = 'none';
  targetIntervalMs = 4000;
  targetEndTime = 0;
  targetStartTime = 0;
  if (ringFill) {
    ringFill.classList.remove('urgent', 'building');
    ringFill.style.strokeDashoffset = '0';
  }
}

function startTargetTimer() {
  stopTargetTimer();
  if (!targetEl || targetEl.style.display === 'none') return;
  targetRaf = requestAnimationFrame(tickTargetTimer);
}

function stopTargetTimer() {
  if (targetRaf) {
    cancelAnimationFrame(targetRaf);
    targetRaf = null;
  }
}

function tickTargetTimer() {
  if (!targetEndTime || !targetIntervalMs) {
    targetRaf = null;
    return;
  }
  let nowAudio;
  try {
    nowAudio = getAudioContext().currentTime;
  } catch {
    nowAudio = Date.now() / 1000;
  }
  const remaining = Math.max(0, targetEndTime - nowAudio);
  const progress = Math.min(1, remaining / (targetIntervalMs / 1000));
  const offset = CIRCUMFERENCE * (1 - progress);

  if (ringFill) {
    ringFill.style.strokeDashoffset = offset;

    if (remaining <= 2 && remaining > 0) {
      ringFill.classList.add('urgent');
      ringFill.classList.remove('building');
    } else {
      ringFill.classList.remove('urgent');
    }
  }

  if (remaining > 0) {
    targetRaf = requestAnimationFrame(tickTargetTimer);
  } else {
    targetRaf = null;
    if (ringFill) {
      ringFill.style.strokeDashoffset = CIRCUMFERENCE;
    }
  }
}

export function showTargetBuild(progress) {
  if (!ringFill) return;
  if (progress <= 0 || progress >= 1) {
    ringFill.classList.remove('building');
    return;
  }
  ringFill.classList.add('building');
  ringFill.style.opacity = 0.3 + progress * 0.6;
}

export function updateScore(score, streak) {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  applyStreakColor(streak);
}

export function showFeedback(note, points, type) {
  const colorMap = {
    'target': 'var(--detected)',
    'chord': 'var(--scale-note)',
    'scale': '#D4A017',
  };
  const color = colorMap[type] || 'var(--scale-note)';
  const prefix = type === 'target' ? '\u2714 ' : '';
  feedbackText.innerHTML = prefix + note + ' <span style="color:' + color + '">+' + points + '</span>';
  feedbackEl.className = 'impro-feedback correct ' + type + '-glow';
  feedbackEl.classList.remove('pop');
  void feedbackEl.offsetWidth;
  feedbackEl.classList.add('pop');
  feedbackEl.style.display = 'block';
  clearTimeout(feedbackEl._timeout);
  feedbackEl._timeout = setTimeout(() => {
    feedbackEl.style.display = 'none';
  }, 900);

  if (floatsEl) {
    showFloating(floatsEl, '+' + points, type);
  }
}

export function showWrong(note) {
  feedbackText.textContent = note + ' \u2717';
  feedbackEl.className = 'impro-feedback wrong';
  feedbackEl.classList.remove('pop');
  void feedbackEl.offsetWidth;
  feedbackEl.classList.add('pop');
  feedbackEl.style.display = 'block';
  clearTimeout(feedbackEl._timeout);
  feedbackEl._timeout = setTimeout(() => {
    feedbackEl.style.display = 'none';
  }, 900);

  if (targetEl && targetEl.style.display !== 'none') {
    targetEl.classList.remove('shake');
    void targetEl.offsetWidth;
    targetEl.classList.add('shake');
    setTimeout(() => targetEl.classList.remove('shake'), 450);
  }
}

export function renderResults(results) {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  stopTargetTimer();
  hideTarget();
  if (upcomingEl) upcomingEl.textContent = '';
  if (timelineEl) timelineEl.innerHTML = '';
  if (floatsEl) floatsEl.innerHTML = '';

  if (!results || results.total === 0) {
    renderIdle();
    return;
  }

  const correct = (results.correctChord || 0) + (results.correctScale || 0);
  const total = results.total || 0;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  feedbackEl.style.display = 'none';

  panel.classList.add('active');
  const bars = panel.querySelectorAll('.impro-bar');
  bars.forEach(b => b.style.display = 'none');
  if (upcomingEl) upcomingEl.style.display = 'none';
  if (timelineEl) timelineEl.style.display = 'none';

  if (resultsScoreEl) {
    resultsScoreEl.setAttribute('data-count', results.score || 0);
    resultsScoreEl.textContent = '0';
  }
  if (resultsAccEl) resultsAccEl.textContent = acc + '%';
  if (resultsHitEl) resultsHitEl.textContent = correct + '/' + total;
  if (resultsStreakEl) resultsStreakEl.textContent = results.maxStreak || 0;
  if (resultsTargetEl) resultsTargetEl.textContent = results.correctTarget || 0;

  const rank = computeRankImp(acc);
  const diffLabel = DIFF_LABELS[results.difficulty] || results.difficulty || '';
  const mins = Math.floor((results.duration || 0) / 60);
  const secs = (results.duration || 0) % 60;
  const time = mins + ':' + String(secs).padStart(2, '0');

  let detail = '<span class="impro-res-rank" data-rank="' + rank + '">' + rank + '</span> ' + diffLabel;
  if (results.guided) detail += ' · guiado';
  if (results.freeMode) detail += ' · libre';
  detail += ' · ' + time;
  if (results.correctTarget > 0) detail += ' · ' + results.correctTarget + ' objetivos';
  const chordOnly = Math.max(0, results.correctChord - (results.correctTarget || 0));
  if (chordOnly > 0) detail += ' · ' + chordOnly + ' acorde';
  if (results.correctScale > 0) detail += ' · ' + results.correctScale + ' escala';

  if (resultsDetailEl) resultsDetailEl.innerHTML = detail;

  renderChordBreakdown(results.chordStats || {});
  renderTip(results);

  if (resultsEl) resultsEl.style.display = 'flex';

  animateCountUp(resultsScoreEl, results.score || 0, 900);
}

function renderChordBreakdown(chordStats) {
  if (!resultsChordsEl) return;
  const entries = Object.entries(chordStats);
  if (entries.length === 0) {
    resultsChordsEl.innerHTML = '';
    resultsChordsEl.style.display = 'none';
    return;
  }
  resultsChordsEl.style.display = '';
  entries.sort((a, b) => b[1].total - a[1].total);
  const items = entries.map(([label, s]) => {
    const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    return '<div class="impro-res-chord">' +
      '<span class="impro-res-chord-name">' + label + '</span>' +
      '<span class="impro-res-chord-bar"><span class="impro-res-chord-fill" style="width:' + acc + '%"></span></span>' +
      '<span class="impro-res-chord-acc">' + acc + '%</span>' +
      '<span class="impro-res-chord-detail">' + s.correct + '/' + s.total + (s.target ? ' · ' + s.target + ' obj' : '') + '</span>' +
      '</div>';
  }).join('');
  resultsChordsEl.innerHTML = '<div class="impro-res-chords-title">Por acorde</div>' + items;
}

function renderTip(results) {
  if (!resultsTipEl) return;
  const tips = [];
  const acc = results.total > 0 ? Math.round(((results.correctChord + results.correctScale) / results.total) * 100) : 0;
  if (acc < 60) {
    tips.push('Céntrate en las notas del acorde actual antes de explorar la escala.');
  } else if (acc >= 90 && results.maxStreak >= 10) {
    tips.push('¡Excelente control! Prueba subir la dificultad.');
  }
  if (results.correctTarget === 0 && results.guided) {
    tips.push('Intenta acertar los objetivos del modo guiado para sumar más puntos.');
  }
  if (results.wrong > results.correctChord + results.correctScale) {
    tips.push('Reduce el BPM para dar tiempo a colocar bien los dedos.');
  }
  if (tips.length === 0) {
    resultsTipEl.textContent = '';
    resultsTipEl.style.display = 'none';
  } else {
    resultsTipEl.textContent = '💡 ' + tips[0];
    resultsTipEl.style.display = '';
  }
}

export function hideResults() {
  if (resultsEl) resultsEl.style.display = 'none';
}

export function getDifficulty() {
  return diffSelect ? diffSelect.value : 'walking_bass';
}

export function isGuided() {
  return guidedToggle ? guidedToggle.checked : false;
}

export function getGuidedSource() {
  return guidedSourceSelect ? guidedSourceSelect.value : 'chord';
}

export function getGuidedSpeed() {
  return guidedSpeedSelect ? guidedSpeedSelect.value : 'bar';
}

export function getFreeAdvance() {
  return freeAdvanceSelect ? freeAdvanceSelect.value : 'root';
}

export function updateGuidedConfigVisibility() {
  if (guidedConfig) {
    guidedConfig.style.display = isGuided() ? 'flex' : 'none';
  }
}

export function updateFreeConfigVisibility(freeMode) {
  // always visible now — free mode select applies when no backing is playing
}

export function updateDiffDescription() {
  if (!diffDescEl || !diffSelect) return;
  diffDescEl.textContent = DIFF_DESCRIPTIONS[diffSelect.value] || '';
}

export function updateDifficultyMastery(masteriesByDiff) {
  if (!diffSelect) return;
  const opts = diffSelect.querySelectorAll('option');
  opts.forEach(opt => {
    const v = opt.value;
    const mastered = masteriesByDiff && masteriesByDiff[v];
    const baseText = opt.dataset.baseText || opt.textContent;
    if (!opt.dataset.baseText) opt.dataset.baseText = baseText;
    opt.textContent = mastered ? baseText + ' ✓' : baseText;
  });
}

export function renderGuidedTarget(note) {
  showTarget(note, targetIntervalMs);
}

export function renderTimeline(bars, currentIdx, notation) {
  if (!timelineEl) return;
  timelineEl.innerHTML = '';
  if (!bars || bars.length === 0) return;
  bars.forEach((bar, i) => {
    const el = document.createElement('span');
    el.className = 'tl-bar';
    if (i === currentIdx) el.classList.add('active');
    else if (i === currentIdx + 1) el.classList.add('next');
    if (i < currentIdx) el.classList.add('past');
    el.textContent = formatShortLabel(bar.chord, bar.type, notation);
    el.title = 'Compás ' + (i + 1) + ': ' + formatShortLabel(bar.chord, bar.type, notation);
    timelineEl.appendChild(el);
  });
  timelineEl.scrollLeft = timelineEl.scrollWidth;
}

export function renderFreeTimeline() {
  if (!timelineEl) return;
  timelineEl.innerHTML = '<span class="tl-bar active tl-free" title="Modo libre">LIBRE</span>';
  if (upcomingEl) upcomingEl.textContent = '';
}

export function updateBeat({ time, beat, bar }) {
  if (!improvActive) return;
  if (typeof bar === 'number') currentBar = bar;
  if (typeof beat === 'number') {
    beatsPerBar = Math.max(2, Math.min(8, beatsPerBar));
    if (beat !== lastBeat) {
      lightBeatDot(beat, beatsPerBar);
      lastBeat = beat;
    }
  }
  if (typeof beat === 'number') {
    barProgress = (beat + 1) / beatsPerBar;
    if (timelineProgressEl) timelineProgressEl.style.width = (barProgress * 100) + '%';
    if (beat === beatsPerBar - 1) {
      triggerChordCountdown(bar);
    } else {
      chordEl.classList.remove('countdown');
      if (upcomingEl) upcomingEl.classList.remove('countdown');
    }
  }
}

export function setBeatsPerBar(n) {
  beatsPerBar = Math.max(2, Math.min(8, n || 4));
  renderBeats();
}

function renderBeats() {
  if (!beatsEl) return;
  const dots = beatsEl.querySelectorAll('.beat-dot');
  if (dots.length === beatsPerBar) return;
  beatsEl.innerHTML = '';
  for (let i = 0; i < beatsPerBar; i++) {
    const d = document.createElement('span');
    d.className = 'beat-dot' + (i === 0 ? ' downbeat' : '');
    beatsEl.appendChild(d);
  }
  lastBeat = -1;
}

function lightBeatDot(beat, total) {
  if (!beatsEl) return;
  const dots = beatsEl.querySelectorAll('.beat-dot');
  dots.forEach((d, i) => {
    d.classList.toggle('on', i === beat);
  });
}

function resetBeats() {
  if (!beatsEl) return;
  const dots = beatsEl.querySelectorAll('.beat-dot');
  dots.forEach(d => d.classList.remove('on'));
  lastBeat = -1;
  renderBeats();
}

function triggerChordCountdown(bar) {
  if (countdownBar === bar) return;
  countdownBar = bar;
  chordEl.classList.remove('countdown');
  void chordEl.offsetWidth;
  chordEl.classList.add('countdown');
  if (upcomingEl && upcomingEl.textContent) {
    upcomingEl.classList.remove('countdown');
    void upcomingEl.offsetWidth;
    upcomingEl.classList.add('countdown');
  }
}

export function playPreviewNote(noteName, duration = 400) {
  try {
    const NOTES_LIST = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const idx = NOTES_LIST.indexOf(noteName);
    if (idx < 0) return;
    const midi = 36 + idx;
    synth.playNote(midi, duration);
  } catch {}
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
      showFloating(floatsEl, '¡Racha x' + streak + '!', 'streak');
    }
  }
  lastStreak = streak;
}

function showFloating(container, text, type) {
  const el = document.createElement('span');
  el.className = 'impro-float float-' + type;
  el.textContent = text;
  container.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1000);
}

function computeRankImp(accuracy) {
  if (accuracy >= 95) return 'S';
  if (accuracy >= 85) return 'A';
  if (accuracy >= 75) return 'B';
  return 'C';
}

function animateCountUp(el, target, duration) {
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

export function showChallenge(challenge) {
  if (!challengeEl || !challengeTextEl || !challengeProgressEl) return;
  challengeEl.classList.remove('completed');
  challengeEl.style.display = 'flex';
  challengeTextEl.textContent = challenge.label;
  challengeProgressEl.textContent = '0/' + challenge.target;
}

export function hideChallenge() {
  if (challengeEl) {
    challengeEl.style.display = 'none';
    challengeEl.classList.remove('completed');
  }
}

export function updateChallenge(progress) {
  if (!challengeProgressEl) return;
  challengeProgressEl.textContent = progress.progress + '/' + progress.target;
  if (progress.completed && challengeEl) {
    challengeEl.classList.add('completed');
    challengeTextEl.textContent = '✅ ' + progress.label;
  }
}

export function showChallengeComplete(bonus) {
  if (floatsEl) {
    showFloating(floatsEl, '¡Desafío +' + bonus + '!', 'challenge');
  }
}

export function showDailyStreak(days) {
  if (!dailyStreakEl) return;
  if (days > 0) {
    dailyStreakEl.innerHTML = '<span class="streak-fire">🔥</span> ' + days + (days === 1 ? ' día' : ' días') + ' seguidos';
    dailyStreakEl.style.display = '';
  } else {
    dailyStreakEl.style.display = 'none';
  }
}

export function showHeatmap(notePerformance, state) {
  if (!heatmapEl) return;
  if (resultsEl) resultsEl.style.display = 'none';
  heatmapEl.style.display = 'flex';
  import('./fretboard.js').then((fret) => {
    fret.renderHeatmap(state, notePerformance);
    if (heatmapStatsEl) {
      const notes = Object.keys(notePerformance || {});
      const total = notes.length;
      const correct = notes.reduce((a, n) => a + (notePerformance[n].correct || 0), 0);
      const wrong = notes.reduce((a, n) => a + (notePerformance[n].wrong || 0), 0);
      heatmapStatsEl.textContent = total + ' notas distintas · ' + correct + ' aciertos · ' + wrong + ' fallos';
    }
  });
}

export function hideHeatmap() {
  if (!heatmapEl) return;
  heatmapEl.style.display = 'none';
  if (resultsEl) resultsEl.style.display = 'flex';
}

export function onHeatmapClose(fn) {
  if (heatmapCloseEl) {
    heatmapCloseEl.onclick = () => {
      hideHeatmap();
      if (fn) fn();
    };
  }
}

export function onHeatmapButton(fn) {
  if (resultsHeatmapBtn) {
    resultsHeatmapBtn.onclick = fn;
  }
}
