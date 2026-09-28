import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Users, Search, Clock, Plus, Save, Info, Compass
} from "lucide-react";

// Core Components
import Sidebar from './components/Sidebar';
import NotificationCenter from './components/NotificationCenter';
import MobileLayout from './components/MobileLayout';
import MobileQuickActionsModal from './components/MobileQuickActionsModal';
import WhatsAppSupportWidget from './components/WhatsAppSupportWidget';

// Core Primary Pages (Lazy-Loaded to exclude Recharts from initial bundle)
const Overview = React.lazy(() => import('./pages/Overview'));
const ProjectsTab = React.lazy(() => import('./pages/ProjectsTab'));
const ProjectForm = React.lazy(() => import('./pages/ProjectForm'));

// Lazy-Loaded Secondary Modules (Preloaded quietly in background)
const ProjectDetail = React.lazy(() => import('./pages/ProjectDetail'));
const TeamPerformance = React.lazy(() => import('./pages/TeamPerformance'));
const SuppliersTab = React.lazy(() => import('./pages/SuppliersTab'));
const SubcontractorsTab = React.lazy(() => import('./pages/SubcontractorsTab'));
const QuotationBuilder = React.lazy(() => import('./pages/QuotationBuilder'));
const CompanyFinance = React.lazy(() => import('./pages/CompanyFinance'));
const Login = React.lazy(() => import('./pages/Login'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const CompanySettings = React.lazy(() => import('./pages/CompanySettings'));
const CrmPipeline = React.lazy(() => import('./pages/CrmPipeline'));
const ClientPortal = React.lazy(() => import('./pages/ClientPortal'));
const ClientIntakePage = React.lazy(() => import('./pages/ClientIntakePage'));
const SuperAdminDashboard = React.lazy(() => import('./pages/SuperAdminDashboard'));
const AdminPortal = React.lazy(() => import('./pages/AdminPortal'));
const OnboardingTourModal = React.lazy(() => import('./components/OnboardingTourModal'));
const QuickWinChecklist = React.lazy(() => import('./components/QuickWinChecklist'));
import ErrorBoundary from './components/ErrorBoundary';
import { isFirstLogin, markFirstLoginDone, seedDemoData } from './utils/seedDemoData';

import { loadCompanySettings, saveCompanySettings, applyCompanyBranding, DEFAULT_COMPANY_SETTINGS } from './utils/branding';
try { if (typeof localStorage !== 'undefined') localStorage.removeItem('company-settings-v1'); } catch (e) {}
import { getActiveTenantId, setActiveTenantId, ACTIVE_TENANT_ID_KEY, getTenantData, getTenantDataAsync, isSubAccountsLoginAllowed, fetchPlatformSettingsFromCloud, resolveTenantUserByEmail, syncAllLocalUsersToCloud, loadAllTenants, loadAllTenantsAsync, saveAllTenants } from './services/tenantsManager';
import { getSubdomain, isAdminSubdomain, isCompanySubdomain, clearActiveSubdomain, getSubdomainUrl, getCrossSubdomainCookie, setCrossSubdomainCookie, removeCrossSubdomainCookie } from './services/subdomainResolver';
import { onAuthChange, logoutUser } from './services/auth';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { AdminProvider } from './context/AdminContext';
import {
  syncProjectsToCloud,
  syncSingleProjectToCloud,
  deleteSingleProjectFromCloud,
  syncTeamToCloud,
  syncLeadsToCloud,
  subscribeToCloudProjects,
  subscribeToCloudLeads,
  cleanUpInvalidDocs,
  sanitizeProjectForCloud,
  mergeProjectsPreservingLocal,
  mergeTeamsPreservingLocal,
  syncSettingsToCloud,
  subscribeToCloudCompanyField,
  fetchCompanyDataFromCloud,
  fetchTenantBySubdomain,
  isDemoProject,
  generatePortalToken,
} from './services/cloudSync';
import { syncAllPendingMedia, onSyncStatusChange } from './services/backgroundMediaSync';
import { parseClientPortalFromUrl, resolveClientPortalProject, submitClientPortalApproval, subscribeToClientPortal } from './services/portalResolver';
import { parseIntakeRouteFromUrl } from './services/intakeResolver';
import { AREAS } from './utils/constants';

function PageLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 20px' }}>
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: '2.5px solid rgba(24, 119, 242, 0.15)',
        borderTopColor: '#1877F2',
        animation: 'spin 0.6s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Utils
import { NAV } from './utils/constants';
import { todayISO, setGlobalCurrency } from './utils/helpers';
import { DEFAULT_TAB, can, NAV_PERMISSIONS } from './utils/permissions';

// Styles
import './styles/index.css';

/* ---------------------------------------------------------------
   التطبيق الرئيسي
--------------------------------------------------------------- */
const THEME_KEY = "finishing-theme-v2";

function getTabFromPath() {
  try {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (path === 'contractors' || path === 'subcontractors') return 'subcontractors';
    if (path === 'projects') return 'projects';
    if (path === 'crm' || path === 'pipeline') return 'crm';
    if (path === 'finance') return 'finance';
    if (path === 'team') return 'team';
    if (path === 'suppliers') return 'suppliers';
    if (path === 'quotations') return 'quotations';
    if (path === 'automations') return 'automations';
    if (path === 'settings') return 'settings';
    if (path === 'tenants' || path === 'superadmin') return 'tenants';
  } catch (e) {}
  return null;
}

function hasCollectionChanged(prev, next) {
  if (prev === next) return false;
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;

  const prevMap = new Map();
  for (const item of prev) {
    if (item && item.id) prevMap.set(String(item.id), item);
  }

  for (const b of next) {
    if (!b || !b.id) return true;
    const a = prevMap.get(String(b.id));
    if (!a) return true;
    if (a.updatedAt !== b.updatedAt) return true;
    if (a.name !== b.name || a.status !== b.status || a.progress !== b.progress || a.client !== b.client || a.area !== b.area || a.engineer !== b.engineer) return true;

    // فحص دقيق للبيانات المالية والمصروفات والدفعات
    if (Number(a.spent || 0) !== Number(b.spent || 0)) return true;
    if (Number(a.budget || a.contractValue || 0) !== Number(b.budget || b.contractValue || 0)) return true;
    if (Number(a.totalPaid || a.paidAmount || 0) !== Number(b.totalPaid || b.paidAmount || 0)) return true;

    // فحص أطوال المصفوفات التابعة للمشروع
    const aExpLen = Array.isArray(a.expenses) ? a.expenses.length : 0;
    const bExpLen = Array.isArray(b.expenses) ? b.expenses.length : 0;
    if (aExpLen !== bExpLen) return true;

    const aPayLen = Array.isArray(a.clientPayments) ? a.clientPayments.length : (Array.isArray(a.payments) ? a.payments.length : 0);
    const bPayLen = Array.isArray(b.clientPayments) ? b.clientPayments.length : (Array.isArray(b.payments) ? b.payments.length : 0);
    if (aPayLen !== bPayLen) return true;

    const aMsLen = Array.isArray(a.paymentMilestones) ? a.paymentMilestones.length : 0;
    const bMsLen = Array.isArray(b.paymentMilestones) ? b.paymentMilestones.length : 0;
    if (aMsLen !== bMsLen) return true;

    const aLogsLen = Array.isArray(a.dailyLogs) ? a.dailyLogs.length : 0;
    const bLogsLen = Array.isArray(b.dailyLogs) ? b.dailyLogs.length : 0;
    if (aLogsLen !== bLogsLen) return true;

    // فحص المحتوى في حالة تعديل بند بدون تغيير الطول
    try {
      if (aExpLen > 0 && JSON.stringify(a.expenses) !== JSON.stringify(b.expenses)) return true;
      if (aPayLen > 0 && JSON.stringify(a.clientPayments || a.payments) !== JSON.stringify(b.clientPayments || b.payments)) return true;
    } catch (_) {}
  }
  return false;
}

function getInitialCompanyId() {
  // 1. فحص النطاق الفرعي أولاً (إذا كان المتصفح على نطاق شركة معين مثل amlak.tashteebpro.com أو ?subdomain=amlak)
  try {
    const sub = getSubdomain();
    if (sub && sub !== 'admin' && sub !== 'superadmin' && sub !== 'platform') {
      const allTenants = loadAllTenants();
      const match = allTenants.find(t =>
        t.subdomain?.toLowerCase() === sub ||
        t.id?.toLowerCase() === sub ||
        t.id?.toLowerCase() === `comp_${sub}` ||
        t.id?.toLowerCase() === `comp_c_${sub}`
      );
      if (match) return match.id;

      // فحص الكوكي المشترك لآخر شركة مسجلة
      const lastReg = getCrossSubdomainCookie('tashteeb_last_registered_tenant');
      if (lastReg && (lastReg.subdomain?.toLowerCase() === sub || lastReg.id === `comp_${sub}`)) {
        return lastReg.id;
      }

      // فحص معلمات الرابط
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const paramTenantId = params?.get('tenant_id');
      if (paramTenantId) return paramTenantId;

      return `comp_${sub}`;
    }
  } catch (e) {}

  try {
    const session = localStorage.getItem('active_session_user');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed?.companyId) return parsed.companyId;
    }
  } catch (e) {}
  return getActiveTenantId() || null;
}

