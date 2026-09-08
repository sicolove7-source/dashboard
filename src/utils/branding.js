/**
 * Utility functions for loading, saving and applying company branding
 */
import { setGlobalCurrency } from './helpers';
import { getActiveTenantId } from '../services/tenantsManager';

export const COMPANY_SETTINGS_KEY = 'company-settings-v1';

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: 'دار الظبي للديكور والتصميم الداخلي',
  companySubtitle: 'نظام إدارة المشاريع والتشطيبات المتكامل',
  companyLogo: null,
  primaryColor: '#1877F2',
  accentColor: '#166FE5',
  currency: 'د.إ',
  city: 'أبوظبي',
  country: 'الإمارات',
  phone: '+201018160582',
  supportPhone: '+201018160582',
  email: 'contact@daraldhabi.ae',
  taxNumber: '100-245-890-0003',
  commercialRegister: 'CN-1049281',
  address: 'شارع المرور - برج النور - الطابق 4',
  website: 'www.daraldhabi.ae',
  subdomain: 'daraldhabi',
  customDomain: 'portal.daraldhabi.com',
  customDomainVerified: true,
};

export function loadCompanySettings(companyId) {
  const cId = companyId || getActiveTenantId() || 'comp_alain';
  try {
    const tenantRaw = localStorage.getItem(`tenant_${cId}_settings`);
    if (tenantRaw) {
      const parsed = JSON.parse(tenantRaw);
      if (parsed.currency) setGlobalCurrency(parsed.currency);
      return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
    }
  } catch (e) {}

  try {
    const raw = localStorage.getItem(COMPANY_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.currency) setGlobalCurrency(parsed.currency);
      return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
    }
  } catch (e) {}

  return { ...DEFAULT_COMPANY_SETTINGS };
}

export function saveCompanySettings(settings, companyId) {
  const cId = companyId || getActiveTenantId() || 'comp_alain';
  try {
    localStorage.setItem(`tenant_${cId}_settings`, JSON.stringify(settings));
  } catch (e) {}
  try {
    localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}

  if (settings.currency) {
    setGlobalCurrency(settings.currency);
  }
  applyCompanyBranding(settings);

  try {
    window.dispatchEvent(new Event('company_settings_updated'));
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
