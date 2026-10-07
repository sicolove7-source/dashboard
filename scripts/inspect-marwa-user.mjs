import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM",
  authDomain: "tashteeb-67d13.firebaseapp.com",
  projectId: "tashteeb-67d13",
  storageBucket: "tashteeb-67d13.firebasestorage.app",
  messagingSenderId: "527043598350",
  appId: "1:527043598350:web:8f9119be0ddf9dab04045f"
};

import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  console.log("Signed in as admin!");
  // Check users_directory for 010161616022
  console.log('1. Checking users_directory...');
  const phoneKeys = ['010161616022', '+2010161616022', '2010161616022', 'phone_010161616022'];
  for (const k of phoneKeys) {
    const snap = await getDoc(doc(db, "users_directory", k));
    if (snap.exists()) {
      console.log(`Found in users_directory/${k}:`, snap.data());
    }
  }

  // Check company comp_c_mtyw7mqk
  console.log('\n2. Checking company comp_c_mtyw7mqk users...');
  const compSnap = await getDoc(doc(db, "companies", "comp_c_mtyw7mqk"));
  if (compSnap.exists()) {
    const data = compSnap.data();
    console.log('Company name:', data.name);
    const users = data.users || [];
    console.log('Users count:', users.length);
    users.forEach(u => {
      console.log(`User: ${u.name} | email: ${u.email} | phone: ${u.phone} | role: ${u.role} | status: ${u.status}`);
    });
  } else {
    console.log('Company comp_c_mtyw7mqk not found');
  }

  process.exit(0);
}

run().catch(console.error);
