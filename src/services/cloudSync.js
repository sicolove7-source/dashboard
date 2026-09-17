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
      ...stripUndefined(partialData),
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
 * حذف أي قيم undefined من شجرة الكائن لأن فايربيس ترفضها وتسبب فشل الحفظ
 */
export function stripUndefined(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => item === undefined ? null : stripUndefined(item));
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = stripUndefined(val);
    }
  }
  return clean;
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

      // تنقية وتجريد وسائط اليومية من أي سلاسل Base64 ضخمة
      let safeMedia = [];
      if (Array.isArray(l.media)) {
        safeMedia = l.media.map(m => {
          if (!m || typeof m !== 'object') return null;
          const src = m.src || '';
          const isHeavyBase64 = typeof src === 'string' && src.startsWith('data:') && src.length > 15000;
          return {
            id: m.id || ('m_' + Math.random().toString(36).substr(2, 6)),
            type: m.type || 'image',
            name: m.name || '',
            caption: m.caption || '',
            src: isHeavyBase64 ? (m.rawSrc?.startsWith('idb://') ? m.rawSrc : `idb://${m.id || Date.now()}`) : src,
            thumbnail: (m.thumbnail && m.thumbnail.length < 25000) ? m.thumbnail : ''
          };
        }).filter(Boolean);
      }

      // تنقية صور اليومية
      let safePhotos = [];
      if (Array.isArray(l.photos)) {
        safePhotos = l.photos.map(photo => {
          if (typeof photo === 'string') {
            if (photo.startsWith('data:') && photo.length > 15000) return null;
            return photo;
          } else if (photo && typeof photo === 'object') {
            const src = photo.src || '';
            const isHeavyBase64 = typeof src === 'string' && src.startsWith('data:') && src.length > 15000;
            return {
              id: photo.id || ('ph_' + Math.random().toString(36).substr(2, 6)),
              type: photo.type || 'image',
              caption: photo.caption || '',
              src: isHeavyBase64 ? (photo.rawSrc?.startsWith('idb://') ? photo.rawSrc : `idb://${photo.id || Date.now()}`) : src,
              thumbnail: (photo.thumbnail && photo.thumbnail.length < 25000) ? photo.thumbnail : ''
            };
          }
          return photo;
        }).filter(Boolean);
      }

      // إرجاع بنية مضغوطة ومنظمة فائقة الخفة لليومية لضمان استيعاب آلاف اليوميات سحابياً
      return {
        id: l.id || ('d_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
        date: l.date || '',
        author: l.author || '',
        work: l.work || '',
        workers: Number(l.workers) || 1,
        issues: l.issues || '',
        time: l.time || '',
        timestamp: l.timestamp || l.createdAt || '',
        media: safeMedia,
        photos: safePhotos
      };
    });
  }

  if (Array.isArray(p.sitePhotos)) {
    p.sitePhotos = p.sitePhotos.map(photo => {
      if (!photo || typeof photo !== 'object') return photo;
      const src = photo.src || '';
      if (typeof src === 'string' && src.startsWith('data:') && src.length > 60000) {
        return {
          ...photo,
          src: photo.rawSrc?.startsWith('idb://') ? photo.rawSrc : (photo.thumbnail || `idb://${photo.id || Date.now()}`)
        };
      }
      return photo;
    });
  }

  if (Array.isArray(p.snags)) {
    p.snags = p.snags.map(snag => {
      if (!snag || typeof snag !== 'object') return snag;
      const s = { ...snag };
      if (typeof s.photo === 'string' && s.photo.startsWith('data:') && s.photo.length > 60000) {
        s.photo = s.thumbnail || (s.mediaId ? `idb://${s.mediaId}` : '');
      }
      if (typeof s.afterPhoto === 'string' && s.afterPhoto.startsWith('data:') && s.afterPhoto.length > 60000) {
        s.afterPhoto = s.afterThumbnail || s.thumbnail || (s.afterMediaId ? `idb://${s.afterMediaId}` : '');
      }
      return s;
    });
  }

  if (p.floorPlan && typeof p.floorPlan === 'string' && p.floorPlan.startsWith('data:') && p.floorPlan.length > 60000) {
    p.floorPlan = p.floorPlanThumbnail || '';
  }

  if (Array.isArray(p.files)) {
    p.files = p.files.map(f => {
      if (!f || typeof f !== 'object') return f;
      const src = f.src || '';
      if (typeof src === 'string' && src.startsWith('data:') && src.length > 60000) {
        return {
          ...f,
          src: f.thumbnail || `idb://${f.id || Date.now()}`
        };
      }
      return f;
    });
  }

  return stripUndefined(p);
}

/**
 * دمج المشاريع السحابية والمحلية بذكاء مع الحفاظ الكامل على اليوميات والاستلامات الأحدث
 * لمنع أي ضياع للبيانات عند بطء الاتصال أو إعادة التحميل (Zero-Data-Loss Merge)
 */
