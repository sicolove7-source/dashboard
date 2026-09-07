import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Building2, Users, Wallet, ClipboardList, Search,
  AlertTriangle, CheckCircle2, Clock, X, TrendingUp, FileText, Hammer,
  Plus, Pencil, Trash2, ArrowRight, Save, ListChecks, CalendarDays, Boxes,
  UserPlus, CalendarRange, Info, Sun, Moon, Compass
} from "lucide-react";

// Components
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import ProjectsTab from './pages/ProjectsTab';
import ProjectDetail from './pages/ProjectDetail';
import ProjectForm from './pages/ProjectForm';
import TeamPerformance from './pages/TeamPerformance';
import SpecsAssistant from './pages/SpecsAssistant';
import SuppliersTab from './pages/SuppliersTab';
import SubcontractorsTab from './pages/SubcontractorsTab';
import QuotationBuilder from './pages/QuotationBuilder';
import CompanyFinance from './pages/CompanyFinance';
import NotificationCenter from './components/NotificationCenter';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import EngineerView from './pages/EngineerView';
import CompanySettings, { loadCompanySettings, applyCompanyBranding, COMPANY_SETTINGS_KEY } from './pages/CompanySettings';
import MobileLayout from './components/MobileLayout';
import CrmPipeline from './pages/CrmPipeline';
import ClientPortal from './pages/ClientPortal';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import OnboardingTourModal from './components/OnboardingTourModal';
import WhatsAppSupportWidget from './components/WhatsAppSupportWidget';
import { getActiveTenantId, setActiveTenantId, getTenantData, loadAllTenants, isSubAccountsLoginAllowed } from './services/tenantsManager';
import { syncProjectsToCloud, syncTeamToCloud, syncLeadsToCloud, subscribeToCloudProjects } from './services/cloudSync';

// Utils
import { NAV, ENGINEERS, ACCOUNTANTS, TECH_OFFICE, TYPES, AREAS, SUBMITTAL_ITEMS, SUB_STATUS, DIARY_WORK_SAMPLES, DIARY_ISSUE_SAMPLES, LABOR_TRADES, MATERIALS_LIST, MATERIAL_STATUS, EQUIPMENT_LIST, STAGES, SEED_LEADS } from './utils/constants';
import { mulberry32, todayISO, setGlobalCurrency } from './utils/helpers';
import { DEFAULT_TAB, can } from './utils/permissions';

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
    if (path === 'specs') return 'specs';
    if (path === 'automations') return 'automations';
    if (path === 'settings') return 'settings';
    if (path === 'tenants' || path === 'superadmin') return 'tenants';
  } catch (e) {}
  return null;
}

