import { NOTES, SCALES, ARPEGGIOS } from './constants.js';

export function midiToNote(midi) {
  return NOTES[midi % 12];
}

export function noteIndex(note) {
  return NOTES.indexOf(note);
}

export function getScaleNotes(root, scaleType) {
  const rootIdx = noteIndex(root);
  const intervals = SCALES[scaleType] || [];
  return intervals.map(i => NOTES[(rootIdx + i) % 12]);
}

export function getArpeggioNotes(root, type) {
  if (!type || type === 'none' || !ARPEGGIOS[type]) return null;
  const rootIdx = noteIndex(root);
  const { intervals, degrees } = ARPEGGIOS[type];
  const notes = intervals.map(i => NOTES[(rootIdx + i) % 12]);
  const degreeMap = {};
  notes.forEach((n, i) => { degreeMap[n] = degrees[i]; });
  return { notes, degrees: degreeMap };
}

export function getChordRoot(root, scaleType, degree) {
  const notes = getScaleNotes(root, scaleType);
  if (notes.length === 0) return root;
  return notes[degree % notes.length];
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
