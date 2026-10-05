/**
 * ===================================================================
 * نظام إدارة الشركات والمشتركين — Multi-Tenant Platform Manager
 * ===================================================================
 * عزل كامل للبيانات، المشاريع، المهندسين، والمالية لكل شركة ومشترك.
 */

import { setGlobalCurrency } from '../utils/helpers.js';
import { DEMO_ACCOUNTS } from '../utils/permissions.js';
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
  fetchDeletedTenantsFromCloud,
  syncDeletedTenantToCloud,
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
} from './cloudSync.js';
import { db, auth } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import defaultTenantsData from './defaultTenantsData.json' with { type: 'json' };
import { getCrossSubdomainCookie, setCrossSubdomainCookie, isCompanySubdomain, getSubdomain } from './subdomainResolver.js';

export const PLATFORM_TENANTS_KEY = 'platform-tenants-master-v1';
export const ACTIVE_TENANT_ID_KEY = 'platform-active-tenant-id';
export const SUB_ACCOUNTS_ACCESS_KEY = 'platform-subaccounts-access-v2';
// قائمة IDs الشركات المحذوفة نهائياً مركزياً وسحابياً لمنع إعادتها عبر أي متصفح
export const DELETED_TENANTS_KEY = 'platform-deleted-tenants-v1';

