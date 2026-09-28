import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
const db = getFirestore(app);

async function inspect() {
  console.log("Signing in with admin@alnoor77.com...");
  try {
    const cred = await signInWithEmailAndPassword(auth, "admin@alnoor77.com", "Noor123456");
    console.log("Signed in successfully! UID:", cred.user.uid);
  } catch (e) {
    console.error("Sign in failed:", e.message);
    process.exit(1);
  }

  // 1. Check companies/comp_alnoor77
  try {
    const snap = await getDoc(doc(db, "companies", "comp_alnoor77"));
    if (snap.exists()) {
      console.log("companies/comp_alnoor77 EXISTS:");
      console.log(JSON.stringify(snap.data(), null, 2));
    } else {
      console.log("companies/comp_alnoor77 does NOT exist!");
    }
  } catch (e) {
    console.error("Error reading companies/comp_alnoor77:", e.message);
  }

  // 2. Check tenant_directory/alnoor77
  try {
    const snap = await getDoc(doc(db, "tenant_directory", "alnoor77"));
    if (snap.exists()) {
      console.log("tenant_directory/alnoor77 EXISTS:");
      console.log(JSON.stringify(snap.data(), null, 2));
    } else {
      console.log("tenant_directory/alnoor77 does NOT exist!");
    }
  } catch (e) {
    console.error("Error reading tenant_directory/alnoor77:", e.message);
  }

  process.exit(0);
}

inspect();
