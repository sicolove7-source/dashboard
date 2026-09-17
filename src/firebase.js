import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

export const firebaseConfig = {
  apiKey: "AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM",
  authDomain: "tashteeb-67d13.firebaseapp.com",
  projectId: "tashteeb-67d13",
  storageBucket: "tashteeb-67d13.firebasestorage.app",
  messagingSenderId: "527043598350",
  appId: "1:527043598350:web:8f9119be0ddf9dab04045f",
  measurementId: "G-YZMD37BDMZ"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// تفعيل التخزين الدائم للعمل بدون إنترنت (Firestore Offline Persistence)
// في Firebase 12 modular API يتم استخدام persistentLocalCache مع persistentMultipleTabManager
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  // في حال إعادة التحميل السريع (Vite HMR) أو التهيئة المسبقة
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);
export const functions = getFunctions(app);

// المصادقة المجهولة لا تُطلب إلا عند الحاجة فقط (مثل رفع وسائط لزائر غير مسجل)
export async function ensureAnonymousAuth() {
  if (typeof window !== 'undefined' && auth && !auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      // Non-blocking if anonymous auth is not enabled in console
    }
  }
}

export default app;
