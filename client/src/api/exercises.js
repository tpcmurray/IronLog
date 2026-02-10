import { get, post, put } from './client';

export function getExercises() {
  return get('/exercises');
}

export function createExercise(body) {
  return post('/exercises', body);
}

export function updateExercise(id, body) {
  return put(`/exercises/${id}`, body);
}

export function getLastSession(exerciseId) {
  return get(`/exercises/${exerciseId}/last-session`);
}

export function getExerciseHistory(exerciseId, { limit = 10, offset = 0 } = {}) {
  return get(`/exercises/${exerciseId}/history?limit=${limit}&offset=${offset}`);
}
