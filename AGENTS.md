# AGENTS.md — BassLab

## Project overview
BassLab is a vanilla HTML/CSS/JS interactive bass guitar trainer. Single page, no build step, ES6 modules (`type="module"`). All UI in Spanish. PWA-ready with service worker, manifest and favicon.

## Key commands
- **Serve/run:** open `index.html` in a browser (no server needed)
- **Lint/typecheck:** none configured (vanilla JS)

## Key root files
- `index.html` — entry point, all HTML structure
- `manifest.json` — PWA manifest (theme, icons, standalone)
- `service-worker.js` — offline caching strategy
- `favicon.svg` — app icon
- `css/styles.css` — all styles (~3030 lines)
- `css/achievements.css` — achievement modal styles

## Architecture
- `js/main.js` — entry point, imports and calls `init()` from `ui-controls.js`
- `js/modules/ui-controls.js` — central orchestrator (~1280 lines). All modules communicate through callbacks set here.
- `js/modules/constants.js` — note arrays, tunings, scale/chord/arpeggio configs, backing track styles
- `js/modules/theory.js` — scale notes, chord notes, note-to-MIDI conversions
- `js/modules/audio-engine.js` — singleton AudioContext
- `js/modules/synth.js` — monophonic bass synth (ADSR + lowpass filter)
- `js/modules/fretboard.js` — SVG-like DOM rendering of the fretboard
- `js/modules/help-modal.js` — help modal (open/close, body scroll lock)
- `js/modules/news-modal.js` — news/changelog modal with unread badge
- `js/utils/dom.js` — `$(selector)` shorthand

## State management
- `ui-controls.js` holds a global `state` object (rootNote, scaleType, tuning, micActive, etc.)
- `improvisationState` object for chord/scale highlighting on fretboard
- `localStorage` keys: `basslab_settings`, `basslab_stats`, `basslab_practice_time`, `basslab_routines`, `basslab_achievements`, `basslab_user_points`, `basslab_achievements_tracker`, `basslab_daily_goal`, `basslab_news_seen`

## Module pattern
Modules export functions; they communicate via callbacks set from ui-controls.js. Example:
```js
training.setCallbacks({
  onCorrect(data) { ... },
  onWrong(data) { ... },
  onFinish(results) { ... },
});
```

## Notation toggle
`noteToDisplay(noteName, notation)` in `constants.js` translates between English (`C`) and Spanish (`Do`). Affects: fretboard, tuner, training target/feedback, improvisation chord names, root grid.

## Key recent changes (Jun 2026)
- News/changelog modal with unread badge (bell icon in header)
- Stats moved to header modal (was sidebar panel)
- Training panels side-by-side with equal height (CSS grid `align-items: stretch`)
- Improvisation: difficulty levels with names, guided mode, chord timeline, results summary
- Backing track: 9 styles, BPM hot-update, full chord voicings
- Practice time stored per source (`training`, `improvisation`, `backing`, `metronome`)
- Phase A bugfixes: achievements source minutes, real avgReactionTime, help text, dead code
- Phase B polish: PWA (manifest, service worker, favicon), README, ARIA-live, responsive header, accessible button

## When editing
- Match existing CSS conventions (Rajdhani for headings, Inter for body, CSS variables for colors)
- Use `$()` from `dom.js` for element selection
- Keep ES6 module imports explicit (no wildcard except for modules that expose many functions)
- Don't add comments unless critical
- All UI text in Spanish
- Follow security: no secrets in code, validate localStorage reads with try/catch
