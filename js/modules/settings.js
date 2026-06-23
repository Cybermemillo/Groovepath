const KEY = 'basslab_settings';

const DEFAULTS = {
  rootNote: 'A',
  scaleType: 'minor_pentatonic',
  arpeggioType: 'none',
  soloArpeggio: false,
  showNames: true,
  minFret: 0,
  maxFret: 24,
  backingStyle: 'rock',
  bpm: 100,
  backingVolume: 0.8,
  synthVolume: 0.5,
  theme: 'dark',
  tuning: 'standard',
  customTuningNotes: ['E', 'A', 'D', 'G'],
};

export function loadSettings(isMobile = false) {
  try {
    const defaults = { ...DEFAULTS, customTuningNotes: [...DEFAULTS.customTuningNotes] };
    if (isMobile) defaults.maxFret = 9;
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    for (const key of Object.keys(defaults)) {
      if (saved[key] !== undefined && saved[key] !== null) {
        defaults[key] = saved[key];
      }
    }
    return defaults;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    const out = {};
    for (const key of Object.keys(DEFAULTS)) {
      if (settings[key] !== undefined) out[key] = settings[key];
    }
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    /* quota exceeded, ignore */
  }
}
