import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tenantsManager from '../tenantsManager';
import * as cloudSync from '../cloudSync';
import { saveCompanySettings, loadCompanySettings } from '../../utils/branding';

const storage = {};
global.localStorage = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => { storage[key] = String(value); }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
};

describe('Company Settings & Logo Persistence Across Sessions', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
    vi.restoreAllMocks();
  });

  it('setActiveTenantId sets both platform-active-tenant-id and tashteeb_active_company_id', () => {
    tenantsManager.setActiveTenantId('comp_safwa_123');
    expect(storage['platform-active-tenant-id']).toBe('comp_safwa_123');
    expect(storage['tashteeb_active_company_id']).toBe('comp_safwa_123');

    tenantsManager.setActiveTenantId(null);
    expect(storage['platform-active-tenant-id']).toBeUndefined();
    expect(storage['tashteeb_active_company_id']).toBeUndefined();
  });

  it('saveCompanySettings stamps updatedAt and updates platform-tenants-master-v1 and active_session_user', () => {
    const compId = 'comp_alameen';
    tenantsManager.setActiveTenantId(compId);

    // Initial platform tenants registry
    storage['platform-tenants-master-v1'] = JSON.stringify([
      { id: compId, name: 'شركة المقاولات', logo: null }
    ]);
    storage['active_session_user'] = JSON.stringify({
      id: 'u_1',
      companyId: compId,
      companyName: 'شركة المقاولات'
    });

    const newSettings = {
      companyName: 'شركة الأمين للمقاولات والتشطيبات',
      companySubtitle: 'تصميم وتشطيب حديث',
      companyLogo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      currency: 'ج.م',
    };

    saveCompanySettings(newSettings, compId);

    // Verify local tenant settings
    const savedLocal = JSON.parse(storage[`tenant_${compId}_settings`]);
    expect(savedLocal.companyName).toBe('شركة الأمين للمقاولات والتشطيبات');
    expect(savedLocal.companyLogo).toBeTruthy();
    expect(savedLocal.updatedAt).toBeTruthy();

    // Verify platform-tenants-master-v1 was updated
    const updatedTenants = JSON.parse(storage['platform-tenants-master-v1']);
    const targetTenant = updatedTenants.find(t => t.id === compId);
    expect(targetTenant.name).toBe('شركة الأمين للمقاولات والتشطيبات');
    expect(targetTenant.logo).toBe(newSettings.companyLogo);

    // Verify active_session_user was updated
    const updatedUser = JSON.parse(storage['active_session_user']);
    expect(updatedUser.companyName).toBe('شركة الأمين للمقاولات والتشطيبات');
  });

  it('getTenantDataAsync does NOT overwrite local logo or custom company name with cloud default/null', async () => {
    const compId = 'comp_modern';
    tenantsManager.setActiveTenantId(compId);

    // Local has updated custom settings with logo
    const localSettings = {
      companyName: 'مؤسسة الإبداع للتشطيبات',
      companySubtitle: 'ديكور ومقاولات',
      companyLogo: 'data:image/png;base64,sample_logo_data',
      currency: 'ج.م',
      updatedAt: '2026-09-26T10:00:00.000Z',
    };
    storage[`tenant_${compId}_settings`] = JSON.stringify(localSettings);
    storage['platform-tenants-master-v1'] = JSON.stringify([
      { id: compId, name: localSettings.companyName, logo: localSettings.companyLogo }
    ]);

    // Cloud has initial registration settings (empty/null logo and default name)
    vi.spyOn(cloudSync, 'fetchCompanyDataFromCloud').mockResolvedValue({
      settings: {
        companyName: 'شركة المقاولات',
        companyLogo: null,
        updatedAt: '2026-09-20T00:00:00.000Z', // older
      }
    });
    vi.spyOn(cloudSync, 'fetchProjectsFromCloud').mockResolvedValue([]);
    vi.spyOn(tenantsManager, 'loadAllTenantsAsync').mockResolvedValue([
      { id: compId, name: localSettings.companyName, logo: localSettings.companyLogo }
    ]);

    const result = await tenantsManager.getTenantDataAsync(compId);

    expect(result.settings.companyName).toBe('مؤسسة الإبداع للتشطيبات');
    expect(result.settings.companyLogo).toBe('data:image/png;base64,sample_logo_data');

    // Local storage cache must retain the logo and custom name
    const finalStoredSettings = JSON.parse(storage[`tenant_${compId}_settings`]);
    expect(finalStoredSettings.companyName).toBe('مؤسسة الإبداع للتشطيبات');
    expect(finalStoredSettings.companyLogo).toBe('data:image/png;base64,sample_logo_data');
  });

  it('resolveTenantUserByEmail reflects updated company name and logo after logout and re-login', async () => {
    const compId = 'comp_relogin_test';
    const email = 'owner@relogin.com';

    // Settings saved prior to logout
    storage[`tenant_${compId}_settings`] = JSON.stringify({
      companyName: 'شركة الأفق الحديث',
      companyLogo: 'data:image/jpeg;base64,horizon_logo',
      currency: 'ر.س',
      updatedAt: '2026-09-26T12:00:00.000Z',
    });

    storage['platform-tenants-master-v1'] = JSON.stringify([
      {
        id: compId,
        name: 'الاسم القديم قبل التعديل',
        adminEmail: email,
        adminName: 'المهندس أحمد',
        logo: null
      }
    ]);

    vi.spyOn(cloudSync, 'fetchTenantsListFromCloud').mockResolvedValue([
      {
        id: compId,
        name: 'الاسم القديم قبل التعديل',
        adminEmail: email,
        adminName: 'المهندس أحمد',
        logo: null
      }
    ]);

    // Simulate login
    const res = await tenantsManager.resolveTenantUserByEmail(email, 'uid_owner_1', {});

    expect(res.success).toBe(true);
    // User companyName and tenant name must be the updated one from local settings
    expect(res.user.companyName).toBe('شركة الأفق الحديث');
    expect(res.tenant.name).toBe('شركة الأفق الحديث');
    expect(res.tenant.logo).toBe('data:image/jpeg;base64,horizon_logo');
  });

  it('saveCompanySettings and loadCompanySettings work seamlessly across comp_ and unprefixed keys', () => {
    const slug = 'safwa_group';
    const compId = `comp_${slug}`;

    const customSettings = {
      companyName: 'مجموعة الصفوة للمقاولات والديكور',
      companySubtitle: 'تشطيبات هندسية متكاملة',
      companyLogo: 'data:image/png;base64,safwa_logo_test',
      currency: 'د.إ',
    };

    // Save with comp_ prefix
    saveCompanySettings(customSettings, compId);

    // Reading with unprefixed slug must find it
    const fromSlug = loadCompanySettings(slug);
    expect(fromSlug.companyName).toBe('مجموعة الصفوة للمقاولات والديكور');
    expect(fromSlug.companyLogo).toBe('data:image/png;base64,safwa_logo_test');

    // Reading with comp_ prefix must find it
    const fromCompId = loadCompanySettings(compId);
    expect(fromCompId.companyName).toBe('مجموعة الصفوة للمقاولات والديكور');
    expect(fromCompId.companyLogo).toBe('data:image/png;base64,safwa_logo_test');

    // Overwrite with unprefixed slug
    const updatedSettings = {
      ...customSettings,
      companyName: 'مجموعة الصفوة العالمية',
    };
    saveCompanySettings(updatedSettings, slug);

    // Reading with comp_ prefix must get the new name
    const reloaded = loadCompanySettings(compId);
    expect(reloaded.companyName).toBe('مجموعة الصفوة العالمية');
    expect(reloaded.companyLogo).toBe('data:image/png;base64,safwa_logo_test');
  });

  it('getTenantData preserves tenant logo and does not write destructive null logo to localStorage', () => {
    const compId = 'comp_heritage';
    // Platform master list has tenant with a logo
    storage['platform-tenants-master-v1'] = JSON.stringify([
      {
        id: compId,
        name: 'شركة التراث للمقاولات',
        logo: 'data:image/png;base64,heritage_logo_data'
      }
    ]);

    const data = tenantsManager.getTenantData(compId);
    expect(data.settings.companyLogo).toBe('data:image/png;base64,heritage_logo_data');
    expect(data.settings.companyName).toBe('شركة التراث للمقاولات');
  });
});
