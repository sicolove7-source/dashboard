import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tenantsManager from '../tenantsManager';
import * as cloudSync from '../cloudSync';

const storage = {};
global.localStorage = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => { storage[key] = String(value); }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
};

describe('Account Suspension and Deletion Security Enforcement', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
    vi.restoreAllMocks();
  });

  it('rejects login with isTenantSuspended when tenant status is suspended', async () => {
    const tenants = [
      {
        id: 'comp_suspended_1',
        name: 'شركة معلقة',
        status: 'suspended',
        authorizedEmails: ['owner@suspended.com'],
        users: [{ id: 'u1', email: 'owner@suspended.com', role: 'admin', status: 'active' }]
      }
    ];
    storage['platform-tenants-master-v1'] = JSON.stringify(tenants);
    vi.spyOn(cloudSync, 'fetchUserFromCloudDirectory').mockResolvedValue(null);
    vi.spyOn(cloudSync, 'fetchCompanyDataFromCloud').mockResolvedValue(null);

    const res = await tenantsManager.resolveTenantUserByEmail('owner@suspended.com', 'uid_1', {});
    expect(res.isTenantSuspended).toBe(true);
    expect(res.tenant?.status).toBe('suspended');
  });

  it('rejects login with isUserSuspended when user status is suspended', async () => {
    const tenants = [
      {
        id: 'comp_active_1',
        name: 'شركة نشطة',
        status: 'active',
        authorizedEmails: ['eng@active.com'],
        users: [{ id: 'u2', email: 'eng@active.com', role: 'engineer', status: 'suspended' }]
      }
    ];
    storage['platform-tenants-master-v1'] = JSON.stringify(tenants);
    vi.spyOn(cloudSync, 'fetchUserFromCloudDirectory').mockResolvedValue(null);
    vi.spyOn(cloudSync, 'fetchCompanyDataFromCloud').mockResolvedValue(null);

    const res = await tenantsManager.resolveTenantUserByEmail('eng@active.com', 'uid_2', {});
    expect(res.isUserSuspended).toBe(true);
  });

  it('rejects login when cloud user directory marks user as deleted or suspended', async () => {
    vi.spyOn(cloudSync, 'fetchUserFromCloudDirectory').mockResolvedValue({
      email: 'deleted@company.com',
      companyId: 'comp_test',
      isDeleted: true,
      status: 'deleted'
    });

    const res = await tenantsManager.resolveTenantUserByEmail('deleted@company.com', 'uid_3', {});
    expect(res.isDeleted).toBe(true);
  });

  it('rejects deleted user when removed from tenant users and registry', async () => {
    const tenants = [
      {
        id: 'comp_active_2',
        name: 'شركة نشطة 2',
        status: 'active',
        authorizedEmails: ['other@active.com'],
        users: [{ id: 'u3', email: 'other@active.com', role: 'engineer', status: 'active' }]
      }
    ];
    storage['platform-tenants-master-v1'] = JSON.stringify(tenants);
    storage['platform-all-users-registry'] = JSON.stringify({});
    vi.spyOn(cloudSync, 'fetchUserFromCloudDirectory').mockResolvedValue(null);
    vi.spyOn(cloudSync, 'fetchCompanyDataFromCloud').mockResolvedValue(null);

    const res = await tenantsManager.resolveTenantUserByEmail('deleted_emp@active.com', 'uid_4', {});
    expect(res.user).toBeNull();
    expect(res.tenant).toBeNull();
  });
});
