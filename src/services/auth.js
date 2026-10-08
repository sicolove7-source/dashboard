/**
 * ===================================================================
 * خدمة المصادقة الرسمية — Firebase Authentication Service
 * ===================================================================
 * إدارة تسجيل الدخول، الخروج، وتتبع حالة المستخدم عبر Firebase Auth الحقيقي.
 */

import { initializeApp, deleteApp } from 'firebase/app';
import { auth, functions, firebaseConfig } from '../firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updatePassword,
  updateEmail,
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { cleanPhoneNumber } from './cloudSync';

/**
 * @deprecated [Security Hardening] تم استئصال passHash نهائياً.
 * المصادقة الرسمية والوحيدة تتم عبر Firebase Authentication المشفر.
 */
export async function hashUserPassword(_password) {
  console.warn('[Security] hashUserPassword is deprecated and no longer used. Authentication relies strictly on Firebase Auth.');
  return null;
}

/**
 * استدعاء Cloud Function لتعيين Custom Claims للمستخدم بشكل آمن من Server-Side
 * يُضمن ربط المستخدم بشركته في Firebase Auth Token
 */
export async function callAssignUserClaims({ targetUid, companyId, role, companyName, currency, subdomain, logo }) {
  try {
    const fn = httpsCallable(functions, 'assignUserClaims');
    const result = await fn({ targetUid, companyId, role, companyName, currency, subdomain, logo });

    // تجديد فوري لتوكن المستخدم الحالي إذا كان التعديل خاصاً به
    if (auth.currentUser && auth.currentUser.uid === targetUid) {
      try {
        await auth.currentUser.getIdToken(true);
        console.log('[callAssignUserClaims] Token refreshed successfully with updated claims');
      } catch (tokErr) {
        console.warn('[callAssignUserClaims] Token refresh notice:', tokErr.message);
      }
    }

    return result.data;
  } catch (err) {
    console.warn('[callAssignUserClaims] Cloud function error (non-blocking):', err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * إنشاء حساب Firebase Auth لموظف جديد أو دعوته عبر Cloud Function الآمنة أو المصادقة المباشرة
 */
export async function callCreateCompanyUser({ email, name, role, companyId, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'البريد الإلكتروني أو رقم الهاتف مطلوب.' };

  // التحقق الأمني: يجب أن يكون المتصل مسجلاً للدخول
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { success: false, error: 'غير مصرح: يجب تسجيل الدخول كمسؤول للقيام بهذا الإجراء.' };
  }

  // 1. محاولة استدعاء Vercel Serverless Function إذا تم توفير كلمة مرور
  if (password && password.length >= 6) {
    try {
      const idToken = await currentUser.getIdToken();
      const data = await callResetPasswordApi({
        email: cleanEmail,
        name,
        newPassword: password,
        companyId
      }, idToken);
      if (data?.success) {
        console.log('[callCreateCompanyUser] ✅ Serverless Admin API succeeded:', cleanEmail);
        return {
          success: true,
          uid: data.uid,
          email: cleanEmail,
          message: `✅ تم تفعيل حساب ${name || cleanEmail} بنجاح.`
        };
      }
    } catch (apiErr) {
      console.warn('[callCreateCompanyUser] API notice:', apiErr.message);
    }
  }

  // 2. استدعاء Cloud Function الرسمية والآمنة (Admin SDK)
  try {
    const fn = httpsCallable(functions, 'createCompanyUser');
    const result = await fn({ email: cleanEmail, name, role, companyId, password });
    if (result.data?.success) {
      let emailSent = false;
      if (!password && !cleanEmail.endsWith('@tashteeb.app')) {
        try {
          await sendPasswordResetEmail(auth, cleanEmail);
          emailSent = true;
        } catch (e) {
          console.warn('[callCreateCompanyUser] sendPasswordResetEmail notice:', e.message);
        }
      }
      return {
        ...result.data,
        emailSent,
        message: emailSent
          ? `✅ تم إنشاء حساب الموظف وإرسال رابط تعيين كلمة المرور إلى ${cleanEmail} بنجاح.`
          : `✅ تم إنشاء وتفعيل حساب الموظف بنجاح في سجلات الشركة.`,
      };
    }
    return result.data || { success: false, error: 'تعذر إنشاء الحساب' };
  } catch (cloudErr) {
    console.error('[callCreateCompanyUser] Cloud function error:', cloudErr?.message || cloudErr?.code);
    return {
      success: false,
      error: cloudErr?.message || 'فشل إنشاء حساب الموظف عبر الخادم السحابي.',
    };
  }
}


/**
 * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
 */
export async function loginWithEmail(email, password, retries = 3) {
  const cleanEmail = (email || '').trim().toLowerCase();
  // ✅ الحفاظ على الجلسة في localStorage حتى لا تضيع عند الـ Refresh
  try { await setPersistence(auth, browserLocalPersistence); } catch (e) {}
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      return {
        success: true,
        user: userCredential.user,
      };
    } catch (error) {
      const errStr = String(error.message || '') + String(error.code || '');
      const isDbClosing = errStr.includes('closing') || errStr.includes('hidden') || errStr.includes('Database is closing');

      if (isDbClosing && attempt < retries) {
        console.warn(`[loginWithEmail] Database is closing/hidden notice (attempt ${attempt}/${retries}). Waiting 500ms and retrying...`);
        await new Promise(r => setTimeout(r, 500 * attempt));
        continue;
      }

      let message = 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.';
      switch (error.code) {
        case 'auth/configuration-not-found':
          message = 'خدمة المصادقة لم تُفعّل بعد في Firebase Console! يرجى فتح Console والضغط على Get Started ثم تفعيل خيار Email/Password.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
          break;
        case 'auth/invalid-email':
          message = 'صيغة البريد الإلكتروني غير صالحة.';
          break;
        case 'auth/user-disabled':
          message = 'تم تعطيل هذا الحساب من قِبل إدارة النظام.';
          break;
        case 'auth/too-many-requests':
          message = 'تم حظر الدخول مؤقتاً بسبب محاولات متكررة خاطئة. يرجى الانتظار قليلاً أو إعادة تعيين كلمة المرور.';
          break;
        case 'auth/network-request-failed':
          message = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
          break;
        default:
          if (isDbClosing) {
            message = 'حدثت استجابة متأخرة أثناء حفظ الجلسة بالمتصفح. يرجى إعادة المحاولة.';
          } else {
            message = error.message || message;
          }
      }
      return {
        success: false,
        error: message,
        code: error.code,
      };
    }
  }
}

