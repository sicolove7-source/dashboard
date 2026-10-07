import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockSnapshotListeners = [];
let mockGetDocResult = { exists: () => false, data: () => ({}) };

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    doc: vi.fn((db, ...pathSegments) => ({ type: 'doc', path: pathSegments.join('/') })),
    collection: vi.fn((db, ...pathSegments) => ({ type: 'collection', path: pathSegments.join('/') })),
    getDoc: vi.fn(async () => mockGetDocResult),
    getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
    setDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    onSnapshot: vi.fn((ref, onNext, onError) => {
      mockSnapshotListeners.push({ ref, onNext, onError });
      return () => {
        mockSnapshotListeners = mockSnapshotListeners.filter(l => l.onNext !== onNext);
      };
    }),
  };
});

import {
  mergeProjectsPreservingLocal,
  subscribeToCloudCompanyField,
  subscribeToCloudProjects,
} from '../cloudSync';
import * as cloudSync from '../cloudSync';
import * as tenantsManager from '../tenantsManager';

describe('Cross-Browser Cloud Sync & Realtime Fixes', () => {
  beforeEach(() => {
    mockSnapshotListeners = [];
    mockGetDocResult = { exists: () => false, data: () => ({}) };
    const store = {};
    global.localStorage = {
      getItem: vi.fn((k) => store[k] || null),
      setItem: vi.fn((k, v) => { store[k] = String(v); }),
      removeItem: vi.fn((k) => { delete store[k]; }),
      clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    };
  });

  describe('1. mergeProjectsPreservingLocal (Cloud as Source of Truth)', () => {
    it('does not resurrect deleted projects when cloud has fewer projects', () => {
      const localProjects = [
        { id: 'p1', name: 'مشروع أ', companyId: 'comp_1' },
        { id: 'p2', name: 'مشروع ب (محذوف سحابياً)', companyId: 'comp_1' },
      ];
      const incomingCloudProjects = [
        { id: 'p1', name: 'مشروع أ', companyId: 'comp_1' },
      ];

      const merged = mergeProjectsPreservingLocal(localProjects, incomingCloudProjects, 'comp_1');
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe('p1');
      expect(merged.some(p => p.id === 'p2')).toBe(false);
    });

    it('returns empty array when cloud has 0 projects and no offline-pending projects exist', () => {
      const localProjects = [
        { id: 'p1', name: 'مشروع قديم في الكاش', companyId: 'comp_1' },
      ];
      const incomingCloudProjects = [];

      const merged = mergeProjectsPreservingLocal(localProjects, incomingCloudProjects, 'comp_1');
      expect(merged).toHaveLength(0);
    });

    it('preserves truly offline-created projects marked with _pendingSync or isOfflineCreated', () => {
      const localProjects = [
        { id: 'p_offline_1', name: 'مشروع أوفلاين جديد', companyId: 'comp_1', _pendingSync: true },
        { id: 'p_old', name: 'مشروع قديم محذوف', companyId: 'comp_1' },
      ];
      const incomingCloudProjects = [
        { id: 'p_cloud_1', name: 'مشروع سحابي', companyId: 'comp_1' },
      ];

      const merged = mergeProjectsPreservingLocal(localProjects, incomingCloudProjects, 'comp_1');
      expect(merged).toHaveLength(2);
      expect(merged.some(p => p.id === 'p_cloud_1')).toBe(true);
      expect(merged.some(p => p.id === 'p_offline_1')).toBe(true);
      expect(merged.some(p => p.id === 'p_old')).toBe(false);
    });

    it('preserves newly added project with recent timestamp id even if cloud list is empty or lacks it', () => {
      const newProjId = 'p' + Date.now();
      const localProjects = [
        { id: newProjId, name: 'موقع جديد أضيف للتو', companyId: 'comp_1', createdAt: new Date().toISOString() },
      ];
      const incomingCloudProjects = [];

      const merged = mergeProjectsPreservingLocal(localProjects, incomingCloudProjects, 'comp_1');
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe(newProjId);
    });

    it('strictly drops projects recorded in deleted_projects localStorage', () => {
      const newProjId = 'p' + Date.now();
      global.localStorage.getItem = vi.fn((key) => {
        if (key === 'tenant_comp_1_deleted_projects') return JSON.stringify([newProjId]);
        return null;
      });

      const localProjects = [
        { id: newProjId, name: 'مشروع حذفه المستخدم', companyId: 'comp_1', _pendingSync: true },
      ];
      const incomingCloudProjects = [];

      const merged = mergeProjectsPreservingLocal(localProjects, incomingCloudProjects, 'comp_1');
      expect(merged).toHaveLength(0);
    });

    it('falls back to local projects when incoming projects is null/undefined (network offline)', () => {
      const localProjects = [
        { id: 'p1', name: 'مشروع محلي كاش', companyId: 'comp_1' },
      ];

      const merged = mergeProjectsPreservingLocal(localProjects, null, 'comp_1');
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe('p1');
    });
  });

  describe('2. subscribeToCloudCompanyField (Object Settings Support)', () => {
    it('calls onUpdate with settings Object and enriches companyName from data.name if missing', () => {
      const updateFn = vi.fn();

      subscribeToCloudCompanyField('comp_test', 'settings', updateFn);

      expect(mockSnapshotListeners.length).toBeGreaterThan(0);
      const listener = mockSnapshotListeners[0];

      // Simulate Firestore snapshot returning settings Object
      const mockSnap = {
        exists: () => true,
        data: () => ({
          name: 'شركة الأمل للمقاولات',
          settings: {
            companyName: 'شركة الأمل للمقاولات',
            primaryColor: '#1877F2',
          },
        }),
      };

      listener.onNext(mockSnap);

      expect(updateFn).toHaveBeenCalledTimes(1);
      expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
        companyName: 'شركة الأمل للمقاولات',
        primaryColor: '#1877F2',
      }));
    });

    it('calls onUpdate with Array for array fields like quotations without regression', () => {
      const updateFn = vi.fn();

      subscribeToCloudCompanyField('comp_test', 'quotations', updateFn);

      const listener = mockSnapshotListeners[mockSnapshotListeners.length - 1];

      const mockSnap = {
        exists: () => true,
        data: () => ({
          quotations: [{ id: 'q1', title: 'عرض سعر تشطيب' }],
        }),
      };

      listener.onNext(mockSnap);

      expect(updateFn).toHaveBeenCalledTimes(1);
      expect(updateFn).toHaveBeenCalledWith([{ id: 'q1', title: 'عرض سعر تشطيب' }]);
    });
  });

  describe('3. subscribeToCloudProjects (Empty subcollection notification)', () => {
    it('notifies onUpdate with empty array when subcollection has 0 projects and no legacy projects', async () => {
      const updateFn = vi.fn();

      subscribeToCloudProjects('comp_test', updateFn);

      const listener = mockSnapshotListeners[mockSnapshotListeners.length - 1];

      // Simulate empty subcollection snapshot
      const emptySubSnap = {
        empty: true,
        docs: [],
      };

      await listener.onNext(emptySubSnap);

      expect(updateFn).toHaveBeenCalledWith([]);
    });

    it('notifies onUpdate with project list when subcollection has projects', async () => {
      const updateFn = vi.fn();

      subscribeToCloudProjects('comp_test', updateFn);

      const listener = mockSnapshotListeners[mockSnapshotListeners.length - 1];

      const subSnap = {
        empty: false,
        docs: [
          { id: 'p1', data: () => ({ name: 'مشروع النرجس', companyId: 'comp_test' }) },
        ],
      };

      await listener.onNext(subSnap);

      expect(updateFn).toHaveBeenCalledWith([
        { id: 'p1', name: 'مشروع النرجس', companyId: 'comp_test' },
      ]);
    });
  });

  describe('4. getTenantDataAsync (Independent subcollection fetch)', () => {
    it('fetches and returns subcollection projects even if company root document is null', async () => {
      vi.spyOn(cloudSync, 'fetchCompanyDataFromCloud').mockResolvedValue(null);
      vi.spyOn(cloudSync, 'fetchProjectsFromCloud').mockResolvedValue([
        { id: 'p_sub_1', name: 'مشروع فيلا الأمل', companyId: 'comp_test' },
      ]);
      vi.spyOn(tenantsManager, 'loadAllTenantsAsync').mockResolvedValue([]);

      const result = await tenantsManager.getTenantDataAsync('comp_test');

      expect(result).toBeDefined();
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('مشروع فيلا الأمل');
    });
  });
});
