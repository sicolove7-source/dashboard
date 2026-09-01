import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell } from 'recharts';
import { Building2, CheckSquare, TrendingUp, AlertTriangle, AlertCircle, ArrowDownCircle } from 'lucide-react';
import { STATUS_META, STAGES } from '../utils/constants';
import { currentStageKey } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';

export default function Overview({ projects }) {
  const stats = useMemo(() => {
    let totalSnags = 0;
    let doneSnags = 0;
    let pendingSnags = 0;
    let totalProgress = 0;
    let delayedProjects = [];
    let highSnagProjects = [];

    projects.forEach(p => {
      totalProgress += p.progress;
      
      const pSnags = p.snags || [];
      const pDone = pSnags.filter(s => s.status === 'done').length;
      
      totalSnags += pSnags.length;
      doneSnags += pDone;
      pendingSnags += (pSnags.length - pDone);

      if (p.status !== "on_track") {
        delayedProjects.push(p);
      }

      if (pSnags.length - pDone > 5) {
        highSnagProjects.push({ ...p, pendingCount: pSnags.length - pDone });
      }
    });

    const avgProgress = projects.length ? Math.round(totalProgress / projects.length) : 0;

    return { 
      totalSnags, doneSnags, pendingSnags, avgProgress, 
      delayedProjects, highSnagProjects
    };
  }, [projects]);

  const statusPie = useMemo(() => {
    const counts = { on_track: 0, at_risk: 0, delayed: 0 };
    projects.forEach((p) => counts[p.status]++);
    return Object.entries(counts).map(([k, v]) => ({ name: STATUS_META[k].label, value: v, color: STATUS_META[k].color }));
  }, [projects]);

  const stageBar = useMemo(() => STAGES.map((s) => ({
    name: s.label.length > 14 ? s.label.slice(0, 14) + "…" : s.label,
    count: projects.filter((p) => currentStageKey(p.progress) === s.key).length,
  })), [projects]);

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="grid kpi-grid">
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: "rgba(16, 185, 129, 0.1)" }}><Building2 size={20} color="#10B981" /></div>
          <div className="label">عدد المواقع النشطة</div>
          <div className="value">{projects.length}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: "rgba(59, 130, 246, 0.1)" }}><CheckSquare size={20} color="#3B82F6" /></div>
          <div className="label">إجمالي الملاحظات المسجلة</div>
          <div className="value">{stats.totalSnags}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: "rgba(245, 158, 11, 0.1)" }}><AlertCircle size={20} color="#F59E0B" /></div>
          <div className="label">ملاحظات لم تنجز (مفتوحة)</div>
          <div className="value" style={{ color: "var(--amber)" }}>{stats.pendingSnags}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: "rgba(16, 185, 129, 0.1)" }}><TrendingUp size={20} color="#10B981" /></div>
          <div className="label">متوسط نسبة الإنجاز للمواقع</div>
          <div className="value">{stats.avgProgress}%</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))" }}>
        <div className="panel" style={{ borderTop: "4px solid var(--amber)" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--amber)" }}>
            <AlertTriangle size={20} /> تنبيهات الملاحظات والمواقع
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {stats.highSnagProjects.length === 0 && stats.delayedProjects.length === 0 && (
              <div style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>لا توجد تنبيهات عاجلة. جميع المواقع على ما يرام!</div>
            )}
            
            {stats.highSnagProjects.map(p => (
              <div key={`snag-${p.id}`} style={{ padding: 12, background: "rgba(245, 158, 11, 0.1)", borderRadius: 8, border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#92400E", marginBottom: 4 }}>موقع {p.name} يحتاج متابعة</div>
                  <div style={{ fontSize: 12, color: "#B45309" }}>يوجد عدد {p.pendingCount} ملاحظات معلقة لم يتم إنجازها!</div>
                </div>
              </div>
            ))}

            {stats.delayedProjects.map(p => (
              <div key={`del-${p.id}`} style={{ padding: 12, background: "rgba(239, 68, 68, 0.1)", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#991B1B", marginBottom: 4 }}>تأخير في موقع {p.name}</div>
                  <div style={{ fontSize: 12, color: "#B91C1C" }}>نسبة الإنجاز الحالية {p.progress}% فقط، وهو متأخر عن الجدول الزمني.</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>توزيع المواقع حسب المرحلة الحالية</h3>
          <div style={{ width: "100%", height: 280, marginTop: 24 }} dir="ltr">
            <ResponsiveContainer>
              <BarChart data={stageBar} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} angle={-45} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", textAlign: "right" }} />
                <Bar dataKey="count" fill="var(--teal)" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stage 3: Active Workers on Sites Panel */}
      <ActiveWorkersOverview projects={projects} />
    </div>
  );
}

function ActiveWorkersOverview({ projects }) {
  const activeWorkers = useMemo(() => {
    try {
      const workers = JSON.parse(localStorage.getItem('db-workers-v1') || '[]');
      return workers.filter(w => w.status === 'مشغول');
    } catch { return []; }
  }, [projects]);

  return (
    <div className="panel" style={{ borderTop: '4px solid #8B5CF6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.1)' }}>
            👷
          </span>
          العمالة الحالية في مواقع العمل (المشغولون الآن)
        </h3>
        <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', padding: '4px 12px', borderRadius: 20 }}>
          {activeWorkers.length} صنايعي في الموقع
        </span>
      </div>

      {activeWorkers.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          لا توجد عمالة مسندة حالياً إلى مواقع العمل القائمة. يمكنك إسناد عمالة من جدول المشروع الزمني.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {activeWorkers.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>
                {w.name?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.trade} · {Number(w.dailyRate || 0).toLocaleString()} ج/يوم</div>
              </div>
              <a href={`tel:${w.phone}`} style={{ color: 'var(--teal)', fontSize: 12, textDecoration: 'none', padding: '4px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', fontWeight: 700 }}>📞</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
