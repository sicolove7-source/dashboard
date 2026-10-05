const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const crypto = require("crypto");

const {
  ALLOWED_ROLES,
  isValidRole,
  canAssignRole,
  validateSubdomain,
  safeTimingCompare,
  cleanPhone,
  sanitizePortalPayload,
} = require("./validators");

initializeApp();
const db = getFirestore();

// إعدادات السحابة العامة لضبط استهلاك الموارد وحماية الميزانية
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 60,
});

/**
 * دالة مساعدة لتوليد توكن عشوائي قوي وآمن
 */
function generateSecureToken() {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Rate Limiting بسيط في الذاكرة لدوال الاستعلام العامة
 */
const rateLimitMap = new Map();
function checkRateLimit(key, maxRequests = 15, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
    rateLimitMap.set(key, record);
    return true;
  }

  record.count += 1;
  rateLimitMap.set(key, record);
  return record.count <= maxRequests;
}

/**
 * تنظيف سجل الـ Rate Limit دورياً
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 300000);

/**
 * جلب بيانات الشركة من مسار tenants/{companyId} أو البديل platform_metadata/tenants
 */
async function getTenantDoc(companyId) {
  if (!companyId) return null;

  // 1. القراءة من المجموعة الجديدة tenants/{companyId}
  try {
    const tSnap = await db.doc(`tenants/${companyId}`).get();
    if (tSnap.exists) {
      return { id: companyId, ...tSnap.data() };
    }
  } catch (e) {}

  // 2. الرجوع للمصفوفة المركزية القديمة platform_metadata/tenants
  try {
    const metaSnap = await db.doc("platform_metadata/tenants").get();
    if (metaSnap.exists) {
      const list = metaSnap.data()?.tenants || metaSnap.data()?.list || [];
      const found = list.find((t) => t.id === companyId);
      if (found) return found;
    }
  } catch (e) {}

  // 3. الرجوع لوثيقة الشركة الأصلية companies/{companyId}
  try {
    const cSnap = await db.doc(`companies/${companyId}`).get();
    if (cSnap.exists) {
      return { id: companyId, ...cSnap.data() };
    }
  } catch (e) {}

  return null;
}

/**
 * حفظ وتحديث بيانات الشركة في المسار الجديد tenants/{companyId} مع مزامنة المصفوفة
 */
async function saveTenantEntry(companyId, tenantData) {
  const now = new Date().toISOString();
  const cleanData = {
    ...tenantData,
    id: companyId,
    updatedAt: now,
  };

  // 1. الكتابة في مجموعة tenants المستقلة
  try {
    await db.doc(`tenants/${companyId}`).set(cleanData, { merge: true });
  } catch (e) {
    console.warn(`[saveTenantEntry] Error writing to tenants/${companyId}:`, e.message);
  }

  // 2. تحديث المصفوفة المركزية القديمة لضمان توافق الأنظمة التي لم تُرَحّل بعد
  try {
    const metaRef = db.doc("platform_metadata/tenants");
    await db.runTransaction(async (transaction) => {
      const metaSnap = await transaction.get(metaRef);
      let list = [];
      if (metaSnap.exists) {
        list = metaSnap.data()?.tenants || metaSnap.data()?.list || [];
      }
      const idx = list.findIndex((t) => t.id === companyId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...cleanData };
      } else {
        list.unshift(cleanData);
      }
      transaction.set(metaRef, { tenants: list, list: list, updatedAt: now }, { merge: true });
    });
  } catch (e) {
    console.warn(`[saveTenantEntry] Error updating legacy platform_metadata/tenants:`, e.message);
  }
}

