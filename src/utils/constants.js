export const STAGES = [
  { key: "site", label: "استلام الموقع والمخططات", weight: 5 },
  { key: "isolation", label: "أعمال العزل", weight: 10 },
  { key: "plaster", label: "المحارة والسيراميك", weight: 20 },
  { key: "ceiling", label: "الأسقف المعلقة (جيبس بورد)", weight: 15 },
  { key: "mep", label: "الكهرباء والصحي (تأسيس نهائي)", weight: 15 },
  { key: "paint", label: "الدهانات", weight: 15 },
  { key: "fittings", label: "الأبواب والشبابيك والتركيبات", weight: 10 },
  { key: "handover", label: "التسليم النهائي والتنظيف", weight: 10 },
];

export const AREAS = [
  "الحي الأول", "الحي الثاني", "الحي الثالث", "الحي الرابع", "الحي الخامس", "الحي السادس",
  "مشروع دار مصر", "مشروع سكن مصر", "مشروع جنة", "بيت الوطن", "منطقة الشاليهات", 
  "المنطقة المركزية", "منطقة النرجس", "منطقة البنفسج", "منطقة الكوثر", "إسكان مبارك (الستين)",
  "منطقة النوادي", "المنطقة الصناعية", "امتداد دمياط الجديدة"
];
export const TYPES = ["فيلا", "شقة سكنية", "مكتب إداري", "محل تجاري", "عيادة طبية", "شقة دوبلكس"];
export const CLIENTS = ["أ. محمد الشريف", "أ. سارة عبد الله", "أ. حسام الدين", "أ. ريم فتحي", "أ. عمرو زيدان", "أ. نور الهدى", "أ. باسم عزت", "أ. ياسمين طه", "أ. وائل جمال", "أ. دينا سامي", "أ. خالد منصور", "أ. مي هشام", "أ. فادي رياض", "أ. سلمى بدر", "أ. طارق نبيل", "أ. آية شوقي", "أ. رامي غنيم", "أ. هالة عادل", "أ. عادل فاروق", "أ. جيهان محمود"];
export const ENGINEERS = ["م. أحمد كامل", "م. ياسر فوزي", "م. مروة سعيد", "م. كريم عادل", "م. هبة الديب"];
export const ACCOUNTANTS = ["أ. سامح فتحي", "أ. نهى إبراهيم"];
export const TECH_OFFICE = ["م. علياء رمضان", "م. طارق حلمي"];
export const SUBMITTAL_ITEMS = ["اعتماد كميات السيراميك والبورسلين", "اعتماد عينات ألوان الدهانات", "مخطط التأسيس الكهربائي المعدّل", "مخطط توزيع الإنارة", "اعتماد نوعية الأبواب الداخلية", "حصر الكميات النهائي (BOQ)", "اعتماد تصميم الأسقف المعلقة"];
export const SUB_STATUS = ["معتمد", "تحت المراجعة", "مطلوب تعديل", "مطلوب"];

export const TASK_STATUS = { pending: "لم يبدأ", in_progress: "جاري التنفيذ", done: "مكتمل" };
export const DIARY_WORK_SAMPLES = ["تنفيذ محارة الحوائط بالصالة", "تركيب سيراميك الحمام الرئيسي", "تمديد أسلاك الكهرباء بالغرف", "دهان معجون أول وجه", "تركيب جيبس بورد بالريسبشن", "تسليم دفعة سيراميك من المورد", "فحص أعمال العزل بعد الانتهاء"];
export const DIARY_ISSUE_SAMPLES = ["لا يوجد", "تأخر توريد مواد من المورد", "غياب جزء من العمالة", "طلب تعديل من العميل على الألوان", "توقف مؤقت بسبب الأمطار"];
export const LABOR_TRADES = ["عمال محارة", "فنيين سيراميك", "كهربائي", "سباك", "نجار ديكور", "عمال دهانات"];
export const MATERIALS_LIST = ["أسمنت", "رمل", "سيراميك أرضيات", "بورسلين حوائط", "دهانات بلاستيك", "جيبس بورد", "أسلاك كهرباء", "مواسير صحي", "غراء بلاط"];
export const MATERIAL_STATUS = ["مطلوبة", "جاري الشراء", "تم التوريد"];
export const EQUIPMENT_LIST = ["سقالات معدنية", "خلاطة أسمنت", "مثقاب كهربائي", "مولد كهرباء احتياطي", "ماكينة قص سيراميك"];

