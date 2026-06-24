export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SPANISH_NOTES = {
  'C': 'Do', 'C#': 'Do#', 'Db': 'Reb',
  'D': 'Re', 'D#': 'Re#', 'Eb': 'Mib',
  'E': 'Mi',
  'F': 'Fa', 'F#': 'Fa#', 'Gb': 'Solb',
  'G': 'Sol', 'G#': 'Sol#', 'Ab': 'Lab',
  'A': 'La', 'A#': 'La#', 'Bb': 'Sib',
  'B': 'Si',
};

export function noteToDisplay(note, notation) {
  if (!note || notation !== 'spanish') return note;
  return SPANISH_NOTES[note] || note;
}

export const ENHARMONICS = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
};

export const SCALES = {
  minor_pentatonic: [0, 3, 5, 7, 10],
  major_pentatonic: [0, 2, 4, 7, 9],
  major:            [0, 2, 4, 5, 7, 9, 11],
  minor:            [0, 2, 3, 5, 7, 8, 10],
  blues:            [0, 3, 5, 6, 7, 10],
  dorian:           [0, 2, 3, 5, 7, 9, 10],
  mixolydian:       [0, 2, 4, 5, 7, 9, 10],
  phrygian:         [0, 1, 3, 5, 7, 8, 10],
  lydian:           [0, 2, 4, 6, 7, 9, 11],
  locrian:          [0, 1, 3, 5, 6, 8, 10],
  chromatic:        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const TUNINGS = {
  standard:       [43, 38, 33, 28],
  drop_d:         [43, 38, 33, 26],
  d_standard:     [41, 36, 31, 26],
  eb_standard:    [42, 37, 32, 27],
  half_step_down: [42, 37, 32, 27],
  custom:         [43, 38, 33, 28],
};

export const TUNING_LABELS = {
  standard:       ['G', 'D', 'A', 'E'],
  drop_d:         ['G', 'D', 'A', 'D'],
  d_standard:     ['F', 'C', 'G', 'D'],
  eb_standard:    ['Gb', 'Db', 'Ab', 'Eb'],
  half_step_down: ['F#', 'C#', 'G#', 'D#'],
  custom:         ['G', 'D', 'A', 'E'],
};

export const TUNING_OPTIONS = [
  { value: 'standard',       label: 'Standard (E-A-D-G)' },
  { value: 'drop_d',         label: 'Drop D (D-A-D-G)' },
  { value: 'd_standard',     label: 'D Standard (D-G-C-F)' },
  { value: 'eb_standard',    label: 'Eb Standard' },
  { value: 'half_step_down', label: 'Medio tono bajo' },
  { value: 'custom',         label: 'Personalizada' },
];

export const MARKER_FRETS   = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_MARKERS = [12, 24];
export const ALL_MARKERS    = new Set([...MARKER_FRETS, ...DOUBLE_MARKERS]);

export const ARPEGGIOS = {
  major_triad:    { intervals: [0, 4, 7],       degrees: ['R', '3', '5'] },
  minor_triad:    { intervals: [0, 3, 7],       degrees: ['R', 'b3', '5'] },
  major_7:        { intervals: [0, 4, 7, 11],   degrees: ['R', '3', '5', '7'] },
  dominant_7:     { intervals: [0, 4, 7, 10],   degrees: ['R', '3', '5', 'b7'] },
  minor_7:        { intervals: [0, 3, 7, 10],   degrees: ['R', 'b3', '5', 'b7'] },
  minor_7b5:      { intervals: [0, 3, 6, 10],   degrees: ['R', 'b3', 'b5', 'b7'] },
  diminished:     { intervals: [0, 3, 6, 9],    degrees: ['R', 'b3', 'b5', 'bb7'] },
  augmented:      { intervals: [0, 4, 8],       degrees: ['R', '3', '#5'] },
};

export const NUM_FRETS   = 24;
export const NUM_STRINGS = 4;

export const BACKING_STYLES = {
  rock: {
    bpm: 100,
    kick:  [1,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    bass:  [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  funk: {
    bpm: 100,
    kick:  [1,0,1,0, 0,0,1,0, 1,0,0,1, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bass:  [1,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
  },
  blues: {
    bpm: 80,
    kick:  [1,0,0,1, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,1, 1,0,1,0, 1,0,1,1, 1,0,1,0],
    bass:  [1,0,0,1, 0,0,0,0, 1,0,0,0, 0,0,0,0],
  },
  jazz: {
    bpm: 130,
    kick:  [1,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bass:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
};

export const PROGRESSIONS = {
  rock:  [{ degree: 0, type: 'power' }, { degree: 3, type: 'power' }, { degree: 4, type: 'power' }, { degree: 3, type: 'power' }],
  funk:  [{ degree: 0, type: 'dominant_7' }, { degree: 4, type: 'minor_7' }, { degree: 5, type: 'major_7' }, { degree: 3, type: 'dominant_7' }],
  blues: [{ degree: 0, type: 'dominant_7' }, { degree: 0, type: 'dominant_7' }, { degree: 3, type: 'dominant_7' }, { degree: 4, type: 'dominant_7' }],
  jazz:  [{ degree: 1, type: 'minor_7' }, { degree: 4, type: 'dominant_7' }, { degree: 0, type: 'major_7' }, { degree: 0, type: 'major_7' }],
};