export default function App() {
  const [projects, setProjects] = useState(() => {
    try {
      const initial = getTenantData(getInitialCompanyId());
      return initial?.projects || [];
    } catch (e) {
      return [];
    }
  });
  const [team, setTeam] = useState(() => {
    try {
      const initial = getTenantData(getInitialCompanyId());
      return initial?.team || { engineers: [], accountants: [], techOffice: [] };
    } catch (e) {
      return { engineers: [], accountants: [], techOffice: [] };
    }
  });
  const [leads, setLeads] = useState(() => {
    try {
      const initial = getTenantData(getInitialCompanyId());
      return initial?.leads || [];
    } catch (e) {
      return [];
    }
  });

  const [companySettings, setCompanySettings] = useState(() => loadCompanySettings(getInitialCompanyId()));
  const [tab, setTab] = useState(() => {
    const p = getTabFromPath();
    if (p === 'automations') return 'settings';
    return p || "overview";
  });
  const [settingsSubTab, setSettingsSubTab] = useState(() => {
    return getTabFromPath() === 'automations' ? 'automations' : 'branding';
  });
  const [view, setView] = useState("list"); // list | detail | form
  const [activeId, setActiveId] = useState(null);
  const [activeClientPortalProjectId, setActiveClientPortalProjectId] = useState(null);

  // Public Client Portal Route State (Accessible without login from any browser/device)
  const [portalRouteInfo, setPortalRouteInfo] = useState(() => parseClientPortalFromUrl());
  const [intakeRouteInfo, setIntakeRouteInfo] = useState(() => parseIntakeRouteFromUrl());
  const [publicPortalProject, setPublicPortalProject] = useState(null);
  const [publicPortalCompanySettings, setPublicPortalCompanySettings] = useState(null);
  const [portalLoading, setPortalLoading] = useState(() => !!parseClientPortalFromUrl());
  const [formInitial, setFormInitial] = useState(null); // null=new, object=edit
  const [initialProjectSub, setInitialProjectSub] = useState(null);
  const [saveState, setSaveState] = useState(null); // null | 'saved' | 'offline'
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem('active_session_user');
      if (cached) {
        return JSON.parse(cached);
      }
      const cookieUser = getCrossSubdomainCookie('tashteeb_session_user');
      if (cookieUser && typeof cookieUser === 'object') {
        try { localStorage.setItem('active_session_user', JSON.stringify(cookieUser)); } catch (e) {}
        return cookieUser;
      }
      return null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      if (localStorage.getItem('active_session_user')) return true;
      if (getCrossSubdomainCookie('tashteeb_session_user')) return true;
      return false;
    } catch (e) {
      return false;
    }
  });
  const [authLoading, setAuthLoading] = useState(() => {
    try {
      return !localStorage.getItem('active_session_user') && !getCrossSubdomainCookie('tashteeb_session_user');
    } catch (e) {
      return true;
    }
  });
  const userRole = currentUser?.role || 'engineer';

  // Landing Page vs Login state
  const [isLoginMode, setIsLoginMode] = useState(() => {
    const p = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    // إذا وصل المستخدم بعد إنشاء حساب جديد (?registered=1) → نعرض صفحة Login مباشرة
    const params = new URLSearchParams(window.location.search);
    if (params.get('registered') === '1') return true;
    return p === 'login' || p === 'register' || p === 'signup' || p === 'contractors' || p === 'projects' || p === 'finance';
  });
  const [loginInitialMode, setLoginInitialMode] = useState(() => {
    const p = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    return p === 'register' || p === 'signup' ? 'register' : 'login';
  });
  // Company Tenant Scoped ID:
  // للمستخدم العادي: نعتمد حصرياً على companyId من الـ Claims السحابية
  // للسوبر أدمن فقط: نسمح بالتبديل بين الشركات عبر getActiveTenantId() أو sessionStorage
  const activeCompanyId = useMemo(() => {
    const isPreviewing = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('admin_preview_mode') === 'true';
    if (currentUser?.isSuperAdmin || currentUser?.role === 'super_admin' || isPreviewing) {
      // السوبر أدمن فقط: يُسمح له بالتبديل بين الشركات عبر getActiveTenantId() (وضع المعاينة المقصود)
      return getActiveTenantId() || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tashteeb_preview_tenant_id')) || currentUser?.companyId || null;
    }
    // المستخدم العادي: نعتمد حصرياً على companyId من الـ Claims/الجلسة الموثقة
    // ⚠️ لا نستخدم getActiveTenantId() هنا أبداً؛ فهي قيمة مخزّنة محلياً لكل متصفح على حدة (localStorage)
    // وممكن تكون من جلسة/معاينة قديمة لشركة مختلفة تماماً على نفس الجهاز، مما يسبب خلط الشركات.
    return currentUser?.companyId || null;
  }, [currentUser]);

  // استخراج النطاق الفرعي الخاص بالشركة الحالية لعرضه وتسهيل نسخه
  const companySubdomain = useMemo(() => {
    try {
      const all = loadAllTenants();
      const match = all.find(t => t.id === activeCompanyId);
      return match?.subdomain || match?.slug || null;
    } catch (e) {
      return null;
    }
  }, [activeCompanyId]);

  // Multi-Tenant Subdomain Cloud Resolution States
  const [subdomainResolving, setSubdomainResolving] = useState(() => isCompanySubdomain());
  const [subdomainNotFound, setSubdomainNotFound] = useState(false);
  // اسم الشركة المكتشفة من السب-دومين لعرضه في شاشة التحميل
  const [subdomainCompanyName, setSubdomainCompanyName] = useState(() => {
    try {
      const sub = getSubdomain();
      if (sub) {
        const all = loadAllTenants();
        const match = all.find(t =>
          (t.subdomain || '').toLowerCase() === sub ||
          (t.slug || '').toLowerCase() === sub ||
          (t.id || '').toLowerCase() === sub ||
          (t.id || '').toLowerCase() === `comp_${sub}`
        );
        return match?.name || null;
      }
    } catch (e) {}
    return null;
  });

  // حل وتحديد هوية الشركة سحابياً فوراً عند الدخول من نطاق فرعي مخصص (مثل amlak.tashteebpro.com أو ?subdomain=amlak)
  useEffect(() => {
    let isMounted = true;
    const sub = getSubdomain();

    if (isCompanySubdomain() && sub) {
      setSubdomainResolving(true);

      const resolveSubdomainTenant = async () => {
        let result = null;

        // 1. محاولة الجلب السحابي من Firestore (tenant_directory ثم platform_metadata/tenants)
        try {
          result = await fetchTenantBySubdomain(sub);
        } catch (e) {
          console.warn('[App] fetchTenantBySubdomain error:', e);
        }

        // 2. فحص معلمات الرابط (URL Query Params) عند التحويل الفوري بعد التسجيل
        if (!result || !result.id) {
          try {
            const params = new URLSearchParams(window.location.search);
            const urlTenantId = params.get('tenant_id');
            const urlCompName = params.get('company_name');
            if (urlTenantId) {
              result = {
                id: urlTenantId,
                companyId: urlTenantId,
                name: urlCompName || sub,
                companyName: urlCompName || sub,
                subdomain: sub,
                slug: sub,
              };
              console.log('[App] ✅ Resolved tenant from URL params:', result);
            }
          } catch (e) {}
        }

        // 3. فحص الكوكي المشترك للشركة المسجلة حديثاً (tashteeb_last_registered_tenant)
        if (!result || !result.id) {
          try {
            const lastReg = getCrossSubdomainCookie('tashteeb_last_registered_tenant');
            if (lastReg && (
              (lastReg.subdomain || '').toLowerCase() === sub ||
              (lastReg.slug || '').toLowerCase() === sub ||
              (lastReg.id || '').toLowerCase() === sub
            )) {
              result = lastReg;
              console.log('[App] ✅ Resolved tenant from cross-subdomain cookie:', result);
            }
          } catch (e) {}
        }

        // 4. فحص كاش الشركات المشترك في الكوكيز (tashteeb_tenants_cache)
        if (!result || !result.id) {
          try {
            const cookieList = getCrossSubdomainCookie('tashteeb_tenants_cache');
            if (Array.isArray(cookieList)) {
              const match = cookieList.find(t =>
                (t.subdomain || '').toLowerCase() === sub ||
                (t.slug || '').toLowerCase() === sub ||
                (t.id || '').toLowerCase() === sub
              );
              if (match) {
                result = match;
                console.log('[App] ✅ Resolved tenant from cookie cache:', result);
              }
            }
          } catch (e) {}
        }

        // 5. فحص قائمة الشركات المحلية والتلقائية (loadAllTenants)
        if (!result || !result.id) {
          try {
            const all = loadAllTenants();
            const match = all.find(t =>
              (t.subdomain || '').toLowerCase() === sub ||
              (t.slug || '').toLowerCase() === sub ||
              (t.id || '').toLowerCase() === sub ||
              (t.id || '').toLowerCase() === `comp_${sub}` ||
              (t.id || '').toLowerCase() === `comp_c_${sub}`
            );
            if (match) {
              result = match;
              console.log('[App] ✅ Resolved tenant from local/default tenants:', result);
            }
          } catch (e) {}
        }

        // 6. إعادة محاولة ثانية سحابياً بعد ثانية ونصف في حال كان انتشار السحابة بطيئاً
        if (!result || !result.id) {
          try {
            await new Promise(r => setTimeout(r, 1500));
            if (!isMounted) return;
            result = await fetchTenantBySubdomain(sub);
          } catch (e) {}
        }

        if (!isMounted) return;

        if (result && result.id) {
          setActiveTenantId(result.id);

          // تسجيل وتحديث بيانات الشركة في الذاكرة المحلية لضمان توافق باقي المكونات
          try {
            const all = loadAllTenants();
            if (!all.some(t => t.id === result.id)) {
              saveAllTenants([result, ...all]);
            }
          } catch (e) {}

          // أولاً: فحص الإعدادات المخزنة محلياً لهذه الشركة للحفاظ التام على أحدث اسم وهوية قام المستخدم بحفظها
          let localSaved = null;
          try {
            const raw = localStorage.getItem(`tenant_${result.id}_settings`);
            if (raw) localSaved = JSON.parse(raw);
          } catch (e) {}

          // بناء الإعدادات والهوية البصرية الحديثة من الكاش المحلي والسحابة مع إعطاء الأولوية للبيانات المحفوظة
          let resolvedSettings = {
            ...DEFAULT_COMPANY_SETTINGS,
            companyName: localSaved?.companyName || result.name || result.companyName || DEFAULT_COMPANY_SETTINGS.companyName,
            companySubtitle: localSaved?.companySubtitle !== undefined ? localSaved.companySubtitle : (result.subtitle || result.companySubtitle || DEFAULT_COMPANY_SETTINGS.companySubtitle),
            companyLogo: localSaved?.companyLogo !== undefined ? localSaved.companyLogo : (result.logo || result.companyLogo || null),
            primaryColor: localSaved?.primaryColor || result.primaryColor || DEFAULT_COMPANY_SETTINGS.primaryColor,
            accentColor: localSaved?.accentColor || result.accentColor || DEFAULT_COMPANY_SETTINGS.accentColor,
            currency: localSaved?.currency || result.currency || DEFAULT_COMPANY_SETTINGS.currency,
            city: localSaved?.city || result.city || '',
            country: localSaved?.country || result.country || '',
            phone: localSaved?.phone || result.phone || '',
            subdomain: result.subdomain || result.slug || sub,
            ...(localSaved || {}),
          };

          // فحص إضافي لوثيقة الشركة التفصيلية من السحابة إذا كانت متوفرة
          try {
            const companyDoc = await fetchCompanyDataFromCloud(result.id);
            if (companyDoc?.settings) {
              const cloudSet = companyDoc.settings;
              const safeLogo = (cloudSet.companyLogo && String(cloudSet.companyLogo).trim()) ? cloudSet.companyLogo : (resolvedSettings.companyLogo || null);
              const isDefaultName = (n) => !n || n === 'شركة المقاولات' || n === 'شركة المقاولات والتشطيبات';
              const safeName = !isDefaultName(cloudSet.companyName) ? cloudSet.companyName : (resolvedSettings.companyName || result.name || 'شركة المقاولات');
              resolvedSettings = {
                ...resolvedSettings,
                ...cloudSet,
                companyName: safeName,
                companyLogo: safeLogo,
              };
            }
          } catch (e) {}

          // تخزين الإعدادات المحدثة محلياً لسرعة الوصول اللاحق
          try {
            localStorage.setItem(`tenant_${result.id}_settings`, JSON.stringify(resolvedSettings));
          } catch (e) {}

          setCompanySettings(resolvedSettings);
          applyCompanyBranding(resolvedSettings);
          setSubdomainCompanyName(resolvedSettings.companyName || result.name || null);
          setSubdomainNotFound(false);

          // مزامنة علاجية تلقائية لـ tenant_directory في السحابة لضمان حفظ الاسم المحدث دائماً
          try {
            setDoc(doc(db, 'tenant_directory', sub), {
              companyId: result.id,
              name: resolvedSettings.companyName || result.name || sub,
              logo: resolvedSettings.companyLogo || result.logo || null,
              subdomain: sub,
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          } catch (e) {}
        } else {
          setSubdomainNotFound(true);
        }
      };

      resolveSubdomainTenant()
        .catch((err) => {
          console.warn("Subdomain resolution error:", err);
          if (isMounted) setSubdomainNotFound(true);
        })
        .finally(() => {
          if (isMounted) setSubdomainResolving(false);
        });
    } else {
      setSubdomainResolving(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGoToMainDomain = () => {
    // مسح جميع بيانات السب-دومين من localStorage والذاكرة المؤقتة
    clearActiveSubdomain();
    try { localStorage.removeItem('platform-active-tenant-id'); } catch (e) {}
    try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('tashteeb_active_subdomain'); } catch (e) {}
    try {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || hostname === '127.0.0.1') {
        window.location.href = window.location.origin + '/?cleared=1';
        return;
      }
    } catch (e) {}
    window.location.href = 'https://tashteebpro.com/';
  };

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Central tab navigation handler supporting subtabs
  const handleNavigateToTab = (t) => {
    if (t === 'automations') {
      setTab('settings');
      setSettingsSubTab('automations');
    } else {
      setTab(t);
    }
    setView("list");
  };

  // Onboarding Tour state
  const [showTour, setShowTour] = useState(false);

  // أول دخول: بذار بيانات تجريبية فقط للشركة النموذجية comp_demo
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId) return;
    if (isFirstLogin(activeCompanyId)) {
      if (activeCompanyId === 'comp_demo') {
        const seeded = seedDemoData(`tenant_${activeCompanyId}_projects`, `tenant_${activeCompanyId}_team`, activeCompanyId);
        if (seeded) {
          const localData = getTenantData(activeCompanyId);
          if (localData?.projects?.length) {
            setProjects(localData.projects);
          }
          if (localData?.team) {
            setTeam(localData.team);
          }
        }
      }
      markFirstLoginDone(activeCompanyId);
      const timer = setTimeout(() => setShowTour(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [activeCompanyId, isAuthenticated]);

  // Theme State (Default to Clean Calm Light Mode, initialized directly from storage to eliminate flash)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'dark') {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
        return true;
      }
    } catch (e) {}
    return false;
  });

  // Apply company branding and currency on startup
  useEffect(() => {
    applyCompanyBranding(companySettings);
    if (companySettings?.currency) {
      setGlobalCurrency(companySettings.currency);
    }
  }, [companySettings]);

  // مزامنة تصحيحية ذاتية لكافة حسابات الموظفين والشركات مع السحابة لتمكين الدخول من أي هاتف أو جهاز
  useEffect(() => {
    try {
      syncAllLocalUsersToCloud();
    } catch (e) {}
  }, []);

  // Listen for company settings changes from other tabs for the active company
  useEffect(() => {
    function onStorageChange(e) {
      if (e.key === `tenant_${activeCompanyId}_settings`) {
        const updated = loadCompanySettings(activeCompanyId);
        setCompanySettings(updated);
        applyCompanyBranding(updated);
        if (updated?.currency) {
          setGlobalCurrency(updated.currency);
        }
      }
    }
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, [activeCompanyId]);

  // Update theme when toggled by user
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  // تنظيف أي وثائق عشوائية قديمة سحابياً عند بدء التشغيل في وقت الخمول فقط للمستخدمين المسجلين
  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => cleanUpInvalidDocs(), { timeout: 3000 });
    } else {
      setTimeout(() => cleanUpInvalidDocs(), 2000);
    }
  }, [isAuthenticated]);

  // Preload secondary modules quietly during idle time so tab clicks are instant (0 ms)
  useEffect(() => {
    const preload = () => {
      import('./pages/Overview');
      import('./pages/ProjectsTab');
      import('./pages/ProjectDetail');
      import('./pages/CrmPipeline');
      import('./pages/CompanyFinance');
      import('./pages/TeamPerformance');
      import('./pages/QuotationBuilder');
      import('./pages/SuppliersTab');
      import('./pages/SubcontractorsTab');
      import('./pages/CompanySettings');
    };
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(preload, { timeout: 1500 });
      } else {
        setTimeout(preload, 250);
      }
    }
  }, []);

  // التحميل الفوري والاشتراك الحي لبوابة العميل العامة عند فتح رابط /portal/:id
  useEffect(() => {
    if (!portalRouteInfo) {
      setPortalLoading(false);
      return;
    }
    let isCancelled = false;
    let unsub = () => {};

    const targetToken = portalRouteInfo.token || portalRouteInfo.projectId;

    async function loadPortal() {
      setPortalLoading(true);
      try {
        const resolved = await resolveClientPortalProject(targetToken);
        if (!isCancelled && resolved?.project) {
          setPublicPortalProject(resolved.project);
          if (resolved.companySettings) {
            setPublicPortalCompanySettings(resolved.companySettings);
            applyCompanyBranding(resolved.companySettings);
          }
        }
      } catch (err) {
        console.warn('[App] Failed to load public portal project:', err);
      } finally {
        if (!isCancelled) {
          setPortalLoading(false);
        }
      }
    }

    loadPortal();

    if (targetToken) {
      unsub = subscribeToClientPortal(targetToken, (liveData) => {
        if (!isCancelled && liveData?.project) {
          setPublicPortalProject(liveData.project);
          if (liveData.companySettings) {
            setPublicPortalCompanySettings(liveData.companySettings);
            applyCompanyBranding(liveData.companySettings);
          }
        }
      });
    }

    return () => {
      isCancelled = true;
      if (typeof unsub === 'function') unsub();
    };
  }, [portalRouteInfo]);

  // الاستماع لتغيير الروابط وأزرار الرجوع/التقدم بالمتصفح والـ Hash
  useEffect(() => {
    const handleNavigation = () => {
      setPortalRouteInfo(parseClientPortalFromUrl());
      setIntakeRouteInfo(parseIntakeRouteFromUrl());
    };
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  // Admin Context Memoized Value
  const adminContextValue = useMemo(() => ({
    role: userRole,
    companyId: activeCompanyId,
    isSuperAdmin: userRole === 'super_admin' || !!currentUser?.isSuperAdmin,
    currentUser,
    isAuthenticated,
  }), [userRole, activeCompanyId, currentUser, isAuthenticated]);

  // Load and sync tenant data whenever active company changes (Cloud-First with instant local cache)
  const loadTenantWorkspace = async (companyId) => {
    // 1. عرض فوري للكاش المحلي (0ms latency)
    const localData = getTenantData(companyId);
    let scopedLocalProjects = (localData.projects || []).map(p => ({
      ...p,
      companyId: companyId
    }));
    if (companyId !== 'comp_demo') {
      scopedLocalProjects = scopedLocalProjects.filter(p => !isDemoProject(p));
    }
    setProjects(scopedLocalProjects);
    setTeam(localData.team || { engineers: [], accountants: [], techOffice: [] });
    setLeads(localData.leads || []);

    // 1b. تحميل الإعدادات من localStorage أولاً للسرعة، مع الحرص على عدم فقدان اللوجو
    const localSettings = localData.settings || {};
    setCompanySettings(localSettings);
    applyCompanyBranding(localSettings);
    if (localSettings?.currency) {
      setGlobalCurrency(localSettings.currency);
    }

    if (!companyId) return;

    // 2. فحص وجلب أحدث البيانات سحابياً من Firestore مع الحفاظ التام على أحدث التعديلات المحلية
    try {
      const cloudData = await getTenantDataAsync(companyId);
      if (cloudData) {
        if (Array.isArray(cloudData.projects)) {
          setProjects(() => {
            const safeLocal = (scopedLocalProjects || []).filter(p => !p.companyId || p.companyId === companyId);
            const merged = mergeProjectsPreservingLocal(safeLocal, cloudData.projects, companyId).map(p => ({
              ...p,
              companyId: companyId
            }));
            try {
              const lean = merged.map(p => sanitizeProjectForCloud(p));
              localStorage.setItem(`tenant_${companyId}_projects`, JSON.stringify(lean));
            } catch (e) {}
            return merged;
          });
        }
        if (cloudData.team) {
          setTeam(prev => mergeTeamsPreservingLocal(prev || localData.team, cloudData.team, cloudData.users || localData.users));
        }
        if (Array.isArray(cloudData.leads)) setLeads(cloudData.leads);

        if (cloudData.settings) {
          // دمج الإعدادات مع إعطاء أولوية للوجو والاسم من أي مصدر (سحابي أو محلي)
          const safeMergedLogo =
            (cloudData.settings.companyLogo && String(cloudData.settings.companyLogo).trim())
              ? cloudData.settings.companyLogo
              : (localData.settings?.companyLogo || null);

          const isDefault = (n) => !n || n === 'شركة المقاولات' || n === 'شركة المقاولات والتشطيبات' || String(n).includes('المقاولات النموذجية') || n === 'شركة جديدة';
          
          const localTime = localData.settings?.updatedAt ? new Date(localData.settings.updatedAt).getTime() : 0;
          const cloudTime = cloudData.settings?.updatedAt ? new Date(cloudData.settings.updatedAt).getTime() : 0;
          const isLocalNewer = localTime > cloudTime;

          let safeMergedName = 'شركة المقاولات';
          if (isLocalNewer && !isDefault(localData.settings?.companyName)) {
            safeMergedName = localData.settings.companyName;
          } else if (!isDefault(cloudData.settings.companyName)) {
            safeMergedName = cloudData.settings.companyName;
          } else if (!isDefault(localData.settings?.companyName)) {
            safeMergedName = localData.settings.companyName;
          } else {
            safeMergedName = cloudData.settings.companyName || localData.settings?.companyName || 'شركة المقاولات';
          }

          const base = isLocalNewer
            ? { ...(cloudData.settings || {}), ...(localData.settings || {}) }
            : { ...(localData.settings || {}), ...(cloudData.settings || {}) };

          const mergedSettings = {
            ...base,
            companyName: safeMergedName,
            companyLogo: safeMergedLogo,
          };
          setCompanySettings(mergedSettings);
          applyCompanyBranding(mergedSettings);
          if (mergedSettings.currency) setGlobalCurrency(mergedSettings.currency);
          try {
            const rawS = JSON.stringify(mergedSettings);
            localStorage.setItem(`tenant_${companyId}_settings`, rawS);
            if (!companyId.startsWith('comp_')) {
              localStorage.setItem(`tenant_comp_${companyId}_settings`, rawS);
            } else {
              localStorage.setItem(`tenant_${companyId.replace(/^comp_/, '')}_settings`, rawS);
            }
          } catch (e) {}
        } else {
          // 2b. إذا لم تُرجع getTenantDataAsync إعدادات، نقرأ مباشرةً من Firestore
          try {
            const { db: firestoreDb } = await import('./firebase');
            const { doc: fsDoc, getDoc: fsGetDoc } = await import('firebase/firestore');
            const compSnap = await fsGetDoc(fsDoc(firestoreDb, 'companies', companyId));
            if (compSnap.exists()) {
              const compData = compSnap.data();
              if (compData?.settings) {
                const cloudSettings = compData.settings;
                const safeLogo = (cloudSettings.companyLogo && String(cloudSettings.companyLogo).trim())
                  ? cloudSettings.companyLogo
                  : (localData.settings?.companyLogo || null);
                const isDefault = (n) => !n || n === 'شركة المقاولات' || n === 'شركة المقاولات والتشطيبات' || n === 'شركة جديدة';
                const safeName = !isDefault(cloudSettings.companyName)
                  ? cloudSettings.companyName
                  : (localData.settings?.companyName || cloudSettings.companyName || 'شركة المقاولات');
                const directSettings = { ...localData.settings, ...cloudSettings, companyName: safeName, companyLogo: safeLogo };
                setCompanySettings(directSettings);
                applyCompanyBranding(directSettings);
                if (directSettings.currency) setGlobalCurrency(directSettings.currency);
                try {
                  const rawS = JSON.stringify(directSettings);
                  localStorage.setItem(`tenant_${companyId}_settings`, rawS);
                  if (!companyId.startsWith('comp_')) {
                    localStorage.setItem(`tenant_comp_${companyId}_settings`, rawS);
                  } else {
                    localStorage.setItem(`tenant_${companyId.replace(/^comp_/, '')}_settings`, rawS);
                  }
                } catch (e) {}
              }
            }
          } catch (directErr) {
            console.warn('[loadTenantWorkspace] Direct Firestore settings fetch error:', directErr?.message);
          }
        }
      }
    } catch (e) {
      console.warn("Could not sync tenant workspace from cloud:", e);
    }
  };


  useEffect(() => {
    if (!isAuthenticated) return;
    loadTenantWorkspace(activeCompanyId).catch(e => console.warn('loadTenantWorkspace failed:', e));
  }, [activeCompanyId, isAuthenticated]);

  // الاستماع الفوري لتحديثات إعدادات وهوية الشركة وشعارها
  useEffect(() => {
    const handleSettingsUpdated = () => {
      const fresh = loadCompanySettings(activeCompanyId);
      if (fresh) {
        setCompanySettings(fresh);
        applyCompanyBranding(fresh);
      }
    };
    window.addEventListener('company_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('company_settings_updated', handleSettingsUpdated);
  }, [activeCompanyId]);

  // استماع ومزامنة سحابية حية لإعدادات وهوية الشركة لحظياً (Cross-Browser Realtime Company Settings)
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId) return;
    const unsub = subscribeToCloudCompanyField(activeCompanyId, 'settings', (cloudSettings) => {
      if (cloudSettings && typeof cloudSettings === 'object') {
        setCompanySettings((prev) => {
          const isDefaultName = (n) => !n || n === 'شركة المقاولات' || n === 'شركة المقاولات والتشطيبات' || n === 'شركة جديدة';
          const safeName = !isDefaultName(cloudSettings.companyName)
            ? cloudSettings.companyName
            : (prev?.companyName || cloudSettings.companyName || 'شركة المقاولات');
          const safeLogo = cloudSettings.companyLogo !== undefined ? (cloudSettings.companyLogo || null) : (prev?.companyLogo || null);

          const merged = {
            ...prev,
            ...cloudSettings,
            companyName: safeName,
            companyLogo: safeLogo,
          };

          const hasChanged =
            JSON.stringify(prev) !== JSON.stringify(merged);

          if (hasChanged) {
            try {
              const rawS = JSON.stringify(merged);
              localStorage.setItem(`tenant_${activeCompanyId}_settings`, rawS);
              if (!activeCompanyId.startsWith('comp_')) {
                localStorage.setItem(`tenant_comp_${activeCompanyId}_settings`, rawS);
              } else {
                localStorage.setItem(`tenant_${activeCompanyId.replace(/^comp_/, '')}_settings`, rawS);
              }
            } catch (e) {}

            applyCompanyBranding(merged);
            if (merged.currency) setGlobalCurrency(merged.currency);

            setCurrentUser(curr => {
              if (curr && (!curr.companyId || curr.companyId === activeCompanyId) && curr.companyName !== merged.companyName) {
                const updatedUser = { ...curr, companyName: merged.companyName };
                try { localStorage.setItem('active_session_user', JSON.stringify(updatedUser)); } catch (e) {}
                return updatedUser;
              }
              return curr;
            });

            return merged;
          }
          return prev;
        });
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeCompanyId, isAuthenticated]);

  // استماع ومزامنة سحابية حية للمشاريع لحظياً
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId) return;
    const unsub = subscribeToCloudProjects(activeCompanyId, (cloudProjects) => {
      if (Array.isArray(cloudProjects)) {
        setProjects((prev) => {
          if (hasCollectionChanged(prev, cloudProjects)) {
            try {
              localStorage.setItem(`tenant_${activeCompanyId}_projects`, JSON.stringify(cloudProjects));
            } catch (e) {}
            return cloudProjects;
          }
          return prev;
        });
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeCompanyId, isAuthenticated]);

  // استماع ومزامنة سحابية حية للعملاء المحتملين (CRM Leads) لحظياً
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId) return;
    const unsub = subscribeToCloudLeads(activeCompanyId, (cloudLeads) => {
      if (Array.isArray(cloudLeads)) {
        setLeads((prev) => {
          if (hasCollectionChanged(prev, cloudLeads)) {
            try {
              localStorage.setItem(`tenant_${activeCompanyId}_leads`, JSON.stringify(cloudLeads));
            } catch (e) {}
            return cloudLeads;
          }
          return prev;
        });
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeCompanyId, isAuthenticated]);

  // ─── خدمة المزامنة الخلفية التلقائية للوسائط المعلقة (Background Media Sync) ───
  const [mediaSyncState, setMediaSyncState] = useState({ isSyncing: false, pendingCount: 0 });
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  useEffect(() => {
    const unsub = onSyncStatusChange((st) => {
      setMediaSyncState(st);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId) return;

    const triggerSync = () => {
      const currentProjects = projectsRef.current;
      if (!Array.isArray(currentProjects) || currentProjects.length === 0) return;
      syncAllPendingMedia(activeCompanyId, currentProjects, {
        onProjectUpdated: (projId, patch) => {
          setProjects(prev => {
            const list = prev || [];
            const updated = list.map(p => p.id === projId ? { ...p, ...patch } : p);
            try {
              localStorage.setItem(`tenant_${activeCompanyId}_projects`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      }).catch(err => console.warn('[App] Background media sync notice:', err));
    };

    // 1. تشغيل تلقائي أولي هادئ بعد التحميل
    const initialTimer = setTimeout(triggerSync, 2500);

    // 2. تشغيل فوري لحظة استعادة الاتصال بالإنترنت (online event)
    const handleOnline = () => {
      console.log('[App] 🌐 Device back online! Starting background media sync...');
      triggerSync();
    };
    window.addEventListener('online', handleOnline);

    // 3. مؤقت أمان دوري كل 5 دقائق
    const intervalTimer = setInterval(triggerSync, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('online', handleOnline);
    };
  }, [activeCompanyId, isAuthenticated]);



  function flashSave(ok) {
    setSaveState(ok ? "saved" : "offline");
    setTimeout(() => setSaveState(null), ok ? 1800 : 4000);
  }

  async function persist(next) {
    setProjects(next);
    try { 
      localStorage.setItem(`tenant_${activeCompanyId}_projects`, JSON.stringify(next));
      flashSave(true); 
    }
    catch (e) { console.error("storage error", e); flashSave(false); }
    if (activeCompanyId) {
      syncProjectsToCloud(activeCompanyId, next).catch(err => {
        console.warn("Cloud sync projects error:", err);
        flashSave(false);
      });
    }
  }

  async function persistTeam(next) {
    setTeam(next);
    try { 
      localStorage.setItem(`tenant_${activeCompanyId}_team`, JSON.stringify(next));
      flashSave(true); 
    }
    catch (e) { console.error("storage error", e); flashSave(false); }
    if (activeCompanyId) {
      syncTeamToCloud(activeCompanyId, next).catch(err => {
        console.warn("Cloud sync team error:", err);
        flashSave(false);
      });
    }
  }

  async function persistLeads(next) {
    setLeads(next);
    try { 
      localStorage.setItem(`tenant_${activeCompanyId}_leads`, JSON.stringify(next));
      flashSave(true); 
    }
    catch (e) { console.error("storage error", e); flashSave(false); }
    if (activeCompanyId) {
      syncLeadsToCloud(activeCompanyId, next).catch(err => {
        console.warn("Cloud sync leads error:", err);
        flashSave(false);
      });
    }
  }

  function addLead(lead) {
    persistLeads([lead, ...(leads || [])]);
  }

  function updateLead(id, patch) {
    persistLeads((leads || []).map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function deleteLead(id) {
    persistLeads((leads || []).filter((l) => l.id !== id));
  }

  function addMember(role, name, meta) {
    if (!name || !name.trim()) return false;
    if (!team) return false; // team still loading
    const trimmed = name.trim();
    if ((team[role] || []).includes(trimmed)) return false;
    const nextTeam = { ...team, [role]: [...(team[role] || []), trimmed] };
    persistTeam(nextTeam);
    if (meta) {
      try {
        const storedMeta = JSON.parse(localStorage.getItem('db-team-meta-v1') || '{}');
        storedMeta[trimmed] = meta;
        localStorage.setItem('db-team-meta-v1', JSON.stringify(storedMeta));
      } catch (e) {}
    }
    return true;
  }

  function updateMember(role, oldName, newName, meta) {
    if (!newName || !newName.trim()) return false;
    if (!team) return false; // team still loading
    const trimmedNew = newName.trim();
    const list = team[role] || [];
    if (oldName !== trimmedNew && list.includes(trimmedNew)) return false;

    const nextTeam = {
      ...team,
      [role]: list.map(n => n === oldName ? trimmedNew : n)
    };
    persistTeam(nextTeam);

    if (oldName !== trimmedNew) {
      const pKey = role === 'engineers' ? 'engineer' : role === 'accountants' ? 'accountant' : 'techOffice';
      setProjects(prev => {
        const list = prev || [];
        const updatedProjects = list.map(p => p[pKey] === oldName ? { ...p, [pKey]: trimmedNew } : p);
        persist(updatedProjects);
        return updatedProjects;
      });
    }

    try {
      const storedMeta = JSON.parse(localStorage.getItem('db-team-meta-v1') || '{}');
      storedMeta[trimmedNew] = meta || storedMeta[oldName] || {};
      if (oldName !== trimmedNew) delete storedMeta[oldName];
      localStorage.setItem('db-team-meta-v1', JSON.stringify(storedMeta));
    } catch (e) {}

    return true;
  }

  function removeMember(role, name) {
    if (!team) return; // team still loading
    persistTeam({ ...team, [role]: (team[role] || []).filter((n) => n !== name) });
    try {
      const storedMeta = JSON.parse(localStorage.getItem('db-team-meta-v1') || '{}');
      delete storedMeta[name];
      localStorage.setItem('db-team-meta-v1', JSON.stringify(storedMeta));
    } catch (e) {}
  }

  const allAreas = useMemo(() => {
    const set = new Set(AREAS);
    if (projects) projects.forEach(p => p.area && set.add(p.area));
    return Array.from(set);
  }, [projects]);

  function openDetail(id, targetSub = null) {
    setActiveId(id);
    setInitialProjectSub(targetSub);
    setTab("projects");
    setView("detail");
  }
  function openNew() { setFormInitial(null); setTab("projects"); setView("form"); }
  function openEdit(project) { setFormInitial(project); setTab("projects"); setView("form"); }
  function backToList() { setTab("projects"); setView("list"); setActiveId(null); }

  function handleNotificationSelect(projectId, targetTab) {
    openDetail(projectId, targetTab);
  }

  function saveProject(data) {
    const effectiveCompId = activeCompanyId || currentUser?.companyId || null;
    if (data.id) {
      updateProject(data.id, { ...data, companyId: data.companyId || effectiveCompId });
      setActiveId(data.id);
      setView("detail");
    } else {
      const id = "p" + Date.now();
      const token = generatePortalToken();
      const newProject = {
        ...data,
        id,
        companyId: effectiveCompId,
        clientPortalToken: data.clientPortalToken || token,
        clientPortalEnabled: data.clientPortalEnabled !== false,
        submittals: [],
        tasks: [],
        dailyLogs: [],
        resources: { labor: [], subcontractors: [], materials: [], equipment: [] },
        files: [],
        snags: [],
        clientPayments: [],
        expenses: [],
        paymentMilestones: []
      };
      setProjects(prev => {
        const updated = [newProject, ...(prev || [])];
        if (effectiveCompId) {
          try {
            const lean = updated.map(p => sanitizeProjectForCloud(p));
            localStorage.setItem(`tenant_${effectiveCompId}_projects`, JSON.stringify(lean));
            flashSave(true);
          } catch (e) {
            flashSave(false);
          }
          syncSingleProjectToCloud(effectiveCompId, id, newProject).catch(err => {
            console.warn("Cloud sync single project error:", err);
            flashSave(false);
          });
        }
        return updated;
      });
      setActiveId(id);
      setView("detail");
    }
  }

  function deleteProject(id) {
    const effectiveCompId = activeCompanyId || currentUser?.companyId || null;
    setProjects(prev => {
      const updated = (prev || []).filter((p) => p.id !== id);
      if (effectiveCompId) {
        try {
          localStorage.setItem(`tenant_${effectiveCompId}_projects`, JSON.stringify(updated));
          flashSave(true); 
        } catch (e) {
          flashSave(false);
        }
        deleteSingleProjectFromCloud(effectiveCompId, id).catch(err => {
          console.warn("Cloud delete project error:", err);
          flashSave(false);
        });
      }
      return updated;
    });
    backToList();
  }

  function updateProject(id, patch) {
    const effectiveCompId = activeCompanyId || currentUser?.companyId || null;
    const now = new Date().toISOString();
    setProjects(prev => {
      const list = prev || [];
      const updated = list.map((p) => {
        if (p.id === id) {
          const merged = { ...p, ...patch, companyId: p.companyId || effectiveCompId, updatedAt: patch?.updatedAt || now };
          if (Array.isArray(merged.expenses)) {
            merged.spent = merged.expenses.reduce((s, e) => s + (Number(e?.amount) || 0), 0);
          }
          if (Array.isArray(merged.clientPayments)) {
            merged.totalPaid = merged.clientPayments.reduce((s, cp) => s + (Number(cp?.amount) || 0), 0);
            merged.paidAmount = merged.totalPaid;
          }
          if (!merged.clientPortalToken) {
            merged.clientPortalToken = generatePortalToken();
            merged.clientPortalEnabled = true;
          }
          return merged;
        }
        return p;
      });
      if (effectiveCompId) {
        try {
          const lean = updated.map(p => sanitizeProjectForCloud(p));
          localStorage.setItem(`tenant_${effectiveCompId}_projects`, JSON.stringify(lean));
          flashSave(true);
        } catch (e) {
          console.error("localStorage save error", e);
          flashSave(false);
        }
        const fullProject = updated.find(p => p.id === id);
        syncSingleProjectToCloud(effectiveCompId, id, fullProject || { ...patch, updatedAt: now }).catch(err => {
          console.warn("Cloud sync update project error:", err);
          flashSave(false);
        });
      }
      return updated;
    });
  }

  const activeProject = projects && activeId ? projects.find((p) => p.id === activeId) : null;

  // Handle Login State via Firebase Authentication & Custom Claims (Server-Enforced)
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // إنهاء جلسات الزوار المجهولين إذا لم يكونوا في بوابة العميل أو استمارة الاستفسار
        if (firebaseUser.isAnonymous) {
          if (!portalRouteInfo && !intakeRouteInfo) {
            logoutUser().catch(() => {});
          }
          setAuthLoading(false);
          return;
        }

        try {
          // قراءة الـ Custom Claims المشفرة من Google إن وُجدت
          let claims = {};
          try {
            let idTokenResult = await firebaseUser.getIdTokenResult();
            claims = idTokenResult?.claims || {};
            // إذا كان التوكن الأول فارغاً من companyId / role، نقوم بعمل forceRefresh مرة واحدة
            if (!claims.companyId && !claims.role && !claims.isSuperAdmin) {
              idTokenResult = await firebaseUser.getIdTokenResult(true);
              claims = idTokenResult?.claims || {};
            }
          } catch (e) {
            console.warn("Could not fetch claims:", e);
          }

          const claimRole = claims.role;
          const isSuperAdminClaim = claimRole === 'super_admin' || !!claims.isSuperAdmin;

          // جلب ومطابقة بيانات المستخدم والشركة (من Claims السحابية أو سجلات الشركة عبر الإيميل)
          let tenantRes = null;
          try {
            tenantRes = await resolveTenantUserByEmail(firebaseUser.email, firebaseUser.uid, claims);
          } catch (e) {
            console.warn("Tenant resolution warning:", e);
          }

          if (!tenantRes?.success || !tenantRes.user) {
            // فحص هل المستخدم في مرحلة إكمال تسجيل حساب شركة جديد لتفادي طرده قبل حفظ الشركة
            const cleanUserEmail = (firebaseUser.email || '').toLowerCase().trim();
            const isRegistering = typeof sessionStorage !== 'undefined' && 
              sessionStorage.getItem('is_registering_user') === cleanUserEmail;
            
            if (isRegistering) {
              console.log("[onAuthChange] User is currently completing registration, deferring auto-logout:", cleanUserEmail);
              return;
            }

            console.warn("Unassigned user attempted login without company affiliation:", firebaseUser.email);
            await logoutUser();
            try { localStorage.removeItem('active_session_user'); } catch (e) {}
            setCurrentUser(null);
            setIsAuthenticated(false);
            setAuthLoading(false);
            return;
          }

          const resolvedUser = tenantRes.user;
          const isSuperAdmin = Boolean(
            isSuperAdminClaim || 
            claims.role === 'super_admin' || 
            claims.isSuperAdmin === true ||
            resolvedUser.role === 'super_admin' ||
            resolvedUser.isSuperAdmin === true
          );
          const role = isSuperAdmin ? 'super_admin' : (claimRole || resolvedUser.role || 'engineer');

          let resolvedCompanyIdForSuperAdmin = null;
          if (isSuperAdmin) {
            try {
              const currentSub = getSubdomain();
              if (currentSub) {
                const subTenant = await fetchTenantBySubdomain(currentSub);
                resolvedCompanyIdForSuperAdmin = subTenant?.id || null;
              }
            } catch (e) {}
          }
          const companyId = claims.companyId || resolvedUser.companyId ||
            (isSuperAdmin ? (resolvedCompanyIdForSuperAdmin || getActiveTenantId() || null) : null);

          // إذا كان الحساب فرعياً (ليس سوبر أدمن) ودخول الحسابات الفرعية مقفل سحابياً أو محلياً -> إنهاء الجلسة فوراً
          if (role !== 'super_admin' && !isSuperAdmin) {
            let allowed = isSubAccountsLoginAllowed();
            try {
              const cloudSettings = await fetchPlatformSettingsFromCloud();
              if (cloudSettings && typeof cloudSettings.subAccountsAllowed === 'boolean') {
                allowed = cloudSettings.subAccountsAllowed;
              }
            } catch (e) {}

            if (!allowed) {
              await logoutUser();
              try { localStorage.removeItem('active_session_user'); } catch (e) {}
              setCurrentUser(null);
              setIsAuthenticated(false);
              setAuthLoading(false);
              return;
            }
          }

          const finalUser = {
            ...resolvedUser,
            id: firebaseUser.uid || resolvedUser.id,
            email: firebaseUser.email || resolvedUser.email,
            role,
            companyId,
            isSuperAdmin,
          };

          setCurrentUser(finalUser);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('active_session_user', JSON.stringify(finalUser));
          } catch (e) {}
          if (companyId) {
            setActiveTenantId(companyId);
          }

          const requestedTab = getTabFromPath();
          if (role === 'engineer') {
            setTab('projects');
          } else if (role === 'super_admin' || isSuperAdmin) {
            const isPreviewing = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('admin_preview_mode') === 'true';
            setTab(isPreviewing ? 'overview' : 'tenants');
          } else if (requestedTab && (NAV_PERMISSIONS[role] || []).includes(requestedTab) && requestedTab !== 'tenants') {
            setTab(requestedTab);
          } else {
            const allowedTabs = NAV_PERMISSIONS[role] || ['overview'];
            const initialTab = DEFAULT_TAB[role] || 'overview';
            setTab(prev => (allowedTabs.includes(prev) && prev !== 'tenants' ? prev : initialTab));
          }
        } catch (err) {
          console.error("Error evaluating Firebase auth token:", err);
          try { localStorage.removeItem('active_session_user'); } catch (e) {}
          setCurrentUser(null);
          setIsAuthenticated(false);
        } finally {
          setAuthLoading(false);
        }
      } else {
        try { localStorage.removeItem('active_session_user'); } catch (e) {}
        setCurrentUser(null);
        setIsAuthenticated(false);
        setAuthLoading(false);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Sync browser URL with active tab (استخدام pushState لتمكين التنقل بزر الرجوع بالمتصفح)
  useEffect(() => {
    if (!isAuthenticated) return;
    const pathMap = {
      subcontractors: '/subcontractors',
      projects: '/projects',
      overview: '/overview',
      crm: '/crm',
      finance: '/finance',
      team: '/team',
      suppliers: '/suppliers',
      quotations: '/quotations',
      automations: '/automations',
      settings: '/settings',
      tenants: '/tenants',
    };
    const targetPath = pathMap[tab] || '/overview';
    const search = window.location.search || '';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath + search);
    }
  }, [tab, isAuthenticated]);

  // Security Guard: Prevent non-superadmin accounts from ever viewing the tenants hub
  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin' && tab === 'tenants') {
      const safeTab = DEFAULT_TAB[currentUser.role] || 'overview';
      setTab(safeTab);
    }
  }, [currentUser, tab]);

  const handleLogin = (userData, tenantData, isSuperAdmin) => {
    const roleIsSuperAdmin = isSuperAdmin || userData?.role === 'super_admin' || userData?.isSuperAdmin;
    const defaultTab = roleIsSuperAdmin ? 'tenants' : (DEFAULT_TAB[userData?.role] || 'overview');

    // ⚠️ لا يوجد fallback لـ getActiveTenantId() هنا عمداً: لو فشل تحديد الشركة من بيانات
    // تسجيل الدخول نفسها، الأصح نترك compId فارغاً بدل ما نخلط المستخدم مع شركة قديمة مخزّنة في هذا المتصفح.
    const compId = tenantData?.id || userData?.companyId || (roleIsSuperAdmin ? getActiveTenantId() : null) || null;

    // ═══════════════════════════════════════════════════════════════════
    // 🔒 منطق الحماية والتوجيه للسب-دومين
    // ═══════════════════════════════════════════════════════════════════

    // 1. حماية السب-دومين: التحقق أن المستخدم ينتمي للشركة التي فتح سب-دومينها
    if (isCompanySubdomain() && !roleIsSuperAdmin && compId) {
      const currentSub = getSubdomain();
      if (currentSub && tenantData) {
        const tenantSub   = (tenantData.subdomain || tenantData.slug || '').toLowerCase().trim();
        const tenantId    = (tenantData.id || '').toLowerCase().trim();
        const subMatchesTenant =
          tenantSub === currentSub ||
          tenantId === currentSub ||
          tenantId === `comp_${currentSub}` ||
          tenantId === `comp_c_${currentSub}`;

        if (!subMatchesTenant) {
          // ❌ هذا المستخدم لا ينتمي لهذه الشركة — وجّهه لسب-دومين شركته الصحيح
          console.warn(`[Security] User ${userData?.email} belongs to ${tenantData.subdomain || tenantId} but tried to access ${currentSub}`);
          try {
            const correctUrl = getSubdomainUrl(tenantData.subdomain || tenantData.slug || currentSub);
            alert(`هذا الحساب مسجل في شركة أخرى. سيتم توجيهك لرابط شركتك الصحيح.`);
            clearActiveSubdomain();
            window.location.href = correctUrl;
            return; // لا نُتمم تسجيل الدخول هنا
          } catch (e) {}
        }
      }
    }

    // 2. إذا المستخدم على الدومين الرئيسي وله سب-دومين → وجّهه فوراً
    if (!isCompanySubdomain() && !isAdminSubdomain() && !roleIsSuperAdmin && compId && tenantData) {
      const tenantSub = tenantData.subdomain || tenantData.slug || null;
      if (tenantSub) {
        try {
          // حفظ الجلسة أولاً قبل الانتقال
          localStorage.setItem('active_session_user', JSON.stringify(userData));
          setCrossSubdomainCookie('tashteeb_session_user', userData);
          setActiveTenantId(compId);
        } catch (e) {}
        const subUrl = getSubdomainUrl(tenantSub);
        console.log(`[handleLogin] Redirecting to company subdomain: ${subUrl}`);
        window.location.href = subUrl;
        return; // توقف — الصفحة ستُعاد تحميلها على السب-دومين
      }
    }

    // 3. تسجيل الدخول العادي (إما على سب-دومين الشركة الصحيح، أو الإدارة، أو سوبر أدمن)
    const finalUserData = { ...userData, companyId: userData?.companyId || compId };
    setCurrentUser(finalUserData);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('active_session_user', JSON.stringify(finalUserData));
      setCrossSubdomainCookie('tashteeb_session_user', finalUserData);
    } catch (e) {}
    setTab(defaultTab);
    setView('list');
    setActiveId(null);

    if (compId) {
      setActiveTenantId(compId);
    }

    // 🔒 مسح أمني: الحفاظ الحاسم على الإعدادات والشعار وسجلات المستخدمين والفريق
    if (compId && !roleIsSuperAdmin) {
      try {
        const cleanCompId = compId.replace(/^comp_/, '');
        const keysToRemove = Object.keys(localStorage).filter(k => {
          if (!k.startsWith('tenant_')) return false;
          // الحفاظ التام على الإعدادات، الشعار، المستخدمين، والفريق
          if (k.endsWith('_users') || k.endsWith('_team') || k.endsWith('_settings')) return false;
          const parts = k.split('_');
          if (parts.length < 3) return false;
          const keyCompanyId = parts.slice(1, -1).join('_').replace(/^comp_/, '');
          return keyCompanyId !== cleanCompId;
        });
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
    // تم حذف استدعاء loadTenantWorkspace المزدوج هنا لأن تغيير activeCompanyId و isAuthenticated يُشغّل الـ Effect تلقائياً
  };



  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error('Logout error:', e);
    }
    // مسح جلسة المستخدم الحالية والمفاتيح المؤقتة للجلسة فقط مع الحفاظ التام على الإعدادات وسجل المستخدمين
    try {
      localStorage.removeItem('active_session_user');
      removeCrossSubdomainCookie('tashteeb_session_user');
      localStorage.removeItem(ACTIVE_TENANT_ID_KEY);
      localStorage.removeItem('platform-active-tenant-id');
      localStorage.removeItem('active_tenant_id');
      localStorage.removeItem('tashteeb_active_company_id');
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch (e) {}
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveTenantId(null);
    setCompanySettings(DEFAULT_COMPANY_SETTINGS);
    setProjects([]);
    setTeam({ engineers: [], accountants: [], techOffice: [], customerService: [] });
    setLeads([]);
    setTab('overview');
    setView('list');
    setActiveId(null);
  };

  const handleSwitchToCompany = (companyId) => {
    const targetId = typeof companyId === 'object' && companyId?.id ? companyId.id : companyId;
    setActiveTenantId(targetId);
    try {
      sessionStorage.setItem('admin_preview_mode', 'true');
      sessionStorage.setItem('tashteeb_preview_tenant_id', targetId);
    } catch (e) {}
    setCurrentUser(prev => prev ? { ...prev, companyId: targetId } : { role: 'super_admin', isSuperAdmin: true, companyId: targetId });
    setTab('overview');
    setView('list');
  };

  // فلترة المشاريع: المهندس يرى مشاريعه فقط (إلا إذا كان لديه صلاحية رؤية الكل)
  const displayedProjects = useMemo(() => {
    if (!projects) return [];
    if (userRole === 'engineer' && !can(currentUser || userRole, 'projects_view_all')) {
      const engName = (currentUser?.engineerName || currentUser?.name || '').trim();
      const cleanEngName = engName.replace(/^م\.\s*/, '').trim();
      if (!cleanEngName) return projects;
      return projects.filter(p => {
        const pEng = (p.engineer || '').trim();
        const cleanPEng = pEng.replace(/^م\.\s*/, '').trim();
        return pEng === engName || cleanPEng === cleanEngName || (cleanPEng && cleanEngName && (cleanPEng.includes(cleanEngName) || cleanEngName.includes(cleanPEng)));
      });
    }
    return projects;
  }, [projects, userRole, currentUser]);

  // ─── 0.0 ADMIN PORTAL (FOR ADMIN SUBDOMAIN - HIGHEST PRIORITY) ───
  if (isAdminSubdomain()) {
    return (
      <AdminProvider value={adminContextValue}>
        <React.Suspense fallback={<PageLoadingFallback />}>
          <AdminPortal
            currentUser={currentUser}
            authLoading={authLoading}
            onAdminLogin={(adminUser) => {
              setCurrentUser(adminUser);
              setIsAuthenticated(true);
              setTab('tenants');
            }}
            onAdminLogout={handleLogout}
            onSwitchToCompany={handleSwitchToCompany}
            onExitAdminPortal={() => {
              clearActiveSubdomain();
              const hostname = window.location.hostname || '';
              if (hostname.includes('localhost') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
                window.location.href = `${window.location.origin}${window.location.pathname}`;
              } else {
                const protocol = window.location.protocol || 'https:';
                const mainHost = hostname.replace(/^admin\./i, '');
                window.location.href = `${protocol}//${mainHost}/`;
              }
            }}
          />
        </React.Suspense>
      </AdminProvider>
    );
  }

  // ─── 0. PUBLIC CLIENT PORTAL VIEW (Bypasses Login and Landing Page!) ───
  if (portalRouteInfo) {
    if (portalLoading) {
      return (
        <div className="app-root" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0F172A" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#10B981", animation: "spin 0.8s linear infinite" }}></div>
            <div style={{ color: "#F8FAFC", fontFamily: "Cairo", fontSize: 16, fontWeight: 700 }}>
              جاري فتح بوابة العميل والمتابعة الحية للموقع... 🏛️
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      );
    }

    if (publicPortalProject) {
      return (
        <ErrorBoundary title="تعذر تحميل بوابة العميل">
          <React.Suspense fallback={<PageLoadingFallback />}>
            <ClientPortal
              project={publicPortalProject}
              companySettings={publicPortalCompanySettings || companySettings}
              userRole="client"
              currentUser={{ role: 'client', name: publicPortalProject.client || 'العميل' }}
              onBack={() => {
                setPortalRouteInfo(null);
                window.history.pushState(null, '', '/');
              }}
              onUpdateProject={async (id, patch) => {
                const previous = publicPortalProject;
                // تحديث متفائل لحالة العرض بمتصفح العميل
                setPublicPortalProject(prev => prev ? { ...prev, ...patch } : prev);
                try {
                  const token = portalRouteInfo?.token || publicPortalProject?.clientPortalToken;
                  if (!token) throw new Error('رمز البوابة غير متوفر');
                  const res = await submitClientPortalApproval(token, patch);
                  if (res && res.error) {
                    throw new Error(res.error);
                  }
                } catch (err) {
                  console.error('[ClientPortal] Error submitting portal approval:', err);
                  alert('تعذر حفظ الاعتماد والتوقيع سحابياً بسبب انقطاع الاتصال. يرجى إعادة المحاولة.');
                  setPublicPortalProject(previous);
                }
              }}
            />
          </React.Suspense>
        </ErrorBoundary>
      );
    } else {
      // مشروع غير صالح أو محذوف أو الرابط منتهي
      return (
        <div className="app-root" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0F172A", padding: 24 }}>
          <div style={{
            background: "rgba(30, 41, 59, 0.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            padding: "40px 32px",
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            fontFamily: "'Cairo', sans-serif"
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
            <h2 style={{ color: "#F8FAFC", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
              رابط المشروع غير صالح أو تم إيقافه
            </h2>
            <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
              تعذر العثور على بيانات المشروع المرتبطة بهذا الرابط. قد يكون المعرف غير صحيح أو تم إيقاف مشاركة الرابط من قِبل إدارة الشركة.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => {
                  setPortalRouteInfo(null);
                  window.history.pushState(null, '', '/');
                }}
                style={{
                  background: "#1877F2",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
              >
                العودة للصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // ─── 0.1 PUBLIC CLIENT INTAKE / LEAD CAPTURE VIEW (Bypasses Login and Landing Page!) ───
  if (intakeRouteInfo) {
    return (
      <React.Suspense fallback={<PageLoadingFallback />}>
        <ClientIntakePage
          intakeInfo={intakeRouteInfo}
          onBack={() => {
            setIntakeRouteInfo(null);
            window.history.pushState(null, '', '/');
          }}
        />
      </React.Suspense>
    );
  }

  // ─── 0.2 AUTH CHECKING LOADING STATE ───
  if (authLoading && !portalRouteInfo && !intakeRouteInfo) {
    return (
      <div className="app-root" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0F172A" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#10B981", animation: "spin 0.8s linear infinite" }}></div>
          <div style={{ color: "#94A3B8", fontFamily: "Cairo", fontSize: 14, fontWeight: 600 }}>
            جاري التحقق من الجلسة والصلاحيات... 🔐
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // إذا كان المستخدم على نطاق فرعي لشركة (مثل amlak.tashteebpro.com أو ?subdomain=amlak)
    if (isCompanySubdomain()) {
      // 1. شاشة التحميل المخصصة أثناء جلب بيانات مساحة العمل من السحابة
      if (subdomainResolving) {
        const loadingAccent = companySettings?.primaryColor || companySettings?.accentColor || '#38BDF8';
        return (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            fontFamily: 'Cairo, system-ui, -apple-system, sans-serif',
            direction: 'rtl',
            padding: '24px',
            textAlign: 'center',
            gap: '0',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              border: `3px solid rgba(255,255,255,0.08)`,
              borderTopColor: loadingAccent,
              borderRadius: '50%',
              animation: 'spin 0.75s linear infinite',
              marginBottom: '24px'
            }} />
            {subdomainCompanyName ? (
              <>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 6px 0', color: '#F1F5F9' }}>
                  {subdomainCompanyName}
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: '0 0 4px 0' }}>
                  جاري تحميل مساحة العمل...
                </p>
              </>
            ) : (
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 8px 0' }}>
                جاري تحميل مساحة العمل...
              </h3>
            )}
            <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0 }}>
              التحقق من بيانات نطاق الشركة
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        );
      }


      // 2. شاشة الخطأ عند عدم العثور على أي شركة مطابقة لهذا النطاق
      if (subdomainNotFound) {
        const triedSub = getSubdomain();
        return (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            fontFamily: 'Cairo, system-ui, -apple-system, sans-serif',
            direction: 'rtl',
            padding: '24px',
            textAlign: 'center',
            gap: '0',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              marginBottom: '24px',
              boxShadow: '0 0 40px rgba(239,68,68,0.12)',
            }}>
              🏢
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 10px 0', color: '#F1F5F9' }}>
              لا توجد شركة مرتبطة بهذا الرابط
            </h2>
            {triedSub && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '8px',
                padding: '4px 12px',
                marginBottom: '12px',
                fontSize: '0.85rem',
                color: '#FCA5A5',
                fontFamily: 'monospace',
              }}>
                🔗 {triedSub}.tashteebpro.com
              </div>
            )}
            <p style={{ fontSize: '0.9rem', color: '#94A3B8', maxWidth: '400px', lineHeight: 1.7, marginBottom: '28px' }}>
              النطاق الفرعي غير مسجل في المنصة أو قد تم تغييره. يُرجى التحقق من الرابط أو التواصل مع إدارة الشركة.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => { setSubdomainNotFound(false); setSubdomainResolving(true); window.location.reload(); }}
                style={{
                  padding: '10px 22px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#CBD5E1',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif',
                }}
              >
                🔄 إعادة المحاولة
              </button>
              <button
                onClick={handleGoToMainDomain}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  fontFamily: 'Cairo, sans-serif',
                }}
              >
                🏠 الصفحة الرئيسية
              </button>
            </div>
          </div>
        );
      }

    }

    if (!isLoginMode && !isCompanySubdomain()) {
      return (
        <AdminProvider value={adminContextValue}>
          <React.Suspense fallback={<PageLoadingFallback />}>
            <LandingPage
              onGoToLogin={(targetMode = 'login') => {
                setLoginInitialMode(targetMode);
                setIsLoginMode(true);
                window.history.replaceState(null, '', targetMode === 'register' ? '/register' : '/login');
              }}
            />
          </React.Suspense>
        </AdminProvider>
      );
    }
    return (
      <AdminProvider value={adminContextValue}>
        <React.Suspense fallback={<PageLoadingFallback />}>
          <Login
            onLogin={handleLogin}
            companySettings={companySettings}
            initialMode={loginInitialMode}
            onBackToLanding={() => {
              if (isCompanySubdomain()) {
                handleGoToMainDomain();
              } else {
                setIsLoginMode(false);
                window.history.replaceState(null, '', '/landing');
              }
            }}
          />
        </React.Suspense>
      </AdminProvider>
    );
  }

  // Active Client Portal View
  if (activeClientPortalProjectId && projects) {
    const portalProject = projects.find(p => p.id === activeClientPortalProjectId) || projects[0];
    return (
      <AdminProvider value={adminContextValue}>
        <React.Suspense fallback={<PageLoadingFallback />}>
          <ClientPortal
            project={portalProject}
            companySettings={companySettings}
            onBack={() => setActiveClientPortalProjectId(null)}
            onUpdateProject={(id, patch) => updateProject(id, patch)}
            userRole={userRole}
            currentUser={currentUser}
          />
        </React.Suspense>
      </AdminProvider>
    );
  }

  if (!projects || !team) {
    return (
      <div className="app-root" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "#1877F2", animation: "spin 1s linear infinite" }}></div>
          <div style={{ color: "var(--muted)", fontFamily: "Cairo", fontSize: 16 }}>جاري تحميل مساحة العمل...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <AdminProvider value={adminContextValue}>
      <div dir="rtl" className="app-root" style={{ display: 'flex', flexDirection: 'column' }}>



      {/* ─── Super Admin Impersonation Top Bar (Calm & Professional) ─── */}
      {(currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('admin_preview_mode') === 'true')) && tab !== 'tenants' && (
        <div
          className="impersonation-top-bar"
          style={{
            background: '#1877F2',
            color: '#FFFFFF',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            fontWeight: 600,
            borderBottom: '1px solid #166FE5',
            zIndex: 9999,
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: 8,
            boxSizing: 'border-box',
            width: '100%',
            maxWidth: '100vw',
            boxShadow: '0 2px 8px rgba(24, 119, 242, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>👑 وضع المالك:</span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.35)',
              padding: '3px 12px 3px 6px',
              borderRadius: 20
            }}>
              {companySettings?.companyLogo ? (
                <img
                  src={companySettings.companyLogo}
                  alt="شعار الشركة"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    objectFit: 'contain',
                    background: '#FFFFFF',
                    padding: 1.5,
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}
                />
              ) : (
                <img
                  src="/app-icon.png"
                  alt="Tashteeb Pro"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    objectFit: 'cover',
                    flexShrink: 0
                  }}
                />
              )}
              <span style={{ color: '#FFFFFF', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 13 }}>
                {companySettings?.companyName || 'الشركة المحددة'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem('admin_preview_mode');
                sessionStorage.removeItem('tashteeb_preview_tenant_id');
              } catch (e) {}

              const hostname = window.location.hostname || '';
              if (hostname.includes('localhost') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
                window.location.href = `${window.location.origin}${window.location.pathname}?subdomain=admin`;
              } else {
                const protocol = window.location.protocol || 'https:';
                const mainHost = hostname.replace(/^www\./i, '');
                window.location.href = `${protocol}//admin.${mainHost}/`;
              }
            }}
            style={{
              background: '#FFFFFF',
              color: '#1877F2',
              border: 'none',
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'transform 0.15s ease',
            }}
          >
            الرجوع لبوابة الإدارة 👑
          </button>
        </div>
      )}

      {/* ─── Mobile Header + Bottom Nav ─── */}
      <MobileLayout
        tab={tab}
        setTab={setTab}
        setView={setView}
        userRole={userRole}
        currentUser={currentUser}
        companySettings={companySettings}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onOpenTour={() => setShowTour(true)}
        onLogout={handleLogout}
      />

      {/* ─── Mobile Site Engineer Quick Actions FAB ─── */}
      {isAuthenticated && tab !== 'tenants' && (
        <MobileQuickActionsModal
          projects={projects}
          onUpdateProject={updateProject}
          activeCompanyId={activeCompanyId}
        />
      )}

      {/* ─── Main Layout: Sidebar + Content (flex row) ─── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100vw' }}>

      <Sidebar
        tab={tab}
        setTab={setTab}
        view={view}
        setView={setView}
        projectCount={displayedProjects.length}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        userRole={userRole}
        currentUser={currentUser}
        companySettings={companySettings}
        companySubdomain={companySubdomain}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onOpenTour={() => setShowTour(true)}
        onLogout={handleLogout}
      />

      <div className="main" style={{ paddingTop: (currentUser?.role === 'super_admin' && tab !== 'tenants') ? 50 : undefined }}>
        <div className="titleblock">
          <h1>
            {NAV.find((n) => n.key === tab)?.label}
            {tab === "projects" && view === "detail" && activeProject && <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 16 }}>/ {activeProject.name}</span>}
            {tab === "projects" && view === "form" && <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 16 }}>/ {formInitial ? "تعديل مشروع" : "مشروع جديد"}</span>}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="btn desktop-only-action"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#F8FAFC",
                color: "#334155",
                border: "1px solid #E2E8F0",
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 8
              }}
              onClick={() => setShowTour(true)}
              title="بدء الجولة التعريفية للنظام"
            >
              <Compass size={15} color="#64748B" />
              <span>جولة تعريفية</span>
            </button>

            <NotificationCenter
              projects={projects}
              leads={leads || []}
              team={team}
              companySettings={companySettings}
              onSelectProject={handleNotificationSelect}
              onNavigateToTab={handleNavigateToTab}
              isDarkMode={isDarkMode}
            />

            <button className="btn desktop-only-action" style={{ background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }} onClick={handleLogout}>خروج</button>
            {/* زر إضافة مشروع — مدير فقط أو من لديه صلاحية */}
            {tab === "projects" && view === "list" && can(currentUser || userRole, 'projects_create') && (
              <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> إضافة مشروع جديد</button>
            )}
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {saveState === "saved" && <span className="save-pill save-ok tab-fade">تم الحفظ</span>}
              {saveState === "offline" && <span className="save-pill save-err tab-fade">حفظ محلي فقط</span>}
              {mediaSyncState.isSyncing && (
                <span className="save-pill tab-fade" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#0284C7', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>☁️ رفع خلفي ({mediaSyncState.pendingCount})</span>
                </span>
              )}
              <div className="meta" style={{ display: "flex", alignItems: "center", gap: 6, background: "#F1F5F9", padding: "4px 10px", borderRadius: 6, color: "#64748B", fontSize: 11.5 }}>
                <Clock size={12} />
                <span>المواقع: {displayedProjects.length} • {todayISO()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="content tab-fade">
          <ErrorBoundary title="تعذر تحميل محتوى هذه الصفحة">
            <React.Suspense fallback={<PageLoadingFallback />}>
              {tab === "tenants" && currentUser?.role === 'super_admin' && (
                <SuperAdminDashboard onSwitchToCompany={handleSwitchToCompany} currentUser={currentUser} />
              )}

              {tab === "overview" && (
                <div>
                  <React.Suspense fallback={null}>
                    <QuickWinChecklist onNavigate={(t) => setTab(t)} />
                  </React.Suspense>
                  <Overview projects={displayedProjects} />
                </div>
              )}

              {tab === "crm" && (
                <CrmPipeline
                  leads={leads || []}
                  onAddLead={addLead}
                  onUpdateLead={updateLead}
                  onDeleteLead={deleteLead}
                  onConvertToProject={(projDraft) => {
                    setFormInitial(projDraft);
                    setTab("projects");
                    setView("form");
                  }}
                  companySettings={companySettings}
                  userRole={userRole}
                  activeCompanyId={activeCompanyId}
                />
              )}

              {tab === "finance" && can(currentUser || userRole, 'finance_view') && (
                <CompanyFinance projects={projects} activeCompanyId={activeCompanyId} />
              )}

              {tab === "team" && can(currentUser || userRole, 'team_view') && (
                <TeamPerformance
                  projects={projects}
                  team={team}
                  onAddMember={addMember}
                  onUpdateMember={updateMember}
                  onRemoveMember={removeMember}
                />
              )}

              {tab === "subcontractors" && (
                <SubcontractorsTab
                  projects={displayedProjects}
                  userRole={userRole}
                  companySettings={companySettings}
                  currentUser={currentUser}
                  activeCompanyId={activeCompanyId}
                />
              )}

              {tab === "suppliers" && (
                <SuppliersTab
                  projects={projects}
                  onUpdateProject={updateProject}
                  companySettings={companySettings}
                  userRole={userRole}
                  currentUser={currentUser}
                  activeCompanyId={activeCompanyId}
                />
              )}

              {tab === "quotations" && (
                <QuotationBuilder
                  activeCompanyId={activeCompanyId}
                  onConvertToProject={(projDraft) => {
                    setFormInitial(projDraft);
                    setTab("projects");
                    setView("form");
                  }}
                />
              )}

              {(tab === "settings" || tab === "automations") && can(currentUser || userRole, 'company_settings_view') && (
                <CompanySettings
                  companySettings={companySettings}
                  companySubdomain={companySubdomain}
                  onCompanySettingsChange={(updated) => {
                    setCompanySettings(updated);
                    applyCompanyBranding(updated);
                    if (updated?.currency) {
                      setGlobalCurrency(updated.currency);
                    }
                    if (updated?.companyName) {
                      setCurrentUser(prev => prev ? ({ ...prev, companyName: updated.companyName }) : prev);
                    }
                    const targetCompId = activeCompanyId || currentUser?.companyId;
                    saveCompanySettings(updated, targetCompId);
                    syncSettingsToCloud(targetCompId, updated).catch(e => console.warn("Cloud sync error for company settings:", e));
                  }}
                  team={team}
                  onTeamChange={(nextTeam) => {
                    persistTeam(nextTeam);
                  }}
                  currentUser={currentUser}
                  activeCompanyId={activeCompanyId}
                  projects={projects || []}
                  leads={leads || []}
                  userRole={userRole}
                  onNavigateToProject={(projId, subTab) => openDetail(projId, subTab)}
                  onNavigateToTab={handleNavigateToTab}
                  activeSubTab={tab === 'automations' ? 'automations' : settingsSubTab}
                  onSubTabChange={(sub) => {
                    setSettingsSubTab(sub);
                    if (tab !== 'settings') setTab('settings');
                  }}
                />
              )}

              {tab === "projects" && view === "list" && (
                <ProjectsTab projects={displayedProjects} onOpenDetail={openDetail} onOpenEdit={openEdit} onDelete={deleteProject} userRole={userRole} />
              )}
              {tab === "projects" && view === "detail" && (
                activeProject ? (
                  <ProjectDetail
                    project={activeProject}
                    team={team}
                    userRole={userRole}
                    onBack={backToList}
                    onEdit={() => openEdit(activeProject)}
                    onDelete={() => deleteProject(activeProject.id)}
                    onUpdate={(idOrPatch, maybePatch) => {
                      if (maybePatch) {
                        updateProject(idOrPatch, maybePatch);
                      } else {
                        updateProject(activeProject.id, idOrPatch);
                      }
                    }}
                    initialSub={initialProjectSub}
                    currentUser={currentUser}
                    activeCompanyId={activeCompanyId}
                    onOpenClientPortal={(token) => token && window.open('/portal/' + token, '_blank')}
                  />
                ) : (
                  <div className="panel" style={{ textAlign: "center", padding: 40 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>لم يتم العثور على الموقع المطلوب</div>
                    <button className="btn btn-primary" onClick={backToList}>العودة إلى قائمة المواقع</button>
                  </div>
                )
              )}
              {tab === "projects" && view === "form" && (
                <ProjectForm initial={formInitial} team={team} areas={allAreas} onSave={saveProject} onCancel={() => setView(formInitial ? "detail" : "list")} />
              )}
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </div>

      </div>{/* ─── End flex-row (Sidebar + Main) ─── */}

      {/* ─── Onboarding Tour Modal ─── */}
      <React.Suspense fallback={null}>
        {showTour && (
          <OnboardingTourModal
            isOpen={showTour}
            onClose={() => setShowTour(false)}
            onNavigateToTab={handleNavigateToTab}
          />
        )}
      </React.Suspense>

      {/* ─── Floating WhatsApp Support & Sales Widget ─── */}
      <WhatsAppSupportWidget companySettings={companySettings} />

      {/* ─── Floating Non-blocking Media Sync Pill ─── */}
      {mediaSyncState.isSyncing && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          color: '#38BDF8',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 30,
          padding: '8px 18px',
          fontSize: 13,
          fontWeight: 700,
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 9999,
          direction: 'rtl',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: 16 }}>☁️</span>
          <span>جاري رفع {mediaSyncState.pendingCount} صورة معلقة إلى السحابة...</span>
        </div>
      )}
    </div>
    </AdminProvider>
  );
}
