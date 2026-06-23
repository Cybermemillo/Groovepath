const $ = (sel) => document.querySelector(sel);

let backdrop, closeBtn, scrollY;

function open() {
  scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.overflowY = 'scroll';
  backdrop.classList.add('active');
  $('#helpModal').scrollTop = 0;
}

function close() {
  backdrop.classList.remove('active');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflowY = '';
  window.scrollTo(0, scrollY);
}

export function initHelpModal() {
  backdrop = $('#helpModalBackdrop');
  closeBtn = $('#helpModalClose');
  const btn = $('#helpBtn');

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('active')) close();
  });
}
