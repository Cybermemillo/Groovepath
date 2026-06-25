const $ = (sel) => document.querySelector(sel);

const STORAGE_KEY = 'basslab_news_seen';

const UPDATES = [
  {
    date: '2026-06-25',
    version: 'v1.4',
    title: 'BassLab v1.4 \u2014 Gamificaci\u00f3n y aprendizaje profundo',
    body: 'Fase 3 del modo improvisaci\u00f3n: ' +
      'r\u00e9cords personales por estilo/dificultad/modo. ' +
      'Mini-desaf\u00edos por sesi\u00f3n con bonus de puntos (5 notas del acorde seguidas, 3 targets, 0 fallos, etc). ' +
      'Racha diaria de improvisaci\u00f3n con badge visual y nuevo logro a los 7 d\u00edas. ' +
      'Mapa caliente/fr\u00edo del diapas\u00f3n tras la sesi\u00f3n: verde si la nota fue precisa, amarillo tibia, rojo fr\u00eda, gris si no la tocaste. ' +
      'Insignia de "Dominado" en las dificultades donde cumplas los umbrales.',
  },
  {
    date: '2026-06-25',
    version: 'v1.3',
    title: 'BassLab v1.3 \u2014 Ritmo y escucha guiada',
    body: 'Fase 2 del modo improvisaci\u00f3n: ' +
      'pulso visual de beat (4 puntos) sincronizado con la pista y barra de progreso del comp\u00e1s. ' +
      'Cuenta atr\u00e1s visual del cambio de acorde (flash en el \u00faltimo beat). ' +
      'Modo escucha-y-repite: la nota objetivo suena al aparecer y se repite cada 1.8 s mientras no la aciertes. ' +
      'Bonus sutil de timing (+20 pts) cuando tocas una nota del acorde en los tiempos fuertes (1 y 3).',
  },
  {
    date: '2026-06-25',
    version: 'v1.2',
    title: 'BassLab v1.2 \u2014 Mejoras del modo improvisaci\u00f3n',
    body: 'Fase 1 de la reescritura del modo improvisaci\u00f3n: ' +
      'mostrar funciones del acorde (R, 3, 5, 7) en el diapas\u00f3n durante la sesi\u00f3n (toggle opcional). ' +
      'Sincronizaci\u00f3n del objetivo guiado al reloj de audio: los cambios de BPM ya no desajustan el target. ' +
      'Modo libre sin backing track con elecci\u00f3n entre acorde fijo en ra\u00edz o avance autom\u00e1tico cada N compases. ' +
      'Pantalla de resultados mejorada: precisi\u00f3n por acorde, contador de objetivos, consejos personalizados.',
  },
  {
    date: '2026-06-25',
    version: 'v1.1',
    title: 'BassLab v1.1 \u2014 Juice y mejoras de UX',
    body: 'Entrenamiento m\u00e1s jugoso: animaciones de acierto y fallo, pop en la racha, colores por nivel de combo, barra de progreso, cuenta atr\u00e1s con colores y resultados animados con rango S/A/B/C. ' +
      'Modo guiado de improvisaci\u00f3n mejorado: temporizador circular, indicador de calentamiento, feedback por tipo de acierto, resaltado dorado en el diapas\u00f3n, colores de racha. ' +
      'Diapas\u00f3n sticky real en escritorio (sin l\u00edmite del contenedor). ' +
      'Secciones colapsables en escritorio para personalizar la vista. ' +
      'Sonidos de feedback refinados y tono de tick en la cuenta atr\u00e1s del entrenamiento.',
  },
  {
    date: '2026-06-24',
    version: 'v1.0',
    title: 'BassLab v1.0 \u2014 Lanzamiento estable',
    body: 'Primera versi\u00f3n completa del entrenador de bajo. Incluye diapas\u00f3n interactivo, entrenamiento con micr\u00f3fono, afinador crom\u00e1tico, backing tracks (9 estilos), improvisaci\u00f3n guiada, metr\u00f3nomo, rutinas personalizables, estad\u00edsticas con gr\u00e1ficos y sistema de logros.',
  },
  {
    date: '2026-06-20',
    title: 'Fase B — PWA y accesibilidad',
    body: 'A\u00f1adido soporte PWA (manifest, service worker, favicon). Men\u00fa hamburguesa en m\u00f3vil. Mejoras de accesibilidad con regiones ARIA-live. Header responsive y redise\u00f1o del selector de volumen en m\u00f3vil.',
  },
  {
    date: '2026-06-15',
    title: 'Fase A — Correcciones y pulido',
    body: 'Corregido el c\u00f3mputo de minutos por fuente en logros. Tiempo de reacci\u00f3n real en entrenamiento. Textos de ayuda actualizados. Eliminado c\u00f3digo muerto de flashcards.',
  },
];

