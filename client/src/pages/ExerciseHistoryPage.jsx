import { useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import ExerciseHistory from '../components/history/ExerciseHistory';

export default function ExerciseHistoryPage() {
  const { id } = useParams();

  return (
    <div>
      <PageHeader back />
      <ExerciseHistory exerciseId={id} />
    </div>
  );
}
