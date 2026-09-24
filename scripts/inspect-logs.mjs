import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

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
const db = getFirestore(app);

async function inspect() {
  try {
    await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  } catch (e) {
    try {
      await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "12345678");
    } catch (e2) {}
  }

  console.log("=== INSPECTING PORTAL SHARES ===");
  try {
    const snap = await getDocs(collection(db, "portal_shares"));
    console.log(`Found ${snap.docs.length} portal_shares`);
    snap.docs.forEach(d => {
      const p = d.data();
      console.log(`\nShare: ${d.id} - Proj: ${p.id || p.name}`);
      if (p.dailyLogs && Array.isArray(p.dailyLogs)) {
        console.log(`  dailyLogs count: ${p.dailyLogs.length}`);
        p.dailyLogs.forEach((l, idx) => {
          console.log(`   Log ${idx} (${l.date}): work="${(l.work||'').slice(0,30)}"`);
          if (l.photos) {
            console.log(`     photos:`, JSON.stringify(l.photos).slice(0, 300));
          }
          if (l.media) {
            console.log(`     media:`, JSON.stringify(l.media).slice(0, 300));
          }
        });
      }
    });
  } catch (err) {
    console.error("Error inspecting portal_shares:", err.message);
  }

  process.exit(0);
}

inspect();
