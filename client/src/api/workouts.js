import { get, post, put } from './client';

export function startWorkout(programDayId) {
  return post('/workouts', { program_day_id: programDayId });
}

export function getCurrentWorkout() {
  return get('/workouts/current');
}

export function completeWorkout(id) {
  return put(`/workouts/${id}/complete`);
}

export function getWorkoutHistory({ week, date } = {}) {
  const params = new URLSearchParams();
  if (week) params.set('week', week);
  else if (date) params.set('date', date);
  const qs = params.toString();
  return get(`/workouts/history${qs ? `?${qs}` : ''}`);
}

export function startExercise(workoutId, sessionExerciseId) {
  return put(`/workouts/${workoutId}/exercises/${sessionExerciseId}/start`);
}

export function skipExercise(workoutId, sessionExerciseId, reason) {
  return put(`/workouts/${workoutId}/exercises/${sessionExerciseId}/skip`, { reason });
}

export function completeExercise(workoutId, sessionExerciseId) {
  return put(`/workouts/${workoutId}/exercises/${sessionExerciseId}/complete`);
}
