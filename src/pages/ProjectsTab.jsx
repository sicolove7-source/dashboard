import React, { useState, useMemo } from 'react';
import { Search, Pencil, Trash2, Calendar, User, AlertTriangle, CheckCircle, Clock, MapPin, Home } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import StampRing from '../components/StampRing';

function daysLeft(dueDate) {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function DaysChip({ dueDate }) {
  const d = daysLeft(dueDate);
  if (d === null) return null;
  const overdue = d < 0;
  const urgent = d >= 0 && d <= 7;
  const color = overdue ? '#991B1B' : urgent ? '#9A3412' : '#475569';
  const bg = overdue ? '#FEE2E2' : urgent ? '#FFEDD5' : '#F1F5F9';
  const label = overdue
    ? `متأخر ${Math.abs(d)} يوم`
    : d === 0
    ? 'اليوم آخر موعد'
    : `${d} يوم متبقي`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color, background: bg, padding: '3px 8px', borderRadius: 6 }}>
      {label}
    </span>
  );
}

function ProgressBar({ value, status }) {
  const color = status === 'on_track' ? '#16A34A' : status === 'at_risk' ? '#D97706' : '#DC2626';
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>نسبة الإنجاز</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: value + '%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export default function ProjectsTab({ projects, onOpenDetail, onOpenEdit, onDelete, userRole }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due'); // 'due' | 'progress' | 'name'
  const [confirmId, setConfirmId] = useState(null);

  const filtered = useMemo(() => {
    let list = projects.filter(p => {
      const matchQ = (p.name + p.client + p.engineer + (p.area || '')).includes(query);
      const matchS = statusFilter === 'all' || p.status === statusFilter;
      return matchQ && matchS;
    });
    if (sortBy === 'due') list = [...list].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    if (sortBy === 'progress') list = [...list].sort((a, b) => b.progress - a.progress);
    if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [projects, query, statusFilter, sortBy]);

  // Summary stats
  const stats = useMemo(() => ({
    total: projects.length,
    delayed: projects.filter(p => p.status === 'delayed').length,
    atRisk: projects.filter(p => p.status === 'at_risk').length,
    dueThisWeek: projects.filter(p => { const d = daysLeft(p.dueDate); return d !== null && d >= 0 && d <= 7; }).length,
  }), [projects]);

  return (
    <div className="tab-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Summary Strip (Clean & Neutral) ───────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي المواقع', value: stats.total, icon: <Home size={15} /> },
          { label: 'متأخرة', value: stats.delayed, icon: <AlertTriangle size={15} />, highlight: stats.delayed > 0 ? '#DC2626' : null },
          { label: 'تحتاج متابعة', value: stats.atRisk, icon: <Clock size={15} />, highlight: stats.atRisk > 0 ? '#D97706' : null },
          { label: 'تُسلَّم هذا الأسبوع', value: stats.dueThisWeek, icon: <Calendar size={15} /> },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 140px', padding: '12px 16px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ color: s.highlight || 'var(--muted)', background: '#F1F5F9', width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: s.highlight || 'var(--ink)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Confirm Delete ───────────────────────────────────────── */}
      {confirmId && (
        <div className="confirm-bar">
          <span>هل أنت متأكد من حذف مشروع "{projects.find(p => p.id === confirmId)?.name}"؟ لا يمكن التراجع.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={() => { onDelete(confirmId); setConfirmId(null); }}>تأكيد الحذف</button>
            <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <div className="search-box">
          <Search size={16} color="var(--muted)" />
          <input placeholder="ابحث بالاسم، العميل، المهندس، أو المنطقة…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">كل الحالات</option>
          <option value="on_track">على المسار</option>
          <option value="at_risk">يحتاج متابعة</option>
          <option value="delayed">متأخر</option>
        </select>
        <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="due">ترتيب: الأقرب تسليماً</option>
          <option value="progress">ترتيب: نسبة الإنجاز</option>
          <option value="name">ترتيب: الاسم</option>
        </select>
      </div>

      {/* ── Cards Grid (Calm & Clean) ────────────────────────────── */}
      <div className="grid project-grid">
        {filtered.map(p => {
          const roomsCount = (p.rooms || []).length;
          const roomsDone = (p.rooms || []).filter(r => {
            let t = 0, done = 0;
            r.categories?.forEach(c => c.steps?.forEach(s => { t++; if (s.status === 'done') done++; }));
            return t > 0 && done === t;
          }).length;

          return (
            <div key={p.id} className="project-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
              onClick={() => onOpenDetail(p.id)}>

              {/* Actions */}
              {userRole === 'manager' && (
                <div className="card-actions" onClick={e => e.stopPropagation()}>
                  <span className="icon-btn" onClick={() => onOpenEdit(p)} title="تعديل"><Pencil size={14} /></span>
                  <span className="icon-btn" onClick={() => setConfirmId(p.id)} title="حذف" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></span>
                </div>
              )}

              {/* Top: Name & Client */}
              <div className="top" style={{ marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="name" style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                  <div className="client" style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={12} /> {p.client}
                  </div>
                  {p.area && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} /> {p.area} {p.type && `• ${p.type}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Clean Progress Bar */}
              <ProgressBar value={p.progress} status={p.status} />

              {/* Status Badge + Days chip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <StatusBadge status={p.status} />
                <DaysChip dueDate={p.dueDate} />
              </div>

              {/* Footer */}
              <div className="foot" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12 }}>
                  <User size={12} />
                  <span style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.engineer?.replace('م. ', '') || '—'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12, justifyContent: 'flex-end' }}>
                  <AlertTriangle size={12} />
                  <span>{(p.snags || []).filter(s => s.status !== 'done').length} ملاحظة مفتوحة</span>
                </div>
                {roomsCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12, gridColumn: '1/-1' }}>
                    <Home size={12} />
                    <span style={{ fontWeight: 600 }}>{roomsDone}/{roomsCount} أحياز مكتملة</span>
                    <div style={{ flex: 1, height: 4, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (roomsCount > 0 ? (roomsDone / roomsCount) * 100 : 0) + '%', background: '#1877F2', borderRadius: 99 }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          لا توجد مشاريع مطابقة لبحثك.
        </div>
      )}
    </div>
  );
}
