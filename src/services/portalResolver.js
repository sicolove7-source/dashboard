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
 * جلب بيانات المشروع وإعدادات الشركة الخاصة ببوابة العميل
 * يبحث في الكاش المحلي، ثم السحابة (Firestore)، ثم المشاريع المضمنة
 */
export async function resolveClientPortalProject(projectId, companyIdHint = null) {
  if (!projectId) return null;
  const pIdStr = String(projectId).trim();

  // 1. فحص الكاش المحلي إذا حُددت الشركة
  if (companyIdHint) {
    try {
      const raw = localStorage.getItem(`tenant_${companyIdHint}_projects`);
      if (raw) {
        const list = JSON.parse(raw);
        const match = list.find(p => String(p.id) === pIdStr || p.clientPortalToken === pIdStr);
        if (match) {
          const settingsRaw = localStorage.getItem(`tenant_${companyIdHint}_settings`);
          const settings = settingsRaw ? JSON.parse(settingsRaw) : loadCompanySettings(companyIdHint);
          return { project: match, companyId: companyIdHint, companySettings: settings };
        }
      }
    } catch (e) {}
  }

  // 2. فحص جميع الكاشات المحلية المخزنة في المتصفح
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tenant_') && key.endsWith('_projects')) {
        const cId = key.replace(/^tenant_/, '').replace(/_projects$/, '');
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          const match = list.find(p => String(p.id) === pIdStr || p.clientPortalToken === pIdStr);
          if (match) {
            const settingsRaw = localStorage.getItem(`tenant_${cId}_settings`);
            const settings = settingsRaw ? JSON.parse(settingsRaw) : loadCompanySettings(cId);
            return { project: match, companyId: cId, companySettings: settings };
          }
        }
      }
    }
  } catch (e) {}

  // 3. فحص المشاريع الافتراضية المضمنة في النظام (للمتصفحات الجديدة والنوافذ الخفية)
  const allTenants = loadAllTenants();
  for (const t of allTenants) {
    const tData = getTenantData(t.id);
    if (tData?.projects && Array.isArray(tData.projects)) {
      const match = tData.projects.find(p => String(p.id) === pIdStr || p.clientPortalToken === pIdStr);
      if (match) {
        return { project: match, companyId: t.id, companySettings: tData.settings };
      }
    }
  }

  // 4. جلب المشروع سحابياً من Firebase Firestore
  try {
    const companiesToCheck = companyIdHint
      ? [companyIdHint, 'comp_alain', 'comp_dhabi', 'comp_cairo']
      : ['comp_alain', 'comp_dhabi', 'comp_cairo', ...allTenants.map(t => t.id)];

    for (const cId of companiesToCheck) {
      if (!cId) continue;
      try {
        // فحص الـ subcollection المستقلة
        const projectRef = doc(db, 'companies', cId, 'projects', pIdStr);
        const snap = await getDoc(projectRef);
        if (snap.exists()) {
          const pData = snap.data();
          // جلب إعدادات الشركة
          let cSettings = null;
          try {
            const companyDocRef = doc(db, 'companies', cId);
            const cSnap = await getDoc(companyDocRef);
            if (cSnap.exists()) {
              cSettings = cSnap.data()?.settings || null;
            }
          } catch (err) {}
          return { project: pData, companyId: cId, companySettings: cSettings || loadCompanySettings(cId) };
        }

        // فحص في الوثيقة الرئيسية للشركة (توافق مع الإصدارات السابقة)
        const companyDocRef = doc(db, 'companies', cId);
        const cSnap = await getDoc(companyDocRef);
        if (cSnap.exists()) {
          const cData = cSnap.data();
          if (Array.isArray(cData?.projects)) {
            const match = cData.projects.find(p => String(p.id) === pIdStr || p.clientPortalToken === pIdStr);
            if (match) {
              return { project: match, companyId: cId, companySettings: cData?.settings || loadCompanySettings(cId) };
            }
          }
        }
      } catch (err) {
        // متابعة الفحص
      }
    }
  } catch (e) {
    console.warn('[PortalResolver] Cloud lookup error:', e);
  }

  // 5. في حال كان المعرف تجريبياً أو غير موجود، عرض أول مشروع تجريبي حتى لا تظهر صفحة فارغة أو خطأ
  const fallbackTenant = allTenants[0] || { id: 'comp_alain' };
  const fallbackData = getTenantData(fallbackTenant.id);
  const fallbackProj = fallbackData?.projects?.[0] || null;

  if (fallbackProj) {
    return {
      project: {
        ...fallbackProj,
        id: pIdStr, // الحفاظ على المعرف المطلوب
      },
      companyId: fallbackTenant.id,
      companySettings: fallbackData.settings,
      isFallback: true
    };
  }

  return null;
}
