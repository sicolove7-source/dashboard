/**
 * ===================================================================
 * خدمة المزامنة السحابية الفورية — Cloud Sync Service (Firebase)
 * ===================================================================
 * مزامنة حية ولحظية للمشاريع، الشركات، الإعدادات، والمستخدمين عبر Firestore.
 */

import app, { db, storage, functions, auth, ensureAnonymousAuth } from '../firebase.js';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString, getStorage } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';

/**
 * رفع الوسائط (صور / فيديوهات) سحابياً إلى Firebase Storage والحصول على رابط HTTPS دائم
 * مع دعم الحاويات البديلة وإرجاع null عند الفشل للاعتماد الآمن على IndexedDB
 */
let isStorageVerifiedDisabled = false;

/**
 * ضغط الصورة على المتصفح إلى DataURL فائق الوضوح وخفيف الحجم (30-60 كيلوبايت)
 * مناسب تماماً للحفظ السحابي في Firestore والظهور الفوري عبر أي متصفح دون أخطاء
 */
export async function compressImageToCloudDataUrl(fileOrBlob, maxDim = 960, quality = 0.65) {
  if (!fileOrBlob) return '';
  if (typeof fileOrBlob === 'string' && fileOrBlob.startsWith('data:image/') && fileOrBlob.length < 75000) {
    return fileOrBlob;
  }
  if (typeof window === 'undefined') return '';

  // أضفنا timeout بـ 5 ثواني لمنع التجمد الأبدي إذا فشل تحميل الصورة
  return Promise.race([
    new Promise((resolve) => {
      try {
        let blob = fileOrBlob;
        if (typeof fileOrBlob === 'string' && fileOrBlob.startsWith('data:')) {
          const parts = fileOrBlob.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          blob = new Blob([u8arr], { type: mime });
        }

        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          try {
            let w = img.width || maxDim;
            let h = img.height || maxDim;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, w);
            canvas.height = Math.max(1, h);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);

            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            if (dataUrl.length > 70000) {
              dataUrl = canvas.toDataURL('image/jpeg', 0.50);
            }
            if (dataUrl.length > 70000) {
              const canvas2 = document.createElement('canvas');
              canvas2.width = Math.round(canvas.width * 0.7);
              canvas2.height = Math.round(canvas.height * 0.7);
              const ctx2 = canvas2.getContext('2d');
              ctx2.drawImage(canvas, 0, 0, canvas2.width, canvas2.height);
              dataUrl = canvas2.toDataURL('image/jpeg', 0.45);
            }
            resolve(dataUrl);
          } catch (e) {
            URL.revokeObjectURL(url);
            resolve('');
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve('');
        };
        img.src = url;
      } catch (e) {
        resolve('');
      }
    }),
    new Promise((resolve) => setTimeout(() => resolve(''), 5000)) // مهلة قصوى 5 ثواني
  ]);
}

/**
 * رفع الوسائط سحابياً بشكل فوري ومباشر دون أي انتظار أو تجميد
 * يدعم Firebase Storage مع إنقاذ فوري وذكي في Firestore Cloud Media Vault مجاناً 100%
 * دون الحاجة لترقية الحساب لخطة Blaze المدفوعة
 * @param {File|Blob|string} fileOrDataUrl - الملف أو رابط data URL
 * @param {string} folder - مجلد الحفظ
 * @param {string} fileName - اسم الملف
 * @param {string} [existingThumb=''] - مصغرة جاهزة من المكوّن (base64) - تُستخدم بدلاً من إعادة توليدها
 */