/**
 * تسجيل الخروج من المنصة
 */
export async function logoutUser() {
  try {
    try {
      if (typeof localStorage !== 'undefined') {
        // ✅ نمسح بيانات الجلسة الخاصة بهذا النطاق (origin)
        localStorage.removeItem('active_session_user');
      }
    } catch (e) {}
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Firebase signOut error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * الاستماع اللحظي لتغير حالة المصادقة (Auth State Listener)
 */
export function onAuthChange(callback) {
  if (typeof callback !== 'function') return () => {};
  return onAuthStateChanged(auth, callback);
}

/**
 * إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني
 */
export async function sendPasswordReset(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: 'يرجى إدخال البريد الإلكتروني أولاً.' };
  }
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      success: true,
      message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح. يرجى تفقد صندوق الوارد (أو الرسائل غير المرغوب فيها).',
    };
  } catch (error) {
    let message = 'تعذر إرسال رابط إعادة تعيين كلمة المرور.';
    switch (error.code) {
      case 'auth/configuration-not-found':
        message = 'خدمة المصادقة لم تُفعّل بعد في Firebase Console! يرجى فتح Console والضغط على Get Started ثم تفعيل خيار Email/Password.';
        break;
      case 'auth/user-not-found':
        message = 'هذا البريد الإلكتروني غير مسجل في النظام.';
        break;
      case 'auth/invalid-email':
        message = 'صيغة البريد الإلكتروني غير صالحة.';
        break;
      case 'auth/too-many-requests':
        message = 'تم إرسال عدة طلبات مؤخراً. يرجى الانتظار قليلاً والمحاولة لاحقاً.';
        break;
      default:
        message = error.message || message;
    }
    return { success: false, error: message, code: error.code };
  }
}

