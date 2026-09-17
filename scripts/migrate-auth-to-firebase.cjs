/**
 * ===================================================================
 * سكريبت هجرة المستخدمين إلى Firebase Authentication الرسمي
 * Migration Script: Migrate Local/Firestore Users to Firebase Auth
 * ===================================================================
 * 
 * طريقة التشغيل:
 * 1. قم بتحميل ملف Service Account من Firebase Console:
 *    Project Settings -> Service Accounts -> Generate New Private Key
 * 2. احفظ الملف باسم `serviceAccountKey.json` داخل مجلد `scripts/`
 * 3. ثبّت حزمة الأدمن في بيئة Node:
 *    npm install firebase-admin
 * 4. شغّل السكريبت:
 *    node scripts/migrate-auth-to-firebase.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runMigration() {
  console.log('\n=============================================================');
  console.log('🚀 بدء عملية ترحيل حسابات المستخدمين إلى Firebase Authentication');
  console.log('=============================================================\n');

  let admin;
  try {
    admin = require('firebase-admin');
  } catch (err) {
    console.error('❌ حزمة firebase-admin غير مثبتة.');
    console.log('👉 يرجى تثبيتها أولاً بالأمر التالي:');
    console.log('   npm install firebase-admin --save-dev\n');
    process.exit(1);
  }

  // البحث عن ملف Service Account
  const possibleKeyPaths = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  let keyPath = possibleKeyPaths.find(p => fs.existsSync(p));

  if (!keyPath) {
    console.error('❌ لم يتم العثور على ملف serviceAccountKey.json!');
    console.log('\n📌 خطوات الحصول على الملف من Firebase Console:');
    console.log('1. ادخل على: https://console.firebase.google.com/project/tashteeb-67d13/settings/serviceaccounts/adminsdk');
    console.log('2. اضغط على زر "Generate new private key".');
    console.log(`3. ضع الملف المحمل في المسار التالي باسم serviceAccountKey.json:`);
    console.log(`   ${path.join(__dirname, 'serviceAccountKey.json')}\n`);
    process.exit(1);
  }

  const serviceAccount = require(keyPath);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || 'tashteeb-67d13',
    });
  }

  const db = admin.firestore();
  const auth = admin.auth();

  const results = {
    startedAt: new Date().toISOString(),
    totalFound: 0,
    created: 0,
    alreadyExists: 0,
    failed: 0,
    users: [],
  };

  const candidateMap = new Map();

  // 1. فحص حساب الـ Super Admin
  try {
    const superAdminDoc = await db.collection('platform_metadata').doc('superadmin').get();
    if (superAdminDoc.exists) {
      const data = superAdminDoc.data();
      if (data?.email) {
        candidateMap.set(data.email.toLowerCase().trim(), {
          email: data.email.toLowerCase().trim(),
          displayName: data.name || 'مالك المنصة الرئيسي',
          role: 'super_admin',
          source: 'superadmin_metadata',
        });
      }
    }
  } catch (e) {
    console.warn('⚠️ تعذر قراءة وثيقة superadmin:', e.message);
  }

  // إضافة حساب الـ Super Admin المعتمد لمالك المنصة
  if (!candidateMap.has('sicolove7@gmail.com')) {
    candidateMap.set('sicolove7@gmail.com', {
      email: 'sicolove7@gmail.com',
      displayName: 'مالك المنصة الرئيسي',
      role: 'super_admin',
      source: 'owner_primary',
    });
  }

  // إضافة حساب الـ Super Admin الافتراضي الاحتياطي إن لم يكن مسجلاً
  if (!candidateMap.has('admin@platform.com')) {
    candidateMap.set('admin@platform.com', {
      email: 'admin@platform.com',
      displayName: 'مالك المنصة (حساب احتياطي)',
      role: 'super_admin',
      source: 'default_superadmin',
    });
  }

  // 2. قراءة جميع الشركات من Firestore collection 'companies'
  console.log('🔍 جلب الشركات والمستخدمين من Firestore...');
  try {
    const snapshot = await db.collection('companies').get();
    console.log(`📁 تم العثور على ${snapshot.size} شركة في قاعدة البيانات.\n`);

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const compId = docSnap.id;
      const compName = data.name || compId;

      // أ) مالك الشركة (Tenant Admin)
      if (data.adminEmail) {
        const email = data.adminEmail.toLowerCase().trim();
        if (!candidateMap.has(email)) {
          candidateMap.set(email, {
            email,
            displayName: data.adminName || `مدير ${compName}`,
            companyId: compId,
            companyName: compName,
            role: 'owner',
            source: `company_${compId}_admin`,
          });
        }
      }

      // ب) مستخدمو الشركة (Users array)
      if (Array.isArray(data.users)) {
        data.users.forEach(u => {
          if (u && u.email) {
            const email = u.email.toLowerCase().trim();
            if (!candidateMap.has(email)) {
              candidateMap.set(email, {
                email,
                displayName: u.name || email.split('@')[0],
                companyId: compId,
                companyName: compName,
                role: u.role || 'engineer',
                source: `company_${compId}_user`,
              });
            }
          }
        });
      }
    });
  } catch (err) {
    console.error('❌ خطأ أثناء قراءة وثائق الشركات من Firestore:', err);
  }

  results.totalFound = candidateMap.size;
  console.log(`👥 إجمالي الحسابات الفريدة المطلوب ترحيلها: ${results.totalFound}\n`);
  console.log('-------------------------------------------------------------');

  // 3. الترحيل لكل مستخدم
  for (const [email, info] of candidateMap.entries()) {
    try {
      // فحص هل المستخدم مسجل بالفعل في Firebase Auth
      let userRecord = null;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
      }

      if (userRecord) {
        console.log(`ℹ️ [موجود مسبقاً] ${email} (UID: ${userRecord.uid})`);
        
        // تعيين أو تحديث Custom Claims للمستخدم الموجود
        const claims = {
          role: info.role || 'engineer',
          companyId: info.companyId || null,
          isSuperAdmin: info.role === 'super_admin',
        };
        await auth.setCustomUserClaims(userRecord.uid, claims);

        let resetLink = null;
        try {
          resetLink = await auth.generatePasswordResetLink(email);
        } catch (e) {}

        results.alreadyExists++;
        results.users.push({
          email,
          uid: userRecord.uid,
          status: 'ALREADY_EXISTS',
          role: info.role,
          claims,
          resetLink,
        });
      } else {
        // توليد كلمة مرور مؤقتة عشوائية آمنة
        const tempPassword = crypto.randomBytes(12).toString('hex') + 'A1!';
        
        const createdUser = await auth.createUser({
          email,
          password: tempPassword,
          displayName: info.displayName,
          emailVerified: false,
        });

        // تعيين Custom Claims للمستخدم الجديد
        const claims = {
          role: info.role || 'engineer',
          companyId: info.companyId || null,
          isSuperAdmin: info.role === 'super_admin',
        };
        await auth.setCustomUserClaims(createdUser.uid, claims);

        // توليد رابط إعادة تعيين كلمة المرور تلقائياً
        const resetLink = await auth.generatePasswordResetLink(email);

        console.log(`✅ [تم الإنشاء وتعيين الصلاحيات] ${email}`);
        console.log(`   🔗 رابط تعيين الباسورد: ${resetLink}\n`);

        results.created++;
        results.users.push({
          email,
          uid: createdUser.uid,
          status: 'CREATED',
          displayName: info.displayName,
          role: info.role,
          companyId: info.companyId,
          claims,
          resetLink,
        });
      }
    } catch (err) {
      console.error(`❌ [فشل الترحيل] ${email}:`, err.message);
      results.failed++;
      results.users.push({
        email,
        status: 'FAILED',
        error: err.message,
      });
    }
  }

  results.finishedAt = new Date().toISOString();

  // 4. حفظ ملف السجل التقريري (Log File)
  const logPath = path.join(__dirname, 'migration-auth-log.json');
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log('\n=============================================================');
  console.log('📊 ملخص نتائج الهجرة إلى Firebase Authentication:');
  console.log('=============================================================');
  console.log(`- إجمالي الحسابات التي تم فحصها: ${results.totalFound}`);
  console.log(`- تم إنشاؤها بنجاح:              ${results.created}`);
  console.log(`- موجودة مسبقاً في Auth:          ${results.alreadyExists}`);
  console.log(`- فشل:                          ${results.failed}`);
  console.log(`- مسار تقرير الهجرة الشامل:      ${logPath}`);
  console.log('=============================================================\n');
}

runMigration().catch(err => {
  console.error('💥 حدث خطأ غير متوقع أثناء تشغيل السكريبت:', err);
  process.exit(1);
});