export const STATUS_META = {
  on_track: { label: "على المسار", color: "#166534", bg: "#DCFCE7" },
  at_risk: { label: "يحتاج متابعة", color: "#9A3412", bg: "#FFEDD5" },
  delayed: { label: "متأخر", color: "#991B1B", bg: "#FEE2E2" },
  active: { label: "نشط", color: "#166534", bg: "#DCFCE7" },
  inprogress: { label: "جاري التنفيذ", color: "#166534", bg: "#DCFCE7" },
  in_progress: { label: "جاري التنفيذ", color: "#166534", bg: "#DCFCE7" },
  completed: { label: "مكتمل", color: "#2563EB", bg: "#DBEAFE" },
  done: { label: "مكتمل", color: "#2563EB", bg: "#DBEAFE" },
  paused: { label: "متوقف مؤقتاً", color: "#64748B", bg: "#F1F5F9" },
  pending: { label: "قيد الانتظار", color: "#D97706", bg: "#FEF3C7" },
};

export const PROJECT_PHASES = [
  {
    id: "phase1",
    name: "المرحلة الأولى",
    subtitle: "أعمال التأسيسات",
    durationDays: 10,
    color: "#0F172A",
    colorBg: "#F1F5F9",
    items: [
      { id: "p1_1", label: "اعمال تأسيس سباكة", note: "أنابيب تأسيس + لاتزي + مطبخ (صرف وتغذية)" },
      { id: "p1_2", label: "اعمال العزل المائي", note: "عزل الحمامات والمطبخ" },
      { id: "p1_3", label: "اعمال تأسيس كهرباء", note: "" },
      { id: "p1_4", label: "اعمال تأسيس نجاس تكييفات", note: "تأسيس حاس تكييف أرضي" },
      { id: "p1_5", label: "اعمال محارة", note: "حارة حوائط وسقف" },
      { id: "p1_6", label: "عمالة وتشوينات ونظافه", note: "" },
    ],
  },
  {
    id: "phase2",
    name: "المرحلة الثانية",
    subtitle: "التشطيبات الخام",
    durationDays: 25,
    color: "#334155",
    colorBg: "#F1F5F9",
    items: [
      { id: "p2_1", label: "اعمال الجبس المعلق", note: "أعواد فيناتيك" },
      { id: "p2_2", label: "اعمال محارة الأرضيات", note: "تجهيزات البورسلان" },
      { id: "p2_3", label: "اعمال سحب السلك وتفتيح الاسبوتات", note: "" },
      { id: "p2_4", label: "تأسيس نقاشة", note: "" },
      { id: "p2_5", label: "اعمال بورسلين وبلاط وباركيه", note: "توريد + تركيب" },
      { id: "p2_6", label: "مواد تركيب البورسلان", note: "" },
      { id: "p2_7", label: "التجاليد الخشبية", note: "" },
      { id: "p2_8", label: "الفشرة", note: "" },
      { id: "p2_9", label: "أبواب خشبية", note: "" },
      { id: "p2_10", label: "عمالة وتشوينات ونظافه", note: "" },
    ],
  },
  {
    id: "phase3",
    name: "المرحلة الثالثة",
    subtitle: "التشطيبات العليا",
    durationDays: 10,
    color: "#475569",
    colorBg: "#F8FAFC",
    items: [
      { id: "p3_1", label: "اعمال الرخام", note: "" },
      { id: "p3_2", label: "اعمال الـ PVC للنوافذ", note: "" },
      { id: "p3_3", label: "اعمال الاستوري للتجاليد الخشبية", note: "" },
      { id: "p3_4", label: "اعمال تشطيب الأبواب", note: "" },
      { id: "p3_5", label: "عمالة وتشوينات ونظافه", note: "" },
    ],
  },
  {
    id: "phase4",
    name: "المرحلة الرابعة",
    subtitle: "اللمسات النهائية",
    durationDays: 15,
    color: "#2563EB",
    colorBg: "#EFF6FF",
    items: [
      { id: "p4_1", label: "اعمال تشطيب النقاشة", note: "" },
      { id: "p4_2", label: "توريد الباب المصفح", note: "" },
      { id: "p4_3", label: "تشطيبات الكهرباء", note: "" },
      { id: "p4_4", label: "تشطيبات السباكه", note: "" },
      { id: "p4_5", label: "سيكوريت", note: "" },
      { id: "p4_6", label: "اعمال ورق حائط", note: "" },
      { id: "p4_7", label: "وحدات الحمامات والتلفزيون", note: "" },
      { id: "p4_8", label: "النجف وديكورات الفرش", note: "" },
      { id: "p4_9", label: "عمالة وتشوينات ونظافه", note: "" },
    ],
  },
];

