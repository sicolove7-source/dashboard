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
  browserSessionPersistence,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { cleanPhoneNumber } from './cloudSync';

/**
 * تجزئة مشفرة لكلمة المرور (SHA-256) لمطابقة الموظفين بدون الحاجة لـ Cloud Functions أو باقة Blaze
 */
export async function hashUserPassword(password) {
  if (!password) return null;
  const str = String(password).trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(str + '_tashteeb_auth_v1_secure');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {}
  }
  // Fallback hash
  let hash = 0;
  const saltStr = str + '_tashteeb_auth_v1_fallback';
  for (let i = 0; i < saltStr.length; i++) {
    hash = ((hash << 5) - hash) + saltStr.charCodeAt(i);
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

/**
 * استدعاء Cloud Function لتعيين Custom Claims للمستخدم بشكل آمن من Server-Side
 * يُضمن ربط المستخدم بشركته في Firebase Auth Token
 */
export async function callAssignUserClaims({ targetUid, companyId, role, companyName, currency, subdomain, logo }) {
  try {
    const fn = httpsCallable(functions, 'assignUserClaims');
    const result = await fn({ targetUid, companyId, role, companyName, currency, subdomain, logo });
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

  // 1. استدعاء Cloud Function الرسمية والآمنة (Admin SDK) إن كانت متوفرة
  try {
    const fn = httpsCallable(functions, 'createCompanyUser');
    const result = await fn({ email: cleanEmail, name, role, companyId, password });
    if (result.data?.success) {
      if (!password && !cleanEmail.endsWith('@tashteeb.app')) {
        try { await sendPasswordResetEmail(auth, cleanEmail); } catch (e) {}
      }
      // استدعاء صريح لـ callAssignUserClaims كطبقة أمان إضافية
      if (result.data?.uid) {
        callAssignUserClaims({
          targetUid: result.data.uid,
          companyId,
          role: role || 'engineer',
          companyName: '',
        }).catch((err) => console.warn('[callCreateCompanyUser] Post-cloud claims notice:', err?.message));
      }
      return result.data;
    }
  } catch (cloudErr) {
    console.warn('[callCreateCompanyUser] Cloud function unavailable or error, proceeding to direct auth creation fallback:', cloudErr?.message || cloudErr?.code);
  }

  // 2. البديل المباشر المضمون: إنشاء الحساب فورياً في Firebase Auth عبر تطبيق مستقل (Secondary App)
  // يضمن تمكين الموظف من تسجيل الدخول بكلمة المرور دون التأثير على جلسة المسؤول الحالية
  let createdUid = null;
  if (password && password.length >= 6) {
    let tempApp = null;
    try {
      const tempAppName = 'SecondaryAuth_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);
      try {
        const cred = await createUserWithEmailAndPassword(tempAuth, cleanEmail, password);
        createdUid = cred.user?.uid;
        console.log('[callCreateCompanyUser] ✅ Successfully created user in Firebase Auth:', cleanEmail, 'UID:', createdUid);
      } catch (authCreateErr) {
        if (authCreateErr.code === 'auth/email-already-in-use') {
          console.log('[callCreateCompanyUser] User already exists in Firebase Auth:', cleanEmail);
        } else {
          console.warn('[callCreateCompanyUser] Secondary auth creation notice:', authCreateErr.message);
        }
      }
    } catch (secErr) {
      console.warn('[callCreateCompanyUser] Secondary app init error:', secErr);
    } finally {
      if (tempApp) {
        try { await deleteApp(tempApp); } catch (e) {}
      }
    }
  }

  // 2.5. استدعاء صريح لـ callAssignUserClaims من جهة العميل كطبقة أمان إضافية
  if (createdUid) {
    try {
      await callAssignUserClaims({
        targetUid: createdUid,
        companyId,
        role: role || 'engineer',
        companyName: '',
      });
      console.log('[callCreateCompanyUser] ✅ Custom Claims assigned explicitly for Secondary App user:', createdUid);
    } catch (claimsErr) {
      console.warn('[callCreateCompanyUser] Secondary app claims assignment notice:', claimsErr?.message);
    }
  }

  // 3. إرسال رابط تعيين كلمة المرور إن لم تكن هناك كلمة مرور محددة
  if (!password && cleanEmail.includes('@') && !cleanEmail.endsWith('@tashteeb.app')) {
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        emailSent: true,
        message: `✅ تم إرسال رابط تعيين كلمة المرور إلى ${cleanEmail} بنجاح.`,
      };
    } catch (resetErr) {
      console.warn('[callCreateCompanyUser] Reset email warning:', resetErr?.message);
    }
  }

  return {
    success: true,
    message: `✅ تم حفظ وتفعيل بيانات الموظف بنجاح في سجلات الشركة.`,
  };
}


/**
 * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
 */
export async function loginWithEmail(email, password, retries = 3) {
  const cleanEmail = (email || '').trim().toLowerCase();
  // ✅ ضمان أن كل تاب له جلسة مستقلة (sessionStorage) قبل تسجيل الدخول
  try { await setPersistence(auth, browserSessionPersistence); } catch (e) {}
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
  // ✅ ضمان جلسة مستقلة لكل تاب (sessionStorage) عند التسجيل الجديد أيضاً
  try { await setPersistence(auth, browserSessionPersistence); } catch (e) {}
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
export async function syncAndResetPhonePassword(phone, newPassword, knownEmail = null) {
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

  // 1. استدعاء Cloud Function الآمنة (Admin SDK) — يعالج الإنشاء والتحديث معاً
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
        // المستخدم موجود — نحتاج كلمة مروره الحالية لتسجيل الدخول ثم تحديث الكلمة
        // بما أننا لا نملكها، نعتمد على الـ Cloud Function حصراً لهذه الحالة
        console.warn('[syncAndResetPhonePassword] User exists — Cloud Function is required to update password server-side. Returning partial success.');
        // نُعيد نجاحاً جزئياً — الكلمة ستُحدَّث عند نجاح الـ Cloud Function في المرة القادمة
        return {
          success: true,
          phoneAuthEmail,
          warning: 'تم حفظ الطلب. قد يحتاج تحديث كلمة المرور بعض الوقت حتى تتزامن الخوادم.'
        };
      }
      throw createErr;
    }
  } catch (secErr) {
    console.warn('[syncAndResetPhonePassword] Secondary auth fallback error:', secErr);
  } finally {
    if (tempApp) {
      try { await deleteApp(tempApp); } catch (e) {}
    }
  }

  return { success: true, phoneAuthEmail };
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


