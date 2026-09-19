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
export const BUILTIN_SUPERADMIN_EMAILS = ['sicolove7@gmail.com', 'admin@platform.com'];

// حساب مالك المنصة الرئيسي الافتراضي (Super Admin) - بدون أي كلمات مرور
export const DEFAULT_SUPER_ADMIN_ACCOUNT = {
  id: 'super_admin_master',
  email: 'sicolove7@gmail.com',
  name: 'مدير شركة أملاك',
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

    // تصحيح وفصل شركة العين (الإمارات) عن شركة أملاك (القاهرة) بشكل جذري وحقيقي
    const rawTenants = localStorage.getItem(PLATFORM_TENANTS_KEY);
    if (rawTenants) {
      let tList = JSON.parse(rawTenants);
      if (Array.isArray(tList)) {
        let changed = false;

        // 1. إعادة شركة العين إلى هويتها الإماراتية الأصلية
        tList = tList.map(t => {
          if (t.id === 'comp_alain') {
            changed = true;
            return {
              ...t,
              name: 'شركة العين للمقاولات العامة',
              subtitle: 'متخصصون في أعمال البناء والتشطيبات الفاخرة',
              city: 'العين',
              country: 'الإمارات',
              currency: 'د.إ',
              phone: '+971 3 765 4321',
              adminEmail: 'ceo@alain-contract.ae',
              adminName: 'م. سعيد الكعبي',
            };
          }
          if (t.id === 'comp_c_mtyw7mqk' || (t.adminEmail === 'sicolove7@gmail.com' && t.id !== 'comp_alain')) {
            changed = true;
            return {
              ...t,
              id: 'comp_c_mtyw7mqk',
              name: 'شركة أملاك للمقاولات والتشطيبات',
              subtitle: 'متخصصون في تشطيب الشقق والقصور والفلل الفاخرة',
              city: 'القاهرة',
              country: 'مصر',
              currency: 'ج.م',
              adminEmail: 'sicolove7@gmail.com',
              adminName: 'احمد',
              status: 'active',
              plan: 'pro_annual',
            };
          }
          return t;
        });

        // إذا لم تكن شركة أملاك موجودة في القائمة، ندرجها في المقدمة
        if (!tList.some(t => t.id === 'comp_c_mtyw7mqk')) {
          tList.unshift({
            id: 'comp_c_mtyw7mqk',
            name: 'شركة أملاك للمقاولات والتشطيبات',
            subtitle: 'متخصصون في تشطيب الشقق والقصور والفلل الفاخرة',
            city: 'القاهرة',
            country: 'مصر',
            currency: 'ج.م',
            phone: '+20 100 123 4567',
            plan: 'pro_annual',
            planName: 'باقة المحترفين VIP',
            status: 'active',
            startDate: '2026-09-12',
            expiryDate: '2027-09-12',
            primaryColor: '#1877F2',
            accentColor: '#166FE5',
            adminEmail: 'sicolove7@gmail.com',
            adminName: 'احمد',
            projectsCount: 3,
            createdAt: '2026-09-12',
          });
          changed = true;
        }

        if (changed) {
          localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(tList));
        }
      }
    }

    // تصحيح إعدادات شركة العين وإعادتها للإمارات
    const rawAlain = localStorage.getItem('tenant_comp_alain_settings');
    if (rawAlain) {
      let aSettings = JSON.parse(rawAlain);
      if (aSettings && (aSettings.companyName?.includes('أملاك') || aSettings.currency === 'ج.م')) {
        aSettings.companyName = 'شركة العين للمقاولات العامة';
        aSettings.companySubtitle = 'متخصصون في أعمال البناء والتشطيبات الفاخرة';
        aSettings.currency = 'د.إ';
        aSettings.city = 'العين';
        aSettings.country = 'الإمارات';
        aSettings.phone = '+971 3 765 4321';
        localStorage.setItem('tenant_comp_alain_settings', JSON.stringify(aSettings));
      }
    }

    // إعداد وضمان إعدادات شركة أملاك الحقيقية
    let amlakSettings = {
      companyName: 'شركة أملاك للمقاولات والتشطيبات',
      companySubtitle: 'متخصصون في تشطيب الشقق والقصور والفلل الفاخرة',
      city: 'القاهرة',
      country: 'مصر',
      currency: 'ج.م',
      phone: '+20 100 123 4567',
      primaryColor: '#1877F2',
      accentColor: '#166FE5',
      adminEmail: 'sicolove7@gmail.com',
      adminName: 'احمد',
    };
    try {
      const existingAmlak = localStorage.getItem('tenant_comp_c_mtyw7mqk_settings');
      if (existingAmlak) {
        amlakSettings = { ...amlakSettings, ...JSON.parse(existingAmlak), companyName: 'شركة أملاك للمقاولات والتشطيبات', currency: 'ج.م' };
      }
      localStorage.setItem('tenant_comp_c_mtyw7mqk_settings', JSON.stringify(amlakSettings));
    } catch(e) {}

    // توجيه حساب المالك sicolove7@gmail.com إلى شركة أملاك الحقيقية
    const currentActive = localStorage.getItem(ACTIVE_TENANT_ID_KEY);
    if (!currentActive || currentActive === 'comp_alain') {
      localStorage.setItem(ACTIVE_TENANT_ID_KEY, 'comp_c_mtyw7mqk');
    }

    const sessionRaw = localStorage.getItem('active_session_user');
    if (sessionRaw) {
      try {
        const sUser = JSON.parse(sessionRaw);
        if (sUser.email === 'sicolove7@gmail.com' && (sUser.companyId === 'comp_alain' || !sUser.companyId)) {
          sUser.companyId = 'comp_c_mtyw7mqk';
          sUser.companyName = 'شركة أملاك للمقاولات والتشطيبات';
          sUser.currency = 'ج.م';
          localStorage.setItem('active_session_user', JSON.stringify(sUser));
        }
      } catch(e) {}
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
      email: creds.email ? creds.email.toLowerCase().trim() : 'sicolove7@gmail.com',
    };
    localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error saving superadmin profile:", e);
    return false;
  }
}

