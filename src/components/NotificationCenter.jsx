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
        // Only if clicking outside not on a toggle button
        if (!e.target.closest('.hamburger-btn')) {
          setIsOpen(false);
        }
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Prevent background scroll on mobile when modal/bottom-sheet is open
  useEffect(() => {
    if (isOpen && window.innerWidth <= 768) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Custom event listener to open/toggle notifications from anywhere (e.g. mobile top bar)
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('toggle-notifications', handleToggle);
    window.addEventListener('open-notifications', handleOpen);
    window.addEventListener('close-notifications', handleClose);
    return () => {
      window.removeEventListener('toggle-notifications', handleToggle);
      window.removeEventListener('open-notifications', handleOpen);
      window.removeEventListener('close-notifications', handleClose);
    };
  }, []);

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


  // Broadcast unread count to other components (e.g. mobile top bar)
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('notifications-count-updated', {
        detail: { count: unreadAlerts.length }
      }));
    } catch {}
  }, [unreadAlerts.length]);

  return (
    <div className="notif-center-wrapper" ref={panelRef}>
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
          border: '1px solid var(--border)',
          background: isOpen ? 'var(--fb-blue-light, #E7F3FF)' : 'var(--card)',
          color: unreadAlerts.length > 0 ? 'var(--ink)' : 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.2s ease',
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
              background: '#E41E3F',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              border: '2px solid var(--card)',
            }}
          >
            {unreadAlerts.length}
          </span>
        )}
      </button>

      {/* Backdrop for Mobile (and outside tap) */}
      {isOpen && (
        <div
          className="notif-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Flyout Modal Drawer (Desktop Dropdown & Mobile Bottom-Sheet) */}
      {isOpen && (
        <div className="notif-panel tab-fade">
          {/* Mobile Drag Handle */}
          <div className="notif-mobile-handle" />

          {/* Header */}
          <div className="notif-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--fb-blue-light, #E7F3FF)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1877F2',
                }}
              >
                <Bell size={19} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                  التنبيهات الذكية للمشاريع
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {unreadAlerts.length > 0
                    ? `${unreadAlerts.length} تنبيه يتطلب انتباهك`
                    : 'جميع المشاريع تسير بانتظام'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadAlerts.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--fb-bg, #F0F2F5)',
                    color: 'var(--ink)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="تحديد الكل كمقروء"
                >
                  <Check size={13} />
                  مقروء
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--fb-bg, #F0F2F5)',
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="إغلاق التنبيهات"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="notif-filters">
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
                className={`notif-filter-pill ${filter === tab.key ? 'active' : ''}`}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="notif-list">
            {filteredAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)' }}>
                <CheckCircle2 size={42} color="#1877F2" style={{ margin: '0 auto 12px', opacity: 0.85 }} />
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>لا توجد تنبيهات جديدة</div>
                <div style={{ fontSize: 12.5, marginTop: 4, color: 'var(--muted)' }}>
                  كافة الجداول الزمنية والميزانيات ضمن الحدود الطبيعية والمخططة.
                </div>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isRead = readIds.includes(alert.id);
                const isCrit = alert.type === 'critical';
                const isWarn = alert.type === 'warning';

                const borderCol = isCrit ? '#EF4444' : isWarn ? '#F59E0B' : '#10B981';
                const cardClass = isRead
                  ? 'notif-card'
                  : isCrit
                  ? 'notif-card unread-critical'
                  : isWarn
                  ? 'notif-card unread-warning'
                  : 'notif-card unread-info';

                return (
                  <div
                    key={alert.id}
                    className={cardClass}
                    onClick={() => handleAlertClick(alert)}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 34,
                        height: 34,
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
                        <AlertCircle size={19} />
                      ) : isWarn ? (
                        <AlertTriangle size={19} />
                      ) : (
                        <CheckCircle2 size={19} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: isRead ? 600 : 800,
                            fontSize: 13.5,
                            color: 'var(--ink)',
                            lineHeight: 1.35,
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
                              marginTop: 4,
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'var(--muted)',
                          lineHeight: 1.45,
                          marginBottom: 8,
                          wordBreak: 'break-word',
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
                          fontSize: 11.5,
                          color: 'var(--muted)',
                          marginTop: 6,
                        }}
                      >
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: 'var(--fb-bg, #F0F2F5)',
                            fontWeight: 600,
                            color: 'var(--fb-text-secondary, #65676B)',
                          }}
                        >
                          {alert.time}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {alert.actionLabel && (
                            <button
                              type="button"
                              onClick={(e) => handleActionClick(e, alert)}
                              style={{
                                background: alert.whatsappMessage ? '#25D366' : '#1877F2',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                padding: '5px 12px',
                                minHeight: 32,
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              }}
                            >
                              {alert.whatsappMessage ? <MessageSquare size={13} /> : <Zap size={13} />}
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
                              fontSize: 12,
                            }}
                          >
                            عرض <ChevronLeft size={14} />
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
          <div className="notif-footer">
            <span>يتم تحديث التنبيهات تلقائياً مع حركة الموقع</span>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
              المشاريع: {projects.length}
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