export async function uploadMediaToFirebaseStorage(fileOrDataUrl, folder = 'site_media', fileName = '', existingThumb = '', customMediaId = '', passedCompanyId = '') {
  if (!fileOrDataUrl) return null;

  // 1. استخدام المصغرة الموجودة مسبقاً (تم توليدها بالفعل في المكوّن بسرعة فائقة)
  const microThumb = existingThumb || '';

  // 2. استخراج وتوحيد معرف الصورة (mediaId) ليتطابق بنسبة 100% مع كائن الصورة
  let mediaId = customMediaId;
  if (!mediaId && fileName) {
    const fnMatch = fileName.match(/(?:repair_)?(ph_[a-zA-Z0-9_-]+|m_[a-zA-Z0-9_-]+|snag_[a-zA-Z0-9_-]+)/);
    if (fnMatch) mediaId = fnMatch[1];
  }
  if (!mediaId) {
    mediaId = 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  // 3. رفع وحفظ غير معطِّل تماماً في الخلفية إلى الخزينة السحابية في Firestore
  (async () => {
    try {
      let cloudDataUrl = '';
      try {
        cloudDataUrl = await compressImageToCloudDataUrl(fileOrDataUrl, 800, 0.60);
      } catch (e) {}

      const dataToSave = cloudDataUrl || microThumb;
      if (dataToSave && db) {
        const match = folder.match(/companies\/([^/]+)/);
        const rawCId = passedCompanyId || (match && match[1] && match[1] !== 'company' && match[1] !== 'undefined' ? match[1] : null);
        const activeTenant = typeof localStorage !== 'undefined' ? (localStorage.getItem('platform-active-tenant-id') || localStorage.getItem('tashteeb_active_company_id')) : null;
        const cId = rawCId || activeTenant || 'general';

        const vaultDoc = {
          id: mediaId,
          companyId: cId,
          data: dataToSave,
          name: fileName || 'photo.jpg',
          createdAt: new Date().toISOString()
        };

        // إرسال مباشر إلى خزينة وسائط الشركة وخزينة البوابات
        setDoc(doc(db, 'companies', cId, 'media', mediaId), vaultDoc).catch(() => {});
        setDoc(doc(db, 'portal_shares_media', mediaId), vaultDoc).catch(() => {});
        console.log(`[uploadMediaToFirebaseStorage] ⚡ Synced [${mediaId}] to Cloud Vault (~${Math.round(dataToSave.length / 1024)}KB)`);
      }
    } catch (err) {
      console.warn('[uploadMediaToFirebaseStorage] Background sync notice:', err);
    }
  })();

  // 4. إرجاع المصغرة فوراً بدون أي تأخير لمنع تجميد واجهة المستخدم نهائياً
  return microThumb || (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:') ? fileOrDataUrl : null);
}


export function cleanCompanyId(companyId) {
  if (!companyId) return null;
  if (typeof companyId === 'object') return companyId.id || companyId.companyId || null;
  let str = String(companyId).trim();
  if (str === '[object Object]' || str === 'undefined' || str === 'null') return null;
  if (!str.startsWith('comp_')) str = 'comp_' + str;
  return str;
}

export function generatePortalToken() {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return 'cpt_' + crypto.randomUUID().replace(/-/g, '');
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return 'cpt_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return 'cpt_' + globalThis.crypto.randomUUID().replace(/-/g, '');
  }
  throw new Error('Cryptographically secure PRNG (crypto.randomUUID) is not available');
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
  const hasStorage = typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function';
  const cId = p.companyId || (hasStorage ? (localStorage.getItem('platform-active-tenant-id') || localStorage.getItem('tashteeb_active_company_id')) : '') || 'general';

  // حساب إجمالي المصروفات بدقة دائماً لضمان تناسق الحسابات في كل مكان
  if (Array.isArray(p.expenses) && p.expenses.length > 0) {
    p.spent = p.expenses.reduce((s, e) => s + (Number(e?.amount) || 0), 0);
  }

  if (Array.isArray(p.dailyLogs)) {
    p.dailyLogs = p.dailyLogs.map(log => {
      if (!log || typeof log !== 'object') return log;
      const l = { ...log };

      // تنقية وتجريد وسائط اليومية من أي روابط blob مؤقتة أو Base64 متضخمة فوق الحد
      let safeMedia = [];
      if (Array.isArray(l.media)) {
        safeMedia = l.media.map(m => {
          if (!m || typeof m !== 'object') return null;
          const src = m.src || '';
          // الـ thumbnail دائماً هو الأولوية الأولى للحفظ السحابي (أصغر حجماً ويعمل على كل المتصفحات)
          const thumb = (typeof m.thumbnail === 'string' && m.thumbnail.startsWith('data:')) ? m.thumbnail
            : (typeof m.src === 'string' && m.src.startsWith('data:') && m.src.length <= 15000 ? m.src : '');
          const isBlob = typeof src === 'string' && src.startsWith('blob:');
          const isOverLimit = typeof src === 'string' && src.startsWith('data:') && src.length > 15000;

          let cleanSrc = src;
          if (isBlob) {
            // الـ blob مؤقت: نستخدم الـ thumbnail أو الـ rawSrc أو الـ data: المضغوطة
            cleanSrc = thumb || (m.rawSrc && !m.rawSrc.startsWith('blob:') && !m.rawSrc.startsWith('idb://') ? m.rawSrc : '');
            if (!cleanSrc) cleanSrc = `idb://${m.id || Date.now()}`;
          } else if (isOverLimit) {
            // صورة ضخمة جداً: نستخدم الـ thumbnail الصغيرة أو idb
            cleanSrc = thumb || (m.rawSrc?.startsWith('idb://') ? m.rawSrc : `idb://${m.id || Date.now()}`);
          } else if (typeof src === 'string' && src.startsWith('idb://') && thumb) {
            // صورة محلية idb: نستبدلها بالـ thumbnail مباشرة
            cleanSrc = thumb;
          }

          return {
            id: m.id || ('m_' + Math.random().toString(36).substr(2, 6)),
            companyId: m.companyId || cId,
            type: m.type || 'image',
            name: m.name || '',
            caption: m.caption || '',
            src: cleanSrc,
            rawSrc: m.rawSrc || cleanSrc,
            thumbnail: thumb || ''
          };
        }).filter(Boolean);
      }

      // تنقية صور اليومية مع ضمان حفظ المصغرة الخفيفة سحابياً للظهور عبر أي متصفح
      let safePhotos = [];
      if (Array.isArray(l.photos)) {
        safePhotos = l.photos.map(photo => {
          if (typeof photo === 'string') {
            if (photo.startsWith('blob:')) return null;
            // لا نحذف الـ data: strings بناءً على الحجم - نحتفظ بها دائماً
            return photo;
          } else if (photo && typeof photo === 'object') {
            const src = photo.src || '';
            // الـ thumbnail دائماً هو الأولوية الأولى: صغيرة وتعمل على كل المتصفحات
            const thumb = (typeof photo.thumbnail === 'string' && photo.thumbnail.startsWith('data:')) ? photo.thumbnail
              : (typeof photo.src === 'string' && photo.src.startsWith('data:') && photo.src.length <= 15000 ? photo.src : '');
            const isBlob = typeof src === 'string' && src.startsWith('blob:');
            const isOverLimit = typeof src === 'string' && src.startsWith('data:') && src.length > 15000;

            let cleanSrc = src;
            if (isBlob) {
              // الـ blob مؤقت: نستخدم الـ thumbnail أو الـ rawSrc أو الـ data: إذا كانت متوفرة
              cleanSrc = thumb || (photo.rawSrc && !photo.rawSrc.startsWith('blob:') && !photo.rawSrc.startsWith('idb://') ? photo.rawSrc : '');
              if (!cleanSrc) cleanSrc = `idb://${photo.id || Date.now()}`;
            } else if (isOverLimit) {
              // صورة ضخمة جداً: نستخدم الـ thumbnail الصغيرة أو idb
              cleanSrc = thumb || (photo.rawSrc?.startsWith('idb://') ? photo.rawSrc : `idb://${photo.id || Date.now()}`);
            } else if (typeof src === 'string' && src.startsWith('idb://') && thumb) {
              // صورة محلية idb: نستبدلها بالـ thumbnail مباشرة
              cleanSrc = thumb;
            }

            return {
              id: photo.id || ('ph_' + Math.random().toString(36).substr(2, 6)),
              companyId: photo.companyId || cId,
              type: photo.type || 'image',
              caption: photo.caption || '',
              src: cleanSrc,
              rawSrc: photo.rawSrc || cleanSrc,
              thumbnail: thumb || ''
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
      const thumb = (typeof photo.thumbnail === 'string' && photo.thumbnail.startsWith('data:')) ? photo.thumbnail
        : (typeof photo.src === 'string' && photo.src.startsWith('data:') && photo.src.length <= 15000 ? photo.src : '');
      let cleanSrc = src;
      if (typeof src === 'string' && src.startsWith('blob:')) {
        cleanSrc = thumb || (photo.rawSrc && !photo.rawSrc.startsWith('blob:') && !photo.rawSrc.startsWith('idb://') ? photo.rawSrc : `idb://${photo.id || Date.now()}`);
      } else if (typeof src === 'string' && src.startsWith('data:') && src.length > 15000) {
        cleanSrc = thumb || (photo.rawSrc?.startsWith('idb://') ? photo.rawSrc : `idb://${photo.id || Date.now()}`);
      } else if (typeof src === 'string' && src.startsWith('idb://') && thumb) {
        cleanSrc = thumb;
      }
      return {
        ...photo,
        id: photo.id || ('ph_' + Math.random().toString(36).substr(2, 6)),
        companyId: photo.companyId || cId,
        src: cleanSrc,
        thumbnail: thumb || ''
      };
    });
  }

  if (Array.isArray(p.snags)) {
    p.snags = p.snags.map(snag => {
      if (!snag || typeof snag !== 'object') return snag;
      const s = { ...snag };
      if (typeof s.photo === 'string' && s.photo.startsWith('blob:')) {
        s.photo = s.thumbnail || (s.mediaId ? `idb://${s.mediaId}` : '');
      } else if (typeof s.photo === 'string' && s.photo.startsWith('data:') && s.photo.length > 75000) {
        s.photo = (s.thumbnail && s.thumbnail.length <= 75000) ? s.thumbnail : (s.mediaId ? `idb://${s.mediaId}` : '');
      } else if (typeof s.photo === 'string' && s.photo.startsWith('idb://') && s.thumbnail && s.thumbnail.startsWith('data:')) {
        s.photo = s.thumbnail;
      }

      if (typeof s.afterPhoto === 'string' && s.afterPhoto.startsWith('blob:')) {
        s.afterPhoto = s.afterThumbnail || s.thumbnail || (s.afterMediaId ? `idb://${s.afterMediaId}` : '');
      } else if (typeof s.afterPhoto === 'string' && s.afterPhoto.startsWith('data:') && s.afterPhoto.length > 75000) {
        s.afterPhoto = (s.afterThumbnail || s.thumbnail) && (s.afterThumbnail || s.thumbnail).length <= 75000 ? (s.afterThumbnail || s.thumbnail) : (s.afterMediaId ? `idb://${s.afterMediaId}` : '');
      } else if (typeof s.afterPhoto === 'string' && s.afterPhoto.startsWith('idb://') && (s.afterThumbnail || s.thumbnail)) {
        s.afterPhoto = s.afterThumbnail || s.thumbnail;
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
 * فحص هل المشروع مشروع تجريبي/وهمي مزروع تلقائياً
 */
export function isDemoProject(p) {
  if (!p) return false;
  const id = String(p.id || '');
  if (id === 'demo-proj-001' || id === 'demo-proj-002') return true;
  if (id.startsWith('demo-proj-') || id.startsWith('p_seed_')) return true;
  const name = String(p.name || '');
  if (
    name.includes('مشروع تشطيب فيلا رئيسية') ||
    name.includes('فيلا سوبر لوكس — التجمع الخامس') ||
    name.includes('شقة أوبر لوكس — مدينة نصر')
  ) {
    const client = String(p.client || '');
    if (
      client.includes('عميل المشروع') ||
      client.includes('أحمد سعد الدين') ||
      client.includes('سلمى رضا') ||
      id.startsWith('p_')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * دمج المشاريع السحابية والمحلية بذكاء مع الحفاظ الكامل على اليوميات والاستلامات الأحدث
 * لمنع أي ضياع للبيانات عند بطء الاتصال أو إعادة التحميل (Zero-Data-Loss Merge)
 */
export function mergeProjectsPreservingLocal(localProjects, incomingProjects, targetCompanyId) {
  const cleanTarget = targetCompanyId ? cleanCompanyId(targetCompanyId) : null;
  const isRealTenant = cleanTarget && cleanTarget !== 'comp_demo';
  const filterByTarget = (list) => {
    if (!Array.isArray(list)) return [];
    return list.filter(p => {
      if (!p) return false;
      if (cleanTarget && p.companyId && cleanCompanyId(p.companyId) !== cleanTarget) return false;
      if (isRealTenant && isDemoProject(p)) return false;
      return true;
    });
  };

  const safeLocal = filterByTarget(localProjects);
  const safeIncoming = filterByTarget(incomingProjects);

  if (!incomingProjects) {
    return safeLocal;
  }
  if (safeLocal.length === 0) {
    return safeIncoming;
  }
  if (safeIncoming.length === 0) {
    // السحابة هي مصدر الحقيقة (Source of Truth): إذا كانت فارغة، لا نعيد إحياء المشاريع المحذوفة
    return safeLocal.filter(p => p && (p._pendingSync === true || p.isOfflineCreated === true));
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

    // 4. دمج المقبوضات ودفعات العميل (clientPayments / payments): دمج فريد بالـ ID لمنع ضياع أي دفعة
    const payMap = new Map();
    const incPayments = Array.isArray(incoming.clientPayments) ? incoming.clientPayments : (Array.isArray(incoming.payments) ? incoming.payments : []);
    const locPayments = Array.isArray(local.clientPayments) ? local.clientPayments : (Array.isArray(local.payments) ? local.payments : []);
    incPayments.forEach(p => {
      if (p && (p.id || p.date)) payMap.set(p.id || `${p.date}_${p.amount}`, p);
    });
    locPayments.forEach(p => {
      if (p && (p.id || p.date)) {
        const k = p.id || `${p.date}_${p.amount}`;
        if (!payMap.has(k)) payMap.set(k, p);
      }
    });
    const mergedPayments = Array.from(payMap.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // 5. دمج مصروفات وتكاليف الموقع (expenses): دمج فريد بالـ ID لضمان ظهور كافة المصروفات للجميع
    const expMap = new Map();
    (incoming.expenses || []).forEach(e => {
      if (e && (e.id || e.date)) expMap.set(e.id || `${e.date}_${e.amount}`, e);
    });
    (local.expenses || []).forEach(e => {
      if (e && (e.id || e.date)) {
        const k = e.id || `${e.date}_${e.amount}`;
        if (!expMap.has(k)) expMap.set(k, e);
      }
    });
    const mergedExpenses = Array.from(expMap.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // 6. دمج محطات واستحقاقات الدفعات (paymentMilestones)
    const msMap = new Map();
    (incoming.paymentMilestones || []).forEach(m => {
      if (m && (m.id || m.label)) msMap.set(m.id || m.label, m);
    });
    (local.paymentMilestones || []).forEach(m => {
      if (m && (m.id || m.label)) {
        const k = m.id || m.label;
        if (!msMap.has(k)) msMap.set(k, m);
        else {
          const incM = msMap.get(k);
          if (m.status === 'collected' && incM.status !== 'collected') msMap.set(k, m);
        }
      }
    });
    const mergedMilestones = Array.from(msMap.values());

    // 7. دمج صنايعية الموقع (craftsmen)
    const crMap = new Map();
    (incoming.craftsmen || []).forEach(c => {
      if (c && (c.id || c.name)) crMap.set(c.id || c.name, c);
    });
    (local.craftsmen || []).forEach(c => {
      if (c && (c.id || c.name)) {
        const k = c.id || c.name;
        if (!crMap.has(k)) crMap.set(k, c);
        else {
          const inc = crMap.get(k);
          crMap.set(k, { ...inc, ...c });
        }
      }
    });
    const mergedCraftsmen = Array.from(crMap.values());

    // 8. دمج الخامات والتوريدات (resources)
    const incMaterials = incoming.resources?.materials || [];
    const locMaterials = local.resources?.materials || [];
    const matMap = new Map();
    incMaterials.forEach(m => { if (m && (m.id || m.item)) matMap.set(m.id || m.item, m); });
    locMaterials.forEach(m => { if (m && (m.id || m.item) && !matMap.has(m.id || m.item)) matMap.set(m.id || m.item, m); });
    const mergedResources = {
      ...(incoming.resources || local.resources || {}),
      materials: Array.from(matMap.values())
    };

    const finalSpent = mergedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) || Number(incoming.spent || local.spent || 0);
    const finalToken = incoming.clientPortalToken || local.clientPortalToken || generatePortalToken();
    const finalPortalEnabled = incoming.clientPortalEnabled !== false && local.clientPortalEnabled !== false;

    const localTime = new Date(local.updatedAt || 0).getTime();
    const incomingTime = new Date(incoming.updatedAt || 0).getTime();
    const base = localTime > incomingTime ? { ...incoming, ...local } : { ...local, ...incoming };

    return {
      ...base,
      dailyLogs: mergedLogs,
      snags: mergedSnags,
      files: mergedFiles,
      clientPayments: mergedPayments,
      payments: mergedPayments,
      expenses: mergedExpenses,
      paymentMilestones: mergedMilestones,
      craftsmen: mergedCraftsmen,
      resources: mergedResources,
      spent: finalSpent,
      clientPortalToken: finalToken,
      clientPortalEnabled: finalPortalEnabled,
    };
  });

  // إضافة فقط المشاريع المنشأة محلياً دون اتصال ولم تُرفع بعد (حتى لا نُعيد إحياء المشاريع المحذوفة سحابياً)
  safeLocal.forEach(local => {
    if (local && local.id && !safeIncoming.some(inc => inc.id === local.id)) {
      if (local._pendingSync === true || local.isOfflineCreated === true) {
        merged.push(local);
      }
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

    if (!safeProject.clientPortalToken) {
      safeProject.clientPortalToken = generatePortalToken();
      safeProject.clientPortalEnabled = true;
    }

    // 1. كتابة وثيقة المشروع المستقلة في الـ Sub-collection
    await setDoc(projectRef, safeProject, { merge: true });

    // 2. تحديث طابع وقت الشركة الرئيسي
    const companyDocRef = doc(db, 'companies', cId);
    await setDoc(companyDocRef, {
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 3. النشر الفوري لبوابة العميل في portal_shares/{token} لتمكين العميل من فتحها من أي جهاز فوراً
    if (safeProject.clientPortalToken && safeProject.clientPortalEnabled !== false) {
      publishProjectToPortalShares(cId, safeProject).catch(() => {});
    }

    return true;
  } catch (error) {
    console.warn("Cloud sync (subcollection single project) offline or error:", error.message);
    return false;
  }
}

/**
 * نشر وإسقاط نسخة آمنة ومنقاة من المشروع إلى portal_shares/{token}
 * تمكّن العميل من فتح البوابة برابطه المخصص من أي متصفح أو جهاز بدون تسجيل دخول
 */
export async function publishProjectToPortalShares(companyId, project) {
  const cId = cleanCompanyId(companyId);
  const token = project?.clientPortalToken;
  if (!cId || !token) return false;

  try {
    const shareRef = doc(db, 'portal_shares', token);

    // إذا كانت البوابة معطلة صراحة، احذف وثيقة المشاركة
    if (project.clientPortalEnabled === false) {
      await deleteDoc(shareRef).catch(() => {});
      return true;
    }

    // استخراج أو جلب إعدادات الشركة الخاصة بالهوية والألوان
    let companySettings = project.companySettings || null;
    if (!companySettings) {
      try {
        const compDoc = await getDoc(doc(db, 'companies', cId));
        if (compDoc.exists()) {
          companySettings = compDoc.data()?.settings || null;
        }
      } catch (e) {}
    }

    // تطهير كامل لبيانات المشروع والوسائط لضمان حفظ مصغرات صالحة ونظيفة في وثيقة المشاركة
    const safeProject = sanitizeProjectForCloud(project);

    const sharePayload = {
      id: safeProject.id,
      projectId: safeProject.id,
      companyId: cId,
      name: safeProject.name || "مشروع بدون اسم",
      client: safeProject.client || "عميلنا العزيز",
      clientPhone: safeProject.clientPhone || "",
      location: safeProject.location || "",
      type: safeProject.type || "",
      floors: safeProject.floors || "",
      area: Number(safeProject.area || 0),
      budget: Number(safeProject.budget || safeProject.contractValue || 0),
      contractValue: Number(safeProject.contractValue || safeProject.budget || 0),
      spent: Number(safeProject.spent || (Array.isArray(safeProject.expenses) ? safeProject.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) : 0)),
      progress: Number(safeProject.progress || 0),
      status: safeProject.status || "active",
      startDate: safeProject.startDate || "",
      endDate: safeProject.endDate || "",
      dueDate: safeProject.dueDate || "",
      workItems: Array.isArray(safeProject.workItems) ? safeProject.workItems : [],
      dailyLogs: Array.isArray(safeProject.dailyLogs) ? safeProject.dailyLogs : [],
      photos: Array.isArray(safeProject.photos) ? safeProject.photos : [],
      sitePhotos: Array.isArray(safeProject.sitePhotos) ? safeProject.sitePhotos : [],
      payments: Array.isArray(safeProject.payments) ? safeProject.payments : (safeProject.clientPayments || []),
      clientPayments: Array.isArray(safeProject.clientPayments) ? safeProject.clientPayments : (safeProject.payments || []),
      expenses: Array.isArray(safeProject.expenses) ? safeProject.expenses : [],
      paymentMilestones: Array.isArray(safeProject.paymentMilestones) ? safeProject.paymentMilestones : [],
      clientSignature: safeProject.clientSignature || null,
      clientApprovalDate: safeProject.clientApprovalDate || null,
      clientApprovalNotes: safeProject.clientApprovalNotes || null,
      clientContract: safeProject.clientContract || null,
      clientPortalEnabled: true,
      clientPortalToken: token,
      token: token,
      companySettings: companySettings,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(shareRef, stripUndefined(sharePayload), { merge: true });
      console.log('[publishProjectToPortalShares] ✅ Live portal published for token:', token);
      return true;
    } catch (writeErr) {
      console.warn('[publishProjectToPortalShares] Direct write failed, trying Cloud Function fallback:', writeErr.message);
      if (functions) {
        try {
          const createFn = httpsCallable(functions, 'createPortalShare');
          await createFn({ companyId: cId, projectId: project.id });
          console.log('[publishProjectToPortalShares] ✅ Published via Cloud Function fallback for token:', token);
          return true;
        } catch (fnErr) {
          console.warn('[publishProjectToPortalShares] Cloud Function fallback notice:', fnErr.message);
        }
      }
      return false;
    }
  } catch (err) {
    console.warn('[publishProjectToPortalShares] Non-blocking portal sync notice:', err.message);
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
 * حفظ ومزامنة إعدادات الشركة وهوية البراندينج في كافة الوجهات السحابية
 * (وثيقة الشركة، قائمة المنصة المركزية platform_metadata/tenants، ودليل النطاقات الفرعية tenant_directory)
 */
export async function syncSettingsToCloud(companyId, settings) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !settings) return false;

  // 0. ضغط اللوجو الإجباري قبل الحفظ لمنع رفض Firestore بسبب الحجم (الحد 1MB للوثيقة الكاملة)
  let safeLogo = settings.companyLogo || null;
  if (safeLogo && typeof safeLogo === 'string' && safeLogo.startsWith('data:') && safeLogo.length > 60000) {
    try {
      safeLogo = await compressImageToCloudDataUrl(safeLogo, 480, 0.60);
      if (!safeLogo || safeLogo.length > 60000) {
        safeLogo = await compressImageToCloudDataUrl(safeLogo || settings.companyLogo, 320, 0.45);
      }
      console.log('[syncSettingsToCloud] Logo compressed to:', safeLogo ? `${safeLogo.length} chars` : 'null');
    } catch (compErr) {
      console.warn('[syncSettingsToCloud] Logo compression failed, using original:', compErr?.message);
    }
  }

  const safeSettings = { ...settings, companyLogo: safeLogo };

  // 1. تحديث وثيقة الشركة في /companies/{cId}
  const companyPatch = {
    settings: safeSettings,
    updatedAt: new Date().toISOString(),
  };
  if (safeSettings.companyName) {
    companyPatch.name = safeSettings.companyName;
  }
  if (safeSettings.companyLogo !== undefined) {
    companyPatch.logo = safeSettings.companyLogo || null;
  }
  if (safeSettings.currency) {
    companyPatch.currency = safeSettings.currency;
  }

  console.log('[syncSettingsToCloud] Saving to companies/', cId, '| logo size:', safeLogo ? safeLogo.length : 0);
  const res = await syncCompanyDataToCloud(cId, companyPatch);
  console.log('[syncSettingsToCloud] syncCompanyDataToCloud result:', res);


  // 2. تحديث قائمة الشركات المركزية platform_metadata/tenants سحابياً لأي شركة على الإطلاق
  try {
    const tenantsRef = doc(db, 'platform_metadata', 'tenants');
    const snap = await getDoc(tenantsRef);
    if (snap.exists()) {
      const tenantsList = snap.data()?.tenants || [];
      const cleanTarget = cId.replace(/^comp_/, '');
      const sub = settings.subdomain || (typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : null);

      const idx = tenantsList.findIndex(t => {
        if (!t) return false;
        const tId = String(t.id || t.companyId || '').trim();
        const cleanTId = tId.replace(/^comp_/, '');
        const subMatches = sub && sub !== 'tashteebpro' && sub !== 'www' && sub !== 'localhost' && (t.subdomain === sub || t.slug === sub);
        return tId === cId || cleanTId === cleanTarget || subMatches;
      });

      if (idx !== -1) {
        tenantsList[idx] = {
          ...tenantsList[idx],
          name: settings.companyName || tenantsList[idx].name,
          logo: settings.companyLogo !== undefined ? (settings.companyLogo || null) : tenantsList[idx].logo,
          currency: settings.currency || tenantsList[idx].currency,
          phone: settings.phone !== undefined ? settings.phone : tenantsList[idx].phone,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // إذا لم تكن الشركة مسجلة بعد في قائمة المنصة، تُضاف فوراً لكي تظهر للجميع
        tenantsList.unshift({
          id: cId,
          companyId: cId,
          name: settings.companyName || 'شركة جديدة',
          logo: settings.companyLogo || null,
          currency: settings.currency || 'ج.م',
          subdomain: (sub && sub !== 'tashteebpro' && sub !== 'www' && sub !== 'localhost') ? sub : cleanTarget,
          status: 'active',
          updatedAt: new Date().toISOString(),
        });
      }

      await setDoc(tenantsRef, {
        tenants: tenantsList,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // تحديث الكاش المحلي لقائمة الشركات أيضاً
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tenantsList));
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn("[syncSettingsToCloud] Error syncing to platform_metadata/tenants:", e.message);
  }

  // 3. تحديث tenant_directory/{subdomain} سحابياً لدعم النطاقات الفرعية فوراً
  try {
    const sub = settings.subdomain || (typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : null);
    if (sub && sub !== 'tashteebpro' && sub !== 'www' && sub !== 'localhost' && sub !== '127') {
      const dirDocRef = doc(db, 'tenant_directory', sub.toLowerCase().trim());
      await setDoc(dirDocRef, {
        companyId: cId,
        name: settings.companyName || 'شركة المقاولات',
        logo: settings.companyLogo || null,
        subdomain: sub.toLowerCase().trim(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (e) {
    console.warn("[syncSettingsToCloud] Error updating tenant_directory:", e.message);
  }

  return res;
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

  // 1.5. تحديث tenant_directory/{subdomain} في Firestore فورياً للمزامنة عبر المتصفحات (Cross-Browser Discovery)
  try {
    let sub = null;
    try {
      const rawSettings = localStorage.getItem(`tenant_${cId}_settings`);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed?.subdomain) sub = parsed.subdomain;
      }
    } catch (e) {}

    if (!sub) {
      try {
        const rawTenants = localStorage.getItem('platform-tenants-master-v1');
        if (rawTenants) {
          const list = JSON.parse(rawTenants);
          const t = list.find(item => item && (item.id === cId || item.companyId === cId));
          if (t?.subdomain) sub = t.subdomain;
        }
      } catch (e) {}
    }

    if (!sub) {
      try {
        const qSub = query(collection(db, 'tenant_directory'), where('companyId', '==', cId));
        const subSnap = await Promise.race([
          getDocs(qSub),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000))
        ]);
        if (subSnap && !subSnap.empty) {
          sub = subSnap.docs[0].id;
        }
      } catch (e) {}
    }

    if (sub) {
      const cleanSub = sub.toLowerCase().trim();
      const dirDocRef = doc(db, 'tenant_directory', cleanSub);
      await setDoc(dirDocRef, {
        authorizedEmails: authorizedEmails,
        users: cleanUsers,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log('[syncTenantUsersToCloud] ✅ Updated tenant_directory for subdomain:', cleanSub, 'with', authorizedEmails.length, 'authorized emails');
    }
  } catch (dirErr) {
    console.warn("[syncTenantUsersToCloud] tenant_directory update notice:", dirErr?.message);
  }

  // 2. تحديث قائمة الشركات المركزية platform_metadata/tenants عبر Cloud Function الآمنة (مع بديل مباشر للسوبر أدمن)
  try {
    const fn = httpsCallable(functions, 'updateOwnTenantEntry');
    await fn({
      companyId: cId,
      patch: {
        users: cleanUsers,
        authorizedEmails: authorizedEmails,
      }
    });
  } catch (fnErr) {
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
      console.warn("[syncTenantUsersToCloud] tenants list update notice:", e.message);
    }
  }

  // 3. تحديث دليل المستخدمين المركزي السحابي platform_metadata/users_directory عبر Cloud Function الآمنة
  try {
    const fn = httpsCallable(functions, 'syncOwnCompanyUsersDirectory');
    await fn({ companyId: cId, users: cleanUsers });
  } catch (fnErr) {
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
      console.warn("[syncTenantUsersToCloud] users directory update notice:", e.message);
    }
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
        let val = data?.[fieldName];
        if (fieldName === 'settings' && data) {
          const directSettings = (val && typeof val === 'object' && !Array.isArray(val)) ? { ...val } : {};
          if (!directSettings.companyName && data.name) {
            directSettings.companyName = data.name;
          }
          if (!directSettings.companyLogo && data.logo) {
            directSettings.companyLogo = data.logo;
          }
          if (!directSettings.currency && data.currency) {
            directSettings.currency = data.currency;
          }
          val = directSettings;
        }
        if (val !== undefined && val !== null) {
          onUpdate(val);
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
              return;
            }
          }
        } catch (e) {
          console.warn("Legacy projects check error:", e.message);
        }
        // إذا كانت المجموعة الفرعية فارغة ولا توجد مشاريع قديمة، نُرسل مصفوفة فارغة
        onUpdate([]);
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
    const snap = await Promise.race([
      getDoc(docRef),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))
    ]);
    if (snap && snap.exists()) {
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

  // تطهير شامل لحذف أي كلمات مرور أو بيانات حساسة قبل الرفع السحابي
  const sanitizedTenants = tenants.map(t => {
    if (!t) return t;
    const clean = { ...t };
    delete clean.adminPassword;
    delete clean.password;
    if (Array.isArray(clean.users)) {
      clean.users = clean.users.map(u => {
        if (!u) return u;
        const cleanU = { ...u };
        delete cleanU.password;
        delete cleanU.adminPassword;
        return cleanU;
      });
    }
    return clean;
  });

  try {
    // 1. محاولة الكتابة المباشرة (تنجح للسوبر أدمن المعتمد)
    const docRef = doc(db, TENANTS_META_DOC, TENANTS_META_KEY);
    await setDoc(docRef, {
      tenants: sanitizedTenants,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    // 2. إذا رفضت القواعد الكتابة المباشرة (لأنه مستخدم عادي/مالك شركة وليس Super Admin):
    // نستدعي Cloud Function الآمنة لتحديث بيانات شركته فقط دون المساس بباقي المنصة
    try {
      const currentUser = auth.currentUser;
      const callerCompanyId = (typeof localStorage !== 'undefined' && (localStorage.getItem('tashteeb_active_company_id') || localStorage.getItem('platform-active-tenant-id'))) || null;
      const ownTenant = sanitizedTenants.find(t => 
        (callerCompanyId && t.id === callerCompanyId) || 
        (currentUser?.email && t.adminEmail?.toLowerCase() === currentUser.email.toLowerCase())
      );

      if (ownTenant) {
        const fn = httpsCallable(functions, 'updateOwnTenantEntry');
        const res = await fn({
          companyId: ownTenant.id,
          patch: ownTenant,
        });
        return res.data?.success || true;
      }
    } catch (fnErr) {
      console.warn("Cloud sync via Cloud Function notice:", fnErr.message);
    }
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
        return {
          id: found.id,
          companyId: found.id,
          name: found.name || found.id,
          logo: found.logo || null,
          subdomain: found.subdomain || cleanSubdomain,
          slug: found.slug || cleanSubdomain,
          primaryColor: found.primaryColor || null,
        };
      } else {
        console.warn('[fetchTenantBySubdomain] ⚠️ No tenant found for subdomain:', cleanSubdomain);
      }
      return null;
    }
  } catch (error) {
    console.warn("Cloud fetch (tenant by subdomain) error:", error?.message || error);
  }
  return null;
}

/**
 * البحث عن حساب المستخدم في دليل المنصة السحابي المركزي (للتحقق الفوري عند الدخول)
 */
export async function fetchUserFromCloudDirectory(email, preferredSubdomain = null) {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) return null;

  // 1. فحص وثيقة الدليل المركزي السحابي platform_metadata/users_directory
  try {
    const dirRef = doc(db, TENANTS_META_DOC, 'users_directory');
    const snap = await Promise.race([
      getDoc(dirRef),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1000))
    ]);
    if (snap.exists()) {
      const data = snap.data();
      const safeKey = cleanEmail.replace(/\./g, '_dot_');
      if (data && (data[safeKey] || data[cleanEmail])) {
        const u = data[safeKey] || data[cleanEmail];
        // إذا كان هناك تفضيل لنطاق فرعي وكان هذا المستخدم يطابقه، نُرجعه فوراً
        if (preferredSubdomain && u.companyId) {
          return u;
        }
        if (!preferredSubdomain) return u;
      }
    }
  } catch (e) {
    // Non-blocking fallback to tenants list
  }

  // 2. فحص قائمة الشركات المركزية platform_metadata/tenants كمسار بديل مضمون
  try {
    const tenantsList = await fetchTenantsListFromCloud();
    if (Array.isArray(tenantsList)) {
      // إذا كان هناك نطاق فرعي محدد، نفحصه هو أولاً
      if (preferredSubdomain) {
        const cleanSub = preferredSubdomain.toLowerCase().trim();
        const preferredTenant = tenantsList.find(t =>
          (t.subdomain || '').toLowerCase().trim() === cleanSub ||
          (t.slug || '').toLowerCase().trim() === cleanSub ||
          (t.id || '').toLowerCase().trim() === cleanSub ||
          (t.id || '').toLowerCase().trim() === `comp_${cleanSub}`
        );
        if (preferredTenant) {
          if (preferredTenant.adminEmail && preferredTenant.adminEmail.toLowerCase().trim() === cleanEmail) {
            return {
              id: `u_${preferredTenant.id}_admin`,
              email: preferredTenant.adminEmail,
              name: preferredTenant.adminName || 'مدير الشركة',
              role: 'owner',
              companyId: preferredTenant.id,
              companyName: preferredTenant.name,
              currency: preferredTenant.currency || 'ج.م',
            };
          }
          if (Array.isArray(preferredTenant.users)) {
            const m = preferredTenant.users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
            if (m) {
              return {
                ...m,
                companyId: preferredTenant.id,
                companyName: preferredTenant.name,
                currency: preferredTenant.currency || 'ج.م',
              };
            }
          }
        }
      }

      // أولوية عامة: هل المستخدم مالك (Owner / adminEmail) لأي شركة في المنصة؟
      for (const t of tenantsList) {
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
      // إذا لم يكن مالكاً، نبحث كعضو فريق أو موظف
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
      }
    }
  } catch (e) {
    console.warn("[fetchUserFromCloudDirectory] tenants list fallback error:", e.message);
  }

  // 3. فحص tenant_directory بالـ authorizedEmails أو adminEmail
  try {
    const qAuth = query(collection(db, 'tenant_directory'), where('authorizedEmails', 'array-contains', cleanEmail));
    const snapAuth = await Promise.race([
      getDocs(qAuth),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))
    ]);
    if (snapAuth && !snapAuth.empty) {
      const tDoc = snapAuth.docs[0].data();
      const companyId = tDoc.companyId || `comp_${snapAuth.docs[0].id}`;
      const companyName = tDoc.name || snapAuth.docs[0].id;
      const users = Array.isArray(tDoc.users) ? tDoc.users : [];
      const match = users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
      if (match) {
        return {
          ...match,
          companyId,
          companyName,
          subdomain: tDoc.subdomain || snapAuth.docs[0].id,
          logo: tDoc.logo || null,
          adminEmail: tDoc.adminEmail || '',
          adminName: tDoc.adminName || '',
          users: tDoc.users || [],
          authorizedEmails: tDoc.authorizedEmails || [],
          currency: tDoc.currency || 'ج.م',
        };
      }
      return {
        id: `u_${companyId}_auth`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: 'engineer',
        companyId,
        companyName,
        subdomain: tDoc.subdomain || snapAuth.docs[0].id,
        logo: tDoc.logo || null,
        adminEmail: tDoc.adminEmail || '',
        adminName: tDoc.adminName || '',
        users: tDoc.users || [],
        authorizedEmails: tDoc.authorizedEmails || [],
        currency: tDoc.currency || 'ج.م',
      };
    }

    const qAdmin = query(collection(db, 'tenant_directory'), where('adminEmail', '==', cleanEmail));
    const snapAdmin = await Promise.race([
      getDocs(qAdmin),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))
    ]);
    if (snapAdmin && !snapAdmin.empty) {
      const tDoc = snapAdmin.docs[0].data();
      const companyId = tDoc.companyId || `comp_${snapAdmin.docs[0].id}`;
      return {
        id: `u_${companyId}_admin`,
        email: cleanEmail,
        name: tDoc.adminName || cleanEmail.split('@')[0],
        role: 'owner',
        companyId,
        companyName: tDoc.name || snapAdmin.docs[0].id,
        subdomain: tDoc.subdomain || snapAdmin.docs[0].id,
        logo: tDoc.logo || null,
        adminEmail: tDoc.adminEmail || cleanEmail,
        adminName: tDoc.adminName || cleanEmail.split('@')[0],
        users: tDoc.users || [],
        authorizedEmails: tDoc.authorizedEmails || [cleanEmail],
        currency: tDoc.currency || 'ج.م',
      };
    }
  } catch (e) {
    console.warn("[fetchUserFromCloudDirectory] tenant_directory search notice:", e.message);
  }

  // 4. فحص مجموعة companies بالـ authorizedEmails (بدون قيد auth.currentUser لأن المستخدم قد يكون مسجلاً للتو)
  try {
    {
      const qComp = query(collection(db, 'companies'), where('authorizedEmails', 'array-contains', cleanEmail));
      const snapComp = await Promise.race([
        getDocs(qComp),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))
      ]);
      if (snapComp && !snapComp.empty) {
        const cData = snapComp.docs[0].data();
        const companyId = cData.companyId || snapComp.docs[0].id;
        const companyName = cData.name || cData.settings?.companyName || 'الشركة';
        const users = Array.isArray(cData.users) ? cData.users : [];
        const match = users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
        if (match) {
          return {
            ...match,
            companyId,
            companyName,
            subdomain: cData.subdomain || '',
            logo: cData.logo || null,
            adminEmail: cData.adminEmail || '',
            adminName: cData.adminName || '',
            users: cData.users || [],
            authorizedEmails: cData.authorizedEmails || [],
            currency: cData.currency || cData.settings?.currency || 'ج.م',
          };
        }
        return {
          id: `u_${companyId}_auth`,
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          role: 'engineer',
          companyId,
          companyName,
          subdomain: cData.subdomain || '',
          logo: cData.logo || null,
          adminEmail: cData.adminEmail || '',
          adminName: cData.adminName || '',
          users: cData.users || [],
          authorizedEmails: cData.authorizedEmails || [],
          currency: cData.currency || cData.settings?.currency || 'ج.م',
        };
      }
    }
  } catch (e) {}

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
          const match = t.users.find(u => {
            if (!u) return false;
            if (cleanPhoneNumber(u.phone) === cPhone || cleanPhoneNumber(u.cleanPhone) === cPhone) return true;
            if (u.email) {
              const prefix = u.email.split('@')[0].replace('phone_', '');
              if (cleanPhoneNumber(prefix) === cPhone) return true;
            }
            return false;
          });
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
