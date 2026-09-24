import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

async function testUpload() {
  console.log("Testing Firebase Storage upload...");
  try {
    const cred = await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
    console.log("Signed in:", cred.user.email, cred.user.uid);
  } catch (e) {
    console.log("Sign in failed:", e.message);
  }

  const buckets = [
    "gs://tashteeb-67d13.firebasestorage.app",
    "gs://tashteeb-67d13.appspot.com",
    "tashteeb-67d13.firebasestorage.app",
    "tashteeb-67d13.appspot.com"
  ];

  for (const b of buckets) {
    try {
      console.log(`\n--- Trying bucket: ${b} ---`);
      const st = getStorage(app, b.startsWith("gs://") ? b : undefined);
      const testRef = ref(st, `site_media/test_${Date.now()}.txt`);
      const dummyBuffer = Buffer.from("Hello world dummy image content");
      const result = await uploadBytes(testRef, dummyBuffer, { contentType: "text/plain" });
      const url = await getDownloadURL(result.ref);
      console.log(`✅ SUCCESS on bucket ${b}! URL: ${url}`);
      break;
    } catch (err) {
      console.error(`❌ Failed on bucket ${b}:`, err.code, err.message, err.serverResponse || '');
    }
  }

  process.exit(0);
}

testUpload();
