/**
 * QuickWinChecklist — بطاقة الخطوات الثلاث الأولى
 * تظهر في الشاشة الرئيسية مرة واحدة فقط حتى يكمل المستخدم الخطوات الثلاث
 * أو يختار رفضها.
 */
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronLeft, X, Sparkles, Zap } from 'lucide-react';
import {
  getQuickWinState,
  markQuickWinStep,
  dismissQuickWin,
  isQuickWinComplete
} from '../utils/seedDemoData';

let confettiFn = null;
try {
  import('canvas-confetti').then(m => { confettiFn = m.default; });
} catch {}

function fireConfetti() {
  try {
    if (confettiFn) {
      confettiFn({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors: ['#1877F2', '#22C55E', '#F59E0B'] });
    }
  } catch {}
}

const STEPS = [
  {
    key: 'step1',
    icon: '🏢',
    title: 'أضف اسم شركتك ولوجوها',
    desc: 'يستغرق 30 ثانية فقط — وسيظهر في كل التقارير والعقود',
    action: 'افعل الآن',
    tab: 'settings',
  },
  {
    key: 'step2',
    icon: '🏗️',
    title: 'أنشئ أول مشروع حقيقي',
    desc: 'أدخل بيانات أول موقع شغال عندك الآن',
    action: 'أنشئ مشروعاً',
    tab: 'projects',
  },
  {
    key: 'step3',
    icon: '📲',
    title: 'أرسل بوابة العميل لأول عميل',
    desc: 'رابط خاص يتابع فيه العميل شقته أو فيلته بنفسه',
    action: 'جرّب البوابة',
    tab: 'crm',
  },
];

export default function QuickWinChecklist({ onNavigate }) {
  const [state, setState] = useState(() => getQuickWinState());
  const [celebrating, setCelebrating] = useState(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const handler = (e) => setState({ ...e.detail });
    window.addEventListener('quickwin-update', handler);
    return () => window.removeEventListener('quickwin-update', handler);
  }, []);

  // Check Step 1 automatically when company settings change
  useEffect(() => {
    function checkStep1() {
      try {
        const settings = JSON.parse(localStorage.getItem('company-settings-v1') || '{}');
        if (settings.name && settings.name.trim() && !state.step1) {
          markQuickWinStep('step1');
        }
      } catch {}
    }
    window.addEventListener('storage', checkStep1);
    checkStep1();
    return () => window.removeEventListener('storage', checkStep1);
  }, [state.step1]);

  // Check Step 2 automatically when projects change
  useEffect(() => {
    function checkStep2() {
      try {
        const projects = JSON.parse(localStorage.getItem('finishing-projects-v2') || '[]');
        const realProjects = projects.filter(p => !p.id?.startsWith('demo-'));
        if (realProjects.length > 0 && !state.step2) {
          markQuickWinStep('step2');
        }
      } catch {}
    }
    window.addEventListener('storage', checkStep2);
    checkStep2();
    return () => window.removeEventListener('storage', checkStep2);
  }, [state.step2]);

  if (state.dismissed) return null;
  if (isQuickWinComplete() && exiting) return null;

  const completedCount = [state.step1, state.step2, state.step3].filter(Boolean).length;
  const progress = (completedCount / 3) * 100;

  const handleAction = (step) => {
    if (state[step.key]) return;
    markQuickWinStep(step.key);
    setCelebrating(step.key);
    fireConfetti();
    setTimeout(() => setCelebrating(null), 1500);
    if (onNavigate && step.tab) {
      onNavigate(step.tab);
    }
  };

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      dismissQuickWin();
    }, 400);
  };

  const handleAllDone = () => {
    fireConfetti();
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => dismissQuickWin(), 400);
    }, 1800);
  };

  if (completedCount === 3 && !state.dismissed) {
    handleAllDone();
  }

  return (
    <div
      style={{
        animation: exiting ? 'slideUpFade 0.4s ease forwards' : 'slideDownIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        marginBottom: 24,
      }}
    >
      <style>{`
        @keyframes slideDownIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUpFade {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-16px); }
        }
        @keyframes celebrate-pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        .qw-step { transition: all 0.25s ease; border-radius: 12px; }
        .qw-step:hover { background: rgba(24,119,242,0.04) !important; }
        .qw-action-btn {
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .qw-action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(24,119,242,0.25); }
        .qw-action-btn:active { transform: translateY(0); }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
        border: '1.5px solid #BFDBFE',
        borderRadius: 16,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -20, left: -20,
          width: 120, height: 120,
          borderRadius: '50%',
          background: 'rgba(24,119,242,0.06)',
          pointerEvents: 'none',
        }} />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(148,163,184,0.12)',
            border: 'none',
            cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
            color: '#64748B', transition: 'all 0.2s',
            fontSize: 11, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
            zIndex: 2,
          }}
          title="إغلاق البطاقة"
        >
          <X size={12} />
          <span>تخطي</span>
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #1877F2, #0EA5E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(24,119,242,0.3)',
            flexShrink: 0,
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                ابدأ بـ 3 خطوات سريعة ✨
              </span>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: completedCount === 3 ? '#16A34A' : '#1877F2',
                background: completedCount === 3 ? 'rgba(34,197,94,0.12)' : 'rgba(24,119,242,0.1)',
                padding: '2px 8px',
                borderRadius: 20,
              }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {completedCount === 0
                ? 'أكمل الخطوات لتبدأ في جني الأرباح'
                : completedCount === 3
                ? '🎉 ممتاز! أكملت كل الخطوات!'
                : `تقدم رائع — ${completedCount}/3 خطوات مكتملة`}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 5, background: '#E2E8F0', borderRadius: 10,
          marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: completedCount === 3
              ? 'linear-gradient(90deg, #16A34A, #22C55E)'
              : 'linear-gradient(90deg, #1877F2, #0EA5E9)',
            borderRadius: 10,
            transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STEPS.map((step, i) => {
            const done = !!state[step.key];
            const isCelebrating = celebrating === step.key;

            return (
              <div
                key={step.key}
                className="qw-step"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  background: done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.7)',
                  border: done ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(226,232,240,0.8)',
                  opacity: done ? 0.85 : 1,
                }}
              >
                {/* Icon + check */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 22,
                    animation: isCelebrating ? 'celebrate-pulse 0.4s ease 3' : 'none',
                    display: 'block',
                  }}>
                    {step.icon}
                  </span>
                  {done && (
                    <CheckCircle2
                      size={14}
                      color="#16A34A"
                      fill="#16A34A"
                      style={{
                        position: 'absolute', bottom: -4, right: -4,
                        background: '#fff', borderRadius: '50%',
                      }}
                    />
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: done ? '#64748B' : '#0F172A',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {step.title}
                  </div>
                  {!done && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                      {step.desc}
                    </div>
                  )}
                </div>

                {/* Action button */}
                {!done ? (
                  <button
                    className="qw-action-btn"
                    onClick={() => handleAction(step)}
                    style={{
                      background: 'linear-gradient(135deg, #1877F2, #0EA5E9)',
                      color: '#fff',
                    }}
                  >
                    {step.action}
                    <ChevronLeft size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                  </button>
                ) : (
                  <div style={{
                    padding: '4px 12px', borderRadius: 20,
                    background: 'rgba(34,197,94,0.1)',
                    color: '#16A34A',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    ✓ تم
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        {completedCount < 3 && (
          <div style={{
            marginTop: 12,
            fontSize: 11, color: '#94A3B8',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Zap size={11} color="#F59E0B" />
            أكمل الخطوات الثلاث وستختفي هذه البطاقة تلقائياً
          </div>
        )}
      </div>
    </div>
  );
}
