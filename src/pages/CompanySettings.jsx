import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Building2, Upload, Palette, Save, CheckCircle2, Image, Trash2,
  RefreshCw, AlertTriangle, Headphones, Hammer, Wallet, ClipboardList, X,
  Globe, ShieldCheck, Server, CheckCircle, Zap, Users, Phone, Mail,
  FileText, MapPin, Hash, Check
} from 'lucide-react';

import { setGlobalCurrency } from '../utils/helpers';
import { getActiveTenantId } from '../services/tenantsManager';
import { syncSettingsToCloud } from '../services/cloudSync';
import AutomationsCenter from './AutomationsCenter';
import UserManagement from './UserManagement';
import {
  DEFAULT_COMPANY_SETTINGS,
  loadCompanySettings,
  saveCompanySettings,
  applyCompanyBranding,
  compressLogoImage,
} from '../utils/branding';

export {
  COMPANY_SETTINGS_KEY,
  DEFAULT_COMPANY_SETTINGS,
  loadCompanySettings,
  saveCompanySettings,
  applyCompanyBranding
} from '../utils/branding';

/* ────────────────────────────────────────────────────────────
   PRESET PALETTES
──────────────────────────────────────────────────────────── */
const PALETTES = [
  { name: 'أزرق فيسبوك الرسمي (موصى به)', primary: '#1877F2', accent: '#166FE5' },
  { name: 'كحلي رزين ومريح', primary: '#1E293B', accent: '#0F172A' },
  { name: 'زيتي هندسي هادئ', primary: '#059669', accent: '#047857' },
  { name: 'رمادي ورشة احترافي', primary: '#475569', accent: '#334155' },
  { name: 'عنبري هادئ متوازن', primary: '#D97706', accent: '#B45309' },
  { name: 'نيلي معاصر', primary: '#4F46E5', accent: '#4338CA' },
];

/* ────────────────────────────────────────────────────────────
   TEAM GROUPS CONFIG
──────────────────────────────────────────────────────────── */
const TEAM_GROUPS = [
  { key: 'engineers',       label: 'مهندسو المواقع', icon: Hammer,        color: '#3B82F6' },
  { key: 'accountants',     label: 'المحاسبون',       icon: Wallet,        color: '#F59E0B' },
  { key: 'techOffice',      label: 'المكتب الفني',    icon: ClipboardList, color: '#10B981' },
  { key: 'customerService', label: 'خدمة العملاء',   icon: Headphones,    color: '#EC4899' },
];

