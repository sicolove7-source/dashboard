import React, { useState } from 'react';
import {
  Building2, HardHat, FileText, CheckCircle2, TrendingUp, ShieldCheck,
  Zap, Users, Phone, MessageSquare, ArrowLeft, Star, Clock, Award,
  Sparkles, Check, ChevronDown, ChevronUp, Lock, Laptop, Smartphone,
  ExternalLink, DollarSign, Calculator, Layers, HelpCircle
} from 'lucide-react';

export default function LandingPage({ onGoToLogin, onStartLiveDemo }) {
  const [activeFaq, setActiveFaq] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialForm, setTrialForm] = useState({ name: '', company: '', phone: '', city: 'دبي - الإمارات' });

  const waNumber = '971501234567';

  function openWhatsApp(msg) {
    const text = encodeURIComponent(msg || 'مرحباً، أرغب في الاستفسار والاشتراك في منصة إدارة التشطيبات والمقاولات');
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  }

  function handleTrialSubmit(e) {
    e.preventDefault();
    const msg = `مرحباً، أرغب في طلب تجربة مجانية لمنصة المقاولات:
• اسم المسؤول: ${trialForm.name}
• اسم الشركة/المكتب: ${trialForm.company}
• الهاتف: ${trialForm.phone}
• المدينة: ${trialForm.city}`;
    openWhatsApp(msg);
    setShowTrialModal(false);
  }

  const features = [
    {
      icon: HardHat,
      color: '#D97706',
      bg: 'rgba(217, 119, 6, 0.1)',
      title: 'إدارة مقاولي الباطن والعقود',
      desc: 'دليل شامل لبيانات وسجلات المقاولين، وتوليد أوامر شغل وعقود قانونية بختم وتوقيع إلكتروني حي.'
    },
    {
      icon: FileText,
      color: '#0D9488',
      bg: 'rgba(13, 148, 136, 0.1)',
      title: 'المستخلصات وحسابات الضمان',
      desc: 'إصدار ومتابعة مستخلصات التنفيذ والصرف تلقائياً، مع خصم نسب الضمان المحتجز (5-10%) والدفعات المقدمة.'
    },
    {
      icon: Building2,
      color: '#6366F1',
      bg: 'rgba(99, 102, 241, 0.1)',
      title: 'متابعة المواقع والمراحل الحية',
      desc: 'جدول زمني ومخطط مراحل دقيق لكل موقع، ونسب إنجاز لحظية وتقارير يومية مصورة للملاك والاستشاريين.'
    },
    {
      icon: Calculator,
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.1)',
      title: 'المقايسات الذكية والتسعير',
      desc: 'إنشاء مقايسات أعمال تفصيلية وحساب التكاليف وهوامش الأرباح وتصدير عروض أسعار PDF فاخرة للعملاء.'
    },
    {
      icon: TrendingUp,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.1)',
      title: 'المالية والأرباح والعهد',
      desc: 'كشوفات حساب تفصيلية لكل مشروع، مراقبة المصروفات، التدفقات النقدية، وصافي أرباح العمليات بدقة.'
    },
    {
      icon: Smartphone,
      color: '#EC4899',
      bg: 'rgba(236, 72, 153, 0.1)',
      title: 'تطبيق متكامل للموبايل والموقع',
      desc: 'واجهة مهندسين متطورة وتطبيق للموبايل يتيح إدارة كافة المهام والمستخلصات من قلب موقع العمل.'
    }
  ];

  const pricingPlans = [
    {
      id: 'starter',
      name: 'باقة المكاتب الناشئة',
      subtitle: 'للمهندسين المستقلين والمكاتب الفردية',
      priceMonthly: 199,
      priceYearly: 149,
      currency: 'د.إ',
      badge: 'انطلاقة قوية 🚀',
      features: [
        'إدارة حتى 5 مشاريع تشطيب نشطة',
        'دليل مقاولي الباطن والمستخلصات',
        'توليد المقايسات الذكية وعروض الأسعار',
        'التقارير اليومية وتتبع نسب الإنجاز',
        'حسابات مالية ومصروفات المشاريع',
        'دعم فني وتحديثات مستمرة',
      ],
      popular: false,
    },
    {
      id: 'pro',
      name: 'باقة الشركات الاحترافية',
      subtitle: 'لشركات ومؤسسات التشطيبات والمقاولات',
      priceMonthly: 399,
      priceYearly: 299,
      currency: 'د.إ',
      badge: 'الأكثر طلباً واستخداماً ⭐',
      features: [
        'مشاريع تشطيبات ومقاولات غير محدودة',
        'إدارة كاملة لمقاولي الباطن وأوامر الشغل',
        'مولد العقود الرسمية مع الختم والتوقيع الحي',
        'إدارة المستخلصات والضمانات المحتجزة',
        'إدارة الموردين وأوامر الشراء والمخازن',
        'بوابة خاصة للملاك لمتابعة موقعهم مباشرة',
        'تكامل رسائل وتنبيهات الواتساب التلقائية',
        'دعم فني ذو أولوية وتدريب فريق العمل',
      ],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'باقة المقاولات الكبرى',
      subtitle: 'للشركات متعددة الفروع والمؤسسات الكبرى',
      priceMonthly: 799,
      priceYearly: 599,
      currency: 'د.إ',
      badge: 'حلول مخصصة وشاملة 🏢',
      features: [
        'كل مميزات الباقة الاحترافية',
        'إدارة فروع وشركات فرعية متعددة (Multi-Tenant)',
        'تخصيص الهوية والشعار والدومين الخاص',
        'صلاحيات مستخدمين وأدوار متقدمة للفريق',
        'تقارير محاسبية وربحية مركزية عليا',
        'أتمتة وتنبيهات ذكية مخصصة',
        'مدير حساب مخصص وتدريب ميداني VIP',
      ],
      popular: false,
    }
  ];

  const faqs = [
    {
      q: 'هل يمكنني تجربة النظام قبل الاشتراك؟',
      a: 'نعم بكل تأكيد! يمكنك الضغط على زر "تجربة حية فوراً (Live Demo)" في أعلى الصفحة لتجربة النظام مباشرة بكافة ميزاته وبياناته التوضيحية مجاناً.'
    },
    {
      q: 'هل يدعم النظام توليد العقود بختم وتوقيع إلكتروني؟',
      a: 'نعم، يحتوي النظام على محرر عقود رسمي يتيح لك توقيع العقد إلكترونياً بلمسة إصبع أو ماوس وإدراج خاتم شركتك المعتمد وطباعته أو إرساله بـ PDF للعميل أو المقاول.'
    },
    {
      q: 'هل يعمل النظام بسلاسة على شاشات الهواتف الذكية؟',
      a: 'النظام مبني بتقنيات Responsive حديثة تتيح للمهندس في الموقع استخدام كافة الأدوات، متابعة نسب الإنجاز، وإصدار المستخلصات من هاتفه بكل راحة وسرعة.'
    },
    {
      q: 'كيف يتم تسليم وتفعيل النظام لشركتي بعد الاشتراك؟',
      a: 'يتم تفعيل مساحة عمل سحابية خاصة بشركتك فوراً مع شعارك وبياناتك وعملتك المحلية خلال دقائق، مع تزويدك بروابط الدخول وحسابات فريق العمل.'
    },
    {
      q: 'هل بيانات شركتي ومشاريعي مشفرة وآمنة؟',
      a: 'تعتمد المنصة على تشفير متقدم 256-bit مع عزل تام لقواعد بيانات كل شركة، وتخزين سحابي معتمد يضمن سرية وأمان كافة المستندات والبيانات المالية.'
    }
  ];

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: 'var(--bg-color, #F8FAFC)',
      color: 'var(--ink, #0F172A)',
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      overflowX: 'hidden'
    }}>
      {/* ─── 1. TOP NAVBAR ─── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border, #E2E8F0)',
        padding: '14px 24px',
      }}>
        <div style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #D97706, #B45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)'
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--ink, #0F172A)', lineHeight: 1.2 }}>
                منصة بنيان للتشطيبات
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted, #64748B)', fontWeight: 600 }}>
                نظام المقاولات وإدارة المشاريع الموحد
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--muted, #64748B)'
          }} className="desktop-nav">
            <a href="#features" style={{ color: 'inherit', textDecoration: 'none', transition: 'color .2s' }}>المميزات</a>
            <a href="#contractors" style={{ color: 'inherit', textDecoration: 'none' }}>مقاولو الباطن</a>
            <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>الأسعار والباقات</a>
            <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>الأسئلة الشائعة</a>
          </nav>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onStartLiveDemo}
              className="btn btn-primary"
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #D97706, #B45309)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)'
              }}
            >
              <Sparkles size={15} />
              <span>تجربة حية فوراً (Demo)</span>
            </button>

            <button
              onClick={onGoToLogin}
              style={{
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 10,
                background: 'transparent',
                color: 'var(--ink, #0F172A)',
                border: '1.5px solid var(--border, #E2E8F0)',
                cursor: 'pointer',
              }}
            >
              <Lock size={14} />
              <span>تسجيل الدخول</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section style={{
        padding: '60px 20px 70px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.05) 0%, transparent 100%)'
      }}>
        <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 30,
            background: 'rgba(217, 119, 6, 0.12)',
            color: '#B45309',
            fontSize: 13,
            fontWeight: 800,
            border: '1px solid rgba(217, 119, 6, 0.25)'
          }}>
            <Award size={15} />
            <span>🔥 المنصة رقم #1 لإدارة شركات التشطيبات والمقاولات في الوطن العربي</span>
          </div>

          {/* Main Title */}
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 900,
            lineHeight: 1.25,
            color: 'var(--ink, #0F172A)',
            margin: 0
          }}>
            أدِر مشاريعك، مقاولي الباطن،<br />
            <span style={{
              background: 'linear-gradient(135deg, #D97706, #B45309)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              ومستخلصاتك المالية باحترافية وسهولة
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'var(--muted, #64748B)',
            lineHeight: 1.6,
            maxWidth: 720,
            margin: 0
          }}>
            المنصة الأولى المصممة خصيصاً لشركات ومكاتب الديكور والتشطيبات والمقاولات — مقايسات ذكية، عقود رسمية بختم وتوقيع إلكتروني، ومتابعة دقيقة للأرباح والتدفقات النقدية.
          </p>

          {/* Hero CTAs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
            marginTop: 10
          }}>
            <button
              onClick={onStartLiveDemo}
              style={{
                padding: '14px 28px',
                fontSize: 16,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #D97706, #B45309)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(217, 119, 6, 0.4)',
                transition: 'transform .2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Sparkles size={18} />
              <span>دخول وتجربة النسخة الحية فوراً (Live Demo)</span>
            </button>

            <button
              onClick={() => openWhatsApp('مرحباً، أرغب في الاستفسار عن باقات منصة إدارة التشطيبات والمقاولات')}
              style={{
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 14,
                background: '#25D366',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)',
              }}
            >
              <MessageSquare size={18} />
              <span>تواصل مع المبيعات واتساب</span>
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 16,
            width: '100%',
            maxWidth: 780,
            marginTop: 36,
            background: 'var(--card, #fff)',
            padding: '20px 24px',
            borderRadius: 18,
            border: '1px solid var(--border, #E2E8F0)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.03)'
          }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#D97706' }}>+150</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>شركة ومكتب مقاولات</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0D9488' }}>+2,400</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>مشروع تشطيبات منجز</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#6366F1' }}>100%</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>دقة في حسابات المستخلصات</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#10B981' }}>24/7</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>دعم فني هندسي متواصل</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURES SHOWCASE ─── */}
      <section id="features" style={{ padding: '70px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ color: '#D97706', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
            مميزات المنصة الشاملة
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginTop: 8, color: 'var(--ink)' }}>
            كل ما تحتاجه لإدارة أعمالك الهندسية بنجاح
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 600, margin: '10px auto 0' }}>
            حلول برمجية متخصصة تضمن تسليم مشاريعك في مواعيدها ومراقبة كل درهم يدخل ويخرج من شركتك.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24
        }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                style={{
                  background: 'var(--card, #fff)',
                  padding: 28,
                  borderRadius: 18,
                  border: '1px solid var(--border, #E2E8F0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                  transition: 'all .25s'
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
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 4. PRICING PLANS ─── */}
      <section id="pricing" style={{
        padding: '80px 20px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(217, 119, 6, 0.04) 100%)',
        borderTop: '1px solid var(--border, #E2E8F0)'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{ color: '#D97706', fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>
              باقات وأسعار الاشتراك
            </span>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginTop: 8, color: 'var(--ink)' }}>
              باقات مرنة تناسب حجم أعمالك
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 600, margin: '8px auto 0' }}>
              اختر الباقة المناسبة لمكتبك مع إمكانية الترقية في أي وقت، وبدون أي عقود ملزمة طويلة الأجل.
            </p>

            {/* Billing toggle */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--card, #fff)',
              padding: '6px 8px',
              borderRadius: 30,
              border: '1px solid var(--border, #E2E8F0)',
              marginTop: 20
            }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '8px 18px',
                  borderRadius: 24,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: billingCycle === 'monthly' ? '#D97706' : 'transparent',
                  color: billingCycle === 'monthly' ? '#fff' : 'var(--muted)',
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
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: billingCycle === 'yearly' ? '#D97706' : 'transparent',
                  color: billingCycle === 'yearly' ? '#fff' : 'var(--muted)',
                  transition: 'all .2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>الدفع السنوي</span>
                <span style={{
                  background: billingCycle === 'yearly' ? 'rgba(255,255,255,0.25)' : 'rgba(16, 185, 129, 0.15)',
                  color: billingCycle === 'yearly' ? '#fff' : '#10B981',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11
                }}>
                  وفر 25% 🎁
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            alignItems: 'stretch'
          }}>
            {pricingPlans.map((p) => {
              const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--card, #fff)',
                    borderRadius: 22,
                    padding: 32,
                    border: p.popular ? '2px solid #D97706' : '1px solid var(--border, #E2E8F0)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: p.popular ? '0 12px 36px rgba(217, 119, 6, 0.15)' : '0 4px 16px rgba(0,0,0,0.02)',
                  }}
                >
                  {p.popular && (
                    <div style={{
                      position: 'absolute',
                      top: -14,
                      right: 24,
                      background: 'linear-gradient(135deg, #D97706, #B45309)',
                      color: '#fff',
                      padding: '4px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 800,
                      boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                    }}>
                      {p.badge}
                    </div>
                  )}

                  <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>{p.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 20px' }}>{p.subtitle}</p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 }}>
                    <span style={{ fontSize: 38, fontWeight: 900, color: 'var(--ink)' }}>{price}</span>
                    <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 700 }}>{p.currency} / شهرياً</span>
                  </div>

                  {/* Features List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, marginBottom: 28 }}>
                    {p.features.map((feat, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                        <Check size={16} color="#10B981" style={{ flexShrink: 0 }} />
                        <span style={{ color: 'var(--ink)' }}>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Plan CTA */}
                  <button
                    onClick={() => openWhatsApp(`مرحباً، أرغب في الاشتراك في (${p.name}) بسعر ${price} ${p.currency}`)}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      background: p.popular ? 'linear-gradient(135deg, #D97706, #B45309)' : 'var(--navy, #0F172A)',
                      color: '#fff',
                      boxShadow: p.popular ? '0 6px 18px rgba(217, 119, 6, 0.35)' : 'none',
                    }}
                  >
                    اشترك الآن عبر واتساب 💬
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5. FAQ SECTION ─── */}
      <section id="faq" style={{ padding: '70px 20px', maxWidth: 840, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 900, color: 'var(--ink)' }}>
            الأسئلة الشائعة حول المنصة
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
            إجابات عن أكثر الاستفسارات التي تهم المهندسين ومكاتب المقاولات.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--card, #fff)',
                  border: '1px solid var(--border, #E2E8F0)',
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'right',
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: 800,
                    color: 'var(--ink)',
                  }}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} color="#D97706" /> : <ChevronDown size={18} color="var(--muted)" />}
                </button>

                {isOpen && (
                  <div style={{
                    padding: '0 20px 18px',
                    fontSize: 14,
                    color: 'var(--muted)',
                    lineHeight: 1.6,
                    borderTop: '1px dashed var(--border, #E2E8F0)',
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

      {/* ─── 6. FOOTER ─── */}
      <footer style={{
        background: 'var(--navy, #0F172A)',
        color: '#F8FAFC',
        padding: '40px 20px 24px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #D97706, #B45309)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}>
              <Building2 size={20} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>منصة بنيان لإدارة التشطيبات والمقاولات</span>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, maxWidth: 500, margin: 0 }}>
            النظام السحابي الأحدث للمهندسين ومكاتب المقاولات والديكور في الإمارات ومصر والمملكة العربية السعودية.
          </p>

          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
            <span style={{ cursor: 'pointer' }} onClick={onStartLiveDemo}>تجربة حية فورية</span>
            <span>•</span>
            <span style={{ cursor: 'pointer' }} onClick={() => openWhatsApp('استفسار')}>تواصل واتساب</span>
            <span>•</span>
            <span style={{ cursor: 'pointer' }} onClick={onGoToLogin}>بوابة الدخول</span>
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>
            جميع الحقوق محفوظة © {new Date().getFullYear()} منصة بنيان • اتصال مشفر وآمن 256-bit
          </div>
        </div>
      </footer>
    </div>
  );
}
