import React, { useState } from 'react';
import { CalendarRange, CalendarDays } from 'lucide-react';
import { fmtDate, todayISO } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';

export default function ScheduleTab({ projects, onSelect }) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'gantt'
  
  // Sort by due date
  const sortedProjects = [...projects].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return (
    <div className="grid tab-fade" style={{ gap: 24 }}>
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
            <span style={{ 
              display: "flex", alignItems: "center", justifyContent: "center", 
              width: 32, height: 32, borderRadius: 8, background: "rgba(245, 158, 11, 0.1)" 
            }}>
              <CalendarRange size={16} color="#F59E0B" />
            </span>
            الجدول الزمني للمشاريع
          </h3>
          
          <div style={{ display: "flex", gap: 4, background: "var(--bg)", padding: 4, borderRadius: 8, border: "1px solid var(--border)" }}>
            <button 
              className="btn btn-ghost" 
              style={{ padding: "6px 12px", background: viewMode === 'list' ? "var(--card)" : "transparent", boxShadow: viewMode === 'list' ? "var(--shadow-sm)" : "none", color: viewMode === 'list' ? "var(--ink)" : "var(--muted)" }}
              onClick={() => setViewMode('list')}
            >
              قائمة
            </button>
            <button 
              className="btn btn-ghost" 
              style={{ padding: "6px 12px", background: viewMode === 'gantt' ? "var(--card)" : "transparent", boxShadow: viewMode === 'gantt' ? "var(--shadow-sm)" : "none", color: viewMode === 'gantt' ? "var(--ink)" : "var(--muted)" }}
              onClick={() => setViewMode('gantt')}
            >
              مخطط جانت
            </button>
          </div>
        </div>
        
        {viewMode === 'list' ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المشروع</th>
                  <th>تاريخ البدء</th>
                  <th>تاريخ التسليم المستهدف</th>
                  <th>المدة المتبقية</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((p) => {
                  const today = new Date();
                  const dueDate = new Date(p.dueDate);
                  const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                  const isLate = daysLeft < 0;
                  
                  return (
                    <tr key={p.id} onClick={() => onSelect(p)} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="font-mono">{fmtDate(p.startDate)}</td>
                      <td className="font-mono">{fmtDate(p.dueDate)}</td>
                      <td>
                        {isLate ? (
                          <span style={{ color: "#EF4444", fontWeight: 600, fontSize: 13 }}>متأخر {Math.abs(daysLeft)} يوم</span>
                        ) : (
                          <span style={{ color: daysLeft < 15 ? "#F59E0B" : "var(--muted)", fontSize: 13 }}>باقي {daysLeft} يوم</span>
                        )}
                      </td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <GanttChart projects={sortedProjects} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}

function GanttChart({ projects, onSelect }) {
  // Find min start date and max end date
  let minDate = new Date();
  let maxDate = new Date();
  
  projects.forEach(p => {
    const start = new Date(p.startDate);
    const end = new Date(p.dueDate);
    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  });
  
  // Add some padding
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 14);
  
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  
  // Generate month markers
  const months = [];
  let current = new Date(minDate);
  while (current <= maxDate) {
    const monthKey = current.toLocaleString('ar-EG', { month: 'short', year: 'numeric' });
    if (!months.find(m => m.key === monthKey)) {
      months.push({
        key: monthKey,
        date: new Date(current),
        leftPct: ((current - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100
      });
    }
    current.setDate(current.getDate() + 15); // Step by 15 days for rough month markers
  }

  const today = new Date();
  const todayPct = Math.max(0, Math.min(100, ((today - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100));

  return (
    <div style={{ marginTop: 24, position: 'relative', paddingBottom: 20 }}>
      {/* Timeline Header */}
      <div style={{ position: 'relative', height: 30, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {months.map(m => (
          <div key={m.key} style={{ 
            position: 'absolute', left: `${m.leftPct}%`, top: 0, 
            fontSize: 11, color: 'var(--muted)', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <span>{m.key}</span>
            <div style={{ width: 1, height: 8, background: 'var(--border)', marginTop: 4 }}></div>
          </div>
        ))}
        {/* Today Indicator Header */}
        <div style={{ 
          position: 'absolute', left: `${todayPct}%`, top: 0, 
          fontSize: 10, color: '#EF4444', fontWeight: 'bold', transform: 'translateX(-50%)',
          background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: 4
        }}>
          اليوم
        </div>
      </div>
      
      {/* Today Line */}
      <div style={{ 
        position: 'absolute', left: `${todayPct}%`, top: 30, bottom: 0, 
        width: 2, background: 'rgba(239, 68, 68, 0.3)', zIndex: 1, borderLeft: '1px dashed #EF4444' 
      }}></div>

      {/* Gantt Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {projects.map(p => {
          const start = new Date(p.startDate);
          const end = new Date(p.dueDate);
          const leftPct = ((start - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
          const widthPct = ((end - start) / (1000 * 60 * 60 * 24)) / totalDays * 100;
          
          const isDone = p.progress >= 100;
          const isDelayed = p.status === 'delayed';
          
          let barColor = '#3B82F6'; // Default blue
          let bgBarColor = 'rgba(59, 130, 246, 0.1)';
          
          if (isDone) {
            barColor = '#10B981'; bgBarColor = 'rgba(16, 185, 129, 0.2)';
          } else if (isDelayed) {
            barColor = '#EF4444'; bgBarColor = 'rgba(239, 68, 68, 0.15)';
          } else if (p.status === 'at_risk') {
            barColor = '#F59E0B'; bgBarColor = 'rgba(245, 158, 11, 0.15)';
          }

          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => onSelect(p)}>
              <div style={{ width: 140, flexShrink: 0, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>
                {p.name}
              </div>
              <div style={{ flex: 1, position: 'relative', height: 28, background: 'var(--bg)', borderRadius: 6, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ 
                  position: 'absolute', left: `${Math.max(0, leftPct)}%`, width: `${Math.min(100 - leftPct, widthPct)}%`, 
                  height: '100%', background: bgBarColor, borderRadius: 6,
                  display: 'flex', alignItems: 'center', overflow: 'hidden'
                }}>
                  {/* Progress Fill */}
                  <div style={{ width: `${p.progress}%`, height: '100%', background: barColor, opacity: 0.8 }}></div>
                  
                  {/* Label inside bar */}
                  <span style={{ 
                    position: 'absolute', left: 8, fontSize: 11, color: p.progress > 20 ? '#fff' : 'var(--ink)', 
                    fontWeight: 600, textShadow: p.progress > 20 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                  }}>
                    {p.progress}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
