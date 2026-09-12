import React, { useState } from 'react';
import {
  X, Printer, Copy, Check, FileText, Building2, Calendar,
  DollarSign, ShieldCheck, User, MapPin, Edit3, Eye, Save, Lock, FileDown, Download,
  PenTool, MessageCircle, Phone, ChevronLeft
} from 'lucide-react';
import { PROJECT_PHASES } from '../utils/constants';
import { fmtDate, todayISO, getGlobalCurrency } from '../utils/helpers';
import { printElement } from '../utils/printHelper';
import { loadCompanySettings } from '../utils/branding';
import SignaturePad from './SignaturePad';
import StampRing from './StampRing';

export default function ContractGeneratorModal({ project, onUpdate, onClose, companySettings: propCompanySettings, isInline = false }) {
  const activeCompanySettings = propCompanySettings || loadCompanySettings();
  const savedContract = project.contractData || {};

  // Form state initialized with saved contract data or project defaults
  const [formData, setFormData] = useState({
    contractNumber: savedContract.contractNumber || `CONT-${new Date().getFullYear()}-${project.id.slice(1)}`,
    contractDate: savedContract.contractDate || todayISO(),
    
    // First Party (Contractor)
    companyName: savedContract.companyName || activeCompanySettings.companyName || 'شركة المقاولات والتشطيبات',
    companyRep: savedContract.companyRep || project.engineer || activeCompanySettings.adminName || 'مدير المشروعات',
    companyCR: savedContract.companyCR || (activeCompanySettings.commercialRegister ? `س.ت: ${activeCompanySettings.commercialRegister}${activeCompanySettings.taxNumber ? ` - ب.ض: ${activeCompanySettings.taxNumber}` : ''}` : 'س.ت: 482910 - ب.ض: 593-201'),
    companyPhone: savedContract.companyPhone || activeCompanySettings.phone || '',
    companyAddress: savedContract.companyAddress || activeCompanySettings.address || '',

    // Second Party (Client)
    clientName: savedContract.clientName || project.client || '',
    clientNationalId: savedContract.clientNationalId || '',
    clientPhone: savedContract.clientPhone || '',
    clientAddress: savedContract.clientAddress || project.area || '',

    // Project Details
    projectName: savedContract.projectName || project.name || '',
    unitType: savedContract.unitType || project.type || 'شقة سكنية',
    unitLocation: savedContract.unitLocation || project.area || '',
    plotNumber: savedContract.plotNumber || project.plotNumber || '',
    apartmentNumber: savedContract.apartmentNumber || project.apartmentNumber || '',
    approxArea: savedContract.approxArea || '160',

    // Financials & Payments
    totalAmount: savedContract.totalAmount || project.budget || 250000,
    downPaymentPct: savedContract.downPaymentPct || 25,
    phase1Pct: savedContract.phase1Pct || 25,
    phase2Pct: savedContract.phase2Pct || 25,
    phase3Pct: savedContract.phase3Pct || 15,
    handoverPct: savedContract.handoverPct || 10,

    // Dates & Duration
    startDate: savedContract.startDate || project.startDate || todayISO(),
    dueDate: savedContract.dueDate || project.dueDate || todayISO(),
    totalDays: savedContract.totalDays || 60,

    // Warranty & Penalty
    warrantyYears: savedContract.warrantyYears || 10,
    freeMaintenanceMonths: savedContract.freeMaintenanceMonths || 12,
    delayPenaltyDaily: savedContract.delayPenaltyDaily || 300,

    // Witnesses
    witness1: savedContract.witness1 || '',
    witness2: savedContract.witness2 || '',

    // Custom notes
    specialTerms: savedContract.specialTerms || 'يلتزم الطرف الأول بتقديم عينات معتمدة للألوان وسيراميك الأرضيات قبل التوريد بـ 48 ساعة.',
    clientSignature: savedContract.clientSignature || null,
    signedAt: savedContract.signedAt || null,
  });

  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'edit'
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  function handleChange(field, val) {
    setFormData(prev => ({ ...prev, [field]: val }));
  }

  function handleSave() {
    if (onUpdate) {
      onUpdate({ contractData: formData });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  }

  // Calculate payment values
  const total = Number(formData.totalAmount) || 0;
  const downPaymentVal = Math.round((formData.downPaymentPct / 100) * total);
  const phase1Val      = Math.round((formData.phase1Pct / 100) * total);
  const phase2Val      = Math.round((formData.phase2Pct / 100) * total);
  const phase3Val      = Math.round((formData.phase3Pct / 100) * total);
  const handoverVal    = Math.round((formData.handoverPct / 100) * total);

  function fmtN(n) {
    return Number(n || 0).toLocaleString('ar-EG');
  }

  function handlePrint() {
    handleSave();
    setActiveTab('preview');
    printElement('contract-printable-area', `عقد_تشطيب_${formData.clientName || 'العميل'}`);
  }

  function copyContractText() {
    const el = document.getElementById('contract-printable-area');
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handleDownloadWord() {
    handleSave();
    const element = document.getElementById('contract-printable-area');
    if (!element) return;

    const htmlContent = element.innerHTML;
    const clientSafeName = (formData.clientName || 'العميل').replace(/[\\/:*?"<>|]/g, '_');
    const filename = `عقد_تشطيب_${clientSafeName}.doc`;

    const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${filename}</title>
        <style>
          @page {
            size: 21cm 29.7cm;
            margin: 2cm 2cm 2cm 2cm;
            mso-page-orientation: portrait;
          }
          body {
            font-family: 'Cairo', 'Traditional Arabic', 'Tahoma', sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            direction: rtl;
            text-align: right;
            color: #000000;
          }
          h1, h2, h3, h4 {
            font-family: 'Cairo', 'Traditional Arabic', 'Tahoma', sans-serif;
            color: #0f172a;
            text-align: right;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 12px 0;
            direction: rtl;
          }
          th, td {
            border: 1px solid #333333;
            padding: 7px 10px;
            text-align: right;
            font-size: 10.5pt;
          }
          th {
            background-color: #f1f5f9;
            font-weight: bold;
          }
          .legal-contract-frame {
            border: 2px solid #000000;
            padding: 24px;
          }
        </style>
      </head>
      <body dir='rtl'>
        <div class='legal-contract-frame'>
          ${htmlContent}
        </div>
      </body>
      </html>`;

    const blob = new Blob(['\ufeff' + wordHtml], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateClientWhatsAppMessage() {
    let cleanPhone = (formData.clientPhone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('01')) cleanPhone = '2' + cleanPhone;
    else if (cleanPhone.startsWith('05')) cleanPhone = '966' + cleanPhone.slice(1);

    let msg = `*عقد مقاولة واتفاق تنفيذ أعمال تشطيبات وديكور*\n`;
    msg += `📄 رقم العقد: ${formData.contractNumber}\n`;
    msg += `🏢 الطرف الأول: ${formData.companyName}\n`;
    msg += `👤 الطرف الثاني (العميل): ${formData.clientName || 'المحترم'}\n`;
    msg += `📍 الوحدة: ${formData.unitLocation} - ${formData.projectName} (${formData.unitType})\n\n`;
    
    msg += `*💰 القيمة الإجمالية وجدول الدفعات:*\n`;
    msg += `• إجمالي قيمة العقد: ${fmtN(formData.totalAmount)} ${getGlobalCurrency()}\n`;
    msg += `• الدفعة الأولى (مقدم وتعاقد): ${formData.downPaymentPct}% (${fmtN(downPaymentVal)} ${getGlobalCurrency()})\n`;
    msg += `• الدفعة الثانية (التأسيسات): ${formData.phase1Pct}% (${fmtN(phase1Val)} ${getGlobalCurrency()})\n`;
    msg += `• الدفعة الثالثة (التشطيب الخام): ${formData.phase2Pct}% (${fmtN(phase2Val)} ${getGlobalCurrency()})\n`;
    msg += `• الدفعة الرابعة (التشطيبات العليا): ${formData.phase3Pct}% (${fmtN(phase3Val)} ${getGlobalCurrency()})\n`;
    msg += `• الدفعة الخامسة (الاستلام النهائي): ${formData.handoverPct}% (${fmtN(handoverVal)} ${getGlobalCurrency()})\n\n`;

    msg += `*⏱️ البرنامج الزمني:* ${formData.totalDays} يوماً (التسليم: ${formData.dueDate})\n`;
    msg += `🛡️ الضمان والصيانة: ${formData.warrantyYears} سنوات ضمان سباكة وعزل + ${formData.freeMaintenanceMonths} شهر صيانة مجانية.\n\n`;

    msg += `_شركة ${formData.companyName} - نتمنى لكم سكناً مباركاً_ 🏡✨`;
    return { cleanPhone, text: msg };
  }

  function handleSendWhatsAppClient() {
    handleSave();
    const { cleanPhone, text } = generateClientWhatsAppMessage();
    const encoded = encodeURIComponent(text);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  }

  const modalBody = (
    <div
      className={isInline ? "contract-inline-card" : "modal-content"}
      onClick={e => e.stopPropagation()}
      style={{
        maxWidth: isInline ? '100%' : 920,
        width: isInline ? '100%' : '96%',
        maxHeight: isInline ? 'none' : '94vh',
        overflowY: isInline ? 'visible' : 'auto',
        borderRadius: 20,
        border: '1px solid var(--border)',
        background: 'var(--card)',
        padding: 0
      }}
    >
        {/* Top Header / Actions Bar (No-Print) */}
        <div className="no-print" style={{
          padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)', background: '#0F172A', color: '#fff',
          position: 'sticky', top: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileText size={20} color="#94A3B8" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>منظومة صياغة وطباعة عقود المقاولة والتشطيب</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>عقد رسمي ملزم قانونياً يشمل المواصفات وجدول الدفعات والضمانات</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* View Switcher */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', padding: 3, borderRadius: 10 }}>
              <button
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: activeTab === 'preview' ? 'var(--amber)' : 'transparent',
                  color: activeTab === 'preview' ? '#fff' : '#CBD5E1',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <Eye size={14} /> معاينة العقد
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: activeTab === 'edit' ? 'var(--amber)' : 'transparent',
                  color: activeTab === 'edit' ? '#fff' : '#CBD5E1',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <Edit3 size={14} /> تعديل البنود
              </button>
            </div>

            <button
              onClick={handleSave}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                background: savedSuccess ? '#10B981' : '#3B82F6', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
            >
              {savedSuccess ? <Check size={14} /> : <Save size={14} />}
              {savedSuccess ? 'تم الحفظ!' : 'حفظ البيانات'}
            </button>

            <button
              onClick={handleSendWhatsAppClient}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                background: '#25D366', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
              title="إرسال ملخص العقد وجدول الدفعات للعميل على الواتساب فوراً"
            >
              <MessageCircle size={14} /> إرسال واتساب 📱
            </button>

            <button
              onClick={handleDownloadWord}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                background: '#2B579A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
              title="تحميل العقد كملف Microsoft Word للتعديل عليه بحرية"
            >
              <FileDown size={14} /> Word (.doc) 📄
            </button>

            <button
              onClick={copyContractText}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'تم النسخ' : 'نسخ النص'}
            </button>

            <button
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                background: '#10B981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
            >
              <Printer size={14} /> طباعة PDF
            </button>

            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TAB 1: EDIT FORM */}
        <div className="no-print" style={{ display: activeTab === 'edit' ? 'flex' : 'none', padding: '28px 32px', flexDirection: 'column', gap: 24 }}>
          {/* Section 1: Parties */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <h4 style={{ margin: '0 0 16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}>
              <User size={18} color="var(--teal)" /> بيانات الطرفين والتعاقد
            </h4>
            
            {/* First Party (Company) */}
            <div style={{ marginBottom: 16, padding: 14, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)', marginBottom: 10 }}>🏢 الطرف الأول (المقاول المنفذ / الشركة):</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>اسم الشركة / المنشأة *</label>
                  <input value={formData.companyName} onChange={e => handleChange('companyName', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>ممثل الشركة (المهندس / المدير) *</label>
                  <input value={formData.companyRep} onChange={e => handleChange('companyRep', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>هاتف الشركة</label>
                  <input value={formData.companyPhone} onChange={e => handleChange('companyPhone', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>السجل التجاري والبطاقة الضريبية</label>
                  <input value={formData.companyCR} onChange={e => handleChange('companyCR', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>عنوان ومقر الشركة</label>
                  <input value={formData.companyAddress} onChange={e => handleChange('companyAddress', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
                </div>
              </div>
            </div>

            {/* Second Party (Client) */}
            <div style={{ padding: 14, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#3B82F6', marginBottom: 10 }}>👤 الطرف الثاني (العميل / المالك):</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>اسم العميل / المالك *</label>
                  <input value={formData.clientName} onChange={e => handleChange('clientName', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>هاتف العميل *</label>
                  <input value={formData.clientPhone} placeholder="010..." onChange={e => handleChange('clientPhone', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>الرقم القومي للعميل</label>
                  <input value={formData.clientNationalId} placeholder="2900101..." onChange={e => handleChange('clientNationalId', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>عنوان وسكن العميل</label>
                  <input value={formData.clientAddress} onChange={e => handleChange('clientAddress', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>رقم العقد</label>
                  <input value={formData.contractNumber} onChange={e => handleChange('contractNumber', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>تاريخ تحرير العقد</label>
                  <input type="date" value={formData.contractDate} onChange={e => handleChange('contractDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Unit / Project */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <h4 style={{ margin: '0 0 16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} color="#6366F1" /> بيانات موقع ووحدة التشطيب
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>اسم الموقع / العمارة</label>
                <input value={formData.projectName} onChange={e => handleChange('projectName', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>نوع الوحدة</label>
                <input value={formData.unitType} onChange={e => handleChange('unitType', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>المنطقة / الحي</label>
                <input value={formData.unitLocation} onChange={e => handleChange('unitLocation', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>رقم القطعة / الشقة</label>
                <input value={formData.plotNumber} placeholder="قطعة 12 - شقة 3" onChange={e => handleChange('plotNumber', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>المساحة التقريبية (م²)</label>
                <input type="number" value={formData.approxArea} onChange={e => handleChange('approxArea', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>المدة الكلية المقدرة للتنفيذ (أيام)</label>
                <input type="number" value={formData.totalDays} onChange={e => handleChange('totalDays', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Payments */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <h4 style={{ margin: '0 0 16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={18} color="#10B981" /> القيمة المالية ونسب الدفعات
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4, fontWeight: 700 }}>إجمالي قيمة عقد المقاولة (ج.م)</label>
                <input type="number" value={formData.totalAmount} onChange={e => handleChange('totalAmount', e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid var(--teal)', background: 'var(--card)', color: 'var(--ink)', fontSize: 16, fontWeight: 800 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>دفعة التعاقد والمقدم (%)</label>
                <input type="number" value={formData.downPaymentPct} onChange={e => handleChange('downPaymentPct', Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>دفعة التأسيسات م1 (%)</label>
                <input type="number" value={formData.phase1Pct} onChange={e => handleChange('phase1Pct', Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>دفعة التشطيب الخام م2 (%)</label>
                <input type="number" value={formData.phase2Pct} onChange={e => handleChange('phase2Pct', Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>دفعة التشطيبات العليا م3 (%)</label>
                <input type="number" value={formData.phase3Pct} onChange={e => handleChange('phase3Pct', Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>دفعة الاستلام النهائي م4 (%)</label>
                <input type="number" value={formData.handoverPct} onChange={e => handleChange('handoverPct', Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
            </div>
          </div>

          {/* Section 4: Special Terms */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <h4 style={{ margin: '0 0 16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="#F59E0B" /> شروط وبنود إضافية خاصة
            </h4>
            <textarea
              rows={3}
              value={formData.specialTerms}
              onChange={e => handleChange('specialTerms', e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontFamily: 'Cairo', fontSize: 13, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => { handleSave(); setActiveTab('preview'); }} style={{ padding: '10px 24px' }}>
              حفظ التعديلات وعرض العقد النهائي ←
            </button>
          </div>
        </div>

        {/* TAB 2: LIVE PRINTABLE CONTRACT PREVIEW */}
        <div style={{ display: activeTab === 'preview' ? 'block' : 'none', padding: '24px', background: '#e2e8f0' }}>
          <div id="contract-printable-area" className="print-container legal-contract-frame printable-document-target" style={{
            padding: '36px 44px', color: '#0F172A', background: '#fff', lineHeight: 1.7, fontSize: 13,
            fontFamily: 'Cairo, Tahoma, sans-serif', maxWidth: 840, margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>

            {/* Contract Official Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #0F172A', paddingBottom: 14, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 21, fontWeight: 900, color: '#0F172A', letterSpacing: -0.5 }}>{formData.companyName}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>أعمال المقاولات والتشطيبات والديكور والتصميم الداخلي</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{formData.companyCR} | {formData.companyPhone}</div>
              </div>
              <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>رقم العقد: {formData.contractNumber}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>تاريخ التحرير: {formData.contractDate}</div>
              </div>
            </div>

            {/* Contract Title Banner */}
            <div style={{ textAlign: 'center', margin: '18px 0', border: '2px solid #0F172A', padding: '8px', background: '#F8FAFC', borderRadius: 6 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0F172A' }}>
                عقد مقاولة واتفاق تنفيذ أعمال تشطيبات وديكور
              </h2>
            </div>

            {/* Preamble & Parties */}
            <div style={{ marginBottom: 20, textAlign: 'justify' }}>
              <p>
                إنه في يوم <strong>{new Date(formData.contractDate).toLocaleDateString('ar-EG', { weekday: 'long' })}</strong> الموافق <strong>{formData.contractDate}</strong>، تحرر هذا العقد بين كل من:
              </p>
              <div style={{ padding: '12px 16px', background: '#F1F5F9', borderRadius: 8, margin: '10px 0', borderRight: '4px solid #0F172A' }}>
                <div><strong>الطرف الأول (المقاول المنفذ):</strong> {formData.companyName}، ويمثلها قانوناً السيد / <strong>{formData.companyRep}</strong>، وعنوانها: {formData.companyAddress}، هاتف: {formData.companyPhone}.</div>
                <div style={{ marginTop: 8 }}><strong>الطرف الثاني (المالك / العميل):</strong> السيد / <strong>{formData.clientName}</strong>، بطاقة رقم قومي: <strong>{formData.clientNationalId || '............................'}</strong>، هاتف: <strong>{formData.clientPhone || '............................'}</strong>، المقيم في: <strong>{formData.clientAddress}</strong>.</div>
              </div>
              <p>
                <strong>تمهيد:</strong> لما كان الطرف الثاني يمتلك الوحدة الموضحة بياناتها أدناه ويرغب في إسناد أعمال التشطيب والديكور للطرف الأول بوصفه جهة هندسية متخصصة، وقد لاقى ذلك قبولاً، فقد اتفق الطرفان بكامل أهليتهما القانونية على البنود التالية:
              </p>
            </div>

            {/* Clause 1: Project Subject */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ borderBottom: '1.5px solid #CBD5E1', paddingBottom: 4, margin: '16px 0 8px', color: '#0F172A' }}>البند الأول: موضوع العقد ومحل التنفيذ</h4>
              <p>
                يقوم الطرف الأول بتنفيذ أعمال التشطيبات والديكور الشاملة للوحدة الكائنة في: <strong>{formData.unitLocation} - {formData.projectName}</strong> (نوع الوحدة: <strong>{formData.unitType}</strong>، {formData.plotNumber ? `رقم: ${formData.plotNumber}` : ''}، مساحة تقريبية: <strong>{formData.approxArea} م²</strong>)، وذلك طبقاً للأصول الهندسية والمقايسة المعتمدة.
              </p>
            </div>

            {/* Clause 2: The 4 Phases */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ borderBottom: '1.5px solid #CBD5E1', paddingBottom: 4, margin: '16px 0 8px', color: '#0F172A' }}>البند الثاني: نظام ومراحل التنفيذ (المراحل الأربعة)</h4>
              <p>يتم تنفيذ الأعمال وفق جدول المراحل الأربعة المعتمد:</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, margin: '10px 0', border: '1px solid #CBD5E1' }}>
                <thead>
                  <tr style={{ background: '#E2E8F0', borderBottom: '1.5px solid #0F172A' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '20%' }}>المرحلة</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '60%' }}>نطاق الأعمال المشمولة</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '20%' }}>المدة المقدرة</th>
                  </tr>
                </thead>
                <tbody>
                  {PROJECT_PHASES.map((ph, i) => (
                    <tr key={ph.id} style={{ borderBottom: '1px solid #E2E8F0', background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{ph.name} ({ph.subtitle})</td>
                      <td style={{ padding: '8px 10px' }}>{ph.items.map(it => it.label).join(' • ')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{ph.durationDays} يوماً</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Clause 3: Contract Value & Payment Schedule */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ borderBottom: '1.5px solid #CBD5E1', paddingBottom: 4, margin: '16px 0 8px', color: '#0F172A' }}>البند الثالث: القيمة المالية الإجمالية وجدول الدفعات</h4>
              <p>
                اتفق الطرفان على أن إجمالي قيمة هذا العقد هو <strong>{fmtN(formData.totalAmount)} {getGlobalCurrency()} (فقط وقدره {formData.totalAmount} {getGlobalCurrency()} لا غير)</strong>، ويتم سدادها على دفعات مرحلية وفق الجدول التالي:
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, margin: '10px 0', border: '1px solid #CBD5E1' }}>
                <thead>
                  <tr style={{ background: '#E2E8F0', borderBottom: '1.5px solid #0F172A' }}>
                    <th style={{ padding: '8px', textAlign: 'right' }}>الدفعة</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>توقيت الاستحقاق</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>النسبة</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>المبلغ المستحق</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>الدفعة الأولى (مقدم وتعاقد)</td>
                    <td style={{ padding: '8px' }}>عند توقيع العقد وبدء التجهيزات وتشوين الخامات</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{formData.downPaymentPct}%</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{fmtN(downPaymentVal)} {getGlobalCurrency()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>الدفعة الثانية (التأسيسات)</td>
                    <td style={{ padding: '8px' }}>عند إتمام اختبارات واعتـماد أعمال المرحلة الأولى (سباكة/عزل/كهرباء/محارة)</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{formData.phase1Pct}%</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{fmtN(phase1Val)} {getGlobalCurrency()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>الدفعة الثالثة (التشطيبات الخام)</td>
                    <td style={{ padding: '8px' }}>عند الانتهاء من تركيبات الجبس بورد وبورسلين الأرضيات والأسلاك</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{formData.phase2Pct}%</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{fmtN(phase2Val)} {getGlobalCurrency()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>الدفعة الرابعة (التشطيبات العليا)</td>
                    <td style={{ padding: '8px' }}>عند توريد وتركيب الرخام وقطاعات الـ PVC وتجاليد الأبواب</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{formData.phase3Pct}%</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{fmtN(phase3Val)} {getGlobalCurrency()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1.5px solid #0F172A', background: '#F8FAFC' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>الدفعة الخامسة (الاستلام النهائي)</td>
                    <td style={{ padding: '8px' }}>عند التسليم الفندقي النهائي وتصفية قائمة الملاحظات (Snag List)</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{formData.handoverPct}%</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#0F766E' }}>{fmtN(handoverVal)} {getGlobalCurrency()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Clause 4: Duration */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ borderBottom: '1.5px solid #CBD5E1', paddingBottom: 4, margin: '16px 0 8px', color: '#0F172A' }}>البند الرابع: المدة والبرنامج الزمني</h4>
              <p>
                اتفق الطرفان على أن تكون مدة التنفيذ الكلية <strong>({formData.totalDays}) يوماً</strong> تبدأ من تاريخ استلام الموقع خالياً من العوائق، على أن يكون موعد التسليم النهائي هو <strong>{formData.dueDate}</strong>، ولا تدخل في حساب المدة أيام القوة القاهرة أو تأخر الطرف الثاني في سداد الدفعات أو اعتماد العينات.
              </p>
            </div>

            {/* Clause 5 & 6: Obligations */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ borderBottom: '1.5px solid #CBD5E1', paddingBottom: 4, margin: '16px 0 8px', color: '#0F172A' }}>البند الخامس: التزامات وحقوق الطرفين</h4>
              <p>
                <strong>1. التزامات الطرف الأول (المقاول):</strong> الالتزام بتوفير العمالة الفنية الماهرة، استخدام خامات مطابقة للمواصفات، إجراء اختبار كبس السباكة واختبار غمر العزل المائي لمدة 48 ساعة، ومراعاة نظافة الموقع وتسليمه خالياً من أية مخلفات.
              </p>
              <p>
                <strong>2. التزامات الطرف الثاني (المالك):</strong> تمكين الطرف الأول من الموقع وتوفير مصادر المياه والكهرباء اللازمة للعمل، وسداد الدفعات المالية في مواعيدها المحددة فور استحقاقها، واعتماد عينات المواد في مدة أقصاها 48 ساعة من تاريخ عرضها.
              </p>
              {formData.specialTerms && (
                <p>
                  <strong>3. شروط خاصة إضافية:</strong> {formData.specialTerms}
                </p>
              )}
            </div>

            {/* Clause 7: Warranty */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ borderBottom: '1.5px solid #CBD5E1', paddingBottom: 4, margin: '16px 0 8px', color: '#0F172A' }}>البند السادس: الضمان والصيانة</h4>
              <p>
                يضمن الطرف الأول أعمال السباكة والعزل المائي لمدة <strong>({formData.warrantyYears}) سنوات</strong> بموجب شهادات ضمان الشركات المعتمدة، كما يضمن سلامة أعمال الكهرباء والتشطيبات لمدة <strong>({formData.freeMaintenanceMonths}) شهراً</strong> من تاريخ محضر الاستلام النهائي، مع التزامه بإصلاح أي عيب فني ناتج عن سوء المصنعية مجاناً.
              </p>
            </div>

            {/* Clause 8: Signatures */}
            <div style={{ marginTop: 40, paddingTop: 20, borderTop: '2px solid #0F172A' }}>
              <p style={{ textAlign: 'center', fontSize: 13, marginBottom: 24 }}>
                تحرر هذا العقد من نسختين بيد كل طرف نسخة للعمل بموجبها عند اللزوم، وتعتبر بنوده ملزمة للطرفين فور التوقيع.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, textAlign: 'center', alignItems: 'start' }}>
                {/* Contractor (First Party) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>الطرف الأول (المقاول المنفذ)</div>
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>{formData.companyName}</div>
                  
                  {/* Official Company Seal */}
                  <div style={{ height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ transform: 'scale(0.85)', margin: '-10px 0' }}>
                      <StampRing value={100} size={84} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F766E' }}>
                      معتمد ومختوم إلكترونياً ✓
                    </span>
                  </div>
                  <div style={{ borderBottom: '1.5px solid #0F172A', width: '80%', margin: '6px auto 0' }} />
                </div>

                {/* Client (Second Party) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>الطرف الثاني (المالك / العميل)</div>
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>السيد / {formData.clientName}</div>
                  
                  {formData.clientSignature ? (
                    <div style={{ height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={formData.clientSignature}
                        alt="توقيع العميل"
                        style={{ maxHeight: 75, maxWidth: 200, objectFit: 'contain' }}
                      />
                      <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 800 }}>
                        توقيع إلكتروني معتمد ✅ ({formData.signedAt || formData.contractDate})
                      </span>
                    </div>
                  ) : (
                    <div style={{ width: '100%', maxWidth: 260, margin: '0 auto' }} className="no-print">
                      <SignaturePad
                        onSave={(sigData) => {
                          setFormData(prev => ({ ...prev, clientSignature: sigData, signedAt: sigData ? todayISO() : null }));
                        }}
                        onClear={() => {
                          setFormData(prev => ({ ...prev, clientSignature: null, signedAt: null }));
                        }}
                      />
                    </div>
                  )}
                  
                  <div style={{ borderBottom: '1.5px solid #0F172A', width: '80%', margin: '6px auto 0' }} />
                  {!formData.clientSignature && (
                    <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 4 }} className="no-print">
                      (وقّع أعلاه باللمس أو الماوس لاعتماد العقد)
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
  );

  if (isInline) {
    return (
      <div className="contract-inline-wrapper tab-fade">
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 10,
              background: 'var(--card)',
              color: 'var(--ink)',
              border: '1px solid var(--border)',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <ChevronLeft size={16} /> <span>← العودة إلى مركز العقود والعميل</span>
          </button>
        </div>
        {modalBody}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)' }}>
      {modalBody}
    </div>
  );
}
