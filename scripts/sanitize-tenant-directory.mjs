/**
 * سكريبت لتنظيف وثائق tenant_directory من مصفوفات الموظفين المسربة (users و authorizedEmails)
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';

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

  const dirSnap = await getDocs(collection(db, 'tenant_directory'));
  console.log(`Found ${dirSnap.size} documents in tenant_directory.`);

  let cleanedCount = 0;
  for (const d of dirSnap.docs) {
    const data = d.data();
    const hasUsers = Array.isArray(data.users) && data.users.length > 0;
    const hasAuthEmails = Array.isArray(data.authorizedEmails) && data.authorizedEmails.length > 0;

    if (hasUsers || hasAuthEmails) {
      console.log(`Sanitizing [${d.id}] (had ${data.users?.length || 0} users, ${data.authorizedEmails?.length || 0} emails)...`);
      await updateDoc(doc(db, 'tenant_directory', d.id), {
        users: deleteField(),
        authorizedEmails: deleteField(),
        updatedAt: new Date().toISOString()
      });
      cleanedCount++;
    }
  }

  console.log(`\nDone! Successfully sanitized ${cleanedCount} documents.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
