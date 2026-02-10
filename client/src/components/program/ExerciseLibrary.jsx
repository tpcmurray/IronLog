import { useState, useEffect } from 'react';
import { getExercises, createExercise, updateExercise } from '../../api/exercises';
import { MUSCLE_GROUP_COLORS } from '../../utils/constants';
import { formatTime } from '../../utils/formatters';

const MUSCLE_GROUPS = ['lats', 'pecs', 'biceps', 'triceps', 'delts', 'legs'];

export default function ExerciseLibrary({ onClose, onExercisesChanged }) {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list view, object = form view
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    setLoading(true);
    try {
      const data = await getExercises();
      setExercises(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(formData) {
    setSaving(true);
    setError(null);
    try {
      if (formData.id) {
        await updateExercise(formData.id, {
          name: formData.name,
          muscle_group: formData.muscle_group,
          default_rest_seconds: formData.default_rest_seconds,
          notes: formData.notes || null,
        });
      } else {
        await createExercise({
          name: formData.name,
          muscle_group: formData.muscle_group,
          default_rest_seconds: formData.default_rest_seconds,
          notes: formData.notes || null,
        });
      }
      await loadExercises();
      onExercisesChanged?.();
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Sort by muscle_group then name
  const sorted = [...exercises].sort((a, b) => {
    const mgA = MUSCLE_GROUPS.indexOf(a.muscle_group);
    const mgB = MUSCLE_GROUPS.indexOf(b.muscle_group);
    if (mgA !== mgB) return mgA - mgB;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-12 p-4 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-card border border-border-light rounded-2xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto">
        {editing ? (
          <ExerciseForm
            exercise={editing}
            saving={saving}
            error={error}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setError(null); }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-primary text-lg font-semibold">Exercise Library</h3>
              <button
                onClick={onClose}
                className="text-text-muted text-lg bg-transparent border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

            {loading ? (
              <p className="text-text-secondary text-sm">Loading...</p>
            ) : (
              <>
                {sorted.map((ex) => {
                  const colors = MUSCLE_GROUP_COLORS[ex.muscle_group] || { bg: 'bg-gray-700', text: 'text-gray-300' };
                  return (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="text-text-primary text-sm truncate">{ex.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`${colors.bg} ${colors.text} px-1.5 py-0.5 rounded text-[10px]`}>
                            {ex.muscle_group}
                          </span>
                          <span className="text-text-muted text-[10px]">
                            {formatTime(ex.default_rest_seconds)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditing(ex)}
                        className="text-accent text-xs bg-transparent border-none cursor-pointer shrink-0 ml-2"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={() => setEditing({ name: '', muscle_group: 'lats', default_rest_seconds: 120, notes: '' })}
                  className="w-full text-center py-3 text-accent text-sm font-medium bg-transparent border border-accent rounded-xl mt-4 cursor-pointer"
                >
                  + Create New Exercise
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ExerciseForm({ exercise, saving, error, onSave, onCancel }) {
  const [name, setName] = useState(exercise.name || '');
  const [muscleGroup, setMuscleGroup] = useState(exercise.muscle_group || 'lats');
  const [restSeconds, setRestSeconds] = useState(exercise.default_rest_seconds || 120);
  const [notes, setNotes] = useState(exercise.notes || '');

  const isNew = !exercise.id;

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: exercise.id,
      name: name.trim(),
      muscle_group: muscleGroup,
      default_rest_seconds: parseInt(restSeconds, 10) || 120,
      notes: notes.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-text-primary text-lg font-semibold mb-4">
        {isNew ? 'New Exercise' : 'Edit Exercise'}
      </h3>

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <label className="text-text-secondary text-xs block mb-1">Name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-[#1a1a30] border border-border-light rounded-lg px-3 py-2 text-white text-sm mb-3 focus:border-accent focus:outline-none"
        required
      />

      <label className="text-text-secondary text-xs block mb-1">Muscle Group</label>
      <select
        value={muscleGroup}
        onChange={(e) => setMuscleGroup(e.target.value)}
        className="w-full bg-[#1a1a30] border border-border-light rounded-lg px-3 py-2 text-white text-sm mb-3 focus:border-accent focus:outline-none"
      >
        {MUSCLE_GROUPS.map((mg) => (
          <option key={mg} value={mg}>{mg}</option>
        ))}
      </select>

      <label className="text-text-secondary text-xs block mb-1">Default Rest (seconds)</label>
      <input
        type="number"
        inputMode="numeric"
        value={restSeconds}
        onChange={(e) => setRestSeconds(e.target.value)}
        className="w-full bg-[#1a1a30] border border-border-light rounded-lg px-3 py-2 text-white text-sm mb-3 focus:border-accent focus:outline-none"
        min="0"
      />

      <label className="text-text-secondary text-xs block mb-1">Notes (optional)</label>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full bg-[#1a1a30] border border-border-light rounded-lg px-3 py-2 text-white text-sm mb-4 focus:border-accent focus:outline-none"
      />

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-accent mb-2 cursor-pointer disabled:opacity-50 border-none"
      >
        {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full bg-transparent text-text-secondary font-medium text-[13px] py-2 border-none cursor-pointer"
      >
        Cancel
      </button>
    </form>
  );
}
