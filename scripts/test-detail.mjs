import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getStorage, ref, uploadBytes } from "firebase/storage";

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
const storage = getStorage(app);

async function testDetail() {
  try {
    await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  } catch (e) {}

  try {
    const testRef = ref(storage, `site_media/test_${Date.now()}.txt`);
    const dummyBuffer = Buffer.from("Hello world");
    await uploadBytes(testRef, dummyBuffer);
  } catch (err) {
    console.log("Full error properties:", Object.getOwnPropertyNames(err));
    console.log("customData:", err.customData);
    console.log("status_:", err.status_);
    console.log("serverResponse:", err.serverResponse);
    console.log("code:", err.code);
    console.log("name:", err.name);
  }
  process.exit(0);
}

testDetail();
