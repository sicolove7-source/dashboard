/**
 * ===================================================================
 * منح وتعيين صلاحيات Super Admin الموثقة في Firebase Auth
 * ===================================================================
 * 
 * الاستخدام:
 *   node scripts/set-super-admin.mjs <your-email@domain.com>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const targetEmail = process.argv[2]?.trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    console.error('❌ يرجى إدخال البريد الإلكتروني للمشرف العام:');
    console.log('   node scripts/set-super-admin.mjs your-email@domain.com');
    process.exit(1);
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch (err) {
    console.error('❌ حزمة firebase-admin غير متوفرة. يرجى تثبيتها أولاً: npm install firebase-admin');
    process.exit(1);
  }

  const possibleKeyPaths = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  const keyPath = possibleKeyPaths.find(p => fs.existsSync(p));
  if (!keyPath) {
    console.error('❌ لم يتم العثور على ملف serviceAccountKey.json!');
    console.log(`📌 يرجى وضع الملف في: ${path.join(__dirname, 'serviceAccountKey.json')}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || 'tashteeb-67d13',
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  try {
    const user = await auth.getUserByEmail(targetEmail);
    console.log(`👤 تم العثور على المستخدم: ${user.email} (UID: ${user.uid})`);

    const claims = {
      role: 'super_admin',
      isSuperAdmin: true,
      updatedAt: new Date().toISOString(),
    };

    await auth.setCustomUserClaims(user.uid, claims);
    console.log('✅ تم تعيين Firebase Auth Custom Claims بنجاح:');
    console.log(claims);

    // توثيق المشرف في platform_metadata/superadmin
    await db.doc('platform_metadata/superadmin').set({
      uid: user.uid,
      email: user.email,
      isInitialized: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.log('🌟 تهانينا! الحساب أصبح رسمياً Super Admin موثق سحابياً.');
    console.log('ℹ️ ملاحظة: يرجى تسجيل الخروج وإعادة تسجيل الدخول في المتصفح لتحديث التوكن.');
  } catch (err) {
    console.error('❌ خطأ أثناء تعيين الصلاحيات:', err.message);
    process.exit(1);
  }
}

main().catch(console.error);
