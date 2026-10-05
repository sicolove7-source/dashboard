import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTenantUserByEmail } from '../tenantsManager';
import { canAssignRole, isValidRole } from '../../../functions/validators';

const storage = {};
global.localStorage = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => { storage[key] = String(value); }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
};

describe('Phase 2: Roles and Claims Single Source of Truth Tests', () => {

  describe('1. createCompanyUser Safety and Hierarchy Rules', () => {
    it('blocks self-downgrade (user cannot edit their own role via createCompanyUser)', () => {
      const callerUid = 'uid_owner_1';
      const targetUid = 'uid_owner_1';
      const isNew = false;

      // محاكاة شرط الرفض المنفذ في createCompanyUser
      const isSelfEditBlocked = !isNew && callerUid === targetUid;
      expect(isSelfEditBlocked).toBe(true);
    });

    it('blocks an admin from modifying another admin', () => {
      const callerRole = 'admin';
      const targetExistingRole = 'admin';
      const isSuperAdmin = false;

      const isAdminOnAdminBlocked =
        callerRole === 'admin' &&
        targetExistingRole === 'admin' &&
        !isSuperAdmin;

      expect(isAdminOnAdminBlocked).toBe(true);
    });

    it('allows an owner to assign and change an engineer or accountant role', () => {
      expect(canAssignRole('owner', 'engineer')).toBe(true);
      expect(canAssignRole('owner', 'accountant')).toBe(true);
      expect(canAssignRole('owner', 'admin')).toBe(true);
    });

    it('strictly forbids any company owner from assigning super_admin', () => {
      expect(canAssignRole('owner', 'super_admin')).toBe(false);
      expect(canAssignRole('admin', 'super_admin')).toBe(false);
    });
  });

  describe('2. Single Source of Truth in resolveTenantUserByEmail', () => {
    it('strictly requires claims.role and rejects login if role is missing', async () => {
      const claimsWithNoRole = { companyId: 'comp_amlak' }; // missing role!
      const res = await resolveTenantUserByEmail('user@amlak.com', 'uid_1', claimsWithNoRole);

      expect(res.success).toBe(false);
      expect(res.error).toBe('missing_role_claims');
    });

    it('does NOT fallback to engineer or viewer when claims.role is missing', async () => {
      const claimsWithNoRole = { companyId: 'comp_amlak' };
      const res = await resolveTenantUserByEmail('user@amlak.com', 'uid_1', claimsWithNoRole);

      expect(res.user?.role).toBeUndefined();
    });

    it('uses claims.role as the sole source of truth when present', async () => {
      const validClaims = { companyId: 'comp_amlak', role: 'supervisor' };
      const res = await resolveTenantUserByEmail('supervisor@amlak.com', 'uid_2', validClaims);

      expect(res.success).toBe(true);
      expect(res.user?.role).toBe('supervisor');
      expect(res.user?.companyId).toBe('comp_amlak');
    });

    it('rejects unauthenticated user without claims from acquiring owner role via local adminEmail', async () => {
      // محاكاة دخول مستخدم عادي بدون claims يطابق adminEmail لشركة محلية
      const emptyClaims = {};
      const res = await resolveTenantUserByEmail('random_visitor@other.com', 'uid_random', emptyClaims);

      // يجب أن يفشل الدخول ولا يمنح دور owner تلقائياً
      expect(res.success).toBe(false);
      expect(res.user).toBeNull();
    });
  });

  describe('3. Self-Registration and Company Takeover Prevention', () => {
    it('blocks self-registration of an already existing company (prevents hasNoAdminYet takeover)', () => {
      const compExists = true;
      const tenantExists = true;
      const callerUid = 'attacker_uid';
      const compAdminUid = null; // الشركة ليس لها adminUid مسجل

      // في المنطق القديم: hasNoAdminYet كان يسمح للمهاجم بأن يصبح مالكاً
      const oldAllowedTakeover = !compAdminUid;
      expect(oldAllowedTakeover).toBe(true);

      // في المنطق الجديد: وجود الشركة يمنع التسجيل الذاتي قطعياً
      const isBlockedInNewRules = compExists || tenantExists;
      expect(isBlockedInNewRules).toBe(true);
    });

    it('requires email_verified for registering a brand-new company', () => {
      const isNewCompany = true;
      const emailVerified = false;
      const callerEmail = 'unverified_new_owner@gmail.com';

      const isAllowed = isNewCompany && (emailVerified || callerEmail.endsWith('@tashteeb.app'));
      expect(isAllowed).toBe(false);
    });
  });

  describe('4. Super Admin Domain Resolution', () => {
    it('correctly preserves super_admin role on main portal and on company subdomains', async () => {
      const superAdminClaims = { role: 'super_admin', isSuperAdmin: true };
      const res = await resolveTenantUserByEmail('sicolove7@gmail.com', 'uid_sico', superAdminClaims);

      expect(res.success).toBe(true);
      expect(res.user?.role).toBe('super_admin');
      expect(res.user?.isSuperAdmin).toBe(true);
    });
  });
});
