/**
 * QuickWinChecklist — بطاقة الخطوات الثلاث (نسخة خفيفة)
 */
import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, X, Sparkles, Zap } from 'lucide-react';
import {
  getQuickWinState,
  markQuickWinStep,
  dismissQuickWin,
} from '../utils/seedDemoData';

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

  useEffect(() => {
    const handler = (e) => setState({ ...e.detail });
    window.addEventListener('quickwin-update', handler);
    return () => window.removeEventListener('quickwin-update', handler);
  }, []);

  // Auto-detect step2 (real projects exist)
  useEffect(() => {
    try {
      const projects = JSON.parse(localStorage.getItem('finishing-projects-v2') || '[]');
      if (projects.filter(p => !p.id?.startsWith('demo-')).length > 0 && !state.step2) {
        markQuickWinStep('step2');
      }
    } catch {}
  }, [state.step2]);

  if (state.dismissed) return null;

  const completedCount = [state.step1, state.step2, state.step3].filter(Boolean).length;
  const progress = (completedCount / 3) * 100;

  const handleAction = (step) => {
    if (state[step.key]) return;
    markQuickWinStep(step.key);
    if (onNavigate && step.tab) onNavigate(step.tab);
  };

  // Auto-dismiss when all done after a short delay
  if (completedCount === 3 && !state.dismissed) {
    setTimeout(() => dismissQuickWin(), 1500);
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        background: '#fff',
        border: '1px solid #BFDBFE',
        borderRadius: 14,
        padding: '14px 16px',
        position: 'relative',
      }}>
        {/* Dismiss */}
        <button
          onClick={() => dismissQuickWin()}
          style={{
            position: 'absolute', top: 10, left: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94A3B8', padding: 4, display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 600,
          }}
        >
          <X size={12} /> تخطي
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #1877F2, #0EA5E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={15} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>ابدأ بـ 3 خطوات سريعة ✨</span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: completedCount === 3 ? '#16A34A' : '#1877F2',
                background: completedCount === 3 ? 'rgba(34,197,94,0.12)' : 'rgba(24,119,242,0.1)',
                padding: '1px 7px', borderRadius: 20,
              }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
              {completedCount === 0 ? 'أكمل الخطوات لتبدأ في جني الأرباح'
                : completedCount === 3 ? 'ممتاز! أكملت كل الخطوات 🎉'
                : `${completedCount}/3 خطوات مكتملة`}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#E2E8F0', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: completedCount === 3
              ? 'linear-gradient(90deg, #16A34A, #22C55E)'
              : 'linear-gradient(90deg, #1877F2, #0EA5E9)',
            borderRadius: 10, transition: 'width 0.5s ease',
          }} />
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {STEPS.map(step => {
            const done = !!state[step.key];
            return (
              <div key={step.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 10,
                background: done ? 'rgba(34,197,94,0.05)' : '#F8FAFC',
                border: `1px solid ${done ? 'rgba(34,197,94,0.15)' : '#E2E8F0'}`,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{step.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: done ? '#64748B' : '#0F172A', textDecoration: done ? 'line-through' : 'none' }}>
                    {step.title}
                  </div>
                  {!done && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{step.desc}</div>}
                </div>
                {done ? (
                  <CheckCircle2 size={16} color="#22C55E" fill="#22C55E" style={{ flexShrink: 0 }} />
                ) : (
                  <button
                    onClick={() => handleAction(step)}
                    style={{
                      background: 'linear-gradient(135deg, #1877F2, #0EA5E9)',
                      color: '#fff', border: 'none', borderRadius: 16,
                      padding: '4px 12px', fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                  >
                    {step.action} <ChevronLeft size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {completedCount < 3 && (
          <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={10} color="#F59E0B" /> أكمل الخطوات الثلاث وستختفي هذه البطاقة تلقائياً
          </div>
        )}
      </div>
    </div>
  );
}
