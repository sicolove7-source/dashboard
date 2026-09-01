import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Building2, Upload, Palette, Save, CheckCircle2, Image, Trash2,
  RefreshCw, AlertTriangle, Headphones, Hammer, Wallet, ClipboardList, X,
  Globe, Link, ShieldCheck, Copy, Check, ExternalLink, Server, CheckCircle
} from 'lucide-react';

import { setGlobalCurrency } from '../utils/helpers';

/* ────────────────────────────────────────────────────────────
   مفتاح localStorage لإعدادات الشركة
──────────────────────────────────────────────────────────── */
export const COMPANY_SETTINGS_KEY = 'company-settings-v1';

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: 'دار الظبي للديكور والتصميم الداخلي',
  companySubtitle: 'نظام إدارة المشاريع الاحترافي',
  companyLogo: null, // base64 string or null
  primaryColor: '#6366F1',
  accentColor: '#3B82F6',
  currency: 'د.إ',
  city: 'أبوظبي',
  country: 'الإمارات',
  subdomain: 'daraldhabi',
  customDomain: 'portal.daraldhabi.com',
  customDomainVerified: true,
};

export function loadCompanySettings() {
  try {
    const raw = localStorage.getItem(COMPANY_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.currency) setGlobalCurrency(parsed.currency);
      return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
    }
  } catch (e) {}
  return { ...DEFAULT_COMPANY_SETTINGS };
}

export function saveCompanySettings(settings) {
  localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(settings));
  if (settings.currency) {
    setGlobalCurrency(settings.currency);
  }
  // Apply CSS variables immediately
  applyCompanyBranding(settings);
}

export function applyCompanyBranding(settings) {
  if (!settings) return;
  const root = document.documentElement;
  if (settings.primaryColor) {
    root.style.setProperty('--brand-primary', settings.primaryColor);
    root.style.setProperty('--indigo', settings.primaryColor);
  }
  if (settings.accentColor) {
    root.style.setProperty('--brand-accent', settings.accentColor);
  }
}

/* ────────────────────────────────────────────────────────────
   PRESET PALETTES
──────────────────────────────────────────────────────────── */
const PALETTES = [
  { name: 'إنديجو', primary: '#6366F1', accent: '#3B82F6' },
  { name: 'زمردي', primary: '#10B981', accent: '#06B6D4' },
  { name: 'ذهبي', primary: '#F59E0B', accent: '#EF4444' },
  { name: 'وردي', primary: '#EC4899', accent: '#8B5CF6' },
  { name: 'سيان', primary: '#06B6D4', accent: '#6366F1' },
  { name: 'بني', primary: '#78716C', accent: '#A78BFA' },
];

/* ────────────────────────────────────────────────────────────
   TEAM GROUPS CONFIG
──────────────────────────────────────────────────────────── */
const TEAM_GROUPS = [
  { key: 'engineers',       label: 'مهندسو المواقع', icon: Hammer,      color: '#3B82F6' },
  { key: 'accountants',     label: 'المحاسبون',       icon: Wallet,      color: '#F59E0B' },
  { key: 'techOffice',      label: 'المكتب الفني',    icon: ClipboardList, color: '#10B981' },
  { key: 'customerService', label: 'خدمة العملاء',   icon: Headphones,  color: '#EC4899' },
];

