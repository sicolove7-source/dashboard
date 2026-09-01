import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, AlertCircle,
  CheckCircle2, Clock, Printer, Plus, ArrowUpRight, ArrowDownRight,
  FileText, ChevronDown, ChevronUp, BarChart2, PieChart as PieIcon,
  Calendar, Filter, X, Save
} from 'lucide-react';
import { money, fmtDate, todayISO } from '../utils/helpers';

/* ───── helpers ───── */
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const QUARTERS = ['الربع الأول','الربع الثاني','الربع الثالث','الربع الرابع'];

function getMonthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const EXPENSE_CATS = ['رواتب', 'مواد خام', 'عمالة', 'معدات', 'إيجارات', 'مصاريف إدارية', 'مصاريف تسويق', 'أخرى'];

/* ───── KPI Card ───── */
function KPICard({ label, value, sub, icon: Icon, color, trend, trendLabel }) {
  return (
    <div style={{
      background: 'var(--card)', borderRadius: 16, padding: '14px 16px',
      border: '1px solid var(--border)', borderTop: `4px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', left: 10, top: 10, opacity: 0.05, transform: 'scale(1.8)', transformOrigin: 'top left' }}>
        <Icon size={32} color={color} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </div>
      {(sub || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5 }}>
          {trend !== undefined && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 2,
              color: trend >= 0 ? '#10B981' : '#EF4444', fontWeight: 700
            }}>
              {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(trend)}%
            </span>
          )}
          {sub && <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

/* ───── Custom Tooltip ───── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '10px 14px', fontFamily: 'Cairo', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: 'var(--muted)' }}>{p.name}:</span>
          <span style={{ color: p.color, fontWeight: 700 }}>{money(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ───── Add Company Expense Modal ───── */
function AddExpenseModal({ onSave, onClose }) {
  const [form, setForm] = useState({ date: todayISO(), amount: '', category: EXPENSE_CATS[0], description: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: 'var(--card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440,
        border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
            <Plus size={18} color="#EF4444" /> إضافة مصروف شركة
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, marginBottom: 4 }}>التاريخ</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, marginBottom: 4 }}>الفئة</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, marginBottom: 4 }}>المبلغ</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" min="0" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, marginBottom: 4 }}>البيان / الوصف</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف المصروف..." />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button className="btn btn-primary" onClick={() => { if (form.amount && form.description) { onSave(form); onClose(); } }}
              style={{ flex: 1 }}>
              <Save size={15} /> حفظ المصروف
            </button>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompanyFinance({ projects = [], onUpdateProject }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | monthly | quarterly | expenses
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [companyExpenses, setCompanyExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('amlak_company_expenses');
      return saved ? JSON.parse(saved) : [
        { id: 'exp-1', date: '2025-01-05', category: 'رواتب', amount: 35000, description: 'رواتب المهندسين والمشرفين' },
        { id: 'exp-2', date: '2025-01-10', category: 'إيجارات', amount: 8000, description: 'إيجار مقر الشركة' },
        { id: 'exp-3', date: '2025-01-15', category: 'مصاريف تسويق', amount: 4500, description: 'حملات إعلانات فيسبوك وإنستجرام' },
        { id: 'exp-4', date: '2025-02-05', category: 'رواتب', amount: 35000, description: 'رواتب المهندسين والمشرفين' },
        { id: 'exp-5', date: '2025-02-12', category: 'مصاريف إدارية', amount: 2200, description: 'فواتير إنترنت وكهرباء وبوفيه' },
        { id: 'exp-6', date: '2025-03-05', category: 'رواتب', amount: 38000, description: 'رواتب المهندسين والمشرفين' },
      ];
    } catch {
      return [];
    }
  });

  const [expandedProject, setExpandedProject] = useState(null);

  function saveExpense(form) {
    const next = [{ ...form, id: 'exp-' + Date.now() }, ...companyExpenses];
    setCompanyExpenses(next);
    localStorage.setItem('amlak_company_expenses', JSON.stringify(next));
  }

  function deleteExpense(id) {
    const next = companyExpenses.filter(e => e.id !== id);
    setCompanyExpenses(next);
    localStorage.setItem('amlak_company_expenses', JSON.stringify(next));
  }

  /* ── Computed KPIs ── */
  const kpis = useMemo(() => {
    let totalContracts = 0;
    let totalCollected = 0;
    let totalProjectExpenses = 0;
    const overdueProjects = [];

    projects.forEach(p => {
      const budget = parseFloat(p.budget) || 0;
      totalContracts += budget;
      const collected = (p.clientPayments || []).reduce((s, x) => s + parseFloat(x.amount || 0), 0);
      totalCollected += collected;
      const exp = (p.expenses || []).reduce((s, x) => s + parseFloat(x.amount || 0), 0);
      totalProjectExpenses += exp;
      if (budget > collected && p.status !== 'completed') {
        overdueProjects.push(p);
      }
    });

    const totalCompanyExpenses = companyExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalExpenses = totalProjectExpenses + totalCompanyExpenses;
    const grossProfit = totalCollected - totalExpenses;
    const profitMargin = totalCollected > 0 ? ((grossProfit / totalCollected) * 100).toFixed(1) : 0;
    const totalPending = totalContracts - totalCollected;

    return {
      totalContracts,
      totalCollected,
      totalProjectExpenses,
      totalCompanyExpenses,
      totalExpenses,
      grossProfit,
      profitMargin,
      totalPending,
      overdueProjects,
    };
  }, [projects, companyExpenses]);

  /* ── Monthly Data for selected year ── */
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: MONTHS_AR[i],
      monthNum: i + 1,
      collected: 0,
      expenses: 0,
      profit: 0
    }));

    projects.forEach(p => {
      (p.clientPayments || []).forEach(pay => {
        if (!pay.date) return;
        const d = new Date(pay.date);
        if (d.getFullYear() === filterYear) {
          months[d.getMonth()].collected += parseFloat(pay.amount || 0);
        }
      });
      (p.expenses || []).forEach(exp => {
        if (!exp.date) return;
        const d = new Date(exp.date);
        if (d.getFullYear() === filterYear) {
          months[d.getMonth()].expenses += parseFloat(exp.amount || 0);
        }
      });
    });

    companyExpenses.forEach(exp => {
      if (!exp.date) return;
      const d = new Date(exp.date);
      if (d.getFullYear() === filterYear) {
        months[d.getMonth()].expenses += parseFloat(exp.amount || 0);
      }
    });

    months.forEach(m => {
      m.profit = m.collected - m.expenses;
    });

    return months;
  }, [projects, companyExpenses, filterYear]);

  /* ── Quarterly Data ── */
  const quarterlyData = useMemo(() => {
    return [0, 1, 2, 3].map(q => {
      const qMonths = monthlyData.slice(q * 3, q * 3 + 3);
      const collected = qMonths.reduce((s, m) => s + m.collected, 0);
      const expenses = qMonths.reduce((s, m) => s + m.expenses, 0);
      const profit = collected - expenses;
      return {
        name: QUARTERS[q],
        collected,
        expenses,
        profit,
      };
    });
  }, [monthlyData]);

  /* ── Expense By Category (Pie) ── */
  const expByCat = useMemo(() => {
    const map = {};
    companyExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + parseFloat(e.amount || 0);
    });
    projects.forEach(p => {
      (p.expenses || []).forEach(e => {
        const cat = e.category || 'مصاريف مشروع';
        map[cat] = (map[cat] || 0) + parseFloat(e.amount || 0);
      });
    });
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [projects, companyExpenses]);

  /* ── Tab buttons ── */
  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: BarChart2 },
    { key: 'monthly', label: 'التحليل الشهري', icon: Calendar },
    { key: 'quarterly', label: 'التقرير الربع سنوي', icon: PieIcon },
    { key: 'expenses', label: 'سجل المصروفات', icon: FileText },
  ];

  const currentQuarter = Math.floor(new Date().getMonth() / 3);

  return (
    <div className="grid tab-fade" style={{ gap: 16 }}>

      {/* Header with tabs */}
      <div className="company-finance-toolbar">
        <div className="company-finance-nav">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                  borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 12, fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: activeTab === t.key ? 'var(--card)' : 'transparent',
                  color: activeTab === t.key ? 'var(--ink)' : 'var(--muted)',
                  boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}>
                <Icon size={14} />{t.label}
              </button>
            );
          })}
        </div>

        <div className="company-finance-actions-row">
          <select value={filterYear} onChange={e => setFilterYear(+e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontFamily: 'Cairo', fontSize: 12 }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowAddExpense(true)} style={{ fontSize: 12, padding: '7px 12px' }}>
            <Plus size={14} /> مصروف جديد
          </button>
          <button className="btn" onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--ink)', fontSize: 12, padding: '7px 12px' }}>
            <Printer size={14} /> طباعة
          </button>
        </div>
      </div>

      {/* ══════════ OVERVIEW TAB ══════════ */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Grid */}
          <div className="company-finance-kpi-grid">
            <KPICard label="إجمالي قيمة العقود" value={money(kpis.totalContracts)}
              icon={FileText} color="#6366F1" sub={`${projects.length} مشروع نشط`} />
            <KPICard label="المحصّل من العملاء" value={money(kpis.totalCollected)}
              icon={ArrowDownRight} color="#10B981"
              sub={`${kpis.totalContracts > 0 ? Math.round((kpis.totalCollected / kpis.totalContracts) * 100) : 0}% من العقود`} />
            <KPICard label="إجمالي المصروفات" value={money(kpis.totalExpenses)}
              icon={ArrowUpRight} color="#EF4444" sub="مشاريع + شركة" />
            <KPICard label="صافي الربح" value={money(kpis.grossProfit)}
              icon={TrendingUp} color={kpis.grossProfit >= 0 ? '#10B981' : '#EF4444'}
              sub={`هامش ربح ${kpis.profitMargin}%`} />
            <KPICard label="مستحقات لم تُحصَّل" value={money(kpis.totalPending)}
              icon={Clock} color="#F59E0B" sub={`${kpis.overdueProjects.length} متأخرة`} />
            <KPICard label="مصاريف الشركة العامة" value={money(kpis.totalCompanyExpenses)}
              icon={Wallet} color="#8B5CF6" sub={`${companyExpenses.length} معاملة`} />
          </div>

          {/* Profit Gauge */}
          <div style={{
            background: 'var(--card)', borderRadius: 16, padding: '18px 20px',
            border: '1px solid var(--border)', borderTop: '4px solid #10B981'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5 }}>
                <TrendingUp size={17} color="#10B981" /> مؤشر الصحة المالية للشركة
              </h3>
              <span style={{
                fontSize: 17, fontWeight: 800, fontFamily: 'monospace',
                color: kpis.grossProfit >= 0 ? '#10B981' : '#EF4444'
              }}>
                {kpis.profitMargin}% ربح
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'المحصّل', val: kpis.totalCollected, total: kpis.totalContracts, color: '#10B981' },
                { label: 'المصروفات', val: kpis.totalExpenses, total: kpis.totalContracts, color: '#EF4444' },
                { label: 'صافي الربح', val: Math.max(0, kpis.grossProfit), total: kpis.totalContracts, color: '#6366F1' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11.5 }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{r.label}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--ink)' }}>{money(r.val)}</span>
                  </div>
                  <div style={{ height: 7, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{
                      width: `${r.total > 0 ? Math.min((r.val / r.total) * 100, 100) : 0}%`,
                      height: '100%', background: r.color, borderRadius: 4,
                      transition: 'width 0.8s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2-col: Overdue + Pie */}
          <div className="finance-charts-grid">
            {/* Overdue projects */}
            <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)', borderTop: '4px solid #EF4444' }}>
              <h3 style={{ margin: '0 0 14px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <AlertCircle size={17} color="#EF4444" /> مشاريع بها مستحقات متأخرة
              </h3>
              {kpis.overdueProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
                  <CheckCircle2 size={26} color="#10B981" style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 12 }}>لا توجد مستحقات متأخرة 🎉</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {kpis.overdueProjects.map(p => {
                    const paid = (p.clientPayments || []).reduce((a, x) => a + parseFloat(x.amount || 0), 0);
                    const remaining = p.budget - paid;
                    return (
                      <div key={p.id} style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12.5, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>العميل: {p.client}</div>
                        </div>
                        <div style={{ textAlign: 'left', flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, color: '#EF4444', fontSize: 13, fontFamily: 'monospace' }}>{money(remaining)}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>مستحق التحصيل</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expense by category pie */}
            <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 14px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <PieIcon size={17} color="#6366F1" /> توزيع المصروفات حسب الفئة
              </h3>
              {expByCat.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 12 }}>
                  لا توجد مصروفات مسجلة بعد
                </div>
              ) : (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={expByCat} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                        paddingAngle={3} dataKey="value">
                        {expByCat.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={v => money(v)} contentStyle={{ fontFamily: 'Cairo', fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 6 }} dir="rtl">
                    {expByCat.map((e, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--muted)' }}>{e.name}</span>
                        <span style={{ fontWeight: 700, color: 'var(--ink)', fontFamily: 'monospace', fontSize: 10.5 }}>{money(e.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Projects finance cards & table */}
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <FileText size={17} color="#6366F1" /> كشف حساب تفصيلي — كل المشاريع
            </h3>

            {/* Mobile Project Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...projects].sort((a, b) => b.budget - a.budget).map(p => {
                const collected = (p.clientPayments || []).reduce((a, x) => a + parseFloat(x.amount || 0), 0);
                const expenses = (p.expenses || []).reduce((a, x) => a + parseFloat(x.amount || 0), 0);
                const netProfit = collected - expenses;
                const margin = collected > 0 ? ((netProfit / collected) * 100).toFixed(1) : '—';
                const isExpanded = expandedProject === p.id;

                return (
                  <div key={p.id} className="mobile-project-fin-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>العميل: {p.client}</div>
                      </div>
                      <span style={{
                        padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0,
                        background: parseFloat(margin) >= 20 ? 'rgba(16,185,129,0.1)' : parseFloat(margin) >= 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        color: parseFloat(margin) >= 20 ? '#10B981' : parseFloat(margin) >= 0 ? '#F59E0B' : '#EF4444',
                      }}>{margin}% هامش</span>
                    </div>

                    <div className="mobile-fin-kpi-mini-grid">
                      <div className="mobile-fin-kpi-item">
                        <span className="lbl">قيمة العقد</span>
                        <span className="val" style={{ color: '#6366F1' }}>{money(p.budget)}</span>
                      </div>
                      <div className="mobile-fin-kpi-item">
                        <span className="lbl">المحصّل</span>
                        <span className="val" style={{ color: '#10B981' }}>{money(collected)}</span>
                      </div>
                      <div className="mobile-fin-kpi-item">
                        <span className="lbl">المصروفات</span>
                        <span className="val" style={{ color: '#EF4444' }}>{money(expenses)}</span>
                      </div>
                      <div className="mobile-fin-kpi-item">
                        <span className="lbl">صافي الربح</span>
                        <span className="val" style={{ color: netProfit >= 0 ? '#10B981' : '#EF4444' }}>{money(netProfit)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => setExpandedProject(isExpanded ? null : p.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--teal)', fontSize: 11.5, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 4, padding: 0
                        }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'إخفاء التفاصيل' : 'عرض آخر المعاملات'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 10, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginBottom: 6 }}>آخر المقبوضات ({(p.clientPayments || []).length}):</div>
                        {(p.clientPayments || []).slice(0, 3).map(pay => (
                          <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--muted)' }}>{fmtDate(pay.date)} - {pay.description}</span>
                            <span style={{ color: '#10B981', fontWeight: 700, fontFamily: 'monospace' }}>+{money(pay.amount)}</span>
                          </div>
                        ))}
                        {(p.clientPayments || []).length === 0 && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>لا توجد مقبوضات</div>}

                        <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', margin: '8px 0 6px' }}>آخر المصروفات ({(p.expenses || []).length}):</div>
                        {(p.expenses || []).slice(0, 3).map(exp => (
                          <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--muted)' }}>{fmtDate(exp.date)} - {exp.description}</span>
                            <span style={{ color: '#EF4444', fontWeight: 700, fontFamily: 'monospace' }}>-{money(exp.amount)}</span>
                          </div>
                        ))}
                        {(p.expenses || []).length === 0 && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>لا توجد مصروفات</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ══════════ MONTHLY TAB ══════════ */}
      {activeTab === 'monthly' && (
        <>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5 }}>
              <Calendar size={17} color="#6366F1" /> التدفق المالي الشهري — {filterYear}
            </h3>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 9.5, fontFamily: 'Cairo' }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 9.5 }} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => v} wrapperStyle={{ fontFamily: 'Cairo', fontSize: 11, paddingTop: 6 }} />
                  <Bar dataKey="collected" name="المحصّل" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="expenses" name="المصروفات" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5 }}>
              <TrendingUp size={17} color="#6366F1" /> منحنى صافي الربح الشهري
            </h3>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 9.5, fontFamily: 'Cairo' }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 9.5 }} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="profit" name="صافي الربح" stroke="#6366F1" strokeWidth={2.5} fill="url(#profitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly table */}
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 14px', color: 'var(--ink)', fontSize: 14 }}>جدول الأرقام الشهرية</h3>
            <div className="finance-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الشهر</th>
                    <th>المحصّل</th>
                    <th>المصروفات</th>
                    <th>صافي الربح</th>
                    <th>هامش الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m, i) => {
                    const margin = m.collected > 0 ? ((m.profit / m.collected) * 100).toFixed(1) : '—';
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{m.month}</td>
                        <td style={{ color: '#10B981', fontFamily: 'monospace', fontWeight: 700 }}>{money(m.collected)}</td>
                        <td style={{ color: '#EF4444', fontFamily: 'monospace', fontWeight: 700 }}>{money(m.expenses)}</td>
                        <td style={{ color: m.profit >= 0 ? '#10B981' : '#EF4444', fontFamily: 'monospace', fontWeight: 800 }}>{money(m.profit)}</td>
                        <td>
                          {margin !== '—' ? (
                            <span style={{
                              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: parseFloat(margin) >= 15 ? 'rgba(16,185,129,0.1)' : parseFloat(margin) >= 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                              color: parseFloat(margin) >= 15 ? '#10B981' : parseFloat(margin) >= 0 ? '#F59E0B' : '#EF4444',
                            }}>{margin}%</span>
                          ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg)', fontWeight: 800 }}>
                    <td>الإجمالي</td>
                    <td style={{ color: '#10B981', fontFamily: 'monospace' }}>{money(monthlyData.reduce((s, m) => s + m.collected, 0))}</td>
                    <td style={{ color: '#EF4444', fontFamily: 'monospace' }}>{money(monthlyData.reduce((s, m) => s + m.expenses, 0))}</td>
                    <td style={{ color: '#6366F1', fontFamily: 'monospace' }}>{money(monthlyData.reduce((s, m) => s + m.profit, 0))}</td>
                    <td>—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════ QUARTERLY TAB ══════════ */}
      {activeTab === 'quarterly' && (
        <>
          <div className="quarterly-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {quarterlyData.map((q, i) => (
              <div key={i} style={{
                background: 'var(--card)', borderRadius: 16, padding: '14px 16px',
                border: `1px solid var(--border)`,
                borderTop: `4px solid ${i === currentQuarter ? '#6366F1' : 'var(--border)'}`,
                position: 'relative'
              }}>
                {i === currentQuarter && (
                  <span style={{
                    position: 'absolute', top: 10, left: 10, fontSize: 9.5, fontWeight: 800,
                    background: '#6366F1', color: 'white', padding: '2px 6px', borderRadius: 20
                  }}>الحالي</span>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>{q.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>محصّل</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#10B981', fontSize: 13 }}>{money(q.collected)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>مصروفات</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#EF4444', fontSize: 13 }}>{money(q.expenses)}</div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 5 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>صافي الربح</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13.5, color: q.profit >= 0 ? '#6366F1' : '#EF4444' }}>{money(q.profit)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--ink)', fontSize: 14.5 }}>مقارنة الأرباع — {filterYear}</h3>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={quarterlyData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 10.5, fontFamily: 'Cairo' }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 9.5 }} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => v} wrapperStyle={{ fontFamily: 'Cairo', fontSize: 11, paddingTop: 6 }} />
                  <Bar dataKey="collected" name="المحصّل" fill="#10B981" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="expenses" name="المصروفات" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="profit" name="صافي الربح" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Print-friendly quarterly report */}
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)', borderTop: '4px solid #6366F1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: 13.5 }}>📋 التقرير المالي الربع سنوي — {filterYear}</h3>
              <button className="btn" onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#6366F1', color: 'white', border: 'none', fontSize: 11, padding: '5px 10px' }}>
                <Printer size={13} /> طباعة
              </button>
            </div>

            <div className="finance-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>البند</th>
                    {QUARTERS.map(q => <th key={q}>{q}</th>)}
                    <th>إجمالي العام</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'إجمالي المحصّل', key: 'collected', color: '#10B981' },
                    { label: 'إجمالي المصروفات', key: 'expenses', color: '#EF4444' },
                    { label: 'صافي الربح', key: 'profit', color: '#6366F1' },
                  ].map(row => (
                    <tr key={row.key}>
                      <td style={{ fontWeight: 700, color: row.color }}>{row.label}</td>
                      {quarterlyData.map((q, i) => (
                        <td key={i} style={{ fontFamily: 'monospace', fontWeight: 700, color: row.color }}>{money(q[row.key])}</td>
                      ))}
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: row.color }}>
                        {money(quarterlyData.reduce((s, q) => s + q[row.key], 0))}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 700 }}>هامش الربح</td>
                    {quarterlyData.map((q, i) => (
                      <td key={i} style={{ fontWeight: 700, color: '#6366F1' }}>
                        {q.collected > 0 ? ((q.profit / q.collected) * 100).toFixed(1) + '%' : '—'}
                      </td>
                    ))}
                    <td style={{ fontWeight: 800, color: '#6366F1' }}>
                      {kpis.totalCollected > 0 ? kpis.profitMargin + '%' : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════ EXPENSES TAB ══════════ */}
      {activeTab === 'expenses' && (
        <>
          <div className="expense-cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            {EXPENSE_CATS.map(cat => {
              const total = companyExpenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
              return (
                <div key={cat} style={{
                  background: 'var(--card)', borderRadius: 12, padding: '10px 12px',
                  border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{cat}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--ink)', fontSize: 12 }}>{money(total)}</span>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <FileText size={17} color="#EF4444" /> سجل مصاريف الشركة
                <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '2px 8px', borderRadius: 20 }}>
                  {companyExpenses.length} معاملة
                </span>
              </h3>
              <button className="btn btn-primary" onClick={() => setShowAddExpense(true)} style={{ fontSize: 11.5, padding: '6px 12px' }}>
                <Plus size={14} /> إضافة مصروف
              </button>
            </div>

            {companyExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>
                <Wallet size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
                <div style={{ fontSize: 13 }}>لا توجد مصاريف شركة مسجلة. اضغط "إضافة مصروف" للبدء.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {companyExpenses.map(e => (
                  <div key={e.id} style={{
                    padding: '12px 14px', borderRadius: 12, background: 'var(--bg)',
                    border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                          {e.category}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{fmtDate(e.date)}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>{e.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#EF4444', fontFamily: 'monospace', fontWeight: 800, fontSize: 13 }}>
                        -{money(e.amount)}
                      </span>
                      <button onClick={() => deleteExpense(e.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
                        title="حذف">
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <AddExpenseModal onSave={saveExpense} onClose={() => setShowAddExpense(false)} />
      )}
    </div>
  );
}
