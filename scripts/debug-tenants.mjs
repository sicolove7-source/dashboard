import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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

async function main() {
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");

  // Check tenants collection
  try {
    const snap = await getDocs(collection(db, "tenants"));
    console.log("tenants collection size:", snap.size);
    snap.forEach(d => console.log("TENANT doc:", d.id, JSON.stringify(d.data())));
  } catch (e) {
    console.log("tenants collection error:", e.message);
  }

  // Check companies/comp_300 or companies/comp_bbfdd
  const testIds = ["comp_300", "comp_bbfdd", "comp_dddvbvbb", "comp_jkk", "comp_mpo1"];
  for (const cid of testIds) {
    try {
      const snap = await getDoc(doc(db, "companies", cid));
      if (snap.exists()) {
        const d = snap.data();
        console.log(`FOUND company ${cid}:`, "adminEmail=", d.adminEmail, "adminName=", d.adminName, "phone=", d.phone, "settings=", JSON.stringify(d.settings || {}), "users=", JSON.stringify(d.users || []));
      } else {
        console.log(`Company doc ${cid} NOT found in companies/`);
      }
    } catch (e) {
      console.log(`Error getting ${cid}:`, e.message);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
