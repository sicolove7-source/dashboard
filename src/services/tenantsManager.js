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
  isDemoProject,
} from './cloudSync';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import defaultTenantsData from './defaultTenantsData.json';
import { getCrossSubdomainCookie, setCrossSubdomainCookie, isCompanySubdomain, getSubdomain } from './subdomainResolver';

export const PLATFORM_TENANTS_KEY = 'platform-tenants-master-v1';
export const ACTIVE_TENANT_ID_KEY = 'platform-active-tenant-id';
export const SUB_ACCOUNTS_ACCESS_KEY = 'platform-subaccounts-access-v2';
// قائمة IDs الشركات المحذوفة نهائياً حتى لا يُعيدها loadAllTenants من DEFAULT_TENANTS
export const DELETED_TENANTS_KEY = 'platform-deleted-tenants-v1';

function getDeletedTenantIds() {
  try {
    const raw = localStorage.getItem(DELETED_TENANTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch (e) { return new Set(); }
}

function addDeletedTenantId(id) {
  try {
    const existing = getDeletedTenantIds();
    existing.add(id);
    localStorage.setItem(DELETED_TENANTS_KEY, JSON.stringify(Array.from(existing)));
  } catch (e) {}
}

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

// مزامنة وفهرسة كافة مستخدمي وموظفي الشركات في السجل المركزي platform-all-users-registry
try {
  if (typeof localStorage !== 'undefined') {

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

    // استعادة كاش الشركات من الكوكي المشترك إذا كان التخزين المحلي فارغاً على هذا النطاق الفرعي
    if (parsed.length === 0 && typeof document !== 'undefined') {
      try {
        const cookieList = getCrossSubdomainCookie('tashteeb_tenants_cache');
        if (Array.isArray(cookieList) && cookieList.length > 0) {
          parsed = cookieList;
        }
        const lastReg = getCrossSubdomainCookie('tashteeb_last_registered_tenant');
        if (lastReg && lastReg.id && !parsed.some(t => t.id === lastReg.id)) {
          parsed.unshift(lastReg);
        }
      } catch (e) {}
    }

    // دمج فوري وتلقائي مع DEFAULT_TENANTS لضمان وجود كل الشركات والـ 13 موظف دائماً
    // لكن نتجاهل أي شركة تم حذفها نهائياً من قِبل مدير المنصة
    const deletedIds = getDeletedTenantIds();
    const map = new Map();
    DEFAULT_TENANTS.forEach(t => {
      if (t?.id && !deletedIds.has(t.id)) map.set(t.id, { ...t });
    });
    parsed.forEach(t => {
      if (t?.id && !deletedIds.has(t.id)) {
        let enhanced = { ...t };
        try {
          const sRaw = localStorage.getItem(`tenant_${t.id}_settings`);
          if (sRaw) {
            const s = JSON.parse(sRaw);
            if (s.companyName && s.companyName !== 'شركة المقاولات' && s.companyName !== 'شركة المقاولات والتشطيبات') {
              enhanced.name = s.companyName;
            }
            if (s.companyLogo) {
              enhanced.logo = s.companyLogo;
            }
            if (s.currency) {
              enhanced.currency = s.currency;
            }
          }
        } catch (e) {}
        if (!map.has(t.id)) {
          map.set(t.id, enhanced);
        } else {
          const defT = map.get(t.id);
          const mergedUsers = mergeUsersPreservingLocal(enhanced.users || [], defT.users || []);
          map.set(t.id, {
            ...defT,
            ...enhanced,
            name: enhanced.name || defT.name,
            logo: enhanced.logo || defT.logo || null,
            users: mergedUsers,
            authorizedEmails: Array.from(new Set([
              ...(defT.authorizedEmails || []),
              ...(enhanced.authorizedEmails || []),
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

            // الحفاظ على الاسم والشعار الأحدث ومنع طمس التعديلات بالاسم الافتراضي
            const isDef = (n) => !n || n === 'شركة المقاولات' || n === 'شركة المقاولات والتشطيبات';
            const safeName = !isDef(t.name) ? t.name : (!isDef(cloudT.name) ? cloudT.name : (t.name || cloudT.name));
            const safeLogo = (t.logo && String(t.logo).trim()) ? t.logo : (cloudT.logo || null);

            mergedMap.set(t.id, {
              ...cloudT,
              ...t,
              name: safeName,
              logo: safeLogo,
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
    const safeCookieList = (tenants || []).map(t => ({
      id: t.id,
      name: t.name,
      subdomain: t.subdomain,
      slug: t.slug,
      logo: t.logo || null,
      primaryColor: t.primaryColor || null,
    }));
    setCrossSubdomainCookie('tashteeb_tenants_cache', safeCookieList);
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
  try {
    setCrossSubdomainCookie('tashteeb_last_registered_tenant', newTenant);
  } catch (e) {}

  // إعداد مستخدمي الشركة (بدون أي كلمات سر كنص صريح - الاعتماد كلياً على Firebase Auth)
  const companyUsers = [
    {
      id: `u_${id}_admin`,
      email: newTenant.adminEmail,
      role: 'owner',
      name: newTenant.adminName,
      engineerName: null,
      companyId: id,
    }
  ];
  if (id === 'comp_demo') {
    companyUsers.push({
      id: `u_${id}_eng1`,
      email: 'site.eng@tashteebpro.com',
      role: 'engineer',
      name: 'مهندس الموقع (تجريبي)',
      engineerName: 'مهندس الموقع (تجريبي)',
      companyId: id,
    });
  }
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
  if (data.seedDemoProject && id === 'comp_demo') {
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
  const password = (formData.password || '').trim();
  const companyName = (formData.companyName || '').trim();
  const adminName = (formData.adminName || '').trim() || 'مدير الشركة';
  const phone = (formData.phone || '').trim();
  const city = (formData.city || 'القاهرة').trim();

  if (!cleanEmail || !companyName) {
    return { success: false, error: 'يرجى إدخال اسم الشركة والبريد الإلكتروني.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'كلمة المرور مطلوبة ويجب أن تتكون من 6 أحرف أو أرقام على الأقل.' };
  }

  if (!phone || phone.length < 8) {
    return { success: false, error: 'يرجى إدخال رقم هاتف وواتساب صالح للتواصل (8 أرقام على الأقل).' };
  }

  const RESERVED_SUBS = [
    'www', 'app', 'api', 'static', 'assets', 'cdn', 'mail', 'portal',
    'admin', 'superadmin', 'platform', 'root', 'dashboard', 'control', 'billing'
  ];
  const rawSubdomain = (formData.subdomain || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '');

  if (!rawSubdomain || rawSubdomain.length < 3) {
    return { success: false, error: 'يرجى تحديد امتداد النطاق الفرعي للشركة بالإنجليزية (3 أحرف على الأقل، مثال: amlak).' };
  }

  if (rawSubdomain.startsWith('-') || rawSubdomain.endsWith('-')) {
    return { success: false, error: 'امتداد النطاق لا يمكن أن يبدأ أو ينتهي بشرطة (-).' };
  }

  if (RESERVED_SUBS.includes(rawSubdomain)) {
    return { success: false, error: `امتداد النطاق (${rawSubdomain}) محجوز لخدمات المنصة. يرجى اختيار امتداد آخر لشركتك.` };
  }

  let allTenants = [];
  try {
    allTenants = await Promise.race([
      loadAllTenantsAsync(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))
    ]);
  } catch (e) {
    allTenants = loadAllTenants();
  }

  const exists = allTenants.some(t => t.adminEmail?.toLowerCase().trim() === cleanEmail);
  if (exists) {
    return { success: false, error: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.' };
  }

  const subExists = allTenants.some(t =>
    (t.subdomain || '').toLowerCase().trim() === rawSubdomain ||
    (t.slug || '').toLowerCase().trim() === rawSubdomain
  );
  if (subExists) {
    return { success: false, error: `النطاق الفرعي (${rawSubdomain}.tashteebpro.com) محجوز لشركة أخرى بالفعل. يرجى اختيار امتداد مختلف.` };
  }

  // =========================================================
  // Step 0: Create real Firebase Auth account
  // Ensures user can log in with email/password from any browser
  // =========================================================
  let firebaseUid = null;
  try {
    const { registerWithEmail, loginWithEmail } = await import('./auth');
    const authResult = await registerWithEmail(cleanEmail, password);
    if (authResult.success && authResult.user) {
      firebaseUid = authResult.user.uid;
      console.log('[registerNewTenant] Firebase Auth account created, UID:', firebaseUid);
    } else if (authResult.code === 'auth/email-already-in-use') {
      console.log('[registerNewTenant] Firebase Auth account already exists, verifying credentials...');
      const loginAttempt = await loginWithEmail(cleanEmail, password);
      if (loginAttempt.success && loginAttempt.user) {
        firebaseUid = loginAttempt.user.uid;
      } else {
        return { success: false, error: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.' };
      }
    } else {
      console.warn('[registerNewTenant] Firebase Auth error:', authResult.error);
      const isDbClosing = String(authResult.error || '').includes('closing') || String(authResult.error || '').includes('hidden');
      if (isDbClosing) {
        try {
          const fallback = await loginWithEmail(cleanEmail, password);
          if (fallback.success && fallback.user) {
            firebaseUid = fallback.user.uid;
            console.log('[registerNewTenant] Fallback login succeeded after transient DB notice, UID:', firebaseUid);
          } else {
            return { success: false, error: 'حدثت استجابة متأخرة أثناء حفظ بيانات الجلسة بالمتصفح. يرجى إعادة المحاولة.' };
          }
        } catch (e) {
          return { success: false, error: 'حدثت استجابة متأخرة أثناء حفظ بيانات الجلسة بالمتصفح. يرجى إعادة المحاولة.' };
        }
      } else {
        return { success: false, error: authResult.error || 'تعذر إنشاء الحساب في نظام المصادقة.' };
      }
    }
  } catch (authErr) {
    console.warn('[registerNewTenant] Firebase Auth exception:', authErr?.message);
  }

  const newTenant = createTenant({
    slug: rawSubdomain,
    subdomain: rawSubdomain,
    name: companyName,
    subtitle: 'نظام إدارة المقاولات والتشطيبات والمشاريع',
    city,
    country: 'مصر',
    currency: 'ج.م',
    phone,
    adminEmail: cleanEmail,
    adminName,
    plan: 'trial',
    seedDemoProject: true,
  });

  const user = {
    id: firebaseUid || `u_${newTenant.id}_admin`,
    email: newTenant.adminEmail,
    name: newTenant.adminName,
    phone: phone || null,
    role: 'owner',
    companyId: newTenant.id,
    companyName: newTenant.name,
    currency: newTenant.currency || 'ج.م',
  };

  // Step 1: Write immediately to tenant_directory/{subdomain} in Firestore (Guaranteed Cross-Browser Discovery)
  try {
    const tenantDirRef = doc(db, 'tenant_directory', rawSubdomain);
    await Promise.race([
      setDoc(tenantDirRef, {
        companyId: newTenant.id,
        name: newTenant.name,
        logo: newTenant.logo || null,
        subdomain: rawSubdomain,
        adminEmail: cleanEmail,
        adminName: adminName,
        phone: phone || null,
        currency: newTenant.currency || 'ج.م',
        createdAt: new Date().toISOString(),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
    console.log('[registerNewTenant] ✅ tenant_directory created successfully for:', rawSubdomain);
  } catch (dirErr) {
    console.warn('[registerNewTenant] tenant_directory write notice:', dirErr?.message);
  }

  setActiveTenantId(newTenant.id);
  try {
    const safeLastReg = {
      id: newTenant.id,
      name: newTenant.name,
      subdomain: newTenant.subdomain,
      slug: newTenant.slug,
      logo: newTenant.logo || null,
      primaryColor: newTenant.primaryColor || null,
      adminEmail: cleanEmail,
      adminName: adminName,
    };
    setCrossSubdomainCookie('tashteeb_last_registered_tenant', safeLastReg);
  } catch (e) {}

  try {
    const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
    reg[cleanEmail] = { ...user, companyId: newTenant.id };
    if (phone) {
      const cPhone = cleanPhoneNumber(phone);
      if (cPhone) reg['phone_' + cPhone] = { ...user, companyId: newTenant.id };
    }
    localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));
  } catch (e) {}

  // Non-blocking background syncs - completely independent from UI response
  setTimeout(() => {
    try {
      const allTenantsFresh = loadAllTenants();
      const tenantWithUsers = allTenantsFresh.map(t => {
        if (t.id === newTenant.id) {
          return {
            ...t,
            users: [{ ...user, phone: phone || null }],
            authorizedEmails: [user.email],
            adminEmail: user.email,
          };
        }
        return t;
      });
      syncTenantsListToCloud(tenantWithUsers).catch(() => {});
      syncTenantUsersToCloud(newTenant.id, [{ ...user, phone: phone || null }]).catch(() => {});
    } catch (e) {}

    if (firebaseUid) {
      import('./auth').then(({ callAssignUserClaims }) => {
        callAssignUserClaims({
          targetUid: firebaseUid,
          companyId: newTenant.id,
          role: 'owner',
          companyName: newTenant.name,
          currency: newTenant.currency || 'ج.م',
        }).catch(() => {});
      }).catch(() => {});
    }
  }, 50);

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
  // تسجيل الشركة في قائمة المحذوفات أولاً لمنع إعادتها من DEFAULT_TENANTS
  addDeletedTenantId(id);
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
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage.getItem(ACTIVE_TENANT_ID_KEY) || null;
    }
  } catch (e) {}
  return null;
}

export function setActiveTenantId(companyId) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (companyId) {
        localStorage.setItem(ACTIVE_TENANT_ID_KEY, companyId);
        localStorage.setItem('tashteeb_active_company_id', companyId);
      } else {
        localStorage.removeItem(ACTIVE_TENANT_ID_KEY);
        localStorage.removeItem('tashteeb_active_company_id');
      }
    }
  } catch (e) {}
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
  const cleanTarget = String(companyId).replace(/^comp_/, '');
  const isMatch = (t) => {
    if (!t) return false;
    const tId = String(t.id || t.companyId || '').trim();
    const cleanTId = tId.replace(/^comp_/, '');
    return tId === companyId || cleanTId === cleanTarget;
  };
  const tenant = tenants.find(isMatch);

  // 1. الإعدادات والعملة
  let settings = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_settings`) ||
                (!companyId.startsWith('comp_') ? localStorage.getItem(`tenant_comp_${companyId}_settings`) : null) ||
                (companyId.startsWith('comp_') ? localStorage.getItem(`tenant_${companyId.replace(/^comp_/, '')}_settings`) : null);
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
      companyLogo: tenant?.logo || null,
    };
  } else {
    if (!settings.companyLogo && tenant?.logo) {
      settings.companyLogo = tenant.logo;
    }
    if (tenant && settings.companyName && tenant.name !== settings.companyName) {
      tenant.name = settings.companyName;
    }
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

  // تصفية أي مشاريع تجريبية قديمة تسربت للشركات الحقيقية
  if (Array.isArray(projects) && companyId !== 'comp_demo') {
    projects = projects.filter(p => !isDemoProject(p));
  }

  if (!projects || projects.length === 0) {
    // فقط نُنشئ مشاريع تجريبية إذا كانت الشركة هي الشركة التجريبية النموذجية
    if (tenant && (tenant.id === 'comp_demo' || tenant.slug === 'demo')) {
      projects = generateCompanySeedProjects(companyId, tenant);
      try { localStorage.setItem(`tenant_${companyId}_projects`, JSON.stringify(projects)); } catch (e) {}
    } else {
      projects = []; // شركة حقيقية: تبدأ دائماً فارغة بدون أي مشاريع افتراضية
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
    const subProjects = await fetchProjectsFromCloud(companyId);

    if (cloud || Array.isArray(subProjects)) {
      const tenants = await loadAllTenantsAsync();
      // لا نستخدم tenants[0] كـ fallback لأن ذلك يُعطي بيانات شركة خاطئة
      const tenant = tenants.find(t => t.id === companyId) || null;

      const localFallback = getTenantData(companyId);
      const localSettings = localFallback?.settings;
      const rawCloudSettings = cloud?.settings || (cloud?.name ? { companyName: cloud.name, companyLogo: cloud.logo, currency: cloud.currency } : null);
      const cloudSettings = rawCloudSettings ? { ...rawCloudSettings } : null;
      const isDefaultName = (n) => !n || n === 'شركة المقاولات' || n === 'شركة المقاولات والتشطيبات' || String(n).includes('المقاولات النموذجية') || n === 'شركة جديدة';
      if (cloud?.name && (!cloudSettings?.companyName || isDefaultName(cloudSettings.companyName))) {
        if (cloudSettings) cloudSettings.companyName = cloud.name;
      }

      // مقارنة تاريخ التعديل لضمان عدم إتلاف التعديلات الأحدث
      const localTime = localSettings?.updatedAt ? new Date(localSettings.updatedAt).getTime() : 0;
      const cloudTime = cloudSettings?.updatedAt ? new Date(cloudSettings.updatedAt).getTime() : 0;
      const isLocalNewer = localTime > cloudTime;

      // الحفاظ على الشعار: إذا كان الشعار موجوداً في أي من المكانين نتمسك به دائماً
      let mergedLogo = null;
      if (cloudSettings?.companyLogo && String(cloudSettings.companyLogo).trim()) {
        mergedLogo = cloudSettings.companyLogo;
      }
      if (!mergedLogo && localSettings?.companyLogo && String(localSettings.companyLogo).trim()) {
        mergedLogo = localSettings.companyLogo;
      }
      if (!mergedLogo && tenant?.logo && String(tenant.logo).trim()) {
        mergedLogo = tenant.logo;
      }

      // الحفاظ على اسم الشركة المخصص ومنع طمسه بالاسم الافتراضي القديم أو التجريبي
      let mergedName = 'شركة المقاولات';
      if (isLocalNewer && !isDefaultName(localSettings?.companyName)) {
        mergedName = localSettings.companyName;
      } else if (!isDefaultName(cloudSettings?.companyName)) {
        mergedName = cloudSettings.companyName;
      } else if (!isDefaultName(localSettings?.companyName)) {
        mergedName = localSettings.companyName;
      } else if (!isDefaultName(tenant?.name)) {
        mergedName = tenant.name;
      }

      const baseSettings = isLocalNewer
        ? { ...(cloudSettings || {}), ...(localSettings || {}) }
        : { ...(localSettings || {}), ...(cloudSettings || {}) };

      const settings = {
        companyName: mergedName,
        companySubtitle: baseSettings.companySubtitle || tenant?.subtitle || 'نظام إدارة المشاريع',
        city: baseSettings.city || tenant?.city || '',
        country: baseSettings.country || tenant?.country || 'مصر',
        currency: baseSettings.currency || tenant?.currency || 'ج.م',
        phone: baseSettings.phone || tenant?.phone || '',
        primaryColor: baseSettings.primaryColor || tenant?.primaryColor || '#1877F2',
        accentColor: baseSettings.accentColor || tenant?.accentColor || '#166FE5',
        ...baseSettings,
        companyName: mergedName,
        companyLogo: mergedLogo,
        updatedAt: isLocalNewer ? (localSettings?.updatedAt || new Date().toISOString()) : (cloudSettings?.updatedAt || new Date().toISOString()),
      };

      // مزامنة اسم وشعار الشركة في سجل الـ Tenant إذا تم تعديله
      if (tenant) {
        if (settings.companyName && tenant.name !== settings.companyName) {
          tenant.name = settings.companyName;
        }
        if (settings.companyLogo && tenant.logo !== settings.companyLogo) {
          tenant.logo = settings.companyLogo;
        }
      }

      // مزامنة فورية في قائمة الشركات المركزية PLATFORM_TENANTS_KEY
      try {
        const rawTenants = localStorage.getItem(PLATFORM_TENANTS_KEY);
        if (rawTenants) {
          const tList = JSON.parse(rawTenants);
          if (Array.isArray(tList)) {
            let changed = false;
            const updatedTList = tList.map(t => {
              if (t.id === companyId) {
                changed = true;
                return {
                  ...t,
                  name: settings.companyName || t.name,
                  logo: settings.companyLogo || t.logo,
                  currency: settings.currency || t.currency,
                };
              }
              return t;
            });
            if (changed) {
              localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(updatedTList));
            }
          }
        }
      } catch (e) {}

      if ((localSettings?.companyLogo && !cloudSettings?.companyLogo) ||
          (isLocalNewer && localSettings?.companyName !== cloudSettings?.companyName)) {
        try { syncSettingsToCloud(companyId, settings); } catch (e) {}
      }
      const rawUsers = Array.isArray(cloud?.users) && cloud.users.length > 0 ? cloud.users : null;
      const mergedUsers = sanitizeCompanyUsersForCloud(mergeUsersPreservingLocal(localFallback.users, rawUsers));
      const mergedTeam = mergeTeamsPreservingLocal(localFallback.team, cloud?.team, mergedUsers);
      const leads = Array.isArray(cloud?.leads) ? cloud.leads : null;
      const cloudProjects = Array.isArray(subProjects)
        ? subProjects
        : (Array.isArray(cloud?.projects) ? cloud.projects : null);

      const projects = cloudProjects !== null
        ? mergeProjectsPreservingLocal(localFallback.projects, cloudProjects, companyId)
        : localFallback.projects;

      // تحديث الـ LocalStorage Cache في كافة المفاتيح المعنية
      if (settings) {
        try {
          const rawS = JSON.stringify(settings);
          localStorage.setItem(`tenant_${companyId}_settings`, rawS);
          if (!companyId.startsWith('comp_')) {
            localStorage.setItem(`tenant_comp_${companyId}_settings`, rawS);
          } else {
            localStorage.setItem(`tenant_${companyId.replace(/^comp_/, '')}_settings`, rawS);
          }
        } catch (e) {}
      }
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
export function getTenantCurrentName(t) {
  if (!t) return 'الشركة';
  try {
    const sRaw = localStorage.getItem(`tenant_${t.id}_settings`) ||
                 (t.id && !t.id.startsWith('comp_') ? localStorage.getItem(`tenant_comp_${t.id}_settings`) : null) ||
                 (t.id && t.id.startsWith('comp_') ? localStorage.getItem(`tenant_${t.id.replace(/^comp_/, '')}_settings`) : null);
    if (sRaw) {
      const s = JSON.parse(sRaw);
      if (s.companyName && s.companyName !== 'شركة المقاولات' && s.companyName !== 'شركة المقاولات والتشطيبات') {
        return s.companyName;
      }
    }
  } catch (e) {}
  return t.name || 'الشركة';
}

export function getTenantCurrentLogo(t) {
  if (!t) return null;
  try {
    const sRaw = localStorage.getItem(`tenant_${t.id}_settings`) ||
                 (t.id && !t.id.startsWith('comp_') ? localStorage.getItem(`tenant_comp_${t.id}_settings`) : null) ||
                 (t.id && t.id.startsWith('comp_') ? localStorage.getItem(`tenant_${t.id.replace(/^comp_/, '')}_settings`) : null);
    if (sRaw) {
      const s = JSON.parse(sRaw);
      if (s.companyLogo) return s.companyLogo;
    }
  } catch (e) {}
  return t.logo || null;
}

export async function resolveTenantUserByEmail(email, firebaseUid = '', claims = {}) {
  const cleanEmail = (email || '').toLowerCase().trim();

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
      if (uEmail) {
        const prefix = uEmail.split('@')[0].replace('phone_', '');
        if (cleanPhoneNumber(prefix) === phoneFromEmail) return true;
      }
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

  // 2. فحص هل هو حساب الـ Super Admin (عبر Custom Claims المشفرة أو البريد المعتمد للمالك الرئيسي)
  const isSuperAdminUser = Boolean(
    claims.role === 'super_admin' ||
    claims.isSuperAdmin === true ||
    cleanEmail === 'sicolove7@gmail.com'
  );

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
        name: claims.name || cleanEmail.split('@')[0],
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

    // جلب اسم وشعار الشركة من Firestore مباشرة لضمان التوافق عبر جميع المتصفحات
    let cloudCompanyName = null;
    let cloudCompanyLogo = null;
    try {
      const { fetchCompanyDataFromCloud } = await import('./cloudSync');
      const compCloud = await fetchCompanyDataFromCloud(claims.companyId);
      if (compCloud?.settings?.companyName) cloudCompanyName = compCloud.settings.companyName;
      if (compCloud?.name && !cloudCompanyName) cloudCompanyName = compCloud.name;
      if (compCloud?.settings?.companyLogo) cloudCompanyLogo = compCloud.settings.companyLogo;
      if (compCloud?.logo && !cloudCompanyLogo) cloudCompanyLogo = compCloud.logo;
      // حفظ محلي لتسريع الزيارات التالية
      if (compCloud?.settings) {
        try {
          localStorage.setItem(`tenant_${claims.companyId}_settings`, JSON.stringify(compCloud.settings));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[resolveTenantUserByEmail] Could not fetch company from cloud:', e?.message);
    }

    if (claimTenant) {
      const compName = cloudCompanyName || getTenantCurrentName(claimTenant);
      const compLogo = cloudCompanyLogo || getTenantCurrentLogo(claimTenant);
      return {
        success: true,
        user: {
          id: firebaseUid || `u_${claimTenant.id}_${claims.role || 'user'}`,
          email: cleanEmail,
          name: cleanEmail === claimTenant.adminEmail ? claimTenant.adminName : (claims.name || cleanEmail.split('@')[0]),
          role: claims.role || 'owner',
          companyId: claimTenant.id,
          companyName: compName,
          currency: claimTenant.currency || 'ج.م',
        },
        tenant: {
          ...claimTenant,
          name: compName,
          logo: compLogo,
        },
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
        companyName: cloudCompanyName || claims.companyName || claims.companyId,
        currency: claims.currency || 'ج.م',
      },
      tenant: cloudCompanyName ? {
        id: claims.companyId,
        name: cloudCompanyName,
        logo: cloudCompanyLogo,
      } : null,
      isSuperAdmin: false,
    };
  }

  // 3.5. أولوية مطلقة لسياق النطاق الفرعي للشركة (Subdomain Context Priority)
  // إذا كان المستخدم داخل رابط شركة مخصص (مثل amlak.tashteebpro.com أو ?subdomain=amlak)
  // نتحقق أولاً مما إذا كان ينتمي لهذه الشركة المحددة لمنع أي تداخل مع شركات أخرى على المنصة
  const currentSub = getSubdomain();
  if (currentSub && currentSub !== 'admin') {
    let subTenant = tenants.find(t =>
      (t.subdomain || '').toLowerCase().trim() === currentSub ||
      (t.slug || '').toLowerCase().trim() === currentSub ||
      (t.id || '').toLowerCase().trim() === currentSub ||
      (t.id || '').toLowerCase().trim() === `comp_${currentSub}` ||
      (t.id || '').toLowerCase().trim() === `comp_c_${currentSub}`
    );

    if (!subTenant) {
      try {
        const { doc: fDoc, getDoc: fGetDoc } = await import('firebase/firestore');
        const sSnap = await Promise.race([
          fGetDoc(fDoc(db, 'tenant_directory', currentSub)),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))
        ]);
        if (sSnap && sSnap.exists()) {
          const sData = sSnap.data();
          subTenant = {
            id: sData.companyId || `comp_${currentSub}`,
            name: sData.name || currentSub,
            subdomain: currentSub,
            slug: currentSub,
            logo: sData.logo || null,
            adminEmail: sData.adminEmail || '',
            adminName: sData.adminName || cleanEmail.split('@')[0],
            currency: sData.currency || 'ج.م',
            phone: sData.phone || null,
            status: 'active',
          };
        }
      } catch (e) {}
    }

    if (subTenant) {
      // أ) هل هو مالك هذه الشركة؟
      if (isTenantAdminMatch(subTenant) || (subTenant.adminEmail && subTenant.adminEmail.toLowerCase().trim() === cleanEmail)) {
        const compName = getTenantCurrentName(subTenant);
        const compLogo = getTenantCurrentLogo(subTenant);
        return {
          success: true,
          user: {
            id: firebaseUid || `u_${subTenant.id}_admin`,
            email: cleanEmail,
            phone: subTenant.phone || phoneFromEmail,
            name: subTenant.adminName || 'مدير الشركة',
            role: 'owner',
            companyId: subTenant.id,
            companyName: compName,
            currency: subTenant.currency || 'ج.م',
          },
          tenant: {
            ...subTenant,
            name: compName,
            logo: compLogo,
          },
          isSuperAdmin: false,
        };
      }

      // ب) هل هو موظف مسجل في هذه الشركة؟
      let subUsers = Array.isArray(subTenant.users) ? [...subTenant.users] : [];
      try {
        const rawU = localStorage.getItem(`tenant_${subTenant.id}_users`);
        if (rawU) {
          const parsed = JSON.parse(rawU);
          if (Array.isArray(parsed)) subUsers = mergeUsersPreservingLocal(parsed, subUsers);
        }
      } catch (e) {}
      const subUserMatch = subUsers.find(isUserMatch);
      if (subUserMatch) {
        const compName = getTenantCurrentName(subTenant);
        const compLogo = getTenantCurrentLogo(subTenant);
        return {
          success: true,
          user: {
            ...subUserMatch,
            id: firebaseUid || subUserMatch.id,
            companyId: subTenant.id,
            companyName: compName,
            currency: subTenant.currency || 'ج.م',
            role: subUserMatch.role || 'engineer',
          },
          tenant: {
            ...subTenant,
            name: compName,
            logo: compLogo,
          },
          isSuperAdmin: false,
        };
      }
    }
  }

  // 4. أولوية مطلقة: هل هذا المستخدم مالك (Owner / Admin) لأي شركة مسجلة محلياً؟
  for (const t of tenants) {
    if (isTenantAdminMatch(t)) {
      const compName = getTenantCurrentName(t);
      const compLogo = getTenantCurrentLogo(t);
      return {
        success: true,
        user: {
          id: firebaseUid || `u_${t.id}_admin`,
          email: t.adminEmail,
          phone: t.phone,
          name: t.adminName || 'مدير الشركة',
          role: 'owner',
          companyId: t.id,
          companyName: compName,
          currency: t.currency || 'ج.م',
        },
        tenant: {
          ...t,
          name: compName,
          logo: compLogo,
        },
        isSuperAdmin: false,
      };
    }
  }

  // 4.5. فحص دليل الشركات السحابي tenant_directory بالبريد كمالك (Cross-Browser Discovery)
  // يضمن التعرف الفوري على حساب مالك الشركة على أي متصفح جديد كلياً قبل فحص قوائم الموظفين
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const q = query(collection(db, 'tenant_directory'), where('adminEmail', '==', cleanEmail));
    const qSnap = await Promise.race([
      getDocs(q),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);

    if (qSnap && !qSnap.empty) {
      const tDoc = qSnap.docs[0].data();
      if (tDoc && tDoc.companyId) {
        console.log('[resolveTenantUserByEmail] ✅ Found company in tenant_directory:', tDoc.companyId, cleanEmail);
        const resolvedTenant = {
          id: tDoc.companyId,
          name: tDoc.name || tDoc.subdomain,
          subdomain: tDoc.subdomain,
          slug: tDoc.subdomain,
          logo: tDoc.logo || null,
          adminEmail: cleanEmail,
          adminName: tDoc.adminName || cleanEmail.split('@')[0],
          currency: tDoc.currency || 'ج.م',
          phone: tDoc.phone || null,
          status: 'active',
          plan: 'trial',
        };

        try {
          const currentList = loadAllTenants();
          if (!currentList.some(t => t.id === resolvedTenant.id)) {
            saveAllTenants([resolvedTenant, ...currentList]);
          }
        } catch (e) {}

        try {
          if (!localStorage.getItem(`tenant_${resolvedTenant.id}_settings`)) {
            localStorage.setItem(`tenant_${resolvedTenant.id}_settings`, JSON.stringify({
              companyName: resolvedTenant.name,
              subdomain: resolvedTenant.subdomain,
              adminEmail: cleanEmail,
              adminName: resolvedTenant.adminName,
              currency: resolvedTenant.currency,
              phone: resolvedTenant.phone,
              city: 'القاهرة',
            }));
          }
          if (!localStorage.getItem(`tenant_${resolvedTenant.id}_users`)) {
            localStorage.setItem(`tenant_${resolvedTenant.id}_users`, JSON.stringify([{
              id: firebaseUid || `u_${resolvedTenant.id}_admin`,
              email: cleanEmail,
              name: resolvedTenant.adminName,
              role: 'owner',
              companyId: resolvedTenant.id,
            }]));
          }
          if (!localStorage.getItem(`tenant_${resolvedTenant.id}_projects`)) {
            localStorage.setItem(`tenant_${resolvedTenant.id}_projects`, JSON.stringify([]));
          }
        } catch (e) {}

        setActiveTenantId(resolvedTenant.id);

        return {
          success: true,
          user: {
            id: firebaseUid || `u_${resolvedTenant.id}_admin`,
            email: cleanEmail,
            name: resolvedTenant.adminName,
            role: 'owner',
            companyId: resolvedTenant.id,
            companyName: resolvedTenant.name,
            currency: resolvedTenant.currency,
          },
          tenant: resolvedTenant,
          isSuperAdmin: false,
        };
      }
    }
  } catch (dirErr) {
    console.warn('[resolveTenantUserByEmail] tenant_directory search notice:', dirErr?.message);
  }

  // 5. فحص دليل المستخدمين السحابي المركزي أولاً (Direct Cloud Directory Lookup)
  try {
    let cloudUser = null;
    if (cleanEmail.includes('@') && !cleanEmail.endsWith('@tashteeb.app')) {
      cloudUser = await fetchUserFromCloudDirectory(cleanEmail, currentSub);
    }
    if (!cloudUser && phoneFromEmail) {
      cloudUser = await fetchUserByPhoneFromCloudDirectory(phoneFromEmail);
    }
    if (!cloudUser && cleanEmail.endsWith('@tashteeb.app')) {
      cloudUser = await fetchUserFromCloudDirectory(cleanEmail, currentSub);
    }

    if (cloudUser && cloudUser.companyId) {
      const matchTenant = tenants.find(t => t.id === cloudUser.companyId) || {
        id: cloudUser.companyId,
        name: cloudUser.companyName || 'الشركة',
        currency: cloudUser.currency || 'ج.م',
      };
      const compName = getTenantCurrentName(matchTenant);
      const compLogo = getTenantCurrentLogo(matchTenant);
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
          companyName: compName || matchTenant.name || cloudUser.companyName,
          currency: matchTenant.currency || cloudUser.currency || 'ج.م',
        },
        tenant: {
          ...matchTenant,
          name: compName,
          logo: compLogo,
        },
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
          const compName = getTenantCurrentName(matchTenant);
          const compLogo = getTenantCurrentLogo(matchTenant);
          console.log('[resolveTenantUserByEmail] Found user in platform-all-users-registry:', cleanEmail, 'role:', u.role, 'company:', matchTenant.id);
          return {
            success: true,
            user: {
              ...u,
              id: firebaseUid || u.id,
              role: u.role || 'engineer',
              companyId: matchTenant.id,
              companyName: compName || matchTenant.name || u.companyName,
              currency: matchTenant.currency || u.currency || 'ج.م',
            },
            tenant: {
              ...matchTenant,
              name: compName,
              logo: compLogo,
            },
            isSuperAdmin: false,
          };
        }
      }
    }
  } catch(e) {}

  // 6. فحص كافة الشركات المسجلة: التحقق من المالك أولاً ثم أعضاء الفريق
  for (const t of tenants) {
    // أ) هل هو مالك الشركة (Owner / Admin) — فحص ذاكرة فوري فائق السرعة
    if (isTenantAdminMatch(t)) {
      const compName = getTenantCurrentName(t);
      const compLogo = getTenantCurrentLogo(t);
      return {
        success: true,
        user: {
          id: firebaseUid || `u_${t.id}_admin`,
          email: t.adminEmail,
          phone: t.phone,
          name: t.adminName || 'مدير الشركة',
          role: 'owner',
          companyId: t.id,
          companyName: compName,
          currency: t.currency || 'ج.م',
        },
        tenant: {
          ...t,
          name: compName,
          logo: compLogo,
        },
        isSuperAdmin: false,
      };
    }

    // ب) التحقق من قائمة المستخدمين والموظفين
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

    if (match) {
      console.log('[resolveTenantUserByEmail] ✅ Found employee in company users:', cleanEmail, 'company:', t.id, 'role:', match.role);

      try {
        localStorage.setItem(`tenant_${t.id}_users`, JSON.stringify(users));
        const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
        reg[cleanEmail] = { ...match, companyId: t.id };
        if (phoneFromEmail) {
          reg['phone_' + phoneFromEmail] = { ...match, companyId: t.id };
        }
        localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));
      } catch (e) {}

      const compName = getTenantCurrentName(t);
      const compLogo = getTenantCurrentLogo(t);
      return {
        success: true,
        user: {
          ...match,
          id: firebaseUid || match.id,
          companyId: t.id,
          companyName: compName,
          currency: t.currency || 'ج.م',
          role: match.role || 'engineer',
        },
        tenant: {
          ...t,
          name: compName,
          logo: compLogo,
        },
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
              const compName = getTenantCurrentName(matchedTenant);
              const compLogo = getTenantCurrentLogo(matchedTenant);
              console.log('[resolveTenantUserByEmail] ✅ Found user in local storage key:', k, cleanEmail);
              return {
                success: true,
                user: {
                  ...m,
                  id: firebaseUid || m.id,
                  companyId: cId,
                  companyName: compName,
                  currency: matchedTenant.currency || 'ج.م',
                  role: m.role || 'engineer'
                },
                tenant: {
                  ...matchedTenant,
                  name: compName,
                  logo: compLogo,
                },
                isSuperAdmin: false
              };
            }
          }
        } catch(e) {}
      }
    }
  } catch(e) {}

  // 8. فحص سياق السب-دومين والتسجيل الحديث (Subdomain Context & Cross-Domain Recovery)
  try {
    const currentSub = isCompanySubdomain() ? getSubdomain() : null;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const paramTenantId = urlParams?.get('tenant_id');
    const paramCompName = urlParams?.get('company_name');

    // أ) فحص آخر شركة تم تسجيلها من الكوكي المشترك
    const lastRegTenant = getCrossSubdomainCookie('tashteeb_last_registered_tenant');
    if (lastRegTenant && (
      lastRegTenant.adminEmail?.toLowerCase().trim() === cleanEmail ||
      (currentSub && lastRegTenant.subdomain?.toLowerCase() === currentSub) ||
      (paramTenantId && lastRegTenant.id === paramTenantId)
    )) {
      console.log('[resolveTenantUserByEmail] ✅ Resolved via cross-subdomain registration cookie:', lastRegTenant.id);
      const currentList = loadAllTenants();
      if (!currentList.some(t => t.id === lastRegTenant.id)) {
        saveAllTenants([lastRegTenant, ...currentList]);
      }
      const compName = getTenantCurrentName(lastRegTenant);
      const compLogo = getTenantCurrentLogo(lastRegTenant);
      return {
        success: true,
        user: {
          id: firebaseUid || `u_${lastRegTenant.id}_admin`,
          email: cleanEmail,
          name: lastRegTenant.adminName || cleanEmail.split('@')[0],
          role: 'owner',
          companyId: lastRegTenant.id,
          companyName: compName || lastRegTenant.name,
          currency: lastRegTenant.currency || 'ج.م',
        },
        tenant: {
          ...lastRegTenant,
          name: compName || lastRegTenant.name,
          logo: compLogo || lastRegTenant.logo || null,
        },
        isSuperAdmin: false,
      };
    }

    // ب) فحص كاش الشركات المشترك من الكوكي
    const cookieTenants = getCrossSubdomainCookie('tashteeb_tenants_cache');
    if (Array.isArray(cookieTenants) && cookieTenants.length > 0) {
      const matchCookieTenant = cookieTenants.find(t => {
        if (!t) return false;
        if (t.adminEmail?.toLowerCase().trim() === cleanEmail) return true;
        if (currentSub && (t.subdomain?.toLowerCase() === currentSub || t.slug?.toLowerCase() === currentSub)) return true;
        if (Array.isArray(t.users) && t.users.some(u => (u.email || '').toLowerCase().trim() === cleanEmail)) return true;
        return false;
      });
      if (matchCookieTenant) {
        console.log('[resolveTenantUserByEmail] ✅ Resolved via cross-subdomain tenants cache:', matchCookieTenant.id);
        const matchUser = Array.isArray(matchCookieTenant.users) 
          ? matchCookieTenant.users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail)
          : null;
        const compName = getTenantCurrentName(matchCookieTenant);
        const compLogo = getTenantCurrentLogo(matchCookieTenant);
        return {
          success: true,
          user: {
            id: firebaseUid || matchUser?.id || `u_${matchCookieTenant.id}_user`,
            email: cleanEmail,
            name: matchUser?.name || matchCookieTenant.adminName || cleanEmail.split('@')[0],
            role: matchUser?.role || (matchCookieTenant.adminEmail === cleanEmail ? 'owner' : 'engineer'),
            companyId: matchCookieTenant.id,
            companyName: compName || matchCookieTenant.name,
            currency: matchCookieTenant.currency || 'ج.م',
          },
          tenant: {
            ...matchCookieTenant,
            name: compName || matchCookieTenant.name,
            logo: compLogo || matchCookieTenant.logo || null,
          },
          isSuperAdmin: false,
        };
      }
    }

    // ج) إذا كان المستخدم على رابط شركة مخصص (مثل ddss.tashteebpro.com) وسجّل دخوله بنجاح بحساب Firebase الموثق
    if (currentSub && currentSub !== 'admin') {
      console.log('[resolveTenantUserByEmail] ⚡ Auto-associating authenticated user with current company subdomain:', currentSub);
      let companyId = paramTenantId || `comp_${currentSub}`;
      let companyName = (paramCompName ? decodeURIComponent(paramCompName) : null) || currentSub;
      let companyLogo = null;
      let companyCurrency = 'ج.م';
      let adminName = cleanEmail.split('@')[0];

      // محاولة استرجاع بيانات الشركة الحقيقية من tenant_directory
      try {
        const { doc: fDoc, getDoc: fGetDoc } = await import('firebase/firestore');
        const sSnap = await Promise.race([
          fGetDoc(fDoc(db, 'tenant_directory', currentSub)),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        if (sSnap && sSnap.exists()) {
          const sData = sSnap.data();
          if (sData.companyId) companyId = sData.companyId;
          if (sData.name) companyName = sData.name;
          if (sData.logo) companyLogo = sData.logo;
          if (sData.currency) companyCurrency = sData.currency;
          if (sData.adminName) adminName = sData.adminName;
        }
      } catch (e) {}

      const subTenant = {
        id: companyId,
        name: companyName,
        subdomain: currentSub,
        slug: currentSub,
        logo: companyLogo,
        adminEmail: cleanEmail,
        currency: companyCurrency,
        status: 'active',
        plan: 'trial',
      };
      try {
        const currentList = loadAllTenants();
        if (!currentList.some(t => t.id === companyId)) {
          saveAllTenants([subTenant, ...currentList]);
        }
      } catch (e) {}

      try {
        if (!localStorage.getItem(`tenant_${companyId}_settings`)) {
          localStorage.setItem(`tenant_${companyId}_settings`, JSON.stringify({
            companyName: companyName,
            subdomain: currentSub,
            adminEmail: cleanEmail,
            adminName: adminName,
            currency: companyCurrency,
            city: 'القاهرة',
          }));
        }
      } catch (e) {}

      const compName = getTenantCurrentName(subTenant);
      const compLogo = getTenantCurrentLogo(subTenant);

      return {
        success: true,
        user: {
          id: firebaseUid || `u_${companyId}_admin`,
          email: cleanEmail,
          name: adminName,
          role: 'owner',
          companyId: companyId,
          companyName: compName || companyName,
          currency: companyCurrency,
        },
        tenant: {
          ...subTenant,
          name: compName || companyName,
          logo: compLogo || null,
        },
        isSuperAdmin: false,
      };
    }
  } catch (e) {
    console.warn('[resolveTenantUserByEmail] Subdomain context fallback error:', e);
  }

  // 9. لم يتم ربط هذا الحساب بأي شركة مسجلة في المنصة
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
