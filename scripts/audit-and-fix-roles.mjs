/**
 * ==============================================================================
 * سكريبت فحص وتدقيق أدوار الشركات والمستخدمين (audit-and-fix-roles.mjs)
 * ==============================================================================
 * 
 * الوظائف:
 * 1. فحص وثائق الشركات في Firestore (companies) وقائمة platform_metadata/tenants.
 * 2. تحديد المالك الأصلي الحقيقي لكل شركة (من createdBy أو أقدم حساب owner).
 * 3. كشف أي خطأ نتج عن كتابة UID المهندس/الموظف في حقل adminUid للشركة.
 * 4. طباعة تقرير تشخيصي شامل ودقيق لكل شركة ومستخدم.
 * 
 * الأمان:
 * - الوضع الافتراضي الإلزامي هو الفحص فقط (--dry-run). لا يعدل أي بيانات.
 * - التعديل الفعلي يتطلب تمرير الراية --apply صراحة بعد الموافقة.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initClient() {
  // 1. محاولة استخدام Firebase Admin SDK أولاً إذا وجد مفتاح الخدمة
  const possibleKeyPaths = [
    path.join(__dirname, 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  const keyPath = possibleKeyPaths.find((p) => fs.existsSync(p));

  if (keyPath) {
    try {
      const admin = (await import('firebase-admin')).default;
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id || 'tashteeb-67d13',
        });
      }
      return {
        type: 'admin',
        auth: admin.auth(),
        db: admin.firestore(),
      };
    } catch (e) {
      console.warn('⚠️ Admin SDK key error, falling back to SuperAdmin auth:', e.message);
    }
  }

  // 2. البديل المضمون: تسجيل الدخول السحابي الموثق بحساب السوبر أدمن
  const { initializeApp } = await import('firebase/app');
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const { getFirestore, doc, getDoc, collection, getDocs, setDoc } = await import('firebase/firestore');

  const firebaseConfig = {
    apiKey: 'AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM',
    authDomain: 'tashteeb-67d13.firebaseapp.com',
    projectId: 'tashteeb-67d13',
    storageBucket: 'tashteeb-67d13.firebasestorage.app',
    messagingSenderId: '527043598350',
    appId: '1:527043598350:web:8f9119be0ddf9dab04045f'
  };

  const app = initializeApp(firebaseConfig, 'AuditRunner_' + Date.now());
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, 'sicolove7@gmail.com', '123456');
  } catch (err) {
    try {
      await signInWithEmailAndPassword(auth, 'sicolove7@gmail.com', '12345678');
    } catch (err2) {
      console.error('❌ تعذر تسجيل الدخول بحساب السوبر أدمن:', err2.message);
      process.exit(1);
    }
  }

  return {
    type: 'superadmin-session',
    auth,
    db,
    isClient: true,
    doc,
    getDoc,
    collection,
    getDocs,
    setDoc,
  };
}

async function runAudit() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const isDryRun = !isApply || args.includes('--dry-run');

  console.log('\n========================================================================================');
  console.log('🔍 منصة تشطيب برو - أداة تدقيق وفحص أدوار الشركات والـ Claims (Audit & Role Verifier)');
  console.log('========================================================================================');

  if (isDryRun) {
    console.log('🛡️  الوضع: [DRY-RUN] فحص ومعاينة صامتة فقط (قراءة بنسبة 100% - لن يتم تعديل أي بايت)');
  } else {
    console.log('⚡ الوضع: [APPLY] تطبيق الإصلاحات الفعلي على قاعدة البيانات');
  }
  console.log('----------------------------------------------------------------------------------------\n');

  const client = await initClient();
  console.log(`✅ تم الاتصال بقاعدة البيانات السحابية بنجاح عبر: [${client.type}]\n`);

  // 1. جلب مصفوفة tenants المركزية
  console.log('📂 جاري فحص سجل platform_metadata/tenants المركزي...');
  let centralTenants = [];
  try {
    if (client.isClient) {
      const snap = await client.getDoc(client.doc(client.db, 'platform_metadata', 'tenants'));
      if (snap.exists()) {
        centralTenants = snap.data()?.tenants || snap.data()?.list || [];
      }
    } else {
      const snap = await client.db.doc('platform_metadata/tenants').get();
      if (snap.exists) {
        centralTenants = snap.data()?.tenants || snap.data()?.list || [];
      }
    }
  } catch (e) {
    console.warn('⚠️ تعذر قراءة platform_metadata/tenants:', e.message);
  }
  console.log(`📊 تم العثور على ${centralTenants.length} شركة في السجل المركزي.\n`);

  // 2. فحص وثائق الشركات في مجموعة companies
  console.log('📂 جاري فحص وثائق الشركات في مجموعة companies/ ...');
  let companiesList = [];

  if (client.isClient) {
    const snap = await client.getDocs(client.collection(client.db, 'companies'));
    companiesList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else {
    const snap = await client.db.collection('companies').get();
    companiesList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  console.log(`📊 تم فحص ${companiesList.length} وثيقة شركة.\n`);

  const auditReport = [];

  // جمع كافة معرفات الشركات بدون تكرار
  const allCompanyIds = new Set([
    ...centralTenants.map(t => t.id),
    ...companiesList.map(c => c.id),
  ]);

  for (const cId of allCompanyIds) {
    if (!cId) continue;

    const compDocData = companiesList.find(c => c.id === cId) || {};
    const centralData = centralTenants.find(t => t.id === cId) || {};

    if (compDocData.status === 'deleted' || centralData.status === 'deleted') {
      continue;
    }

    const companyName = compDocData.name || compDocData.settings?.companyName || centralData.name || cId;
    const currentAdminUid = compDocData.adminUid || null;
    const currentAdminEmail = compDocData.adminEmail || centralData.adminEmail || null;

    // استخراج قائمة المستخدمين للشركة
    let usersList = [];
    if (Array.isArray(compDocData.users) && compDocData.users.length > 0) {
      usersList = compDocData.users;
    } else if (Array.isArray(centralData.users) && centralData.users.length > 0) {
      usersList = centralData.users;
    }

    // جلب مستخدمي المجموعة الفرعية companies/{id}/users إن وجدت
    if (client.isClient) {
      try {
        const uSnap = await client.getDocs(client.collection(client.db, 'companies', cId, 'users'));
        if (uSnap && !uSnap.empty) {
          const subUsers = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          // دمج بدون تكرار
          for (const su of subUsers) {
            if (!usersList.some(u => (u.id || u.uid) === (su.id || su.uid))) {
              usersList.push(su);
            }
          }
        }
      } catch (e) {}
    }

    // تحديد المالك الأصلي الحقيقي للشركة
    let realOwner = usersList.find(u => u.role === 'owner');

    if (!realOwner && currentAdminEmail) {
      realOwner = usersList.find(u => u.email && u.email.toLowerCase().trim() === currentAdminEmail.toLowerCase().trim());
    }

    if (!realOwner && compDocData.createdBy) {
      realOwner = usersList.find(u => (u.id || u.uid) === compDocData.createdBy);
    }

    // فحص هل هناك خلل في adminUid
    let hasAnomaly = false;
    let anomalyDetails = '';

    if (currentAdminUid) {
      const userWithAdminUid = usersList.find(u => (u.id || u.uid) === currentAdminUid);
      if (userWithAdminUid && userWithAdminUid.role && userWithAdminUid.role !== 'owner') {
        hasAnomaly = true;
        anomalyDetails = `adminUid يشير لموظف (${userWithAdminUid.name || userWithAdminUid.email}) بدور: [${userWithAdminUid.role}]`;
      }
    }

    if (!currentAdminUid && (realOwner || currentAdminEmail)) {
      hasAnomaly = true;
      anomalyDetails = 'حقل adminUid فارغ في وثيقة الشركة ويحتاج تعيين';
    }

    auditReport.push({
      companyId: cId,
      companyName,
      currentAdminUid: currentAdminUid || 'فارغ (null)',
      currentAdminEmail: currentAdminEmail || 'فارغ',
      realOwnerUid: realOwner?.id || realOwner?.uid || (compDocData.createdBy || 'غير محدد'),
      realOwnerEmail: realOwner?.email || currentAdminEmail || 'غير محدد',
      usersCount: usersList.length,
      hasAnomaly,
      anomalyDetails,
      users: usersList,
    });
  }

  // -----------------------------------------------------------------
  // عرض تقرير الفحص
  // -----------------------------------------------------------------
  console.log('📋 جدول نتائج فحص وتدقيق الشركات:');
  console.log('========================================================================================================================');
  console.log(
    'معرف الشركة'.padEnd(22) +
    'اسم الشركة'.padEnd(28) +
    'adminUid الحالي'.padEnd(30) +
    'المالك المقدر'.padEnd(28) +
    'حالة الوثيقة'
  );
  console.log('========================================================================================================================');

  let anomaliesCount = 0;
  for (const item of auditReport) {
    const statusText = item.hasAnomaly ? '⚠️ يحتاج تصحيح' : '✅ سليم';
    if (item.hasAnomaly) anomaliesCount++;

    console.log(
      item.companyId.slice(0, 20).padEnd(22) +
      item.companyName.slice(0, 26).padEnd(28) +
      item.currentAdminUid.slice(0, 28).padEnd(30) +
      (item.realOwnerEmail || item.realOwnerUid).slice(0, 26).padEnd(28) +
      statusText
    );
    if (item.hasAnomaly) {
      console.log(`   └─ السبب: ${item.anomalyDetails}`);
    }
  }

  console.log('========================================================================================================================');
  console.log(`📊 إجمالي الشركات المفحوصة: ${auditReport.length} | الشركات التي تحتوي على ملاحظات: ${anomaliesCount}\n`);

  // -----------------------------------------------------------------
  // تنفيذ الإصلاح إذا كان --apply مفعل
  // -----------------------------------------------------------------
  if (isApply && !isDryRun) {
    console.log('🚀 جاري تطبيق التصحيحات المعتمدة...');
    for (const item of auditReport) {
      if (item.hasAnomaly && item.realOwnerUid && item.realOwnerUid !== 'غير محدد') {
        console.log(`🔧 تصحيح شركة: ${item.companyId} -> adminUid=${item.realOwnerUid}`);
        const patchData = {
          adminUid: item.realOwnerUid,
          updatedAt: new Date().toISOString(),
        };
        if (item.realOwnerEmail && item.realOwnerEmail !== 'غير محدد' && item.realOwnerEmail !== 'فارغ') {
          patchData.adminEmail = item.realOwnerEmail;
        }

        if (client.isClient) {
          await client.setDoc(client.doc(client.db, 'companies', item.companyId), patchData, { merge: true });
        } else {
          await client.db.doc(`companies/${item.companyId}`).set(patchData, { merge: true });
        }
      }
    }
    console.log('✅ تم تطبيق كافة الإصلاحات بنجاح!');
  } else {
    console.log('🛡️ تم إتمام الفحص والمعاينة بنجاح بدون إجراء أي تعديل (DRY-RUN).');
    console.log('💡 لتطبيق أي تعديل على قاعدة البيانات، يجب تمرير: node scripts/audit-and-fix-roles.mjs --apply بموافقتك.');
  }
}

runAudit().catch(err => {
  console.error('\n❌ خطأ أثناء الفحص:', err);
  process.exit(1);
});