export function getDeletedTenantIds() {
  try {
    const raw = localStorage.getItem(DELETED_TENANTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch (e) { return new Set(); }
}

export async function fetchDeletedTenantIdsAsync() {
  const localSet = getDeletedTenantIds();
  try {
    const cloudList = await fetchDeletedTenantsFromCloud();
    if (Array.isArray(cloudList) && cloudList.length > 0) {
      cloudList.forEach(id => {
        if (id) {
          const s = String(id).trim();
          localSet.add(s);
          if (s.startsWith('comp_')) localSet.add(s.replace(/^comp_/, ''));
          else localSet.add(`comp_${s}`);
        }
      });
      try {
        localStorage.setItem(DELETED_TENANTS_KEY, JSON.stringify(Array.from(localSet)));
      } catch (e) {}
    }
  } catch (e) {}
  return localSet;
}

export function isTenantDeleted(id) {
  if (!id) return false;
  const deleted = getDeletedTenantIds();
  const cleanId = String(id).trim();
  return deleted.has(cleanId) ||
         deleted.has(cleanId.replace(/^comp_/, '')) ||
         deleted.has(`comp_${cleanId}`);
}

export function addDeletedTenantId(id) {
  if (!id) return;
  try {
    const existing = getDeletedTenantIds();
    const cleanId = String(id).trim();
    existing.add(cleanId);
    if (cleanId.startsWith('comp_')) {
      existing.add(cleanId.replace(/^comp_/, ''));
    } else {
      existing.add(`comp_${cleanId}`);
    }
    localStorage.setItem(DELETED_TENANTS_KEY, JSON.stringify(Array.from(existing)));
    // مزامنة سحابية مركزية فورية حتى تعم كافة المتصفحات فوراً
    syncDeletedTenantToCloud(cleanId).catch(() => {});
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
      // ✅ تأخير المزامنة حتى يتحقق Firebase Auth من الجلسة أولاً
      // منع خطأ "Missing or insufficient permissions" عند التحميل بدون جلسة
      setTimeout(() => {
        try {
          import('../firebase').then(({ auth }) => {
            if (auth.currentUser) {
              syncAllLocalUsersToCloud();
            }
            // إذا لم يكن هناك مستخدم مسجل، لا نحاول المزامنة
          }).catch(() => {});
        } catch(e) {}
      }, 1500);
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
      if (t?.id && !isTenantDeleted(t.id)) map.set(t.id, { ...t });
    });
    parsed.forEach(t => {
      if (t?.id && !isTenantDeleted(t.id) && t.status !== 'deleted') {
        let enhanced = { ...t };
        try {
          const sRaw = localStorage.getItem(`tenant_${t.id}_settings`);
          if (sRaw) {
            const s = JSON.parse(sRaw);
            if (s.status === 'deleted') return;
            if (s.companyName && s.companyName !== 'شركة المقاولات' && s.companyName !== 'شركة المقاولات والتشطيبات') {
              enhanced.name = s.companyName;
            }
            if (s.companyLogo) {
              enhanced.logo = s.companyLogo;
            }
            if (s.currency) {
              enhanced.currency = s.currency;
            }
            if (s.phone || s.companyPhone) {
              enhanced.phone = s.phone || s.companyPhone;
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
            phone: enhanced.phone || defT.phone || enhanced.mobile || '',
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
  // ✅ 1. جلب ومزامنة قائمة الشركات المحذوفة نهائياً سحابياً أولاً
  const deletedIds = await fetchDeletedTenantIdsAsync();
  const local = loadAllTenants();

  try {
    const cloudTenants = await fetchTenantsListFromCloud();
    const hasCloudSource = Array.isArray(cloudTenants);
    const mergedMap = new Map();

    if (hasCloudSource && cloudTenants.length > 0) {
      cloudTenants.forEach(t => {
        // ✅ تجاهل أي شركة محذوفة سحابياً
        if (t?.id && !deletedIds.has(t.id) && !isTenantDeleted(t.id) && t.status !== 'deleted') {
          mergedMap.set(t.id, t);
        }
      });
    }

    // استكشاف دليل النطاقات والشركات المسجلة حديثاً من السحابة لضمان ظهور أي شركة سُجلت من الموبايل
    try {
      const { db } = await import('../firebase');
      const { collection, getDocs } = await import('firebase/firestore');
      const dirSnap = await Promise.race([
        getDocs(collection(db, 'tenant_directory')),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
      ]);
      if (dirSnap && !dirSnap.empty) {
        dirSnap.forEach(d => {
          const td = d.data();
          const cId = td.companyId || `comp_${d.id}`;
          // ✅ تجاهل الشركات المحذوفة
          if (deletedIds.has(cId) || isTenantDeleted(cId)) return;
          if (!mergedMap.has(cId)) {
            mergedMap.set(cId, {
              id: cId,
              name: td.name || d.id,
              subdomain: td.subdomain || d.id,
              slug: td.subdomain || d.id,
              logo: td.logo || null,
              adminEmail: td.adminEmail || '',
              adminName: td.adminName || 'المدير العام',
              phone: td.phone || '',
              currency: td.currency || 'ج.م',
              status: 'active',
              plan: 'trial',
              users: [{
                id: `u_${cId}_admin`,
                email: td.adminEmail || '',
                name: td.adminName || 'المدير العام',
                role: 'owner',
                companyId: cId
              }],
              authorizedEmails: td.adminEmail ? [td.adminEmail] : [],
              createdAt: td.createdAt || new Date().toISOString()
            });
          }
        });
      }
    } catch (dirErr) {
      // non-blocking
    }

    // تنظيف الشركات المحذوفة من التخزين المحلي إن وُجدت
    local.forEach(t => {
      if (t?.id && (deletedIds.has(t.id) || isTenantDeleted(t.id) || t.status === 'deleted')) {
        try {
          localStorage.removeItem(`tenant_${t.id}_projects`);
          localStorage.removeItem(`tenant_${t.id}_settings`);
          localStorage.removeItem(`tenant_${t.id}_users`);
          localStorage.removeItem(`tenant_${t.id}_team`);
          localStorage.removeItem(`tenant_${t.id}_leads`);
        } catch (e) {}
      }
    });

    if (mergedMap.size > 0 || hasCloudSource) {
      local.forEach(t => {
        if (t?.id && !deletedIds.has(t.id) && !isTenantDeleted(t.id) && t.status !== 'deleted') {
          if (!mergedMap.has(t.id)) {
            // فقط إذا لم تكن هناك سحابة (Offline) أو تم تسجيل الشركة محلياً للتو نضيفها
            if (!hasCloudSource || t._isLocalNew) {
              mergedMap.set(t.id, t);
            }
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
              phone: t.phone || cloudT.phone || cloudT.mobile || t.mobile || '',
              createdAt: t.createdAt || cloudT.createdAt || t.startDate || cloudT.startDate || null,
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
      return merged;
    }
  } catch (e) {
    console.warn("Could not load tenants from cloud, falling back to local:", e);
  }
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
          subdomain: rawSubdomain,
          logo: newTenant.logo || null,
        }).catch(err => console.error('[assignUserClaims] FAILED:', err?.code, err?.message));
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
      syncTenantsListToCloud(tenants).catch(() => {});
    } catch (e) {}
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
          status: tenants[idx].status || 'active',
        }
      });
    } catch (e) {}
    return tenants[idx];
  }
  return null;
}

export function deleteTenant(id) {
  if (!id) return loadAllTenants();
  const cleanId = String(id).trim();

  // 1. تسجيل الشركة في قائمة المحذوفات سحابياً ومحلياً فوراً
  addDeletedTenantId(cleanId);

  // 2. تحديث وحفظ القائمة المحلية
  const tenants = loadAllTenants().filter(t => t?.id !== cleanId && !isTenantDeleted(t?.id));
  saveAllTenants(tenants);

  // 3. مزامنة فورية للقائمة المحدثة بدون الشركة المحذوفة إلى السحابة
  try {
    syncTenantsListToCloud(tenants).catch(() => {});
  } catch (e) {}

  // 4. إلغاء تفعيل الشركة النشطة إذا كانت هي المحذوفة
  try {
    const active = getActiveTenantId();
    if (active === cleanId || active === cleanId.replace(/^comp_/, '') || active === `comp_${cleanId}`) {
      setActiveTenantId(null);
    }
  } catch (e) {}

  // 5. تطهير شامل للتخزين المحلي لكافة مفاتيح هذه الشركة بجميع أشكال المعرف
  try {
    const prefixes = [cleanId, cleanId.replace(/^comp_/, ''), `comp_${cleanId}`];
    prefixes.forEach(p => {
      localStorage.removeItem(`tenant_${p}_projects`);
      localStorage.removeItem(`tenant_${p}_settings`);
      localStorage.removeItem(`tenant_${p}_users`);
      localStorage.removeItem(`tenant_${p}_team`);
      localStorage.removeItem(`tenant_${p}_leads`);
    });

    // تطهير كامل لمستخدمي هذه الشركة من السجل المركزي platform-all-users-registry
    const regRaw = localStorage.getItem('platform-all-users-registry');
    if (regRaw) {
      const reg = JSON.parse(regRaw);
      let changed = false;
      Object.keys(reg).forEach(k => {
        if (prefixes.includes(reg[k]?.companyId)) {
          delete reg[k];
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));
      }
    }
  } catch (e) {}

  // 6. حذف سحابي شامل (Cloud Function لتعطيل الحسابات وحذف المستندات + Firestore Direct)
  try { deleteCompanyFromCloud(cleanId); } catch (e) {}

  // 7. حذف وحجب من tenant_directory
  try {
    import('../firebase').then(({ db }) => {
      import('firebase/firestore').then(({ deleteDoc, collection, getDocs, query, where }) => {
        getDocs(query(collection(db, 'tenant_directory'), where('companyId', '==', cleanId)))
          .then(snap => {
            snap.forEach(d => deleteDoc(d.ref).catch(() => {}));
          })
          .catch(() => {});
      }).catch(() => {});
    }).catch(() => {});
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

  // الحفاظ على مستخدم الجلسة النشط دائماً داخل قائمة المستخدمين لتفادي مسحه أو فقده بالكاش
  try {
    const sessUserRaw = localStorage.getItem('active_session_user');
    if (sessUserRaw) {
      const sessUser = JSON.parse(sessUserRaw);
      const sessComp = sessUser?.companyId || '';
      const cleanComp = (companyId || '').replace(/^comp_/, '');
      if (sessUser && (sessComp === companyId || sessComp.replace(/^comp_/, '') === cleanComp)) {
        if (!Array.isArray(users)) users = [];
        const cleanP = (sessUser.cleanPhone || sessUser.phone || sessUser.email || '').replace(/\D/g, '');
        const exists = users.some(u => {
          if (!u) return false;
          if (u.email && sessUser.email && u.email.toLowerCase().trim() === sessUser.email.toLowerCase().trim()) return true;
          const uP = (u.cleanPhone || u.phone || '').replace(/\D/g, '');
          if (uP && cleanP && (uP === cleanP || uP.endsWith(cleanP) || cleanP.endsWith(uP))) return true;
          return false;
        });
        if (!exists) {
          users.push(sessUser);
          try { localStorage.setItem(`tenant_${companyId}_users`, JSON.stringify(users)); } catch (e) {}
        }
      }
    }
  } catch (e) {}

  // 3. الفريق
  let team = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_team`);
    if (raw) team = JSON.parse(raw);
  } catch (e) {}
  if (!team) {
    if (tenant?.team && (tenant.team.engineers?.length > 0 || tenant.team.accountants?.length > 0 || tenant.team.techOffice?.length > 0)) {
      team = tenant.team;
    } else {
      const engineerNames = (users && users.filter(u => u.role === 'engineer').map(u => u.name).filter(Boolean)) || [];
      team = {
        engineers: engineerNames.length > 0 ? engineerNames : (tenant?.adminName ? [tenant.adminName] : ['مهندس الموقع']),
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

  // في حال تعذر السحابة، نعتمد على الكاش المحلي فقط دون الكتابة فوق السحابة ببيانات قديمة
  return getTenantData(companyId);
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

  // 1. فحص حساب السوبر أدمن (حصراً من خلال claims الموثقة أو البريد الرئيسي المعتمد)
  const isSuperAdminUser = Boolean(
    claims.role === 'super_admin' ||
    claims.isSuperAdmin === true ||
    cleanEmail === 'sicolove7@gmail.com'
  );

  let tenants = loadAllTenants();
  if (!Array.isArray(tenants) || tenants.length === 0) {
    tenants = [...DEFAULT_TENANTS];
  }

  if (isSuperAdminUser) {
    const currentSub = isCompanySubdomain() ? getSubdomain() : null;
    let activeTenant = null;

    if (currentSub && currentSub !== 'admin' && currentSub !== 'superadmin') {
      activeTenant = tenants.find(t =>
        (t.subdomain || '').toLowerCase().trim() === currentSub ||
        (t.slug || '').toLowerCase().trim() === currentSub ||
        (t.id || '').toLowerCase().trim() === currentSub ||
        (t.id || '').toLowerCase().trim() === `comp_${currentSub}`
      );
    }

    if (!activeTenant) {
      const activeTenantId = getActiveTenantId();
      activeTenant = (activeTenantId && tenants.find(t => t.id === activeTenantId)) ||
                     tenants.find(t => t.adminEmail && t.adminEmail.toLowerCase().trim() === cleanEmail) ||
                     (tenants.length > 0 ? tenants[0] : null);
    }

    const compName = activeTenant ? getTenantCurrentName(activeTenant) : (currentSub ? currentSub : 'المنصة الرئيسية');
    const compLogo = activeTenant ? getTenantCurrentLogo(activeTenant) : null;

    return {
      success: true,
      user: {
        id: firebaseUid || 'super_admin_master',
        email: cleanEmail,
        name: claims.name || cleanEmail.split('@')[0],
        role: 'super_admin',
        isSuperAdmin: true,
        companyId: activeTenant?.id || null,
        companyName: compName,
        currency: activeTenant?.currency || 'ج.م',
      },
      tenant: activeTenant ? {
        ...activeTenant,
        name: compName,
        logo: compLogo,
      } : null,
      isSuperAdmin: true,
    };
  }

  // 2. المصدر الأوحد للمستخدم العادي: claims.companyId و claims.role
  if (claims.companyId) {
    const companyId = claims.companyId;

    // فحص هل الشركة محذوفة نهائياً
    if (isTenantDeleted(companyId)) {
      return {
        success: false,
        error: 'company_deleted',
        isCompanyDeleted: true,
        message: '🚫 تم حذف أو إلغاء تفعيل حساب هذه المؤسسة من قِبل إدارة المنصة.',
      };
    }

    // جلب بيانات الشركة المحدثة من السحابة أو الكاش
    let claimTenant = tenants.find(t => t.id === companyId);
    let cloudCompanyName = null;
    let cloudCompanyLogo = null;
    let compCloud = null;

    try {
      const { fetchCompanyDataFromCloud } = await import('./cloudSync');
      compCloud = await fetchCompanyDataFromCloud(companyId);
      if (compCloud?.status === 'deleted' || compCloud?.isDeleted === true) {
        addDeletedTenantId(companyId);
        return {
          success: false,
          error: 'company_deleted',
          isCompanyDeleted: true,
          message: '🚫 تم حذف أو إلغاء تفعيل حساب هذه المؤسسة من قِبل إدارة المنصة.',
        };
      }
      if (compCloud?.name) cloudCompanyName = compCloud.name;
      if (compCloud?.settings?.companyName) cloudCompanyName = compCloud.settings.companyName;
      if (compCloud?.logo) cloudCompanyLogo = compCloud.logo;
      if (compCloud?.settings?.companyLogo) cloudCompanyLogo = compCloud.settings.companyLogo;
    } catch (e) {
      console.warn('[resolveTenantUserByEmail] Cloud fetch notice:', e?.message);
    }

    if (claimTenant?.status === 'deleted') {
      addDeletedTenantId(companyId);
      return {
        success: false,
        error: 'company_deleted',
        isCompanyDeleted: true,
        message: '🚫 تم حذف أو إلغاء تفعيل حساب هذه المؤسسة من قِبل إدارة المنصة.',
      };
    }

    // فحص تعليق المؤسسة
    const isSuspended = compCloud?.status === 'suspended' || claimTenant?.status === 'suspended';
    if (isSuspended) {
      return {
        success: false,
        isTenantSuspended: true,
        error: 'tenant_suspended',
        tenant: claimTenant || compCloud || { id: companyId, name: cloudCompanyName || companyId, status: 'suspended' },
        message: '🚫 تم تعليق أو إيقاف حساب هذه المؤسسة من قِبل إدارة المنصة.',
      };
    }

    // فحص عزل النطاق الفرعي (Subdomain Isolation)
    const currentSub = isCompanySubdomain() ? getSubdomain() : null;
    if (currentSub && currentSub !== 'admin') {
      const tenantSub = (claimTenant?.subdomain || claimTenant?.slug || compCloud?.subdomain || '').toLowerCase().trim();
      const rawCompId = (companyId || '').toLowerCase().trim();
      const matchesSub =
        tenantSub === currentSub ||
        rawCompId === currentSub ||
        rawCompId === `comp_${currentSub}` ||
        rawCompId === `comp_c_${currentSub}`;

      if (!matchesSub) {
        return {
          success: false,
          error: 'cross_tenant_access_denied',
          tenant: claimTenant || { id: companyId, name: cloudCompanyName || companyId, subdomain: tenantSub },
          message: `❌ هذا الحساب مسجل في شركة أخرى ولا يملك صلاحية الدخول لبوابة '${currentSub}'.`,
        };
      }
    }

    // الدور حصراً ومباشرة من claims.role (بدون أي تخمين أو قيم افتراضية)
    if (!claims.role) {
      return {
        success: false,
        error: 'missing_role_claims',
        message: '🚫 لا توجد صلاحيات معتمدة لهذا الحساب (Custom Claims). يرجى مراجعة إدارة الشركة.',
      };
    }
    const verifiedRole = claims.role;
    const compName = cloudCompanyName || (claimTenant ? getTenantCurrentName(claimTenant) : companyId);
    const compLogo = cloudCompanyLogo || (claimTenant ? getTenantCurrentLogo(claimTenant) : null);
    const currency = compCloud?.currency || claimTenant?.currency || claims.currency || 'ج.م';

    const resolvedTenant = claimTenant ? {
      ...claimTenant,
      name: compName,
      logo: compLogo,
    } : {
      id: companyId,
      name: compName,
      logo: compLogo,
      currency: currency,
      subdomain: compCloud?.subdomain || null,
      status: compCloud?.status || 'active',
    };

    return {
      success: true,
      user: {
        id: firebaseUid || `u_${companyId}`,
        email: cleanEmail,
        name: claims.name || cleanEmail.split('@')[0],
        role: verifiedRole,
        companyId: companyId,
        companyName: compName,
        currency: currency,
      },
      tenant: resolvedTenant,
      isSuperAdmin: false,
    };
  }

  // 3. فحص محلي لحالة الحظر أو التعليق فقط (بدون تحديد الدور محلياً أو افتراض دور المالك)
  for (const t of tenants) {
    if (!t || t.status === 'deleted') continue;

    // أ) مطابقة المدير المباشر للشركة
    if (t.adminEmail && t.adminEmail.toLowerCase().trim() === cleanEmail) {
      if (t.status === 'suspended') {
        return {
          success: false,
          isTenantSuspended: true,
          tenant: t,
          error: 'tenant_suspended',
          message: '🚫 تم تعليق أو إيقاف حساب هذه المؤسسة من قِبل إدارة منصة تشطيب برو.',
        };
      }

      // إذا كان لدى المستخدم claims.role صريح
      if (claims.role) {
        const compName = getTenantCurrentName(t);
        const compLogo = getTenantCurrentLogo(t);
        return {
          success: true,
          user: {
            id: firebaseUid || `u_${t.id}_admin`,
            email: cleanEmail,
            name: t.adminName || cleanEmail.split('@')[0],
            role: claims.role,
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

    // ب) مطابقة الموظفين المسجلين في مصفوفة users لفحص حالة التعليق فقط
    if (Array.isArray(t.users)) {
      const match = t.users.find(u => {
        if (!u) return false;
        if (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) return true;
        if (phoneFromEmail) {
          const uPhone = cleanPhoneNumber(u.phone || u.cleanPhone);
          if (uPhone && uPhone === phoneFromEmail) return true;
        }
        return false;
      });

      if (match) {
        if (match.status === 'suspended' || match.status === 'inactive') {
          return {
            success: false,
            isUserSuspended: true,
            error: 'user_suspended',
            message: '🚫 تم إيقاف هذا الحساب.',
          };
        }
        if (t.status === 'suspended') {
          return {
            success: false,
            isTenantSuspended: true,
            tenant: t,
            error: 'tenant_suspended',
            message: '🚫 حساب الشركة معلق.',
          };
        }

        if (claims.role) {
          return {
            success: true,
            user: {
              id: firebaseUid || match.id || `u_${t.id}_emp`,
              email: cleanEmail,
              name: match.name || cleanEmail.split('@')[0],
              role: claims.role,
              companyId: t.id,
              companyName: getTenantCurrentName(t),
              currency: t.currency || 'ج.م',
            },
            tenant: t,
            isSuperAdmin: false,
          };
        }
      }
    }
  }

  // 4. مسار احتياطي للبيئات التجريبية والمزامنة السحابية (فقط عند عدم توفر claims وعدم وجود تطابق محلي)
  try {
    const { fetchUserFromCloudDirectory } = await import('./cloudSync');
    let cloudUser = null;
    if (phoneFromEmail) {
      const { fetchUserByPhoneFromCloudDirectory } = await import('./cloudSync');
      cloudUser = await fetchUserByPhoneFromCloudDirectory(phoneFromEmail);
    } else {
      cloudUser = await fetchUserFromCloudDirectory(cleanEmail);
    }

    if (cloudUser && cloudUser.companyId) {
      if (cloudUser.isDeleted === true || cloudUser.status === 'deleted') {
        return {
          success: false,
          isDeleted: true,
          error: '🚫 هذا الحساب تم حذفه من قِبل إدارة الشركة.',
          message: '🚫 تم حذف هذا الحساب من قِبل إدارة الشركة.',
        };
      }
      if (cloudUser.status === 'suspended' || cloudUser.status === 'inactive') {
        return {
          success: false,
          isUserSuspended: true,
          error: '🚫 تم إيقاف هذا الحساب من قِبل إدارة الشركة.',
          message: '🚫 تم إيقاف أو تجميد هذا الحساب من قِبل إدارة الشركة.',
        };
      }

      const compId = cloudUser.companyId;
      const tMatch = tenants.find(t => t.id === compId);
      if (tMatch?.status === 'suspended') {
        return {
          success: false,
          isTenantSuspended: true,
          tenant: tMatch,
          error: 'tenant_suspended',
          message: '🚫 تم تعليق حساب المؤسسة.',
        };
      }

      // حفظ محلي لسرعة الزيارات التالية
      try {
        const uKey = `tenant_${compId}_users`;
        const currentUList = JSON.parse(localStorage.getItem(uKey) || '[]');
        if (!currentUList.some(u => u.email === cleanEmail)) {
          currentUList.push(cloudUser);
          localStorage.setItem(uKey, JSON.stringify(currentUList));
        }
      } catch (e) {}

      return {
        success: true,
        user: {
          id: firebaseUid || cloudUser.id || `u_${compId}`,
          email: cleanEmail,
          name: cloudUser.name || cleanEmail.split('@')[0],
          role: cloudUser.role || 'engineer',
          companyId: compId,
          companyName: cloudUser.companyName || tMatch?.name || compId,
          currency: cloudUser.currency || tMatch?.currency || 'ج.م',
        },
        tenant: tMatch || {
          id: compId,
          name: cloudUser.companyName || compId,
          currency: cloudUser.currency || 'ج.م',
          status: 'active',
        },
        isSuperAdmin: false,
      };
    }
  } catch (e) {
    console.warn('[resolveTenantUserByEmail] Cloud directory notice:', e?.message);
  }

  // 5. الحساب غير مرتبط بأي شركة مسجلة
  console.warn('[resolveTenantUserByEmail] No company associated for user:', cleanEmail);
  return {
    success: false,
    user: null,
    tenant: null,
    error: 'لم يتم ربط هذا الحساب بأي شركة مسجلة في المنصة. يرجى مراجعة إدارة الشركة.',
  };
}

export async function syncAllLocalUsersToCloud() {
  try {
    // ✅ تحقق من وجود مستخدم مسجل في Firebase Auth قبل أي sync
    const { auth } = await import('../firebase');
    if (!auth.currentUser) {
      return; // لا مزامنة بدون جلسة مصادقة
    }

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
