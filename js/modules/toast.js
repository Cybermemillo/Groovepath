const containerId = 'toastContainer';

function ensureContainer() {
  let el = document.getElementById(containerId);
  if (!el) {
    el = document.createElement('div');
    el.id = containerId;
    el.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:10000;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(el);
  }
  return el;
}

export function showToast({ title, message, icon, rarity, duration = 4000 }) {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.className = 'ach-toast' + (rarity ? ' ach-toast-' + rarity : '');
  toast.style.cssText = 'pointer-events:auto;';
  toast.innerHTML = `
    <div class="ach-toast-icon">${icon || ''}</div>
    <div class="ach-toast-body">
      <div class="ach-toast-title">${title}</div>
      <div class="ach-toast-msg">${message}</div>
    </div>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('ach-toast-enter'));

  setTimeout(() => {
    toast.classList.add('ach-toast-exit');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
