import { useState, useEffect, useCallback } from 'react';
import { getActiveProgram, updateProgram } from '../../api/programs';
import { getExercises } from '../../api/exercises';
import { MUSCLE_GROUP_COLORS } from '../../utils/constants';
import { formatTime } from '../../utils/formatters';
import DayEditor from './DayEditor';
import ExerciseLibrary from './ExerciseLibrary';

export default function ProgramAdmin() {
  const [program, setProgram] = useState(null);
  const [original, setOriginal] = useState(null); // for dirty checking
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [modal, setModal] = useState(null); // { type, props }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prog, exList] = await Promise.all([getActiveProgram(), getExercises()]);
      setProgram(prog);
      setOriginal(JSON.stringify(prog));
      setExercises(exList);
    } catch (err) {
      setError(err.message || 'Failed to load program');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isDirty = program && JSON.stringify(program) !== original;

  // ── Day operations ──────────────────────────────────────

  function toggleRestDay(dayIdx) {
    setProgram((prev) => {
      const days = [...prev.days];
      const day = { ...days[dayIdx] };
      day.is_rest_day = !day.is_rest_day;
      if (day.is_rest_day) day.exercises = [];
      days[dayIdx] = day;
      return { ...prev, days };
    });
  }

  // ── Exercise operations ─────────────────────────────────

  function addExercise(dayIdx, exerciseId) {
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;

    setProgram((prev) => {
      const days = [...prev.days];
      const day = { ...days[dayIdx], exercises: [...days[dayIdx].exercises] };
      day.exercises.push({
        id: `new-${Date.now()}`,
        exercise_id: ex.id,
        exercise_name: ex.name,
        muscle_group: ex.muscle_group,
        sort_order: day.exercises.length + 1,
        target_sets: 4,
        rest_seconds: ex.default_rest_seconds,
        superset_with_next: false,
      });
      days[dayIdx] = day;
      return { ...prev, days };
    });
    setModal(null);
  }

  function removeExercise(dayIdx, exIdx) {
    setProgram((prev) => {
      const days = [...prev.days];
      const day = { ...days[dayIdx], exercises: [...days[dayIdx].exercises] };
      day.exercises.splice(exIdx, 1);
      // Recompute sort_order
      day.exercises = day.exercises.map((e, i) => ({ ...e, sort_order: i + 1 }));
      days[dayIdx] = day;
      return { ...prev, days };
    });
  }

  function moveExercise(dayIdx, exIdx, direction) {
    setProgram((prev) => {
      const days = [...prev.days];
      const day = { ...days[dayIdx], exercises: [...days[dayIdx].exercises] };
      const targetIdx = exIdx + direction;
      if (targetIdx < 0 || targetIdx >= day.exercises.length) return prev;
      // Swap
      [day.exercises[exIdx], day.exercises[targetIdx]] = [day.exercises[targetIdx], day.exercises[exIdx]];
      // Recompute sort_order
      day.exercises = day.exercises.map((e, i) => ({ ...e, sort_order: i + 1 }));
      days[dayIdx] = day;
      return { ...prev, days };
    });
  }

  function updateSlot(dayIdx, exIdx, fields) {
    setProgram((prev) => {
      const days = [...prev.days];
      const day = { ...days[dayIdx], exercises: [...days[dayIdx].exercises] };
      day.exercises[exIdx] = { ...day.exercises[exIdx], ...fields };
      days[dayIdx] = day;
      return { ...prev, days };
    });
    setModal(null);
  }

  // ── Save ────────────────────────────────────────────────

  async function handleSave() {
    if (!program || saving) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: program.name,
        days: program.days.map((d) => ({
          day_of_week: d.day_of_week,
          label: d.label,
          is_rest_day: d.is_rest_day,
          exercises: d.exercises.map((e) => ({
            exercise_id: e.exercise_id,
            sort_order: e.sort_order,
            target_sets: e.target_sets,
            rest_seconds: e.rest_seconds || null,
            superset_with_next: e.superset_with_next,
          })),
        })),
      };
      const updated = await updateProgram(program.id, body);
      setProgram(updated);
      setOriginal(JSON.stringify(updated));
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-5 pt-10">
        <h1 className="text-[22px] font-bold text-white">Program</h1>
        <p className="text-text-secondary text-sm mt-4">Loading...</p>
      </div>
    );
  }

  if (error && !program) {
    return (
      <div className="px-5 pt-10">
        <h1 className="text-[22px] font-bold text-white">Program</h1>
        <p className="text-red-400 text-sm mt-4">{error}</p>
      </div>
    );
  }

  if (!program) return null;

  return (
    <div className="px-5 pt-10 pb-6">
      {/* Header */}
      <h1 className="text-[22px] font-bold text-white mb-0.5">Program</h1>
      <p className="text-text-muted text-[13px] mb-4">{program.name}</p>

      {/* Exercise Library button */}
      <button
        onClick={() => setModal({ type: 'library' })}
        className="w-full text-center py-3 text-accent text-sm font-medium bg-transparent border border-accent rounded-xl mb-6 cursor-pointer"
      >
        Exercise Library
      </button>

      {/* Error banner */}
      {error && (
        <p className="text-red-400 text-xs mb-3">{error}</p>
      )}

      {/* Day editors */}
      {program.days.map((day, i) => (
        <DayEditor
          key={day.id || i}
          day={day}
          expanded={expandedDay === i}
          onToggle={() => setExpandedDay(expandedDay === i ? null : i)}
          onAddExercise={() => setModal({ type: 'picker', props: { dayIdx: i } })}
          onRemoveExercise={(exIdx) => removeExercise(i, exIdx)}
          onMoveExercise={(exIdx, dir) => moveExercise(i, exIdx, dir)}
          onEditSlot={(exIdx) => setModal({ type: 'slotConfig', props: { dayIdx: i, exIdx } })}
          onToggleRestDay={() => toggleRestDay(i)}
        />
      ))}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!isDirty || saving}
        className={`w-full rounded-xl py-4 text-lg font-semibold text-white mt-4 border-none cursor-pointer ${isDirty ? 'bg-accent' : 'bg-accent/30 cursor-default'}`}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>

      {/* Modals */}
      {modal?.type === 'library' && (
        <ExerciseLibrary
          onClose={() => setModal(null)}
          onExercisesChanged={async () => {
            const exList = await getExercises();
            setExercises(exList);
          }}
        />
      )}

      {modal?.type === 'picker' && (
        <ExercisePicker
          exercises={exercises}
          onSelect={(exerciseId) => addExercise(modal.props.dayIdx, exerciseId)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'slotConfig' && (
        <SlotConfigModal
          exercise={program.days[modal.props.dayIdx].exercises[modal.props.exIdx]}
          onSave={(fields) => updateSlot(modal.props.dayIdx, modal.props.exIdx, fields)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Exercise Picker Modal ─────────────────────────────────

function ExercisePicker({ exercises, onSelect, onClose }) {
  const MUSCLE_GROUPS = ['lats', 'pecs', 'biceps', 'triceps', 'delts', 'legs'];
  const grouped = {};
  for (const ex of exercises) {
    if (!grouped[ex.muscle_group]) grouped[ex.muscle_group] = [];
    grouped[ex.muscle_group].push(ex);
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-12 p-4 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-card border border-border-light rounded-2xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-primary text-lg font-semibold">Add Exercise</h3>
          <button onClick={onClose} className="text-text-muted text-lg bg-transparent border-none cursor-pointer">✕</button>
        </div>

        {MUSCLE_GROUPS.map((mg) => {
          const exList = grouped[mg];
          if (!exList || exList.length === 0) return null;
          const colors = MUSCLE_GROUP_COLORS[mg] || { bg: 'bg-gray-700', text: 'text-gray-300' };
          return (
            <div key={mg} className="mb-3">
              <span className={`${colors.bg} ${colors.text} px-1.5 py-0.5 rounded text-[10px] font-medium`}>
                {mg}
              </span>
              {exList.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => onSelect(ex.id)}
                  className="block w-full text-left text-text-primary text-sm py-2 px-2 bg-transparent border-none cursor-pointer hover:bg-[#1a1a30] rounded"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Slot Config Modal ─────────────────────────────────────

function SlotConfigModal({ exercise, onSave, onClose }) {
  const [targetSets, setTargetSets] = useState(exercise.target_sets || 4);
  const [restSeconds, setRestSeconds] = useState(exercise.rest_seconds || '');
  const [supersetWithNext, setSupersetWithNext] = useState(exercise.superset_with_next || false);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      target_sets: parseInt(targetSets, 10) || 4,
      rest_seconds: restSeconds ? parseInt(restSeconds, 10) : exercise.rest_seconds,
      superset_with_next: supersetWithNext,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-card border border-border-light rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-text-primary text-lg font-semibold mb-1">
          Configure {exercise.exercise_name}
        </h3>
        <p className="text-text-muted text-[13px] mb-4">Adjust sets, rest, and superset settings.</p>

        <form onSubmit={handleSubmit}>
          <label className="text-text-secondary text-xs block mb-1">Target Sets</label>
          <input
            type="number"
            inputMode="numeric"
            value={targetSets}
            onChange={(e) => setTargetSets(e.target.value)}
            className="w-full bg-[#1a1a30] border border-border-light rounded-lg px-3 py-2 text-white text-sm mb-3 focus:border-accent focus:outline-none"
            min="1"
          />

          <label className="text-text-secondary text-xs block mb-1">
            Rest Override (seconds)
            <span className="text-text-muted ml-1">
              — default: {formatTime(exercise.rest_seconds)}
            </span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={restSeconds}
            onChange={(e) => setRestSeconds(e.target.value)}
            placeholder="Use default"
            className="w-full bg-[#1a1a30] border border-border-light rounded-lg px-3 py-2 text-white text-sm mb-3 focus:border-accent focus:outline-none"
            min="0"
          />

          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={supersetWithNext}
              onChange={(e) => setSupersetWithNext(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-text-secondary text-sm">Superset with next exercise</span>
          </label>

          <button
            type="submit"
            className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-accent mb-2 cursor-pointer border-none"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-transparent text-text-secondary font-medium text-[13px] py-2 border-none cursor-pointer"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
