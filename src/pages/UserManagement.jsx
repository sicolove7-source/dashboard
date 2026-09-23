import React, { useState, useEffect } from 'react';
import {
  UserPlus, Trash2, KeyRound, Eye, EyeOff, CheckCircle2,
  AlertTriangle, X, Pencil, Shield, Users, Copy, Check,
  ChevronDown, Sliders, CheckSquare, Square, Mail, Phone
} from 'lucide-react';
import {
  ROLES, NAV_PERMISSIONS, PERMISSIONS,
  CUSTOMIZABLE_NAV_TABS, CUSTOMIZABLE_ACTIONS
} from '../utils/permissions';
import { getActiveTenantId, loadAllTenants } from '../services/tenantsManager';
import { syncCompanyUsersToCloud, syncTenantUsersToCloud, syncTenantsListToCloud, syncTeamToCloud, sanitizeCompanyUsersForCloud, cleanPhoneNumber } from '../services/cloudSync';
import { sendPasswordReset, callCreateCompanyUser, syncAndResetPhonePassword } from '../services/auth';

// أدوار الشركة المشتركة فقط (استبعاد Super Admin الخاص بالمنصة)
const COMPANY_ROLES = Object.fromEntries(
  Object.entries(ROLES).filter(([key]) => key !== 'super_admin')
);

/* ────────────────────────────────────────────────────────────
   Storage Helper for Isolated Company User Accounts
──────────────────────────────────────────────────────────── */
export function getCompanyUsersKey(companyId) {
  const cId = companyId || getActiveTenantId() || null;
  return cId ? `tenant_${cId}_users` : null;
}

export function loadUsers(companyId) {
  const cId = companyId || getActiveTenantId() || null;
  if (!cId) return [];
  const key = getCompanyUsersKey(cId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return sanitizeCompanyUsersForCloud(parsed);
    }
  } catch (e) {}
  
  // إذا لم توجد مستخدمين للشركة في التخزين المحلي، نحاول جلبهم من بيانات الشركة المعرّفة
  const allTenants = loadAllTenants();
  const tenant = allTenants.find(t => t.id === cId);
  if (tenant && Array.isArray(tenant.users) && tenant.users.length > 0) {
    if (key) try { localStorage.setItem(key, JSON.stringify(tenant.users)); } catch (e) {}
    return sanitizeCompanyUsersForCloud(tenant.users);
  }

  const cleanComp = cId.replace(/^comp_/, '');
  const defaults = [
    { id: `u_${cId}_admin`, email: tenant?.adminEmail || `admin@${cleanComp}.com`, role: 'owner', name: tenant?.adminName || 'مدير الشركة', engineerName: null, companyId: cId },
    { id: `u_${cId}_eng1`, email: `eng@${cleanComp}.com`, role: 'engineer', name: 'مهندس الموقع', engineerName: 'مهندس الموقع', companyId: cId },
    { id: `u_${cId}_supply`, email: `supply@${cleanComp}.com`, role: 'procurement', name: 'مسؤول التوريدات', engineerName: null, companyId: cId },
  ];
  if (key) try { localStorage.setItem(key, JSON.stringify(defaults)); } catch (e) {}
  return defaults;
}

export function saveUsers(users, companyId) {
  const key = getCompanyUsersKey(companyId);
  const clean = sanitizeCompanyUsersForCloud(users);
  try { localStorage.setItem(key, JSON.stringify(clean)); } catch (e) {}
}

export function mergeTeamWithUsers(teamObj, companyUsers) {
  const base = teamObj || { engineers: [], accountants: [], techOffice: [], customerService: [] };
  if (!Array.isArray(companyUsers)) return base;

  const merged = {
    engineers: [...(base.engineers || [])],
    accountants: [...(base.accountants || [])],
    techOffice: [...(base.techOffice || [])],
    customerService: [...(base.customerService || [])]
  };

  companyUsers.forEach(u => {
    if (u.role === 'engineer') {
      const name = (u.engineerName || u.name || '').trim();
      if (name && !merged.engineers.includes(name)) merged.engineers.push(name);
    } else if (u.role === 'accountant') {
      const name = (u.name || '').trim();
      if (name && !merged.accountants.includes(name)) merged.accountants.push(name);
    } else if (u.role === 'tech_office') {
      const name = (u.name || '').trim();
      if (name && !merged.techOffice.includes(name)) merged.techOffice.push(name);
    } else if (u.role === 'customer_service') {
      const name = (u.name || '').trim();
      if (name && !merged.customerService.includes(name)) merged.customerService.push(name);
    }
  });

  return merged;
}

/* ────────────────────────────────────────────────────────────
   Role Icon & Color Helper
──────────────────────────────────────────────────────────── */
function RoleBadge({ role }) {
  const info = COMPANY_ROLES[role] || { label: role, color: '#94a3b8', badge: '👤' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: `${info.color}18`, color: info.color,
      fontSize: 11, fontWeight: 700, border: `1px solid ${info.color}30`,
    }}>
      {info.badge} {info.label}
    </span>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={10} /> {error}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Add / Edit User Modal with Custom Permissions Support