export const SUPER_ADMIN_ACCOUNT = DEFAULT_SUPER_ADMIN_ACCOUNT;

// الشركات الافتراضية
export const DEFAULT_TENANTS = [
  {
    id: 'comp_c_mtyw7mqk',
    name: 'شركة أملاك للمقاولات والتشطيبات',
    subtitle: 'متخصصون في تشطيب الشقق والقصور والفلل الفاخرة',
    city: 'القاهرة',
    country: 'مصر',
    currency: 'ج.م',
    phone: '+20 100 123 4567',
    plan: 'pro_annual',
    planName: 'باقة المحترفين VIP',
    status: 'active',
    startDate: '2026-09-12',
    expiryDate: '2027-09-12',
    primaryColor: '#1877F2',
    accentColor: '#166FE5',
    adminEmail: 'sicolove7@gmail.com',
    adminName: 'احمد',
    projectsCount: 3,
    createdAt: '2026-09-12',
  },
  {
    id: 'comp_alain',
    name: 'شركة العين للمقاولات العامة',
    subtitle: 'متخصصون في أعمال البناء والتشطيبات الفاخرة',
    city: 'العين',
    country: 'الإمارات',
    currency: 'د.إ',
    phone: '+971 3 765 4321',
    plan: 'pro_annual',
    planName: 'باقة النخبة السنوية VIP',
    status: 'active',
    startDate: '2026-01-01',
    expiryDate: '2027-01-01',
    primaryColor: '#0F766E',
    accentColor: '#14B8A6',
    adminEmail: 'ceo@alain-contract.ae',
    adminName: 'م. سعيد الكعبي',
    projectsCount: 3,
    createdAt: '2026-01-01',
  },
  {
    id: 'comp_dhabi',
    name: 'دار الظبي للديكور والتصميم الداخلي',
    subtitle: 'حلول التصميم الراقي والتشطيبات الفاخرة',
    city: 'أبوظبي',
    country: 'الإمارات',
    currency: 'د.إ',
    phone: '+971 52 987 6543',
    plan: 'pro_annual',
    planName: 'باقة النخبة السنوية VIP',
    status: 'active',
    startDate: '2026-01-10',
    expiryDate: '2027-01-10',
    primaryColor: '#4338CA',
    accentColor: '#6366F1',
    adminEmail: 'admin@dar-dhabi.ae',
    adminName: 'م. عبد الله الظاهري',
    projectsCount: 3,
    createdAt: '2026-01-10',
  },
  {
    id: 'comp_cairo',
    name: 'شركة الأفق للتشطيبات والديكور',
    subtitle: 'رواد التشطيبات المتكاملة والمقاولات',
    city: 'القاهرة',
    country: 'مصر',
    currency: 'ج.م',
    phone: '+20 100 555 1234',
    plan: 'pro_monthly',
    planName: 'باقة المحترفين الشهرية',
    status: 'active',
    startDate: '2026-03-01',
    expiryDate: '2026-12-31',
    primaryColor: '#1B3A4B',
    accentColor: '#C4622D',
    adminEmail: 'admin@al-ofok.com',
    adminName: 'م. شريف عزمي',
    projectsCount: 2,
    createdAt: '2026-03-01',
  }
];

