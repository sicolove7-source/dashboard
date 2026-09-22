import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

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

async function main() {
  // Login
  try {
    await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
    console.log("Signed in as sicolove7@gmail.com");
  } catch (e) {
    console.log("Login failed:", e.message);
    process.exit(1);
  }

  // Fetch cloud tenants
  const snap = await getDoc(doc(db, "platform_metadata", "tenants"));
  if (!snap.exists()) {
    console.log("platform_metadata/tenants does NOT exist!");
    process.exit(1);
  }

  const cloudList = snap.data().tenants || [];
  console.log("Cloud tenants count:", cloudList.length);

  // Read the existing defaultTenantsData.json
  const existing = JSON.parse(fs.readFileSync("./src/services/defaultTenantsData.json", "utf8"));
  console.log("Existing defaultTenantsData.json count:", existing.length);

  // Merge: start with cloud, then add any local-only tenants that are NOT in cloud
  const cloudIds = new Set(cloudList.map(t => t.id));
  const localOnly = existing.filter(t => t.id && !cloudIds.has(t.id));
  
  let merged = [...cloudList];
  localOnly.forEach(t => {
    merged.push(t);
  });

  console.log(`Merged count: ${merged.length} (cloud: ${cloudList.length} + local-only: ${localOnly.length})`);

  // Strip sensitive data (passwords) from stored defaults
  const safe = merged.map(t => {
    const clean = { ...t };
    // Remove plaintext passwords
    if (clean.adminPassword && !clean.adminPassword.startsWith('$sha256$')) {
      delete clean.adminPassword;
    }
    return clean;
  });

  fs.writeFileSync("./src/services/defaultTenantsData.json", JSON.stringify(safe, null, 2), "utf8");
  console.log("✅ defaultTenantsData.json updated with", safe.length, "tenants!");
}

main().catch(console.error);
