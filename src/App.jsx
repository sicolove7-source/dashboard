import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Building2, Users, Wallet, ClipboardList, Search,
  AlertTriangle, CheckCircle2, Clock, X, TrendingUp, FileText, Hammer,
  Plus, Pencil, Trash2, ArrowRight, Save, ListChecks, CalendarDays, Boxes,
  UserPlus, CalendarRange, Info, Sun, Moon, Compass
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
const OnboardingTourModal = React.lazy(() => import('./components/OnboardingTourModal'));
const QuickWinChecklist = React.lazy(() => import('./components/QuickWinChecklist'));
import ErrorBoundary from './components/ErrorBoundary';
import { isFirstLogin, markFirstLoginDone, seedDemoData } from './utils/seedDemoData';

import { loadCompanySettings, applyCompanyBranding } from './utils/branding';
try { if (typeof localStorage !== 'undefined') localStorage.removeItem('company-settings-v1'); } catch (e) {}
import { getActiveTenantId, setActiveTenantId, getTenantData, getTenantDataAsync, isSubAccountsLoginAllowed, fetchPlatformSettingsFromCloud, resolveTenantUserByEmail, syncAllLocalUsersToCloud } from './services/tenantsManager';
import { onAuthChange, logoutUser } from './services/auth';
import { db } from './firebase';
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
  syncWorkersToCloud,
  syncSuppliersToCloud,
  syncQuotationsToCloud,
  fetchCompanyDataFromCloud,
} from './services/cloudSync';
import { parseClientPortalFromUrl, resolveClientPortalProject, submitClientPortalApproval } from './services/portalResolver';
import { parseIntakeRouteFromUrl } from './services/intakeResolver';

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
import { NAV, ENGINEERS, ACCOUNTANTS, TECH_OFFICE, TYPES, AREAS, SUBMITTAL_ITEMS, SUB_STATUS, DIARY_WORK_SAMPLES, DIARY_ISSUE_SAMPLES, LABOR_TRADES, MATERIALS_LIST, MATERIAL_STATUS, EQUIPMENT_LIST, STAGES, SEED_LEADS } from './utils/constants';
import { mulberry32, todayISO, setGlobalCurrency } from './utils/helpers';
import { DEFAULT_TAB, can, NAV_PERMISSIONS } from './utils/permissions';

// Styles
import './styles/index.css';

/* ---------------------------------------------------------------
   توليد بيانات أولية
--------------------------------------------------------------- */
function generateSeedProjects() {
  const rand = mulberry32(1379);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  return Array.from({ length: 20 }, (_, i) => {
    const id = "p" + (i + 1);
    const type = pick(TYPES);
    const area = pick(AREAS);
    const statusRoll = rand();
    const status = statusRoll < 0.55 ? "on_track" : statusRoll < 0.8 ? "at_risk" : "delayed";
    let progress;
    if (status === "on_track") progress = 35 + rand() * 55;
    else if (status === "at_risk") progress = 20 + rand() * 45;
    else progress = 10 + rand() * 35;
    progress = Math.round(progress);

    const budget = Math.round((150000 + rand() * 1050000) / 5000) * 5000;
    const spendFactor = status === "delayed" ? 1.08 : status === "at_risk" ? 1.0 : 0.93;
    const spent = Math.min(budget, Math.round(((progress / 100) * budget * spendFactor) / 1000) * 1000);

    const start = new Date();
    start.setDate(start.getDate() - Math.round(20 + rand() * 60));
    const dueInDays = status === "delayed" ? -Math.round(rand() * 20 + 1) : Math.round(rand() * 60 + 5);
    const due = new Date();
    due.setDate(due.getDate() + dueInDays);

    const submittals = Array.from({ length: 3 }, () => ({
      item: pick(SUBMITTAL_ITEMS),
      status: pick(SUB_STATUS),
    }));

    const base = {
      id,
      name: `تشطيب ${type} - ${area}`,
      client: "أ. عميل " + (i + 1), // Using simple names for seed
      area, type,
      engineer: ENGINEERS[i % ENGINEERS.length],
      accountant: ACCOUNTANTS[i % ACCOUNTANTS.length],
      techOffice: TECH_OFFICE[i % TECH_OFFICE.length],
      progress, status, budget, spent,
      startDate: start.toISOString().slice(0, 10),
      dueDate: due.toISOString().slice(0, 10),
      submittals,
      files: [],
      snags: [],
    };
    return {
      ...base,
      tasks: genTasks(base, rand, pick),
      dailyLogs: genDailyLogs(base, rand, pick),
      resources: genResources(rand, pick),
    };
  });
}

