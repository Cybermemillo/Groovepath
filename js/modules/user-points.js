const STORAGE_KEY = 'basslab_user_points';

function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { total: 0, history: [] };
  } catch {
    return { total: 0, history: [] };
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota */ }
}

export function addPoints(amount, source, description) {
  if (amount <= 0) return;
  const data = getData();
  data.total += amount;
  data.history.push({
    amount,
    source,
    description,
    date: new Date().toISOString(),
  });
  if (data.history.length > 200) {
    data.history = data.history.slice(-200);
  }
  saveData(data);
  return { total: data.total, added: amount };
}

export function getTotal() {
  return getData().total;
}

export function getHistory(limit = 50) {
  const data = getData();
  return data.history.slice(-limit).reverse();
}

export function spendPoints(amount) {
  const data = getData();
  if (data.total < amount) return false;
  data.total -= amount;
  data.history.push({
    amount: -amount,
    source: 'spend',
    description: 'Canjeado en la tienda',
    date: new Date().toISOString(),
  });
  saveData(data);
  return true;
}
