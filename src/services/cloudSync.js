/**
 * ===================================================================
 * خدمة المزامنة السحابية الفورية — Cloud Sync Service (Firebase)
 * ===================================================================
 * مزامنة حية ولحظية للمشاريع، الشركات، الإعدادات، والمستخدمين عبر Firestore.
 */

import app, { db, storage } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString, getStorage } from 'firebase/storage';

/**
 * رفع الوسائط (صور / فيديوهات) سحابياً إلى Firebase Storage والحصول على رابط HTTPS دائم
 * مع دعم الحاويات البديلة وإرجاع null عند الفشل للاعتماد الآمن على IndexedDB
 */
export async function uploadMediaToFirebaseStorage(fileOrDataUrl, folder = 'site_media', fileName = '') {
  if (!fileOrDataUrl) return null;
  const cleanName = fileName ? `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}` : `media_${Date.now()}`;

  const storageInstances = [storage];
  try {
    if (app) {
      storageInstances.push(getStorage(app, "gs://tashteeb-67d13.firebasestorage.app"));
      storageInstances.push(getStorage(app, "gs://tashteeb-67d13.appspot.com"));
    }
  } catch (e) {}

  for (const st of storageInstances) {
    if (!st) continue;
    try {
      const storageRef = ref(st, `${folder}/${cleanName}`);
      let uploadResult = null;
      if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
        uploadResult = await uploadBytes(storageRef, fileOrDataUrl);
      } else if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
        uploadResult = await uploadString(storageRef, fileOrDataUrl, 'data_url');
      }
      if (uploadResult && uploadResult.ref) {
        const downloadURL = await getDownloadURL(uploadResult.ref);
        if (downloadURL) return downloadURL;
      }
    } catch (error) {
      // تجربة الحاوية التالية
    }
  }
  return null;
}


export function cleanCompanyId(companyId) {
  if (!companyId) return null;
  if (typeof companyId === 'object') {
    return companyId.id || companyId.companyId || 'comp_alain';
  }
  const str = String(companyId).trim();
  if (str === '[object Object]' || str === 'undefined' || str === 'null') {
    return 'comp_alain';
  }
  return str;
}

/**
 * جلب جميع بيانات الشركة من السحابة (المشاريع، الفريق، العملاء، الإعدادات، المستخدمين)
 */
export async function fetchCompanyDataFromCloud(companyId) {
  const cId = cleanCompanyId(companyId);
  if (!cId) return null;
  try {
    const docRef = doc(db, 'companies', cId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.warn("Cloud fetch (company data) offline or error:", error.message);
  }
  return null;
}

/**
 * حفظ ومزامنة بيانات الشركة الشاملة في السحابة
 */
export async function syncCompanyDataToCloud(companyId, partialData) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !partialData) return false;
  try {
    const docRef = doc(db, 'companies', cId);
    await setDoc(docRef, {
      ...partialData,
      companyId: cId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Cloud sync (company data) offline or error:", error.message);
    return false;
  }
}

/**
 * تطهير بيانات المشروع قبل الرفع السحابي لحمايته من تجاوز حد 1MB المسموح في Firestore
 * واستبدال أي سلاسل Base64 ضخمة بروابط IndexedDB أو مصغرات خفيفة
 */
export function sanitizeProjectForCloud(project) {
  if (!project || typeof project !== 'object') return project;
  const p = { ...project };

  if (Array.isArray(p.dailyLogs)) {
    p.dailyLogs = p.dailyLogs.map(log => {
      if (!log || typeof log !== 'object') return log;
      const l = { ...log };
      if (Array.isArray(l.media)) {
        l.media = l.media.map(m => {
          if (!m || typeof m !== 'object') return m;
          const src = m.src || '';
          if (typeof src === 'string' && src.startsWith('data:') && src.length > 80000) {
            return {
              ...m,
              src: m.rawSrc?.startsWith('idb://') ? m.rawSrc : (m.thumbnail || `idb://${m.id || Date.now()}`)
            };
          }
          return m;
        });
      }
      if (Array.isArray(l.photos)) {
        l.photos = l.photos.map(photo => {
          if (typeof photo === 'string' && photo.startsWith('data:') && photo.length > 80000) {
            return '';
          }
          return photo;
        }).filter(Boolean);
      }
      return l;
    });
  }

  if (Array.isArray(p.snags)) {
    p.snags = p.snags.map(snag => {
      if (!snag || typeof snag !== 'object') return snag;
      const s = { ...snag };
      if (typeof s.photo === 'string' && s.photo.startsWith('data:') && s.photo.length > 80000) {
        s.photo = s.thumbnail || (s.mediaId ? `idb://${s.mediaId}` : '');
      }
      if (typeof s.afterPhoto === 'string' && s.afterPhoto.startsWith('data:') && s.afterPhoto.length > 80000) {
        s.afterPhoto = '';
      }
      return s;
    });
  }

  if (Array.isArray(p.files)) {
    p.files = p.files.map(f => {
      if (!f || typeof f !== 'object') return f;
      const src = f.src || '';
      if (typeof src === 'string' && src.startsWith('data:') && src.length > 80000) {
        return {
          ...f,
          src: f.thumbnail || `idb://${f.id || Date.now()}`
        };
      }
      return f;
    });
  }

  return p;
}

/**
 * ترحيل تلقائي صامت للمشاريع القديمة المسجلة في وثيقة الشركة إلى الـ Sub-collection
 */
export async function migrateLegacyProjectsToSubcollection(companyId, projects) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !Array.isArray(projects) || projects.length === 0) return;
  try {
    for (const p of projects) {
      if (!p || !p.id) continue;
      const safe = sanitizeProjectForCloud(p);
      const projectRef = doc(db, 'companies', cId, 'projects', p.id);
      await setDoc(projectRef, { ...safe, id: p.id, migratedAt: new Date().toISOString() }, { merge: true });
    }
  } catch (err) {
    console.warn("Auto-migration to subcollection failed:", err.message);
  }
}

