import React, { useState } from "react";
import { Building2, Lock, Mail, AlertTriangle, ShieldCheck } from "lucide-react";
import { loadUsers } from "./UserManagement";
import { authenticateTenantUser } from "../services/tenantsManager";

export default function Login({ onLogin, companySettings }) {
  const companyName = companySettings?.companyName || 'لوحة إدارة التشطيبات والمشاريع';
  const companySubtitle = companySettings?.companySubtitle || 'بوابة الدخول الآمنة للنظام الموحد';
  const companyLogo = companySettings?.companyLogo || null;
  const primaryColor = companySettings?.primaryColor || '#6366F1';
  const accentColor = companySettings?.accentColor || '#3B82F6';
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const authResult = authenticateTenantUser(email, password);
      
      if (authResult.success) {
        onLogin(authResult.user, authResult.tenant, authResult.isSuperAdmin);
      } else {
        // Fallback for company staff users
        const accounts = loadUsers();
        const found = accounts.find(
          (a) => a.email.toLowerCase().trim() === email.toLowerCase().trim() && a.password === password
        );
        if (found) {
          onLogin({ role: found.role, name: found.name, engineerName: found.engineerName, email: found.email });
        } else {
          setError(authResult.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        }
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-gradient)",
        backgroundColor: "var(--bg-color)",
        padding: 20,
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* ─── الشعار ─── */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: 22,
              background: companyLogo ? '#fff' : `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              boxShadow: `0 8px 32px ${primaryColor}55`,
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
            ) : (
              <Building2 size={38} color="#fff" />
            )}
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--ink)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {companyName}
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 6, fontSize: 14 }}>
            {companySubtitle}
          </p>
        </div>

        {/* ─── البطاقة الرئيسية ─── */}
        <div
          style={{
            background: "var(--card)",
            borderRadius: 20,
            border: "1px solid var(--border)",
            padding: "32px 28px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* رسالة الخطأ */}
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
                marginBottom: 20,
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* البريد */}
            <div>
              <label
                style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 13, fontWeight: 600 }}
              >
                البريد الإلكتروني
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  style={{
                    position: "absolute", right: 14, top: "50%",
                    transform: "translateY(-50%)", color: "var(--muted)",
                  }}
                />
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
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label
                style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 13, fontWeight: 600 }}
              >
                كلمة المرور
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute", right: 14, top: "50%",
                    transform: "translateY(-50%)", color: "var(--muted)",
                  }}
                />
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
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
            </div>

            {/* زر الدخول */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "13px",
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                color: "#fff", border: "none", borderRadius: 12,
                fontFamily: "'Cairo', sans-serif", fontSize: 16, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: `0 4px 20px ${primaryColor}40`,
                transition: "all 0.2s",
                marginTop: 4,
              }}
            >
              {loading ? "⏳ جاري التحقق..." : "تسجيل الدخول →"}
            </button>
          </form>
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
          <span>اتصال مشفر 256-bit آمن • جميع الحقوق محفوظة</span>
        </div>
      </div>
    </div>
  );
}