export default function App() {
  const [projects, setProjects] = useState(null); // null = loading
  const [team, setTeam] = useState(null); // {engineers, accountants, techOffice, customerService}
  const [leads, setLeads] = useState(null); // crm leads
  const [companySettings, setCompanySettings] = useState(() => loadCompanySettings());
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
  const [formInitial, setFormInitial] = useState(null); // null=new, object=edit
  const [initialProjectSub, setInitialProjectSub] = useState(null);
  const [saveState, setSaveState] = useState(null); // null | 'saved' | 'offline'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // { role, name, engineerName, email }
  const userRole = currentUser?.role || 'engineer';

  // Landing Page vs Login state
  const [isLoginMode, setIsLoginMode] = useState(() => {
    const p = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    return p === 'login' || p === 'contractors' || p === 'projects' || p === 'finance';
  });
  const [isDemoUser, setIsDemoUser] = useState(false);

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

  // Theme State (Default to Clean Calm Light Mode for daily work)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply company branding and currency on startup
  useEffect(() => {
    applyCompanyBranding(companySettings);
    if (companySettings?.currency) {
      setGlobalCurrency(companySettings.currency);
    }
  }, [companySettings]);

  // Listen for company settings changes from CompanySettings page
  useEffect(() => {
    function onStorageChange(e) {
      if (e.key === COMPANY_SETTINGS_KEY) {
        const updated = loadCompanySettings();
        setCompanySettings(updated);
        applyCompanyBranding(updated);
        if (updated?.currency) {
          setGlobalCurrency(updated.currency);
        }
      }
    }
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, []);

  // Update theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);


  // Company Tenant Scoped ID
  const activeCompanyId = currentUser?.companyId || getActiveTenantId() || 'comp_alain';

  // Load and sync tenant data whenever active company changes
  const loadTenantWorkspace = (companyId) => {
    const data = getTenantData(companyId);
    setProjects(data.projects);
    setTeam(data.team);
    setLeads(data.leads);
    setCompanySettings(data.settings);
    applyCompanyBranding(data.settings);
    if (data.settings?.currency) {
      setGlobalCurrency(data.settings.currency);
    }
    if (data.projects && data.projects.length > 0) {
      syncProjectsToCloud(companyId, data.projects);
    }
  };

  useEffect(() => {
    loadTenantWorkspace(activeCompanyId);
  }, [activeCompanyId]);

  // استماع ومزامنة سحابية حية لمشاريع الشركة عبر Firebase
  useEffect(() => {
    if (!activeCompanyId) return;
    const unsub = subscribeToCloudProjects(activeCompanyId, (cloudProjects) => {
      if (Array.isArray(cloudProjects) && cloudProjects.length > 0) {
        setProjects(cloudProjects);
        try {
          localStorage.setItem(`tenant_${activeCompanyId}_projects`, JSON.stringify(cloudProjects));
        } catch (e) {}
      }
    });
    return () => unsub();
  }, [activeCompanyId]);

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
    syncProjectsToCloud(activeCompanyId, next);
  }

  async function persistTeam(next) {
    setTeam(next);
    try { 
      localStorage.setItem(`tenant_${activeCompanyId}_team`, JSON.stringify(next));
      flashSave(true); 
    }
    catch (e) { console.error("storage error", e); flashSave(false); }
    syncTeamToCloud(activeCompanyId, next);
  }

  async function persistLeads(next) {
    setLeads(next);
    try { 
      localStorage.setItem(`tenant_${activeCompanyId}_leads`, JSON.stringify(next));
      flashSave(true); 
    }
    catch (e) { console.error("storage error", e); flashSave(false); }
    syncLeadsToCloud(activeCompanyId, next);
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
    const trimmedNew = newName.trim();
    const list = team[role] || [];
    if (oldName !== trimmedNew && list.includes(trimmedNew)) return false;

    const nextTeam = {
      ...team,
      [role]: list.map(n => n === oldName ? trimmedNew : n)
    };
    persistTeam(nextTeam);

    if (oldName !== trimmedNew && projects) {
      const pKey = role === 'engineers' ? 'engineer' : role === 'accountants' ? 'accountant' : 'techOffice';
      const updatedProjects = projects.map(p => p[pKey] === oldName ? { ...p, [pKey]: trimmedNew } : p);
      persist(updatedProjects);
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
      persist(projects.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
      setActiveId(data.id);
      setView("detail");
    } else {
      const id = "p" + Date.now();
      const newProject = { ...data, id, submittals: [], tasks: [], dailyLogs: [], resources: { labor: [], subcontractors: [], materials: [], equipment: [] }, files: [], snags: [], clientPayments: [], expenses: [], paymentMilestones: [] };
      persist([newProject, ...projects]);
      setActiveId(id);
      setView("detail");
    }
  }

  function deleteProject(id) {
    persist(projects.filter((p) => p.id !== id));
    backToList();
  }

  function updateProject(id, patch) {
    persist(projects.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  const activeProject = projects && activeId ? projects.find((p) => p.id === activeId) : null;

  // Handle Login State on Initial Load
  useEffect(() => {
    const saved = localStorage.getItem('isAdmin');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // إذا كان الحساب فرعياً (ليس سوبر أدمن) ودخول الحسابات الفرعية مقفل -> إنهاء الجلسة فوراً
        if (parsed.role !== 'super_admin' && !parsed.isSuperAdmin && !isSubAccountsLoginAllowed()) {
          localStorage.removeItem('isAdmin');
          setCurrentUser(null);
          setIsAuthenticated(false);
          return;
        }

        setCurrentUser(parsed);
        setIsAuthenticated(true);
        const compId = parsed.companyId || getActiveTenantId() || 'comp_alain';
        loadTenantWorkspace(compId);

        const requestedTab = getTabFromPath();
        if (requestedTab) {
          setTab(requestedTab);
        } else if (parsed.role === 'super_admin') {
          setTab('tenants');
        } else {
          const allowedTabs = NAV_PERMISSIONS[parsed.role] || ['overview'];
          const initialTab = DEFAULT_TAB[parsed.role] || 'overview';
          setTab(prev => (allowedTabs.includes(prev) && prev !== 'tenants' ? prev : initialTab));
        }
      } catch (e) {
        localStorage.removeItem('isAdmin');
      }
    }
  }, []);

  // Listen for browser forward/back buttons
  useEffect(() => {
    function handlePopState() {
      const target = getTabFromPath();
      if (target) setTab(target);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync browser URL with active tab
  useEffect(() => {
    if (!isAuthenticated) return;
    const pathMap = {
      subcontractors: '/contractors',
      projects: '/projects',
      overview: '/overview',
      crm: '/crm',
      finance: '/finance',
      team: '/team',
      suppliers: '/suppliers',
      quotations: '/quotations',
      specs: '/specs',
      automations: '/automations',
      settings: '/settings',
      tenants: '/tenants',
    };
    const targetPath = pathMap[tab] || '/overview';
    if (window.location.pathname !== targetPath) {
      window.history.replaceState(null, '', targetPath);
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
    const roleIsSuperAdmin = isSuperAdmin || userData.role === 'super_admin' || userData.isSuperAdmin;
    const defaultTab = roleIsSuperAdmin ? 'tenants' : (DEFAULT_TAB[userData.role] || 'overview');
    
    setCurrentUser(userData);
    setIsAuthenticated(true);
    setTab(defaultTab);
    setView('list');
    setActiveId(null);
    localStorage.setItem('isAdmin', JSON.stringify(userData));

    const compId = tenantData?.id || userData.companyId || getActiveTenantId() || 'comp_alain';
    setActiveTenantId(compId);
    loadTenantWorkspace(compId);
  };

  const handleStartLiveDemo = () => {
    const demoUser = {
      id: 'demo_guest',
      name: 'مهندس زائر (Demo Mode)',
      role: 'owner',
      isDemo: true,
      companyId: 'comp_alain',
    };
    setCurrentUser(demoUser);
    setIsAuthenticated(true);
    setIsDemoUser(true);
    setActiveTenantId('comp_alain');
    loadTenantWorkspace('comp_alain');
    setTab('overview');
    setView('list');
    setActiveId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsDemoUser(false);
    setTab('overview');
    setView('list');
    setActiveId(null);
  };

  const handleSwitchToCompany = (companyId) => {
    setActiveTenantId(companyId);
    loadTenantWorkspace(companyId);
    setTab('overview');
    setView('list');
  };

  // فلترة المشاريع: المهندس يرى مشاريعه فقط (إلا إذا كان لديه صلاحية رؤية الكل)
  const displayedProjects = useMemo(() => {
    if (!projects) return [];
    if (userRole === 'engineer' && currentUser?.engineerName && !can(currentUser || userRole, 'projects_view_all')) {
      return projects.filter(p => p.engineer === currentUser.engineerName);
    }
    return projects;
  }, [projects, userRole, currentUser]);

  if (!isAuthenticated) {
    if (!isLoginMode) {
      return (
        <LandingPage
          onGoToLogin={() => {
            setIsLoginMode(true);
            window.history.replaceState(null, '', '/login');
          }}
          onStartLiveDemo={handleStartLiveDemo}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        companySettings={companySettings}
        onBackToLanding={() => {
          setIsLoginMode(false);
          window.history.replaceState(null, '', '/landing');
        }}
        onStartLiveDemo={handleStartLiveDemo}
      />
    );
  }

  // Active Client Portal View
  if (activeClientPortalProjectId && projects) {
    const portalProject = projects.find(p => p.id === activeClientPortalProjectId) || projects[0];
    return (
      <ClientPortal
        project={portalProject}
        companySettings={companySettings}
        onBack={() => setActiveClientPortalProjectId(null)}
        onUpdateProject={(id, patch) => updateProject(id, patch)}
        userRole={userRole}
        currentUser={currentUser}
      />
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
    <div dir="rtl" className="app-root" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ─── Demo Mode Minimal Calm Top Banner ─── */}
      {isDemoUser && (
        <div
          style={{
            background: '#F1F5F9',
            color: '#334155',
            padding: '5px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 12,
            fontWeight: 500,
            borderBottom: '1px solid #E2E8F0',
            zIndex: 9999,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: '#E2E8F0',
              color: '#475569',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
            }}>
              DEMO
            </span>
            <span>أنت الآن في <strong>النسخة التجريبية</strong> — هل ترغب في تفعيل مساحة عمل خاصة بشركتك؟</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => window.open(`https://wa.me/201018160582?text=${encodeURIComponent('مرحباً، جربت النسخة الحية لمنصة Tashteeb Pro وأرغب في الاشتراك وتفعيل مساحة عمل خاصة بشركتي')}`, '_blank')}
              style={{
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                background: '#1877F2',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>تفعيل الاشتراك 💬</span>
            </button>

            <button
              onClick={() => { setIsAuthenticated(false); setIsDemoUser(false); setIsLoginMode(false); }}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 500,
                background: '#FFFFFF',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              الخروج
            </button>
          </div>
        </div>
      )}

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
            <span style={{ whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>👑 وضع المالك:</span>
            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.35)', padding: '3px 12px', borderRadius: 20, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
              {companySettings?.companyName || 'الشركة المحددة'}
            </span>
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
      />

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
                <span>REV. {projects.length} • {todayISO()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="content tab-fade">
          {tab === "tenants" && currentUser?.role === 'super_admin' && (
            <SuperAdminDashboard onSwitchToCompany={handleSwitchToCompany} currentUser={currentUser} />
          )}


          {tab === "overview" && <Overview projects={displayedProjects} />}

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
            />
          )}

          {tab === "finance" && can(currentUser || userRole, 'finance_view') && (
            <CompanyFinance projects={projects} />
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

          {tab === "suppliers" && (
            <SuppliersTab
              projects={projects}
              companySettings={companySettings}
              userRole={userRole}
            />
          )}

          {tab === "quotations" && (
            <QuotationBuilder
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
              }}
              team={team}
              onTeamChange={(nextTeam) => {
                persistTeam(nextTeam);
                const updated = loadCompanySettings(activeCompanyId);
                setCompanySettings(updated);
                applyCompanyBranding(updated);
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
                onUpdate={(patch) => updateProject(activeProject.id, patch)}
                initialSub={initialProjectSub}
                currentUser={currentUser}
                onOpenClientPortal={(projId) => setActiveClientPortalProjectId(projId)}
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
        </div>
      </div>

      </div>{/* ─── End flex-row (Sidebar + Main) ─── */}

      {/* ─── Onboarding Tour Modal ─── */}
      <OnboardingTourModal
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onNavigateToTab={handleNavigateToTab}
      />

      {/* ─── Floating WhatsApp Support & Sales Widget ─── */}
      <WhatsAppSupportWidget companySettings={companySettings} />
    </div>
  );
}