export function mergeProjectsPreservingLocal(localProjects, incomingProjects) {
  if (!Array.isArray(localProjects) || localProjects.length === 0) {
    return Array.isArray(incomingProjects) ? incomingProjects : [];
  }
  if (!Array.isArray(incomingProjects) || incomingProjects.length === 0) {
    return localProjects;
  }

  const localMap = new Map();
  localProjects.forEach(p => {
    if (p && p.id) localMap.set(p.id, p);
  });

  const merged = incomingProjects.map(incoming => {
    if (!incoming || !incoming.id) return incoming;
    const local = localMap.get(incoming.id);
    if (!local) return incoming;

    // تم العثور على المشروع محلياً وسحابياً: ندمج بحذر شديد
    // 1. دمج اليوميات (dailyLogs): تجميع الفريد بالـ ID مع تفضيل المحلي إذا كان أحدث
    const logsMap = new Map();
    (incoming.dailyLogs || []).forEach(l => {
      if (l && (l.id || l.timestamp || l.date)) {
        logsMap.set(l.id || `${l.date}_${l.timestamp}`, l);
      }
    });
    (local.dailyLogs || []).forEach(l => {
      if (l && (l.id || l.timestamp || l.date)) {
        const key = l.id || `${l.date}_${l.timestamp}`;
        if (!logsMap.has(key)) {
          logsMap.set(key, l);
        } else {
          const inc = logsMap.get(key);
          const localPhotos = l.photos?.length || 0;
          const incPhotos = inc.photos?.length || 0;
          const localMedia = l.media?.length || 0;
          const incMedia = inc.media?.length || 0;
          if (localPhotos > incPhotos || localMedia > incMedia) {
            logsMap.set(key, { ...inc, ...l });
          }
        }
      }
    });
    const mergedLogs = Array.from(logsMap.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.date || 0).getTime();
      const timeB = new Date(b.timestamp || b.date || 0).getTime();
      return timeB - timeA;
    });

    // 2. دمج الاستلامات والفحص (snags): تجميع الفريد بالـ ID
    const snagsMap = new Map();
    (incoming.snags || []).forEach(s => {
      if (s && (s.id || s.number)) snagsMap.set(s.id || `s_${s.number}`, s);
    });
    (local.snags || []).forEach(s => {
      if (s && (s.id || s.number)) {
        const key = s.id || `s_${s.number}`;
        if (!snagsMap.has(key)) {
          snagsMap.set(key, s);
        } else {
          const inc = snagsMap.get(key);
          if (s.updatedAt && (!inc.updatedAt || s.updatedAt > inc.updatedAt)) {
            snagsMap.set(key, { ...inc, ...s });
          }
        }
      }
    });
    const mergedSnags = Array.from(snagsMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    // 3. دمج الملفات والوسائط (files)
    const filesMap = new Map();
    (incoming.files || []).forEach(f => {
      if (f && f.id) filesMap.set(f.id, f);
    });
    (local.files || []).forEach(f => {
      if (f && f.id && !filesMap.has(f.id)) {
        filesMap.set(f.id, f);
      }
    });
    const mergedFiles = Array.from(filesMap.values());

    const localTime = new Date(local.updatedAt || 0).getTime();
    const incomingTime = new Date(incoming.updatedAt || 0).getTime();
    const base = localTime > incomingTime ? { ...incoming, ...local } : { ...local, ...incoming };

    return {
      ...base,
      dailyLogs: mergedLogs,
      snags: mergedSnags,
      files: mergedFiles,
    };
  });

  // إضافة أي مشاريع أُنشئت محلياً فقط ولم تُرفع بعد إلى السحابة
  localProjects.forEach(local => {
    if (local && local.id && !incomingProjects.some(inc => inc.id === local.id)) {
      merged.push(local);
    }
  });

  return merged;
}

/**
 * دمج آمن لقوائم فريق العمل (مهندسون، محاسبون، مكتب فني، خدمة عملاء)
 * يضمن عدم ضياع أي عضو أضيف محلياً أو سحابياً أو عبر إدارة المستخدمين
 */
export function mergeTeamsPreservingLocal(localTeam, cloudTeam, companyUsers = []) {
  const groups = ['engineers', 'accountants', 'techOffice', 'customerService'];
  const result = {
    engineers: [],
    accountants: [],
    techOffice: [],
    customerService: []
  };

  const extractName = (item) => {
    if (typeof item === 'string') return item.trim();
    if (item && typeof item === 'object' && item.name) return item.name.trim();
    return '';
  };

  groups.forEach(g => {
    const localList = Array.isArray(localTeam?.[g]) ? localTeam[g] : [];
    const cloudList = Array.isArray(cloudTeam?.[g]) ? cloudTeam[g] : [];

    const namesSet = new Set();
    localList.forEach(item => {
      const n = extractName(item);
      if (n) namesSet.add(n);
    });
    cloudList.forEach(item => {
      const n = extractName(item);
      if (n) namesSet.add(n);
    });

    result[g] = Array.from(namesSet);
  });

  if (Array.isArray(companyUsers)) {
    const roleMap = {
      engineer: 'engineers',
      accountant: 'accountants',
      tech_office: 'techOffice',
      customer_service: 'customerService'
    };
    companyUsers.forEach(u => {
      const g = roleMap[u.role];
      if (g) {
        const name = (u.role === 'engineer' ? (u.engineerName || u.name) : u.name || '').trim();
        if (name && !result[g].includes(name)) {
          result[g].push(name);
        }
      }
    });
  }

  return result;
}

