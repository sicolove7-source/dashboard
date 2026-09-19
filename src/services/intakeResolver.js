/**
 * ===================================================================
 * خدمة محلل وتوجيه استمارة استقبال العميل — Public Client Intake Resolver
 * ===================================================================
 * تمكّن العميل والزائر من فتح استمارة طلب عرض السعر والمعاينة الميدانية
 * من خلال الرابط المشارك في الحملات الإعلانية ومواقع التواصل،
 * مع إسناد الطلب سحابياً ومحلياً للشركة المحددة في الرابط.
 */

import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getTenantData } from './tenantsManager';
import { loadCompanySettings } from '../utils/branding';
import { cleanCompanyId } from './cloudSync';

/**
 * فحص وتحليل رابط الـ URL لمعرفة ما إذا كان الزائر يفتح استمارة استقبال طلبات التشطيب
 * يدعم جميع صيغ الروابط:
 * 1. #request-quote?c=:companyId
 * 2. #/request-quote?c=:companyId
 * 3. #intake?c=:companyId
 * 4. /request-quote/:companyId
 * 5. /intake/:companyId
 * 6. ?intake=:companyId أو ?request-quote=:companyId
 */
export function parseIntakeRouteFromUrl() {
  if (typeof window === 'undefined') return null;

  try {
    const pathname = window.location.pathname || '';
    const hash = window.location.hash || '';
    const searchParams = new URLSearchParams(window.location.search);

    // استخراج معلمات الـ Hash إن وُجدت (مثل #request-quote?c=comp_sample&source=facebook)
    let hashSearchParams = new URLSearchParams();
    if (hash.includes('?')) {
      const qIndex = hash.indexOf('?');
      hashSearchParams = new URLSearchParams(hash.slice(qIndex));
    }

    const getParam = (key) => searchParams.get(key) || hashSearchParams.get(key);

    const cleanHash = hash.replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '').toLowerCase();
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '').split('?')[0].toLowerCase();
    const pathParts = cleanPath.split('/');

    const intakeKeywords = ['request-quote', 'request_quote', 'intake', 'lead-capture', 'quote', 'order'];

    const isIntakeHash = intakeKeywords.some(k => cleanHash === k || cleanHash.startsWith(`${k}/`));
    const isIntakePath = intakeKeywords.some(k => pathParts[0] === k);
    const isIntakeQuery = searchParams.has('intake') || searchParams.has('request-quote') || searchParams.has('quote');

    if (isIntakeHash || isIntakePath || isIntakeQuery) {
      let companyId = getParam('c') || getParam('company') || getParam('tenant') || null;

      // من المسار /intake/:companyId
      if (!companyId && isIntakePath && pathParts.length >= 2 && pathParts[1]) {
        companyId = decodeURIComponent(pathParts[1]);
      }

      // من الـ Hash مثل #request-quote/:companyId
      if (!companyId && isIntakeHash) {
        const hashSegments = cleanHash.split('/');
        if (hashSegments.length >= 2 && hashSegments[1]) {
          companyId = decodeURIComponent(hashSegments[1]);
        }
      }

      // من الـ Query مثل ?intake=comp_sample
      if (!companyId && isIntakeQuery) {
        const qVal = searchParams.get('intake') || searchParams.get('request-quote') || searchParams.get('quote');
        if (qVal && qVal !== 'true' && qVal !== '1') {
          companyId = decodeURIComponent(qVal);
        }
      }

      const source = getParam('source') || getParam('utm_source') || getParam('src') || 'website';

      return {
        companyId: companyId || null,
        source: decodeURIComponent(source),
      };
    }
  } catch (err) {
    console.warn('[IntakeResolver] URL parse error:', err);
  }

  return null;
}

/**
 * جلب بيانات وهوية الشركة المعنية بالرابط لعرضها في النموذج العام
 */
