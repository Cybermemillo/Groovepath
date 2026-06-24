const STORAGE_KEY = 'basslab_routines';

const PREDEFINED = [
  {
    id: 'builtin_warmup',
    name: 'Calentamiento',
    description: 'Escala mayor y menor, trastes 1–5, 2 min cada una.',
    builtin: true,
    steps: [
      { root:'A', scaleType:'major', arpeggioType:'none', fretFrom:1, fretTo:5, mode:'free', backingStyle:'none', bpm:100, metronome:true, duration:120 },
      { root:'A', scaleType:'minor', arpeggioType:'none', fretFrom:1, fretTo:5, mode:'free', backingStyle:'none', bpm:100, metronome:true, duration:120 },
    ],
  },
  {
    id: 'builtin_scales',
    name: 'Escalas diarias',
    description: 'Cinco tonalidades en escala elegida, trastes 5–12.',
    builtin: true,
    steps: [
      { root:'C', scaleType:'major', arpeggioType:'none', fretFrom:5, fretTo:12, mode:'training', backingStyle:'none', bpm:90, metronome:true, duration:90 },
      { root:'D', scaleType:'major', arpeggioType:'none', fretFrom:5, fretTo:12, mode:'training', backingStyle:'none', bpm:90, metronome:true, duration:90 },
      { root:'E', scaleType:'major', arpeggioType:'none', fretFrom:5, fretTo:12, mode:'training', backingStyle:'none', bpm:90, metronome:true, duration:90 },
      { root:'G', scaleType:'major', arpeggioType:'none', fretFrom:5, fretTo:12, mode:'training', backingStyle:'none', bpm:90, metronome:true, duration:90 },
      { root:'A', scaleType:'major', arpeggioType:'none', fretFrom:5, fretTo:12, mode:'training', backingStyle:'none', bpm:90, metronome:true, duration:90 },
    ],
  },
  {
    id: 'builtin_arpeggios',
    name: 'Arpegios',
    description: 'Mayor 7, menor 7 y dominante 7 en modo entrenamiento.',
    builtin: true,
    steps: [
      { root:'A', scaleType:'minor', arpeggioType:'major_7', soloArpeggio:true, fretFrom:1, fretTo:12, mode:'training', backingStyle:'none', bpm:80, metronome:true, duration:120 },
      { root:'A', scaleType:'minor', arpeggioType:'minor_7', soloArpeggio:true, fretFrom:1, fretTo:12, mode:'training', backingStyle:'none', bpm:80, metronome:true, duration:120 },
      { root:'A', scaleType:'minor', arpeggioType:'dominant_7', soloArpeggio:true, fretFrom:1, fretTo:12, mode:'training', backingStyle:'none', bpm:80, metronome:true, duration:120 },
    ],
  },
  {
    id: 'builtin_impro',
    name: 'Improvisación con backing',
    description: '4 estilos de backing: rock, funk, blues, jazz. 2 min cada uno.',
    builtin: true,
    steps: [
      { root:'A', scaleType:'minor_pentatonic', arpeggioType:'none', fretFrom:1, fretTo:15, mode:'improvisation', backingStyle:'rock',  bpm:100, metronome:false, duration:120 },
      { root:'A', scaleType:'minor_pentatonic', arpeggioType:'none', fretFrom:1, fretTo:15, mode:'improvisation', backingStyle:'funk',  bpm:100, metronome:false, duration:120 },
      { root:'A', scaleType:'minor_pentatonic', arpeggioType:'none', fretFrom:1, fretTo:15, mode:'improvisation', backingStyle:'blues', bpm:80,  metronome:false, duration:120 },
      { root:'A', scaleType:'minor_pentatonic', arpeggioType:'none', fretFrom:1, fretTo:15, mode:'improvisation', backingStyle:'jazz',  bpm:130, metronome:false, duration:120 },
    ],
  },
];

/* ─── Storage ─── */
export function getAll() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return [...PREDEFINED, ...stored];
  } catch {
    return [...PREDEFINED];
  }
}

