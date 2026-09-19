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
const db = getFirestore(app);

async function testResolution(email) {
  const cleanEmail = email.toLowerCase().trim();
  console.log(`\nTesting resolution for: ${cleanEmail}`);

  // 1. Check directory
  try {
    const dirSnap = await getDoc(doc(db, "platform_metadata", "users_directory"));
    if (dirSnap.exists()) {
      const data = dirSnap.data();
      const safeKey = cleanEmail.replace(/\./g, '_dot_');
      if (data && (data[safeKey] || data[cleanEmail])) {
        const u = data[safeKey] || data[cleanEmail];
        console.log(`✅ MATCH in users_directory! Company: ${u.companyId}, Role: ${u.role}, Name: ${u.name}`);
        return true;
      }
    }
  } catch (e) {
    console.log("Directory check error:", e.message);
  }

  // 2. Check tenants list
  try {
    const tenantsSnap = await getDoc(doc(db, "platform_metadata", "tenants"));
    if (tenantsSnap.exists()) {
      const list = tenantsSnap.data()?.tenants || [];
      for (const t of list) {
        if (Array.isArray(t.users)) {
          const match = t.users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
          if (match) {
            console.log(`✅ MATCH in tenants list! Company: ${t.id} (${t.name}), Role: ${match.role}, Name: ${match.name}`);
            return true;
          }
        }
      }
    }
  } catch (e) {
    console.log("Tenants check error:", e.message);
  }

  console.log("❌ NOT FOUND in cloud metadata!");
  return false;
}

async function run() {
  // Sign in first to be isAuthenticated
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  console.log("Authenticated with Firebase!");

  const testEmails = [
    "sicolove13@gmail.com",
    "sicolove11@gmail.com",
    "sicolove10@gmail.com",
    "sicolove1@gmail.com",
    "sicolove3@gmail.com",
    "sicolove5@gmail.com",
    "sicolove8@gmail.com",
    "moh398869@gmail.com",
    "eng@amlak-contract.com",
    "supply@amlak-contract.com"
  ];

  for (const e of testEmails) {
    await testResolution(e);
  }

  process.exit(0);
}

run();
