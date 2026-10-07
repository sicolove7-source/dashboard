import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Building2, Upload, Save, CheckCircle2, Image, Trash2,
  RefreshCw, AlertTriangle, Headphones, Hammer, Wallet, ClipboardList, X,
  Globe, ShieldCheck, Server, CheckCircle, Zap, Users, Phone, Mail,
  FileText, MapPin, Hash, Check, Copy, Clock, Calendar
} from 'lucide-react';

import { setGlobalCurrency, formatRegistrationDateTime } from '../utils/helpers';
import { getActiveTenantId } from '../services/tenantsManager';
import { syncSettingsToCloud, syncCompanyUsersToCloud, syncTenantUsersToCloud, uploadMediaToFirebaseStorage } from '../services/cloudSync';
import { callCreateCompanyUser } from '../services/auth';
import { getSubdomainUrl } from '../services/subdomainResolver';
import AutomationsCenter from './AutomationsCenter';
import UserManagement, { loadUsers, saveUsers } from './UserManagement';
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
function LogoUploader({ logo, onChange, activeCompanyId }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setProcessing(true);
    try {
      const compressed = await compressLogoImage(file, 360, 0.85);
      if (compressed) {
        onChange(compressed);
        try {
          uploadMediaToFirebaseStorage(
            compressed,
            `companies/${activeCompanyId || 'general'}/branding`,
            `logo_${Date.now()}.png`,
            compressed,
            `logo_${activeCompanyId || 'main'}`,
            activeCompanyId
          );
        } catch (e) {}
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
          maxWidth: 180,
          height: 150,
          borderRadius: 18,
          border: drag ? '2px dashed var(--brand-primary, #6366F1)' : '2px dashed var(--border)',
          background: drag ? 'rgba(99,102,241,0.07)' : '#FFFFFF',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
          boxShadow: drag ? '0 0 0 3px rgba(99,102,241,0.15)' : '0 2px 10px rgba(0,0,0,0.05)',
          margin: '0 auto',
          padding: 6,
          boxSizing: 'border-box'
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
          <img
            src={logo}
            alt="شعار الشركة"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: 12,
              imageRendering: '-webkit-optimize-contrast'
            }}
          />
        ) : (
          <>
            <Image size={32} style={{ color: 'var(--muted)', marginBottom: 6 }} />
            <span style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', padding: '0 8px', lineHeight: 1.5, fontWeight: 600 }}>
              اضغط أو اسحب<br />الشعار هنا (PNG / JPG)
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
  companySubdomain,
  projects = [],
  leads = [],
  userRole = 'owner',
  onNavigateToProject,
  onNavigateToTab,
  activeSubTab = 'branding',
  onSubTabChange,
}) {
  // ⚠️ لا نستخدم localStorage.getItem('platform-active-tenant-id') هنا كـ fallback أبداً:
  // هذه القيمة مخزّنة محلياً لكل متصفح على حدة وقد تكون من جلسة/معاينة قديمة لشركة مختلفة
  // على نفس الجهاز، وهو ما كان يسبب حفظ الإعدادات على شركة غلط.
  // activeCompanyId (من App.jsx) و currentUser?.companyId مصدرهما الجلسة/الـ Claims الموثقة دائماً.
  const effectiveCompanyId = activeCompanyId || currentUser?.companyId || 'comp_demo';

  const [settings, setSettings] = useState(() => {
    const loaded = loadCompanySettings(effectiveCompanyId);
    const hasCustomProp = companySettings && (
      companySettings.companyLogo ||
      (companySettings.companyName && companySettings.companyName !== 'شركة المقاولات' && companySettings.companyName !== 'شركة المقاولات والتشطيبات')
    );
    if (hasCustomProp) {
      return { ...DEFAULT_COMPANY_SETTINGS, ...loaded, ...companySettings, companyLogo: companySettings.companyLogo || loaded.companyLogo || null };
    }
    return loaded;
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [localSubTab, setLocalSubTab] = useState('branding');
  const activeTab = onSubTabChange ? (activeSubTab || 'branding') : localSubTab;
  const setActiveTab = onSubTabChange || setLocalSubTab;

  const [teamInputs, setTeamInputs] = useState({
    engineers: '', accountants: '', techOffice: '', customerService: ''
  });
  const [teamEmailInputs, setTeamEmailInputs] = useState({
    engineers: '', accountants: '', techOffice: '', customerService: ''
  });
  const [teamAdding, setTeamAdding] = useState({});
  const [teamResetLinks, setTeamResetLinks] = useState({});
  const [teamErrors, setTeamErrors] = useState({});
  const [teamSuccess, setTeamSuccess] = useState({});

  const regInfo = formatRegistrationDateTime(settings.registeredAt || settings.createdAt || effectiveCompanyId);

  const lastCompanyIdRef = useRef(effectiveCompanyId);
  const isDirtyRef = useRef(false);

  // مزامنة حالة الإعدادات عند تغيير الشركة النشطة أو استلام إعدادات محدثة مع عزل تام يمنع وراثة بيانات شركة سابقة
  useEffect(() => {
    // إذا تغيرت الشركة النشطة، نعيد التعيين دائماً من الكاش الخاص بها
    if (lastCompanyIdRef.current !== effectiveCompanyId) {
      lastCompanyIdRef.current = effectiveCompanyId;
      isDirtyRef.current = false;
      const loaded = loadCompanySettings(effectiveCompanyId);
      const hasCustomProp = companySettings && (
        companySettings.companyLogo ||
        (companySettings.companyName && companySettings.companyName !== 'شركة المقاولات' && companySettings.companyName !== 'شركة المقاولات والتشطيبات')
      );
      const fresh = hasCustomProp
        ? { ...loaded, ...companySettings, companyLogo: companySettings.companyLogo || loaded.companyLogo || null }
        : loaded;

      setSettings({
        ...DEFAULT_COMPANY_SETTINGS,
        ...fresh,
        companyLogo: fresh?.companyLogo || loaded?.companyLogo || null,
      });
      return;
    }

    // إذا لم يقم المستخدم بتعديل الحقول محلياً (غير محفوظة)، نحدث الحالة فوراً من أي تغيير سحابي قادم
    if (!isDirtyRef.current && companySettings && Object.keys(companySettings).length > 0) {
      setSettings(prev => ({
        ...prev,
        ...companySettings,
        companyLogo: companySettings.companyLogo !== undefined ? companySettings.companyLogo : (prev.companyLogo || null),
      }));
    }
  }, [companySettings, effectiveCompanyId]);

  // Apply branding on load & settings change
  useEffect(() => {
    applyCompanyBranding(settings);
  }, [settings]);

  const handleSave = useCallback(async () => {
    // فوراً عند الضغط — الزرار لازم يتغير على طول عشان المستخدم يعرف إن الضغطة اتسجلت
    setSaving(true);
    setSaveError(false);

    isDirtyRef.current = false;
    saveCompanySettings(settings, effectiveCompanyId);
    onCompanySettingsChange?.(settings);

    // حفظ سحابي مع تسجيل تشخيصي واضح
    let cloudSyncSuccess = false;
    try {
      console.log('[CompanySettings] syncSettingsToCloud → companyId:', effectiveCompanyId, '| logo:', settings.companyLogo ? `${String(settings.companyLogo).length} chars` : 'null');
      const result = await syncSettingsToCloud(effectiveCompanyId, settings);
      cloudSyncSuccess = !!result;
      console.log('[CompanySettings] syncSettingsToCloud result:', cloudSyncSuccess);
    } catch (e) {
      console.error("[CompanySettings] syncSettingsToCloud FAILED:", e?.message || e);
    }

    // تحديث فوري لـ tenant_directory في السحابة لضمان ثبات اسم الشركة الجديد عند أي إعادة تحميل
    try {
      const sub = companySubdomain || settings.subdomain || (typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : null);
      if (sub && sub !== 'tashteebpro' && sub !== 'www' && sub !== 'localhost') {
        const { db } = await import('../firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const patch = {
          companyId: effectiveCompanyId,
          name: settings.companyName,
          logo: settings.companyLogo || null,
          subdomain: sub.toLowerCase().trim(),
          updatedAt: new Date().toISOString(),
        };
        if (settings.phone || settings.companyPhone) {
          patch.phone = settings.phone || settings.companyPhone;
          patch.mobile = settings.phone || settings.companyPhone;
        }
        await setDoc(doc(db, 'tenant_directory', sub.toLowerCase().trim()), patch, { merge: true });
        console.log('[CompanySettings] tenant_directory updated:', sub);
      }
    } catch (e) {
      console.warn("Error updating tenant_directory in handleSave:", e);
    }

    setSaving(false);

    if (cloudSyncSuccess) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      // الحفظ السحابي فشل فعلياً — نوضح ده للمستخدم بدل ما نعرض "تم الحفظ" كذباً
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    }
  }, [settings, effectiveCompanyId, companySubdomain, onCompanySettingsChange]);


  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // حفظ تلقائي فوري إذا غادر المستخدم الصفحة وكانت هناك تعديلات غير محفوظة
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && settingsRef.current && effectiveCompanyId) {
        saveCompanySettings(settingsRef.current, effectiveCompanyId);
        onCompanySettingsChange?.(settingsRef.current);
        syncSettingsToCloud(effectiveCompanyId, settingsRef.current).catch(() => {});
      }
    };
  }, [effectiveCompanyId, onCompanySettingsChange]);

  function updateSetting(key, val) {
    isDirtyRef.current = true;
    const next = { ...settingsRef.current, [key]: val };
    settingsRef.current = next;
    setSettings(next);
  }

  // ── Team Management ──
  async function handleAddMember(groupKey) {
    const name = (teamInputs[groupKey] || '').trim();
    const rawEmail = (teamEmailInputs[groupKey] || '').trim().toLowerCase();

    if (!name) {
      setTeamErrors(e => ({ ...e, [groupKey]: 'الرجاء إدخال اسم العضو' }));
      return;
    }

    if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.')) {
      setTeamErrors(e => ({ ...e, [groupKey]: 'الرجاء إدخال بريد إلكتروني حقيقي صالح لتسجيل الحساب (مثال: name@gmail.com)' }));
      return;
    }

    const current = team?.[groupKey] || [];
    if (current.includes(name)) {
      setTeamErrors(e => ({ ...e, [groupKey]: 'هذا الاسم موجود مسبقاً في هذا القسم' }));
      return;
    }

    const roleMap = {
      engineers: 'engineer',
      accountants: 'accountant',
      techOffice: 'tech_office',
      customerService: 'customer_service'
    };
    const userRole = roleMap[groupKey] || 'engineer';

    setTeamAdding(prev => ({ ...prev, [groupKey]: true }));
    setTeamErrors(e => ({ ...e, [groupKey]: '' }));

    try {
      // إنشاء حساب موظف حقيقي عبر Admin SDK دون المساس بجلسة المالك الحالية
      const res = await callCreateCompanyUser({
        email: rawEmail,
        name: name,
        role: userRole,
        companyId: activeCompanyId,
      });

      if (!res.success) {
        setTeamErrors(e => ({ ...e, [groupKey]: res.error || 'فشل إنشاء حساب الموظف.' }));
        setTeamAdding(prev => ({ ...prev, [groupKey]: false }));
        return;
      }

      // إضافة العضو للقسم
      const nextTeam = { ...team, [groupKey]: [name, ...current] };
      onTeamChange?.(nextTeam);

      // حفظ ومزامنة بيانات الموظف المعتمد
      const existingUsers = loadUsers(activeCompanyId);
      const newUser = {
        id: res.uid || ('u_' + Date.now()),
        uid: res.uid,
        name: name,
        email: rawEmail,
        role: userRole,
        engineerName: userRole === 'engineer' ? name : null,
        companyId: activeCompanyId,
        createdAt: new Date().toISOString(),
      };
      const nextUsers = [newUser, ...existingUsers.filter(u => u.email?.toLowerCase().trim() !== rawEmail)];
      saveUsers(nextUsers, activeCompanyId);

      try {
        syncCompanyUsersToCloud(activeCompanyId, nextUsers).catch(() => {});
        syncTenantUsersToCloud(activeCompanyId, nextUsers).catch(() => {});
      } catch (e) {}

      // تفريغ المدخلات وحفظ رابط تعيين كلمة المرور للمالك
      setTeamInputs(prev => ({ ...prev, [groupKey]: '' }));
      setTeamEmailInputs(prev => ({ ...prev, [groupKey]: '' }));
      if (res.resetLink) {
        setTeamResetLinks(prev => ({ ...prev, [groupKey]: { email: rawEmail, link: res.resetLink } }));
      }
      setTeamSuccess(s => ({
        ...s,
        [groupKey]: `✓ تم إنشاء حساب ${name} بنجاح! تم إرسال رابط تعيين كلمة المرور.`
      }));
      setTimeout(() => setTeamSuccess(s => ({ ...s, [groupKey]: '' })), 5000);
    } catch (err) {
      console.error('Add team member error:', err);
      setTeamErrors(e => ({ ...e, [groupKey]: err?.message || 'حدث خطأ غير متوقع أثناء إنشاء حساب العضو.' }));
    } finally {
      setTeamAdding(prev => ({ ...prev, [groupKey]: false }));
    }
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
              ) : saveError ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626', fontWeight: 600, fontSize: 13 }}>
                  ⚠️ فشل الحفظ — حاول تاني
                </div>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 6, padding: '7px 14px', fontSize: 12.5, opacity: saving ? 0.7 : 1 }}>
                  <Save size={14} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
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
          {/* بطاقة رابط مساحة العمل الحصري للشركة */}
          {companySubdomain && (
            <div className="panel" style={{
              background: 'rgba(24,119,242,0.04)',
              border: '1.5px solid rgba(24,119,242,0.25)',
              padding: '16px 20px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: '#EFF6FF', color: '#1877F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Globe size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                    رابط مساحة عمل شركتك المخصص (Workspace Subdomain)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    هذا الرابط المباشر يتيح لك ولمهندسي موقعك وموظفيك تسجيل الدخول مباشرة لمساحة عملكم دون المرور بالموقع العام.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <code style={{
                  direction: 'ltr',
                  padding: '6px 12px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1877F2',
                }}>
                  {getSubdomainUrl(companySubdomain)}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getSubdomainUrl(companySubdomain));
                    alert('تم نسخ رابط مساحة عمل شركتك بنجاح! 📋');
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '7px 14px' }}
                >
                  نسخ الرابط 📋
                </button>
                <a
                  href={getSubdomainUrl(companySubdomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '7px 14px', textDecoration: 'none' }}
                >
                  فتح الرابط 🔗
                </a>
              </div>
            </div>
          )}

          {/* Section 1: Logo & Company Name */}
          <div className="cs-logo-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 }}>

            {/* Logo Panel */}
            <div className="panel cs-logo-panel" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Image size={16} style={{ color: 'var(--brand-primary, #6366F1)' }} />
                شعار الشركة الرسمي
              </h3>
              <div className="cs-logo-panel-body" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <LogoUploader logo={settings.companyLogo} onChange={(val) => updateSetting('companyLogo', val)} activeCompanyId={activeCompanyId} />
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
                    onBlur={() => {
                      if (settingsRef.current) {
                        saveCompanySettings(settingsRef.current, effectiveCompanyId);
                        onCompanySettingsChange?.(settingsRef.current);
                        syncSettingsToCloud(effectiveCompanyId, settingsRef.current).catch(() => {});
                      }
                    }}
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
                    onBlur={() => {
                      if (settingsRef.current) {
                        saveCompanySettings(settingsRef.current, effectiveCompanyId);
                        onCompanySettingsChange?.(settingsRef.current);
                        syncSettingsToCloud(effectiveCompanyId, settingsRef.current).catch(() => {});
                      }
                    }}
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

                {/* Registration Timestamp Card */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(24,119,242,0.06), rgba(99,102,241,0.04))',
                  border: '1px solid rgba(24,119,242,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: '#EFF6FF', color: '#1877F2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Clock size={19} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                        وقت وتاريخ تسجيل وتوثيق الشركة بالمنصة
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>📅 {regInfo.arabicDate}</span>
                        <span style={{ color: '#94A3B8' }}>•</span>
                        <span style={{ color: '#1877F2', direction: 'ltr' }}>⏰ {regInfo.time}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: '#F0FDF4',
                    color: '#16A34A',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <CheckCircle2 size={13} /> حساب موثق بالمنصة
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="cs-live-preview-card" style={{
                  marginTop: 2,
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  display: 'flex', alignItems: 'center', gap: 14,
                  flexWrap: 'wrap',
                }}>
                  {settings.companyLogo ? (
                    <div style={{
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      background: '#FFFFFF',
                      padding: 3,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                    }}>
                      <img
                        src={settings.companyLogo}
                        alt="preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 10,
                          objectFit: 'contain',
                          imageRendering: '-webkit-optimize-contrast'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      background: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(24,119,242,0.3)'
                    }}>
                      <img src="/app-icon.png" alt="Tashteeb Pro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  style={{ width: '100%', direction: 'ltr', textAlign: 'left' }}
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
                  style={{ width: '100%', direction: 'ltr', textAlign: 'left' }}
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
                  style={{ width: '100%', direction: 'ltr', textAlign: 'left' }}
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
                  style={{ width: '100%', direction: 'ltr', textAlign: 'left' }}
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

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                  <Clock size={12} style={{ display: 'inline', marginLeft: 4 }} /> تاريخ ووقت التسجيل بالمنصة (موثق)
                </label>
                <div style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}>
                  <span>📅 {regInfo.arabicDate}</span>
                  <span style={{ color: '#1877F2', direction: 'ltr', fontSize: 12 }}>⏰ {regInfo.time}</span>
                </div>
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
                    value={settings.subdomain || ''}
                    onChange={(e) => updateSetting('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="company-name"
                  />
                  <span className="cs-domain-suffix" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, direction: 'ltr', flexShrink: 0 }}>.{import.meta.env.VITE_ROOT_DOMAIN || 'tashteebpro.com'}</span>
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
                  مثال: <code>portal.yourcompany.com</code> أو <code>app.yourfirm.sa</code>
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
                      <td style={{ direction: 'ltr', textAlign: 'left', fontWeight: 700, color: '#0F766E' }}>cname.{import.meta.env.VITE_ROOT_DOMAIN || 'tashteebpro.com'}</td>
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
              onClick={() => { setSettings(loadCompanySettings(effectiveCompanyId)); }}
            >
              <RefreshCw size={13} /> إعادة تعيين
            </button>
            <button type="button" className="btn btn-primary cs-btn-save" onClick={handleSave} disabled={saving} style={{ gap: 8, padding: '10px 24px', fontSize: 14, opacity: saving ? 0.7 : 1 }}>
              {saving ? (
                <>جاري الحفظ...</>
              ) : saved ? (
                <><CheckCircle2 size={16} /> تم الحفظ بنجاح!</>
              ) : saveError ? (
                <>⚠️ فشل الحفظ — حاول تاني</>
              ) : (
                <><Save size={16} /> حفظ جميع بيانات الشركة</>
              )}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={17} style={{ color: 'var(--brand-primary, #6366F1)' }} />
                إدارة أقسام وأعضاء فريق العمل
              </h3>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#10B981', fontSize: 11.5, background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                <CheckCircle2 size={13} /> الحفظ فوري وتلقائي في السحابة
              </span>
            </div>
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

                    {/* Add Inputs (Name + Real Email) & Button */}
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="filter-input"
                          style={{ flex: '1 1 110px', minWidth: 100, fontSize: 12 }}
                          placeholder="الاسم (مثال: م. أحمد)"
                          value={teamInputs[g.key] || ''}
                          onChange={(e) => {
                            setTeamInputs(prev => ({ ...prev, [g.key]: e.target.value }));
                            setTeamErrors(prev => ({ ...prev, [g.key]: '' }));
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMember(g.key)}
                          disabled={teamAdding[g.key]}
                        />
                        <input
                          type="email"
                          className="filter-input"
                          style={{ flex: '1.3 1 140px', minWidth: 130, fontSize: 12, direction: 'ltr', textAlign: 'left' }}
                          placeholder="البريد الحقيقي (user@domain.com)"
                          value={teamEmailInputs[g.key] || ''}
                          onChange={(e) => {
                            setTeamEmailInputs(prev => ({ ...prev, [g.key]: e.target.value }));
                            setTeamErrors(prev => ({ ...prev, [g.key]: '' }));
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMember(g.key)}
                          disabled={teamAdding[g.key]}
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap', minHeight: 32 }}
                          onClick={() => handleAddMember(g.key)}
                          disabled={teamAdding[g.key]}
                        >
                          {teamAdding[g.key] ? 'جاري الإنشاء...' : '+ إضافة'}
                        </button>
                      </div>
                      {teamResetLinks[g.key] && (
                        <div style={{ padding: '8px 10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: 11 }}>
                          <div style={{ fontWeight: 700, color: '#2563EB', marginBottom: 4 }}>
                            🔗 رابط تعيين كلمة المرور ({teamResetLinks[g.key].email}):
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="text"
                              readOnly
                              value={teamResetLinks[g.key].link}
                              style={{ flex: 1, fontSize: 10.5, direction: 'ltr', background: '#fff', border: '1px solid #CBD5E1', padding: '3px 6px', borderRadius: 4 }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(teamResetLinks[g.key].link);
                                setTeamSuccess(s => ({ ...s, [g.key]: '✓ تم نسخ رابط تعيين كلمة المرور بنجاح!' }));
                                setTimeout(() => setTeamSuccess(s => ({ ...s, [g.key]: '' })), 3000);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <Copy size={11} /> نسخ
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {teamErrors[g.key] && (
                      <div style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.07)', color: 'var(--danger)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertTriangle size={12} /> {teamErrors[g.key]}
                      </div>
                    )}
                    {teamSuccess[g.key] && (
                      <div style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle2 size={12} /> {teamSuccess[g.key]}
                      </div>
                    )}

                    {/* Members List */}
                    <div style={{ padding: '6px 0', maxHeight: 320, overflowY: 'auto' }}>
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

          {/* User Management with Automatic Team Sync */}
          <UserManagement
            currentUser={currentUser}
            companyId={activeCompanyId}
            team={team}
            onTeamChange={onTeamChange}
          />
        </div>
      )}

    </div>
  );
}