function genTasks(project, rand, pick) {
  const start = new Date(project.startDate);
  const due = new Date(project.dueDate);
  const totalDays = Math.max(1, Math.round((due - start) / 86400000));
  let cum = 0;
  return STAGES.map((s) => {
    const stageStart = new Date(start); stageStart.setDate(stageStart.getDate() + Math.round((cum / 100) * totalDays));
    cum += s.weight;
    const stageEnd = new Date(start); stageEnd.setDate(stageEnd.getDate() + Math.round((cum / 100) * totalDays));
    const status = project.progress >= cum ? "done" : project.progress > cum - s.weight ? "in_progress" : "pending";
    return {
      id: "t" + s.key,
      stage: s.key,
      title: "تنفيذ " + s.label,
      start: stageStart.toISOString().slice(0, 10),
      end: stageEnd.toISOString().slice(0, 10),
      assignee: project.engineer,
      status,
    };
  });
}

function genDailyLogs(project, rand, pick) {
  const start = new Date(project.startDate);
  const count = 2 + Math.floor(rand() * 3);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + Math.floor(rand() * 25) + i * 4);
    return {
      id: "d" + project.id + "-" + i,
      date: d.toISOString().slice(0, 10),
      author: rand() > 0.5 ? project.engineer : project.techOffice,
      work: pick(DIARY_WORK_SAMPLES),
      issues: pick(DIARY_ISSUE_SAMPLES),
      workers: 3 + Math.floor(rand() * 9),
    };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function genResources(rand, pick) {
  const labor = Array.from(new Set(Array.from({ length: 3 }, () => pick(LABOR_TRADES))))
    .map((trade, i) => ({ id: "l" + i, trade, count: 2 + Math.floor(rand() * 6) }));
  const materials = Array.from(new Set(Array.from({ length: 3 }, () => pick(MATERIALS_LIST))))
    .map((name, i) => ({ id: "m" + i, name, qty: (10 + Math.floor(rand() * 90)), unit: "وحدة", status: pick(MATERIAL_STATUS) }));
  const equipment = Array.from(new Set(Array.from({ length: 2 }, () => pick(EQUIPMENT_LIST))))
    .map((name, i) => ({ id: "e" + i, name, qty: 1 + Math.floor(rand() * 3) }));
  return { labor, materials, equipment };
}


/* ---------------------------------------------------------------
   التطبيق الرئيسي
--------------------------------------------------------------- */
const STORAGE_KEY = "finishing-projects-v2";
const TEAM_KEY = "finishing-team-v2";
const THEME_KEY = "finishing-theme-v2";
const LEADS_KEY = "crm-leads-v1";

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
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (a === b) continue;
    if (!a || !b) return true;
    if (a.id !== b.id || a.updatedAt !== b.updatedAt) return true;
  }
  return false;
}

function getInitialCompanyId() {
  try {
    const session = localStorage.getItem('active_session_user');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed?.companyId) return parsed.companyId;
    }
  } catch (e) {}
  return getActiveTenantId() || 'comp_c_mtyw7mqk';
}

