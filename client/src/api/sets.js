import { post, put, del } from './client';

export function logSet(workoutId, sessionExerciseId, body) {
  return post(`/workouts/${workoutId}/exercises/${sessionExerciseId}/sets`, body);
}

export function editSet(setId, body) {
  return put(`/sets/${setId}`, body);
}

export function deleteSet(setId) {
  return del(`/sets/${setId}`);
}
