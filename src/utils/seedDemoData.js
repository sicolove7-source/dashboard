/**
 * ===================================================================
 * بذار البيانات التجريبية — Demo Data Seeder
 * ===================================================================
 * يملأ المنصة ببيانات حقيقية واقعية عند أول دخول تجريبي
 * حتى يرى المستخدم منصة "حية" لا منصة فارغة.
 */

export const DEMO_SEED_KEY = 'tashteeb-demo-seeded-v1';
export const FIRST_LOGIN_KEY = 'tashteeb-first-login-v1';
export const QUICK_WIN_KEY = 'tashteeb-quick-win-v1';
export const USER_ROLE_KEY = 'tashteeb-user-role-v1';

/** هل تم زرع البيانات التجريبية من قبل لشركة معينة؟ */
export function isDemoSeeded(companyId = null) {
  try {
    const key = companyId ? `${DEMO_SEED_KEY}_${companyId}` : DEMO_SEED_KEY;
    return !!localStorage.getItem(key);
  } catch { return false; }
}

/** هل هذا أول دخول لمستخدم هذه الشركة؟ */
export function isFirstLogin(companyId = null) {
  try {
    const key = companyId ? `${FIRST_LOGIN_KEY}_${companyId}` : FIRST_LOGIN_KEY;
    return !localStorage.getItem(key);
  } catch { return false; }
}

/** تسجيل أن المستخدم أكمل الدخول الأول لشركته */
export function markFirstLoginDone(companyId = null) {
  try {
    const key = companyId ? `${FIRST_LOGIN_KEY}_${companyId}` : FIRST_LOGIN_KEY;
    localStorage.setItem(key, '1');
  } catch {}
}

/** الحصول على حالة الخطوات الثلاث */
export function getQuickWinState() {
  try {
    const raw = localStorage.getItem(QUICK_WIN_KEY);
    return raw ? JSON.parse(raw) : { step1: false, step2: false, step3: false, dismissed: false };
  } catch {
    return { step1: false, step2: false, step3: false, dismissed: false };
  }
}

/** تحديث حالة خطوة معينة */
export function markQuickWinStep(step) {
  try {
    const state = getQuickWinState();
    state[step] = true;
    localStorage.setItem(QUICK_WIN_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('quickwin-update', { detail: state }));
  } catch {}
}

/** رفض بطاقة الخطوات نهائياً */
export function dismissQuickWin() {
  try {
    const state = getQuickWinState();
    state.dismissed = true;
    localStorage.setItem(QUICK_WIN_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('quickwin-update', { detail: state }));
  } catch {}
}

/** هل أكمل المستخدم كل الخطوات الثلاث؟ */
export function isQuickWinComplete() {
  const s = getQuickWinState();
  return s.step1 && s.step2 && s.step3;
}

/**
 * زرع بيانات تجريبية واقعية لمشروع تشطيب كامل
 * @param {string} storageKey - مفتاح localStorage للمشاريع
 * @param {string} teamKey - مفتاح localStorage للفريق
 * @param {string} companyId - معرّف الشركة لتخصيص الكاش والعزل
 */
