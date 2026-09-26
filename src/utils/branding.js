/**
 * Utility functions for loading, saving and applying company branding
 */
import { setGlobalCurrency } from './helpers';
import { getActiveTenantId } from '../services/tenantsManager';
import { syncSettingsToCloud, syncTenantsListToCloud } from '../services/cloudSync';

export const COMPANY_SETTINGS_KEY = 'company-settings-v1';

/**
 * ضغط وتحجيم شعار الشركة للحجم المثالي (أقصى بُعد 360 بكسل) وبحجم فائق الخفة (~10-25KB)
 * يضمن حفظه الفوري في LocalStorage و Firestore دون أي مشاكل تخزين
 */
export function compressLogoImage(fileOrBlob, maxDim = 360, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) {
      resolve(null);
      return;
    }

    const processImg = (src, mimeType = 'image/png') => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        let finalMime = 'image/jpeg';
        if (mimeType && (mimeType.includes('png') || mimeType.includes('svg'))) {
          try {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let hasAlpha = false;
            for (let i = 3; i < imgData.length; i += 16) {
              if (imgData[i] < 250) {
                hasAlpha = true;
                break;
              }
            }
            finalMime = hasAlpha ? 'image/png' : 'image/jpeg';
          } catch (e) {
            finalMime = 'image/png';
          }
        }

        const dataUrl = canvas.toDataURL(finalMime, quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(src);
      };
      img.src = src;
    };

    if (typeof fileOrBlob === 'string' && fileOrBlob.startsWith('data:')) {
      const mimeMatch = fileOrBlob.match(/^data:([^;]+);/);
      processImg(fileOrBlob, mimeMatch ? mimeMatch[1] : 'image/png');
    } else if (fileOrBlob instanceof Blob || fileOrBlob instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => processImg(e.target.result, fileOrBlob.type || 'image/png');
      reader.onerror = () => reject(new Error('Failed to read logo file'));
      reader.readAsDataURL(fileOrBlob);
    } else {
      resolve(null);
    }
  });
}

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: 'شركة المقاولات والتشطيبات',
  companySubtitle: 'إدارة المشاريع والتشطيبات المتكاملة',
  companyLogo: null,
  primaryColor: '#1877F2',
  accentColor: '#166FE5',
  currency: 'ج.م',
  city: '',
  country: 'مصر',
  phone: '',
  supportPhone: '',
  email: '',
  taxNumber: '',
  commercialRegister: '',
  address: '',
  website: '',
  subdomain: '',
  customDomain: '',
  customDomainVerified: false,
};

export function loadCompanySettings(companyId) {
  const cId = companyId || getActiveTenantId();
  if (cId) {
    try {
      // 1. فحص المفتاح المباشر
      let tenantRaw = localStorage.getItem(`tenant_${cId}_settings`);
      // 2. فحص البدائل في حالة اختلاف بادئة comp_
      if (!tenantRaw && !cId.startsWith('comp_')) {
        tenantRaw = localStorage.getItem(`tenant_comp_${cId}_settings`);
      } else if (!tenantRaw && cId.startsWith('comp_')) {
        const clean = cId.replace(/^comp_/, '');
        tenantRaw = localStorage.getItem(`tenant_${clean}_settings`);
      }
      if (tenantRaw) {
        const parsed = JSON.parse(tenantRaw);
        if (parsed.currency) setGlobalCurrency(parsed.currency);
        return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
      }
    } catch (e) {}

    // 3. فحص سجل الشركة المركزي من platform-tenants-master-v1 إذا لم نجد مفتاح الإعدادات المنفرد
    try {
      const rawTenants = localStorage.getItem('platform-tenants-master-v1');
      if (rawTenants) {
        const tenants = JSON.parse(rawTenants);
        if (Array.isArray(tenants)) {
          const isMatch = (t) => t?.id === cId || t?.id === `comp_${cId}` || (cId.startsWith('comp_') && t?.id === cId.replace(/^comp_/, ''));
          const match = tenants.find(isMatch);
          if (match) {
            return {
              ...DEFAULT_COMPANY_SETTINGS,
              companyName: match.name || DEFAULT_COMPANY_SETTINGS.companyName,
              companySubtitle: match.subtitle || DEFAULT_COMPANY_SETTINGS.companySubtitle,
              companyLogo: match.logo || null,
              currency: match.currency || DEFAULT_COMPANY_SETTINGS.currency,
              phone: match.phone || '',
              primaryColor: match.primaryColor || DEFAULT_COMPANY_SETTINGS.primaryColor,
              accentColor: match.accentColor || DEFAULT_COMPANY_SETTINGS.accentColor,
              updatedAt: match.updatedAt,
            };
          }
        }
      }
    } catch (e) {}
  }

  return { ...DEFAULT_COMPANY_SETTINGS };
}

