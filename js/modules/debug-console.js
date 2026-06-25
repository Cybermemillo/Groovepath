import * as userPoints from './user-points.js';
import * as achievements from './achievements.js';
import { ACHIEVEMENTS } from './achievements-data.js';
import * as stats from './stats.js';
import * as practiceTime from './practice-time.js';
import * as training from './training.js';
import * as improvisation from './improvisation.js';
import * as backing from './backing-track.js';

const LS_KEYS = [
  'basslab_achievements',
  'basslab_achievements_tracker',
  'basslab_user_points',
  'basslab_stats',
  'basslab_practice_time',
  'basslab_settings',
  'basslab_routines',
  'basslab_daily_goal',
  'basslab_news_seen',
  'basslab_collapsed_sections',
];

function log(label, value) {
  console.log('%c[basslab] %c' + label, 'color:#ffcc00;font-weight:700', 'color:inherit', value !== undefined ? value : '');
}

// ── Helpers ──
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeFakeSession() {
  const total = randomInt(8, 40);
  const correct = Math.floor(total * (0.55 + Math.random() * 0.4));
  const fast = randomInt(300, 800);
  return {
    root: ['C', 'A', 'E', 'G', 'D'][randomInt(0, 4)],
    scale: ['minor_pentatonic', 'major', 'blues', 'dorian'][randomInt(0, 3)],
    arpeggio: 'none',
    range: '1-' + randomInt(5, 12),
    score: correct * randomInt(60, 130),
    correct,
    wrong: total - correct,
    maxStreak: randomInt(3, correct),
    total,
    avgReactionMs: randomInt(800, 2500),
    fastestMs: fast,
  };
}

function makeFakeImproSession() {
  const total = randomInt(5, 25);
  const correct = Math.floor(total * (0.5 + Math.random() * 0.45));
  return {
    root: ['C', 'A', 'E', 'G', 'D'][randomInt(0, 4)],
    scale: ['minor_pentatonic', 'major', 'blues', 'dorian'][randomInt(0, 3)],
    difficulty: ['walking_bass', 'funk_machine', 'four_strings'][randomInt(0, 2)],
    guided: Math.random() > 0.5,
    score: correct * randomInt(50, 120),
    correctChord: Math.floor(correct * (0.5 + Math.random() * 0.5)),
    correctScale: correct - Math.floor(correct * (0.5 + Math.random() * 0.5)),
    wrong: total - correct,
    maxStreak: randomInt(3, correct),
    duration: randomInt(60, 600),
  };
}

function makeFakeFlashSession() {
  const rounds = randomInt(5, 20);
  const correct = Math.floor(rounds * (0.5 + Math.random() * 0.4));
  return {
    score: correct * randomInt(40, 100),
    correct,
    wrong: rounds - correct,
    maxStreak: randomInt(2, correct),
    rounds,
  };
}

