import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM',
  authDomain: 'tashteeb-67d13.firebaseapp.com',
  projectId: 'tashteeb-67d13',
  storageBucket: 'tashteeb-67d13.firebasestorage.app',
  messagingSenderId: '527043598350',
  appId: '1:527043598350:web:8f9119be0ddf9dab04045f'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function restore() {
  await signInWithEmailAndPassword(auth, 'sicolove7@gmail.com', '123456');

  // 1. Get current metadata
  const tSnap = await getDoc(doc(db, 'platform_metadata', 'tenants'));
  const currentTenants = tSnap.data()?.tenants || [];
  const tenantMap = new Map();
  currentTenants.forEach(t => tenantMap.set(t.id, t));

  // 2. Fetch all from tenant_directory
  const tdSnap = await getDocs(collection(db, 'tenant_directory'));
  for (const d of tdSnap.docs) {
    const td = d.data();
    const cId = td.companyId || `comp_${d.id}`;
    if (!tenantMap.has(cId)) {
      // Fetch company doc to get latest settings/users
      const cSnap = await getDoc(doc(db, 'companies', cId));
      const cData = cSnap.exists() ? cSnap.data() : {};
      
      const newEntry = {
        id: cId,
        name: td.name || cData.name || cData.settings?.companyName || d.id,
        subdomain: td.subdomain || d.id,
        slug: td.subdomain || d.id,
        logo: td.logo || cData.logo || cData.settings?.companyLogo || null,
        adminEmail: td.adminEmail || cData.adminEmail || cData.settings?.adminEmail || '',
        adminName: td.adminName || cData.adminName || cData.settings?.adminName || 'المدير',
        phone: td.phone || cData.phone || cData.settings?.phone || null,
        currency: td.currency || cData.currency || 'ج.م',
        status: 'active',
        plan: 'trial',
        users: cData.users || [],
        authorizedEmails: cData.authorizedEmails || (td.adminEmail ? [td.adminEmail] : []),
        createdAt: td.createdAt || new Date().toISOString()
      };
      tenantMap.set(cId, newEntry);
      console.log('Added tenant from directory:', cId, newEntry.name, newEntry.adminEmail);
    }
  }

  // 3. Make sure comp_c_mtyw7mqk (Amlak) is completely populated
  const amlakSnap = await getDoc(doc(db, 'companies', 'comp_c_mtyw7mqk'));
  if (amlakSnap.exists()) {
    const amlakData = amlakSnap.data();
    const amlakEntry = {
      id: 'comp_c_mtyw7mqk',
      name: amlakData.name || amlakData.settings?.companyName || 'شركة أملاك للمقاولات والتشطيبات',
      subdomain: 'amlak',
      slug: 'amlak',
      logo: amlakData.logo || amlakData.settings?.companyLogo || null,
      adminEmail: 'sicolove7@gmail.com',
      adminName: 'احمد',
      currency: 'ج.م',
      status: 'active',
      plan: 'trial',
      users: amlakData.users || [],
      authorizedEmails: amlakData.authorizedEmails || ['sicolove7@gmail.com'],
      updatedAt: new Date().toISOString()
    };
    tenantMap.set('comp_c_mtyw7mqk', amlakEntry);
    console.log('Restored Amlak tenant with', amlakEntry.users?.length, 'users');
  }

  // 4. Make sure comp_nglaa (Nglaa) is completely populated
  const nglaaSnap = await getDoc(doc(db, 'companies', 'comp_nglaa'));
  if (nglaaSnap.exists()) {
    const nglaaData = nglaaSnap.data();
    const nglaaEntry = {
      id: 'comp_nglaa',
      name: nglaaData.name || nglaaData.settings?.companyName || 'نجلا ',
      subdomain: 'nglaa',
      slug: 'nglaa',
      logo: nglaaData.logo || nglaaData.settings?.companyLogo || null,
      adminEmail: 'nglaa@gmail.com',
      adminName: 'Nglaa',
      phone: '010123456789',
      currency: 'ج.م',
      status: 'active',
      plan: 'trial',
      users: nglaaData.users || [],
      authorizedEmails: nglaaData.authorizedEmails || ['nglaa@gmail.com'],
      team: nglaaData.team || {},
      updatedAt: new Date().toISOString()
    };
    tenantMap.set('comp_nglaa', nglaaEntry);
    console.log('Restored Nglaa tenant with', nglaaEntry.users?.length, 'users and team:', nglaaEntry.team);
  }

  const allTenants = Array.from(tenantMap.values());
  await setDoc(doc(db, 'platform_metadata', 'tenants'), {
    tenants: allTenants,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log('Successfully saved', allTenants.length, 'tenants to platform_metadata/tenants!');
}

restore().catch(console.error);
