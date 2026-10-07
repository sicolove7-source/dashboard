import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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

async function stamp() {
  console.log("Signing in...");
  for (const p of ["123456", "12345678"]) {
    try {
      await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", p);
      console.log(`Signed in successfully with ${p}!`);
      break;
    } catch (e) {}
  }

  const registrationISO = "2026-09-12T21:24:11.612Z";
  console.log(`Stamping comp_c_mtyw7mqk with registration time: ${registrationISO}`);

  // 1. Update companies/comp_c_mtyw7mqk document
  try {
    const compRef = doc(db, "companies", "comp_c_mtyw7mqk");
    await setDoc(compRef, {
      createdAt: registrationISO,
      registeredAt: registrationISO,
    }, { merge: true });
    console.log("Successfully updated companies/comp_c_mtyw7mqk");
  } catch (err) {
    console.error("Failed to update companies/comp_c_mtyw7mqk:", err.message);
  }

  // 2. Update platform_metadata/tenants
  try {
    const metaRef = doc(db, "platform_metadata", "tenants");
    const snap = await getDoc(metaRef);
    if (snap.exists()) {
      const data = snap.data();
      let tenants = data.tenants || [];
      let updated = false;
      tenants = tenants.map(t => {
        if (t.id === "comp_c_mtyw7mqk" || t.id === "c_mtyw7mqk") {
          updated = true;
          return {
            ...t,
            createdAt: registrationISO,
            registeredAt: registrationISO,
          };
        }
        return t;
      });
      if (updated) {
        await setDoc(metaRef, { tenants }, { merge: true });
        console.log("Successfully updated platform_metadata/tenants");
      }
    }
  } catch (err) {
    console.error("Failed to update platform_metadata/tenants:", err.message);
  }

  console.log("Done stamping!");
  process.exit(0);
}

stamp().catch(err => {
  console.error("Stamp script error:", err);
  process.exit(1);
});