// ── API ──
const basslab = {
  help() {
    console.log(
      '%c🎸 BassLab Debug Console %cv1.4\n\n' +
      '%cComandos disponibles:\n\n' +
      '  basslab.help()                          → este mensaje\n' +
      '  basslab.reload()                        → recargar la app\n' +
      '  basslab.clearAll()                      → borrar TODO localStorage\n' +
      '  basslab.export()                        → imprimir JSON de localStorage\n\n' +
      '  basslab.points.add(amt, src, desc)      → sumar puntos\n' +
      '  basslab.points.total()                  → total de puntos\n' +
      '  basslab.points.history()                → historial de puntos\n' +
      '  basslab.points.clear()                  → borrar puntos\n\n' +
      '  basslab.achievements.unlock(id)         → desbloquear logro por ID\n' +
      '  basslab.achievements.unlockAll()        → desbloquear todos\n' +
      '  basslab.achievements.list()             → listar IDs disponibles\n' +
      '  basslab.achievements.reset()            → borrar progreso de logros\n' +
      '  basslab.achievements.check()            → evaluar condiciones\n\n' +
      '  basslab.stats.fakeTraining(opts)        → crear sesión falsa de entrenamiento\n' +
      '  basslab.stats.fakeImprovisation(opts)   → crear sesión falsa de improvisación\n' +
      '  basslab.stats.fakeIntervals(opts)       → crear sesión falsa de intervalos\n' +
      '  basslab.stats.simulateTraining(n)       → generar N sesiones aleatorias\n' +
      '  basslab.stats.simulateImprovisation(n)  → generar N sesiones aleatorias\n' +
      '  basslab.stats.clear()                   → borrar sesiones\n' +
      '  basslab.stats.goal(min)                 → meta diaria en minutos\n\n' +
      '  basslab.time.add(min, src)              → sumar minutos de práctica\n' +
      '  basslab.time.today(src?)                → minutos de hoy\n' +
      '  basslab.time.total()                    → minutos totales\n' +
      '  basslab.time.clear()                    → borrar tiempo\n\n' +
      '  basslab.backing.play()                  → iniciar backing track\n' +
      '  basslab.backing.stop()                  → detener backing track\n' +
      '  basslab.backing.setBpm(bpm)             → cambiar BPM\n\n' +
      '  basslab.training.start(rounds)          → iniciar entrenamiento\n' +
      '  basslab.training.stop()                 → detener entrenamiento\n\n' +
      '  basslab.impro.start(opts?)              → iniciar improvisación\n' +
      '  basslab.impro.stop()                    → detener improvisación',
      'color:#41B39A;font-size:1.2em',
      'color:#aaa;font-size:0.8em',
      'color:#ccc'
    );
  },

  reload() {
    location.reload();
  },

  clearAll() {
    LS_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    log('Borrado todo localStorage (' + LS_KEYS.length + ' claves)', LS_KEYS);
  },

  export() {
    var data = {};
    LS_KEYS.forEach(function (k) {
      var v = localStorage.getItem(k);
      if (v) {
        try { data[k] = JSON.parse(v); } catch (e) { data[k] = v; }
      }
    });
    console.log(data);
    return data;
  },

  import(json) {
    var data = typeof json === 'string' ? JSON.parse(json) : json;
    Object.keys(data).forEach(function (k) {
      if (LS_KEYS.includes(k)) {
        localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
      }
    });
    log('Importados ' + Object.keys(data).length + ' registros. Recarga: basslab.reload()');
  },

  // ── Points ──
  points: {
    add(amount, source, description) {
      userPoints.addPoints(amount, source || 'debug', description || 'Debug: puntos añadidos');
      log('+' + amount + ' puntos (' + (source || 'debug') + ')');
    },
    total() {
      var t = userPoints.getTotal();
      log('Total de puntos: ' + t);
      return t;
    },
    history() {
      var h = userPoints.getHistory(100);
      console.table(h);
      return h;
    },
    clear() {
      localStorage.removeItem('basslab_user_points');
      log('Puntos borrados');
    },
  },

  // ── Achievements ──
  achievements: {
    list() {
      var ids = ACHIEVEMENTS.map(function (a) { return a.id; });
      var unlocked = achievements.getUnlockedIds();
      console.table(ACHIEVEMENTS.map(function (a) {
        return { id: a.id, title: a.title, rarity: a.rarity, unlocked: unlocked.includes(a.id) };
      }));
      log('Total: ' + ids.length + ' logros, ' + unlocked.length + ' desbloqueados');
      return ids;
    },
    unlock(id) {
      achievements.checkEasteregg(id);
      achievements.checkAchievements();
      log('Intentando desbloquear: ' + id + '. Usa basslab.achievements.check() para evaluar.');
    },
    unlockAll() {
      var ids = ACHIEVEMENTS.map(function (a) { return a.id; });
      ids.forEach(function (id) { achievements.checkEasteregg(id); });
      achievements.checkAchievements();
      log('Desbloqueando ' + ids.length + ' logros...');
    },
    reset() {
      localStorage.removeItem('basslab_achievements');
      localStorage.removeItem('basslab_achievements_tracker');
      log('Progreso de logros borrado. Recarga: basslab.reload()');
    },
    check() {
      var result = achievements.checkAchievements();
      log('Revisión completada. Recién desbloqueados: ' + (result.newlyUnlocked ? result.newlyUnlocked.length : 0));
      return result;
    },
  },

  // ── Stats ──
  stats: {
    fakeTraining(opts) {
      var s = opts || makeFakeSession();
      stats.recordSession(s);
      log('Sesión de entrenamiento falsa creada', s);
      return s;
    },
    fakeImprovisation(opts) {
      var s = opts || makeFakeImproSession();
      stats.recordImprovisation(s);
      log('Sesión de improvisación falsa creada', s);
      return s;
    },
    fakeIntervals(opts) {
      var s = opts || makeFakeFlashSession();
      stats.recordFlashcards(s);
      log('Sesión de intervalos falsa creada', s);
      return s;
    },
    simulateTraining(n) {
      var count = n || 5;
      for (var i = 0; i < count; i++) { stats.recordSession(makeFakeSession()); }
      log(count + ' sesiones de entrenamiento generadas');
    },
    simulateImprovisation(n) {
      var count = n || 5;
      for (var i = 0; i < count; i++) { stats.recordImprovisation(makeFakeImproSession()); }
      log(count + ' sesiones de improvisación generadas');
    },
    clear() {
      stats.clearStats();
      log('Estadísticas borradas');
    },
    goal(min) {
      stats.setDailyGoal(min);
      log('Meta diaria: ' + min + ' min');
    },
  },

  // ── Time ──
  time: {
    add(min, source) {
      var src = source || 'debug';
      var sec = (min || 0) * 60;
      var data = JSON.parse(localStorage.getItem('basslab_practice_time') || '{}');
      if (!data.total) data.total = {};
      data.total[src] = (data.total[src] || 0) + sec;
      if (!data.daily) data.daily = {};
      var today = new Date().toISOString().slice(0, 10);
      if (!data.daily[today]) data.daily[today] = {};
      data.daily[today][src] = (data.daily[today][src] || 0) + sec;
      localStorage.setItem('basslab_practice_time', JSON.stringify(data));
      log('+' + min + ' min en ' + src + ' (' + sec + ' s)');
    },
    today(source) {
      var m = practiceTime.getTodayMinutes(source);
      log('Hoy: ' + m + ' min' + (source ? ' (' + source + ')' : ''));
      return m;
    },
    total() {
      var t = practiceTime.getTotalMinutes();
      log('Total: ' + t + ' min');
      return t;
    },
    clear() {
      practiceTime.clearAll();
      log('Tiempo de práctica borrado');
    },
  },

  // ── Backing ──
  backing: {
    play() {
      if (!backing.isPlaying()) backing.start();
      log('Backing track iniciado');
    },
    stop() {
      if (backing.isPlaying()) backing.stop();
      log('Backing track detenido');
    },
    setBpm(bpm) {
      backing.setBpm(bpm);
      log('BPM: ' + bpm);
    },
  },

  // ── Training ──
  training: {
    start(rounds) {
      log('Entrenamiento: usa el botón "Empezar entrenamiento" en la UI para estado completo.');
      log('Llama a training.startTraining(state, rounds) desde la consola con estado manual.');
      log('Este comando requiere el micrófono activo y la app configurada.');
    },
    stop() {
      var r = training.stopTraining();
      log(r ? 'Entrenamiento detenido' : 'No hay entrenamiento activo');
      return r;
    },
  },

  // ── Improvisation ──
  impro: {
    start(opts) {
      log('Improvisación: usa el toggle "Modo improvisación" en la UI para estado completo.');
      log('Llama a improvisation.start(root, scale, opts) desde la consola con estado manual.');
    },
    stop() {
      var r = improvisation.stop();
      log(r ? 'Improvisación detenida' : 'No hay improvisación activa');
      return r;
    },
  },
};

export function init() {
  window.basslab = basslab;
  console.log(
    '%c🎸 %cBassLab Debug Console %cv1.4%c — Escribe %cbasslab.help()%c para ver comandos',
    'font-size:1.1em',
    'color:#41B39A;font-weight:700',
    'color:#aaa;font-size:0.8em',
    'color:#ccc',
    'color:#ffcc00;font-weight:700',
    'color:#ccc'
  );
}
