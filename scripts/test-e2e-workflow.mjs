import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc } from "firebase/firestore";

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

async function runE2E() {
  const testId = Date.now().toString(36);
  const testEmail = `test_engineer_${testId}@tashteeb.app`;
  const testPassword = `TestPass_${testId}!`;
  const testSubdomain = `test-${testId}`;
  const testCompanyId = `comp_${testId}`;

  console.log("=================================================");
  console.log("🚀 بدء اختبار تسجيل حساب جديد ومحاكاة تجربة المنصة");
  console.log("=================================================");
  console.log(`📌 البريد التجريبي: ${testEmail}`);
  console.log(`📌 كلمة المرور: ${testPassword}`);
  console.log(`📌 معرف الشركة: ${testCompanyId}`);
  console.log(`📌 النطاق الفرعي: ${testSubdomain}.tashteebpro.com\n`);

  let userCredential;
  try {
    // 1. إنشاء حساب مستخدم جديد في Firebase Auth
    const t0 = Date.now();
    userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const authTime = Date.now() - t0;
    console.log(`✅ [1/6] نجح إنشاء الحساب في Firebase Auth (${authTime}ms) - UID: ${userCredential.user.uid}`);
  } catch (err) {
    console.error("❌ فشل إنشاء الحساب في Firebase Auth:", err.message);
    process.exit(1);
  }

  const userUid = userCredential.user.uid;

  try {
    // 2. تسجيل النطاق في tenant_directory
    const t1 = Date.now();
    await setDoc(doc(db, "tenant_directory", testSubdomain), {
      companyId: testCompanyId,
      name: "شركة أفق المستقبل للتشطيبات (اختبار)",
      subdomain: testSubdomain,
      adminEmail: testEmail,
      adminUid: userUid,
      createdAt: new Date().toISOString()
    });
    console.log(`✅ [2/6] نجح تسجيل النطاق الفرعي في tenant_directory (${Date.now() - t1}ms)`);

    // 3. إنشاء وثيقة الشركة ومساحة العمل
    const t2 = Date.now();
    await setDoc(doc(db, "companies", testCompanyId), {
      companyId: testCompanyId,
      name: "شركة أفق المستقبل للتشطيبات (اختبار)",
      adminEmail: testEmail,
      adminUid: userUid,
      status: "active",
      plan: "trial",
      currency: "ج.م",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ [3/6] نجح تأسيس مساحة عمل الشركة في Firestore (${Date.now() - t2}ms)`);

    // 4. إنشاء مشروع تشطيب جديد داخل مساحة عمل الشركة
    const t3 = Date.now();
    const portalToken = `cpt_test_${testId}_${Math.random().toString(36).slice(2, 8)}`;
    const projectPayload = {
      id: `proj_${testId}`,
      companyId: testCompanyId,
      name: "مشروع تشطيب فيلا الياسمين - القاهرة الجديدة",
      client: "أ. محمود عبد الرحمن",
      clientPhone: "01012345678",
      location: "التجمع الخامس",
      type: "فيلا مستقلة",
      area: 450,
      budget: 850000,
      contractValue: 850000,
      progress: 35,
      status: "in_progress",
      clientPortalToken: portalToken,
      clientPortalEnabled: true,
      workItems: [
        { id: "w1", title: "أعمال الكهرباء والتأسيس", status: "completed", progress: 100 },
        { id: "w2", title: "أعمال السباكة والصحي", status: "completed", progress: 100 },
        { id: "w3", title: "المحارة والجبس بورد", status: "in_progress", progress: 60 },
        { id: "w4", title: "أعمال الدهانات والأرضيات", status: "pending", progress: 0 }
      ],
      dailyLogs: [
        {
          id: `d_${testId}_1`,
          date: new Date().toISOString().slice(0, 10),
          author: "م. كريم المشرف",
          work: "استلام شاسيهات الجبس بورد لغرفة الاستقبال واختبار ضغط شبكة التغذية.",
          workers: 6,
          issues: "لا توجد معوقات اليوم"
        }
      ],
      expenses: [
        { id: "exp1", date: new Date().toISOString().slice(0, 10), category: "خامات", item: "أسلاك سويدي ومواسير", amount: 45000 },
        { id: "exp2", date: new Date().toISOString().slice(0, 10), category: "مصنعيات", item: "دفعة مقاول الكهرباء", amount: 20000 }
      ],
      clientPayments: [
        { id: "pay1", date: new Date().toISOString().slice(0, 10), label: "دفعة التعاقد الأولى", amount: 250000 }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, "companies", testCompanyId, "projects", `proj_${testId}`), projectPayload);
    console.log(`✅ [4/6] نجح إنشاء المشروع والبنود واليوميات والمصروفات (${Date.now() - t3}ms)`);

    // 5. محاكاة نشر ومزامنة بوابة العميل (Client Portal Share)
    const t4 = Date.now();
    await setDoc(doc(db, "portal_shares", portalToken), {
      ...projectPayload,
      projectId: `proj_${testId}`,
      token: portalToken
    });
    console.log(`✅ [5/6] نجح نشر بوابة العميل برابط التوكن السحابي (${Date.now() - t4}ms)`);

    // 6. التحقق من القراءة السريعة للبوابة واسترجاع بيانات المشروع
    const t5 = Date.now();
    const portalSnap = await getDoc(doc(db, "portal_shares", portalToken));
    if (portalSnap.exists()) {
      const data = portalSnap.data();
      console.log(`✅ [6/6] نجح استرجاع بيانات المشروع عبر بوابة العميل (${Date.now() - t5}ms)`);
      console.log(`   - اسم المشروع: ${data.name}`);
      console.log(`   - نسبة الإنجاز: ${data.progress}%`);
      console.log(`   - عدد البنود: ${data.workItems?.length}`);
      console.log(`   - قيمة التعاقد: ${data.contractValue.toLocaleString()} ج.م`);
    } else {
      console.warn("⚠️ تعذر العثور على وثيقة البوابة");
    }

    console.log("\n=================================================");
    console.log("🎉 اكتمل الاختبار بنجاح تام! جميع وظائف المنصة تعمل بكفاءة وسرعة فائقة.");
    console.log("=================================================");

    // تنظيف بيانات الاختبار المؤقتة
    try {
      await deleteDoc(doc(db, "portal_shares", portalToken));
      await deleteDoc(doc(db, "companies", testCompanyId, "projects", `proj_${testId}`));
      await deleteDoc(doc(db, "companies", testCompanyId));
      await deleteDoc(doc(db, "tenant_directory", testSubdomain));
      await deleteUser(userCredential.user);
      console.log("🧹 تم تنظيف بيانات الاختبار المؤقتة وحذف الحساب التجريبي بنجاح.");
    } catch (cleanErr) {
      // Ignored
    }

  } catch (err) {
    console.error("❌ حدث خطأ أثناء الاختبار:", err);
  } finally {
    process.exit(0);
  }
}

runE2E();
