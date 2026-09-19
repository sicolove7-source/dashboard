import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

function cleanPhoneNumber(raw) {
  if (!raw) return '';
  let str = String(raw).trim()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[\s\-\(\)\.]/g, '');

  if (str.startsWith('00')) str = str.slice(2);
  if (str.startsWith('+')) str = str.slice(1);

  if (str.startsWith('20') && str.length === 12 && ['10', '11', '12', '15'].includes(str.slice(2, 4))) {
    str = '0' + str.slice(2);
  } else if (str.length === 10 && ['10', '11', '12', '15'].includes(str.slice(0, 2))) {
    str = '0' + str;
  }

  return str.replace(/\D/g, '');
}

console.log("=== Testing Phone Normalization ===");
const testCases = [
  { input: "01012345678", expected: "01012345678" },
  { input: "+201012345678", expected: "01012345678" },
  { input: "00201012345678", expected: "01012345678" },
  { input: "201012345678", expected: "01012345678" },
  { input: "010-1234-5678", expected: "01012345678" },
  { input: "010 1234 5678", expected: "01012345678" },
  { input: "٠١٠١٢٣٤٥٦٧٨", expected: "01012345678" },
  { input: "+٢٠١٠١٢٣٤٥٦٧٨", expected: "01012345678" },
  { input: "+971501234567", expected: "971501234567" },
];

let allPassed = true;
testCases.forEach(({ input, expected }) => {
  const result = cleanPhoneNumber(input);
  const ok = result === expected;
  if (!ok) allPassed = false;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] Input: "${input}" => "${result}" (Expected: "${expected}")`);
});

if (!allPassed) {
  console.error("❌ Phone normalization tests failed!");
  process.exit(1);
}
console.log("✅ All Phone Normalization tests passed successfully!");

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

async function testPhoneDirectoryLookup(phone) {
  const cPhone = cleanPhoneNumber(phone);
  console.log(`\nTesting Cloud Lookup for phone: "${phone}" (clean: ${cPhone})`);

  // 1. users_directory
  try {
    const dirSnap = await getDoc(doc(db, "platform_metadata", "users_directory"));
    if (dirSnap.exists()) {
      const data = dirSnap.data();
      if (data["phone_" + cPhone]) {
        const u = data["phone_" + cPhone];
        console.log(`✅ MATCH in users_directory by phone_${cPhone}! Name: ${u.name}, Email: ${u.email}, Company: ${u.companyId}`);
        return true;
      }
    }
  } catch (e) {
    console.warn("Directory lookup warning:", e.message);
  }

  // 2. tenants list
  try {
    const tenantsSnap = await getDoc(doc(db, "platform_metadata", "tenants"));
    if (tenantsSnap.exists()) {
      const list = tenantsSnap.data()?.tenants || [];
      for (const t of list) {
        if (t.phone && cleanPhoneNumber(t.phone) === cPhone) {
          console.log(`✅ MATCH tenant phone! Company: ${t.id} (${t.name}), AdminEmail: ${t.adminEmail}`);
          return true;
        }
        if (Array.isArray(t.users)) {
          const match = t.users.find(u => cleanPhoneNumber(u.phone) === cPhone);
          if (match) {
            console.log(`✅ MATCH employee phone in tenant! Company: ${t.id}, Name: ${match.name}, Email: ${match.email}`);
            return true;
          }
        }
      }
    }
  } catch (e) {
    console.warn("Tenants lookup warning:", e.message);
  }

  console.log("ℹ️ Phone not yet registered in cloud metadata (normal for new phone numbers)");
  return false;
}

async function run() {
  await signInWithEmailAndPassword(auth, "sicolove7@gmail.com", "123456");
  console.log("✅ Authenticated with Firebase");

  // Test looking up company admin phone
  await testPhoneDirectoryLookup("+20 100 123 4567");
  await testPhoneDirectoryLookup("01001234567");
  console.log("\n🚀 All tests completed!");
  process.exit(0);
}

run().catch(err => {
  console.error("Execution error:", err);
  process.exit(1);
});
