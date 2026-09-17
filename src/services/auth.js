/**
 * ===================================================================
 * خدمة المصادقة الرسمية — Firebase Authentication Service
 * ===================================================================
 * إدارة تسجيل الدخول، الخروج، وتتبع حالة المستخدم عبر Firebase Auth الحقيقي.
 */

import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

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