export async function resolveCompanyForIntake(companyId) {
  const cId = cleanCompanyId(companyId);
  if (!cId) return null;

  // 1. فحص الكاش المحلي أولاً لاستجابة فورية
  const localSettings = loadCompanySettings(cId) || getTenantData(cId)?.settings;

  let result = {
    companyId: cId,
    companyName: localSettings?.companyName || 'إدارة التشطيبات والمقاولات',
    companySubtitle: localSettings?.companySubtitle || 'تشطيبات وديكورات معمارية متكاملة',
    companyLogo: localSettings?.companyLogo || null,
    primaryColor: localSettings?.primaryColor || '#1B3A4B',
    accentColor: localSettings?.accentColor || '#D97706',
    phone: localSettings?.phone || '',
    whatsapp: localSettings?.whatsapp || localSettings?.phone || '',
    city: localSettings?.city || '',
    country: localSettings?.country || 'مصر',
    currency: localSettings?.currency || 'ج.م',
  };

  // 2. تحديث من السحابة (Firestore) لضمان أحدث هوية
  try {
    const docRef = doc(db, 'companies', cId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const cloudSettings = data?.settings;
      if (cloudSettings) {
        result = {
          ...result,
          companyName: cloudSettings.companyName || result.companyName,
          companySubtitle: cloudSettings.companySubtitle || result.companySubtitle,
          companyLogo: cloudSettings.companyLogo || result.companyLogo,
          primaryColor: cloudSettings.primaryColor || result.primaryColor,
          accentColor: cloudSettings.accentColor || result.accentColor,
          phone: cloudSettings.phone || cloudSettings.mobile || result.phone,
          whatsapp: cloudSettings.whatsapp || cloudSettings.phone || result.whatsapp,
          city: cloudSettings.city || result.city,
          currency: cloudSettings.currency || result.currency,
        };
      }
    } else {
      // فحص قائمة المستأجرين المركزية
      const tDocRef = doc(db, 'platform_metadata', 'tenants');
      const tSnap = await getDoc(tDocRef);
      if (tSnap.exists() && Array.isArray(tSnap.data()?.list)) {
        const tenant = tSnap.data().list.find(t => t.id === cId);
        if (tenant) {
          result = {
            ...result,
            companyName: tenant.name || result.companyName,
            companySubtitle: tenant.subtitle || result.companySubtitle,
            companyLogo: tenant.logo || result.companyLogo,
            primaryColor: tenant.primaryColor || result.primaryColor,
            accentColor: tenant.accentColor || result.accentColor,
            currency: tenant.currency || result.currency,
          };
        }
      }
    }
  } catch (e) {
    console.warn('[IntakeResolver] Cloud fetch settings fallback to local:', e);
  }

  return result;
}

/**
 * حفظ طلب العميل الجديد في السحابة وفي الكاش المحلي
 */
export async function submitPublicLead(companyId, leadData) {
  const cId = cleanCompanyId(companyId);
  if (!cId) return { success: false, error: 'معرف الشركة غير صالح' };

  // Rate Limiting: منع إرسال أكثر من طلب خلال 30 ثانية لمنع هجمات الـ Spam
  try {
    const lastSubmit = sessionStorage.getItem('last_intake_submit');
    if (lastSubmit && (Date.now() - parseInt(lastSubmit, 10)) < 30000) {
      return { success: false, error: 'تم استلام طلبك بالفعل، يرجى الانتظار 30 ثانية قبل إرسال طلب آخر.' };
    }
  } catch (e) {}

  // تنظيف وتقييد أطوال المدخلات (Data Sanitization)
  const cleanName = String(leadData?.name || '').trim().slice(0, 100);
  const cleanPhone = String(leadData?.phone || '').trim().slice(0, 25);
  const cleanNotes = String(leadData?.notes || leadData?.details || '').trim().slice(0, 500);

  if (!cleanName || !cleanPhone) {
    return { success: false, error: 'يرجى إدخال الاسم ورقم الهاتف بشكل صحيح.' };
  }

  const fullLead = {
    ...leadData,
    name: cleanName,
    phone: cleanPhone,
    notes: cleanNotes,
    id: leadData.id || `lead_${Date.now()}`,
    createdAt: leadData.createdAt || new Date().toISOString().slice(0, 10),
    stage: 'new_lead',
    source: leadData.source || 'website',
    isFromPublicForm: true,
  };

  try { sessionStorage.setItem('last_intake_submit', Date.now().toString()); } catch (e) {}

  let savedCloud = false;

  try {
    const docRef = doc(db, 'companies', cId);
    const snap = await getDoc(docRef);
    let currentLeads = [];
    if (snap.exists() && Array.isArray(snap.data()?.leads)) {
      currentLeads = snap.data().leads;
    } else {
      // فحص الكاش المحلي إذا كانت السحابة فارغة
      try {
        const local = localStorage.getItem(`tenant_${cId}_leads`);
        if (local) currentLeads = JSON.parse(local);
      } catch {}
    }

    // إضافة العميل في مقدمة القائمة ليكون أول من يظهر
    const updatedLeads = [fullLead, ...currentLeads.filter(l => l.id !== fullLead.id)];

    await setDoc(docRef, {
      leads: updatedLeads,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    savedCloud = true;

    // تحديث الكاش المحلي في نفس المتصفح أيضاً
    try {
      localStorage.setItem(`tenant_${cId}_leads`, JSON.stringify(updatedLeads));
      window.dispatchEvent(new CustomEvent('lead_added_public', { detail: { lead: fullLead, companyId: cId } }));
    } catch {}

    return { success: true, lead: fullLead, savedCloud: true };
  } catch (error) {
    console.warn('[IntakeResolver] Firestore save error (will fallback to local cache):', error.message);

    // الحفظ الاحتياطي في الـ LocalStorage لضمان عدم ضياع طلب العميل
    try {
      const local = localStorage.getItem(`tenant_${cId}_leads`);
      const list = local ? JSON.parse(local) : [];
      const updated = [fullLead, ...list.filter(l => l.id !== fullLead.id)];
      localStorage.setItem(`tenant_${cId}_leads`, JSON.stringify(updated));
      localStorage.setItem(`pending_lead_${fullLead.id}`, JSON.stringify({ companyId: cId, lead: fullLead }));
      window.dispatchEvent(new CustomEvent('lead_added_public', { detail: { lead: fullLead, companyId: cId } }));
    } catch {}

    return { success: true, lead: fullLead, savedCloud: false, offline: true };
  }
}
