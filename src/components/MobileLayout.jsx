import React from 'react';
import * as Icons from 'lucide-react';
import { NAV } from '../utils/constants';
import { canSeeNav, ROLES, can } from '../utils/permissions';

const NAV_ICONS = {
  tenants:       'Crown',
  overview:      'LayoutDashboard',
  automations:   'Zap',
  crm:           'BadgePercent',
  finance:       'TrendingUp',
  team:          'Users',
  projects:      'Building2',
  subcontractors:'HardHat',
  suppliers:     'Truck',
  quotations:    'Calculator',
  specs:         'BrainCircuit',
  settings:      'Settings',
};

const NAV_LABELS_SHORT = {
  tenants:       'الشركات 👑',
  overview:      'المتابعة',
  automations:   'الأتمتة ⚡',
  crm:           'المبيعات',
  projects:      'المواقع',
  subcontractors:'المقاولون',
  finance:       'المالية',
  team:          'الفريق',
  suppliers:     'الموردون',
  quotations:    'المقايسات',
  specs:         'التوصيف',
  settings:      'الإعدادات',
};


export default function MobileLayout({
  tab, setTab, setView, userRole, currentUser, companySettings,
  isDarkMode, setIsDarkMode,
  sidebarOpen, setSidebarOpen, onOpenTour
}) {
  const [unreadNotifsCount, setUnreadNotifsCount] = React.useState(0);

  React.useEffect(() => {
    const handleCount = (e) => {
      if (e.detail && typeof e.detail.count === 'number') {
        setUnreadNotifsCount(e.detail.count);
      }
    };
    window.addEventListener('notifications-count-updated', handleCount);
    return () => {
      window.removeEventListener('notifications-count-updated', handleCount);
    };
  }, []);

  const companyName = companySettings?.companyName || 'إدارة التشطيبات';
  const companyLogo = companySettings?.companyLogo || null;
  const primaryColor = companySettings?.primaryColor || '#1877F2';
  const roleInfo = ROLES[userRole] || ROLES['owner'];

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Main 4 quick tabs for bottom bar + "More"
  const quickKeys = ['overview', 'crm', 'projects', 'finance'];
  const bottomNavItems = quickKeys.filter(k => canSeeNav(currentUser || userRole, k));

  function handleNavClick(key) {
    setTab(key);
    setView('list');
    setSidebarOpen(false);
  }

  return (
    <>
      {/* ─── 1. TOP MOBILE HEADER BAR ─── */}
      <div className="mobile-header">
        {/* Logo & Company Name */}
        <div className="mobile-logo">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName} />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: primaryColor || '#0F172A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icons.Building2 size={18} color="#fff" />
            </div>
          )}
          <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
            {companyName}
          </span>
        </div>

        {/* Action icons on top right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => window.dispatchEvent(new Event('toggle-notifications'))}
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            title="التنبيهات الذكية"
          >
            <Icons.Bell size={18} />
            {unreadNotifsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  left: -3,
                  minWidth: 16,
                  height: 16,
                  padding: '0 3px',
                  borderRadius: 8,
                  background: '#E41E3F',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid var(--topbar-bg, #1877F2)',
                }}
              >
                {unreadNotifsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 8, color: '#fff', cursor: 'pointer',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title={isDarkMode ? "الوضع الفاتح" : "الوضع الليلي"}
          >
            {isDarkMode ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
          </button>

          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="القائمة الكاملة"
          >
            {sidebarOpen ? <Icons.X size={20} /> : <Icons.Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ─── 2. DEDICATED MOBILE DRAWER MENU ─── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998,
              animation: 'fadeIn 0.2s ease',
            }}
          />

          {/* Drawer Content */}
          <div
            dir="rtl"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '85%',
              maxWidth: 320,
              background: 'var(--sidebar-bg, #FFFFFF)',
              color: 'var(--ink, #0F172A)',
              zIndex: 9999,
              boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              overflowY: 'auto',
              borderLeft: '1px solid var(--sidebar-border, #E2E8F0)',
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '20px 18px 16px',
              borderBottom: '1px solid var(--sidebar-border, #E2E8F0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', padding: 2 }} />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: '#2563EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icons.Building2 size={20} color="#fff" />
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink, #0F172A)' }}>{companyName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted, #64748B)' }}>القائمة الرئيسية</div>
                </div>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: 'var(--sidebar-hover-bg, #F1F5F9)', border: '1px solid var(--sidebar-border, #E2E8F0)',
                  borderRadius: 8, color: 'var(--ink, #0F172A)', cursor: 'pointer',
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* User Info Card */}
            <div style={{
              margin: '12px 14px',
              padding: '10px 14px',
              background: isDarkMode ? `${roleInfo.color}15` : 'var(--sidebar-hover-bg, #F8FAFC)',
              border: `1px solid var(--sidebar-border, #E2E8F0)`,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{roleInfo.badge}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isDarkMode ? roleInfo.color : 'var(--ink, #0F172A)' }}>
                  {roleInfo.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748B)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.name || 'مستخدم النظام'}
                </div>
              </div>
            </div>

            {/* Menu Items List */}
            <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV.map((n) => {
                if (!canSeeNav(currentUser || userRole, n.key)) return null;
                const Icon = Icons[n.icon] || Icons.Circle;
                const isActive = tab === n.key;
                return (
                  <div
                    key={n.key}
                    onClick={() => handleNavClick(n.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? 'var(--sidebar-active-text, #2563EB)' : 'var(--sidebar-text, #475569)',
                      background: isActive ? 'var(--sidebar-active-bg, #EFF6FF)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={18} />
                    <span>{n.label}</span>
                    {isActive && <Icons.ChevronLeft size={16} style={{ marginRight: 'auto' }} />}
                  </div>
                );
              })}

              {/* Company Settings — Owner only or custom permission */}
              {can(currentUser || userRole, 'company_settings_view') && (
                <div
                  onClick={() => handleNavClick('settings')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: tab === 'settings' ? 700 : 600,
                    color: tab === 'settings' ? 'var(--sidebar-active-text, #2563EB)' : 'var(--sidebar-text, #475569)',
                    background: tab === 'settings' ? 'var(--sidebar-active-bg, #EFF6FF)' : 'transparent',
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  <Icons.Settings size={18} />
                  <span>إعدادات الشركة والمستخدمين</span>
                  {tab === 'settings' && <Icons.ChevronLeft size={16} style={{ marginRight: 'auto' }} />}
                </div>
              )}
            </div>

            {/* Footer actions in Drawer */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--sidebar-border, #E2E8F0)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { onOpenTour?.(); setSidebarOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '12px',
                  background: 'var(--sidebar-hover-bg, #F8FAFC)',
                  border: '1px solid var(--sidebar-border, #E2E8F0)',
                  borderRadius: 10,
                  color: 'var(--sidebar-text, #475569)',
                  cursor: 'pointer',
                  fontFamily: 'Cairo',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                <Icons.Compass size={18} color="var(--muted, #64748B)" />
                <span>جولة تعريفية للنظام</span>
              </button>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '10px',
                  background: 'var(--sidebar-hover-bg, #F8FAFC)', border: '1px solid var(--sidebar-border, #E2E8F0)',
                  borderRadius: 10, color: 'var(--sidebar-text, #475569)', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 13, fontWeight: 600,
                }}
              >
                {isDarkMode ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
                <span>{isDarkMode ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الليلي'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── 3. BOTTOM NAVIGATION BAR ─── */}
      <div className="mobile-bottom-nav">
        <div className="bottom-nav-inner">
          {bottomNavItems.map(key => {
            const navItem = NAV.find(n => n.key === key);
            if (!navItem) return null;
            const Icon = Icons[NAV_ICONS[key] || navItem.icon] || Icons.Circle;
            const isActive = tab === key && !sidebarOpen;
            return (
              <div
                key={key}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(key)}
              >
                <Icon size={19} />
                <span>{NAV_LABELS_SHORT[key] || navItem.label}</span>
              </div>
            );
          })}

          {/* More button → Opens Drawer */}
          <div
            className={`mobile-nav-item ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Icons.Menu size={19} />
            <span>المزيد</span>
          </div>
        </div>
      </div>
    </>
  );
}
