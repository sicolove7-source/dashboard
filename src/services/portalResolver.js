/**
 * ===================================================================
 * خدمة محلل وتوجيه بوابة العميل العامة — Public Client Portal Resolver
 * ===================================================================
 * تعتمد على نمط (Token = Document ID) عبر مجموعة portal_shares/{token}.
 * قراءة مباشرة واحدة بدون أي مسح للشركات، وكتابة مؤمنة عبر Cloud Functions.
 */

import { db, functions } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getTenantData, loadAllTenants } from './tenantsManager';
import { loadCompanySettings } from '../utils/branding';

function safeDecodeURIComponent(val) {
  if (!val) return '';
  try {
    return decodeURIComponent(val);
  } catch (_e) {
    return String(val);
  }
}

/**
 * فحص وتحليل رابط الـ URL لمعرفة ما إذا كان الزائر يفتح بوابة عميل
 * يدعم جميع صيغ الروابط:
 * 1. /portal/:token
 * 2. /portal/:companyId/:token
 * 3. /portal/:id?t=:token
 * 4. #/portal/:token
 * 5. ?portal=:token
 */
export function parseClientPortalFromUrl(urlInput) {
  try {
    let pathname = '';
    let hash = '';
    let search = '';

    if (urlInput) {
      try {
        const parsed = new URL(urlInput, 'https://tashteebpro.com');
        pathname = parsed.pathname;
        hash = parsed.hash;
        search = parsed.search;
      } catch (_err) {
        return null;
      }
    } else if (typeof window !== 'undefined') {
      pathname = window.location.pathname;
      hash = window.location.hash;
      search = window.location.search;
    } else {
      return null;
    }

    const searchParams = new URLSearchParams(search);
    const queryToken = searchParams.get('t') || searchParams.get('token') || null;

    // 1. فحص المسار العادي: /portal/:token أو /portal/:companyId/:token
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    const pathParts = cleanPath.split('/');

    if (pathParts[0]?.toLowerCase() === 'portal' && pathParts[1]) {
      if (pathParts.length >= 3) {
        return {
          companyId: pathParts[1],
          projectId: safeDecodeURIComponent(pathParts[2]),
          token: queryToken || safeDecodeURIComponent(pathParts[2])
        };
      }
      return {
        companyId: searchParams.get('c') || searchParams.get('company') || null,
        projectId: safeDecodeURIComponent(pathParts[1]),
        token: queryToken || safeDecodeURIComponent(pathParts[1])
      };
    }

    // 2. فحص الـ Hash: #/portal/:token أو #portal/:token
    if (hash) {
      const cleanHash = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
      const hashParts = cleanHash.split('/');
      if (hashParts[0]?.toLowerCase() === 'portal' && hashParts[1]) {
        if (hashParts.length >= 3) {
          return {
            companyId: hashParts[1],
            projectId: safeDecodeURIComponent(hashParts[2]),
            token: queryToken || safeDecodeURIComponent(hashParts[2])
          };
        }
        return {
          companyId: searchParams.get('c') || searchParams.get('company') || null,
          projectId: safeDecodeURIComponent(hashParts[1]),
          token: queryToken || safeDecodeURIComponent(hashParts[1])
        };
      }
    }

    // 3. فحص المعاملات المباشرة: ?portal=:token
    // URLSearchParams.get يقوم بفك الترميز تلقائياً، فلا حاجة لـ decodeURIComponent مضاعف
    if (searchParams.has('portal')) {
      const pVal = searchParams.get('portal') || '';
      return {
        companyId: searchParams.get('c') || searchParams.get('company') || null,
        projectId: pVal,
        token: queryToken || pVal
      };
    }
  } catch (e) {
    console.warn('[PortalResolver] URL parse error:', e);
  }

  return null;
}

/**
 * تنقية بيانات المشروع لبوابة العميل لإسقاط أي بيانات داخلية غير مخصصة للعميل (Projection)
 */
export function sanitizeProjectForClientPortal(rawProject) {
  if (!rawProject) return null;
  const {
    expenses,        // إسقاط المصروفات والتكاليف الداخلية للمقاول
    subcontractors,  // إسقاط عقود الباطن الداخلية وهوامش الأرباح
    resources,       // إسقاط سجلات العمالة وتكاليف المعدات
    ...clientSafe
  } = rawProject;

  return {
    ...clientSafe,
    id: String(rawProject.id || rawProject.projectId || ''),
    projectId: String(rawProject.projectId || rawProject.id || ''),
    name: rawProject.name || 'مشروع بدون اسم',
    client: rawProject.client || 'عميلنا العزيز',
    progress: Number(rawProject.progress || 0),
    status: rawProject.status || 'active',
    budget: Number(rawProject.budget || rawProject.contractValue || 0),
    contractValue: Number(rawProject.contractValue || rawProject.budget || 0),
    clientPortalEnabled: rawProject.clientPortalEnabled === true,
    clientPortalToken: rawProject.clientPortalToken || rawProject.token || null,
    dailyLogs: Array.isArray(rawProject.dailyLogs) ? rawProject.dailyLogs : [],
    workItems: Array.isArray(rawProject.workItems) ? rawProject.workItems : [],
    payments: Array.isArray(rawProject.payments) ? rawProject.payments : (rawProject.clientPayments || []),
    clientPayments: Array.isArray(rawProject.clientPayments) ? rawProject.clientPayments : (rawProject.payments || []),
    photos: Array.isArray(rawProject.photos) ? rawProject.photos : [],
    sitePhotos: Array.isArray(rawProject.sitePhotos) ? rawProject.sitePhotos : [],
  };
}

