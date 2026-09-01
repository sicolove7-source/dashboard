import React, { useState } from "react";
import { Building2, Lock, Mail, AlertTriangle, ChevronDown, Crown } from "lucide-react";
import { ROLES } from "../utils/permissions";
import { loadUsers } from "./UserManagement";
import { authenticateTenantUser, SUPER_ADMIN_ACCOUNT, loadAllTenants } from "../services/tenantsManager";

export default function Login({ onLogin, companySettings }) {
  const companyName = companySettings?.companyName || 'لوحة إدارة التشطيبات';
  const companySubtitle = companySettings?.companySubtitle || 'سجّل دخولك للوصول إلى لوحة التحكم';
  const companyLogo = companySettings?.companyLogo || null;
  const primaryColor = companySettings?.primaryColor || '#6366F1';
  const accentColor = companySettings?.accentColor || '#3B82F6';
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  // Load all registered tenant companies
  const tenants = loadAllTenants();

  const handleLogin = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const authResult = authenticateTenantUser(email, password);
      
      if (authResult.success) {
        onLogin(authResult.user, authResult.tenant, authResult.isSuperAdmin);
      } else {
        // Fallback for legacy demo users
        const accounts = loadUsers();
        const found = accounts.find(
          (a) => a.email === email.trim() && a.password === password
        );
        if (found) {
          onLogin({ role: found.role, name: found.name, engineerName: found.engineerName, email: found.email });
        } else {
          setError(authResult.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        }
      }
      setLoading(false);
    }, 600);
  };

  const fillAccount = (emailVal, passVal) => {
    setEmail(emailVal);
    setPassword(passVal);
    setShowAccounts(false);
    setError(null);
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
                  placeholder="example@company.com"
                  style={{
                    width: "100%", padding: "11px 42px 11px 14px",
                    border: "1.5px solid var(--border)", borderRadius: 10,
                    background: "transparent", color: "var(--ink)",
                    fontFamily: "'Cairo', sans-serif", fontSize: 14,
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#6366F1")}
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
                  onFocus={(e) => (e.target.style.borderColor = "#6366F1")}
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
                background: "linear-gradient(135deg, #6366F1, #3B82F6)",
                color: "#fff", border: "none", borderRadius: 12,
                fontFamily: "'Cairo', sans-serif", fontSize: 16, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                transition: "all 0.2s",
                marginTop: 4,
              }}
            >
              {loading ? "⏳ جاري الدخول..." : "دخول →"}
            </button>
          </form>
        </div>

        {/* ─── حسابات تجريبية وحسابات الشركات ─── */}
        <div
          style={{
            background: "var(--card)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            overflow: "hidden",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            onClick={() => setShowAccounts(!showAccounts)}
            style={{
              width: "100%", padding: "14px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "transparent", border: "none",
              color: "var(--muted)", cursor: "pointer",
              fontFamily: "'Cairo', sans-serif", fontSize: 13, fontWeight: 700,
            }}
          >
            <span>🔑 حسابات سريعة للتجربة (اختر الحساب)</span>
            <ChevronDown
              size={16}
              style={{ transform: showAccounts ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }}
            />
          </button>

          {showAccounts && (
            <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {/* 👑 Super Admin */}
              <button
                onClick={() => fillAccount(SUPER_ADMIN_ACCOUNT.email, SUPER_ADMIN_ACCOUNT.password)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(139,92,246,0.15))",
                  border: "1px solid rgba(236,72,153,0.35)",
                  cursor: "pointer", textAlign: "right",
                  fontFamily: "'Cairo', sans-serif",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 22 }}>👑</span>
                <div style={{ flex: 1, textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#EC4899" }}>
                    المدير العام للمنصة (Super Admin)
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {SUPER_ADMIN_ACCOUNT.email} • إدارة جميع الشركات
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#EC4899", padding: "3px 9px", borderRadius: 6 }}>
                  دخول المالك
                </div>
              </button>

              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", margin: "4px 0 2px", paddingRight: 4 }}>
                🏢 شركات ومكاتب المشتركين (حسابات فرعية مستقلة):
              </div>

              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => fillAccount(t.adminEmail, t.adminPassword)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 10,
                    background: "rgba(0,0,0,0.02)",
                    border: "1px solid var(--border)",
                    cursor: "pointer", textAlign: "right",
                    fontFamily: "'Cairo', sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand-primary, #6366F1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `linear-gradient(135deg, ${t.primaryColor || '#6366F1'}, ${t.accentColor || '#3B82F6'})`,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0
                  }}>
                    {t.name.slice(0, 1)}
                  </div>
                  <div style={{ flex: 1, textAlign: "right", minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {t.city} • {t.adminEmail}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", background: "var(--border)", padding: "2px 6px", borderRadius: 4 }}>
                    دخول
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
