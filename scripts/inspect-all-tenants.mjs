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
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  const snap = await getDoc(doc(db, "platform_metadata", "tenants"));
  const tenants = snap.data()?.tenants || [];
  console.log(`Total tenants: ${tenants.length}`);
  tenants.forEach((t, i) => {
    console.log(`[${i}] ID: ${t.id}, Name: ${t.name}, AdminEmail: ${t.adminEmail}, Phone: ${t.phone}`);
  });
  process.exit(0);
}

inspect();
