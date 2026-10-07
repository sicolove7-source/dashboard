import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM",
  authDomain: "tashteeb-67d13.firebaseapp.com",
  projectId: "tashteeb-67d13",
  storageBucket: "tashteeb-67d13.firebasestorage.app",
  messagingSenderId: "527043598350",
  appId: "1:527043598350:web:8f9119be0ddf9dab04045f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, "us-central1");

async function main() {
  const cred = await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  console.log("Logged in UID:", cred.user.uid, "email:", cred.user.email);

  const fn = httpsCallable(functions, "assignUserClaims");
  const res = await fn({
    targetUid: cred.user.uid,
    role: "super_admin",
    companyId: "comp_c_mtyw7mqk",
    companyName: "شركة أملاك للمقاولات والتشطيبات",
    currency: "ج.م"
  });
  console.log("Result:", JSON.stringify(res.data));

  // Refresh token
  const token = await cred.user.getIdTokenResult(true);
  console.log("Updated Claims:", JSON.stringify(token.claims));
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
