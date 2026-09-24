import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

async function patchFirestore() {
  try {
    await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  } catch (e) {
    try {
      await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "12345678");
    } catch (e2) {}
  }

  console.log("Checking portal_shares for photos with thumbnails to promote to src...");
  try {
    const snap = await getDocs(collection(db, "portal_shares"));
    let updatedShares = 0;

    for (const d of snap.docs) {
      const data = d.data();
      let modified = false;

      if (Array.isArray(data.dailyLogs)) {
        const newLogs = data.dailyLogs.map(log => {
          let logMod = false;
          const newPhotos = (log.photos || []).map(p => {
            if (p && typeof p === 'object') {
              if (p.src?.startsWith('idb://') && p.thumbnail?.startsWith('data:')) {
                logMod = true;
                return { ...p, src: p.thumbnail, rawSrc: p.thumbnail };
              }
            }
            return p;
          });

          const newMedia = (log.media || []).map(m => {
            if (m && typeof m === 'object') {
              if (m.src?.startsWith('idb://') && m.thumbnail?.startsWith('data:')) {
                logMod = true;
                return { ...m, src: m.thumbnail, rawSrc: m.thumbnail };
              }
            }
            return m;
          });

          if (logMod) {
            modified = true;
            return { ...log, photos: newPhotos, media: newMedia };
          }
          return log;
        });

        if (modified) {
          await updateDoc(doc(db, "portal_shares", d.id), {
            dailyLogs: newLogs,
            updatedAt: new Date().toISOString()
          });
          console.log(`✅ Promoted Base64 thumbnails to src in portal_share: ${d.id}`);
          updatedShares++;
        }
      }
    }

    console.log(`Finished! Updated ${updatedShares} portal_shares.`);
  } catch (err) {
    console.error("Error in patchFirestore:", err);
  }

  process.exit(0);
}

patchFirestore();
