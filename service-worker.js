const CACHE = 'basslab-v11';
const ASSETS = [
  '.',
  'index.html',
  'css/styles.css',
  'css/achievements.css',
  'js/main.js',
  'js/utils/dom.js',
  'js/modules/constants.js',
  'js/modules/theory.js',
  'js/modules/audio-engine.js',
  'js/modules/synth.js',
  'js/modules/tooltip.js',
  'js/modules/tuner-engine.js',
  'js/modules/tuner-ui.js',
  'js/modules/fretboard.js',
  'js/modules/ui-controls.js',
  'js/modules/training.js',
  'js/modules/training-ui.js',
  'js/modules/stats.js',
  'js/modules/stats-ui.js',
  'js/modules/backing-track.js',
  'js/modules/backing-track-ui.js',
  'js/modules/improvisation.js',
  'js/modules/improvisation-ui.js',
  'js/modules/metronome.js',
  'js/modules/metronome-ui.js',
  'js/modules/routines.js',
  'js/modules/routines-ui.js',
  'js/modules/interval-trainer.js',
  'js/modules/interval-trainer-ui.js',
  'js/modules/settings.js',
  'js/modules/practice-time.js',
  'js/modules/achievements.js',
  'js/modules/achievements-data.js',
  'js/modules/achievements-ui.js',
  'js/modules/eastereggs.js',
  'js/modules/eastereggs-data.js',
  'js/modules/export-import.js',
  'js/modules/help-modal.js',
  'js/modules/news-modal.js',
  'js/modules/mobile-tabs.js',
  'js/modules/toast.js',
  'js/modules/user-points.js',
  'js/modules/section-collapse.js',
  'js/modules/sticky-fretboard.js',
  'favicon.svg',
  'manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => {
    return Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
  }));
});
