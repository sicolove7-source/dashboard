import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

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

async function syncAll() {
  console.log("🚀 Starting complete Firestore synchronization...");

  // Sign in as superadmin
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  console.log("✅ Authenticated as Super Admin: sicolove7@gmail.com");

  // 1. Read all companies
  const companiesSnap = await getDocs(collection(db, "companies"));
  const companyUsersMap = new Map();

  companiesSnap.docs.forEach(dDoc => {
    const cId = dDoc.id;
    const data = dDoc.data();
    if (Array.isArray(data.users) && data.users.length > 0) {
      console.log(`Found company ${cId} with ${data.users.length} users in Firestore`);
      companyUsersMap.set(cId, data.users);
    }
  });

  // 2. Read platform_metadata/tenants
  const tenantsRef = doc(db, "platform_metadata", "tenants");
  const tenantsSnap = await getDoc(tenantsRef);
  let tenantsList = [];
  if (tenantsSnap.exists()) {
    tenantsList = tenantsSnap.data()?.tenants || [];
  }

  // Build users directory
  const usersDir = {};

  tenantsList = tenantsList.map(t => {
    const users = companyUsersMap.get(t.id) || t.users || [];
    const authorizedEmails = [
      ...(t.adminEmail ? [t.adminEmail.toLowerCase().trim()] : []),
      ...users.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean)
    ];
    const uniqueAuthEmails = Array.from(new Set(authorizedEmails));

    users.forEach(u => {
      if (u.email) {
        const cleanE = u.email.toLowerCase().trim();
        const safeKey = cleanE.replace(/\./g, '_dot_');
        usersDir[safeKey] = {
          id: u.id || '',
          email: cleanE,
          name: u.name || '',
          role: u.role || 'engineer',
          engineerName: u.engineerName || null,
          companyId: t.id,
          companyName: t.name || '',
          updatedAt: new Date().toISOString()
        };
      }
    });

    if (t.adminEmail) {
      const cleanAdmin = t.adminEmail.toLowerCase().trim();
      const safeKey = cleanAdmin.replace(/\./g, '_dot_');
      if (!usersDir[safeKey]) {
        usersDir[safeKey] = {
          id: `u_${t.id}_admin`,
          email: cleanAdmin,
          name: t.adminName || 'مدير الشركة',
          role: 'owner',
          companyId: t.id,
          companyName: t.name || '',
          updatedAt: new Date().toISOString()
        };
      }
    }

    return {
      ...t,
      users: users,
      authorizedEmails: uniqueAuthEmails
    };
  });

  // 3. Save updated platform_metadata/tenants
  await setDoc(tenantsRef, {
    tenants: tenantsList,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log("✅ Updated platform_metadata/tenants with all company users and authorized emails!");

  // 4. Save platform_metadata/users_directory
  const usersDirRef = doc(db, "platform_metadata", "users_directory");
  await setDoc(usersDirRef, usersDir, { merge: true });
  console.log(`✅ Updated platform_metadata/users_directory with ${Object.keys(usersDir).length} users!`);

  // 5. Update companies docs with authorizedEmails
  for (const [cId, users] of companyUsersMap.entries()) {
    const authEmails = Array.from(new Set(users.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean)));
    await setDoc(doc(db, "companies", cId), {
      authorizedEmails: authEmails,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`✅ Updated companies/${cId} with ${authEmails.length} authorizedEmails`);
  }

  console.log("🎉 All Firestore documents synchronized successfully!");
  process.exit(0);
}

syncAll().catch(err => {
  console.error("❌ Sync error:", err);
  process.exit(1);
});
