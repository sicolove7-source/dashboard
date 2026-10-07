import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function list() {
  await signInWithEmailAndPassword(auth, 'sicolove7@gmail.com', '123456');

  const compSnap = await getDocs(collection(db, 'companies'));
  console.log('Total companies in Firestore companies collection:', compSnap.size);
  compSnap.forEach(d => {
    const data = d.data();
    const name = data?.name || data?.settings?.companyName || 'بدون اسم';
    const email = data?.adminEmail || data?.settings?.adminEmail || '';
    const usersCount = data?.users?.length || 0;
    const teamEngineers = data?.team?.engineers || [];
    console.log(`- [${d.id}] "${name}" | admin: ${email} | users: ${usersCount} | engineers: ${JSON.stringify(teamEngineers)}`);
  });
}

list().catch(console.error);