export function loadAllTenants() {
  try {
    const raw = localStorage.getItem(PLATFORM_TENANTS_KEY);
    if (raw) {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // ضمان وجود شركة أملاك الحقيقية في الصدارة
        if (!parsed.some(t => t.id === 'comp_c_mtyw7mqk')) {
          parsed.unshift(DEFAULT_TENANTS[0]);
          try { localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(parsed)); } catch (e) {}
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error loading tenants:", e);
  }
  localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(DEFAULT_TENANTS));
  return [...DEFAULT_TENANTS];
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
      // تأكيد تثبيت شركة أملاك في القائمة
      if (!mergedMap.has('comp_c_mtyw7mqk')) {
        mergedMap.set('comp_c_mtyw7mqk', DEFAULT_TENANTS[0]);
      }
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

  // توليد معرف للشركة
  const slug = 'c_' + Date.now().toString(36);

  const newTenant = createTenant({
    slug,
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
  return localStorage.getItem(ACTIVE_TENANT_ID_KEY) || 'comp_c_mtyw7mqk';
}

export function setActiveTenantId(companyId) {
  localStorage.setItem(ACTIVE_TENANT_ID_KEY, companyId);
}

/**
 * جلب جميع البيانات المعزولة للشركة المحددة
 */
export function getTenantData(companyId) {
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
      companyName: tenant ? tenant.name : (companyId === 'comp_c_mtyw7mqk' ? DEFAULT_TENANTS[0].name : 'شركة المقاولات والتشطيبات'),
      companySubtitle: tenant ? tenant.subtitle : (companyId === 'comp_c_mtyw7mqk' ? DEFAULT_TENANTS[0].subtitle : 'نظام إدارة المشاريع المتكامل'),
      city: tenant?.city || (companyId === 'comp_c_mtyw7mqk' ? DEFAULT_TENANTS[0].city : ''),
      country: tenant?.country || 'مصر',
      currency: tenant?.currency || (companyId === 'comp_c_mtyw7mqk' ? DEFAULT_TENANTS[0].currency : 'ج.م'),
      phone: tenant?.phone || (companyId === 'comp_c_mtyw7mqk' ? DEFAULT_TENANTS[0].phone : ''),
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
    if (tenant) {
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
          email: `eng@${(tenant.adminEmail || '').split('@')[1] || 'site.ae'}`,
          role: 'engineer',
          name: companyId === 'comp_alain' ? 'م. هزاع المنصوري' : (companyId === 'comp_dhabi' ? 'م. عبد الله الظاهري' : 'م. أحمد كامل'),
          engineerName: companyId === 'comp_alain' ? 'م. هزاع المنصوري' : (companyId === 'comp_dhabi' ? 'م. عبد الله الظاهري' : 'م. أحمد كامل'),
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
    if (companyId === 'comp_alain') {
      team = {
        engineers: ['م. أحمد كامل', 'م. ياسر فوزي', 'م. مروة سعيد'],
        accountants: ['أ. سامح فتحي'],
        techOffice: ['م. علياء رمضان'],
        customerService: ['أ. نورا حسن']
      };
    } else if (companyId === 'comp_dhabi') {
      team = {
        engineers: ['م. عبد الله الظاهري', 'م. ناصر الهاشمي', 'م. راشد المزروعي'],
        accountants: ['أ. سلطان القاسمي'],
        techOffice: ['م. شيخة المري'],
        customerService: ['أ. نورة الحوسني']
      };
    } else {
      team = {
        engineers: ['م. أحمد كامل', 'م. ياسر فوزي', 'م. مروة سعيد'],
        accountants: ['أ. سامح فتحي'],
        techOffice: ['م. علياء رمضان'],
        customerService: ['أ. نورا حسن']
      };
    }
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
    if (companyId === 'comp_alain') {
      leads = [
        { id: 'lead_alain_1', name: 'أ. محمد المهدي', phone: '+20 100 111 2233', area: 'التجمع الخامس', type: 'فيلا سكنية', budget: 1500000, source: 'referral', stage: 'quotation', createdAt: '2026-08-20', notes: 'طلب مقايسة تشطيب فيلا كاملة مع حديقة ومسبح.' },
        { id: 'lead_alain_2', name: 'د. هاني شاكر', phone: '+20 102 444 5566', area: 'الشيخ زايد', type: 'شقة دوبلكس', budget: 850000, source: 'facebook', stage: 'inspection', createdAt: '2026-08-24', notes: 'موعد معاينة لرفع مقاسات الشقة.' },
      ];
    } else if (companyId === 'comp_dhabi') {
      leads = [
        { id: 'lead_dhabi_1', name: 'أ. حمد المزروعي', phone: '+971 52 777 8899', area: 'جزيرة السعديات', type: 'بنتهاوس فاخر', budget: 2400000, source: 'website', stage: 'negotiation', createdAt: '2026-08-15', notes: 'مراجعة عينات الرخام والأنظمة الذكية.' },
        { id: 'lead_dhabi_2', name: 'م. مريم الفلاسي', phone: '+971 52 333 4455', area: 'مدينة خليفة أ', type: 'فيلا عصرية', budget: 1200000, source: 'direct_call', stage: 'won', createdAt: '2026-08-10', notes: 'تم توقيع العقد وجاري توريد المواد.' },
      ];
    } else {
      leads = [
        { id: 'lead_cairo_1', name: 'د. طارق المنشاوي', phone: '01012345678', area: 'بيت الوطن', type: 'فيلا', budget: 850000, source: 'facebook', stage: 'quotation', createdAt: '2026-08-20', notes: 'تشطيب الترا سوبر لوكس.' },
        { id: 'lead_cairo_2', name: 'أ. عصام عبد الرحمن', phone: '01234567890', area: 'النرجس', type: 'عيادة طبية', budget: 290000, source: 'instagram', stage: 'won', createdAt: '2026-08-15', notes: 'تم استلام الدفعة الأولى.' },
      ];
    }
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

      // تثبيت اسم شركة أملاك وتحديث السحابة إذا كانت تحمل اسم العين القديم
      if (companyId === 'comp_alain' && (settings.companyName?.includes('العين') || cloudSettings?.companyName?.includes('العين') || settings.companyName !== DEFAULT_TENANTS[0].name)) {
        settings.companyName = DEFAULT_TENANTS[0].name;
        settings.companySubtitle = DEFAULT_TENANTS[0].subtitle;
        settings.city = DEFAULT_TENANTS[0].city;
        settings.country = DEFAULT_TENANTS[0].country;
        settings.currency = DEFAULT_TENANTS[0].currency;
        settings.phone = DEFAULT_TENANTS[0].phone;
        try { syncSettingsToCloud(companyId, settings); } catch (e) {}
      }

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

  // 2. فحص هل هو حساب الـ Super Admin (عبر Custom Claims الموثقة أو بريد المالك المعتمد)
  const isSuperAdminEmail = (superAdmin?.email && cleanEmail === superAdmin.email.toLowerCase().trim()) || BUILTIN_SUPERADMIN_EMAILS.includes(cleanEmail);
  if (claims.role === 'super_admin' || claims.isSuperAdmin || isSuperAdminEmail) {
    const amlakTenant = (tenants && tenants.find(t => t.id === 'comp_c_mtyw7mqk')) ||
                        (tenants && tenants.find(t => t.adminEmail === cleanEmail && t.id !== 'comp_alain')) ||
                        (tenants && tenants.find(t => t.name?.includes('أملاك') || t.name?.includes('املاك'))) ||
                        DEFAULT_TENANTS[0];
    return {
      success: true,
      user: {
        ...superAdmin,
        id: firebaseUid || superAdmin.id,
        email: cleanEmail,
        name: superAdmin.name || 'أحمد - مدير شركة أملاك',
        role: 'super_admin',
        isSuperAdmin: true,
        companyId: amlakTenant?.id || 'comp_c_mtyw7mqk',
        companyName: amlakTenant?.name || 'شركة أملاك للمقاولات والتشطيبات',
        currency: amlakTenant?.currency || 'ج.م',
      },
      tenant: amlakTenant,
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

  // 7. محاولة أخيرة مخصصة لشركة أملاك (comp_c_mtyw7mqk) للتحقق المباشر من السحابة والمحلي
  try {
    const amlakData = await fetchCompanyDataFromCloud('comp_c_mtyw7mqk');
    if (amlakData && Array.isArray(amlakData.users)) {
      const match = amlakData.users.find(isUserMatch);
      if (match) {
        const amlakTenant = (tenants && tenants.find(t => t.id === 'comp_c_mtyw7mqk')) || DEFAULT_TENANTS[0];
        console.log('[resolveTenantUserByEmail] ✅ Found employee in Amlak fallback cloud data:', cleanEmail);
        return {
          success: true,
          user: {
            ...match,
            id: firebaseUid || match.id,
            companyId: 'comp_c_mtyw7mqk',
            companyName: amlakTenant.name || 'شركة أملاك للمقاولات والتشطيبات',
            currency: amlakTenant.currency || 'ج.م',
            role: match.role || 'engineer',
          },
          tenant: amlakTenant,
          isSuperAdmin: false,
        };
      }
    }
  } catch (e) {}

  // ⚠️ أمان حاسم: لم يتم العثور على هذا المستخدم في أي شركة مسجلة
  console.warn('[resolveTenantUserByEmail] No matching company found for user — login blocked:', cleanEmail);
  return {
    success: false,
    error: 'لم يتم ربط هذا الحساب بأي شركة مسجلة في المنصة. يرجى التواصل مع مدير المنصة لإضافة حسابك.',
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
function generateCompanySeedProjects(companyId, tenant) {
  if (companyId === 'comp_c_mtyw7mqk') {
    return [
      {
        id: 'p_cairo_1',
        companyId: 'comp_c_mtyw7mqk',
        name: 'تشطيب شقة دوبلكس - بيت الوطن',
        client: 'د. طارق المنشاوي',
        area: 'التجمع الخامس - القاهرة',
        type: 'شقة دوبلكس',
        engineer: 'م. سيف النيادي',
        accountant: 'أ. سامح فتحي',
        techOffice: 'م. علياء رمضان',
        progress: 60,
        status: 'on_track',
        budget: 850000,
        spent: 510000,
        startDate: '2026-06-01',
        dueDate: '2026-10-30',
        submittals: [
          { item: 'اعتماد رخام امبرادور للدرج الداخلي', status: 'approved' },
          { item: 'لوحة قواطع شنايدر الفرنسية', status: 'approved' }
        ],
        files: [],
        snags: [],
        dailyLogs: [
          { id: 'd1', date: '2026-09-12', author: 'م. أحمد كامل', work: 'سحب أسلاك السويدي وتشطيب وجه أول معجون', issues: 'لا يوجد', workers: 6 }
        ]
      },
      {
        id: 'p1789248269598',
        companyId: 'comp_c_mtyw7mqk',
        name: 'ررر',
        client: 'ررر',
        area: 'الحي الأول',
        type: 'فيلا',
        engineer: 'محمد على',
        accountant: 'أ. سامح فتحي',
        techOffice: 'م. علياء رمضان',
        progress: 0,
        status: 'on_track',
        budget: 450000,
        spent: 0,
        startDate: '2026-09-12',
        dueDate: '2026-12-31',
        submittals: [],
        files: [],
        snags: [],
        dailyLogs: [
          { id: 'd1', date: '2026-09-12', author: 'محمد على', work: 'ءءءءء', issues: '', workers: 5 }
        ]
      },
      {
        id: 'p_cairo_2',
        companyId: 'comp_c_mtyw7mqk',
        name: 'تشطيب فيلا الترا سوبر لوكس - النرجس',
        client: 'أ. حسام الدين',
        area: 'النرجس - القاهرة الجديدة',
        type: 'فيلا مستقلة',
        engineer: 'م. ياسر فوزي',
        accountant: 'أ. سامح فتحي',
        techOffice: 'م. علياء رمضان',
        progress: 85,
        status: 'on_track',
        budget: 1400000,
        spent: 1220000,
        startDate: '2026-02-10',
        dueDate: '2026-09-25',
        submittals: [
          { item: 'اعتماد رخام امبرادور للدرج الداخلي', status: 'approved' }
        ],
        files: [],
        snags: [
          { id: 'snag_1789083440030_q0dk', number: 1, desc: '888', location: 'Room 101', assignee: 'م. ياسر فوزي', status: 'pending', date: '2026-09-10' }
        ],
        dailyLogs: [
          { id: 'd1', date: '2026-09-08', author: 'م. ياسر فوزي', work: 'جلي وتلميع الرخام وتركيب سبوتات الإنارة', issues: 'لا يوجد', workers: 8 }
        ]
      }
    ];
  }

  if (companyId === 'comp_alain') {
    return [
      {
        id: 'p_alain_1',
        companyId: 'comp_alain',
        name: 'تشطيب قصر VIP - حي الفوعة',
        client: 'سعادة محمد الشامسي',
        area: 'الفوعة - العين',
        type: 'قصر VIP',
        engineer: 'م. سعيد الكعبي',
        accountant: 'أ. سلطان الظاهري',
        techOffice: 'م. شيخة المري',
        progress: 70,
        status: 'on_track',
        budget: 1450000,
        spent: 980000,
        startDate: '2026-03-01',
        dueDate: '2026-11-15',
        submittals: [],
        files: [],
        snags: [],
        dailyLogs: []
      },
      {
        id: 'p_alain_2',
        companyId: 'comp_alain',
        name: 'فيلا مودرن - المرخانية',
        client: 'أ. راشد الدرعي',
        area: 'المرخانية - العين',
        type: 'فيلا سكنية',
        engineer: 'م. هزاع المنصوري',
        accountant: 'أ. سلطان الظاهري',
        techOffice: 'م. شيخة المري',
        progress: 45,
        status: 'at_risk',
        budget: 920000,
        spent: 420000,
        startDate: '2026-04-10',
        dueDate: '2026-12-01',
        submittals: [],
        files: [],
        snags: [],
        dailyLogs: []
      },
      {
        id: 'p_alain_3',
        companyId: 'comp_alain',
        name: 'مجلس عربي تراثي ومسبح - زاخر',
        client: 'م. سعيد الكعبي',
        area: 'زاخر - العين',
        type: 'مجلس تراثي ومسبح',
        engineer: 'م. هزاع المنصوري',
        accountant: 'أ. سلطان الظاهري',
        techOffice: 'م. شيخة المري',
        progress: 90,
        status: 'on_track',
        budget: 580000,
        spent: 510000,
        startDate: '2026-01-15',
        dueDate: '2026-08-30',
        submittals: [],
        files: [],
        snags: [],
        dailyLogs: []
      }
    ];
  }

  if (companyId === 'comp_dhabi') {
    return [
      {
        id: 'p_dhabi_1',
        companyId: 'comp_dhabi',
        name: 'بنتهاوس فاخر - جزيرة السعديات',
        client: 'أ. حمد المزروعي',
        area: 'السعديات - أبوظبي',
        type: 'بنتهاوس',
        engineer: 'م. عبد الله الظاهري',
        accountant: 'أ. سلطان القاسمي',
        techOffice: 'م. شيخة المري',
        progress: 75,
        status: 'on_track',
        budget: 2400000,
        spent: 1750000,
        startDate: '2026-03-01',
        dueDate: '2026-10-15',
        submittals: [
          { item: 'اعتماد باركيه البلوط الطبيعي للغرف', status: 'approved' },
          { item: 'نظام الإضاءة المخفية DALI', status: 'approved' },
        ],
        files: [],
        snags: [
          { id: 's1', room: 'تراس الإطلالة البحرية', desc: 'ضبط فواصل تمدد السيراميك الخارجي', status: 'completed', severity: 'low' }
        ],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. عبد الله الظاهري', work: 'تركيب التجاليد الخشبية المخفية للأبواب وبرمجة الشاشات', issues: 'لا يوجد', workers: 14 }
        ],
      },
      {
        id: 'p_dhabi_2',
        companyId: 'comp_dhabi',
        name: 'فيلا عصرية - مدينة خليفة أ',
        client: 'د. خالد الرميثي',
        area: 'مدينة خليفة - أبوظبي',
        type: 'فيلا مستقلة',
        engineer: 'م. ناصر الهاشمي',
        accountant: 'أ. سلطان القاسمي',
        techOffice: 'م. شيخة المري',
        progress: 40,
        status: 'on_track',
        budget: 1650000,
        spent: 660000,
        startDate: '2026-06-15',
        dueDate: '2027-01-20',
        submittals: [
          { item: 'اعتماد سيراميك الحمامات الإسباني', status: 'approved' },
        ],
        files: [],
        snags: [],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. ناصر الهاشمي', work: 'استكمال أعمال التأسيسات والتلييس الميكانيكي', issues: 'لا يوجد', workers: 10 }
        ],
      },
      {
        id: 'p_dhabi_3',
        companyId: 'comp_dhabi',
        name: 'فيلا شاطئ الراحة VIP',
        client: 'سعادة منصور القبيسي',
        area: 'شاطئ الراحة - أبوظبي',
        type: 'فيلا شاطئية',
        engineer: 'م. راشد المزروعي',
        accountant: 'أ. سلطان القاسمي',
        techOffice: 'م. شيخة المري',
        progress: 20,
        status: 'on_track',
        budget: 1950000,
        spent: 390000,
        startDate: '2026-07-20',
        dueDate: '2027-03-30',
        submittals: [
          { item: 'مخططات العزل المائي للأسطح والمسابح', status: 'approved' }
        ],
        files: [],
        snags: [],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. راشد المزروعي', work: 'عزل الأساسات واختبارات الميول', issues: 'لا يوجد', workers: 7 }
        ],
      }
    ];
  }

  if (companyId === 'comp_cairo') {
    return [
      {
        id: 'p_cairo_1',
        companyId: 'comp_cairo',
        name: 'تشطيب شقة دوبلكس - بيت الوطن',
        client: 'د. طارق المنشاوي',
        area: 'التجمع الخامس - القاهرة',
        type: 'شقة دوبلكس',
        engineer: 'م. أحمد كامل',
        accountant: 'أ. سامح فتحي',
        techOffice: 'م. علياء رمضان',
        progress: 60,
        status: 'on_track',
        budget: 850000,
        spent: 510000,
        startDate: '2026-05-01',
        dueDate: '2026-10-30',
        submittals: [
          { item: 'اعتماد عينات بورسلين كليوباترا', status: 'approved' },
          { item: 'لوحة قواطع شنايدر الفرنسية', status: 'approved' },
        ],
        files: [],
        snags: [],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. أحمد كامل', work: 'سحب أسلاك السويدي وتشطيب وجه أول معجون', issues: 'لا يوجد', workers: 6 }
        ],
      },
      {
        id: 'p_cairo_2',
        companyId: 'comp_cairo',
        name: 'تشطيب فيلا الترا سوبر لوكس - النرجس',
        client: 'أ. حسام الدين',
        area: 'النرجس - القاهرة الجديدة',
        type: 'فيلا مستقلة',
        engineer: 'م. ياسر فوزي',
        accountant: 'أ. سامح فتحي',
        techOffice: 'م. علياء رمضان',
        progress: 85,
        status: 'on_track',
        budget: 1400000,
        spent: 1220000,
        startDate: '2026-02-10',
        dueDate: '2026-09-15',
        submittals: [
          { item: 'اعتماد رخام امبرادور للدرج الداخلي', status: 'approved' }
        ],
        files: [],
        snags: [],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. ياسر فوزي', work: 'جلي وتلميع الرخام وتركيب سبوتات الإنارة', issues: 'لا يوجد', workers: 8 }
        ],
      }
    ];
  }

  // مشاريع الشركات المشتركة الخاصة (مثل شركة أملاك وغيرها)
  const compPrefix = companyId.replace(/^comp_/, '');
  const compName = tenant?.name || 'الشركة';
  return [
    {
      id: `p_${compPrefix}_1`,
      companyId: companyId,
      name: `مشروع تشطيب فيلا رئيسية — ${tenant?.city || 'الموقع 1'}`,
      client: 'أ. عميل المشروع',
      area: tenant?.city || 'المركز الرئيسي',
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