export const QUALITY_GATES = [
  {
    phaseId: "phase1",
    phaseName: "المرحلة الأولى (التأسيسات)",
    checks: [
      { id: "q1_1", title: "اختبار كبس شبكة التغذية بالبار", standard: "كبس 8-10 بار لمدة 24 ساعة بدون أي هبوط مع شهادة ضمان الشركة", criticality: "حرج جداً" },
      { id: "q1_2", title: "اختبار عزل أرضيات الحمامات والمطابخ", standard: "غمر بالماء النظيف بارتفاع 10-15 سم لمدة 48 ساعة والتأكد من انعدام الرشح", criticality: "حرج جداً" },
      { id: "q1_3", title: "استلام بؤج وأوتار المحارة", standard: "استقامة وزوايا 90 درجة بالقِدة الألومنيوم 3م وميزان مياه", criticality: "عالي" },
      { id: "q1_4", title: "فحص مناسيب وتثبيت علب الكهرباء الماجيك", standard: "شِرب موحد لجميع المفاتيح والبرايز وعمق مناسب داخل الحائط", criticality: "متوسط" },
      { id: "q1_5", title: "مراجعة ميول وسريان شبكة الصرف", standard: "ميول 1-2 سم لكل متر مع تفريغ هواء واختبار سريان الماء", criticality: "حرج" },
    ]
  },
  {
    phaseId: "phase2",
    phaseName: "المرحلة الثانية (التشطيبات الخام)",
    checks: [
      { id: "q2_1", title: "فحص شِرب ومناسيب الأرضيات بالليزر", standard: "تحديد الشِرب الموحد قبل فرد المونة لضمان استواء السيراميك والبورسلين", criticality: "عالي" },
      { id: "q2_2", title: "استلام استقامة شاسيهات الجبس بورد", standard: "شاسيه صاج معتمد مع فواصل تمدد وشاش ومعجون خاص ومسامير كل 15 سم", criticality: "عالي" },
      { id: "q2_3", title: "فحص استواء فواصل البورسلين/السيراميك", standard: "استخدام كلبسات التسوية (Tile Leveling System) وانعدام السنانير تماماً", criticality: "حرج" },
      { id: "q2_4", title: "استلام وزنات وحلوق الأبواب الخشبية", standard: "رأسية الحلق بميزان الخيط وتثبيت الكانات بالفوم والمسامير الصلب", criticality: "متوسط" },
      { id: "q2_5", title: "اختبار سحب أسلاك الكهرباء وتجربة السوست", standard: "أسلاك معتمدة أصلية مع عدم وجود تداخل أو تفويت بالأنابيب", criticality: "عالي" },
    ]
  },
  {
    phaseId: "phase3",
    phaseName: "المرحلة الثالثة (التشطيبات العليا)",
    checks: [
      { id: "q3_1", title: "فحص استواء وفواصل عراميس الرخام", standard: "جلي وتلميع مع ملء الفواصل بجولي مطابق للون والتأكد من انعدام التطبيل", criticality: "عالي" },
      { id: "q3_2", title: "استلام قطاعات الـ PVC والزجاج المزدوج", standard: "إحكام كاوتش العزل وفحص تجارب رش الماء للتأكد من عدم تسريب الهواء والأمطار", criticality: "عالي" },
      { id: "q3_3", title: "استلام دهان التجاليد والتشطيب الأولي للأبواب", standard: "نعومة الفيلر/الدوكو وتطابق درجات الألوان مع التصميم المعتمد 3D", criticality: "متوسط" },
    ]
  },
  {
    phaseId: "phase4",
    phaseName: "المرحلة الرابعة (اللمسات النهائية)",
    checks: [
      { id: "q4_1", title: "استلام الدهانات النهائية بكشاف إضاءة جانبي", standard: "فحص الحوائط في الظلام بكشاف إضاءة قوي للتأكد من خلوها من الريجة واللحامات", criticality: "حرج" },
      { id: "q4_2", title: "اختبار لوحة التوزيع وجميع مفاتيح الكهرباء", standard: "تجربة القواطع الأوتوماتيك ومفاتيح الديفياتير ومخارج النت والدش والإضاءة", criticality: "عالي" },
      { id: "q4_3", title: "اختبار تشغيل وضغط خلاطات وأطقم الصحي", standard: "تشغيل المياه لـ 10 دقائق متواصلة وفحص محابس الزاوية وسيفونات الدفن", criticality: "حرج جداً" },
      { id: "q4_4", title: "فحص النظافة والتسليم الفندقي النهائي", standard: "تلميع الرخام، تنظيف الزجاج والألوميتال، وإزالة كافة آثار البويات واللواصق", criticality: "عالي" },
    ]
  }
];

