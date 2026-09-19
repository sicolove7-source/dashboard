import React, { useState, useEffect } from 'react';
import {
  Building2, Home, Sparkles, CheckCircle2, Phone, User, MapPin,
  Layers, Calendar, Send, Check, ShieldCheck,
  Clock, Award, MessageCircle, AlertCircle, ChevronLeft,
  ArrowRight, Landmark, Briefcase, Store
} from 'lucide-react';
import { resolveCompanyForIntake, submitPublicLead } from '../services/intakeResolver';

const UNIT_TYPES = [
  { id: 'شقة سكنية', label: 'شقة سكنية', icon: Home, desc: 'شقق وأدوار متكررة' },
  { id: 'فيلا / دوبلكس', label: 'فيلا / دوبلكس', icon: Landmark, desc: 'فيلات مستقلة ودوبلكس' },
  { id: 'بنتهاوس / روف', label: 'بنتهاوس / روف', icon: Building2, desc: 'وحدات علوية وتراسات' },
  { id: 'مقر إداري / عيادة', label: 'مقر إداري / عيادة', icon: Briefcase, desc: 'مكاتب وشركات ومراكز' },
  { id: 'محل / تجاري', label: 'محل / تجاري', icon: Store, desc: 'محلات ومطاعم ومعارض' },
];

const PACKAGES = [
  {
    id: 'سوبر لوكس',
    name: 'باقة سوبر لوكس ✨',
    tag: 'الأكثر طلباً',
    color: '#10B981',
    desc: 'تشطيب كامل على المفتاح، أجود خامات التأسيس المعتمدة، سيراميك فرز أول ودهانات كمبيوتر.',
  },
  {
    id: 'ألترا لوكس VIP',
    name: 'باقة ألترا لوكس VIP 👑',
    tag: 'تصميم راقي',
    color: '#D97706',
    desc: 'بورسلين إسباني، بديل رخام وخشب، أسقف جبسوم بورد وإضاءات مخفية، وتصميم داخلي 3D.',
  },
  {
    id: 'سمارت هوم الذكي',
    name: 'باقة السمارت هوم 🤖',
    tag: 'تحكم ذكي',
    color: '#8B5CF6',
    desc: 'أتمتة شاملة للمنزل: تحكم بالإضاءة والتكييف والستائر والساوند سيستم بالهاتف والأوامر الصوتية.',
  },
  {
    id: 'اقتصادي مدروس',
    name: 'باقة اقتصادية معتمدة 🏷️',
    tag: 'أفضل قيمة',
    color: '#64748B',
    desc: 'أفضل توازن بين جودة الخامات والتكلفة المحكومة مع ضمان هندسي رسمي على كافة بنود التأسيس.',
  },
];

const POPULAR_AREAS = [
  'التجمع الخامس / القاهرة الجديدة',
  'الشيخ زايد / 6 أكتوبر',
  'المعادي / زهراء المعادي',
  'مصر الجديدة / مدينة نصر',
  'الشروق / مدينتي',
  'العاصمة الإدارية الجديدة',
  'الإسكندرية والساحل',
  'أخرى (اكتب في الملاحظات)',
];

const QUICK_AREAS_M2 = [100, 130, 160, 200, 250, 350];

