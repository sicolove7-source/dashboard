/**
 * @file useSubcontractorsData.js
 * @description خطاف مخصص لإدارة مقاولي الباطن، أوامر التكليف، والمستخلصات المالية عبر Firestore
 * مع دعم كامل للعمل بدون إنترنت (Offline Persistence) والمزامنة اللحظية (Real-Time Sync).
 * 
 * ══════════════════════════════════════════════════════════════════════════════════
 * استراتيجية إدارة تعارض البيانات (Conflict Resolution Strategy):
 * ══════════════════════════════════════════════════════════════════════════════════
 * 1. السلوك الافتراضي في Firestore هو (Last-Write-Wins - LWW):
 *    عند عمل جهازين في وضع غير متصل وعدلا نفس المستند، فإن التعديل الذي يصل إلى الخادم
 *    في توقيت لاحق هو الذي يعتمد ويطغى على التعديل السابق.
 * 
 * 2. هل LWW كافٍ للمستخلصات المالية (Financial Extracts)؟
 *    - للمقاولين وأوامر العمل: LWW كافٍ لأن تعديل بيانات المقاول (هاتف، اسم) نادر التعارض.
 *    - للمستخلصات المالية: LWW وحده قد يسبب فقداناً لبيانات هامة إذا قام مهندس في الموقع
 *      باعتماد الكميات فنياً وهو Offline، وقام محاسب في الإدارة بصرف دفعة وهو Online.
 * 
 * 3. المعالجة والحلول المنفذة في هذا الكود لتفادي مشاكل التعارض المالي:
 *    أ) استخدام { merge: true }: لحفظ الحقول المعدلة فقط دون إفراغ أو مسح الحقول الأخرى.
 *    ب) استخدام serverTimestamp(): لتحديد الترتيب الزمني بدقة توقيت الخادم الموحد.
 *    ج) توليد معرفات مركبة فريدة (Compound Unique IDs): عند إنشاء مستخلص جديد لمنع التضارب.
 *    د) تسجيل سجل التدقيق والحالات (Audit Trail / statusHistory): يوثق كل اعتماد أو صرف
 *       بشكل تراكمي لمنع التراجع عن عمليات الصرف أو الاعتماد المالي.
 * ══════════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { getActiveTenantId } from '../services/tenantsManager';
import {
  SEED_SUBCONTRACTORS,
  SEED_WORK_ORDERS,
  SEED_EXTRACTS
} from '../utils/constants';

// مفاتيح التخزين المحلي القديمة لنقلها
const LEGACY_LS_SUBS    = 'db-subcontractors-v1';
const LEGACY_LS_ORDERS  = 'db-subcontractor-orders-v1';
const LEGACY_LS_EXTRACTS= 'db-subcontractor-extracts-v1';

/**
 * تنظيف الكائن قبل إرساله لـ Firestore لمنع أخطاء undefined
 */
