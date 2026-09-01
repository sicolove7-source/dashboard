import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bell, AlertTriangle, AlertCircle, CheckCircle2, Clock,
  Calendar, ArrowLeft, Check, Trash2, Filter, X, ShieldAlert,
  Sparkles, ChevronLeft, MessageSquare, Mic, Zap, ArrowUpRight
} from 'lucide-react';
import { fmtDate, todayISO, getGlobalCurrency } from '../utils/helpers';
import { evaluateAutomations } from '../utils/automationsEngine';
import { openWhatsApp } from '../utils/whatsappTemplates';

export default function NotificationCenter({
  projects = [],
  leads = [],
  team = null,
  companySettings = {},
  onSelectProject,
  onNavigateToTab,
  isDarkMode
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all | critical | warning | info
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('read-notifications-v1') || '[]');
    } catch {
      return [];
    }
  });

  const panelRef = useRef(null);

  // Close on clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Persist read notifications
  const markAsRead = (id) => {
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      setReadIds(next);
      try {
        localStorage.setItem('read-notifications-v1', JSON.stringify(next));
      } catch {}
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('read-notifications-v1', JSON.stringify(allIds));
    } catch {}
  };

  // Generate Smart Alerts from live project data & Automations Engine
  const notifications = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return [];
    
    // Evaluate live automation engine alerts
    const autoAlerts = evaluateAutomations({
      projects,
      leads,
      team,
      companySettings,
    });

    return autoAlerts;
  }, [projects, leads, team, companySettings]);

  const unreadAlerts = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id));
  }, [notifications, readIds]);

  const filteredAlerts = useMemo(() => {
    if (filter === 'critical') return notifications.filter((n) => n.type === 'critical');
    if (filter === 'warning') return notifications.filter((n) => n.type === 'warning');
    if (filter === 'info') return notifications.filter((n) => n.type === 'info');
    return notifications;
  }, [notifications, filter]);

  const hasCritical = unreadAlerts.some((n) => n.type === 'critical');

  const handleAlertClick = (alert) => {
    markAsRead(alert.id);
    setIsOpen(false);
    if (alert.projectId && onSelectProject) {
      onSelectProject(alert.projectId, alert.targetTab || 'overview');
    } else if (alert.targetTab && onNavigateToTab) {
      onNavigateToTab(alert.targetTab);
    }
  };

  const handleActionClick = (e, alert) => {
    e.stopPropagation();
    markAsRead(alert.id);
    if (alert.whatsappMessage) {
      const phone = alert.clientPhone || alert.leadPhone || '';
      openWhatsApp(phone, alert.whatsappMessage);
    } else if (alert.projectId && onSelectProject) {
      setIsOpen(false);
      onSelectProject(alert.projectId, alert.targetTab || 'overview');
    } else if (alert.targetTab && onNavigateToTab) {
      setIsOpen(false);
      onNavigateToTab(alert.targetTab);
    }
  };


  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="مركز الإشعارات والتنبيهات الذكية"
        style={{
          position: 'relative',
          width: 42,
          height: 42,
          borderRadius: 12,
          border: '1px solid var(--glass-border)',
          background: isOpen ? 'var(--card-hover)' : 'var(--card)',
          color: unreadAlerts.length > 0 ? 'var(--ink)' : 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          backdropFilter: 'var(--blur)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Bell size={20} className={hasCritical ? 'bell-ringing' : ''} />
        {unreadAlerts.length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              left: -4,
              minWidth: 19,
              height: 19,
              padding: '0 4px',
              borderRadius: 10,
              background: hasCritical
                ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                : 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
              border: '2px solid var(--card)',
            }}
          >
            {unreadAlerts.length}
          </span>
        )}
      </button>

      {/* Flyout Modal Drawer */}
      {isOpen && (
        <div
          className="tab-fade"
          style={{
            position: 'absolute',
            top: 52,
            left: 0,
            width: 410,
            maxWidth: '92vw',
            maxHeight: '82vh',
            background: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 20,
            border: '1px solid var(--glass-border)',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3), 0 0 1px 1px rgba(255,255,255,0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bell size={18} color="var(--amber)" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                  التنبيهات الذكية للمشاريع
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {unreadAlerts.length > 0
                    ? `${unreadAlerts.length} تنبيه يتطلب انتباهك`
                    : 'جميع المشاريع بحالة جيدة'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {unreadAlerts.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 9px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--muted)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="تحديد الكل كمقروء"
                >
                  <Check size={12} />
                  مقروء
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(0,0,0,0.05)',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'transparent',
            }}
          >
            {[
              { key: 'all', label: `الكل (${notifications.length})` },
              {
                key: 'critical',
                label: `عاجل 🔴 (${notifications.filter((n) => n.type === 'critical').length})`,
              },
              {
                key: 'warning',
                label: `تحذيرات 🟡 (${notifications.filter((n) => n.type === 'warning').length})`,
              },
              {
                key: 'info',
                label: `إنجازات 🟢 (${notifications.filter((n) => n.type === 'info').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: filter === tab.key ? 800 : 600,
                  background: filter === tab.key ? 'var(--amber)' : 'rgba(0,0,0,0.03)',
                  color: filter === tab.key ? '#fff' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div
            style={{
              padding: '12px 14px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {filteredAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)' }}>
                <CheckCircle2 size={40} color="var(--teal)" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>لا توجد تنبيهات</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  كافة الجداول والميزانيات ضمن الحدود الطبيعية والمخططة.
                </div>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isRead = readIds.includes(alert.id);
                const isCrit = alert.type === 'critical';
                const isWarn = alert.type === 'warning';

                const borderCol = isCrit ? '#EF4444' : isWarn ? '#F59E0B' : '#10B981';
                const bgTint = isCrit
                  ? 'rgba(239, 68, 68, 0.08)'
                  : isWarn
                  ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(16, 185, 129, 0.08)';

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      background: isRead ? 'rgba(0,0,0,0.02)' : bgTint,
                      border: `1.5px solid ${isRead ? 'var(--border)' : borderCol + '60'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = borderCol;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = isRead ? 'var(--border)' : borderCol + '60';
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: `${borderCol}20`,
                        color: borderCol,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {isCrit ? (
                        <AlertCircle size={18} />
                      ) : isWarn ? (
                        <AlertTriangle size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: isRead ? 600 : 800,
                            fontSize: 13,
                            color: 'var(--ink)',
                            lineHeight: 1.3,
                          }}
                        >
                          {alert.title}
                        </span>
                        {!isRead && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: borderCol,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--muted)',
                          lineHeight: 1.4,
                          marginBottom: 8,
                        }}
                      >
                        {alert.desc}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                          fontSize: 11,
                          color: 'var(--muted)',
                          marginTop: 4,
                        }}
                      >
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: 'rgba(0,0,0,0.05)',
                            fontWeight: 600,
                          }}
                        >
                          {alert.time}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {alert.actionLabel && (
                            <button
                              type="button"
                              onClick={(e) => handleActionClick(e, alert)}
                              style={{
                                background: alert.whatsappMessage ? '#25D366' : 'var(--brand-primary, #6366F1)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              }}
                            >
                              {alert.whatsappMessage ? <MessageSquare size={12} /> : <Zap size={12} />}
                              {alert.actionLabel}
                            </button>
                          )}

                          <span
                            style={{
                              color: borderCol,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            عرض <ChevronLeft size={13} />
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer summary */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border)',
              fontSize: 11,
              color: 'var(--muted)',
              display: 'flex',
              justifyContent: 'space-between',
              background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <span>يتم تحديث التنبيهات تلقائياً مع كل حركة موقع</span>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
              إجمالي المشاريع: {projects.length}
            </span>
          </div>
        </div>
      )}

      {/* Bell Shake & Pulse Animation */}
      <style>{`
        @keyframes bellRing {
          0%, 100% { transform: rotate(0); }
          20%, 60% { transform: rotate(12deg); }
          40%, 80% { transform: rotate(-12deg); }
        }
        .bell-ringing {
          animation: bellRing 2s infinite ease-in-out;
          color: #EF4444 !important;
        }
      `}</style>
    </div>
  );
}