/**
 * حفظ ومزامنة المشاريع في السحابة داخل الـ Sub-collection المستقلة
 */
export async function syncProjectsToCloud(companyId, projects) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !Array.isArray(projects)) return false;
  try {
    for (const p of projects) {
      if (!p || !p.id) continue;
      const safe = sanitizeProjectForCloud(p);
      const projectRef = doc(db, 'companies', cId, 'projects', p.id);
      await setDoc(projectRef, { ...safe, id: p.id, updatedAt: new Date().toISOString() }, { merge: true });
    }
    // تحديث طابع وقت الشركة
    const companyDocRef = doc(db, 'companies', cId);
    await setDoc(companyDocRef, { updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (e) {
    console.warn("syncProjectsToCloud error:", e.message);
    return false;
  }
}

/**
 * حفظ ومزامنة مشروع واحد فقط بأسلوب ذري في وثيقته المستقلة بالـ Sub-collection
 * (Granular Subcollection Concurrency) لمنع أي تضارب بين المهندسين ولإتاحة سعة غير محدودة
 */
export async function syncSingleProjectToCloud(companyId, projectId, patchOrProject) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !projectId) return false;
  try {
    const projectRef = doc(db, 'companies', cId, 'projects', projectId);
    const existingSnap = await getDoc(projectRef);
    let projectData = {};
    if (existingSnap.exists()) {
      projectData = existingSnap.data();
    } else {
      // فحص إذا كان موجوداً مسبقاً في الوثيقة الرئيسية للشركة (توافق قديم)
      const companyRef = doc(db, 'companies', cId);
      const companySnap = await getDoc(companyRef);
      if (companySnap.exists() && Array.isArray(companySnap.data()?.projects)) {
        const legacyProj = companySnap.data().projects.find(p => p.id === projectId);
        if (legacyProj) projectData = legacyProj;
      }
    }

    const merged = typeof patchOrProject === 'function' 
      ? patchOrProject(projectData) 
      : { ...projectData, ...patchOrProject, id: projectId };

    const safeProject = sanitizeProjectForCloud(merged);

    // 1. كتابة وثيقة المشروع المستقلة في الـ Sub-collection
    await setDoc(projectRef, {
      ...safeProject,
      id: projectId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 2. تحديث طابع وقت الشركة الرئيسي
    const companyDocRef = doc(db, 'companies', cId);
    await setDoc(companyDocRef, {
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return true;
  } catch (error) {
    console.warn("Cloud sync (subcollection single project) offline or error:", error.message);
    return false;
  }
}

/**
 * حذف مشروع محدد فقط من الـ Sub-collection دون المساس بباقي مشاريع الشركة
 */
export async function deleteSingleProjectFromCloud(companyId, projectId) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !projectId) return false;
  try {
    // 1. حذف وثيقة المشروع من الـ Sub-collection
    const projectRef = doc(db, 'companies', cId, 'projects', projectId);
    await deleteDoc(projectRef);

    // 2. إزالة من الوثيقة القديمة إن وُجد
    const docRef = doc(db, 'companies', cId);
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data()?.projects)) {
      const remaining = snap.data().projects.filter(p => p.id !== projectId);
      await setDoc(docRef, { projects: remaining, updatedAt: new Date().toISOString() }, { merge: true });
    }
    return true;
  } catch (e) {
    console.warn("Cloud delete (subcollection single project) error:", e.message);
    return false;
  }
}

/**
 * جلب المشاريع من السحابة عبر الـ Sub-collection مع الترحيل التلقائي للوثائق القديمة
 */
export async function fetchProjectsFromCloud(companyId) {
  const cId = cleanCompanyId(companyId);
  if (!cId) return null;
  try {
    // 1. قراءة الـ Sub-collection أولاً
    const projectsCol = collection(db, 'companies', cId, 'projects');
    const snap = await getDocs(projectsCol);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // 2. إذا كانت الـ Sub-collection فارغة، قراءة الوثيقة المجمعة القديمة وترحيلها تلقائياً
    const companyData = await fetchCompanyDataFromCloud(cId);
    if (Array.isArray(companyData?.projects) && companyData.projects.length > 0) {
      migrateLegacyProjectsToSubcollection(cId, companyData.projects);
      return companyData.projects;
    }
  } catch (e) {
    console.warn("fetchProjectsFromCloud subcollection error:", e.message);
  }
  return null;
}

