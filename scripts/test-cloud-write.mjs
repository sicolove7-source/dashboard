import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM",
  authDomain: "tashteeb-67d13.firebaseapp.com",
  projectId: "tashteeb-67d13",
  storageBucket: "tashteeb-67d13.firebasestorage.app",
  messagingSenderId: "527043598350",
  appId: "1:527043598350:web:8f9119be0ddf9dab04045f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function test() {
  console.log("=== Testing Firestore Write ===");
  // 1. Unauthenticated write test
  try {
    await setDoc(doc(db, "platform_metadata", "tenants"), {
      testField: "unauth_test_" + Date.now()
    }, { merge: true });
    console.log("Unauthenticated write to platform_metadata/tenants: SUCCESS");
  } catch (e) {
    console.log("Unauthenticated write to platform_metadata/tenants FAILED:", e.message);
  }

  // 2. Authenticated write test
  try {
    await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
    console.log("Signed in as sicolove7@gmail.com");
    await setDoc(doc(db, "platform_metadata", "tenants"), {
      testField: "auth_test_" + Date.now()
    }, { merge: true });
    console.log("Authenticated write to platform_metadata/tenants: SUCCESS");
  } catch (e) {
    console.log("Authenticated write failed:", e.message);
  }
}

test().catch(console.error);
