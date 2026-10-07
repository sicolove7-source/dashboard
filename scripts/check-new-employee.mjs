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

async function check() {
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");

  // Check tenants
  const tSnap = await getDoc(doc(db, "platform_metadata", "tenants"));
  const tenants = tSnap.data().tenants || [];
  const amlak = tenants.find(t => t.id === "comp_c_mtyw7mqk");

  console.log("=== platform_metadata/tenants (amlak) users ===");
  (amlak.users || []).forEach(u => console.log(`- ${u.name} | phone: ${u.phone} | email: ${u.email} | role: ${u.role}`));

  // Check companies/comp_c_mtyw7mqk
  const compSnap = await getDoc(doc(db, "companies", "comp_c_mtyw7mqk"));
  const compData = compSnap.data() || {};
  console.log("\n=== companies/comp_c_mtyw7mqk users ===");
  (compData.users || []).forEach(u => console.log(`- ${u.name} | phone: ${u.phone} | email: ${u.email} | role: ${u.role}`));

  process.exit(0);
}

check().catch(console.error);
