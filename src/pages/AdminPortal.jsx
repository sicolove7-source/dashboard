import React, { useState, Suspense } from 'react';
import {
  Shield, Lock, Mail, AlertTriangle, CheckCircle2, ArrowRight,
  Sparkles, KeyRound, ExternalLink, LogOut, Building2, Globe
} from 'lucide-react';
const SuperAdminDashboard = React.lazy(() => import('./SuperAdminDashboard'));
import { loginWithEmail, logoutUser, getUserClaims } from '../services/auth';
import { resolveTenantUserByEmail, setActiveTenantId } from '../services/tenantsManager';
import { clearActiveSubdomain } from '../services/subdomainResolver';

export default function AdminPortal({
  currentUser,
  authLoading,
  onAdminLogin,
  onAdminLogout,
  onSwitchToCompany,
  onExitAdminPortal
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSuperAdmin = Boolean(currentUser?.role === 'super_admin');

  // خروج من بوابة الإدارة والعودة للموقع الرئيسي
  const handleExitAdmin = () => {
    clearActiveSubdomain();
    if (onExitAdminPortal) {
      onExitAdminPortal();
      return;
    }
    const hostname = window.location.hostname || '';
    if (hostname.includes('localhost') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      window.location.href = `${window.location.origin}${window.location.pathname}`;
    } else {
      const protocol = window.location.protocol || 'https:';
      const mainHost = hostname.replace(/^admin\./i, '');
      window.location.href = `${protocol}//${mainHost}/`;
    }
  };

  // معاينة شركة (Impersonation): حفظ الفلاج في sessionStorage والتحويل للموقع الرئيسي
  const handleCompanyPreview = (tenantOrId) => {
    const compId = typeof tenantOrId === 'object' && tenantOrId?.id ? tenantOrId.id : tenantOrId;
    if (!compId) return;

    setActiveTenantId(compId);
    try {
      sessionStorage.setItem('admin_preview_mode', 'true');
      sessionStorage.setItem('tashteeb_preview_tenant_id', compId);
    } catch (e) {}

    clearActiveSubdomain();

    if (onSwitchToCompany) {
      onSwitchToCompany(compId);
    }

    const hostname = window.location.hostname || '';
    if (hostname.includes('localhost') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      window.location.href = `${window.location.origin}${window.location.pathname}?preview_tenant=${compId}`;
    } else {
      const protocol = window.location.protocol || 'https:';
      const mainHost = hostname.replace(/^admin\./i, '');
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.href = `${protocol}//${mainHost}${port}/?preview_tenant=${compId}`;
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setError('يرجى إدخال بريد إلكتروني صالح.');
        setLoading(false);
        return;
      }

      const res = await loginWithEmail(cleanEmail, password);
      if (res.success && res.user) {
        const claims = await getUserClaims(res.user);
        const tenantResult = await resolveTenantUserByEmail(res.user.email, res.user.uid, claims);

        const isSuperAdminAuthorized = Boolean(
          claims?.role === 'super_admin' || claims?.isSuperAdmin === true
        );

        if (isSuperAdminAuthorized) {
          const adminUserData = {
            uid: res.user.uid,
            email: res.user.email,
            name: res.user.displayName || tenantResult?.user?.name || 'مدير المنصة الرئيسي',
            role: 'super_admin',
            isSuperAdmin: true,
          };

          if (onAdminLogin) {
            onAdminLogin(adminUserData);
          }
        } else {
          // حساب عادي (غير سوبر أدمن) -> طرد فوري وإنهاء الجلسة لمنع أي اختراق لبوابة الإدارة
          await logoutUser();
          try {
            localStorage.removeItem('active_session_user');
          } catch (e) {}
          setError('هذا الحساب غير مصرح له بالدخول لبوابة الإدارة المركزية. البوابة مخصصة حصراً لمالك ومطوري المنصة (Super Admin).');
        }
      } else {
        setError(res.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      }
    } catch (err) {
      console.error('Admin portal login error:', err);
      setError('حدث خطأ أثناء محاولة تسجيل الدخول للإدارة المركزية.');
    } finally {
      setLoading(false);
    }
  };

  // في حالة فحص الجلسة الأولي
  if (authLoading) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#1877F2', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#94A3B8', fontFamily: 'Cairo', fontSize: 14, fontWeight: 600 }}>
            جاري التحقق من صلاحيات بوابة الإدارة... 🔐
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ─── 1. في حالة المشرف العام المسجل بالفعل: عرض لوحة الإدارة المركزية ───
  if (isSuperAdmin) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', background: 'var(--bg, #0F172A)', display: 'flex', flexDirection: 'column' }}>
        {/* شريط ترويسة خاص ببوابة الإدارة المركزية */}
        <header
          style={{
            background: '#0B1329',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #1877F2, #0D47A1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 10px rgba(24, 119, 242, 0.4)'
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Tashteeb Pro</span>
                <span
                  style={{
                    background: 'rgba(24, 119, 242, 0.2)',
                    color: '#60A5FA',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(24, 119, 242, 0.3)'
                  }}
                >
                  نطاق الإدارة المركزية 👑
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                بوابة المالك والمشرف العام على المنصة • admin.tashteebpro.com
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

            <button
              onClick={handleExitAdmin}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#CBD5E1',
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <ExternalLink size={14} />
              <span>زيارة المنصة الرئيسية</span>
            </button>

            <button
              onClick={onAdminLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#F87171',
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <LogOut size={14} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </header>

        {/* جسم لوحة الإدارة */}
        <main style={{ flex: 1, padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <Suspense
            fallback={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(24, 119, 242, 0.2)', borderTopColor: '#1877F2', animation: 'spin 0.6s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            }
          >
            <SuperAdminDashboard
              currentUser={currentUser}
              onSwitchToCompany={handleCompanyPreview}
            />
          </Suspense>
        </main>
      </div>
    );
  }

  // ─── 2. في حالة عدم تسجيل الدخول كـ Super Admin: شاشة دخول مخصصة للمشرف العام ───
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1E293B 0%, #0F172A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Cairo', sans-serif"
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          color: '#fff'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1877F2, #0D47A1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              marginBottom: 14,
              boxShadow: '0 4px 20px rgba(24, 119, 242, 0.4)'
            }}
          >
            <Shield size={28} />
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>
            بوابة إدارة المنصة المركزية
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>
            تسجيل دخول آمن مخصص لصاحب ومطوري منصة Tashteeb Pro
          </p>
        </div>

        {currentUser && !isSuperAdmin && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              color: '#FCD34D',
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>أنت مسجل حالياً بحساب عادي ({currentUser.email || currentUser.name}). يرجى تسجيل الدخول بحساب المشرف العام.</span>
            </div>
            {onAdminLogout && (
              <button
                type="button"
                onClick={onAdminLogout}
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                تسجيل الخروج والتبديل 🚪
              </button>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              color: '#F87171',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#CBD5E1' }}>
              البريد الإلكتروني للمشرف العام
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@platform.com"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  direction: 'ltr',
                  textAlign: 'right'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#CBD5E1' }}>
              كلمة المرور
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  direction: 'ltr',
                  textAlign: 'right'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: 'linear-gradient(135deg, #1877F2, #166FE5)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14.5,
              fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 6,
              boxShadow: '0 4px 18px rgba(24, 119, 242, 0.35)',
              transition: 'opacity 0.2s'
            }}
          >
            <Shield size={16} />
            <span>{loading ? 'جاري التحقق من الصلاحيات...' : 'تسجيل دخول المشرف العام 👑'}</span>
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleExitAdmin();
            }}
            style={{ color: '#60A5FA', fontSize: 12.5, textDecoration: 'none', fontWeight: 600 }}
          >
            ← العودة للموقع الرئيسي للمنصة
          </a>
        </div>
      </div>
    </div>
  );
}
