import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, AlertCircle,
  CheckCircle2, Clock, Printer, Plus, ArrowUpRight, ArrowDownRight,
  FileText, ChevronDown, ChevronUp, BarChart2, PieChart as PieIcon,
  Calendar, Filter, X, Save, Percent
} from 'lucide-react';
import { money, fmtDate, todayISO } from '../utils/helpers';
import {
  syncExpensesToCloud,
  subscribeToCloudCompanyField,
  fetchCompanyDataFromCloud,
} from '../services/cloudSync';

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
      background: 'var(--card)', borderRadius: 12, padding: '16px',
      border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: '#475569'
        }}>
          <Icon size={16} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
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

/* ───── Project Financial Extraction Helpers ───── */
function getProjectPayments(p) {
  if (Array.isArray(p?.clientPayments) && p.clientPayments.length > 0) {
    return p.clientPayments;
  }
  if (Array.isArray(p?.payments) && p.payments.length > 0) {
    return p.payments.map(x => ({
      id: x.id || 'pay-' + Math.random(),
      date: x.date,
      amount: parseFloat(x.amount || 0),
      description: x.description || x.note || 'دفعة عميل'
    }));
  }
  return [];
}

function getProjectExpenses(p) {
  if (Array.isArray(p?.expenses) && p.expenses.length > 0) {
    return p.expenses;
  }
  if (p?.spent && parseFloat(p.spent) > 0) {
    return [{
      id: `exp-${p.id}-spent`,
      date: p.startDate || todayISO(),
      amount: parseFloat(p.spent),
      category: 'مصاريف موقع',
      description: `تكلفة تنفيذ: ${p.name || ''}`
    }];
  }
  return [];
}

