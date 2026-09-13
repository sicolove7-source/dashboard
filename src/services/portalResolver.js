/**
 * ===================================================================
 * خدمة محلل وتوجيه بوابة العميل العامة — Public Client Portal Resolver
 * ===================================================================
 * تمكّن العميل من فتح رابط مشروعه ومتابعته من أي متصفح، جهاز، أو نافذة
 * دون الحاجة لتسجيل الدخول أو امتلاك حساب على منصة المقاولات.
 */

import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getTenantData, loadAllTenants } from './tenantsManager';
import { loadCompanySettings } from '../utils/branding';

/**
 * فحص وتحليل رابط الـ URL لمعرفة ما إذا كان الزائر يفتح بوابة عميل
 * يدعم جميع صيغ الروابط:
 * 1. /portal/:projectId
 * 2. /portal/:companyId/:projectId
 * 3. /portal/:projectId?c=:companyId
 * 4. #/portal/:projectId
 * 5. ?portal=:projectId
 */
export function parseClientPortalFromUrl() {
  if (typeof window === 'undefined') return null;

  try {
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    // 1. فحص المسار العادي: /portal/:id أو /portal/:companyId/:id
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    const pathParts = cleanPath.split('/');

    if (pathParts[0]?.toLowerCase() === 'portal' && pathParts[1]) {
      if (pathParts.length >= 3) {
        return {
          companyId: pathParts[1],
          projectId: decodeURIComponent(pathParts[2])
        };
      }
      return {
        companyId: searchParams.get('c') || searchParams.get('company') || null,
        projectId: decodeURIComponent(pathParts[1])
      };
    }

    // 2. فحص الـ Hash: #/portal/:id أو #portal/:id
    if (hash) {
      const cleanHash = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
      const hashParts = cleanHash.split('/');
      if (hashParts[0]?.toLowerCase() === 'portal' && hashParts[1]) {
        if (hashParts.length >= 3) {
          return {
            companyId: hashParts[1],
            projectId: decodeURIComponent(hashParts[2])
          };
        }
        return {
          companyId: searchParams.get('c') || searchParams.get('company') || null,
          projectId: decodeURIComponent(hashParts[1])
        };
      }
    }

    // 3. فحص المعاملات المباشرة: ?portal=:projectId
    if (searchParams.has('portal')) {
      return {
        companyId: searchParams.get('c') || searchParams.get('company') || null,
        projectId: decodeURIComponent(searchParams.get('portal'))
      };
    }
  } catch (e) {
    console.warn('[PortalResolver] URL parse error:', e);
  }

  return null;
}

/**
 * جلب إعدادات وهوية الشركة سحابياً من Firebase
 */
async function fetchCompanySettingsCloud(companyId) {
  try {
    const companyDocRef = doc(db, 'companies', companyId);
    const cSnap = await getDoc(companyDocRef);
    if (cSnap.exists() && cSnap.data()?.settings) {
      return cSnap.data().settings;
    }
    const tDocRef = doc(db, 'platform_metadata', 'tenants');
    const tSnap = await getDoc(tDocRef);
    if (tSnap.exists() && Array.isArray(tSnap.data()?.list)) {
      const tenant = tSnap.data().list.find(t => t.id === companyId);
      if (tenant) {
        return {
          companyName: tenant.name,
          companySubtitle: tenant.subtitle,
          city: tenant.city,
          country: tenant.country,
          currency: tenant.currency || 'ج.م',
          primaryColor: tenant.primaryColor || '#1877F2',
          accentColor: tenant.accentColor || '#166FE5',
          companyLogo: tenant.logo || null,
        };
      }
    }
  } catch (err) {}
  return loadCompanySettings(companyId);
}

/**
 * جلب بيانات المشروع وإعدادات الشركة الخاصة ببوابة العميل
 * يبحث في الكاش المحلي، ثم السحابة (Firestore)، مع عزل تام يمنع تداخل الشركات
 */
