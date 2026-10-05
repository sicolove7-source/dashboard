/**
 * ==============================================================================
 * سكريبت تصحيح ومطابقة وثائق الشركات والـ Claims (Reconcile Tenants & Claims)
 * ==============================================================================
 * الوضع الافتراضي: Dry-Run فقط (طباعة التباينات والتناقضات دون تعديل أي بيانات)
 * للتنفيذ الفعلي: يتطلب تمرير المعامل الصريح: --apply
 * ==============================================================================
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

const isApplyMode = process.argv.includes('--apply');
const isDryRun = !isApplyMode;

console.log('===============================================================');
console.log(`وضع التشغيل: ${isApplyMode ? '⚠️ تنفيذ فعلي (APPLY MODE)' : '🔍 فحص وطباعة فقط (DRY-RUN MODE)'}`);
console.log('===============================================================\n');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'tashteeb-67d13.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'tashteeb-67d13',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'tashteeb-67d13.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '527043598350',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:527043598350:web:8f9119be0ddf9dab04045f',
};

const app = initializeApp(firebaseConfig, 'ReconcileApp_' + Date.now());
const auth = getAuth(app);
const db = getFirestore(app);

async function runReconciliation() {
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'sicolove7@gmail.com';
  const superAdminPass = process.env.SUPERADMIN_PASSWORD;

  if (superAdminPass) {
    try {
      await signInWithEmailAndPassword(auth, superAdminEmail, superAdminPass);
      console.log(`✅ تم تسجيل الدخول كمسؤول: ${superAdminEmail}`);
    } catch (e) {
      console.warn(`⚠️ تعذر تسجيل الدخول بالبريد (${e.message})، المتابعة بالقراءة العامة/المحاكاة...`);
    }
  }

  console.log('🔄 جلب الشركات من مجموعة companies...');
  const companiesSnap = await getDocs(collection(db, 'companies')).catch((err) => {
    console.error('❌ خطأ في قراءة مجموعة companies:', err.message);
    return { docs: [] };
  });

  const discrepancies = [];

  for (const cDoc of companiesSnap.docs) {
    const compId = cDoc.id;
    const compData = cDoc.data() || {};

    // 1. فحص وثيقة tenants المقابلة
    let tenantData = null;
    try {
      const tSnap = await getDoc(doc(db, 'tenants', compId));
      if (tSnap.exists()) {
        tenantData = tSnap.data();
      }
    } catch (e) {}

    // 2. فحص مستخدمي الشركة
    const usersSnap = await getDocs(collection(db, `companies/${compId}/users`)).catch(() => ({ docs: [] }));
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // تحديد المالك المرجعي (أولاً من adminUid/adminEmail، ثانياً من أقدم مستخدم بدقة owner)
    let candidateOwner = null;
    if (compData.adminUid || compData.adminEmail) {
      candidateOwner = {
        uid: compData.adminUid,
        email: compData.adminEmail,
        source: 'company_doc',
      };
    } else {
      const ownerUser = users.find(u => u.role === 'owner') || users[0];
      if (ownerUser) {
        candidateOwner = {
          uid: ownerUser.uid || ownerUser.id,
          email: ownerUser.email,
          source: 'users_subcollection',
        };
      }
    }

    const issues = [];

    // تباين 1: عدم وجود وثيقة tenants المقابلة
    if (!tenantData) {
      issues.push(`وثيقة tenants/${compId} غير موجودة.`);
    } else if (compData.adminEmail && tenantData.adminEmail && compData.adminEmail !== tenantData.adminEmail) {
      issues.push(`اختلاف adminEmail بين companies (${compData.adminEmail}) و tenants (${tenantData.adminEmail})`);
    }

    // تباين 2: نقص adminUid في وثيقة الشركة
    if (!compData.adminUid && candidateOwner?.uid) {
      issues.push(`وثيقة companies/${compId} تفتقر لـ adminUid (المالك المقترح: ${candidateOwner.email} [${candidateOwner.uid}])`);
    }

    if (issues.length > 0) {
      discrepancies.push({
        companyId: compId,
        companyName: compData.name || compId,
        issues,
        proposedFix: {
          adminUid: candidateOwner?.uid || null,
          adminEmail: candidateOwner?.email || null,
        }
      });
    }
  }

  console.log('\n===============================================================');
  console.log(`📊 نتائج الفحص: تم فحص ${companiesSnap.docs.length} شركة، وُجد ${discrepancies.length} تباين بحاجة لتصحيح.`);
  console.log('===============================================================\n');

  discrepancies.forEach((d, idx) => {
    console.log(`[${idx + 1}] شركة: ${d.companyName} (${d.companyId})`);
    d.issues.forEach(i => console.log(`   - ⚠️ ${i}`));
    console.log(`   - 💡 الإصلاح المقترح: adminUid=${d.proposedFix.adminUid}, adminEmail=${d.proposedFix.adminEmail}\n`);
  });

  if (isDryRun) {
    console.log('ℹ️ انتهى الفحص في وضع Dry-Run. لم يتم تعديل أي بيانات سحابية.');
    console.log('لتطبيق التعديلات، شغل السكريبت مع تمرير: --apply');
  } else {
    console.log('⚡ جاري تطبيق التصحيحات المقترحة...');
    for (const d of discrepancies) {
      if (d.proposedFix.adminUid && d.proposedFix.adminEmail) {
        try {
          await setDoc(doc(db, 'companies', d.companyId), {
            adminUid: d.proposedFix.adminUid,
            adminEmail: d.proposedFix.adminEmail,
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          await setDoc(doc(db, 'tenants', d.companyId), {
            adminEmail: d.proposedFix.adminEmail,
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          console.log(`✅ تم تصحيح بيانات الشركة: ${d.companyId}`);
        } catch (err) {
          console.error(`❌ فشل تصحيح الشركة ${d.companyId}:`, err.message);
        }
      }
    }
    console.log('🎉 اكتمل تطبيق التصحيحات بنجاح.');
  }
}

runReconciliation().catch(err => {
  console.error('Fatal reconciliation error:', err);
  process.exit(1);
});