export default function App() {
  useEffect(() => {
    // مزامنة سحابية وتأكيد سلامة بيانات شركة أملاك ومشاريعها الحقيقية
    import('firebase/firestore').then(async ({ collection, getDocs, doc, getDoc, setDoc, deleteDoc }) => {
      try {
        const alainProjDoc = await getDoc(doc(db, 'companies', 'comp_alain', 'projects', 'p_cairo_2'));
        if (alainProjDoc.exists()) {
          const cairoData = alainProjDoc.data();
          // نقل مشروع القاهرة إلى شركة أملاك في السحابة
          await setDoc(doc(db, 'companies', 'comp_c_mtyw7mqk', 'projects', 'p_cairo_2'), {
            ...cairoData,
            companyId: 'comp_c_mtyw7mqk'
          }, { merge: true });
          // حذفه من شركة العين الإماراتية
          await deleteDoc(doc(db, 'companies', 'comp_alain', 'projects', 'p_cairo_2'));
        }

        // تحديث وتثبيت وثيقة شركة أملاك السحابية
        await setDoc(doc(db, 'companies', 'comp_c_mtyw7mqk'), {
          companyId: 'comp_c_mtyw7mqk',
          name: 'شركة أملاك للمقاولات والتشطيبات',
          adminEmail: 'sicolove7@gmail.com',
          adminName: 'احمد',
          settings: {
            companyName: 'شركة أملاك للمقاولات والتشطيبات',
            companySubtitle: 'متخصصون في تشطيب الشقق والقصور والفلل الفاخرة',
            city: 'القاهرة',
            country: 'مصر',
            currency: 'ج.م',
            phone: '+20 100 123 4567',
            adminEmail: 'sicolove7@gmail.com',
            adminName: 'احمد',
          },
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // إعادة وثيقة شركة العين لهويتها الإماراتية في السحابة
        await setDoc(doc(db, 'companies', 'comp_alain'), {
          companyId: 'comp_alain',
          name: 'شركة العين للمقاولات العامة',
          adminEmail: 'ceo@alain-contract.ae',
          adminName: 'م. سعيد الكعبي',
          settings: {
            companyName: 'شركة العين للمقاولات العامة',
            companySubtitle: 'متخصصون في أعمال البناء والتشطيبات الفاخرة',
            city: 'العين',
            country: 'الإمارات',
            currency: 'د.إ',
            phone: '+971 3 765 4321',
            adminEmail: 'ceo@alain-contract.ae',
            adminName: 'م. سعيد الكعبي',
          },
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn("Cloud reconciliation non-blocking error:", e);
      }
    }).catch(() => {});
  }, []);
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
  const [workers, setWorkers] = useState(() => {
    try {
      const cId = getInitialCompanyId();
      return JSON.parse(localStorage.getItem(`tenant_${cId}_workers`) || '[]');
    } catch (e) {
      return [];
    }
  });
  const [suppliers, setSuppliers] = useState(() => {
    try {
      const cId = getInitialCompanyId();
      return JSON.parse(localStorage.getItem(`tenant_${cId}_suppliers`) || '[]');
    } catch (e) {
      return [];
    }
  });
  const [quotations, setQuotations] = useState(() => {
    try {
      const cId = getInitialCompanyId();
      return JSON.parse(localStorage.getItem(`tenant_${cId}_quotations`) || '[]');
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
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return !!localStorage.getItem('active_session_user');
    } catch (e) {
      return false;
    }
  });
  const [authLoading, setAuthLoading] = useState(() => {
    try {
      return !localStorage.getItem('active_session_user');
    } catch (e) {
      return true;
    }
  });
  const userRole = currentUser?.role || 'engineer';

  // Landing Page vs Login state
  const [isLoginMode, setIsLoginMode] = useState(() => {
    const p = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    return p === 'login' || p === 'register' || p === 'signup' || p === 'contractors' || p === 'projects' || p === 'finance';
  });
  const [loginInitialMode, setLoginInitialMode] = useState(() => {
    const p = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    return p === 'register' || p === 'signup' ? 'register' : 'login';
  });
  const isDemoUser = false;

  // Company Tenant Scoped ID:
  // في وضع Demo: نستخدم تينانت معزول comp_demo أوفلاين بالكامل
  // للمستخدم العادي: نعتمد حصرياً على companyId من الـ Claims السحابية
  // للسوبر أدمن فقط: نسمح بالتبديل بين الشركات عبر getActiveTenantId()
  const activeCompanyId = useMemo(() => {
    if (isDemoUser) return 'comp_demo';
    if (currentUser?.isSuperAdmin || currentUser?.role === 'super_admin') {
      return getActiveTenantId() || 'comp_alain';
    }
    return currentUser?.companyId || 'comp_alain';
  }, [currentUser, isDemoUser]);

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

  // أول دخول: بذار بيانات تجريبية وفتح الجولة الاستكشافية بالتينانت الفعلي فقط بعد نجاح تسجيل الدخول
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId || isDemoUser || activeCompanyId === 'comp_demo') return;
    if (isFirstLogin(activeCompanyId)) {
      const seeded = seedDemoData(`tenant_${activeCompanyId}_projects`, `tenant_${activeCompanyId}_team`, activeCompanyId);
      markFirstLoginDone(activeCompanyId);
      if (seeded) {
        const localData = getTenantData(activeCompanyId);
        if (localData?.projects?.length) {
          setProjects(localData.projects);
        }
        if (localData?.team) {
          setTeam(localData.team);
        }
      }
      const timer = setTimeout(() => setShowTour(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [activeCompanyId, isAuthenticated, isDemoUser]);

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

  // التحميل الفوري لبوابة العميل العامة عند فتح رابط /portal/:id
  useEffect(() => {
    if (!portalRouteInfo) {
      setPortalLoading(false);
      return;
    }
    let isCancelled = false;

    async function loadPortal() {
      setPortalLoading(true);
      try {
        const resolved = await resolveClientPortalProject(
          portalRouteInfo.token || portalRouteInfo.projectId
        );
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
    return () => { isCancelled = true; };
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
    const scopedLocalProjects = (localData.projects || []).map(p => ({
      ...p,
      companyId: companyId
    }));
    setProjects(scopedLocalProjects);
    setTeam(localData.team || { engineers: [], accountants: [], techOffice: [] });
    setLeads(localData.leads || []);
    setCompanySettings(localData.settings);
    applyCompanyBranding(localData.settings);
    if (localData.settings?.currency) {
      setGlobalCurrency(localData.settings.currency);
    }

    // إذا كان في وضع Demo أوفلاين، لا نجلب أي بيانات من السحابة إطلاقاً
    if (isDemoUser || companyId === 'comp_demo') return;

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

        // قراءة ودمج العمالة والموردين وعروض الأسعار سحابياً بنفس طريقة team
        try {
          const cloudCompanyRaw = await fetchCompanyDataFromCloud(companyId);
          const cloudWorkers = cloudData.workers || cloudCompanyRaw?.workers;
          const cloudSuppliers = cloudData.suppliers || cloudCompanyRaw?.suppliers;
          const cloudQuotations = cloudData.quotations || cloudCompanyRaw?.quotations;

          if (Array.isArray(cloudWorkers)) {
            setWorkers(prev => {
              const localRaw = localStorage.getItem(`tenant_${companyId}_workers`);
              const local = (prev && prev.length > 0) ? prev : (localRaw ? JSON.parse(localRaw) : []);
              const map = new Map();
              cloudWorkers.forEach(item => { if (item?.id) map.set(item.id, item); });
              local.forEach(item => { if (item?.id) map.set(item.id, item); });
              const merged = Array.from(map.values());
              try { localStorage.setItem(`tenant_${companyId}_workers`, JSON.stringify(merged)); } catch (e) {}
              return merged;
            });
          }
          if (Array.isArray(cloudSuppliers)) {
            setSuppliers(prev => {
              const localRaw = localStorage.getItem(`tenant_${companyId}_suppliers`);
              const local = (prev && prev.length > 0) ? prev : (localRaw ? JSON.parse(localRaw) : []);
              const map = new Map();
              cloudSuppliers.forEach(item => { if (item?.id) map.set(item.id, item); });
              local.forEach(item => { if (item?.id) map.set(item.id, item); });
              const merged = Array.from(map.values());
              try { localStorage.setItem(`tenant_${companyId}_suppliers`, JSON.stringify(merged)); } catch (e) {}
              return merged;
            });
          }
          if (Array.isArray(cloudQuotations)) {
            setQuotations(prev => {
              const localRaw = localStorage.getItem(`tenant_${companyId}_quotations`);
              const local = (prev && prev.length > 0) ? prev : (localRaw ? JSON.parse(localRaw) : []);
              const map = new Map();
              cloudQuotations.forEach(item => { if (item?.id) map.set(item.id, item); });
              local.forEach(item => { if (item?.id) map.set(item.id, item); });
              const merged = Array.from(map.values());
              try { localStorage.setItem(`tenant_${companyId}_quotations`, JSON.stringify(merged)); } catch (e) {}
              return merged;
            });
          }
        } catch (e) {
          console.warn("Could not merge cloud workers/suppliers/quotations:", e);
        }

        if (cloudData.settings) {
          const mergedSettings = {
            ...localData.settings,
            ...cloudData.settings,
            companyLogo: cloudData.settings.companyLogo !== undefined ? cloudData.settings.companyLogo : (localData.settings?.companyLogo || null),
          };
          setCompanySettings(mergedSettings);
          applyCompanyBranding(mergedSettings);
          if (mergedSettings.currency) setGlobalCurrency(mergedSettings.currency);
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

  // استماع ومزامنة سحابية حية لمشاريع الشركة عبر Firebase (بدون إتلاف اليوميات المسجلة محلياً)
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId || isDemoUser || activeCompanyId === 'comp_demo') return;
    const unsub = subscribeToCloudProjects(activeCompanyId, (cloudProjects) => {
      if (Array.isArray(cloudProjects) && cloudProjects.length > 0) {
        setProjects((prev) => {
          const merged = mergeProjectsPreservingLocal(prev, cloudProjects, activeCompanyId);
          try {
            const lean = merged.map(p => sanitizeProjectForCloud(p));
            localStorage.setItem(`tenant_${activeCompanyId}_projects`, JSON.stringify(lean));
          } catch (e) {}
          return merged;
        });
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeCompanyId, isAuthenticated, isDemoUser]);

  // استماع ومزامنة سحابية حية لعملاء الـ CRM والطلبات الواردة لحظياً
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId || isDemoUser || activeCompanyId === 'comp_demo') return;
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
  }, [activeCompanyId, isAuthenticated, isDemoUser]);

  // استماع ومزامنة سحابية حية للعمالة لحظياً
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId || isDemoUser || activeCompanyId === 'comp_demo') return;
    const unsub = subscribeToCloudCompanyField(activeCompanyId, 'workers', (cloudWorkers) => {
      if (Array.isArray(cloudWorkers)) {
        setWorkers((prev) => {
          if (hasCollectionChanged(prev, cloudWorkers)) {
            try {
              localStorage.setItem(`tenant_${activeCompanyId}_workers`, JSON.stringify(cloudWorkers));
            } catch (e) {}
            return cloudWorkers;
          }
          return prev;
        });
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeCompanyId, isAuthenticated, isDemoUser]);

  // استماع ومزامنة سحابية حية للموردين لحظياً
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId || isDemoUser || activeCompanyId === 'comp_demo') return;
    const unsub = subscribeToCloudCompanyField(activeCompanyId, 'suppliers', (cloudSuppliers) => {
      if (Array.isArray(cloudSuppliers)) {
        setSuppliers((prev) => {
          if (hasCollectionChanged(prev, cloudSuppliers)) {
            try {
              localStorage.setItem(`tenant_${activeCompanyId}_suppliers`, JSON.stringify(cloudSuppliers));
            } catch (e) {}
            return cloudSuppliers;
          }
          return prev;
        });
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeCompanyId, isAuthenticated, isDemoUser]);

  // استماع ومزامنة سحابية حية لعروض الأسعار لحظياً
  useEffect(() => {
    if (!isAuthenticated || !activeCompanyId || isDemoUser || activeCompanyId === 'comp_demo') return;
    const unsub = subscribeToCloudCompanyField(activeCompanyId, 'quotations', (cloudQuotations) => {
      if (Array.isArray(cloudQuotations)) {
        setQuotations((prev) => {
          if (hasCollectionChanged(prev, cloudQuotations)) {
            try {
              localStorage.setItem(`tenant_${activeCompanyId}_quotations`, JSON.stringify(cloudQuotations));
            } catch (e) {}
            return cloudQuotations;
          }
          return prev;
        });
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeCompanyId, isAuthenticated, isDemoUser]);

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
    if (!isDemoUser && activeCompanyId !== 'comp_demo') {
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
    if (!isDemoUser && activeCompanyId !== 'comp_demo') {
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
    if (!isDemoUser && activeCompanyId !== 'comp_demo') {
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
    if (data.id) {
      updateProject(data.id, { ...data, companyId: data.companyId || activeCompanyId });
      setActiveId(data.id);
      setView("detail");
    } else {
      const id = "p" + Date.now();
      const newProject = {
        ...data,
        id,
        companyId: activeCompanyId,
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
        try {
          const lean = updated.map(p => sanitizeProjectForCloud(p));
          localStorage.setItem(`tenant_${activeCompanyId}_projects`, JSON.stringify(lean));
          flashSave(true);
        } catch (e) {
          flashSave(false);
        }
        if (!isDemoUser && activeCompanyId !== 'comp_demo') {
          syncSingleProjectToCloud(activeCompanyId, id, newProject).catch(err => {
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
    setProjects(prev => {
      const updated = (prev || []).filter((p) => p.id !== id);
      try {
        localStorage.setItem(`tenant_${activeCompanyId}_projects`, JSON.stringify(updated));
        flashSave(true); 
      } catch (e) {
        flashSave(false);
      }
      if (!isDemoUser && activeCompanyId !== 'comp_demo') {
        deleteSingleProjectFromCloud(activeCompanyId, id).catch(err => {
          console.warn("Cloud delete project error:", err);
          flashSave(false);
        });
      }
      return updated;
    });
    backToList();
  }

  function updateProject(id, patch) {
    const now = new Date().toISOString();
    setProjects(prev => {
      const list = prev || [];
      const updated = list.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: patch?.updatedAt || now } : p));
      try {
        const lean = updated.map(p => sanitizeProjectForCloud(p));
        localStorage.setItem(`tenant_${activeCompanyId}_projects`, JSON.stringify(lean));
        flashSave(true);
      } catch (e) {
        console.error("localStorage save error", e);
        flashSave(false);
      }
      if (!isDemoUser && activeCompanyId !== 'comp_demo') {
        const fullProject = updated.find(p => p.id === id);
        syncSingleProjectToCloud(activeCompanyId, id, fullProject || { ...patch, updatedAt: now }).catch(err => {
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
            const idTokenResult = await firebaseUser.getIdTokenResult();
            claims = idTokenResult?.claims || {};
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
          const role = claimRole || resolvedUser.role || (isSuperAdminClaim ? 'super_admin' : 'engineer');
          const companyId = claims.companyId || resolvedUser.companyId || (isSuperAdminClaim ? (getActiveTenantId() || 'comp_alain') : null);
          const isSuperAdmin = role === 'super_admin' || isSuperAdminClaim || !!resolvedUser.isSuperAdmin;

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
            setTab('tenants');
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
        if (!isDemoUser) {
          try { localStorage.removeItem('active_session_user'); } catch (e) {}
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
        setAuthLoading(false);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isDemoUser]);

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
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
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
    
    setCurrentUser(userData);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('active_session_user', JSON.stringify(userData));
    } catch (e) {}
    setTab(defaultTab);
    setView('list');
    setActiveId(null);

    const compId = tenantData?.id || userData?.companyId || getActiveTenantId() || 'comp_alain';
    setActiveTenantId(compId);

    // 🔒 مسح أمني: إزالة مسودات المشاريع غير المحفوظة للشركات الأخرى مع الحفاظ التام على أدلة المستخدمين
    if (compId && !roleIsSuperAdmin) {
      try {
        const keysToRemove = Object.keys(localStorage).filter(k => {
          if (!k.startsWith('tenant_')) return false;
          // الحفاظ الحاسم على سجلات المستخدمين والفريق لتمكين التبديل وتسجيل الدخول السلس
          if (k.endsWith('_users') || k.endsWith('_team')) return false;
          // استخراج الـ company ID من المفتاح: tenant_{companyId}_{field}
          const parts = k.split('_');
          if (parts.length < 3) return false;
          const keyCompanyId = parts.slice(1, -1).join('_');
          return keyCompanyId !== compId;
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
    // مسح جلسة المستخدم الحالية فقط دون تدمير بيانات الشركات والمستخدمين المحلية
    try {
      localStorage.removeItem('active_session_user');
      localStorage.removeItem('active_tenant_id');
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch (e) {}
    setCurrentUser(null);
    setIsAuthenticated(false);
    setTab('overview');
    setView('list');
    setActiveId(null);
  };

  const handleSwitchToCompany = (companyId) => {
    setActiveTenantId(companyId);
    setCurrentUser(prev => prev ? { ...prev, companyId } : { role: 'owner', companyId });
    // تم حذف استدعاء loadTenantWorkspace المزدوج هنا؛ لأن تغيير activeCompanyId يُشغّل الـ Effect تلقائياً
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
                  const token = portalRouteInfo?.token || publicPortalProject?.clientPortalToken || id;
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
    if (!isLoginMode) {
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
              setIsLoginMode(false);
              window.history.replaceState(null, '', '/landing');
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
      {currentUser?.role === 'super_admin' && tab !== 'tenants' && !isDemoUser && (
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
            onClick={() => setTab('tenants')}
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
            إدارة الشركات 👑
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
              <div className="meta" style={{ display: "flex", alignItems: "center", gap: 6, background: "#F1F5F9", padding: "4px 10px", borderRadius: 6, color: "#64748B", fontSize: 11.5 }}>
                <Clock size={12} />
                <span>المواقع: {projects.length} • {todayISO()}</span>
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
                  onCompanySettingsChange={(updated) => {
                    setCompanySettings(updated);
                    applyCompanyBranding(updated);
                    if (updated?.currency) {
                      setGlobalCurrency(updated.currency);
                    }
                    syncSettingsToCloud(activeCompanyId, updated).catch(e => console.warn("Cloud sync error for company settings:", e));
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
                    onOpenClientPortal={(tokenOrId) => window.open('/portal/' + tokenOrId, '_blank')}
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
    </div>
    </AdminProvider>
  );
}
