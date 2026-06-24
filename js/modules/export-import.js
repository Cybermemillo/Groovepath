const APP_NAME = 'BassLab';
const VERSION = 1;

const DATA_KEYS = {
  settings: 'basslab_settings',
  stats: 'basslab_stats',
  practiceTime: 'basslab_practice_time',
  routines: 'basslab_routines',
  achievements: 'basslab_achievements',
  userPoints: 'basslab_user_points',
  dailyGoal: 'basslab_daily_goal',
  achievementsTracker: 'basslab_achievements_tracker',
};

function readAllData() {
  const data = {};
  for (const [name, key] of Object.entries(DATA_KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      data[name] = raw ? JSON.parse(raw) : null;
    } catch {
      data[name] = null;
    }
  }
  return data;
}

function writeAllData(data) {
  for (const [name, key] of Object.entries(DATA_KEYS)) {
    const value = data[name];
    if (value !== undefined && value !== null) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}

/* ─── Crypto helpers ─── */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function encrypt(plaintext, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    salt: bufToBase64(salt),
    iv: bufToBase64(iv),
    ciphertext: bufToBase64(ciphertext),
  };
}

async function decrypt(ciphertext64, password, salt64, iv64) {
  const salt = base64ToBuf(salt64);
  const iv = base64ToBuf(iv64);
  const ciphertext = base64ToBuf(ciphertext64);
  const key = await deriveKey(password, salt);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plainBuf);
}

/* ─── Public API ─── */

export async function exportData(password) {
  const data = readAllData();
  const payload = {
    version: VERSION,
    exportedAt: new Date().toISOString(),
    app: APP_NAME,
    encrypted: false,
    data,
  };

  let jsonStr;
  if (password) {
    const encrypted = await encrypt(JSON.stringify(data), password);
    payload.encrypted = true;
    payload.salt = encrypted.salt;
    payload.iv = encrypted.iv;
    payload.ciphertext = encrypted.ciphertext;
    delete payload.data;
    jsonStr = JSON.stringify(payload, null, 2);
  } else {
    jsonStr = JSON.stringify(payload, null, 2);
  }

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'basslab_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFromText(jsonText, password) {
  const payload = JSON.parse(jsonText);

  if (payload.app !== APP_NAME) {
    throw new Error('El archivo no es una copia de seguridad de BassLab.');
  }
  if (!payload.version || payload.version < 1) {
    throw new Error('Versión de copia de seguridad no compatible.');
  }

  let data;
  if (payload.encrypted) {
    if (!password) {
      throw new Error('Esta copia de seguridad está protegida con contraseña.');
    }
    try {
      const plaintext = await decrypt(payload.ciphertext, password, payload.salt, payload.iv);
      data = JSON.parse(plaintext);
    } catch {
      throw new Error('Contraseña incorrecta o archivo corrupto.');
    }
  } else {
    data = payload.data;
  }

  if (!data || typeof data !== 'object') {
    throw new Error('El archivo no contiene datos válidos.');
  }

  writeAllData(data);
  return data;
}

/* ─── UI ─── */
let importFileInput = null;

function ensureButtons() {
  if (document.getElementById('exportBtn')) return;
  const headerControls = document.querySelector('.header-controls');
  if (!headerControls) return;

  const wrap = document.createElement('span');
  wrap.className = 'ei-btn-wrap desktop-only';

  const exportBtn = document.createElement('button');
  exportBtn.id = 'exportBtn';
  exportBtn.className = 'btn-icon ei-btn';
  exportBtn.title = 'Exportar todos mis datos';
  exportBtn.innerHTML = '<i class="fa-solid fa-download"></i>';

  const importBtn = document.createElement('button');
  importBtn.id = 'importBtn';
  importBtn.className = 'btn-icon ei-btn';
  importBtn.title = 'Importar datos';
  importBtn.innerHTML = '<i class="fa-solid fa-upload"></i>';

  importFileInput = document.createElement('input');
  importFileInput.type = 'file';
  importFileInput.accept = '.json';
  importFileInput.style.display = 'none';
  importFileInput.id = 'importFileInput';

  wrap.appendChild(exportBtn);
  wrap.appendChild(importBtn);
  wrap.appendChild(importFileInput);

  // Insert after the achievement badge if present, else at the start
  const badgeWrap = document.querySelector('.ach-badge-wrap');
  if (badgeWrap) {
    badgeWrap.after(wrap);
  } else {
    headerControls.insertBefore(wrap, headerControls.firstChild);
  }
}

export function initExportImport() {
  ensureButtons();

  document.getElementById('exportBtn').addEventListener('click', async () => {
    const usePwd = confirm('¿Quieres proteger la copia de seguridad con contraseña?');
    let password = null;
    if (usePwd) {
      password = prompt('Introduce una contraseña:');
      if (!password) return;
      const confirmPwd = prompt('Repite la contraseña para confirmar:');
      if (password !== confirmPwd) {
        alert('Las contraseñas no coinciden.');
        return;
      }
    }
    try {
      await exportData(password);
    } catch (err) {
      alert('Error al exportar: ' + (err.message || 'Error desconocido'));
    }
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files[0];
    if (!file) return;

    try {
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al leer el archivo.'));
        reader.readAsText(file);
      });

      const payload = JSON.parse(text);
      if (payload.app !== APP_NAME) {
        throw new Error('El archivo no es una copia de seguridad de BassLab.');
      }

      let password = null;
      if (payload.encrypted) {
        password = prompt('Este archivo está protegido. Introduce la contraseña:');
        if (!password) { importFileInput.value = ''; return; }
      }

      const confirmed = confirm('Esto reemplazará TODOS tus datos actuales (ajustes, estadísticas, logros, puntos, rutinas). ¿Continuar?');
      if (!confirmed) { importFileInput.value = ''; return; }

      await importFromText(text, password);
      alert('Datos importados correctamente. Se recargará la página.');
      location.reload();
    } catch (err) {
      alert('Error al importar: ' + (err.message || 'Error desconocido'));
      importFileInput.value = '';
    }
  });
}
