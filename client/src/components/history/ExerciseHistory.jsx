import { useState, useEffect, useCallback } from 'react';
import { getExerciseHistory } from '../../api/exercises';
import { MUSCLE_GROUP_COLORS } from '../../utils/constants';
import { formatWeight, formatTime } from '../../utils/formatters';
import ProgressBadge from './ProgressBadge';

const PAGE_SIZE = 10;

function formatSessionDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ExerciseHistory({ exerciseId }) {
  const [exercise, setExercise] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(async (pageOffset, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getExerciseHistory(exerciseId, { limit: PAGE_SIZE, offset: pageOffset });
      setExercise(data.exercise);
      setTotal(data.total);
      setSessions((prev) => append ? [...prev, ...data.sessions] : data.sessions);
      setOffset(pageOffset + data.sessions.length);
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  const loadMore = () => fetchPage(offset, true);
  const hasMore = offset < total;

  if (loading) {
    return <p className="text-text-secondary text-sm px-5 mt-4">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-400 text-sm px-5 mt-4">{error}</p>;
  }

  if (!exercise) return null;

  const colors = MUSCLE_GROUP_COLORS[exercise.muscle_group] || { bg: 'bg-gray-700', text: 'text-gray-300' };
  const restLabel = exercise.default_rest_seconds
    ? formatTime(exercise.default_rest_seconds)
    : null;

  return (
    <div className="px-5 mt-4">
      {/* Exercise header */}
      <h2 className="text-[22px] font-bold text-white mb-1">{exercise.name}</h2>
      <div className="flex items-center gap-2 mb-6">
        <span className={`${colors.bg} ${colors.text} px-2 py-1 rounded text-xs font-medium`}>
          {exercise.muscle_group}
        </span>
        {restLabel && (
          <span className="text-text-muted text-xs">Rest: {restLabel}</span>
        )}
      </div>

      {/* v2 chart placeholder */}
      <div className="bg-[#1a1a30] border border-dashed border-border rounded-xl p-6 text-center mb-4">
        <span className="text-text-muted text-xs">Progression chart (v2)</span>
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <p className="text-text-muted text-sm text-center mt-8">No sessions yet</p>
      ) : (
        sessions.map((session, i) => (
          <SessionCard key={i} session={session} prescribedRest={exercise.default_rest_seconds} />
        ))
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full text-center py-3 text-accent text-sm font-medium bg-transparent border border-accent rounded-xl mt-2 mb-4 cursor-pointer disabled:opacity-50"
        >
          {loadingMore ? 'Loading...' : `Load more (${total - offset} remaining)`}
        </button>
      )}
    </div>
  );
}

function SessionCard({ session, prescribedRest }) {
  const extendedSets = session.sets.filter((s) => s.rest_was_extended);

  return (
    <div className="bg-[#1a1a30] rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-primary text-sm font-semibold">
          {formatSessionDate(session.date)}
        </span>
        <ProgressBadge status={session.progression_status} />
      </div>

      <div className="font-mono text-xs text-text-secondary">
        {session.sets.map((s) => (
          <div key={s.set_number} className="flex justify-between mb-1">
            <span>
              Set {s.set_number}: {formatWeight(s.weight_lbs)} lbs &times; {s.reps} reps @ RPE {s.rpe}
            </span>
            <span className={s.rest_was_extended ? 'text-progress-same' : 'text-text-muted'}>
              {s.rest_duration_seconds != null
                ? formatTime(s.rest_duration_seconds) + (s.rest_was_extended ? ' ⚠' : '')
                : '—'}
            </span>
          </div>
        ))}
      </div>

      {extendedSets.length > 0 && (
        <div className="text-[11px] mt-1.5" style={{ color: '#92400e' }}>
          {extendedSets.map((s) => (
            <div key={s.set_number}>
              ⚠ Set {s.set_number} had extended rest ({formatTime(s.rest_duration_seconds)} vs {formatTime(prescribedRest)} prescribed)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
