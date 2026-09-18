import React, { useState, useEffect } from 'react';
import {
  Building2, HardHat, FileText, CheckCircle2, TrendingUp, ShieldCheck,
  Zap, Users, Phone, MessageSquare, ArrowLeft, ArrowRight, Star, Clock, Award,
  Sparkles, Check, ChevronDown, ChevronUp, Lock, Laptop, Smartphone,
  ExternalLink, DollarSign, Calculator, Layers, HelpCircle, Menu, X,
  Wrench, Eye, Printer, Copy, Share2, Compass, AlertTriangle, Rocket, LayoutDashboard
} from 'lucide-react';

/* ─── Modern White / Light SaaS Luxury CSS ─── */
const LANDING_LIGHT_STYLES = `
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(1.05); }
  }
  @keyframes floatSoft {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Light Luxury Cards */
  .ws-white-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03);
    border-radius: 24px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .ws-white-card:hover {
    border-color: #CBD5E1;
    box-shadow: 0 20px 35px -5px rgba(15, 23, 42, 0.08), 0 10px 15px -5px rgba(15, 23, 42, 0.04);
    transform: translateY(-4px);
  }

  .ws-pillar-white-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 24px;
    padding: 32px 24px;
    transition: all 0.3s ease;
    text-align: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
  }
  .ws-pillar-white-card:hover {
    border-color: #6366F1;
    transform: translateY(-5px);
    box-shadow: 0 20px 35px -10px rgba(99, 102, 241, 0.15);
  }

  .ws-coral-btn {
    background: linear-gradient(135deg, #FF5722 0%, #EA580C 100%);
    color: #FFFFFF;
    border: none;
    cursor: pointer;
    font-weight: 800;
    transition: all 0.25s ease;
    box-shadow: 0 8px 20px rgba(234, 88, 12, 0.3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
  }
  .ws-coral-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 26px rgba(234, 88, 12, 0.45);
    filter: brightness(1.05);
  }

  .preview-tab-btn-light {
    padding: 11px 20px;
    border-radius: 9999px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid #E2E8F0;
    background: #F8FAFC;
    color: #475569;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    font-family: inherit;
    white-space: nowrap;
  }
  .preview-tab-btn-light.active {
    background: #4F46E5;
    color: #FFFFFF;
    border-color: #4F46E5;
    box-shadow: 0 6px 18px rgba(79, 70, 229, 0.3);
  }
  .preview-tab-btn-light:not(.active):hover {
    background: #EEF2FF;
    color: #4338CA;
    border-color: #C7D2FE;
  }

  /* Responsive Adjustments & Mobile Nav */
  @media (max-width: 900px) {
    .ws-desktop-nav-links { display: none !important; }
    .landing-mobile-menu-btn { display: flex !important; align-items: center; justify-content: center; }
    .ws-floating-nav { padding: 10px 16px !important; width: calc(100% - 24px) !important; }
    .ws-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
    .ws-pillars-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .ws-pricing-grid { grid-template-columns: 1fr !important; }
    .ws-timeline-card-wrapper { width: 100% !important; padding-right: 48px !important; padding-left: 0 !important; text-align: right !important; }
    .ws-timeline-line { right: 20px !important; left: auto !important; }
    .ws-timeline-dot { right: 6px !important; left: auto !important; }
  }
  @media (max-width: 600px) {
    .ws-stats-grid { grid-template-columns: 1fr !important; }
    .ws-pillars-grid { grid-template-columns: 1fr !important; }
    .ws-hero-cta-group { flex-direction: column !important; width: 100% !important; }
    .ws-hero-cta-group button { width: 100% !important; }
    .ws-quick-value-grid { grid-template-columns: 1fr !important; }
  }
`;

function useInjectStyle(css) {
  useEffect(() => {
    const id = 'tashteeb-landing-white-styles';
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = css;
  }, [css]);
}

