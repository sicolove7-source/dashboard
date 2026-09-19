import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

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

async function check() {
  console.log("Checking Firestore...");
  // Try signing in with admin
  try {
    await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
    console.log("Signed in with 123456");
  } catch (e) {
    try {
      await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "12345678");
      console.log("Signed in with 12345678");
    } catch (e2) {
      console.log("Could not sign in with known passwords:", e2.message);
    }
  }

  // 1. Check platform_metadata/tenants
  try {
    const snap = await getDoc(doc(db, "platform_metadata", "tenants"));
    if (snap.exists()) {
      const data = snap.data();
      console.log("platform_metadata/tenants exists! Number of tenants:", data.tenants?.length);
      (data.tenants || []).forEach(t => {
        console.log(`- Tenant: ${t.id} (${t.name}), admin: ${t.adminEmail}, users count: ${t.users?.length || 0}`);
        if (t.users?.length) {
          t.users.forEach(u => console.log(`    user: ${u.email} (${u.name}, role: ${u.role})`));
        }
      });
    } else {
      console.log("platform_metadata/tenants does NOT exist");
    }
  } catch (e) {
    console.error("Error reading platform_metadata/tenants:", e.message);
  }

  // 2. Check companies/comp_c_mtyw7mqk
  try {
    const snap = await getDoc(doc(db, "companies", "comp_c_mtyw7mqk"));
    if (snap.exists()) {
      const data = snap.data();
      console.log("companies/comp_c_mtyw7mqk exists! users count:", data.users?.length || 0);
      if (data.users?.length) {
        data.users.forEach(u => console.log(`    user: ${u.email} (${u.name}, role: ${u.role})`));
      }
    } else {
      console.log("companies/comp_c_mtyw7mqk does NOT exist");
    }
  } catch (e) {
    console.error("Error reading companies/comp_c_mtyw7mqk:", e.message);
  }

  process.exit(0);
}

check();