export const NAV = [
  { key: "tenants",        label: "إدارة الشركات (Hub) 👑",  icon: "Crown" },
  { key: "overview",       label: "لوحة المتابعة",          icon: "LayoutDashboard" },
  { key: "crm",            label: "العملاء والمبيعات (CRM)", icon: "BadgePercent" },
  { key: "finance",        label: "المالية الشاملة",         icon: "TrendingUp" },
  { key: "team",           label: "أداء المهندسين",          icon: "Users" },
  { key: "projects",       label: "مواقع العمل",             icon: "Building2" },
  { key: "subcontractors", label: "مقاولو الباطن والمستخلصات", icon: "Hammer" },
  { key: "suppliers",      label: "الموردون والصنايعية",     icon: "Truck" },
  { key: "quotations",     label: "حاسبة المقايسات",        icon: "Calculator" },
  { key: "settings",       label: "إعدادات الشركة",           icon: "Settings" },
];



export const SUBCONTRACTOR_SPECIALTIES = [
  "أعمال المحارة والبياض",
  "أعمال السباكة والصحي",
  "أعمال الكهرباء والإنارة",
  "أعمال السيراميك والبورسلين والرخام",
  "أعمال الجبس بورد والأسقف المعلقة",
  "أعمال الدهانات والديكورات",
  "أعمال النجارة والأبواب",
  "أعمال الألوميتال وPVC والواجهات",
  "أعمال العزل المائي والحراري",
  "أعمال التكييف والتهوية",
  "أعمال الحدادة والكريتال",
  "أعمال الزجاج والسيكوريت",
  "أعمال أخرى تخصصية"
];

export const SEED_SUBCONTRACTORS = [
  {
    id: "sub_1",
    name: "مؤسسة الأهرام لأعمال المحارة والواجهات",
    managerName: "المعلم إبراهيم دسوقي",
    specialty: "أعمال المحارة والبياض",
    phone: "01011223344",
    taxNumber: "145-890-332",
    nationalId: "28501011200334",
    address: "دمياط الجديدة - المنطقة المركزية",
    rating: 5,
    status: "active",
    notes: "فريق عمل منظم، سرعة في التنفيذ وجودة عالية في استلام البؤج والأوتار.",
    bankAccount: "بنك مصر - حساب رقم 4589001248"
  },
  {
    id: "sub_2",
    name: "شركة الهدى للأعمال الصحية وشبكات التغذية",
    managerName: "م. محمد الشناوي",
    specialty: "أعمال السباكة والصحي",
    phone: "01122334455",
    taxNumber: "220-415-998",
    nationalId: "29004151201995",
    address: "دمياط - امتداد الحي الرابع",
    rating: 5,
    status: "active",
    notes: "اعتماد كامل لشهادات كبس شبكات التغذية والتأسيسات المدفونة.",
    bankAccount: "البنك الأهلي المصري - 10459874120"
  },
  {
    id: "sub_3",
    name: "ورشة الإتقان للجبس بورد والأسقف الديكورية",
    managerName: "الأسطى ياسر عبد العظيم",
    specialty: "أعمال الجبس بورد والأسقف المعلقة",
    phone: "01233445566",
    taxNumber: "",
    nationalId: "28807121400221",
    address: "كفر البطيخ - طريق الميناء",
    rating: 4,
    status: "active",
    notes: "تنفيذ دقيق للمخططات الديكورية والإنارة المخفية والبيت نور.",
    bankAccount: "فودافون كاش: 01233445566"
  },
  {
    id: "sub_4",
    name: "المركز الهندسي للكهرباء والتيار الخفيف",
    managerName: "م. طارق العوضي",
    specialty: "أعمال الكهرباء والإنارة",
    phone: "01099887766",
    taxNumber: "310-785-114",
    nationalId: "29202021500448",
    address: "دمياط الجديدة - الحي الثالث",
    rating: 4,
    status: "active",
    notes: "تأسيس وتشطيب لوحات التوزيع الذكية ومخارج الدش والإنترنت.",
    bankAccount: "بنك CIB - 10004587123"
  }
];