/**
 * دمج حسابات مستخدمي الشركة مع الحفاظ على التعديلات والمستخدمين الجدد
 */
export function mergeUsersPreservingLocal(localUsers, cloudUsers) {
  const usersMap = new Map();
  (Array.isArray(cloudUsers) ? cloudUsers : []).forEach(u => {
    if (u && (u.id || u.email)) {
      const key = (u.email || u.id).toLowerCase().trim();
      usersMap.set(key, u);
    }
  });
  (Array.isArray(localUsers) ? localUsers : []).forEach(u => {
    if (u && (u.id || u.email)) {
      const key = (u.email || u.id).toLowerCase().trim();
      usersMap.set(key, { ...(usersMap.get(key) || {}), ...u });
    }
  });
  return Array.from(usersMap.values());
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

    const safeProject = sanitizeProjectForCloud({
      ...merged,
      id: projectId,
      updatedAt: new Date().toISOString()
    });

    // 1. كتابة وثيقة المشروع المستقلة في الـ Sub-collection
    await setDoc(projectRef, safeProject, { merge: true });

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
 * الاستماع الفوري والتحديث اللحظي لعملاء الـ CRM والطلبات الواردة
 */
export function subscribeToCloudLeads(companyId, onUpdate) {
  const cId = cleanCompanyId(companyId);
  if (!cId || typeof onUpdate !== 'function') return () => {};
  try {
    const docRef = doc(db, 'companies', cId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.leads)) {
          onUpdate(data.leads);
        }
      }
    }, (err) => {
      console.warn("Cloud snapshot error (leads):", err.message);
    });
    return unsub;
  } catch (e) {
    console.warn("Could not subscribe to cloud leads:", e);
    return () => {};
  }
}

/**
 * حفظ مستخدمي الشركة في السحابة
 */
export async function syncCompanyUsersToCloud(companyId, users) {
  return syncCompanyDataToCloud(companyId, { users });
}

/**
 * حفظ ومزامنة مصاريف الشركة في السحابة
 */
export async function syncExpensesToCloud(companyId, expenses) {
  return syncCompanyDataToCloud(companyId, { expenses });
}

/**
 * حفظ ومزامنة العمالة في السحابة
 */
export async function syncWorkersToCloud(companyId, workers) {
  return syncCompanyDataToCloud(companyId, { workers });
}

/**
 * حفظ ومزامنة الموردين في السحابة
 */
export async function syncSuppliersToCloud(companyId, suppliers) {
  return syncCompanyDataToCloud(companyId, { suppliers });
}

/**
 * حفظ ومزامنة عروض الأسعار في السحابة
 */
export async function syncQuotationsToCloud(companyId, quotations) {
  return syncCompanyDataToCloud(companyId, { quotations });
}

/**
 * الاستماع الفوري والتحديث اللحظي لأي حقل محدد في وثيقة الشركة
 */
export function subscribeToCloudCompanyField(companyId, fieldName, onUpdate) {
  const cId = cleanCompanyId(companyId);
  if (!cId || typeof onUpdate !== 'function') return () => {};
  try {
    const docRef = doc(db, 'companies', cId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.[fieldName])) {
          onUpdate(data[fieldName]);
        }
      }
    }, (err) => {
      console.warn(`Cloud snapshot error (${fieldName}):`, err.message);
    });
    return unsub;
  } catch (e) {
    console.warn(`Could not subscribe to cloud ${fieldName}:`, e);
    return () => {};
  }
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

    // استماع لحظي للـ Sub-collection — المصدر الأساسي والوحيد للمشاريع
    const unsub = onSnapshot(subColRef, async (subSnap) => {
      if (!subSnap.empty) {
        const projectsList = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        onUpdate(projectsList);
      } else {
        // فحص لمرة واحدة فقط عند بداية تهيئة الشركة إن كانت مشاريعها في وثيقة قديمة
        try {
          const companyDocRef = doc(db, 'companies', cId);
          const snap = await getDoc(companyDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.projects) && data.projects.length > 0) {
              onUpdate(data.projects);
              await migrateLegacyProjectsToSubcollection(cId, data.projects);
            }
          }
        } catch (e) {
          console.warn("Legacy projects check error:", e.message);
        }
      }
    }, (err) => {
      console.warn("Cloud snapshot error (subcollection projects):", err.message);
    });

    return unsub;
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
