import { init } from './modules/ui-controls.js';
import { init as initAchievementsUI } from './modules/achievements-ui.js';
import { init as initEastereggs } from './modules/eastereggs.js';
import { checkAchievements } from './modules/achievements.js';

init();
initAchievementsUI();
initEastereggs();

// Check achievements every 30s (for time-based / streak achievements)
setInterval(() => checkAchievements(), 30000);