export const SEED_WORK_ORDERS = [
  {
    id: "wo_101",
    code: "WO-2026-001",
    projectId: "p1",
    projectName: "تشطيب فيلا - الحي الأول",
    subcontractorId: "sub_1",
    subcontractorName: "مؤسسة الأهرام لأعمال المحارة والواجهات",
    specialty: "أعمال المحارة والبياض",
    title: "أعمال بياض ومحارة حوائط وأسقف كامل الفيلا",
    startDate: "2026-08-01",
    endDate: "2026-09-15",
    retentionRate: 5,
    advancePayment: 15000,
    status: "in_progress",
    items: [
      { id: "item_1", description: "بياض محارة حوائط داخلية بالقدة والميزان والزوايا", unit: "م2", quantity: 850, unitPrice: 45, total: 38250 },
      { id: "item_2", description: "بياض أسقف معالجة مصيص وترميم", unit: "م2", quantity: 280, unitPrice: 50, total: 14000 },
      { id: "item_3", description: "طرطشة عمومية وبؤج وأوتار مسلحة", unit: "مقطوعية", quantity: 1, unitPrice: 5000, total: 5000 },
    ],
    terms: "يتم تسليم الأعمال بالقدة الألومنيوم 3م وميزان المياه بنسبة استواء 100%. خصم 5% ضمان أعمال يصرف بعد 6 أشهر من التسليم النهائي.",
    createdAt: "2026-08-01"
  },
  {
    id: "wo_102",
    code: "WO-2026-002",
    projectId: "p2",
    projectName: "تشطيب شقة سكنية - مشروع دار مصر",
    subcontractorId: "sub_2",
    subcontractorName: "شركة الهدى للأعمال الصحية وشبكات التغذية",
    specialty: "أعمال السباكة والصحي",
    title: "تأسيس كامل لشبكة السباكة والصرف لـ 3 حمامات ومطبخ",
    startDate: "2026-08-10",
    endDate: "2026-08-28",
    retentionRate: 10,
    advancePayment: 8000,
    status: "completed",
    items: [
      { id: "item_4", description: "تأسيس تغذية حمام رئيسي وماستر ومطبخ (PPR)", unit: "مقطوعية", quantity: 3, unitPrice: 6500, total: 19500 },
      { id: "item_5", description: "شبكة صرف داخلي ومعلق سمارت", unit: "مقطوعية", quantity: 1, unitPrice: 4500, total: 4500 },
      { id: "item_6", description: "عزل مائي كيميائي للأرضيات مع كبس واختبار 48 ساعة", unit: "م2", quantity: 45, unitPrice: 90, total: 4050 },
    ],
    terms: "إحضار شهادة ضمان وكبس معتمدة من شركة المواسير (8-10 بار). ضمان الأعمال 10% يصرف مع التسليم النهائي للمشروع.",
    createdAt: "2026-08-10"
  }
];

