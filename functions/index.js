const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");

initializeApp();
const db = getFirestore();

/**
 * دالة مساعدة لتوليد توكن عشوائي قوي وآمن مشفر
 */
function generateSecureToken() {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * 1. تريجر مزامنة بوابة العميل (syncPortalShare):
 * يستمع لكافة عمليات الإنشاء والتحديث والحذف على مشاريع كافة الشركات.
 * - يضمن وجود توكن عشوائي قوي مشفر.
 * - ينشئ نسخة مسقطة ومنقاة (Projection) خالية تماماً من البيانات المالية الداخلية
 *   (مثل expenses, subcontractors, resources) في مجموعة portal_shares/{token}.
 * - يحذف النسخة المشتركة فوراً عند إيقاف البوابة أو حذف المشروع الأصلي.
 */
exports.syncPortalShare = onDocumentWritten("companies/{companyId}/projects/{projectId}", async (event) => {
  const companyId = event.params.companyId;
  const projectId = event.params.projectId;

  const beforeData = event.data?.before?.data() || null;
  const afterData = event.data?.after?.data() || null;

  // حالة 1: تم حذف المشروع، أو تم تعطيل البوابة (clientPortalEnabled !== true)
  if (!afterData || afterData.clientPortalEnabled !== true) {
    const tokensToDelete = new Set();
    if (beforeData?.clientPortalToken) tokensToDelete.add(beforeData.clientPortalToken);
    if (afterData?.clientPortalToken) tokensToDelete.add(afterData.clientPortalToken);

    for (const tok of tokensToDelete) {
      if (tok && typeof tok === "string") {
        try {
          await db.doc(`portal_shares/${tok}`).delete();
          console.log(`[syncPortalShare] Removed portal share for token: ${tok}`);
        } catch (err) {
          console.warn(`[syncPortalShare] Error removing portal share ${tok}:`, err);
        }
      }
    }
    return;
  }

  // حالة 2: المشروع نشط والبوابة مفعلة صراحة
  let token = afterData.clientPortalToken;

  // فحص قوة التوكن؛ إذا كان مفقوداً أو ضعيفاً (أقل من 24 بايت / حرف)، يتم توليد توكن قوي جديد
  const isWeakToken = !token || typeof token !== "string" || token.length < 24 || token.startsWith("demo-");
  if (isWeakToken) {
    token = generateSecureToken();
    try {
      await event.data.after.ref.update({
        clientPortalToken: token,
        updatedAt: new Date().toISOString()
      });
      console.log(`[syncPortalShare] Generated new strong token for project ${projectId}: ${token}`);
    } catch (err) {
      console.error(`[syncPortalShare] Failed to update project with new token:`, err);
    }
  }

  // إذا تغير التوكن عن النسخة السابقة، احذف الوثيقة القديمة
  if (beforeData?.clientPortalToken && beforeData.clientPortalToken !== token) {
    try {
      await db.doc(`portal_shares/${beforeData.clientPortalToken}`).delete();
      console.log(`[syncPortalShare] Removed stale portal share: ${beforeData.clientPortalToken}`);
    } catch (e) {}
  }

  // جلب إعدادات وهوية الشركة لدعم التخصيص والألوان في البوابة
  let companySettings = null;
  try {
    const compDoc = await db.doc(`companies/${companyId}`).get();
    if (compDoc.exists) {
      companySettings = compDoc.data()?.settings || null;
    }
  } catch (e) {
    console.warn(`[syncPortalShare] Could not read company settings:`, e);
  }

  // بناء نسخة الإسقاط المنقاة (Projection) - استبعاد المصروفات والمقاولين والعمالة الداخلية
  const sharePayload = {
    id: projectId,
    projectId: projectId,
    companyId: companyId,
    name: afterData.name || "مشروع بدون اسم",
    client: afterData.client || "عميلنا العزيز",
    clientPhone: afterData.clientPhone || "",
    location: afterData.location || "",
    type: afterData.type || "",
    floors: afterData.floors || "",
    area: Number(afterData.area || 0),
    budget: Number(afterData.budget || afterData.contractValue || 0),
    contractValue: Number(afterData.contractValue || afterData.budget || 0),
    progress: Number(afterData.progress || 0),
    status: afterData.status || "active",
    startDate: afterData.startDate || "",
    endDate: afterData.endDate || "",
    dueDate: afterData.dueDate || "",
    workItems: Array.isArray(afterData.workItems) ? afterData.workItems : [],
    dailyLogs: Array.isArray(afterData.dailyLogs) ? afterData.dailyLogs : [],
    photos: Array.isArray(afterData.photos) ? afterData.photos : [],
    sitePhotos: Array.isArray(afterData.sitePhotos) ? afterData.sitePhotos : [],
    payments: Array.isArray(afterData.payments) ? afterData.payments : (afterData.clientPayments || []),
    clientPayments: Array.isArray(afterData.clientPayments) ? afterData.clientPayments : (afterData.payments || []),
    clientSignature: afterData.clientSignature || null,
    clientApprovalDate: afterData.clientApprovalDate || null,
    clientApprovalNotes: afterData.clientApprovalNotes || null,
    clientContract: afterData.clientContract || null,
    clientPortalEnabled: true,
    clientPortalToken: token,
    token: token,
    companySettings: companySettings,
    updatedAt: new Date().toISOString()
  };

  try {
    await db.doc(`portal_shares/${token}`).set(sharePayload);
    console.log(`[syncPortalShare] Successfully published projection to portal_shares/${token}`);
  } catch (err) {
    console.error(`[syncPortalShare] Failed to write portal share:`, err);
  }
});

/**
 * 2. دالة اعتماد وتوقيع العميل السحابية (submitPortalApproval):
 * دالة OnCall آمنة تتلقى التوكن السري والتوقيع فقط.
 * تبحث عن المشروع المرتبط بالتوكن وتكتب الاعتماد بصلاحيات Admin SDK.
 */
exports.submitPortalApproval = onCall(async (request) => {
  const { token, clientSignature, clientApprovalDate, clientApprovalNotes } = request.data || {};

  // 1. التحقق من صحة المدخلات
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    throw new HttpsError("invalid-argument", "رمز البوابة (Token) مطلوب وغير صالح.");
  }

  if (!clientSignature || typeof clientSignature !== "string") {
    throw new HttpsError("invalid-argument", "التوقيع الإلكتروني للعميل مطلوب.");
  }

  const cleanToken = token.trim();

  // 2. البحث عن وثيقة المشاركة بالتوكن للوصول للمشروع والشركة المرتبطين به
  const shareDocRef = db.doc(`portal_shares/${cleanToken}`);
  const shareSnap = await shareDocRef.get();

  if (!shareSnap.exists) {
    throw new HttpsError("not-found", "رابط البوابة غير صالح أو انتهت صلاحيته.");
  }

  const shareData = shareSnap.data();
  const companyId = shareData.companyId;
  const projectId = shareData.projectId || shareData.id;

  if (!companyId || !projectId) {
    throw new HttpsError("failed-precondition", "بيانات المشروع المرتبطة بهذا الرابط غير مكتملة.");
  }

  // 3. تجهيز بيانات الاعتماد والتوقيع المنقاة والمقيدة
  const approvalPatch = {
    clientSignature: String(clientSignature),
    clientApprovalDate: clientApprovalDate ? String(clientApprovalDate) : new Date().toISOString(),
    clientApprovalNotes: clientApprovalNotes ? String(clientApprovalNotes).slice(0, 1000) : "",
    updatedAt: new Date().toISOString()
  };

  try {
    // تحديث مستند المشروع الحقيقي بصلاحيات Admin SDK
    const projectDocRef = db.doc(`companies/${companyId}/projects/${projectId}`);
    await projectDocRef.update(approvalPatch);

    // تحديث وثيقة المشاركة portal_shares فوراً لعكس التوقيع لحظياً
    await shareDocRef.update(approvalPatch);

    console.log(`[submitPortalApproval] Successfully saved approval for project ${projectId} via token ${cleanToken}`);
    return { success: true, data: approvalPatch };
  } catch (err) {
    console.error(`[submitPortalApproval] Error updating project:`, err);
    throw new HttpsError("internal", "حدث خطأ أثناء حفظ الاعتماد والتوقيع سحابياً.");
  }
});
