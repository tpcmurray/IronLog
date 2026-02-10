import { get, put } from './client';

export function getActiveProgram() {
  return get('/program/active');
}

export function updateProgram(id, body) {
  return put(`/program/${id}`, body);
}
