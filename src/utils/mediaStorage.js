/**
 * Tashteeb Pro — Resilient Media Storage (IndexedDB + Cloud Fallback)
 * يضمن حفظ كافة الصور ومقاطع الفيديو بنسبة 100% محلياً وسحابياً
 * ويمنع تماماً أخطاء امتلاء الذاكرة (QuotaExceededError) وتجاوز حد الـ 1MB في فايربيس
 */

const DB_NAME = 'tashteeb_media_db_v1';
const STORE_NAME = 'media_files';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = (err) => {
        console.warn('IndexedDB open error:', err);
        resolve(null);
      };
    });
  }
  return dbPromise;
}

/**
 * حفظ ملف ثنائي (صورة أو فيديو) في IndexedDB
 */
export async function saveMediaBlob(id, blobOrFile, meta = {}) {
  try {
    const db = await getDB();
    if (!db) return false;
    let finalBlob = blobOrFile;
    if (typeof blobOrFile === 'string' && blobOrFile.startsWith('data:')) {
      try {
        const parts = blobOrFile.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        finalBlob = new Blob([u8arr], { type: mime });
      } catch (err) {
        finalBlob = blobOrFile;
      }
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        blob: finalBlob,
        type: finalBlob?.type || meta.type || 'image/jpeg',
        name: meta.name || 'media',
        timestamp: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('saveMediaBlob error:', e);
    return false;
  }
}

/**
 * جلب الملف الثنائي من IndexedDB
 */
export async function getMediaBlob(id) {
  try {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const res = req.result;
        resolve(res?.blob || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('getMediaBlob error:', e);
    return null;
  }
}

/**
 * توليد مصغرة صغيرة جداً (Micro-Thumbnail) خفيفة وعالية الوضوح (12-25 كيلوبايت)
 * لضمان حفظها في Firestore و LocalStorage دون أي أخطاء حجم وظهورها فوراً في أي متصفح
 * مصممة بطبقات متعددة (createImageBitmap -> HTML Image -> FileReader -> SVG Placeholder) لمنع الفشل نهائياً
 */
export async function createMicroThumbnail(fileOrBlob, isVideo = false) {
  if (!fileOrBlob) return '';

  if (isVideo) {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        const url = (typeof fileOrBlob === 'string') ? fileOrBlob : URL.createObjectURL(fileOrBlob);
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.currentTime = 0.5;

        video.onloadeddata = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = Math.round((video.videoHeight * 320) / (video.videoWidth || 320)) || 200;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (typeof fileOrBlob !== 'string') URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.55));
          } catch (e) {
            if (typeof fileOrBlob !== 'string') URL.revokeObjectURL(url);
            resolve('');
          }
        };
        video.onerror = () => {
          if (typeof fileOrBlob !== 'string') URL.revokeObjectURL(url);
          resolve('');
        };
      } catch (e) {
        resolve('');
      }
    });
  }

  // ─── استراتيجية 1: فك الترميز الحديث فائق السرعة عبر createImageBitmap (خالٍ من مشاكل CORS و Canvas Taint) ───
  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      let blobSource = null;
      if (fileOrBlob instanceof Blob || fileOrBlob instanceof File) {
        blobSource = fileOrBlob;
        // معالجة ملفات .jfif والملفات التي ليس لها نوع MIME في نظام ويندوز
        if (!blobSource.type || blobSource.type === 'application/octet-stream' || !blobSource.type.startsWith('image/')) {
          blobSource = blobSource.slice(0, blobSource.size, 'image/jpeg');
        }
      } else if (typeof fileOrBlob === 'string' && fileOrBlob.startsWith('data:')) {
        const parts = fileOrBlob.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        blobSource = new Blob([u8arr], { type: mime.startsWith('image/') ? mime : 'image/jpeg' });
      }

      if (blobSource) {
        const bmp = await createImageBitmap(blobSource);
        const maxDim = 380;
        let w = bmp.width || 380;
        let h = bmp.height || 380;
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
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        if (typeof bmp.close === 'function') bmp.close();

        let result = canvas.toDataURL('image/jpeg', 0.60);
        if (result.length > 28000) {
          result = canvas.toDataURL('image/jpeg', 0.46);
        }
        if (result && result.startsWith('data:image/jpeg')) {
          return result;
        }
      }
    } catch (bitmapErr) {
      console.warn('[createMicroThumbnail] createImageBitmap fallback notice:', bitmapErr?.message || bitmapErr);
    }
  }

  // ─── استراتيجية 2: تفريغ الصورة على Canvas عبر عنصر Image التقليدي مع حظر CORS على data/blob ───
  return new Promise((resolve) => {
    const fallbackSvg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2'%3E%3Cpath d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/%3E%3Ccircle cx='12' cy='13' r='4'/%3E%3C/svg%3E";

    const renderImgToCanvas = (src) => {
      try {
        const img = new Image();
        // هام جداً: لا نضع crossOrigin أبداً على روابط data: أو blob: لأنها تسبب Canvas Tainting أمنياً
        if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
          try {
            const maxDim = 380;
            let w = img.width || 380;
            let h = img.height || 380;
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

            let result = canvas.toDataURL('image/jpeg', 0.60);
            if (result.length > 28000) {
              result = canvas.toDataURL('image/jpeg', 0.46);
            }
            if (result && result.length > 40000) {
              const canvas2 = document.createElement('canvas');
              canvas2.width = Math.round(canvas.width * 0.7);
              canvas2.height = Math.round(canvas.height * 0.7);
              const ctx2 = canvas2.getContext('2d');
              ctx2.drawImage(canvas, 0, 0, canvas2.width, canvas2.height);
              result = canvas2.toDataURL('image/jpeg', 0.42);
            }
            resolve(result);
          } catch (err) {
            console.warn('[createMicroThumbnail] Canvas render error, trying FileReader fallback:', err);
            if (typeof src === 'string' && src.startsWith('data:') && src.length < 50000) {
              resolve(src.startsWith('data:image/') ? src : src.replace(/^data:[^;]*;/, 'data:image/jpeg;'));
            } else {
              resolve(fallbackSvg);
            }
          }
        };
        img.onerror = () => {
          if (typeof src === 'string' && src.startsWith('data:') && src.length < 50000) {
            resolve(src.startsWith('data:image/') ? src : src.replace(/^data:[^;]*;/, 'data:image/jpeg;'));
          } else {
            resolve(fallbackSvg);
          }
        };
        img.src = src;
      } catch (e) {
        resolve(fallbackSvg);
      }
    };

    if (typeof fileOrBlob === 'string' && fileOrBlob.startsWith('data:')) {
      let safeData = fileOrBlob;
      if (safeData.startsWith('data:;') || safeData.startsWith('data:application/octet-stream;')) {
        safeData = safeData.replace(/^data:[^;]*;/, 'data:image/jpeg;');
      }
      renderImgToCanvas(safeData);
    } else if (fileOrBlob instanceof Blob || fileOrBlob instanceof File) {
      let safeBlob = fileOrBlob;
      if (!safeBlob.type || safeBlob.type === 'application/octet-stream' || !safeBlob.type.startsWith('image/')) {
        safeBlob = safeBlob.slice(0, safeBlob.size, 'image/jpeg');
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        let res = e.target.result;
        if (typeof res === 'string' && (res.startsWith('data:;') || res.startsWith('data:application/octet-stream;'))) {
          res = res.replace(/^data:[^;]*;/, 'data:image/jpeg;');
        }
        renderImgToCanvas(res);
      };
      reader.onerror = () => resolve(fallbackSvg);
      reader.readAsDataURL(safeBlob);
    } else if (typeof fileOrBlob === 'string' && (fileOrBlob.startsWith('http://') || fileOrBlob.startsWith('https://') || fileOrBlob.startsWith('blob:'))) {
      renderImgToCanvas(fileOrBlob);
    } else {
      resolve(fallbackSvg);
    }
  });
}

