import { $ } from '../utils/dom.js';
import * as routines from './routines.js';
import { recordRoutineCreated } from './achievements.js';

const panelEl      = $('#routinesPanel');
const listEl       = $('#routineList');
const playerModal  = $('#routinePlayerModal');
const playerName   = $('#rpName');
const playerDesc   = $('#rpDesc');
const playerStep   = $('#rpStep');
const playerTimer  = $('#rpTimer');
const playerNext   = $('#rpNext');
const playerPause  = $('#rpPause');
const playerSkip   = $('#rpSkip');
const playerStop   = $('#rpStop');
const playerClose  = $('#rpClose');
const playerResult = $('#rpResult');
const editorModal  = $('#routineEditorModal');
const editorForm   = $('#routineEditorForm');
const editorName   = $('#reName');
const editorDesc   = $('#reDesc');
const editorSteps  = $('#reSteps');
const editorSave   = $('#reSave');
const editorCancel = $('#reCancel');
const editorTitle  = $('#reTitle');
const importModal  = $('#routineImportModal');
const importText   = $('#riText');
const importMerge  = $('#riMerge');
const importReplace= $('#riReplace');
const importCancel = $('#riCancel');

let _onPlayRoutine   = null;
let _onStopRoutine   = null;
let _onPauseRoutine  = null;
let _onResumeRoutine = null;
let _onSkipRoutine   = null;
let editingId = null;

/* ─── List ─── */
export function renderList() {
  const all = routines.getAll();
  let html = '';
  all.forEach(r => {
    html += '<div class="routine-card' + (r.builtin ? ' builtin' : '') + '" data-id="' + r.id + '">' +
      '<div class="routine-info">' +
        '<span class="routine-name">' + (r.builtin ? '&#9733; ' : '') + r.name + '</span>' +
        '<span class="routine-desc">' + (r.description || '') + '</span>' +
      '</div>' +
      '<div class="routine-actions">' +
        '<button class="routine-play-btn" data-action="play">&#9654;</button>' +
        '<button class="routine-dup-btn" data-action="dup" title="Duplicar">&#9744;</button>' +
        (!r.builtin ? '<button class="routine-del-btn" data-action="del" title="Eliminar">&times;</button>' : '') +
      '</div>' +
    '</div>';
  });
  if (all.length === 0) {
    html = '<p class="routines-empty">Sin rutinas personalizadas. Crea una o usa las predefinidas.</p>';
  }
  listEl.innerHTML = html;

  listEl.querySelectorAll('.routine-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const id = card.dataset.id;
      if (action === 'play') {
        if (_onPlayRoutine) _onPlayRoutine(id);
      } else if (action === 'dup') {
        const copy = routines.duplicate(id);
        if (copy) renderList();
      } else if (action === 'del') {
        if (confirm('¿Eliminar esta rutina?')) {
          routines.deleteCustom(id);
          renderList();
        }
      } else if (!e.target.closest('button')) {
        openEditor(id);
      }
    });
  });
}

/* ─── Editor ─── */
function openEditor(id) {
  const all = routines.getAll();
  const r = id ? all.find(r => r.id === id) : null;
  editingId = id || null;

  if (id && !r) return;
  if (r && r.builtin) return;

  editorTitle.textContent = r ? 'Editar rutina' : 'Nueva rutina';
  editorName.value = r ? r.name : '';
  editorDesc.value = r ? (r.description || '') : '';
  buildStepEditor(r ? r.steps : []);
  editorModal.classList.add('active');
}

function buildStepEditor(steps) {
  editorSteps.innerHTML = '';
  if (steps.length === 0) steps = [buildDefaultStep()];
  steps.forEach((s, i) => addStepRow(s, i));
}

function buildDefaultStep() {
  return { root:'A', scaleType:'minor_pentatonic', arpeggioType:'none', soloArpeggio:false,
    fretFrom:1, fretTo:12, mode:'free', backingStyle:'none', bpm:100, metronome:true, duration:120 };
}

