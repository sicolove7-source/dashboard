import React, { useState, useEffect } from 'react';
import {
  Building2, HardHat, FileText, CheckCircle2, TrendingUp, ShieldCheck,
  Zap, Users, Phone, MessageSquare, ArrowLeft, ArrowRight, Star, Clock, Award,
  Sparkles, Check, ChevronDown, ChevronUp, Lock, Laptop, Smartphone,
  ExternalLink, DollarSign, Calculator, Layers, HelpCircle, Menu, X,
  Wrench, Eye, Printer, Copy, Share2, Compass, AlertTriangle, Rocket
} from 'lucide-react';

/* ─── Webbing Stone Style Dark Luxury CSS ─── */
const LANDING_STYLES = `
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.45; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(1.04); }
  }
  @keyframes floatSoft {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-7px); }
  }
  @keyframes lineGlow {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6)); }
    50% { filter: drop-shadow(0 0 16px rgba(255, 107, 85, 0.85)); }
  }

  /* Glassmorphism Classes */
  .ws-glass-card {
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5);
    border-radius: 24px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .ws-glass-card:hover {
    border-color: rgba(255, 107, 85, 0.35);
    box-shadow: 0 25px 60px -10px rgba(255, 107, 85, 0.12), 0 0 0 1px rgba(255, 107, 85, 0.2);
    transform: translateY(-4px);
  }

  .ws-pillar-card {
    background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.7) 70%);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 32px 24px;
    transition: all 0.3s ease;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .ws-pillar-card:hover {
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-5px);
    box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.25);
  }

  .ws-coral-btn {
    background: linear-gradient(135deg, #FF6B55 0%, #FF8A65 100%);
    color: #FFFFFF;
    border: none;
    cursor: pointer;
    font-weight: 800;
    transition: all 0.25s ease;
    box-shadow: 0 8px 24px rgba(255, 107, 85, 0.35);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
  }
  .ws-coral-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(255, 107, 85, 0.5);
    filter: brightness(1.06);
  }

  .preview-tab-btn-dark {
    padding: 11px 20px;
    border-radius: 9999px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: #94A3B8;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    font-family: inherit;
    white-space: nowrap;
  }
  .preview-tab-btn-dark.active {
    background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
    color: #FFFFFF;
    border-color: rgba(99, 102, 241, 0.6);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  }
  .preview-tab-btn-dark:not(.active):hover {
    background: rgba(255, 255, 255, 0.08);
    color: #FFFFFF;
  }

  /* Responsive Adjustments */
  @media (max-width: 900px) {
    .ws-desktop-nav-links { display: none !important; }
    .ws-floating-nav { padding: 8px 16px !important; margin: 10px auto !important; width: calc(100% - 24px) !important; }
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

export default function LandingPage({ onGoToLogin }) {
  useInjectStyle(LANDING_STYLES);

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

  // أركان القوة الأربعة (على طراز Webbing Stone)
  const pillars = [
    {
      icon: HardHat,
      color: '#38BDF8',
      title: 'التحكم الميداني الكامل',
      desc: 'تسجيل اليوميات، نسب الإنجاز بالصور، استلامات الجودة الهندسية، وحصر العمالة لحظياً من الموقع مباشرة.',
    },
    {
      icon: DollarSign,
      color: '#10B981',
      title: 'الحسابات والمالية المغلقة',
      desc: 'إغلاق مالي محكم لكل مشروع: تتبع الدفعات، مستحقات الصنايعية، فواتير التوريدات، وحساب هوامش الأرباح الفعلية.',
    },
    {
      icon: Zap,
      color: '#F59E0B',
      title: 'أتمتة الذكاء الاصطناعي',
      desc: 'تنبيهات فورية بالانحراف المالي أو الزمني، وتوليد تقارير هندسية متكاملة وإرسالها لواتساب العميل بضغطة زر.',
    },
    {
      icon: ShieldCheck,
      color: '#818CF8',
      title: 'عزل وحماية سحابية مشفرة',
      desc: 'حماية بيانات بنكية 256-bit، عزل تام لبيانات ومشاريع كل شركة، ونسخ احتياطي فوري ومستمر على مدار الساعة.',
    },
  ];

  // محطات رحلة النجاح (Timeline)
  const timelineMilestones = [
    {
      badge: 'المحطة الأولى ⚡',
      title: 'التأسيس والمقايسة الذكية وعرض السعر',
      desc: 'حساب تلقائي لتكاليف المتر والبنود وفق أسعار السوق (اقتصادي، سوبر لوكس، ألترا لوكس) وتصدير عرض سعر رسمي جاهز للطباعة والتعاقد في 3 دقائق.',
      highlight: 'توفر أكثر من 6 ساعات في كل مقايسة',
      side: 'right',
    },
    {
      badge: 'المحطة الثانية 🏗️',
      title: 'إطلاق الموقع وجداول غانت وتوثيق اليوميات',
      desc: 'توزيع المهندسين والمقاولين على الموقع، ومتابعة الجدول الزمني لكل مرحلة (تأسيس، عزل، سيراميك، دهانات) مع رفع صور التوثيق اليومية فورياً.',
      highlight: 'سيطرة بصرية كاملة على كافة مواقعك',
      side: 'left',
    },
    {
      badge: 'المحطة الثالثة 📜',
      title: 'عقود الصنايعية ببنود استلام هندسية ملزمة',
      desc: 'محرّك عقود قانوني فني متقدم يدرج بنود استلام حاسمة (استلام بالقِدة والميزان، شطف 45، كبس السباكة 48 ساعة) مع توقيع وختم إلكتروني حي.',
      highlight: 'حماية كاملة من هروب الصنايعية والأخطاء الفنية',
      side: 'right',
    },
    {
      badge: 'المحطة الرابعة 🌐',
      title: 'بوابة العميل الرقمية والمستخلصات الفورية',
      desc: 'رابط خاص لكل عميل يتابع منه مراحل تشطيب شقته أو فيلته ونسب الإنجاز ونزول الدفعات مع توليد تقرير واتساب هندسي دوري بضغطة زر.',
      highlight: 'توقف 90% من اتصالات العميل المجهدة وتثبت احترافيتك',
      side: 'left',
    },
  ];

  const features = [
    {
      icon: ShieldCheck,
      color: '#FF6B55',
      title: 'محرّك عقود الصنايعية والورش 📜',
      desc: 'صياغة بنود فنية مشددة (استلام بالقِدة والميزان، شطف 45، كبس السباكة، عزل 48 ساعة) مع توقيع حي وختم وتصدير Word وPDF.'
    },
    {
      icon: Users,
      color: '#6366F1',
      title: 'بوابة العميل الحية والتوقيع 🌐',
      desc: 'رابط خاص لكل عميل يتابع منه مراحل تشطيب شقته أو فيلته ونسب التنفيذ والصور الحية، توقف 90% من اتصالات "احنا فين يا بشمهندس؟".'
    },
    {
      icon: MessageSquare,
      color: '#10B981',
      title: 'تقارير الواتساب الفورية 📱',
      desc: 'توليد تقرير هندسي دوري منسق بضغطة زر وإرساله مباشرة لواتساب العميل موضحاً نسب الإنجاز، بنود اليوم، والخطوات القادمة.'
    },
    {
      icon: Calculator,
      color: '#A855F7',
      title: 'حاسبة المقايسات والمقايسة الذكية ⚡',
      desc: 'حساب تلقائي لأسعار وتكاليف التشطيب (اقتصادي، سوبر لوكس، ألترا لوكس) وحساب هوامش الربح وتصدير عرض سعر رسمي في 3 دقائق.'
    },
    {
      icon: HardHat,
      color: '#F97316',
      title: 'استلامات الجودة الميدانية (Snags) ✅',
      desc: 'قوائم تفتيش هندسية رسمية قبل كل مرحلة (كهرباء، سباكة، محارة، دهان) وتحديد أماكن الملاحظات بصور حية على المخطط.'
    },
    {
      icon: TrendingUp,
      color: '#14B8A6',
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
      tashteeb: '✅ تجربة مجانية فورية لمدة 14 يوماً لكافة الميزات 🚀'
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
      background: '#080B14',
      color: '#F8FAFC',
      fontFamily: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif",
      overflowX: 'hidden',
      position: 'relative'
    }}>

      {/* ─── Ambient Glow Spheres (خلفية الإضاءة الدائرية الملونة) ─── */}
      <div style={{
        position: 'absolute',
        top: -100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100vw',
        maxWidth: 1200,
        height: 600,
        background: 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.28) 0%, rgba(255, 107, 85, 0.15) 35%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
        zIndex: 0,
        animation: 'pulseGlow 8s ease-in-out infinite'
      }} />

      <div style={{
        position: 'absolute',
        top: '1200px',
        right: '-10%',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        position: 'absolute',
        top: '2600px',
        left: '-10%',
        width: 650,
        height: 650,
        background: 'radial-gradient(circle, rgba(255, 107, 85, 0.12) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* ─── Mobile Navigation Overlay ─── */}
      {mobileNavOpen && (
        <div className="landing-mobile-nav-overlay" style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(8, 11, 20, 0.98)',
          backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24
        }}>
          <button className="mnav-close" onClick={() => setMobileNavOpen(false)} style={{
            position: 'absolute', top: 24, left: 24,
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            borderRadius: 12, padding: 10, cursor: 'pointer'
          }}>
            <X size={24} />
          </button>
          <a href="#hero" onClick={() => setMobileNavOpen(false)} style={{ color: '#fff', fontSize: 19, fontWeight: 700, textDecoration: 'none' }}>الرئيسية</a>
          <a href="#timeline" onClick={() => setMobileNavOpen(false)} style={{ color: '#fff', fontSize: 19, fontWeight: 700, textDecoration: 'none' }}>رحلة المشروع</a>
          <a href="#pillars" onClick={() => setMobileNavOpen(false)} style={{ color: '#fff', fontSize: 19, fontWeight: 700, textDecoration: 'none' }}>أركان القوة</a>
          <a href="#preview" onClick={() => setMobileNavOpen(false)} style={{ color: '#fff', fontSize: 19, fontWeight: 700, textDecoration: 'none' }}>المعاينة الحية</a>
          <a href="#pricing" onClick={() => setMobileNavOpen(false)} style={{ color: '#fff', fontSize: 19, fontWeight: 700, textDecoration: 'none' }}>الأسعار والباقات</a>
          <a href="#faq" onClick={() => setMobileNavOpen(false)} style={{ color: '#fff', fontSize: 19, fontWeight: 700, textDecoration: 'none' }}>الأسئلة الشائعة</a>
          
          <button
            className="ws-coral-btn"
            onClick={() => { setMobileNavOpen(false); handleStartTrial(); }}
            style={{ padding: '14px 28px', borderRadius: 9999, fontSize: 16, marginTop: 12, width: '100%', maxWidth: 300 }}
          >
            <Rocket size={18} /> ابدأ الآن مجاناً 🚀
          </button>
          
          <button
            onClick={() => { setMobileNavOpen(false); onGoToLogin('login'); }}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            تسجيل الدخول للمنصة ←
          </button>
        </div>
      )}

      {/* ─── 1. FLOATING PILL NAVBAR (كبسولة الملاحة العائمة على طراز Webbing Stone) ─── */}
      <div style={{ position: 'sticky', top: 16, zIndex: 1000, width: '100%', padding: '0 16px', display: 'flex', justifyContent: 'center' }}>
        <header className="ws-floating-nav" style={{
          width: '100%',
          maxWidth: 1120,
          background: 'rgba(13, 17, 30, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 9999,
          padding: '10px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease'
        }}>
          {/* Brand Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#0F172A',
              border: '1.5px solid rgba(255, 107, 85, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 0 16px rgba(255, 107, 85, 0.3)'
            }}>
              <img src="/app-icon.png" alt="Tashteeb Pro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>تشطيب برو</span>
                <span style={{ fontSize: 10, background: 'rgba(255, 107, 85, 0.15)', color: '#FF8A65', border: '1px solid rgba(255, 107, 85, 0.3)', padding: '2px 7px', borderRadius: 9999, fontWeight: 800 }}>PRO</span>
              </div>
              <div style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 600 }}>
                منظومة المقاولات والتشطيبات
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="ws-desktop-nav-links" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            fontSize: 13.5,
            fontWeight: 700,
            color: '#CBD5E1'
          }}>
            <a href="#hero" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>الرئيسية</a>
            <a href="#timeline" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>رحلة المشروع</a>
            <a href="#pillars" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>أركان القوة</a>
            <a href="#preview" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>المعاينة الحية</a>
            <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>الأسعار</a>
            <a href="#faq" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .15s' }}>الأسئلة الشائعة</a>
          </nav>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => onGoToLogin('login')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#CBD5E1',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 9999,
                fontFamily: 'inherit',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#CBD5E1'}
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
                fontWeight: 800,
                letterSpacing: '-0.01em'
              }}
            >
              <Rocket size={14} />
              <span>ابدأ الآن مجاناً</span>
            </button>

            {/* Mobile Menu Icon */}
            <button
              onClick={() => setMobileNavOpen(true)}
              style={{
                display: 'none',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                borderRadius: 9999,
                padding: 7,
                cursor: 'pointer'
              }}
              className="landing-mobile-menu-btn"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>
      </div>

      {/* ─── 2. HERO SECTION (العنوان الأسطوري والتصميم المرجاني على طراز Webbing Stone) ─── */}
      <section id="hero" style={{
        padding: 'clamp(50px, 8vw, 100px) 20px clamp(40px, 6vw, 70px)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        maxWidth: 1050,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24
      }}>
        {/* Top Glowing Pill Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 22px',
          borderRadius: 9999,
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          color: '#C7D2FE',
          fontSize: 13.5,
          fontWeight: 800,
          boxShadow: '0 0 24px rgba(99, 102, 241, 0.25)',
          animation: 'floatSoft 5s ease-in-out infinite'
        }}>
          <Sparkles size={16} color="#FF6B55" />
          <span>المنصة الذكية لإدارة المقاولات والتشطيبات الفاخرة 🏛️</span>
        </div>

        {/* Huge Dual-Color Typography (مثل: خطوتك نحو / التحول الرقمي) */}
        <h1 style={{
          fontSize: 'clamp(36px, 6.8vw, 68px)',
          fontWeight: 900,
          lineHeight: 1.25,
          letterSpacing: '-0.03em',
          margin: 0
        }}>
          <span style={{ display: 'block', color: '#FFFFFF' }}>خطوتك نحو</span>
          <span style={{
            display: 'inline-block',
            marginTop: 4,
            background: 'linear-gradient(90deg, #FF6B55 0%, #FFA07A 50%, #FF8A65 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 4px 20px rgba(255, 107, 85, 0.35))'
          }}>
            الإدارة الذكية والأرباح المضاعفة
          </span>
        </h1>

        {/* Balanced Subtitle */}
        <p style={{
          fontSize: 'clamp(15px, 2.2vw, 19px)',
          color: '#94A3B8',
          lineHeight: 1.75,
          maxWidth: 820,
          margin: 0,
          fontWeight: 500
        }}>
          من ضبط ميزانيات المواقع ومحرّك عقود الصنايعية الملزم هندسياً إلى تقارير الواتساب الفورية وبوابات العملاء التفاعلية — نقدم النظام الرقمي الأكثر شمولاً الذي يرفع أرباح شركتك ويحكم السيطرة على كل مليم.
        </p>

        {/* Hero CTA Button Capsule (على طراز Webbing Stone) */}
        <div className="ws-hero-cta-group" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginTop: 12
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
            onClick={() => openWhatsApp('مرحباً، أرغب في استشارة هندسية ومعرفة مميزات منصة تشطيب برو')}
            style={{
              padding: '15px 28px',
              borderRadius: 9999,
              fontSize: 15,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#F8FAFC',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = '#25D366';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            <MessageSquare size={17} color="#25D366" />
            <span>محادثة واتساب سريعة 💬</span>
          </button>
        </div>

        {/* Trust Points */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          flexWrap: 'wrap',
          fontSize: 13,
          fontWeight: 700,
          color: '#64748B',
          marginTop: 6
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} color="#10B981" /> تفعيل فوري بدون انتظار موافقة
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} color="#10B981" /> يعمل على الموبايل والكمبيوتر
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} color="#10B981" /> لا تشترط بطاقة ائتمانية للتجربة
          </span>
        </div>

        {/* Metrics Ribbon Bar (شريط الأرقام الإحصائية) */}
        <div className="ws-stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          width: '100%',
          maxWidth: 950,
          marginTop: 28,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(20px)',
          padding: '24px 28px',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(24px, 4.5vw, 36px)', fontWeight: 900, color: '#FF6B55', letterSpacing: '-0.02em' }}>+1,200</div>
            <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700, marginTop: 4 }}>موقع قيد المتابعة الحية</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(24px, 4.5vw, 36px)', fontWeight: 900, color: '#818CF8', letterSpacing: '-0.02em' }}>99.4%</div>
            <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700, marginTop: 4 }}>دقة في ضبط الميزانيات ومنع الهدر</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(24px, 4.5vw, 36px)', fontWeight: 900, color: '#10B981', letterSpacing: '-0.02em' }}>3 دقائق</div>
            <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700, marginTop: 4 }}>لاستخراج مقايسة BOQ متكاملة</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(24px, 4.5vw, 36px)', fontWeight: 900, color: '#38BDF8', letterSpacing: '-0.02em' }}>18 ساعة</div>
            <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700, marginTop: 4 }}>توفير أسبوعي لكل مهندس موقع</div>
          </div>
        </div>
      </section>

      {/* ─── 3. JOURNEY TIMELINE SECTION (الخط الزمني المضيء لرحلة المشروع على طراز Webbing Stone) ─── */}
      <section id="timeline" style={{
        padding: 'clamp(60px, 9vw, 110px) 20px',
        maxWidth: 1050,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: 'rgba(255, 107, 85, 0.12)',
            border: '1px solid rgba(255, 107, 85, 0.3)',
            color: '#FFA07A',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 12
          }}>
            <span>رحلة المشروع الذكية</span>
          </div>
          <h2 style={{
            fontSize: 'clamp(26px, 4.8vw, 42px)',
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            كيف يتحول موقعك من فوضى ورقية إلى منظومة دقيقة؟
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 16, maxWidth: 680, margin: '10px auto 0' }}>
            أربع محطات هندسية متكاملة تضمن لك الأرباح العالية ورضا العميل المطلق
          </p>
        </div>

        {/* Timeline Container */}
        <div style={{ position: 'relative', padding: '20px 0' }}>
          {/* Vertical Glowing Central Line */}
          <div className="ws-timeline-line" style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            background: 'linear-gradient(180deg, #6366F1 0%, #FF6B55 50%, #10B981 100%)',
            boxShadow: '0 0 16px rgba(99, 102, 241, 0.8)',
            zIndex: 0
          }} />

          {/* Timeline Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40, position: 'relative', zIndex: 1 }}>
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
                    background: '#0F172A',
                    border: '2px solid #FF6B55',
                    boxShadow: '0 0 18px rgba(255, 107, 85, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2
                  }}>
                    <Star size={15} color="#FF8A65" />
                  </div>

                  {/* Glass Card */}
                  <div className="ws-glass-card ws-timeline-card-wrapper" style={{
                    width: '45%',
                    padding: '26px 28px',
                    border: '1px solid rgba(255, 255, 255, 0.09)'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 9999,
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#A5B4FC',
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 12
                    }}>
                      {item.badge}
                    </div>
                    <h3 style={{ fontSize: 19, fontWeight: 900, color: '#FFFFFF', margin: '0 0 10px' }}>
                      {item.title}
                    </h3>
                    <p style={{ color: '#94A3B8', fontSize: 14.5, lineHeight: 1.7, margin: '0 0 14px' }}>
                      {item.desc}
                    </p>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: '#10B981'
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

      {/* ─── 4. CORE PILLARS SECTION (أركان القوة الأربعة على طراز Webbing Stone) ─── */}
      <section id="pillars" style={{
        padding: 'clamp(50px, 8vw, 90px) 20px',
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            color: '#C7D2FE',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 12
          }}>
            <span>القوة الهندسية الحقيقية</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 40px)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            أركان تشطيب برو لإدارة لا تقبل الأخطاء
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 16, maxWidth: 640, margin: '10px auto 0' }}>
            نظام متكامل يغنيك عن عشرات التطبيقات والشيتات المتفرقة
          </p>
        </div>

        {/* 4 Pillars Grid with Glowing Circular Icon Badges */}
        <div className="ws-pillars-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20
        }}>
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div key={idx} className="ws-pillar-card">
                {/* Circular Glowing Icon Badge (مثل أزرار Webbing Stone) */}
                <div style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(15, 23, 42, 0.8) 70%)',
                  border: `2px solid ${pillar.color}`,
                  boxShadow: `0 0 24px ${pillar.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  transition: 'transform 0.3s ease'
                }}>
                  <Icon size={28} color={pillar.color} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF', margin: '0 0 12px' }}>
                  {pillar.title}
                </h3>
                <p style={{ color: '#94A3B8', fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. INTERACTIVE LIVE PREVIEW SHOWCASE (المعاينة التفاعلية داخل بطاقة زجاجية) ─── */}
      <section id="preview" style={{
        padding: 'clamp(40px, 7vw, 80px) 20px',
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ color: '#FF8A65', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>
            معاينة حية من داخل النظام
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginTop: 8, color: '#FFFFFF' }}>
            شاهد كيف تدار أعمالك باحترافية وسرعة
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 15, maxWidth: 650, margin: '8px auto 0' }}>
            اضغط على التبويبات بالأسفل لتستعرض قوة وتفاصيل كل أداة صُممت خصيصاً لمشاريع التشطيب.
          </p>
        </div>

        {/* Interactive Tabs Strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
          <button
            className={`preview-tab-btn-dark ${previewTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setPreviewTab('contracts')}
          >
            <ShieldCheck size={16} /> عقود الصنايعية والورش 📜
          </button>
          <button
            className={`preview-tab-btn-dark ${previewTab === 'portal' ? 'active' : ''}`}
            onClick={() => setPreviewTab('portal')}
          >
            <Users size={16} /> بوابة العميل والواتساب 🌐
          </button>
          <button
            className={`preview-tab-btn-dark ${previewTab === 'boq' ? 'active' : ''}`}
            onClick={() => setPreviewTab('boq')}
          >
            <Calculator size={16} /> المقايسات الذكية ⚡
          </button>
          <button
            className={`preview-tab-btn-dark ${previewTab === 'snags' ? 'active' : ''}`}
            onClick={() => setPreviewTab('snags')}
          >
            <CheckCircle2 size={16} /> استلامات الجودة (Snags) ✅
          </button>
        </div>

        {/* Preview Screen Card */}
        <div className="ws-glass-card" style={{ padding: 'clamp(20px, 4vw, 36px)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
          {previewTab === 'contracts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#FF8A65', fontWeight: 800 }}>محرّك العقود القانونية الفنية</span>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', margin: '4px 0 0' }}>عقد مقاولة مصنعية أعمال السيراميك والبورسلين</h3>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 800 }}>معتمد وموقع إلكترونياً ✅</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 16, borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700 }}>الطرف الأول (المقاول العام)</div>
                  <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 15, marginTop: 4 }}>شركة أملاك للمقاولات والتشطيبات</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 16, borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700 }}>الطرف الثاني (صنايعي الباطن)</div>
                  <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 15, marginTop: 4 }}>الأسطى / محمود عبد الرحيم (معلم سيراميك)</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: 16, padding: 18, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontWeight: 800, color: '#FF8A65', fontSize: 14, marginBottom: 10 }}>شروط الاستلام الفني المشددة المعتمدة بالعقد:</div>
                <ul style={{ margin: 0, paddingRight: 20, color: '#CBD5E1', fontSize: 13.5, lineHeight: 1.8 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#6366F1', fontWeight: 800 }}>بوابة العميل الرقمية التفاعلية</span>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', margin: '4px 0 0' }}>مشروع فيلا د. طارق رضوان — التجمع الخامس</h3>
                </div>
                <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#A5B4FC', padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 800 }}>رابط خاص مباشر بدون تطبيق 🔗</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 16, borderRadius: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>نسبة التنفيذ الحالية</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#10B981', marginTop: 4 }}>74%</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 16, borderRadius: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>المرحلة الجارية</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#38BDF8', marginTop: 8 }}>الدهانات والأسقف المعلقة</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 16, borderRadius: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>الدفعة القادمة</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#FF8A65', marginTop: 8 }}>عند استلام أول وش بطانة</div>
                </div>
              </div>
            </div>
          )}

          {previewTab === 'boq' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#10B981', fontWeight: 800 }}>حاسبة المقايسات الفورية (BOQ)</span>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', margin: '4px 0 0' }}>مقايسة تشطيب شقة سكنية (210 م²) — الترا لوكس</h3>
                </div>
                <button
                  className="ws-coral-btn"
                  onClick={handleStartTrial}
                  style={{ padding: '7px 16px', borderRadius: 9999, fontSize: 12 }}
                >
                  جرّب الحاسبة الآن ⚡
                </button>
              </div>
              <p style={{ color: '#94A3B8', fontSize: 14 }}>حساب فوري للمصنعيات وتكلفة الخامات بدقة السوق الحالية، مع تحديد هامش ربح شركتك وتصدير ملف العرض بختم شركتك في لحظات.</p>
            </div>
          )}

          {previewTab === 'snags' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 800 }}>قوائم استلامات الجودة الهندسية</span>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', margin: '4px 0 0' }}>كشف ملاحظات استلام مرحلة المحارة والكهرباء</h3>
                </div>
                <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FCD34D', padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 800 }}>تثبيت دقيق على المخطط 📍</span>
              </div>
              <p style={{ color: '#94A3B8', fontSize: 14 }}>التقاط صور الملاحظات من الموقع وإسقاطها بنقاط مرئية على المخطط الهندسي لتوجيه الصنايعي وتلافي أي تكسير بعد التشطيب النهائي.</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── 6. COMPARISON SECTION (مقارنة القوة: تشطيب برو ضد إكسيل والأنظمة المعقدة) ─── */}
      <section id="comparison" style={{
        padding: 'clamp(50px, 8vw, 90px) 20px',
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: 'rgba(255, 107, 85, 0.12)',
            border: '1px solid rgba(255, 107, 85, 0.3)',
            color: '#FFA07A',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 12
          }}>
            <span>المقارنة الشاملة</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 40px)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            لماذا يختار المقاولون تشطيب برو؟
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 16, maxWidth: 640, margin: '10px auto 0' }}>
            شاهد الفارق بين الأدوات البدائية والحلول المحاسبية المعقدة وبين منصة صُممت للموقع
          </p>
        </div>

        <div className="ws-glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '18px 20px', color: '#CBD5E1', fontWeight: 800 }}>وجه المقارنة</th>
                  <th style={{ padding: '18px 20px', color: '#94A3B8', fontWeight: 700 }}>شيتات إكسيل والواتساب</th>
                  <th style={{ padding: '18px 20px', color: '#94A3B8', fontWeight: 700 }}>أنظمة الـ ERP المعقدة</th>
                  <th style={{ padding: '18px 20px', color: '#FF6B55', fontWeight: 900, background: 'rgba(255, 107, 85, 0.08)' }}>تشطيب برو (Tashteeb Pro) ⭐</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background .15s' }}>
                    <td style={{ padding: '16px 20px', color: '#FFFFFF', fontWeight: 800 }}>{row.feature}</td>
                    <td style={{ padding: '16px 20px', color: '#94A3B8' }}>{row.excel}</td>
                    <td style={{ padding: '16px 20px', color: '#94A3B8' }}>{row.eleven}</td>
                    <td style={{ padding: '16px 20px', color: '#10B981', fontWeight: 800, background: 'rgba(255, 107, 85, 0.04)' }}>{row.tashteeb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── 7. PRICING SECTION (الباقات والأسعار الشفافة بالنمط الزجاجي الداكن) ─── */}
      <section id="pricing" style={{
        padding: 'clamp(50px, 8vw, 100px) 20px',
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
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            color: '#C7D2FE',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 12
          }}>
            <span>خطط استثمار واضحة وشفافة</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 40px)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            اختر الباقة المناسبة لحجم أعمالك
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 16, maxWidth: 640, margin: '10px auto 0' }}>
            أسعار واضحة بدون رسوم خفية أو عقود احتكار طويلة
          </p>

          {/* Billing Cycle Toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: 9999,
            padding: 4,
            marginTop: 24,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 20px',
                borderRadius: 9999,
                border: 'none',
                background: billingCycle === 'monthly' ? '#6366F1' : 'transparent',
                color: billingCycle === 'monthly' ? '#FFFFFF' : '#94A3B8',
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
                background: billingCycle === 'yearly' ? '#FF6B55' : 'transparent',
                color: billingCycle === 'yearly' ? '#FFFFFF' : '#94A3B8',
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
              <span style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.25)', padding: '2px 7px', borderRadius: 9999, fontWeight: 900 }}>شهرين مجاناً 🔥</span>
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
                className="ws-glass-card"
                style={{
                  padding: '36px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  border: isPopular ? '2px solid #FF6B55' : '1px solid rgba(255, 255, 255, 0.09)',
                  boxShadow: isPopular ? '0 20px 60px rgba(255, 107, 85, 0.25)' : undefined
                }}
              >
                {isPopular && (
                  <div style={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #FF6B55 0%, #FF8A65 100%)',
                    color: '#FFFFFF',
                    padding: '4px 16px',
                    borderRadius: 9999,
                    fontSize: 11.5,
                    fontWeight: 900,
                    boxShadow: '0 4px 14px rgba(255, 107, 85, 0.4)'
                  }}>
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>{plan.name}</h3>
                  <p style={{ color: '#94A3B8', fontSize: 13, minHeight: 38, marginTop: 6, lineHeight: 1.5 }}>{plan.subtitle}</p>

                  <div style={{ margin: '20px 0 24px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 38, fontWeight: 900, color: isPopular ? '#FF8A65' : '#FFFFFF', letterSpacing: '-0.02em' }}>
                      {price}
                    </span>
                    <span style={{ fontSize: 14, color: '#94A3B8', fontWeight: 700 }}>
                      {plan.currency} / شهرياً
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 20, marginBottom: 26 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#CBD5E1', marginBottom: 12 }}>المميزات المشمولة:</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {plan.features.map((f, fIdx) => (
                        <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#CBD5E1', lineHeight: 1.5 }}>
                          <CheckCircle2 size={16} color={isPopular ? '#FF8A65' : '#10B981'} style={{ flexShrink: 0, marginTop: 2 }} />
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
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
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

      {/* ─── 8. FAQ ACCORDION SECTION (الأسئلة الأكثر شيوعاً) ─── */}
      <section id="faq" style={{
        padding: 'clamp(40px, 7vw, 80px) 20px',
        maxWidth: 850,
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
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            color: '#C7D2FE',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 12
          }}>
            <span>الأسئلة الشائعة</span>
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            إجابات واضحة لكل ما قد يشغل بالك
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="ws-glass-card"
                style={{
                  padding: '18px 24px',
                  cursor: 'pointer',
                  borderRadius: 18,
                  border: isOpen ? '1px solid rgba(255, 107, 85, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)'
                }}
                onClick={() => setActiveFaq(isOpen ? null : idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{faq.q}</h3>
                  <div style={{ color: isOpen ? '#FF6B55' : '#94A3B8' }}>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                {isOpen && (
                  <p style={{ color: '#94A3B8', fontSize: 14.5, lineHeight: 1.7, margin: '14px 0 4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 12 }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 9. BOTTOM RADIANT CALL-TO-ACTION (على طراز خاتمة Webbing Stone المشرقة) ─── */}
      <section style={{
        padding: 'clamp(60px, 9vw, 100px) 20px',
        maxWidth: 1050,
        margin: '30px auto 60px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.3) 0%, rgba(255, 107, 85, 0.2) 60%, rgba(15, 23, 42, 0.8) 100%)',
          borderRadius: 32,
          padding: 'clamp(36px, 6vw, 64px) 24px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.6)'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            fontSize: 12.5,
            fontWeight: 800,
            marginBottom: 16
          }}>
            <Sparkles size={15} color="#FF6B55" />
            <span>ابدأ الانطلاقة الذكية اليوم</span>
          </div>

          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 46px)',
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '0 0 16px',
            letterSpacing: '-0.02em'
          }}>
            هل أنت مستعد لمضاعفة أرباح وضبط مواقع شركتك؟
          </h2>

          <p style={{ color: '#E2E8F0', fontSize: 17, maxWidth: 680, margin: '0 auto 28px', lineHeight: 1.7 }}>
            انضم الآن إلى مئات المهندسين وشركات المقاولات والتشطيبات الذين وثّقوا أعمالهم وأوقفوا النزاعات مع تشطيب برو.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              className="ws-coral-btn"
              onClick={handleStartTrial}
              style={{
                padding: '16px 36px',
                borderRadius: 9999,
                fontSize: 16.5,
                fontWeight: 900
              }}
            >
              <Rocket size={19} />
              <span>ابدأ تجربتك المجانية لمدة 14 يوماً 🚀</span>
            </button>

            <button
              onClick={() => openWhatsApp('مرحباً، أريد الاشتراك في منصة تشطيب برو')}
              style={{
                padding: '16px 28px',
                borderRadius: 9999,
                fontSize: 15,
                fontWeight: 800,
                background: 'rgba(255, 255, 255, 0.08)',
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

      {/* ─── 10. LUXURY DARK FOOTER ─── */}
      <footer style={{
        background: '#04060A',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '50px 20px 30px',
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
          gap: 24
        }}>
          {/* Logo & Slogan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#0F172A',
              border: '1px solid rgba(255, 107, 85, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img src="/app-icon.png" alt="Tashteeb Pro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#FFFFFF' }}>تشطيب برو | Tashteeb Pro</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>المنصة الذكية لإدارة المقاولات والتشطيبات الفاخرة © 2026</div>
            </div>
          </div>

          {/* Quick Footer Links */}
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => onGoToLogin('login')}>بوابة الدخول</span>
            <span style={{ cursor: 'pointer' }} onClick={() => onGoToLogin('register')}>إنشاء حساب</span>
            <span style={{ cursor: 'pointer' }} onClick={() => openWhatsApp()}>الدعم الفني والواتساب</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
