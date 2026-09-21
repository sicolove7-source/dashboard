import { describe, it, expect } from 'vitest';
import {
  stripUndefined,
  sanitizeProjectForCloud,
  mergeUsersPreservingLocal,
  mergeTeamsPreservingLocal,
} from '../cloudSync';
import { parseClientPortalFromUrl } from '../portalResolver';

describe('Phase 0: Pure Functions Fixes', () => {

  describe('stripUndefined', () => {
    it('removes undefined properties from plain nested objects', () => {
      const input = { a: 1, b: undefined, c: { d: undefined, e: 'hello' } };
      const result = stripUndefined(input);
      expect(result).toEqual({ a: 1, c: { e: 'hello' } });
    });

    it('preserves false, 0, null, and empty strings', () => {
      const input = { a: false, b: 0, c: null, d: '' };
      const result = stripUndefined(input);
      expect(result).toEqual({ a: false, b: 0, c: null, d: '' });
    });

    it('preserves Date instances without converting them to empty plain objects', () => {
      const now = new Date('2026-09-21T12:00:00Z');
      const input = { createdAt: now, note: undefined };
      const result = stripUndefined(input);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe(now.toISOString());
      expect(result.note).toBeUndefined();
    });

    it('preserves non-plain class instances such as Firestore Timestamp-like objects', () => {
      class CustomTimestamp {
        constructor(seconds, nanoseconds) {
          this.seconds = seconds;
          this.nanoseconds = nanoseconds;
        }
        toDate() {
          return new Date(this.seconds * 1000);
        }
      }

      const ts = new CustomTimestamp(1726915200, 0);
      const input = { timestamp: ts, tag: undefined };
      const result = stripUndefined(input);
      expect(result.timestamp).toBe(ts);
      expect(result.timestamp.toDate()).toEqual(new Date(1726915200 * 1000));
    });
  });

  describe('sanitizeProjectForCloud', () => {
    it('preserves 0 workers in dailyLogs without coercing to 1', () => {
      const project = {
        id: 'p1',
        dailyLogs: [
          { id: 'log1', date: '2026-09-21', work: 'Site inspection', workers: 0 },
          { id: 'log2', date: '2026-09-20', work: 'Painting', workers: 4 },
          { id: 'log3', date: '2026-09-19', work: 'Plumbing', workers: 'invalid' },
        ]
      };

      const result = sanitizeProjectForCloud(project);
      expect(result.dailyLogs[0].workers).toBe(0);
      expect(result.dailyLogs[1].workers).toBe(4);
      expect(result.dailyLogs[2].workers).toBe(1);
    });

    it('replaces heavy base64 strings with idb URLs', () => {
      const heavyBase64 = 'data:image/png;base64,' + 'A'.repeat(20000);
      const project = {
        id: 'p2',
        dailyLogs: [
          {
            id: 'log1',
            work: 'Masonry',
            workers: 3,
            media: [{ id: 'm1', src: heavyBase64 }]
          }
        ]
      };

      const result = sanitizeProjectForCloud(project);
      expect(result.dailyLogs[0].media[0].src).toBe('idb://m1');
    });
  });

  describe('mergeUsersPreservingLocal', () => {
    it('handles numeric IDs without throwing TypeError', () => {
      const cloudUsers = [{ id: 101, name: 'Alice' }];
      const localUsers = [{ id: 101, name: 'Alice Updated', role: 'engineer' }];

      expect(() => {
        const merged = mergeUsersPreservingLocal(localUsers, cloudUsers);
        expect(merged).toHaveLength(1);
        expect(merged[0].name).toBe('Alice Updated');
      }).not.toThrow();
    });

    it('merges by email case-insensitively and preserves local updates', () => {
      const cloudUsers = [{ email: 'Eng@Company.COM', name: 'Omar', role: 'engineer' }];
      const localUsers = [{ email: 'eng@company.com', name: 'Omar (Site Eng)', phone: '01000000000' }];

      const merged = mergeUsersPreservingLocal(localUsers, cloudUsers);
      expect(merged).toHaveLength(1);
      expect(merged[0].name).toBe('Omar (Site Eng)');
      expect(merged[0].phone).toBe('01000000000');
    });
  });

  describe('mergeTeamsPreservingLocal', () => {
    it('handles engineers with missing name and engineerName without crashing', () => {
      const localTeam = { engineers: ['Eng. Karim'] };
      const cloudTeam = { engineers: ['Eng. Sameh'] };
      const companyUsers = [
        { role: 'engineer' }, // both engineerName and name undefined
        { role: 'engineer', name: 'Eng. Hany' },
        { role: 'accountant', name: 'Acc. Nader' },
      ];

      expect(() => {
        const result = mergeTeamsPreservingLocal(localTeam, cloudTeam, companyUsers);
        expect(result.engineers).toContain('Eng. Karim');
        expect(result.engineers).toContain('Eng. Sameh');
        expect(result.engineers).toContain('Eng. Hany');
        expect(result.accountants).toContain('Acc. Nader');
      }).not.toThrow();
    });
  });

  describe('parseClientPortalFromUrl', () => {
    it('parses ?portal=token correctly', () => {
      const url = 'https://tashteebpro.com?portal=sample-token-123';
      const parsed = parseClientPortalFromUrl(url);
      expect(parsed).toEqual({
        companyId: null,
        projectId: 'sample-token-123',
        token: 'sample-token-123',
      });
    });

    it('does not throw URIError when token contains raw % or invalid percent encoding', () => {
      const url = 'https://tashteebpro.com?portal=token%with%percent';
      expect(() => {
        const parsed = parseClientPortalFromUrl(url);
        expect(parsed).not.toBeNull();
      }).not.toThrow();
    });

    it('parses /portal/:token format', () => {
      const url = 'https://tashteebpro.com/portal/token-abc-xyz';
      const parsed = parseClientPortalFromUrl(url);
      expect(parsed.token).toBe('token-abc-xyz');
    });

    it('parses /portal/:companyId/:token format', () => {
      const url = 'https://tashteebpro.com/portal/comp_dar/token-proj-456';
      const parsed = parseClientPortalFromUrl(url);
      expect(parsed).toEqual({
        companyId: 'comp_dar',
        projectId: 'token-proj-456',
        token: 'token-proj-456',
      });
    });

    it('parses hash based portal routes #/portal/:token', () => {
      const url = 'https://tashteebpro.com/#/portal/comp_dar/hash-token-789';
      const parsed = parseClientPortalFromUrl(url);
      expect(parsed).toEqual({
        companyId: 'comp_dar',
        projectId: 'hash-token-789',
        token: 'hash-token-789',
      });
    });
  });

});
