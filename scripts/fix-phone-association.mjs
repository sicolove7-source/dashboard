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

async function fix() {
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  console.log("Authenticated as Super Admin");

  // 1. Clean up dummy companies in platform_metadata/tenants that have 01018160582
  const tenantsRef = doc(db, "platform_metadata", "tenants");
  const tSnap = await getDoc(tenantsRef);
  let tenantsList = tSnap.data()?.tenants || [];

  tenantsList = tenantsList.map(t => {
    // Keep 01018160582 ONLY for Amlak / sicolove7
    if (t.id === "comp_c_mtyw7mqk" || t.adminEmail === "sicolove7@gmail.com") {
      return {
        ...t,
        phone: "01018160582",
        cleanPhone: "01018160582"
      };
    }
    // Remove from dummy companies
    if (t.phone === "01018160582") {
      console.log(`Removing duplicate phone from dummy tenant: ${t.id} (${t.name})`);
      return {
        ...t,
        phone: null,
        cleanPhone: null
      };
    }
    return t;
  });

  await setDoc(tenantsRef, {
    tenants: tenantsList,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log("✅ Updated platform_metadata/tenants");

  // 2. Set phone_01018160582 in users_directory to point to sicolove7@gmail.com
  const usersDirRef = doc(db, "platform_metadata", "users_directory");
  const dirSnap = await getDoc(usersDirRef);
  const dirData = dirSnap.data() || {};

  dirData["phone_01018160582"] = {
    id: "super_admin_master",
    email: "sicolove7@gmail.com",
    name: "احمد - مدير شركة أملاك",
    phone: "01018160582",
    cleanPhone: "01018160582",
    role: "super_admin",
    companyId: "comp_c_mtyw7mqk",
    companyName: "شركة أملاك للمقاولات والتشطيبات",
    updatedAt: new Date().toISOString()
  };

  // Also ensure sicolove7 has phone
  dirData["sicolove7@gmail_dot_com"] = {
    ...(dirData["sicolove7@gmail_dot_com"] || {}),
    id: "super_admin_master",
    email: "sicolove7@gmail.com",
    name: "احمد - مدير شركة أملاك",
    phone: "01018160582",
    cleanPhone: "01018160582",
    role: "super_admin",
    companyId: "comp_c_mtyw7mqk",
    companyName: "شركة أملاك للمقاولات والتشطيبات",
    updatedAt: new Date().toISOString()
  };

  await setDoc(usersDirRef, dirData, { merge: true });
  console.log("✅ Updated users_directory: phone_01018160582 -> sicolove7@gmail.com");

  process.exit(0);
}

fix().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
