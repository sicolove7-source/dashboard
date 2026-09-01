import React, { useState, useMemo, useEffect } from 'react';
import {
  HardHat, FileText, CheckCircle2, Clock, AlertTriangle, Plus, Search,
  X, Phone, MessageSquare, Star, Trash2, Pencil, Printer, Download,
  TrendingUp, ShieldCheck, ChevronDown, ChevronUp, DollarSign,
  Building2, Users, Calendar, Award, Filter, ExternalLink, ArrowRight
} from 'lucide-react';
import { getGlobalCurrency } from '../utils/helpers';
import {
  SUBCONTRACTOR_SPECIALTIES,
  SEED_SUBCONTRACTORS,
  SEED_WORK_ORDERS,
  SEED_EXTRACTS
} from '../utils/constants';

const STORE_SUBCONTRACTORS = 'db-subcontractors-v1';
const STORE_WORK_ORDERS     = 'db-subcontractor-orders-v1';
const STORE_EXTRACTS        = 'db-subcontractor-extracts-v1';

function loadOrSeed(key, seed) {
  try {
    const v = localStorage.getItem(key);
    if (v) return JSON.parse(v);
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  } catch {
    return seed;
  }
}

function saveLS(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// ─── Status Badges ───
function StatusBadge({ status, type = 'contractor' }) {
  const meta = {
    // Contractor statuses
    active: { label: 'نشط ومعتمد', bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', icon: CheckCircle2 },
    busy:   { label: 'مشغول بموقع', bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', icon: Clock },
    inactive:{ label: 'غير نشط',    bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', icon: AlertTriangle },
    
    // Work Order statuses
    in_progress: { label: 'جاري التنفيذ', bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', icon: Clock },
    completed:   { label: 'مكتمل ومسلّم', bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', icon: CheckCircle2 },
    draft:       { label: 'مسودة عقد',    bg: 'rgba(148, 163, 184, 0.12)', color: '#94A3B8', icon: FileText },

    // Extract statuses
    technical_approved: { label: 'معتمد فنياً', bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', icon: CheckCircle2 },
    finance_approved:   { label: 'جاهز للصرف',  bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', icon: Clock },
    paid:               { label: 'تم الصرف',     bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', icon: CheckCircle2 },
  };

  const item = meta[status] || { label: status, bg: 'rgba(148, 163, 184, 0.12)', color: '#94A3B8', icon: Clock };
  const Icon = item.icon;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      borderRadius: 16,
      background: item.bg,
      color: item.color,
      fontSize: 11,
      fontWeight: 700
    }}>
      <Icon size={12} />
      {item.label}
    </span>
  );
}

function StarRating({ value, onChange, size = 16 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={onChange ? () => onChange(n) : undefined}
          style={{ cursor: onChange ? 'pointer' : 'default', color: n <= value ? '#F59E0B' : 'var(--border)' }}
        >
          <Star size={size} fill={n <= value ? '#F59E0B' : 'none'} />
        </span>
      ))}
    </div>
  );
}

export default function SubcontractorsTab({ projects = [], userRole = 'owner', companySettings = null }) {
  const currency = getGlobalCurrency();

  // Primary Data
  const [subcontractors, setSubcontractors] = useState(() => loadOrSeed(STORE_SUBCONTRACTORS, SEED_SUBCONTRACTORS));
  const [workOrders, setWorkOrders]         = useState(() => loadOrSeed(STORE_WORK_ORDERS, SEED_WORK_ORDERS));
  const [extracts, setExtracts]             = useState(() => loadOrSeed(STORE_EXTRACTS, SEED_EXTRACTS));

  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState('contractors'); // 'contractors' | 'orders' | 'extracts' | 'guarantees'

  // Modals state
  const [showSubModal, setShowSubModal]       = useState(false);
  const [editingSub, setEditingSub]           = useState(null);

  const [showOrderModal, setShowOrderModal]   = useState(false);
  const [editingOrder, setEditingOrder]       = useState(null);

  const [showExtractModal, setShowExtractModal] = useState(false);
  const [editingExtract, setEditingExtract]   = useState(null);

  const [printWorkOrder, setPrintWorkOrder]   = useState(null);
  const [printExtract, setPrintExtract]       = useState(null);
  const [statementSub, setStatementSub]       = useState(null);

  // Search and filters
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');

  // Persist mutations
  const updateSubs = (next) => { setSubcontractors(next); saveLS(STORE_SUBCONTRACTORS, next); };
  const updateOrders = (next) => { setWorkOrders(next); saveLS(STORE_WORK_ORDERS, next); };
  const updateExts = (next) => { setExtracts(next); saveLS(STORE_EXTRACTS, next); };

  // ─── KPI Calculations ───
  const stats = useMemo(() => {
    const totalSubs = subcontractors.length;
    const activeOrders = workOrders.filter(w => w.status === 'in_progress').length;
    
    // Total value of all signed work orders
    const totalContractValue = workOrders.reduce((acc, wo) => {
      const sum = wo.items ? wo.items.reduce((s, it) => s + (Number(it.total) || (Number(it.quantity) * Number(it.unitPrice)) || 0), 0) : 0;
      return acc + sum;
    }, 0);

    // Total Extracts Paid
    const totalPaidExtracts = extracts.filter(e => e.status === 'paid').reduce((acc, e) => acc + (Number(e.netAmount) || 0), 0);

    // Total Retained Guarantees held
    const totalRetentionsHeld = extracts.reduce((acc, e) => acc + (Number(e.retentionAmount) || 0), 0);
    const totalRetentionsReleased = extracts.filter(e => e.retentionReleased).reduce((acc, e) => acc + (Number(e.retentionAmount) || 0), 0);
    const currentRetentions = totalRetentionsHeld - totalRetentionsReleased;

    // Pending Extracts waiting for payment
    const pendingExtractsValue = extracts.filter(e => e.status !== 'paid').reduce((acc, e) => acc + (Number(e.netAmount) || 0), 0);

    return {
      totalSubs,
      activeOrders,
      totalContractValue,
      totalPaidExtracts,
      currentRetentions,
      pendingExtractsValue
    };
  }, [subcontractors, workOrders, extracts]);

  // ─── Filtered Data ───
  const filteredSubcontractors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return subcontractors.filter(s => {
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.phone.includes(q) || (s.managerName && s.managerName.toLowerCase().includes(q));
      const matchSpec = !filterSpecialty || s.specialty === filterSpecialty;
      const matchSt = !filterStatus || s.status === filterStatus;
      return matchQ && matchSpec && matchSt;
    });
  }, [subcontractors, searchTerm, filterSpecialty, filterStatus]);

  const filteredWorkOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return workOrders.filter(wo => {
      const matchQ = !q || wo.title.toLowerCase().includes(q) || wo.code.toLowerCase().includes(q) || wo.subcontractorName.toLowerCase().includes(q) || wo.projectName.toLowerCase().includes(q);
      const matchProj = !filterProject || wo.projectId === filterProject;
      const matchSpec = !filterSpecialty || wo.specialty === filterSpecialty;
      const matchSt = !filterStatus || wo.status === filterStatus;
      return matchQ && matchProj && matchSpec && matchSt;
    });
  }, [workOrders, searchTerm, filterProject, filterSpecialty, filterStatus]);

  const filteredExtracts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return extracts.filter(e => {
      const matchQ = !q || e.workOrderCode.toLowerCase().includes(q) || e.subcontractorName.toLowerCase().includes(q) || e.projectName.toLowerCase().includes(q);
      const matchProj = !filterProject || e.projectId === filterProject;
      const matchSt = !filterStatus || e.status === filterStatus;
      return matchQ && matchProj && matchSt;
    });
  }, [extracts, searchTerm, filterProject, filterStatus]);

  // ─── Handler: Delete Subcontractor ───
  const handleDeleteSub = (id) => {
    if (window.confirm('هل أنت متأكد من حذف مقاول الباطن؟')) {
      updateSubs(subcontractors.filter(s => s.id !== id));
    }
  };

  // ─── Handler: Delete Work Order ───
  const handleDeleteOrder = (id) => {
    if (window.confirm('هل أنت متأكد من حذف أمر العمل؟')) {
      updateOrders(workOrders.filter(w => w.id !== id));
    }
  };

  // ─── Handler: Delete Extract ───
  const handleDeleteExtract = (id) => {
    if (window.confirm('هل أنت متأكد من حذف المستخلص؟')) {
      updateExts(extracts.filter(e => e.id !== id));
    }
  };

  // ─── Handler: Release Retention Guarantee ───
  const handleReleaseRetention = (extractId) => {
    if (window.confirm('هل تم الانتهاء من فترة الضمان والتسليم النهائي وصرف مبلغ التأمين المحتجز للمقاول؟')) {
      updateExts(extracts.map(e => e.id === extractId ? { ...e, retentionReleased: true, retentionReleasedAt: new Date().toISOString().slice(0, 10) } : e));
    }
  };

  // ─── Handler: Quick Pay Extract ───
  const handlePayExtract = (extractId) => {
    const paymentMethod = window.prompt('طريقة السداد (نقداً من الخزينة / تحويل بنكي / شيك):', 'نقداً من الخزينة');
    if (paymentMethod !== null) {
      updateExts(extracts.map(e => e.id === extractId ? {
        ...e,
        status: 'paid',
        paidAt: new Date().toISOString().slice(0, 10),
        paidAmount: e.netAmount,
        paymentMethod: paymentMethod || 'نقداً'
      } : e));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* ─── Header & Top Actions ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        background: 'var(--panel)',
        padding: '20px 24px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <HardHat size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                إدارة مقاولي الباطن والمستخلصات
              </h2>
              <span style={{
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#D97706',
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700
              }}>
                نظام المقاولات والأعمال الميدانية
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              إسناد أوامر العمل، إصدار المستخلصات التراكمية، حساب نسب الإنجاز، وإدارة الضمانات المحتجزة
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingSub(null); setShowSubModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F59E0B', borderColor: '#F59E0B' }}
          >
            <Plus size={16} />
            <span>إضافة مقاول باطن</span>
          </button>
          
          <button
            className="btn"
            onClick={() => { setEditingOrder(null); setShowOrderModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <FileText size={16} color="#6366F1" />
            <span>أمر عمل جديد</span>
          </button>

          <button
            className="btn"
            onClick={() => { setEditingExtract(null); setShowExtractModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <TrendingUp size={16} color="#10B981" />
            <span>إصدار مستخلص</span>
          </button>
        </div>
      </div>

      {/* ─── KPI Summary Cards ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16
      }}>
        <div className="panel" style={{ padding: 18, borderRight: '4px solid #F59E0B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 12 }}>
            <span>إجمالي المقاولين</span>
            <Users size={18} color="#F59E0B" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, color: 'var(--ink)' }}>
            {stats.totalSubs} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>مقاول</span>
          </div>
          <div style={{ fontSize: 11, color: '#10B981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{stats.activeOrders} أمر عمل ساري حالياً</span>
          </div>
        </div>

        <div className="panel" style={{ padding: 18, borderRight: '4px solid #6366F1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 12 }}>
            <span>إجمالي قيمة الأعمال المسندة</span>
            <FileText size={18} color="#6366F1" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: 'var(--ink)' }}>
            {stats.totalContractValue.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>{currency}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            في جميع المشاريع ومواقع العمل
          </div>
        </div>

        <div className="panel" style={{ padding: 18, borderRight: '4px solid #10B981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 12 }}>
            <span>المستخلصات المنصرفة</span>
            <CheckCircle2 size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: '#10B981' }}>
            {stats.totalPaidExtracts.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>{currency}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            تم سدادها وإغلاقها محاسبياً
          </div>
        </div>

        <div className="panel" style={{ padding: 18, borderRight: '4px solid #EC4899' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 12 }}>
            <span>ضمان الأعمال المحتجز (تأمين)</span>
            <ShieldCheck size={18} color="#EC4899" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: '#EC4899' }}>
            {stats.currentRetentions.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>{currency}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            محتجز لحين التسليم النهائي (5-10%)
          </div>
        </div>

        <div className="panel" style={{ padding: 18, borderRight: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 12 }}>
            <span>مستحقات جارية معلقة للصرف</span>
            <Clock size={18} color="#3B82F6" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: '#3B82F6' }}>
            {stats.pendingExtractsValue.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>{currency}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            مستخلصات تحت المراجعة أو الاعتماد
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs & Search Bar ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        background: 'var(--panel)',
        padding: '14px 18px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { key: 'contractors', label: '👷‍♂️ دليل مقاولي الباطن', count: subcontractors.length },
            { key: 'orders',      label: '📜 أوامر العمل والعقود', count: workOrders.length },
            { key: 'extracts',    label: '📑 المستخلصات الهندسية', count: extracts.length },
            { key: 'guarantees',  label: '🔒 الضمانات المحتجزة',   count: extracts.filter(e => Number(e.retentionAmount) > 0).length }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSearchTerm(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                background: activeTab === t.key ? 'var(--amber)' : 'transparent',
                color: activeTab === t.key ? '#fff' : 'var(--muted)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: activeTab === t.key ? '0 4px 14px rgba(217, 119, 6, 0.35)' : 'none',
                transition: 'all .2s'
              }}
            >
              <span>{t.label}</span>
              <span style={{
                background: activeTab === t.key ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                padding: '2px 7px',
                borderRadius: 12,
                fontSize: 11
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={16} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="بحث بالاسم، الكود، الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingRight: 36, height: 38, fontSize: 13, width: '100%' }}
            />
          </div>

          {activeTab === 'contractors' && (
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="input"
              style={{ height: 38, fontSize: 12 }}
            >
              <option value="">جميع التخصصات</option>
              {SUBCONTRACTOR_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {(activeTab === 'orders' || activeTab === 'extracts') && (
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="input"
              style={{ height: 38, fontSize: 12 }}
            >
              <option value="">جميع مواقع العمل</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
            style={{ height: 38, fontSize: 12 }}
          >
            <option value="">جميع الحالات</option>
            {activeTab === 'contractors' && (
              <>
                <option value="active">نشط ومعتمد</option>
                <option value="busy">مشغول بموقع</option>
                <option value="inactive">غير نشط</option>
              </>
            )}
            {activeTab === 'orders' && (
              <>
                <option value="in_progress">جاري التنفيذ</option>
                <option value="completed">مكتمل ومسلّم</option>
                <option value="draft">مسودة عقد</option>
              </>
            )}
            {activeTab === 'extracts' && (
              <>
                <option value="paid">تم الصرف</option>
                <option value="finance_approved">جاهز للصرف</option>
                <option value="technical_approved">معتمد فنياً</option>
                <option value="draft">مسودة</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* ─── TAB 1: Subcontractors Directory ─── */}
      {activeTab === 'contractors' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 18
        }}>
          {filteredSubcontractors.map(sub => {
            const subOrders = workOrders.filter(w => w.subcontractorId === sub.id);
            const subExtracts = extracts.filter(e => e.subcontractorId === sub.id);
            const totalWorkAssigned = subOrders.reduce((acc, wo) => {
              const sum = wo.items?.reduce((s, it) => s + (Number(it.total) || (Number(it.quantity) * Number(it.unitPrice)) || 0), 0) || 0;
              return acc + sum;
            }, 0);
            const totalPaid = subExtracts.filter(e => e.status === 'paid').reduce((acc, e) => acc + (Number(e.netAmount) || 0), 0);
            const totalRetained = subExtracts.reduce((acc, e) => acc + (Number(e.retentionAmount) || 0), 0);
            const remaining = totalWorkAssigned - totalPaid;

            return (
              <div
                key={sub.id}
                className="panel"
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  borderTop: '3px solid #F59E0B',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                      {sub.name}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                      المسؤول: {sub.managerName || '—'}
                    </div>
                  </div>
                  <StatusBadge status={sub.status} type="contractor" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    color: '#6366F1',
                    padding: '3px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {sub.specialty}
                  </span>
                  <StarRating value={sub.rating || 4} size={14} />
                </div>

                {/* Info List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>الهاتف:</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)', direction: 'ltr' }}>{sub.phone}</span>
                  </div>
                  {sub.taxNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>السجل / البطاقة الضريبية:</span>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{sub.taxNumber}</span>
                    </div>
                  )}
                  {sub.bankAccount && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>البيانات البنكية:</span>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 11 }}>{sub.bankAccount}</span>
                    </div>
                  )}
                </div>

                {/* Financial Summary Pill */}
                <div style={{
                  background: 'rgba(0,0,0,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  fontSize: 11
                }}>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>إجمالي الأعمال المسندة</div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#6366F1' }}>
                      {totalWorkAssigned.toLocaleString()} {currency}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>المدفوع من المستخلصات</div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#10B981' }}>
                      {totalPaid.toLocaleString()} {currency}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>المتبقي في العقود</div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: remaining > 0 ? '#F59E0B' : 'var(--muted)' }}>
                      {remaining.toLocaleString()} {currency}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>ضمان الأعمال المحتجز</div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#EC4899' }}>
                      {totalRetained.toLocaleString()} {currency}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  paddingTop: 10,
                  borderTop: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a
                      href={`tel:${sub.phone}`}
                      className="btn"
                      title="اتصال هاتفي"
                      style={{ padding: '6px 10px', height: 32, borderRadius: 8 }}
                    >
                      <Phone size={14} color="#10B981" />
                    </a>
                    <a
                      href={`https://wa.me/20${sub.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      title="مراسلة واتساب فورية"
                      style={{ padding: '6px 10px', height: 32, borderRadius: 8, background: 'rgba(37, 211, 102, 0.1)', color: '#25D366' }}
                    >
                      <MessageSquare size={14} />
                    </a>
                    <button
                      className="btn"
                      onClick={() => setStatementSub(sub)}
                      title="كشف حساب المقاول"
                      style={{ padding: '6px 10px', height: 32, borderRadius: 8, fontSize: 11, fontWeight: 700 }}
                    >
                      <FileText size={14} />
                      <span>كشف الحساب</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn"
                      onClick={() => { setEditingSub(sub); setShowSubModal(true); }}
                      style={{ padding: '6px 10px', height: 32, borderRadius: 8 }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleDeleteSub(sub.id)}
                      style={{ padding: '6px 10px', height: 32, borderRadius: 8, color: '#EF4444' }}
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

      {/* ─── TAB 2: Work Orders & Contracts ─── */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredWorkOrders.map(order => {
            const orderExtracts = extracts.filter(e => e.workOrderId === order.id);
            const totalPaidForOrder = orderExtracts.filter(e => e.status === 'paid').reduce((acc, e) => acc + (Number(e.netAmount) || 0), 0);
            const orderTotal = order.items?.reduce((acc, it) => acc + (Number(it.total) || (Number(it.quantity) * Number(it.unitPrice)) || 0), 0) || 0;
            const progressPercent = orderTotal > 0 ? Math.min(100, Math.round((totalPaidForOrder / orderTotal) * 100)) : 0;

            return (
              <div
                key={order.id}
                className="panel"
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  borderRight: '4px solid #6366F1'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: '#6366F1',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontWeight: 800,
                        fontSize: 12,
                        fontFamily: 'monospace'
                      }}>
                        {order.code}
                      </span>
                      <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                        {order.title}
                      </h3>
                      <StatusBadge status={order.status} type="order" />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                      <span><strong>الموقع:</strong> {order.projectName}</span>
                      <span>•</span>
                      <span><strong>المقاول:</strong> {order.subcontractorName} ({order.specialty})</span>
                      <span>•</span>
                      <span><strong>المدة:</strong> من {order.startDate} إلى {order.endDate}</span>
                      <span>•</span>
                      <span><strong>ضمان الأعمال:</strong> {order.retentionRate || 5}%</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn"
                      onClick={() => setPrintWorkOrder(order)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                    >
                      <Printer size={15} />
                      <span>طباعة العقد</span>
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setEditingExtract({
                          workOrderId: order.id,
                          workOrderCode: order.code,
                          projectId: order.projectId,
                          projectName: order.projectName,
                          subcontractorId: order.subcontractorId,
                          subcontractorName: order.subcontractorName,
                          retentionRate: order.retentionRate || 5,
                        });
                        setShowExtractModal(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: '#10B981', borderColor: '#10B981' }}
                    >
                      <Plus size={15} />
                      <span>إصدار مستخلص</span>
                    </button>
                    <button
                      className="btn"
                      onClick={() => { setEditingOrder(order); setShowOrderModal(true); }}
                      style={{ padding: '6px 10px' }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleDeleteOrder(order.id)}
                      style={{ padding: '6px 10px', color: '#EF4444' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'right' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '8px 10px' }}>م</th>
                        <th style={{ padding: '8px 10px' }}>بيان بند الأعمال</th>
                        <th style={{ padding: '8px 10px' }}>الوحدة</th>
                        <th style={{ padding: '8px 10px' }}>الكمية</th>
                        <th style={{ padding: '8px 10px' }}>سعر الفئة</th>
                        <th style={{ padding: '8px 10px' }}>إجمالي القيمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((it, idx) => (
                        <tr key={it.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{it.description}</td>
                          <td style={{ padding: '8px 10px' }}>{it.unit}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>{it.quantity}</td>
                          <td style={{ padding: '8px 10px' }}>{Number(it.unitPrice).toLocaleString()} {currency}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 800, color: '#6366F1' }}>
                            {(Number(it.total) || (Number(it.quantity) * Number(it.unitPrice))).toLocaleString()} {currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Progress & Financial Bar */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  background: 'rgba(0,0,0,0.02)',
                  padding: '12px 16px',
                  borderRadius: 10
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                      <span>نسبة الصرف من العقد: <strong>{progressPercent}%</strong></span>
                      <span>المصروف: <strong>{totalPaidForOrder.toLocaleString()}</strong> من {orderTotal.toLocaleString()} {currency}</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${progressPercent}%`, height: '100%', background: '#10B981', transition: 'width .3s' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--muted)' }}>الدفعة المقدمة: </span>
                      <strong style={{ color: '#F59E0B' }}>{(order.advancePayment || 0).toLocaleString()} {currency}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--muted)' }}>المستخلصات المصدرة: </span>
                      <strong>{orderExtracts.length} مستخلص</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB 3: Subcontractor Extracts ─── */}
      {activeTab === 'extracts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredExtracts.map(extract => (
            <div
              key={extract.id}
              className="panel"
              style={{
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                borderRight: '4px solid #10B981'
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      background: '#10B981',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontWeight: 800,
                      fontSize: 12
                    }}>
                      مستخلص {extract.type === 'final' ? 'ختامي' : `جاري رقم ${extract.extractNumber || 1}`}
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                      أمر عمل: {extract.workOrderCode} — {extract.subcontractorName}
                    </h3>
                    <StatusBadge status={extract.status} type="extract" />
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                    <span><strong>الموقع:</strong> {extract.projectName}</span>
                    <span>•</span>
                    <span><strong>تاريخ المستخلص:</strong> {extract.date}</span>
                    <span>•</span>
                    <span><strong>الفترة:</strong> من {extract.periodFrom || extract.date} إلى {extract.periodTo || extract.date}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => setPrintExtract(extract)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                  >
                    <Printer size={15} />
                    <span>طباعة المستخلص</span>
                  </button>

                  {extract.status !== 'paid' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handlePayExtract(extract.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: '#10B981', borderColor: '#10B981' }}
                    >
                      <DollarSign size={15} />
                      <span>صرف المستخلص</span>
                    </button>
                  )}

                  <button
                    className="btn"
                    onClick={() => { setEditingExtract(extract); setShowExtractModal(true); }}
                    style={{ padding: '6px 10px' }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="btn"
                    onClick={() => handleDeleteExtract(extract.id)}
                    style={{ padding: '6px 10px', color: '#EF4444' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Items Breakdown */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 10px' }}>البند</th>
                      <th style={{ padding: '8px 10px' }}>الوحدة</th>
                      <th style={{ padding: '8px 10px' }}>كمية العقد</th>
                      <th style={{ padding: '8px 10px' }}>السابق</th>
                      <th style={{ padding: '8px 10px' }}>الحالي</th>
                      <th style={{ padding: '8px 10px' }}>الإجمالي</th>
                      <th style={{ padding: '8px 10px' }}>الفئة</th>
                      <th style={{ padding: '8px 10px' }}>القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extract.items?.map((it, idx) => (
                      <tr key={it.itemId || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{it.description}</td>
                        <td style={{ padding: '8px 10px' }}>{it.unit}</td>
                        <td style={{ padding: '8px 10px' }}>{it.contractQty}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{it.prevQty || 0}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#10B981' }}>{it.currentQty || 0}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{(Number(it.prevQty || 0) + Number(it.currentQty || 0))}</td>
                        <td style={{ padding: '8px 10px' }}>{Number(it.unitPrice).toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#6366F1' }}>
                          {(Number(it.totalAmount) || ((Number(it.prevQty || 0) + Number(it.currentQty || 0)) * Number(it.unitPrice))).toLocaleString()} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Deductions & Net Box */}
              <div style={{
                background: 'rgba(0,0,0,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '14px 18px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>إجمالي الأعمال المنفذة (Gross)</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>
                    {(Number(extract.grossAmount) || 0).toLocaleString()} {currency}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>استقطاع دفعة مقدمة (-)</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
                    {(Number(extract.advanceDeduction) || 0).toLocaleString()} {currency}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>ضمان أعمال {extract.retentionRate || 5}% (-)</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#EC4899', marginTop: 4 }}>
                    {(Number(extract.retentionAmount) || 0).toLocaleString()} {currency}
                  </div>
                </div>

                {Number(extract.penaltyDeduction) > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>غرامات / سلف أخرى (-)</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#EF4444', marginTop: 4 }}>
                      {(Number(extract.penaltyDeduction) || 0).toLocaleString()} {currency}
                    </div>
                  </div>
                )}

                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>صافي المبلغ المستحق للصرف</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#10B981', marginTop: 4 }}>
                    {(Number(extract.netAmount) || 0).toLocaleString()} {currency}
                  </div>
                </div>
              </div>

              {extract.notes && (
                <div style={{ fontSize: 12, color: 'var(--muted)', background: 'rgba(0,0,0,0.01)', padding: '8px 12px', borderRadius: 6 }}>
                  <strong>ملاحظات الاعتماد:</strong> {extract.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 4: Retained Guarantees (ضمانات الأعمال) ─── */}
      {activeTab === 'guarantees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  سجل الضمانات المحتجزة (تأمين الأعمال 5% - 10%)
                </h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
                  مبالغ التأمين المخصومة من مستخلصات المقاولين والمحتجزة حتى انتهاء فترة الضمان والتسليم النهائي
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 14px' }}>المقاول</th>
                    <th style={{ padding: '12px 14px' }}>الموقع / المشروع</th>
                    <th style={{ padding: '12px 14px' }}>أمر العمل</th>
                    <th style={{ padding: '12px 14px' }}>تاريخ المستخلص</th>
                    <th style={{ padding: '12px 14px' }}>نسبة الضمان</th>
                    <th style={{ padding: '12px 14px' }}>المبلغ المحتجز</th>
                    <th style={{ padding: '12px 14px' }}>حالة الضمان</th>
                    <th style={{ padding: '12px 14px' }}>إجراء الإفراج والصرف</th>
                  </tr>
                </thead>
                <tbody>
                  {extracts.filter(e => Number(e.retentionAmount) > 0).map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{e.subcontractorName}</td>
                      <td style={{ padding: '12px 14px' }}>{e.projectName}</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>{e.workOrderCode}</td>
                      <td style={{ padding: '12px 14px' }}>{e.date}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{e.retentionRate || 5}%</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#EC4899' }}>
                        {(Number(e.retentionAmount) || 0).toLocaleString()} {currency}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {e.retentionReleased ? (
                          <span style={{ color: '#10B981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={14} /> تم الإفراج والصرف ({e.retentionReleasedAt})
                          </span>
                        ) : (
                          <span style={{ color: '#F59E0B', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={14} /> محتجز لدى الشركة
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {!e.retentionReleased ? (
                          <button
                            className="btn"
                            onClick={() => handleReleaseRetention(e.id)}
                            style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '4px 12px',
                              borderRadius: 6
                            }}
                          >
                            إفراج وصرف التأمين
                          </button>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Add / Edit Subcontractor ─── */}
      {showSubModal && (
        <SubcontractorFormModal
          initial={editingSub}
          onClose={() => setShowSubModal(false)}
          onSave={(subData) => {
            if (editingSub) {
              updateSubs(subcontractors.map(s => s.id === editingSub.id ? { ...s, ...subData } : s));
            } else {
              updateSubs([{ id: 'sub_' + Date.now(), ...subData }, ...subcontractors]);
            }
            setShowSubModal(false);
          }}
        />
      )}

      {/* ─── MODAL: Add / Edit Work Order ─── */}
      {showOrderModal && (
        <WorkOrderFormModal
          initial={editingOrder}
          projects={projects}
          subcontractors={subcontractors}
          onClose={() => setShowOrderModal(false)}
          onSave={(orderData) => {
            if (editingOrder) {
              updateOrders(workOrders.map(w => w.id === editingOrder.id ? { ...w, ...orderData } : w));
            } else {
              const code = `WO-${new Date().getFullYear()}-${String(workOrders.length + 1).padStart(3, '0')}`;
              updateOrders([{ id: 'wo_' + Date.now(), code, ...orderData, createdAt: new Date().toISOString().slice(0, 10) }, ...workOrders]);
            }
            setShowOrderModal(false);
          }}
        />
      )}

      {/* ─── MODAL: Add / Edit Extract ─── */}
      {showExtractModal && (
        <ExtractFormModal
          initial={editingExtract}
          projects={projects}
          workOrders={workOrders}
          subcontractors={subcontractors}
          existingExtracts={extracts}
          onClose={() => setShowExtractModal(false)}
          onSave={(extData) => {
            if (editingExtract && editingExtract.id) {
              updateExts(extracts.map(e => e.id === editingExtract.id ? { ...e, ...extData } : e));
            } else {
              const countForOrder = extracts.filter(e => e.workOrderId === extData.workOrderId).length;
              updateExts([{ id: 'ext_' + Date.now(), extractNumber: countForOrder + 1, ...extData }, ...extracts]);
            }
            setShowExtractModal(false);
          }}
        />
      )}

      {/* ─── MODAL: Printable Work Order Contract ─── */}
      {printWorkOrder && (
        <PrintWorkOrderModal
          order={printWorkOrder}
          companySettings={companySettings}
          onClose={() => setPrintWorkOrder(null)}
        />
      )}

      {/* ─── MODAL: Printable Engineering Extract ─── */}
      {printExtract && (
        <PrintExtractModal
          extract={printExtract}
          companySettings={companySettings}
          onClose={() => setPrintExtract(null)}
        />
      )}

      {/* ─── MODAL: Statement of Account ─── */}
      {statementSub && (
        <SubStatementModal
          sub={statementSub}
          workOrders={workOrders.filter(w => w.subcontractorId === statementSub.id)}
          extracts={extracts.filter(e => e.subcontractorId === statementSub.id)}
          companySettings={companySettings}
          onClose={() => setStatementSub(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS: FORMS & PRINT MODALS
   ═══════════════════════════════════════════════════════════════════════════ */

// ── 1. Subcontractor Form Modal ──
function SubcontractorFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {
    name: '',
    managerName: '',
    specialty: SUBCONTRACTOR_SPECIALTIES[0],
    phone: '',
    taxNumber: '',
    nationalId: '',
    address: '',
    rating: 5,
    status: 'active',
    bankAccount: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      alert('يرجى كتابة اسم مقاول الباطن ورقم الهاتف.');
      return;
    }
    onSave(form);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h3>{initial ? 'تعديل بيانات مقاول الباطن' : 'إضافة مقاول باطن جديد'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">اسم المؤسسة / المقاول *</label>
              <input
                type="text"
                className="input"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: مؤسسة الأهرام للمحارة"
              />
            </div>
            <div>
              <label className="label">اسم المسؤول / الأسطى</label>
              <input
                type="text"
                className="input"
                value={form.managerName}
                onChange={e => setForm({ ...form, managerName: e.target.value })}
                placeholder="مثال: المعلم إبراهيم دسوقي"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">التخصص الرئيسي</label>
              <select
                className="input"
                value={form.specialty}
                onChange={e => setForm({ ...form, specialty: e.target.value })}
              >
                {SUBCONTRACTOR_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">رقم الهاتف / الواتساب *</label>
              <input
                type="text"
                className="input"
                required
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="01012345678"
                style={{ direction: 'ltr' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">الرقم القومي</label>
              <input
                type="text"
                className="input"
                value={form.nationalId}
                onChange={e => setForm({ ...form, nationalId: e.target.value })}
                placeholder="14 رقم"
              />
            </div>
            <div>
              <label className="label">السجل التجاري / البطاقة الضريبية</label>
              <input
                type="text"
                className="input"
                value={form.taxNumber}
                onChange={e => setForm({ ...form, taxNumber: e.target.value })}
                placeholder="إن وجد"
              />
            </div>
          </div>

          <div>
            <label className="label">العنوان / منطقة العمل</label>
            <input
              type="text"
              className="input"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="مثال: دمياط الجديدة - المنطقة المركزية"
            />
          </div>

          <div>
            <label className="label">البيانات البنكية أو المحفظة الإلكترونية</label>
            <input
              type="text"
              className="input"
              value={form.bankAccount}
              onChange={e => setForm({ ...form, bankAccount: e.target.value })}
              placeholder="مثال: بنك مصر - حساب رقم 12345 أو محفظة كاش"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">الحالة</label>
              <select
                className="input"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">نشط ومعتمد</option>
                <option value="busy">مشغول بموقع آخر</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
            <div>
              <label className="label">التقييم الفني</label>
              <div style={{ marginTop: 8 }}>
                <StarRating value={form.rating} onChange={r => setForm({ ...form, rating: r })} size={20} />
              </div>
            </div>
          </div>

          <div>
            <label className="label">ملاحظات والتزامات</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="ملاحظات حول جودة العمل والالتزام بالمواعيد..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#F59E0B', borderColor: '#F59E0B' }}>
              {initial ? 'حفظ التعديلات' : 'إضافة المقاول'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 2. Work Order Form Modal ──
function WorkOrderFormModal({ initial, projects, subcontractors, onClose, onSave }) {
  const [projectId, setProjectId] = useState(initial?.projectId || (projects[0]?.id || ''));
  const [subId, setSubId]         = useState(initial?.subcontractorId || (subcontractors[0]?.id || ''));
  const [title, setTitle]         = useState(initial?.title || '');
  const [startDate, setStartDate] = useState(initial?.startDate || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate]     = useState(initial?.endDate || '');
  const [retentionRate, setRetentionRate] = useState(initial?.retentionRate || 5);
  const [advancePayment, setAdvancePayment] = useState(initial?.advancePayment || 0);
  const [status, setStatus]       = useState(initial?.status || 'in_progress');
  const [terms, setTerms]         = useState(initial?.terms || 'يتم استلام الأعمال وفق أصول الصنعة والكود الهندسي. يخصم 5% ضمان أعمال يصرف بعد التسليم النهائي.');
  
  const [items, setItems] = useState(initial?.items || [
    { id: 'it_1', description: '', unit: 'م2', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  const handleItemChange = (idx, field, val) => {
    const next = [...items];
    next[idx][field] = val;
    if (field === 'quantity' || field === 'unitPrice') {
      const q = Number(next[idx].quantity) || 0;
      const p = Number(next[idx].unitPrice) || 0;
      next[idx].total = q * p;
    }
    setItems(next);
  };

  const addItem = () => {
    setItems([...items, { id: 'it_' + Date.now(), description: '', unit: 'م2', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (idx) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const totalContract = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('يرجى إدخال عنوان أمر العمل.');
      return;
    }
    const selProj = projects.find(p => p.id === projectId);
    const selSub  = subcontractors.find(s => s.id === subId);

    onSave({
      projectId,
      projectName: selProj ? selProj.name : '—',
      subcontractorId: subId,
      subcontractorName: selSub ? selSub.name : '—',
      specialty: selSub ? selSub.specialty : '—',
      title,
      startDate,
      endDate,
      retentionRate: Number(retentionRate) || 0,
      advancePayment: Number(advancePayment) || 0,
      status,
      terms,
      items
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
        <div className="modal-header">
          <h3>{initial ? 'تعديل أمر العمل / العقد' : 'إنشاء أمر عمل جديد لمقاول باطن'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">الموقع / المشروع *</label>
              <select
                className="input"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                required
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">مقاول الباطن المنفذ *</label>
              <select
                className="input"
                value={subId}
                onChange={e => setSubId(e.target.value)}
                required
              >
                {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.specialty})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">موضوع / عنوان أمر العمل *</label>
            <input
              type="text"
              className="input"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: أعمال بياض ومحارة حوائط وأسقف كامل الفيلا"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">تاريخ البدء</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">تاريخ الانتهاء</label>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">نسبة ضمان الأعمال (%)</label>
              <input
                type="number"
                className="input"
                value={retentionRate}
                onChange={e => setRetentionRate(e.target.value)}
                min={0}
                max={25}
              />
            </div>
            <div>
              <label className="label">الدفعة المقدمة</label>
              <input
                type="number"
                className="input"
                value={advancePayment}
                onChange={e => setAdvancePayment(e.target.value)}
              />
            </div>
          </div>

          {/* Items Section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="label" style={{ margin: 0, fontWeight: 800 }}>بنود الأعمال والأسعار المتفق عليها</label>
              <button type="button" className="btn" onClick={addItem} style={{ fontSize: 12, padding: '4px 10px' }}>
                <Plus size={14} /> إضافة بند
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((it, idx) => (
                <div key={it.id || idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1.2fr 1.5fr 1.5fr 40px', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="بيان بند العمل"
                    value={it.description}
                    onChange={e => handleItemChange(idx, 'description', e.target.value)}
                    required
                  />
                  <select
                    className="input"
                    value={it.unit}
                    onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                  >
                    <option value="م2">م2</option>
                    <option value="م.ط">م.ط</option>
                    <option value="عدد">عدد</option>
                    <option value="مقطوعية">مقطوعية</option>
                    <option value="طن">طن</option>
                    <option value="يومية">يومية</option>
                  </select>
                  <input
                    type="number"
                    className="input"
                    placeholder="الكمية"
                    value={it.quantity}
                    onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                    min={0.1}
                    step="any"
                    required
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="سعر الفئة"
                    value={it.unitPrice}
                    onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                    required
                  />
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#6366F1', textAlign: 'center' }}>
                    {(Number(it.total) || 0).toLocaleString()}
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => removeItem(idx)}
                    style={{ padding: 6, color: '#EF4444' }}
                    disabled={items.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: 14, fontWeight: 800 }}>
              <span>إجمالي قيمة أمر العمل: </span>
              <span style={{ color: '#6366F1', marginRight: 8 }}>{totalContract.toLocaleString()} ج.م</span>
            </div>
          </div>

          <div>
            <label className="label">شروط التنفيذ والاستلام والضمان</label>
            <textarea
              className="input"
              rows={2}
              value={terms}
              onChange={e => setTerms(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#6366F1', borderColor: '#6366F1' }}>
              {initial ? 'حفظ التعديلات' : 'إصدار أمر العمل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 3. Extract Form Modal (المستخلص الهندسي) ──
function ExtractFormModal({ initial, projects, workOrders, subcontractors, existingExtracts, onClose, onSave }) {
  const [selectedWoId, setSelectedWoId] = useState(initial?.workOrderId || (workOrders[0]?.id || ''));
  const currentWo = workOrders.find(w => w.id === selectedWoId);

  const [date, setDate]             = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [periodFrom, setPeriodFrom] = useState(initial?.periodFrom || currentWo?.startDate || '');
  const [periodTo, setPeriodTo]     = useState(initial?.periodTo || date);
  const [type, setType]             = useState(initial?.type || 'interim');
  const [advanceDeduction, setAdvanceDeduction] = useState(initial?.advanceDeduction || 0);
  const [penaltyDeduction, setPenaltyDeduction] = useState(initial?.penaltyDeduction || 0);
  const [status, setStatus]         = useState(initial?.status || 'finance_approved');
  const [notes, setNotes]           = useState(initial?.notes || '');

  // Calculate previous cumulative quantities from previous extracts for this work order
  const previousQuantities = useMemo(() => {
    const prevExts = existingExtracts.filter(e => e.workOrderId === selectedWoId && (!initial?.id || e.id !== initial.id));
    const qtyMap = {};
    prevExts.forEach(ext => {
      ext.items?.forEach(it => {
        const id = it.itemId || it.description;
        qtyMap[id] = (qtyMap[id] || 0) + (Number(it.currentQty) || 0);
      });
    });
    return qtyMap;
  }, [existingExtracts, selectedWoId, initial]);

  // Initializing items based on Work Order
  const [items, setItems] = useState(() => {
    if (initial?.items) return initial.items;
    if (!currentWo?.items) return [];
    return currentWo.items.map(it => {
      const prev = previousQuantities[it.id || it.description] || 0;
      return {
        itemId: it.id,
        description: it.description,
        unit: it.unit,
        contractQty: it.quantity,
        unitPrice: it.unitPrice,
        prevQty: prev,
        currentQty: 0,
        totalQty: prev,
        totalAmount: prev * it.unitPrice
      };
    });
  });

  // When selected work order changes
  useEffect(() => {
    if (!initial && currentWo?.items) {
      setItems(currentWo.items.map(it => {
        const prev = previousQuantities[it.id || it.description] || 0;
        return {
          itemId: it.id,
          description: it.description,
          unit: it.unit,
          contractQty: it.quantity,
          unitPrice: it.unitPrice,
          prevQty: prev,
          currentQty: 0,
          totalQty: prev,
          totalAmount: prev * it.unitPrice
        };
      }));
    }
  }, [selectedWoId, currentWo, previousQuantities]);

  const handleCurrentQtyChange = (idx, val) => {
    const next = [...items];
    const cur = Number(val) || 0;
    const prev = Number(next[idx].prevQty) || 0;
    const total = prev + cur;
    next[idx].currentQty = cur;
    next[idx].totalQty = total;
    next[idx].totalAmount = total * Number(next[idx].unitPrice);
    setItems(next);
  };

  // Gross Calculations
  const grossAmount = items.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0);
  const prevGrossAmount = items.reduce((acc, it) => acc + ((Number(it.prevQty) || 0) * Number(it.unitPrice)), 0);
  const currentGrossAmount = grossAmount - prevGrossAmount;

  const retentionRate = currentWo?.retentionRate || 5;
  const retentionAmount = Math.round((currentGrossAmount * retentionRate) / 100);
  const netAmount = Math.max(0, currentGrossAmount - (Number(advanceDeduction) || 0) - retentionAmount - (Number(penaltyDeduction) || 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentWo) {
      alert('يرجى اختيار أمر العمل أولاً.');
      return;
    }

    onSave({
      type,
      workOrderId: currentWo.id,
      workOrderCode: currentWo.code,
      projectId: currentWo.projectId,
      projectName: currentWo.projectName,
      subcontractorId: currentWo.subcontractorId,
      subcontractorName: currentWo.subcontractorName,
      date,
      periodFrom,
      periodTo,
      items,
      grossAmount,
      prevGrossAmount,
      currentGrossAmount,
      advanceDeduction: Number(advanceDeduction) || 0,
      retentionRate,
      retentionAmount,
      penaltyDeduction: Number(penaltyDeduction) || 0,
      netAmount,
      status,
      notes
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h3>{initial?.id ? 'تعديل المستخلص الهندسي' : 'إصدار مستخلص هندسي دوري'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">أمر العمل المستهدف *</label>
              <select
                className="input"
                value={selectedWoId}
                onChange={e => setSelectedWoId(e.target.value)}
                disabled={Boolean(initial?.id)}
                required
              >
                {workOrders.map(w => <option key={w.id} value={w.id}>{w.code} — {w.title} ({w.subcontractorName})</option>)}
              </select>
            </div>
            <div>
              <label className="label">نوع المستخلص</label>
              <select
                className="input"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="interim">مستخلص جاري</option>
                <option value="final">مستخلص ختامي</option>
              </select>
            </div>
            <div>
              <label className="label">تاريخ المستخلص</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Cumulative BOQ Items Table */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <label className="label" style={{ fontWeight: 800, marginBottom: 8 }}>
              حصر الكميات المنفذة في هذا المستخلص
            </label>
            <div style={{ overflowX: 'auto', maxHeight: 220 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 8px' }}>البند</th>
                    <th style={{ padding: '6px 8px' }}>الوحدة</th>
                    <th style={{ padding: '6px 8px' }}>كمية العقد</th>
                    <th style={{ padding: '6px 8px' }}>السابق</th>
                    <th style={{ padding: '6px 8px', width: 90 }}>الحالي</th>
                    <th style={{ padding: '6px 8px' }}>الإجمالي</th>
                    <th style={{ padding: '6px 8px' }}>سعر الفئة</th>
                    <th style={{ padding: '6px 8px' }}>إجمالي البند</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.itemId || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{it.description}</td>
                      <td style={{ padding: '6px 8px' }}>{it.unit}</td>
                      <td style={{ padding: '6px 8px' }}>{it.contractQty}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{it.prevQty}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          className="input"
                          style={{ height: 30, padding: '2px 6px', fontWeight: 700, color: '#10B981' }}
                          value={it.currentQty}
                          onChange={e => handleCurrentQtyChange(idx, e.target.value)}
                          min={0}
                          step="any"
                        />
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{it.totalQty}</td>
                      <td style={{ padding: '6px 8px' }}>{Number(it.unitPrice).toLocaleString()}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 800, color: '#6366F1' }}>
                        {(Number(it.totalAmount) || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deductions and Net Section */}
          <div style={{
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12
          }}>
            <div>
              <label className="label">أعمال هذه الفترة (الحالي)</label>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                {currentGrossAmount.toLocaleString()} ج.م
              </div>
            </div>

            <div>
              <label className="label">استقطاع دفعة مقدمة</label>
              <input
                type="number"
                className="input"
                value={advanceDeduction}
                onChange={e => setAdvanceDeduction(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label className="label">ضمان أعمال ({retentionRate}%)</label>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#EC4899' }}>
                {retentionAmount.toLocaleString()} ج.م
              </div>
            </div>

            <div>
              <label className="label">غرامات / سلفات</label>
              <input
                type="number"
                className="input"
                value={penaltyDeduction}
                onChange={e => setPenaltyDeduction(e.target.value)}
                placeholder="0"
              />
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 10, borderRadius: 8 }}>
              <label className="label" style={{ color: '#10B981', fontWeight: 800 }}>صافي المستحق للصرف</label>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#10B981' }}>
                {netAmount.toLocaleString()} ج.م
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label className="label">حالة المستخلص</label>
              <select
                className="input"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="draft">مسودة</option>
                <option value="technical_approved">معتمد فنياً من الموقع</option>
                <option value="finance_approved">معتمد وجاهز للصرف</option>
                <option value="paid">تم الصرف</option>
              </select>
            </div>
            <div>
              <label className="label">ملاحظات واعتمادات المهندس</label>
              <input
                type="text"
                className="input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تم مراجعة المناسيب والاستلامات بالقدة وميزان المياه..."
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#10B981', borderColor: '#10B981' }}>
              {initial?.id ? 'حفظ المستخلص' : 'اعتماد وإصدار المستخلص'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 4. Printable Work Order Contract Modal ──
function PrintWorkOrderModal({ order, companySettings, onClose }) {
  const currency = getGlobalCurrency();
  const total = order.items?.reduce((acc, it) => acc + (Number(it.total) || 0), 0) || 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 850, padding: 32, background: '#fff', color: '#0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }} className="no-print">
          <button className="btn" onClick={onClose}><X size={16} /> إغلاق</button>
          <button className="btn btn-primary" onClick={() => window.print()} style={{ background: '#6366F1' }}>
            <Printer size={16} /> طباعة أمر العمل / العقد
          </button>
        </div>

        {/* Contract Sheet */}
        <div style={{ border: '2px solid #0f172a', padding: 24, borderRadius: 8 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{companySettings?.companyName || 'شركة المقاولات والتشطيبات'}</h2>
              <div style={{ fontSize: 12, color: '#64748b' }}>إدارة المشروعات والمكتب الفني</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#6366F1' }}>أمر إسناد عمل وعقد مقاولة باطن</h1>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>كود: {order.code}</div>
            </div>
            <div style={{ textAlign: 'left', fontSize: 12 }}>
              <div><strong>التاريخ:</strong> {order.createdAt || order.startDate}</div>
              <div><strong>الموقع:</strong> {order.projectName}</div>
            </div>
          </div>

          {/* Parties */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 6, marginBottom: 20, fontSize: 13, lineHeight: 1.8 }}>
            <div><strong>الطرف الأول (الشركة):</strong> {companySettings?.companyName || 'الشركة المنفذة'} ويمثلها مدير المشروعات.</div>
            <div><strong>الطرف الثاني (مقاول الباطن):</strong> {order.subcontractorName} — تخصص ({order.specialty}).</div>
            <div><strong>موضوع العقد:</strong> {order.title} لموقع ({order.projectName}).</div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20, textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: 10, border: '1px solid #cbd5e1' }}>م</th>
                <th style={{ padding: 10, border: '1px solid #cbd5e1' }}>بيان بند الأعمال</th>
                <th style={{ padding: 10, border: '1px solid #cbd5e1' }}>الوحدة</th>
                <th style={{ padding: 10, border: '1px solid #cbd5e1' }}>الكمية</th>
                <th style={{ padding: 10, border: '1px solid #cbd5e1' }}>سعر الفئة ({currency})</th>
                <th style={{ padding: 10, border: '1px solid #cbd5e1' }}>إجمالي القيمة ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: 10, border: '1px solid #cbd5e1', fontWeight: 700 }}>{it.description}</td>
                  <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'center' }}>{it.unit}</td>
                  <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'center' }}>{it.quantity}</td>
                  <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'center' }}>{Number(it.unitPrice).toLocaleString()}</td>
                  <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800 }}>{(Number(it.total) || 0).toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ background: '#f8fafc', fontWeight: 900, fontSize: 13 }}>
                <td colSpan={5} style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'left' }}>إجمالي قيمة أمر العمل:</td>
                <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'center', color: '#6366F1' }}>{total.toLocaleString()} {currency}</td>
              </tr>
            </tbody>
          </table>

          {/* Terms */}
          <div style={{ fontSize: 12, marginBottom: 30, lineHeight: 1.8 }}>
            <h4 style={{ margin: '0 0 6px', fontWeight: 800 }}>الشروط والالتزامات الهندسية:</h4>
            <ol style={{ paddingRight: 20, margin: 0 }}>
              <li>{order.terms || 'الالتزام التام بالمخططات الهندسية وأصول الصنعة.'}</li>
              <li>فترة التنفيذ تبدأ من {order.startDate} وتنتهي في {order.endDate}.</li>
              <li>يتم خصم نسبة {order.retentionRate || 5}% كتأمين ضمان أعمال تصرف بعد الاستلام النهائي للموقع.</li>
              <li>الدفعة المقدمة المصروفة للمقاول قدرها {(order.advancePayment || 0).toLocaleString()} {currency} وتستقطع من المستخلصات الجارية.</li>
            </ol>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, textAlign: 'center', fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 40 }}>الطرف الثاني (المقاول)</div>
              <div style={{ borderBottom: '1px dotted #94a3b8', width: 140, margin: '0 auto' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 40 }}>مهندس الموقع / المكتب الفني</div>
              <div style={{ borderBottom: '1px dotted #94a3b8', width: 140, margin: '0 auto' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 40 }}>اعتماد الإدارة والمالية</div>
              <div style={{ borderBottom: '1px dotted #94a3b8', width: 140, margin: '0 auto' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 5. Printable Engineering Extract Modal ──
function PrintExtractModal({ extract, companySettings, onClose }) {
  const currency = getGlobalCurrency();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 880, padding: 32, background: '#fff', color: '#0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }} className="no-print">
          <button className="btn" onClick={onClose}><X size={16} /> إغلاق</button>
          <button className="btn btn-primary" onClick={() => window.print()} style={{ background: '#10B981' }}>
            <Printer size={16} /> طباعة المستخلص الهندسي
          </button>
        </div>

        {/* Extract Sheet */}
        <div style={{ border: '2px solid #0f172a', padding: 24, borderRadius: 8 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{companySettings?.companyName || 'شركة المقاولات والتشطيبات'}</h2>
              <div style={{ fontSize: 12, color: '#64748b' }}>إدارة الحسابات والمكتب الفني</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#10B981' }}>
                مستخلص أعمال مقاول باطن ({extract.type === 'final' ? 'ختامي' : `جاري رقم ${extract.extractNumber || 1}`})
              </h1>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>أمر عمل رقم: {extract.workOrderCode}</div>
            </div>
            <div style={{ textAlign: 'left', fontSize: 12 }}>
              <div><strong>تاريخ المستخلص:</strong> {extract.date}</div>
              <div><strong>الموقع:</strong> {extract.projectName}</div>
            </div>
          </div>

          {/* Subcontractor Info */}
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 18, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>اسم المقاول:</strong> {extract.subcontractorName}</div>
            <div><strong>الفترة من:</strong> {extract.periodFrom || extract.date} <strong>إلى:</strong> {extract.periodTo || extract.date}</div>
            <div><strong>حالة المستخلص:</strong> {extract.status === 'paid' ? 'تم الصرف بنجاح' : 'معتمد للصرف'}</div>
          </div>

          {/* Cumulative BOQ Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 20, textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>م</th>
                <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>بيان بند الأعمال</th>
                <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>الوحدة</th>
                <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>كمية العقد</th>
                <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>سابق</th>
                <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>حالي</th>
                <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>إجمالي كمية</th>
                <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>سعر الفئة</th>
                <th style={{ padding: 8, border: '1px solid #cbd5e1' }}>إجمالي القيمة</th>
              </tr>
            </thead>
            <tbody>
              {extract.items?.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', fontWeight: 700 }}>{it.description}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'center' }}>{it.unit}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'center' }}>{it.contractQty}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'center' }}>{it.prevQty || 0}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }}>{it.currentQty || 0}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800 }}>{(Number(it.prevQty || 0) + Number(it.currentQty || 0))}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'center' }}>{Number(it.unitPrice).toLocaleString()}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800 }}>
                    {(Number(it.totalAmount) || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Deductions & Financial Calculation Box */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ border: '1px solid #cbd5e1', padding: 14, borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8, borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>
                ملاحظات المهندس المشرف والمطابقة:
              </div>
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.7 }}>
                {extract.notes || 'تمت المعاينة ومطابقة استواء وجودة الأعمال المنفذة ومراجعة الكميات هندسياً.'}
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'right' }}>
              <tbody>
                <tr>
                  <td style={{ padding: 6, borderBottom: '1px solid #cbd5e1' }}>إجمالي قيمة الأعمال المنفذة حتى تاريخه:</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #cbd5e1', fontWeight: 800, textAlign: 'left' }}>
                    {(Number(extract.grossAmount) || 0).toLocaleString()} {currency}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: 6, borderBottom: '1px solid #cbd5e1', color: '#b45309' }}>يخصم: استقطاع دفعة مقدمة:</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #cbd5e1', fontWeight: 800, textAlign: 'left', color: '#b45309' }}>
                    - {(Number(extract.advanceDeduction) || 0).toLocaleString()} {currency}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: 6, borderBottom: '1px solid #cbd5e1', color: '#be185d' }}>يخصم: تأمين ضمان أعمال ({extract.retentionRate || 5}%):</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #cbd5e1', fontWeight: 800, textAlign: 'left', color: '#be185d' }}>
                    - {(Number(extract.retentionAmount) || 0).toLocaleString()} {currency}
                  </td>
                </tr>
                {Number(extract.penaltyDeduction) > 0 && (
                  <tr>
                    <td style={{ padding: 6, borderBottom: '1px solid #cbd5e1', color: '#dc2626' }}>يخصم: غرامات / سلفيات أخرى:</td>
                    <td style={{ padding: 6, borderBottom: '1px solid #cbd5e1', fontWeight: 800, textAlign: 'left', color: '#dc2626' }}>
                      - {(Number(extract.penaltyDeduction) || 0).toLocaleString()} {currency}
                    </td>
                  </tr>
                )}
                <tr style={{ background: '#f0fdf4', fontSize: 13 }}>
                  <td style={{ padding: 8, fontWeight: 900, color: '#166534' }}>صافي المبلغ المصرح بصرفه:</td>
                  <td style={{ padding: 8, fontWeight: 900, textAlign: 'left', color: '#166534' }}>
                    {(Number(extract.netAmount) || 0).toLocaleString()} {currency}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, textAlign: 'center', fontSize: 12, marginTop: 10 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 35 }}>مهندس الموقع</div>
              <div style={{ borderBottom: '1px dotted #94a3b8', width: 110, margin: '0 auto' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 35 }}>مدير المكتب الفني</div>
              <div style={{ borderBottom: '1px dotted #94a3b8', width: 110, margin: '0 auto' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 35 }}>المحاسب المالي</div>
              <div style={{ borderBottom: '1px dotted #94a3b8', width: 110, margin: '0 auto' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 35 }}>استلام المقاول</div>
              <div style={{ borderBottom: '1px dotted #94a3b8', width: 110, margin: '0 auto' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 6. Subcontractor Statement of Account Modal ──
function SubStatementModal({ sub, workOrders, extracts, companySettings, onClose }) {
  const currency = getGlobalCurrency();
  const totalAssigned = workOrders.reduce((acc, wo) => acc + (wo.items?.reduce((s, it) => s + (Number(it.total) || 0), 0) || 0), 0);
  const totalPaid = extracts.filter(e => e.status === 'paid').reduce((acc, e) => acc + (Number(e.netAmount) || 0), 0);
  const totalRetained = extracts.reduce((acc, e) => acc + (Number(e.retentionAmount) || 0), 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h3>كشف حساب مقاول الباطن: {sub.name}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            background: 'rgba(0,0,0,0.02)',
            padding: 14,
            borderRadius: 10,
            border: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>إجمالي الأعمال المسندة</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#6366F1' }}>{totalAssigned.toLocaleString()} {currency}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>المستخلصات المسددة</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>{totalPaid.toLocaleString()} {currency}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>الضمان المحتجز لديه</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#EC4899' }}>{totalRetained.toLocaleString()} {currency}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>الرصيد المتبقي بالعقود</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B' }}>{(totalAssigned - totalPaid).toLocaleString()} {currency}</div>
            </div>
          </div>

          {/* Extracts List */}
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 8px' }}>المستخلصات المصروفة والمعتمدة</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 10px' }}>أمر العمل</th>
                    <th style={{ padding: '8px 10px' }}>الموقع</th>
                    <th style={{ padding: '8px 10px' }}>التاريخ</th>
                    <th style={{ padding: '8px 10px' }}>إجمالي الأعمال</th>
                    <th style={{ padding: '8px 10px' }}>الضمان المحتجز</th>
                    <th style={{ padding: '8px 10px' }}>الصافي المنصرف</th>
                    <th style={{ padding: '8px 10px' }}>طريقة السداد</th>
                  </tr>
                </thead>
                <tbody>
                  {extracts.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{e.workOrderCode}</td>
                      <td style={{ padding: '8px 10px' }}>{e.projectName}</td>
                      <td style={{ padding: '8px 10px' }}>{e.date}</td>
                      <td style={{ padding: '8px 10px' }}>{(Number(e.grossAmount) || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px 10px', color: '#EC4899' }}>{(Number(e.retentionAmount) || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: '#10B981' }}>{(Number(e.netAmount) || 0).toLocaleString()} {currency}</td>
                      <td style={{ padding: '8px 10px' }}>{e.paymentMethod || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
