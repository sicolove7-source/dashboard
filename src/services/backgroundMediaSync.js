/**
 * ===================================================================
 * خدمة المزامنة الخلفية التلقائية للوسائط — Background Media Sync
 * ===================================================================
 * تقوم بفحص كافة المشاريع تلقائياً في الخلفية عند استعادة الاتصال بالإنترنت
 * ورفع أي صور/وسائط معلقة محلياً (idb://) إلى السحابة فوراً وحفظها في Firestore.
 */

import { getMediaBlob, createMicroThumbnail } from '../utils/mediaStorage';
import { uploadMediaToFirebaseStorage, syncSingleProjectToCloud, cleanCompanyId } from './cloudSync';

// قفل التزامن لمنع تشغيل أكثر من عملية مزامنة في نفس اللحظة
let isSyncRunning = false;

// خريطة تتبع المحاولات الفاشلة لكل عنصر (بحد أقصى 5 محاولات لكل صورة)
const failedAttemptsMap = new Map();
const MAX_RETRIES = 5;

// قائمة المستمعين لتحديثات حالة المزامنة لعرض شارة الـ UX
const syncListeners = new Set();

export function onSyncStatusChange(callback) {
  if (typeof callback === 'function') {
    syncListeners.add(callback);
    return () => syncListeners.delete(callback);
  }
  return () => {};
}

function notifySyncStatus(status) {
  syncListeners.forEach(listener => {
    try {
      listener(status);
    } catch (e) {
      console.warn('[backgroundMediaSync] Listener error:', e);
    }
  });
}

/**
 * فحص ورفع كافة الوسائط المعلقة في جميع المشاريع
 * @param {string} companyId - معرف الشركة الحالية
 * @param {Array} projects - مصفوفة المشاريع
 * @param {Object} options - خيارات إضافية (مثل onProjectUpdated للتحديث الفوري للواجهة)
 * @returns {Promise<number>} - عدد الصور التي تم رفعها بنجاح
 */
