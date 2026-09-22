import { initializeApp } from "firebase/app";
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
const db = getFirestore(app);

async function main() {
  const snap = await getDoc(doc(db, "platform_metadata", "tenants"));
  if (snap.exists()) {
    const list = snap.data().tenants || [];
    console.log("=== platform_metadata/tenants (count: " + list.length + ") ===");
    list.forEach((t, i) => {
      console.log(`${i+1}. [${t.id}] "${t.name}" (sub: ${t.subdomain || "none"}, email: ${t.adminEmail}, created: ${t.createdAt || t.startDate})`);
    });
  } else {
    console.log("platform_metadata/tenants does not exist!");
  }

  // Also check companies collection in Firestore!
  console.log("\n=== Checking Firestore collection: 'companies' ===");
  try {
    const compCol = collection(db, "companies");
    const compSnap = await getDocs(compCol);
    console.log("Total docs in 'companies' collection:", compSnap.size);
    compSnap.forEach(d => {
      const data = d.data();
      console.log(`- Doc [${d.id}]: name="${data?.settings?.companyName || data?.name || 'N/A'}"`);
    });
  } catch (e) {
    console.log("Error checking companies collection:", e.message);
  }

  // Also check tenant_directory
  console.log("\n=== Checking Firestore collection: 'tenant_directory' ===");
  try {
    const dirCol = collection(db, "tenant_directory");
    const dirSnap = await getDocs(dirCol);
    console.log("Total docs in 'tenant_directory' collection:", dirSnap.size);
    dirSnap.forEach(d => {
      const data = d.data();
      console.log(`- Subdomain [${d.id}]: companyId="${data?.companyId}", name="${data?.name}"`);
    });
  } catch (e) {
    console.log("Error checking tenant_directory:", e.message);
  }
}

main().catch(console.error);
