import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveTenantUserByEmail } from '../tenantsManager';
import * as cloudSync from '../cloudSync';

const storage = {};
global.localStorage = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => { storage[key] = String(value); }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
};

describe('Employee Cross-Browser and Multi-Tenant Resolution', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
    vi.restoreAllMocks();
  });

  it('successfully resolves an employee on another browser via cloud discovery', async () => {
    const companyId = 'comp_c_abc123';
    const employeeEmail = 'engineer.ahmed@example.com';

    // Mock fetchUserFromCloudDirectory to return the employee found in cloud
    vi.spyOn(cloudSync, 'fetchUserFromCloudDirectory').mockResolvedValue({
      id: 'u_emp_1',
      email: employeeEmail,
      name: 'م. أحمد علي',
      role: 'engineer',
      companyId: companyId,
      companyName: 'شركة الديكور الحديث',
      currency: 'ج.م',
    });

    const result = await resolveTenantUserByEmail(employeeEmail, 'uid_emp_1', {});

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(employeeEmail);
    expect(result.user.name).toBe('م. أحمد علي');
    expect(result.user.role).toBe('engineer');
    expect(result.user.companyId).toBe(companyId);
    expect(result.tenant).toBeDefined();
    expect(result.tenant.id).toBe(companyId);
    expect(result.tenant.name).toBe('شركة الديكور الحديث');
    expect(result.isSuperAdmin).toBe(false);

    // Verify it was cached locally for the new browser
    const storedUsers = JSON.parse(storage[`tenant_${companyId}_users`] || '[]');
    expect(storedUsers.some(u => u.email === employeeEmail)).toBe(true);
  });

  it('correctly handles suspended employee account from cloud on another browser', async () => {
    const employeeEmail = 'suspended.emp@example.com';

    vi.spyOn(cloudSync, 'fetchUserFromCloudDirectory').mockResolvedValue({
      id: 'u_emp_susp',
      email: employeeEmail,
      name: 'موظف موقوف',
      role: 'engineer',
      companyId: 'comp_c_xyz',
      companyName: 'شركة تجريبية',
      status: 'suspended'
    });

    const result = await resolveTenantUserByEmail(employeeEmail, 'uid_emp_susp', {});

    expect(result.success).toBe(false);
    expect(result.isUserSuspended).toBe(true);
    expect(result.error).toContain('تم إيقاف هذا الحساب');
  });

  it('correctly handles deleted employee account from cloud on another browser', async () => {
    const employeeEmail = 'deleted.emp@example.com';

    vi.spyOn(cloudSync, 'fetchUserFromCloudDirectory').mockResolvedValue({
      id: 'u_emp_del',
      email: employeeEmail,
      name: 'موظف محذوف',
      role: 'engineer',
      companyId: 'comp_c_xyz',
      companyName: 'شركة تجريبية',
      isDeleted: true
    });

    const result = await resolveTenantUserByEmail(employeeEmail, 'uid_emp_del', {});

    expect(result.success).toBe(false);
    expect(result.isDeleted).toBe(true);
    expect(result.error).toContain('تم حذفه');
  });
});
