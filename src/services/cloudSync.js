/**
 * ===================================================================
 * خدمة المزامنة السحابية الفورية — Cloud Sync Service (Firebase)
 * ===================================================================
 * مزامنة حية ولحظية للمشاريع، الشركات، الإعدادات، والمستخدمين عبر Firestore.
 */

import app, { db, storage } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
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
  if (typeof companyId === 'object') return companyId.id || companyId.companyId || null;
  const str = String(companyId).trim();
  if (str === '[object Object]' || str === 'undefined' || str === 'null') return null;
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
 * تطهير كائنات المستخدمين لحذف أي كلمات مرور بصيغة نص صريح (Plaintext) نهائياً
 * الاعتماد الأمني المطلق يكون حصراً على Firebase Authentication المشفر
 */
export function sanitizeCompanyUsersForCloud(users) {
  if (!Array.isArray(users)) return users;
  return users.map(u => {
    if (!u || typeof u !== 'object') return u;
    const cleanUser = { ...u };
    delete cleanUser.password;
    delete cleanUser.adminPassword;
    return cleanUser;
  });
}

/**
 * تطهير حمولة بيانات الشركة الشاملة قبل الرفع لمنع تسريب أي كلمات سر
 * ولمنع تلوث البيانات بين الشركات (Cross-Tenant Contamination)
 */
export function sanitizeCompanyPayloadForCloud(cId, partialData) {
  if (!partialData || typeof partialData !== 'object') return {};
  const payload = { ...partialData };

  // 1. منع تسريب كلمات السر من المستوى الأول نهائياً
  delete payload.password;
  delete payload.adminPassword;

  // 2. تطهير قائمة المستخدمين من أي كلمات سر
  if (Array.isArray(payload.users)) {
    payload.users = sanitizeCompanyUsersForCloud(payload.users);
  }

  // 3. تطهير قائمة الفريق
  if (Array.isArray(payload.team)) {
    payload.team = sanitizeCompanyUsersForCloud(payload.team);
  }

  // 4. منع التلوث المتقاطع: فلترة المشاريع لتقتصر حصراً على مشاريع هذه الشركة فقط
  if (Array.isArray(payload.projects)) {
    payload.projects = payload.projects.filter(p => !p.companyId || cleanCompanyId(p.companyId) === cId);
  }

  return payload;
}

/**
 * حفظ ومزامنة بيانات الشركة الشاملة في السحابة مع التطهير الأمني التام
 */