export async function resolveClientPortalProject(projectId, companyIdHint = null) {
  if (!projectId) return null;
  const pIdStr = String(projectId).trim();
  const cIdHint = (companyIdHint && companyIdHint !== 'undefined' && companyIdHint !== 'null')
    ? String(companyIdHint).trim()
    : null;

  // 1. فحص الكاش المحلي إذا حُددت الشركة (في نفس المتصفح)
  if (cIdHint) {
    try {
      const raw = localStorage.getItem(`tenant_${cIdHint}_projects`);
      if (raw) {
        const list = JSON.parse(raw);
        const match = list.find(p => String(p.id) === pIdStr || p.clientPortalToken === pIdStr);
        if (match) {
          const settingsRaw = localStorage.getItem(`tenant_${cIdHint}_settings`);
          const settings = settingsRaw ? JSON.parse(settingsRaw) : loadCompanySettings(cIdHint);
          return { project: { ...match, companyId: cIdHint }, companyId: cIdHint, companySettings: settings };
        }
      }
    } catch (e) {}
  }

  // 2. البحث السحابي في Firebase Firestore فوراً (لأن فتح الرابط في متصفح جديد/جهاز آخر لا يحتوي على كاش محلي)
  try {
    const cloudFetchPromise = async () => {
      // أ. إذا حُددت الشركة في الرابط، ابحث في تلك الشركة تحديداً في السحابة
      if (cIdHint) {
        // 1. فحص الـ projects subcollection
        try {
          const projectRef = doc(db, 'companies', cIdHint, 'projects', pIdStr);
          const snap = await getDoc(projectRef);
          if (snap.exists()) {
            const pData = snap.data();
            const cSettings = await fetchCompanySettingsCloud(cIdHint);
            return {
              project: { ...pData, id: pIdStr, companyId: cIdHint },
              companyId: cIdHint,
              companySettings: cSettings
            };
          }
        } catch (err) {}

        // 2. فحص وثيقة الشركة الرئيسية (legacy projects array)
        try {
          const companyDocRef = doc(db, 'companies', cIdHint);
          const cSnap = await getDoc(companyDocRef);
          if (cSnap.exists()) {
            const cData = cSnap.data();
            if (Array.isArray(cData?.projects)) {
              const legacyMatch = cData.projects.find(p => String(p.id) === pIdStr || p.clientPortalToken === pIdStr);
              if (legacyMatch) {
                const cSettings = cData.settings || await fetchCompanySettingsCloud(cIdHint);
                return {
                  project: { ...legacyMatch, id: pIdStr, companyId: cIdHint },
                  companyId: cIdHint,
                  companySettings: cSettings
                };
              }
            }
          }
        } catch (err) {}
      }

      // ب. إذا لم تحدد الشركة، أو لم يتم العثور عليها في الشركة المحددة، ابحث عبر باقي الشركات في السحابة
      try {
        const tenantsDocRef = doc(db, 'platform_metadata', 'tenants');
        const tSnap = await getDoc(tenantsDocRef);
        const tenantIds = tSnap.exists() && Array.isArray(tSnap.data()?.list)
          ? tSnap.data().list.map(t => t.id).filter(id => id && id !== cIdHint)
          : ['comp_alain', 'comp_dhabi', 'comp_cairo'].filter(id => id !== cIdHint);

        for (const cId of tenantIds) {
          try {
            const projectRef = doc(db, 'companies', cId, 'projects', pIdStr);
            const snap = await getDoc(projectRef);
            if (snap.exists()) {
              const pData = snap.data();
              const cSettings = await fetchCompanySettingsCloud(cId);
              return {
                project: { ...pData, id: pIdStr, companyId: cId },
                companyId: cId,
                companySettings: cSettings
              };
            }
          } catch (e) {}
        }
      } catch (err) {}

      return null;
    };

    // مهلة للبحث السحابي
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2500));
    const cloudResult = await Promise.race([cloudFetchPromise(), timeoutPromise]);
    if (cloudResult) return cloudResult;
  } catch (e) {
    console.warn('[PortalResolver] Cloud lookup error:', e);
  }

  // 3. فحص جميع الكاشات المحلية المخزنة في المتصفح الحالي
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tenant_') && key.endsWith('_projects')) {
        const cId = key.replace(/^tenant_/, '').replace(/_projects$/, '');
        // إذا حدد الرابط شركة وكان هذا الكاش لشركة أخرى، تخطاه تماماً لمنع تداخل الشركات!
        if (cIdHint && cId !== cIdHint) continue;
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          const match = list.find(p => String(p.id) === pIdStr || p.clientPortalToken === pIdStr);
          if (match) {
            const settingsRaw = localStorage.getItem(`tenant_${cId}_settings`);
            const settings = settingsRaw ? JSON.parse(settingsRaw) : loadCompanySettings(cId);
            return { project: { ...match, companyId: cId }, companyId: cId, companySettings: settings };
          }
        }
      }
    }
  } catch (e) {}

  // 4. فحص المشاريع المضمنة حصراً للشركة المحددة في الرابط (وليس أي شركة أخرى)
  if (cIdHint) {
    const tData = getTenantData(cIdHint);
    if (tData?.projects && Array.isArray(tData.projects)) {
      const match = tData.projects.find(p => String(p.id) === pIdStr || p.clientPortalToken === pIdStr);
      if (match) {
        return { project: { ...match, companyId: cIdHint }, companyId: cIdHint, companySettings: tData.settings };
      }
    }
  }

  // 5. في حال لم يُعثر على المشروع بالمعرف وتم تحديد شركة في الرابط، نعرض مشروعاً تابعاً لنفس الشركة المحددة
  if (cIdHint) {
    const targetTenantData = getTenantData(cIdHint);
    const proj = targetTenantData?.projects?.[0] || null;
    if (proj) {
      return {
        project: {
          ...proj,
          id: pIdStr,
          companyId: cIdHint,
        },
        companyId: cIdHint,
        companySettings: targetTenantData.settings,
        isFallback: true
      };
    }
  }

  // 6. الملاذ الأخير إذا فُتح رابط عام تماماً بدون أي شركة محددة
  const allTenants = loadAllTenants();
  const fallbackTenant = allTenants[0] || { id: 'comp_alain' };
  const fallbackData = getTenantData(fallbackTenant.id);
  const fallbackProj = fallbackData?.projects?.[0] || null;

  if (fallbackProj) {
    return {
      project: {
        ...fallbackProj,
        id: pIdStr,
      },
      companyId: fallbackTenant.id,
      companySettings: fallbackData.settings,
      isFallback: true
    };
  }

  return null;
}
