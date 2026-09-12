import React, { useState, useEffect } from 'react';
import {
  X, Printer, Copy, Check, MessageCircle, Building2, Calendar,
  CheckCircle2, Clock, ShieldCheck, User, MapPin, Sparkles, Award,
  Phone, UserCheck, HardHat, FileText, Edit3, RotateCcw, Eye, Settings2,
  Sliders, MessageSquare, CheckSquare, Layers
} from 'lucide-react';
import { PROJECT_PHASES, QUALITY_GATES } from '../utils/constants';
import { fmtDate, todayISO } from '../utils/helpers';
import { printElement } from '../utils/printHelper';
import { loadCompanySettings } from '../utils/branding';

/**
 * Format Egyptian or international phone for direct WhatsApp URL
 * Example: 01012345678 -> 201012345678
 */
function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '2' + clean;
  }
  return clean;
}

export default function ClientReportModal({ project, onClose, companySettings: propCompanySettings }) {
  const activeCompanySettings = propCompanySettings || loadCompanySettings();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' | 'print'

  const phasesData = project.phasesData || {};
  const qualityData = project.qualityData || {};

  // Compute phases stats
  const phases = PROJECT_PHASES.map(ph => {
    const pData = phasesData[ph.id] || {};
    const itemsData = pData.items || {};
    const doneCount = ph.items.filter(i => itemsData[i.id]?.done).length;
    const totalCount = ph.items.length;
    return {
      ...ph,
      doneCount,
      totalCount,
      pct: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0,
      status: pData.status || (doneCount === totalCount && totalCount > 0 ? 'done' : doneCount > 0 ? 'progress' : 'pending')
    };
  });

  const overallPhasePct = Math.round(phases.reduce((acc, p) => acc + p.pct, 0) / (phases.length || 1));

  // Completed Quality Gates
  const passedGates = QUALITY_GATES.filter(g => qualityData[g.id]?.status === 'passed');

  // Editable Parties & Report Data State
  const [reportData, setReportData] = useState({
    // الطرف الأول: المقاول / الشركة
    companyName: activeCompanySettings?.companyName || 'شركة المقاولات والديكور',
    companyTagline: activeCompanySettings?.tagline || 'إدارة التشطيبات الداخلية والتنفيذ الهندسي المتميز',
    companyPhone: activeCompanySettings?.phone || '',

    // الطرف الثاني: العميل / المالك
    clientName: project.client || '',
    clientPhone: project.clientPhone || project.phone || '',
    clientRole: 'المالك / صاحب المشروع',

    // الطرف المشرف: المهندس المسؤول
    engineerName: project.engineer || 'الإدارة الهندسية',
    engineerRole: 'مهندس التنفيذ المسؤول',

    // بيانات الموقع والإنجاز
    projectName: project.name || 'الموقع',
    projectArea: project.area || '',
    progressPct: project.progress !== undefined ? project.progress : overallPhasePct,
    dueDate: project.dueDate || '',

    // نصوص وملاحظات التقرير
    greeting: 'تحية طيبة وبعد، يسعدنا موافاتكم بأحدث تقرير إنجاز وموقف تنفيذي لأعمال موقعكم:',
    customNotes: '',
    closingMessage: 'مع أطيب تحياتنا وتقديرنا، ونتمنى لكم يوماً سعيداً 🏡✨',

    // خيارات تضمين الأقسام بالواتساب
    includePhases: true,
    includeQualityGates: true,
    includeDueDate: true,
    includeNotes: true,
    includeEngineer: true,
  });

  // Function to build WhatsApp text based on data
  function buildWhatsAppText(data) {
    let msg = `*🏗️ تقرير إنجاز موقع: ${data.projectName || 'الموقع'}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🏢 *الطرف الأول (المقاول):* ${data.companyName}\n`;
    if (data.companyPhone) msg += `📞 *هاتف الشركة:* ${data.companyPhone}\n`;
    msg += `👤 *الطرف الثاني (العميل):* ${data.clientName || 'المحترم'}\n`;
    if (data.clientPhone) msg += `📱 *هاتف العميل:* ${data.clientPhone}\n`;
    if (data.includeEngineer && data.engineerName) {
      msg += `👷 *${data.engineerRole || 'المهندس المشرف'}:* ${data.engineerName}\n`;
    }
    if (data.projectArea) {
      msg += `📍 *الموقع:* ${data.projectArea}\n`;
    }
    msg += `📅 *تاريخ التقرير:* ${fmtDate(todayISO())}\n`;
    msg += `📊 *نسبة الإنجاز الكلية:* ${data.progressPct}%\n\n`;

    if (data.greeting && data.greeting.trim()) {
      msg += `${data.greeting.trim()}\n\n`;
    }

    if (data.includePhases && phases.length > 0) {
      msg += `*📊 الموقف التنفيذي للمراحل:*\n`;
      phases.forEach(ph => {
        const icon = ph.pct === 100 ? '✅' : ph.pct > 0 ? '⏳' : '⚪';
        msg += `${icon} ${ph.name}: ${ph.pct}% (${ph.doneCount}/${ph.totalCount} بند)\n`;
      });
      msg += `\n`;
    }

    if (data.includeQualityGates && passedGates.length > 0) {
      msg += `*🛡️ اختبارات ومعايير الجودة المعتمدة:*\n`;
      passedGates.forEach(g => {
        msg += `✓ ${g.title}\n`;
      });
      msg += `\n`;
    }

    if (data.includeNotes && data.customNotes && data.customNotes.trim()) {
      msg += `*📋 ملاحظات وتوجيهات المهندس المشرف:*\n`;
      msg += `${data.customNotes.trim()}\n\n`;
    }

    if (data.includeDueDate && data.dueDate) {
      msg += `📅 *موعد التسليم التعاقدي المخطط:* ${fmtDate(data.dueDate)}\n\n`;
    }

    if (data.closingMessage && data.closingMessage.trim()) {
      msg += `_${data.companyName} - ${data.closingMessage.trim()}_`;
    } else {
      msg += `_${data.companyName} - نتمنى لكم يوماً سعيداً_ 🏡✨`;
    }

    return msg;
  }

  // Live editable WhatsApp text state
  const [whatsAppText, setWhatsAppText] = useState(() => buildWhatsAppText(reportData));
  const [isCustomEdited, setIsCustomEdited] = useState(false);

  // Field change handler
  function handleFieldChange(field, value) {
    setReportData(prev => {
      const updated = { ...prev, [field]: value };
      if (!isCustomEdited) {
        setWhatsAppText(buildWhatsAppText(updated));
      }
      return updated;
    });
  }

  // Reset textarea from current party fields
  function handleResetWhatsAppText() {
    setWhatsAppText(buildWhatsAppText(reportData));
    setIsCustomEdited(false);
  }

  // Copy WhatsApp message
  function copyWhatsAppText() {
    navigator.clipboard.writeText(whatsAppText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // Direct WhatsApp launch
  function openWhatsAppDirect() {
    const text = encodeURIComponent(whatsAppText);
    const cleanPhone = formatWhatsAppPhone(reportData.clientPhone);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  }

  // Print helper
  function handlePrint() {
    if (activeTab !== 'print') {
      setActiveTab('print');
      setTimeout(() => {
        printElement('client-report-printable', `تقرير_متابعة_${reportData.projectName || 'الموقع'}`);
      }, 150);
    } else {
      printElement('client-report-printable', `تقرير_متابعة_${reportData.projectName || 'الموقع'}`);
    }
  }

  const cleanClientPhone = formatWhatsAppPhone(reportData.clientPhone);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 960, width: '96%', maxHeight: '94vh', overflowY: 'auto',
          borderRadius: 20, border: '1px solid var(--border)', background: 'var(--card)', padding: 0,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
        }}
      >
        {/* Modal Top Action & Navigation Bar (No-Print) */}
        <div className="no-print" style={{
          padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          borderBottom: '1px solid var(--border)', background: '#0F172A', color: '#fff', position: 'sticky', top: 0, zIndex: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <MessageCircle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                تقرير العميل الذكي للمتابعة والواتساب
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', fontWeight: 700 }}>
                  تعديل جميع الأطراف ✏️
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>تخصيص كامل للأطراف، إرسال فوري لواتساب العميل، وطباعة PDF رسمية</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* View Switcher Tabs */}
            <div style={{
              display: 'flex', background: 'rgba(255,255,255,0.08)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                  background: activeTab === 'whatsapp' ? '#2563EB' : 'transparent', color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
                }}
              >
                <MessageSquare size={15} /> تخصيص الأطراف والواتساب
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('print')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                  background: activeTab === 'print' ? '#2563EB' : 'transparent', color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
                }}
              >
                <FileText size={15} /> معاينة وطباعة PDF
              </button>
            </div>

            <button
              type="button"
              onClick={copyWhatsAppText}
              title="نسخ نص التقرير للحافظة"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9,
                background: copied ? '#10B981' : 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
                fontWeight: 700, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'تم النسخ!' : 'نسخ النص'}
            </button>

            <button
              type="button"
              onClick={openWhatsAppDirect}
              title={cleanClientPhone ? `إرسال مباشر إلى ${reportData.clientPhone}` : 'إرسال عبر واتساب'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                background: '#25D366', color: '#fff', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(37, 211, 102, 0.35)', transition: 'all 0.15s'
              }}
            >
              <MessageCircle size={16} />
              <span>إرسال واتساب</span>
              {cleanClientPhone && <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 6 }}>مباشر</span>}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9,
                background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
                fontWeight: 700, fontSize: 12.5, cursor: 'pointer'
              }}
            >
              <Printer size={15} /> طباعة PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TAB 1: WHATSAPP CUSTOMIZER & EDIT PARTIES */}
        {activeTab === 'whatsapp' && (
          <div style={{ padding: '22px 24px', background: 'var(--bg-color)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: 20,
              alignItems: 'start'
            }}>
              
              {/* RIGHT COLUMN: ALL PARTIES EDIT FORM */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* PARTY 1: COMPANY / CONTRACTOR */}
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <Building2 size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>الطرف الأول (الشركة / المقاول المنفذ)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        اسم الشركة / المقاول
                      </label>
                      <input
                        type="text"
                        value={reportData.companyName}
                        onChange={e => handleFieldChange('companyName', e.target.value)}
                        placeholder="مثال: شركة النخبة للمقاولات والديكور"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 13, fontWeight: 700
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        صفة الإدارة / الشعار
                      </label>
                      <input
                        type="text"
                        value={reportData.companyTagline}
                        onChange={e => handleFieldChange('companyTagline', e.target.value)}
                        placeholder="مثال: إدارة التشطيبات الداخلية"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        هاتف الشركة للتواصل
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={reportData.companyPhone}
                        onChange={e => handleFieldChange('companyPhone', e.target.value)}
                        placeholder="010XXXXXXXX"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5, textAlign: 'left'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* PARTY 2: CLIENT / OWNER */}
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={18} color="#10B981" />
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>الطرف الثاني (العميل / المالك)</span>
                    </div>
                    {cleanClientPhone ? (
                      <span style={{ fontSize: 11, color: '#059669', background: '#D1FAE5', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                        ✓ توجيه واتساب مباشر متاح
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                        أدخل الرقم للإرسال المباشر
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        اسم العميل / المالك
                      </label>
                      <input
                        type="text"
                        value={reportData.clientName}
                        onChange={e => handleFieldChange('clientName', e.target.value)}
                        placeholder="اسم العميل"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 13, fontWeight: 700
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        رقم واتساب العميل 📱
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={reportData.clientPhone}
                        onChange={e => handleFieldChange('clientPhone', e.target.value)}
                        placeholder="مثال: 01012345678"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5, textAlign: 'left', fontWeight: 600
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* PARTY 3: ENGINEER & PROJECT DATA */}
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <HardHat size={18} color="#F59E0B" />
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>الإشراف الهندسي والموقع</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        المهندس المشرف
                      </label>
                      <input
                        type="text"
                        value={reportData.engineerName}
                        onChange={e => handleFieldChange('engineerName', e.target.value)}
                        placeholder="م. المشرف"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5, fontWeight: 600
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        الصفة / المنصب
                      </label>
                      <input
                        type="text"
                        value={reportData.engineerRole}
                        onChange={e => handleFieldChange('engineerRole', e.target.value)}
                        placeholder="مهندس التنفيذ المسؤول"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        اسم الموقع / المشروع
                      </label>
                      <input
                        type="text"
                        value={reportData.projectName}
                        onChange={e => handleFieldChange('projectName', e.target.value)}
                        placeholder="اسم المشروع"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        المنطقة / العنوان
                      </label>
                      <input
                        type="text"
                        value={reportData.projectArea}
                        onChange={e => handleFieldChange('projectArea', e.target.value)}
                        placeholder="مثال: التجمع الخامس"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5
                        }}
                      />
                    </div>

                    {/* Progress Percentage Control */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                          نسبة الإنجاز المعروضة
                        </label>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>{reportData.progressPct}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={reportData.progressPct}
                          onChange={e => handleFieldChange('progressPct', Number(e.target.value))}
                          style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={reportData.progressPct}
                          onChange={e => handleFieldChange('progressPct', Number(e.target.value))}
                          style={{
                            width: 54, padding: '4px 6px', textAlign: 'center', borderRadius: 6,
                            border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 12, fontWeight: 700
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        موعد التسليم المخطط
                      </label>
                      <input
                        type="date"
                        value={reportData.dueDate}
                        onChange={e => handleFieldChange('dueDate', e.target.value)}
                        style={{
                          width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* CUSTOM MESSAGES & NOTES */}
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <Edit3 size={18} color="#8B5CF6" />
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>صياغة الرسالة والملاحظات الخاصة</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        تحية البداية للعميل
                      </label>
                      <input
                        type="text"
                        value={reportData.greeting}
                        onChange={e => handleFieldChange('greeting', e.target.value)}
                        placeholder="تحية طيبة وبعد..."
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        ملاحظات وتوجيهات المهندس المشرف (تظهر في الرسالة والـ PDF)
                      </label>
                      <textarea
                        rows={3}
                        value={reportData.customNotes}
                        onChange={e => handleFieldChange('customNotes', e.target.value)}
                        placeholder="مثال: تم الانتهاء بنجاح من اختبار كبس السباكة واختبار عزل الحمامات، وجاري استلام تشوينات السيراميك لبدء التركيب غداً بإذن الله."
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5, lineHeight: 1.6, resize: 'vertical'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                        خاتمة التقرير وتمنيات الإدارة
                      </label>
                      <input
                        type="text"
                        value={reportData.closingMessage}
                        onChange={e => handleFieldChange('closingMessage', e.target.value)}
                        placeholder="مع أطيب تحياتنا وتقديرنا..."
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* INCLUSION OPTIONS */}
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px'
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sliders size={16} color="var(--primary)" /> خيارات تضمين الأقسام في رسالة الواتساب:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--ink)' }}>
                      <input
                        type="checkbox"
                        checked={reportData.includePhases}
                        onChange={e => handleFieldChange('includePhases', e.target.checked)}
                      />
                      <span>مراحل العمل الأربعة</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--ink)' }}>
                      <input
                        type="checkbox"
                        checked={reportData.includeQualityGates}
                        onChange={e => handleFieldChange('includeQualityGates', e.target.checked)}
                      />
                      <span>اختبارات الجودة</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--ink)' }}>
                      <input
                        type="checkbox"
                        checked={reportData.includeNotes}
                        onChange={e => handleFieldChange('includeNotes', e.target.checked)}
                      />
                      <span>ملاحظات المهندس</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--ink)' }}>
                      <input
                        type="checkbox"
                        checked={reportData.includeDueDate}
                        onChange={e => handleFieldChange('includeDueDate', e.target.checked)}
                      />
                      <span>موعد التسليم</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--ink)' }}>
                      <input
                        type="checkbox"
                        checked={reportData.includeEngineer}
                        onChange={e => handleFieldChange('includeEngineer', e.target.checked)}
                      />
                      <span>المهندس المشرف</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* LEFT COLUMN: LIVE WHATSAPP MESSAGE EDITOR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 78 }}>
                
                {/* WhatsApp Phone Mockup Card */}
                <div style={{
                  background: '#0B141A', border: '1px solid #1F2C34', borderRadius: 16, overflow: 'hidden',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column'
                }}>
                  {/* WhatsApp Chat Header */}
                  <div style={{
                    background: '#1F2C34', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: '#10B981', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15
                      }}>
                        {reportData.clientName ? reportData.clientName.charAt(0) : 'ع'}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#E9EDEF' }}>
                          {reportData.clientName || 'العميل المحترم'}
                        </div>
                        <div style={{ fontSize: 11, color: '#8696A0', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', display: 'inline-block' }}></span>
                          {cleanClientPhone ? reportData.clientPhone : 'جاهز للإرسال'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isCustomEdited ? (
                        <span style={{
                          fontSize: 11, background: 'rgba(234, 179, 8, 0.2)', color: '#FACC15',
                          padding: '3px 8px', borderRadius: 6, fontWeight: 700
                        }}>
                          ✏️ تم التعديل يدوياً
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 11, background: 'rgba(37, 211, 102, 0.2)', color: '#4ADE80',
                          padding: '3px 8px', borderRadius: 6, fontWeight: 700
                        }}>
                          ⚡ متزامن مع الأطراف
                        </span>
                      )}

                      {isCustomEdited && (
                        <button
                          type="button"
                          onClick={handleResetWhatsAppText}
                          title="استعادة النص المولد تلقائياً من بيانات الأطراف"
                          style={{
                            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#E9EDEF',
                            padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <RotateCcw size={12} /> إعادة التوليد
                        </button>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp Chat Body / Textarea Editor */}
                  <div style={{
                    padding: '16px',
                    backgroundImage: 'radial-gradient(#1f2c34 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                    backgroundColor: '#0B141A'
                  }}>
                    <div style={{
                      background: '#005C4B', color: '#E9EDEF', borderRadius: '12px 0 12px 12px',
                      padding: '12px 14px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', position: 'relative'
                    }}>
                      <div style={{
                        fontSize: 11, color: '#8696A0', marginBottom: 6, display: 'flex', justifyContent: 'space-between',
                        borderBottom: '1px dashed rgba(255,255,255,0.15)', paddingBottom: 4
                      }}>
                        <span>يمكنك الكتابة والتعديل على نص الرسالة مباشرة هنا ✍️</span>
                        <span>{whatsAppText.length} حرف</span>
                      </div>

                      <textarea
                        rows={16}
                        value={whatsAppText}
                        onChange={e => {
                          setWhatsAppText(e.target.value);
                          setIsCustomEdited(true);
                        }}
                        style={{
                          width: '100%', background: 'transparent', border: 'none', color: '#E9EDEF',
                          fontSize: 13, lineHeight: 1.7, resize: 'vertical', outline: 'none',
                          fontFamily: 'inherit', direction: 'rtl', whiteSpace: 'pre-wrap'
                        }}
                      />

                      <div style={{ textAlign: 'left', fontSize: 10, color: '#8696A0', marginTop: 4 }}>
                        {fmtDate(todayISO())} ✓✓
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Bottom Send Action */}
                  <div style={{
                    padding: '14px 16px', background: '#1F2C34', borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <button
                      type="button"
                      onClick={openWhatsAppDirect}
                      style={{
                        flex: 1, padding: '11px 16px', borderRadius: 10, background: '#25D366', color: '#fff',
                        border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)', transition: 'all 0.15s'
                      }}
                    >
                      <MessageCircle size={18} />
                      <span>{cleanClientPhone ? `إرسال إلى واتساب ${reportData.clientName || 'العميل'}` : 'فتح واتساب لإرسال التقرير'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={copyWhatsAppText}
                      style={{
                        padding: '11px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.15)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>

                {/* Helpful Tip Card */}
                <div style={{
                  background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: 12,
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <Sparkles size={18} color="#2563EB" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--ink)' }}>نصيحة ذكية:</strong> أي تعديل على أطراف التعاقد أو الملاحظات ينعكس فوراً في نص الواتساب وأيضاً في تقرير الـ PDF المطبوع.
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 2: PRINTABLE & OFFICIAL PDF REPORT */}
        <div style={{ display: activeTab === 'print' ? 'block' : 'none' }}>
          
          {/* Printable Bar Controls in Tab 2 */}
          <div className="no-print" style={{
            padding: '12px 24px', background: 'var(--bg)', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
          }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={16} color="var(--primary)" />
              <span>معاينة المستند الرسمي للطباعة أو تصدير PDF (محدّث بجميع الأطراف والبيانات)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                style={{
                  padding: '7px 14px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)',
                  color: 'var(--ink)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer'
                }}
              >
                ← العودة لمحرر الواتساب
              </button>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: '7px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff',
                  border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                }}
              >
                <Printer size={16} /> طباعة التقرير الرسمي / حفظ PDF
              </button>
            </div>
          </div>

          {/* PRINT CONTAINER / CLIENT REPORT BODY */}
          <div id="client-report-printable" className="print-container" style={{ padding: '36px 42px', color: '#0F172A', background: '#FFFFFF' }}>

            {/* Letterhead Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #CBD5E1', paddingBottom: 20, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', letterSpacing: -0.5 }}>
                  {reportData.companyName}
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                  {reportData.companyTagline}
                </div>
                {reportData.companyPhone && (
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>هاتف التواصل:</span>
                    <span dir="ltr">{reportData.companyPhone}</span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#0D9488', fontWeight: 800, marginTop: 4 }}>
                  تقرير إنجاز ومتابعة الموقع الدوري
                </div>
              </div>
              <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <div style={{ fontSize: 12, color: '#64748B' }}>تاريخ التقرير</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{fmtDate(todayISO())}</div>
              </div>
            </div>

            {/* Project Details Banner */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 20px', marginBottom: 24
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 2 }}>اسم الموقع والمشروع</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{reportData.projectName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 2 }}>المالك / العميل</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                    {reportData.clientName || 'المحترم'}
                    {reportData.clientPhone ? <span style={{ fontSize: 12, color: '#64748B', display: 'block', marginTop: 2 }} dir="ltr">{reportData.clientPhone}</span> : null}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 2 }}>الموقع والمنطقة</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{reportData.projectArea || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 2 }}>{reportData.engineerRole}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0D9488' }}>{reportData.engineerName}</div>
                </div>
              </div>
            </div>

            {/* Overall Progress Gauge */}
            <div style={{
              background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 16,
              padding: '18px 24px', marginBottom: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>نسبة الإنجاز التنفيذي الفعلي للمشروع</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>محسوبة من بنود واختبارات مراحل العمل الإنشائي والتشطيب</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 140, height: 10, background: '#CBD5E1', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${reportData.progressPct}%`, height: '100%', background: '#2563EB', borderRadius: 99 }} />
                </div>
                <span className="font-mono" style={{ fontSize: 24, fontWeight: 900, color: '#0F172A' }}>
                  {reportData.progressPct}%
                </span>
              </div>
            </div>

            {/* Custom Notes Section (If filled) */}
            {reportData.customNotes && reportData.customNotes.trim() && (
              <div style={{
                background: '#F8FAFC', border: '1.5px solid #94A3B8', borderRadius: 12,
                padding: '16px 20px', marginBottom: 26
              }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0F172A', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📋</span>
                  <span>ملاحظات وتوجيهات الإشراف الهندسي للمالك:</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {reportData.customNotes.trim()}
                </div>
              </div>
            )}

            {/* 4 Phases Breakdown */}
            <h3 style={{ margin: '0 0 14px', fontSize: 15, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} color="#0D9488" /> الموقف التنفيذي للمراحل الأربعة
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              {phases.map((ph, idx) => (
                <div key={ph.id} style={{
                  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
                  padding: '14px 18px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8,
                        background: ph.pct === 100 ? '#10B981' : ph.pct > 0 ? '#3B82F6' : '#94A3B8',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 12
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0F172A' }}>{ph.name}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{ph.description}</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <span className="font-mono" style={{
                        fontWeight: 800, fontSize: 13.5,
                        color: ph.pct === 100 ? '#10B981' : ph.pct > 0 ? '#3B82F6' : '#64748B'
                      }}>
                        {ph.pct}%
                      </span>
                      <div style={{ fontSize: 11, color: '#64748B' }}>({ph.doneCount}/{ph.totalCount} بند منجز)</div>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      width: `${ph.pct}%`, height: '100%',
                      background: ph.pct === 100 ? '#10B981' : '#3B82F6',
                      borderRadius: 99
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Quality Gates Section */}
            {passedGates.length > 0 && (
              <div style={{ marginBottom: 26 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={18} color="#F59E0B" /> بوابات واختبارات الجودة المجتازة
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                  {passedGates.map(g => (
                    <div key={g.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                      borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0'
                    }}>
                      <CheckCircle2 size={17} color="#10B981" />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#065F46' }}>{g.title}</div>
                        <div style={{ fontSize: 10.5, color: '#047857' }}>تم الفحص والاعتماد الهندسي بنجاح</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Guarantee Notice */}
            <div style={{
              background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12,
              padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26
            }}>
              <ShieldCheck size={26} color="#10B981" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#065F46' }}>معايير وضمان الجودة الهندسية</div>
                <div style={{ fontSize: 11.5, color: '#047857', marginTop: 2 }}>
                  يتم تنفيذ كافة الأعمال وفق الكود الهندسي المصري وتحت إشراف مباشر، مع إجراء اختبارات العزل بالغمر المائي 48 ساعة واختبار كبس مواسير السباكة بالبار قبل أعمال السيراميك والمحارة.
                </div>
              </div>
            </div>

            {/* Due Date Notice (if available) */}
            {reportData.dueDate && (
              <div style={{
                background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
                padding: '10px 16px', marginBottom: 26, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155'
              }}>
                <Calendar size={16} color="#2563EB" />
                <span>موعد التسليم التعاقدي المخطط: <strong>{fmtDate(reportData.dueDate)}</strong></span>
              </div>
            )}

            {/* Signature / Stamp Footer */}
            <div style={{
              marginTop: 32, paddingTop: 18, borderTop: '2px dashed #CBD5E1',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, textAlign: 'center'
            }}>
              <div>
                <div style={{ height: 36 }} />
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{reportData.engineerRole}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{reportData.engineerName}</div>
              </div>
              <div>
                <div style={{ height: 36 }} />
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>إدارة {reportData.companyName}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>خاتم واعتماد الإدارة الفنية</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
