import { useParams } from 'react-router-dom';

export default function WorkoutPage() {
  const { id } = useParams();

  return (
    <div className="px-5 pt-10">
      <p className="text-text-secondary text-sm">Active workout view coming in Phase 14</p>
      <p className="text-text-muted text-xs font-mono mt-2">Session: {id}</p>
    </div>
  );
}