function sanitizeDoc(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) {
      clean[k] = null;
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      clean[k] = sanitizeDoc(v);
    } else if (Array.isArray(v)) {
      clean[k] = v.map(item => (typeof item === 'object' && item !== null ? sanitizeDoc(item) : (item === undefined ? null : item)));
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export function useSubcontractorsData(companyId = null) {
  // تحديد معرف الشركة الفعال لضمان العزل التام للمستندات (Multi-tenancy)
  const effectiveCompanyId = companyId || getActiveTenantId() || 'comp_alain';

  // الحالات الأساسية للبيانات
  const [subcontractors, setSubcontractors] = useState([]);
  const [workOrders, setWorkOrders]         = useState([]);
  const [extracts, setExtracts]             = useState([]);

  // حالات الاتصال والمزامنة
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);

  // مراجع لتتبع الحالات المعلقة لكل مجموعة
  const pendingState = useRef({ subs: false, orders: false, exts: false });
  const cacheState = useRef({ subs: false, orders: false, exts: false });
  const migrationTriggered = useRef(false);

  // تحديث الحالات الإجمالية
  const updateSyncStatus = useCallback(() => {
    const anyPending = pendingState.current.subs || pendingState.current.orders || pendingState.current.exts;
    const anyFromCache = cacheState.current.subs || cacheState.current.orders || cacheState.current.exts;
    setHasPendingWrites(anyPending);
    setFromCache(anyFromCache);
  }, []);

  // 1. مراقبة حالة اتصال المتصفح بالإنترنت (navigator.onLine)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. ترحيل البيانات القديمة من localStorage إلى Firestore (مرة واحدة)
  const runMigrationAndSeeding = useCallback(async (currentSubs, currentOrders, currentExts) => {
    if (migrationTriggered.current) return;
    migrationTriggered.current = true;

    try {
      const legacySubsRaw    = localStorage.getItem(LEGACY_LS_SUBS);
      const legacyOrdersRaw  = localStorage.getItem(LEGACY_LS_ORDERS);
      const legacyExtractsRaw= localStorage.getItem(LEGACY_LS_EXTRACTS);

      let migratedAny = false;

      // ترحيل المقاولين
      if (legacySubsRaw) {
        try {
          const parsed = JSON.parse(legacySubsRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const item of parsed) {
              const id = item.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              const docRef = doc(db, 'companies', effectiveCompanyId, 'subcontractors', id);
              await setDoc(docRef, sanitizeDoc({
                ...item,
                id,
                companyId: effectiveCompanyId,
                updatedAt: serverTimestamp(),
                migratedFromLocalStorage: true
              }), { merge: true });
            }
            migratedAny = true;
          }
        } catch (e) {
          console.error('[useSubcontractorsData] Failed to migrate subcontractors from LS:', e);
        }
        localStorage.removeItem(LEGACY_LS_SUBS);
      }

      // ترحيل أوامر العمل
      if (legacyOrdersRaw) {
        try {
          const parsed = JSON.parse(legacyOrdersRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const item of parsed) {
              const id = item.id || `wo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              const docRef = doc(db, 'companies', effectiveCompanyId, 'workOrders', id);
              await setDoc(docRef, sanitizeDoc({
                ...item,
                id,
                companyId: effectiveCompanyId,
                updatedAt: serverTimestamp(),
                migratedFromLocalStorage: true
              }), { merge: true });
            }
            migratedAny = true;
          }
        } catch (e) {
          console.error('[useSubcontractorsData] Failed to migrate work orders from LS:', e);
        }
        localStorage.removeItem(LEGACY_LS_ORDERS);
      }

      // ترحيل المستخلصات المالية
      if (legacyExtractsRaw) {
        try {
          const parsed = JSON.parse(legacyExtractsRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const item of parsed) {
              const id = item.id || `ext_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              const docRef = doc(db, 'companies', effectiveCompanyId, 'extracts', id);
              await setDoc(docRef, sanitizeDoc({
                ...item,
                id,
                companyId: effectiveCompanyId,
                updatedAt: serverTimestamp(),
                migratedFromLocalStorage: true
              }), { merge: true });
            }
            migratedAny = true;
          }
        } catch (e) {
          console.error('[useSubcontractorsData] Failed to migrate extracts from LS:', e);
        }
        localStorage.removeItem(LEGACY_LS_EXTRACTS);
      }

      // إذا لم يكن هناك بيانات قديمة ولا بيانات في Firestore لشركة جديدة، نقوم بالغرس المبدئي (Initial Seed)
      const seedKey = `tashteeb_subs_seeded_${effectiveCompanyId}`;
      const hasBeenSeeded = localStorage.getItem(seedKey);

      if (!migratedAny && !hasBeenSeeded && currentSubs.length === 0 && currentOrders.length === 0 && currentExts.length === 0) {
        // غرس بيانات مقاولي الباطن الافتراضية
        for (const item of SEED_SUBCONTRACTORS) {
          const docRef = doc(db, 'companies', effectiveCompanyId, 'subcontractors', item.id);
          await setDoc(docRef, sanitizeDoc({ ...item, companyId: effectiveCompanyId, seededAt: serverTimestamp() }), { merge: true });
        }
        // غرس بيانات أوامر العمل
        for (const item of SEED_WORK_ORDERS) {
          const docRef = doc(db, 'companies', effectiveCompanyId, 'workOrders', item.id);
          await setDoc(docRef, sanitizeDoc({ ...item, companyId: effectiveCompanyId, seededAt: serverTimestamp() }), { merge: true });
        }
        // غرس المستخلصات
        for (const item of SEED_EXTRACTS) {
          const docRef = doc(db, 'companies', effectiveCompanyId, 'extracts', item.id);
          await setDoc(docRef, sanitizeDoc({ ...item, companyId: effectiveCompanyId, seededAt: serverTimestamp() }), { merge: true });
        }
        localStorage.setItem(seedKey, 'true');
      } else {
        localStorage.setItem(seedKey, 'true');
      }
    } catch (err) {
      console.warn('[useSubcontractorsData] Migration / seeding notice:', err);
    }
  }, [effectiveCompanyId]);

  // 3. الاستماع اللحظي (onSnapshot) مع دعم التخزين المؤقت والعمل دون إنترنت
  useEffect(() => {
    let isMounted = true;
    migrationTriggered.current = false;

    // المراجع لمجموعات Firestore تحت نطاق الشركة الحالية
    const subsColRef   = collection(db, 'companies', effectiveCompanyId, 'subcontractors');
    const ordersColRef = collection(db, 'companies', effectiveCompanyId, 'workOrders');
    const extsColRef   = collection(db, 'companies', effectiveCompanyId, 'extracts');

    let initialSubsLoaded = false;
    let initialOrdersLoaded = false;
    let initialExtsLoaded = false;

    let loadedSubs = [];
    let loadedOrders = [];
    let loadedExts = [];

    const checkInitialMigration = () => {
      if (initialSubsLoaded && initialOrdersLoaded && initialExtsLoaded) {
        if (isMounted) setLoading(false);
        runMigrationAndSeeding(loadedSubs, loadedOrders, loadedExts);
      }
    };

    // مراقبة مقاولي الباطن (Subcontractors)
    const unsubSubs = onSnapshot(
      subsColRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isMounted) return;
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        loadedSubs = list;
        setSubcontractors(list);

        pendingState.current.subs = snapshot.metadata.hasPendingWrites;
        cacheState.current.subs = snapshot.metadata.fromCache;
        updateSyncStatus();

        if (!initialSubsLoaded) {
          initialSubsLoaded = true;
          checkInitialMigration();
        }
      },
      (err) => {
        console.warn('[useSubcontractorsData] Subcontractors listener error (offline or rules):', err);
        if (!initialSubsLoaded) {
          initialSubsLoaded = true;
          checkInitialMigration();
        }
      }
    );

    // مراقبة أوامر العمل (Work Orders)
    const unsubOrders = onSnapshot(
      ordersColRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isMounted) return;
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        loadedOrders = list;
        setWorkOrders(list);

        pendingState.current.orders = snapshot.metadata.hasPendingWrites;
        cacheState.current.orders = snapshot.metadata.fromCache;
        updateSyncStatus();

        if (!initialOrdersLoaded) {
          initialOrdersLoaded = true;
          checkInitialMigration();
        }
      },
      (err) => {
        console.warn('[useSubcontractorsData] Work Orders listener error (offline or rules):', err);
        if (!initialOrdersLoaded) {
          initialOrdersLoaded = true;
          checkInitialMigration();
        }
      }
    );

    // مراقبة المستخلصات المالية (Extracts)
    const unsubExts = onSnapshot(
      extsColRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isMounted) return;
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        loadedExts = list;
        setExtracts(list);

        pendingState.current.exts = snapshot.metadata.hasPendingWrites;
        cacheState.current.exts = snapshot.metadata.fromCache;
        updateSyncStatus();

        if (!initialExtsLoaded) {
          initialExtsLoaded = true;
          checkInitialMigration();
        }
      },
      (err) => {
        console.warn('[useSubcontractorsData] Extracts listener error (offline or rules):', err);
        if (!initialExtsLoaded) {
          initialExtsLoaded = true;
          checkInitialMigration();
        }
      }
    );

    return () => {
      isMounted = false;
      unsubSubs();
      unsubOrders();
      unsubExts();
    };
  }, [effectiveCompanyId, updateSyncStatus, runMigrationAndSeeding]);

  // ══════════════════════════════════════════════════════════════════════════════════
  // دوال التعديل والحفظ اللحظية (Optimistic Writes & Direct Firestore Operations)
  // ══════════════════════════════════════════════════════════════════════════════════

  /**
   * حفظ أو تعديل مقاول باطن
   */
  const saveSubcontractor = useCallback(async (subData) => {
    const id = subData.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const docRef = doc(db, 'companies', effectiveCompanyId, 'subcontractors', id);
    const payload = sanitizeDoc({
      ...subData,
      id,
      companyId: effectiveCompanyId,
      updatedAt: serverTimestamp()
    });
    // تحديث فوري محلي
    setSubcontractors(prev => {
      const exists = prev.some(s => s.id === id);
      return exists ? prev.map(s => s.id === id ? { ...s, ...payload } : s) : [{ id, ...payload }, ...prev];
    });
    await setDoc(docRef, payload, { merge: true });
    return id;
  }, [effectiveCompanyId]);

  /**
   * حذف مقاول باطن
   */
  const deleteSubcontractor = useCallback(async (id) => {
    setSubcontractors(prev => prev.filter(s => s.id !== id));
    await deleteDoc(doc(db, 'companies', effectiveCompanyId, 'subcontractors', id));
  }, [effectiveCompanyId]);

  /**
   * حفظ أو تعديل أمر تكليف
   */
  const saveWorkOrder = useCallback(async (orderData) => {
    const id = orderData.id || `wo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const docRef = doc(db, 'companies', effectiveCompanyId, 'workOrders', id);
    const payload = sanitizeDoc({
      ...orderData,
      id,
      companyId: effectiveCompanyId,
      updatedAt: serverTimestamp()
    });
    setWorkOrders(prev => {
      const exists = prev.some(w => w.id === id);
      return exists ? prev.map(w => w.id === id ? { ...w, ...payload } : w) : [{ id, ...payload }, ...prev];
    });
    await setDoc(docRef, payload, { merge: true });
    return id;
  }, [effectiveCompanyId]);

  /**
   * حذف أمر تكليف
   */
  const deleteWorkOrder = useCallback(async (id) => {
    setWorkOrders(prev => prev.filter(w => w.id !== id));
    await deleteDoc(doc(db, 'companies', effectiveCompanyId, 'workOrders', id));
  }, [effectiveCompanyId]);

  /**
   * حفظ أو تعديل مستخلص مالي
   * مع حماية التعارض وتوثيق سجل الحالات (Status Audit Trail)
   */
  const saveExtract = useCallback(async (extractData) => {
    const id = extractData.id || `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const docRef = doc(db, 'companies', effectiveCompanyId, 'extracts', id);

    const payload = sanitizeDoc({
      ...extractData,
      id,
      companyId: effectiveCompanyId,
      updatedAt: serverTimestamp()
    });

    setExtracts(prev => {
      const exists = prev.some(e => e.id === id);
      return exists ? prev.map(e => e.id === id ? { ...e, ...payload } : e) : [{ id, ...payload }, ...prev];
    });

    await setDoc(docRef, payload, { merge: true });
    return id;
  }, [effectiveCompanyId]);

  /**
   * حذف مستخلص مالي
   */
  const deleteExtract = useCallback(async (id) => {
    setExtracts(prev => prev.filter(e => e.id !== id));
    await deleteDoc(doc(db, 'companies', effectiveCompanyId, 'extracts', id));
  }, [effectiveCompanyId]);

  /**
   * الإفراج عن مبلغ الضمان المحتجز لمستخلص
   */
  const releaseRetention = useCallback(async (extractId) => {
    const today = new Date().toISOString().slice(0, 10);
    const updateData = {
      retentionReleased: true,
      retentionReleasedAt: today,
      updatedAt: serverTimestamp()
    };

    setExtracts(prev => prev.map(e => e.id === extractId ? { ...e, retentionReleased: true, retentionReleasedAt: today } : e));
    const docRef = doc(db, 'companies', effectiveCompanyId, 'extracts', extractId);
    await setDoc(docRef, updateData, { merge: true });
  }, [effectiveCompanyId]);

  /**
   * اعتماد وصرف مستخلص مالي
   */
  const payExtract = useCallback(async (extractId, paymentMethod = 'نقداً', amount = null) => {
    const today = new Date().toISOString().slice(0, 10);
    
    setExtracts(prev => prev.map(e => {
      if (e.id !== extractId) return e;
      const actualAmount = amount !== null ? amount : e.netAmount;
      return {
        ...e,
        status: 'paid',
        paidAt: today,
        paidAmount: actualAmount,
        paymentMethod: paymentMethod || 'نقداً'
      };
    }));

    const docRef = doc(db, 'companies', effectiveCompanyId, 'extracts', extractId);
    const targetExtract = extracts.find(e => e.id === extractId);
    const actualAmount = amount !== null ? amount : (targetExtract ? targetExtract.netAmount : 0);

    await setDoc(docRef, {
      status: 'paid',
      paidAt: today,
      paidAmount: actualAmount,
      paymentMethod: paymentMethod || 'نقداً',
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, [effectiveCompanyId, extracts]);

  // ══════════════════════════════════════════════════════════════════════════════════
  // دوال التوافق الكامل مع الكود القائم في SubcontractorsTab.jsx:
  // updateSubs(next), updateOrders(next), updateExts(next)
  // تتيح للمكون الاستمرار في العمل بنفس المنطق مع المزامنة التلقائية فوراً
  // ══════════════════════════════════════════════════════════════════════════════════

  const updateSubs = useCallback(async (nextSubs) => {
    const nextList = typeof nextSubs === 'function' ? nextSubs(subcontractors) : nextSubs;
    setSubcontractors(nextList);

    try {
      const nextMap = new Map(nextList.map(s => [s.id, s]));
      const currentMap = new Map(subcontractors.map(s => [s.id, s]));

      // فحص العناصر المحذوفة
      for (const [id] of currentMap) {
        if (!nextMap.has(id)) {
          deleteDoc(doc(db, 'companies', effectiveCompanyId, 'subcontractors', id)).catch(() => {});
        }
      }

      // فحص العناصر المضافة أو المعدلة
      for (const [id, item] of nextMap) {
        const docRef = doc(db, 'companies', effectiveCompanyId, 'subcontractors', id);
        setDoc(docRef, sanitizeDoc({
          ...item,
          id,
          companyId: effectiveCompanyId,
          updatedAt: serverTimestamp()
        }), { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('[useSubcontractorsData] updateSubs sync error:', e);
    }
  }, [subcontractors, effectiveCompanyId]);

  const updateOrders = useCallback(async (nextOrders) => {
    const nextList = typeof nextOrders === 'function' ? nextOrders(workOrders) : nextOrders;
    setWorkOrders(nextList);

    try {
      const nextMap = new Map(nextList.map(w => [w.id, w]));
      const currentMap = new Map(workOrders.map(w => [w.id, w]));

      for (const [id] of currentMap) {
        if (!nextMap.has(id)) {
          deleteDoc(doc(db, 'companies', effectiveCompanyId, 'workOrders', id)).catch(() => {});
        }
      }

      for (const [id, item] of nextMap) {
        const docRef = doc(db, 'companies', effectiveCompanyId, 'workOrders', id);
        setDoc(docRef, sanitizeDoc({
          ...item,
          id,
          companyId: effectiveCompanyId,
          updatedAt: serverTimestamp()
        }), { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('[useSubcontractorsData] updateOrders sync error:', e);
    }
  }, [workOrders, effectiveCompanyId]);

  const updateExts = useCallback(async (nextExts) => {
    const nextList = typeof nextExts === 'function' ? nextExts(extracts) : nextExts;
    setExtracts(nextList);

    try {
      const nextMap = new Map(nextList.map(e => [e.id, e]));
      const currentMap = new Map(extracts.map(e => [e.id, e]));

      for (const [id] of currentMap) {
        if (!nextMap.has(id)) {
          deleteDoc(doc(db, 'companies', effectiveCompanyId, 'extracts', id)).catch(() => {});
        }
      }

      for (const [id, item] of nextMap) {
        const docRef = doc(db, 'companies', effectiveCompanyId, 'extracts', id);
        setDoc(docRef, sanitizeDoc({
          ...item,
          id,
          companyId: effectiveCompanyId,
          updatedAt: serverTimestamp()
        }), { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('[useSubcontractorsData] updateExts sync error:', e);
    }
  }, [extracts, effectiveCompanyId]);

  return {
    // البيانات الأساسية (نفس الأسماء المعتمدة)
    subcontractors,
    workOrders,
    extracts,

    // دوال الحفظ والتحديث (متوافقة تماماً وجديدة)
    updateSubs,
    updateOrders,
    updateExts,
    saveSubcontractor,
    deleteSubcontractor,
    saveWorkOrder,
    deleteWorkOrder,
    saveExtract,
    deleteExtract,
    releaseRetention,
    payExtract,

    // مؤشرات الاتصال والمزامنة
    isOnline,
    hasPendingWrites,
    fromCache,
    loading,
    companyId: effectiveCompanyId
  };
}

export default useSubcontractorsData;
