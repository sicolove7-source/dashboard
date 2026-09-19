const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
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
 * 0. دالة تعيين Custom Claims للمستخدم (assignUserClaims)
 * تستدعيها خدمة registerNewTenant بعد نجاح التسجيل لربط المستخدم بشركته في Firebase Auth
 * مُقيدة بالتحقق: المستخدم المطلوب تعيين Claims له يجب أن يكون نفسه أو Super Admin
 */
exports.assignUserClaims = onCall(async (request) => {
  const { targetUid, companyId, role, companyName, currency } = request.data || {};

  // التحقق من صحة المدخلات
  if (!targetUid || !companyId) {
    throw new HttpsError("invalid-argument", "targetUid و companyId مطلوبان.");
  }

  // 1. الأمان والتحقق من الهوية
  const callerUid = request.auth?.uid;
  const callerClaims = request.auth?.token || {};

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً لتنفيذ هذه العملية.");
  }

  const isCallerSuperAdmin = callerClaims.role === 'super_admin' || callerClaims.isSuperAdmin === true;
  const targetRole = role || 'owner';

  // 2. التحقق من صلاحيات منح دور super_admin
  if (targetRole === 'super_admin') {
    if (isCallerSuperAdmin) {
      // الحالة (أ): سوبر أدمن موجود وموثق في الـ claims يمنح الصلاحية لمستخدم آخر عن قصد
      console.log(`[assignUserClaims] Super Admin granted by existing Super Admin: ${callerUid}`);
    } else {
      // الحالة (ب): التحقق الفعلي من عدم وجود أي سوبر أدمن في النظام كله حتى الآن (حالة الإقلاع الأول)
      let hasExistingSuperAdmin = false;
      try {
        const saDoc = await db.doc('platform_metadata/superadmin').get();
        if (saDoc.exists) {
          const saData = saDoc.data() || {};
          if (saData.uid || saData.isInitialized === true || saData.superAdminUid) {
            hasExistingSuperAdmin = true;
          }
        }
      } catch (e) {
        console.error('[assignUserClaims] Error checking superadmin initialization:', e);
        throw new HttpsError("internal", "فشل التحقق من سجلات المشرف العام المركزية.");
      }

      if (!hasExistingSuperAdmin) {
        // الإقلاع الأول: السماح وتوثيق أول سوبر أدمن فورياً في Firestore
        try {
          await db.doc('platform_metadata/superadmin').set({
            uid: targetUid,
            email: request.auth?.token?.email || '',
            isInitialized: true,
            createdAt: new Date().toISOString(),
          }, { merge: true });
          console.log(`[assignUserClaims] First Super Admin bootstrapped for UID: ${targetUid}`);
        } catch (e) {
          console.warn('[assignUserClaims] Could not write bootstrap superadmin record:', e.message);
        }
      } else {
        // رفض حاسم لأي حساب آخر يحاول منح نفسه أو غيره super_admin
        throw new HttpsError(
          "permission-denied",
          "مرفوض: لا يمكنك منح دور super_admin. يوجد مشرف عام مسجل بالفعل في المنصة، ويجب أن يتم المنح بواسطة حسابه فقط."
        );
      }
    }
  } else {
    // 3. التحقق من صلاحيات منح الأدوار الأخرى (owner, engineer, accountant, إلخ)
    // يُسمح فقط إذا كان المستدعي super_admin أو owner لنفس الشركة
    const isOwnerOfCompany = callerClaims.role === 'owner' && callerClaims.companyId === companyId;

    // استثناء التسجيل الذاتي لمالك الشركة الجديد وقت التسجيل الأولي:
    let isSelfRegisteringOwner = false;
    if (!isCallerSuperAdmin && !isOwnerOfCompany && targetRole === 'owner' && callerUid === targetUid) {
      try {
        const compDoc = await db.doc(`companies/${companyId}`).get();
        if (compDoc.exists) {
          const compData = compDoc.data() || {};
          if (compData.adminUid === callerUid || compData.adminEmail === request.auth?.token?.email) {
            isSelfRegisteringOwner = true;
          }
        }
      } catch (e) {
        console.warn('[assignUserClaims] Error checking company doc for new owner self-registration:', e.message);
      }
    }

    if (!isCallerSuperAdmin && !isOwnerOfCompany && !isSelfRegisteringOwner) {
      throw new HttpsError(
        "permission-denied",
        "مرفوض: لا تملك الصلاحية لتعيين مستخدمين لهذه الشركة. يجب أن تكون سوبر أدمن أو مالكاً للشركة المعنية."
      );
    }
  }

  const safeRole = targetRole;

  try {
    const claimsPayload = {
      companyId: companyId,
      role: safeRole,
      companyName: companyName || companyId,
      currency: currency || 'ج.م',
    };
    if (safeRole === 'super_admin') {
      claimsPayload.isSuperAdmin = true;
    }

    await getAuth().setCustomUserClaims(targetUid, claimsPayload);

    // تحديث وثيقة الشركة في Firestore بمعرف المستخدم Firebase (UID) والبريد الإلكتروني
    try {
      await db.doc(`companies/${companyId}`).set({
        adminUid: targetUid,
        adminEmail: request.auth?.token?.email || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('[assignUserClaims] Could not update adminUid in company doc:', e.message);
    }

    // تسجيل الشركة في قائمة المنصة السحابية المركزية لضمان ظهورها للسوبر أدمن وكافة الأجهزة
    try {
      const tenantsRef = db.doc('platform_metadata/tenants');
      const snap = await tenantsRef.get();
      if (snap.exists) {
        const list = snap.data()?.tenants || [];
        if (!list.some(t => t.id === companyId)) {
          list.unshift({
            id: companyId,
            name: companyName || companyId,
            adminEmail: request.auth?.token?.email || '',
            currency: currency || 'ج.م',
            status: 'trial',
            plan: 'trial',
            createdAt: new Date().toISOString().slice(0, 10),
          });
          await tenantsRef.set({ tenants: list, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    } catch (e) {
      console.warn('[assignUserClaims] Could not append to platform_metadata/tenants:', e.message);
    }

    console.log(`[assignUserClaims] Claims set for UID ${targetUid}: companyId=${companyId}, role=${safeRole}`);
    return { success: true };
  } catch (err) {
    console.error('[assignUserClaims] Error setting claims:', err);
    throw new HttpsError("internal", "تعذر تعيين صلاحيات المستخدم. يرجى المحاولة لاحقاً.");
  }
});

/**
 * 0c. دالة إنشاء حساب موظف جديد في الشركة (createCompanyUser)
 * يستدعيها مدير الشركة لإنشاء حساب Firebase Auth لموظف جديد وإرسال رابط تعيين كلمة المرور
 * آمنة: مقيدة بأن المتصل يكون owner أو super_admin لنفس الشركة
 */
exports.createCompanyUser = onCall(async (request) => {
  const { email, name, role, companyId } = request.data || {};

  if (!email || !companyId) {
    throw new HttpsError("invalid-argument", "البريد الإلكتروني ومعرف الشركة مطلوبان.");
  }

  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");
  }

  const callerClaims = request.auth?.token || {};
  let isSuperAdmin = callerClaims.role === 'super_admin' || callerClaims.isSuperAdmin === true;
  if (!isSuperAdmin) {
    try {
      const saDoc = await db.doc('platform_metadata/superadmin').get();
      if (saDoc.exists && saDoc.data()?.uid === callerUid) {
        isSuperAdmin = true;
      }
    } catch (e) {}
  }
  const isCompanyOwner = callerClaims.role === 'owner' && callerClaims.companyId === companyId;

  if (!isSuperAdmin && !isCompanyOwner) {
    throw new HttpsError("permission-denied", "لا تملك صلاحية إنشاء مستخدمين لهذه الشركة.");
  }

  const auth = getAuth();
  const cleanEmail = email.trim().toLowerCase();
  let userRecord;
  let isNew = false;

  try {
    // محاولة جلب المستخدم إن كان موجوداً بالفعل
    userRecord = await auth.getUserByEmail(cleanEmail);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      // إنشاء حساب جديد بكلمة مرور مؤقتة عشوائية (لن يحتاجها لأننا سنرسل Reset Link)
      const tempPassword = crypto.randomBytes(16).toString('hex');
      userRecord = await auth.createUser({
        email: cleanEmail,
        password: tempPassword,
        displayName: name || cleanEmail,
        emailVerified: false,
      });
      isNew = true;
    } else {
      throw err;
    }
  }

  // تعيين Custom Claims لربط المستخدم بالشركة
  const safeRole = role && role !== 'super_admin' ? role : 'engineer';
  await auth.setCustomUserClaims(userRecord.uid, {
    companyId: companyId,
    role: safeRole,
  });

  // إنشاء رابط تعيين كلمة المرور (Action Link)
  let resetLink = null;
  try {
    resetLink = await auth.generatePasswordResetLink(cleanEmail);
  } catch (e) {
    console.warn('[createCompanyUser] Could not generate reset link:', e.message);
  }

  // حفظ بيانات المستخدم في Firestore
  try {
    await db.doc(`companies/${companyId}/users/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email: cleanEmail,
      name: name || cleanEmail,
      role: safeRole,
      companyId: companyId,
      createdAt: new Date().toISOString(),
      invitedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn('[createCompanyUser] Could not save user to Firestore:', e.message);
  }

  console.log(`[createCompanyUser] User ${cleanEmail} (uid: ${userRecord.uid}) ${isNew ? 'created' : 'updated'} for company ${companyId}`);

  return {
    success: true,
    uid: userRecord.uid,
    isNew,
    resetLink,
    message: isNew
      ? `تم إنشاء حساب ${cleanEmail} بنجاح. أرسل له رابط تعيين كلمة المرور.`
      : `الحساب موجود مسبقاً. تم تحديث صلاحياته وإنشاء رابط تعيين كلمة المرور.`,
  };
});

/**
 * 0b. دالة تعيين Claims للسوبر أدمن (setSuperAdminClaims)
 * تُستخدم من Firebase Console أو من سكريبت إداري مرة واحدة فقط
 * مُقيدة للغاية: يجب أن يكون المتصل سوبر أدمن بالفعل أو المستخدم المُحدد هو المتصل نفسه
 * وكلمة مرور الإدارة يجب التحقق منها بشكل منفصل
 */
exports.setSuperAdminClaims = onCall(async (request) => {
  const { targetUid, adminSecret } = request.data || {};
  const callerUid = request.auth?.uid;
  const callerClaims = request.auth?.token || {};

  // فحص صلاحية المتصل
  const isAlreadySuperAdmin = callerClaims.role === 'super_admin' || callerClaims.isSuperAdmin === true;
  const isSelf = callerUid === targetUid;

  if (!callerUid || !isSelf) {
    throw new HttpsError("permission-denied", "يُسمح فقط للمستخدم بتعيين صلاحياته لنفسه من هذه الدالة.");
  }

  // التحقق من كلمة مرور إدارية سرية (مخزنة في Firestore المشفر)
  try {
    const secretDoc = await db.doc('platform_metadata/superadmin').get();
    if (!secretDoc.exists) {
      throw new HttpsError("not-found", "بيانات المنصة غير مكتملة.");
    }
    const storedSecret = secretDoc.data()?.setupSecret;
    if (!storedSecret || storedSecret !== adminSecret) {
      throw new HttpsError("permission-denied", "رمز الإدارة غير صحيح.");
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "تعذر التحقق من صلاحيات الإدارة.");
  }

  await getAuth().setCustomUserClaims(targetUid, {
    role: 'super_admin',
    isSuperAdmin: true,
  });

  console.log(`[setSuperAdminClaims] Super Admin claims set for UID: ${targetUid}`);
  return { success: true };
});

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
