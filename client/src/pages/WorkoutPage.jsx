import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentWorkout } from '../api/workouts';
import useWorkout from '../hooks/useWorkout';
import ExerciseView from '../components/workout/ExerciseView';

export default function WorkoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCurrentWorkout();
        if (!data || data.id !== id) {
          navigate('/', { replace: true });
          return;
        }
        setWorkout(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="p-6 pt-14 text-center">
        <p className="text-text-muted text-sm">Loading workout...</p>
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

  if (!workout) return null;

  return <WorkoutContent workout={workout} />;
}

function WorkoutContent({ workout }) {
  const {
    currentExercise,
    currentIndex,
    totalExercises,
    nextSetNumber,
    prefill,
    logSet,
  } = useWorkout(workout);

  if (!currentExercise) {
    return (
      <div className="p-6 pt-14 text-center">
        <p className="text-text-muted text-sm">No exercises found.</p>
      </div>
    );
  }

  return (
    <ExerciseView
      exercise={currentExercise}
      exerciseIndex={currentIndex}
      totalExercises={totalExercises}
      nextSetNumber={nextSetNumber}
      prefill={prefill}
      onLogSet={logSet}
    />
  );
}