const NEWS = [
  {
    date: '2026-06-24',
    title: 'Nueva secci\u00f3n de noticias',
    body: 'Ya puedes consultar las novedades y el historial de versiones desde esta secci\u00f3n. La campana en el header te avisar\u00e1 cuando haya nuevas entradas.',
  },
];

let backdrop, closeBtn, scrollY;
let desktopBadge, mobileBadge;
let currentTab = 'updates';

function getLatestDate() {
  const all = [...UPDATES, ...NEWS];
  let max = '';
  all.forEach(function (e) { if (e.date > max) max = e.date; });
  return max;
}

function hasUnseen() {
  var seen = localStorage.getItem(STORAGE_KEY) || '';
  return getLatestDate() > seen;
}

function updateBadges() {
  var show = hasUnseen();
  if (desktopBadge) desktopBadge.style.display = show ? '' : 'none';
  if (mobileBadge) mobileBadge.style.display = show ? '' : 'none';
}

function markSeen() {
  localStorage.setItem(STORAGE_KEY, getLatestDate());
  updateBadges();
}

function renderEntries(list) {
  if (!list || list.length === 0) return '<p style="color:var(--text-muted)">No hay entradas todav\u00eda.</p>';
  return list.map(function (e) {
    return '<div class="news-entry">' +
      '<div class="news-entry-header">' +
        '<span class="news-entry-date">' + e.date + '</span>' +
        (e.version ? '<span class="news-entry-version">' + e.version + '</span>' : '') +
        '<h3 class="news-entry-title">' + e.title + '</h3>' +
      '</div>' +
      '<p class="news-entry-body">' + e.body + '</p>' +
    '</div>';
  }).join('');
}

function render() {
  var content = currentTab === 'updates' ? $('#newsUpdates') : $('#newsNews');
  var data = currentTab === 'updates' ? UPDATES : NEWS;
  if (content) content.innerHTML = renderEntries(data);
}

function switchTab(tab) {
  currentTab = tab;
  var tabs = document.querySelectorAll('.news-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].dataset.tab === tab);
  }
  var updatesEl = $('#newsUpdates');
  var newsEl = $('#newsNews');
  if (updatesEl) updatesEl.style.display = tab === 'updates' ? '' : 'none';
  if (newsEl) newsEl.style.display = tab === 'news' ? '' : 'none';
  render();
}

function open() {
  scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = '-' + scrollY + 'px';
  document.body.style.width = '100%';
  document.body.style.overflowY = 'scroll';
  backdrop.classList.add('active');
  var modal = $('#newsModal');
  if (modal) modal.scrollTop = 0;
  switchTab('updates');
  markSeen();
}

function close() {
  backdrop.classList.remove('active');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflowY = '';
  window.scrollTo(0, scrollY);
}

export function initNewsModal() {
  backdrop = $('#newsModalBackdrop');
  closeBtn = $('#newsModalClose');
  desktopBadge = $('#newsBadge');
  mobileBadge = $('#mobileNewsBadge');

  var btn = $('#newsBtn');
  var mobileBtn = $('#mobileNewsBtn');

  btn.addEventListener('click', open);
  if (mobileBtn) mobileBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);

  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && backdrop.classList.contains('active')) close();
  });

  var tabEls = document.querySelectorAll('.news-tab');
  for (var i = 0; i < tabEls.length; i++) {
    tabEls[i].addEventListener('click', function () {
      switchTab(this.dataset.tab);
    });
  }

  updateBadges();
  render();
}
