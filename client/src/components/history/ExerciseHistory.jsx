import { useState, useEffect, useCallback } from 'react';
import { getExerciseHistory, getExerciseHistoryStats } from '../../api/exercises';
import { MUSCLE_GROUP_COLORS } from '../../utils/constants';
import { formatWeight, formatTime } from '../../utils/formatters';
import ProgressBadge from './ProgressBadge';
import HistoryChart from './HistoryChart';

const PAGE_SIZE = 10;

function formatSessionDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtNum(n) {
  return Number(n).toLocaleString('en-US');
}

export default function ExerciseHistory({ exerciseId }) {
  const [exercise, setExercise] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
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

  useEffect(() => {
    let cancelled = false;
    getExerciseHistoryStats(exerciseId)
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => { /* non-critical */ });
    return () => { cancelled = true; };
  }, [exerciseId]);

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
    <div className="px-5 mt-4 max-w-2xl mx-auto w-full">
      {/* Exercise header */}
      <h2 className="text-2xl font-bold text-white mb-1">{exercise.name}</h2>
      <div className="flex items-center gap-2 mb-4">
        <span className={`${colors.bg} ${colors.text} px-2 py-1 rounded text-xs font-medium`}>
          {exercise.muscle_group}
        </span>
        {restLabel && (
          <span className="text-text-muted text-sm">Rest: {restLabel}</span>
        )}
      </div>

      {/* Trend one-liner */}
      {stats?.trend && <TrendLine trend={stats.trend} />}

      {/* Rep records panel */}
      {stats?.current_prs?.length > 0 && <RepRecordsPanel records={stats.current_prs} />}

      {/* Progression chart */}
      {stats?.series?.length > 0 ? (
        <HistoryChart series={stats.series} />
      ) : (
        <div className="bg-bg-card-alt border border-dashed border-border rounded-xl p-6 text-center mb-5">
          <span className="text-text-muted text-sm">Not enough data to chart yet</span>
        </div>
      )}

      {/* Session list */}
      {sessions.length === 0 ? (
        <p className="text-text-muted text-sm text-center mt-8">No sessions yet</p>
      ) : (
        sessions.map((session, i) => (
          <SessionCard
            key={i}
            session={session}
            prescribedRest={exercise.default_rest_seconds}
            records={stats?.records}
          />
        ))
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full text-center py-3 text-accent-bright text-base font-medium bg-transparent border border-accent rounded-xl mt-2 mb-4 cursor-pointer disabled:opacity-50"
        >
          {loadingMore ? 'Loading...' : `Load more (${total - offset} remaining)`}
        </button>
      )}
    </div>
  );
}

function TrendLine({ trend }) {
  const { change_pct, window } = trend;
  const up = change_pct > 0;
  const down = change_pct < 0;
  const cls = up ? 'text-progress-up' : down ? 'text-progress-down' : 'text-text-muted';
  const arrow = up ? '↗' : down ? '↘' : '→';
  const sign = up ? '+' : '';
  return (
    <p className={`text-sm mb-4 ${cls}`}>
      Volume {sign}{change_pct}% over last {window} sessions {arrow}
    </p>
  );
}

function RepRecordsPanel({ records }) {
  return (
    <div className="bg-bg-card-alt border border-border rounded-xl p-4 mb-5">
      <div className="text-text-muted text-xs font-medium tracking-widest uppercase mb-2">
        Rep Records
      </div>
      <div className="grid gap-1.5">
        {records.map((r) => (
          <div key={r.weight} className="flex items-baseline justify-between font-mono text-base">
            <span className="text-text-primary">{formatWeight(r.weight)} lbs</span>
            <span className="text-progress-up font-semibold">{r.best_total_reps} reps</span>
            <span className="text-text-muted text-sm">{shortDate(r.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function isRestExtended(set, prescribedRest) {
  return set.rest_duration_seconds != null && prescribedRest != null
    && set.rest_duration_seconds > prescribedRest + 10;
}

function DeltaChip({ value, unit }) {
  if (value == null || value === 0) return null;
  const up = value > 0;
  const cls = up ? 'text-progress-up' : 'text-progress-down';
  const arrow = up ? '▲' : '▼';
  return (
    <span className={cls}>{arrow} {up ? '+' : ''}{fmtNum(value)} {unit}</span>
  );
}

function SessionCard({ session, prescribedRest, records }) {
  const extendedSets = session.sets.filter((s) => isRestExtended(s, prescribedRest));
  const m = session.metrics;

  const rec = records?.[session.main_weight];
  const isPR = rec && rec.session_exercise_id === session.session_exercise_id;

  return (
    <div className="bg-bg-card-alt border border-border rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-primary text-base font-semibold">
          {formatSessionDate(session.date)}
        </span>
        <ProgressBadge status={session.progression_status} />
      </div>

      {/* Derived metrics + deltas vs previous session */}
      {m && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm mb-3">
          <span className="text-text-secondary font-mono">{fmtNum(m.volume)} lbs vol</span>
          <span className="text-text-muted">&middot;</span>
          <span className="text-text-secondary font-mono">{m.total_reps} reps</span>
          <span className="text-text-muted">&middot;</span>
          <span className="text-text-secondary font-mono">{fmtNum(m.est_1rm)} est 1RM</span>
          <DeltaChip value={session.reps_delta} unit="reps" />
          <DeltaChip value={session.volume_delta} unit="vol" />
        </div>
      )}

      <div className="font-mono text-sm text-text-secondary">
        {session.sets.map((s) => {
          const extended = isRestExtended(s, prescribedRest);
          return (
            <div key={s.set_number} className="flex justify-between mb-1">
              <span>
                Set {s.set_number}: {formatWeight(s.weight_lbs)} lbs &times; {s.reps} reps @ RPE {s.rpe}
              </span>
              <span className={extended ? 'text-progress-same' : 'text-text-muted'}>
                {s.rest_duration_seconds != null
                  ? formatTime(s.rest_duration_seconds) + (extended ? ' ⚠' : '')
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rep record at this session's working weight */}
      {session.main_weight != null && (
        <div className="font-mono text-sm mt-2">
          <span className={isPR ? 'text-progress-up font-semibold' : 'text-text-secondary'}>
            {session.reps_at_main_weight} reps @ {formatWeight(session.main_weight)} lbs
          </span>
          {isPR ? (
            <span className="text-progress-up"> &#127942; PR</span>
          ) : rec ? (
            <span className="text-text-muted"> &middot; best {rec.best_total_reps}</span>
          ) : null}
        </div>
      )}

      {extendedSets.length > 0 && (
        <div className="text-xs text-warning-text mt-1.5">
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
