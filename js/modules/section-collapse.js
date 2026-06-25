const STORAGE_KEY = 'basslab_collapsed_sections';

let collapsed = {};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) collapsed = JSON.parse(raw);
  } catch (e) {
    collapsed = {};
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
  } catch (e) { /* noop */ }
}

function isCollapsed(section) {
  return !!collapsed[section];
}

function applyState(panel, section) {
  if (isCollapsed(section)) {
    panel.classList.add('collapsed');
  } else {
    panel.classList.remove('collapsed');
  }
}

export function init() {
  loadState();

  document.querySelectorAll('.section-collapse-btn').forEach(btn => {
    const header = btn.closest('.section-header');
    if (!header) return;

    const section = header.dataset.section;
    if (!section) return;

    const panel = btn.closest('.tab-panel');
    if (!panel) return;

    applyState(panel, section);

    header.addEventListener('click', () => {
      collapsed[section] = !isCollapsed(section);
      applyState(panel, section);
      saveState();
    });
  });
}
