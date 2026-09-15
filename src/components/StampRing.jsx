import React from 'react';

export default function StampRing({ value, size = 56 }) {
  const val = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (val / 100) * c;
  const color = val >= 70 ? "#10B981" : val >= 40 ? "#F59E0B" : "#EF4444";
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} 
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="font-mono" fontSize="13" fill="currentColor" fontWeight="700">
        {value}%
      </text>
    </svg>
  );
}