export async function syncAllPendingMedia(companyId, projects, options = {}) {
  const cId = cleanCompanyId(companyId);
  if (!cId || !Array.isArray(projects) || projects.length === 0) {
    return 0;
  }

  // فحص قفل التزامن
  if (isSyncRunning) {
    console.log('[backgroundMediaSync] ⏳ Sync already running, skipping concurrent trigger.');
    return 0;
  }

  // 1. تجميع كافة العناصر المعلقة (idb://) عبر كل المشاريع
  const pendingItems = [];

  for (const project of projects) {
    if (!project || !project.id) continue;

    // أ) فحص اليوميات (Daily Logs)
    const logs = Array.isArray(project.dailyLogs) ? project.dailyLogs : [];
    logs.forEach(log => {
      if (!log) return;

      // فحص log.photos
      if (Array.isArray(log.photos)) {
        log.photos.forEach((ph, pIdx) => {
          const src = typeof ph === 'string' ? ph : ph?.src;
          const rawSrc = typeof ph === 'object' ? ph?.rawSrc : null;
          const isIdb = (typeof src === 'string' && src.startsWith('idb://')) || (typeof rawSrc === 'string' && rawSrc.startsWith('idb://'));
          const id = typeof ph === 'object'
            ? (ph.id || (src?.startsWith('idb://') ? src.replace('idb://', '') : null))
            : (src?.startsWith('idb://') ? src.replace('idb://', '') : null);

          if (isIdb && id) {
            const retries = failedAttemptsMap.get(id) || 0;
            if (retries < MAX_RETRIES) {
              pendingItems.push({
                type: 'dailyLog_photo',
                projectId: project.id,
                logId: log.id,
                photoIndex: pIdx,
                mediaId: id,
                rawItem: ph,
                fileName: `log_${id}.jpg`
              });
            }
          }
        });
      }

      // فحص log.media
      if (Array.isArray(log.media)) {
        log.media.forEach((m, mIdx) => {
          const src = m?.src;
          const rawSrc = m?.rawSrc;
          const isIdb = (typeof src === 'string' && src.startsWith('idb://')) || (typeof rawSrc === 'string' && rawSrc.startsWith('idb://'));
          const id = m?.id || (src?.startsWith('idb://') ? src.replace('idb://', '') : (rawSrc?.startsWith('idb://') ? rawSrc.replace('idb://', '') : null));

          if (isIdb && id) {
            const retries = failedAttemptsMap.get(id) || 0;
            if (retries < MAX_RETRIES) {
              pendingItems.push({
                type: 'dailyLog_media',
                projectId: project.id,
                logId: log.id,
                mediaIndex: mIdx,
                mediaId: id,
                rawItem: m,
                fileName: `log_media_${id}.jpg`
              });
            }
          }
        });
      }
    });

    // ب) فحص الملاحظات والاستلامات (Snags)
    const snags = Array.isArray(project.snags) ? project.snags : [];
    snags.forEach((snag, sIdx) => {
      if (!snag) return;
      // صورة الملاحظة قبل المعالجة
      const photoSrc = snag.photo;
      const photoId = snag.mediaId || (typeof photoSrc === 'string' && photoSrc.startsWith('idb://') ? photoSrc.replace('idb://', '') : null);
      if (photoId && (typeof photoSrc === 'string' && photoSrc.startsWith('idb://'))) {
        const retries = failedAttemptsMap.get(photoId) || 0;
        if (retries < MAX_RETRIES) {
          pendingItems.push({
            type: 'snag_photo',
            projectId: project.id,
            snagId: snag.id,
            snagIndex: sIdx,
            mediaId: photoId,
            fileName: `snag_${photoId}.jpg`
          });
        }
      }

      // صورة الملاحظة بعد المعالجة (afterPhoto)
      const afterSrc = snag.afterPhoto;
      const afterId = snag.afterMediaId || (typeof afterSrc === 'string' && afterSrc.startsWith('idb://') ? afterSrc.replace('idb://', '') : null);
      if (afterId && (typeof afterSrc === 'string' && afterSrc.startsWith('idb://'))) {
        const retries = failedAttemptsMap.get(afterId) || 0;
        if (retries < MAX_RETRIES) {
          pendingItems.push({
            type: 'snag_afterPhoto',
            projectId: project.id,
            snagId: snag.id,
            snagIndex: sIdx,
            mediaId: afterId,
            fileName: `snag_after_${afterId}.jpg`
          });
        }
      }
    });

    // ج) فحص ملفات المشروع (Files)
    const files = Array.isArray(project.files) ? project.files : [];
    files.forEach((file, fIdx) => {
      if (!file) return;
      const src = file.src;
      const rawSrc = file.rawSrc;
      const isIdb = (typeof src === 'string' && src.startsWith('idb://')) || (typeof rawSrc === 'string' && rawSrc.startsWith('idb://'));
      const id = file.id || (src?.startsWith('idb://') ? src.replace('idb://', '') : null);
      if (isIdb && id) {
        const retries = failedAttemptsMap.get(id) || 0;
        if (retries < MAX_RETRIES) {
          pendingItems.push({
            type: 'project_file',
            projectId: project.id,
            fileIndex: fIdx,
            mediaId: id,
            rawItem: file,
            fileName: `file_${id}.jpg`
          });
        }
      }
    });

    // د) فحص صور الموقع (Site Photos)
    const sitePhotos = Array.isArray(project.sitePhotos) ? project.sitePhotos : [];
    sitePhotos.forEach((sp, spIdx) => {
      if (!sp) return;
      const src = sp.src;
      const rawSrc = sp.rawSrc;
      const isIdb = (typeof src === 'string' && src.startsWith('idb://')) || (typeof rawSrc === 'string' && rawSrc.startsWith('idb://'));
      const id = sp.id || (src?.startsWith('idb://') ? src.replace('idb://', '') : null);
      if (isIdb && id) {
        const retries = failedAttemptsMap.get(id) || 0;
        if (retries < MAX_RETRIES) {
          pendingItems.push({
            type: 'site_photo',
            projectId: project.id,
            sitePhotoIndex: spIdx,
            mediaId: id,
            rawItem: sp,
            fileName: `site_${id}.jpg`
          });
        }
      }
    });

    // هـ) فحص مخطط المشروع (Floor Plan)
    if (typeof project.floorPlan === 'string' && project.floorPlan.startsWith('idb://')) {
      const fpId = project.floorPlan.replace('idb://', '');
      const retries = failedAttemptsMap.get(fpId) || 0;
      if (retries < MAX_RETRIES) {
        pendingItems.push({
          type: 'floor_plan',
          projectId: project.id,
          mediaId: fpId,
          fileName: `floorplan_${fpId}.jpg`
        });
      }
    }
  }

  if (pendingItems.length === 0) {
    return 0;
  }

  // تفعيل القفل وإشعار الواجهة ببدء الرفع
  isSyncRunning = true;
  notifySyncStatus({ isSyncing: true, pendingCount: pendingItems.length });
  console.log(`[backgroundMediaSync] 🚀 Found ${pendingItems.length} pending local media items to sync across projects.`);

  let totalUploaded = 0;
  const projectUpdatesMap = new Map(); // projectId -> patch object

  try {
    for (const item of pendingItems) {
      try {
        // 1. جلب الـ Blob من IndexedDB المحلي
        const blob = await getMediaBlob(item.mediaId);
        if (!blob) {
          console.warn(`[backgroundMediaSync] ⚠️ Blob not found in IndexedDB for mediaId: ${item.mediaId}`);
          failedAttemptsMap.set(item.mediaId, (failedAttemptsMap.get(item.mediaId) || 0) + 1);
          continue;
        }

        // 2. رفع الوسائط سحابياً
        const folder = `companies/${cId}/projects/${item.projectId}`;
        const cloudUrl = await uploadMediaToFirebaseStorage(blob, folder, item.fileName, '', item.mediaId, cId);

        if (!cloudUrl) {
          failedAttemptsMap.set(item.mediaId, (failedAttemptsMap.get(item.mediaId) || 0) + 1);
          continue;
        }

        // نجح الرفع: تصفير عداد المحاولات الفاشلة
        failedAttemptsMap.delete(item.mediaId);
        totalUploaded++;

        // 3. توليد مصغرة خفيفة
        const thumb = await createMicroThumbnail(blob, false);

        // 4. تطبيق التحديث على كائن المشروع في الذاكرة
        if (!projectUpdatesMap.has(item.projectId)) {
          const currentProj = projects.find(p => p.id === item.projectId);
          projectUpdatesMap.set(item.projectId, {
            dailyLogs: currentProj?.dailyLogs ? JSON.parse(JSON.stringify(currentProj.dailyLogs)) : [],
            snags: currentProj?.snags ? JSON.parse(JSON.stringify(currentProj.snags)) : [],
            files: currentProj?.files ? JSON.parse(JSON.stringify(currentProj.files)) : [],
            sitePhotos: currentProj?.sitePhotos ? JSON.parse(JSON.stringify(currentProj.sitePhotos)) : [],
            floorPlan: currentProj?.floorPlan,
            isModified: false
          });
        }

        const projDraft = projectUpdatesMap.get(item.projectId);

        if (item.type === 'dailyLog_photo') {
          const log = projDraft.dailyLogs.find(l => l.id === item.logId);
          if (log && Array.isArray(log.photos)) {
            const p = log.photos[item.photoIndex];
            log.photos[item.photoIndex] = typeof p === 'object'
              ? { ...p, src: cloudUrl, rawSrc: cloudUrl, thumbnail: thumb || p.thumbnail || cloudUrl }
              : { id: item.mediaId, src: cloudUrl, rawSrc: cloudUrl, thumbnail: thumb || cloudUrl, type: 'image' };
            projDraft.isModified = true;
          }
        } else if (item.type === 'dailyLog_media') {
          const log = projDraft.dailyLogs.find(l => l.id === item.logId);
          if (log && Array.isArray(log.media) && log.media[item.mediaIndex]) {
            const m = log.media[item.mediaIndex];
            log.media[item.mediaIndex] = { ...m, src: cloudUrl, rawSrc: cloudUrl, thumbnail: thumb || m.thumbnail || cloudUrl };
            projDraft.isModified = true;
          }
        } else if (item.type === 'snag_photo') {
          const snag = projDraft.snags.find(s => s.id === item.snagId);
          if (snag) {
            snag.photo = cloudUrl;
            snag.thumbnail = thumb || cloudUrl;
            projDraft.isModified = true;
          }
        } else if (item.type === 'snag_afterPhoto') {
          const snag = projDraft.snags.find(s => s.id === item.snagId);
          if (snag) {
            snag.afterPhoto = cloudUrl;
            snag.afterThumbnail = thumb || cloudUrl;
            projDraft.isModified = true;
          }
        } else if (item.type === 'project_file') {
          if (Array.isArray(projDraft.files) && projDraft.files[item.fileIndex]) {
            const f = projDraft.files[item.fileIndex];
            projDraft.files[item.fileIndex] = { ...f, src: cloudUrl, rawSrc: cloudUrl, thumbnail: thumb || f.thumbnail || cloudUrl };
            projDraft.isModified = true;
          }
        } else if (item.type === 'site_photo') {
          if (Array.isArray(projDraft.sitePhotos) && projDraft.sitePhotos[item.sitePhotoIndex]) {
            const sp = projDraft.sitePhotos[item.sitePhotoIndex];
            projDraft.sitePhotos[item.sitePhotoIndex] = { ...sp, src: cloudUrl, rawSrc: cloudUrl, thumbnail: thumb || sp.thumbnail || cloudUrl };
            projDraft.isModified = true;
          }
        } else if (item.type === 'floor_plan') {
          projDraft.floorPlan = cloudUrl;
          projDraft.floorPlanThumbnail = thumb || cloudUrl;
          projDraft.isModified = true;
        }
      } catch (err) {
        console.error(`[backgroundMediaSync] Error uploading media ${item.mediaId}:`, err);
        failedAttemptsMap.set(item.mediaId, (failedAttemptsMap.get(item.mediaId) || 0) + 1);
      }
    }

    // 5. حفظ كافة التعديلات دفعة واحدة لكل مشروع (Batch Save to Firestore)
    for (const [projId, draft] of projectUpdatesMap.entries()) {
      if (!draft.isModified) continue;
      const patch = {
        dailyLogs: draft.dailyLogs,
        snags: draft.snags,
        files: draft.files,
        sitePhotos: draft.sitePhotos,
        updatedAt: new Date().toISOString()
      };
      if (draft.floorPlan) {
        patch.floorPlan = draft.floorPlan;
        if (draft.floorPlanThumbnail) patch.floorPlanThumbnail = draft.floorPlanThumbnail;
      }

      await syncSingleProjectToCloud(cId, projId, patch);

      // استدعاء كولباك تحديث الـ state في App.jsx
      if (typeof options.onProjectUpdated === 'function') {
        try {
          options.onProjectUpdated(projId, patch);
        } catch (e) {}
      }

      console.log(`[backgroundMediaSync] ✅ Successfully synced all pending media for project ${projId} to cloud!`);
    }
  } finally {
    isSyncRunning = false;
    notifySyncStatus({ isSyncing: false, uploadedCount: totalUploaded });
  }

  return totalUploaded;
}