/* ────────────────────────────────────────────────────────────
   Component: LogoUploader
──────────────────────────────────────────────────────────── */
function LogoUploader({ logo, onChange }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Preview + Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{
          width: 140, height: 140,
          borderRadius: 20,
          border: drag ? '2px dashed var(--brand-primary, #6366F1)' : '2px dashed var(--border)',
          background: drag ? 'rgba(99,102,241,0.07)' : 'rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
          boxShadow: drag ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
        }}
      >
        {logo ? (
          <img src={logo} alt="شعار الشركة" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 18 }} />
        ) : (
          <>
            <Image size={32} style={{ color: 'var(--muted)', marginBottom: 8 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '0 8px' }}>
              اضغط أو اسحب<br />الشعار هنا
            </span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px', flex: 1 }} onClick={() => inputRef.current?.click()}>
          <Upload size={13} /> رفع صورة
        </button>
        {logo && (
          <button className="btn" style={{ fontSize: 12, padding: '6px 10px', background: 'var(--danger-subtle)', color: 'var(--danger)', border: 'none' }} onClick={() => onChange(null)}>
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
export default function CompanySettings({ team, onTeamChange }) {
  const [settings, setSettings] = useState(() => loadCompanySettings());
  const [saved, setSaved] = useState(false);
  const [teamInputs, setTeamInputs] = useState({
    engineers: '', accountants: '', techOffice: '', customerService: ''
  });
  const [teamErrors, setTeamErrors] = useState({});

  // Apply branding on load
  useEffect(() => {
    applyCompanyBranding(settings);
  }, []);

  const handleSave = useCallback(() => {
    saveCompanySettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [settings]);

  function updateSetting(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  // ── Team Management ──
  function handleAddMember(groupKey) {
    const name = (teamInputs[groupKey] || '').trim();
    if (!name) { setTeamErrors(e => ({ ...e, [groupKey]: 'الرجاء إدخال اسم' })); return; }
    const current = team?.[groupKey] || [];
    if (current.includes(name)) { setTeamErrors(e => ({ ...e, [groupKey]: 'هذا الاسم موجود مسبقاً' })); return; }
    onTeamChange({ ...team, [groupKey]: [...current, name] });
    setTeamInputs(prev => ({ ...prev, [groupKey]: '' }));
    setTeamErrors(e => ({ ...e, [groupKey]: '' }));
  }

  function handleRemoveMember(groupKey, name) {
    onTeamChange({ ...team, [groupKey]: (team?.[groupKey] || []).filter(n => n !== name) });
  }

  return (
    <div className="grid tab-fade" style={{ gap: 28 }} dir="rtl">

      {/* ─── Header ─── */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(59,130,246,0.08))', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366F1, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
          }}>
            <Building2 size={26} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>إعدادات الشركة</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              خصّص هوية موقعك — الشعار، الاسم، الألوان، وأعضاء الفريق
            </p>
          </div>
          <div style={{ marginRight: 'auto', display: 'flex', gap: 10 }}>
            {saved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontWeight: 700, fontSize: 13 }}>
                <CheckCircle2 size={18} /> تم الحفظ!
              </div>
            ) : (
              <button className="btn btn-primary" onClick={handleSave} style={{ gap: 8, padding: '9px 20px', fontSize: 14 }}>
                <Save size={16} /> حفظ الإعدادات
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Row 1: Logo + Company Name ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Logo Panel */}
        <div className="panel">
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image size={16} style={{ color: 'var(--brand-primary, #6366F1)' }} />
            شعار الشركة
          </h3>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <LogoUploader logo={settings.companyLogo} onChange={(val) => updateSetting('companyLogo', val)} />
            <div style={{ flex: 1 }}>
              <div style={{
                padding: '12px 16px',
                background: 'rgba(99,102,241,0.06)',
                borderRadius: 10,
                border: '1px solid rgba(99,102,241,0.15)',
                fontSize: 12,
                color: 'var(--muted)',
                lineHeight: 1.8,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontSize: 13 }}>📌 تعليمات الشعار</div>
                <div>• يُفضّل PNG أو SVG بخلفية شفافة</div>
                <div>• الحد الأقصى للحجم: 2 ميجابايت</div>
                <div>• الأبعاد المثالية: 200×200 بكسل</div>
                <div>• سيظهر في صفحة الدخول والقائمة الجانبية</div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Info Panel */}
        <div className="panel">
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={16} style={{ color: 'var(--brand-primary, #6366F1)' }} />
            معلومات الشركة
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                اسم الشركة *
              </label>
              <input
                type="text"
                className="filter-input"
                style={{ width: '100%', fontWeight: 700, fontSize: 15 }}
                value={settings.companyName}
                onChange={(e) => updateSetting('companyName', e.target.value)}
                placeholder="مثال: شركة النيل للتشطيبات"
                maxLength={60}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
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
              </select>
            </div>

            {/* Live Preview */}
            <div style={{
              marginTop: 4,
              padding: '14px 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt="preview" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain', background: '#fff' }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 10, background: settings.primaryColor || '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={22} color="#fff" />
                </div>
              )}
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{settings.companyName || 'اسم الشركة'}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{settings.companySubtitle || 'الوصف'}</div>
              </div>
              <div style={{ marginRight: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>معاينة مباشرة</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Row 2: Color Palette ─── */}
      <div className="panel">
        <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={16} style={{ color: 'var(--brand-primary, #6366F1)' }} />
          هوية الألوان
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Preset Palettes */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>ألوان جاهزة — اختر لوناً:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {PALETTES.map((p) => {
                const isSelected = settings.primaryColor === p.primary;
                return (
                  <button
                    key={p.name}
                    onClick={() => { updateSetting('primaryColor', p.primary); updateSetting('accentColor', p.accent); }}
                    title={p.name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                      border: isSelected ? `2px solid ${p.primary}` : '2px solid var(--border)',
                      background: isSelected ? `${p.primary}15` : 'transparent',
                      fontFamily: 'Cairo', fontSize: 12, fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? p.primary : 'var(--text)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 3 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 4, background: p.primary }} />
                      <div style={{ width: 14, height: 14, borderRadius: 4, background: p.accent }} />
                    </div>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>اللون الرئيسي</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  style={{ width: 44, height: 44, border: 'none', borderRadius: 10, cursor: 'pointer', padding: 2, background: 'var(--surface)' }}
                />
                <input
                  type="text"
                  className="filter-input"
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  style={{ width: 100, fontFamily: 'monospace', fontSize: 13 }}
                  maxLength={7}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>اللون الثانوي</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => updateSetting('accentColor', e.target.value)}
                  style={{ width: 44, height: 44, border: 'none', borderRadius: 10, cursor: 'pointer', padding: 2, background: 'var(--surface)' }}
                />
                <input
                  type="text"
                  className="filter-input"
                  value={settings.accentColor}
                  onChange={(e) => updateSetting('accentColor', e.target.value)}
                  style={{ width: 100, fontFamily: 'monospace', fontSize: 13 }}
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live preview bar */}
        <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>معاينة:</div>
          <button style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'default',
            background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})`,
            color: '#fff', fontFamily: 'Cairo', fontWeight: 700, fontSize: 13,
            boxShadow: `0 4px 12px ${settings.primaryColor}40`,
          }}>
            زر رئيسي
          </button>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})`, boxShadow: `0 4px 12px ${settings.primaryColor}40` }} />
          <div style={{ padding: '4px 12px', borderRadius: 20, background: `${settings.primaryColor}15`, color: settings.primaryColor, fontSize: 12, fontWeight: 700, border: `1px solid ${settings.primaryColor}30` }}>
            شارة حالة
          </div>
        </div>
      </div>

      {/* ─── Row 3: Team Management ─── */}
      <div className="panel">
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} style={{ color: 'var(--brand-primary, #6366F1)' }} />
          إدارة أعضاء الفريق
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--muted)' }}>
          أضف أو احذف أعضاء الفريق — ستظهر في قوائم إسناد المشاريع تلقائياً
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {TEAM_GROUPS.map((g) => {
            const members = team?.[g.key] || [];
            const Icon = g.icon;
            return (
              <div key={g.key} style={{
                border: '1px solid var(--border)',
                borderRadius: 14,
                overflow: 'hidden',
              }}>
                {/* Group Header */}
                <div style={{
                  padding: '12px 16px',
                  background: `${g.color}12`,
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${g.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={g.color} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{g.label}</span>
                  <span style={{
                    marginRight: 'auto',
                    background: `${g.color}20`, color: g.color,
                    padding: '2px 10px', borderRadius: 20,
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {members.length} عضو
                  </span>
                </div>

                {/* Add Input */}
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
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
                    className="btn btn-primary"
                    style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap' }}
                    onClick={() => handleAddMember(g.key)}
                  >
                    + إضافة
                  </button>
                </div>
                {teamErrors[g.key] && (
                  <div style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.07)', color: 'var(--danger)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={12} /> {teamErrors[g.key]}
                  </div>
                )}

                {/* Members List */}
                <div style={{ padding: '8px 0', maxHeight: 200, overflowY: 'auto' }}>
                  {members.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                      لا يوجد أعضاء في هذا القسم
                    </div>
                  ) : (
                    members.map((name) => (
                      <div
                        key={name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 14px',
                          borderBottom: '1px solid rgba(0,0,0,0.04)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: `${g.color}20`, color: g.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 12,
                        }}>
                          {name.charAt(name.length > 2 ? 3 : 0)}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{name}</span>
                        <button
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

      {/* ─── Row 4: Custom Domain & DNS Settings ─── */}
      <div className="panel" style={{ borderTop: '4px solid #6366F1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)' }}>
              <Globe size={18} color="#6366F1" /> إعدادات الدومين والربط المخصص (Custom Domain & DNS)
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
              اربط مساحة عمل مكتبكم بدومين فرعي مجاني أو دومين موقعكم الخاص (White-Label)
            </p>
          </div>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700,
            padding: '4px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)'
          }}>
            <ShieldCheck size={14} /> شهادة SSL/HTTPS مشفرة ونشطة 🔒
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
          {/* Subdomain */}
          <div style={{ background: 'var(--bg)', padding: 18, borderRadius: 14, border: '1px solid var(--border)' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              1. الدومين الفرعي السريع (Subdomain)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                className="filter-input"
                style={{ flex: 1, fontWeight: 700, fontSize: 13, direction: 'ltr', textAlign: 'left' }}
                value={settings.subdomain || 'daraldhabi'}
                onChange={(e) => updateSetting('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="company-name"
              />
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, direction: 'ltr' }}>.platform.com</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              رابط وصول فوري بدون الحاجة لأي إعدادات DNS.
            </div>
          </div>

          {/* Custom Domain (White-Label) */}
          <div style={{ background: 'var(--bg)', padding: 18, borderRadius: 14, border: '1.5px solid rgba(99,102,241,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                2. الدومين الخاص الكامل (Custom Domain) 👑
              </label>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#6366F1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 12 }}>
                باقة VIP
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                className="filter-input"
                style={{ flex: 1, fontWeight: 700, fontSize: 13, direction: 'ltr', textAlign: 'left', border: '1.5px solid #6366F1' }}
                value={settings.customDomain || ''}
                onChange={(e) => updateSetting('customDomain', e.target.value.toLowerCase().trim())}
                placeholder="portal.yourcompany.com"
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              مثال: <code style={{ color: '#6366F1' }}>portal.daraldhabi.com</code> أو <code style={{ color: '#6366F1' }}>app.yourfirm.sa</code>
            </div>
          </div>
        </div>

        {/* DNS CNAME Configuration Guide */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.04), rgba(30,41,59,0.06))',
          padding: '16px 20px', borderRadius: 14, border: '1px solid var(--border)'
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Server size={16} color="#6366F1" /> كيفية ربط الدومين في لوحة تحكم نطاقك (GoDaddy / Cloudflare / Namecheap):
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
            توجه إلى إعدادات الـ <strong>DNS</strong> في موقع النطاق الخاص بك وأضف السجل التالي:
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th>نوع السجل (Type)</th>
                  <th>الاسم / المضيف (Host / Name)</th>
                  <th>القيمة المستهدفة (Value / Target)</th>
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
                      <CheckCircle size={14} /> متصل بنجاح ✓
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Footer Save Button ─── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          className="btn"
          style={{ gap: 8, color: 'var(--muted)', borderColor: 'var(--border)' }}
          onClick={() => { setSettings(loadCompanySettings()); }}
        >
          <RefreshCw size={14} /> إعادة تعيين
        </button>
        <button className="btn btn-primary" onClick={handleSave} style={{ gap: 8, padding: '10px 28px', fontSize: 15 }}>
          {saved ? <><CheckCircle2 size={16} /> تم الحفظ!</> : <><Save size={16} /> حفظ جميع الإعدادات</>}
        </button>
      </div>

    </div>
  );
}
