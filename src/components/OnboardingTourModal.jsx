import React, { useState } from 'react';
import {
  Compass, LayoutDashboard, HardHat, Mic, ShieldCheck,
  Calculator, UserCheck, Zap, ArrowLeft, ArrowRight, X,
  CheckCircle2, Sparkles, Building2, TrendingUp, Play
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'مرحباً بك في نظام تشغيل المقاولات والتشطيبات الذكي! 🏢✨',
    subtitle: 'نظام متكامل صُمم خصيصاً لإدارة المواقع الميدانية، المكاتب الفنية، والحسابات بأحدث تقنيات الذكاء الاصطناعي.',
    icon: Compass,
    color: '#6366F1',
    badge: 'البداية السريعة',
    imageBg: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
    highlights: [
      'لوحة متابعة مركزية لكافة مشاريع الشركة ومواقع العمل الحية.',
      'توفير 40% من الوقت الضائع في الاتصالات وجروبات الواتساب.',
      'منع الهدر المالي والتسريب وضبط حسابات الموردين ومقاولي الباطن.'
    ],
    targetTab: 'overview',
    actionText: 'ابدأ الجولة الاستكشافية'
  },
  {
    id: 'overview',
    title: 'لوحة المتابعة والمؤشرات المالية الحية 📊',
    subtitle: 'شاشة قيادة شاملة لصاحب الشركة والإدارة العليا لمتابعة كل مليم وكل دقيقة في المشاريع.',
    icon: LayoutDashboard,
    color: '#3B82F6',
    badge: 'التحكم المركزي',
    imageBg: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(14,165,233,0.15))',
    highlights: [
      'مؤشرات الأداء (المشاريع المنضبطة، المعرضة للتأخير، والمتأخرة).',
      'توزيع الميزانيات، التدفقات النقدية، والمصروفات الفعلية.',
      'تنبيهات فورية ببنود الاعتمادات الفنية المعلقة وملاحظات الجودة.'
    ],
    targetTab: 'overview',
    actionText: 'الانتقال للوحة المتابعة'
  },
  {
    id: 'field_voice',
    title: 'واجهة الموقع الميداني والتسجيل الصوتي بالذكاء الاصطناعي 🎙️📱',
    subtitle: 'حل جذري لأكبر مشكلة في المقاولات: مهندس الموقع يسجل تقاريره بالصوت من الجوال في ثوانٍ!',
    icon: Mic,
    color: '#10B981',
    badge: 'ابتكار ميداني',
    imageBg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))',
    highlights: [
      'تسجيل يوميات العمل، العمالة، والمشاكل بالصوت وتتحول تلقائياً لتقارير نصية.',
      'رفع صور التوثيق الميداني وتحديد موقع الملاحظات على المخططات الهندسية.',
      'استلام بنود الأعمال من الجوال حتى في أضعف شبكات الاتصال.'
    ],
    targetTab: 'projects',
    actionText: 'استكشف مواقع العمل'
  },
  {
    id: 'quality_gates',
    title: 'بوابات الجودة ومعايير الاستلام الهندسي 🛡️📐',
    subtitle: 'منع الأخطاء التنفيذية والتأكد من مطابقة الكود قبل الانتقال لأي مرحلة تالية.',
    icon: ShieldCheck,
    color: '#F59E0B',
    badge: 'صفر أخطاء',
    imageBg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.15))',
    highlights: [
      'اختبار كبس شبكات التغذية بالبار (8-10 بار) مع شهادات الضمان.',
      'اختبار عزل المياه بالغمر 48 ساعة واستلام بؤج وأوتار المحارة.',
      'فحص استواء شرب الليزر واستلام الدهانات بكشاف الإضاءة الجانبي.'
    ],
    targetTab: 'projects',
    actionText: 'فحص بوابات الجودة'
  },
  {
    id: 'subcontractors',
    title: 'مقاولو الباطن والمستخلصات التراكمية 👷‍♂️📑',
    subtitle: 'إسناد أوامر العمل، خصم ضمان الأعمال (5-10%)، وطباعة المستخلصات المعتمدة بنقرة زر.',
    icon: HardHat,
    color: '#D97706',
    badge: 'جديد ومميز',
    imageBg: 'linear-gradient(135deg, rgba(217,119,6,0.15), rgba(180,83,9,0.15))',
    highlights: [
      'إصدار أوامر عمل وعقود مقاولة باطن رسمية جاهزة للطباعة والتوقيع.',
      'حساب المستخلصات التراكمية (السابق + الحالي) وخصم الدفعة المقدمة آلياً.',
      'تتبع مبالغ التأمين والضمانات المحتجزة والإفراج عنها عند التسليم النهائي.'
    ],
    targetTab: 'subcontractors',
    actionText: 'فتح موديول مقاولي الباطن'
  },
  {
    id: 'quotations',
    title: 'حاسبة المقايسات وعروض الأسعار الفندقية ⚡💰',
    subtitle: 'إعداد عرض سعر تفصيلي ومقايسة BOQ دقيقة خلال 3 دقائق بدلاً من أيام!',
    icon: Calculator,
    color: '#EC4899',
    badge: 'سرعة الإغلاق',
    imageBg: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(219,39,119,0.15))',
    highlights: [
      'حساب تلقائي لبنود التشطيب (اقتصادي، سوبر لوكس، ألترا لوكس).',
      'تحديد نسب الأرباح والمصنعيات والخامات بنقرة واحدة.',
      'تصدير عرض سعر بتصميم فندقي فخم يحمل شعار الشركة ويزيد معدل إغلاق الصفقات.'
    ],
    targetTab: 'quotations',
    actionText: 'تجربة حاسبة المقايسات'
  },
  {
    id: 'client_portal',
    title: 'بوابة العميل التفاعلية والشفافية التامة 🌟🤝',
    subtitle: 'امنح كل عميل رابطاً خاصاً يرى فيه تقدم شقته أو فيلته والصور والدفعات مباشرة!',
    icon: UserCheck,
    color: '#8B5CF6',
    badge: 'إبهار العميل',
    imageBg: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.15))',
    highlights: [
      'رابط مخصص لكل مالك مشروع يفتح على هاتفه دون الحاجة لتحميل تطبيقات.',
      'متابعة حية لنسب الإنجاز، صور التشطيب اليومية، والدفعات المستحقة.',
      'وقف اتصالات القلق اليومية وزيادة ولاء وتزكية العملاء لشركتك.'
    ],
    targetTab: 'crm',
    actionText: 'استكشاف بوابة العميل'
  }
];

