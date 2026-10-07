import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

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

async function sync() {
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  console.log("Signed in as admin!");

  // 1. Get tenants
  const tSnap = await getDoc(doc(db, "platform_metadata", "tenants"));
  const tenants = tSnap.data().tenants || [];
  const amlakTenant = tenants.find(t => t.id === "comp_c_mtyw7mqk");

  if (!amlakTenant) {
    console.error("Tenant comp_c_mtyw7mqk not found in platform_metadata");
    process.exit(1);
  }

  console.log(`Found amlak tenant with ${amlakTenant.users?.length} users in metadata.`);
  const marwaInMeta = amlakTenant.users?.find(u => u.phone === "010161616022" || u.email?.includes("010161616022"));
  console.log("Marwa in metadata:", marwaInMeta);

  // 2. Update companies/comp_c_mtyw7mqk
  const compRef = doc(db, "companies", "comp_c_mtyw7mqk");
  const compSnap = await getDoc(compRef);
  const currentCompData = compSnap.data() || {};
  const compUsers = currentCompData.users || [];

  // Check if Marwa already in compUsers
  const idx = compUsers.findIndex(u => u.phone === "010161616022" || u.email?.includes("010161616022"));
  if (idx !== -1) {
    compUsers[idx] = marwaInMeta;
  } else {
    compUsers.push(marwaInMeta);
  }

  const authorizedEmails = compUsers.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean);
  if (!authorizedEmails.includes("phone_010161616022@tashteeb.app")) {
    authorizedEmails.push("phone_010161616022@tashteeb.app");
  }

  await updateDoc(compRef, {
    users: compUsers,
    authorizedEmails: authorizedEmails,
    updatedAt: new Date().toISOString()
  });

  console.log("✅ Successfully updated companies/comp_c_mtyw7mqk with Marwa! Total users:", compUsers.length);
  process.exit(0);
}

sync().catch(console.error);