export default function CompanyFinance({ projects = [], onUpdateProject, activeCompanyId }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | monthly | quarterly | expenses
  const [showAddExpense, setShowAddExpense] = useState(false);
  const expenseStorageKey = `tenant_${activeCompanyId || 'comp_alain'}_company_expenses`;
  const [companyExpenses, setCompanyExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(expenseStorageKey) || localStorage.getItem('amlak_company_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // الاستماع اللحظي لمصاريف الشركة سحابياً عبر Firestore
  useEffect(() => {
    const cId = activeCompanyId || 'comp_alain';
    let isMounted = true;

    const unsub = subscribeToCloudCompanyField(cId, 'expenses', (cloudExpenses) => {
      if (!isMounted) return;
      if (Array.isArray(cloudExpenses)) {
        setCompanyExpenses(cloudExpenses);
        try {
          localStorage.setItem(expenseStorageKey, JSON.stringify(cloudExpenses));
        } catch (e) {}
      }
    });

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [activeCompanyId, expenseStorageKey]);

  // ترحيل البيانات تلقائياً (Migration) من المفاتيح القديمة إلى Firestore مرة واحدة مع إزالة التكرار
  const migrationRanRef = useRef(false);
  useEffect(() => {
    const cId = activeCompanyId || 'comp_alain';
    if (migrationRanRef.current) return;
    migrationRanRef.current = true;

    async function migrateLocalExpenses() {
      try {
        const rawCurrent = localStorage.getItem(expenseStorageKey);
        const rawFallback = localStorage.getItem('amlak_company_expenses');
        const localCurrent = rawCurrent ? JSON.parse(rawCurrent) : [];
        const localFallback = rawFallback ? JSON.parse(rawFallback) : [];

        // دمج البيانات المحلية مع إزالة التكرار حسب id
        const localMap = new Map();
        (Array.isArray(localFallback) ? localFallback : []).forEach(item => {
          if (item && item.id) localMap.set(item.id, item);
        });
        (Array.isArray(localCurrent) ? localCurrent : []).forEach(item => {
          if (item && item.id) localMap.set(item.id, item);
        });
        const localMerged = Array.from(localMap.values());

        if (localMerged.length === 0) return;

        // فحص ما هو موجود سحابياً في Firestore
        const cloudData = await fetchCompanyDataFromCloud(cId);
        const cloudExpenses = Array.isArray(cloudData?.expenses) ? cloudData.expenses : [];
        const cloudIds = new Set(cloudExpenses.map(e => e.id));

        const missingInCloud = localMerged.filter(e => !cloudIds.has(e.id));
        if (missingInCloud.length > 0 || cloudExpenses.length === 0) {
          const finalMap = new Map();
          cloudExpenses.forEach(e => { if (e && e.id) finalMap.set(e.id, e); });
          localMerged.forEach(e => { if (e && e.id) finalMap.set(e.id, e); });
          const mergedFinal = Array.from(finalMap.values());

          const ok = await syncExpensesToCloud(cId, mergedFinal);
          if (ok) {
            setCompanyExpenses(mergedFinal);
            try {
              localStorage.setItem(expenseStorageKey, JSON.stringify(mergedFinal));
              localStorage.removeItem('amlak_company_expenses');
            } catch (e) {}
          }
        } else {
          // البيانات موجودة بالفعل في Firestore — تنظيف مفتاح الـ fallback القديم
          if (rawFallback) {
            try { localStorage.removeItem('amlak_company_expenses'); } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Expenses migration error:', err);
      }
    }

    migrateLocalExpenses();
  }, [activeCompanyId, expenseStorageKey]);

  const availableYears = useMemo(() => {
    const currentYr = new Date().getFullYear();
    const set = new Set([currentYr, currentYr - 1, currentYr + 1]);
    projects.forEach(p => {
      getProjectPayments(p).forEach(pay => {
        if (pay.date) {
          const yr = new Date(pay.date).getFullYear();
          if (!isNaN(yr)) set.add(yr);
        }
      });
      getProjectExpenses(p).forEach(exp => {
        if (exp.date) {
          const yr = new Date(exp.date).getFullYear();
          if (!isNaN(yr)) set.add(yr);
        }
      });
      if (p.startDate) {
        const yr = new Date(p.startDate).getFullYear();
        if (!isNaN(yr)) set.add(yr);
      }
    });
    companyExpenses.forEach(exp => {
      if (exp.date) {
        const yr = new Date(exp.date).getFullYear();
        if (!isNaN(yr)) set.add(yr);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [projects, companyExpenses]);

  const [filterYear, setFilterYear] = useState(() => availableYears[0] || new Date().getFullYear());

  const [expandedProject, setExpandedProject] = useState(null);

  function saveExpense(form) {
    const cId = activeCompanyId || 'comp_alain';
    const next = [{ ...form, id: 'exp-' + Date.now() }, ...companyExpenses];
    setCompanyExpenses(next);
    try { localStorage.setItem(expenseStorageKey, JSON.stringify(next)); } catch (e) {}
    syncExpensesToCloud(cId, next);
  }

  function deleteExpense(id) {
    const cId = activeCompanyId || 'comp_alain';
    const next = companyExpenses.filter(e => e.id !== id);
    setCompanyExpenses(next);
    try { localStorage.setItem(expenseStorageKey, JSON.stringify(next)); } catch (e) {}
    syncExpensesToCloud(cId, next);
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
      const payments = getProjectPayments(p);
      const collected = payments.reduce((s, x) => s + parseFloat(x.amount || 0), 0);
      totalCollected += collected;
      const expenses = getProjectExpenses(p);
      const exp = expenses.reduce((s, x) => s + parseFloat(x.amount || 0), 0);
      totalProjectExpenses += exp;
      if (budget > collected && p.status !== 'completed') {
        overdueProjects.push(p);
      }
    });

    const totalCompanyExpenses = companyExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalExpenses = totalProjectExpenses + totalCompanyExpenses;
    const grossProfit = totalCollected - totalExpenses;
    const profitMargin = totalCollected > 0 ? +((grossProfit / totalCollected) * 100).toFixed(1) : 0;
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
      getProjectPayments(p).forEach(pay => {
        if (!pay.date) return;
        const d = new Date(pay.date);
        if (d.getFullYear() === filterYear) {
          months[d.getMonth()].collected += parseFloat(pay.amount || 0);
        }
      });
      getProjectExpenses(p).forEach(exp => {
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

  /* ── Annual totals for the currently selected year ── */
  const selectedYearTotals = useMemo(() => {
    const totalCollected = monthlyData.reduce((s, m) => s + m.collected, 0);
    const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
    const profit = totalCollected - totalExpenses;
    const margin = totalCollected > 0 ? +((profit / totalCollected) * 100).toFixed(1) : 0;
    return { totalCollected, totalExpenses, profit, margin };
  }, [monthlyData]);

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
      map[e.category || 'أخرى'] = (map[e.category || 'أخرى'] || 0) + parseFloat(e.amount || 0);
    });
    projects.forEach(p => {
      getProjectExpenses(p).forEach(e => {
        const cat = e.category || 'مصاريف موقع';
        map[cat] = (map[cat] || 0) + parseFloat(e.amount || 0);
      });
    });
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [projects, companyExpenses]);

  /* ── Tab buttons ── */
  const tabs = [
    { key: 'overview',   label: 'نظرة عامة',         shortLabel: 'عامة',   icon: BarChart2 },
    { key: 'monthly',    label: 'التحليل الشهري',     shortLabel: 'شهري',   icon: Calendar },
    { key: 'quarterly',  label: 'الربع سنوي',         shortLabel: 'ربعي',   icon: PieIcon },
    { key: 'expenses',   label: 'سجل المصروفات',      shortLabel: 'مصروفات',icon: FileText },
  ];

  const currentQuarter = Math.floor(new Date().getMonth() / 3);

  return (
    <div className="grid tab-fade company-finance-page" style={{ gap: 16, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>

      {/* ── Tab Bar ── */}
      <div style={{
        background: 'var(--card)', borderRadius: 14,
        border: '1px solid var(--border)', padding: 4,
        display: 'flex', gap: 4, overflowX: 'auto',
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        width: '100%', maxWidth: '100%', boxSizing: 'border-box'
      }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: '1 1 0', minWidth: 'max-content',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: 'Cairo', fontWeight: 700, whiteSpace: 'nowrap', transition: 'all 0.2s',
                background: isActive ? '#0F172A' : 'transparent',
                color: isActive ? '#fff' : 'var(--muted)',
                boxShadow: 'none',
                fontSize: 12,
              }}>
              <Icon size={13} />
              <span className="finance-tab-label-full">{t.label}</span>
              <span className="finance-tab-label-short">{t.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* ── Actions Bar ── */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%', boxSizing: 'border-box'
      }}>
        <select value={filterYear} onChange={e => setFilterYear(+e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontFamily: 'Cairo', fontSize: 12, flexShrink: 0 }}>
          {availableYears.map(y => <option key={y} value={y}>سنة {y}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}
          style={{ fontSize: 12, padding: '8px 14px', flex: 1, minWidth: 120, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={14} /> مصروف جديد
        </button>
        <button className="btn" onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--ink)', fontSize: 12, padding: '8px 12px', flexShrink: 0 }}>
          <Printer size={14} /> طباعة
        </button>
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
            background: 'var(--card)', borderRadius: 12, padding: '18px 20px',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5 }}>
                <TrendingUp size={17} color="#1877F2" /> مؤشر الصحة المالية للشركة
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
            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ margin: '0 0 14px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <AlertCircle size={17} color="#DC2626" /> مشاريع بها مستحقات متأخرة
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
          {/* Summary KPIs for selected year */}
          <div className="company-finance-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <KPICard label={`إجمالي المحصّل (${filterYear})`} value={money(selectedYearTotals.totalCollected)}
              icon={ArrowDownRight} color="#10B981" sub={`تدفقات ${filterYear}`} />
            <KPICard label={`إجمالي المصروفات (${filterYear})`} value={money(selectedYearTotals.totalExpenses)}
              icon={ArrowUpRight} color="#EF4444" sub={`مصاريف ${filterYear}`} />
            <KPICard label={`صافي الربح (${filterYear})`} value={money(selectedYearTotals.profit)}
              icon={TrendingUp} color={selectedYearTotals.profit >= 0 ? '#10B981' : '#EF4444'}
              sub={`هامش ربح ${selectedYearTotals.margin}%`} />
            <KPICard label={`هامش الربح (${filterYear})`} value={`${selectedYearTotals.margin}%`}
              icon={Percent} color="#6366F1" sub={selectedYearTotals.profit >= 0 ? 'معدل صحي' : 'يحتاج مراجعة'} />
          </div>

          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5 }}>
              <Calendar size={17} color="#6366F1" /> التدفق المالي الشهري — {filterYear}
            </h3>
            <div dir="ltr" style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
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

          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5 }}>
              <TrendingUp size={17} color="#6366F1" /> منحنى صافي الربح الشهري
            </h3>
            <div dir="ltr" style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
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
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ margin: '0 0 14px', color: 'var(--ink)', fontSize: 14 }}>جدول الأرقام الشهرية — {filterYear}</h3>
            <div className="finance-table-wrapper" style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="data-table" style={{ minWidth: 520 }}>
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
                    <td>الإجمالي ({filterYear})</td>
                    <td style={{ color: '#10B981', fontFamily: 'monospace' }}>{money(selectedYearTotals.totalCollected)}</td>
                    <td style={{ color: '#EF4444', fontFamily: 'monospace' }}>{money(selectedYearTotals.totalExpenses)}</td>
                    <td style={{ color: selectedYearTotals.profit >= 0 ? '#10B981' : '#EF4444', fontFamily: 'monospace' }}>{money(selectedYearTotals.profit)}</td>
                    <td style={{ color: '#6366F1' }}>{selectedYearTotals.totalCollected > 0 ? selectedYearTotals.margin + '%' : '—'}</td>
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
          {/* Summary KPIs for selected year */}
          <div className="company-finance-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <KPICard label={`إجمالي المحصّل (${filterYear})`} value={money(selectedYearTotals.totalCollected)}
              icon={ArrowDownRight} color="#10B981" sub={`تدفقات ${filterYear}`} />
            <KPICard label={`إجمالي المصروفات (${filterYear})`} value={money(selectedYearTotals.totalExpenses)}
              icon={ArrowUpRight} color="#EF4444" sub={`مصاريف ${filterYear}`} />
            <KPICard label={`صافي الربح (${filterYear})`} value={money(selectedYearTotals.profit)}
              icon={TrendingUp} color={selectedYearTotals.profit >= 0 ? '#10B981' : '#EF4444'}
              sub={`هامش ربح ${selectedYearTotals.margin}%`} />
            <KPICard label={`هامش الربح (${filterYear})`} value={`${selectedYearTotals.margin}%`}
              icon={Percent} color="#6366F1" sub={selectedYearTotals.profit >= 0 ? 'معدل صحي' : 'يحتاج مراجعة'} />
          </div>

          <div className="quarterly-cards-grid" style={{ gap: 12 }}>
            {quarterlyData.map((q, i) => {
              const qMargin = q.collected > 0 ? ((q.profit / q.collected) * 100).toFixed(1) : '—';
              return (
                <div key={i} style={{
                  background: 'var(--card)', borderRadius: 12, padding: '14px 16px',
                  border: `1px solid ${i === currentQuarter ? '#0F172A' : 'var(--border)'}`,
                  position: 'relative', boxShadow: 'var(--shadow-sm)', minWidth: 0
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{q.name}</span>
                    {i === currentQuarter && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700,
                        background: '#0F172A', color: 'white', padding: '2px 8px', borderRadius: 20
                      }}>الحالي</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>محصّل</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#10B981', fontSize: 12.5 }}>{money(q.collected)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>مصروفات</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#EF4444', fontSize: 12.5 }}>{money(q.expenses)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>صافي الربح</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: q.profit >= 0 ? '#10B981' : '#EF4444' }}>{money(q.profit)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5 }}>
                      <span style={{ color: 'var(--muted)' }}>هامش الربح</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: 12, fontWeight: 700,
                        background: qMargin !== '—' && parseFloat(qMargin) >= 15 ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                        color: qMargin !== '—' && parseFloat(qMargin) >= 15 ? '#10B981' : '#6366F1'
                      }}>{qMargin !== '—' ? `${qMargin}%` : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--ink)', fontSize: 14.5 }}>مقارنة الأرباع — {filterYear}</h3>
            <div dir="ltr" style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
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
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: 13.5 }}>التقرير المالي الربع سنوي — {filterYear}</h3>
              <button className="btn btn-primary" onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '5px 12px' }}>
                <Printer size={13} /> طباعة
              </button>
            </div>

            <div className="finance-table-wrapper" style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="data-table" style={{ minWidth: 480 }}>
                <thead>
                  <tr>
                    <th>البند</th>
                    {QUARTERS.map(q => <th key={q}>{q}</th>)}
                    <th>إجمالي العام</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'إجمالي المحصّل', key: 'collected', totalKey: 'totalCollected', color: '#10B981' },
                    { label: 'إجمالي المصروفات', key: 'expenses', totalKey: 'totalExpenses', color: '#EF4444' },
                    { label: 'صافي الربح', key: 'profit', totalKey: 'profit', color: '#6366F1' },
                  ].map(row => (
                    <tr key={row.key}>
                      <td style={{ fontWeight: 700, color: row.color }}>{row.label}</td>
                      {quarterlyData.map((q, i) => (
                        <td key={i} style={{ fontFamily: 'monospace', fontWeight: 700, color: row.color }}>{money(q[row.key])}</td>
                      ))}
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: row.color }}>
                        {money(selectedYearTotals[row.totalKey])}
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
                      {selectedYearTotals.totalCollected > 0 ? selectedYearTotals.margin + '%' : '—'}
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