──────────────────────────────────────────────────────────── */
function UserModal({ user, onSave, onClose, existingEmails }) {
  const isEdit = !!user?.id;
  const initialRole = user?.role === 'super_admin' ? 'owner' : (user?.role || 'engineer');

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email && !user?.email.endsWith('@tashteeb.app') ? user.email : '',
    password: '',
    role: initialRole,
    engineerName: user?.engineerName || '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);

  // ── حالة تخصيص الصلاحيات يدوياً ──
  const [isCustom, setIsCustom] = useState(() => {
    return Boolean(user?.hasCustomPermissions || (user?.customNav && user.customNav.length > 0) || user?.customPermissions);
  });

  const [customNav, setCustomNav] = useState(() => {
    if (user?.customNav && Array.isArray(user.customNav)) return user.customNav;
    return NAV_PERMISSIONS[initialRole] || [];
  });

  const [customPermissions, setCustomPermissions] = useState(() => {
    return user?.customPermissions ? { ...user.customPermissions } : {};
  });

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';

    const cleanP = cleanPhoneNumber(form.phone);
    const rawEmail = (form.email || '').trim();

    if (!cleanP && !rawEmail) {
      e.identifier = 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني';
    }

    if (rawEmail) {
      let checkEmail = rawEmail;
      if (!checkEmail.includes('@')) {
        checkEmail = `${checkEmail.toLowerCase()}@company.com`;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkEmail)) {
        e.email = 'يرجى كتابة بريد إلكتروني صالح (مثال: name@company.com)';
      } else if (!isEdit && existingEmails.includes(checkEmail.toLowerCase())) {
        e.email = 'هذا البريد مستخدم بالفعل، يرجى كتابة بريد آخر';
      }
    }

    if (form.phone && form.phone.trim()) {
      if (cleanP.length < 7) {
        e.phone = 'يرجى كتابة رقم هاتف صحيح (7 أرقام على الأقل)';
      }
    }

    // إذا كان حساب جديد بدون بريد إلكتروني (دخول برقم الهاتف فقط)، يجب تحديد كلمة مرور مبدئية
    if (!isEdit && !rawEmail && (!form.password || form.password.trim().length < 6)) {
      e.password = 'يرجى تحديد كلمة مرور للحساب (6 أحرف أو أرقام على الأقل)';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleRoleChange(newRole) {
    setForm(f => ({ ...f, role: newRole, engineerName: f.engineerName || f.name }));
    if (!isCustom) {
      setCustomNav(NAV_PERMISSIONS[newRole] || []);
      setCustomPermissions({});
    }
  }

  function toggleNavTab(navKey) {
    setCustomNav(prev => {
      if (prev.includes(navKey)) {
        return prev.filter(k => k !== navKey);
      } else {
        return [...prev, navKey];
      }
    });
  }

  function isActionAllowed(actionKey) {
    if (typeof customPermissions[actionKey] === 'boolean') {
      return customPermissions[actionKey];
    }
    return (PERMISSIONS[actionKey] || []).includes(form.role);
  }

  function toggleActionPermission(actionKey, nextVal) {
    setCustomPermissions(prev => ({
      ...prev,
      [actionKey]: nextVal,
    }));
  }

  function resetToRoleDefaults() {
    setCustomNav(NAV_PERMISSIONS[form.role] || []);
    setCustomPermissions({});
  }

  function selectAllNavTabs() {
    setCustomNav(CUSTOMIZABLE_NAV_TABS.map(t => t.key));
  }

  function clearAllNavTabs() {
    setCustomNav([]);
  }

  function handleSave() {
    if (!validate()) return;
    
    const cleanP = cleanPhoneNumber(form.phone);
    let cleanEmail = form.email.trim().toLowerCase();
    
    if (!cleanEmail) {
      if (cleanP) {
        cleanEmail = `phone_${cleanP}@tashteeb.app`;
      } else {
        const translit = form.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || ('user' + Date.now().toString().slice(-4));
        cleanEmail = `${translit}@company.com`;
      }
    } else if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@company.com`;
    }

    const effectiveEngName = form.role === 'engineer' ? ((form.engineerName || form.name).trim()) : null;

    onSave({
      ...(user || {}),
      id: user?.id || 'u_' + Date.now(),
      name: form.name.trim(),
      email: cleanEmail,
      phone: form.phone ? form.phone.trim() : (user?.phone || null),
      cleanPhone: cleanP || (user?.cleanPhone || null),
      password: form.password ? form.password.trim() : null,
      role: form.role,
      engineerName: effectiveEngName,
      hasCustomPermissions: isCustom,
      customNav: isCustom ? customNav : null,
      customPermissions: isCustom ? customPermissions : null,
    });
  }

  function copyCredentials() {
    const roleLabel = COMPANY_ROLES[form.role]?.label || form.role;
    const phoneDisplay = form.phone ? `\nرقم الهاتف: ${form.phone}` : '';
    const emailDisplay = (form.email && !form.email.endsWith('@tashteeb.app')) ? `\nالبريد الإلكتروني: ${form.email}` : '';
    const passDisplay = form.password ? `\nكلمة المرور: ${form.password}` : '';
    const text = `بيانات الدخول لحساب المستخدم في منصة تشطيب برو:\nالاسم: ${form.name}${phoneDisplay}${emailDisplay}${passDisplay}\nالدور الوظيفي: ${roleLabel}\nرابط تسجيل الدخول: https://tashteebpro.com/login`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: 'var(--card)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border)', borderRadius: 20,
        padding: 24, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        animation: 'slideUpFade 0.3s ease',
      }} dir="rtl">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: '#0F172A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isEdit ? <Pencil size={18} color="#fff" /> : <UserPlus size={18} color="#fff" />}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{isEdit ? 'تعديل حساب وصلاحيات المستخدم' : 'إضافة مستخدم جديد وتحديد صلاحياته'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>تحكم في التبويبات والإجراءات المسموحة له فوراً</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.keys(errors).length > 0 && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#EF4444',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertTriangle size={16} />
              <span>يرجى استكمال البيانات المطلوبة: {Object.values(errors).join(' • ')}</span>
            </div>
          )}

          <Field label="الاسم الكامل *" error={errors.name}>
            <input
              type="text"
              className="filter-input"
              style={{ width: '100%' }}
              placeholder="مثال: أ. محمود فوزي (مسؤول التوريدات) أو م. أحمد كامل"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </Field>

          {/* رقم الهاتف للدخول */}
          <Field label="رقم الهاتف للدخول (موصى به للدخول السريع دون إيميل)" error={errors.phone || errors.identifier}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="filter-input"
                style={{
                  width: '100%',
                  direction: 'ltr',
                  textAlign: 'right',
                  paddingLeft: 14,
                  paddingRight: 38,
                  fontSize: 13.5
                }}
                placeholder="مثال: 01012345678 أو +2010..."
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
              <div style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#1877F2',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Phone size={16} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
              💡 يُمكّن الموظف من الدخول برقم هاتفه مباشرة من أي جهاز مع كلمة المرور.
            </div>
          </Field>

          {/* البريد الإلكتروني للدخول */}
          <Field label="البريد الإلكتروني (اختياري عند توفر رقم هاتف)" error={errors.email}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="email"
                className="filter-input"
                style={{
                  width: '100%',
                  direction: 'ltr',
                  textAlign: 'left',
                  paddingLeft: 38,
                  paddingRight: 14,
                  fontSize: 13.5
                }}
                placeholder="user@company.com (اختياري)"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value.trim() }))}
                disabled={isEdit && !!user?.email && !user?.email.endsWith('@tashteeb.app')}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <div style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Mail size={16} />
              </div>
            </div>
            {isEdit && !!user?.email && !user?.email.endsWith('@tashteeb.app') && (
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>⚠️ لا يمكن تغيير البريد الرسمي بعد الإنشاء لربط البيانات</div>
            )}
          </Field>

          {/* كلمة مرور الحساب */}
          <Field label={isEdit ? "تغيير كلمة المرور (اختياري)" : (!form.email ? "كلمة مرور الحساب للدخول بالهاتف *" : "كلمة المرور المبدئية (اختياري)")} error={errors.password}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="filter-input"
                style={{
                  width: '100%',
                  direction: 'ltr',
                  textAlign: 'left',
                  paddingLeft: 38,
                  paddingRight: 38,
                  fontSize: 13.5
                }}
                placeholder="6 أحرف أو أرقام على الأقل"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <div style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center'
              }}>
                <KeyRound size={16} />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
              🔒 تُمكّن الموظف من تسجيل الدخول فوراً برقم هاتفه وكلمة المرور دون انتظار أي رسائل.
            </div>
          </Field>

          {/* Security & Authentication Info Badge */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <Shield size={20} color="#10B981" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: '#065F46', lineHeight: 1.5 }}>
              <strong>دخول موحد وآمن 100%:</strong> يدعم النظام الدخول برقم الهاتف أو البريد الإلكتروني مع كلمة المرور مجاناً وبدون أي فواتير SMS. يتم حفظ وتأمين الحسابات عبر Google Firebase Auth.
            </div>
          </div>

          <Field label="الدور الوظيفي الأساسي *" error={errors.role}>
            <select
              className="filter-select"
              style={{ width: '100%' }}
              value={form.role}
              onChange={e => handleRoleChange(e.target.value)}
            >
              {Object.entries(COMPANY_ROLES).map(([key, info]) => (
                <option key={key} value={key}>{info.badge} {info.label}</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {COMPANY_ROLES[form.role]?.description}
            </div>
          </Field>

          {/* Engineer Name — only for engineer role */}
          {form.role === 'engineer' && (
            <Field label="اسم المهندس في المشاريع *" error={errors.engineerName}>
              <input
                type="text"
                className="filter-input"
                style={{ width: '100%' }}
                placeholder="مثال: م. أحمد كامل (مطابق للاسم في المشاريع)"
                value={form.engineerName}
                onChange={e => setForm(f => ({ ...f, engineerName: e.target.value }))}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                ⚠️ سيشاهد هذا المهندس فقط المشاريع التي يُعيّن فيها اسمه كمهندس موقع (ما لم تمنحه صلاحية رؤية الكل أدناه).
              </div>
            </Field>
          )}

          {/* Permissions Preview */}
          <div style={{
            background: 'rgba(0,0,0,0.02)', borderRadius: 12, padding: '10px 14px',
            border: '1px solid var(--border)', fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: COMPANY_ROLES[form.role]?.color }}>
              صلاحيات {COMPANY_ROLES[form.role]?.label}:
            </div>
            <div style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              {form.role === 'owner' && '• صلاحية كاملة: إضافة وتعديل وحذف المشاريع، المالية، الموردين، وإدارة المستخدمين.'}
              {form.role === 'procurement' && '• مسؤول التوريدات والمشتريات: دليل الموردين، أوامر التوريد، ومتابعة واعتماد طلبيات المواد والمعدات لكافة المواقع.'}
              {form.role === 'accountant' && '• المالية الشاملة والموردين والمقايسات، وعرض تفاصيل المشاريع المالية.'}
              {form.role === 'engineer' && '• مشاريعه المسندة إليه فقط: الجدول الزمني، اليوميات، الملاحظات، وطلب توريدات موقعه.'}
              {form.role === 'tech_office' && '• المواصفات، الجداول، المخططات، والمقايسات لجميع المشاريع.'}
              {form.role === 'customer_service' && '• عرض حالة المشاريع ونسب الإنجاز والتقارير لمتابعة العملاء.'}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────
             Advanced Custom Permissions Accordion
          ──────────────────────────────────────────────────────────── */}
          <div style={{
            border: `1.5px solid ${isCustom ? '#D97706' : 'var(--border)'}`,
            borderRadius: 14,
            background: isCustom ? 'rgba(217, 119, 6, 0.02)' : 'transparent',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
          }}>
            {/* Accordion Header / Toggle */}
            <div
              onClick={() => setIsCustom(v => !v)}
              style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: isCustom ? 'rgba(217, 119, 6, 0.08)' : 'rgba(0,0,0,0.02)',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={isCustom}
                  onChange={e => { e.stopPropagation(); setIsCustom(e.target.checked); }}
                  style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#D97706' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isCustom ? '#B45309' : 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>⚙️</span> تخصيص الصلاحيات يدوياً لهذا المستخدم
                    {isCustom && <span style={{ fontSize: 10, background: '#D97706', color: '#fff', padding: '1px 6px', borderRadius: 6 }}>مفعّل</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {isCustom
                      ? 'يمكنك تحديد التبويبات والإجراءات المسموحة بدقة، وتجاوز صلاحيات الدور الافتراضية'
                      : 'انقر لتخصيص تبويبات وإجراءات معينة لهذا الموظف بشكل مستقل'}
                  </div>
                </div>
              </div>
              <ChevronDown
                size={18}
                style={{
                  transform: isCustom ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  color: isCustom ? '#D97706' : 'var(--muted)',
                }}
              />
            </div>

            {/* Customization Body */}
            {isCustom && (
              <div style={{ padding: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* 1. Navigation Tabs Access */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>
                      📑 التبويبات المسموحة في القائمة الجانبية:
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={selectAllNavTabs}
                        style={{ fontSize: 11, padding: '2px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)' }}
                      >
                        تحديد الكل
                      </button>
                      <button
                        type="button"
                        onClick={clearAllNavTabs}
                        style={{ fontSize: 11, padding: '2px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)' }}
                      >
                        إلغاء الكل
                      </button>
                      <button
                        type="button"
                        onClick={resetToRoleDefaults}
                        style={{ fontSize: 11, padding: '2px 8px', background: 'transparent', border: '1px solid #D9770650', borderRadius: 6, cursor: 'pointer', color: '#D97706', fontWeight: 700 }}
                      >
                        ↺ ضبط للافتراضي
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                    {CUSTOMIZABLE_NAV_TABS.map(tabItem => {
                      const isChecked = customNav.includes(tabItem.key);
                      return (
                        <div
                          key={tabItem.key}
                          onClick={() => toggleNavTab(tabItem.key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: 8,
                            border: `1.5px solid ${isChecked ? '#D97706' : 'var(--border)'}`,
                            background: isChecked ? 'rgba(217, 119, 6, 0.08)' : 'rgba(0,0,0,0.01)',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent div onClick
                            style={{ accentColor: '#D97706', cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: isChecked ? 800 : 500, color: isChecked ? '#92400E' : 'var(--ink)' }}>
                              {tabItem.badge} {tabItem.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Granular Action Permissions by Category */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
                    🛡️ الصلاحيات والإجراءات الدقيقة:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {CUSTOMIZABLE_ACTIONS.map(cat => (
                      <div
                        key={cat.category}
                        style={{
                          background: 'rgba(0,0,0,0.02)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{cat.icon}</span> {cat.category}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 6 }}>
                          {cat.items.map(item => {
                            const allowed = isActionAllowed(item.key);
                            return (
                              <label
                                key={item.key}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 7,
                                  cursor: 'pointer', fontSize: 11.5,
                                  padding: '4px 6px', borderRadius: 6,
                                  background: allowed ? 'rgba(16,185,129,0.05)' : 'transparent',
                                  color: allowed ? 'var(--ink)' : 'var(--muted)',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={allowed}
                                  onChange={e => toggleActionPermission(item.key, e.target.checked)}
                                  style={{ marginTop: 2, accentColor: '#10B981', cursor: 'pointer' }}
                                />
                                <span>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          {isEdit && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={copyCredentials}
              style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              {copied ? 'تم النسخ!' : 'نسخ بيانات الدخول'}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} style={{ minWidth: 120 }}>
            {isEdit ? 'حفظ التعديلات' : 'إنشاء الحساب'}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────────────────── */
export default function UserManagement({ currentUser, companyId, team, onTeamChange }) {
  const activeCompId = companyId || currentUser?.companyId || getActiveTenantId() || null;
  const [users, setUsers] = useState(() => loadUsers(activeCompId));
  const [modal, setModal] = useState(null); // null | 'add' | user object for edit
  const [deleteId, setDeleteId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [resetSentEmail, setResetSentEmail] = useState(null);
  const [resetFeedback, setResetFeedback] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(null); // email being invited
  const [resetPassModal, setResetPassModal] = useState(null); // user object | null
  const [newPass, setNewPass] = useState('');
  const [resetPassLoading, setResetPassLoading] = useState(false);
  const [resetPassMsg, setResetPassMsg] = useState(null);

  async function handleSendResetEmail(email) {
    if (!email) return;
    if (email.endsWith('@tashteeb.app')) {
      alert("هذا الحساب مسجل برقم هاتف وبدون بريد إلكتروني حقيقي.\nيمكنك الضغط على زر 'تعديل' ✏️ لتعيين كلمة مرور جديدة للموظف مباشرة.");
      return;
    }
    setInviteLoading(email);
    try {
      const user = users.find(u => u.email === email);
      const res = await callCreateCompanyUser({
        email,
        name: user?.name || email,
        role: user?.role || 'engineer',
        companyId: activeCompId,
      });

      if (res?.success) {
        setResetSentEmail(email);
        setResetFeedback(res.message || `✅ تم إرسال رابط الدخول إلى ${email} ✉️`);
      } else {
        alert(`تعذر إرسال الدعوة:\n${res?.error || 'خطأ غير معروف'}`);
      }
    } catch (e) {
      alert(e.message || 'حدث خطأ غير متوقع أثناء إرسال الرابط');
    } finally {
      setInviteLoading(null);
      setTimeout(() => {
        setResetSentEmail(null);
        setResetFeedback(null);
      }, 8000);
    }
  }

  async function handleAdminResetPassword() {
    if (!resetPassModal || !newPass || newPass.length < 6) return;
    setResetPassLoading(true);
    setResetPassMsg(null);
    try {
      let res;
      const isPhoneAccount = resetPassModal.phone || resetPassModal.email?.endsWith('@tashteeb.app');
      if (isPhoneAccount) {
        const phoneToReset = resetPassModal.phone || resetPassModal.email;
        res = await syncAndResetPhonePassword(phoneToReset, newPass, resetPassModal.email);
      } else {
        res = await callCreateCompanyUser({
          email: resetPassModal.email,
          name: resetPassModal.name,
          role: resetPassModal.role,
          companyId: activeCompId,
          password: newPass,
        });
      }
      if (res?.success) {
        const updatedUsers = users.map(u => u.id === resetPassModal.id ? { ...u, updatedAt: new Date().toISOString() } : u);
        persist(updatedUsers);
        setResetPassMsg({ type: 'success', text: `✅ تم تعيين كلمة مرور جديدة لـ ${resetPassModal.name} بنجاح` });
        setTimeout(() => { setResetPassModal(null); setNewPass(''); setResetPassMsg(null); }, 2000);
      } else {
        setResetPassMsg({ type: 'error', text: res?.error || 'تعذّر تعيين كلمة المرور' });
      }
    } catch (e) {
      setResetPassMsg({ type: 'error', text: e.message || 'حدث خطأ غير متوقع' });
    } finally {
      setResetPassLoading(false);
    }
  }

  // تحديث المستخدمين عند تغيير الشركة
  useEffect(() => {
    setUsers(loadUsers(activeCompId));
  }, [activeCompId]);

  function persist(next) {
    const cleanNext = (next || []).map(u => {
      if (!u) return u;
      const { password: _p, adminPassword: _ap, ...safeU } = u;
      return safeU;
    });
    setUsers(cleanNext);
    saveUsers(cleanNext, activeCompId);
    try {
      syncCompanyUsersToCloud(activeCompId, cleanNext).catch(e => console.warn("Cloud sync users error:", e));
      syncTenantUsersToCloud(activeCompId, cleanNext).catch(e => console.warn("Cloud sync tenant users error:", e));
    } catch (e) {}

    // حفظ وفهرسة فورية في السجل المركزي platform-all-users-registry بالإيميل ورقم الهاتف
    try {
      const regRaw = localStorage.getItem('platform-all-users-registry');
      const reg = regRaw ? JSON.parse(regRaw) : {};
      next.forEach(u => {
        const uWithComp = {
          ...u,
          companyId: activeCompId,
        };
        if (u.email) {
          reg[u.email.toLowerCase().trim()] = uWithComp;
        }
        if (u.phone || u.cleanPhone) {
          const cP = cleanPhoneNumber(u.phone || u.cleanPhone);
          if (cP) {
            reg['phone_' + cP] = uWithComp;
            reg[cP] = uWithComp;
          }
        }
      });
      localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));
    } catch (e) {}

    // تحديث قائمة أعضاء الشركة في platform-tenants-master-v1 مع المزامنة السحابية الفورية
    try {
      const rawTenants = localStorage.getItem('platform-tenants-master-v1');
      if (rawTenants) {
        const tList = JSON.parse(rawTenants);
        const idx = tList.findIndex(t => t.id === activeCompId);
        if (idx !== -1) {
          tList[idx].users = next;
          tList[idx].authorizedEmails = next.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean);
          localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tList));
          syncTenantsListToCloud(tList).catch(e => console.warn("Cloud sync tenants list error:", e));
        }
      }
    } catch (e) {}

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSaveUser(userData) {
    const { password: rawPassword, ...safeUserData } = userData;
    const userWithComp = { ...safeUserData, companyId: activeCompId };
    let nextUsers;
    const isNewUser = !(userData.id && users.find(u => u.id === userData.id));

    if (!isNewUser) {
      // تعديل
      nextUsers = users.map(u => u.id === userData.id ? userWithComp : u);
    } else {
      // إضافة (أضف أعلى القائمة للظهور الفوري)
      nextUsers = [userWithComp, ...users];
      setFilterRole('all');
    }
    persist(nextUsers);

    // إنشاء أو تحديث حساب Firebase Auth وتفعيل كلمة المرور عبر Cloud Function الآمنة
    if (rawPassword && rawPassword.length >= 6) {
      try {
        const isPhoneAccount = userData.phone || userData.email?.endsWith('@tashteeb.app');
        if (isPhoneAccount) {
          const p = userData.phone || userData.email;
          await syncAndResetPhonePassword(p, rawPassword, userData.email);
        }
        await callCreateCompanyUser({
          email: userData.email,
          name: userData.name,
          role: userData.role,
          companyId: activeCompId,
          password: rawPassword,
        });
        setResetFeedback(`✅ تم تحديث بيانات وكلمة مرور ${userData.name} بنجاح وتفعيلها للمصادقة`);
        setTimeout(() => setResetFeedback(null), 8000);
      } catch (pwErr) {
        console.warn('[handleSaveUser] Password sync error:', pwErr);
      }
    } else if (isNewUser && (userData.email || userData.phone)) {
      try {
        const cloudRes = await callCreateCompanyUser({
          email: userData.email,
          name: userData.name,
          role: userData.role,
          companyId: activeCompId,
          password: userData.password,
        });
        if (cloudRes?.success) {
          const msg = cloudRes.message || (userData.password
            ? `✅ تم إنشاء وتفعيل حساب ${userData.name} بكلمة المرور المحددة`
            : `✅ تم إنشاء حساب لـ ${userData.name} وإرسال رابط الدخول إلى ${userData.email} ✉️`);
          setResetFeedback(msg);
          setTimeout(() => setResetFeedback(null), 10000);
        } else if (cloudRes?.error) {
          setResetFeedback(`⚠️ ${cloudRes.error}`);
          setTimeout(() => setResetFeedback(null), 8000);
        }
      } catch (cloudErr) {
        console.warn('[handleSaveUser] Cloud create user error (non-critical):', cloudErr);
      }
    }


    // ── مزامنة فورية وتلقائية مع فريق العمل (team) ──
    try {
      const roleToGroup = {
        engineer: 'engineers',
        accountant: 'accountants',
        tech_office: 'techOffice',
        customer_service: 'customerService',
      };
      const group = roleToGroup[userData.role];
      if (group) {
        const memberName = (userData.role === 'engineer' ? (userData.engineerName || userData.name) : userData.name).trim();
        const teamKey = `tenant_${activeCompId}_team`;
        const rawTeam = localStorage.getItem(teamKey);
        const currentTeam = team || (rawTeam ? JSON.parse(rawTeam) : { engineers: [], accountants: [], techOffice: [], customerService: [] });
        const list = currentTeam[group] || [];
        if (memberName && !list.includes(memberName)) {
          const updatedTeam = {
            ...currentTeam,
            [group]: [memberName, ...list]
          };
          localStorage.setItem(teamKey, JSON.stringify(updatedTeam));
          try { syncTeamToCloud(activeCompId, updatedTeam).catch(() => {}); } catch (e) {}
          onTeamChange?.(updatedTeam);
        }
      }
    } catch (err) {
      console.warn("Auto sync user to team error:", err);
    }

    setModal(null);
  }

  function handleDelete(id) {
    const target = users.find(u => u.id === id);
    if (id === currentUser?.id || target?.email === currentUser?.email) {
      alert('لا يمكن حذف حسابك الخاص!');
      return;
    }
    const nextUsers = users.filter(u => u.id !== id);
    persist(nextUsers);

    // أيضاً مزامنة الحذف من فريق العمل إذا وجد
    if (target) {
      try {
        const roleToGroup = {
          engineer: 'engineers',
          accountant: 'accountants',
          tech_office: 'techOffice',
          customer_service: 'customerService',
        };
        const group = roleToGroup[target.role];
        if (group) {
          const memberName = (target.role === 'engineer' ? (target.engineerName || target.name) : target.name).trim();
          const teamKey = `tenant_${activeCompId}_team`;
          const rawTeam = localStorage.getItem(teamKey);
          const currentTeam = team || (rawTeam ? JSON.parse(rawTeam) : {});
          if (memberName && (currentTeam[group] || []).includes(memberName)) {
            const updatedTeam = {
              ...currentTeam,
              [group]: currentTeam[group].filter(n => n !== memberName)
            };
            localStorage.setItem(teamKey, JSON.stringify(updatedTeam));
            try { syncTeamToCloud(activeCompId, updatedTeam).catch(() => {}); } catch (e) {}
            onTeamChange?.(updatedTeam);
          }
        }
      } catch (err) {}
    }

    setDeleteId(null);
  }

  function copyCredentials(user) {
    const text = `البريد الإلكتروني: ${user.email}\nالاسم: ${user.name}\nالدور: ${COMPANY_ROLES[user.role]?.label || user.role}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(user.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // فلترة قائمة المستخدمين
  const filtered = filterRole === 'all' ? users : users.filter(u => u.role === filterRole);

  // إحصائيات الأدوار للشركة المشتركة فقط
  const counts = Object.keys(COMPANY_ROLES).reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  return (
    <div className="grid tab-fade" style={{ gap: 24 }} dir="rtl">

      {/* ─── Header ─── */}
      <div className="panel" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Shield size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--ink)' }}>
              إدارة حسابات وصلاحيات مستخدمي الشركة
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              أضف مسؤولي التوريدات والمهندسين والمحاسبين وخصص الصلاحيات والتبويبات المسموحة لكل مستخدم بدقة
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setModal('add')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
          >
            <UserPlus size={16} /> إضافة مستخدم جديد
          </button>
        </div>
      </div>

      {/* ─── Feedback Toast ─── */}
      {saved && (
        <div style={{
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
          color: '#10B981', padding: '10px 16px', borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700,
          animation: 'fadeIn 0.2s ease',
        }}>
          <CheckCircle2 size={16} /> تم حفظ حسابات وصلاحيات المستخدمين بنجاح
        </div>
      )}

      {/* ─── Reset Password Feedback Banner ─── */}
      {resetFeedback && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#2563EB', padding: '10px 16px', borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700,
          animation: 'fadeIn 0.2s ease',
        }}>
          <CheckCircle2 size={16} /> {resetFeedback}
        </div>
      )}

      {/* ─── Role Filters ─── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className={`filter-pill ${filterRole === 'all' ? 'active' : ''}`}
          onClick={() => setFilterRole('all')}
        >
          الكل ({users.length})
        </button>
        {Object.entries(COMPANY_ROLES).map(([key, info]) => (
          <button
            key={key}
            className={`filter-pill ${filterRole === key ? 'active' : ''}`}
            onClick={() => setFilterRole(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>{info.badge}</span>
            <span>{info.label} ({counts[key] || 0})</span>
          </button>
        ))}
      </div>

      {/* ─── Users Table ─── */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="data-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>بيانات الدخول (الهاتف / البريد)</th>
                <th>الدور والصلاحيات</th>
                <th>المهندس المرتبط</th>
                <th>حالة الأمان والتوثيق</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                    <Users size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div>لا يوجد مستخدمون في هذا التصنيف</div>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isCurrent = u.id === currentUser?.id || u.email === currentUser?.email;
                  const isCopied = copiedId === u.id;
                  const hasCustom = Boolean(u.hasCustomPermissions || (u.customNav && u.customNav.length > 0) || u.customPermissions);

                  return (
                    <tr key={u.id}>
                      {/* Name + Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: '#0F172A',
                            color: '#fff', fontWeight: 800, fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {u.name ? u.name.trim()[0] : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                              {u.name}
                              {isCurrent && (
                                <span style={{
                                  marginRight: 6, fontSize: 10, padding: '2px 8px',
                                  borderRadius: 8, background: '#F1F5F9',
                                  color: '#0F172A', fontWeight: 700,
                                  border: '1px solid #CBD5E1'
                                }}>
                                  أنت
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>#{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Email */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {u.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                              <Phone size={13} color="#1877F2" />
                              <span style={{ direction: 'ltr' }}>{u.phone}</span>
                            </div>
                          )}
                          {u.email && !u.email.endsWith('@tashteeb.app') ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)' }}>
                              <Mail size={12} />
                              <span className="font-mono" style={{ direction: 'ltr' }}>{u.email}</span>
                            </div>
                          ) : !u.phone ? (
                            <span className="font-mono" style={{ fontSize: 13, direction: 'ltr', display: 'inline-block' }}>
                              {u.email}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Role & Customization Badge */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <RoleBadge role={u.role} />
                          {hasCustom && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '2px 8px', borderRadius: 12,
                              background: '#D9770618', color: '#B45309',
                              fontSize: 10, fontWeight: 800, border: '1px solid #D9770630',
                            }}>
                              ⚙️ مخصّص
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Engineer Name Link */}
                      <td>
                        {u.role === 'engineer' ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>
                            🏗️ {u.engineerName || u.name}
                          </span>
                        ) : u.role === 'procurement' ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>
                            📦 مسؤول توريدات لجميع المواقع
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                        )}
                      </td>

                      {/* Security Status */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 12,
                            background: '#10B98115',
                            color: '#059669',
                            fontSize: 11,
                            fontWeight: 700,
                            border: '1px solid #10B98130',
                          }}>
                            <Shield size={12} /> موثق سحابياً
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {/* Send Reset Email / Invite - for email users only */}
                          {!u.email?.endsWith('@tashteeb.app') && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                padding: '6px 10px', fontSize: 11,
                                display: 'flex', alignItems: 'center', gap: 4,
                                color: resetSentEmail === u.email ? '#10B981' : '#2563EB',
                                background: resetSentEmail === u.email ? '#10B98118' : '#EFF6FF',
                                border: `1px solid ${resetSentEmail === u.email ? '#10B98140' : '#BFDBFE'}`,
                                borderRadius: 8,
                                opacity: inviteLoading === u.email ? 0.6 : 1,
                                cursor: inviteLoading === u.email ? 'not-allowed' : 'pointer',
                              }}
                              onClick={() => handleSendResetEmail(u.email)}
                              disabled={inviteLoading === u.email}
                              title="إنشاء حساب وإرسال رابط تعيين كلمة المرور إلى بريده"
                            >
                              {inviteLoading === u.email
                                ? <span style={{ fontSize: 12 }}>⌛</span>
                                : resetSentEmail === u.email
                                  ? <Check size={13} color="#10B981" />
                                  : <Mail size={13} />}
                              <span>{inviteLoading === u.email ? 'جاري...' : resetSentEmail === u.email ? 'أرسل!' : 'دعوة'}</span>
                            </button>
                          )}

                          {/* Reset Password for phone-only users */}
                          {u.email?.endsWith('@tashteeb.app') && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                padding: '6px 10px', fontSize: 11,
                                display: 'flex', alignItems: 'center', gap: 4,
                                color: '#D97706', background: '#FFFBEB',
                                border: '1px solid #FDE68A', borderRadius: 8, cursor: 'pointer',
                              }}
                              onClick={() => { setResetPassModal(u); setNewPass(''); setResetPassMsg(null); }}
                              title="تعيين كلمة مرور جديدة لمستخدم الهاتف"
                            >
                              <KeyRound size={13} />
                              <span>كلمة مرور</span>
                            </button>
                          )}

                          {/* Copy */}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px 8px', fontSize: 12 }}
                            onClick={() => copyCredentials(u)}
                            title="نسخ بيانات الحساب"
                          >
                            {isCopied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px 8px', fontSize: 12 }}
                            onClick={() => setModal(u)}
                            title="تعديل الحساب وتخصيص الصلاحيات"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Delete */}
                          {!isCurrent && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '6px 8px', color: '#EF4444', fontSize: 12 }}
                              onClick={() => setDeleteId(u.id)}
                              title="حذف الحساب"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, textAlign: 'center',
          }} dir="rtl">
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>تأكيد حذف الحساب</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              هل أنت متأكد من حذف حساب ({users.find(u => u.id === deleteId)?.name})؟ لن يتمكن من الدخول للمنصة مجدداً.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button>
              <button className="btn" style={{ background: '#EF4444', color: '#fff' }} onClick={() => handleDelete(deleteId)}>
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add/Edit Modal ─── */}
      {modal && (
        <UserModal
          user={modal === 'add' ? null : modal}
          existingEmails={users.filter(u => u.id !== modal?.id).map(u => u.email.toLowerCase())}
          onSave={handleSaveUser}
          onClose={() => setModal(null)}
        />
      )}

      {/* ─── Reset Password Modal ─── */}
      {resetPassModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 420,
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          }} dir="rtl">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#D9770618', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>تعيين كلمة مرور جديدة</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{resetPassModal.name} {resetPassModal.phone ? `(${resetPassModal.phone})` : ''}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setResetPassModal(null); setNewPass(''); setResetPassMsg(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {resetPassMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 700,
                background: resetPassMsg.type === 'success' ? '#10B98118' : 'rgba(239,68,68,0.1)',
                color: resetPassMsg.type === 'success' ? '#059669' : '#EF4444',
                border: `1px solid ${resetPassMsg.type === 'success' ? '#10B98130' : 'rgba(239,68,68,0.25)'}`,
              }}>
                {resetPassMsg.text}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                كلمة المرور الجديدة *
              </label>
              <input
                type="text"
                className="filter-input"
                style={{ width: '100%', direction: 'ltr', textAlign: 'left', fontSize: 14 }}
                placeholder="6 أحرف أو أرقام على الأقل"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                💡 سيتمكن الموظف من تسجيل الدخول فوراً برقم هاتفه ({resetPassModal.phone || resetPassModal.email}) وكلمة المرور هذه دون الحاجة لرسائل SMS.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setResetPassModal(null); setNewPass(''); setResetPassMsg(null); }}
                disabled={resetPassLoading}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#0F172A', color: '#fff' }}
                onClick={handleAdminResetPassword}
                disabled={resetPassLoading || !newPass || newPass.length < 6}
              >
                {resetPassLoading ? 'جاري الحفظ والتفعيل...' : 'حفظ وتفعيل كلمة المرور'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