export async function syncCompanyDataToCloud(companyId, partialData) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !partialData) return false;
  try {
    const sanitized = sanitizeCompanyPayloadForCloud(cId, partialData);
    const docRef = doc(db, 'companies', cId);
    await setDoc(docRef, {
      ...stripUndefined(sanitized),
      companyId: cId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Cloud sync (company data) offline or error:", error.message);
    return false;
  }
}

function isPlainObject(val) {
  if (val === null || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * حذف أي قيم undefined من شجرة الكائن لأن فايربيس ترفضها وتسبب فشل الحفظ
 * يحافظ على كائنات Date و Firestore Timestamp وغيرها من الكائنات غير الـ Plain
 */
export function stripUndefined(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => item === undefined ? null : stripUndefined(item));
  if (!isPlainObject(obj)) return obj;
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
        workers: Number.isFinite(Number(l.workers)) ? Number(l.workers) : 1,
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
export function mergeProjectsPreservingLocal(localProjects, incomingProjects, targetCompanyId) {
  const cleanTarget = targetCompanyId ? cleanCompanyId(targetCompanyId) : null;
  const filterByTarget = (list) => {
    if (!Array.isArray(list)) return [];
    if (!cleanTarget) return list;
    return list.filter(p => !p.companyId || cleanCompanyId(p.companyId) === cleanTarget);
  };

  const safeLocal = filterByTarget(localProjects);
  const safeIncoming = filterByTarget(incomingProjects);

  if (safeLocal.length === 0) {
    return safeIncoming;
  }
  if (safeIncoming.length === 0) {
    return safeLocal;
  }

  const localMap = new Map();
  safeLocal.forEach(p => {
    if (p && p.id) localMap.set(p.id, p);
  });

  const merged = safeIncoming.map(incoming => {
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

  // إضافة أي مشاريع أُنشئت محلياً فقط ولم تُرفع بعد إلى السحابة مع التأكد من ملكيتها لنفس الشركة
  safeLocal.forEach(local => {
    if (local && local.id && !safeIncoming.some(inc => inc.id === local.id)) {
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
        const rawName = u.role === 'engineer' ? (u.engineerName || u.name || '') : (u.name || '');
        const name = String(rawName || '').trim();
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
    if (u && (u.id != null || u.email)) {
      const rawKey = u.email || String(u.id);
      const key = String(rawKey).toLowerCase().trim();
      if (key) usersMap.set(key, u);
    }
  });
  (Array.isArray(localUsers) ? localUsers : []).forEach(u => {
    if (u && (u.id != null || u.email)) {
      const rawKey = u.email || String(u.id);
      const key = String(rawKey).toLowerCase().trim();
      if (key) usersMap.set(key, { ...(usersMap.get(key) || {}), ...u });
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
 * حفظ مستخدمي الشركة في السحابة مع قائمة البريد المصرح له
 */
export async function syncCompanyUsersToCloud(companyId, users) {
  const cId = cleanCompanyId(companyId);
  if (!cId) return false;
  const cleanUsers = sanitizeCompanyUsersForCloud(users);
  const authorizedEmails = Array.isArray(cleanUsers)
    ? cleanUsers.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean)
    : [];
  return syncCompanyDataToCloud(cId, { users: cleanUsers, authorizedEmails });
}

/**
 * حفظ وتحديث موظفي الشركة سحابياً في كل من وثيقة الشركة وقائمة المنصة المركزية
 * لضمان دخول الموظفين بسلاسة من أي هاتف أو كمبيوتر دون عوائق
 */
export async function syncTenantUsersToCloud(companyId, users) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !Array.isArray(users)) return false;
  const cleanUsers = sanitizeCompanyUsersForCloud(users);
  const authorizedEmails = cleanUsers.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean);

  // 1. تحديث وثيقة الشركة مع قائمة الإيميلات المصرح لها
  try {
    await syncCompanyDataToCloud(cId, {
      users: cleanUsers,
      authorizedEmails: authorizedEmails,
    });
  } catch (e) {
    console.warn("[syncTenantUsersToCloud] company doc update warning:", e);
  }

  // 2. تحديث قائمة الشركات المركزية platform_metadata/tenants لتمكين التحقق السحابي الفوري
  try {
    const tenantsRef = doc(db, TENANTS_META_DOC, TENANTS_META_KEY);
    const snap = await getDoc(tenantsRef);
    if (snap.exists()) {
      const currentList = snap.data()?.tenants || [];
      const idx = currentList.findIndex(t => t.id === cId);
      if (idx !== -1) {
        currentList[idx] = {
          ...currentList[idx],
          users: cleanUsers,
          authorizedEmails: authorizedEmails,
        };
        await setDoc(tenantsRef, {
          tenants: currentList,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }
  } catch (e) {
    console.warn("[syncTenantUsersToCloud] tenants list update warning:", e);
  }

  // 3. تحديث دليل المستخدمين المركزي السحابي platform_metadata/users_directory
  try {
    const dirRef = doc(db, TENANTS_META_DOC, 'users_directory');
    const dirPatch = {};
    cleanUsers.forEach(u => {
      const cleanE = (u.email || '').toLowerCase().trim();
      const cPhone = cleanPhoneNumber(u.phone);
      const userPayload = {
        id: u.id || '',
        email: cleanE,
        phone: u.phone || null,
        cleanPhone: cPhone || null,
        name: u.name || '',
        role: u.role || 'engineer',
        engineerName: u.engineerName || null,
        companyId: cId,
        updatedAt: new Date().toISOString(),
      };

      if (cleanE) {
        const safeKey = cleanE.replace(/\./g, '_dot_');
        dirPatch[safeKey] = userPayload;
      }
      if (cPhone) {
        dirPatch['phone_' + cPhone] = userPayload;
      }
    });
    if (Object.keys(dirPatch).length > 0) {
      await setDoc(dirRef, dirPatch, { merge: true });
    }
  } catch (e) {
    console.warn("[syncTenantUsersToCloud] users directory update warning:", e);
  }

  return true;
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
 * جلب بيانات التينانت من السحابة بناءً على النطاق الفرعي (Subdomain)
 * يبحث في: subdomain, slug, id, comp_{id} — متزامن مع منطق getInitialCompanyId في App.jsx
 */
export async function fetchTenantBySubdomain(subdomain) {
  const cleanSubdomain = (subdomain || '').toLowerCase().trim();
  if (!cleanSubdomain) return null;

  // 1. الدليل العام المخصص للشركات والنطاقات الفرعية (متاح لجميع الزوار بدون تسجيل دخول)
  try {
    const dirRef = doc(db, 'tenant_directory', cleanSubdomain);
    const dirSnap = await getDoc(dirRef);
    if (dirSnap.exists()) {
      const { companyId, name, logo } = dirSnap.data() || {};
      if (companyId) {
        console.log('[fetchTenantBySubdomain] ✅ Resolved from tenant_directory:', cleanSubdomain, '→', companyId);
        return {
          id: companyId,
          companyId: companyId,
          name: name || companyId,
          logo: logo || null,
          subdomain: cleanSubdomain,
          slug: cleanSubdomain,
        };
      }
    }
  } catch (e) {
    console.warn('[fetchTenantBySubdomain] tenant_directory lookup fallback:', e?.message || e);
  }

  // 2. الطريقة الاحتياطية (fetchTenantsListFromCloud) للمستخدمين المسجلين دخول أصلاً
  try {
    const list = await fetchTenantsListFromCloud();
    if (Array.isArray(list) && list.length > 0) {
      const found = list.find(t => {
        if (!t) return false;
        const tSub  = (t.subdomain || '').toLowerCase().trim();
        const tSlug = (t.slug || '').toLowerCase().trim();
        const tId   = (t.id || '').toLowerCase().trim();
        const tCustomDomain = (t.customDomain || '').toLowerCase().trim();
        // مطابقة الدومين المخصص الكامل إن وُجد
        if (tCustomDomain) {
          try {
            const currentHost = window.location.hostname.toLowerCase();
            if (currentHost === tCustomDomain) return true;
          } catch (e) {}
        }
        return (
          tSub === cleanSubdomain ||
          tSlug === cleanSubdomain ||
          tId === cleanSubdomain ||
          tId === `comp_${cleanSubdomain}` ||
          tId === `comp_c_${cleanSubdomain}`
        );
      });
      if (found) {
        console.log('[fetchTenantBySubdomain] ✅ Resolved subdomain:', cleanSubdomain, '→', found.id);
      } else {
        console.warn('[fetchTenantBySubdomain] ⚠️ No tenant found for subdomain:', cleanSubdomain);
      }
      return found || null;
    }
  } catch (error) {
    console.warn("Cloud fetch (tenant by subdomain) error:", error?.message || error);
  }
  return null;
}

/**
 * البحث عن حساب المستخدم في دليل المنصة السحابي المركزي (للتحقق الفوري عند الدخول)
 */
export async function fetchUserFromCloudDirectory(email) {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) return null;

  // 1. فحص وثيقة الدليل المركزي السحابي platform_metadata/users_directory
  try {
    const dirRef = doc(db, TENANTS_META_DOC, 'users_directory');
    const snap = await getDoc(dirRef);
    if (snap.exists()) {
      const data = snap.data();
      const safeKey = cleanEmail.replace(/\./g, '_dot_');
      if (data && (data[safeKey] || data[cleanEmail])) {
        return data[safeKey] || data[cleanEmail];
      }
    }
  } catch (e) {
    // Non-blocking fallback to tenants list
  }

  // 2. فحص قائمة الشركات المركزية platform_metadata/tenants كمسار بديل مضمون
  try {
    const tenantsList = await fetchTenantsListFromCloud();
    if (Array.isArray(tenantsList)) {
      for (const t of tenantsList) {
        if (Array.isArray(t.users)) {
          const match = t.users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
          if (match) {
            return {
              ...match,
              companyId: t.id,
              companyName: t.name,
              currency: t.currency || 'ج.م',
            };
          }
        }
        if (t.adminEmail && t.adminEmail.toLowerCase().trim() === cleanEmail) {
          return {
            id: `u_${t.id}_admin`,
            email: t.adminEmail,
            name: t.adminName || 'مدير الشركة',
            role: 'owner',
            companyId: t.id,
            companyName: t.name,
            currency: t.currency || 'ج.م',
          };
        }
      }
    }
  } catch (e) {
    console.warn("[fetchUserFromCloudDirectory] tenants list fallback error:", e.message);
  }

  return null;
}

/**
 * تطهير وتوحيد أرقام الهواتف (تحويل الأرقام العربية، إزالة المسافات والرموز، وتوحيد الصيغة)
 */
export function cleanPhoneNumber(raw) {
  if (!raw) return '';
  let str = String(raw).trim()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[\s\-\(\)\.]/g, '');

  if (str.startsWith('00')) str = str.slice(2);
  if (str.startsWith('+')) str = str.slice(1);

  // إذا كان رقم مصري مسبوق بكود الدولة 20
  if (str.startsWith('20') && str.length === 12 && ['10', '11', '12', '15'].includes(str.slice(2, 4))) {
    str = '0' + str.slice(2);
  } else if (str.length === 10 && ['10', '11', '12', '15'].includes(str.slice(0, 2))) {
    str = '0' + str;
  }

  return str.replace(/\D/g, '');
}

/**
 * البحث عن حساب المستخدم برقم هاتفه في دليل المنصة السحابي أو قائمة الشركات
 */
export async function fetchUserByPhoneFromCloudDirectory(phone) {
  const cPhone = cleanPhoneNumber(phone);
  if (!cPhone || cPhone.length < 7) return null;

  // 1. فحص وثيقة الدليل المركزي السحابي platform_metadata/users_directory
  try {
    const dirRef = doc(db, TENANTS_META_DOC, 'users_directory');
    const snap = await getDoc(dirRef);
    if (snap.exists()) {
      const data = snap.data();
      const phoneKey = 'phone_' + cPhone;
      if (data && data[phoneKey]) {
        return data[phoneKey];
      }
      // مسار بديل: فحص كافة سجلات الدليل في حال كان الهاتف مخزناً داخل كائن المستخدم
      for (const k of Object.keys(data)) {
        const u = data[k];
        if (u && (cleanPhoneNumber(u.phone) === cPhone || cleanPhoneNumber(u.cleanPhone) === cPhone)) {
          return u;
        }
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }

  // 2. فحص قائمة الشركات المركزية platform_metadata/tenants
  try {
    const tenantsList = await fetchTenantsListFromCloud();
    if (Array.isArray(tenantsList)) {
      for (const t of tenantsList) {
        if (Array.isArray(t.users)) {
          const match = t.users.find(u => (
            cleanPhoneNumber(u.phone) === cPhone ||
            cleanPhoneNumber(u.cleanPhone) === cPhone
          ));
          if (match) {
            return {
              ...match,
              companyId: t.id,
              companyName: t.name,
              currency: t.currency || 'ج.م',
            };
          }
        }
        if (t.phone && cleanPhoneNumber(t.phone) === cPhone) {
          return {
            id: `u_${t.id}_admin`,
            email: t.adminEmail,
            phone: t.phone,
            name: t.adminName || 'مدير الشركة',
            role: 'owner',
            companyId: t.id,
            companyName: t.name,
            currency: t.currency || 'ج.م',
          };
        }
      }
    }
  } catch (e) {
    console.warn("[fetchUserByPhoneFromCloudDirectory] error:", e.message);
  }

  return null;
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
