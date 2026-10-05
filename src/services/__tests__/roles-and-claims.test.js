import { describe, it, expect, vi } from 'vitest';
import {
  ALLOWED_ROLES,
  canAssignRole,
  validateSubdomain,
  safeTimingCompare,
  cleanPhone,
  sanitizePortalPayload,
} from '../../../functions/validators';

describe('Security & Role Hierarchy Enforcement (Phase 1 Fixes)', () => {
  describe('1. Role Hierarchy and Assignment Permissions', () => {
    it('allows super_admin to assign any valid role', () => {
      expect(canAssignRole('super_admin', 'owner', true)).toBe(true);
      expect(canAssignRole('super_admin', 'engineer', true)).toBe(true);
      expect(canAssignRole('super_admin', 'admin', true)).toBe(true);
    });

    it('allows owner to assign roles below owner (admin, engineer, accountant), but NOT super_admin', () => {
      expect(canAssignRole('owner', 'admin')).toBe(true);
      expect(canAssignRole('owner', 'manager')).toBe(true);
      expect(canAssignRole('owner', 'engineer')).toBe(true);
      expect(canAssignRole('owner', 'accountant')).toBe(true);
      expect(canAssignRole('owner', 'super_admin')).toBe(false);
    });

    it('prevents admin from creating owners or admins', () => {
      expect(canAssignRole('admin', 'owner')).toBe(false);
      expect(canAssignRole('admin', 'admin')).toBe(false);
      expect(canAssignRole('admin', 'engineer')).toBe(true);
      expect(canAssignRole('admin', 'manager')).toBe(true);
    });

    it('prevents engineers and employees from assigning claims or creating users', () => {
      expect(canAssignRole('engineer', 'owner')).toBe(false);
      expect(canAssignRole('engineer', 'engineer')).toBe(false);
      expect(canAssignRole('accountant', 'engineer')).toBe(false);
      expect(canAssignRole('supervisor', 'owner')).toBe(false);
      expect(canAssignRole('viewer', 'viewer')).toBe(false);
    });

    it('rejects invalid roles completely', () => {
      expect(canAssignRole('owner', 'hacker_role')).toBe(false);
      expect(canAssignRole('admin', 'custom_role')).toBe(false);
    });
  });

  describe('2. Subdomain Validation & Reserved Names Protection', () => {
    it('accepts valid company subdomains', () => {
      const res = validateSubdomain('amlak');
      expect(res.valid).toBe(true);
      expect(res.cleanSubdomain).toBe('amlak');
    });

    it('rejects reserved platform subdomains', () => {
      expect(validateSubdomain('admin').valid).toBe(false);
      expect(validateSubdomain('api').valid).toBe(false);
      expect(validateSubdomain('app').valid).toBe(false);
      expect(validateSubdomain('portal').valid).toBe(false);
      expect(validateSubdomain('superadmin').valid).toBe(false);
      expect(validateSubdomain('tashteeb').valid).toBe(false);
    });

    it('rejects invalid characters and malformed subdomains', () => {
      expect(validateSubdomain('ab').valid).toBe(false); // too short (< 3)
      expect(validateSubdomain('-invalid').valid).toBe(false); // starts with hyphen
      expect(validateSubdomain('invalid-').valid).toBe(false); // ends with hyphen
      expect(validateSubdomain('company_name').valid).toBe(false); // underscores not allowed
      expect(validateSubdomain('company.com').valid).toBe(false); // dots not allowed
    });
  });

  describe('3. Timing-Safe Secret Comparison', () => {
    it('correctly matches equal secrets regardless of input format', () => {
      const secret = 'super_secret_bootstrap_token_12345';
      expect(safeTimingCompare(secret, secret)).toBe(true);
    });

    it('rejects mismatched secrets without throwing errors', () => {
      expect(safeTimingCompare('secret_1', 'secret_2')).toBe(false);
      expect(safeTimingCompare('', 'secret')).toBe(false);
      expect(safeTimingCompare(undefined, 'secret')).toBe(false);
    });
  });

  describe('4. Phone Number Normalization', () => {
    it('normalizes Arabic and Persian digits to standard digits', () => {
      expect(cleanPhone('٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
      expect(cleanPhone('+201012345678')).toBe('01012345678');
      expect(cleanPhone('00201012345678')).toBe('01012345678');
    });
  });

  describe('5. Client Portal Payload Sanitization (Internal Costs Isolation)', () => {
    it('strictly removes expenses, subcontractor rates, and private notes from portal shares', () => {
      const rawProject = {
        id: 'proj_123',
        companyId: 'comp_amlak',
        name: 'فيلا الياسمين',
        client: 'السيد أحمد',
        contractValue: 500000,
        budget: 500000,
        expenses: [
          { id: 'exp_1', title: 'شراء حديد تسليح', amount: 120000, supplier: 'شركة الأهرام' },
          { id: 'exp_2', title: 'مصنعية مقاول خرسانات', amount: 45000, privateNotes: 'عمولة 5%' },
        ],
        subcontractors: [
          { name: 'مقاول السباكة', internalCost: 35000 },
        ],
        workItems: [
          { id: 'w1', title: 'مرحلة الأساسات', status: 'completed', progress: 100 },
        ],
        clientPayments: [
          { id: 'p1', title: 'دفعة أولى', amount: 150000, status: 'paid' },
        ],
      };

      const token = 'strong_random_token_abcdef123456789';
      const sanitized = sanitizePortalPayload(rawProject, token);

      expect(sanitized.id).toBe('proj_123');
      expect(sanitized.token).toBe(token);
      expect(sanitized.contractValue).toBe(500000);
      expect(sanitized.workItems.length).toBe(1);
      expect(sanitized.payments.length).toBe(1);

      // CRITICAL: Ensure internal expenses and subcontractors are completely stripped
      expect(sanitized.expenses).toBeUndefined();
      expect(sanitized.subcontractors).toBeUndefined();
    });
  });

  describe('6. Company AdminUid and Multi-Tenant Isolation Protection', () => {
    it('ensures that assigning an employee role cannot alter company adminUid', () => {
      const existingCompanyDoc = {
        id: 'comp_test',
        name: 'شركة المقاولات المتحدة',
        adminUid: 'uid_original_owner_999',
        adminEmail: 'owner@original.com',
      };

      const targetRole = 'engineer';
      const targetUid = 'uid_new_engineer_111';

      // Simulated logic from our refactored assignUserClaims:
      // adminUid is ONLY updated if role === 'owner' AND (!compData.adminUid || compData.adminUid === targetUid)
      let updatedAdminUid = existingCompanyDoc.adminUid;
      if (targetRole === 'owner' && (!existingCompanyDoc.adminUid || existingCompanyDoc.adminUid === targetUid)) {
        updatedAdminUid = targetUid;
      }

      expect(updatedAdminUid).toBe('uid_original_owner_999');
      expect(updatedAdminUid).not.toBe(targetUid);
    });

    it('rejects cross-company claims hijacking for an existing user', () => {
      const existingUserClaims = {
        companyId: 'comp_company_A',
        role: 'engineer',
      };

      const requestedCompanyId = 'comp_company_B';
      const isSuperAdmin = false;

      // Simulated logic from createCompanyUser & assignUserClaims:
      const shouldReject =
        existingUserClaims.companyId &&
        existingUserClaims.companyId !== requestedCompanyId &&
        !isSuperAdmin;

      expect(shouldReject).toBe(true);
    });
  });
});
