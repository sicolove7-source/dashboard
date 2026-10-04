/**
 * سكريبت لتنظيف platform_metadata/tenants من مصفوفات الموظفين المسربة (users و authorizedEmails)
 * واستبدالها بـ usersCount لجميع الشركات
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

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

async function main() {
  console.log('Logging in as super admin...');
  await signInWithEmailAndPassword(auth, 'sicolove7@gmail.com', '123456');
  console.log('Logged in successfully!');

  const ref = doc(db, 'platform_metadata', 'tenants');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.log('platform_metadata/tenants does not exist!');
    process.exit(0);
  }

  const tenants = snap.data()?.tenants || [];
  console.log(`Found ${tenants.length} tenants in platform_metadata/tenants.`);

  let strippedCount = 0;
  const cleanedTenants = tenants.map(t => {
    if (!t) return t;
    const clean = { ...t };
    const hadUsers = Array.isArray(clean.users) && clean.users.length > 0;
    const hadAuth = Array.isArray(clean.authorizedEmails) && clean.authorizedEmails.length > 0;

    if (hadUsers || hadAuth) {
      clean.usersCount = Array.isArray(clean.users) ? clean.users.length : 0;
      delete clean.users;
      delete clean.authorizedEmails;
      strippedCount++;
      console.log(`Sanitized tenant [${clean.id}] (${clean.name}): removed leaked users, set usersCount = ${clean.usersCount}`);
    }
    return clean;
  });

  await updateDoc(ref, {
    tenants: cleanedTenants,
    updatedAt: new Date().toISOString()
  });

  console.log(`\n🎉 Successfully sanitized ${strippedCount} companies in platform_metadata/tenants!`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