/**
 * حفظ ومزامنة إعدادات الشركة
 */
export async function syncSettingsToCloud(companyId, settings) {
  return syncCompanyDataToCloud(companyId, { settings });
}

/**
 * حفظ فريق العمل في السحابة
 */
export async function syncTeamToCloud(companyId, team) {
  return syncCompanyDataToCloud(companyId, { team });
}

/**
 * حفظ عملاء الـ CRM في السحابة
 */
export async function syncLeadsToCloud(companyId, leads) {
  return syncCompanyDataToCloud(companyId, { leads });
}

/**
 * حفظ مستخدمي الشركة في السحابة
 */
export async function syncCompanyUsersToCloud(companyId, users) {
  return syncCompanyDataToCloud(companyId, { users });
}

/**
 * حذف شركة بالكامل من السحابة
 */
export async function deleteCompanyFromCloud(companyId) {
  const cId = cleanCompanyId(companyId);
  if (!cId) return false;
  try {
    const docRef = doc(db, 'companies', cId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn("Cloud delete (company) offline or error:", error.message);
    return false;
  }
}

/**
 * الاستماع الفوري والتحديث اللحظي للمشاريع عبر الـ Sub-collection مع التوافق التام
 */
export function subscribeToCloudProjects(companyId, onUpdate) {
  const cId = cleanCompanyId(companyId);
  if (!cId || typeof onUpdate !== 'function') return () => {};
  try {
    const subColRef = collection(db, 'companies', cId, 'projects');
    let hasSubcollectionData = false;

    // استماع لحظي للـ Sub-collection
    const unsubSub = onSnapshot(subColRef, (subSnap) => {
      if (!subSnap.empty) {
        hasSubcollectionData = true;
        const projectsList = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        onUpdate(projectsList);
      }
    }, (err) => {
      console.warn("Cloud snapshot error (subcollection projects):", err.message);
    });

    // استماع للوثيقة القديمة للشركات التي لم تُرحل بعد
    const companyDocRef = doc(db, 'companies', cId);
    const unsubLegacy = onSnapshot(companyDocRef, (legacySnap) => {
      if (!hasSubcollectionData && legacySnap.exists()) {
        const data = legacySnap.data();
        if (Array.isArray(data?.projects) && data.projects.length > 0) {
          onUpdate(data.projects);
          migrateLegacyProjectsToSubcollection(cId, data.projects);
        }
      }
    }, (err) => {
      console.warn("Cloud snapshot error (legacy projects):", err.message);
    });

    return () => {
      unsubSub();
      unsubLegacy();
    };
  } catch (e) {
    console.warn("Could not subscribe to cloud projects:", e);
    return () => {};
  }
}

/**
 * ===================================================================
 * إدارة الشركات والمنصة المركزية (Platform Multi-Tenancy Hub)
 * ===================================================================
 */

const TENANTS_META_DOC = 'platform_metadata';
const TENANTS_META_KEY = 'tenants';
const SUPERADMIN_META_KEY = 'superadmin';

/**
 * جلب قائمة الشركات المركزية من السحابة
 */
export async function fetchTenantsListFromCloud() {
  try {
    const docRef = doc(db, TENANTS_META_DOC, TENANTS_META_KEY);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const list = snap.data()?.tenants;
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (error) {
    console.warn("Cloud fetch (tenants list) error:", error.message);
  }
  return null;
}

/**
 * حفظ وتحديث قائمة الشركات المركزية في السحابة
 */
export async function syncTenantsListToCloud(tenants) {
  if (!Array.isArray(tenants)) return false;
  try {
    const docRef = doc(db, TENANTS_META_DOC, TENANTS_META_KEY);
    await setDoc(docRef, {
      tenants: tenants,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Cloud sync (tenants list) error:", error.message);
    return false;
  }
}

/**
 * جلب بيانات المشرف العام (Super Admin) من السحابة
 */
export async function fetchSuperAdminFromCloud() {
  try {
    const docRef = doc(db, TENANTS_META_DOC, SUPERADMIN_META_KEY);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data()?.creds || null;
    }
  } catch (e) {
    console.warn("Cloud fetch superadmin error:", e.message);
  }
  return null;
}

/**
 * حفظ بيانات المشرف العام سحابياً
 */
export async function syncSuperAdminToCloud(creds) {
  if (!creds) return false;
  try {
    const docRef = doc(db, TENANTS_META_DOC, SUPERADMIN_META_KEY);
    await setDoc(docRef, {
      creds,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Cloud sync superadmin error:", e.message);
    return false;
  }
}

/**
 * تنظيف الوثائق العشوائية القديمة مثل [object Object] إن وجدت
 */
export async function cleanUpInvalidDocs() {
  try {
    const bogusRef = doc(db, 'companies', '[object Object]');
    await deleteDoc(bogusRef);
  } catch (e) {}
}