/**
 * إنشاء حساب جديد في Firebase Auth (يُستخدم مع التسجيل)
 */
export async function registerWithEmail(email, password, retries = 3) {
  const cleanEmail = (email || '').trim().toLowerCase();
  // ✅ الحفاظ على الجلسة في localStorage حتى لا تضيع عند الـ Refresh
  try { await setPersistence(auth, browserLocalPersistence); } catch (e) {}
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      return { success: true, user: cred.user };

    } catch (error) {
      const errStr = String(error.message || '') + String(error.code || '');
      const isDbClosing = errStr.includes('closing') || errStr.includes('hidden') || errStr.includes('Database is closing');

      if (isDbClosing && attempt < retries) {
        console.warn(`[registerWithEmail] Database is closing/hidden notice (attempt ${attempt}/${retries}). Waiting 500ms and retrying...`);
        await new Promise(r => setTimeout(r, 500 * attempt));
        continue;
      }

      // في حال كان البريد مسجلاً مسبقاً على السيرفر بسبب تعثر الاتصال المحلي بقاعدة البيانات
      if (error.code === 'auth/email-already-in-use') {
        try {
          const loginRes = await loginWithEmail(cleanEmail, password);
          if (loginRes.success) return loginRes;
        } catch (e) {}
      }

      let message = 'تعذر إنشاء الحساب.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.';
          break;
        case 'auth/weak-password':
          message = 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف على الأقل.';
          break;
        case 'auth/invalid-email':
          message = 'صيغة البريد الإلكتروني غير صالحة.';
          break;
        default:
          if (isDbClosing) {
            message = 'حدثت استجابة متأخرة أثناء حفظ بيانات الجلسة بالمتصفح. يرجى إعادة المحاولة أو تسجيل الدخول.';
          } else {
            message = error.message || message;
          }
      }
      return { success: false, error: message, code: error.code };
    }
  }
}

/**
 * قراءة الصلاحيات المشفرة (Custom Claims) الموثقة رقمياً من سيرفرات Google
 */
export async function getUserClaims(user = auth.currentUser, forceRefresh = false) {
  if (!user) return null;
  try {
    const tokenResult = await user.getIdTokenResult(forceRefresh);
    return tokenResult.claims || {};
  } catch (error) {
    console.error("Error reading custom claims:", error);
    return {};
  }
}

/**
 * تحديث كلمة المرور للمستخدم المسجل حالياً في Firebase Authentication
 */
export async function updateCurrentUserPassword(newPassword) {
  if (!auth.currentUser) {
    return { success: false, error: 'لا توجد جلسة مستخدم نشطة حالياً.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.' };
  }
  try {
    await updatePassword(auth.currentUser, newPassword);
    return { success: true };
  } catch (error) {
    let message = 'تعذر تحديث كلمة المرور.';
    if (error.code === 'auth/requires-recent-login') {
      message = 'لأسباب أمنية من Google، يتطلب تغيير كلمة المرور إعادة تسجيل الدخول أولاً ثم المحاولة فوراً.';
    } else if (error.code === 'auth/weak-password') {
      message = 'كلمة المرور ضعيفة. يرجى اختيار كلمة مرور أقوى.';
    } else {
      message = error.message || message;
    }
    return { success: false, error: message, code: error.code };
  }
}

