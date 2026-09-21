import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  Copy, Check, ExternalLink, KeyRound, Shield, Trash2, Pencil,
  Power, Sparkles, MapPin, DollarSign, Calendar, Users, Phone,
  Mail, X, RefreshCw, Layers, Globe, Server, Lock
} from 'lucide-react';
import {
  loadAllTenants, loadAllTenantsAsync, createTenant, updateTenant, deleteTenant,
  generateWhatsAppWelcomeMessage, setActiveTenantId,
  isSubAccountsLoginAllowed, setSubAccountsLoginAllowed
} from '../services/tenantsManager';
import { updateCurrentUserPassword } from '../services/auth';

export default function SuperAdminDashboard({ onSwitchToCompany, currentUser }) {
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Sub-accounts access master switch
  const [subAccountsAllowed, setSubAccountsAllowed] = useState(() => isSubAccountsLoginAllowed());

  // Owner Security Modal State
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerForm, setOwnerForm] = useState(() => ({
    name: currentUser?.name || currentUser?.displayName || 'مدير المنصة الرئيسي',
    email: currentUser?.email || ''
  }));
  const [ownerSuccess, setOwnerSuccess] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerMsg, setOwnerMsg] = useState(null);

  // Form State for Adding / Editing
  const [form, setForm] = useState({
    name: '',
    subtitle: '',
    city: 'أبوظبي',
    country: 'الإمارات',
    currency: 'د.إ',
    phone: '',
    plan: 'trial',
    status: 'trial',
    expiryDate: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    subdomain: '',
    customDomain: '',
    primaryColor: '#0F766E',
    accentColor: '#14B8A6',
    seedDemoProject: true,
  });

  useEffect(() => {
    refreshTenants();
  }, []);

  function refreshTenants() {
    setTenants(loadAllTenants());
    loadAllTenantsAsync().then(cloudTenants => {
      if (Array.isArray(cloudTenants) && cloudTenants.length > 0) {
        setTenants(cloudTenants);
      }
    }).catch(err => console.warn('[SuperAdminDashboard] Cloud refresh warning:', err));
  }

  function openAddModal() {
    setEditTenant(null);
    setForm({
      name: '',
      subtitle: 'نظام إدارة المشاريع المتكامل',
      city: 'أبوظبي',
      country: 'الإمارات',
      currency: 'د.إ',
      phone: '',
      plan: 'trial',
      status: 'trial',
      expiryDate: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '123456',
      subdomain: '',
      customDomain: '',
      primaryColor: '#1877F2',
      accentColor: '#166FE5',
      seedDemoProject: true,
    });
    setShowModal(true);
  }

  function openEditModal(tenant) {
    setEditTenant(tenant);
    setForm({
      name: tenant.name || '',
      subtitle: tenant.subtitle || '',
      city: tenant.city || 'أبوظبي',
      country: tenant.country || 'الإمارات',
      currency: tenant.currency || 'د.إ',
      phone: tenant.phone || '',
      plan: tenant.plan || 'trial',
      status: tenant.status || 'active',
      expiryDate: tenant.expiryDate || '',
      adminName: tenant.adminName || '',
      adminEmail: tenant.adminEmail || '',
      adminPassword: tenant.adminPassword || '',
      subdomain: tenant.subdomain || '',
      customDomain: tenant.customDomain || '',
      primaryColor: tenant.primaryColor || '#1877F2',
      accentColor: tenant.accentColor || '#166FE5',
      seedDemoProject: false,
    });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.adminEmail.trim()) return;

    if (editTenant) {
      updateTenant(editTenant.id, form);
    } else {
      createTenant(form);
    }

    refreshTenants();
    setShowModal(false);
  }

  function handleDelete(id) {
    deleteTenant(id);
    refreshTenants();
    setDeleteConfirmId(null);
  }

  function toggleStatus(tenant) {
    const nextStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    updateTenant(tenant.id, { status: nextStatus });
    refreshTenants();
  }

  function copyWhatsApp(tenant) {
    const msg = generateWhatsAppWelcomeMessage(tenant);
    navigator.clipboard.writeText(msg);
    setCopiedId(tenant.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  function handleImpersonate(tenant) {
    setActiveTenantId(tenant.id);
    if (onSwitchToCompany) {
      onSwitchToCompany(tenant);
    }
  }

  const filtered = tenants.filter((t) => {
    const matchSearch =
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.adminEmail || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.phone || '').includes(search) ||
      (t.customDomain || '').toLowerCase().includes(search.toLowerCase());
    const matchCity = filterCity === 'all' || t.city === filterCity;
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchCity && matchStatus;
  });

  return (
    <div className="tab-fade" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
              <Shield size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                لوحة مالك المنصة (Super Admin)
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                إدارة الشركات المشتركة، الاشتراكات، الدومينات المخصصة، وحسابات المديرين
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setOwnerForm({
                name: currentUser?.name || currentUser?.displayName || 'مدير المنصة الرئيسي',
                email: currentUser?.email || ''
              });
              setOwnerSuccess(false);
              setShowOwnerModal(true);
            }}
            style={{ gap: 8, padding: '8px 16px', background: '#F8FAFC', color: 'var(--ink)', borderColor: '#E2E8F0' }}
          >
            <KeyRound size={15} color="#64748B" /> أمان وبيانات المالك
          </button>
          <button className="btn btn-primary" onClick={openAddModal} style={{ gap: 8, padding: '8px 18px' }}>
            <Plus size={15} /> إضافة شركة جديدة
          </button>
        </div>
      </div>

      {/* ─── Sub-Accounts Master Access Security Panel ─── */}
      <div
        className="panel"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {subAccountsAllowed ? <CheckCircle2 size={22} color="#16A34A" /> : <Lock size={22} color="#64748B" />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                صلاحية دخول الحسابات الفرعية والمشتركين:
              </span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #E2E8F0',
                }}
              >
                {subAccountsAllowed ? 'متاح دخول الشركات' : 'مقفل كلياً (حساب المالك فقط)'}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
              {subAccountsAllowed
                ? 'الحسابات الفرعية والمشتركون يمكنهم تسجيل الدخول لمساحات عملهم بشكل طبيعي.'
                : 'تم قفل دخول الحسابات الفرعية — لا يمكن لأي حساب فتح المنصة سوى مالك المنصة.'}
            </div>
          </div>
        </div>

        <button
          className="btn"
          onClick={() => {
            const next = !subAccountsAllowed;
            setSubAccountsLoginAllowed(next);
            setSubAccountsAllowed(next);
          }}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: subAccountsAllowed ? '#F8FAFC' : '#0F172A',
            color: subAccountsAllowed ? '#DC2626' : '#FFFFFF',
            border: subAccountsAllowed ? '1px solid #FECACA' : '1px solid #0F172A',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          {subAccountsAllowed ? (
            <>
              <Lock size={15} /> قفل الحسابات الفرعية
            </>
          ) : (
            <>
              <CheckCircle2 size={15} /> السماح بدخول الحسابات
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>إجمالي الشركات</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>{tenants.length}</div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>الاشتراكات النشطة</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
              {tenants.filter((t) => t.status === 'active' || t.status === 'trial').length}
            </div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>فترات تجريبية (Trial)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
              {tenants.filter((t) => t.status === 'trial').length}
            </div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>إجمالي المشاريع بالميدان</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
              {tenants.reduce((acc, t) => acc + (t.projectsCount || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="panel" style={{ padding: '14px 18px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220 }}>
          <Search size={16} color="var(--muted)" />
          <input
            type="text"
            className="filter-input"
            style={{ width: '100%', border: 'none', background: 'transparent' }}
            placeholder="بحث باسم الشركة، الإيميل، الهاتف، أو الدومين..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="filter-select"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          >
            <option value="all">كل المدن</option>
            <option value="أبوظبي">أبوظبي</option>
            <option value="العين">العين</option>
            <option value="دبي">دبي</option>
            <option value="القاهرة">القاهرة</option>
            <option value="الرياض">الرياض</option>
            <option value="جدة">جدة</option>
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط (Active)</option>
            <option value="trial">تجريبي (Trial)</option>
            <option value="suspended">موقوف (Suspended)</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
            الشركات والمشتركون ({filtered.length})
          </h3>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
            اضغط على "دخول لحساب الشركة" لتجربة أو إدارة مساحة العمل الخاصة بها
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <Building2 size={42} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>لا توجد شركات مطابقة لمعايير البحث.</div>
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="desktop-only-table" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.02)', textAlign: 'right' }}>
                    <th>الشركة والرابط المخصص</th>
                    <th>المدير والبريد</th>
                    <th>الباقة والعملة</th>
                    <th>صلاحية الاشتراك</th>
                    <th>الحالة</th>
                    <th style={{ textAlign: 'center' }}>إجراءات الحساب والواتساب</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const isSuspended = t.status === 'suspended';
                    const isTrial = t.status === 'trial';

                    return (
                      <tr key={t.id} style={{ opacity: isSuspended ? 0.6 : 1 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 8,
                                background: '#F1F5F9',
                                border: '1px solid #E2E8F0',
                                color: '#1E293B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 14,
                                flexShrink: 0,
                              }}
                            >
                              {(t.name || '').slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>{t.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                <MapPin size={12} color="#64748B" />
                                <span>{t.city} - {t.country}</span>
                                {t.customDomain && (
                                  <span style={{ color: '#475569', fontWeight: 600, direction: 'ltr' }}>• 🌐 {t.customDomain}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{t.adminName || 'المدير العام'}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'monospace' }}>{t.adminEmail}</div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{t.planName || t.plan}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                            العملة: {t.currency || 'د.إ'}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                            {t.expiryDate || 'مفتوح'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            تاريخ البدء: {t.startDate || '2026-08'}
                          </div>
                        </td>

                        <td>
                          {t.status === 'active' && (
                            <span style={{ background: '#F1F5F9', color: '#1E293B', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>
                              نشط
                            </span>
                          )}
                          {t.status === 'trial' && (
                            <span style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>
                              تجريبي
                            </span>
                          )}
                          {t.status === 'suspended' && (
                            <span style={{ background: '#F8FAFC', color: '#94A3B8', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>
                              معلق
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleImpersonate(t)}
                              className="btn"
                              style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: '#1877F2',
                                color: '#FFFFFF',
                                border: '1px solid #166FE5',
                                borderRadius: 6,
                              }}
                              title="الدخول لحساب الشركة واستعراض مساحة عملها"
                            >
                              <ExternalLink size={13} /> دخول للحساب
                            </button>

                            <button
                              onClick={() => copyWhatsApp(t)}
                              className="btn"
                              style={{
                                padding: '6px 10px',
                                fontSize: 12,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: '#F8FAFC',
                                color: '#334155',
                                borderRadius: 6,
                                border: '1px solid #E2E8F0',
                              }}
                              title="نسخ رسالة التفعيل والبيانات لإرسالها بالواتساب"
                            >
                              {copiedId === t.id ? <Check size={13} color="#16A34A" /> : <Copy size={13} color="#64748B" />}
                              <span>{copiedId === t.id ? 'تم النسخ' : 'واتساب'}</span>
                            </button>

                            <button
                              onClick={() => openEditModal(t)}
                              className="icon-btn"
                              title="تعديل بيانات الشركة والاشتراك"
                            >
                              <Pencil size={13} />
                            </button>

                            <button
                              onClick={() => toggleStatus(t)}
                              className="icon-btn"
                              title={isSuspended ? 'تفعيل الحساب' : 'تعليق الحساب'}
                            >
                              <Power size={13} />
                            </button>

                            {deleteConfirmId === t.id ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  onClick={() => handleDelete(t.id)}
                                  className="btn btn-danger"
                                  style={{ padding: '4px 8px', fontSize: 11 }}
                                >
                                  تأكيد
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 8px', fontSize: 11 }}
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(t.id)}
                                className="icon-btn"
                                style={{ color: 'var(--muted)' }}
                                title="حذف الشركة نهائياً"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile-Only Responsive Company Cards */}
            <div className="mobile-only-cards" style={{ display: 'none', flexDirection: 'column', gap: 14, padding: 14 }}>
              {filtered.map((t) => {
                const isSuspended = t.status === 'suspended';
                const isTrial = t.status === 'trial';

                return (
                  <div
                    key={t.id}
                    className="panel"
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      opacity: isSuspended ? 0.65 : 1,
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            color: '#1E293B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                        >
                          {t.name.slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} color="#64748B" />
                            <span>{t.city} - {t.country}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {t.status === 'active' && (
                          <span style={{ background: '#F1F5F9', color: '#1E293B', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                            نشط
                          </span>
                        )}
                        {t.status === 'trial' && (
                          <span style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                            تجريبي
                          </span>
                        )}
                        {t.status === 'suspended' && (
                          <span style={{ background: '#F8FAFC', color: '#94A3B8', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                            معلق
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-color)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>المدير المسؤول:</span>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.adminName || 'المدير العام'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>الباقة والعملة:</span>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.planName || t.plan} ({t.currency || 'د.إ'})</span>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>البريد الإلكتروني:</span>
                        <span style={{ fontWeight: 500, color: 'var(--ink)', fontFamily: 'monospace' }}>{t.adminEmail}</span>
                      </div>
                    </div>

                    {/* Main Action Button */}
                    <button
                      onClick={() => handleImpersonate(t)}
                      className="btn"
                      style={{
                        width: '100%',
                        padding: '9px',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: '1px solid #0F172A',
                        borderRadius: 8,
                      }}
                    >
                      <ExternalLink size={14} /> دخول لمساحة عمل الشركة
                    </button>

                    {/* Secondary Actions Bar */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => copyWhatsApp(t)}
                        className="btn"
                        style={{
                          flex: 1,
                          padding: '7px',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          background: '#F8FAFC',
                          color: '#334155',
                          borderRadius: 6,
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {copiedId === t.id ? <Check size={13} color="#16A34A" /> : <Copy size={13} color="#64748B" />}
                        <span>{copiedId === t.id ? 'تم النسخ' : 'واتساب'}</span>
                      </button>

                      <button
                        onClick={() => openEditModal(t)}
                        className="btn btn-secondary"
                        style={{ padding: '7px 10px', fontSize: 12, borderRadius: 6, gap: 4 }}
                      >
                        <Pencil size={12} /> تعديل
                      </button>

                      <button
                        onClick={() => toggleStatus(t)}
                        className="btn btn-secondary"
                        style={{ padding: '7px 10px', fontSize: 12, borderRadius: 6, gap: 4 }}
                      >
                        <Power size={12} /> {isSuspended ? 'تفعيل' : 'تعليق'}
                      </button>

                      {deleteConfirmId === t.id ? (
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="btn btn-danger"
                          style={{ padding: '7px 10px', fontSize: 12, borderRadius: 6 }}
                        >
                          تأكيد
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(t.id)}
                          className="btn btn-ghost"
                          style={{ padding: '7px', color: 'var(--muted)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ─── Add / Edit Modal ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-box panel tab-fade"
            style={{ maxWidth: 620, padding: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                    {editTenant ? 'تعديل بيانات الشركة والاشتراك' : 'إضافة شركة / مشترك جديد'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                    سيتم إنشاء مساحة عمل معزولة بحساب مدير ومشاريع خاصة
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>اسم الشركة أو المكتب الهندسي *</label>
                <input
                  required
                  placeholder="مثال: مؤسسة العين الحديثة للديكور والمقاولات"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>المدينة والدولة</label>
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  <option value="أبوظبي">أبوظبي - الإمارات</option>
                  <option value="العين">العين - الإمارات</option>
                  <option value="دبي">دبي - الإمارات</option>
                  <option value="الشارقة">الشارقة - الإمارات</option>
                  <option value="القاهرة">القاهرة - مصر</option>
                  <option value="الرياض">الرياض - السعودية</option>
                  <option value="جدة">جدة - السعودية</option>
                </select>
              </div>

              <div className="form-field">
                <label>العملة المعتمدة للمشاريع</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="د.إ">درهم إماراتي (AED - د.إ)</option>
                  <option value="ج.م">جنيه مصري (EGP - ج.م)</option>
                  <option value="ر.س">ريال سعودي (SAR - ر.س)</option>
                  <option value="$">دولار أمريكي (USD - $)</option>
                </select>
              </div>

              <div className="form-field">
                <label>اسم المدير المسؤول</label>
                <input
                  placeholder="مثال: م. عبد الله الظاهري"
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>رقم هاتف / واتساب الشركة</label>
                <input
                  placeholder="+971 50 123 4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>البريد الإلكتروني للدخول (Admin) *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@company.ae"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>كلمة المرور المؤقتة *</label>
                <input
                  type="text"
                  required
                  placeholder="123456"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                />
              </div>

              {/* Subdomain & Custom Domain */}
              <div className="form-field">
                <label>الدومين الفرعي (Subdomain)</label>
                <input
                  type="text"
                  placeholder="daraldhabi"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  value={form.subdomain || ''}
                  onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                />
              </div>

              <div className="form-field">
                <label>دومين مخصص خاص بالشركة (Custom Domain)</label>
                <input
                  type="text"
                  placeholder="portal.company.com"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  value={form.customDomain || ''}
                  onChange={(e) => setForm({ ...form, customDomain: e.target.value.toLowerCase().trim() })}
                />
              </div>

              <div className="form-field">
                <label>نوع الباقة</label>
                <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                  <option value="trial">فترة تجريبية مجانية (14 يوماً)</option>
                  <option value="pro_monthly">باقة المحترفين الشهرية</option>
                  <option value="pro_annual">باقة النخبة السنوية VIP</option>
                </select>
              </div>

              <div className="form-field">
                <label>تاريخ انتهاء الاشتراك</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
              </div>

              {!editTenant && (
                <div className="form-field" style={{ gridColumn: '1 / -1', background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, fontWeight: 600, color: 'var(--ink)' }}>
                    <input
                      type="checkbox"
                      checked={form.seedDemoProject}
                      onChange={(e) => setForm({ ...form, seedDemoProject: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    <span>إنشاء مشروع فيلا استرشادي تلقائي (Demo Villa Project) لتبدأ به الشركة فوراً</span>
                  </label>
                </div>
              )}

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  {editTenant ? 'حفظ التعديلات' : 'تفعيل وإنشاء الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Owner Security Settings */}
      {showOwnerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>بيانات حساب مالك المنصة</h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>تخصيص البريد وكلمة المرور الحصرية لك فقط</div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setShowOwnerModal(false)}>
                <X size={18} />
              </button>
            </div>

            {ownerMsg && (
              <div style={{
                padding: '10px 14px',
                background: ownerSuccess ? '#F0FDF4' : '#FEF2F2',
                color: ownerSuccess ? '#16A34A' : '#DC2626',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
                border: `1px solid ${ownerSuccess ? '#BBF7D0' : '#FECACA'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <CheckCircle2 size={16} />
                <span>{ownerMsg}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setOwnerLoading(true);
                setOwnerMsg(null);
                let note = null;
                let hasError = false;

                try {
                  // إذا كانت هناك كلمة مرور جديدة مدخلة، نقوم بتحديثها في Firebase Authentication السحابي فقط
                  if (ownerForm.password && ownerForm.password.trim().length >= 6) {
                    const passRes = await updateCurrentUserPassword(ownerForm.password.trim());
                    if (!passRes.success) {
                      hasError = true;
                      if (passRes.code === 'auth/requires-recent-login') {
                        note = 'لتحديث كلمة المرور في Firebase يرجى إعادة تسجيل الدخول أولاً لدواعي الأمان.';
                      } else {
                        note = passRes.error || 'فشل تحديث كلمة المرور.';
                      }
                    } else {
                      note = 'تم تحديث كلمة المرور سحابياً في Firebase بنجاح!';
                    }
                  } else if (ownerForm.password && ownerForm.password.trim().length > 0) {
                    hasError = true;
                    note = 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.';
                  }

                  if (hasError) {
                    setOwnerSuccess(false);
                    setOwnerMsg(note);
                    return;
                  }

                  setOwnerSuccess(true);
                  setOwnerMsg(note || 'تم تحديث البيانات بنجاح!');
                  setTimeout(() => {
                    setShowOwnerModal(false);
                    setOwnerSuccess(false);
                    setOwnerMsg(null);
                  }, 1600);
                } catch (err) {
                  console.error(err);
                  setOwnerSuccess(false);
                  setOwnerMsg('حدث خطأ غير متوقع أثناء الحفظ.');
                } finally {
                  setOwnerLoading(false);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div className="form-field">
                <label>اسم المالك / المدير العام</label>
                <input
                  type="text"
                  required
                  value={ownerForm.name || ''}
                  onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>البريد الإلكتروني الحصري (Super Admin Email)</label>
                <input
                  type="email"
                  readOnly
                  disabled
                  style={{ direction: 'ltr', textAlign: 'left', opacity: 0.75, cursor: 'not-allowed', background: '#F8FAFC' }}
                  value={ownerForm.email || ''}
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  البريد مرتبط بحساب Firebase الرسمي ولا يُعدل إلا بإعادة المصادقة.
                </div>
              </div>

              <div className="form-field">
                <label>كلمة المرور الجديدة (اختياري)</label>
                <input
                  type="password"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  value={ownerForm.password || ''}
                  onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                  placeholder="اتركها فارغة إذا لم ترغب في التغيير (6 أحرف على الأقل)"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowOwnerModal(false)} disabled={ownerLoading}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '9px 22px' }} disabled={ownerLoading}>
                  {ownerLoading ? 'جاري الحفظ...' : 'حفظ وتأمين الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
