import { MUSCLE_GROUP_COLORS } from '../../utils/constants';

export default function MuscleGroupBadge({ group }) {
  const colors = MUSCLE_GROUP_COLORS[group] || { bg: 'bg-border', text: 'text-text-secondary' };
  return (
    <span className={`${colors.bg} ${colors.text} px-2 py-1 rounded text-xs font-medium`}>
      {group}
    </span>
  );
}