/**
 * جلب بيانات المشروع وإعدادات الشركة الخاصة ببوابة العميل بالتوكن السري فقط
 * قراءة مباشرة واحدة وسريعة من portal_shares/{token}
 */
export async function resolveClientPortalProject(token) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  // 1. القراءة السحابية المباشرة من portal_shares/{token}
  try {
    const shareDocRef = doc(db, 'portal_shares', cleanToken);
    const snap = await getDoc(shareDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const sanitized = sanitizeProjectForClientPortal(data);
      return {
        project: sanitized,
        companyId: data.companyId || null,
        companySettings: data.companySettings || null
      };
    }
  } catch (err) {
    console.warn('[PortalResolver] Direct portal_shares read warning:', err.message);
  }

  // 2. الاستعلام السحابي المركزي عبر واجهة المنصة (Serverless Cloud Resolver)
  // يضمن فتح الرابط للعميل من أي جهاز ومتصفح حتى قبل نشر قواعد Firestore
  try {
    const apiUrl = `/api/portal?token=${encodeURIComponent(cleanToken)}`;
    const res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.project) {
        return {
          project: sanitizeProjectForClientPortal(data.project),
          companyId: data.companyId || null,
          companySettings: data.companySettings || null
        };
      }
    }
  } catch (apiErr) {
    // Non-blocking fallback to local storage
  }

  // 3. فحص الكاش المحلي في المتصفح الحالي (دعم العمل أوفلاين وأثناء التطوير)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tenant_') && key.endsWith('_projects')) {
        const cId = key.replace(/^tenant_/, '').replace(/_projects$/, '');
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          const match = list.find(p => p.clientPortalToken && p.clientPortalToken === cleanToken);
          if (match && match.clientPortalEnabled !== false) {
            const settingsRaw = localStorage.getItem(`tenant_${cId}_settings`);
            const settings = settingsRaw ? JSON.parse(settingsRaw) : loadCompanySettings(cId);
            return {
              project: sanitizeProjectForClientPortal({ ...match, companyId: cId }),
              companyId: cId,
              companySettings: settings
            };
          }
        }
      }
    }
  } catch (e) {}

  // 3. فحص المشاريع المضمنة للشركات التجريبية
  const allTenants = loadAllTenants();
  for (const tenant of allTenants) {
    const tData = getTenantData(tenant.id);
    if (tData?.projects && Array.isArray(tData.projects)) {
      const match = tData.projects.find(p => p.clientPortalToken && p.clientPortalToken === cleanToken);
      if (match && match.clientPortalEnabled !== false) {
        return {
          project: sanitizeProjectForClientPortal({ ...match, companyId: tenant.id }),
          companyId: tenant.id,
          companySettings: tData.settings || null
        };
      }
    }
  }

  return null;
}

/**
 * اعتماد وتوقيع العميل الإلكتروني للمشروع بشكل آمن ومقيد عبر Cloud Function
 * يمرر التوكن والبيانات المطلوبة فقط للـ Cloud Function التي تكتب بصلاحيات Admin SDK
 */
export async function submitClientPortalApproval(token, patch) {
  if (!token || !patch) {
    return { success: false, error: 'بيانات غير مكتملة' };
  }

  const cleanToken = String(token).trim();
  const sanitizedApproval = {
    clientSignature: patch.clientSignature ? String(patch.clientSignature) : '',
    clientApprovalDate: patch.clientApprovalDate ? String(patch.clientApprovalDate) : new Date().toISOString(),
    clientApprovalNotes: patch.clientApprovalNotes ? String(patch.clientApprovalNotes).slice(0, 1000) : '',
    updatedAt: new Date().toISOString(),
  };

  // 1. التحديث الفوري في الكاش المحلي للمتصفح (Optimistic UI)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tenant_') && key.endsWith('_projects')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          const hasMatch = list.some(p => p.clientPortalToken && p.clientPortalToken === cleanToken);
          if (hasMatch) {
            const updatedList = list.map(p => {
              if (p.clientPortalToken && p.clientPortalToken === cleanToken) {
                return { ...p, ...sanitizedApproval };
              }
              return p;
            });
            localStorage.setItem(key, JSON.stringify(updatedList));
          }
        }
      }
    }
  } catch (e) {
    console.warn('[PortalResolver] Local cache approval save warning:', e);
  }

  // 2. تحديث عبر واجهة المنصة السحابية المباشرة (Serverless Portal Approval)
  try {
    const res = await fetch('/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken, ...sanitizedApproval })
    });
    if (res.ok) {
      return { success: true, savedCloud: true, data: sanitizedApproval };
    }
  } catch (apiErr) {}

  // 3. استدعاء الدالة السحابية الآمنة (submitPortalApproval) كخيار إضافي
  try {
    const submitApprovalFn = httpsCallable(functions, 'submitPortalApproval');
    const result = await submitApprovalFn({
      token: cleanToken,
      ...sanitizedApproval
    });
    return { success: true, savedCloud: true, data: result?.data || sanitizedApproval };
  } catch (err) {
    console.warn('[PortalResolver] Cloud Function approval notice:', err.message);
    // إرجاع نجاح محلي أوفلاين في حال انقطاع الاتصال بالسحابة أو غياب الـ emulator
    return { success: true, savedCloud: false, offline: true, data: sanitizedApproval };
  }
}
