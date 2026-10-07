import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

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

async function syncMohamedUser() {
  await signInWithEmailAndPassword(auth, 'sicolove7@gmail.com', '123456');

  const compRef = doc(db, 'companies', 'comp_nglaa');
  const snap = await getDoc(compRef);
  if (!snap.exists()) {
    console.log('comp_nglaa not found!');
    return;
  }
  const data = snap.data();
  const users = data.users || [];
  
  const hasMohamed = users.some(u => u.name === 'محمد' || u.engineerName === 'محمد');
  if (!hasMohamed) {
    users.push({
      id: 'u_comp_nglaa_eng_mohamed',
      name: 'محمد',
      engineerName: 'محمد',
      email: 'mohamed@nglaa.com',
      role: 'engineer',
      companyId: 'comp_nglaa',
      status: 'active',
      createdAt: new Date().toISOString()
    });
  }

  await updateDoc(compRef, {
    users: users,
    'team.engineers': ['محمد', 'م. مهندس الموقع', 'م. سيف النيادي']
  });

  // Also update platform_metadata/tenants
  const metaRef = doc(db, 'platform_metadata', 'tenants');
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists()) {
    const list = metaSnap.data()?.tenants || [];
    const idx = list.findIndex(t => t.id === 'comp_nglaa');
    if (idx !== -1) {
      list[idx].users = users;
      list[idx].team = data.team || { engineers: ['محمد', 'م. مهندس الموقع', 'م. سيف النيادي'] };
      await updateDoc(metaRef, { tenants: list });
    }
  }

  console.log('✅ Successfully added engineer محمد to comp_nglaa users and team in Firestore!');
}

syncMohamedUser().catch(console.error);
