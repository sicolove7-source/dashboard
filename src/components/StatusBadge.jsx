import React from 'react';
import { STATUS_META } from '../utils/constants';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function StatusBadge({ status }) {
  const m = STATUS_META[status];
  return (
    <span className="status-badge" style={{ color: m.color, background: m.bg }}>
      {status === "on_track" && <CheckCircle2 size={14} />}
      {status === "at_risk" && <Clock size={14} />}
      {status === "delayed" && <AlertTriangle size={14} />}
      {m.label}
    </span>
  );
}