/* ────────────────────────────────────────────────────────────
   Component: LogoUploader
──────────────────────────────────────────────────────────── */
function LogoUploader({ logo, onChange }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setProcessing(true);
    try {
      const compressed = await compressLogoImage(file, 400, 0.88);
      if (compressed) {
        onChange(compressed);
      }
    } catch (err) {
      console.warn('Logo compression error, fallback to FileReader:', err);
      const reader = new FileReader();
      reader.onload = (e) => onChange(e.target.result);
      reader.readAsDataURL(file);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="cs-logo-uploader-box" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 140 }}>
      {/* Preview + Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%',
          maxWidth: 160,
          height: 140,
          borderRadius: 18,
          border: drag ? '2px dashed var(--brand-primary, #6366F1)' : '2px dashed var(--border)',
          background: drag ? 'rgba(99,102,241,0.07)' : 'rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
          boxShadow: drag ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
          margin: '0 auto',
        }}
      >
        {processing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 8px' }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              border: '2px solid rgba(99,102,241,0.2)',
              borderTopColor: '#6366F1',
              animation: 'spin 0.6s linear infinite'
            }} />
            <span style={{ fontSize: 10.5, color: '#6366F1', fontWeight: 600 }}>جاري معالجة الشعار...</span>
          </div>
        ) : logo ? (
          <img src={logo} alt="شعار الشركة" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 16 }} />
        ) : (
          <>
            <Image size={30} style={{ color: 'var(--muted)', marginBottom: 6 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '0 8px', lineHeight: 1.5 }}>
              اضغط أو اسحب<br />الشعار هنا
            </span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px', flex: 1, whiteSpace: 'nowrap' }} onClick={() => inputRef.current?.click()} disabled={processing}>
          <Upload size={13} /> {processing ? 'جاري التحميل...' : 'رفع صورة'}
        </button>
        {logo && !processing && (
          <button type="button" className="btn" style={{ fontSize: 12, padding: '6px 10px', background: 'var(--danger-subtle)', color: 'var(--danger)', border: 'none' }} onClick={() => onChange(null)}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────────────────── */
export default function CompanySettings({
  companySettings,
  onCompanySettingsChange,
  team,
  onTeamChange,
  currentUser,
  activeCompanyId,
  projects = [],
  leads = [],
  userRole = 'owner',
  onNavigateToProject,
  onNavigateToTab,
  activeSubTab = 'branding',
  onSubTabChange,
}) {
  const [settings, setSettings] = useState(() => {
    if (companySettings && Object.keys(companySettings).length > 0) {
      return { ...DEFAULT_COMPANY_SETTINGS, ...companySettings };
    }
    return loadCompanySettings(activeCompanyId);
  });

  const [saved, setSaved] = useState(false);
  const [localSubTab, setLocalSubTab] = useState('branding');
  const activeTab = onSubTabChange ? (activeSubTab || 'branding') : localSubTab;
  const setActiveTab = onSubTabChange || setLocalSubTab;

  const [teamInputs, setTeamInputs] = useState({
    engineers: '', accountants: '', techOffice: '', customerService: ''
  });
  const [teamErrors, setTeamErrors] = useState({});

  // Sync state if external companySettings changes without wiping current logo
  useEffect(() => {
    if (companySettings && Object.keys(companySettings).length > 0) {
      setSettings(prev => {
        const preservedLogo = prev.companyLogo || companySettings.companyLogo || null;
        return { ...prev, ...companySettings, companyLogo: preservedLogo };
      });
    }
  }, [companySettings, activeCompanyId]);

  // Apply branding on load & settings change
  useEffect(() => {
    applyCompanyBranding(settings);
  }, [settings]);

  const handleSave = useCallback(async () => {
    saveCompanySettings(settings, activeCompanyId);
    onCompanySettingsChange?.(settings);
    try {
      await syncSettingsToCloud(activeCompanyId, settings);
    } catch (e) {
      console.warn("syncSettingsToCloud in handleSave error:", e);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [settings, activeCompanyId, onCompanySettingsChange]);

  function updateSetting(key, val) {
    setSettings(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'companyLogo') {
        saveCompanySettings(next, activeCompanyId);
        onCompanySettingsChange?.(next);
        try {
          syncSettingsToCloud(activeCompanyId, next);
        } catch (e) {}
      }
      return next;
    });
  }

  // ── Team Management ──
  function handleAddMember(groupKey) {
    const name = (teamInputs[groupKey] || '').trim();
    if (!name) { setTeamErrors(e => ({ ...e, [groupKey]: 'الرجاء إدخال اسم' })); return; }
    const current = team?.[groupKey] || [];
    if (current.includes(name)) { setTeamErrors(e => ({ ...e, [groupKey]: 'هذا الاسم موجود مسبقاً' })); return; }
    onTeamChange?.({ ...team, [groupKey]: [...current, name] });
    setTeamInputs(prev => ({ ...prev, [groupKey]: '' }));
    setTeamErrors(e => ({ ...e, [groupKey]: '' }));
  }

  function handleRemoveMember(groupKey, name) {
    onTeamChange?.({ ...team, [groupKey]: (team?.[groupKey] || []).filter(n => n !== name) });
  }

  return (
    <div className="tab-fade cs-root" style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} dir="rtl">

      {/* ─── Header ─── */}
      <div className="panel cs-header" style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px 20px' }}>
        <div className="cs-header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div className="cs-header-info" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 8,
              background: '#F1F5F9', border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0F172A', flexShrink: 0
            }}>
              <Building2 size={19} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>إعدادات الشركة الشاملة</h2>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                هوية المؤسسة • مركز الأتمتة • فريق العمل والصلاحيات
              </p>
            </div>
          </div>

          {activeTab === 'branding' && (
            <div className="cs-header-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {saved ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16A34A', fontWeight: 600, fontSize: 13 }}>
                  <CheckCircle2 size={16} /> تم الحفظ!
                </div>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handleSave} style={{ gap: 6, padding: '7px 14px', fontSize: 12.5 }}>
                  <Save size={14} /> حفظ
                </button>
              )}
            </div>
          )}
        </div>
      </div>


      {/* ─── Fully Responsive Navigation Subtabs Switcher ─── */}
      <div className="cs-tabs-nav" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--card)',
        padding: '5px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {/* Tab 1: Branding & Profile */}
        <button
          type="button"
          className="cs-tab-btn"
          onClick={() => setActiveTab('branding')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 14px',
            borderRadius: 8,
            border: activeTab === 'branding' ? '1px solid #0F172A' : '1px solid transparent',
            background: activeTab === 'branding' ? '#0F172A' : 'transparent',
            color: activeTab === 'branding' ? '#FFFFFF' : 'var(--muted)',
            fontFamily: 'Cairo',
            fontSize: 13,
            fontWeight: activeTab === 'branding' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            flex: '1 1 0',
            minWidth: 'max-content',
          }}
        >
          <Building2 size={15} color={activeTab === 'branding' ? '#FFFFFF' : 'currentColor'} />
          <span>هوية الشركة</span>
        </button>

        {/* Tab 2: Smart Automation Center */}
        <button
          type="button"
          className="cs-tab-btn"
          onClick={() => setActiveTab('automations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 14px',
            borderRadius: 8,
            border: activeTab === 'automations' ? '1px solid #0F172A' : '1px solid transparent',
            background: activeTab === 'automations' ? '#0F172A' : 'transparent',
            color: activeTab === 'automations' ? '#FFFFFF' : 'var(--muted)',
            fontFamily: 'Cairo',
            fontSize: 13,
            fontWeight: activeTab === 'automations' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            flex: '1 1 0',
            minWidth: 'max-content',
          }}
        >
          <Zap size={15} color={activeTab === 'automations' ? '#FFFFFF' : 'currentColor'} />
          <span>مركز الأتمتة</span>
        </button>

        {/* Tab 3: Team & Users */}
        <button
          type="button"
          className="cs-tab-btn"
          onClick={() => setActiveTab('team_users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 14px',
            borderRadius: 8,
            border: activeTab === 'team_users' ? '1px solid #0F172A' : '1px solid transparent',
            background: activeTab === 'team_users' ? '#0F172A' : 'transparent',
            color: activeTab === 'team_users' ? '#FFFFFF' : 'var(--muted)',
            fontFamily: 'Cairo',
            fontSize: 13,
            fontWeight: activeTab === 'team_users' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            flex: '1 1 0',
            minWidth: 'max-content',
          }}
        >
          <Users size={15} color={activeTab === 'team_users' ? '#FFFFFF' : 'currentColor'} />
          <span>الفريق والصلاحيات</span>
        </button>
      </div>


      {/* ─── TAB 1: Branding & Company Info ─── */}
      {activeTab === 'branding' && (
        <div className="tab-fade cs-branding-section" style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', boxSizing: 'border-box' }}>
          {/* Section 1: Logo & Company Name */}
          <div className="cs-logo-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 }}>

            {/* Logo Panel */}
            <div className="panel cs-logo-panel" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Image size={16} style={{ color: 'var(--brand-primary, #6366F1)' }} />
                شعار الشركة الرسمي
              </h3>
              <div className="cs-logo-panel-body" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <LogoUploader logo={settings.companyLogo} onChange={(val) => updateSetting('companyLogo', val)} />
                <div className="cs-logo-guidelines" style={{ flex: '1 1 200px', minWidth: 0, width: '100%' }}>
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(99,102,241,0.06)',
                    borderRadius: 10,
                    border: '1px solid rgba(99,102,241,0.15)',
                    fontSize: 12,
                    color: 'var(--muted)',
                    lineHeight: 1.7,
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontSize: 12.5 }}>📌 تعليمات الشعار</div>
                    <div>• يُفضل PNG أو SVG بخلفية شفافة</div>
                    <div>• الحد الأقصى للحجم: 2 ميجابايت</div>
                    <div>• يظهر في صفحة الدخول، عقود المقاولين، والمستخلصات</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Info & Live Preview */}
            <div className="panel">
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={16} style={{ color: 'var(--brand-primary, #6366F1)' }} />
                الهوية الأساسية
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                    اسم المنشأة / الشركة *
                  </label>
                  <input
                    type="text"
                    className="filter-input"
                    style={{ width: '100%', fontWeight: 700, fontSize: 14 }}
                    value={settings.companyName || ''}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                    placeholder="مثال: شركة النيل للتصميم والتشطيبات"
                    maxLength={70}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                    الشعار اللفظي أو التخصص *
                  </label>
                  <input
                    type="text"
                    className="filter-input"
                    style={{ width: '100%', fontSize: 13 }}
                    value={settings.companySubtitle || ''}
                    onChange={(e) => updateSetting('companySubtitle', e.target.value)}
                    placeholder="مثال: مقاولات عامة وتصميم داخلي فاخر"
                    maxLength={90}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                    العملة المعتمدة للمشاريع والمقايسات *
                  </label>
                  <select
                    className="filter-select"
                    style={{ width: '100%', fontWeight: 700 }}
                    value={settings.currency || 'د.إ'}
                    onChange={(e) => updateSetting('currency', e.target.value)}
                  >
                    <option value="د.إ">درهم إماراتي (AED - د.إ)</option>
                    <option value="ج.م">جنيه مصري (EGP - ج.م)</option>
                    <option value="ر.س">ريال سعودي (SAR - ر.س)</option>
                    <option value="$">دولار أمريكي (USD - $)</option>
                    <option value="ر.ق">ريال قطري (QAR - ر.ق)</option>
                    <option value="د.ك">دينار كويتي (KWD - د.ك)</option>
                    <option value="د.ب">دينار بحريني (BHD - د.ب)</option>
                    <option value="ر.ع">ريال عماني (OMR - ر.ع)</option>
                  </select>
                </div>

                {/* Live Preview Card */}
                <div className="cs-live-preview-card" style={{
                  marginTop: 2,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  display: 'flex', alignItems: 'center', gap: 12,
                  flexWrap: 'wrap',
                }}>
                  {settings.companyLogo ? (
                    <img src={settings.companyLogo} alt="preview" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 2, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: settings.primaryColor || '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={20} color="#fff" />
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {settings.companyName || 'اسم الشركة'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {settings.companySubtitle || 'نظام إدارة المشاريع'}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 8 }}>
                    معاينة حية
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Official Contact & Legal Registration */}
          <div className="panel">
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} style={{ color: 'var(--brand-primary, #6366F1)' }} />
              بيانات الاتصال والتوثيق المالي والرسمي (للعقود والفواتير والمستخلصات)
            </h3>
            <div className="cs-contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                  <Phone size={12} style={{ display: 'inline', marginLeft: 4 }} /> رقم الهاتف وواتساب الدعم *
                </label>
                <input
                  type="text"
                  className="filter-input"
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right' }}
                  value={settings.phone || settings.supportPhone || ''}
                  onChange={(e) => {
                    updateSetting('phone', e.target.value);
                    updateSetting('supportPhone', e.target.value);
                  }}
                  placeholder="0501122334"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                  <Mail size={12} style={{ display: 'inline', marginLeft: 4 }} /> البريد الإلكتروني الرسمي *
                </label>
                <input
                  type="email"
                  className="filter-input"
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right' }}
                  value={settings.email || ''}
                  onChange={(e) => updateSetting('email', e.target.value)}
                  placeholder="info@yourcompany.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                  <Hash size={12} style={{ display: 'inline', marginLeft: 4 }} /> الرقم الضريبي (TRN / Tax ID)
                </label>
                <input
                  type="text"
                  className="filter-input"
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right' }}
                  value={settings.taxNumber || ''}
                  onChange={(e) => updateSetting('taxNumber', e.target.value)}
                  placeholder="100-245-890-0003"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                  <FileText size={12} style={{ display: 'inline', marginLeft: 4 }} /> رقم السجل التجاري / الرخصة
                </label>
                <input
                  type="text"
                  className="filter-input"
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right' }}
                  value={settings.commercialRegister || ''}
                  onChange={(e) => updateSetting('commercialRegister', e.target.value)}
                  placeholder="CN-1049281"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                  <MapPin size={12} style={{ display: 'inline', marginLeft: 4 }} /> المدينة والدولة
                </label>
                <div className="cs-city-country-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  <input
                    type="text"
                    className="filter-input"
                    value={settings.city || ''}
                    onChange={(e) => updateSetting('city', e.target.value)}
                    placeholder="المدينة (مثال: أبوظبي)"
                  />
                  <input
                    type="text"
                    className="filter-input"
                    value={settings.country || ''}
                    onChange={(e) => updateSetting('country', e.target.value)}
                    placeholder="الدولة (مثال: الإمارات)"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                  عنوان المقر الرئيسي
                </label>
                <input
                  type="text"
                  className="filter-input"
                  style={{ width: '100%' }}
                  value={settings.address || ''}
                  onChange={(e) => updateSetting('address', e.target.value)}
                  placeholder="الشارع، اسم المبنى، رقم المكتب"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Color Palette */}
          <div className="panel">
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={16} style={{ color: 'var(--brand-primary, #6366F1)' }} />
              هوية الألوان والتخصيص البصري
            </h3>
            <div className="cs-palette-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

              {/* Preset Palettes */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>ألوان جاهزة — اختر بنقرة:</div>
                <div className="cs-palette-presets-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                  {PALETTES.map((p) => {
                    const isSelected = settings.primaryColor === p.primary;
                    return (
                      <button
                        type="button"
                        key={p.name}
                        onClick={() => { updateSetting('primaryColor', p.primary); updateSetting('accentColor', p.accent); }}
                        title={p.name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
                          border: isSelected ? `2px solid ${p.primary}` : '2px solid var(--border)',
                          background: isSelected ? `${p.primary}15` : 'transparent',
                          fontFamily: 'Cairo', fontSize: 12, fontWeight: isSelected ? 800 : 500,
                          color: isSelected ? p.primary : 'var(--text)',
                          transition: 'all 0.2s',
                          width: '100%',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 2 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: p.primary }} />
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: p.accent }} />
                        </div>
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="cs-custom-colors-row" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>اللون الرئيسي</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={settings.primaryColor || '#6366F1'}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2, background: 'var(--surface)', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      className="filter-input"
                      value={settings.primaryColor || '#6366F1'}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      style={{ width: 90, flex: 1, minWidth: 0, fontFamily: 'monospace', fontSize: 12 }}
                      maxLength={7}
                    />
                  </div>
                </div>
                <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>اللون الثانوي</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={settings.accentColor || '#3B82F6'}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2, background: 'var(--surface)', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      className="filter-input"
                      value={settings.accentColor || '#3B82F6'}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      style={{ width: 90, flex: 1, minWidth: 0, fontFamily: 'monospace', fontSize: 12 }}
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live preview bar */}
            <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>معاينة الأزرار والشارات:</div>
              <button type="button" style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'default',
                background: settings.primaryColor || '#1877F2',
                color: '#fff', fontFamily: 'Cairo', fontWeight: 700, fontSize: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                زر تجريبي
              </button>
              <div style={{ padding: '3px 10px', borderRadius: 16, background: '#F1F5F9', color: '#0F172A', fontSize: 11, fontWeight: 700, border: '1px solid #E2E8F0' }}>
                شارة حالة نشطة
              </div>
            </div>
          </div>

          {/* Section 4: Custom Domain & DNS Settings */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)' }}>
                  <Globe size={17} color="#0F172A" /> إعدادات الدومين والربط المخصص (Custom Domain & DNS)
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                  اربط مساحة عمل مكتبكم بدومين فرعي سريع أو دومين موقعكم الخاص بالكامل (White-Label)
                </p>
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 16, background: '#F1F5F9', color: '#16A34A', border: '1px solid #E2E8F0'
              }}>
                <ShieldCheck size={13} /> شهادة SSL/HTTPS مشفرة ونشطة 🔒
              </span>
            </div>

            <div className="cs-domain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16, marginBottom: 16 }}>
              {/* Subdomain */}
              <div className="cs-domain-card" style={{ background: 'var(--bg)', padding: 16, borderRadius: 14, border: '1px solid var(--border)', maxWidth: '100%', boxSizing: 'border-box' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  1. الدومين الفرعي السريع (Subdomain)
                </label>
                <div className="cs-subdomain-row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, width: '100%', boxSizing: 'border-box' }}>
                  <input
                    type="text"
                    className="filter-input"
                    style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13, direction: 'ltr', textAlign: 'left' }}
                    value={settings.subdomain || 'daraldhabi'}
                    onChange={(e) => updateSetting('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="company-name"
                  />
                  <span className="cs-domain-suffix" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, direction: 'ltr', flexShrink: 0 }}>.platform.com</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  رابط وصول فوري وسريع بدون الحاجة لأي إعدادات DNS.
                </div>
              </div>

              {/* Custom Domain (White-Label) */}
              <div className="cs-domain-card" style={{ background: 'var(--bg)', padding: 16, borderRadius: 14, border: '1px solid var(--border)', maxWidth: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                    2. الدومين الخاص الكامل (Custom Domain)
                  </label>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#0F172A', background: '#F1F5F9', padding: '2px 7px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    White-Label
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, width: '100%', boxSizing: 'border-box' }}>
                  <input
                    type="text"
                    className="filter-input"
                    style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13, direction: 'ltr', textAlign: 'left' }}
                    value={settings.customDomain || ''}
                    onChange={(e) => updateSetting('customDomain', e.target.value.toLowerCase().trim())}
                    placeholder="portal.yourcompany.com"
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  مثال: <code>portal.daraldhabi.com</code> أو <code>app.yourfirm.sa</code>
                </div>
              </div>
            </div>

            {/* DNS CNAME Configuration Guide with Horizontal Scroll Container */}
            <div className="cs-dns-table-wrap" style={{
              background: 'var(--bg-color)',
              padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)',
              maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden'
            }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Server size={15} color="#0F172A" style={{ flexShrink: 0 }} />
                <span>كيفية ربط الدومين في لوحة تحكم نطاقك (GoDaddy / Cloudflare / Namecheap):</span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.6 }}>
                توجه إلى إعدادات الـ <strong>DNS</strong> في موقع النطاق الخاص بك وأضف السجل التالي:
              </p>

              <div className="cs-dns-scroll-box" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
                <table className="data-table" style={{ width: '100%', minWidth: 460, fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>نوع السجل (Type)</th>
                      <th>الاسم / المضيف (Host)</th>
                      <th>القيمة المستهدفة (Target)</th>
                      <th>الحالة (Status)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span style={{ fontWeight: 800, color: '#6366F1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6 }}>CNAME</span></td>
                      <td style={{ direction: 'ltr', textAlign: 'left', fontWeight: 700 }}>portal</td>
                      <td style={{ direction: 'ltr', textAlign: 'left', fontWeight: 700, color: '#0F766E' }}>cname.yourplatform.com</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10B981', fontWeight: 700 }}>
                          <CheckCircle size={13} /> متصل بنجاح ✓
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="cs-dns-mobile-hint" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 8, display: 'none' }}>
                💡 يمكنك سحب الجدول أفقياً لعرض كامل بيانات الربط
              </div>
            </div>
          </div>

          {/* Footer Save & Reset Buttons */}
          <div className="cs-footer-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn cs-btn-reset"
              style={{ gap: 6, color: 'var(--muted)', borderColor: 'var(--border)' }}
              onClick={() => { setSettings(loadCompanySettings(activeCompanyId)); }}
            >
              <RefreshCw size={13} /> إعادة تعيين
            </button>
            <button type="button" className="btn btn-primary cs-btn-save" onClick={handleSave} style={{ gap: 8, padding: '10px 24px', fontSize: 14 }}>
              {saved ? <><CheckCircle2 size={16} /> تم الحفظ بنجاح!</> : <><Save size={16} /> حفظ جميع بيانات الشركة</>}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Smart Automation Center ⚡ ─── */}
      {activeTab === 'automations' && (
        <div className="tab-fade cs-automations-tab-wrap" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
          <AutomationsCenter
            projects={projects}
            leads={leads}
            team={team}
            companySettings={settings}
            userRole={userRole}
            onNavigateToProject={onNavigateToProject}
            onNavigateToTab={onNavigateToTab}
          />
        </div>
      )}

      {/* ─── TAB 3: Team & System Users ─── */}
      {activeTab === 'team_users' && (
        <div className="grid tab-fade cs-team-section" style={{ gap: 24 }}>
          {/* Team Management */}
          <div className="panel">
            <h3 style={{ margin: '0 0 4px', fontSize: 15.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={17} style={{ color: 'var(--brand-primary, #6366F1)' }} />
              إدارة أقسام وأعضاء فريق العمل
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--muted)' }}>
              أضف أو احذف أعضاء الفريق الميداني والمكتبي — ستظهر أسماؤهم تلقائياً في قوائم إسناد المشاريع والمستخلصات
            </p>

            {/* Responsive Grid: Replaced rigid 1fr 1fr with repeat(auto-fit, minmax(280px, 1fr)) */}
            <div className="cs-team-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {TEAM_GROUPS.map((g) => {
                const members = team?.[g.key] || [];
                const Icon = g.icon;
                return (
                  <div key={g.key} style={{
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: 'var(--card)',
                  }}>
                    {/* Group Header */}
                    <div style={{
                      padding: '12px 14px',
                      background: `${g.color}12`,
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${g.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={15} color={g.color} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{g.label}</span>
                      <span style={{
                        marginRight: 'auto',
                        background: `${g.color}20`, color: g.color,
                        padding: '2px 8px', borderRadius: 20,
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {members.length} عضو
                      </span>
                    </div>

                    {/* Add Input & Button */}
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="filter-input"
                        style={{ flex: 1, fontSize: 12 }}
                        placeholder={`إضافة عضو جديد...`}
                        value={teamInputs[g.key] || ''}
                        onChange={(e) => {
                          setTeamInputs(prev => ({ ...prev, [g.key]: e.target.value }));
                          setTeamErrors(prev => ({ ...prev, [g.key]: '' }));
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMember(g.key)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap' }}
                        onClick={() => handleAddMember(g.key)}
                      >
                        + إضافة
                      </button>
                    </div>
                    {teamErrors[g.key] && (
                      <div style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.07)', color: 'var(--danger)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertTriangle size={12} /> {teamErrors[g.key]}
                      </div>
                    )}

                    {/* Members List */}
                    <div style={{ padding: '6px 0', maxHeight: 200, overflowY: 'auto' }}>
                      {members.length === 0 ? (
                        <div style={{ padding: '14px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                          لا يوجد أعضاء في هذا القسم
                        </div>
                      ) : (
                        members.map((name) => (
                          <div
                            key={name}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '7px 12px',
                              borderBottom: '1px solid rgba(0,0,0,0.04)',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: `${g.color}20`, color: g.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: 11,
                            }}>
                              {name.charAt(name.length > 2 ? 3 : 0)}
                            </div>
                            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(g.key, name)}
                              style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: 'var(--muted)', padding: 4, borderRadius: 6,
                                display: 'flex', transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#EF4444'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
                              title="حذف العضو"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Management */}
          <UserManagement currentUser={currentUser} companyId={activeCompanyId} />
        </div>
      )}

    </div>
  );
}
