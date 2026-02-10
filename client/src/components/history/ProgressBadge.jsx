const CONFIG = {
  progressed:  { text: '↑ progressed', className: 'text-progress-up' },
  first_time:  { text: '↑ first time', className: 'text-progress-up' },
  same:        { text: '— same',       className: 'text-progress-same' },
  regressed:   { text: '↓ regressed',  className: 'text-progress-down' },
  skipped:     { text: 'skipped',       className: 'text-text-muted' },
};

export default function ProgressBadge({ status }) {
  const cfg = CONFIG[status];
  if (!cfg) return null;

  return <span className={`text-xs ${cfg.className}`}>{cfg.text}</span>;
}