export default function LandingPage({ onGoToLogin }) {
  useInjectStyle(LANDING_LIGHT_STYLES);

  const [activeFaq, setActiveFaq] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState('contracts'); // 'contracts' | 'portal' | 'boq' | 'snags'

  const handleStartTrial = () => {
    if (onGoToLogin) {
      onGoToLogin('register');
    }
  };

  const waNumber = '201018160582';

  function openWhatsApp(msg) {
    const text = encodeURIComponent(
      msg || 'مرحباً، أرغب في الاستفسار والاشتراك في منصة تشطيب برو (Tashteeb Pro) لإدارة التشطيبات والمقاولات'
    );
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  }

  // 4 بطاقات فهم سريع للقيمة الفورية
  const quickValues = [
    {
      icon: ShieldCheck,
      color: '#EA580C',
      bg: '#FFF7ED',
      border: '#FED7AA',
      title: 'عقود صنايعية رسمية ملزمة',
      desc: 'بنود استلام هندسية (قِدة وميزان، شطف 45، كبس السباكة) تمنع هروب العمالة وسوء التنفيذ مع توقيع إلكتروني حي.'
    },
    {
      icon: Calculator,
      color: '#4F46E5',
      bg: '#EEF2FF',
      border: '#C7D2FE',
      title: 'مقايسات ذكية وحساب المتر',
      desc: 'حساب تلقائي لأسعار بنود التشطيب والمواد وتحديد نسبة أرباحك وتصدير عرض سعر PDF رسمي للعميل في 3 دقائق.'
    },
    {
      icon: Users,
      color: '#059669',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      title: 'بوابة العميل وتقارير الواتساب',
      desc: 'رابط خاص للعميل يتابع منه نسب إنجاز شقته ومستخلصاته المالية، مع إرسال تقرير واتساب دوري بضغطة زر.'
    },
    {
      icon: DollarSign,
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
      title: 'كشف حساب المواقع والأرباح',
      desc: 'إغلاق مالي لكل مشروع: تتبع فواتير الخامات، عُهد المهندسين، ومستحقات الورش دون تداخل بين المشاريع.'
    }
  ];

  // أركان القوة الأربعة
  const pillars = [
    {
      icon: HardHat,
      color: '#0284C7',
      title: 'التحكم الميداني للمهندس',
      desc: 'تسجيل اليوميات، نسب الإنجاز بالصور، استلامات الجودة، وحصر العمالة لحظياً من الموقع عبر تطبيق سريع على الموبايل.',
    },
    {
      icon: DollarSign,
      color: '#059669',
      title: 'المالية والمصروفات المغلقة',
      desc: 'تتبع الدفعات المستلمة من العميل، فواتير التوريدات، مسحوبات الصنايعية، وحساب صافي أرباح شركتك بدقة متناهية.',
    },
    {
      icon: Zap,
      color: '#EA580C',
      title: 'أتمتة وتقارير بضغطة زر',
      desc: 'تنبيهات فورية بالانحراف عن الميزانية أو الجدول الزمني، وتوليد تقارير هندسية متكاملة للواتساب والطباعة فورياً.',
    },
    {
      icon: ShieldCheck,
      color: '#6366F1',
      title: 'حماية سحابية وأمان بنكي',
      desc: 'تشفير سحابي 256-bit، عزل تام لبيانات ومشاريع كل شركة، ونسخ احتياطي فوري ومستمر لضمان عدم ضياع أي ملف.',
    },
  ];

  // محطات رحلة النجاح (Timeline)
  const timelineMilestones = [
    {
      badge: 'المحطة الأولى ⚡',
      title: 'المقايسة الذكية وحساب تكلفة المتر',
      desc: 'تحديد مواصفات التشطيب (اقتصادي، سوبر لوكس، الترا لوكس) وتوليد مقايسة BOQ متكاملة بهامش ربحك وعرض سعر رسمي في 3 دقائق.',
      highlight: 'توفير أكثر من 6 ساعات في إعداد كل عرض سعر',
      side: 'right',
    },
    {
      badge: 'المحطة الثانية 🏗️',
      title: 'إطلاق الموقع وجداول غانت وتوثيق اليوميات',
      desc: 'توزيع المهندسين على المشاريع ومتابعة الجدول الزمني لكل مرحلة (تأسيس، عزل، سيراميك، دهانات) وتوثيق الإنجاز بالصور.',
      highlight: 'سيطرة بصرية كاملة على كافة مواقعك في مكان واحد',
      side: 'left',
    },
    {
      badge: 'المحطة الثالثة 📜',
      title: 'عقود الصنايعية ببنود استلام هندسية ملزمة',
      desc: 'محرّك عقود قانوني فني متقدم يدرج بنود استلام حاسمة (استواء السطح بالقِدة، شطف 45، كبس السباكة 48 ساعة) مع ختم وتوقيع حي.',
      highlight: 'حماية كاملة لشركتك من هروب الصنايعية وأخطاء المصنعيات',
      side: 'right',
    },
    {
      badge: 'المحطة الرابعة 🌐',
      title: 'بوابة العميل الرقمية وتقارير الواتساب',
      desc: 'رابط مباشر لكل عميل يتابع منه مراحل تشطيب شقته أو فيلته والدفعات، مع تقرير واتساب دوري يبهر العميل ويثبت احترافيتك.',
      highlight: 'توقف 90% من اتصالات العميل المجهدة وتعزز ثقته',
      side: 'left',
    },
  ];

  const comparisonRows = [
    {
      feature: 'عقود صنايعية رسمية ببنود استلام فنية ملزمة',
      excel: '❌ لا توجد (اتفاقات شفهية أو رسائل واتساب ضائعة)',
      eleven: '⚠️ أرقام مصنعيات فقط في جداول محاسبية عامة',
      tashteeb: '✅ محرّك عقود فني متكامل ببنود ملزمة وختم وتوقيع'
    },
    {
      feature: 'سهولة الاستخدام من الموبايل لمهندس الموقع',
      excel: '❌ تشتت الصور والفواتير في جروبات الواتساب',
      eleven: '⚠️ شاشات ERP مكتبية معقدة تتطلب تدريباً طويلاً',
      tashteeb: '✅ مصمم للموقع أولاً (زر إجراء سريع ⚡ + تسجيل صوتي)'
    },
    {
      feature: 'بوابة متابعة رقمية تفاعلية خاصة بالعميل',
      excel: '❌ اتصالات هاتفية مجهدة وإرسال صور عشوائي',
      eleven: '⚠️ لوحات عملاء أساسية غير متخصصة بالتشطيب',
      tashteeb: '✅ رابط مباشر للعميل بدون تطبيق + تقرير واتساب فوري'
    },
    {
      feature: 'سرعة التجربة والبدء في الاستخدام',
      excel: '❌ مجهود يدوي متواصل وأخطاء بشرية يومية',
      eleven: '❌ استمارة انتظار لمراجعة وموافقة فريق المبيعات',
      tashteeb: '✅ تجربة مجانية فورية لمدة 14 يوماً لكافة الميزات 🚀'
    },
    {
      feature: 'شفافية الأسعار ومرونة الاشتراك',
      excel: 'مجاني ظاهرياً لكن كلفته أخطاء ونزاعات بمئات الآلاف',
      eleven: '❌ أسعار مبهمة ومرتفعة جداً للشركات الضخمة فقط',
      tashteeb: '✅ باقات معلنة وشفافة بالجنيه وبدون عقود احتكار'
    },
    {
      feature: 'استلامات الجودة الهندسية (Snags) على المخطط',
      excel: '❌ تسجيل ورقي يتلف ويضيع داخل الموقع',
      eleven: '⚠️ متابعة عامة لنسب إنجاز البنود فقط',
      tashteeb: '✅ توثيق الملاحظات وإسقاطها بنقاط مرئية على المخطط'
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
      a: 'نعم بكل تأكيد وبكل سهولة! يمكنك الضغط على زر "ابدأ تجربتك المجانية" لتسجيل حساب شركتك في أقل من دقيقة وتجربة النظام بكافة شاشاته وميزاته مجاناً لمدة 14 يوماً قبل أي التزام.'
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
      background: '#FFFFFF',
      color: '#0F172A',
      fontFamily: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif",
      overflowX: 'hidden',
      position: 'relative'
    }}>

      {/* ─── Light Ambient Glow Mesh (إضاءة خلفية ناعمة وعصرية) ─── */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100vw',
        maxWidth: 1280,
        height: 580,
        background: 'radial-gradient(circle at 50% 20%, rgba(254, 243, 199, 0.45) 0%, rgba(238, 242, 255, 0.7) 40%, rgba(255, 255, 255, 0) 75%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* ─── Mobile Navigation Drawer Overlay ─── */}
      {mobileNavOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          padding: 24,
          animation: 'fadeIn 0.2s ease'
        }}>
          <button
            onClick={() => setMobileNavOpen(false)}
            aria-label="إغلاق القائمة"
            style={{
              position: 'absolute',
              top: 24,
              left: 24,
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              borderRadius: 12,
              padding: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <img src="/app-icon.png" alt="Tashteeb Pro" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            <span style={{ fontWeight: 900, fontSize: 18, color: '#0F172A' }}>تشطيب برو</span>
          </div>

          <a href="#hero" onClick={() => setMobileNavOpen(false)} style={{ color: '#0F172A', fontSize: 18, fontWeight: 800, textDecoration: 'none' }}>الرئيسية</a>
          <a href="#values" onClick={() => setMobileNavOpen(false)} style={{ color: '#0F172A', fontSize: 18, fontWeight: 800, textDecoration: 'none' }}>ماذا يقدم النظام؟</a>
          <a href="#timeline" onClick={() => setMobileNavOpen(false)} style={{ color: '#0F172A', fontSize: 18, fontWeight: 800, textDecoration: 'none' }}>رحلة المشروع</a>
          <a href="#preview" onClick={() => setMobileNavOpen(false)} style={{ color: '#0F172A', fontSize: 18, fontWeight: 800, textDecoration: 'none' }}>المعاينة الحية</a>
          <a href="#pricing" onClick={() => setMobileNavOpen(false)} style={{ color: '#0F172A', fontSize: 18, fontWeight: 800, textDecoration: 'none' }}>الأسعار والباقات</a>
          <a href="#faq" onClick={() => setMobileNavOpen(false)} style={{ color: '#0F172A', fontSize: 18, fontWeight: 800, textDecoration: 'none' }}>الأسئلة الشائعة</a>

          <button
            className="ws-coral-btn"
            onClick={() => { setMobileNavOpen(false); handleStartTrial(); }}
            style={{ padding: '15px 32px', borderRadius: 9999, fontSize: 16, marginTop: 16, width: '100%', maxWidth: 300 }}
          >
            <Rocket size={18} /> ابدأ الآن مجاناً (14 يوماً) 🚀
          </button>

          <button
            onClick={() => { setMobileNavOpen(false); onGoToLogin('login'); }}
            style={{
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: 15,
              fontWeight: 800,
              padding: '12px 28px',
              borderRadius: 9999,
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: '100%',
              maxWidth: 300
            }}
          >
            تسجيل الدخول للنظام ←
          </button>
        </div>
      )}

      {/* ─── 1. FLOATING PILL NAVBAR (كبسولة عائمة متجاوبة بخلفية زجاجية بيضاء) ─── */}
      <div style={{ position: 'sticky', top: 14, zIndex: 1000, width: '100%', padding: '0 16px', display: 'flex', justifyContent: 'center' }}>
        <header className="ws-floating-nav" style={{
          width: '100%',
          maxWidth: 1120,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid #E2E8F0',
          borderRadius: 9999,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.6)',
          transition: 'all 0.3s ease'
        }}>
          {/* Brand Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#FFF7ED',
              border: '1.5px solid #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(234, 88, 12, 0.15)'
            }}>
              <img src="/app-icon.png" alt="Tashteeb Pro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>تشطيب برو</span>
                <span style={{ fontSize: 10, background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', padding: '2px 7px', borderRadius: 9999, fontWeight: 900 }}>PRO</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>
                منظومة شركات التشطيب والمقاولات
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="ws-desktop-nav-links" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            fontSize: 13.5,
            fontWeight: 800,
            color: '#475569'
          }}>
            <a href="#hero" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>الرئيسية</a>
            <a href="#values" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>المميزات</a>
            <a href="#timeline" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>رحلة المشروع</a>
            <a href="#preview" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>المعاينة الحية</a>
            <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>الأسعار</a>
            <a href="#faq" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>الأسئلة الشائعة</a>
          </nav>

          {/* Header Action Buttons & Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => onGoToLogin('login')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#334155',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                padding: '7px 14px',
                borderRadius: 9999,
                fontFamily: 'inherit',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#334155'; }}
            >
              دخول 🔒
            </button>

            <button
              className="ws-coral-btn"
              onClick={handleStartTrial}
              style={{
                padding: '9px 20px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: '-0.01em'
              }}
            >
              <Rocket size={14} />
              <span>ابدأ مجاناً</span>
            </button>

            {/* Mobile Menu Icon (متجاوب ويظهر على شاشات الموبايل والتابلت) */}
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="فتح القائمة الرئيسية"
              style={{
                display: 'none',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                borderRadius: 9999,
                padding: 8,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              className="landing-mobile-menu-btn"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>
      </div>

      {/* ─── 2. HERO SECTION (عنوان مباشر وصريح يفهم الزائر النظام في ثوانٍ معدودة) ─── */}
      <section id="hero" style={{
        padding: 'clamp(40px, 7vw, 85px) 20px clamp(30px, 5vw, 60px)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22
      }}>
        {/* Top Clarity Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 22px',
          borderRadius: 9999,
          background: '#EEF2FF',
          border: '1px solid #C7D2FE',
          color: '#4338CA',
          fontSize: 13.5,
          fontWeight: 800,
          boxShadow: '0 2px 10px rgba(79, 70, 229, 0.08)',
          animation: 'floatSoft 5s ease-in-out infinite'
        }}>
          <Sparkles size={16} color="#EA580C" />
          <span>المنظومة السحابية المتكاملة لشركات التشطيبات ومكاتب الديكور والمقاولات 🏛️</span>
        </div>

        {/* Clear Monumental Headline */}
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 62px)',
          fontWeight: 900,
          lineHeight: 1.25,
          letterSpacing: '-0.03em',
          margin: 0,
          color: '#0F172A'
        }}>
          <span>برنامج إدارة شركات التشطيبات والمقاولات</span>
          <span style={{
            display: 'block',
            marginTop: 6,
            background: 'linear-gradient(90deg, #EA580C 0%, #FF5722 50%, #C2410C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            من المقايسة والموقع.. حتى تسليم العميل وأرباحك الصافية
          </span>
        </h1>

        {/* Ultra-Clear Value Proposition Subtitle */}
        <p style={{
          fontSize: 'clamp(15px, 2vw, 18.5px)',
          color: '#475569',
          lineHeight: 1.75,
          maxWidth: 860,
          margin: 0,
          fontWeight: 600
        }}>
          ودّع فوضى الشيتات وضياع صور ومحادثات الواتساب. نظام هندسي سحابي مصمم لمواقع التشطيب: اكتب عقود صنايعية قانونية ملزمة بضغطة زر، احسب المقايسات وتكلفة المتر بدقة، وتابع إنجاز المواقع واليوميات بالصور، وأبهر عميلك ببوابة رقمية تفاعلية وتقارير واتساب فورية.
        </p>

        {/* Hero CTA Button Capsule */}
        <div className="ws-hero-cta-group" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginTop: 10
        }}>
          <button
            className="ws-coral-btn"
            onClick={handleStartTrial}
            style={{
              padding: '16px 36px',
              borderRadius: 9999,
              fontSize: 16,
              fontWeight: 900,
              gap: 10
            }}
          >
            <Rocket size={19} />
            <span>ابدأ تجربتك المجانية الفورية (14 يوماً) 🚀</span>
          </button>

          <button
            onClick={() => openWhatsApp('مرحباً، أريد معرفة كيف تساعد منصة تشطيب برو شركة التشطيبات الخاصة بي')}
            style={{
              padding: '15px 28px',
              borderRadius: 9999,
              fontSize: 15,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1.5px solid #CBD5E1',
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#25D366';
              e.currentTarget.style.background = '#F0FDF4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <MessageSquare size={18} color="#25D366" />
            <span>محادثة واتساب سريعة 💬</span>
          </button>
        </div>

        {/* Trust Points */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          flexWrap: 'wrap',
          fontSize: 13,
          fontWeight: 700,
          color: '#64748B',
          marginTop: 4
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="#059669" /> تسجيل فوري بدون بطاقة ائتمانية
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="#059669" /> يعمل كـ تطبيق كامل على الموبايل والكمبيوتر
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="#059669" /> دعم فني وتدريب هندسي مجاني
          </span>
        </div>

        {/* ─── LIVE PROJECT SNAPSHOT MOCKUP (معاينة حية تلخص شكل المنظومة في ثوانٍ) ─── */}
        <div className="ws-white-card" style={{
          width: '100%',
          maxWidth: 960,
          marginTop: 18,
          padding: '24px 28px',
          border: '1.5px solid #E2E8F0',
          textAlign: 'right',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#64748B', marginRight: 8 }}>
                لوحة تحكم المشروع الحية — تشطيب برو
              </span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 800 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
              <span>موقع نشط قيد التنفيذ الآن</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ background: '#FFFFFF', padding: 16, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>المشروع الجاري</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>فيلا 42 — التجمع الخامس</div>
              <div style={{ fontSize: 12, color: '#4F46E5', fontWeight: 800, marginTop: 4 }}>العميل: د. طارق رضوان</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: 16, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>نسبة إنجاز الموقع</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#059669', marginTop: 2 }}>68%</div>
              <div style={{ width: '100%', height: 6, background: '#E2E8F0', borderRadius: 9999, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: '68%', height: '100%', background: '#059669', borderRadius: 9999 }} />
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: 16, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>الموقف المالي</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>المحصّل: 550,000 ج.م</div>
              <div style={{ fontSize: 12, color: '#EA580C', fontWeight: 800, marginTop: 4 }}>المصروفات: 410,000 ج.م</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: 16, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>عقود المصنعيات الفنية</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#059669', marginTop: 4 }}>عقد السيراميك: معتمد وموقّع ✅</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, marginTop: 4 }}>بند الاستلام: قِدة وميزان وشطف 45</div>
            </div>
          </div>
        </div>

        {/* Metrics Ribbon Bar */}
        <div className="ws-stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          width: '100%',
          maxWidth: 960,
          marginTop: 10,
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          padding: '22px 28px',
          borderRadius: 24,
          boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(24px, 4.5vw, 34px)', fontWeight: 900, color: '#EA580C', letterSpacing: '-0.02em' }}>+1,200</div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 800, marginTop: 4 }}>موقع قيد المتابعة الحية</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(24px, 4.5vw, 34px)', fontWeight: 900, color: '#4F46E5', letterSpacing: '-0.02em' }}>99.4%</div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 800, marginTop: 4 }}>دقة في ضبط الميزانيات ومنع الهدر</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(24px, 4.5vw, 34px)', fontWeight: 900, color: '#059669', letterSpacing: '-0.02em' }}>3 دقائق</div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 800, marginTop: 4 }}>لاستخراج مقايسة وعرض سعر</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(24px, 4.5vw, 34px)', fontWeight: 900, color: '#0284C7', letterSpacing: '-0.02em' }}>18 ساعة</div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 800, marginTop: 4 }}>توفير أسبوعي لكل مهندس موقع</div>
          </div>
        </div>
      </section>

      {/* ─── 3. QUICK VALUE GRID (أهم 4 مزايا فورية تجيب على: ما هو الموقع؟) ─── */}
      <section id="values" style={{
        padding: 'clamp(40px, 6vw, 75px) 20px',
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            color: '#C2410C',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 10
          }}>
            <span>حلول هندسية عملية للموقع</span>
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4.2vw, 38px)', fontWeight: 900, color: '#0F172A', margin: 0 }}>
            ماذا تقدم لك منصة تشطيب برو في عملك اليومي؟
          </h2>
          <p style={{ color: '#64748B', fontSize: 16, maxWidth: 680, margin: '8px auto 0', fontWeight: 600 }}>
            كل ما تحتاجه لإدارة شركتك من أول مكالمة للعميل حتى تسليم المفتاح وحساب صافي الربح
          </p>
        </div>

        <div className="ws-quick-value-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 18
        }}>
          {quickValues.map((v, idx) => {
            const Icon = v.icon;
            return (
              <div key={idx} className="ws-white-card" style={{ padding: '26px 20px', textAlign: 'right' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: v.bg,
                  border: `1px solid ${v.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <Icon size={26} color={v.color} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>
                  {v.title}
                </h3>
                <p style={{ color: '#64748B', fontSize: 13.5, lineHeight: 1.65, margin: 0, fontWeight: 600 }}>
                  {v.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 4. JOURNEY TIMELINE SECTION (الخط الزمني المضيء لرحلة المشروع) ─── */}
      <section id="timeline" style={{
        padding: 'clamp(50px, 8vw, 90px) 20px',
        maxWidth: 1050,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        background: '#FAFAFA',
        borderRadius: 32,
        border: '1px solid #F1F5F9'
      }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: '#EEF2FF',
            border: '1px solid #C7D2FE',
            color: '#4338CA',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 10
          }}>
            <span>رحلة المشروع خطوة بخطوة</span>
          </div>
          <h2 style={{
            fontSize: 'clamp(24px, 4.5vw, 38px)',
            fontWeight: 900,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            كيف يتحول موقعك من فوضى ورقية إلى منظومة منضبطة؟
          </h2>
          <p style={{ color: '#64748B', fontSize: 16, maxWidth: 680, margin: '8px auto 0', fontWeight: 600 }}>
            أربع محطات هندسية متكاملة تضمن لك الأرباح العالية ورضا العميل المطلق
          </p>
        </div>

        {/* Timeline Container */}
        <div style={{ position: 'relative', padding: '16px 0' }}>
          {/* Vertical Central Line */}
          <div className="ws-timeline-line" style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            background: 'linear-gradient(180deg, #4F46E5 0%, #EA580C 50%, #059669 100%)',
            zIndex: 0
          }} />

          {/* Timeline Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36, position: 'relative', zIndex: 1 }}>
            {timelineMilestones.map((item, idx) => {
              const isRight = item.side === 'right';
              return (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: isRight ? 'flex-start' : 'flex-end',
                  position: 'relative',
                  width: '100%'
                }}>
                  {/* Central Node Badge */}
                  <div className="ws-timeline-dot" style={{
                    position: 'absolute',
                    top: 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '3px solid #EA580C',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2
                  }}>
                    <Star size={14} color="#EA580C" />
                  </div>

                  {/* Card */}
                  <div className="ws-white-card ws-timeline-card-wrapper" style={{
                    width: '45%',
                    padding: '24px 26px',
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 9999,
                      background: '#EEF2FF',
                      color: '#4338CA',
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 10
                    }}>
                      {item.badge}
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>
                      {item.title}
                    </h3>
                    <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: '0 0 12px', fontWeight: 600 }}>
                      {item.desc}
                    </p>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: '#059669'
                    }}>
                      <CheckCircle2 size={15} />
                      <span>{item.highlight}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5. CORE PILLARS SECTION (أركان القوة الأربعة) ─── */}
      <section id="pillars" style={{
        padding: 'clamp(50px, 8vw, 85px) 20px',
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            color: '#0369A1',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 10
          }}>
            <span>الأساس الهندسي المحكم</span>
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4.2vw, 38px)', fontWeight: 900, color: '#0F172A', margin: 0 }}>
            أركان تشطيب برو لإدارة هندسية لا تقبل الأخطاء
          </h2>
          <p style={{ color: '#64748B', fontSize: 16, maxWidth: 640, margin: '8px auto 0', fontWeight: 600 }}>
            نظام متكامل يغنيك عن عشرات التطبيقات والشيتات المتفرقة
          </p>
        </div>

        <div className="ws-pillars-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20
        }}>
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div key={idx} className="ws-pillar-white-card">
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#F8FAFC',
                  border: `2px solid ${pillar.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  boxShadow: `0 4px 14px ${pillar.color}25`
                }}>
                  <Icon size={28} color={pillar.color} />
                </div>
                <h3 style={{ fontSize: 17.5, fontWeight: 900, color: '#0F172A', margin: '0 0 10px' }}>
                  {pillar.title}
                </h3>
                <p style={{ color: '#64748B', fontSize: 13.5, lineHeight: 1.65, margin: 0, fontWeight: 600 }}>
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 6. INTERACTIVE LIVE PREVIEW SHOWCASE (المعاينة التفاعلية للنظام) ─── */}
      <section id="preview" style={{
        padding: 'clamp(40px, 7vw, 75px) 20px',
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ color: '#EA580C', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>
            معاينة حية من داخل النظام
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginTop: 6, color: '#0F172A' }}>
            شاهد كيف تدار أعمالك باحترافية وسرعة
          </h2>
          <p style={{ color: '#64748B', fontSize: 15, maxWidth: 650, margin: '6px auto 0', fontWeight: 600 }}>
            اضغط على التبويبات بالأسفل لتستعرض قوة وتفاصيل كل أداة صُممت خصيصاً لمشاريع التشطيب.
          </p>
        </div>

        {/* Interactive Tabs Strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <button
            className={`preview-tab-btn-light ${previewTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setPreviewTab('contracts')}
          >
            <ShieldCheck size={16} /> عقود الصنايعية والورش 📜
          </button>
          <button
            className={`preview-tab-btn-light ${previewTab === 'portal' ? 'active' : ''}`}
            onClick={() => setPreviewTab('portal')}
          >
            <Users size={16} /> بوابة العميل والواتساب 🌐
          </button>
          <button
            className={`preview-tab-btn-light ${previewTab === 'boq' ? 'active' : ''}`}
            onClick={() => setPreviewTab('boq')}
          >
            <Calculator size={16} /> المقايسات الذكية ⚡
          </button>
          <button
            className={`preview-tab-btn-light ${previewTab === 'snags' ? 'active' : ''}`}
            onClick={() => setPreviewTab('snags')}
          >
            <CheckCircle2 size={16} /> استلامات الجودة (Snags) ✅
          </button>
        </div>

        {/* Preview Screen Card */}
        <div className="ws-white-card" style={{ padding: 'clamp(20px, 4vw, 32px)', border: '1.5px solid #E2E8F0' }}>
          {previewTab === 'contracts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#EA580C', fontWeight: 800 }}>محرّك العقود القانونية الفنية</span>
                  <h3 style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', margin: '4px 0 0' }}>عقد مقاولة مصنعية أعمال السيراميك والبورسلين</h3>
                </div>
                <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 800 }}>معتمد وموقع إلكترونياً ✅</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 14, border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#64748B', fontSize: 12, fontWeight: 700 }}>الطرف الأول (المقاول العام)</div>
                  <div style={{ color: '#0F172A', fontWeight: 900, fontSize: 15, marginTop: 4 }}>شركة أملاك للمقاولات والتشطيبات</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 14, border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#64748B', fontSize: 12, fontWeight: 700 }}>الطرف الثاني (صنايعي الباطن)</div>
                  <div style={{ color: '#0F172A', fontWeight: 900, fontSize: 15, marginTop: 4 }}>الأسطى / محمود عبد الرحيم (معلم سيراميك)</div>
                </div>
              </div>

              <div style={{ background: '#FFF7ED', borderRadius: 14, padding: 16, border: '1px solid #FED7AA' }}>
                <div style={{ fontWeight: 900, color: '#C2410C', fontSize: 14, marginBottom: 8 }}>شروط الاستلام الفني المشددة المعتمدة بالعقد:</div>
                <ul style={{ margin: 0, paddingRight: 20, color: '#334155', fontSize: 13.5, lineHeight: 1.8, fontWeight: 600 }}>
                  <li>استلام استواء السطح بالقِدة الألومنيوم والميزان الحساس مع نسبة سماح لا تتجاوز 1 ملم لكل 2 متر.</li>
                  <li>شطف زوايا الأعمدة 45 درجة (جونيّة دقيقة) بدون استخدام زوايا بلاستيك تجارية.</li>
                  <li>تفريغ الهواء التام تحت البلاطات واستخدام مادة لصق مخصصة للبورسلين مع كلبسات ضبط الفواصل.</li>
                  <li>لا يتم صرف الدفعة الختامية إلا بعد محضر فحص واستلام هندسي موقّع من مهندس الموقع.</li>
                </ul>
              </div>
            </div>
          )}

          {previewTab === 'portal' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#4F46E5', fontWeight: 800 }}>بوابة العميل الرقمية التفاعلية</span>
                  <h3 style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', margin: '4px 0 0' }}>مشروع فيلا د. طارق رضوان — التجمع الخامس</h3>
                </div>
                <span style={{ background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE', padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 800 }}>رابط خاص مباشر بدون تطبيق 🔗</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 14, textAlign: 'center', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>نسبة التنفيذ الحالية</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#059669', marginTop: 4 }}>74%</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 14, textAlign: 'center', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>المرحلة الجارية</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#0284C7', marginTop: 8 }}>الدهانات والأسقف المعلقة</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 14, textAlign: 'center', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>الدفعة القادمة</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#EA580C', marginTop: 8 }}>عند استلام أول وش بطانة</div>
                </div>
              </div>
            </div>
          )}

          {previewTab === 'boq' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 800 }}>حاسبة المقايسات الفورية (BOQ)</span>
                  <h3 style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', margin: '4px 0 0' }}>مقايسة تشطيب شقة سكنية (210 م²) — الترا لوكس</h3>
                </div>
                <button
                  className="ws-coral-btn"
                  onClick={handleStartTrial}
                  style={{ padding: '7px 16px', borderRadius: 9999, fontSize: 12 }}
                >
                  جرّب الحاسبة الآن ⚡
                </button>
              </div>
              <p style={{ color: '#475569', fontSize: 14.5, fontWeight: 600, lineHeight: 1.7 }}>حساب فوري للمصنعيات وتكلفة الخامات بدقة السوق الحالية، مع تحديد هامش ربح شركتك وتصدير ملف العرض بختم شركتك في لحظات.</p>
            </div>
          )}

          {previewTab === 'snags' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#D97706', fontWeight: 800 }}>قوائم استلامات الجودة الهندسية</span>
                  <h3 style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', margin: '4px 0 0' }}>كشف ملاحظات استلام مرحلة المحارة والكهرباء</h3>
                </div>
                <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 800 }}>تثبيت دقيق على المخطط 📍</span>
              </div>
              <p style={{ color: '#475569', fontSize: 14.5, fontWeight: 600, lineHeight: 1.7 }}>التقاط صور الملاحظات من الموقع وإسقاطها بنقاط مرئية على المخطط الهندسي لتوجيه الصنايعي وتلافي أي تكسير بعد التشطيب النهائي.</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── 7. COMPARISON SECTION (مقارنة القوة: تشطيب برو ضد إكسيل والأنظمة المعقدة) ─── */}
      <section id="comparison" style={{
        padding: 'clamp(50px, 8vw, 85px) 20px',
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            color: '#C2410C',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 10
          }}>
            <span>المقارنة الصريحة</span>
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4.2vw, 38px)', fontWeight: 900, color: '#0F172A', margin: 0 }}>
            لماذا يختار المقاولون وشركات التشطيب منصتنا؟
          </h2>
          <p style={{ color: '#64748B', fontSize: 16, maxWidth: 640, margin: '8px auto 0', fontWeight: 600 }}>
            شاهد الفارق بين شيتات الإكسيل والحلول المحاسبية المعقدة وبين منصة صُممت للموقع
          </p>
        </div>

        <div className="ws-white-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ padding: '18px 20px', color: '#0F172A', fontWeight: 900 }}>وجه المقارنة</th>
                  <th style={{ padding: '18px 20px', color: '#64748B', fontWeight: 700 }}>شيتات إكسيل والواتساب</th>
                  <th style={{ padding: '18px 20px', color: '#64748B', fontWeight: 700 }}>أنظمة الـ ERP المعقدة</th>
                  <th style={{ padding: '18px 20px', color: '#EA580C', fontWeight: 900, background: '#FFF7ED' }}>تشطيب برو (Tashteeb Pro) ⭐</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '16px 20px', color: '#0F172A', fontWeight: 800 }}>{row.feature}</td>
                    <td style={{ padding: '16px 20px', color: '#64748B', fontWeight: 600 }}>{row.excel}</td>
                    <td style={{ padding: '16px 20px', color: '#64748B', fontWeight: 600 }}>{row.eleven}</td>
                    <td style={{ padding: '16px 20px', color: '#059669', fontWeight: 800, background: '#FFFDF9' }}>{row.tashteeb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── 8. PRICING SECTION (الباقات والأسعار الشفافة بخلفية بيضاء نقية) ─── */}
      <section id="pricing" style={{
        padding: 'clamp(50px, 8vw, 90px) 20px',
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: '#EEF2FF',
            border: '1px solid #C7D2FE',
            color: '#4338CA',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 10
          }}>
            <span>خطط استثمار واضحة وشفافة</span>
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4.2vw, 38px)', fontWeight: 900, color: '#0F172A', margin: 0 }}>
            اختر الباقة المناسبة لحجم أعمال شركتك
          </h2>
          <p style={{ color: '#64748B', fontSize: 16, maxWidth: 640, margin: '8px auto 0', fontWeight: 600 }}>
            أسعار واضحة بدون رسوم خفية أو عقود احتكار طويلة
          </p>

          {/* Billing Cycle Toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#F1F5F9',
            borderRadius: 9999,
            padding: 4,
            marginTop: 20,
            border: '1px solid #E2E8F0'
          }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 20px',
                borderRadius: 9999,
                border: 'none',
                background: billingCycle === 'monthly' ? '#4F46E5' : 'transparent',
                color: billingCycle === 'monthly' ? '#FFFFFF' : '#64748B',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s'
              }}
            >
              دفع شهري
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              style={{
                padding: '8px 20px',
                borderRadius: 9999,
                border: 'none',
                background: billingCycle === 'yearly' ? '#EA580C' : 'transparent',
                color: billingCycle === 'yearly' ? '#FFFFFF' : '#64748B',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
            >
              <span>دفع سنوي</span>
              <span style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.3)', padding: '2px 7px', borderRadius: 9999, fontWeight: 900 }}>شهرين مجاناً 🔥</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="ws-pricing-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          alignItems: 'stretch'
        }}>
          {pricingPlans.map((plan) => {
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const isPopular = plan.popular;
            return (
              <div
                key={plan.id}
                className="ws-white-card"
                style={{
                  padding: '36px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  border: isPopular ? '2.5px solid #EA580C' : '1px solid #E2E8F0',
                  boxShadow: isPopular ? '0 15px 35px rgba(234, 88, 12, 0.15)' : undefined
                }}
              >
                {isPopular && (
                  <div style={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #FF5722 0%, #EA580C 100%)',
                    color: '#FFFFFF',
                    padding: '4px 16px',
                    borderRadius: 9999,
                    fontSize: 11.5,
                    fontWeight: 900,
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)'
                  }}>
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0 }}>{plan.name}</h3>
                  <p style={{ color: '#64748B', fontSize: 13, minHeight: 38, marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>{plan.subtitle}</p>

                  <div style={{ margin: '18px 0 22px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 38, fontWeight: 900, color: isPopular ? '#EA580C' : '#0F172A', letterSpacing: '-0.02em' }}>
                      {price}
                    </span>
                    <span style={{ fontSize: 14, color: '#64748B', fontWeight: 700 }}>
                      {plan.currency} / شهرياً
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 18, marginBottom: 24 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>المميزات المشمولة:</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {plan.features.map((f, fIdx) => (
                        <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#334155', lineHeight: 1.5, fontWeight: 600 }}>
                          <CheckCircle2 size={16} color={isPopular ? '#EA580C' : '#059669'} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  className={isPopular ? "ws-coral-btn" : ""}
                  onClick={handleStartTrial}
                  style={isPopular ? {
                    width: '100%',
                    padding: '14px',
                    borderRadius: 9999,
                    fontSize: 14.5
                  } : {
                    width: '100%',
                    padding: '13px',
                    borderRadius: 9999,
                    fontSize: 14,
                    fontWeight: 800,
                    background: '#F8FAFC',
                    color: '#0F172A',
                    border: '1.5px solid #CBD5E1',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s'
                  }}
                >
                  ابدأ التجربة المجانية 🚀
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 9. FAQ ACCORDION SECTION ─── */}
      <section id="faq" style={{
        padding: 'clamp(40px, 7vw, 75px) 20px',
        maxWidth: 850,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: '#EEF2FF',
            border: '1px solid #C7D2FE',
            color: '#4338CA',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 10
          }}>
            <span>الأسئلة الشائعة</span>
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#0F172A', margin: 0 }}>
            إجابات واضحة لكل ما قد يشغل بالك
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="ws-white-card"
                style={{
                  padding: '18px 24px',
                  cursor: 'pointer',
                  borderRadius: 18,
                  border: isOpen ? '1.5px solid #EA580C' : '1px solid #E2E8F0'
                }}
                onClick={() => setActiveFaq(isOpen ? null : idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', margin: 0 }}>{faq.q}</h3>
                  <div style={{ color: isOpen ? '#EA580C' : '#64748B' }}>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                {isOpen && (
                  <p style={{ color: '#475569', fontSize: 14.5, lineHeight: 1.7, margin: '14px 0 4px', borderTop: '1px solid #F1F5F9', paddingTop: 12, fontWeight: 600 }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 10. BOTTOM CALL-TO-ACTION SECTION ─── */}
      <section style={{
        padding: 'clamp(50px, 8vw, 85px) 20px',
        maxWidth: 1050,
        margin: '20px auto 50px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
          borderRadius: 32,
          padding: 'clamp(36px, 6vw, 60px) 24px',
          textAlign: 'center',
          border: '1px solid #312E81',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 16
          }}>
            <Sparkles size={15} color="#FF5722" />
            <span>ابدأ الانطلاقة الذكية اليوم</span>
          </div>

          <h2 style={{
            fontSize: 'clamp(26px, 4.5vw, 44px)',
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '0 0 14px',
            letterSpacing: '-0.02em'
          }}>
            جاهز لتنظيم مواقع شركتك ومضاعفة أرباحك؟
          </h2>

          <p style={{ color: '#CBD5E1', fontSize: 16.5, maxWidth: 660, margin: '0 auto 26px', lineHeight: 1.7, fontWeight: 500 }}>
            انضم الآن لمئات المهندسين وشركات التشطيبات في مصر والخليج الذين وثّقوا مواقعهم وأوقفوا النزاعات مع تشطيب برو.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              className="ws-coral-btn"
              onClick={handleStartTrial}
              style={{
                padding: '16px 36px',
                borderRadius: 9999,
                fontSize: 16,
                fontWeight: 900
              }}
            >
              <Rocket size={19} />
              <span>ابدأ تجربتك المجانية لمدة 14 يوماً 🚀</span>
            </button>

            <button
              onClick={() => openWhatsApp('مرحباً، أريد الاشتراك وتجربة منصة تشطيب برو')}
              style={{
                padding: '16px 28px',
                borderRadius: 9999,
                fontSize: 15,
                fontWeight: 800,
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <MessageSquare size={18} color="#25D366" />
              <span>تحدث مع المبيعات فوراً 💬</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── 11. CLEAN LIGHT FOOTER ─── */}
      <footer style={{
        background: '#F8FAFC',
        borderTop: '1px solid #E2E8F0',
        padding: '40px 20px 24px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }}>
          {/* Logo & Slogan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img src="/app-icon.png" alt="Tashteeb Pro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#0F172A' }}>تشطيب برو | Tashteeb Pro</div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>المنظومة السحابية لإدارة المقاولات والتشطيبات الفاخرة © 2026</div>
            </div>
          </div>

          {/* Quick Footer Links */}
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#475569', fontWeight: 700 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => onGoToLogin('login')}>بوابة الدخول</span>
            <span style={{ cursor: 'pointer' }} onClick={() => onGoToLogin('register')}>إنشاء حساب</span>
            <span style={{ cursor: 'pointer' }} onClick={() => openWhatsApp()}>الدعم الفني والواتساب</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
