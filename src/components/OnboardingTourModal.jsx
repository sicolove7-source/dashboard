/**
 * OnboardingTourModal — الجولة الاستكشافية المُحسَّنة
 * شاشة ترحيب فاخرة + اختيار الدور + جولة مُخصَّصة بالأيقونات والألوان
 */
import React, { useState } from 'react';
import {
  Compass, LayoutDashboard, HardHat, Mic, ShieldCheck,
  Calculator, UserCheck, Zap, ArrowLeft, ArrowRight, X,
  CheckCircle2, Sparkles, Building2, TrendingUp, Play,
  Briefcase, Wrench, BookOpen, Crown, ChevronLeft
} from 'lucide-react';

let confettiFn = null;
try { import('canvas-confetti').then(m => { confettiFn = m.default; }); } catch {}
function fireConfetti() {
  try {
    if (confettiFn) confettiFn({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#1877F2', '#22C55E', '#F59E0B', '#EC4899'] });
  } catch {}
}

/* ─── خطوات حسب الدور ─── */
const STEPS_OWNER = [
  {
    id: 'overview',
    title: 'لوحة قيادة صاحب الشركة',
    subtitle: 'شاهد كل مليم وكل موقع في شاشة واحدة — مؤشرات مالية حية وتنبيهات فورية.',
    icon: LayoutDashboard,
    badge: '💰 التحكم المالي',
    highlights: ['مؤشرات الأداء: المشاريع المنضبطة والمتأخرة.', 'التدفقات النقدية والمصروفات الفعلية لحظة بلحظة.', 'تنبيهات ببنود الاعتماد الفني المعلقة.'],
    targetTab: 'overview',
    actionText: 'افتح لوحة القيادة',
    color: '#1877F2',
  },
  {
    id: 'quotations',
    title: 'عروض الأسعار في 3 دقائق',
    subtitle: 'احسب مقايسة BOQ كاملة وأرسل عرض سعر احترافي قبل أن ينتهي الاجتماع مع العميل!',
    icon: Calculator,
    badge: '⚡ سرعة الإغلاق',
    highlights: ['حساب تلقائي لبنود التشطيب (اقتصادي، سوبر لوكس، ألترا لوكس).', 'تصدير عرض سعر بتصميم فخم يحمل شعار شركتك.', 'زيادة معدل إغلاق الصفقات بشكل ملحوظ.'],
    targetTab: 'quotations',
    actionText: 'جرّب الحاسبة',
    color: '#F59E0B',
  },
  {
    id: 'client_portal',
    title: 'بوابة العميل — أقوى أداة تسويقية',
    subtitle: 'أرسل لعميلك رابطاً يرى فيه تقدم شقته أو فيلته — يوقف اتصالات "احنا فين يا أستاذ؟"',
    icon: UserCheck,
    badge: '🌟 خدمة مميزة',
    highlights: ['رابط خاص لكل عميل يفتح من الجوال بدون تطبيق.', 'صور التشطيب اليومية ونسب الإنجاز الحية.', 'العميل المسرور يجيب لك عملاء جدد تلقائياً.'],
    targetTab: 'crm',
    actionText: 'استكشف بوابة العميل',
    color: '#10B981',
  },
];

const STEPS_ENGINEER = [
  {
    id: 'field_voice',
    title: 'تقاريرك الميدانية في 30 ثانية',
    subtitle: 'سجّل يوميتك بالصوت من الموقع — بدون كتابة، بدون واتساب، مباشرة في النظام.',
    icon: Mic,
    badge: '🎙️ ابتكار ميداني',
    highlights: ['تسجيل صوتي يتحول تلقائياً لتقرير نصي منظم.', 'رفع صور التوثيق وتحديد موقع الملاحظة على المخطط.', 'لا حاجة لاتصال قوي بالإنترنت.'],
    targetTab: 'projects',
    actionText: 'افتح مواقع العمل',
    color: '#1877F2',
  },
  {
    id: 'quality_gates',
    title: 'بوابات الجودة قبل كل مرحلة',
    subtitle: 'قائمة تفتيش هندسية رسمية لكل مرحلة تشطيب — وقِّع إلكترونياً قبل الانتقال للمرحلة التالية.',
    icon: ShieldCheck,
    badge: '✅ صفر أخطاء',
    highlights: ['اختبار كبس الشبكات بالبار مع توثيق النتائج.', 'اختبار عزل المياه بالغمر 48 ساعة.', 'فحص الاستواء بالليزر واستلام الدهانات.'],
    targetTab: 'projects',
    actionText: 'افتح بوابات الجودة',
    color: '#10B981',
  },
  {
    id: 'subcontractors',
    title: 'مقاولو الباطن والمستخلصات',
    subtitle: 'أصدر أوامر العمل، تابع المستخلصات التراكمية، وتحكم في ضمانات الأعمال.',
    icon: HardHat,
    badge: '🔧 إدارة الباطن',
    highlights: ['عقود مقاولة باطن جاهزة للطباعة والتوقيع.', 'حساب المستخلصات (السابق + الحالي) وخصم الدفعة المقدمة آلياً.', 'تتبع مبالغ التأمين والإفراج عنها عند التسليم.'],
    targetTab: 'subcontractors',
    actionText: 'فتح موديول الباطن',
    color: '#F59E0B',
  },
];

const STEPS_ACCOUNTANT = [
  {
    id: 'finance',
    title: 'المالية والتدفقات النقدية',
    subtitle: 'تتبع كل مليم: المقبوضات، المدفوعات، الأجور، وتحليل ربحية كل مشروع بشكل منفصل.',
    icon: TrendingUp,
    badge: '📊 التحليل المالي',
    highlights: ['تقارير التدفقات النقدية الشهرية والربع سنوية.', 'تحليل ربحية كل مشروع والمقارنة بالميزانية المعتمدة.', 'تنبيهات تأخر الدفعات ومتابعة التحصيل.'],
    targetTab: 'finance',
    actionText: 'افتح المالية',
    color: '#1877F2',
  },
  {
    id: 'suppliers',
    title: 'الموردون والمستحقات',
    subtitle: 'تتبع مستحقات الموردين، تواريخ الاستحقاق، والمدفوعات المعلقة في مكان واحد.',
    icon: Briefcase,
    badge: '📦 إدارة الموردين',
    highlights: ['سجل كامل لمشتريات كل مورد والمبالغ المستحقة.', 'تنبيهات مواعيد الدفع قبل الاستحقاق.', 'تقارير الحسابات الختامية مع كل مورد.'],
    targetTab: 'suppliers',
    actionText: 'افتح الموردين',
    color: '#10B981',
  },
  {
    id: 'overview_finance',
    title: 'لوحة المتابعة المالية للإدارة',
    subtitle: 'رفع تقارير مالية احترافية لصاحب الشركة في دقائق — بدون إكسيل بدون جداول يدوية.',
    icon: LayoutDashboard,
    badge: '📈 تقارير الإدارة',
    highlights: ['ملخص مالي تلقائي لكل المشاريع النشطة.', 'تصدير تقارير PDF احترافية بشعار الشركة.', 'مقارنة المصروف الفعلي بالميزانية المعتمدة.'],
    targetTab: 'overview',
    actionText: 'افتح لوحة المتابعة',
    color: '#F59E0B',
  },
];

const ROLES = [
  {
    key: 'owner',
    icon: Crown,
    emoji: '👑',
    title: 'صاحب شركة / مدير',
    desc: 'أتابع المشاريع والمالية وأغلق صفقات جديدة',
    gradient: 'linear-gradient(135deg, #1877F2 0%, #0EA5E9 100%)',
    steps: STEPS_OWNER,
  },
  {
    key: 'engineer',
    icon: Wrench,
    emoji: '👷',
    title: 'مهندس موقع',
    desc: 'أسجّل يوميات الموقع وأتابع التنفيذ',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    steps: STEPS_ENGINEER,
  },
  {
    key: 'accountant',
    icon: BookOpen,
    emoji: '💼',
    title: 'محاسب / مالية',
    desc: 'أتابع المالية والموردين والمستحقات',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    steps: STEPS_ACCOUNTANT,
  },
];

export const TOUR_STEPS = STEPS_OWNER; // للتوافق مع الاستيرادات القديمة

export default function OnboardingTourModal({ isOpen, onClose, onNavigateToTab }) {
  const [phase, setPhase] = useState('welcome'); // 'welcome' | 'role' | 'tour'
  const [selectedRole, setSelectedRole] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  if (!isOpen) return null;

  const steps = selectedRole ? ROLES.find(r => r.key === selectedRole)?.steps || STEPS_OWNER : STEPS_OWNER;
  const currentStep = steps[currentStepIndex];
  const Icon = currentStep?.icon || Compass;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;
  const accentColor = currentStep?.color || '#1877F2';

  function animateTo(fn) {
    setAnimating(true);
    setTimeout(() => { fn(); setAnimating(false); }, 220);
  }

  const handleNext = () => {
    if (isLast) {
      fireConfetti();
      onClose();
    } else {
      animateTo(() => setCurrentStepIndex(p => p + 1));
    }
  };
  const handlePrev = () => {
    if (!isFirst) animateTo(() => setCurrentStepIndex(p => p - 1));
  };
  const handleJumpToScreen = () => {
    if (currentStep?.targetTab && onNavigateToTab) onNavigateToTab(currentStep.targetTab);
    onClose();
  };
  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setCurrentStepIndex(0);
    animateTo(() => setPhase('tour'));
  };

  /* ═══════════════════════════════════════
     شاشة الترحيب
  ═══════════════════════════════════════ */
  if (phase === 'welcome') {
    return (
      <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999, backdropFilter: 'blur(8px)' }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: 520, width: '92%',
            background: 'var(--card)',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
            border: '1px solid var(--border)',
            animation: 'onboardSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <style>{`
            @keyframes onboardSlideIn {
              from { opacity: 0; transform: translateY(30px) scale(0.95); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes shimmer {
              0%   { background-position: -200% center; }
              100% { background-position: 200% center; }
            }
            @keyframes floatUp {
              0%,100% { transform: translateY(0); }
              50%      { transform: translateY(-6px); }
            }
          `}</style>

          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #1877F2 100%)',
            padding: '36px 32px 32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Close */}
            <button onClick={onClose} style={{
              position: 'absolute', top: 14, left: 14,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.8)',
            }}>
              <X size={15} />
            </button>

            {/* Decorative circles */}
            {[
              { size: 180, top: -80, right: -60, op: 0.06 },
              { size: 120, top: 20, right: -30, op: 0.04 },
              { size: 60, bottom: -20, left: 40, op: 0.08 },
            ].map((c, i) => (
              <div key={i} style={{
                position: 'absolute', width: c.size, height: c.size,
                borderRadius: '50%', border: `1px solid rgba(255,255,255,${c.op})`,
                top: c.top, right: c.right, bottom: c.bottom, left: c.left,
                pointerEvents: 'none',
              }} />
            ))}

            {/* Logo icon */}
            <div style={{
              width: 68, height: 68, borderRadius: 20,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
              animation: 'floatUp 3s ease-in-out infinite',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
              <span style={{ fontSize: 36 }}>🏗️</span>
            </div>

            <h1 style={{
              fontSize: 22, fontWeight: 900, color: '#fff',
              margin: '0 0 8px', letterSpacing: '-0.3px',
            }}>
              أهلاً بك في تشطيب برو 👋
            </h1>
            <p style={{
              fontSize: 14, color: 'rgba(255,255,255,0.75)',
              margin: 0, lineHeight: 1.6,
            }}>
              منصة إدارة التشطيبات والمقاولات الأذكى في مصر.
              سنخصص تجربتك في 10 ثوانٍ فقط.
            </p>

            {/* Stats pills */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              {[
                { v: '40%', l: 'توفير في الوقت' },
                { v: '3 دقائق', l: 'عرض سعر كامل' },
                { v: '100%', l: 'بيانات آمنة' },
              ].map((s, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 20, padding: '5px 14px',
                  display: 'flex', gap: 6, alignItems: 'center',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{s.v}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 28px 28px' }}>
            <p style={{
              fontSize: 15, fontWeight: 700, color: 'var(--ink)',
              margin: '0 0 18px', textAlign: 'center',
            }}>
              لنبدأ — ما هو دورك الرئيسي؟
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROLES.map(role => (
                <button
                  key={role.key}
                  onClick={() => handleRoleSelect(role.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px',
                    borderRadius: 14,
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'right',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#1877F2';
                    e.currentTarget.style.background = 'rgba(24,119,242,0.04)';
                    e.currentTarget.style.transform = 'translateX(-3px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-color)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: role.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    {role.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>
                      {role.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {role.desc}
                    </div>
                  </div>
                  <ChevronLeft size={16} color="var(--muted)" />
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              style={{
                width: '100%', marginTop: 16,
                background: 'none', border: 'none',
                fontSize: 12, color: 'var(--muted)',
                cursor: 'pointer', padding: '8px',
              }}
            >
              تخطي — سأستكشف بنفسي
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     شاشة الجولة المُخصَّصة
  ═══════════════════════════════════════ */
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999, backdropFilter: 'blur(8px)' }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 580, width: '92%',
          background: 'var(--card)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          border: '1px solid var(--border)',
          animation: 'onboardSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Top Colored Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor}99)`,
          padding: '22px 24px 20px',
          position: 'relative',
          transition: 'background 0.3s',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, left: 14,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}>
            <X size={14} />
          </button>

          {/* Back to roles */}
          <button
            onClick={() => { setPhase('welcome'); setCurrentStepIndex(0); }}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20, padding: '4px 10px',
              display: 'flex', alignItems: 'center', gap: 4,
              cursor: 'pointer', color: 'rgba(255,255,255,0.85)',
              fontSize: 11, fontWeight: 600,
            }}
          >
            <ArrowRight size={12} />
            <span>تغيير الدور</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.3s',
              opacity: animating ? 0.4 : 1,
              transform: animating ? 'scale(0.85)' : 'scale(1)',
            }}>
              <Icon size={26} color="#fff" />
            </div>
            <div style={{ opacity: animating ? 0 : 1, transition: 'opacity 0.2s' }}>
              <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700,
                background: 'rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: 20, padding: '2px 10px', marginBottom: 4,
              }}>
                {currentStep?.badge} · {currentStepIndex + 1}/{steps.length}
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>
                {currentStep?.title}
              </h2>
            </div>
          </div>

          {/* Progress */}
          <div style={{
            height: 4, background: 'rgba(255,255,255,0.2)',
            borderRadius: 10, marginTop: 18, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
              background: 'rgba(255,255,255,0.8)',
              borderRadius: 10,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px 24px' }}>
          {/* Subtitle */}
          <p style={{
            fontSize: 14, color: 'var(--muted)', lineHeight: 1.7,
            margin: '0 0 16px',
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(8px)' : 'translateY(0)',
            transition: 'all 0.25s',
          }}>
            {currentStep?.subtitle}
          </p>

          {/* Highlights */}
          <div style={{
            background: 'var(--bg-color)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 20,
            opacity: animating ? 0 : 1,
            transition: 'opacity 0.25s',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: 'var(--ink)',
              marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Sparkles size={13} color={accentColor} />
              <span>أبرز الفوائد العملية:</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {currentStep?.highlights?.map((h, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  fontSize: 13, color: 'var(--ink)',
                }}>
                  <CheckCircle2 size={15} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Jump to screen */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <button
              onClick={handleJumpToScreen}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', borderRadius: 24,
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: `0 4px 16px ${accentColor}40`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${accentColor}50`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${accentColor}40`; }}
            >
              <Play size={12} fill="#fff" />
              <span>{currentStep?.actionText}</span>
            </button>
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
            {steps.map((_, i) => (
              <div
                key={i}
                onClick={() => !animating && animateTo(() => setCurrentStepIndex(i))}
                style={{
                  width: i === currentStepIndex ? 24 : 7,
                  height: 7, borderRadius: 4,
                  background: i === currentStepIndex ? accentColor : 'var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            ))}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid var(--border)', paddingTop: 14,
          }}>
            <button
              onClick={onClose}
              style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px' }}
            >
              تخطي الجولة
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}
                >
                  <ArrowRight size={14} />
                  <span>السابق</span>
                </button>
              )}
              <button
                onClick={handleNext}
                className="btn btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, background: accentColor,
                  borderColor: accentColor, transition: 'background 0.3s',
                }}
              >
                <span>{isLast ? '🎉 إنهاء الجولة' : 'التالي'}</span>
                {!isLast && <ArrowLeft size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
