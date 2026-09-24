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

async function testFetch() {
  const cred = await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  const token = await cred.user.getIdToken();
  console.log("Token acquired for:", cred.user.email);

  const buckets = [
    "tashteeb-67d13.firebasestorage.app",
    "tashteeb-67d13.appspot.com",
    "tashteeb-67d13",
    "staging.tashteeb-67d13.appspot.com"
  ];

  for (const b of buckets) {
    console.log(`\nTesting GET https://firebasestorage.googleapis.com/v0/b/${b}/o`);
    try {
      const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${b}/o`, {
        headers: { Authorization: `Firebase ${token}` }
      });
      const text = await res.text();
      console.log(`Status: ${res.status} ${res.statusText}`);
      console.log(`Body:`, text.slice(0, 300));
    } catch (err) {
      console.error("Fetch err:", err.message);
    }
  }

  process.exit(0);
}

testFetch();
