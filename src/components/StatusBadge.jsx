import React from 'react';
import { STATUS_META } from '../utils/constants';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.on_track;
  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 5, 
      fontSize: 11.5, 
      fontWeight: 600, 
      padding: '3px 9px', 
      borderRadius: 6, 
      color: m.color, 
      background: m.bg 
    }}>
      {status === "on_track" && <CheckCircle2 size={13} />}
      {status === "at_risk" && <Clock size={13} />}
      {status === "delayed" && <AlertTriangle size={13} />}
      {m.label}
    </span>
  );
}