export function seedDemoData(storageKey = 'finishing-projects-v2', teamKey = 'finishing-team-v2', companyId = null) {
  if (isDemoSeeded(companyId)) return false;

  const now = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const startDate = new Date(now); startDate.setDate(now.getDate() - 45);
  const endDate = new Date(now); endDate.setDate(now.getDate() + 60);

  /* ─── مشروع 1: فيلا سوبر لوكس ─── */
  const project1 = {
    id: 'demo-proj-001',
    name: 'فيلا سوبر لوكس — التجمع الخامس',
    client: 'المهندس أحمد سعد الدين',
    clientPhone: '0100-123-4567',
    status: 'active',
    progress: 67,
    budget: 850000,
    spent: 569500,
    startDate: fmt(startDate),
    endDate: fmt(endDate),
    location: 'التجمع الخامس، القاهرة الجديدة',
    type: 'سوبر لوكس',
    floors: 'دوبلكس (3 طوابق)',
    area: 320,
    notes: 'فيلا دوبلكس ذات تشطيب سوبر لوكس مع تصميم داخلي عصري. العميل متابع بشكل مستمر.',
    contractValue: 850000,
    clientPortalEnabled: true,
    clientPortalToken: 'demo-portal-token-001',
    photos: [],
    payments: [
      { id: 'p1', date: fmt(startDate), amount: 255000, note: 'دفعة أولى 30%', type: 'received' },
      { id: 'p2', date: fmt(new Date(now.getTime() - 20 * 86400000)), amount: 170000, note: 'دفعة ثانية مرحلة البنية', type: 'received' },
    ],
    dailyLogs: [
      {
        id: 'log1',
        date: fmt(new Date(now.getTime() - 1 * 86400000)),
        author: 'م. خالد إبراهيم',
        text: 'تم الانتهاء من تركيب بلاط الرخام في صالة الطابق الأول. العمالة الحاضرة 8 أفراد. لا توجد مشاكل.',
        phase: 'تشطيب',
        weather: 'جيد',
        laborCount: 8,
      },
      {
        id: 'log2',
        date: fmt(new Date(now.getTime() - 3 * 86400000)),
        author: 'م. خالد إبراهيم',
        text: 'استلام كميات السيراميك الخاص بالحمامات. مطابق للمواصفات. بدء أعمال الدهان في غرف النوم.',
        phase: 'تشطيب',
        weather: 'جيد',
        laborCount: 10,
      },
      {
        id: 'log3',
        date: fmt(new Date(now.getTime() - 7 * 86400000)),
        author: 'م. خالد إبراهيم',
        text: 'انتهاء أعمال عزل السطح بالكامل. تم اختبار الضغط بنجاح 8 بار. ملاحظة: تأخير في توريد الجبس من المورد.',
        phase: 'عزل',
        weather: 'غائم جزئياً',
        laborCount: 12,
      }
    ],
    workItems: [
      { id: 'w1', name: 'أعمال البلاط والسيراميك', unit: 'م2', qty: 320, unitPrice: 450, completed: 215, status: 'inprogress' },
      { id: 'w2', name: 'أعمال الدهانات', unit: 'م2', qty: 890, unitPrice: 85, completed: 450, status: 'inprogress' },
      { id: 'w3', name: 'عزل الأسطح', unit: 'م2', qty: 180, unitPrice: 220, completed: 180, status: 'done' },
      { id: 'w4', name: 'أعمال الكهرباء الداخلية', unit: 'نقطة', qty: 120, unitPrice: 380, completed: 120, status: 'done' },
      { id: 'w5', name: 'أعمال السباكة', unit: 'نقطة', qty: 45, unitPrice: 650, completed: 30, status: 'inprogress' },
      { id: 'w6', name: 'تركيب الأبواب والنوافذ', unit: 'قطعة', qty: 22, unitPrice: 3500, completed: 14, status: 'inprogress' },
    ],
    subcontractors: [
      {
        id: 'sub1',
        name: 'مقاولات الجودة للبلاط',
        trade: 'بلاط وسيراميك',
        contractValue: 144000,
        paid: 80000,
        retention: 5,
        status: 'active',
        phone: '0111-222-3333',
      },
      {
        id: 'sub2',
        name: 'أستاذ سيد الكهربائي',
        trade: 'أعمال كهرباء',
        contractValue: 45600,
        paid: 45600,
        retention: 0,
        status: 'completed',
        phone: '0122-333-4444',
      }
    ],
    expenses: [
      { id: 'exp1', date: fmt(new Date(now.getTime() - 30 * 86400000)), category: 'مواد خام', description: 'رخام كريمي بيج إيطالي', amount: 185000, supplier: 'شركة النيل للرخام' },
      { id: 'exp2', date: fmt(new Date(now.getTime() - 20 * 86400000)), category: 'عمالة', description: 'أجور عمال البلاط — الشهر الأول', amount: 28500, supplier: '' },
      { id: 'exp3', date: fmt(new Date(now.getTime() - 10 * 86400000)), category: 'دهانات', description: 'دهانات JOTUN صواني وأسقف', amount: 42000, supplier: 'مخزن الوان الأهرام' },
    ]
  };

  /* ─── مشروع 2: شقة اوبر لوكس ─── */
  const project2 = {
    id: 'demo-proj-002',
    name: 'شقة أوبر لوكس — مدينة نصر',
    client: 'دكتورة سلمى رضا',
    clientPhone: '0101-987-6543',
    status: 'active',
    progress: 35,
    budget: 320000,
    spent: 112000,
    startDate: fmt(new Date(now.getTime() - 20 * 86400000)),
    endDate: fmt(new Date(now.getTime() + 90 * 86400000)),
    location: 'مدينة نصر، القاهرة',
    type: 'أوبر لوكس',
    floors: 'شقة (طابق واحد)',
    area: 185,
    notes: 'تشطيب شقة لعائلة صغيرة. العميلة تهتم بجودة الخامات الأوروبية فقط.',
    contractValue: 320000,
    clientPortalEnabled: true,
    clientPortalToken: 'demo-portal-token-002',
    photos: [],
    payments: [
      { id: 'p1', date: fmt(new Date(now.getTime() - 18 * 86400000)), amount: 96000, note: 'دفعة أولى 30%', type: 'received' },
    ],
    dailyLogs: [
      {
        id: 'log1',
        date: fmt(new Date(now.getTime() - 1 * 86400000)),
        author: 'م. هند الشامي',
        text: 'انتهاء أعمال الجبس المصري في غرفتي النوم والصالة. بدء أعمال البرايمر.',
        phase: 'تشطيب خفيف',
        weather: 'جيد',
        laborCount: 6,
      }
    ],
    workItems: [
      { id: 'w1', name: 'أعمال الجبس والتشطيب', unit: 'م2', qty: 185, unitPrice: 320, completed: 130, status: 'inprogress' },
      { id: 'w2', name: 'فرش وتبليط', unit: 'م2', qty: 185, unitPrice: 380, completed: 0, status: 'pending' },
      { id: 'w3', name: 'دهانات', unit: 'م2', qty: 520, unitPrice: 75, completed: 0, status: 'pending' },
    ],
    subcontractors: [],
    expenses: [
      { id: 'exp1', date: fmt(new Date(now.getTime() - 15 * 86400000)), category: 'مواد خام', description: 'جبس مصري وخامات تشطيب', amount: 38000, supplier: 'مواد بناء الرواد' },
    ]
  };

  /* ─── فريق العمل التجريبي ─── */
  const demoTeam = {
    engineers: [
      { id: 'eng1', name: 'م. خالد إبراهيم', phone: '0100-111-2222', email: 'khaled@demo.com', role: 'مهندس موقع', assignedProject: 'demo-proj-001', salary: 8000, status: 'active' },
      { id: 'eng2', name: 'م. هند الشامي', phone: '0101-333-4444', email: 'hind@demo.com', role: 'مهندس موقع', assignedProject: 'demo-proj-002', salary: 7500, status: 'active' },
      { id: 'eng3', name: 'م. محمود أبو العلا', phone: '0122-555-6666', email: 'mahmoud@demo.com', role: 'مهندس مكتب فني', assignedProject: null, salary: 9000, status: 'active' },
    ],
    accountants: [
      { id: 'acc1', name: 'أ. نورهان فاروق', phone: '0111-777-8888', email: 'nourhan@demo.com', role: 'محاسبة', salary: 7000, status: 'active' },
    ],
    techOffice: [],
    customerService: [],
  };

  if (companyId) {
    project1.companyId = companyId;
    project2.companyId = companyId;
  }

  try {
    const existingProjects = localStorage.getItem(storageKey);
    if (!existingProjects || JSON.parse(existingProjects).length === 0) {
      localStorage.setItem(storageKey, JSON.stringify([project1, project2]));
    }
    const existingTeam = localStorage.getItem(teamKey);
    if (!existingTeam) {
      localStorage.setItem(teamKey, JSON.stringify(demoTeam));
    }
    const seedKey = companyId ? `${DEMO_SEED_KEY}_${companyId}` : DEMO_SEED_KEY;
    localStorage.setItem(seedKey, '1');
    return true;
  } catch (e) {
    console.error('seedDemoData error:', e);
    return false;
  }
}
