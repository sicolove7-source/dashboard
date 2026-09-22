import React, { useState } from 'react';
import {
  FileText, Wrench, Sparkles, MessageCircle, Copy, Check,
  Share2, ExternalLink, ShieldCheck, UserCheck, ArrowRight,
  Clock, DollarSign, Send, CheckCircle2, ChevronLeft
} from 'lucide-react';
import { getGlobalCurrency } from '../utils/helpers';
import { openWhatsApp } from '../utils/whatsappTemplates';
import { syncSingleProjectToCloud, publishProjectToPortalShares } from '../services/cloudSync';
import { getActiveTenantId } from '../services/tenantsManager';

export default function ContractsHubPanel({
  project,
  currentUser,
  userRole,
  activeCompanyId,
  onUpdate,
  onOpenCraftsmanContract,
  onOpenClientContract,
  onOpenClientPortal,
  onOpenClientReport,
}) {
  const currency = getGlobalCurrency();
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate public client portal URL with token as document identifier
  const companyId = activeCompanyId || project.companyId || currentUser?.companyId || getActiveTenantId() || null;
  const activeToken = project.clientPortalToken || ('cpt_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36));
  const isPortalActive = project.clientPortalEnabled === true;
  const portalUrl = `${window.location.origin}/portal/${activeToken}`;

  const handleTogglePortal = (newState) => {
    try {
      const patch = {
        clientPortalEnabled: newState,
        clientPortalToken: activeToken,
      };
      if (onUpdate) {
        onUpdate(patch);
      }
      const full = { ...project, ...patch, companyId };
      syncSingleProjectToCloud(companyId, project.id, full).catch(() => {});
      publishProjectToPortalShares(companyId, full).catch(() => {});
    } catch (e) {
      console.warn('Toggle portal failed:', e);
    }
  };

  const handleCopyLink = () => {
    try {
      const patch = {
        clientPortalEnabled: true,
        clientPortalToken: activeToken,
      };
      if (onUpdate) {
        onUpdate(patch);
      }
      const full = { ...project, ...patch, companyId };
      syncSingleProjectToCloud(companyId, project.id, full).catch(() => {});
      publishProjectToPortalShares(companyId, full).catch(() => {});
      navigator.clipboard.writeText(portalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const handleSharePortalWhatsApp = () => {
    const patch = {
      clientPortalEnabled: true,
      clientPortalToken: activeToken,
    };
    if (onUpdate) {
      onUpdate(patch);
    }
    const full = { ...project, ...patch, companyId };
    syncSingleProjectToCloud(companyId, project.id, full).catch(() => {});
    publishProjectToPortalShares(companyId, full).catch(() => {});
    const cleanPhone = (project.clientPhone || '').replace(/\D/g, '');
    const clientName = project.client || 'عميلنا العزيز';
    const msg = `السلام عليكم ورحمة الله وبركاته أ. *${clientName}* 🌸\n` +
      `يسرنا مشاركة رابط بوابة المتابعة الحية لموقعكم: *${project.name}* 🏛️\n\n` +
      `عبر هذا الرابط يمكنكم متابعة آخر المستجدات ونسب التنفيذ، الصور اليومية، وكشوف الحسابات والاعتمادات:\n` +
      `${portalUrl}\n\n` +
      `خالص تحياتنا، فريق إدارة المشروع 👷‍♂️`;

    openWhatsApp(cleanPhone, msg);
  };

  // Craftsman contracts count
  const contractsCount = project.craftsmanContracts ? Object.keys(project.craftsmanContracts).length : 0;

  return (
    <div className="tab-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Top Header Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.12)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 10, color: '#93C5FD' }}>
            <ShieldCheck size={14} /> مركز العقود والتوثيق وبوابة العميل
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            العقود والمستندات وبوابات المتابعة
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
            إدارة وتوثيق عقود صنايعية ومقاولي الباطن، عقد العميل المعتمد، البوابة الرقمية التفاعلية للتوقيع والمتابعة، وتقارير الواتساب لموقع <strong style={{ color: '#F1F5F9' }}>"{project.name}"</strong>.
          </p>
        </div>

        {/* Quick Project Summary Chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '10px 16px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>العميل</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>{project.client}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '10px 16px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>نسبة الإنجاز</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#10B981' }}>{project.progress}%</div>
          </div>
        </div>
      </div>

      {/* ── 4 Core Interactive Modules Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16
      }}>
        {/* Module 1: عقد صنايعي / باطن */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: 'var(--shadow-sm)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          position: 'relative'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: '#0F172A', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, boxShadow: '0 4px 10px rgba(15, 23, 42, 0.2)'
              }}>
                📜
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 99, background: '#F1F5F9', color: '#475569',
                border: '1px solid #E2E8F0'
              }}>
                مقاولات ومصنعيات
              </span>
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
              عقد صنايعي / باطن 📜
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              إبرام وتوثيق وتعديل عقود المصنعية لكافة الحرفيين (سباكة، كهرباء، محارة، سيراميك، جبس بورد، نقاشة...) مع تخصيص الطرف الأول والثاني، والبنود الفنية، والدفعات والأختام.
            </p>

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              <CheckCircle2 size={14} color="#10B981" />
              <span>{contractsCount > 0 ? `${contractsCount} عقود مسجلة لهذا الموقع` : 'جاهز للإبرام والتوثيق الفوري'}</span>
            </div>
          </div>

          <button
            onClick={() => onOpenCraftsmanContract(null)}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 16px',
              borderRadius: 10,
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
              transition: 'background 0.15s ease'
            }}
          >
            <Wrench size={16} /> <span>فتح وتحرير عقد صنايعي 📜</span>
          </button>
        </div>

        {/* Module 2: عقد العميل */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: 'var(--shadow-sm)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          position: 'relative'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: '#1E293B', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, boxShadow: '0 4px 10px rgba(30, 41, 59, 0.2)'
              }}>
                📄
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 99, background: '#EFF6FF', color: '#1D4ED8',
                border: '1px solid #BFDBFE'
              }}>
                عقد المشروع الشامل
              </span>
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
              عقد العميل المعتمد 📜
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              العقد الهندسي والقانوني الشامل المبرم مع مالك الموقع ({project.client})، متضمناً جدول الدفعات الخمسة، المواصفات الفنية، شروط الجزاءات، والتصدير لـ Word وPDF.
            </p>

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              <DollarSign size={14} color="#2563EB" />
              <span>الميزانية الإجمالية: <strong style={{ color: 'var(--ink)' }}>{Number(project.budget || 0).toLocaleString('ar-EG')} {currency}</strong></span>
            </div>
          </div>

          <button
            onClick={onOpenClientContract}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 16px',
              borderRadius: 10,
              background: '#1E293B',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(30, 41, 59, 0.2)',
              transition: 'background 0.15s ease'
            }}
          >
            <FileText size={16} /> <span>فتح وتحرير عقد العميل 📜</span>
          </button>
        </div>

        {/* Module 3: بوابة العميل */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: 'var(--shadow-sm)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          position: 'relative'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: '#1877F2', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, boxShadow: '0 4px 10px rgba(24, 119, 242, 0.25)'
              }}>
                🌐
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 99,
                background: isPortalActive ? '#DCFCE7' : '#F1F5F9',
                color: isPortalActive ? '#16A34A' : '#64748B',
                border: '1px solid ' + (isPortalActive ? '#86EFAC' : '#CBD5E1')
              }}>
                {isPortalActive ? '🟢 البوابة مفعلة ومحمية' : '🔒 البوابة مقفلة'}
              </span>
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
              بوابة العميل التفاعلية 🌐
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              رابط رقمي خاص بالعميل يتيح له متابعة صور وفيديوهات الموقع لحظة بلحظة، نسب الإنجاز، كشوف الحسابات والمدفوعات، والتوقيع والاعتماد الإلكتروني من أي جهاز.
            </p>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isPortalActive ? '#16A34A' : 'var(--muted)' }}>
                <Sparkles size={14} color={isPortalActive ? '#10B981' : '#64748B'} />
                <span>{isPortalActive ? 'الرابط مشفر ومحمي بالتوكن السري الخاص بالعميل' : 'البوابة مغلقة — لا يمكن لأي زائر خارجي الوصول للبيانات'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>إمكانية وصول العميل:</span>
              <button
                onClick={() => handleTogglePortal(!isPortalActive)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isPortalActive ? '#EF4444' : '#1877F2',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                {isPortalActive ? 'إيقاف البوابة مؤقتاً' : 'تفعيل البوابة الآن'}
              </button>
            </div>

            <button
              onClick={() => {
                if (onOpenClientPortal) {
                  onOpenClientPortal(activeToken);
                } else {
                  window.open(portalUrl, '_blank');
                }
              }}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 16px',
                borderRadius: 10,
                background: '#1877F2',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(24, 119, 242, 0.3)',
                transition: 'background 0.15s ease'
              }}
            >
              <ExternalLink size={16} /> <span>معاينة بوابة العميل الآن 🌐</span>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={handleCopyLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: copiedLink ? '#DCFCE7' : 'var(--bg)',
                  color: copiedLink ? '#16A34A' : 'var(--ink)',
                  border: '1px solid ' + (copiedLink ? '#86EFAC' : 'var(--border)'),
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ الرابط'}</span>
              </button>

              <button
                onClick={handleSharePortalWhatsApp}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                <Share2 size={14} /> <span>إرسال واتساب</span>
              </button>
            </div>
          </div>
        </div>

        {/* Module 4: تقرير العميل */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: 'var(--shadow-sm)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          position: 'relative'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: '#10B981', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
              }}>
                📱
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 99, background: '#DCFCE7', color: '#16A34A',
                border: '1px solid #86EFAC'
              }}>
                تقرير فوري مباشر
              </span>
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
              تقرير العميل عبر واتساب 📱
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              توليد تقرير دوري ذكي ومنسق بضغطة زر وإرساله مباشرة إلى واتساب العميل، يوضح نسبة الإنجاز، بنود الأعمال المنفذة، أحدث الصور، والخطوات القادمة.
            </p>

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              <Clock size={14} color="#10B981" />
              <span>إرسال فوري دون أي مجهود في كتابة التقارير</span>
            </div>
          </div>

          <button
            onClick={onOpenClientReport}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 16px',
              borderRadius: 10,
              background: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              transition: 'background 0.15s ease'
            }}
          >
            <MessageCircle size={16} /> <span>معاينة وإرسال تقرير العميل 📱</span>
          </button>
        </div>
      </div>
    </div>
  );
}