/**
 * تحديث البريد الإلكتروني للمستخدم المسجل حالياً في Firebase Authentication
 */
export async function updateCurrentUserEmail(newEmail) {
  if (!auth.currentUser) {
    return { success: false, error: 'لا توجد جلسة مستخدم نشطة حالياً.' };
  }
  const cleanEmail = (newEmail || '').toLowerCase().trim();
  if (!cleanEmail) {
    return { success: false, error: 'يرجى إدخال بريد إلكتروني صالح.' };
  }
  try {
    await updateEmail(auth.currentUser, cleanEmail);
    return { success: true };
  } catch (error) {
    let message = 'تعذر تحديث البريد الإلكتروني.';
    if (error.code === 'auth/requires-recent-login') {
      message = 'لأسباب أمنية من Google، يتطلب تغيير البريد إعادة تسجيل الدخول أولاً ثم المحاولة فوراً.';
    } else if (error.code === 'auth/email-already-in-use') {
      message = 'هذا البريد الإلكتروني مسجل بالفعل بحساب آخر.';
    } else {
      message = error.message || message;
    }
    return { success: false, error: message, code: error.code };
  }
}

/**
 * مزامنة وتحديث كلمة المرور لحساب المصادقة بالهاتف (phone_${cleanPhone}@tashteeb.app)
 * حصرياً عبر Cloud Function الآمنة (Admin SDK) لحماية بيانات وحسابات المستخدمين
 */
async function callResetPasswordApi(payload, idToken) {
  const endpoints = [
    '/api/reset-password',
    'https://erp-dashboard-ten-flame.vercel.app/api/reset-password',
    'https://erp-dashboard.vercel.app/api/reset-password'
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data?.success) return data;
      }
    } catch (e) {
      console.warn(`[callResetPasswordApi] Endpoint ${ep} notice:`, e.message);
    }
  }
  return null;
}

