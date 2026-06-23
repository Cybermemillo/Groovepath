import { NOTES, SCALES } from './constants.js';

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

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
