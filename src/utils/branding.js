/**
 * Utility functions for loading, saving and applying company branding
 */
import { setGlobalCurrency } from './helpers';
import { getActiveTenantId } from '../services/tenantsManager';
import { syncSettingsToCloud } from '../services/cloudSync';

export const COMPANY_SETTINGS_KEY = 'company-settings-v1';

/**
 * ضغط وتحجيم شعار الشركة للحجم المثالي (أقصى بُعد 400 بكسل) وبحجم خفيف جداً (~15-35KB)
 * يضمن حفظه الفوري في LocalStorage و Firestore دون تجاوز أي حدود حجم
 */
export function compressLogoImage(fileOrBlob, maxDim = 512, quality = 0.92) {
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

        const finalMime = (mimeType.includes('png') || mimeType.includes('svg')) ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(finalMime, quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        // Fallback إذا تعذر المعالجة
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
      const tenantRaw = localStorage.getItem(`tenant_${cId}_settings`);
      if (tenantRaw) {
        const parsed = JSON.parse(tenantRaw);
        if (parsed.currency) setGlobalCurrency(parsed.currency);
        return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
      }
    } catch (e) {}
  }

  // لا نقرأ من الكاش العام القديم إطلاقاً إذا كان هناك companyId محدد لمنع تسريب بيانات وشعار شركة سابقة
  if (!cId) {
    try {
      const raw = localStorage.getItem(COMPANY_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.currency) setGlobalCurrency(parsed.currency);
        return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
      }
    } catch (e) {}
  }

  return { ...DEFAULT_COMPANY_SETTINGS };
}

export function saveCompanySettings(settings, companyId) {
  const cId = companyId || getActiveTenantId() || 'comp_alain';
  try {
    localStorage.setItem(`tenant_${cId}_settings`, JSON.stringify(settings));
  } catch (e) {
    console.warn("LocalStorage error saving tenant settings:", e);
  }
  try {
    localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}

  if (settings.currency) {
    setGlobalCurrency(settings.currency);
  }
  applyCompanyBranding(settings);

  try {
    window.dispatchEvent(new Event('company_settings_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}

  // المزامنة الفورية مع سحابة Firestore في الخلفية لضمان عدم ضياع الشعار أو الإعدادات
  try {
    syncSettingsToCloud(cId, settings).catch((err) => {
      console.warn("Cloud sync error for company settings:", err);
    });
  } catch (e) {}
}

export function applyCompanyBranding(settings) {
  if (!settings) return;
  const root = document.documentElement;
  if (settings.primaryColor) {
    root.style.setProperty('--brand-primary', settings.primaryColor);
  }
  if (settings.accentColor) {
    root.style.setProperty('--brand-secondary', settings.accentColor);
  }
}
