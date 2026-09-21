/**
 * ===================================================================
 * مزامنة قائمة الشركات الحالية إلى الدليل العام (tenant_directory)
 * ===================================================================
 * 
 * يقرأ هذا السكربت الشركات من platform_metadata/tenants ويقوم بإنشاء
 * أو تحديث مستند في tenant_directory/{subdomain} لكل شركة.
 * 
 * الاستخدام:
 *   node scripts/sync-tenant-directory.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncViaAdmin() {
  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch (e) {
    return false;
  }

  const possibleKeyPaths = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  const keyPath = possibleKeyPaths.find(p => fs.existsSync(p));
  if (!keyPath) {
    return false;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || 'tashteeb-67d13',
    });
  }

  const db = admin.firestore();
  console.log('🔄 جاري مزامنة tenant_directory عبر Firebase Admin SDK...');

  const tenantsSnap = await db.doc('platform_metadata/tenants').get();
  if (!tenantsSnap.exists) {
    console.log('⚠️ لا توجد وثيقة platform_metadata/tenants');
    return true;
  }

  const tenants = tenantsSnap.data()?.tenants || [];
  console.log(`📋 تم العثور على ${tenants.length} شركة في platform_metadata/tenants`);

  let count = 0;
  for (const t of tenants) {
    const sub = (t.subdomain || t.slug || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (!sub) continue;

    await db.doc(`tenant_directory/${sub}`).set({
      companyId: t.id,
      name: t.name || t.companyName || t.id,
      logo: t.logo || t.companyLogo || null,
      subdomain: sub,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.log(`  ✅ تم ربط: ${sub} -> ${t.id} (${t.name})`);
    count++;
  }

  console.log(`🎉 اكتملت المزامنة بنجاح! تم تحديث ${count} نطاق فرعي في tenant_directory.`);
  return true;
}

async function syncViaClient() {
  const { initializeApp } = await import('firebase/app');
  const { getFirestore, doc, getDoc, setDoc } = await import('firebase/firestore');

  const firebaseConfig = {
    apiKey: "AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM",
    authDomain: "tashteeb-67d13.firebaseapp.com",
    projectId: "tashteeb-67d13",
    storageBucket: "tashteeb-67d13.firebasestorage.app",
    messagingSenderId: "527043598350",
    appId: "1:527043598350:web:8f9119be0ddf9dab04045f"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('🔄 محاولة مزامنة tenant_directory عبر Firebase Client SDK...');
  try {
    const snap = await getDoc(doc(db, 'platform_metadata', 'tenants'));
    if (!snap.exists()) {
      console.log('⚠️ لا توجد وثيقة platform_metadata/tenants');
      return;
    }
    const tenants = snap.data()?.tenants || [];
    for (const t of tenants) {
      const sub = (t.subdomain || t.slug || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
      if (!sub) continue;
      try {
        await setDoc(doc(db, 'tenant_directory', sub), {
          companyId: t.id,
          name: t.name || t.companyName || t.id,
          logo: t.logo || t.companyLogo || null,
          subdomain: sub,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log(`  ✅ تم ربط: ${sub} -> ${t.id} (${t.name})`);
      } catch (e) {
        console.warn(`  ⚠️ تعذر ربط ${sub}: ${e.message} (يتطلب تشغيل السكربت مع serviceAccountKey.json لأن write مغلقة في القواعد)`);
      }
    }
  } catch (err) {
    console.error('خطأ أثناء القراءة:', err.message);
  }
}

async function run() {
  const adminSuccess = await syncViaAdmin();
  if (!adminSuccess) {
    console.log('ℹ️ لم يتم العثور على serviceAccountKey.json، الانتقال للمحاولة البديلة...');
    await syncViaClient();
  }
}

run().catch(console.error);
