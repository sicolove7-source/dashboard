import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

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

async function inspectMetadata() {
  await signInWithEmailAndPassword(auth, 'sicolove7@gmail.com', '123456');

  const metaTenantsSnap = await getDoc(doc(db, 'platform_metadata', 'tenants'));
  if (metaTenantsSnap.exists()) {
    const list = metaTenantsSnap.data()?.tenants || [];
    console.log(`\n📋 platform_metadata/tenants count: ${list.length}`);
    list.forEach(t => console.log(`   - ID: ${t.id} | Name: "${t.name}" | Subdomain: ${t.subdomain} | Admin: ${t.adminEmail}`));
  } else {
    console.log('\n❌ platform_metadata/tenants does not exist');
  }

  const deletedSnap = await getDoc(doc(db, 'platform_metadata', 'deleted_tenants'));
  if (deletedSnap.exists()) {
    const list = deletedSnap.data()?.deletedIds || [];
    console.log(`\n🗑️ platform_metadata/deleted_tenants count: ${list.length}`);
    console.log('   IDs:', list);
  } else {
    console.log('\n🗑️ platform_metadata/deleted_tenants does not exist yet');
  }

  const dirSnap = await getDocs(collection(db, 'tenant_directory'));
  console.log(`\n🌐 tenant_directory count: ${dirSnap.size}`);
  dirSnap.forEach(d => {
    const dt = d.data();
    console.log(`   - [${d.id}] -> companyId: ${dt.companyId} | name: "${dt.name}"`);
  });
}

inspectMetadata().catch(console.error);