export default function OnboardingTourModal({ isOpen, onClose, onNavigateToTab }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const Icon = currentStep.icon;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      triggerConfetti();
      onClose();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleJumpToScreen = () => {
    if (currentStep.targetTab && onNavigateToTab) {
      onNavigateToTab(currentStep.targetTab);
    }
    onClose();
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 620,
          padding: 0,
          overflow: 'hidden',
          borderRadius: 20,
          border: `2px solid ${currentStep.color}40`,
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          background: 'var(--panel)'
        }}
      >
        {/* Header Hero Area */}
        <div style={{
          background: currentStep.imageBg,
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--border)',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              position: 'absolute',
              left: 18,
              top: 18,
              background: 'rgba(0,0,0,0.06)',
              borderRadius: '50%',
              width: 32,
              height: 32
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: currentStep.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: `0 8px 20px ${currentStep.color}40`
            }}>
              <Icon size={28} />
            </div>

            <div>
              <span style={{
                display: 'inline-block',
                background: `${currentStep.color}20`,
                color: currentStep.color,
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 800,
                marginBottom: 4
              }}>
                {currentStep.badge} • الخطوة {currentStepIndex + 1} من {TOUR_STEPS.length}
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
                {currentStep.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '22px 28px' }}>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
            {currentStep.subtitle}
          </p>

          <div style={{
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 20
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: currentStep.color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} />
              <span>أهم المزايا والفوائد العملية:</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentStep.highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
                  <CheckCircle2 size={16} color={currentStep.color} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick jump to screen button */}
          {currentStep.targetTab && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <button
                type="button"
                className="btn"
                onClick={handleJumpToScreen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: currentStep.color,
                  border: `1px dashed ${currentStep.color}60`,
                  background: `${currentStep.color}08`,
                  padding: '6px 16px',
                  borderRadius: 20
                }}
              >
                <Play size={13} fill={currentStep.color} />
                <span>{currentStep.actionText}</span>
              </button>
            </div>
          )}

          {/* Step Progress Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentStepIndex(i)}
                style={{
                  width: i === currentStepIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === currentStepIndex ? currentStep.color : 'var(--border)',
                  cursor: 'pointer',
                  transition: 'all .25s'
                }}
              />
            ))}
          </div>

          {/* Footer Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border)',
            paddingTop: 16
          }}>
            <button
              className="btn"
              onClick={onClose}
              style={{ fontSize: 12, color: 'var(--muted)' }}
            >
              تخطي الجولة
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              {!isFirst && (
                <button
                  className="btn"
                  onClick={handlePrev}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                >
                  <ArrowRight size={15} />
                  <span>السابق</span>
                </button>
              )}

              <button
                className="btn btn-primary"
                onClick={handleNext}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  background: currentStep.color,
                  borderColor: currentStep.color
                }}
              >
                <span>{isLast ? 'إنهاء الجولة والبدء 🚀' : 'التالي'}</span>
                {!isLast && <ArrowLeft size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