export const SEED_EXTRACTS = [
  {
    id: "ext_1001",
    extractNumber: 1,
    type: "interim",
    workOrderId: "wo_101",
    workOrderCode: "WO-2026-001",
    projectId: "p1",
    projectName: "تشطيب فيلا - الحي الأول",
    subcontractorId: "sub_1",
    subcontractorName: "مؤسسة الأهرام لأعمال المحارة والواجهات",
    date: "2026-08-18",
    periodFrom: "2026-08-01",
    periodTo: "2026-08-18",
    items: [
      {
        itemId: "item_1",
        description: "بياض محارة حوائط داخلية بالقدة والميزان والزوايا",
        unit: "م2",
        contractQty: 850,
        unitPrice: 45,
        prevQty: 0,
        currentQty: 400,
        totalQty: 400,
        totalAmount: 18000
      },
      {
        itemId: "item_2",
        description: "بياض أسقف معالجة مصيص وترميم",
        unit: "م2",
        contractQty: 280,
        unitPrice: 50,
        prevQty: 0,
        currentQty: 100,
        totalQty: 100,
        totalAmount: 5000
      },
      {
        itemId: "item_3",
        description: "طرطشة عمومية وبؤج وأوتار مسلحة",
        unit: "مقطوعية",
        contractQty: 1,
        unitPrice: 5000,
        prevQty: 0,
        currentQty: 1,
        totalQty: 1,
        totalAmount: 5000
      }
    ],
    grossAmount: 28000,
    prevGrossAmount: 0,
    currentGrossAmount: 28000,
    advanceDeduction: 7500,
    retentionRate: 5,
    retentionAmount: 1400,
    penaltyDeduction: 0,
    netAmount: 19100,
    status: "paid",
    paidAt: "2026-08-20",
    paidAmount: 19100,
    paymentMethod: "تحويل بنكي",
    notes: "تم فحص الاستلامات الهندسية من م. أحمد كامل واعتماد الصرف."
  },
  {
    id: "ext_1002",
    extractNumber: 1,
    type: "final",
    workOrderId: "wo_102",
    workOrderCode: "WO-2026-002",
    projectId: "p2",
    projectName: "تشطيب شقة سكنية - مشروع دار مصر",
    subcontractorId: "sub_2",
    subcontractorName: "شركة الهدى للأعمال الصحية وشبكات التغذية",
    date: "2026-08-28",
    periodFrom: "2026-08-10",
    periodTo: "2026-08-28",
    items: [
      { itemId: "item_4", description: "تأسيس تغذية حمام رئيسي وماستر ومطبخ (PPR)", unit: "مقطوعية", contractQty: 3, unitPrice: 6500, prevQty: 0, currentQty: 3, totalQty: 3, totalAmount: 19500 },
      { itemId: "item_5", description: "شبكة صرف داخلي ومعلق سمارت", unit: "مقطوعية", contractQty: 1, unitPrice: 4500, prevQty: 0, currentQty: 1, totalQty: 1, totalAmount: 4500 },
      { itemId: "item_6", description: "عزل مائي كيميائي للأرضيات مع كبس واختبار 48 ساعة", unit: "م2", contractQty: 45, unitPrice: 90, prevQty: 0, currentQty: 45, totalQty: 45, totalAmount: 4050 },
    ],
    grossAmount: 28050,
    prevGrossAmount: 0,
    currentGrossAmount: 28050,
    advanceDeduction: 8000,
    retentionRate: 10,
    retentionAmount: 2805,
    penaltyDeduction: 0,
    netAmount: 17245,
    status: "paid",
    paidAt: "2026-08-30",
    paidAmount: 17245,
    paymentMethod: "نقداً من الخزينة",
    notes: "مستخلص ختامي تم اعتماده وصرفه بعد اختبار كبس المياه وشهادة الضمان."
  }
];

export const SEED_LEADS = [
  { id: "lead_1", name: "د. طارق المنشاوي", phone: "01012345678", area: "بيت الوطن", type: "فيلا", budget: 850000, source: "facebook", stage: "quotation", createdAt: "2026-08-20", notes: "يرغب في تشطيب الترا سوبر لوكس مع حمام سباحة وتكييف مركزي." },
  { id: "lead_2", name: "م. ريهام الشناوي", phone: "01123456789", area: "مشروع جنة", type: "شقة سكنية", budget: 380000, source: "referral", stage: "inspection", createdAt: "2026-08-24", notes: "معاينة يوم السبت القادم لرفع المقاسات للشقة 160م." },
  { id: "lead_3", name: "أ. عصام عبد الرحمن", phone: "01234567890", area: "المنطقة المركزية", type: "عيادة طبية", budget: 290000, source: "instagram", stage: "negotiation", createdAt: "2026-08-15", notes: "تم إرسال المقايسة وجاري مناقشة طريقة سداد الدفعات." },
  { id: "lead_4", name: "أ. منى زهران", phone: "01098765432", area: "الحي الثاني", type: "شقة دوبلكس", budget: 620000, source: "website", stage: "new_lead", createdAt: "2026-08-27", notes: "استفسار من الإعلان عن باقة التشطيب الكامل." },
  { id: "lead_5", name: "د. حسام السعيد", phone: "01555544433", area: "منطقة النرجس", type: "مكتب إداري", budget: 450000, source: "direct_call", stage: "won", createdAt: "2026-08-10", notes: "تم توقيع العقد واعتماد المقايسة وجاهز لبدء التأسيس." }
];

