/**
 * ===================================================================
 * أداة تعيين وحقن الصلاحيات المشفرة (Custom Claims) للمستخدمين
 * Firebase Auth Custom Claims Setter
 * ===================================================================
 * 
 * الصلاحيات تُحفظ مباشرة في توكن الـ JWT الموقع رقمياً من Google Firebase:
 * - request.auth.token.role: ('super_admin' | 'owner' | 'engineer' | 'accountant' | 'tech_office')
 * - request.auth.token.companyId: معرف الشركة (مثل 'comp_alain')
 * - request.auth.token.isSuperAdmin: boolean
 * 
 * طريقة التشغيل:
 * 1. تعيين الصلاحيات لجميع المستخدمين في قاعدة البيانات:
 *    node scripts/set-custom-claims.cjs --all
 * 
 * 2. تعيين الصلاحيات لمستخدم محدد:
 *    node scripts/set-custom-claims.cjs --email user@example.com --role owner --company comp_alain
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const { initializeApp, getApps, cert } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore } = require('firebase-admin/firestore');

  const possibleKeyPaths = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  let keyPath = possibleKeyPaths.find(p => fs.existsSync(p));
  if (!keyPath) {
    console.error('❌ لم يتم العثور على ملف serviceAccountKey.json!');
    console.log(`📌 ضعه في: ${path.join(__dirname, 'serviceAccountKey.json')}`);
    process.exit(1);
  }

  const serviceAccount = require(keyPath);
  let app;
  if (!getApps().length) {
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || 'tashteeb-67d13',
    });
  } else {
    app = getApps()[0];
  }

  const auth = getAuth(app);
  const db = getFirestore(app);

  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const emailIndex = args.indexOf('--email');
  const roleIndex = args.indexOf('--role');
  const companyIndex = args.indexOf('--company');

  // وضع مستخدم مفرد
  if (emailIndex !== -1 && args[emailIndex + 1]) {
    const targetEmail = args[emailIndex + 1].toLowerCase().trim();
    const targetRole = (roleIndex !== -1 && args[roleIndex + 1]) ? args[roleIndex + 1] : 'owner';
    const targetCompany = (companyIndex !== -1 && args[companyIndex + 1]) ? args[companyIndex + 1] : null;

    try {
      const user = await auth.getUserByEmail(targetEmail);
      const claims = {
        role: targetRole,
        companyId: targetCompany,
        isSuperAdmin: targetRole === 'super_admin',
      };
      await auth.setCustomUserClaims(user.uid, claims);
      console.log(`✅ تم تعيين الصلاحيات بنجاح للمستخدم: ${targetEmail}`);
      console.log('   الصلاحيات:', claims);
    } catch (e) {
      console.error(`❌ فشل تعيين الصلاحيات لـ ${targetEmail}:`, e.message);
    }
    process.exit(0);
  }

  // وضع فحص وتعيين الصلاحيات للجميع
  console.log('\n=============================================================');
  console.log('🛡️ بدء تعيين وتحديث Custom Claims لجميع المستخدمين');
  console.log('=============================================================\n');

  // 1. حساب الـ Super Admin
  const superAdminEmails = ['sicolove7@gmail.com', 'admin@platform.com'];
  try {
    const sDoc = await db.collection('platform_metadata').doc('superadmin').get();
    if (sDoc.exists && sDoc.data()?.email) {
      superAdminEmails.push(sDoc.data().email.toLowerCase().trim());
    }
  } catch (e) {}

  for (const sEmail of superAdminEmails) {
    try {
      const user = await auth.getUserByEmail(sEmail);
      await auth.setCustomUserClaims(user.uid, {
        role: 'super_admin',
        isSuperAdmin: true,
        companyId: null,
      });
      console.log(`👑 [Super Admin] تم تعيين صلاحيات مالك المنصة لـ: ${sEmail}`);
    } catch (e) {
      // الحساب قد لا يكون موجوداً في Auth بعد
    }
  }

  // 2. حسابات الشركات
  try {
    const snapshot = await db.collection('companies').get();
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const compId = docSnap.id;

      // تجاهل الشركات المحذوفة نهائياً لمنع تلوث حسابات المستخدمين
      if (data.status === 'deleted' || data.isDeleted === true) {
        console.log(`⏩ [Skipping Deleted Company] ${compId}`);
        continue;
      }

      // أ) مالك الشركة (Owner)
      if (data.adminEmail) {
        const ownerEmail = data.adminEmail.toLowerCase().trim();
        try {
          const user = await auth.getUserByEmail(ownerEmail);
          await auth.setCustomUserClaims(user.uid, {
            role: 'owner',
            companyId: compId,
            isSuperAdmin: false,
          });
          console.log(`🏢 [Owner] ${ownerEmail} -> شركة: ${compId}`);
        } catch (e) {}
      }

      // ب) فريق العمل (Users and Team arrays)
      const allMembers = [
        ...(Array.isArray(data.users) ? data.users : []),
        ...(Array.isArray(data.team) ? data.team : [])
      ];

      for (const u of allMembers) {
        if (!u) continue;
        const candidateEmails = [];
        if (u.email) candidateEmails.push(u.email.toLowerCase().trim());
        const rawPhone = (u.phone || u.cleanPhone || '').toString().replace(/\D/g, '');
        if (rawPhone && rawPhone.length >= 7) {
          candidateEmails.push(`phone_${rawPhone}@tashteeb.app`);
        }

        for (const memberEmail of candidateEmails) {
          try {
            const user = await auth.getUserByEmail(memberEmail);
            await auth.setCustomUserClaims(user.uid, {
              role: u.role || 'engineer',
              companyId: compId,
              isSuperAdmin: false,
            });
            console.log(`👷 [Member: ${u.role || 'engineer'}] ${memberEmail} -> شركة: ${compId}`);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.error('❌ خطأ أثناء قراءة الشركات من Firestore:', err.message);
  }

  console.log('\n=============================================================');
  console.log('✅ اكتمل تعيين Custom Claims بنجاح لجميع الحسابات.');
  console.log('=============================================================\n');
}

main().catch(err => {
  console.error('خطأ:', err);
  process.exit(1);
});