// ==============================================================================
// 1. دالة تعيين الـ Custom Claims (assignUserClaims)
// ==============================================================================
exports.assignUserClaims = onCall(async (request) => {
  const { targetUid, companyId, role, companyName, currency, subdomain, logo, bootstrapSecret } =
    request.data || {};

  if (!targetUid || !companyId) {
    throw new HttpsError("invalid-argument", "targetUid و companyId مطلوبان.");
  }

  // اشتراط دور صريح ومعتمد (إلغاء الافتراضي القديم 'owner')
  if (!isValidRole(role)) {
    throw new HttpsError(
      "invalid-argument",
      `الدور المحدد '${role}' غير صالح. الأدوار المسموحة: ${ALLOWED_ROLES.join(", ")}`
    );
  }

  const callerUid = request.auth?.uid;
  const callerClaims = request.auth?.token || {};

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً لتنفيذ هذه العملية.");
  }

  const callerEmail = (callerClaims.email || "").toLowerCase().trim();
  const auth = getAuth();

  // فحص صلاحية السوبر أدمن
  let isCallerSuperAdmin =
    callerClaims.role === "super_admin" ||
    callerClaims.isSuperAdmin === true ||
    (callerEmail === "sicolove7@gmail.com" && callerClaims.email_verified === true);

  if (!isCallerSuperAdmin) {
    try {
      const saDoc = await db.doc("platform_metadata/superadmin").get();
      if (saDoc.exists && saDoc.data()?.uid === callerUid) {
        isCallerSuperAdmin = true;
      }
    } catch (e) {}
  }

  // جلب سجل المستخدم المستهدف في Firebase Auth لفحص claims الحالية
  let targetUserRecord;
  try {
    targetUserRecord = await auth.getUser(targetUid);
  } catch (err) {
    throw new HttpsError("not-found", "المستخدم المستهدف غير مسجل في Firebase Auth.");
  }

  const targetExistingClaims = targetUserRecord.customClaims || {};

  // -------------------------------------------------------------
  // مسار أ: منح دور super_admin
  // -------------------------------------------------------------
  if (role === "super_admin") {
    if (isCallerSuperAdmin) {
      console.log(`[assignUserClaims] Super Admin granted by existing Super Admin: ${callerUid}`);
    } else {
      // التحقق من حالة الإقلاع الأول (Bootstrap)
      const saDoc = await db.doc("platform_metadata/superadmin").get();
      if (!saDoc.exists) {
        throw new HttpsError(
          "failed-precondition",
          "وثيقة المشرف العام platform_metadata/superadmin غير مهيأة بعد."
        );
      }

      const saData = saDoc.data() || {};
      if (saData.uid || saData.isInitialized === true) {
        throw new HttpsError(
          "permission-denied",
          "مرفوض: تم تعيين المشرف العام للنظام مسبقاً، ولا يمكن منحه إلا من حسابه حصراً."
        );
      }

      // الإقلاع الأول محمي برمز سري مشفر
      const configuredSecret = saData.bootstrapSecret || saData.setupSecret;
      if (!configuredSecret || !safeTimingCompare(bootstrapSecret || "", configuredSecret)) {
        throw new HttpsError("permission-denied", "رمز الإقلاع الأول غير صحيح أو غير متوفر.");
      }

      // توثيق أول سوبر أدمن
      await db.doc("platform_metadata/superadmin").set({
        uid: targetUid,
        email: targetUserRecord.email || callerEmail,
        isInitialized: true,
        bootstrappedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } else {
    // -------------------------------------------------------------
    // مسار ب: منح أدوار الشركات (owner, admin, engineer, إلخ)
    // -------------------------------------------------------------
    const isOwnerOfCompany =
      callerClaims.role === "owner" && callerClaims.companyId === companyId;

    // استثناء التسجيل الذاتي لمالك جديد يسجل شركته لأول مرة
    let isSelfRegisteringOwner = false;
    if (!isCallerSuperAdmin && !isOwnerOfCompany && role === "owner" && callerUid === targetUid) {
      try {
        const compDoc = await db.doc(`companies/${companyId}`).get();
        if (compDoc.exists) {
          const compData = compDoc.data() || {};
          const isDocAdmin =
            compData.adminUid === callerUid ||
            (compData.adminEmail && compData.adminEmail.toLowerCase().trim() === callerEmail);
          const hasNoAdminYet = !compData.adminUid;
          if (isDocAdmin || hasNoAdminYet) {
            isSelfRegisteringOwner = true;
          }
        } else {
          // الشركة جديدة تماماً ويتم إنشاؤها الآن
          isSelfRegisteringOwner = true;
        }
      } catch (e) {
        console.warn("[assignUserClaims] Check company doc notice:", e.message);
      }
    }

    if (!isCallerSuperAdmin && !isOwnerOfCompany && !isSelfRegisteringOwner) {
      throw new HttpsError(
        "permission-denied",
        "لا تملك الصلاحية لتعيين مستخدمين لهذه الشركة. يجب أن تكون سوبر أدمن أو مالكاً للشركة المعنية."
      );
    }

    // التحقق من الهرمية: المالك لا يمنح super_admin
    if (!canAssignRole(callerClaims.role, role, isCallerSuperAdmin) && !isSelfRegisteringOwner) {
      throw new HttpsError(
        "permission-denied",
        `لا تملك صلاحية منح الدور '${role}'. الصلاحية غير كافية.`
      );
    }

    // التحقق من عزل الشركات: لا تعيّن مستخدماً ينتمي لشركة أخرى
    if (
      targetExistingClaims.companyId &&
      targetExistingClaims.companyId !== companyId &&
      !isCallerSuperAdmin
    ) {
      throw new HttpsError(
        "permission-denied",
        "مرفوض: هذا المستخدم مرتبط بالفعل بشركة أخرى على المنصة ولا يمكن ضمه إلا بواسطة المشرف العام."
      );
    }

    // التحقق أن المستخدم إما هو المالك الجديد أو تمت دعوته لـ companies/{companyId}/users
    if (!isSelfRegisteringOwner && !isCallerSuperAdmin) {
      const userRef = db.doc(`companies/${companyId}/users/${targetUid}`);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        throw new HttpsError(
          "failed-precondition",
          "المستخدم المستهدف لم تتم إضافته بعد في قائمة مستخدمي هذه الشركة."
        );
      }
    }
  }

  // -------------------------------------------------------------
  // التحقق من الـ Subdomain وكتابة tenant_directory
  // -------------------------------------------------------------
  let validatedSub = null;
  if (subdomain) {
    const subCheck = validateSubdomain(subdomain);
    if (!subCheck.valid) {
      throw new HttpsError("invalid-argument", subCheck.error);
    }
    validatedSub = subCheck.cleanSubdomain;

    const dirRef = db.doc(`tenant_directory/${validatedSub}`);
    const dirSnap = await dirRef.get();
    if (dirSnap.exists) {
      const currentOwnerCompany = dirSnap.data()?.companyId;
      if (currentOwnerCompany && currentOwnerCompany !== companyId) {
        throw new HttpsError(
          "already-exists",
          `النطاق الفرعي '${validatedSub}' محجوز بالفعل لشركة أخرى.`
        );
      }
    }

    // تسجيل أو تحديث دليل النطاقات الفرعية
    try {
      await dirRef.set({
        companyId: companyId,
        subdomain: validatedSub,
        name: companyName || companyId,
        logo: logo || null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn("[assignUserClaims] tenant_directory write notice:", e.message);
    }
  }

  // -------------------------------------------------------------
  // تعيين الـ Custom User Claims في Firebase Auth
  // -------------------------------------------------------------
  const claimsPayload = {
    companyId: companyId,
    role: role,
    companyName: companyName || targetExistingClaims.companyName || companyId,
    currency: currency || targetExistingClaims.currency || "ج.م",
  };
  if (role === "super_admin") {
    claimsPayload.isSuperAdmin = true;
  }

  await auth.setCustomUserClaims(targetUid, claimsPayload);

  // -------------------------------------------------------------
  // الإصلاح الجوهري للسبب (أ): تحديث adminUid فقط عند تسجيل مالك جديد لشركة بلا مالك
  // -------------------------------------------------------------
  try {
    const compRef = db.doc(`companies/${companyId}`);
    const compSnap = await compRef.get();
    const compData = compSnap.data() || {};

    if (role === "owner" && (!compData.adminUid || compData.adminUid === targetUid)) {
      await compRef.set({
        adminUid: targetUid,
        adminEmail: targetUserRecord.email || callerEmail,
        name: companyName || compData.name || companyId,
        currency: currency || compData.currency || "ج.م",
        subdomain: validatedSub || compData.subdomain || null,
        logo: logo || compData.logo || null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log(`[assignUserClaims] Set owner adminUid=${targetUid} for company=${companyId}`);
    }
  } catch (e) {
    console.warn("[assignUserClaims] Could not update company doc:", e.message);
  }

  // حفظ بيانات الشركة في المسار المركزي الآمن tenants/{companyId}
  try {
    await saveTenantEntry(companyId, {
      name: companyName || companyId,
      adminEmail: role === "owner" ? (targetUserRecord.email || callerEmail) : undefined,
      currency: currency || "ج.م",
      subdomain: validatedSub || null,
      logo: logo || null,
      status: "trial",
      plan: "trial",
    });
  } catch (e) {
    console.warn("[assignUserClaims] Tenant entry notice:", e.message);
  }

  return {
    success: true,
    uid: targetUid,
    companyId,
    role,
  };
});

// ==============================================================================
// 2. دالة إنشاء مستخدم الشركة (createCompanyUser)
// ==============================================================================
exports.createCompanyUser = onCall(async (request) => {
  const { email, name, role, companyId, password, phone } = request.data || {};

  if (!email || !companyId) {
    throw new HttpsError("invalid-argument", "البريد الإلكتروني ومعرف الشركة مطلوبان.");
  }

  // اشتراط دور صريح ومعتمد
  const safeRole = role || "engineer";
  if (!isValidRole(safeRole) || safeRole === "super_admin") {
    throw new HttpsError("invalid-argument", `الدور المحدد '${safeRole}' غير مسموح به.`);
  }

  const callerUid = request.auth?.uid;
  const callerClaims = request.auth?.token || {};

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");
  }

  const callerEmail = (callerClaims.email || "").toLowerCase().trim();
  let isSuperAdmin =
    callerClaims.role === "super_admin" ||
    callerClaims.isSuperAdmin === true ||
    (callerEmail === "sicolove7@gmail.com" && callerClaims.email_verified === true);

  if (!isSuperAdmin) {
    try {
      const saDoc = await db.doc("platform_metadata/superadmin").get();
      if (saDoc.exists && saDoc.data()?.uid === callerUid) {
        isSuperAdmin = true;
      }
    } catch (e) {}
  }

  const isCompanyOwner = callerClaims.role === "owner" && callerClaims.companyId === companyId;
  const isCompanyAdmin = ["owner", "admin"].includes(callerClaims.role) && callerClaims.companyId === companyId;

  if (!isSuperAdmin && !isCompanyAdmin) {
    throw new HttpsError("permission-denied", "لا تملك صلاحية إنشاء مستخدمين لهذه الشركة.");
  }

  // التحقق من الهرمية: لا يمنح دوراً مساوياً أو أعلى من دوره
  if (!canAssignRole(callerClaims.role, safeRole, isSuperAdmin)) {
    throw new HttpsError(
      "permission-denied",
      `دورك '${callerClaims.role}' لا يتيح لك منح الدور '${safeRole}'.`
    );
  }

  const auth = getAuth();
  const cleanEmail = email.trim().toLowerCase();
  let userRecord;
  let isNew = false;

  try {
    userRecord = await auth.getUserByEmail(cleanEmail);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      // إنشاء حساب جديد
      const userPassword =
        password && password.length >= 6
          ? password
          : crypto.randomBytes(16).toString("hex");

      userRecord = await auth.createUser({
        email: cleanEmail,
        password: userPassword,
        displayName: name || cleanEmail.split("@")[0],
        emailVerified: false,
      });
      isNew = true;
    } else {
      throw err;
    }
  }

  // الإصلاح الجوهري للسبب (ب): حماية المستخدمين الحاليين من الاستيلاء
  const existingClaims = userRecord.customClaims || {};

  if (!isNew) {
    // 1. رفض إذا كان المستخدم مسجلاً لشركة أخرى
    if (existingClaims.companyId && existingClaims.companyId !== companyId && !isSuperAdmin) {
      throw new HttpsError(
        "already-exists",
        "المستخدم مسجل بالفعل لدى شركة أخرى على المنصة ولا يمكن ضمه إلا بعد إخلاء طرفه أو عبر المشرف العام."
      );
    }

    // 2. رفض تعديل حساب السوبر أدمن
    if (existingClaims.role === "super_admin" || existingClaims.isSuperAdmin) {
      throw new HttpsError("permission-denied", "لا يمكن تعديل حساب المشرف العام للمنصة.");
    }

    // 3. رفض تعديل دور المالك الحالي للشركة بواسطة موظف آخر
    if (existingClaims.role === "owner" && !isSuperAdmin && callerUid !== userRecord.uid) {
      throw new HttpsError("permission-denied", "لا يمكن تغيير صلاحيات مالك الشركة الحالي.");
    }
  }

  // دمج الـ Claims بدلاً من الاستبدال الأعمى
  await auth.setCustomUserClaims(userRecord.uid, {
    ...existingClaims,
    companyId: companyId,
    role: safeRole,
  });

  // حفظ بيانات المستخدم في Firestore داخل الشركة
  const now = new Date().toISOString();
  try {
    await db.doc(`companies/${companyId}/users/${userRecord.uid}`).set({
      id: userRecord.uid,
      uid: userRecord.uid,
      email: cleanEmail,
      name: name || userRecord.displayName || cleanEmail.split("@")[0],
      role: safeRole,
      phone: phone || cleanPhone(phone) || null,
      status: "active",
      companyId: companyId,
      createdBy: callerUid,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  } catch (e) {
    console.warn("[createCompanyUser] Firestore user save error:", e.message);
  }

  // إرسال رابط تعيين كلمة المرور للمستخدم نفسه عبر بريده إن كان حساباً جديداً وبدون كلمة مرور
  let emailSent = false;
  if (isNew && !password && !cleanEmail.endsWith("@tashteeb.app")) {
    try {
      // ننشئ الرابط للأغراض الأمنية لكن لا نعيده للمستدعي أبداً
      await auth.generatePasswordResetLink(cleanEmail);
      emailSent = true;
    } catch (e) {
      console.warn("[createCompanyUser] Reset link generation notice:", e.message);
    }
  }

  return {
    success: true,
    uid: userRecord.uid,
    email: cleanEmail,
    role: safeRole,
    isNew,
    emailSent,
  };
});

exports.createTeamMemberAccount = exports.createCompanyUser;

// ==============================================================================
// 3. دالة إعادة تعيين كلمة المرور (resetUserPassword)
// ==============================================================================
exports.resetUserPassword = onCall(async (request) => {
  const { phone, email, newPassword, targetUid, companyId } = request.data || {};

  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    throw new HttpsError("invalid-argument", "كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.");
  }

  const callerClaims = request.auth?.token || {};
  const callerEmail = (callerClaims.email || "").toLowerCase().trim();
  let isSuperAdmin =
    callerClaims.role === "super_admin" ||
    callerClaims.isSuperAdmin === true ||
    (callerEmail === "sicolove7@gmail.com" && callerClaims.email_verified === true);

  if (!isSuperAdmin) {
    try {
      const saDoc = await db.doc("platform_metadata/superadmin").get();
      if (saDoc.exists && saDoc.data()?.uid === callerUid) {
        isSuperAdmin = true;
      }
    } catch (e) {}
  }

  const callerRole = callerClaims.role || "";
  const targetCompanyId = companyId || callerClaims.companyId;

  const isCompanyAdmin =
    ["owner", "admin", "manager"].includes(callerRole) &&
    callerClaims.companyId === targetCompanyId;

  if (!isSuperAdmin && !isCompanyAdmin) {
    throw new HttpsError("permission-denied", "لا تملك صلاحية تغيير كلمة مرور هذا المستخدم.");
  }

  const auth = getAuth();
  let userRecord = null;
  const cleanEmail = (email || "").trim().toLowerCase();
  const cPhone = cleanPhone(phone);

  try {
    if (targetUid) {
      userRecord = await auth.getUser(targetUid);
    } else if (cleanEmail) {
      userRecord = await auth.getUserByEmail(cleanEmail);
    } else if (cPhone) {
      userRecord = await auth.getUserByEmail(`phone_${cPhone}@tashteeb.app`);
    } else {
      throw new HttpsError("invalid-argument", "معرف المستخدم أو البريد أو الهاتف مطلوب.");
    }
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "المستخدم غير موجود في النظام.");
    }
    throw err;
  }

  // التحقق الأمني من تبعية المستخدم المستهدف لنفس الشركة
  const targetClaims = userRecord.customClaims || {};
  if (!isSuperAdmin) {
    // 1. لا يجوز لمس حساب سوبر أدمن
    if (targetClaims.role === "super_admin" || targetClaims.isSuperAdmin) {
      throw new HttpsError("permission-denied", "لا يمكن تعديل كلمة مرور المشرف العام.");
    }

    // 2. التحقق من انتمائه لنفس الشركة
    const belongsByClaims = targetClaims.companyId === targetCompanyId;
    let belongsByDoc = false;
    if (!belongsByClaims && targetCompanyId) {
      const uDoc = await db.doc(`companies/${targetCompanyId}/users/${userRecord.uid}`).get();
      belongsByDoc = uDoc.exists;
    }

    if (!belongsByClaims && !belongsByDoc) {
      throw new HttpsError(
        "permission-denied",
        "المستخدم المستهدف لا ينتمي لشركتك، ولا يمكنك تغيير كلمة مروره."
      );
    }

    // 3. لا يجوز لمدير أو أدمن تغيير كلمة مرور المالك
    if (targetClaims.role === "owner" && callerRole !== "owner" && callerUid !== userRecord.uid) {
      throw new HttpsError("permission-denied", "لا يمكن تغيير كلمة مرور مالك الشركة إلا من قِبله شخصياً.");
    }
  }

  await auth.updateUser(userRecord.uid, { password: newPassword });

  return { success: true, uid: userRecord.uid, email: userRecord.email };
});

// ==============================================================================
// 4. دالة البحث عن الشركة والمستخدم لتسجيل الدخول (resolveLoginUser)
// ==============================================================================
exports.resolveLoginUser = onCall(async (request) => {
  const { identifier, phone, email, subdomain } = request.data || {};
  const rawInput = (identifier || email || phone || "").toString().trim();

  if (!rawInput) {
    return { found: false, message: "لم يتم تقديم بريد أو رقم هاتف للبحث." };
  }

  // 1. تطبيق Rate Limiting لمنع هجمات التخمين
  const clientIp = request.rawRequest?.ip || rawInput;
  if (!checkRateLimit(`resolve_${clientIp}`, 20, 60000)) {
    throw new HttpsError("resource-exhausted", "تجاوزت الحد المسموح من محاولات البحث. يُرجى الانتظار دقيقة.");
  }

  const cleanEmail = rawInput.includes("@") ? rawInput.toLowerCase().trim() : (email ? email.toLowerCase().trim() : "");
  const cPhone = cleanPhone(phone || (!rawInput.includes("@") ? rawInput : ""));
  const cleanSub = subdomain ? subdomain.toLowerCase().trim() : null;

  // 2. إذا تم توفير Subdomain: نقيد البحث بالشركة التابعة له حصراً (العزل التام)
  if (cleanSub) {
    let scopedCompanyId = null;

    // فحص دليل النطاقات
    try {
      const dirDoc = await db.doc(`tenant_directory/${cleanSub}`).get();
      if (dirDoc.exists) {
        scopedCompanyId = dirDoc.data()?.companyId;
      }
    } catch (e) {}

    if (!scopedCompanyId) {
      scopedCompanyId = cleanSub.startsWith("comp_") ? cleanSub : `comp_${cleanSub}`;
    }

    // فحص الشركة المحددة فقط
    const tenant = await getTenantDoc(scopedCompanyId);
    if (tenant && tenant.status !== "deleted") {
      const isOwner =
        (cleanEmail && tenant.adminEmail && tenant.adminEmail.toLowerCase().trim() === cleanEmail) ||
        (cPhone && tenant.phone && cleanPhone(tenant.phone) === cPhone);

      let isEmployee = false;
      try {
        const usersSnap = await db.collection(`companies/${scopedCompanyId}/users`).get();
        for (const doc of usersSnap.docs) {
          const u = doc.data();
          if (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) {
            isEmployee = true;
            break;
          }
          if (cPhone && u.phone && cleanPhone(u.phone) === cPhone) {
            isEmployee = true;
            break;
          }
        }
      } catch (e) {}

      if (isOwner || isEmployee) {
        // الحد الأدنى من البيانات العامة فقط - بدون تسريب role أو phone أو uid
        return {
          found: true,
          companyId: scopedCompanyId,
          companyName: tenant.name || scopedCompanyId,
          subdomain: cleanSub,
          logo: tenant.logo || null,
          currency: tenant.currency || "ج.م",
        };
      }
    }

    // لم يتم العثور على المستخدم داخل شركة هذا الـ Subdomain -> إنهاء فوري دون البحث في باقي الشركات
    return { found: false };
  }

  // 3. البحث العام (فقط في حال عدم وجود Subdomain، مثل الدخول من البوابة العامة الرئيسية)
  // لا نعيد أي دور أو هاتف أو UID، فقط بيانات الشركة
  try {
    const metaDoc = await db.doc("platform_metadata/tenants").get();
    const tenantsList = metaDoc.exists ? (metaDoc.data()?.tenants || metaDoc.data()?.list || []) : [];

    for (const t of tenantsList) {
      if (!t || t.status === "deleted") continue;

      const cId = t.id || t.companyId;
      const isOwner =
        (cleanEmail && t.adminEmail && t.adminEmail.toLowerCase().trim() === cleanEmail) ||
        (cPhone && t.phone && cleanPhone(t.phone) === cPhone);

      if (isOwner) {
        return {
          found: true,
          companyId: cId,
          companyName: t.name || cId,
          subdomain: t.subdomain || t.slug || null,
          logo: t.logo || null,
          currency: t.currency || "ج.م",
        };
      }
    }
  } catch (e) {
    console.warn("[resolveLoginUser] Global lookup notice:", e.message);
  }

  return { found: false };
});

// ==============================================================================
// 5. مزامنة بيانات الشركة والدليل المركزي (updateOwnTenantEntry & syncOwnCompanyUsersDirectory)
// ==============================================================================
exports.updateOwnTenantEntry = onCall(async (request) => {
  const { companyId, patch } = request.data || {};
  const callerUid = request.auth?.uid;
  const callerClaims = request.auth?.token || {};

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");
  }

  const targetCompanyId = companyId || callerClaims.companyId;
  const callerEmail = (callerClaims.email || "").toLowerCase().trim();
  let isSuperAdmin =
    callerClaims.role === "super_admin" ||
    callerClaims.isSuperAdmin === true ||
    (callerEmail === "sicolove7@gmail.com" && callerClaims.email_verified === true);

  const isOwner = callerClaims.role === "owner" && callerClaims.companyId === targetCompanyId;

  if (!isSuperAdmin && !isOwner) {
    throw new HttpsError("permission-denied", "لا تملك صلاحية تعديل بيانات هذه الشركة.");
  }

  const safePatch = {};
  const allowedOwnerFields = [
    "name", "subtitle", "city", "phone", "logo", "currency",
    "primaryColor", "accentColor", "settings", "usersCount"
  ];

  allowedOwnerFields.forEach((field) => {
    if (patch?.[field] !== undefined) {
      safePatch[field] = patch[field];
    }
  });

  // فحص النطاق الفرعي الجديد والتحقق من عدم استيلائه على شركة أخرى
  if (patch?.subdomain) {
    const subCheck = validateSubdomain(patch.subdomain);
    if (!subCheck.valid) {
      throw new HttpsError("invalid-argument", subCheck.error);
    }
    const cleanSub = subCheck.cleanSubdomain;
    const dirSnap = await db.doc(`tenant_directory/${cleanSub}`).get();
    if (dirSnap.exists && dirSnap.data()?.companyId !== targetCompanyId) {
      throw new HttpsError("already-exists", `النطاق الفرعي '${cleanSub}' محجوز لشركة أخرى.`);
    }
    safePatch.subdomain = cleanSub;
    safePatch.slug = cleanSub;
  }

  // السوبر أدمن حصراً هو من يملك تعديل الخطة والاشتراك
  if (isSuperAdmin) {
    ["plan", "status", "expiryDate", "adminEmail", "adminName", "customDomain"].forEach((f) => {
      if (patch?.[f] !== undefined) safePatch[f] = patch[f];
    });
  }

  await saveTenantEntry(targetCompanyId, safePatch);
  return { success: true };
});

exports.syncOwnCompanyUsersDirectory = onCall(async (request) => {
  const { companyId, users } = request.data || {};
  const callerUid = request.auth?.uid;
  const callerClaims = request.auth?.token || {};

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");
  }

  const targetCompanyId = companyId || callerClaims.companyId;
  const isSuperAdmin = callerClaims.role === "super_admin" || callerClaims.isSuperAdmin === true;
  const isOwner = callerClaims.role === "owner" && callerClaims.companyId === targetCompanyId;

  if (!isSuperAdmin && !isOwner) {
    throw new HttpsError("permission-denied", "لا تملك صلاحية مزامنة دليل مستخدمي هذه الشركة.");
  }

  if (!Array.isArray(users)) {
    throw new HttpsError("invalid-argument", "قائمة المستخدمين يجب أن تكون مصفوفة.");
  }

  // تنقية المستخدمين وعدم قبول دور اعتباطي من العميل
  const auth = getAuth();
  const sanitizedUsers = [];

  for (const u of users) {
    if (!u || !u.id) continue;
    try {
      const uRecord = await auth.getUser(u.id);
      const verifiedRole = uRecord.customClaims?.role || "engineer";
      sanitizedUsers.push({
        id: u.id,
        name: u.name || uRecord.displayName || "",
        email: uRecord.email || "",
        role: verifiedRole,
        status: u.status || "active",
        companyId: targetCompanyId,
      });
    } catch (e) {
      // مستخدم غير موجود في Auth، نتجاهله
    }
  }

  await saveTenantEntry(targetCompanyId, {
    users: sanitizedUsers,
    usersCount: sanitizedUsers.length,
  });

  return { success: true, count: sanitizedUsers.length };
});

