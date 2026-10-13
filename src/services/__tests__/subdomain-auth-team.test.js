import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tenantsManager from '../tenantsManager';
import * as cloudSync from '../cloudSync';

// Mock localStorage in Node test runner
const storage = {};
global.localStorage = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => { storage[key] = String(value); }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
};

describe('Subdomain, SuperAdmin Security & Team Fixes', () => {

  describe('SuperAdmin Security (Anti-Spoofing)', () => {
    it('does not export SUPER_ADMIN_STORAGE_KEY or BUILTIN_SUPERADMIN_EMAILS', () => {
      expect(tenantsManager.SUPER_ADMIN_STORAGE_KEY).toBeUndefined();
      expect(tenantsManager.BUILTIN_SUPERADMIN_EMAILS).toBeUndefined();
      expect(tenantsManager.DEFAULT_SUPER_ADMIN_ACCOUNT).toBeUndefined();
      expect(tenantsManager.getSuperAdminAccount).toBeUndefined();
      expect(tenantsManager.saveSuperAdminAccount).toBeUndefined();
    });

    it('denies super_admin role when claims do not have role="super_admin" for regular user', async () => {
      const email = 'employee@company.com';
      const claimsWithoutSuperAdmin = { role: 'engineer', companyId: 'comp_test' };
      const res = await tenantsManager.resolveTenantUserByEmail(email, 'uid_123', claimsWithoutSuperAdmin);

      // Should NOT grant super_admin
      expect(res.user?.role).not.toBe('super_admin');
      expect(res.user?.isSuperAdmin).toBeFalsy();
    });

    it('recognizes platform owner sicolove7@gmail.com as super_admin', async () => {
      const email = 'sicolove7@gmail.com';
      const res = await tenantsManager.resolveTenantUserByEmail(email, 'uid_owner_sico', {});
      expect(res.user?.role).toBe('super_admin');
      expect(res.user?.isSuperAdmin).toBe(true);
    });

    it('denies super_admin role for newly registered admin@platform.com when claims are empty', async () => {
      vi.spyOn(cloudSync, 'fetchUserFromCloudDirectory').mockResolvedValue(null);
      vi.spyOn(cloudSync, 'fetchCompanyDataFromCloud').mockResolvedValue(null);

      const email = 'admin@platform.com';
      const emptyClaims = {};
      const res = await tenantsManager.resolveTenantUserByEmail(email, 'uid_new_attacker', emptyClaims);

      // Must NOT grant super_admin
      expect(res.user?.role).not.toBe('super_admin');
      expect(res.user?.isSuperAdmin).toBeFalsy();
      expect(res.isSuperAdmin).toBeFalsy();
    });

    it('grants super_admin role ONLY when claims.role === "super_admin" or claims.isSuperAdmin === true', async () => {
      const email = 'any-verified-admin@platform.com';
      const validClaims = { role: 'super_admin', isSuperAdmin: true };
      const res = await tenantsManager.resolveTenantUserByEmail(email, 'uid_admin', validClaims);

      expect(res.success).toBe(true);
      expect(res.user?.role).toBe('super_admin');
      expect(res.user?.isSuperAdmin).toBe(true);
    });

    it('rejects localStorage attempts to spoof super_admin', async () => {
      // Simulate localStorage attack
      localStorage.setItem('active_session_user', JSON.stringify({
        email: 'attacker@example.com',
        role: 'super_admin',
        isSuperAdmin: true,
      }));

      // In tenantsManager, resolution ignores localStorage for superadmin role check
      const res = await tenantsManager.resolveTenantUserByEmail('attacker@example.com', 'uid_attacker', {
        role: 'engineer',
        companyId: 'comp_test'
      });

      expect(res.user?.role).not.toBe('super_admin');
    });
  });

  describe('Subdomain Directory Resolution', () => {
    it('fetchTenantBySubdomain handles missing or empty subdomain cleanly', async () => {
      const res1 = await cloudSync.fetchTenantBySubdomain('');
      const res2 = await cloudSync.fetchTenantBySubdomain(null);
      expect(res1).toBeNull();
      expect(res2).toBeNull();
    });
  });

  describe('Employee Resolution & Anti-Elevation Protection', () => {
    it('preserves employee role (engineer) and never elevates to owner even if company phone is identical', async () => {
      const testTenant = {
        id: 'comp_amlak_test',
        name: 'شركة أملاك',
        subdomain: 'amlak-test',
        phone: '01018160583', // Company public phone
        adminPhone: '01199999999', // Distinct Admin phone
        adminEmail: 'owner@amlak-test.com',
        users: [
          {
            id: 'u_emp_1',
            name: 'المهندس أحمد',
            email: 'eng.ahmed@amlak.com',
            phone: '01018160583', // Employee has same phone as company phone
            role: 'engineer',
            companyId: 'comp_amlak_test',
          }
        ]
      };

      tenantsManager.saveAllTenants([testTenant]);

      // Resolve via employee phone-based email
      const res = await tenantsManager.resolveTenantUserByEmail('phone_01018160583@tashteeb.app', 'uid_emp_1', {});
      expect(res.success).toBe(true);
      expect(res.user.role).toBe('engineer');
      expect(res.user.role).not.toBe('owner');
      expect(res.user.companyId).toBe('comp_amlak_test');
    });

    it('rejects unassigned user rather than promoting them to owner on subdomain', async () => {
      const res = await tenantsManager.resolveTenantUserByEmail('unknown-stranger@gmail.com', 'uid_stranger', {});
      expect(res.success).toBe(false);
      expect(res.user).toBeNull();
      expect(res.error).toContain('لم يتم ربط هذا الحساب بأي شركة');
    });
  });
});
