let listeners = [];
let toasts = [];
let nextId = 1;

export function subscribe(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function getToasts() {
  return toasts;
}

export function showToast(message, type = 'error') {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  notify();
  // Auto-dismiss after 4 seconds
  setTimeout(() => dismissToast(id), 4000);
}

export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

function notify() {
  listeners.forEach((fn) => fn(toasts));
}
