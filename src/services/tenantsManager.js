/**
 * ===================================================================
 * نظام إدارة الشركات والمشتركين — Multi-Tenant Platform Manager
 * ===================================================================
 * عزل كامل للبيانات، المشاريع، المهندسين، والمالية لكل شركة ومشترك.
 */

import { setGlobalCurrency } from '../utils/helpers';
import { DEMO_ACCOUNTS } from '../utils/permissions';
import {
  fetchCompanyDataFromCloud,
  fetchProjectsFromCloud,
  syncCompanyDataToCloud,
  syncSettingsToCloud,
  syncTeamToCloud,
  syncLeadsToCloud,
  syncProjectsToCloud,
  syncCompanyUsersToCloud,
  deleteCompanyFromCloud,
  fetchTenantsListFromCloud,
  syncTenantsListToCloud,
  syncTenantUsersToCloud,
  fetchUserFromCloudDirectory,
  fetchUserByPhoneFromCloudDirectory,
  cleanPhoneNumber,
  mergeProjectsPreservingLocal,
  mergeTeamsPreservingLocal,
  mergeUsersPreservingLocal,
  sanitizeProjectForCloud,
  sanitizeCompanyUsersForCloud,
} from './cloudSync';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import defaultTenantsData from './defaultTenantsData.json';

export const PLATFORM_TENANTS_KEY = 'platform-tenants-master-v1';
export const ACTIVE_TENANT_ID_KEY = 'platform-active-tenant-id';
export const SUPER_ADMIN_STORAGE_KEY = 'platform-superadmin-credentials-v1';
export const SUB_ACCOUNTS_ACCESS_KEY = 'platform-subaccounts-access-v2';

/**
 * فحص هل دخول الحسابات الفرعية مسموح أم مقفل بقرار مالك المنصة
 * القيمة الافتراضية: true (مفتوح ومتاح للجميع للعمل دون حظر)
 */
export function isSubAccountsLoginAllowed() {
  try {
    const raw = localStorage.getItem(SUB_ACCOUNTS_ACCESS_KEY);
    if (raw !== null) {
      return JSON.parse(raw) === true;
    }
  } catch (e) {
    console.error("Error checking sub-accounts access:", e);
  }
  return true; // متاح ومفتوح لجميع الشركات والموظفين والمهندسين تلقائياً
}

/**
 * جلب وتحديث حالة السماح بدخول الحسابات الفرعية سحابياً من Firestore
 */
export async function fetchPlatformSettingsFromCloud() {
  try {
    const snap = await getDoc(doc(db, 'platform_metadata', 'platform_settings'));
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data.subAccountsAllowed === 'boolean') {
        localStorage.setItem(SUB_ACCOUNTS_ACCESS_KEY, JSON.stringify(data.subAccountsAllowed));
        return data;
      }
    }
  } catch (e) {
    console.warn('[TenantsManager] Cloud platform settings fetch warning:', e);
  }
  return null;
}

export function setSubAccountsLoginAllowed(allowed) {
  try {
    localStorage.setItem(SUB_ACCOUNTS_ACCESS_KEY, JSON.stringify(!!allowed));
    window.dispatchEvent(new Event('storage'));
    setDoc(doc(db, 'platform_metadata', 'platform_settings'), {
      subAccountsAllowed: !!allowed,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(err => console.warn('[TenantsManager] Cloud platform settings save error:', err));
    return true;
  } catch (e) {
    console.error("Error setting sub-accounts access:", e);
    return false;
  }
}

// قائمة البريد المعتمد لمالك المنصة الرئيسي (Super Admin)
export const BUILTIN_SUPERADMIN_EMAILS = [
  'sicolove7@gmail.com',
  'admin@platform.com',
  'admin@tashteebpro.com'
];

// حساب مالك المنصة الرئيسي الافتراضي (Super Admin)
export const DEFAULT_SUPER_ADMIN_ACCOUNT = {
  id: 'super_admin_master',
  email: 'sicolove7@gmail.com',
  name: 'مالك المنصة الرئيسي',
  role: 'super_admin',
  isSuperAdmin: true,
};

// تطهير أمني فوري: إزالة أي كلمات مرور قديمة كانت مخزنة في LocalStorage
try {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(SUPER_ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'password' in parsed) {
        delete parsed.password;
        localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, JSON.stringify(parsed));
      }
    }

    // مزامنة وفهرسة كافة مستخدمي وموظفي الشركات في السجل المركزي platform-all-users-registry
    try {
      const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
      let changed = false;
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('tenant_') && k.endsWith('_users')) {
          const cId = k.replace(/^tenant_/, '').replace(/_users$/, '');
          try {
            const uList = JSON.parse(localStorage.getItem(k) || '[]');
            if (Array.isArray(uList)) {
              uList.forEach(u => {
                if (u && u.email) {
                  const cleanE = u.email.toLowerCase().trim();
                  reg[cleanE] = {
                    ...u,
                    companyId: u.companyId || cId,
                  };
                  changed = true;
                }
              });
            }
          } catch(e) {}
        }
      });
      if (changed) {
        localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));
      }
      setTimeout(() => {
        try { syncAllLocalUsersToCloud(); } catch(e) {}
      }, 500);
    } catch(e) {}
  }
} catch (e) {}

export function getSuperAdminAccount() {
  try {
    const raw = localStorage.getItem(SUPER_ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) {
        return {
          id: 'super_admin_master',
          name: parsed.name || 'مالك المنصة الرئيسي',
          email: parsed.email.toLowerCase().trim(),
          role: 'super_admin',
          isSuperAdmin: true,
        };
      }
    }
  } catch (e) {
    console.error("Error reading superadmin profile:", e);
  }
  return DEFAULT_SUPER_ADMIN_ACCOUNT;
}