export function getCustom() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCustom(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addCustom(routine) {
  const custom = getCustom();
  routine.id = 'custom_' + Date.now();
  routine.builtin = false;
  custom.push(routine);
  saveCustom(custom);
  return routine;
}

export function updateCustom(routine) {
  const custom = getCustom();
  const idx = custom.findIndex(r => r.id === routine.id);
  if (idx >= 0) {
    custom[idx] = routine;
    saveCustom(custom);
    return true;
  }
  return false;
}

export function deleteCustom(id) {
  const custom = getCustom().filter(r => r.id !== id);
  saveCustom(custom);
}

export function duplicate(id) {
  const all = getAll();
  const src = all.find(r => r.id === id);
  if (!src) return null;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = 'custom_' + Date.now();
  copy.name = src.name + ' (copia)';
  copy.builtin = false;
  addCustom(copy);
  return copy;
}

export function exportAll() {
  const custom = getCustom();
  const blob = new Blob([JSON.stringify(custom, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'basslab_routines.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJSON(jsonText, mode) {
  try {
    const imported = JSON.parse(jsonText);
    if (!Array.isArray(imported)) throw new Error('Formato inválido');
    imported.forEach(r => {
      r.builtin = false;
      if (!r.id) r.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    });
    if (mode === 'replace') {
      saveCustom(imported);
    } else {
      const existing = getCustom();
      const merged = [...existing];
      imported.forEach(ir => {
        if (!existing.find(e => e.id === ir.id)) merged.push(ir);
      });
      saveCustom(merged);
    }
    return imported.length;
  } catch {
    return -1;
  }
}

/* ─── Player ─── */
let playerState = null;
let playerTimer = null;
let playerCallbacks = {};

export function setPlayerCallbacks(cbs) {
  playerCallbacks = cbs;
}

export function startPlayer(routine) {
  stopPlayer();
  playerState = {
    routine,
    stepIndex: 0,
    totalSteps: routine.steps.length,
    startTime: Date.now(),
    elapsedTotal: 0,
    paused: false,
    pauseOffset: 0,
    stepStartTime: Date.now(),
    stepRemaining: routine.steps[0].duration,
  };
  emitStepStart();
  tick();
}

function tick() {
  if (!playerState || playerState.paused) return;

  const now = Date.now();
  const elapsed = Math.floor((now - playerState.stepStartTime) / 1000);
  const step = playerState.routine.steps[playerState.stepIndex];
  const remaining = Math.max(0, step.duration - elapsed);

  playerState.stepRemaining = remaining;

  if (playerCallbacks.onTick) {
    playerCallbacks.onTick({ stepIndex: playerState.stepIndex, totalSteps: playerState.totalSteps, remaining });
  }

  if (remaining <= 0) {
    advanceStep();
  } else {
    playerTimer = setTimeout(tick, 200);
  }
}

function advanceStep() {
  if (playerCallbacks.onStepEnd) {
    playerCallbacks.onStepEnd({ stepIndex: playerState.stepIndex });
  }

  playerState.stepIndex++;
  if (playerState.stepIndex >= playerState.totalSteps) {
    finishPlayer();
    return;
  }

  emitStepStart();
  tick();
}

function emitStepStart() {
  playerState.stepStartTime = Date.now();
  const step = playerState.routine.steps[playerState.stepIndex];
  if (playerCallbacks.onStepStart) {
    playerCallbacks.onStepStart({
      stepIndex: playerState.stepIndex,
      totalSteps: playerState.totalSteps,
      step,
    });
  }
}

function finishPlayer() {
  const builtin = playerState.routine.builtin || false;
  const data = {
    totalTime: Math.floor((Date.now() - playerState.startTime) / 1000),
    stepsCompleted: playerState.totalSteps,
    builtin,
  };
  stopPlayer();
  if (playerCallbacks.onFinish) playerCallbacks.onFinish(data);
}

export function pausePlayer() {
  if (!playerState || playerState.paused) return;
  playerState.paused = true;
  playerState.pauseOffset = Date.now() - playerState.stepStartTime;
  if (playerTimer) { clearTimeout(playerTimer); playerTimer = null; }
  if (playerCallbacks.onPaused) playerCallbacks.onPaused();
}

export function resumePlayer() {
  if (!playerState || !playerState.paused) return;
  playerState.paused = false;
  playerState.stepStartTime = Date.now() - playerState.pauseOffset;
  if (playerCallbacks.onResumed) playerCallbacks.onResumed();
  tick();
}

export function skipStep() {
  if (!playerState) return;
  advanceStep();
}

export function stopPlayer() {
  if (playerTimer) { clearTimeout(playerTimer); playerTimer = null; }
  playerState = null;
}

export function isPlaying() {
  return !!playerState;
}

export function isPaused() {
  return playerState && playerState.paused;
}

export function getPlayerInfo() {
  if (!playerState) return null;
  return {
    routineName: playerState.routine.name,
    stepIndex: playerState.stepIndex,
    totalSteps: playerState.totalSteps,
    remaining: playerState.stepRemaining,
    paused: playerState.paused,
    step: playerState.routine.steps[playerState.stepIndex],
  };
}