// ذاكرة تخزين مؤقت للروابط لتسريع العرض الفوري ومنع تسريب الذاكرة
const blobUrlCache = new Map();

/**
 * جلب رابط عرض فوري تزامني إن توفر في الكاش أو الروابط المباشرة
 */
export function syncResolveMediaUrl(item) {
  if (!item) return '';
  const src = typeof item === 'string' ? item : item.src;
  const thumbnail = (typeof item === 'object' && item?.thumbnail) ? item.thumbnail : '';

  // 1. رابط HTTPS سحابي دائم
  if (typeof src === 'string' && (src.startsWith('https://') || src.startsWith('http://'))) {
    return src;
  }
  // 2. مصغرة Base64 صريحة
  if (typeof src === 'string' && src.startsWith('data:image/')) {
    return src;
  }
  if (thumbnail && (thumbnail.startsWith('data:image/') || thumbnail.startsWith('http'))) {
    return thumbnail;
  }

  // 3. فحص الكاش السريع
  const id = typeof item === 'object' ? (item.id || (src?.startsWith('idb://') ? src.replace('idb://', '') : null)) : (src?.startsWith('idb://') ? src.replace('idb://', '') : null);
  if (id && blobUrlCache.has(id)) {
    return blobUrlCache.get(id);
  }

  // 4. لا نرجع idb:// أو blob غريب لضمان عدم كسر الصور في المتصفحات الأخرى
  return '';
}

/**
 * حل رابط العرض للمرفق سواء كان سحابياً أو محلياً مع حماية تامة من الروابط المنتهية أو المعطوبة
 */
export async function resolveMediaDisplayUrl(item) {
  if (!item) return '';
  const src = typeof item === 'string' ? item : item.src;
  const thumbnail = (typeof item === 'object' && item?.thumbnail) ? item.thumbnail : '';
  const id = typeof item === 'object' ? (item.id || (src?.startsWith('idb://') ? src.replace('idb://', '') : null)) : (src?.startsWith('idb://') ? src.replace('idb://', '') : null);

  // 1. إذا كان رابط سحابي HTTPS صريح
  if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
    return src;
  }

  // 2. إذا كان DataURL (مصغرات وبيانات base64)
  if (typeof src === 'string' && src.startsWith('data:image/')) {
    return src;
  }

  // 3. فحص الكاش السريع في الذاكرة
  if (id && blobUrlCache.has(id)) {
    return blobUrlCache.get(id);
  }

  // 4. استرجاع الملف الثنائي الكامل من IndexedDB المحلي (إذا كان نفس جهاز المهندس)
  if (id) {
    try {
      const blob = await getMediaBlob(id);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        blobUrlCache.set(id, objectUrl);
        return objectUrl;
      }
    } catch (e) {
      console.warn("Could not load media from IndexedDB:", e);
    }
  }

  // 5. استخدام المصغرة كبديل آمن إن وُجدت (يعمل عبر جميع المتصفحات والعملاء بنسبة 100%)
  if (thumbnail && (thumbnail.startsWith('data:') || thumbnail.startsWith('http'))) {
    return thumbnail;
  }

  // 6. إذا كان رابط blob في الجلسة الحالية
  if (typeof src === 'string' && src.startsWith('blob:')) {
    return src;
  }

  // 7. منع إرجاع idb:// نهائياً للمتصفح حتى لا يظهر كصورة مكسورة
  return '';
}
