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
  const companyName = isSuperAdmin ? 'إدارة المنصة الرئيسية (Hub)' : (companySettings?.companyName || 'إدارة التشطيبات');
  const companyLogo = isSuperAdmin ? null : (companySettings?.companyLogo || null);

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

      {/* ─── الشعار ─── */}
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 14px' }}>
        {companyLogo ? (
          <img
            src={companyLogo}
            alt="شعار الشركة"
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 2, flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: isSuperAdmin 
              ? 'linear-gradient(135deg, #EC4899, #8B5CF6)' 
              : `linear-gradient(135deg, ${companySettings?.primaryColor || '#6366F1'}, ${companySettings?.accentColor || '#3B82F6'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSuperAdmin ? <Icons.Crown size={20} color="#fff" /> : <Icons.Building2 size={20} color="#fff" />}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="title" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companyName}</div>
          <div className="sub">{isSuperAdmin ? 'لوحة المالك والاشتراكات' : `المشاريع: ${projectCount}`}</div>
        </div>
      </div>

      {/* ─── بيانات المستخدم ─── */}
      <div style={{
        margin: "0 12px 8px",
        padding: "10px 14px",
        background: `${roleInfo.color}18`,
        border: `1px solid ${roleInfo.color}30`,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>{roleInfo.badge}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: roleInfo.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {roleInfo.label}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentUser?.name || ""}
          </div>
        </div>
      </div>

      {/* ─── التنقل ─── */}
      <nav style={{ padding: "12px 0", flex: 1 }}>
        {NAV.map((n) => {
          if (!canSeeNav(userRole, n.key)) return null;
          const Icon = Icons[n.icon];
          return (
            <div key={n.key} className={`nav-item ${tab === n.key ? "active" : ""}`}
              onClick={() => { setTab(n.key); setView("list"); setSidebarOpen?.(false); }}>
              {Icon && <Icon size={18} />}
              {n.label}
            </div>
          );
        })}
        {/* ── إعدادات الشركة — مدير فقط ── */}
        {can(userRole, 'company_settings_view') && (
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
      <div style={{ padding: "0 24px 8px" }}>
        <button 
          onClick={() => { onOpenTour?.(); setSidebarOpen?.(false); }}
          style={{ 
            display: "flex", alignItems: "center", gap: "10px", 
            width: "100%", padding: "10px 12px", 
            background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: "8px", color: "#A5B4FC", cursor: "pointer",
            fontFamily: "Cairo", fontWeight: 700, fontSize: 13
          }}
        >
          <Icons.Compass size={16} color="#818CF8" />
          <span>جولة تعريفية للنظام 🧭</span>
        </button>
      </div>

      {/* Dark mode toggle */}
      <div style={{ padding: "0 24px 12px" }}>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{ 
            display: "flex", alignItems: "center", gap: "10px", 
            width: "100%", padding: "10px", 
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px", color: "#F8FAFC", cursor: "pointer",
            fontFamily: "Cairo"
          }}
        >
          {isDarkMode ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
          {isDarkMode ? "الوضع الفاتح" : "الوضع الليلي"}
        </button>
      </div>

      {/* Backup / Restore section — مدير فقط */}
      {can(userRole, 'backup_export') && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", fontWeight: 600, letterSpacing: 1, marginBottom: 2 }}>
            النسخ الاحتياطي
          </div>

          {/* Export */}
          <button
            onClick={exportData}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "9px 12px",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "8px", color: "#6EE7B7", cursor: "pointer",
              fontFamily: "Cairo", fontSize: 13, fontWeight: 700,
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.15)"}
          >
            <Icons.Download size={15} />
            تصدير البيانات
          </button>

          {/* Import */}
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "9px 12px",
              background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "8px", color: "#A5B4FC", cursor: "pointer",
              fontFamily: "Cairo", fontSize: 13, fontWeight: 700,
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,0.15)"}
          >
            <Icons.Upload size={15} />
            استيراد بيانات
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />

          {/* Feedback message */}
          {importMsg === 'ok' && (
            <div style={{ fontSize: 12, color: "#6EE7B7", textAlign: "center", fontWeight: 700, padding: "6px 0" }}>
              ✅ تم الاستيراد — جاري إعادة التشغيل...
            </div>
          )}
          {importMsg === 'err' && (
            <div style={{ fontSize: 12, color: "#FCA5A5", textAlign: "center", fontWeight: 700, padding: "6px 0" }}>
              ❌ ملف غير صالح، حاول مرة أخرى
            </div>
          )}
        </div>
      )}

      <div className="sidebar-foot">v2.0 · {companyName}</div>
    </aside>
  );
}