export default function ClientIntakePage({ intakeInfo, onBack }) {
  const companyId = intakeInfo?.companyId || null;
  const initialSource = intakeInfo?.source || 'website';

  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: 'شقة سكنية',
    unitAreaM2: 150,
    area: POPULAR_AREAS[0],
    customAreaText: '',
    state: 'نصف تشطيب (محارة وحلوق)',
    package: 'سوبر لوكس',
    budget: '',
    inspectionDate: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedLead, setSubmittedLead] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // جلب هوية وبيانات الشركة
  useEffect(() => {
    let isCancelled = false;
    async function load() {
      try {
        const c = await resolveCompanyForIntake(companyId);
        if (!isCancelled) {
          setCompany(c);
        }
      } catch (e) {
        console.warn('Failed to load company for intake:', e);
      } finally {
        if (!isCancelled) setLoadingCompany(false);
      }
    }
    load();
    return () => { isCancelled = true; };
  }, [companyId]);

  // إرسال النموذج
  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('يرجى إدخال الاسم بالكامل');
      return;
    }

    if (!formData.phone.trim() || formData.phone.trim().length < 8) {
      setErrorMsg('يرجى إدخال رقم هاتف / واتساب صالح للتواصل');
      return;
    }

    setSubmitting(true);

    const finalArea = formData.area.includes('أخرى') && formData.customAreaText
      ? formData.customAreaText
      : formData.area;

    const leadPayload = {
      id: `lead_${Date.now()}`,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      type: formData.type,
      unitArea: Number(formData.unitAreaM2) || 150,
      area: finalArea,
      state: formData.state,
      package: formData.package,
      budget: Number(formData.budget) || (formData.package === 'ألترا لوكس VIP' ? 500000 : 300000),
      inspectionDate: formData.inspectionDate || '',
      notes: formData.notes.trim(),
      source: initialSource,
      companyId: companyId,
      createdAt: new Date().toISOString().slice(0, 10),
      stage: 'new_lead',
    };

    try {
      const res = await submitPublicLead(companyId, leadPayload);
      if (res.success) {
        setSubmittedLead(res.lead);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg('حدث خطأ أثناء إرسال طلبكم، يرجى المحاولة مرة أخرى أو التواصل المباشر عبر الواتساب.');
      }
    } catch (err) {
      console.error('Submit lead error:', err);
      setErrorMsg('تعذر إرسال الطلب، يرجى التحقق من اتصالك بالإنترنت.');
    } finally {
      setSubmitting(false);
    }
  }

  const primaryColor = company?.primaryColor || '#1877F2';
  const companyName = company?.companyName || 'شركة المقاولات والتشطيبات';

  // شاشة التأكيد بعد الإرسال
  if (submittedLead) {
    const waPhone = (company?.whatsapp || company?.phone || '').replace(/[^0-9]/g, '') || '201018160582';
    const waText = encodeURIComponent(
      `مرحباً أ/ فريق عمل ${companyName} 🌸\n` +
      `قمت للتو بتقديم طلب معاينة وتشطيب عقار (${submittedLead.type} بمساحة ${submittedLead.unitArea || '150'}م² في ${submittedLead.area}) عبر موقعكم.\n` +
      `الاسم: ${submittedLead.name}\n` +
      `رقم الطلب: #${submittedLead.id.slice(-5)}\n` +
      `أود تأكيد استلام الطلب وتنسيق موعد المعاينة الهندسية.`
    );
    const waUrl = `https://wa.me/${waPhone}?text=${waText}`;

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0F172A',
        color: '#F8FAFC',
        fontFamily: 'Cairo, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }} dir="rtl">
        <div style={{
          maxWidth: 580,
          width: '100%',
          background: 'rgba(30, 41, 59, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 24,
          padding: '40px 28px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
        }}>
          {/* Success Icon */}
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid #10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            animation: 'scaleIn 0.5s ease-out',
          }}>
            <CheckCircle2 size={44} color="#10B981" />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', margin: '0 0 10px' }}>
            تم استلام طلبكم بنجاح! 🎉
          </h2>

          <p style={{ fontSize: 14.5, color: '#94A3B8', lineHeight: 1.8, margin: '0 0 24px' }}>
            شكراً لثقتكم بـ <strong style={{ color: '#F1F5F9' }}>{companyName}</strong>. تم تسجيل طلب معاينة عقاركم وجاري تحويله للمكتب الفني للتواصل معكم خلال 24 ساعة.
          </p>

          {/* Reference Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 24,
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>رقم الطلب المرجعي:</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#38BDF8', fontFamily: 'monospace' }}>
                #{submittedLead.id.slice(-6)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>الاسم:</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>{submittedLead.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>نوع العقار والموقع:</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>{submittedLead.type} - {submittedLead.area}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>الباقة المختارة:</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981' }}>{submittedLead.package}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: '#10B981',
                color: '#FFFFFF',
                padding: '14px 20px',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              <MessageCircle size={20} /> تواصل فوري مع المهندس عبر واتساب
            </a>

            <button
              onClick={() => {
                setSubmittedLead(null);
                setFormData({
                  name: '',
                  phone: '',
                  type: 'شقة سكنية',
                  unitAreaM2: 150,
                  area: POPULAR_AREAS[0],
                  customAreaText: '',
                  state: 'نصف تشطيب (محارة وحلوق)',
                  package: 'سوبر لوكس',
                  budget: '',
                  inspectionDate: '',
                  notes: '',
                });
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#E2E8F0',
                border: 'none',
                padding: '12px 18px',
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              تقديم طلب لعقار آخر ➕
            </button>

            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: 'transparent',
                  color: '#94A3B8',
                  border: 'none',
                  fontSize: 13,
                  cursor: 'pointer',
                  marginTop: 6,
                  fontFamily: 'inherit',
                }}
              >
                العودة للمنصة
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #090D16 0%, #0F172A 40%, #1E293B 100%)',
      color: '#F8FAFC',
      fontFamily: 'Cairo, system-ui, sans-serif',
      padding: '24px 16px 60px',
    }} dir="rtl">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ─── Top Company Branding Bar ─── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {company?.companyLogo ? (
              <img
                src={company.companyLogo}
                alt={companyName}
                style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'contain', background: '#fff', padding: 3 }}
              />
            ) : (
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${primaryColor}, #3B82F6)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: 18,
              }}>
                <Building2 size={24} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF' }}>{companyName}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>{company?.companySubtitle || 'إدارة التشطيبات والمقاولات'}</div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: 12,
            color: '#34D399',
            fontWeight: 800,
          }}>
            <ShieldCheck size={14} /> جهة هندسية معتمدة
          </div>
        </div>

        {/* ─── Hero Header ─── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(217, 119, 6, 0.15)',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            borderRadius: 30,
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 800,
            color: '#F59E0B',
            marginBottom: 14,
          }}>
            <Sparkles size={15} /> استمارة طلب مقايسة وتنسيق معاينة مجانية
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, margin: '0 0 12px', color: '#FFFFFF', lineHeight: 1.3 }}>
            احصل على مقايسة دقيقة لوحدتك في دقائق
          </h1>
          <p style={{ fontSize: 14.5, color: '#94A3B8', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
            املأ بيانات وحدتك ليقوم فريقنا الهندسي بدراسة المساحة، واقتراح أفضل باقة وموعد للمعاينة الميدانية.
          </p>

          {/* Quick Badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 18,
            fontSize: 12.5,
            color: '#CBD5E1',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={15} color="#10B981" /> استلام بالقِدة والميزان
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} color="#38BDF8" /> رد رسمي خلال 24 ساعة
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={15} color="#F59E0B" /> ضمان هندسي موثق
            </span>
          </div>
        </div>

        {/* ─── Main Form Container ─── */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'rgba(30, 41, 59, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 24,
            padding: '32px 24px',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 26,
          }}
        >
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 13.5,
              color: '#FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          {/* 1. Client Contact Info */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 800, marginBottom: 12, color: '#E2E8F0' }}>
              1. بيانات العميل والتواصل <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 14,
                  padding: '10px 14px',
                }}>
                  <User size={18} color="#94A3B8" />
                  <input
                    type="text"
                    required
                    placeholder="الاسم ثلاثي أو ثنائي"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#F8FAFC',
                      fontSize: 14,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 14,
                  padding: '10px 14px',
                }}>
                  <Phone size={18} color="#94A3B8" />
                  <input
                    type="tel"
                    required
                    placeholder="رقم الهاتف أو الواتساب (مثال: 01012345678)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#F8FAFC',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      direction: 'ltr',
                      textAlign: 'right',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Unit Type */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 800, marginBottom: 12, color: '#E2E8F0' }}>
              2. نوع العقار / الوحدة <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              {UNIT_TYPES.map((u) => {
                const Icon = u.icon;
                const isSelected = formData.type === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: u.id })}
                    style={{
                      background: isSelected ? 'rgba(59, 130, 246, 0.18)' : 'rgba(15, 23, 42, 0.55)',
                      border: `1.5px solid ${isSelected ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: 14,
                      padding: '14px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      color: isSelected ? '#FFFFFF' : '#94A3B8',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon size={22} color={isSelected ? '#38BDF8' : '#94A3B8'} />
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 800 : 600 }}>{u.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Location & Area */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 800, marginBottom: 12, color: '#E2E8F0' }}>
              3. الموقع والمساحة الإجمالية <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
                  المنطقة أو الحي
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 14,
                  padding: '10px 14px',
                }}>
                  <MapPin size={18} color="#94A3B8" />
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#F8FAFC',
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {POPULAR_AREAS.map((a) => (
                      <option key={a} value={a} style={{ background: '#1E293B', color: '#F8FAFC' }}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.area.includes('أخرى') && (
                  <input
                    type="text"
                    placeholder="اكتب اسم مدينتك أو منطقتك هنا..."
                    value={formData.customAreaText}
                    onChange={(e) => setFormData({ ...formData, customAreaText: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: 12,
                      padding: '8px 14px',
                      fontSize: 13,
                      color: '#F8FAFC',
                      marginTop: 8,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
                  المساحة التقريبية (متر مربع)
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 14,
                  padding: '10px 14px',
                }}>
                  <Layers size={18} color="#94A3B8" />
                  <input
                    type="number"
                    min="20"
                    max="5000"
                    placeholder="150"
                    value={formData.unitAreaM2}
                    onChange={(e) => setFormData({ ...formData, unitAreaM2: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#F8FAFC',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      direction: 'ltr',
                      textAlign: 'right',
                    }}
                  />
                  <span style={{ fontSize: 12.5, color: '#94A3B8' }}>م²</span>
                </div>

                {/* Quick Area Chips */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {QUICK_AREAS_M2.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormData({ ...formData, unitAreaM2: m })}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        background: Number(formData.unitAreaM2) === m ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${Number(formData.unitAreaM2) === m ? '#38BDF8' : 'rgba(255,255,255,0.08)'}`,
                        color: Number(formData.unitAreaM2) === m ? '#38BDF8' : '#94A3B8',
                        fontSize: 11.5,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {m}م²
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Finishing Package Choice */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 800, marginBottom: 12, color: '#E2E8F0' }}>
              4. باقة ومستوى التشطيب المرغوب <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {PACKAGES.map((pkg) => {
                const isSelected = formData.package === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setFormData({ ...formData, package: pkg.id })}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                      border: `1.5px solid ${isSelected ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: 16,
                      padding: 16,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: isSelected ? '#38BDF8' : '#FFFFFF' }}>
                        {pkg.name}
                      </span>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 10,
                        background: isSelected ? '#38BDF8' : 'rgba(255,255,255,0.08)',
                        color: isSelected ? '#0F172A' : '#94A3B8',
                      }}>
                        {pkg.tag}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                      {pkg.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Additional Details (Inspection Date & Notes) */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 800, marginBottom: 12, color: '#E2E8F0' }}>
              5. موعد المعاينة وتفاصيل إضافية
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
                  الموعد المفضل لزيارة الموقع والمعاينة
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 14,
                  padding: '10px 14px',
                }}>
                  <Calendar size={18} color="#94A3B8" />
                  <input
                    type="date"
                    value={formData.inspectionDate}
                    onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#F8FAFC',
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      colorScheme: 'dark',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
                  حالة الوحدة الحالية
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: 14,
                    padding: '11px 14px',
                    color: '#F8FAFC',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="نصف تشطيب (محارة وحلوق)" style={{ background: '#1E293B' }}>نصف تشطيب (محارة وحلوق)</option>
                  <option value="على الطوب الأحمر (عظم)" style={{ background: '#1E293B' }}>على الطوب الأحمر (عظم)</option>
                  <option value="تشطيب قديم بحاجة لتجديد شامل" style={{ background: '#1E293B' }}>تشطيب قديم بحاجة لتجديد شامل</option>
                  <option value="مكتمل وبحاجة لديكورات وتعديلات فقط" style={{ background: '#1E293B' }}>مكتمل وبحاجة لديكورات وتعديلات فقط</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
                ملاحظات أو مواصفات خاصة ترغب بها (اختياري)
              </label>
              <textarea
                rows={3}
                placeholder="مثال: يفضل أسلوب المودرن مع باركيه في غرف النوم وبورسلين بالريسبشن وتعديل جدار المطبخ..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  color: '#F8FAFC',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #1877F2 0%, #10B981 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 16,
                padding: '16px 24px',
                fontSize: 16,
                fontWeight: 900,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 12px 28px -6px rgba(24, 119, 242, 0.45)',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                opacity: submitting ? 0.75 : 1,
              }}
            >
              {submitting ? (
                <>
                  <div style={{
                    width: 20,
                    height: 20,
                    border: '2.5px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                  جاري تسجيل طلبكم وإرساله...
                </>
              ) : (
                <>
                  <Send size={18} /> إرسال طلب المقايسة والمعاينة الآن
                </>
              )}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, color: '#64748B', marginTop: 4 }}>
            🔒 بياناتك مشفرة ومحمية بالكامل وتُستخدم فقط للتواصل الهندسي وتحديد التكلفة.
          </div>
        </form>

        {/* ─── Footer ─── */}
        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#64748B' }}>
          منصة تشطيب لإدارة المقاولات والمشاريع © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
