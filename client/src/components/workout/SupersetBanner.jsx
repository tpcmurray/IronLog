export default function SupersetBanner({ prevExerciseName }) {
  return (
    <div className="bg-[#2e1065] border border-[#7c3aed] rounded-lg px-3 py-2 mb-3">
      <span className="text-[#a78bfa] text-xs font-semibold">
        &#9889; SUPERSET &mdash; No rest, go immediately
      </span>
      {prevExerciseName && (
        <span className="text-[#a78bfa] text-xs ml-1">
          (after {prevExerciseName})
        </span>
      )}
    </div>
  );
}
