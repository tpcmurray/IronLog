export default function SupersetBanner({ prevExerciseName }) {
  return (
    <div className="bg-superset-bg border border-superset-border rounded-lg px-3 py-2.5 mb-3">
      <span className="text-superset-text text-sm font-semibold">
        &#9889; SUPERSET &mdash; No rest, go immediately
      </span>
      {prevExerciseName && (
        <span className="text-superset-text text-sm ml-1">
          (after {prevExerciseName})
        </span>
      )}
    </div>
  );
}