export function saveSuperAdminAccount(creds) {
  try {
    const data = {
      name: creds.name || 'مالك المنصة الرئيسي',
      email: creds.email ? creds.email.toLowerCase().trim() : '',
    };
    localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error saving superadmin profile:", e);
    return false;
  }
}

export const SUPER_ADMIN_ACCOUNT = DEFAULT_SUPER_ADMIN_ACCOUNT;

// الشركات الافتراضية المكتملة والمحدثة مركزياً لكافة الشركات والموظفين
export const DEFAULT_TENANTS = Array.isArray(defaultTenantsData) && defaultTenantsData.length > 0 ? defaultTenantsData : [];

export function loadAllTenants() {
  try {
    const raw = localStorage.getItem(PLATFORM_TENANTS_KEY);
    let parsed = [];
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (e) {}
    }
    if (!Array.isArray(parsed)) parsed = [];

    // دمج فوري وتلقائي مع DEFAULT_TENANTS لضمان وجود كل الشركات والـ 13 موظف دائماً
    const map = new Map();
    DEFAULT_TENANTS.forEach(t => {
      if (t?.id) map.set(t.id, { ...t });
    });
    parsed.forEach(t => {
      if (t?.id) {
        if (!map.has(t.id)) {
          map.set(t.id, t);
        } else {
          const defT = map.get(t.id);
          const mergedUsers = mergeUsersPreservingLocal(t.users || [], defT.users || []);
          map.set(t.id, {
            ...defT,
            ...t,
            users: mergedUsers,
            authorizedEmails: Array.from(new Set([
              ...(defT.authorizedEmails || []),
              ...(t.authorizedEmails || []),
              ...mergedUsers.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean)
            ]))
          });
        }
      }
    });

    const all = Array.from(map.values());
    try { localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(all)); } catch (e) {}
    return all;
  } catch (e) {
    console.error("Error loading tenants:", e);
    return [...DEFAULT_TENANTS];
  }
}

export async function loadAllTenantsAsync() {
  const local = loadAllTenants();
  try {
    const cloudTenants = await fetchTenantsListFromCloud();
    if (Array.isArray(cloudTenants) && cloudTenants.length > 0) {
      const mergedMap = new Map();
      cloudTenants.forEach(t => {
        if (t?.id) mergedMap.set(t.id, t);
      });
      local.forEach(t => {
        if (t?.id) {
          if (!mergedMap.has(t.id)) {
            mergedMap.set(t.id, t);
          } else {
            const cloudT = mergedMap.get(t.id);
            const mergedUsers = Array.isArray(cloudT.users) && cloudT.users.length > 0
              ? (Array.isArray(t.users) && t.users.length > 0 ? mergeUsersPreservingLocal(t.users, cloudT.users) : cloudT.users)
              : (t.users || []);
            const mergedEmails = Array.from(new Set([
              ...(cloudT.authorizedEmails || []),
              ...(t.authorizedEmails || []),
              ...(mergedUsers || []).map(u => (u.email || '').toLowerCase().trim()).filter(Boolean)
            ]));
            mergedMap.set(t.id, {
              ...cloudT,
              ...t,
              users: mergedUsers,
              authorizedEmails: mergedEmails,
            });
          }
        }
      });
      const merged = Array.from(mergedMap.values());
      try { localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(merged)); } catch (e) {}
      try { syncTenantsListToCloud(merged); } catch (e) {}
      return merged;
    }
  } catch (e) {
    console.warn("Could not load tenants from cloud, falling back to local:", e);
  }
  try { syncTenantsListToCloud(local); } catch (e) {}
  return local;
}

export function saveAllTenants(tenants) {
  try {
    localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(tenants));
  } catch (e) {}
  try {
    syncTenantsListToCloud(tenants);
  } catch (e) {}
}

