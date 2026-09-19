import React, { useState } from "react";
import {
  Building2, Lock, Mail, AlertTriangle, ShieldCheck, User, Phone,
  Sparkles, ArrowRight, CheckCircle2
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  loginWithEmail,
  logoutUser,
  sendPasswordReset,
  registerWithEmail,
  getUserClaims,
  callAssignUserClaims,
} from "../services/auth";
import {
  resolveTenantUserByEmail,
  registerNewTenant,
} from "../services/tenantsManager";
import {
  cleanPhoneNumber,
  fetchUserByPhoneFromCloudDirectory,
} from "../services/cloudSync";

export default function Login({
  onLogin,
  companySettings,
  onBackToLanding,
  initialMode = 'login'
}) {
  // Always use the real platform branding for the main login portal
  // Only override if explicitly an enterprise tenant with verified custom white-label branding
  const isWhiteLabel = !!companySettings?.isCustomBranding && !!companySettings?.companyLogo;
  const companyName = isWhiteLabel ? companySettings.companyName : 'Tashteeb Pro | تشطيب برو';
  const companySubtitle = isWhiteLabel ? companySettings.companySubtitle : 'المنصة الذكية لإدارة التشطيبات والمقاولات والمشاريع';
  const companyLogo = isWhiteLabel ? companySettings.companyLogo : null;
  const primaryColor = companySettings?.primaryColor || '#1877F2';
  const accentColor = companySettings?.accentColor || '#166FE5';

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState(initialMode);

  // Common State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(null);

  // Register Fields
  const [companyTitle, setCompanyTitle] = useState("");
  const [adminName, setAdminName] = useState("");
  const [phone, setPhone] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setLoading(true);

    try {
      // 0. إنهاء أي جلسة مستخدم قديمة لضمان الدخول بالحساب الجديد فقط دون تداخل
      try {
        await logoutUser();
        localStorage.removeItem('active_session_user');
      } catch (e) {}

      const rawInput = (email || '').trim();
      if (!rawInput) {
        setError("يرجى إدخال البريد الإلكتروني أو رقم الهاتف.");
        setLoading(false);
        return;
      }

      let targetAuthEmail = rawInput.toLowerCase();
      const isEmail = rawInput.includes('@');

      if (!isEmail) {
        // تسجيل الدخول برقم الهاتف
        const cleanPhone = cleanPhoneNumber(rawInput);
        if (!cleanPhone || cleanPhone.length < 7) {
          setError("يرجى إدخال رقم هاتف صحيح (مثال: 01012345678) أو بريد إلكتروني صالح.");
          setLoading(false);
          return;
        }

        // البحث عن الحساب المرتبط برقم الهاتف
        let resolvedEmail = null;

        // 1. فحص سحابي أولاً من دليل المنصة platform_metadata/users_directory أو قائمة الشركات لضمان أحدث ربط حي
        try {
          const cloudUser = await fetchUserByPhoneFromCloudDirectory(cleanPhone);
          if (cloudUser && cloudUser.email) {
            resolvedEmail = cloudUser.email;
          }
        } catch (e) {}

        // 2. فحص محلي كمسار بديل سريع
        if (!resolvedEmail) {
          try {
            const regRaw = localStorage.getItem('platform-all-users-registry');
            if (regRaw) {
              const reg = JSON.parse(regRaw);
              const userInReg = reg['phone_' + cleanPhone] || reg[cleanPhone] ||
                Object.values(reg).find(u => cleanPhoneNumber(u.phone || u.cleanPhone) === cleanPhone);
              if (userInReg && userInReg.email) {
                resolvedEmail = userInReg.email;
              }
            }
          } catch (e) {}
        }

        // 3. إذا لم يُعثر على إيميل مسجل مسبقاً، نستخدم المعرف القياسي الافتراضي للحسابات الهاتفية
        targetAuthEmail = resolvedEmail ? resolvedEmail.toLowerCase().trim() : `phone_${cleanPhone}@tashteeb.app`;
      }

      // 1. المصادقة عبر Firebase Authentication الرسمي
      const authResult = await loginWithEmail(targetAuthEmail, password);
      if (authResult.success) {
        // قراءة الـ Custom Claims المشفرة من Google
        let claims = await getUserClaims(authResult.user);

        // إذا كان بريد مالك المنصة المعتمد ولم يحصل على Custom Claim السوبر أدمن بعد، نقوم بتعيينها فوراً
        const cleanEmail = targetAuthEmail;
        if ((cleanEmail === 'sicolove7@gmail.com' || cleanEmail === 'admin@platform.com') && claims.role !== 'super_admin') {
          try {
            await callAssignUserClaims({
              targetUid: authResult.user.uid,
              companyId: 'comp_alain',
              role: 'super_admin',
              companyName: 'منصة تشطيب برو',
            });
            if (authResult.user.getIdToken) {
              await authResult.user.getIdToken(true);
            }
            claims = await getUserClaims(authResult.user);
          } catch (e) {
            console.warn("Could not auto-assign super_admin claim:", e);
          }
        }

        // 2. تحديد بيانات الشركة والمستخدم والصلاحيات
        const tenantResult = await resolveTenantUserByEmail(targetAuthEmail, authResult.user?.uid, claims);
        if (tenantResult.success) {
          onLogin(tenantResult.user, tenantResult.tenant, tenantResult.isSuperAdmin);
        } else {
          setError(tenantResult.error || "تعذر تحديد بيانات الشركة المرتبطة بهذا الحساب.");
        }
      } else {
        if (!isEmail) {
          setError("رقم الهاتف أو كلمة المرور غير صحيحة. يرجى التأكد من الرقم وكلمة المرور.");
        } else {
          setError(authResult.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        }
      }
    } catch (err) {
      console.error("Login unexpected error:", err);
      setError(err?.message ? `حدث خطأ أثناء المصادقة: ${err.message}` : "حدث خطأ أثناء الاتصال بنظام المصادقة. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const rawInput = (email || '').trim();
    if (!rawInput) {
      setError("يرجى إدخال البريد الإلكتروني أو رقم الهاتف أولاً في الحقل المخصص، ثم الضغط على 'نسيت كلمة المرور؟'.");
      return;
    }

    setError(null);
    setResetSuccess(null);
    setResetLoading(true);

    let targetEmail = rawInput;

    if (!rawInput.includes('@')) {
      const cleanPhone = cleanPhoneNumber(rawInput);
      if (!cleanPhone || cleanPhone.length < 7) {
        setError("يرجى إدخال رقم هاتف صحيح أو بريد إلكتروني صالح.");
        setResetLoading(false);
        return;
      }

      // البحث عن الإيميل المرتبط برقم الهاتف
      let resolvedEmail = null;

      try {
        const cloudUser = await fetchUserByPhoneFromCloudDirectory(cleanPhone);
        if (cloudUser && cloudUser.email && !cloudUser.email.endsWith('@tashteeb.app')) {
          resolvedEmail = cloudUser.email;
        }
      } catch (e) {}

      if (!resolvedEmail) {
        try {
          const regRaw = localStorage.getItem('platform-all-users-registry');
          if (regRaw) {
            const reg = JSON.parse(regRaw);
            const u = reg['phone_' + cleanPhone] || reg[cleanPhone] ||
              Object.values(reg).find(x => cleanPhoneNumber(x.phone || x.cleanPhone) === cleanPhone);
            if (u && u.email && !u.email.endsWith('@tashteeb.app')) {
              resolvedEmail = u.email;
            }
          }
        } catch (e) {}
      }

      if (!resolvedEmail) {
        setError("هذا الحساب مسجل برقم هاتف فقط دون بريد إلكتروني، أو لم يُعثر على الحساب. يرجى التواصل مع مدير الشركة لتعيين كلمة مرورك.");
        setResetLoading(false);
        return;
      }

      targetEmail = resolvedEmail;
    }

    try {
      const res = await sendPasswordReset(targetEmail);
      if (res.success) {
        let displayEmail = targetEmail;
        if (!rawInput.includes('@')) {
          const [userPart, domainPart] = targetEmail.split('@');
          const masked = userPart.length > 3
            ? `${userPart.slice(0, 2)}***${userPart.slice(-1)}@${domainPart}`
            : `***@${domainPart}`;
          displayEmail = masked;
        }
        setResetSuccess(`✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد المسجل (${displayEmail}). يرجى مراجعة بريدك الإلكتروني.`);
      } else {
        setError(res.error || "تعذر إرسال رابط إعادة تعيين كلمة المرور.");
      }
    } catch (err) {
      setError("حدث خطأ أثناء طلب إعادة تعيين كلمة المرور.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setLoading(true);

    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail || !companyTitle?.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة (اسم الشركة والبريد الإلكتروني).');
      setLoading(false);
      return;
    }

    // علامة أمان تمنع App.jsx من طرد المستخدم قبل اكتمال التسجيل وربط الشركة
    try { sessionStorage.setItem('is_registering_user', cleanEmail); } catch (e) {}

    try {
      // 1. تسجيل بيانات الشركة والمستخدم أولاً محلياً وسحابياً لتكون جاهزة فور إطلاق حدث المصادقة
      const res = await registerNewTenant({
        companyName: companyTitle,
        adminName: adminName,
        phone: phone,
        email: cleanEmail,
        password: password,
        currency: 'ج.م',
      });

      if (!res.success) {
        try { sessionStorage.removeItem('is_registering_user'); } catch (e) {}
        setError(res.error || 'حدث خطأ أثناء إنشاء الحساب.');
        setLoading(false);
        return;
      }

      // 2. إنشاء الحساب في Firebase Auth الرسمي
      const authRes = await registerWithEmail(cleanEmail, password);
      if (!authRes.success && authRes.code !== 'auth/email-already-in-use') {
        try { sessionStorage.removeItem('is_registering_user'); } catch (e) {}
        setError(authRes.error || 'تعذر إنشاء الحساب في نظام المصادقة.');
        setLoading(false);
        return;
      }

      // 3. تعيين Custom Claims وتحديث توكن الأمان فوراً
      const firebaseUser = authRes.user || auth.currentUser;
      if (firebaseUser?.uid && res.tenant?.id) {
        try {
          await callAssignUserClaims({
            targetUid: firebaseUser.uid,
            companyId: res.tenant.id,
            role: 'owner',
            companyName: res.tenant.name,
            currency: res.tenant.currency || 'ج.م',
          });
          if (firebaseUser.getIdToken) {
            await firebaseUser.getIdToken(true);
          }
        } catch (e) {
          console.warn('assignUserClaims non-blocking error:', e);
        }
      }

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      // 4. الانتقال المباشر لبيئة العمل وتطهير علامة الأمان
      setTimeout(() => {
        try { sessionStorage.removeItem('is_registering_user'); } catch (e) {}
        onLogin(res.user, res.tenant, false);
      }, 400);

    } catch (err) {
      try { sessionStorage.removeItem('is_registering_user'); } catch (e) {}
      console.error("handleRegister error:", err);
      setError(err?.message ? `تعذر إنشاء الحساب: ${err.message}` : 'تعذر إنشاء الحساب حالياً. يرجى التحقق من اتصال الإنترنت.');
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-gradient, #F0F2F5)",
        backgroundColor: "var(--bg-color, #F0F2F5)",
        padding: "24px 16px",
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: mode === 'register' ? 480 : 420,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          transition: "max-width 0.3s ease",
        }}
      >
        {onBackToLanding && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={onBackToLanding}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <ArrowRight size={14} /> <span>العودة للموقع التعريفي</span>
            </button>
          </div>
        )}

        {/* ─── الشعار والهوية ─── */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 88,
              height: 88,
              borderRadius: 24,
              background: companyLogo ? "#FFFFFF" : "#0A0F1D",
              boxShadow: companyLogo
                ? "0 10px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)"
                : "0 16px 40px rgba(0, 0, 0, 0.35), 0 0 0 1.5px rgba(56, 189, 248, 0.35)",
              marginBottom: 14,
              overflow: "hidden",
              padding: companyLogo ? 6 : 0,
            }}
          >
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  imageRendering: "-webkit-optimize-contrast"
                }}
              />
            ) : (
              <img
                src="/app-icon.png"
                alt="Tashteeb Pro"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
            )}
            <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#1877F2' }}>
              <Building2 size={40} color="#fff" />
            </div>
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "var(--ink, #0F172A)",
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
            }}
          >
            {companyName}
          </h1>
          <p style={{ color: "var(--muted, #64748B)", marginTop: 6, fontSize: 13, fontWeight: 500 }}>
            {companySubtitle}
          </p>
        </div>

        {/* ─── البطاقة الرئيسية ─── */}
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            borderRadius: 20,
            border: "1px solid var(--border, #E2E8F0)",
            padding: "28px 24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* ─── التبديل بين تسجيل الدخول وإنشاء حساب ─── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "var(--sidebar-hover-bg, #F1F5F9)",
              borderRadius: 12,
              padding: 4,
              marginBottom: 22,
              border: "1px solid var(--border, #E2E8F0)",
            }}
          >
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              style={{
                padding: "9px 12px",
                borderRadius: 9,
                border: "none",
                background: mode === 'login' ? "var(--card, #fff)" : "transparent",
                color: mode === 'login' ? primaryColor : "var(--muted, #64748B)",
                fontWeight: mode === 'login' ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: mode === 'login' ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s",
                fontFamily: "'Cairo', sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Lock size={15} />
              <span>تسجيل الدخول</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              style={{
                padding: "9px 12px",
                borderRadius: 9,
                border: "none",
                background: mode === 'register' ? "var(--card, #fff)" : "transparent",
                color: mode === 'register' ? "#10B981" : "var(--muted, #64748B)",
                fontWeight: mode === 'register' ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: mode === 'register' ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s",
                fontFamily: "'Cairo', sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Sparkles size={15} />
              <span>حساب شركة جديد</span>
            </button>
          </div>

          {/* شارة التجربة المجانية عند التسجيل */}
          {mode === 'register' && (
            <div
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#059669",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={16} />
              <span>تجربة مجانية فورية لمدة 14 يوماً</span>
            </div>
          )}

          {/* رسالة الخطأ إن وجدت */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#EF4444",
                padding: "10px 14px",
                borderRadius: 10,
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 13,
                marginBottom: 18,
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* رسالة نجاح إعادة تعيين كلمة المرور إن وجدت */}
          {resetSuccess && (
            <div
              style={{
                background: "rgba(16,185,129,0.1)",
                color: "#10B981",
                padding: "10px 14px",
                borderRadius: 10,
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 13,
                marginBottom: 18,
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{resetSuccess}</span>
            </div>
          )}

          {/* ══════════════ نموذج 1: تسجيل الدخول ══════════════ */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* البريد أو رقم الهاتف */}
              <div>
                <label style={{ display: "block", marginBottom: 7, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                  البريد الإلكتروني أو رقم الهاتف
                </label>
                <div style={{ position: "relative" }}>
                  {email && !email.includes('@') ? (
                    <Phone size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: primaryColor }} />
                  ) : (
                    <Mail size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  )}
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="010XXXXXXXX أو example@email.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{
                      width: "100%", padding: "11px 42px 11px 14px",
                      border: "1.5px solid var(--border)", borderRadius: 10,
                      background: "transparent", color: "var(--ink)",
                      fontFamily: "'Cairo', sans-serif", fontSize: 14,
                      outline: "none", boxSizing: "border-box",
                      direction: "ltr",
                      textAlign: "right"
                    }}
                  />
                </div>
              </div>

              {/* كلمة المرور */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <label style={{ margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                    كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    style={{
                      background: "none",
                      border: "none",
                      color: primaryColor,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: resetLoading ? "wait" : "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    {resetLoading ? "جاري الإرسال..." : "نسيت كلمة المرور؟"}
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: "100%", padding: "11px 42px 11px 14px",
                      border: "1.5px solid var(--border)", borderRadius: 10,
                      background: "transparent", color: "var(--ink)",
                      fontFamily: "'Cairo', sans-serif", fontSize: 14,
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* زر تسجيل الدخول */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "13px",
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  color: "#fff", border: "none", borderRadius: 12,
                  fontFamily: "'Cairo', sans-serif", fontSize: 15, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: `0 4px 18px ${primaryColor}35`,
                  marginTop: 6,
                }}
              >
                {loading ? "⏳ جاري التحقق والدخول..." : "تسجيل الدخول للمنصة →"}
              </button>
            </form>
          ) : (
            /* ══════════════ نموذج 2: تسجيل شركة جديدة (Sign Up) ══════════════ */
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* اسم الشركة */}
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                  اسم شركة المقاولات / مكتب التشطيب <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Building2 size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input
                    type="text"
                    value={companyTitle}
                    onChange={(e) => setCompanyTitle(e.target.value)}
                    required
                    placeholder="مثال: شركة النيل للتشطيبات والديكور"
                    style={{
                      width: "100%", padding: "11px 42px 11px 14px",
                      border: "1.5px solid var(--border)", borderRadius: 10,
                      background: "transparent", color: "var(--ink)",
                      fontFamily: "'Cairo', sans-serif", fontSize: 14,
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* اسم المسؤول والهاتف (شبكة ثنائية) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12.5, fontWeight: 700 }}>
                    اسم المسؤول / المهندس <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <User size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                      placeholder="م. أحمد حسن"
                      style={{
                        width: "100%", padding: "10px 36px 10px 10px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontFamily: "'Cairo', sans-serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12.5, fontWeight: 700 }}>
                    رقم الواتساب / الهاتف <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Phone size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="010XXXXXXXX"
                      style={{
                        width: "100%", padding: "10px 36px 10px 10px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontFamily: "'Cairo', sans-serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* البريد الإلكتروني وكلمة المرور */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12.5, fontWeight: 700 }}>
                    البريد الإلكتروني للدخول <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="ceo@company.com"
                      style={{
                        width: "100%", padding: "10px 36px 10px 10px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontFamily: "'Cairo', sans-serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12.5, fontWeight: 700 }}>
                    كلمة المرور <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="اختر كلمة مرور"
                      style={{
                        width: "100%", padding: "10px 36px 10px 10px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontFamily: "'Cairo', sans-serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* زر إنشاء الحساب */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "13px",
                  background: "linear-gradient(135deg, #10B981, #059669)",
                  color: "#fff", border: "none", borderRadius: 12,
                  fontFamily: "'Cairo', sans-serif", fontSize: 15, fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 4px 18px rgba(16,185,129,0.35)",
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Sparkles size={18} />
                <span>{loading ? "⏳ جاري إعداد مساحة عمل شركتك..." : "إنشاء الحساب وبدء التجربة المجانية 🚀"}</span>
              </button>
            </form>
          )}

          {onBackToLanding && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button
                type="button"
                onClick={onBackToLanding}
                style={{
                  background: "none", border: "none",
                  color: "var(--muted)", fontSize: 12.5, fontWeight: 700,
                  cursor: "pointer", textDecoration: "underline"
                }}
              >
                ← العودة إلى الصفحة التعريفية والأسعار
              </button>
            </div>
          )}
        </div>

        {/* ─── شارة الحماية والأمان ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--muted)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={16} color="#10B981" />
          <span>اتصال سحابي مشفر 256-bit • Tashteeb Pro 2026</span>
        </div>
      </div>
    </div>
  );
}
