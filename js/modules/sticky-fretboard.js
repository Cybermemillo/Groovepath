let fretboardEl = null;
let spacer = null;
let isFixed = false;
let ticking = false;
let enabled = false;

function fix() {
  if (!fretboardEl) return;
  const tabPanel = fretboardEl.closest('[data-panel="fretboard"]');
  if (!tabPanel) return;

  spacer = document.createElement('div');
  spacer.className = 'fretboard-spacer';
  spacer.style.height = fretboardEl.offsetHeight + 'px';
  fretboardEl.parentNode.insertBefore(spacer, fretboardEl);

  fretboardEl.style.width = tabPanel.offsetWidth + 'px';
  fretboardEl.classList.add('fixed');
  isFixed = true;
}

function unfix() {
  if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer);
  spacer = null;
  if (fretboardEl) {
    fretboardEl.style.width = '';
    fretboardEl.classList.remove('fixed');
  }
  isFixed = false;
}

function update() {
  if (!fretboardEl || !enabled) return;
  const rect = fretboardEl.getBoundingClientRect();

  if (!isFixed && rect.top <= 60) {
    fix();
  } else if (isFixed) {
    if (spacer && spacer.getBoundingClientRect().top >= 60) {
      unfix();
      return;
    }
    const tabPanel = fretboardEl.closest('[data-panel="fretboard"]');
    if (tabPanel) {
      fretboardEl.style.width = tabPanel.offsetWidth + 'px';
    }
  }
}

function onScroll() {
  if (ticking || !enabled) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    update();
  });
}

function onResize() {
  if (window.innerWidth < 601) {
    enabled = false;
    if (isFixed) unfix();
    return;
  }
  enabled = true;
  if (isFixed && fretboardEl) {
    const tabPanel = fretboardEl.closest('[data-panel="fretboard"]');
    if (tabPanel) {
      fretboardEl.style.width = tabPanel.offsetWidth + 'px';
    }
  }
}

export function init() {
  fretboardEl = document.querySelector('.fretboard-section');
  if (!fretboardEl) return;
  enabled = window.innerWidth >= 601;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
}
