import React, { useState, useEffect } from 'react';
import {
  UserPlus, Trash2, KeyRound, Eye, EyeOff, CheckCircle2,
  AlertTriangle, X, Pencil, Shield, Users, Copy, Check
} from 'lucide-react';
import { ROLES } from '../utils/permissions';
import { getActiveTenantId } from '../services/tenantsManager';

// أدوار الشركة المشتركة فقط (استبعاد Super Admin الخاص بالمنصة)
const COMPANY_ROLES = Object.fromEntries(
  Object.entries(ROLES).filter(([key]) => key !== 'super_admin')
);

/* ────────────────────────────────────────────────────────────
   Storage Helper for Isolated Company User Accounts
──────────────────────────────────────────────────────────── */
export function getCompanyUsersKey(companyId) {
  const cId = companyId || getActiveTenantId() || 'comp_alain';
  return `tenant_${cId}_users`;
}

export function loadUsers(companyId) {
  const key = getCompanyUsersKey(companyId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  
  // إذا لم توجد مستخدمين للشركة
  const cId = companyId || getActiveTenantId() || 'comp_alain';
  let defaults = [];
  if (cId === 'comp_alain') {
    defaults = [
      { id: 'u_alain_1', email: 'ceo@alain-contract.ae', password: '123456', role: 'owner', name: 'أ. هزاع الشامسي', engineerName: null, companyId: 'comp_alain' },
      { id: 'u_alain_2', email: 'eng@alain-contract.ae', password: '123456', role: 'engineer', name: 'م. هزاع المنصوري', engineerName: 'م. هزاع المنصوري', companyId: 'comp_alain' },
    ];
  } else if (cId === 'comp_dhabi') {
    defaults = [
      { id: 'u_dhabi_1', email: 'admin@dar-dhabi.ae', password: '123456', role: 'owner', name: 'م. عبد الله الظاهري', engineerName: null, companyId: 'comp_dhabi' },
      { id: 'u_dhabi_2', email: 'eng@dar-dhabi.ae', password: '123456', role: 'engineer', name: 'م. ناصر الهاشمي', engineerName: 'م. ناصر الهاشمي', companyId: 'comp_dhabi' },
    ];
  } else {
    defaults = [
      { id: 'u_cairo_1', email: 'admin@al-ofok.com', password: '123456', role: 'owner', name: 'م. شريف عزمي', engineerName: null, companyId: 'comp_cairo' },
      { id: 'u_cairo_2', email: 'eng@al-ofok.com', password: '123456', role: 'engineer', name: 'م. أحمد كامل', engineerName: 'م. أحمد كامل', companyId: 'comp_cairo' },
    ];
  }
  try { localStorage.setItem(key, JSON.stringify(defaults)); } catch (e) {}
  return defaults;
}

export function saveUsers(users, companyId) {
  const key = getCompanyUsersKey(companyId);
  try { localStorage.setItem(key, JSON.stringify(users)); } catch (e) {}
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

/* ────────────────────────────────────────────────────────────
   Add / Edit User Modal
──────────────────────────────────────────────────────────── */
function UserModal({ user, onSave, onClose, existingEmails }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: user?.password || '',
    role: user?.role === 'super_admin' ? 'owner' : (user?.role || 'engineer'),
    engineerName: user?.engineerName || '',
  });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    if (!form.email.trim()) e.email = 'البريد مطلوب';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'بريد إلكتروني غير صحيح';
    else if (!isEdit && existingEmails.includes(form.email.toLowerCase().trim())) e.email = 'هذا البريد مستخدم بالفعل';
    if (!form.password || form.password.length < 4) e.password = 'كلمة المرور 4 أحرف على الأقل';
    if (form.role === 'engineer' && !form.engineerName.trim()) e.engineerName = 'اسم المهندس مطلوب لربطه بالمشاريع';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      ...(user || {}),
      id: user?.id || 'u_' + Date.now(),
      name: form.name.trim(),
      email: form.email.toLowerCase().trim(),
      password: form.password,
      role: form.role,
      engineerName: form.role === 'engineer' ? form.engineerName.trim() : null,
    });
  }

  function copyCredentials() {
    const text = `البريد: ${form.email}\nكلمة المرور: ${form.password}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const Field = ({ label, error, children }) => (
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

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: 'var(--card)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border)', borderRadius: 20,
        padding: 28, width: '100%', maxWidth: 460,
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        animation: 'slideUpFade 0.3s ease',
      }} dir="rtl">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366F1, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}>
              {isEdit ? <Pencil size={18} color="#fff" /> : <UserPlus size={18} color="#fff" />}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{isEdit ? 'تعديل حساب' : 'إضافة مستخدم جديد'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>سيتمكن من الدخول فوراً</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Field label="الاسم الكامل *" error={errors.name}>
            <input
              type="text"
              className="filter-input"
              style={{ width: '100%' }}
              placeholder="مثال: م. أحمد علي"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </Field>

          <Field label="البريد الإلكتروني *" error={errors.email}>
            <input
              type="email"
              className="filter-input"
              style={{ width: '100%', direction: 'ltr', textAlign: 'right' }}
              placeholder="ahmed@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              disabled={isEdit}
            />
            {isEdit && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>⚠️ لا يمكن تغيير البريد بعد الإنشاء</div>}
          </Field>

          <Field label="كلمة المرور *" error={errors.password}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="filter-input"
                style={{ width: '100%', paddingLeft: 40, direction: 'ltr', textAlign: 'right' }}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <Field label="الدور / الصلاحية *" error={errors.role}>
            <select
              className="filter-select"
              style={{ width: '100%' }}
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value, engineerName: '' }))}
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
                ⚠️ سيشاهد هذا المهندس فقط المشاريع التي يُعيّن فيها اسمه كمهندس موقع.
              </div>
            </Field>
          )}

          {/* Permissions Preview */}
          <div style={{
            background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: '10px 14px',
            border: '1px solid var(--border)', fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: COMPANY_ROLES[form.role]?.color }}>
              صلاحيات {COMPANY_ROLES[form.role]?.label}:
            </div>
            <div style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              {form.role === 'owner' && '• صلاحية كاملة: إضافة وتعديل وحذف المشاريع، المالية، الموردين، وإدارة المستخدمين.'}
              {form.role === 'accountant' && '• المالية الشاملة والموردين والمقايسات، وعرض تفاصيل المشاريع المالية.'}
              {form.role === 'engineer' && '• مشاريعه المسندة إليه فقط: الجدول الزمني، اليوميات، الملاحظات، والمواصفات.'}
              {form.role === 'tech_office' && '• المواصفات، الجداول، المخططات، والمقايسات لجميع المشاريع.'}
              {form.role === 'customer_service' && '• عرض حالة المشاريع ونسب الإنجاز والتقارير لمتابعة العملاء.'}
            </div>
          </div>

        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
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
          <button type="button" className="btn btn-primary" onClick={handleSave}>
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
export default function UserManagement({ currentUser, companyId }) {
  const activeCompId = companyId || currentUser?.companyId || getActiveTenantId() || 'comp_alain';
  const [users, setUsers] = useState(() => loadUsers(activeCompId));
  const [modal, setModal] = useState(null); // null | 'add' | user object for edit
  const [deleteId, setDeleteId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [showPassFor, setShowPassFor] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // تحديث المستخدمين عند تغيير الشركة
  useEffect(() => {
    setUsers(loadUsers(activeCompId));
  }, [activeCompId]);

  function persist(next) {
    setUsers(next);
    saveUsers(next, activeCompId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSaveUser(userData) {
    const userWithComp = { ...userData, companyId: activeCompId };
    if (userData.id && users.find(u => u.id === userData.id)) {
      // Edit
      persist(users.map(u => u.id === userData.id ? userWithComp : u));
    } else {
      // Add
      persist([...users, userWithComp]);
    }
    setModal(null);
  }

  function handleDelete(id) {
    if (id === currentUser?.id || users.find(u => u.id === id)?.email === currentUser?.email) {
      alert('لا يمكن حذف حسابك الخاص!');
      return;
    }
    persist(users.filter(u => u.id !== id));
    setDeleteId(null);
  }

  function copyCredentials(user) {
    const text = `البريد: ${user.email}\nكلمة المرور: ${user.password}`;
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
      <div className="panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(59,130,246,0.08))', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366F1, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(99,102,241,0.35)', flexShrink: 0,
          }}>
            <Shield size={26} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--ink)' }}>
              إدارة حسابات مستخدمي الشركة
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              أضف أو عدّل حسابات الدخول والصلاحيات لمهندسي وموظفي مكتبك
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
          <CheckCircle2 size={16} /> تم حفظ التغييرات بنجاح
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
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الدور والصلاحية</th>
                <th>مهندس الموقع المرتبط</th>
                <th>كلمة المرور</th>
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
                  const isPassVisible = showPassFor === u.id;
                  const isCopied = copiedId === u.id;

                  return (
                    <tr key={u.id}>
                      {/* Name + Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${COMPANY_ROLES[u.role]?.color || '#6366F1'}, #3B82F6)`,
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
                                  marginRight: 6, fontSize: 10, padding: '2px 6px',
                                  borderRadius: 8, background: 'rgba(99,102,241,0.15)',
                                  color: '#6366F1', fontWeight: 700,
                                }}>
                                  أنت
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>#{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <span className="font-mono" style={{ fontSize: 13, direction: 'ltr', display: 'inline-block' }}>
                          {u.email}
                        </span>
                      </td>

                      {/* Role */}
                      <td>
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Engineer Name Link */}
                      <td>
                        {u.role === 'engineer' ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>
                            🏗️ {u.engineerName || u.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                        )}
                      </td>

                      {/* Password */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="font-mono" style={{ fontSize: 12, letterSpacing: isPassVisible ? 0 : 2 }}>
                            {isPassVisible ? u.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPassFor(s => s === u.id ? null : u.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}
                            title={isPassVisible ? 'إخفاء' : 'إظهار'}
                          >
                            {isPassVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {/* Copy */}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px 8px', fontSize: 12 }}
                            onClick={() => copyCredentials(u)}
                            title="نسخ بيانات الدخول"
                          >
                            {isCopied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px 8px', fontSize: 12 }}
                            onClick={() => setModal(u)}
                            title="تعديل"
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

    </div>
  );
}
