import React, { useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { NAV } from '../utils/constants';
import { canSeeNav, ROLES, can } from '../utils/permissions';

// Keys to export/import
const EXPORT_KEYS = [
  'finishing-projects-v2',
  'finishing-team-v2',
  'finishing-theme-v2',
  'db-team-meta-v1',
  'db-workers-v1',
  'db-suppliers-v1',
  'db-subcontractors-v1',
  'db-subcontractor-orders-v1',
  'db-subcontractor-extracts-v1',
  'customSpecs',
  'db-quotations-v1',
  'company-settings-v1',
  'company-users-v1',
  'crm-leads-v1',
  'isAdmin',
];

function exportData() {
  const data = {};
  EXPORT_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v) data[k] = v;
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `backup-dashboard-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file, onDone) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let content = e.target.result;
      if (!content || typeof content !== 'string') {
        throw new Error('الملف فارغ أو غير قابل للقراءة');
      }
      
      // إزالة علامة BOM إن وجدت
      content = content.trim();
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }

      const parsed = JSON.parse(content);

      // الحالة 1: إذا كان الملف يحتوي على مصفوفة مشاريع مباشرة [ {...}, {...} ]
      if (Array.isArray(parsed)) {
        localStorage.setItem('finishing-projects-v2', JSON.stringify(parsed));
        onDone(true);
        return;
      }

      // الحالة 2: إذا كان كائن بيانات عام
      if (typeof parsed === 'object' && parsed !== null) {
        let importedCount = 0;

        // دعم التنسيقات الشائعة (projects, team, workers, suppliers)
        if (parsed.projects && Array.isArray(parsed.projects)) {
          localStorage.setItem('finishing-projects-v2', JSON.stringify(parsed.projects));
          importedCount++;
        }
        if (parsed.team) {
          localStorage.setItem('finishing-team-v2', typeof parsed.team === 'string' ? parsed.team : JSON.stringify(parsed.team));
          importedCount++;
        }
        if (parsed.workers) {
          localStorage.setItem('db-workers-v1', typeof parsed.workers === 'string' ? parsed.workers : JSON.stringify(parsed.workers));
          importedCount++;
        }
        if (parsed.suppliers) {
          localStorage.setItem('db-suppliers-v1', typeof parsed.suppliers === 'string' ? parsed.suppliers : JSON.stringify(parsed.suppliers));
          importedCount++;
        }
        if (parsed.customSpecs) {
          localStorage.setItem('customSpecs', typeof parsed.customSpecs === 'string' ? parsed.customSpecs : JSON.stringify(parsed.customSpecs));
          importedCount++;
        }

        // استيراد كافة المفاتيح الأخرى المخزنة
        Object.entries(parsed).forEach(([k, v]) => {
          if (['projects', 'team', 'workers', 'suppliers', 'customSpecs'].includes(k) && importedCount > 0) return;
          const valToStore = typeof v === 'string' ? v : JSON.stringify(v);
          localStorage.setItem(k, valToStore);
          importedCount++;
        });

        if (importedCount > 0) {
          onDone(true);
          return;
        }
      }

      onDone(false);
    } catch (err) {
      console.error('Import error:', err);
      onDone(false);
    }
  };
  reader.readAsText(file);
}

export default function Sidebar({ 
  tab, setTab, setView, view, projectCount, 
  isDarkMode, setIsDarkMode, userRole, currentUser, 
  companySettings, sidebarOpen, setSidebarOpen, onOpenTour 
}) {
  const fileRef = useRef(null);
  const [importMsg, setImportMsg] = useState(null); // null | 'ok' | 'err'

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    importData(file, (ok) => {
      setImportMsg(ok ? 'ok' : 'err');
      e.target.value = '';
      if (ok) setTimeout(() => window.location.reload(), 1200);
      else setTimeout(() => setImportMsg(null), 3000);
    });
  }

  const isSuperAdmin = userRole === 'super_admin';
  const roleInfo = ROLES[userRole] || ROLES['owner'];
  const isPlatformHubTab = isSuperAdmin && tab === 'tenants';

  // In Platform Hub tab: show platform branding. Otherwise, show active tenant company branding if available.
  const companyName = isPlatformHubTab
    ? 'إدارة منصة Tashteeb Pro'
    : (companySettings?.companyName || (isSuperAdmin ? 'إدارة منصة Tashteeb Pro' : 'منصة تشطيب برو'));

  const companyLogo = isPlatformHubTab ? null : (companySettings?.companyLogo || null);

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      {/* ─── Close Button (mobile only) ─── */}
      <button
        onClick={() => setSidebarOpen?.(false)}
        style={{
          display: 'none', // shown via CSS on mobile
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, color: '#fff', cursor: 'pointer',
          width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
        }}
        className="sidebar-close-btn"
      >
        <Icons.X size={16} />
      </button>

      {/* ─── الشعار والهوية ─── */}
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 18px 14px' }}>
        {companyLogo ? (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: 3,
              flexShrink: 0,
              position: 'relative'
            }}
          >
            <img
              src={companyLogo}
              alt={companyName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                imageRendering: '-webkit-optimize-contrast'
              }}
            />
            {isSuperAdmin && !isPlatformHubTab && (
              <span
                title="إشراف المالك الرئيسي"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  left: -2,
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 17,
                  height: 17,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                  border: '1.5px solid #fff'
                }}
              >
                👑
              </span>
            )}
          </div>
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#0F172A',
              boxShadow: '0 4px 14px rgba(24,119,242,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative'
            }}
          >
            <img
              src="/app-icon.png"
              alt="Tashteeb Pro"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
              }}
            />
            <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#1877F2' }}>
              {isSuperAdmin ? <Icons.Crown size={22} color="#fff" /> : <Icons.Building2 size={22} color="#fff" />}
            </div>
            {isSuperAdmin && (
              <span
                title="المدير العام للمنصة"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  left: -2,
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 17,
                  height: 17,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                  border: '1.5px solid #fff'
                }}
              >
                👑
              </span>
            )}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="title" style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companyName}</div>
          <div className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>{isPlatformHubTab ? 'لوحة المالك والاشتراكات' : (isSuperAdmin ? 'إشراف المالك • ' + (companySettings?.companySubtitle || `المشاريع: ${projectCount}`) : `المشاريع: ${projectCount}`)}</div>
        </div>
      </div>

      {/* ─── بيانات المستخدم ─── */}
      <div style={{
        margin: "0 12px 10px",
        padding: "10px 14px",
        background: isDarkMode ? `${roleInfo.color}18` : "var(--sidebar-hover-bg)",
        border: `1px solid var(--sidebar-border)`,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>{roleInfo.badge}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isDarkMode ? roleInfo.color : "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {roleInfo.label}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentUser?.name || ""}
          </div>
        </div>
      </div>

      {/* ─── التنقل ─── */}
      <nav style={{ padding: "12px 0", flex: 1 }}>
        {NAV.map((n) => {
          if (!canSeeNav(currentUser || userRole, n.key)) return null;
          const Icon = Icons[n.icon];
          return (
            <div key={n.key} className={`nav-item ${tab === n.key ? "active" : ""}`}
              onClick={() => { setTab(n.key); setView("list"); setSidebarOpen?.(false); }}>
              {Icon && <Icon size={18} />}
              {n.label}
            </div>
          );
        })}
        {/* ── إعدادات الشركة — مدير فقط أو من لديه صلاحية مخصصة ── */}
        {can(currentUser || userRole, 'company_settings_view') && (
          <div
            className={`nav-item ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => { setTab('settings'); setView('list'); setSidebarOpen?.(false); }}
          >
            <Icons.Settings size={18} />
            إعدادات الشركة
          </div>
        )}
      </nav>

      {/* Onboarding Tour Button */}
      <div style={{ padding: "0 12px 8px" }}>
        <button 
          onClick={() => { onOpenTour?.(); setSidebarOpen?.(false); }}
          style={{ 
            display: "flex", alignItems: "center", gap: "10px", 
            width: "100%", padding: "10px 12px", 
            background: "var(--sidebar-hover-bg)",
            border: "1px solid var(--sidebar-border)",
            borderRadius: "8px", color: "var(--sidebar-text)", cursor: "pointer",
            fontFamily: "Cairo", fontWeight: 600, fontSize: 13
          }}
        >
          <Icons.Compass size={15} color="var(--muted)" />
          <span>جولة تعريفية للنظام</span>
        </button>
      </div>

      {/* Dark mode toggle */}
      <div style={{ padding: "0 12px 12px" }}>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{ 
            display: "flex", alignItems: "center", gap: "10px", 
            width: "100%", padding: "9px 12px", 
            background: "var(--sidebar-hover-bg)", border: "1px solid var(--sidebar-border)",
            borderRadius: "8px", color: "var(--sidebar-text)", cursor: "pointer",
            fontFamily: "Cairo", fontSize: 12.5, fontWeight: 600
          }}
        >
          {isDarkMode ? <Icons.Sun size={15} /> : <Icons.Moon size={15} />}
          {isDarkMode ? "الوضع الفاتح" : "الوضع الليلي"}
        </button>
      </div>

      {/* Backup / Restore section — مدير فقط */}
      {can(currentUser || userRole, 'backup_export') && (
        <div style={{ padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>
            النسخ الاحتياطي
          </div>

          {/* Export */}
          <button
            onClick={exportData}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "8px 12px",
              background: "var(--sidebar-hover-bg)", border: "1px solid var(--sidebar-border)",
              borderRadius: "8px", color: "var(--sidebar-text)", cursor: "pointer",
              fontFamily: "Cairo", fontSize: 12.5, fontWeight: 600,
              transition: "all 0.15s"
            }}
          >
            <Icons.Download size={14} />
            تصدير البيانات
          </button>

          {/* Import */}
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "8px 12px",
              background: "var(--sidebar-hover-bg)", border: "1px solid var(--sidebar-border)",
              borderRadius: "8px", color: "var(--sidebar-text)", cursor: "pointer",
              fontFamily: "Cairo", fontSize: 12.5, fontWeight: 600,
              transition: "all 0.15s"
            }}
          >
            <Icons.Upload size={14} />
            استيراد بيانات
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />

          {/* Feedback message */}
          {importMsg === 'ok' && (
            <div style={{ fontSize: 12, color: "var(--success)", textAlign: "center", fontWeight: 700, padding: "6px 0" }}>
              ✅ تم الاستيراد — جاري إعادة التشغيل...
            </div>
          )}
          {importMsg === 'err' && (
            <div style={{ fontSize: 12, color: "var(--danger)", textAlign: "center", fontWeight: 700, padding: "6px 0" }}>
              ❌ فشل استيراد الملف
            </div>
          )}
        </div>
      )}

      <div className="sidebar-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', fontSize: 11.5 }}>
        <span>v2.0 · Tashteeb Pro</span>
        <a
          href="/landing"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#D97706', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          title="فتح صفحة المنصة التسويقية"
        >
          <span>الموقع التعريفي</span> ↗
        </a>
      </div>
    </aside>
  );
}