export function createTenant(data) {
  const tenants = loadAllTenants();
  const id = 'comp_' + (data.slug || Date.now().toString(36));
  
  const newTenant = {
    id,
    name: data.name?.trim() || 'شركة جديدة',
    subtitle: data.subtitle?.trim() || 'نظام إدارة المشاريع المتكامل',
    city: data.city?.trim() || 'أبوظبي',
    country: data.country?.trim() || 'الإمارات',
    currency: data.currency || 'د.إ',
    phone: data.phone?.trim() || '',
    plan: data.plan || 'trial',
    planName: data.plan === 'trial' ? 'باقة تجريبية (14 يوماً)' : (data.plan === 'pro_annual' ? 'باقة سنوية VIP' : 'باقة شهرية'),
    status: data.status || (data.plan === 'trial' ? 'trial' : 'active'),
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: data.expiryDate || getFutureDate(data.plan === 'trial' ? 14 : 365),
    primaryColor: data.primaryColor || '#1877F2',
    accentColor: data.accentColor || '#166FE5',
    adminEmail: data.adminEmail?.toLowerCase().trim() || `admin@${id}.ae`,
    adminName: data.adminName?.trim() || 'مدير الشركة',
    subdomain: (data.subdomain || data.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
    customDomain: (data.customDomain || '').trim().toLowerCase(),
    projectsCount: data.seedDemoProject ? 1 : 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const updated = [newTenant, ...tenants];
  saveAllTenants(updated);

  // إعداد مستخدمي الشركة (بدون أي كلمات سر كنص صريح - الاعتماد كلياً على Firebase Auth)
  const companyUsers = [
    {
      id: `u_${id}_admin`,
      email: newTenant.adminEmail,
      role: 'owner',
      name: newTenant.adminName,
      engineerName: null,
      companyId: id,
    },
    {
      id: `u_${id}_eng1`,
      email: `eng@${newTenant.adminEmail.split('@')[1] || 'site.ae'}`,
      role: 'engineer',
      name: 'م. مهندس الموقع',
      engineerName: 'م. مهندس الموقع',
      companyId: id,
    }
  ];
  localStorage.setItem(`tenant_${id}_users`, JSON.stringify(companyUsers));

  // إعدادات الشركة
  const companySettings = {
    companyName: newTenant.name,
    companySubtitle: newTenant.subtitle,
    city: newTenant.city,
    country: newTenant.country,
    currency: newTenant.currency,
    phone: newTenant.phone,
    primaryColor: newTenant.primaryColor,
    accentColor: newTenant.accentColor,
    companyLogo: null,
    adminEmail: newTenant.adminEmail,
    adminName: newTenant.adminName,
  };
  localStorage.setItem(`tenant_${id}_settings`, JSON.stringify(companySettings));

  // الفريق
  const companyTeam = {
    engineers: ['م. مهندس الموقع', 'م. سيف النيادي'],
    accountants: ['أ. المحاسب المالي'],
    techOffice: ['م. المكتب الفني'],
    customerService: []
  };
  localStorage.setItem(`tenant_${id}_team`, JSON.stringify(companyTeam));

  // CRM Leads
  const companyLeads = [
    {
      id: `lead_${id}_1`,
      name: 'سعادة سالم الدرعي',
      phone: '+971 50 888 7766',
      area: newTenant.city,
      type: 'قصر / فيلا مستقلة',
      budget: 1500000,
      source: 'referral',
      stage: 'quotation',
      createdAt: new Date().toISOString().slice(0, 10),
      notes: 'طلب مقايسة تشطيب مجلس رجال ومطبخ تحضيري ورخام إيطالي.',
    }
  ];
  localStorage.setItem(`tenant_${id}_leads`, JSON.stringify(companyLeads));

  // المشاريع
  let initialProjects = [];
  if (data.seedDemoProject) {
    const seedList = generateCompanySeedProjects(id, newTenant);
    initialProjects = seedList && seedList.length > 0 ? [seedList[0]] : [];
    localStorage.setItem(`tenant_${id}_projects`, JSON.stringify(initialProjects));
  } else {
    localStorage.setItem(`tenant_${id}_projects`, JSON.stringify([]));
  }

  // رفع وتثبيت فضاء عمل الشركة بالكامل في السحابة لحظياً
  try {
    syncCompanyDataToCloud(id, {
      adminEmail: newTenant.adminEmail,
      adminName: newTenant.adminName,
      settings: companySettings,
      users: companyUsers,
      team: companyTeam,
      leads: companyLeads,
      projects: initialProjects,
    });
  } catch (e) {
    console.warn("Cloud sync for new tenant failed:", e);
  }

  return newTenant;
}

/**
 * تسجيل شركة جديدة ذاتياً مع إنشاء الحساب والمزامنة السحابية الفورية
 */
export async function registerNewTenant(formData) {
  const cleanEmail = (formData.email || '').toLowerCase().trim();
  const password = formData.password || '123456';
  const companyName = (formData.companyName || '').trim();
  const adminName = (formData.adminName || '').trim() || 'مدير الشركة';
  const phone = (formData.phone || '').trim();
  const city = (formData.city || 'القاهرة').trim();

  if (!cleanEmail || !companyName) {
    return { success: false, error: 'يرجى إدخال اسم الشركة والبريد الإلكتروني.' };
  }

  // التأكد من عدم تكرار البريد الإلكتروني
  const allTenants = await loadAllTenantsAsync();
  const superAdmin = getSuperAdminAccount();
  if (cleanEmail === superAdmin.email.toLowerCase().trim()) {
    return { success: false, error: 'هذا البريد الإلكتروني محجوز لإدارة المنصة.' };
  }
  const exists = allTenants.some(t => t.adminEmail?.toLowerCase().trim() === cleanEmail);
  if (exists) {
    return { success: false, error: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.' };
  }

  // توليد معرف للشركة ونطاق فرعي تلقائي
  const slug = 'c_' + Date.now().toString(36);
  const rawSubdomain = (formData.subdomain || companyName || slug)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '');
  const subdomain = rawSubdomain.length >= 3 ? rawSubdomain : slug;

  const newTenant = createTenant({
    slug,
    subdomain,
    name: companyName,
    subtitle: 'نظام إدارة المقاولات والتشطيبات والمشاريع',
    city,
    country: 'مصر',
    currency: 'ج.م',
    phone,
    adminEmail: cleanEmail,
    adminName,
    plan: 'trial',
    seedDemoProject: true, // لتوفير مشروع عينة واقعي يبدأ به
  });

  const user = {
    id: `u_${newTenant.id}_admin`,
    email: newTenant.adminEmail,
    name: newTenant.adminName,
    role: 'owner',
    companyId: newTenant.id,
    companyName: newTenant.name,
    currency: newTenant.currency || 'ج.م',
  };

  try {
    syncTenantUsersToCloud(newTenant.id, [{ ...user, phone: phone || null }]).catch(() => {});
  } catch (e) {}

  // تعيين الشركة كشركة نشطة
  setActiveTenantId(newTenant.id);

  return {
    success: true,
    user,
    tenant: newTenant,
    isSuperAdmin: false,
  };
}

export function updateTenant(id, updates) {
  const tenants = loadAllTenants();
  const idx = tenants.findIndex(t => t.id === id);
  if (idx !== -1) {
    tenants[idx] = { ...tenants[idx], ...updates };
    saveAllTenants(tenants);
    try {
      syncCompanyDataToCloud(id, {
        settings: {
          companyName: tenants[idx].name,
          companySubtitle: tenants[idx].subtitle,
          city: tenants[idx].city,
          country: tenants[idx].country,
          currency: tenants[idx].currency,
          phone: tenants[idx].phone,
          primaryColor: tenants[idx].primaryColor,
          accentColor: tenants[idx].accentColor,
        }
      });
    } catch (e) {}
    return tenants[idx];
  }
  return null;
}

export function deleteTenant(id) {
  const tenants = loadAllTenants().filter(t => t.id !== id);
  saveAllTenants(tenants);
  try {
    localStorage.removeItem(`tenant_${id}_projects`);
    localStorage.removeItem(`tenant_${id}_settings`);
    localStorage.removeItem(`tenant_${id}_users`);
    localStorage.removeItem(`tenant_${id}_team`);
    localStorage.removeItem(`tenant_${id}_leads`);
  } catch (e) {}
  try {
    deleteCompanyFromCloud(id);
  } catch (e) {}
  return tenants;
}

export function getActiveTenantId() {
  return localStorage.getItem(ACTIVE_TENANT_ID_KEY) || null;
}

export function setActiveTenantId(companyId) {
  if (companyId) {
    localStorage.setItem(ACTIVE_TENANT_ID_KEY, companyId);
  } else {
    localStorage.removeItem(ACTIVE_TENANT_ID_KEY);
  }
}

/**
 * جلب جميع البيانات المعزولة للشركة المحددة
 */
export function getTenantData(companyId) {
  if (!companyId) {
    return {
      tenant: null,
      settings: {
        companyName: '',
        companySubtitle: '',
        city: '',
        country: 'مصر',
        currency: 'ج.م',
        phone: '',
        primaryColor: '#1877F2',
        accentColor: '#166FE5',
        companyLogo: null,
      },
      users: [],
      team: { engineers: [], accountants: [], techOffice: [], customerService: [] },
      leads: [],
      projects: [],
    };
  }

  const tenants = loadAllTenants();
  const tenant = tenants.find(t => t.id === companyId);

  // 1. الإعدادات والعملة
  let settings = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_settings`);
    if (raw) settings = JSON.parse(raw);
  } catch (e) {}
  if (!settings) {
    settings = {
      companyName: tenant ? tenant.name : 'شركة المقاولات والتشطيبات',
      companySubtitle: tenant ? tenant.subtitle : 'نظام إدارة المشاريع المتكامل',
      city: tenant?.city || '',
      country: tenant?.country || 'مصر',
      currency: tenant?.currency || 'ج.م',
      phone: tenant?.phone || '',
      primaryColor: tenant?.primaryColor || '#1877F2',
      accentColor: tenant?.accentColor || '#166FE5',
      companyLogo: null,
    };
    try { localStorage.setItem(`tenant_${companyId}_settings`, JSON.stringify(settings)); } catch (e) {}
  }

  // 2. المستخدمين
  let users = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_users`);
    if (raw) users = sanitizeCompanyUsersForCloud(JSON.parse(raw));
  } catch (e) {}
  if (!users || users.length === 0) {
    if (tenant && Array.isArray(tenant.users) && tenant.users.length > 0) {
      users = tenant.users;
    } else if (tenant) {
      users = [
        {
          id: `u_${companyId}_admin`,
          email: tenant.adminEmail || '',
          role: 'owner',
          name: tenant.adminName || 'مدير الشركة',
          engineerName: null,
          companyId,
        },
        {
          id: `u_${companyId}_eng1`,
          email: `eng@${(tenant.adminEmail || '').split('@')[1] || 'site.com'}`,
          role: 'engineer',
          name: 'مهندس الموقع',
          engineerName: 'مهندس الموقع',
          companyId,
        }
      ];
    } else {
      // شركة جديدة: نبدأ بقائمة فارغة من المستخدمين وسيتم تعبئتها من السحابة
      users = [];
    }
    if (users.length > 0) {
      try { localStorage.setItem(`tenant_${companyId}_users`, JSON.stringify(users)); } catch (e) {}
    }
  }

  // 3. الفريق
  let team = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_team`);
    if (raw) team = JSON.parse(raw);
  } catch (e) {}
  if (!team) {
    const engineerNames = (users && users.filter(u => u.role === 'engineer').map(u => u.name).filter(Boolean)) || [];
    team = {
      engineers: engineerNames.length > 0 ? engineerNames : (tenant?.adminName ? [tenant.adminName] : ['مهندس الموقع']),
      accountants: ['أ. سامح فتحي'],
      techOffice: ['م. علياء رمضان'],
      customerService: ['أ. نورا حسن']
    };
    try { localStorage.setItem(`tenant_${companyId}_team`, JSON.stringify(team)); } catch (e) {}
  }
  // مزامنة ودمج حسابات المستخدمين مع فريق العمل تلقائياً
  team = mergeTeamsPreservingLocal(team, null, users);

  // 4. الـ CRM Leads
  let leads = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_leads`);
    if (raw) leads = JSON.parse(raw);
  } catch (e) {}
  if (!leads) {
    leads = [];
    try { localStorage.setItem(`tenant_${companyId}_leads`, JSON.stringify(leads)); } catch (e) {}
  }

  // 5. المشاريع
  let projects = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_projects`);
    if (raw) projects = JSON.parse(raw);
  } catch (e) {}
  if (!projects || projects.length === 0) {
    // فقط نُنشئ مشاريع تجريبية إذا كانت الشركة في القائمة المحلية (للشركات الافتراضية فقط)
    // الشركات الجديدة تبدأ بدون مشاريع وتُجلب بياناتها من السحابة
    if (tenant) {
      projects = generateCompanySeedProjects(companyId, tenant);
      try { localStorage.setItem(`tenant_${companyId}_projects`, JSON.stringify(projects)); } catch (e) {}
    } else {
      projects = []; // شركة جديدة: لا مشاريع افتراضية
    }
  }

  // التأكد من أن جميع المشاريع موسومة بمعرف هذه الشركة لحمايتها من التداخل
  if (Array.isArray(projects)) {
    projects = projects.map(p => ({
      ...p,
      companyId: companyId
    }));
  }

  // تحديث العملة العالمية
  if (settings.currency) {
    setGlobalCurrency(settings.currency);
  }

  return { tenant, settings, users, team, leads, projects };
}

/**
 * جلب بيانات الشركة سحابياً مع حفظ الكاش المحلي للسرعة والعمل بدون إنترنت
 */
export async function getTenantDataAsync(companyId) {
  if (!companyId) return getTenantData(null);
  try {
    const cloud = await fetchCompanyDataFromCloud(companyId);
    if (cloud) {
      const tenants = await loadAllTenantsAsync();
      // لا نستخدم tenants[0] كـ fallback لأن ذلك يُعطي بيانات شركة خاطئة
      const tenant = tenants.find(t => t.id === companyId) || null;

      const localFallback = getTenantData(companyId);
      const localSettings = localFallback?.settings;
      const cloudSettings = cloud.settings;

      const settings = {
        companyName: tenant?.name || cloud.settings?.companyName || 'شركة المقاولات',
        companySubtitle: tenant?.subtitle || cloud.settings?.companySubtitle || 'نظام إدارة المشاريع',
        city: tenant?.city || cloud.settings?.city || '',
        country: tenant?.country || cloud.settings?.country || 'مصر',
        currency: tenant?.currency || cloud.settings?.currency || 'ج.م',
        phone: tenant?.phone || cloud.settings?.phone || '',
        primaryColor: tenant?.primaryColor || cloud.settings?.primaryColor || '#1877F2',
        accentColor: tenant?.accentColor || cloud.settings?.accentColor || '#166FE5',
        companyLogo: null,
        ...(localSettings || {}),
        ...(cloudSettings || {}),
        companyLogo: cloudSettings?.companyLogo || localSettings?.companyLogo || null,
      };

      if (localSettings?.companyLogo && !cloudSettings?.companyLogo) {
        try { syncSettingsToCloud(companyId, settings); } catch (e) {}
      }
      const rawUsers = Array.isArray(cloud.users) && cloud.users.length > 0 ? cloud.users : null;
      const mergedUsers = sanitizeCompanyUsersForCloud(mergeUsersPreservingLocal(localFallback.users, rawUsers));
      const mergedTeam = mergeTeamsPreservingLocal(localFallback.team, cloud.team, mergedUsers);
      const leads = Array.isArray(cloud.leads) ? cloud.leads : null;
      const subProjects = await fetchProjectsFromCloud(companyId);
      const cloudProjects = (Array.isArray(subProjects) && subProjects.length > 0)
        ? subProjects
        : (Array.isArray(cloud.projects) ? cloud.projects : null);

      const projects = mergeProjectsPreservingLocal(localFallback.projects, cloudProjects, companyId);

      // تحديث الـ LocalStorage Cache
      if (settings) try { localStorage.setItem(`tenant_${companyId}_settings`, JSON.stringify(settings)); } catch (e) {}
      if (mergedUsers) try { localStorage.setItem(`tenant_${companyId}_users`, JSON.stringify(mergedUsers)); } catch (e) {}
      if (mergedTeam) try { localStorage.setItem(`tenant_${companyId}_team`, JSON.stringify(mergedTeam)); } catch (e) {}
      if (leads) try { localStorage.setItem(`tenant_${companyId}_leads`, JSON.stringify(leads)); } catch (e) {}
      if (projects) {
        try {
          const lean = projects.map(p => sanitizeProjectForCloud(p));
          localStorage.setItem(`tenant_${companyId}_projects`, JSON.stringify(lean));
        } catch (e) {}
      }

      if (settings.currency) setGlobalCurrency(settings.currency);

      return {
        tenant,
        settings,
        users: mergedUsers,
        team: mergedTeam,
        leads: leads || localFallback.leads,
        projects: projects || localFallback.projects,
      };
    }
  } catch (e) {
    console.warn("getTenantDataAsync error, using local:", e);
  }

  // في حال تعذر السحابة، نعتمد على الكاش المحلي
  const localData = getTenantData(companyId);
  try {
    syncCompanyDataToCloud(companyId, {
      settings: localData.settings,
      users: localData.users,
      team: localData.team,
      leads: localData.leads,
    });
  } catch (e) {}
  return localData;
}

/**
 * مطابقة وتحديد بيانات الشركة وصلاحيات المستخدم بعد نجاح Firebase Authentication
 * 
 * ملاحظة معمارية هامة (Fallback Mechanism):
 * هذه الدالة تعمل كطبقة احتياطية ذكية (Fallback) عندما لا تكون الـ Custom Claims مُحقونة مسبقاً
 * في توكن المستخدم، حيث تقوم بمطابقة البريد الإلكتروني للمستخدم الموثق مع سجلات الشركة المصرح لها
 * لضمان استمرار الجلسة وسلاسة الدخول والتعرف على الشركة النشطة.
 */
export async function resolveTenantUserByEmail(email, firebaseUid = '', claims = {}) {
  const cleanEmail = (email || '').toLowerCase().trim();
  const superAdmin = getSuperAdminAccount();

  // فحص هل المعرف هو رقم هاتف أو بريد مشتق من رقم هاتف
  let phoneFromEmail = null;
  if (cleanEmail.startsWith('phone_') && cleanEmail.endsWith('@tashteeb.app')) {
    phoneFromEmail = cleanPhoneNumber(cleanEmail.replace('phone_', '').replace('@tashteeb.app', ''));
  } else if (!cleanEmail.includes('@') && cleanPhoneNumber(cleanEmail).length >= 7) {
    phoneFromEmail = cleanPhoneNumber(cleanEmail);
  }

  // دالة مطابقة مرنة تفحص الإيميل والهاتف بدقة تامة
  const isUserMatch = (u) => {
    if (!u) return false;
    const uEmail = (u.email || '').toLowerCase().trim();
    if (uEmail && uEmail === cleanEmail) return true;
    if (phoneFromEmail) {
      if (uEmail && uEmail === `phone_${phoneFromEmail}@tashteeb.app`) return true;
      const uPhone = cleanPhoneNumber(u.phone || u.cleanPhone);
      if (uPhone && uPhone === phoneFromEmail) return true;
    }
    return false;
  };

  const isTenantAdminMatch = (t) => {
    if (!t) return false;
    if (t.adminEmail && t.adminEmail.toLowerCase().trim() === cleanEmail) return true;
    if (phoneFromEmail) {
      if (t.phone && cleanPhoneNumber(t.phone) === phoneFromEmail) return true;
      if (t.adminPhone && cleanPhoneNumber(t.adminPhone) === phoneFromEmail) return true;
    }
    return false;
  };

  // 1. تحميل قائمة الشركات أولاً ومحلياً/سحابياً لتكون متوفرة لكافة الفحوصات والحسابات
  let tenants = [];
  try {
    tenants = await loadAllTenantsAsync();
  } catch (e) {
    tenants = loadAllTenants();
  }
  if (!Array.isArray(tenants) || tenants.length === 0) {
    tenants = [...DEFAULT_TENANTS];
  }

  // 2. فحص هل هو حساب الـ Super Admin (عبر Custom Claims الموثقة أو البريد المعتمد كمدير للمنصة)
  const isRegisteredSuperAdmin = Boolean(
    (superAdmin?.email && superAdmin.email.toLowerCase().trim() === cleanEmail) ||
    BUILTIN_SUPERADMIN_EMAILS.includes(cleanEmail)
  );
  const isSuperAdminUser = claims.role === 'super_admin' || claims.isSuperAdmin === true || isRegisteredSuperAdmin;

  if (isSuperAdminUser) {
    const activeTenantId = getActiveTenantId();
    const activeTenant = (activeTenantId && tenants.find(t => t.id === activeTenantId)) ||
                         tenants.find(t => t.adminEmail && t.adminEmail.toLowerCase().trim() === cleanEmail) ||
                         (tenants.length > 0 ? tenants[0] : null);
    return {
      success: true,
      user: {
        id: firebaseUid || 'super_admin_master',
        email: cleanEmail,
        name: claims.name || superAdmin?.name || cleanEmail.split('@')[0],
        role: 'super_admin',
        isSuperAdmin: true,
        companyId: activeTenant?.id || null,
        companyName: activeTenant?.name || 'المنصة الرئيسية',
        currency: activeTenant?.currency || 'ج.م',
      },
      tenant: activeTenant,
      isSuperAdmin: true,
    };
  }

  // 3. فحص صلاحيات الشركة المحددة بدقة داخل الـ Custom Claims
  if (claims.companyId) {
    const claimTenant = tenants.find(t => t.id === claims.companyId);
    if (claimTenant) {
      return {
        success: true,
        user: {
          id: firebaseUid || `u_${claimTenant.id}_${claims.role || 'user'}`,
          email: cleanEmail,
          name: cleanEmail === claimTenant.adminEmail ? claimTenant.adminName : (claims.name || cleanEmail.split('@')[0]),
          role: claims.role || 'owner',
          companyId: claimTenant.id,
          companyName: claimTenant.name,
          currency: claimTenant.currency || 'ج.م',
        },
        tenant: claimTenant,
        isSuperAdmin: false,
      };
    }

    // ✅ الشركة في الـ Claims لكن غير موجودة محلياً
    console.warn('[resolveTenantUserByEmail] Company from claims not in local list, building user from claims:', claims.companyId);
    return {
      success: true,
      user: {
        id: firebaseUid || `u_${claims.companyId}_${claims.role || 'user'}`,
        email: cleanEmail,
        name: claims.name || cleanEmail.split('@')[0],
        role: claims.role || 'owner',
        companyId: claims.companyId,
        companyName: claims.companyName || claims.companyId,
        currency: claims.currency || 'ج.م',
      },
      tenant: null,
      isSuperAdmin: false,
    };
  }

  // 4. فحص دليل المستخدمين السحابي المركزي أولاً (Direct Cloud Directory Lookup)
  try {
    let cloudUser = null;
    if (cleanEmail.includes('@') && !cleanEmail.endsWith('@tashteeb.app')) {
      cloudUser = await fetchUserFromCloudDirectory(cleanEmail);
    }
    if (!cloudUser && phoneFromEmail) {
      cloudUser = await fetchUserByPhoneFromCloudDirectory(phoneFromEmail);
    }
    if (!cloudUser && cleanEmail.endsWith('@tashteeb.app')) {
      cloudUser = await fetchUserFromCloudDirectory(cleanEmail);
    }

    if (cloudUser && cloudUser.companyId) {
      const matchTenant = tenants.find(t => t.id === cloudUser.companyId) || {
        id: cloudUser.companyId,
        name: cloudUser.companyName || 'الشركة',
        currency: cloudUser.currency || 'ج.م',
      };
      console.log('[resolveTenantUserByEmail] ✅ Found user in cloud directory:', cleanEmail, 'company:', matchTenant.id);

      // حفظ محلي فوري لتسريع عمليات الدخول التالية على هذا المتصفح
      try {
        const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
        reg[cleanEmail] = { ...cloudUser, companyId: matchTenant.id };
        if (phoneFromEmail) {
          reg['phone_' + phoneFromEmail] = { ...cloudUser, companyId: matchTenant.id };
        }
        localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));
      } catch (e) {}

      return {
        success: true,
        user: {
          ...cloudUser,
          id: firebaseUid || cloudUser.id,
          role: cloudUser.role || 'engineer',
          companyId: matchTenant.id,
          companyName: matchTenant.name || cloudUser.companyName,
          currency: matchTenant.currency || cloudUser.currency || 'ج.م',
        },
        tenant: matchTenant,
        isSuperAdmin: false,
      };
    }
  } catch(e) {
    console.warn('[resolveTenantUserByEmail] Cloud directory check warning:', e);
  }

  // 5. فحص السجل المركزي لكافة مستخدمي وموظفي المنصة محلياً platform-all-users-registry
  try {
    const regRaw = localStorage.getItem('platform-all-users-registry');
    if (regRaw) {
      const reg = JSON.parse(regRaw);
      if (reg) {
        let u = reg[cleanEmail];
        if (!u && phoneFromEmail) {
          u = reg['phone_' + phoneFromEmail] || reg[phoneFromEmail];
          if (!u) {
            u = Object.values(reg).find(isUserMatch);
          }
        }
        if (u && u.companyId) {
          const matchTenant = tenants.find(t => t.id === u.companyId) || {
            id: u.companyId,
            name: u.companyName || 'الشركة',
            currency: u.currency || 'ج.م',
          };
          console.log('[resolveTenantUserByEmail] Found user in platform-all-users-registry:', cleanEmail, 'role:', u.role, 'company:', matchTenant.id);
          return {
            success: true,
            user: {
              ...u,
              id: firebaseUid || u.id,
              role: u.role || 'engineer',
              companyId: matchTenant.id,
              companyName: matchTenant.name || u.companyName,
              currency: matchTenant.currency || u.currency || 'ج.م',
            },
            tenant: matchTenant,
            isSuperAdmin: false,
          };
        }
      }
    }
  } catch(e) {}

  // 6. فحص كافة الشركات المسجلة: دمج أعضاء الفريق في t.users مع المحلي، والتحقق السحابي الفعال إذا لم يتطابق محلياً
  for (const t of tenants) {
    // أ) التحقق من قائمة المستخدمين
    let users = Array.isArray(t.users) ? [...t.users] : [];

    // دمج المستخدمين من التخزين المحلي للشركة إن وجدوا
    try {
      const rawUsers = localStorage.getItem(`tenant_${t.id}_users`);
      if (rawUsers) {
        const parsed = JSON.parse(rawUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          users = mergeUsersPreservingLocal(parsed, users);
        }
      }
    } catch (e) {}

    let match = users.find(isUserMatch);

    // التحقق من قائمة البريد المصرح بها في الشركة authorizedEmails
    if (!match && Array.isArray(t.authorizedEmails)) {
      const isAuth = t.authorizedEmails.some(e => (e || '').toLowerCase().trim() === cleanEmail);
      if (isAuth) {
        console.log('[resolveTenantUserByEmail] ✅ Found user in company authorizedEmails:', cleanEmail, 'company:', t.id);
        match = {
          id: firebaseUid || `u_${t.id}_auth`,
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          role: 'engineer',
          companyId: t.id
        };
      }
    }

    // إذا لم يتطابق محلياً، نفحص سحابة الشركة فوراً للتأكد تماماً من عدم وجود الموظف
    if (!match) {
      try {
        const cloudData = await fetchCompanyDataFromCloud(t.id);
        if (cloudData && Array.isArray(cloudData.users)) {
          users = mergeUsersPreservingLocal(users, cloudData.users);
          match = users.find(isUserMatch);
        }
      } catch (e) {}
    }

    if (match) {
      console.log('[resolveTenantUserByEmail] ✅ Found employee in company users:', cleanEmail, 'company:', t.id, 'role:', match.role);

      // حفظ وفهرسة فورية لتسريع الجلسة القادمة
      try {
        localStorage.setItem(`tenant_${t.id}_users`, JSON.stringify(users));
        const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
        reg[cleanEmail] = { ...match, companyId: t.id };
        if (phoneFromEmail) {
          reg['phone_' + phoneFromEmail] = { ...match, companyId: t.id };
        }
        localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));
      } catch (e) {}

      return {
        success: true,
        user: {
          ...match,
          id: firebaseUid || match.id,
          companyId: t.id,
          companyName: t.name,
          currency: t.currency || 'ج.م',
          role: match.role || 'engineer',
        },
        tenant: t,
        isSuperAdmin: false,
      };
    }

    // ب) هل هو مالك الشركة (Owner / Admin)
    if (isTenantAdminMatch(t)) {
      return {
        success: true,
        user: {
          id: firebaseUid || `u_${t.id}_admin`,
          email: t.adminEmail,
          phone: t.phone,
          name: t.adminName || 'مدير الشركة',
          role: 'owner',
          companyId: t.id,
          companyName: t.name,
          currency: t.currency || 'ج.م',
        },
        tenant: t,
        isSuperAdmin: false,
      };
    }
  }

  // 7. فحص شامل لكافة مفاتيح localStorage المحلية (tenant_*_users)
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('tenant_') && k.endsWith('_users')) {
        const cId = k.replace(/^tenant_/, '').replace(/_users$/, '');
        try {
          const uList = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(uList)) {
            const m = uList.find(isUserMatch);
            if (m) {
              const matchedTenant = tenants.find(t => t.id === cId) || { id: cId, name: 'الشركة', currency: 'ج.م' };
              console.log('[resolveTenantUserByEmail] ✅ Found user in local storage key:', k, cleanEmail);
              return {
                success: true,
                user: {
                  ...m,
                  id: firebaseUid || m.id,
                  companyId: cId,
                  companyName: matchedTenant.name,
                  currency: matchedTenant.currency || 'ج.م',
                  role: m.role || 'engineer'
                },
                tenant: matchedTenant,
                isSuperAdmin: false
              };
            }
          }
        } catch(e) {}
      }
    }
  } catch(e) {}

  // 8. لم يتم ربط هذا الحساب بأي شركة مسجلة في المنصة
  console.warn('[resolveTenantUserByEmail] No matching company found for user:', cleanEmail);
  return {
    success: false,
    error: 'لم يتم ربط هذا الحساب بأي شركة مسجلة في المنصة. يرجى التواصل مع مدير الشركة أو المنصة لإضافة حسابك.',
  };
}

/**
 * مزامنة تصحيحية ذاتية لكافة مستخدمي الشركات المحليين ورفعهم للسحابة
 * لضمان عمل حسابات الموظفين على أي جهاز دون الحاجة لإعادة إضافتهم
 */
export async function syncAllLocalUsersToCloud() {
  try {
    let allTenants = loadAllTenants();
    let hasChanges = false;

    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('tenant_') && k.endsWith('_users')) {
        const cId = k.replace(/^tenant_/, '').replace(/_users$/, '');
        try {
          const uList = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(uList) && uList.length > 0) {
            const tIdx = allTenants.findIndex(t => t.id === cId);
            if (tIdx !== -1) {
              const currentUsers = allTenants[tIdx].users || [];
              const merged = mergeUsersPreservingLocal(currentUsers, uList);
              allTenants[tIdx].users = merged;
              allTenants[tIdx].authorizedEmails = merged.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean);
              hasChanges = true;
              // مزامنة فورية لكل شركة
              syncTenantUsersToCloud(cId, merged).catch(() => {});
            }
          }
        } catch (e) {}
      }
    });

    if (hasChanges) {
      localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(allTenants));
      await syncTenantsListToCloud(allTenants);
      console.log('[syncAllLocalUsersToCloud] ✅ Successfully auto-healed and synced company users to cloud.');
    }
  } catch (e) {
    console.warn('[syncAllLocalUsersToCloud] Auto-healing error:', e);
  }
}

export function generateWhatsAppWelcomeMessage(tenant) {
  return `مرحباً بك يا بشمهندس ${tenant.adminName || ''} 🌟

