import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveProgram } from '../api/programs';
import { getCurrentWorkout, startWorkout } from '../api/workouts';
import { DAY_LABELS } from '../utils/constants';
import WorkoutPreview from '../components/home/WorkoutPreview';
import RestDayMessage from '../components/home/RestDayMessage';

export default function HomePage() {
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sunday
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  useEffect(() => {
    async function load() {
      try {
        const [prog, workout] = await Promise.all([
          getActiveProgram(),
          getCurrentWorkout(),
        ]);
        setProgram(prog);
        setCurrentWorkout(workout);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const todayDay = program?.days?.find((d) => d.day_of_week === dayOfWeek);
  const isRestDay = todayDay?.is_rest_day;
  const hasWorkout = currentWorkout != null;

  async function handleStart() {
    if (!todayDay) return;
    setStarting(true);
    try {
      const workout = await startWorkout(todayDay.id);
      navigate(`/workout/${workout.id}`);
    } catch (err) {
      if (err.code === 'CONFLICT') {
        // Already have an in-progress session, reload
        const workout = await getCurrentWorkout();
        if (workout) navigate(`/workout/${workout.id}`);
      } else {
        setError(err.message);
      }
    } finally {
      setStarting(false);
    }
  }

  function handleResume() {
    navigate(`/workout/${currentWorkout.id}`);
  }

  if (loading) {
    return (
      <div className="p-6 pt-14 text-center">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 pt-14 text-center">
        <p className="text-progress-down text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 pt-14">
      {/* Date header */}
      <div className="text-center mb-8">
        <div className="text-text-muted text-[13px] tracking-widest uppercase">
          {DAY_LABELS[dayOfWeek]}
        </div>
        <div className="text-text-primary text-[28px] font-bold mt-1">
          {dateStr}
        </div>
      </div>

      {isRestDay && !hasWorkout ? (
        <RestDayMessage />
      ) : hasWorkout ? (
        <>
          <WorkoutPreview exercises={currentWorkout.exercises} inProgress />
          <button
            onClick={handleResume}
            className="w-full rounded-xl py-4 px-8 text-lg font-semibold text-white bg-[#d97706] mb-4"
          >
            Resume Workout
          </button>
        </>
      ) : (
        <>
          {todayDay && (
            <WorkoutPreview exercises={todayDay.exercises} inProgress={false} />
          )}
          <button
            onClick={handleStart}
            disabled={starting || !todayDay}
            className="w-full rounded-xl py-4 px-8 text-lg font-semibold text-white bg-accent disabled:opacity-50 mb-4"
          >
            {starting ? 'Starting...' : 'Start Workout'}
          </button>
        </>
      )}
    </div>
  );
}
