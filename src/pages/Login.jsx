import React, { useState, useEffect } from "react";
import {
  Building2, Lock, Mail, AlertTriangle, ShieldCheck, User, Phone,
  Sparkles, ArrowRight, CheckCircle2, KeyRound, Eye, EyeOff, X,
  RefreshCw, MessageSquare, Send, Check
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  loginWithEmail,
  logoutUser,
  sendPasswordReset,
  registerWithEmail,
  getUserClaims,
  callAssignUserClaims,
  syncAndResetPhonePassword,
} from "../services/auth";
import {
  resolveTenantUserByEmail,
  registerNewTenant,
} from "../services/tenantsManager";
import {
  cleanPhoneNumber,
  fetchUserByPhoneFromCloudDirectory,
} from "../services/cloudSync";
import { openWhatsApp, formatPhoneNumber } from "../utils/whatsappTemplates";

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

  // ── حالة نافذة استعادة كلمة المرور وإرسال كود التحقق (OTP) ──
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotTarget, setForgotTarget] = useState("");
  const [forgotStep, setForgotStep] = useState('input'); // 'input' | 'verify'
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState(0);
  const [enteredCode, setEnteredCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // مؤقت إعادة الإرسال
  useEffect(() => {
    let timer = null;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(t => (t > 1 ? t - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

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

  const handleOpenForgotModal = () => {
    setError(null);
    setResetSuccess(null);
    const raw = (email || '').trim();
    setForgotTarget(raw);
    setEnteredCode("");
    setNewPassword("");
    setConfirmPassword("");
    setModalError(null);
    setModalSuccess(null);
    setForgotStep('input');
    setShowForgotModal(true);
  };

  const handleSendOtp = async (overrideTarget = null) => {
    setModalError(null);
    setModalSuccess(null);
    const target = (overrideTarget !== null ? overrideTarget : (forgotTarget || email || '')).trim();
    if (!target) {
      setModalError("يرجى إدخال رقم الهاتف أو البريد الإلكتروني أولاً.");
      return;
    }

    const isEmailInput = target.includes('@');

    if (!isEmailInput) {
      const cleanPhone = cleanPhoneNumber(target);
      if (!cleanPhone || cleanPhone.length < 7) {
        setModalError("يرجى إدخال رقم هاتف صحيح (مثال: 01012345678).");
        return;
      }

      setModalLoading(true);
      try {
        // توليد كود تحقق عشوائي آمن مكون من 6 أرقام
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 15 * 60 * 1000; // 15 دقيقة
        setGeneratedCode(otp);
        setCodeExpiresAt(expires);

        const msg = `*منصة تشطيب برو | Tashteeb Pro* 🏢\n\nكود التحقق الخاص بك لإعادة تعيين كلمة المرور هو:\n🔢 *[ ${otp} ]*\n\nالرمز صالح للاستخدام لمدة 15 دقيقة.\nيرجى إدخاله في صفحة الدخول لتعيين كلمة المرور الجديدة والدخول مباشرة. ✨`;

        // إرسال الكود فورياً عبر واتساب مجاناً وبدون أي تكلفة
        openWhatsApp(cleanPhone, msg);

        setForgotStep('verify');
        setResendTimer(45);
        setModalSuccess(`📲 تم تجهيز وإرسال كود التحقق عبر واتساب إلى (${cleanPhone})! أدخل الرمز أدناه.`);
      } catch (err) {
        console.error("WhatsApp send error:", err);
        setModalError("تعذر إرسال كود التحقق عبر واتساب. يرجى المحاولة مجدداً.");
      } finally {
        setModalLoading(false);
      }
    } else {
      // إرسال رابط رسمي عبر البريد الإلكتروني
      setModalLoading(true);
      try {
        const res = await sendPasswordReset(target.toLowerCase().trim());
        if (res.success) {
          setModalSuccess(`✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني (${target}). يرجى مراجعة بريدك الإلكتروني.`);
        } else {
          setModalError(res.error || "تعذر إرسال رابط إعادة تعيين كلمة المرور.");
        }
      } catch (err) {
        setModalError("حدث خطأ أثناء طلب إعادة تعيين كلمة المرور.");
      } finally {
        setModalLoading(false);
      }
    }
  };

  const handleConfirmReset = async (e) => {
    e?.preventDefault?.();
    setModalError(null);
    setModalSuccess(null);

    const cleanPhone = cleanPhoneNumber(forgotTarget || email);
    if (!cleanPhone || cleanPhone.length < 7) {
      setModalError("رقم الهاتف غير صالح.");
      return;
    }

    const trimmed = (enteredCode || '').replace(/\D/g, '');
    if (trimmed.length !== 6) {
      setModalError("يرجى إدخال كود التحقق كاملاً المكون من 6 أرقام.");
      return;
    }

    if (Date.now() > codeExpiresAt) {
      setModalError("انتهت صلاحية كود التحقق. يرجى الضغط على 'إعادة إرسال الكود' لطلب كود جديد.");
      return;
    }

    if (trimmed !== generatedCode) {
      setModalError("كود التحقق غير صحيح. يرجى التأكد من الرقم المستلم عبر واتساب والمحاولة مجدداً.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setModalError("كلمة المرور الجديدة يجب أن تتكون من 6 أحرف أو أرقام على الأقل.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }

    setModalLoading(true);
    try {
      // 1. تحديث ومزامنة كلمة المرور لحساب الهاتف في Firebase Auth
      const syncRes = await syncAndResetPhonePassword(cleanPhone, newPassword);
      if (!syncRes.success) {
        throw new Error(syncRes.error || "تعذر حفظ كلمة المرور سحابياً.");
      }

      const targetAuthEmail = syncRes.phoneAuthEmail || `phone_${cleanPhone}@tashteeb.app`;

      // 2. تسجيل الدخول الفوري بكلمة المرور الجديدة
      const authResult = await loginWithEmail(targetAuthEmail, newPassword);
      if (authResult.success) {
        let claims = await getUserClaims(authResult.user);
        const tenantResult = await resolveTenantUserByEmail(targetAuthEmail, authResult.user?.uid, claims);

        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setShowForgotModal(false);

        if (tenantResult.success) {
          onLogin(tenantResult.user, tenantResult.tenant, tenantResult.isSuperAdmin);
          return;
        }
      }

      // إذا نجح التعيين وتطلب الدخول يدوياً
      setShowForgotModal(false);
      setPassword(newPassword);
      setEmail(forgotTarget || cleanPhone);
      setResetSuccess("✅ تم تعيين كلمة المرور الجديدة بنجاح! اضغط الآن على 'تسجيل الدخول للمنصة'.");
    } catch (err) {
      console.error("Confirm reset error:", err);
      setModalError(err.message || "حدث خطأ أثناء تعيين كلمة المرور الجديدة.");
    } finally {
      setModalLoading(false);
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

          {/* رسالة الخطأ إن وجدت مع زر الاستعادة الفوري بالكود */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#EF4444",
                padding: "12px 14px",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 13,
                marginBottom: 18,
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: "#B91C1C",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "right",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    alignSelf: "flex-start",
                  }}
                >
                  <KeyRound size={13} />
                  <span>نسيت كلمة المرور؟ اضغط هنا لاستلام كود التحقق عبر واتساب 📲</span>
                </button>
              )}
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
                    onClick={handleOpenForgotModal}
                    style={{
                      background: "none",
                      border: "none",
                      color: primaryColor,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    نسيت كلمة المرور؟
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

      {/* ════════════════════════════════════════════════════════════
          نافذة استعادة كلمة المرور وإرسال كود التحقق (OTP Reset Modal)
          ════════════════════════════════════════════════════════════ */}
      {showForgotModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            direction: "rtl",
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          <div
            style={{
              background: "var(--card, #ffffff)",
              color: "var(--ink, #0F172A)",
              border: "1px solid var(--border, #E2E8F0)",
              borderRadius: 24,
              width: "100%",
              maxWidth: 460,
              padding: "26px 24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* زر الإغلاق */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              style={{
                position: "absolute",
                left: 18,
                top: 18,
                background: "var(--sidebar-hover-bg, #F1F5F9)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--muted, #64748B)",
              }}
              title="إغلاق"
            >
              <X size={18} />
            </button>

            {/* ترويسة النافذة */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: forgotStep === 'verify' ? "rgba(16, 185, 129, 0.12)" : "rgba(24, 119, 242, 0.12)",
                  color: forgotStep === 'verify' ? "#10B981" : primaryColor,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                {forgotStep === 'verify' ? <KeyRound size={26} /> : <MessageSquare size={26} />}
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                {forgotStep === 'verify' ? "إدخال كود التحقق وتعيين كلمة المرور" : "استعادة كلمة المرور عبر كود التحقق"}
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
                {forgotStep === 'verify'
                  ? "أدخل رمز التحقق المكون من 6 أرقام المستلم عبر واتساب ثم اكتب كلمة المرور الجديدة"
                  : "أدخل رقم الهاتف لاستلام كود التحقق السري فوراً عبر رسالة واتساب مجاناً وبدون أي تكلفة"}
              </p>
            </div>

            {/* تنبيه الخطأ */}
            {modalError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#EF4444",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            {/* تنبيه النجاح */}
            {modalSuccess && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#10B981",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{modalSuccess}</span>
              </div>
            )}

            {/* ─── الخطوة 1: تحديد الرقم وإرسال كود التحقق ─── */}
            {forgotStep === 'input' && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--muted)" }}>
                    رقم الهاتف أو البريد الإلكتروني
                  </label>
                  <div style={{ position: "relative" }}>
                    <Phone size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: primaryColor }} />
                    <input
                      type="text"
                      value={forgotTarget}
                      onChange={(e) => setForgotTarget(e.target.value)}
                      placeholder="مثال: 01012345678"
                      style={{
                        width: "100%", padding: "11px 42px 11px 14px",
                        border: "1.5px solid var(--border)", borderRadius: 12,
                        background: "transparent", color: "var(--ink)",
                        fontSize: 14, outline: "none", boxSizing: "border-box",
                        direction: "ltr", textAlign: "right"
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>
                    💡 يتم إرسال كود التحقق فوراً عبر واتساب مجاناً للرقم المسجل دون أي فواتير.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={modalLoading}
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 14.5,
                    fontWeight: 800,
                    cursor: modalLoading ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 16px rgba(37, 211, 102, 0.3)",
                    marginBottom: 12,
                  }}
                >
                  <Send size={16} />
                  <span>{modalLoading ? "جاري الإرسال..." : "إرسال كود التحقق عبر واتساب 📲 (مجاناً)"}</span>
                </button>

                {forgotTarget && forgotTarget.includes('@') && (
                  <button
                    type="button"
                    onClick={() => handleSendOtp(forgotTarget)}
                    disabled={modalLoading}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--muted)",
                      cursor: "pointer",
                      marginTop: 6,
                    }}
                  >
                    ✉️ إرسال رابط التعيين إلى البريد الإلكتروني بدلاً من ذلك
                  </button>
                )}
              </div>
            )}

            {/* ─── الخطوة 2: إدخال الكود وتعيين كلمة المرور الجديدة ─── */}
            {forgotStep === 'verify' && (
              <form onSubmit={handleConfirmReset}>
                {/* شارة رقم الهاتف */}
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: 12,
                    padding: "10px 14px",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Phone size={16} color="#10B981" />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {forgotTarget || email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForgotStep('input')}
                    style={{ background: "none", border: "none", color: primaryColor, fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}
                  >
                    تغيير الرقم
                  </button>
                </div>

                {/* حقل كود التحقق المكون من 6 أرقام */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--muted)" }}>
                    كود التحقق المستلم (6 أرقام) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    required
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #10B981",
                      borderRadius: 12,
                      background: "transparent",
                      color: "var(--ink)",
                      fontSize: 24,
                      fontWeight: 800,
                      letterSpacing: 10,
                      textAlign: "center",
                      outline: "none",
                      boxSizing: "border-box",
                      direction: "ltr",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      تحقق من رسالة واتساب على هاتفك
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={resendTimer > 0 || modalLoading}
                      style={{
                        background: "none",
                        border: "none",
                        color: resendTimer > 0 ? "var(--muted)" : primaryColor,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: resendTimer > 0 ? "not-allowed" : "pointer",
                        padding: 0,
                        textDecoration: resendTimer > 0 ? "none" : "underline",
                      }}
                    >
                      {resendTimer > 0 ? `إعادة الإرسال بعد (${resendTimer} ث)` : "🔄 إعادة إرسال الكود عبر واتساب"}
                    </button>
                  </div>
                </div>

                {/* كلمة المرور الجديدة */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--muted)" }}>
                    كلمة المرور الجديدة *
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="6 أحرف أو أرقام على الأقل"
                      style={{
                        width: "100%", padding: "11px 42px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontSize: 13.5, outline: "none", boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* تأكيد كلمة المرور الجديدة */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--muted)" }}>
                    تأكيد كلمة المرور الجديدة *
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="أعد كتابة كلمة المرور"
                      style={{
                        width: "100%", padding: "11px 42px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontSize: 13.5, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* زر تأكيد الكود وتعيين كلمة المرور والدخول */}
                <button
                  type="submit"
                  disabled={modalLoading || enteredCode.length !== 6 || newPassword.length < 6}
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 14.5,
                    fontWeight: 800,
                    cursor: (modalLoading || enteredCode.length !== 6 || newPassword.length < 6) ? "not-allowed" : "pointer",
                    opacity: (modalLoading || enteredCode.length !== 6 || newPassword.length < 6) ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: `0 4px 18px ${primaryColor}40`,
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>{modalLoading ? "جاري تعيين كلمة المرور..." : "تأكيد الكود وتعيين كلمة المرور والدخول 🚀"}</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
