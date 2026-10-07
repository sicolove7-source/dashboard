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

async function findUser() {
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  const snap = await getDoc(doc(db, "platform_metadata", "tenants"));
  if (snap.exists()) {
    const tenants = snap.data().tenants || [];
    console.log(`Searching across ${tenants.length} tenants...`);
    let found = [];
    for (const t of tenants) {
      const users = t.users || [];
      for (const u of users) {
        const uStr = JSON.stringify(u);
        if (uStr.includes("010161616022") || uStr.includes("مروة") || uStr.includes("marwa")) {
          found.push({ tenant: t.id, tenantName: t.name, user: u });
        }
      }
    }
    console.log("Search result:", JSON.stringify(found, null, 2));
  }
  process.exit(0);
}

findUser().catch(console.error);
