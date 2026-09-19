import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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

async function testAuth(email, pass) {
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    console.log(`✅ Success logging into ${email} with password "${pass}"! UID: ${res.user.uid}`);
    return true;
  } catch (e) {
    console.log(`❌ Failed logging into ${email} with password "${pass}":`, e.code, e.message);
    return false;
  }
}

async function run() {
  await testAuth("sicolove7@gmail.com", "123456");
  await testAuth("sicolove7000@gmail.com", "123456");
  process.exit(0);
}

run();
