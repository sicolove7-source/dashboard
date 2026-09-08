import React, { useState } from "react";
import {
  Building2, Lock, Mail, AlertTriangle, ShieldCheck, User, Phone,
  Sparkles, ArrowRight, CheckCircle2
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  authenticateTenantUserAsync,
  authenticateTenantUser,
  registerNewTenant
} from "../services/tenantsManager";

export default function Login({
  onLogin,
  companySettings,
  onBackToLanding,
  onStartLiveDemo,
  initialMode = 'login'
}) {
  const companyName = 'Tashteeb Pro | تشطيب برو';
  const companySubtitle = 'المنصة الذكية لإدارة التشطيبات والمقاولات والمشاريع';
  const primaryColor = '#1877F2';
  const accentColor = '#166FE5';

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState(initialMode);

  // Common State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Register Fields
  const [companyTitle, setCompanyTitle] = useState("");
  const [adminName, setAdminName] = useState("");
  const [phone, setPhone] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const authResult = await authenticateTenantUserAsync(email, password);
      if (authResult.success) {
        onLogin(authResult.user, authResult.tenant, authResult.isSuperAdmin);
      } else {
        setError(authResult.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      }
    } catch (err) {
      const localResult = authenticateTenantUser(email, password);
      if (localResult.success) {
        onLogin(localResult.user, localResult.tenant, localResult.isSuperAdmin);
      } else {
        setError(localResult.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await registerNewTenant({
        companyName: companyTitle,
        adminName: adminName,
        phone: phone,
        email: email,
        password: password,
        currency: 'ج.م',
      });

      if (res.success) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {}

        // دخول تلقائي مباشر لبيئة الشركة المنشأة
        setTimeout(() => {
          onLogin(res.user, res.tenant, false);
        }, 500);
      } else {
        setError(res.error || 'حدث خطأ أثناء إنشاء الحساب.');
        setLoading(false);
      }
    } catch (err) {
      setError('تعذر إنشاء الحساب حالياً. يرجى التحقق من اتصال الإنترنت.');
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
          gap: 20,
          transition: "max-width 0.3s ease",
        }}
      >
        {/* ─── الشعار والهوية ─── */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 74,
              height: 74,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              boxShadow: `0 8px 30px ${primaryColor}45`,
              marginBottom: 14,
            }}
          >
            <Building2 size={36} color="#fff" />
          </div>
          <h1
            style={{
              fontSize: 23,
              fontWeight: 800,
              color: "var(--ink, #0F172A)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {companyName}
          </h1>
          <p style={{ color: "var(--muted, #64748B)", marginTop: 6, fontSize: 13 }}>
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
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* ══════════════ نموذج 1: تسجيل الدخول ══════════════ */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* البريد */}
              <div>
                <label style={{ display: "block", marginBottom: 7, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                  البريد الإلكتروني
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@platform.com"
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

              {/* كلمة المرور */}
              <div>
                <label style={{ display: "block", marginBottom: 7, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                  كلمة المرور
                </label>
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

          {/* ─── أزرار بديلة (دخول تجريبي وعودة) ─── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>أو</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
          </div>

          {onStartLiveDemo && (
            <button
              type="button"
              onClick={onStartLiveDemo}
              style={{
                width: "100%", padding: "10px",
                background: "rgba(217, 119, 6, 0.08)",
                color: "#D97706",
                border: "1.5px dashed rgba(217, 119, 6, 0.35)",
                borderRadius: 12,
                fontFamily: "'Cairo', sans-serif", fontSize: 13.5, fontWeight: 800,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <span>✨ تصفح النظام كزائر فوري (Demo بالجنيه المصري)</span>
            </button>
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
