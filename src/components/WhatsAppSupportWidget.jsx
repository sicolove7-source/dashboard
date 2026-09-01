import React, { useState } from 'react';
import {
  MessageSquare, Send, X, Headphones, Sparkles,
  HelpCircle, ChevronDown, CheckCircle2, PhoneCall,
  ShieldCheck, Clock
} from 'lucide-react';
import { openWhatsApp } from '../utils/whatsappTemplates';

export default function WhatsAppSupportWidget({ companySettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  // Default support WhatsApp phone number (from companySettings or default)
  const supportPhone = companySettings?.supportPhone || companySettings?.companyPhone || '01011223344';
  const companyName = companySettings?.companyName || 'فريق المبيعات والدعم الفني';

  const QUICK_INTENTS = [
    {
      id: 'demo',
      icon: '🌟',
      badge: 'الأكثر طلباً',
      title: 'طلب تجربة وعرض توضيحي (Demo)',
      sub: 'حجز جلسة شرح مباشر لمميزات النظام',
      msg: 'مرحباً! أود طلب موعد لعرض توضيحي (Demo) للتعرف على مميزات نظام إدارة المقاولات والتشطيبات وإمكانية تطبيقه في شركتنا.'
    },
    {
      id: 'pricing',
      icon: '💰',
      badge: 'أسعار وعروض',
      title: 'الاستفسار عن باقات وأسعار الاشتراك',
      sub: 'معرفة خطط الأسعار والخصومات للشركات',
      msg: 'السلام عليكم، أود الاستفسار عن خطط وأسعار الاشتراك في نظام إدارة التشطيبات والمقاولات للباقات الشهرية والسنوية.'
    },
    {
      id: 'custom',
      icon: '🏢',
      badge: 'نسخة خاصة',
      title: 'طلب نسخة مخصصة باسم وشعار شركتنا',
      sub: 'White-Label وتركيب على سيرفر خاص',
      msg: 'مرحباً! نرغب في الحصول على نسخة مخصصة بهوية وشعار شركتنا، يرجى تزويدنا بالتفاصيل الفنية والتكلفة.'
    },
    {
      id: 'help',
      icon: '🛠️',
      badge: 'مساعدة فورية',
      title: 'الدعم الفني واستفسارات الاستخدام',
      sub: 'فريق المهندسين والدعم التقني متصل الآن',
      msg: 'السلام عليكم، أحتاج إلى مساعدة ودعم فني في استخدام لوحة التحكم.'
    }
  ];

  const handleSendQuick = (text) => {
    openWhatsApp(supportPhone, text);
    setIsOpen(false);
  };

  const handleSendCustom = (e) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    openWhatsApp(supportPhone, customMsg);
    setCustomMsg('');
    setIsOpen(false);
  };

  return (
    <>
      {/* ─── Floating WhatsApp Button ─── */}
      <div className="wa-widget-wrapper">
        <button
          className="wa-fab"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="تواصل معنا عبر واتساب"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MessageSquare size={19} fill="#ffffff" />
            <span className="wa-fab-pulse" style={{ position: 'absolute', top: -3, right: -3 }} />
          </div>
          <span>الدعم الفني والمبيعات</span>
          <span className="wa-fab-badge">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
            WhatsApp
          </span>
        </button>
      </div>

      {/* ─── Backdrop for Mobile Dismiss ─── */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 9998,
          }}
        />
      )}

      {/* ─── Modern WhatsApp Chat Card ─── */}
      {isOpen && (
        <div className="wa-chat-window">
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
            padding: '16px 18px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                flexShrink: 0
              }}>
                <Headphones size={22} color="#ffffff" />
                <span style={{
                  position: 'absolute',
                  bottom: 1,
                  right: 1,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#25D366',
                  border: '2px solid #075E54'
                }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 900 }}>{companyName}</span>
                  <CheckCircle2 size={14} color="#25D366" fill="#ffffff" />
                </div>
                <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={11} />
                  <span>متصل الآن • الرد المباشر خلال دقيقة</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background .2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              <X size={16} />
            </button>
          </div>

          {/* Chat Body */}
          <div style={{
            padding: '16px',
            overflowY: 'auto',
            background: 'var(--panel)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {/* Greeting Bubble */}
            <div style={{
              alignSelf: 'flex-start',
              background: 'rgba(37, 211, 102, 0.08)',
              border: '1px solid rgba(37, 211, 102, 0.25)',
              borderRadius: '16px 16px 16px 4px',
              padding: '12px 14px',
              maxWidth: '95%',
              fontSize: 12.5,
              color: 'var(--ink)',
              lineHeight: 1.6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                👋 مرحباً بك! يسعدنا مساعدتك في الإجابة عن كافة استفساراتك أو حجز موعد لتجربة النظام:
              </p>
              <div style={{ textAlign: 'left', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                الآن
              </div>
            </div>

            {/* Quick Intent Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_INTENTS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSendQuick(item.msg)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all .2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
                    e.currentTarget.style.borderColor = '#25D366';
                    e.currentTarget.style.transform = 'translateX(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>{item.title}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#128C7E',
                        background: 'rgba(37, 211, 102, 0.15)',
                        padding: '1px 6px',
                        borderRadius: 8
                      }}>
                        {item.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Input Field */}
            <form
              onSubmit={handleSendCustom}
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 4,
                background: 'rgba(0,0,0,0.02)',
                padding: 4,
                borderRadius: 14,
                border: '1px solid var(--border)'
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="اكتب رسالتك مباشرة..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  height: 38,
                  fontSize: 12.5,
                  flex: 1,
                  padding: '0 10px',
                  boxShadow: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background .2s'
                }}
                title="إرسال عبر واتساب"
              >
                <Send size={15} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
