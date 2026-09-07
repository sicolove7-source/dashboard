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
          <div className="icon-wrap"><Building2 size={18} /></div>
          <div className="label">عدد المواقع النشطة</div>
          <div className="value">{projects.length}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap"><CheckSquare size={18} /></div>
          <div className="label">إجمالي الملاحظات المسجلة</div>
          <div className="value">{stats.totalSnags}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap"><AlertCircle size={18} /></div>
          <div className="label">ملاحظات لم تنجز (مفتوحة)</div>
          <div className="value" style={{ color: stats.pendingSnags > 0 ? "#D97706" : "var(--ink)" }}>{stats.pendingSnags}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap"><TrendingUp size={18} /></div>
          <div className="label">متوسط نسبة الإنجاز للمواقع</div>
          <div className="value">{stats.avgProgress}%</div>
        </div>
      </div>

      <div className="grid overview-charts-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))" }}>
        <div className="panel">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink)" }}>
            <AlertTriangle size={18} color="#D97706" /> تنبيهات الملاحظات والمواقع
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {stats.highSnagProjects.length === 0 && stats.delayedProjects.length === 0 && (
              <div style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>لا توجد تنبيهات عاجلة. جميع المواقع على ما يرام!</div>
            )}
            
            {stats.highSnagProjects.map(p => (
              <div key={`snag-${p.id}`} className="overview-alert-card" style={{ padding: 12, background: "#FEF3C7", borderRadius: 8, border: "1px solid #FDE68A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#92400E", fontSize: 13.5, marginBottom: 2 }}>موقع {p.name} يحتاج متابعة</div>
                  <div style={{ fontSize: 12, color: "#B45309" }}>يوجد عدد {p.pendingCount} ملاحظات معلقة لم يتم إنجازها!</div>
                </div>
              </div>
            ))}

            {stats.delayedProjects.map(p => (
              <div key={`del-${p.id}`} className="overview-alert-card" style={{ padding: 12, background: "#FEE2E2", borderRadius: 8, border: "1px solid #FECACA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#991B1B", fontSize: 13.5, marginBottom: 2 }}>تأخير في موقع {p.name}</div>
                  <div style={{ fontSize: 12, color: "#B91C1C" }}>نسبة الإنجاز الحالية {p.progress}% فقط، وهو متأخر عن الجدول الزمني.</div>
                </div>
                <span className="status-badge-wrap"><StatusBadge status={p.status} /></span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>توزيع المواقع حسب المرحلة الحالية</h3>
          <div className="overview-chart-wrap" style={{ width: "100%", height: 260, marginTop: 20 }} dir="ltr">
            <ResponsiveContainer>
              <BarChart data={stageBar} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} angle={-45} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#F1F5F9" }} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A", boxShadow: "var(--shadow-md)", textAlign: "right" }} />
                <Bar dataKey="count" fill="#1877F2" radius={[4, 4, 0, 0]} barSize={28} />
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
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }} className="overview-workers-header">
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, background: '#F1F5F9', color: '#475569' }}>
            👷
          </span>
          العمالة الحالية في مواقع العمل (المشغولون الآن)
        </h3>
        <span style={{ fontSize: 12, fontWeight: 600, background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', padding: '3px 10px', borderRadius: 6 }}>
          {activeWorkers.length} صنايعي في الموقع
        </span>
      </div>

      {activeWorkers.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          لا توجد عمالة مسندة حالياً إلى مواقع العمل القائمة. يمكنك إسناد عمالة من جدول المشروع الزمني.
        </div>
      ) : (
        <div className="overview-workers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {activeWorkers.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F1F5F9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                {w.name?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{w.trade} · {Number(w.dailyRate || 0).toLocaleString()} ج/يوم</div>
              </div>
              <a href={`tel:${w.phone}`} style={{ color: '#16A34A', fontSize: 11.5, textDecoration: 'none', padding: '3px 7px', borderRadius: 6, background: '#DCFCE7', fontWeight: 600 }}>📞</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
