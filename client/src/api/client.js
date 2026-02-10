import { showToast } from '../utils/toastStore';

const BASE = '/api';

let offline = false;
let offlineListeners = [];

export function subscribeOnline(fn) {
  offlineListeners.push(fn);
  return () => { offlineListeners = offlineListeners.filter((l) => l !== fn); };
}

export function isOffline() {
  return offline;
}

function setOffline(val) {
  if (offline !== val) {
    offline = val;
    offlineListeners.forEach((fn) => fn(val));
  }
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  let res;
  try {
    res = await fetch(url, config);
  } catch {
    setOffline(true);
    showToast('Connection lost — check your network', 'warning');
    const err = new Error('Network error');
    err.status = 0;
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  // Successful response means we're online
  setOffline(false);

  if (res.status === 204) return null;

  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json.error?.message || 'Request failed');
    err.status = res.status;
    err.code = json.error?.code || 'UNKNOWN';
    showToast(err.message);
    throw err;
  }

  return json.data;
}

export function get(path) {
  return request(path);
}

export function post(path, body) {
  return request(path, { method: 'POST', body });
}

export function put(path, body) {
  return request(path, { method: 'PUT', body });
}

export function del(path) {
  return request(path, { method: 'DELETE' });
}