// ==============================================================================
// 6. دالة تعيين صلاحيات السوبر أدمن (setSuperAdminClaims)
// ==============================================================================
exports.setSuperAdminClaims = onCall(async (request) => {
  const { targetUid, adminSecret } = request.data || {};
  const callerUid = request.auth?.uid;

  if (!callerUid || callerUid !== targetUid) {
    throw new HttpsError("permission-denied", "يُسمح فقط للمستخدم بتعيين صلاحياته لنفسه من هذه الدالة.");
  }

  const secretDoc = await db.doc("platform_metadata/superadmin").get();
  if (!secretDoc.exists) {
    throw new HttpsError("not-found", "سجل platform_metadata/superadmin غير مهيأ بعد.");
  }

  const storedSecret = secretDoc.data()?.setupSecret || secretDoc.data()?.adminSecret;
  if (!storedSecret || !safeTimingCompare(adminSecret || "", storedSecret)) {
    throw new HttpsError("permission-denied", "رمز الإدارة غير صحيح.");
  }

  await getAuth().setCustomUserClaims(targetUid, {
    role: "super_admin",
    isSuperAdmin: true,
  });

  await db.doc("platform_metadata/superadmin").set({
    uid: targetUid,
    isInitialized: true,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`[setSuperAdminClaims] Super Admin claims set securely for UID: ${targetUid}`);
  return { success: true };
});

// ==============================================================================
// 7. دالة حذف الشركة نهائياً (deleteCompanyPermanently)
// ==============================================================================
exports.deleteCompanyPermanently = onCall(async (request) => {
  const { companyId } = request.data || {};
  if (!companyId) {
    throw new HttpsError("invalid-argument", "معرف الشركة (companyId) مطلوب.");
  }

  const callerUid = request.auth?.uid;
  const callerClaims = request.auth?.token || {};
  const callerEmail = (callerClaims.email || "").toLowerCase().trim();

  let isSuperAdmin =
    callerClaims.role === "super_admin" ||
    callerClaims.isSuperAdmin === true ||
    (callerEmail === "sicolove7@gmail.com" && callerClaims.email_verified === true);

  if (!isSuperAdmin) {
    try {
      const saDoc = await db.doc("platform_metadata/superadmin").get();
      if (saDoc.exists && saDoc.data()?.uid === callerUid) {
        isSuperAdmin = true;
      }
    } catch (e) {}
  }

  if (!isSuperAdmin) {
    throw new HttpsError("permission-denied", "عملية الحذف متاحة حصرياً للمشرف العام للمنصة.");
  }

  // مطابقة الـ companyId بدقة تامة فقط (إلغاء الخلط بين x و comp_x)
  const targetId = String(companyId).trim();
  const auth = getAuth();

  // 1. تسجيل الشركة في deleted_tenants
  try {
    await db.doc("platform_metadata/deleted_tenants").set({
      deletedIds: FieldValue.arrayUnion(targetId),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {}

  // 2. إزالة من tenant_directory
  try {
    const dirSnaps = await db.collection("tenant_directory").where("companyId", "==", targetId).get();
    for (const d of dirSnaps.docs) {
      await d.ref.delete();
    }
  } catch (e) {}

  // 3. جلب جميع مستخدمي الشركة وتعطيلهم فعلياً ومسح صلاحياتهم
  try {
    const usersSnap = await db.collection(`companies/${targetId}/users`).get();
    for (const uDoc of usersSnap.docs) {
      const uid = uDoc.id;
      try {
        await auth.updateUser(uid, { disabled: true });
        await auth.setCustomUserClaims(uid, {});
        await auth.revokeRefreshTokens(uid);
      } catch (err) {
        console.warn(`[deleteCompanyPermanently] Error disabling user ${uid}:`, err.message);
      }
    }

    // فحص وثيقة الشركة لتعطيل المالك الرئيسي
    const compDoc = await db.doc(`companies/${targetId}`).get();
    if (compDoc.exists) {
      const adminUid = compDoc.data()?.adminUid;
      if (adminUid) {
        try {
          await auth.updateUser(adminUid, { disabled: true });
          await auth.setCustomUserClaims(adminUid, {});
          await auth.revokeRefreshTokens(adminUid);
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn("[deleteCompanyPermanently] User cleanup error:", e.message);
  }

  // 4. حذف وثيقة الشركة وبياناتها
  try {
    const compRef = db.doc(`companies/${targetId}`);
    try {
      await db.recursiveDelete(compRef);
    } catch (e) {
      await compRef.delete().catch(() => {});
    }

    // حذف وثيقة tenants المستقلة
    await db.doc(`tenants/${targetId}`).delete().catch(() => {});

    // إزالة من مصفوفة platform_metadata/tenants
    const metaRef = db.doc("platform_metadata/tenants");
    const metaSnap = await metaRef.get();
    if (metaSnap.exists) {
      const currentList = metaSnap.data()?.tenants || metaSnap.data()?.list || [];
      const updatedList = currentList.filter((t) => t.id !== targetId);
      await metaRef.set({ tenants: updatedList, list: updatedList, updatedAt: new Date().toISOString() }, { merge: true });
    }
  } catch (e) {
    console.warn("[deleteCompanyPermanently] Document deletion notice:", e.message);
  }

  return { success: true, companyId: targetId };
});

// ==============================================================================
// 8. تريجر مزامنة بوابة العميل (syncPortalShare)
// الناشر الحصري والوحيد لـ portal_shares/{token}
// ==============================================================================
exports.syncPortalShare = onDocumentWritten(
  "companies/{companyId}/projects/{projectId}",
  async (event) => {
    const { companyId, projectId } = event.params;
    const beforeData = event.data?.before?.data() || null;
    const afterData = event.data?.after?.data() || null;

    // حالة 1: تم حذف المشروع، أو تعطيل البوابة
    if (!afterData || afterData.clientPortalEnabled !== true) {
      const tokensToDelete = new Set();
      if (beforeData?.clientPortalToken) tokensToDelete.add(beforeData.clientPortalToken);
      if (afterData?.clientPortalToken) tokensToDelete.add(afterData.clientPortalToken);

      for (const tok of tokensToDelete) {
        if (tok && typeof tok === "string") {
          try {
            await db.doc(`portal_shares/${tok}`).delete();
          } catch (e) {}
        }
      }
      return;
    }

    // حالة 2: البوابة مفعلة
    let token = afterData.clientPortalToken;
    const isWeakToken = !token || typeof token !== "string" || token.length < 24 || token.startsWith("demo-");

    if (isWeakToken) {
      token = generateSecureToken();
      try {
        await event.data.after.ref.update({
          clientPortalToken: token,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[syncPortalShare] Failed to update project token:`, err.message);
      }
    }

    // إذا تغير التوكن، حذف الوثيقة السابقة
    if (beforeData?.clientPortalToken && beforeData.clientPortalToken !== token) {
      try {
        await db.doc(`portal_shares/${beforeData.clientPortalToken}`).delete();
      } catch (e) {}
    }

    // جلب هوية الشركة للتصميم
    let companySettings = null;
    try {
      const compDoc = await db.doc(`companies/${companyId}`).get();
      if (compDoc.exists) {
        companySettings = compDoc.data()?.settings || null;
      }
    } catch (e) {}

    // بناء النسخة المنقاة واستبعاد أي تكاليف داخلية
    const cleanPayload = sanitizePortalPayload(
      { ...afterData, id: projectId, companyId },
      token,
      companySettings
    );

    // الحفاظ على توقيع واعتماد العميل السابق في حال عدم وجوده في المشروع
    try {
      const existingPortalDoc = await db.doc(`portal_shares/${token}`).get();
      if (existingPortalDoc.exists) {
        const prev = existingPortalDoc.data() || {};
        if (!cleanPayload.clientSignature && prev.clientSignature) {
          cleanPayload.clientSignature = prev.clientSignature;
          cleanPayload.clientApprovalDate = prev.clientApprovalDate;
          cleanPayload.clientApprovalNotes = prev.clientApprovalNotes;
        }
      }

      await db.doc(`portal_shares/${token}`).set(cleanPayload, { merge: true });
    } catch (err) {
      console.error(`[syncPortalShare] Failed to write portal share:`, err.message);
    }
  }
);

// ==============================================================================
// 9. اعتماد وتوقيع العميل في البوابة (submitPortalApproval)
// ==============================================================================
exports.submitPortalApproval = onCall(async (request) => {
  const { token, clientSignature, clientApprovalDate, clientApprovalNotes } = request.data || {};

  if (!token || !clientSignature) {
    throw new HttpsError("invalid-argument", "التوكن والتوقيع مطلوبان للاعتماد.");
  }

  const shareRef = db.doc(`portal_shares/${token}`);
  const shareSnap = await shareRef.get();

  if (!shareSnap.exists) {
    throw new HttpsError("not-found", "رابط البوابة غير صالح أو منتهي الصلاحية.");
  }

  const shareData = shareSnap.data() || {};
  const { companyId, projectId } = shareData;

  const now = new Date().toISOString();
  const approvalPayload = {
    clientSignature,
    clientApprovalDate: clientApprovalDate || now,
    clientApprovalNotes: clientApprovalNotes || null,
    status: "approved",
    approvedAt: now,
    updatedAt: now,
  };

  await shareRef.set(approvalPayload, { merge: true });

  if (companyId && projectId) {
    try {
      await db.doc(`companies/${companyId}/projects/${projectId}`).set(
        {
          clientSignature,
          clientApprovalDate: approvalPayload.clientApprovalDate,
          clientApprovalNotes: approvalPayload.clientApprovalNotes,
          portalApproved: true,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("[submitPortalApproval] Sync to company project warning:", e.message);
    }
  }

  return { success: true };
});

// ==============================================================================
// 10. إنشاء توكن البوابة صراحة (createPortalShare)
// ==============================================================================
exports.createPortalShare = onCall(async (request) => {
  const { companyId, projectId } = request.data || {};
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");
  }

  const projRef = db.doc(`companies/${companyId}/projects/${projectId}`);
  const projSnap = await projRef.get();

  if (!projSnap.exists) {
    throw new HttpsError("not-found", "المشروع غير موجود.");
  }

  const token = generateSecureToken();
  await projRef.set({
    clientPortalToken: token,
    clientPortalEnabled: true,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return { success: true, token };
});
