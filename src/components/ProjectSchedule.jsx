import React, { useState, useMemo } from 'react';
import {
  Calendar, Clock, CheckCircle2, Plus, Trash2, AlertTriangle,
  ChevronDown, ChevronRight, Square, CheckSquare, Pencil, Check, X,
  BarChart3, List, Users, Truck, Phone, Package, DollarSign,
  Layers, TrendingUp, FileText, ShieldCheck, Award, Image, Upload
} from 'lucide-react';
import { STAGES, PROJECT_PHASES, QUALITY_GATES } from '../utils/constants';
import { fmtDate, todayISO, getGlobalCurrency } from '../utils/helpers';
import InteractiveGantt from './InteractiveGantt';
import { syncWorkersToCloud } from '../services/cloudSync';
import { getActiveTenantId } from '../services/tenantsManager';

/* ── Storage helpers ──────────────────────────────── */
function getWorkers() {
  try { return JSON.parse(localStorage.getItem('db-workers-v1') || '[]'); } catch { return []; }
}
function getSuppliers() {
  try { return JSON.parse(localStorage.getItem('db-suppliers-v1') || '[]'); } catch { return []; }
}
function saveWorkers(arr, companyId) {
  try { localStorage.setItem('db-workers-v1', JSON.stringify(arr)); } catch {}
  const cId = companyId || getActiveTenantId() || 'comp_alain';
  syncWorkersToCloud(cId, arr);
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const STATUS_CFG = {
  pending:     { label: 'لم يبدأ',      color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', dot: '#94A3B8' },
  in_progress: { label: 'جاري التنفيذ', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  dot: '#F59E0B' },
  done:        { label: 'مكتمل',        color: '#10B981', bg: 'rgba(16,185,129,0.12)',   dot: '#10B981' },
  delayed:     { label: 'متأخر',        color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    dot: '#EF4444' },
};

function resolveStatus(task) {
  if (task.status === 'done') return 'done';
  if (task.endDate) {
    const today = new Date(); today.setHours(0,0,0,0);
    const end = new Date(task.endDate); end.setHours(0,0,0,0);
    if (end < today && task.status !== 'done') return 'delayed';
  }
  return task.status || 'pending';
}

function daysLeft(endDate) {
  if (!endDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(endDate); end.setHours(0,0,0,0);
  return Math.round((end - today) / 86400000);
}

function initTasks(project) {
  let rawTasks = project.tasks || [];
  if (rawTasks.length === 0) {
    return STAGES.map(s => ({ key: s.key, label: s.label, weight: s.weight, status: 'pending', startDate: '', endDate: '', steps: [] }));
  }
  const normalized = rawTasks.map((t, i) => ({
    ...t,
    key:       t.key       || t.id    || t.stage || ('task-auto-' + i),
    label:     t.label     || t.title || '',
    startDate: t.startDate || t.start || '',
    endDate:   t.endDate   || t.end   || '',
    weight:    t.weight    != null ? Number(t.weight) : 10,
    status:    t.status    || 'pending',
    steps:     t.steps     || [],
  }));
  const seen = new Set();
  return normalized.filter(t => { if (seen.has(t.key)) return false; seen.add(t.key); return true; });
}

function fmt(n) {
  if (!n) return '0';
  return Number(n).toLocaleString('ar-EG');
}

/* ════════════════════════════════════════════════════════════
   PHASES PANEL — البطاقات الأربع مع الـ Checkboxes
════════════════════════════════════════════════════════════ */
function PhasesPanel({ project, onUpdate }) {
  const phases = useMemo(() => {
    const saved = project.phasesData || {};
    return PROJECT_PHASES.map(ph => ({
      ...ph,
      startDate: saved[ph.id]?.startDate || '',
      endDate:   saved[ph.id]?.endDate   || '',
      phaseStatus: saved[ph.id]?.phaseStatus || 'pending',
      items: ph.items.map(item => ({
        ...item,
        done: saved[ph.id]?.items?.[item.id]?.done || false,
      })),
    }));
  }, [project.phasesData]);

  const [expanded, setExpanded] = useState({ phase1: true, phase2: false, phase3: false, phase4: false });

  function toggleItem(phaseId, itemId) {
    const saved = project.phasesData || {};
    const phData = saved[phaseId] || {};
    const items = phData.items || {};
    const newItems = { ...items, [itemId]: { done: !items[itemId]?.done } };
    onUpdate({ phasesData: { ...saved, [phaseId]: { ...phData, items: newItems } } });
  }

  function setPhaseField(phaseId, field, value) {
    const saved = project.phasesData || {};
    const phData = saved[phaseId] || {};
    onUpdate({ phasesData: { ...saved, [phaseId]: { ...phData, [field]: value } } });
  }

  const totalPhases = phases.length;
  const totalItems  = phases.reduce((a, p) => a + p.items.length, 0);
  const doneItems   = phases.reduce((a, p) => a + p.items.filter(i => i.done).length, 0);
  const overallPct  = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);

  const PHASE_STATUS_OPTS = [
    { v: 'pending',     l: 'لم تبدأ',      c: '#94A3B8' },
    { v: 'in_progress', l: 'جارية',         c: '#F59E0B' },
    { v: 'done',        l: 'مكتملة',        c: '#10B981' },
    { v: 'delayed',     l: 'متأخرة',        c: '#EF4444' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Summary bar */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>التقدم الكلي للمشروع</div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${overallPct}%`, background: '#2563EB', borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{overallPct}%</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{doneItems}/{totalItems} بند</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {phases.map(ph => {
            const done = ph.items.filter(i => i.done).length;
            const pct  = ph.items.length === 0 ? 0 : Math.round((done / ph.items.length) * 100);
            return (
              <div key={ph.id} style={{ textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: ph.colorBg, border: `2px solid ${ph.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: ph.color }}>
                  {pct}%
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{ph.name.replace('المرحلة ', 'م')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase cards */}
      {phases.map((ph, pi) => {
        const doneCount = ph.items.filter(i => i.done).length;
        const pct = ph.items.length === 0 ? 0 : Math.round((doneCount / ph.items.length) * 100);
        const isOpen = expanded[ph.id];
        const statusOpt = PHASE_STATUS_OPTS.find(s => s.v === ph.phaseStatus) || PHASE_STATUS_OPTS[0];

        return (
          <div key={ph.id} style={{ background: 'var(--card)', border: `1.5px solid ${isOpen ? ph.color : 'var(--border)'}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s' }}>
            {/* Card header */}
            <div
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', background: isOpen ? ph.colorBg : 'transparent', transition: 'background 0.2s' }}
              onClick={() => setExpanded(e => ({ ...e, [ph.id]: !e[ph.id] }))}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: ph.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
                {pi + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{ph.name}</span>
                  <span style={{ fontSize: 13, color: ph.color, fontWeight: 600 }}>— {ph.subtitle}</span>
                  <span style={{ marginRight: 'auto', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${statusOpt.c}20`, color: statusOpt.c }}>
                    {statusOpt.l}
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: ph.color, borderRadius: 99, transition: 'width 0.4s' }} />
                </div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: ph.color }}>{pct}%</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{doneCount}/{ph.items.length}</div>
              </div>
              <div style={{ color: ph.color, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>
                <ChevronRight size={20} />
              </div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding: '0 20px 20px' }}>

                {/* Date + Status row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, marginTop: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>تاريخ البداية</label>
                    <input
                      type="date"
                      value={ph.startDate}
                      onChange={e => setPhaseField(ph.id, 'startDate', e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13 }}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={ph.endDate}
                      onChange={e => setPhaseField(ph.id, 'endDate', e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13 }}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>حالة المرحلة</label>
                    <select
                      value={ph.phaseStatus}
                      onChange={e => setPhaseField(ph.id, 'phaseStatus', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13 }}
                    >
                      {PHASE_STATUS_OPTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </div>
                  <div style={{ alignSelf: 'flex-end', padding: '6px 14px', borderRadius: 8, background: ph.colorBg, color: ph.color, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} />
                    {ph.durationDays} يوم مقدر
                  </div>
                </div>

                {/* Items checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ph.items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(ph.id, item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                        background: item.done ? `${ph.color}10` : 'var(--bg)',
                        border: `1px solid ${item.done ? ph.color + '40' : 'var(--border)'}`,
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ color: item.done ? ph.color : '#94A3B8', flexShrink: 0 }}>
                        {item.done ? <CheckSquare size={20} /> : <Square size={20} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: item.done ? 400 : 600, color: item.done ? 'var(--muted)' : 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none' }}>
                          {item.label}
                        </div>
                        {item.note && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.note}</div>
                        )}
                      </div>
                      {item.done && (
                        <div style={{ flexShrink: 0 }}>
                          <CheckCircle2 size={16} color={ph.color} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   GANTT CHART PANEL — الجدول الزمني التفاعلي المتقدم
════════════════════════════════════════════════════════════ */
function GanttPanel({ project, onUpdate }) {
  return <InteractiveGantt project={project} onUpdate={onUpdate} />;
}

/* ════════════════════════════════════════════════════════════
   PRICING PANEL — جدول التسعير
════════════════════════════════════════════════════════════ */
function PricingPanel({ project, onUpdate }) {
  const pricing = project.pricingData || {};

  function setItemField(phaseId, itemId, field, value) {
    const ph = pricing[phaseId] || {};
    const item = ph[itemId] || {};
    onUpdate({
      pricingData: {
        ...pricing,
        [phaseId]: { ...ph, [itemId]: { ...item, [field]: value } },
      },
    });
  }

  function getField(phaseId, itemId, field) {
    return pricing[phaseId]?.[itemId]?.[field] || '';
  }

  // Compute totals
  const phaseTotals = PROJECT_PHASES.map(ph => {
    let labor = 0, materials = 0;
    ph.items.forEach(item => {
      labor     += Number(getField(ph.id, item.id, 'labor'))    || 0;
      materials += Number(getField(ph.id, item.id, 'materials'))|| 0;
    });
    return { ...ph, labor, materials, total: labor + materials };
  });
  const grandTotal = phaseTotals.reduce((a, p) => a + p.total, 0);
  const grandLabor = phaseTotals.reduce((a, p) => a + p.labor, 0);
  const grandMaterials = phaseTotals.reduce((a, p) => a + p.materials, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Grand total summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { label: 'إجمالي العمالة', value: grandLabor, color: '#6366F1', icon: Users },
          { label: 'إجمالي المواد', value: grandMaterials, color: '#F59E0B', icon: Package },
          { label: 'الإجمالي الكلي', value: grandTotal, color: '#10B981', icon: TrendingUp, big: true },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--card)', border: `1.5px solid ${card.color}30`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <card.icon size={20} color={card.color} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: card.big ? 22 : 18, fontWeight: 800, color: card.color }}>{fmt(card.value)} <span style={{ fontSize: 12, fontWeight: 400 }}>ج.م</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-phase pricing tables */}
      {PROJECT_PHASES.map((ph, pi) => {
        const pt = phaseTotals[pi];
        return (
          <div key={ph.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            {/* Phase header */}
            <div style={{ padding: '14px 20px', background: ph.colorBg, display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${ph.color}30` }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: ph.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
                {pi + 1}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{ph.name}</span>
                <span style={{ fontSize: 13, color: ph.color, marginRight: 8 }}>{ph.subtitle}</span>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>عمالة: <strong style={{ color: '#6366F1' }}>{fmt(pt.labor)}</strong></span>
                <span style={{ color: 'var(--muted)' }}>مواد: <strong style={{ color: '#F59E0B' }}>{fmt(pt.materials)}</strong></span>
                <span style={{ color: 'var(--muted)' }}>الإجمالي: <strong style={{ color: ph.color, fontSize: 15 }}>{fmt(pt.total)} {getGlobalCurrency()}</strong></span>
              </div>
            </div>

            {/* Items table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '40%' }}>البند</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>تكلفة العمالة ({getGlobalCurrency()})</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>تكلفة المواد ({getGlobalCurrency()})</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>الإجمالي</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {ph.items.map((item, idx) => {
                    const labor     = Number(getField(ph.id, item.id, 'labor'))    || 0;
                    const materials = Number(getField(ph.id, item.id, 'materials'))|| 0;
                    const note      = getField(ph.id, item.id, 'note');
                    const rowTotal  = labor + materials;
                    return (
                      <tr key={item.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--ink)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                          {item.label}
                          {item.note && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{item.note}</div>}
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                          <input
                            type="number"
                            min="0"
                            value={getField(ph.id, item.id, 'labor')}
                            onChange={e => setItemField(ph.id, item.id, 'labor', e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', textAlign: 'center', fontSize: 13 }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                          <input
                            type="number"
                            min="0"
                            value={getField(ph.id, item.id, 'materials')}
                            onChange={e => setItemField(ph.id, item.id, 'materials', e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', textAlign: 'center', fontSize: 13 }}
                          />
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: 700, color: rowTotal > 0 ? ph.color : 'var(--muted)' }}>
                          {fmt(rowTotal)}
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                          <input
                            type="text"
                            value={note}
                            onChange={e => setItemField(ph.id, item.id, 'note', e.target.value)}
                            placeholder="ملاحظة..."
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 12 }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Phase footer */}
                <tfoot>
                  <tr style={{ background: ph.colorBg }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ink)' }}>إجمالي {ph.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#6366F1' }}>{fmt(pt.labor)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#F59E0B' }}>{fmt(pt.materials)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: ph.color, fontSize: 15 }}>{fmt(pt.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}

      {/* Grand total footer */}
      <div style={{ background: '#0F172A', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 32, color: '#fff', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>الإجمالي الكلي للمشروع</div>
        <div style={{ display: 'flex', gap: 32, marginRight: 'auto', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>إجمالي العمالة</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#A5B4FC' }}>{fmt(grandLabor)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>إجمالي المواد</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FCD34D' }}>{fmt(grandMaterials)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>الإجمالي الكلي</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#6EE7B7' }}>{fmt(grandTotal)} <span style={{ fontSize: 14, fontWeight: 400 }}>ج.م</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ORIGINAL TASK SCHEDULE PANEL (الجداول القديمة)
════════════════════════════════════════════════════════════ */
function StepRow({ step, taskKey, onToggle, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: step.done ? 'rgba(16,185,129,0.06)' : 'var(--card)', border: '1px solid var(--border)', transition: 'all 0.2s' }}>
      <button type="button" onClick={() => onToggle(taskKey, step.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: step.done ? '#10B981' : '#94A3B8' }}>
        {step.done ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>
      <span style={{ flex: 1, fontSize: 14, fontWeight: step.done ? 400 : 600, color: step.done ? 'var(--muted)' : 'var(--ink)', textDecoration: step.done ? 'line-through' : 'none' }}>{step.label}</span>
      <button type="button" className="icon-btn" style={{ color: 'var(--danger)', padding: 4, opacity: 0.6 }} onClick={() => onDelete(taskKey, step.id)}><X size={13} /></button>
    </div>
  );
}

function TaskCard({ task, onUpdate, onDelete, suppliers }) {
  const [open, setOpen]       = useState(false);
  const [newStep, setNewStep] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({});
  const [suppSearch, setSuppSearch] = useState('');

  const status  = resolveStatus(task);
  const cfg     = STATUS_CFG[status];
  const dl      = daysLeft(task.endDate);
  const steps   = task.steps || [];
  const doneSteps = steps.filter(s => s.done).length;
  const pct     = steps.length ? Math.round((doneSteps / steps.length) * 100) : 0;

  function addStep() {
    if (!newStep.trim()) return;
    const updated = { ...task, steps: [...steps, { id: 's' + Date.now(), label: newStep.trim(), done: false }] };
    onUpdate(updated);
    setNewStep('');
  }

  function toggleStep(taskKey, stepId) {
    const updated = { ...task, steps: steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s) };
    onUpdate(updated);
  }

  function deleteStep(taskKey, stepId) {
    onUpdate({ ...task, steps: steps.filter(s => s.id !== stepId) });
  }

  function saveEdit() {
    onUpdate({ ...task, ...draft });
    setEditing(false);
  }

  const filteredSuppliers = suppSearch.trim()
    ? suppliers.filter(s => s.name?.includes(suppSearch) || s.trade?.includes(suppSearch))
    : suppliers.slice(0, 5);

  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${open ? cfg.color + '60' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>{task.label}</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
            {task.startDate && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(task.startDate)} → {fmtDate(task.endDate)}</span>}
            {dl !== null && status !== 'done' && (
              <span style={{ fontSize: 12, color: dl < 0 ? '#EF4444' : dl < 3 ? '#F59E0B' : 'var(--muted)' }}>
                {dl < 0 ? `تأخر ${Math.abs(dl)} يوم` : dl === 0 ? 'اليوم' : `${dl} يوم متبقي`}
              </span>
            )}
            {steps.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{doneSteps}/{steps.length} خطوة ({pct}%)</span>
            )}
          </div>
          {steps.length > 0 && (
            <div style={{ marginTop: 6, height: 4, background: 'var(--border)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="icon-btn" onClick={e => { e.stopPropagation(); setDraft({ label: task.label, status: task.status, startDate: task.startDate, endDate: task.endDate, assignee: task.assignee, supplierId: task.supplierId }); setEditing(true); setOpen(true); }} style={{ color: 'var(--muted)', padding: 6 }}><Pencil size={14} /></button>
          <button className="icon-btn" onClick={e => { e.stopPropagation(); onDelete(task.key); }} style={{ color: 'var(--danger)', padding: 6, opacity: 0.7 }}><Trash2 size={14} /></button>
          <div style={{ color: 'var(--muted)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}><ChevronRight size={18} /></div>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
          {editing ? (
            <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>اسم المهمة</label>
                  <input value={draft.label || ''} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>الحالة</label>
                  <select value={draft.status || 'pending'} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }}>
                    {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select></div>
                <div><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>تاريخ البداية</label>
                  <input type="date" value={draft.startDate || ''} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>تاريخ الانتهاء</label>
                  <input type="date" value={draft.endDate || ''} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={saveEdit} style={{ flex: 1, justifyContent: 'center' }}><Check size={15} /> حفظ</button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)} style={{ flex: 1, justifyContent: 'center' }}><X size={15} /> إلغاء</button>
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {steps.map(s => <StepRow key={s.id} step={s} taskKey={task.key} onToggle={toggleStep} onDelete={deleteStep} />)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newStep}
                  onChange={e => setNewStep(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStep()}
                  placeholder="إضافة خطوة جديدة..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13 }}
                />
                <button className="btn" onClick={addStep} style={{ padding: '8px 14px' }}><Plus size={15} /> إضافة</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TasksPanel({ project, onUpdate }) {
  const [tasks, setTasksLocal] = useState(() => initTasks(project));
  const [adding, setAdding]    = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [workers, setWorkersState] = useState(getWorkers);
  const suppliers = getSuppliers();

  function saveTasks(next) {
    setTasksLocal(next);
    onUpdate({ tasks: next });
  }

  function updateTask(updated) {
    saveTasks(tasks.map(t => t.key === updated.key ? updated : t));
  }

  function deleteTask(key) {
    saveTasks(tasks.filter(t => t.key !== key));
  }

  function addTask() {
    if (!newLabel.trim()) return;
    const t = { key: 'custom-' + Date.now(), label: newLabel.trim(), weight: 0, status: 'pending', startDate: '', endDate: '', steps: [] };
    saveTasks([...tasks, t]);
    setNewLabel('');
    setAdding(false);
  }

  const done = tasks.filter(t => t.status === 'done').length;
  const pct  = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>{done}/{tasks.length} مهمة مكتملة</span>
          <div style={{ width: 120, height: 6, background: 'var(--border)', borderRadius: 99 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#10B981', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{pct}%</span>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(a => !a)} style={{ padding: '8px 16px' }}><Plus size={15} /> مهمة جديدة</button>
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 8, background: 'var(--card)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
          <input
            autoFocus
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="اسم المهمة الجديدة..."
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }}
          />
          <button className="btn btn-primary" onClick={addTask}><Check size={15} /></button>
          <button className="btn btn-ghost" onClick={() => setAdding(false)}><X size={15} /></button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tasks.map(t => <TaskCard key={t.key} task={t} onUpdate={updateTask} onDelete={deleteTask} suppliers={suppliers} />)}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   QUALITY GATES PANEL (بوابات الجودة والاستلام الفني)
════════════════════════════════════════════════════════════ */
function QualityGatesPanel({ project, onUpdate }) {
  const qualityData = project.qualityData || {};
  const [activePhase, setActivePhase] = useState('all');
  const [uploadingFor, setUploadingFor] = useState(null);

  function updateCheck(checkId, patch) {
    const prev = qualityData[checkId] || {};
    const updated = {
      ...qualityData,
      [checkId]: { ...prev, ...patch, updatedAt: todayISO() }
    };
    onUpdate({ qualityData: updated });
  }

  function handlePhotoUpload(checkId, e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("حجم الصورة كبير جداً (أقصى حجم 2 ميجا).");
      return;
    }
    setUploadingFor(checkId);
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateCheck(checkId, { photo: ev.target.result });
      setUploadingFor(null);
    };
    reader.readAsDataURL(file);
  }

  // Calculate statistics
  let totalChecks = 0;
  let approvedChecks = 0;
  let reworkChecks = 0;
  let pendingChecks = 0;

  QUALITY_GATES.forEach(qg => {
    qg.checks.forEach(c => {
      totalChecks++;
      const st = qualityData[c.id]?.status || 'pending';
      if (st === 'approved') approvedChecks++;
      else if (st === 'rework') reworkChecks++;
      else pendingChecks++;
    });
  });

  const complianceScore = totalChecks > 0 ? Math.round((approvedChecks / totalChecks) * 100) : 0;

  const STATUS_CONFIG = {
    approved: { label: 'معتمد ومقبول', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', icon: CheckCircle2 },
    rework:   { label: 'يحتاج معالجة', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', icon: AlertTriangle },
    pending:  { label: 'قيد الفحص',    color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)', icon: Clock },
  };

  const filteredGates = activePhase === 'all'
    ? QUALITY_GATES
    : QUALITY_GATES.filter(qg => qg.phaseId === activePhase);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Overview Banner */}
      <div style={{
        background: 'var(--card)', color: 'var(--ink)',
        borderRadius: 12, padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>منظومة بوابات الجودة والاستلام الفني</h3>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              معايير واختبارات إلزامية لكل مرحلة لضمان صفر عيوب ومطابقة الكود الهندسي
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#6EE7B7' }}>{complianceScore}%</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>نسبة مطابقة الجودة</div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 14px', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#6EE7B7' }}>{approvedChecks}</div>
              <div style={{ fontSize: 10, opacity: 0.75 }}>معتمد ✅</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 14px', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#FCA5A5' }}>{reworkChecks}</div>
              <div style={{ fontSize: 10, opacity: 0.75 }}>معالجة ⚠️</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 14px', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#E2E8F0' }}>{pendingChecks}</div>
              <div style={{ fontSize: 10, opacity: 0.75 }}>قيد الفحص ⏳</div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => setActivePhase('all')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border)',
            background: activePhase === 'all' ? 'var(--teal)' : 'var(--card)',
            color: activePhase === 'all' ? '#fff' : 'var(--ink)', fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}
        >
          كافة المراحل ({totalChecks})
        </button>
        {QUALITY_GATES.map((qg, i) => {
          const phApproved = qg.checks.filter(c => qualityData[c.id]?.status === 'approved').length;
          return (
            <button
              key={qg.phaseId}
              onClick={() => setActivePhase(qg.phaseId)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border)',
                background: activePhase === qg.phaseId ? 'var(--teal)' : 'var(--card)',
                color: activePhase === qg.phaseId ? '#fff' : 'var(--ink)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <span>{qg.phaseName}</span>
              <span style={{ fontSize: 11, opacity: 0.8 }}>({phApproved}/{qg.checks.length})</span>
            </button>
          );
        })}
      </div>

      {/* Quality Gate Check Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {filteredGates.map((qg) => (
          <div key={qg.phaseId} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="var(--teal)" />
                {qg.phaseName}
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                {qg.checks.filter(c => qualityData[c.id]?.status === 'approved').length} من {qg.checks.length} بنود معتمدة
              </span>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {qg.checks.map((check) => {
                const cData = qualityData[check.id] || {};
                const stKey = cData.status || 'pending';
                const stCfg = STATUS_CONFIG[stKey];
                const StIcon = stCfg.icon;

                return (
                  <div key={check.id} style={{
                    background: 'var(--bg)', border: `1.5px solid ${stKey === 'approved' ? '#10B98140' : stKey === 'rework' ? '#EF444440' : 'var(--border)'}`,
                    borderRadius: 14, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12
                  }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{check.title}</span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: check.criticality === 'حرج جداً' ? '#EF444420' : check.criticality === 'حرج' ? '#F59E0B20' : '#3B82F620',
                            color: check.criticality === 'حرج جداً' ? '#EF4444' : check.criticality === 'حرج' ? '#F59E0B' : '#3B82F6'
                          }}>
                            {check.criticality}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                          <strong style={{ color: 'var(--ink)' }}>المعيار الهندسي: </strong>
                          {check.standard}
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => {
                          const IconComp = cfg.icon;
                          const isSelected = stKey === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => updateCheck(check.id, { status: k })}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
                                border: `1.5px solid ${isSelected ? cfg.color : 'var(--border)'}`,
                                background: isSelected ? cfg.bg : 'var(--card)',
                                color: isSelected ? cfg.color : 'var(--muted)',
                                fontWeight: isSelected ? 800 : 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              <IconComp size={14} color={isSelected ? cfg.color : 'var(--muted)'} />
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Metadata & Notes Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>المهندس الفاحص</label>
                        <input
                          type="text"
                          value={cData.inspector || ''}
                          placeholder={project.engineer || 'اسم المهندس الفاحص...'}
                          onChange={e => updateCheck(check.id, { inspector: e.target.value })}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>ملاحظات الفحص والتقرير</label>
                        <input
                          type="text"
                          value={cData.notes || ''}
                          placeholder="مثال: تم الكبس على 10 بار وثابت بدون تنفيس..."
                          onChange={e => updateCheck(check.id, { notes: e.target.value })}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: 12 }}
                        />
                      </div>

                      {/* Photo Upload & Preview */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                        <label style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)',
                          color: 'var(--ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                        }}>
                          <Upload size={14} color="var(--teal)" />
                          {cData.photo ? 'تغيير صورة الاختبار 📷' : 'إرفاق صورة الاختبار 📷'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handlePhotoUpload(check.id, e)}
                            style={{ display: 'none' }}
                          />
                        </label>

                        {cData.photo && (
                          <a href={cData.photo} target="_blank" rel="noreferrer" style={{
                            padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10B981',
                            fontSize: 12, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(16,185,129,0.2)'
                          }}>
                            عرض الصورة 🔍
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function ProjectSchedule({ project, onUpdate }) {
  const [panel, setPanel] = useState('phases');

  const PANELS = [
    { key: 'phases',  label: 'المراحل الأربعة',     icon: Layers },
    { key: 'quality', label: 'بوابات الجودة الفنية', icon: ShieldCheck },
    { key: 'gantt',   label: 'المخطط الزمني',       icon: BarChart3 },
    { key: 'pricing', label: 'جدول التسعير',        icon: DollarSign },
    { key: 'tasks',   label: 'المهام التفصيلية',    icon: List },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>


      {/* Panel content */}
      <div className="tab-fade">
        {panel === 'phases'  && <PhasesPanel  project={project} onUpdate={onUpdate} />}
        {panel === 'quality' && <QualityGatesPanel project={project} onUpdate={onUpdate} />}
        {panel === 'gantt'   && <GanttPanel   project={project} onUpdate={onUpdate} />}
        {panel === 'pricing' && <PricingPanel project={project} onUpdate={onUpdate} />}
        {panel === 'tasks'   && <TasksPanel   project={project} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

