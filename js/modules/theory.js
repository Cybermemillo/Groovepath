import { NOTES, SCALES, ARPEGGIOS, NUM_STRINGS } from './constants.js';

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

export function getChordNotes(root, chordType) {
  if (!chordType || chordType === 'power') {
    const rootIdx = noteIndex(root);
    return [root, NOTES[(rootIdx + 7) % 12]];
  }
  const arp = getArpeggioNotes(root, chordType);
  return arp ? arp.notes : [root];
}

export function getChordRoot(root, scaleType, degree) {
  const notes = getScaleNotes(root, scaleType);
  if (notes.length === 0) return root;
  return notes[degree % notes.length];
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function noteToTuningMidi(noteName, stringIndex) {
  const ni = noteIndex(noteName);
  if (ni === -1) return null;
  const standardMidi = [43, 38, 33, 28][stringIndex];
  const baseOctave = Math.floor(standardMidi / 12);
  let midi = ni + 12 * baseOctave;
  while (midi < standardMidi - 6) midi += 12;
  while (midi > standardMidi + 6) midi -= 12;
  return midi;
}

export function midiToStringInfo(midi, tuningMidi) {
  const best = { string: -1, fret: -1, dist: 999 };
  for (let s = 0; s < tuningMidi.length; s++) {
    const openMidi = tuningMidi[s];
    const fret = midi - openMidi;
    if (fret >= 0 && fret <= 24 && fret < best.dist) {
      best.string = s;
      best.fret = fret;
      best.dist = fret;
    }
  }
  return best.string >= 0 ? best : null;
}
