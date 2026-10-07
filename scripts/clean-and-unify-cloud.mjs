import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM',
  authDomain: 'tashteeb-67d13.firebaseapp.com',
  projectId: 'tashteeb-67d13',
  storageBucket: 'tashteeb-67d13.firebasestorage.app',
  messagingSenderId: '527043598350',
  appId: '1:527043598350:web:8f9119be0ddf9dab04045f'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// قائمة بالشركات التجريبية والوهمية الواضحة التي تم إنشاؤها أثناء الفحص والتطوير
const JUNK_COMPANY_IDS = new Set([
  'comp_qwqa',
  'comp_zxzxzx',
  'comp_vbnmb',
  'comp_vvvdvdv',
  'comp_vvvdfggg',
  'comp_xddss',
  'comp_vdvdssx',
  'comp_frggrr',
  'comp_cfddttytt',
  'comp_creee',
  'comp_cscssscc',
  'comp_ddcaa',
  'comp_ddvees',
  'comp_mmmmmm',
  'comp_mmn',
  'comp_mknn',
  'comp_momm',
  'comp_wwss',
  'comp_zzzz',
  'comp_c_mu5y6shw',
  'comp_c_mu5y4mhj',
  'comp_c_mu4jgla4',
  'comp_c_mu6wy3uf',
  'comp_c_mu6o18ee',
  'comp_c_mu66v683',
  'comp_c_mu66qxhi',
  'comp_c_mu5y7m8s',
  'comp_nnm',
  'comp_dsew',
  'comp_fvv',
  'comp_eww',
  'comp_mnbvc',
  'comp_tyt',
  'comp_ddss',
  'comp_ddcc',
  'comp_mnnnn',
  'comp_daraldhabi',
  'comp_dhhy',
  'comp_nhnh',
  'comp_asaqa',
  'comp_mnj',
  'comp_check897685',
  'comp_cdptest3621',
  'comp_mulhdidl',
  'comp_testcomp123',
  'comp_1790959395434',
  'comp_1790959498771',
  'comp_testcompany',
  'comp_ccff',
]);

async function cleanAndUnify() {
  console.log('🔑 Logging in as SuperAdmin...');
  await signInWithEmailAndPassword(auth, 'sicolove7@gmail.com', '123456');

  // 1. تنظيف tenant_directory من النطاقات المكسورة (undefined)
  console.log('\n--- 1. تنظيف tenant_directory ---');
  const dirSnap = await getDocs(collection(db, 'tenant_directory'));
  let cleanedDirs = 0;
  for (const d of dirSnap.docs) {
    const data = d.data();
    const isCorrupted = !data.companyId || data.companyId === 'undefined' || data.name === 'undefined' || !data.name;
    const isJunk = JUNK_COMPANY_IDS.has(data.companyId);
    if (isCorrupted || isJunk) {
      await deleteDoc(d.ref);
      console.log(`   🗑️ تم حذف النطاق المعلق: [${d.id}] (companyId: ${data.companyId})`);
      cleanedDirs++;
    }
  }
  console.log(`✅ إجمالي النطاقات المكسورة/المحذوفة: ${cleanedDirs}`);

  // 2. تحديث وتنظيف platform_metadata/tenants
  console.log('\n--- 2. تنظيف platform_metadata/tenants ---');
  const metaTenantsRef = doc(db, 'platform_metadata', 'tenants');
  const metaSnap = await getDoc(metaTenantsRef);
  let activeTenants = [];
  let deletedFromList = 0;

  if (metaSnap.exists()) {
    const currentList = metaSnap.data()?.tenants || [];
    console.log(`   العدد قبل التنظيف: ${currentList.length}`);

    activeTenants = currentList.filter(t => {
      if (!t || !t.id) return false;
      const isJunk = JUNK_COMPANY_IDS.has(t.id);
      if (isJunk) {
        deletedFromList++;
        return false;
      }
      return true;
    });

    console.log(`   العدد بعد استبعاد الوهمي: ${activeTenants.length}`);
    await setDoc(metaTenantsRef, {
      tenants: activeTenants,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`✅ تم تحديث قائمة الشركات المركزية في السحابة بنجاح!`);
  }

  // 3. تسجيل كافة المعرفات المحذوفة في platform_metadata/deleted_tenants
  console.log('\n--- 3. تسجيل المحذوفات في platform_metadata/deleted_tenants ---');
  const deletedRef = doc(db, 'platform_metadata', 'deleted_tenants');
  const deletedSnap = await getDoc(deletedRef);
  const existingDeleted = new Set(deletedSnap.exists() ? (deletedSnap.data()?.deletedIds || []) : []);

  JUNK_COMPANY_IDS.forEach(id => {
    existingDeleted.add(id);
    if (id.startsWith('comp_')) existingDeleted.add(id.replace(/^comp_/, ''));
    else existingDeleted.add(`comp_${id}`);
  });

  await setDoc(deletedRef, {
    deletedIds: Array.from(existingDeleted),
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(`✅ تم حفظ ${existingDeleted.size} معرف محذوف في platform_metadata/deleted_tenants لمنع ظهورها عبر أي متصفح!`);

  // 4. وسم وثائق الشركات المحذوفة في companies/ بـ status: deleted
  console.log('\n--- 4. وسم الوثائق المحذوفة في companies/ ---');
  let markedCount = 0;
  for (const jId of JUNK_COMPANY_IDS) {
    try {
      const cRef = doc(db, 'companies', jId);
      const cSnap = await getDoc(cRef);
      if (cSnap.exists()) {
        await setDoc(cRef, {
          status: 'deleted',
          isDeleted: true,
          deletedAt: new Date().toISOString()
        }, { merge: true });
        markedCount++;
      }
    } catch (e) {}
  }
  console.log(`✅ تم وسم ${markedCount} وثيقة شركة كـ status: deleted`);

  console.log('\n=============================================');
  console.log('🎉 اكتملت عملية تنظيف وتوحيد السحابة بنجاح تام!');
  console.log(`الشركات النشطة المتبقية والمعتمدة: ${activeTenants.length} شركة`);
  activeTenants.forEach(t => console.log(`   - [${t.id}] "${t.name}" (${t.subdomain || 'no-sub'})`));
  console.log('=============================================');
}

cleanAndUnify().catch(console.error);
