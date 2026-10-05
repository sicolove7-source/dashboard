import { describe, it, expect, vi } from 'vitest';
import { sanitizeCompanyUsersForCloud, sanitizeCompanyPayloadForCloud } from '../cloudSync';
import { hashUserPassword } from '../auth';

describe('Phase 3: PassHash Complete Eradication Tests', () => {
  it('1. sanitizeCompanyUsersForCloud completely strips passHash, passwordUpdatedAt, and plain passwords', () => {
    const rawUsers = [
      {
        id: 'usr_1',
        name: 'Ahmed',
        email: 'ahmed@example.com',
        role: 'engineer',
        password: 'secretPassword123',
        adminPassword: 'adminSecret456',
        passHash: 'h_abcdef1234567890',
        passwordUpdatedAt: '2026-10-01T12:00:00.000Z',
        phone: '01012345678'
      },
      {
        id: 'usr_2',
        name: 'Sara',
        email: 'sara@example.com',
        role: 'accountant'
      }
    ];

    const cleaned = sanitizeCompanyUsersForCloud(rawUsers);

    expect(cleaned).toHaveLength(2);
    // User 1
    expect(cleaned[0].id).toBe('usr_1');
    expect(cleaned[0].name).toBe('Ahmed');
    expect(cleaned[0].email).toBe('ahmed@example.com');
    expect(cleaned[0].role).toBe('engineer');
    expect(cleaned[0].phone).toBe('01012345678');
    // Sensitive fields MUST be absent
    expect(cleaned[0].password).toBeUndefined();
    expect(cleaned[0].adminPassword).toBeUndefined();
    expect(cleaned[0].passHash).toBeUndefined();
    expect(cleaned[0].passwordUpdatedAt).toBeUndefined();

    // User 2
    expect(cleaned[1].id).toBe('usr_2');
    expect(cleaned[1].passHash).toBeUndefined();
  });

  it('2. sanitizeCompanyPayloadForCloud scrubs passHash from root and nested users and team', () => {
    const payload = {
      name: 'Modern Contracting',
      password: 'rootPassword',
      adminPassword: 'rootAdminPassword',
      passHash: 'rootHash123',
      passwordUpdatedAt: '2026-10-01T12:00:00.000Z',
      users: [
        {
          id: 'u_1',
          name: 'Omar',
          passHash: 'nestedHash',
          passwordUpdatedAt: '2026-10-01T12:00:00.000Z'
        }
      ],
      team: [
        {
          id: 't_1',
          name: 'Khaled',
          passHash: 'teamHash',
          passwordUpdatedAt: '2026-10-01T12:00:00.000Z'
        }
      ]
    };

    const sanitized = sanitizeCompanyPayloadForCloud('comp_modern', payload);

    expect(sanitized.name).toBe('Modern Contracting');
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.adminPassword).toBeUndefined();
    expect(sanitized.passHash).toBeUndefined();
    expect(sanitized.passwordUpdatedAt).toBeUndefined();

    // Nested users
    expect(sanitized.users[0].passHash).toBeUndefined();
    expect(sanitized.users[0].passwordUpdatedAt).toBeUndefined();

    // Nested team
    expect(sanitized.team[0].passHash).toBeUndefined();
    expect(sanitized.team[0].passwordUpdatedAt).toBeUndefined();
  });

  it('3. hashUserPassword returns null and logs deprecation notice', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await hashUserPassword('anyPassword123');
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[Security] hashUserPassword is deprecated')
    );
    spy.mockRestore();
  });
});
