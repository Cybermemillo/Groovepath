export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
};

export const TUNINGS = {
  standard:   [43, 38, 33, 28],
  drop_d:     [43, 38, 33, 26],
  d_standard: [41, 36, 31, 26],
};

export const TUNING_LABELS = {
  standard:   ['G', 'D', 'A', 'E'],
  drop_d:     ['G', 'D', 'A', 'D'],
  d_standard: ['F', 'C', 'G', 'D'],
};

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
