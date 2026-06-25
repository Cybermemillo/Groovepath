import { init } from './modules/ui-controls.js';
import { init as initAchievementsUI } from './modules/achievements-ui.js';
import { init as initEastereggs } from './modules/eastereggs.js';
import { init as initSectionCollapse } from './modules/section-collapse.js';
import { init as initStickyFretboard } from './modules/sticky-fretboard.js';
import { checkAchievements } from './modules/achievements.js';
import { initExportImport } from './modules/export-import.js';

init();
initAchievementsUI();
initEastereggs();
initSectionCollapse();
initStickyFretboard();
initExportImport();

// Check achievements every 30s (for time-based / streak achievements)
setInterval(() => checkAchievements(), 30000);
