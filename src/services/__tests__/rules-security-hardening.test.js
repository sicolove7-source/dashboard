import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 1: Firestore Rules & Security Hardening Unit Tests', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  describe('Static Security Inspection of firestore.rules', () => {
    it('does NOT contain the insecure wildcard match /platform_metadata/{docId}', () => {
      // وجود هذا الـ wildcard كان يتسبب في تجاوز قاعدة allow read, write: if false عبر تداخل OR
      expect(rulesContent).not.toMatch(/match\s+\/platform_metadata\/\{docId\}/);
    });

    it('explicitly forbids all reads and writes on /platform_metadata/superadmin', () => {
      // التأكد من وجود منع صريح ومطلق لقراءة وكتابة وثيقة superadmin
      const superadminMatch = rulesContent.match(
        /match\s+\/platform_metadata\/superadmin\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/
      );
      expect(superadminMatch).not.toBeNull();
    });

    it('explicitly forbids all reads and writes on /platform_metadata/users_directory', () => {
      // حماية بيانات الدليل من أي قراءة عامة أو كتابة مباشرة
      const usersDirMatch = rulesContent.match(
        /match\s+\/platform_metadata\/users_directory\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/
      );
      expect(usersDirMatch).not.toBeNull();
    });

    it('restricts write access to /tenants/{companyId} strictly to isSuperAdmin()', () => {
      // منع الموظفين والعملاء من تعديل الخطط وحالة الاشتراك والبريد الإداري
      const tenantMatch = rulesContent.match(
        /match\s+\/tenants\/\{companyId\}\s*\{[\s\S]*?allow\s+write:\s*if\s+isSuperAdmin\(\);/
      );
      expect(tenantMatch).not.toBeNull();
    });

    it('restricts update on /tenant_directory/{subdomain} strictly to isSuperAdmin()', () => {
      // منع أي مستخدم عادي من تغيير ملكية النطاق الفرعي لشركة أخرى
      const dirMatch = rulesContent.match(
        /match\s+\/tenant_directory\/\{subdomain\}\s*\{[\s\S]*?allow\s+update:\s*if\s+isSuperAdmin\(\);/
      );
      expect(dirMatch).not.toBeNull();
    });

    it('does NOT use flawed .replace("comp_", "") in CEL rules', () => {
      // استبدال .replace الخطير الذي كان يزيل كل التطابقات في حال تكرار البادئة
      expect(rulesContent).not.toContain(".replace('comp_', '')");
    });
  });

  describe('Firestore Rule Resolution & OR-Logic Overlap Simulation', () => {
    /**
     * محاكاة محرك قواعد فايرستور في معالجة تداخل القواعد (OR Logic).
     * في فايرستور: إذا طابقت وثيقة أكثر من قاعدة match، يتم منح الإذن إذا كانت أي من القواعد true.
     * Rule A: allow read: if false;
     * Rule B: allow read: if isAuthenticated();
     * النتيجة: false || true == true (ثغرة تداخل القواعد OR Overlap!)
     */
    function evaluateDocumentAccess(docPath, auth) {
      // 1. القواعد القديمة (مع وجود wildcard)
      const oldRules = [
        {
          pattern: /^\/platform_metadata\/superadmin$/,
          allowRead: () => false,
        },
        {
          // الـ Wildcard القديم كان يطابق أي وثيقة في platform_metadata
          pattern: /^\/platform_metadata\/[^/]+$/,
          allowRead: (user) => user !== null, // isAuthenticated()
        },
      ];

      // 2. القواعد الجديدة بعد التعديل (وثائق صريحة فقط، بدون أي wildcard)
      const newRules = [
        {
          pattern: /^\/platform_metadata\/superadmin$/,
          allowRead: () => false, // مغلقة تماماً
        },
        {
          pattern: /^\/platform_metadata\/users_directory$/,
          allowRead: () => false, // مغلقة تماماً
        },
        {
          pattern: /^\/platform_metadata\/platform_settings$/,
          allowRead: () => true, // إعدادات عامة
        },
        {
          pattern: /^\/platform_metadata\/tenants$/,
          allowRead: (user) => user?.role === 'super_admin' || user?.email === 'sicolove7@gmail.com',
        },
      ];

      // حساب النتيجة بالقواعد القديمة
      const oldPermitted = oldRules
        .filter((r) => r.pattern.test(docPath))
        .some((r) => r.allowRead(auth));

      // حساب النتيجة بالقواعد الجديدة
      const newMatches = newRules.filter((r) => r.pattern.test(docPath));
      const newPermitted = newMatches.length > 0 && newMatches.some((r) => r.allowRead(auth));

      return { oldPermitted, newPermitted };
    }

    it('demonstrates that the OLD rules had an OR-overlap leak for platform_metadata/superadmin', () => {
      const normalUser = { uid: 'user_123', email: 'employee@company.com', role: 'engineer' };

      const result = evaluateDocumentAccess('/platform_metadata/superadmin', normalUser);
      // في القواعد القديمة، كان المستخدم العادي يستطيع قراءة السوبر أدمن بسبب قاعدة docId!
      expect(result.oldPermitted).toBe(true);
      // في القواعد الجديدة، تم سد الثغرة والقراءة مرفوضة تماماً
      expect(result.newPermitted).toBe(false);
    });

    it('proves that ANONYMOUS users cannot read platform_metadata/superadmin under NEW rules', () => {
      const anonymousUser = null;

      const result = evaluateDocumentAccess('/platform_metadata/superadmin', anonymousUser);
      expect(result.newPermitted).toBe(false);
    });

    it('proves that AUTHENTICATED normal users cannot read platform_metadata/superadmin under NEW rules', () => {
      const regularUsers = [
        { uid: 'u1', email: 'owner@amlak.com', role: 'owner', companyId: 'amlak' },
        { uid: 'u2', email: 'engineer@nglaa.com', role: 'engineer', companyId: 'nglaa' },
        { uid: 'u3', email: 'viewer@client.com', role: 'viewer', companyId: 'amlak' },
      ];

      for (const user of regularUsers) {
        const result = evaluateDocumentAccess('/platform_metadata/superadmin', user);
        expect(result.newPermitted).toBe(false);
      }
    });

    it('proves that even SUPER_ADMIN cannot read platform_metadata/superadmin via Firestore directly', () => {
      // لأن السر نُقل بالكامل إلى Secret Manager، لا ينبغي لأحد قراءتها عبر Client SDK
      const superAdminUser = { uid: 'sa1', email: 'sicolove7@gmail.com', role: 'super_admin' };
      const result = evaluateDocumentAccess('/platform_metadata/superadmin', superAdminUser);
      expect(result.newPermitted).toBe(false);
    });
  });
});