export function saveCompanySettings(settings, companyId) {
  const cId = companyId || getActiveTenantId();
  if (!settings) return;

  const stampedSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  if (cId) {
    const rawJson = JSON.stringify(stampedSettings);
    // حفظ متزامن في كافة المفاتيح المتوقعة للشركة لمنع أي تباين بسبب بادئة comp_
    const keysToWrite = [`tenant_${cId}_settings`];
    if (!cId.startsWith('comp_')) {
      keysToWrite.push(`tenant_comp_${cId}_settings`);
    } else {
      keysToWrite.push(`tenant_${cId.replace(/^comp_/, '')}_settings`);
    }

    for (const key of keysToWrite) {
      try {
        localStorage.setItem(key, rawJson);
      } catch (e) {
        console.warn(`LocalStorage error saving ${key}, attempting cache cleanup:`, e);
        try {
          for (const k of Object.keys(localStorage)) {
            if (k.startsWith('offline_queue_') || k.endsWith('_cache') || k.startsWith('temp_')) {
              localStorage.removeItem(k);
            }
          }
          localStorage.setItem(key, rawJson);
        } catch (retryErr) {
          console.error(`Critical: Could not save company settings to ${key}:`, retryErr);
        }
      }
    }

    // 1. مزامنة فورية لسجل الشركة في قائمة الشركات المركزية لمنع استعادة الاسم القديم
    try {
      const rawTenants = localStorage.getItem('platform-tenants-master-v1');
      let tenants = rawTenants ? JSON.parse(rawTenants) : [];
      if (!Array.isArray(tenants)) tenants = [];

      const isMatch = (t) => t?.id === cId || t?.id === `comp_${cId}` || (cId.startsWith('comp_') && t?.id === cId.replace(/^comp_/, ''));
      let found = false;
      const updated = tenants.map(t => {
        if (isMatch(t)) {
          found = true;
          return {
            ...t,
            name: stampedSettings.companyName || t.name,
            subtitle: stampedSettings.companySubtitle !== undefined ? stampedSettings.companySubtitle : t.subtitle,
            logo: stampedSettings.companyLogo !== undefined ? stampedSettings.companyLogo : t.logo,
            currency: stampedSettings.currency || t.currency,
            phone: stampedSettings.phone !== undefined ? stampedSettings.phone : t.phone,
            primaryColor: stampedSettings.primaryColor || t.primaryColor,
            accentColor: stampedSettings.accentColor || t.accentColor,
            updatedAt: stampedSettings.updatedAt,
          };
        }
        return t;
      });

      if (!found) {
        updated.push({
          id: cId,
          name: stampedSettings.companyName || 'شركة المقاولات',
          subtitle: stampedSettings.companySubtitle || 'نظام إدارة المشاريع',
          logo: stampedSettings.companyLogo || null,
          currency: stampedSettings.currency || 'ج.م',
          phone: stampedSettings.phone || '',
          primaryColor: stampedSettings.primaryColor || '#1877F2',
          accentColor: stampedSettings.accentColor || '#166FE5',
          updatedAt: stampedSettings.updatedAt,
        });
      }

      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(updated));
      try {
        syncTenantsListToCloud(updated).catch(() => {});
      } catch (e) {}
    } catch (e) {}

    // 2. تحديث بيانات المستخدم النشط في الجلسة لكي ينعكس الاسم الجديد في الهيدر والسايدبار فوراً
    try {
      const rawUser = localStorage.getItem('active_session_user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        const userCId = user?.companyId;
        const matchesUserCompany = !userCId || userCId === cId || userCId === `comp_${cId}` || (cId.startsWith('comp_') && userCId === cId.replace(/^comp_/, ''));
        if (user && matchesUserCompany) {
          user.companyName = stampedSettings.companyName || user.companyName;
          localStorage.setItem('active_session_user', JSON.stringify(user));
        }
      }
    } catch (e) {}

    // 3. تحديث دليل النطاقات الفرعية (tenant_directory) في Firestore فورياً حتى لا تعيد السابدومينات الاسم القديم
    try {
      const sub = stampedSettings.subdomain || (typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : null);
      if (sub && sub !== 'tashteebpro' && sub !== 'www' && sub !== 'localhost') {
        import('../firebase').then(({ db }) => {
          import('firebase/firestore').then(({ doc, setDoc }) => {
            setDoc(doc(db, 'tenant_directory', sub.toLowerCase().trim()), {
              companyId: cId,
              name: stampedSettings.companyName,
              logo: stampedSettings.companyLogo || null,
              subdomain: sub.toLowerCase().trim(),
              updatedAt: stampedSettings.updatedAt,
            }, { merge: true }).catch(() => {});
          });
        });
      }
    } catch (e) {}
  }

  // تنظيف المفتاح القديم لمنع أي تداخل بين الشركات
  try {
    localStorage.removeItem(COMPANY_SETTINGS_KEY);
  } catch (e) {}

  if (stampedSettings.currency) {
    setGlobalCurrency(stampedSettings.currency);
  }
  applyCompanyBranding(stampedSettings);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('company_settings_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {}

  // المزامنة الفورية مع سحابة Firestore في الخلفية لضمان عدم ضياع الشعار أو الإعدادات
  if (cId) {
    try {
      syncSettingsToCloud(cId, stampedSettings).catch((err) => {
        console.warn("Cloud sync error for company settings:", err);
      });
    } catch (e) {}
  }
}

export function applyCompanyBranding(settings) {
  if (!settings) return;
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (settings.primaryColor) {
    root.style.setProperty('--brand-primary', settings.primaryColor);
  }
  if (settings.accentColor) {
    root.style.setProperty('--brand-secondary', settings.accentColor);
  }
}
