const STATUS_MAP = {
  open:      { label: 'Open',      cls: 'bg-schmekel-900 text-schmekel-400 border border-schmekel-700' },
  closed:    { label: 'Closed',    cls: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50' },
  resolved:  { label: 'Resolved', cls: 'bg-blue-900/50 text-blue-400 border border-blue-700/50' },
  cancelled: { label: 'Cancelled',cls: 'bg-dark-700 text-dark-400 border border-dark-600' },
  disputed:  { label: 'Disputed', cls: 'bg-red-900/50 text-red-400 border border-red-700/50' },
}

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.open
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}
