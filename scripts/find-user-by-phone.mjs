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

const targetPhone = "01018160582";

async function search() {
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  console.log("Searching for:", targetPhone);

  // 1. Check users_directory
  const dirSnap = await getDoc(doc(db, "platform_metadata", "users_directory"));
  if (dirSnap.exists()) {
    const data = dirSnap.data();
    for (const [k, v] of Object.entries(data)) {
      const str = JSON.stringify(v);
      if (str.includes(targetPhone) || k.includes(targetPhone)) {
        console.log("Found in users_directory:", k, v);
      }
    }
  }

  // 2. Check tenants
  const tenantsSnap = await getDoc(doc(db, "platform_metadata", "tenants"));
  if (tenantsSnap.exists()) {
    const list = tenantsSnap.data()?.tenants || [];
    for (const t of list) {
      if (JSON.stringify(t).includes(targetPhone)) {
        console.log("Found in tenant:", t.id, t.name, "phone:", t.phone);
        if (Array.isArray(t.users)) {
          t.users.forEach(u => {
            if (JSON.stringify(u).includes(targetPhone)) {
              console.log("Found user in tenant users:", u);
            }
          });
        }
      }
    }
  }

  // 3. Check companies
  const compSnap = await getDocs(collection(db, "companies"));
  compSnap.forEach(d => {
    if (JSON.stringify(d.data()).includes(targetPhone)) {
      console.log("Found in company collection:", d.id);
    }
  });

  console.log("Search finished.");
  process.exit(0);
}

search().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
