import React, { useState, useEffect } from 'react';
import {
  Building2, HardHat, FileText, CheckCircle2, TrendingUp, ShieldCheck,
  Zap, Users, Phone, MessageSquare, ArrowLeft, ArrowRight, Star, Clock, Award,
  Sparkles, Check, ChevronDown, ChevronUp, Lock, Laptop, Smartphone,
  ExternalLink, DollarSign, Calculator, Layers, HelpCircle, Menu, X,
  Wrench, Eye, Printer, Copy, Share2, Compass, AlertTriangle
} from 'lucide-react';

/* ─── Responsive & Luxury Custom Styles ─── */
const LANDING_STYLES = `
  @keyframes floatSlow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .landing-glass-card {
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(226, 232, 240, 0.85);
    box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.05);
  }
  .landing-feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 35px -10px rgba(217, 119, 6, 0.12);
    border-color: rgba(217, 119, 6, 0.35);
  }
  .preview-tab-btn {
    padding: 10px 18px;
    border-radius: 12px;
    font-size: 13.5px;
    font-weight: 800;
    cursor: pointer;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    font-family: inherit;
    white-space: nowrap;
  }
  .preview-tab-btn.active {
    background: #0F172A;
    color: #FFFFFF;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
  }
  .preview-tab-btn:not(.active) {
    background: rgba(241, 245, 249, 0.8);
    color: #64748B;
  }
  .preview-tab-btn:not(.active):hover {
    background: #E2E8F0;
    color: #0F172A;
  }

  @media (max-width: 768px) {
    .landing-desktop-nav { display: none !important; }
    .landing-mobile-menu-btn { display: flex !important; }
    .landing-header-ctas .hero-cta-text { display: none !important; }
    .landing-hero-btns { flex-direction: column !important; align-items: stretch !important; }
    .landing-hero-btns button { width: 100% !important; justify-content: center !important; }
    .landing-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .landing-features-grid { grid-template-columns: 1fr !important; }
    .landing-pricing-grid { grid-template-columns: 1fr !important; }
    .landing-comparison-table-wrapper { overflow-x: auto !important; }
    .landing-preview-tabs-scroll { overflow-x: auto; padding-bottom: 8px; }
  }
  @media (min-width: 769px) {
    .landing-mobile-menu-btn { display: none !important; }
    .landing-mobile-nav-overlay { display: none !important; }
  }
  .landing-mobile-nav-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 99999;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 24px;
  }
  .landing-mobile-nav-overlay a,
  .landing-mobile-nav-overlay .mnav-btn {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    text-decoration: none;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: color .2s;
  }
  .landing-mobile-nav-overlay a:hover,
  .landing-mobile-nav-overlay .mnav-btn:hover { color: #F59E0B; }
  .mnav-close {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(255,255,255,0.12);
    border: none;
    color: #fff;
    border-radius: 12px;
    padding: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

function useInjectStyle(css) {
  useEffect(() => {
    const id = 'tashteeb-landing-luxury-styles';
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = css;
  }, [css]);
}

export default function LandingPage({ onGoToLogin, onStartLiveDemo }) {
  useInjectStyle(LANDING_STYLES);

  const [activeFaq, setActiveFaq] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState('contracts'); // 'contracts' | 'portal' | 'boq' | 'snags'

  const waNumber = '201018160582';

  function openWhatsApp(msg) {
    const text = encodeURIComponent(
      msg || 'مرحباً، أرغب في الاستفسار والاشتراك في منصة تشطيب برو (Tashteeb Pro) لإدارة التشطيبات والمقاولات'
    );
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  }

  const features = [
    {
      icon: ShieldCheck,
      color: '#D97706',
      bg: 'rgba(217, 119, 6, 0.1)',
      title: 'محرّك عقود الصنايعية والورش 📜',
      desc: 'صياغة بنود فنية مشددة (استلام بالقِدة والميزان، شطف 45، كبس السباكة، عزل 48 ساعة) مع توقيع حي وختم وتصدير Word وPDF.'
    },
    {
      icon: Users,
      color: '#1877F2',
      bg: 'rgba(24, 119, 242, 0.1)',
      title: 'بوابة العميل الحية والتوقيع 🌐',
      desc: 'رابط خاص لكل عميل يتابع منه مراحل تشطيب شقته أو فيلته ونسب التنفيذ والصور الحية، توقف 90% من اتصالات "احنا فين يا بشمهندس؟".'
    },
    {
      icon: MessageSquare,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.1)',
      title: 'تقارير الواتساب الفورية 📱',
      desc: 'توليد تقرير هندسي دوري منسق بضغطة زر وإرساله مباشرة لواتساب العميل موضحاً نسب الإنجاز، بنود اليوم، والخطوات القادمة.'
    },
    {
      icon: Calculator,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.1)',
      title: 'حاسبة المقايسات والمقايسة الذكية ⚡',
      desc: 'حساب تلقائي لأسعار وتكاليف التشطيب (اقتصادي، سوبر لوكس، ألترا لوكس) وحساب هوامش الربح وتصدير عرض سعر رسمي في 3 دقائق.'
    },
    {
      icon: HardHat,
      color: '#EA580C',
      bg: 'rgba(234, 88, 12, 0.1)',
      title: 'استلامات الجودة الميدانية (Snags) ✅',
      desc: 'قوائم تفتيش هندسية رسمية قبل كل مرحلة (كهرباء، سباكة، محارة، دهان) وتحديد أماكن الملاحظات بصور حية على المخطط.'
    },
    {
      icon: TrendingUp,
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.1)',
      title: 'المالية وتكاليف ومصروفات المواقع 💰',
      desc: 'كشف حساب تفصيلي لكل موقع، تتبع الدفعات المستلمة والمصروفات الفعلية وهوامش الأرباح الحقيقية دون أي تداخل.'
    }
  ];

  const comparisonRows = [
    {
      feature: 'عقود صنايعية رسمية ببنود استلام فنية ملزمة',
      excel: '❌ لا توجد (اتفاقات شفهية أو واتساب ضائعة)',
      eleven: '⚠️ أرقام مصنعيات فقط في جداول محاسبية',
      tashteeb: '✅ محرّك عقود قانوني فني متكامل بختم وتوقيع وطباعة'
    },
    {
      feature: 'سهولة الاستخدام من الموبايل لمهندس الموقع',
      excel: '❌ تشتت الصور والرسائل في جروبات الواتساب',
      eleven: '⚠️ شاشات ERP مكتبية معقدة تتطلب وقتاً كبيراً',
      tashteeb: '✅ مصمم للموقع أولاً (زر إجراء سريع ⚡ + تسجيل صوتي)'
    },
    {
      feature: 'بوابة متابعة رقمية تفاعلية خاصة بالعميل',
      excel: '❌ اتصالات يومية مجهدة وإرسال صور عشوائي',
      eleven: '⚠️ منصة عملاء أساسية',
      tashteeb: '✅ بوابة تفاعلية حية بدون تطبيق + تقرير واتساب فوري'
    },
    {
      feature: 'سرعة التجربة والبدء في الاستخدام',
      excel: '❌ مجهود يدوي متواصل كل يوم',
      eleven: '❌ استمارة انتظار لمراجعة وموافقة فريق المبيعات',
      tashteeb: '✅ تجربة حية فورية بدون تسجيل وبدون أي انتظار 🚀'
    },
    {
      feature: 'شفافية الأسعار ومرونة الاشتراك',
      excel: 'مجاني لكن كلفته أخطاء ونزاعات بمئات الآلاف',
      eleven: '❌ أسعار مخفية ومبهمة للشركات الكبرى فقط',
      tashteeb: '✅ باقات معلنة وشفافة بالجنيه المصري وبدون عقود احتكار'
    },
    {
      feature: 'استلامات الجودة الهندسية (Snags) على المخططات',
      excel: '❌ تسجيل ورقي يتلف في الموقع',
      eleven: '⚠️ متابعة عامة لنسب إنجاز البنود',
      tashteeb: '✅ توثيق وتثبيت الملاحظات على المخطط وصور الإنجاز'
    }
  ];

  const pricingPlans = [
    {
      id: 'starter',
      name: 'باقة المكاتب الناشئة',
      subtitle: 'للمهندسين المستقلين والمكاتب ومقاولي التشطيب الأفراد',
      priceMonthly: 750,
      priceYearly: 590,
      currency: 'ج.م',
      badge: 'انطلاقة سريعة 🚀',
      features: [
        'إدارة حتى 5 مشاريع تشطيبات ومقاولات نشطة',
        'محرر عقود الصنايعية ومقاولي الباطن (غير محدود)',
        'توليد المقايسات الذكية وعروض الأسعار الفورية',
        'تقارير اليوميات وتتبع نسب الإنجاز بالصور',
        'حسابات مالية ومصروفات المواقع ومتابعة الدفعات',
        'تطبيق موبايل سريع لمهندس الموقع',
        'دعم فني هندسي عبر واتساب',
      ],
      popular: false,
    },
    {
      id: 'pro',
      name: 'باقة الشركات الاحترافية',
      subtitle: 'الخيار الأقوى لشركات التشطيبات والديكور والمقاولات العامة',
      priceMonthly: 1490,
      priceYearly: 1190,
      currency: 'ج.م',
      badge: 'الأكثر طلباً واختياراً ⭐',
      features: [
        'مشاريع تشطيبات ومقاولات غير محدودة',
        'محرّك عقود الصنايعية والعميل المعتمد مع الختم والتوقيع',
        'بوابة رقمية مخصصة لكل عميل لمتابعة شقته/فيلته حياً',
        'توليد تقارير الواتساب الدورية للعملاء بضغطة زر',
        'فحص استلامات الجودة (Snagging) والتثبيت على المخطط',
        'إدارة التوريدات والخامات وأوامر شغل الصنايعية',
        'حسابات الأرباح والتدفقات النقدية المركزية',
        'تخصيص هوية وشعار شركتك بالكامل على جميع المخرجات',
        'دعم فني ذو أولوية وتدريب فريق المهندسين مجاناً',
      ],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'باقة المؤسسات والمقاولات الكبرى',
      subtitle: 'للشركات متعددة الفروع والإدارات الهندسية الكبرى',
      priceMonthly: 2900,
      priceYearly: 2390,
      currency: 'ج.م',
      badge: 'إدارة شاملة متعددة الفروع 🏢',
      features: [
        'كل مميزات الباقة الاحترافية الشاملة',
        'إدارة شركات وفروع فرعية متعددة (Multi-Tenant Workspace)',
        'صلاحيات مستخدمين وأدوار مخصصة (مهندس موقع، محاسب، إدارة)',
        'ربط دومين مخصص باسم شركتك (app.yourcompany.com)',
        'تقارير محاسبية ومالية مركزية مجمعة لكافة المشاريع',
        'مزامنة سحابية غير محدودة وأمان بيانات معتمد',
        'مدير حساب هندسي مخصص وتدريب ميداني شامل',
      ],
      popular: false,
    }
  ];

  const faqs = [
    {
      q: 'هل أحتاج لمحاسب أو تدريب معقد لتشغيل المنصة؟',
      a: 'إطلاقاً! المنصة مبنية لتكون بسيطة ومفهومة لأي مهندس موقع أو صاحب شركة تشطيبات. لا قيود محاسبية ولا أذون معقدة؛ كل شيء يتم بالضغط على أزرار واضحة باللغة العربية وفي ثوانٍ.'
    },
    {
      q: 'كيف تحميني المنصة من هروب الصنايعية وسوء المصنعية؟',
      a: 'عبر محرّك عقود المقاولة المدمج؛ بمجرد اختيار نوع الصنعة (سيراميك، سباكة، كهرباء...) يدرج النظام بنود استلام هندسية ملزمة قانونياً (مثل الاستلام بالقِدة والميزان وتفريغ الهواء وشطف 45)، مع جدول دفعات مرتبط بالاستلام الفعلي وتوقيع وختم إلكتروني حي.'
    },
    {
      q: 'هل يمكنني تجربة النظام ببيانات حقيقية قبل دفع أي مليم؟',
      a: 'نعم بكل تأكيد وبدون أي حواجز! اضغط على زر "تجربة حية فوراً (Live Demo)" بأعلى الصفحة لتدخل مباشرة إلى النظام بكافة شاشاته وميزاته وبياناته التوضيحية دون حتى الحاجة لتسجيل حساب.'
    },
    {
      q: 'هل تعمل المنصة بسلاسة على موبايل المهندس في الموقع؟',
      a: 'نعم 100%! المنصة مصممة بأحدث تقنيات Progressive Web App لتفتح كأنها تطبيق سريع جداً على أجهزة iPhone وAndroid، مع زر "إجراء موقع سريع ⚡" لتسجيل اليوميات والملاحظات والصور فوراً من قلب الموقع.'
    },
    {
      q: 'كيف تفيدني بوابة العميل وتقارير الواتساب؟',
      a: 'العميل يستلم رابطاً خاصاً يرى فيه نسبة إنجاز فيلته أو شقته وصور التوثيق الحية وكشف الدفعات. كما يمكنك توليد تقرير واتساب دوري منسق بضغطة زر؛ هذا يبهر العميل ويوقف مكالمات الاستفسار اليومية ويثبت احترافية شركتك.'
    },
    {
      q: 'هل بيانات شركتي ومشاريعي آمنة ومعزولة؟',
      a: 'نعم، تعتمد منصة Tashteeb Pro على تشفير سحابي 256-bit وقواعد بيانات معزولة تماماً لكل شركة، مع نسخ احتياطي آلي يضمن عدم ضياع أي صورة أو عقد أو بيان مالي.'
    }
  ];

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      color: '#0F172A',
      fontFamily: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif",
      overflowX: 'hidden'
    }}>

      {/* ─── Top Notification Banner ─── */}
      <div style={{
        background: 'linear-gradient(90deg, #0F172A 0%, #1E3A8A 50%, #D97706 100%)',
        color: '#FFFFFF',
        padding: '9px 16px',
        textAlign: 'center',
        fontSize: 'clamp(12px, 1.8vw, 13.5px)',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
      }}>
        <span style={{
          background: 'rgba(255,255,255,0.18)',
          padding: '2px 8px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 800
        }}>
          عرض الإطلاق 🔥
        </span>
        <span>خصم شهرين مجاناً على الباقات السنوية + تخصيص هوية وشعار شركتك بالكامل مجاناً!</span>
        <button
          onClick={() => openWhatsApp('مرحباً، أرغب في الاستفادة من عرض الإطلاق الخاص بمنصة Tashteeb Pro')}
          style={{
            background: '#F59E0B',
            color: '#0F172A',
            border: 'none',
            padding: '3px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 900,
            cursor: 'pointer'
          }}
        >
          احصل عليه الآن ⚡
        </button>
      </div>

      {/* ─── Mobile Navigation Overlay ─── */}
      {mobileNavOpen && (
        <div className="landing-mobile-nav-overlay">
          <button className="mnav-close" onClick={() => setMobileNavOpen(false)}>
            <X size={24} />
          </button>
          <a href="#preview" onClick={() => setMobileNavOpen(false)}>المعاينة التفاعلية</a>
          <a href="#features" onClick={() => setMobileNavOpen(false)}>المميزات الحصرية</a>
          <a href="#comparison" onClick={() => setMobileNavOpen(false)}>لماذا تشطيب برو؟</a>
          <a href="#pricing" onClick={() => setMobileNavOpen(false)}>الأسعار والباقات</a>
          <a href="#faq" onClick={() => setMobileNavOpen(false)}>الأسئلة الشائعة</a>
          
          <button
            className="mnav-btn"
            onClick={() => { setMobileNavOpen(false); onStartLiveDemo(); }}
            style={{
              color: '#F59E0B',
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '10px 24px',
              borderRadius: 12,
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            ⚡ تجربة حية فوراً (Live Demo)
          </button>

          <button
            className="mnav-btn"
            onClick={() => { setMobileNavOpen(false); onGoToLogin('register'); }}
            style={{ color: '#10B981' }}
          >
            ✨ إنشاء حساب شركة جديد
          </button>
          
          <button
            className="mnav-btn"
            onClick={() => { setMobileNavOpen(false); onGoToLogin('login'); }}
            style={{ color: '#FFFFFF', fontSize: 16 }}
          >
            تسجيل الدخول
          </button>
        </div>
      )}

      {/* ─── 1. LUXURY STICKY NAVBAR ─── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 16px',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          {/* Logo & Platform Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              <img src="/app-icon.png" alt="Tashteeb Pro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                Tashteeb Pro <span style={{ color: '#D97706', fontWeight: 900 }}>| تشطيب برو</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>
                منظومة إدارة التشطيبات والمقاولات الميدانية
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="landing-desktop-nav" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            fontSize: 14,
            fontWeight: 700,
            color: '#475569'
          }}>
            <a href="#preview" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>المعاينة الحية</a>
            <a href="#features" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>المميزات</a>
            <a href="#comparison" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>لماذا نحن؟</a>
            <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>الأسعار</a>
            <a href="#faq" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>الأسئلة الشائعة</a>
          </nav>

          {/* Header CTAs */}
          <div className="landing-header-ctas" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={onStartLiveDemo}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                transition: 'all .15s ease'
              }}
            >
              <Sparkles size={15} />
              <span className="hero-cta-text">تجربة حية (Live Demo)</span>
            </button>

            <button
              onClick={() => onGoToLogin('login')}
              style={{
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 10,
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1.5px solid #E2E8F0',
                cursor: 'pointer',
              }}
            >
              <Lock size={14} />
              <span className="hero-cta-text">تسجيل الدخول</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              className="landing-mobile-menu-btn"
              onClick={() => setMobileNavOpen(true)}
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
                borderRadius: 10,
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                color: '#0F172A'
              }}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section style={{
        padding: 'clamp(40px, 7vw, 85px) 16px clamp(40px, 6vw, 75px)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(245, 158, 11, 0.08) 0%, rgba(248, 250, 252, 1) 70%)'
      }}>
        <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          
          {/* Top Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 30,
            background: 'rgba(217, 119, 6, 0.1)',
            color: '#B45309',
            fontSize: 13,
            fontWeight: 800,
            border: '1px solid rgba(217, 119, 6, 0.25)',
            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)'
          }}>
            <Award size={15} />
            <span>المنصة الميدانية رقم #1 لشركات التشطيبات والديكور والمقاولات 🏛️</span>
          </div>

          {/* Main Hero Headline */}
          <h1 style={{
            fontSize: 'clamp(30px, 5.5vw, 54px)',
            fontWeight: 900,
            lineHeight: 1.25,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            margin: 0
          }}>
            ودّع فوضى الواتساب ونزاعات الصنايعية..<br />
            <span style={{
              background: 'linear-gradient(135deg, #D97706 0%, #EA580C 50%, #B45309 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              أدِر مواقعك وعقودك ومقايساتك من الموبايل
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(15px, 2.2vw, 18.5px)',
            color: '#475569',
            lineHeight: 1.65,
            maxWidth: 780,
            margin: 0,
            fontWeight: 500
          }}>
            النظام السحابي الأول المصمم لحماية أرباحك في قلب الموقع — محرّك عقود فني ملزم للصنايعية، بوابة متابعة رقمية وتقارير واتساب تريحك من اتصالات العميل المجهدة، ومتابعة فورية للمصروفات ونسب الإنجاز.
          </p>

          {/* Action Buttons */}
          <div className="landing-hero-btns" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 10,
            width: '100%',
            maxWidth: 620
          }}>
            <button
              onClick={onStartLiveDemo}
              style={{
                padding: '15px 32px',
                fontSize: 16,
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(217, 119, 6, 0.4)',
                transition: 'transform .15s ease'
              }}
            >
              <Sparkles size={19} />
              <span>ابدأ التجربة الحية فوراً (بدون تسجيل) ⚡</span>
            </button>

            <button
              onClick={() => onGoToLogin('register')}
              style={{
                padding: '15px 28px',
                fontSize: 15.5,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 14,
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                transition: 'transform .15s ease'
              }}
            >
              <CheckCircle2 size={18} />
              <span>إنشاء حساب شركة جديد ✨</span>
            </button>

            <button
              onClick={() => openWhatsApp('مرحباً، أرغب في استشارة ومعرفة مميزات منصة تشطيب برو لشركتنا')}
              style={{
                padding: '14px 24px',
                fontSize: 14.5,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 14,
                background: '#FFFFFF',
                color: '#15803D',
                border: '1.5px solid #BBF7D0',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.08)'
              }}
            >
              <MessageSquare size={17} color="#25D366" />
              <span>استفسار واتساب سريع</span>
            </button>
          </div>

          {/* Trust Value Points */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: 12.5,
            fontWeight: 700,
            color: '#64748B',
            marginTop: 6
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Check size={15} color="#10B981" /> تفعيل فوري بدون انتظار موافقة
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Check size={15} color="#10B981" /> يعمل على كافة الموبايلات والكمبيوتر
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Check size={15} color="#10B981" /> لا يشترط بطاقة بنكية للتجربة
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="landing-stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            width: '100%',
            maxWidth: 860,
            marginTop: 28,
            background: '#FFFFFF',
            padding: '20px 24px',
            borderRadius: 20,
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.05)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(20px, 4vw, 30px)', fontWeight: 900, color: '#D97706', letterSpacing: '-0.02em' }}>+450</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, marginTop: 2 }}>موقع قيد المتابعة الحية</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(20px, 4vw, 30px)', fontWeight: 900, color: '#1877F2', letterSpacing: '-0.02em' }}>+1,450</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, marginTop: 2 }}>عقد مصنعية تم توثيقه</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(20px, 4vw, 30px)', fontWeight: 900, color: '#10B981', letterSpacing: '-0.02em' }}>3 دقائق</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, marginTop: 2 }}>لاستخراج مقايسة BOQ كاملة</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(20px, 4vw, 30px)', fontWeight: 900, color: '#8B5CF6', letterSpacing: '-0.02em' }}>18 ساعة</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, marginTop: 2 }}>توفير أسبوعي لكل مهندس</div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 3. INTERACTIVE FEATURE SHOWCASE ─── */}
      <section id="preview" style={{ padding: 'clamp(40px, 6vw, 70px) 16px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ color: '#D97706', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
            معاينة حية من داخل النظام
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginTop: 8, color: '#0F172A' }}>
            شاهد كيف تدار أعمالك باحترافية وسرعة
          </h2>
          <p style={{ color: '#64748B', fontSize: 15, maxWidth: 650, margin: '8px auto 0' }}>
            اضغط على التبويبات بالأسفل لتستعرض قوة وتفاصيل كل أداة صُممت خصيصاً لمشاريع التشطيب.
          </p>
        </div>

        {/* Interactive Tabs Strip */}
        <div className="landing-preview-tabs-scroll" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          <button
            className={`preview-tab-btn ${previewTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setPreviewTab('contracts')}
          >
            <ShieldCheck size={16} /> عقود الصنايعية والورش 📜
          </button>
          <button
            className={`preview-tab-btn ${previewTab === 'portal' ? 'active' : ''}`}
            onClick={() => setPreviewTab('portal')}
          >
            <Users size={16} /> بوابة العميل والواتساب 🌐
          </button>
          <button
            className={`preview-tab-btn ${previewTab === 'boq' ? 'active' : ''}`}
            onClick={() => setPreviewTab('boq')}
          >
            <Calculator size={16} /> المقايسات الذكية ⚡
          </button>
          <button
            className={`preview-tab-btn ${previewTab === 'snags' ? 'active' : ''}`}
            onClick={() => setPreviewTab('snags')}
          >
            <HardHat size={16} /> استلامات الجودة واليوميات ✅
          </button>
        </div>

        {/* Preview Frame Box */}
        <div style={{
          background: '#0F172A',
          borderRadius: 22,
          padding: 'clamp(16px, 3vw, 24px)',
          color: '#FFFFFF',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Mock Browser Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 14, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#EF4444' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#F59E0B' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 12, color: '#94A3B8', marginRight: 12, fontWeight: 700 }}>
                {previewTab === 'contracts' && 'مركز العقود الرسمية — مشارطة مقاولة باطن ومصنعية'}
                {previewTab === 'portal' && 'بوابة متابعة العميل الحية — تشطيب فيلا النرجس'}
                {previewTab === 'boq' && 'حاسبة المقايسات الفورية وتوليد عروض الأسعار BOQ'}
                {previewTab === 'snags' && 'سجل استلامات الجودة وفحص الموقع الهندسي'}
              </span>
            </div>
            <button
              onClick={onStartLiveDemo}
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#F59E0B',
                border: 'none',
                padding: '4px 12px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              فتح النظام بالكامل ↗
            </button>
          </div>

          {/* Tab 1: Contracts Engine Preview */}
          {previewTab === 'contracts' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: '#1E293B', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 12, color: '#93C5FD', fontWeight: 800, marginBottom: 8 }}>📜 نموذج عقد سيراميك وبورسلين معتمد</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>الطرف الأول (الشركة) vs الطرف الثاني (المعلم/الصنايعي)</div>
                <ul style={{ fontSize: 12.5, color: '#CBD5E1', lineHeight: 1.8, paddingRight: 18, margin: 0 }}>
                  <li>الاستواء التام واستخدام قِدة ألومنيوم 3 متر وميزان ليزر وانعدام أي تسنين.</li>
                  <li>شطف وتفريغ أركان الحوائط البارزة بزاوية 45 درجة بماكينة قص المياه.</li>
                  <li>فرد المونة أو مادة اللصق بنسبة 100% ومنع التطبيل وتفريغ الهواء تماماً.</li>
                  <li>غرامة تأخير 250 ج.م عن كل يوم + حجز 10% ضمان لحين التسليم النهائي.</li>
                </ul>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <span style={{ background: '#10B981', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>✓ توقيع باللمس</span>
                  <span style={{ background: '#D97706', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>✓ ختم الشركة</span>
                  <span style={{ background: '#2563EB', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>✓ تصدير PDF وWord</span>
                </div>
              </div>
              <div style={{ background: '#1E293B', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 800, marginBottom: 6 }}>⚡ النتيجة الميدانية المباشرة</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#FFFFFF', marginBottom: 8 }}>انعدام تام لنزاعات الصنايعية ومصنعية الشغل</div>
                  <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                    الصنايعي يعلم مسبقاً أن استلام مستحقاته مرهون بالبنود الفنية المكتوبة، مما يرفع جودة التنفيذ ويوفر عليك تكاليف تكسير وإعادة الشغل.
                  </p>
                </div>
                <button
                  onClick={onStartLiveDemo}
                  style={{
                    marginTop: 16,
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: '#D97706',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  جرّب محرر العقود بنفسك الآن 📜
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Client Portal Preview */}
          {previewTab === 'portal' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: '#1E293B', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>موقع: فيلا أ. حسام الدين — التجمع الخامس</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>رابط العميل المباشر الآمن</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#10B981' }}>85% إنجاز</div>
                </div>
                <div style={{ background: '#0F172A', padding: 12, borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>آخر تحديث بالصور: اليوم الساعة 11:30 ص</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>تم الانتهاء من وش البطانة بدهانات الصالون وغرف النوم</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ background: '#25D366', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>📱 تقرير واتساب فوري</span>
                  <span style={{ background: '#3B82F6', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>🌐 فتح البوابة للعميل</span>
                </div>
              </div>
              <div style={{ background: '#1E293B', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#10B981', fontWeight: 800, marginBottom: 6 }}>🌟 راحة البال وانبهار العميل</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#FFFFFF', marginBottom: 8 }}>العميل شريك مطمئن لا متصل قلق</div>
                  <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                    بدلاً من إرسال مئات الصور العشوائية على واتساب، يفتح العميل رابطاً فاخراً بشعار شركتك يرى فيه كل شيء، مما يدفعه لترشيح شركتك لجميع أصدقائه.
                  </p>
                </div>
                <button
                  onClick={onStartLiveDemo}
                  style={{
                    marginTop: 16,
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: '#1877F2',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  استعرض بوابة العميل الحية 🌐
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: BOQ Calculator Preview */}
          {previewTab === 'boq' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: '#1E293B', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 12, color: '#A78BFA', fontWeight: 800, marginBottom: 6 }}>⚡ حاسبة تكاليف مقايسة شقة 180 م²</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div style={{ background: '#0F172A', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>سوبر لوكس</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F59E0B' }}>3,850 ج.م / م²</div>
                  </div>
                  <div style={{ background: '#0F172A', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>ألترا لوكس</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>5,600 ج.م / م²</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#CBD5E1' }}>
                  توليد بنود المقايسة التفصيلية (أعمال مدنية، سباكة، كهرباء، عزل، دهانات، جبس بورد) بنقرة زر.
                </div>
              </div>
              <div style={{ background: '#1E293B', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 800, marginBottom: 6 }}>⚡ سرعة إغلاق الصفقات</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#FFFFFF', marginBottom: 8 }}>أرسل عرض السعر قبل نهاية الاجتماع!</div>
                  <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                    لا داعي للانتظار يومين لعمل المقايسة؛ احسب الأمتار وهوامش الربح وصدر PDF فاخر يحمل شعار شركتك في 3 دقائق واكسب العميل فوراً.
                  </p>
                </div>
                <button
                  onClick={onStartLiveDemo}
                  style={{
                    marginTop: 16,
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: '#8B5CF6',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  جرّب حاسبة المقايسات الآن ⚡
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Snags & Site Logs Preview */}
          {previewTab === 'snags' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: '#1E293B', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 12, color: '#F97316', fontWeight: 800, marginBottom: 6 }}>🔍 استلامات الجودة الميدانية (Snag List)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  <div style={{ background: '#0F172A', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12 }}>اختبار كبس شبكة التغذية على 12 بار</span>
                    <span style={{ color: '#10B981', fontWeight: 800, fontSize: 11 }}>✓ تم الاستلام</span>
                  </div>
                  <div style={{ background: '#0F172A', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12 }}>اختبار عزل أرضية الحمام بالغمر 48 ساعة</span>
                    <span style={{ color: '#10B981', fontWeight: 800, fontSize: 11 }}>✓ معتمد</span>
                  </div>
                  <div style={{ background: '#0F172A', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12 }}>معالجة تسنين بلاطة مدخل الصالون</span>
                    <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: 11 }}>⏳ قيد المعالجة</span>
                  </div>
                </div>
              </div>
              <div style={{ background: '#1E293B', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#EA580C', fontWeight: 800, marginBottom: 6 }}>✅ تسليم الموقع بدون أي أخطاء</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#FFFFFF', marginBottom: 8 }}>لا تفاجأ بملاحظات كارثية عند التسليم</div>
                  <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                    كل مرحلة تُستلم ببوابة جودة رسمية موثقة بالصور؛ لن ينتقل الموقع من السباكة إلى السيراميك إلا بعد اعتماد الاختبار والتوقيع.
                  </p>
                </div>
                <button
                  onClick={onStartLiveDemo}
                  style={{
                    marginTop: 16,
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: '#EA580C',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  استعرض بوابات الجودة والاستلام 🔍
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── 4. BRUTAL COMPARISON SECTION (WHY TASHTEEB PRO?) ─── */}
      <section id="comparison" style={{
        padding: 'clamp(48px, 6vw, 80px) 16px',
        background: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{ color: '#D97706', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
              مقارنة صريحة ومباشرة
            </span>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginTop: 8, color: '#0F172A' }}>
              لماذا تختار تشطيب برو بدلاً من البدائل الأخرى؟
            </h2>
            <p style={{ color: '#64748B', fontSize: 15, maxWidth: 650, margin: '8px auto 0' }}>
              نظرة موضوعية توضح الفارق بين إدارة الموقع الحقيقية والبرامج المكتبية التقليدية.
            </p>
          </div>

          <div className="landing-comparison-table-wrapper" style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: '#0F172A', color: '#FFFFFF' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 800, width: '30%' }}>الميزة / المعيار</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, width: '22%', color: '#94A3B8' }}>شيتات إكسيل وواتساب</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, width: '24%', color: '#CBD5E1' }}>برامج الـ ERP المكتبية العامة</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, width: '24%', background: 'linear-gradient(135deg, #D97706, #B45309)', color: '#fff' }}>
                    تشطيب برو (Tashteeb Pro) 🏆
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
                    }}
                  >
                    <td style={{ padding: '16px 20px', fontWeight: 800, color: '#0F172A' }}>
                      {row.feature}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#64748B', fontSize: 13 }}>
                      {row.excel}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#475569', fontSize: 13 }}>
                      {row.eleven}
                    </td>
                    <td style={{
                      padding: '16px 20px',
                      fontWeight: 800,
                      color: '#0F172A',
                      background: 'rgba(217, 119, 6, 0.05)',
                      borderRight: '2px solid #D97706'
                    }}>
                      {row.tashteeb}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button
              onClick={onStartLiveDemo}
              style={{
                padding: '12px 28px',
                borderRadius: 12,
                background: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)'
              }}
            >
              جرّب الفرق بنفسك على أرض الواقع (Live Demo) 🚀
            </button>
          </div>
        </div>
      </section>

      {/* ─── 5. THE 6 CORE MODULES ─── */}
      <section id="features" style={{ padding: 'clamp(48px, 6vw, 75px) 16px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <span style={{ color: '#D97706', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
            منظومة هندسية متكاملة
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginTop: 8, color: '#0F172A' }}>
            كل ما تحتاجه لإدارة الموقع من الألف إلى الياء
          </h2>
          <p style={{ color: '#64748B', fontSize: 15, maxWidth: 650, margin: '8px auto 0' }}>
            أدوات متصلة في شاشة واحدة توفر وقتك وتحفظ حقوقك وحقوق عملائك.
          </p>
        </div>

        <div className="landing-features-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20
        }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="landing-feature-card"
                style={{
                  background: '#FFFFFF',
                  padding: '24px 26px',
                  borderRadius: 18,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                  transition: 'all .25s ease'
                }}
              >
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: f.bg,
                  color: f.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={24} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 6. TRANSPARENT PRICING PLANS ─── */}
      <section id="pricing" style={{
        padding: 'clamp(48px, 6vw, 80px) 16px',
        background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(245, 158, 11, 0.04) 100%)',
        borderTop: '1px solid #E2E8F0'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{ color: '#D97706', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>
              اشتراكات شفافة وعادلة
            </span>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginTop: 8, color: '#0F172A' }}>
              باقات تناسب نمو وتطور شركتك
            </h2>
            <p style={{ color: '#64748B', fontSize: 15, maxWidth: 620, margin: '8px auto 0' }}>
              لا توجد أسعار مخفية ولا رسوم تفعيل إضافية. يمكنك الترقية أو إلغاء الاشتراك في أي وقت.
            </p>

            {/* Monthly / Yearly Switcher */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFFFFF',
              padding: '6px 8px',
              borderRadius: 30,
              border: '1px solid #E2E8F0',
              marginTop: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '8px 18px',
                  borderRadius: 24,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: billingCycle === 'monthly' ? '#D97706' : 'transparent',
                  color: billingCycle === 'monthly' ? '#FFFFFF' : '#64748B',
                  transition: 'all .2s'
                }}
              >
                الدفع الشهري
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                style={{
                  padding: '8px 18px',
                  borderRadius: 24,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: billingCycle === 'yearly' ? '#D97706' : 'transparent',
                  color: billingCycle === 'yearly' ? '#FFFFFF' : '#64748B',
                  transition: 'all .2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>الدفع السنوي</span>
                <span style={{
                  background: billingCycle === 'yearly' ? 'rgba(255,255,255,0.25)' : '#DCFCE7',
                  color: billingCycle === 'yearly' ? '#FFFFFF' : '#15803D',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 900
                }}>
                  وفر شهرين مجاناً 🎁
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="landing-pricing-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 22,
            alignItems: 'stretch'
          }}>
            {pricingPlans.map((p) => {
              const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;

              return (
                <div
                  key={p.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 22,
                    padding: 'clamp(22px, 3vw, 32px)',
                    border: p.popular ? '2.5px solid #D97706' : '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: p.popular ? '0 16px 40px rgba(217, 119, 6, 0.16)' : '0 4px 16px rgba(0,0,0,0.03)',
                  }}
                >
                  {p.popular && (
                    <div style={{
                      position: 'absolute',
                      top: -14,
                      right: 24,
                      background: 'linear-gradient(135deg, #D97706, #B45309)',
                      color: '#FFFFFF',
                      padding: '4px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 900,
                      boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)'
                    }}>
                      {p.badge}
                    </div>
                  )}

                  <h3 style={{ fontSize: 21, fontWeight: 900, margin: 0, color: '#0F172A' }}>{p.name}</h3>
                  <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 20px', lineHeight: 1.5 }}>{p.subtitle}</p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 }}>
                    <span style={{ fontSize: 42, fontWeight: 900, color: '#0F172A' }}>{price}</span>
                    <span style={{ fontSize: 14, color: '#64748B', fontWeight: 800 }}>{p.currency} / شهرياً</span>
                  </div>

                  {/* Features Checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1, marginBottom: 24 }}>
                    {p.features.map((feat, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5 }}>
                        <Check size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ color: '#0F172A', fontWeight: 600 }}>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Plan CTA */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={() => openWhatsApp(`مرحباً، أرغب في الاشتراك في (${p.name}) بسعر ${price} ${p.currency} بنظام الدفع (${billingCycle === 'yearly' ? 'السنوي' : 'الشهري'})`)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 12,
                        fontSize: 14.5,
                        fontWeight: 900,
                        cursor: 'pointer',
                        border: 'none',
                        background: p.popular ? 'linear-gradient(135deg, #D97706, #B45309)' : '#0F172A',
                        color: '#FFFFFF',
                        boxShadow: p.popular ? '0 6px 18px rgba(217, 119, 6, 0.35)' : 'none',
                      }}
                    >
                      اشترك الآن وتحدث مع المبيعات 💬
                    </button>
                    <button
                      onClick={onStartLiveDemo}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: 10,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: 'transparent',
                        border: '1px dashed #CBD5E1',
                        color: '#64748B',
                      }}
                    >
                      أو جرّب الباقة بالنسخة الحية أولاً ↗
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 7. FAQ SECTION ─── */}
      <section id="faq" style={{ padding: 'clamp(48px, 6vw, 75px) 16px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{ color: '#D97706', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>
            كل ما يدور في ذهنك
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, color: '#0F172A', marginTop: 6 }}>
            الأسئلة الأكثر شيوعاً
          </h2>
          <p style={{ color: '#64748B', fontSize: 14.5, marginTop: 4 }}>
            إجابات واضحة ومباشرة تهم مديري شركات التشطيبات ومقاولي الباطن.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'right',
                    cursor: 'pointer',
                    fontSize: 15.5,
                    fontWeight: 800,
                    color: '#0F172A',
                  }}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={20} color="#D97706" /> : <ChevronDown size={20} color="#64748B" />}
                </button>

                {isOpen && (
                  <div style={{
                    padding: '0 22px 20px',
                    fontSize: 14.5,
                    color: '#475569',
                    lineHeight: 1.7,
                    borderTop: '1px dashed #E2E8F0',
                    paddingTop: 14
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 8. FINAL CALL TO ACTION ─── */}
      <section style={{
        padding: 'clamp(50px, 7vw, 85px) 16px',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#FFFFFF',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{
            background: 'rgba(217, 119, 6, 0.2)',
            color: '#F59E0B',
            padding: '4px 14px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 800,
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            ابدأ ثورة التنظيم في شركتك اليوم ⚡
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            جاهز لحماية أرباحك وتوثيق عقودك وراحة بالك من فوضى الميدان؟
          </h2>
          <p style={{ fontSize: 16, color: '#94A3B8', lineHeight: 1.65, maxWidth: 620, margin: 0 }}>
            انضم الآن لعشرات مكاتب وشركات التشطيبات التي تعتمد على تشطيب برو لتسليم مشاريعها باحترافية وسرعة قياسية.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
            <button
              onClick={onStartLiveDemo}
              style={{
                padding: '14px 32px',
                fontSize: 16,
                fontWeight: 900,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #D97706, #B45309)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(217, 119, 6, 0.4)'
              }}
            >
              دخول النسخة الحية فوراً (Demo) 🚀
            </button>
            <button
              onClick={() => onGoToLogin('register')}
              style={{
                padding: '14px 28px',
                fontSize: 15.5,
                fontWeight: 800,
                borderRadius: 14,
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
              }}
            >
              تسجيل حساب شركة جديد ✨
            </button>
          </div>
        </div>
      </section>

      {/* ─── 9. FOOTER ─── */}
      <footer style={{
        background: '#090D16',
        color: '#F8FAFC',
        padding: '36px 16px 24px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#0F172A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
              boxShadow: '0 3px 10px rgba(0,0,0,0.3)'
            }}>
              <img src="/app-icon.png" alt="Tashteeb Pro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontWeight: 900, fontSize: 17, color: '#fff' }}>منصة تشطيب برو — Tashteeb Pro</span>
          </div>

          <p style={{ color: '#94A3B8', fontSize: 13, maxWidth: 540, margin: 0, lineHeight: 1.6 }}>
            المنظومة السحابية الميدانية الأحدث لإدارة شركات ومكاتب التشطيبات والديكور والمقاولات في مصر والعالم العربي.
          </p>

          <div style={{ display: 'flex', gap: 18, fontSize: 13, color: '#CBD5E1', marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={onStartLiveDemo}>تجربة حية فورية</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => openWhatsApp('استفسار عن منصة Tashteeb Pro')}>تواصل واتساب</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => onGoToLogin('login')}>بوابة الدخول</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => onGoToLogin('register')}>إنشاء حساب</span>
          </div>

          <div style={{ fontSize: 12, color: '#64748B', marginTop: 14 }}>
            جميع الحقوق محفوظة © {new Date().getFullYear()} Tashteeb Pro • اتصال سحابي آمن مشفر 256-bit
          </div>
        </div>
      </footer>

    </div>
  );
}