تم تفعيل مساحة العمل الخاصة بمكتبكم الموقر على نظام إدارة المشاريع بنجاح 🚀

🏢 *اسم الشركة:* ${tenant.name}
🌐 *رابط الدخول:* ${window.location.origin || 'http://localhost:5173'}
👤 *البريد الإلكتروني:* ${tenant.adminEmail}
🔑 *كلمة المرور:* يتم تعيينها وتشفيرها عبر رابط الأمان السحابي المرسل للبريد
📦 *نوع الباقة:* ${tenant.planName}
📅 *تاريخ الصلاحية:* ${tenant.expiryDate}

💡 *بمجرد تسجيل الدخول، يمكنك رفع شعار شركتك من صفحة "إعدادات الشركة"، وإضافة مهندسي موقعك وتعيين مشاريعكم بكل سهولة.*

نتمنى لكم تجربة عمل متميزة ومثمرة! 🤝`;
}

function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// توليد مشاريع واقعية خاصة بكل شركة حسب مدينتها
// توليد مشاريع واقعية عامة لأي شركة حسب بياناتها
function generateCompanySeedProjects(companyId, tenant) {
  if (!companyId) return [];
  const compPrefix = companyId.replace(/^comp_/, '');
  const compName = tenant?.name || 'الشركة';
  const compCity = tenant?.city || 'الموقع الرئيسي';
  return [
    {
      id: `p_${compPrefix}_1`,
      companyId: companyId,
      name: `مشروع تشطيب فيلا رئيسية — ${compCity}`,
      client: 'أ. عميل المشروع',
      area: compCity,
      type: 'فيلا سكنية',
      engineer: (tenant?.adminName ? 'م. ' + tenant.adminName.replace(/^[أأمم]\.\s*/, '') : 'م. مهندس الموقع'),
      accountant: 'الإدارة المالية',
      techOffice: 'المكتب الفني',
      progress: 50,
      status: 'on_track',
      budget: 950000,
      spent: 420000,
      startDate: '2026-06-01',
      dueDate: '2026-12-30',
      submittals: [
        { item: 'اعتماد المخططات والتصميمات التنفيذية', status: 'approved' },
        { item: 'اعتماد عينات التشطيبات والدهانات', status: 'approved' },
      ],
      files: [],
      snags: [],
      dailyLogs: [
        { id: 'd1', date: todayISO(), author: 'م. مهندس الموقع', work: `متابعة تنفيذ بنود التشطيبات بموقع ${compName}`, issues: 'لا يوجد', workers: 8 }
      ],
    }
  ];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
