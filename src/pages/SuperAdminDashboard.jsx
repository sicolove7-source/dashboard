import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  Copy, Check, ExternalLink, KeyRound, Shield, Trash2, Pencil,
  Power, Sparkles, MapPin, DollarSign, Calendar, Users, Phone,
  Mail, X, RefreshCw, Layers, Globe, Server, Lock
} from 'lucide-react';
import {
  loadAllTenants, createTenant, updateTenant, deleteTenant,
  generateWhatsAppWelcomeMessage, setActiveTenantId,
  getSuperAdminAccount, saveSuperAdminAccount,
  isSubAccountsLoginAllowed, setSubAccountsLoginAllowed
} from '../services/tenantsManager';

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
  const [ownerForm, setOwnerForm] = useState(() => getSuperAdminAccount());
  const [ownerSuccess, setOwnerSuccess] = useState(false);

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
      primaryColor: '#0F766E',
      accentColor: '#14B8A6',
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
      primaryColor: tenant.primaryColor || '#6366F1',
      accentColor: tenant.accentColor || '#3B82F6',
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
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #EC4899, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)' }}>
              <Shield size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}>
                لوحة مالك المنصة (Super Admin) 👑
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
              setOwnerForm(getSuperAdminAccount());
              setOwnerSuccess(false);
              setShowOwnerModal(true);
            }}
            style={{ gap: 8, padding: '10px 18px', background: 'rgba(236, 72, 153, 0.1)', color: '#EC4899', borderColor: 'rgba(236, 72, 153, 0.3)' }}
          >
            <KeyRound size={16} /> أمان وبيانات المالك
          </button>
          <button className="btn btn-primary" onClick={openAddModal} style={{ gap: 8, padding: '10px 20px' }}>
            <Plus size={16} /> إضافة شركة جديدة
          </button>
        </div>
      </div>

      {/* ─── Sub-Accounts Master Access Security Panel ─── */}
      <div
        className="panel"
        style={{
          background: subAccountsAllowed 
            ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.05))' 
            : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.05))',
          border: subAccountsAllowed ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16,
          padding: '18px 24px',
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
              width: 48,
              height: 48,
              borderRadius: 14,
              background: subAccountsAllowed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: subAccountsAllowed ? '#10B981' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {subAccountsAllowed ? <CheckCircle2 size={26} /> : <Lock size={26} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                صلاحية دخول الحسابات الفرعية والمشتركين:
              </span>
              <span
                style={{
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: subAccountsAllowed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: subAccountsAllowed ? '#10B981' : '#EF4444',
                  border: `1px solid ${subAccountsAllowed ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
                }}
              >
                {subAccountsAllowed ? '🟢 متاح دخول الشركات والمستخدمين' : '🔒 مقفل كلياً (حساب المالك فقط)'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {subAccountsAllowed
                ? 'الحسابات الفرعية والمشتركون يمكنهم تسجيل الدخول لمساحات عملهم.'
                : 'تم قفل دخول جميع الحسابات الفرعية والشركات — لا يمكن لأي حساب فتح المنصة سوى مالك المنصة.'}
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
            padding: '11px 24px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 14,
            background: subAccountsAllowed ? '#EF4444' : '#10B981',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: `0 4px 14px ${subAccountsAllowed ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
            transition: 'all 0.2s',
          }}
        >
          {subAccountsAllowed ? (
            <>
              <Lock size={17} /> قفل الحسابات الفرعية فوراً 🔒
            </>
          ) : (
            <>
              <CheckCircle2 size={17} /> السماح بدخول الحسابات الفرعية 🟢
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>إجمالي الشركات</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)' }}>{tenants.length}</div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>الاشتراكات النشطة</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)' }}>
              {tenants.filter((t) => t.status === 'active' || t.status === 'trial').length}
            </div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>فترات تجريبية (Trial)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)' }}>
              {tenants.filter((t) => t.status === 'trial').length}
            </div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(236, 72, 153, 0.12)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>إجمالي المشاريع بالميدان</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)' }}>
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
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: `linear-gradient(135deg, ${t.primaryColor || '#6366F1'}, ${t.accentColor || '#3B82F6'})`,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 16,
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                flexShrink: 0,
                              }}
                            >
                              {t.name.slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{t.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                <MapPin size={12} color="var(--amber)" />
                                <span>{t.city} - {t.country}</span>
                                {t.customDomain && (
                                  <span style={{ color: '#6366F1', fontWeight: 700, direction: 'ltr' }}>• 🌐 {t.customDomain}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{t.adminName || 'المدير العام'}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{t.adminEmail}</div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{t.planName || t.plan}</div>
                          <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700 }}>
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
                            <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                              نشط ✅
                            </span>
                          )}
                          {t.status === 'trial' && (
                            <span style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                              تجريبي ⏳
                            </span>
                          )}
                          {t.status === 'suspended' && (
                            <span style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                              معلق ⛔
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleImpersonate(t)}
                              className="btn btn-primary"
                              style={{
                                padding: '7px 12px',
                                fontSize: 12,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: 'linear-gradient(135deg, #0F766E, #0D9488)',
                                borderRadius: 8,
                              }}
                              title="الدخول لحساب الشركة واستعراض مساحة عملها"
                            >
                              <ExternalLink size={13} /> دخول للحساب
                            </button>

                            <button
                              onClick={() => copyWhatsApp(t)}
                              className="btn"
                              style={{
                                padding: '7px 10px',
                                fontSize: 12,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: copiedId === t.id ? '#10B981' : '#25D366',
                                color: '#fff',
                                borderRadius: 8,
                                border: 'none',
                              }}
                              title="نسخ رسالة التفعيل والبيانات لإرسالها بالواتساب"
                            >
                              {copiedId === t.id ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copiedId === t.id ? 'تم النسخ!' : 'واتساب'}</span>
                            </button>

                            <button
                              onClick={() => openEditModal(t)}
                              className="icon-btn"
                              title="تعديل بيانات الشركة والاشتراك"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              onClick={() => toggleStatus(t)}
                              className="icon-btn"
                              title={isSuspended ? 'تفعيل الحساب' : 'تعليق الحساب'}
                              style={{ color: isSuspended ? '#10B981' : '#F59E0B' }}
                            >
                              <Power size={14} />
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
                                style={{ color: 'var(--danger)' }}
                                title="حذف الشركة نهائياً"
                              >
                                <Trash2 size={14} />
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
                      borderRadius: 16,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      opacity: isSuspended ? 0.65 : 1,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: `linear-gradient(135deg, ${t.primaryColor || '#6366F1'}, ${t.accentColor || '#3B82F6'})`,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 15,
                            flexShrink: 0,
                          }}
                        >
                          {t.name.slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ink)' }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} color="var(--amber)" />
                            <span>{t.city} - {t.country}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {t.status === 'active' && (
                          <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                            نشط ✅
                          </span>
                        )}
                        {t.status === 'trial' && (
                          <span style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706', padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                            تجريبي ⏳
                          </span>
                        )}
                        {t.status === 'suspended' && (
                          <span style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                            معلق ⛔
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg)', padding: '10px 12px', borderRadius: 12, fontSize: 12 }}>
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>المدير المسؤول:</span>
                        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{t.adminName || 'المدير العام'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>الباقة والعملة:</span>
                        <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{t.planName || t.plan} ({t.currency || 'د.إ'})</span>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>البريد الإلكتروني:</span>
                        <span style={{ fontWeight: 600, color: 'var(--ink)', fontFamily: 'monospace' }}>{t.adminEmail}</span>
                      </div>
                    </div>

                    {/* Main Action Button */}
                    <button
                      onClick={() => handleImpersonate(t)}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: 13,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: 'linear-gradient(135deg, #0F766E, #0D9488)',
                        borderRadius: 10,
                      }}
                    >
                      <ExternalLink size={15} /> دخول لمساحة عمل الشركة
                    </button>

                    {/* Secondary Actions Bar */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => copyWhatsApp(t)}
                        className="btn"
                        style={{
                          flex: 1,
                          padding: '8px',
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          background: copiedId === t.id ? '#10B981' : '#25D366',
                          color: '#fff',
                          borderRadius: 8,
                          border: 'none',
                        }}
                      >
                        {copiedId === t.id ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedId === t.id ? 'تم النسخ!' : 'واتساب'}</span>
                      </button>

                      <button
                        onClick={() => openEditModal(t)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8, gap: 4 }}
                      >
                        <Pencil size={13} /> تعديل
                      </button>

                      <button
                        onClick={() => toggleStatus(t)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8, gap: 4, color: isSuspended ? '#10B981' : '#F59E0B' }}
                      >
                        <Power size={13} /> {isSuspended ? 'تفعيل' : 'تعليق'}
                      </button>

                      {deleteConfirmId === t.id ? (
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="btn btn-danger"
                          style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                        >
                          تأكيد
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(t.id)}
                          className="btn btn-ghost"
                          style={{ padding: '8px', color: 'var(--danger)' }}
                        >
                          <Trash2 size={15} />
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
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} />
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
                <div className="form-field" style={{ gridColumn: '1 / -1', background: 'rgba(99,102,241,0.08)', padding: 12, borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, fontWeight: 700, color: 'var(--ink)' }}>
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
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px' }}>
                  {editTenant ? 'حفظ التعديلات' : 'تفعيل وإنشاء الحساب 🚀'}
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
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(236,72,153,0.15)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>بيانات حساب مالك المنصة</h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>تخصيص البريد وكلمة المرور الحصرية لك فقط</div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setShowOwnerModal(false)}>
                <X size={20} />
              </button>
            </div>

            {ownerSuccess && (
              <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 10, fontSize: 13, marginBottom: 16, border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} />
                <span>تم حفظ وتأمين بياناتك بنجاح!</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveSuperAdminAccount(ownerForm);
                setOwnerSuccess(true);
                setTimeout(() => setShowOwnerModal(false), 1200);
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
                  required
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  value={ownerForm.email || ''}
                  onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>كلمة المرور الجديدة</label>
                <input
                  type="text"
                  required
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  value={ownerForm.password || ''}
                  onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowOwnerModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}>
                  حفظ وتأمين الحساب 🔒
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
