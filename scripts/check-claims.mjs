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

async function main() {
  const cred = await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  const token = await cred.user.getIdTokenResult();
  console.log("CLAIMS for sicolove7@gmail.com:", JSON.stringify(token.claims));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
