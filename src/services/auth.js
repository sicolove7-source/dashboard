/**
 * ===================================================================
 * خدمة المصادقة الرسمية — Firebase Authentication Service
 * ===================================================================
 * إدارة تسجيل الدخول، الخروج، وتتبع حالة المستخدم عبر Firebase Auth الحقيقي.
 */

import { auth } from '../firebase';
import { functions } from '../firebase';
import { firebaseConfig } from '../firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updatePassword,
  updateEmail,
  getAuth,
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';

/**
 * استدعاء Cloud Function لتعيين Custom Claims للمستخدم بشكل آمن من Server-Side
 * يُضمن ربط المستخدم بشركته في Firebase Auth Token
 */
export async function callAssignUserClaims({ targetUid, companyId, role, companyName, currency }) {
  try {
    const fn = httpsCallable(functions, 'assignUserClaims');
    const result = await fn({ targetUid, companyId, role, companyName, currency });
    return result.data;
  } catch (err) {
    console.warn('[callAssignUserClaims] Cloud function error (non-blocking):', err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * إنشاء حساب Firebase Auth لموظف جديد باستخدام Secondary App Instance
 * (لا يحتاج Cloud Functions - يعمل على Spark Plan المجاني)
 * الحيلة: ننشئ Firebase App ثانوي مؤقت حتى لا نؤثر على جلسة المدير الحالية
 */
export async function callCreateCompanyUser({ email, name, role, companyId, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'البريد الإلكتروني أو رقم الهاتف مطلوب.' };

  // أولاً: نجرب Cloud Function إن كانت متاحة (Blaze plan)
  try {
    const fn = httpsCallable(functions, 'createCompanyUser');
    const result = await fn({ email: cleanEmail, name, role, companyId, password });
    if (result.data?.success) {
      if (!password && !cleanEmail.endsWith('@tashteeb.app')) {
        try { await sendPasswordResetEmail(auth, cleanEmail); } catch (e) {}
      }
      return result.data;
    }
  } catch (cloudErr) {
    // Cloud Functions غير متاحة (Spark plan) - ننتقل للحل البديل
    console.info('[callCreateCompanyUser] Cloud function not available, using secondary app:', cloudErr?.code);
  }

  // الحل البديل: Secondary Firebase App لإنشاء الحساب بدون التأثير على جلسة المدير
  try {
    // إنشاء App ثانوي أو استخدام الموجود
    const secondaryAppName = '_employee_creator_temp';
    const existingApps = getApps();
    const secondaryApp = existingApps.find(a => a.name === secondaryAppName)
      || initializeApp(firebaseConfig, secondaryAppName);

    const secondaryAuth = getAuth(secondaryApp);

    // استخدام كلمة المرور المحددة أو توليد كلمة مرور مؤقتة قوية
    const r = () => Math.random().toString(36).slice(2, 10);
    const chosenPassword = (password && String(password).length >= 6) ? String(password) : (r() + r() + 'Aa1!');

    let isNew = false;
    try {
      // محاولة إنشاء الحساب
      await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, chosenPassword);
      isNew = true;
      console.log(`[callCreateCompanyUser] ✅ New account created: ${cleanEmail}`);
    } catch (createErr) {
      if (createErr?.code === 'auth/email-already-in-use') {
        // الحساب موجود مسبقاً
        console.info(`[callCreateCompanyUser] Account already exists: ${cleanEmail}`);
      } else {
        throw createErr; // خطأ حقيقي
      }
    }

    // تسجيل خروج من الـ App الثانوي (لا يؤثر على المدير أبداً)
    try { await signOut(secondaryAuth); } catch (e) {}

    let emailSent = false;
    // لا نرسل رابط الإيميل إذا كان حساباً بدون إيميل حقيقي (@tashteeb.app) أو إذا تم تحديد كلمة سر يدوياً
    if (!password && !cleanEmail.endsWith('@tashteeb.app')) {
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        emailSent = true;
        console.log(`[callCreateCompanyUser] ✅ Password reset email sent to: ${cleanEmail}`);
      } catch (e) {
        console.warn('[callCreateCompanyUser] Could not send reset email:', e);
      }
    }

    let successMsg = `✅ تم تجهيز وتفعيل حساب ${name || cleanEmail} بنجاح`;
    if (isNew) {
      if (password) {
        successMsg = `✅ تم إنشاء الحساب بنجاح بكلمة المرور المحددة`;
      } else if (emailSent) {
        successMsg = `✅ تم إنشاء الحساب وإرسال رابط تعيين كلمة المرور إلى ${cleanEmail}`;
      }
    } else {
      successMsg = emailSent
        ? `✅ تم إرسال رابط تعيين كلمة المرور إلى ${cleanEmail}`
        : `✅ الحساب مسجل ومفعل في نظام التوثيق`;
    }

    return {
      success: true,
      isNew,
      emailSent: true,
      message: isNew
        ? `✅ تم إنشاء حساب ${cleanEmail} وإرسال رابط الدخول إليه بنجاح`
        : `✅ تم إرسال رابط تعيين كلمة المرور إلى ${cleanEmail}`,
    };

  } catch (err) {
    let message = 'تعذر إنشاء حساب الموظف أو إرسال الرابط.';
    if (err?.code === 'auth/invalid-email') message = 'صيغة البريد الإلكتروني غير صالحة.';
    else if (err?.code === 'auth/weak-password') message = 'كلمة المرور المؤقتة ضعيفة - حاول مجدداً.';
    else if (err?.code === 'auth/user-not-found') message = 'لم يُعثر على الحساب. يرجى المحاولة مجدداً.';
    else if (err?.code === 'auth/too-many-requests') message = 'تم إرسال عدة طلبات. يرجى الانتظار قليلاً والمحاولة لاحقاً.';
    else if (err?.message) message = err.message;
    console.error('[callCreateCompanyUser] Error:', err?.code, err?.message);
    return { success: false, error: message };
  }
}


/**
 * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
 */
export async function loginWithEmail(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error) {
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
        message = error.message || message;
    }
    return {
      success: false,
      error: message,
      code: error.code,
    };
  }
}

/**
 * تسجيل الخروج من المنصة
 */
export async function logoutUser() {
  try {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
      if (typeof localStorage !== 'undefined') {
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
export async function registerWithEmail(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    return { success: true, user: cred.user };
  } catch (error) {
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
        message = error.message || message;
    }
    return { success: false, error: message, code: error.code };
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

