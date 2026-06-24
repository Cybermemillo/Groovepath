import { checkEasteregg, getUnlockData, getUnlockedIds } from './achievements.js';

const KONAMI = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑ ↑ ↓ ↓ ← → ← → B A
let konamiPos = 0;

let catBuffer = '';
let catTimeout = null;

let devilStreak = 0;
let devilLastFret = -1;

function logEastereggMessage() {
  const ascii = [
    '%c            ______________          ',
    '%c           /              \\         ',
    '%c      |----|----|----|----|----|',
    '%c      |    |    |    |    |    |',
    '%c      |  B | A  | S  | S  |    |',
    '%c      |    |    |    |    |    |',
    '%c      |----|----|----|----|----|',
    '%c      |  L | A  | B  |    |    |',
    '%c      |    |    |    |    |    |',
    '%c      |----|----|----|----|----|',
    '%c           \\______________/         ',
    '%c                                    ',
    '%cMuchas gracias.                     ',
    '%cEspero que disfrutes de esto que ha sido hecho con cari\u00F1o y amor',
    '%cde un intento de bajista para bajistas.',
    '%c',
    '%c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
    '%cNota del desarrollador:',
    '%cTodo BassLab est\u00E1 hecho en JavaScript y se ejecuta en tu navegador.',
    '%cEso significa que cualquiera puede abrir la consola y modificar',
    '%cpuntos, estad\u00EDsticas, logros o cualquier otra cosa si lo desea.',
    '%c',
    '%cDepender\u00E1 de cada usuario decidir c\u00F3mo usar esa posibilidad.',
    '%cEsta app est\u00E1 pensada para ayudarte a mejorar con el bajo el\u00E9ctrico.',
    '%cUsar "trampas" no est\u00E1 prohibido, pero sinceramente no lo recomiendo:',
    '%cel \u00FAnico que pierde la oportunidad de aprender eres t\u00FA.',
    '%c',
    '%cDisfruta y sigue practicando.',
  ];
  const styles = [
    'color: #e8c547; font-weight: bold;',
    'color: #e8c547; font-weight: bold;',
    'color: #e8c547;',
    'color: #ffffff;',
    'color: #ffcc00; font-weight: bold;',
    'color: #ffffff;',
    'color: #e8c547;',
    'color: #ffcc00; font-weight: bold;',
    'color: #ffffff;',
    'color: #e8c547;',
    'color: #e8c547; font-weight: bold;',
    'color: #888888;',
    'color: #ffcc00; font-size: 14px;',
    'color: #ffcc00; font-size: 12px;',
    'color: #ffcc00; font-size: 12px;',
    'color: #888888;',
    'color: #888888; font-size: 11px;',
    'color: #aaaaaa; font-size: 11px; font-style: italic;',
    'color: #888888; font-size: 11px;',
    'color: #888888; font-size: 11px;',
    'color: #888888; font-size: 11px;',
    'color: #888888;',
    'color: #888888; font-size: 11px;',
    'color: #888888; font-size: 11px;',
    'color: #ff6666; font-size: 11px;',
    'color: #ff6666; font-size: 11px;',
    'color: #888888;',
    'color: #ffcc00; font-size: 12px;',
  ];
  console.log(ascii.join('\n'), ...styles);
}

export function init() {
  // Easteregg: Console message
  logEastereggMessage();

  // Easteregg: Konami code
  document.addEventListener('keydown', (e) => {
    if (e.keyCode === KONAMI[konamiPos]) {
      konamiPos++;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        triggerKonami();
      }
    } else if (e.keyCode === KONAMI[0]) {
      konamiPos = 1;
    } else {
      konamiPos = 0;
    }
  });

  // Easteregg: "miau" in any text input
  document.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      const ch = (e.data || '').toLowerCase();
      if (ch.length === 1 && /[a-z]/.test(ch)) {
        catBuffer += ch;
        if (catTimeout) clearTimeout(catTimeout);
        catTimeout = setTimeout(() => { catBuffer = ''; }, 2000);
        if (catBuffer.indexOf('miau') !== -1) {
          catBuffer = '';
          if (catTimeout) clearTimeout(catTimeout);
          triggerCat();
        }
      }
    }
  });
}

// Called from ui-controls when tuner/training detects a note
export function onNoteDetected(midi, tuningMidi) {
  if (!tuningMidi || !Array.isArray(tuningMidi)) return;
  // Find which string/fret this midi corresponds to
  let fret = -1;
  for (let s = 0; s < tuningMidi.length; s++) {
    const f = midi - tuningMidi[s];
    if (f >= 0 && f <= 24) {
      fret = f;
      break;
    }
  }

  if (fret === 6) {
    if (devilLastFret === 6) {
      devilStreak++;
    } else {
      devilStreak = 1;
    }
    if (devilStreak >= 6) {
      devilStreak = 0;
      triggerDevil();
    }
  } else {
    devilStreak = fret === devilLastFret ? devilStreak : 0;
  }
  devilLastFret = fret;
}

function triggerKonami() {
  const entry = checkEasteregg('egg_konami');
  if (!entry) return;
  // Animate logo
  const logo = document.querySelector('.brand-icon');
  if (logo) {
    logo.style.transition = 'transform 0.5s ease';
    logo.style.transform = 'rotate(360deg) scale(1.5)';
    setTimeout(() => { logo.style.transform = ''; }, 1200);
  }
  // Confetti
  launchConfetti();
}

function triggerCat() {
  const entry = checkEasteregg('egg_cat');
  if (!entry) return;
  const badge = document.getElementById('achBadge');
  if (badge) {
    const icon = badge.querySelector('i');
    if (icon) {
      icon.className = 'fa-solid fa-cat';
      icon.style.color = '#ffb347';
      setTimeout(() => {
        icon.className = 'fa-solid fa-trophy';
        icon.style.color = '';
      }, 5000);
    }
  }
}

function triggerDevil() {
  const entry = checkEasteregg('egg_devil');
  if (!entry) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(180,0,0,0.25);z-index:9999;pointer-events:none;transition:opacity 0.5s;';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 500);
  }, 3000);
}

function launchConfetti() {
  const colors = ['#ffcc00', '#ff6600', '#00ccff', '#cc00ff', '#00ff66', '#ff3366'];
  for (let i = 0; i < 60; i++) {
    const particle = document.createElement('div');
    const size = Math.random() * 10 + 6;
    const x = Math.random() * window.innerWidth;
    const y = -20;
    particle.style.cssText = `
      position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      z-index:99999;pointer-events:none;
      opacity:1;
    `;
    document.body.appendChild(particle);

    const anim = particle.animate([
      { transform: `translate(0,0) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${(Math.random()-0.5)*300}px,${window.innerHeight+40}px) rotate(${Math.random()*720}deg)`, opacity: 0 }
    ], { duration: 2000 + Math.random() * 2000, easing: 'cubic-bezier(.3,.7,.6,1)' });

    anim.onfinish = () => particle.remove();
  }
}

export { triggerKonami, triggerCat, triggerDevil, launchConfetti };