function addStepRow(step, idx) {
  const row = document.createElement('div');
  row.className = 're-step-row';
  row.innerHTML =
    '<span class="re-step-num">' + (idx + 1) + '</span>' +
    '<input class="re-field re-root" value="' + step.root + '" placeholder="raíz" maxlength="3" />' +
    '<input class="re-field re-scale" value="' + step.scaleType + '" placeholder="escala" />' +
    '<input class="re-field re-arp" value="' + step.arpeggioType + '" placeholder="arpegio" />' +
    '<select class="re-field re-mode"><option value="free"' + (step.mode==='free'?' selected':'') + '>Libre</option><option value="training"' + (step.mode==='training'?' selected':'') + '>Entrenam.</option><option value="improvisation"' + (step.mode==='improvisation'?' selected':'') + '>Impro</option></select>' +
    '<input class="re-field re-backing" value="' + step.backingStyle + '" placeholder="backing" />' +
    '<input class="re-field re-bpm" value="' + step.bpm + '" type="number" min="40" max="240" style="width:42px" />' +
    '<label class="re-check"><input class="re-metronome" type="checkbox"' + (step.metronome?' checked':'') + ' /> M</label>' +
    '<input class="re-field re-dur" value="' + step.duration + '" type="number" min="5" max="900" style="width:46px" /> s' +
    '<button class="re-del-step" title="Quitar paso">&times;</button>';
  row.querySelector('.re-del-step').addEventListener('click', () => {
    row.remove();
  });
  editorSteps.appendChild(row);
}

function readSteps() {
  const rows = editorSteps.querySelectorAll('.re-step-row');
  const steps = [];
  rows.forEach(row => {
    const step = {
      root: row.querySelector('.re-root').value || 'A',
      scaleType: row.querySelector('.re-scale').value || 'minor_pentatonic',
      arpeggioType: row.querySelector('.re-arp').value || 'none',
      soloArpeggio: row.querySelector('.re-mode').value === 'training' ? false : false,
      fretFrom: 1,
      fretTo: 12,
      mode: row.querySelector('.re-mode').value || 'free',
      backingStyle: row.querySelector('.re-backing').value || 'none',
      bpm: parseInt(row.querySelector('.re-bpm').value) || 100,
      metronome: row.querySelector('.re-metronome').checked,
      duration: parseInt(row.querySelector('.re-dur').value) || 120,
    };
    steps.push(step);
  });
  return steps;
}

editorSave.addEventListener('click', () => {
  const routine = {
    name: editorName.value || 'Nueva rutina',
    description: editorDesc.value,
    steps: readSteps(),
  };
  if (routine.steps.length === 0) return;
  if (editingId) {
    routine.id = editingId;
    routines.updateCustom(routine);
  } else {
    routines.addCustom(routine);
    recordRoutineCreated();
  }
  editingId = null;
  editorModal.classList.remove('active');
  renderList();
});

editorCancel.addEventListener('click', () => {
  editingId = null;
  editorModal.classList.remove('active');
});

document.getElementById('reAddStep').addEventListener('click', () => {
  addStepRow(buildDefaultStep(), editorSteps.children.length);
});

document.getElementById('routineNewBtn').addEventListener('click', () => {
  openEditor(null);
});

/* ─── Import / Export ─── */
document.getElementById('routineExportBtn').addEventListener('click', () => {
  routines.exportAll();
});

document.getElementById('routineImportBtn').addEventListener('click', () => {
  importText.value = '';
  importModal.classList.add('active');
});

importCancel.addEventListener('click', () => {
  importModal.classList.remove('active');
});

function doImport(mode) {
  const count = routines.importFromJSON(importText.value, mode);
  if (count >= 0) {
    importModal.classList.remove('active');
    renderList();
  } else {
    alert('El JSON no es válido. Asegúrate de pegar un archivo de rutinas correcto.');
  }
}

