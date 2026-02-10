import { useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';

export default function ExerciseHistoryPage() {
  const { id } = useParams();

  return (
    <div>
      <PageHeader title="Exercise History" back />
      <div className="px-5 mt-4">
        <p className="text-text-secondary text-sm">Exercise history coming in Phase 19</p>
        <p className="text-text-muted text-xs font-mono mt-2">Exercise: {id}</p>
      </div>
    </div>
  );
}
