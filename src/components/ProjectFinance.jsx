import React, { useState } from 'react';
import {
  Wallet, Plus, ArrowDownRight, ArrowUpRight, CheckCircle2,
  Clock, Trash2, Bell, ChevronDown, ChevronUp, DollarSign
} from 'lucide-react';
import { fmtDate, todayISO, money } from '../utils/helpers';

const PAYMENT_MILESTONES_DEFAULT = [
  { label: 'دفعة البداية (مقدم)', pct: 25 },
  { label: 'دفعة المرحلة الأولى (أعمال التأسيس)', pct: 25 },
  { label: 'دفعة المرحلة الثانية (دهانات وتشطيبات)', pct: 30 },
  { label: 'دفعة التسليم النهائي', pct: 20 },
];

const DAYS_WARNING = 7;

export default function ProjectFinance({ project, onUpdate }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState('payment');
  const [formData, setFormData] = useState({ amount: '', date: todayISO(), description: '', category: 'دفعات نقدية' });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ label: '', amount: '', dueDate: '', note: '' });
  const [expandedSection, setExpandedSection] = useState('milestones');

  const payments = project.clientPayments || [];
  const expenses = project.expenses || [];
  const milestones = project.paymentMilestones || [];
  const budget = parseFloat(project.budget) || 0;

  const totalPaid = payments.reduce((a, c) => a + parseFloat(c.amount || 0), 0);
  const totalSpent = expenses.reduce((a, c) => a + parseFloat(c.amount || 0), 0);
  const balance = totalPaid - totalSpent;
  const budgetProgress = budget > 0 ? (totalSpent / budget) * 100 : 0;

  const milestoneCollected = milestones
    .filter(m => m.status === 'collected')
    .reduce((a, m) => a + parseFloat(m.amount || 0), 0);
  const milestonePending = milestones
    .filter(m => m.status !== 'collected')
    .reduce((a, m) => a + parseFloat(m.amount || 0), 0);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const urgentMilestones = milestones.filter(m => {
    if (m.status === 'collected' || !m.dueDate) return false;
    const d = new Date(m.dueDate); d.setHours(0, 0, 0, 0);
    return Math.round((d - today) / 86400000) <= DAYS_WARNING;
  });

  function handleSave() {
    if (!formData.amount || !formData.description) return;
    const entry = { ...formData, id: 'fin-' + Date.now() };
    if (type === 'payment') onUpdate({ clientPayments: [entry, ...payments] });
    else onUpdate({ expenses: [entry, ...expenses] });
    setShowAddForm(false);
    setFormData({ amount: '', date: todayISO(), description: '', category: 'دفعات نقدية' });
  }

  function addMilestone() {
    if (!milestoneForm.label || !milestoneForm.amount) return;
    onUpdate({
      paymentMilestones: [...milestones, { id: 'ms-' + Date.now(), ...milestoneForm, status: 'pending' }]
    });
    setMilestoneForm({ label: '', amount: '', dueDate: '', note: '' });
    setShowMilestoneForm(false);
  }

  function autoFillMilestones() {
    if (!budget) { alert('يرجى تحديد ميزانية المشروع أولاً'); return; }
    const auto = PAYMENT_MILESTONES_DEFAULT.map((m, i) => ({
      id: 'ms-auto-' + i + '-' + Date.now(),
      label: m.label,
      amount: Math.round((budget * m.pct) / 100),
      dueDate: '',
      note: `${m.pct}% من قيمة العقد`,
      status: 'pending',
    }));
    onUpdate({ paymentMilestones: auto });
  }

  function collectMilestone(id) {
    const ms = milestones.find(m => m.id === id);
    const nextMs = milestones.map(m =>
      m.id === id ? { ...m, status: 'collected', collectedDate: todayISO() } : m
    );
    const updates = { paymentMilestones: nextMs };
    if (ms) {
      const entry = {
        id: 'fin-' + Date.now(),
        amount: ms.amount,
        date: todayISO(),
        description: ms.label,
        category: 'دفعات نقدية',
      };
      updates.clientPayments = [entry, ...payments];
    }
    onUpdate(updates);
  }

  function deleteMilestone(id) {
    onUpdate({ paymentMilestones: milestones.filter(m => m.id !== id) });
  }

  function getMilestoneStatus(m) {
    if (m.status === 'collected')
      return { label: 'محصّلة', color: '#16A34A', bg: '#F0FDF4' };
    if (!m.dueDate)
      return { label: 'معلّقة', color: '#64748B', bg: '#F8FAFC' };
    const d = new Date(m.dueDate); d.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    if (diff < 0)
      return { label: `متأخرة ${Math.abs(diff)} يوم`, color: '#DC2626', bg: '#FEF2F2' };
    if (diff <= DAYS_WARNING)
      return { label: `مستحقة خلال ${diff} يوم`, color: '#D97706', bg: '#FFFBEB' };
    return { label: `مستحقة ${fmtDate(m.dueDate)}`, color: '#334155', bg: '#F1F5F9' };
  }

  const setMF = (k, v) => setMilestoneForm(f => ({ ...f, [k]: v }));
  const toggle = sec => setExpandedSection(s => s === sec ? null : sec);

  return (
    <div className="grid" style={{ gap: 20 }}>

      {/* ── KPI Cards ── */}
      <div className="grid kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <ArrowDownRight size={18} color="#64748B" />
          </div>
          <div className="label">إجمالي المقبوضات</div>
          <div className="value">{money(totalPaid)}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <ArrowUpRight size={18} color="#64748B" />
          </div>
          <div className="label">إجمالي المصروفات</div>
          <div className="value">{money(totalSpent)}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <Wallet size={18} color="#64748B" />
          </div>
          <div className="label">الرصيد المتبقي (السيولة)</div>
          <div className="value" style={{ color: balance < 0 ? 'var(--danger)' : 'var(--ink)' }}>
            {money(balance)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <Clock size={18} color="#64748B" />
          </div>
          <div className="label">مستحقات لم تُحصَّل</div>
          <div className="value">{money(milestonePending)}</div>
        </div>
      </div>

      {/* ── Urgent Payment Alert Banner ── */}
      {urgentMilestones.length > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1.5px solid rgba(245,158,11,0.4)',
          borderRadius: 14, padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Bell size={16} color="#F59E0B" />
            <span style={{ fontWeight: 800, color: '#92400E', fontSize: 13 }}>
              تنبيه: {urgentMilestones.length} دفعة مستحقة أو متأخرة!
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {urgentMilestones.map(m => (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap',
                gap: 8, padding: '10px 14px', background: 'rgba(245,158,11,0.12)',
                borderRadius: 10
              }}>
                <div style={{ minWidth: 140 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', display: 'block' }}>{m.label}</span>
                  {m.dueDate && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      موعدها: {fmtDate(m.dueDate)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#F59E0B', fontSize: 13 }}>
                    {money(m.amount)}
                  </span>
                  <button
                    onClick={() => collectMilestone(m.id)}
                    style={{
                      background: '#10B981', color: 'white', border: 'none',
                      borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700
                    }}
                  >
                    تحصيل ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Budget Progress Bar ── */}
      <div className="panel" style={{ padding: '18px 20px' }}>
        <h4 style={{ margin: '0 0 12px', color: 'var(--ink)', fontSize: 14 }}>مؤشر الميزانية التقديرية</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
          <span style={{ color: 'var(--muted)' }}>المنصرف: {money(totalSpent)}</span>
          <span style={{ color: 'var(--ink)' }}>الميزانية: {budget > 0 ? money(budget) : 'غير محددة'}</span>
        </div>
        <div className="bar-track" style={{ height: 10, borderRadius: 6 }}>
          <div
            className="bar-fill"
            style={{
              width: `${Math.min(budgetProgress, 100)}%`,
              background: budgetProgress > 90 ? 'var(--danger)' : budgetProgress > 75 ? 'var(--amber)' : 'var(--teal)'
            }}
          />
        </div>
      </div>

      {/* ══ MILESTONE PAYMENTS PANEL ══ */}
      <div className="panel" style={{ padding: '20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => toggle('milestones')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <DollarSign size={18} color="#6366F1" />
            <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: 15 }}>
              جدول دفعات العميل
              <span style={{
                fontSize: 11, fontWeight: 600,
                background: 'rgba(99,102,241,0.1)', color: '#6366F1',
                padding: '2px 8px', borderRadius: 20, marginRight: 6
              }}>
                {milestones.length} دفعة
              </span>
            </h3>
            {expandedSection === 'milestones'
              ? <ChevronUp size={16} color="var(--muted)" />
              : <ChevronDown size={16} color="var(--muted)" />}
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {milestones.length === 0 && (
              <button
                onClick={autoFillMilestones}
                className="btn"
                style={{ fontSize: 11, padding: '6px 10px', background: 'rgba(99,102,241,0.1)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                ✨ توليد تلقائي
              </button>
            )}
            <button
              onClick={() => setShowMilestoneForm(true)}
              className="btn btn-primary"
              style={{ fontSize: 11, padding: '6px 12px' }}
            >
              <Plus size={14} /> إضافة دفعة
            </button>
          </div>
        </div>

        {expandedSection === 'milestones' && (
          <>
            {showMilestoneForm && (
              <div style={{
                background: 'var(--bg)', padding: 14, borderRadius: 12,
                border: '1px solid var(--border)', marginBottom: 16,
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'flex-end'
              }}>
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 3 }}>اسم الدفعة / المرحلة</label>
                  <input type="text" value={milestoneForm.label}
                    onChange={e => setMF('label', e.target.value)}
                    placeholder="مثال: دفعة البداية..." />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 3 }}>المبلغ</label>
                  <input type="number" value={milestoneForm.amount}
                    onChange={e => setMF('amount', e.target.value)}
                    placeholder="0" min="0" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 3 }}>تاريخ الاستحقاق</label>
                  <input type="date" value={milestoneForm.dueDate}
                    onChange={e => setMF('dueDate', e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 3 }}>ملاحظة / شرط</label>
                  <input type="text" value={milestoneForm.note}
                    onChange={e => setMF('note', e.target.value)}
                    placeholder="شرط التحصيل أو الملاحظة..." />
                </div>
                <div style={{ display: 'flex', gap: 8, gridColumn: '1 / -1', marginTop: 4 }}>
                  <button className="btn btn-primary" onClick={addMilestone} style={{ flex: 1 }}>حفظ الدفعة</button>
                  <button className="btn btn-ghost" onClick={() => setShowMilestoneForm(false)}>إلغاء</button>
                </div>
              </div>
            )}

            {milestones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
                <DollarSign size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 13 }}>لا توجد دفعات مضافة بعد.</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  اضغط <strong>"✨ توليد تلقائي"</strong> لتقسيم الميزانية على 4 مراحل تلقائياً.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Collection Progress Bar */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: 'var(--muted)' }}>محصّل: {money(milestoneCollected)}</span>
                    <span style={{ color: 'var(--muted)' }}>
                      الإجمالي: {money(milestoneCollected + milestonePending)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: '#2563EB',
                      width: `${(milestoneCollected + milestonePending) > 0
                        ? (milestoneCollected / (milestoneCollected + milestonePending)) * 100
                        : 0}%`,
                      transition: 'width 0.6s ease'
                    }} />
                  </div>
                </div>

                {milestones.map((m, idx) => {
                  const st = getMilestoneStatus(m);
                  return (
                    <div key={m.id} className="milestone-item-card" style={{
                      border: `1.5px solid ${st.color}30`, background: st.bg,
                    }}>
                      <div className="milestone-item-header">
                        <div className="milestone-item-main">
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                            background: st.color + '20', color: st.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 12
                          }}>
                            {m.status === 'collected' ? <CheckCircle2 size={15} /> : idx + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}>
                              {m.label}
                            </div>
                            {m.note && (
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.note}</div>
                            )}
                            {m.collectedDate && (
                              <div style={{ fontSize: 10.5, color: '#10B981', fontWeight: 600, marginTop: 2 }}>
                                ✅ تم التحصيل: {fmtDate(m.collectedDate)}
                              </div>
                            )}
                          </div>
                        </div>

                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                          background: st.color + '20', color: st.color,
                          whiteSpace: 'nowrap', flexShrink: 0
                        }}>
                          {st.label}
                        </span>
                      </div>

                      <div className="milestone-item-bottom">
                        <span style={{
                          fontFamily: 'monospace', fontWeight: 800,
                          color: st.color, fontSize: 14
                        }}>
                          {money(m.amount)}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {m.status !== 'collected' && (
                            <button
                              onClick={() => collectMilestone(m.id)}
                              style={{
                                background: '#10B981', color: 'white', border: 'none',
                                borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                                fontSize: 11.5, fontWeight: 700
                              }}
                              title="تسجيل تحصيل هذه الدفعة"
                            >
                              تحصيل ✓
                            </button>
                          )}

                          <button
                            onClick={() => deleteMilestone(m.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ TRANSACTIONS PANEL ══ */}
      <div className="panel" style={{ padding: '20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => toggle('transactions')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Wallet size={18} color="var(--amber)" />
            <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: 15 }}>سجل المعاملات المالية</h3>
            {expandedSection === 'transactions'
              ? <ChevronUp size={16} color="var(--muted)" />
              : <ChevronDown size={16} color="var(--muted)" />}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)} style={{ fontSize: 11, padding: '6px 12px' }}>
            <Plus size={14} /> إضافة معاملة
          </button>
        </div>

        {expandedSection === 'transactions' && (
          <>
            {showAddForm && (
              <div style={{
                background: 'var(--bg)', padding: 14, borderRadius: 12,
                border: '1px solid var(--border)', marginBottom: 16,
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'flex-end'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 3 }}>نوع المعاملة</label>
                  <select value={type} onChange={e => setType(e.target.value)}>
                    <option value="payment">مقبوضات (من العميل)</option>
                    <option value="expense">مصروفات (نفقات الموقع)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 3 }}>المبلغ</label>
                  <input type="number" value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 3 }}>البيان / الوصف</label>
                  <input type="text" value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="مثال: دفعة تحت الحساب، أو شراء أسمنت..." />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 3 }}>التاريخ</label>
                  <input type="date" value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 8, gridColumn: '1 / -1', marginTop: 4 }}>
                  <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>حفظ المعاملة</button>
                  <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>إلغاء</button>
                </div>
              </div>
            )}

            <div className="finance-transactions-grid">
              <div>
                <h4 style={{ color: 'var(--teal)', marginBottom: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowDownRight size={16} /> المقبوضات ({payments.length})
                </h4>
                {payments.length === 0
                  ? <p style={{ color: 'var(--muted)', fontSize: 12 }}>لا توجد مقبوضات مسجلة.</p>
                  : (
                    <div className="finance-table-wrapper">
                      <table className="data-table">
                        <thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead>
                        <tbody>
                          {payments.map(p => (
                            <tr key={p.id}>
                              <td style={{ fontSize: 11 }}>{fmtDate(p.date)}</td>
                              <td style={{ fontSize: 12 }}>{p.description}</td>
                              <td style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 12 }}>+{money(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
              <div>
                <h4 style={{ color: 'var(--danger)', marginBottom: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowUpRight size={16} /> المصروفات ({expenses.length})
                </h4>
                {expenses.length === 0
                  ? <p style={{ color: 'var(--muted)', fontSize: 12 }}>لا توجد مصروفات مسجلة.</p>
                  : (
                    <div className="finance-table-wrapper">
                      <table className="data-table">
                        <thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead>
                        <tbody>
                          {expenses.map(e => (
                            <tr key={e.id}>
                              <td style={{ fontSize: 11 }}>{fmtDate(e.date)}</td>
                              <td style={{ fontSize: 12 }}>{e.description}</td>
                              <td style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 12 }}>-{money(e.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