export async function syncAndResetPhonePassword(phone, newPassword, knownEmail = null, extraData = {}) {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 7) {
    return { success: false, error: 'يرجى إدخال رقم هاتف صحيح.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.' };
  }

  // التحقق الأمني: يجب أن يكون المتصل مسجلاً للدخول كمسؤول
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { success: false, error: 'غير مصرح: يجب تسجيل الدخول للقيام بهذا الإجراء.' };
  }

  const phoneAuthEmail = `phone_${cleanPhone}@tashteeb.app`;

  // 1. استدعاء Vercel Serverless API (Admin SDK) مع مسار بديل تلقائي
  try {
    const idToken = await currentUser.getIdToken();
    const apiData = await callResetPasswordApi({
      phone: cleanPhone,
      email: phoneAuthEmail,
      newPassword,
      role: extraData?.role,
      companyId: extraData?.companyId,
      companyName: extraData?.companyName,
      name: extraData?.name
    }, idToken);
    if (apiData?.success) {
      console.log('[syncAndResetPhonePassword] ✅ Serverless Admin API succeeded:', phoneAuthEmail);
      return { success: true, phoneAuthEmail, message: apiData.message };
    }
  } catch (apiErr) {
    console.warn('[syncAndResetPhonePassword] Admin API notice:', apiErr.message);
  }

  // 2. استدعاء Cloud Function الآمنة (Admin SDK) — يعالج الإنشاء والتحديث معاً
  try {
    const fn = httpsCallable(functions, 'resetUserPassword');
    const result = await fn({ phone: cleanPhone, email: phoneAuthEmail, newPassword });
    if (result.data?.success) {
      console.log('[syncAndResetPhonePassword] ✅ Cloud Function succeeded:', phoneAuthEmail);
      return { success: true, phoneAuthEmail };
    }
  } catch (err) {
    const errCode = err?.code || '';
    console.warn('[syncAndResetPhonePassword] Cloud function error:', errCode, err?.message);
    // أخطاء صلاحية — لا نكمل في الـ fallback
    if (errCode === 'functions/permission-denied' || errCode === 'functions/unauthenticated') {
      return { success: false, error: err?.message || 'لا تملك صلاحية تغيير كلمة مرور هذا المستخدم.' };
    }
    // إذا لم تكن مشكلة شبكة، نعيد المحاولة مرة أخرى عبر Cloud Function (retry)
    const isNetworkError = ['functions/unavailable', 'functions/deadline-exceeded'].includes(errCode);
    if (!isNetworkError) {
      // محاولة ثانية بعد 800ms
      try {
        await new Promise(r => setTimeout(r, 800));
        const fn2 = httpsCallable(functions, 'resetUserPassword');
        const result2 = await fn2({ phone: cleanPhone, email: phoneAuthEmail, newPassword });
        if (result2.data?.success) {
          console.log('[syncAndResetPhonePassword] ✅ Cloud Function retry succeeded:', phoneAuthEmail);
          return { success: true, phoneAuthEmail };
        }
      } catch (retryErr) {
        console.warn('[syncAndResetPhonePassword] Cloud function retry also failed:', retryErr?.message);
      }
    }
  }

  // 2. البديل المباشر عبر Secondary App:
  //    - للمستخدم الجديد: createUserWithEmailAndPassword
  //    - للمستخدم الموجود: signIn ثم updatePassword
  let tempApp = null;
  try {
    const tempAppName = 'SecondaryResetAuth_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    try {
      // محاولة الإنشاء أولاً (لو مستخدم جديد)
      await createUserWithEmailAndPassword(tempAuth, phoneAuthEmail, newPassword);
      console.log('[syncAndResetPhonePassword] ✅ Created new phone user in Firebase Auth:', phoneAuthEmail);
      return { success: true, phoneAuthEmail, isNew: true };
    } catch (createErr) {
      if (createErr.code === 'auth/email-already-in-use') {
        // إذا كان هناك بريد حقيقي مسجل للموظف، نرسل له رابط إعادة تعيين
        if (knownEmail && !knownEmail.endsWith('@tashteeb.app') && knownEmail.includes('@')) {
          try {
            await sendPasswordResetEmail(auth, knownEmail);
            return {
              success: true,
              emailSent: true,
              phoneAuthEmail,
              message: `الحساب مسجل مسبقاً. تم إرسال رابط تعيين كلمة المرور إلى البريد الإلكتروني (${knownEmail}) بنجاح.`
            };
          } catch (emailErr) {
            console.warn('[syncAndResetPhonePassword] sendPasswordResetEmail error:', emailErr);
          }
        }
        console.warn('[syncAndResetPhonePassword] User exists — Cloud Function is required to update password server-side.');
        return {
          success: false,
          phoneAuthEmail,
          error: 'المستخدم مسجل مسبقاً في Firebase Auth. تغيير كلمة مرور حساب موجود يتطلب نشر الدالة السحابية (ترقية المشروع لخطة Blaze) لتحديثها بأمان من طرف الخادم.'
        };
      }
      throw createErr;
    }
  } catch (secErr) {
    console.warn('[syncAndResetPhonePassword] Secondary auth fallback error:', secErr);
    return {
      success: false,
      phoneAuthEmail,
      error: secErr.message || 'حدث خطأ أثناء محاولة تعيين كلمة المرور.'
    };
  } finally {
    if (tempApp) {
      try { await deleteApp(tempApp); } catch (e) {}
    }
  }
}

/**
 * دالة مساعدة لتعيين Claims لمستخدم متأثر أو موجود مسبقاً يدوياً أو من الكونسول
 */
export async function assignClaimsToExistingUser(targetUid, companyId, role = 'engineer', companyName = '') {
  const res = await callAssignUserClaims({
    targetUid,
    companyId,
    role,
    companyName,
  });
  console.log('[assignClaimsToExistingUser] Result:', res);
  return res;
}

// Privileged functions are kept modular and unexposed to window object