importMerge.addEventListener('click', () => doImport('merge'));
importReplace.addEventListener('click', () => doImport('replace'));

/* ─── Player Modal ─── */
function formatStepDesc(step) {
  const modeLabel = step.mode === 'training' ? 'Entrena' : step.mode === 'improvisation' ? 'Improvisa con' : 'Toca libremente';
  const scaleLabel = step.arpeggioType && step.arpeggioType !== 'none'
    ? 'arp. ' + step.arpeggioType.replace(/_/g, ' ')
    : step.scaleType.replace(/_/g, ' ');
  const rootLabel = step.root || '?';
  let parts = [modeLabel + ' ' + rootLabel + ' ' + scaleLabel];
  if (step.fretFrom !== undefined && step.fretTo !== undefined) {
    parts.push('tr. ' + step.fretFrom + '\u2013' + step.fretTo);
  }
  if (step.backingStyle && step.backingStyle !== 'none') {
    parts.push('backing ' + step.backingStyle);
  }
  if (step.metronome) parts.push('metr\u00F3nomo');
  return parts.join(' \u00B7 ');
}

export function showPlayer(routineName, step, stepIndex, totalSteps, remaining) {
  playerModal.classList.add('active');
  playerName.textContent = routineName;
  playerDesc.textContent = step ? formatStepDesc(step) : '';
  playerResult.style.display = 'none';
  playerResult.innerHTML = '';
  updatePlayerStep(stepIndex, totalSteps);
  updatePlayerTimer(remaining);
  playerClose.style.display = '';
}

function updatePlayerStep(idx, total) {
  playerStep.textContent = 'Paso ' + (idx + 1) + ' / ' + total;
}

export function updatePlayerTimer(remaining) {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  playerTimer.textContent = m + ':' + String(s).padStart(2, '0');
}

export function updatePlayerNext(label) {
  playerNext.textContent = label ? 'Siguiente: ' + label : '';
}

export function hidePlayer() {
  playerModal.classList.remove('active');
}

export function showPlayerResults(totalTime, stepsCompleted) {
  playerResult.style.display = 'block';
  playerResult.innerHTML =
    '<p>\u2713 \u00A1Rutina completada!</p>' +
    '<p>' + Math.floor(totalTime / 60) + ' min ' + (totalTime % 60) + ' s \u00B7 ' + stepsCompleted + ' pasos</p>';
  playerPause.textContent = '||';
  playerPause.disabled = true;
  playerSkip.disabled = true;
  playerStop.disabled = true;
}

export function setPlayerButtons(playing, paused) {
  if (!playing) {
    playerPause.textContent = '||';
    playerPause.disabled = true;
    playerSkip.disabled = true;
    playerStop.disabled = true;
    return;
  }
  playerPause.disabled = false;
  playerSkip.disabled = false;
  playerStop.disabled = false;
  playerPause.textContent = paused ? '\u25B6' : '||';
}

/* ─── Callbacks ─── */
export function onPlay(fn)     { _onPlayRoutine   = fn; }
export function onStop(fn)     { _onStopRoutine   = fn; }
export function onPause(fn)    { _onPauseRoutine  = fn; }
export function onResume(fn)   { _onResumeRoutine = fn; }
export function onSkip(fn)     { _onSkipRoutine   = fn; }

export function init() {
  renderList();

  playerPause.addEventListener('click', () => {
    if (routines.isPaused()) {
      if (_onResumeRoutine) _onResumeRoutine();
    } else {
      if (_onPauseRoutine) _onPauseRoutine();
    }
  });
  playerSkip.addEventListener('click', () => {
    if (_onSkipRoutine) _onSkipRoutine();
  });
  playerStop.addEventListener('click', () => {
    if (_onStopRoutine) _onStopRoutine();
  });

  playerClose.addEventListener('click', () => {
    if (_onStopRoutine) _onStopRoutine();
    hidePlayer();
  });
}
