import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkoutHistory } from '../../api/workouts';
import { MUSCLE_GROUP_COLORS } from '../../utils/constants';
import { formatWeight } from '../../utils/formatters';

const MUSCLE_GROUP_ORDER = ['lats', 'pecs', 'biceps', 'triceps', 'delts', 'legs'];
const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekHeader(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

function shiftWeek(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function isCurrentOrFutureWeek(weekEnd) {
  if (!weekEnd) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(weekEnd + 'T00:00:00');
  return end >= today;
}

function compactSet(s) {
  return `${formatWeight(s.weight_lbs)}×${s.reps} R${s.rpe}`;
}

/**
 * Build a lookup: grid[muscleGroup][dayOfWeek] = [{ exerciseName, exerciseId, status, sets }]
 */
function buildGrid(workouts) {
  const grid = {};
  const muscleGroupsFound = new Set();

  for (const w of workouts) {
    for (const ex of w.exercises) {
      const mg = ex.muscle_group;
      muscleGroupsFound.add(mg);
      if (!grid[mg]) grid[mg] = {};
      if (!grid[mg][w.day_of_week]) grid[mg][w.day_of_week] = [];
      grid[mg][w.day_of_week].push({
        exerciseName: ex.exercise_name,
        exerciseId: ex.exercise_id,
        status: ex.status,
        sets: ex.sets,
      });
    }
  }

  // Return ordered muscle groups (only those that appear in data)
  const orderedGroups = MUSCLE_GROUP_ORDER.filter((mg) => muscleGroupsFound.has(mg));
  return { grid, orderedGroups };
}

/**
 * Compute the dates for each day column (Sun=0 through Sat=6) from week_start.
 */
function getDayDates(weekStart) {
  const dates = [];
  const base = new Date(weekStart + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push(formatDateShort(d.toISOString()));
  }
  return dates;
}

export default function WeeklyGrid() {
  const navigate = useNavigate();
  const [weekDate, setWeekDate] = useState(toDateStr(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getWorkoutHistory({ date });
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(weekDate);
  }, [weekDate, fetchData]);

  const goPrev = () => {
    if (data?.week_start) {
      setWeekDate(shiftWeek(data.week_start, -7));
    }
  };

  const goNext = () => {
    if (data?.week_start) {
      setWeekDate(shiftWeek(data.week_start, 7));
    }
  };

  const atCurrentWeek = data ? isCurrentOrFutureWeek(data.week_end) : true;

  if (loading && !data) {
    return (
      <div className="px-5 pt-10">
        <h1 className="text-[22px] font-bold text-white mb-4">History</h1>
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="px-5 pt-10">
        <h1 className="text-[22px] font-bold text-white mb-4">History</h1>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  const { grid, orderedGroups } = buildGrid(data?.workouts || []);
  const dayDates = data ? getDayDates(data.week_start) : [];
  const hasWorkouts = data?.workouts?.length > 0;

  return (
    <div className="px-4 pt-10">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goPrev}
          className="text-accent text-2xl bg-transparent border-none cursor-pointer p-2"
          disabled={loading}
        >
          &larr;
        </button>
        <div className="text-center">
          <h1 className="text-base font-semibold text-text-primary">
            Week of {formatWeekHeader(data?.week_start)}
          </h1>
        </div>
        <button
          onClick={goNext}
          className={`text-2xl bg-transparent border-none p-2 ${atCurrentWeek ? 'text-text-muted cursor-default' : 'text-accent cursor-pointer'}`}
          disabled={atCurrentWeek || loading}
        >
          &rarr;
        </button>
      </div>

      {!hasWorkouts ? (
        <div className="text-center mt-16">
          <p className="text-text-muted text-sm">No workouts this week</p>
        </div>
      ) : (
        <>
          <div className="text-text-muted text-[11px] text-center mb-3">
            &larr; swipe to see all days &rarr;
          </div>

          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="font-mono text-[11px]" style={{ minWidth: 700, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="text-left p-2 border-b border-border" style={{ width: 70 }} />
                  {DAY_LABELS.map((label, i) => (
                    <th key={i} className="p-2 border-b border-border text-accent font-semibold" style={{ minWidth: 100 }}>
                      <div>{label}</div>
                      <div className="font-normal text-text-muted text-[10px]">{dayDates[i]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderedGroups.map((mg) => (
                  <tr key={mg}>
                    <td className="p-2 border-b border-[#1a1a30] align-top">
                      <MuscleGroupBadge group={mg} />
                    </td>
                    {DAY_LABELS.map((_, dayIdx) => (
                      <td key={dayIdx} className="p-2 border-b border-[#1a1a30] align-top text-text-secondary">
                        <CellContent
                          exercises={grid[mg]?.[dayIdx]}
                          onTapExercise={(id) => navigate(`/history/exercise/${id}`)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function MuscleGroupBadge({ group }) {
  const colors = MUSCLE_GROUP_COLORS[group] || { bg: 'bg-gray-700', text: 'text-gray-300' };
  return (
    <span className={`${colors.bg} ${colors.text} px-1.5 py-0.5 rounded text-xs`}>
      {group}
    </span>
  );
}

function CellContent({ exercises, onTapExercise }) {
  if (!exercises || exercises.length === 0) {
    return <span className="text-text-muted">&mdash;</span>;
  }

  return exercises.map((ex, i) => (
    <div key={i} className={ex.status === 'skipped' ? 'opacity-35 line-through' : ''}>
      <div
        className="font-semibold text-[#c0c0d8] mb-0.5 cursor-pointer"
        onClick={() => onTapExercise(ex.exerciseId)}
      >
        {ex.exerciseName}
      </div>
      {ex.sets.map((s, j) => (
        <div key={j}>{compactSet(s)}</div>
      ))}
      {ex.status === 'skipped' && (
        <div className="text-text-muted text-[10px] italic">skipped</div>
      )}
    </div>
  ));
}
