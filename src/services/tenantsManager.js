/**
 * ===================================================================
 * نظام إدارة الشركات والمشتركين — Multi-Tenant Platform Manager
 * ===================================================================
 * عزل كامل للبيانات، المشاريع، المهندسين، والمالية لكل شركة ومشترك.
 */

import { setGlobalCurrency } from '../utils/helpers';

export const PLATFORM_TENANTS_KEY = 'platform-tenants-master-v1';
export const ACTIVE_TENANT_ID_KEY = 'platform-active-tenant-id';

// حساب مالك المنصة الرئيسي (Super Admin)
export const SUPER_ADMIN_ACCOUNT = {
  id: 'super_admin_master',
  email: 'superadmin@platform.com',
  password: 'admin123',
  name: 'المدير العام للمنصة',
  role: 'super_admin',
  isSuperAdmin: true,
};

// الشركات الافتراضية
export const DEFAULT_TENANTS = [
  {
    id: 'comp_alain',
    name: 'مؤسسة العين الحديثة للتشطيبات والمقاولات',
    subtitle: 'متخصصون في تشطيب القصور والفلل الفاخرة',
    city: 'العين',
    country: 'الإمارات',
    currency: 'د.إ',
    phone: '+971 50 123 4567',
    plan: 'trial',
    planName: 'باقة تجريبية (14 يوماً)',
    status: 'trial',
    startDate: '2026-08-20',
    expiryDate: '2026-09-15',
    primaryColor: '#0F766E',
    accentColor: '#14B8A6',
    adminEmail: 'ceo@alain-contract.ae',
    adminPassword: '123456',
    adminName: 'أ. هزاع الشامسي',
    projectsCount: 3,
    createdAt: '2026-08-20',
  },
  {
    id: 'comp_dhabi',
    name: 'دار الظبي للديكور والتصميم الداخلي',
    subtitle: 'حلول التصميم الراقي والتشطيبات الفاخرة',
    city: 'أبوظبي',
    country: 'الإمارات',
    currency: 'د.إ',
    phone: '+971 52 987 6543',
    plan: 'pro_annual',
    planName: 'باقة النخبة السنوية VIP',
    status: 'active',
    startDate: '2026-01-10',
    expiryDate: '2027-01-10',
    primaryColor: '#4338CA',
    accentColor: '#6366F1',
    adminEmail: 'admin@dar-dhabi.ae',
    adminPassword: '123456',
    adminName: 'م. عبد الله الظاهري',
    projectsCount: 3,
    createdAt: '2026-01-10',
  },
  {
    id: 'comp_cairo',
    name: 'شركة الأفق للتشطيبات والديكور',
    subtitle: 'رواد التشطيبات المتكاملة والمقاولات',
    city: 'القاهرة',
    country: 'مصر',
    currency: 'ج.م',
    phone: '+20 100 555 1234',
    plan: 'pro_monthly',
    planName: 'باقة المحترفين الشهرية',
    status: 'active',
    startDate: '2026-03-01',
    expiryDate: '2026-12-31',
    primaryColor: '#2563EB',
    accentColor: '#3B82F6',
    adminEmail: 'admin@al-ofok.com',
    adminPassword: '123456',
    adminName: 'م. شريف عزمي',
    projectsCount: 2,
    createdAt: '2026-03-01',
  }
];

export function loadAllTenants() {
  try {
    const raw = localStorage.getItem(PLATFORM_TENANTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error loading tenants:", e);
  }
  localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(DEFAULT_TENANTS));
  return [...DEFAULT_TENANTS];
}

export function saveAllTenants(tenants) {
  try {
    localStorage.setItem(PLATFORM_TENANTS_KEY, JSON.stringify(tenants));
  } catch (e) {}
}

export function createTenant(data) {
  const tenants = loadAllTenants();
  const id = 'comp_' + (data.slug || Date.now().toString(36));
  
  const newTenant = {
    id,
    name: data.name?.trim() || 'شركة جديدة',
    subtitle: data.subtitle?.trim() || 'نظام إدارة المشاريع المتكامل',
    city: data.city?.trim() || 'أبوظبي',
    country: data.country?.trim() || 'الإمارات',
    currency: data.currency || 'د.إ',
    phone: data.phone?.trim() || '',
    plan: data.plan || 'trial',
    planName: data.plan === 'trial' ? 'باقة تجريبية (14 يوماً)' : (data.plan === 'pro_annual' ? 'باقة سنوية VIP' : 'باقة شهرية'),
    status: data.status || (data.plan === 'trial' ? 'trial' : 'active'),
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: data.expiryDate || getFutureDate(data.plan === 'trial' ? 14 : 365),
    primaryColor: data.primaryColor || '#0F766E',
    accentColor: data.accentColor || '#14B8A6',
    adminEmail: data.adminEmail?.toLowerCase().trim() || `admin@${id}.ae`,
    adminPassword: data.adminPassword || '123456',
    adminName: data.adminName?.trim() || 'مدير الشركة',
    projectsCount: data.seedDemoProject ? 1 : 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const updated = [newTenant, ...tenants];
  saveAllTenants(updated);

  // إعداد مستخدمي الشركة
  const companyUsers = [
    {
      id: `u_${id}_admin`,
      email: newTenant.adminEmail,
      password: newTenant.adminPassword,
      role: 'owner',
      name: newTenant.adminName,
      engineerName: null,
      companyId: id,
    },
    {
      id: `u_${id}_eng1`,
      email: `eng@${newTenant.adminEmail.split('@')[1] || 'site.ae'}`,
      password: '123456',
      role: 'engineer',
      name: 'م. مهندس الموقع',
      engineerName: 'م. مهندس الموقع',
      companyId: id,
    }
  ];
  localStorage.setItem(`tenant_${id}_users`, JSON.stringify(companyUsers));

  // إعدادات الشركة
  const companySettings = {
    companyName: newTenant.name,
    companySubtitle: newTenant.subtitle,
    city: newTenant.city,
    country: newTenant.country,
    currency: newTenant.currency,
    phone: newTenant.phone,
    primaryColor: newTenant.primaryColor,
    accentColor: newTenant.accentColor,
    companyLogo: null,
  };
  localStorage.setItem(`tenant_${id}_settings`, JSON.stringify(companySettings));

  // الفريق
  const companyTeam = {
    engineers: ['م. مهندس الموقع', 'م. سيف النيادي'],
    accountants: ['أ. المحاسب المالي'],
    techOffice: ['م. المكتب الفني'],
    customerService: []
  };
  localStorage.setItem(`tenant_${id}_team`, JSON.stringify(companyTeam));

  // CRM Leads
  const companyLeads = [
    {
      id: `lead_${id}_1`,
      name: 'سعادة سالم الدرعي',
      phone: '+971 50 888 7766',
      area: newTenant.city,
      type: 'قصر / فيلا مستقلة',
      budget: 1500000,
      source: 'referral',
      stage: 'quotation',
      createdAt: new Date().toISOString().slice(0, 10),
      notes: 'طلب مقايسة تشطيب مجلس رجال ومطبخ تحضيري ورخام إيطالي.',
    }
  ];
  localStorage.setItem(`tenant_${id}_leads`, JSON.stringify(companyLeads));

  // المشاريع
  if (data.seedDemoProject) {
    const demoProject = createSeedVillaProject(id, newTenant);
    localStorage.setItem(`tenant_${id}_projects`, JSON.stringify([demoProject]));
  } else {
    localStorage.setItem(`tenant_${id}_projects`, JSON.stringify([]));
  }

  return newTenant;
}

export function updateTenant(id, updates) {
  const tenants = loadAllTenants();
  const idx = tenants.findIndex(t => t.id === id);
  if (idx !== -1) {
    tenants[idx] = { ...tenants[idx], ...updates };
    saveAllTenants(tenants);
    return tenants[idx];
  }
  return null;
}

export function deleteTenant(id) {
  const tenants = loadAllTenants().filter(t => t.id !== id);
  saveAllTenants(tenants);
  try {
    localStorage.removeItem(`tenant_${id}_projects`);
    localStorage.removeItem(`tenant_${id}_settings`);
    localStorage.removeItem(`tenant_${id}_users`);
    localStorage.removeItem(`tenant_${id}_team`);
    localStorage.removeItem(`tenant_${id}_leads`);
  } catch (e) {}
  return tenants;
}

export function getActiveTenantId() {
  return localStorage.getItem(ACTIVE_TENANT_ID_KEY) || 'comp_alain';
}

export function setActiveTenantId(companyId) {
  localStorage.setItem(ACTIVE_TENANT_ID_KEY, companyId);
}

/**
 * جلب جميع البيانات المعزولة للشركة المحددة
 */
export function getTenantData(companyId) {
  const tenants = loadAllTenants();
  const tenant = tenants.find(t => t.id === companyId) || tenants[0] || DEFAULT_TENANTS[0];

  // 1. الإعدادات والعملة
  let settings = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_settings`);
    if (raw) settings = JSON.parse(raw);
  } catch (e) {}
  if (!settings) {
    settings = {
      companyName: tenant.name,
      companySubtitle: tenant.subtitle,
      city: tenant.city,
      country: tenant.country,
      currency: tenant.currency || 'د.إ',
      phone: tenant.phone,
      primaryColor: tenant.primaryColor,
      accentColor: tenant.accentColor,
      companyLogo: null,
    };
    try { localStorage.setItem(`tenant_${companyId}_settings`, JSON.stringify(settings)); } catch (e) {}
  }

  // 2. المستخدمين
  let users = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_users`);
    if (raw) users = JSON.parse(raw);
  } catch (e) {}
  if (!users || users.length === 0) {
    users = [
      {
        id: `u_${companyId}_admin`,
        email: tenant.adminEmail,
        password: tenant.adminPassword,
        role: 'owner',
        name: tenant.adminName,
        engineerName: null,
        companyId,
      },
      {
        id: `u_${companyId}_eng1`,
        email: `eng@${tenant.adminEmail.split('@')[1] || 'site.ae'}`,
        password: '123456',
        role: 'engineer',
        name: companyId === 'comp_alain' ? 'م. هزاع المنصوري' : (companyId === 'comp_dhabi' ? 'م. عبد الله الظاهري' : 'م. أحمد كامل'),
        engineerName: companyId === 'comp_alain' ? 'م. هزاع المنصوري' : (companyId === 'comp_dhabi' ? 'م. عبد الله الظاهري' : 'م. أحمد كامل'),
        companyId,
      }
    ];
    try { localStorage.setItem(`tenant_${companyId}_users`, JSON.stringify(users)); } catch (e) {}
  }

  // 3. الفريق
  let team = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_team`);
    if (raw) team = JSON.parse(raw);
  } catch (e) {}
  if (!team) {
    if (companyId === 'comp_alain') {
      team = {
        engineers: ['م. هزاع المنصوري', 'م. سيف النيادي', 'م. خليفة الكعبي'],
        accountants: ['أ. حمد الشامسي'],
        techOffice: ['م. فاطمة البلوشي'],
        customerService: ['أ. مريم الظاهري']
      };
    } else if (companyId === 'comp_dhabi') {
      team = {
        engineers: ['م. عبد الله الظاهري', 'م. ناصر الهاشمي', 'م. راشد المزروعي'],
        accountants: ['أ. سلطان القاسمي'],
        techOffice: ['م. شيخة المري'],
        customerService: ['أ. نورة الحوسني']
      };
    } else {
      team = {
        engineers: ['م. أحمد كامل', 'م. ياسر فوزي', 'م. مروة سعيد'],
        accountants: ['أ. سامح فتحي'],
        techOffice: ['م. علياء رمضان'],
        customerService: ['أ. نورا حسن']
      };
    }
    try { localStorage.setItem(`tenant_${companyId}_team`, JSON.stringify(team)); } catch (e) {}
  }

  // 4. الـ CRM Leads
  let leads = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_leads`);
    if (raw) leads = JSON.parse(raw);
  } catch (e) {}
  if (!leads) {
    if (companyId === 'comp_alain') {
      leads = [
        { id: 'lead_alain_1', name: 'سعادة سالم الدرعي', phone: '+971 50 111 2233', area: 'الفوعة', type: 'قصر فاخر', budget: 1800000, source: 'referral', stage: 'quotation', createdAt: '2026-08-20', notes: 'طلب مقايسة تشطيب مجلس رجال ومسبح وحديقة.' },
        { id: 'lead_alain_2', name: 'د. عائشة الكعبي', phone: '+971 50 444 5566', area: 'المرخانية', type: 'فيلا سكنية', budget: 950000, source: 'instagram', stage: 'inspection', createdAt: '2026-08-24', notes: 'موعد معاينة يوم الأحد لرفع مقاسات الفيلا 800م.' },
      ];
    } else if (companyId === 'comp_dhabi') {
      leads = [
        { id: 'lead_dhabi_1', name: 'أ. حمد المزروعي', phone: '+971 52 777 8899', area: 'جزيرة السعديات', type: 'بنتهاوس فاخر', budget: 2400000, source: 'website', stage: 'negotiation', createdAt: '2026-08-15', notes: 'مراجعة عينات الرخام والأنظمة الذكية.' },
        { id: 'lead_dhabi_2', name: 'م. مريم الفلاسي', phone: '+971 52 333 4455', area: 'مدينة خليفة أ', type: 'فيلا عصرية', budget: 1200000, source: 'direct_call', stage: 'won', createdAt: '2026-08-10', notes: 'تم توقيع العقد وجاري توريد المواد.' },
      ];
    } else {
      leads = [
        { id: 'lead_cairo_1', name: 'د. طارق المنشاوي', phone: '01012345678', area: 'بيت الوطن', type: 'فيلا', budget: 850000, source: 'facebook', stage: 'quotation', createdAt: '2026-08-20', notes: 'تشطيب الترا سوبر لوكس.' },
        { id: 'lead_cairo_2', name: 'أ. عصام عبد الرحمن', phone: '01234567890', area: 'النرجس', type: 'عيادة طبية', budget: 290000, source: 'instagram', stage: 'won', createdAt: '2026-08-15', notes: 'تم استلام الدفعة الأولى.' },
      ];
    }
    try { localStorage.setItem(`tenant_${companyId}_leads`, JSON.stringify(leads)); } catch (e) {}
  }

  // 5. المشاريع
  let projects = null;
  try {
    const raw = localStorage.getItem(`tenant_${companyId}_projects`);
    if (raw) projects = JSON.parse(raw);
  } catch (e) {}
  if (!projects || projects.length === 0) {
    projects = generateCompanySeedProjects(companyId, tenant);
    try { localStorage.setItem(`tenant_${companyId}_projects`, JSON.stringify(projects)); } catch (e) {}
  }

  // تحديث العملة العالمية
  if (settings.currency) {
    setGlobalCurrency(settings.currency);
  }

  return { tenant, settings, users, team, leads, projects };
}

export function authenticateTenantUser(email, password) {
  const cleanEmail = email.toLowerCase().trim();

  // 1. فحص حساب الـ Super Admin
  if (cleanEmail === SUPER_ADMIN_ACCOUNT.email && password === SUPER_ADMIN_ACCOUNT.password) {
    return {
      success: true,
      user: SUPER_ADMIN_ACCOUNT,
      tenant: null,
      isSuperAdmin: true,
    };
  }

  // 2. فحص جميع الشركات ومستخدميها
  const tenants = loadAllTenants();
  for (const t of tenants) {
    if (t.adminEmail.toLowerCase() === cleanEmail && t.adminPassword === password) {
      if (t.status === 'suspended') {
        return { success: false, error: 'تم تعليق حساب هذه الشركة. يرجى التواصل مع إدارة المنصة.' };
      }
      return {
        success: true,
        user: {
          id: `u_${t.id}_admin`,
          email: t.adminEmail,
          name: t.adminName,
          role: 'owner',
          companyId: t.id,
          companyName: t.name,
          currency: t.currency || 'د.إ',
        },
        tenant: t,
        isSuperAdmin: false,
      };
    }

    // فحص فريق الشركة
    try {
      const rawUsers = localStorage.getItem(`tenant_${t.id}_users`);
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        const match = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
        if (match) {
          if (t.status === 'suspended') {
            return { success: false, error: 'تم تعليق حساب هذه الشركة. يرجى التواصل مع إدارة المنصة.' };
          }
          return {
            success: true,
            user: {
              ...match,
              companyId: t.id,
              companyName: t.name,
              currency: t.currency || 'د.إ',
            },
            tenant: t,
            isSuperAdmin: false,
          };
        }
      }
    } catch (e) {}
  }

  return { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
}

export function generateWhatsAppWelcomeMessage(tenant) {
  return `مرحباً بك يا بشمهندس ${tenant.adminName || ''} 🌟

تم تفعيل مساحة العمل الخاصة بمكتبكم الموقر على نظام إدارة المشاريع بنجاح 🚀

🏢 *اسم الشركة:* ${tenant.name}
🌐 *رابط الدخول:* ${window.location.origin || 'http://localhost:5173'}
👤 *البريد الإلكتروني:* ${tenant.adminEmail}
🔑 *كلمة المرور:* ${tenant.adminPassword}
📦 *نوع الباقة:* ${tenant.planName}
📅 *تاريخ الصلاحية:* ${tenant.expiryDate}

💡 *بمجرد تسجيل الدخول، يمكنك رفع شعار شركتك من صفحة "إعدادات الشركة"، وإضافة مهندسي موقعك وتعيين مشاريعكم بكل سهولة.*

نتمنى لكم تجربة عمل متميزة ومثمرة! 🤝`;
}

function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// توليد مشاريع واقعية خاصة بكل شركة حسب مدينتها
function generateCompanySeedProjects(companyId, tenant) {
  if (companyId === 'comp_alain') {
    return [
      {
        id: 'p_alain_1',
        companyId: 'comp_alain',
        name: 'تشطيب قصر VIP - حي الفوعة',
        client: 'سعادة محمد الشامسي',
        area: 'الفوعة - العين',
        type: 'قصر فاخر',
        engineer: 'م. هزاع المنصوري',
        accountant: 'أ. حمد الشامسي',
        techOffice: 'م. فاطمة البلوشي',
        progress: 65,
        status: 'on_track',
        budget: 1450000,
        spent: 870000,
        startDate: '2026-05-10',
        dueDate: '2026-11-30',
        submittals: [
          { item: 'اعتماد رخام ستتواريو إيطالي للصالات', status: 'approved' },
          { item: 'مخططات التكييف المركزي والـ VRF', status: 'approved' },
          { item: 'مخطط الأسقف الجبسية المغربية', status: 'approved' },
        ],
        files: [],
        snags: [
          { id: 's1', room: 'مجلس الرجال', desc: 'ضبط زوايا شطف الرخام عند المدخل الرئيسي', status: 'completed', severity: 'medium' },
          { id: 's2', room: 'الجناح الرئيسي', desc: 'استكمال عزل حوائط الحمام الماستر', status: 'pending', severity: 'high' },
        ],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. هزاع المنصوري', work: 'استلام أعمال تمديدات التكييف المركزي وصب بلاط المجلس', issues: 'لا يوجد', workers: 12 },
          { id: 'd2', date: '2026-08-25', author: 'م. هزاع المنصوري', work: 'فحص ضغط شبكة السباكة المخفية واختبار العزل المائي', issues: 'لا يوجد', workers: 9 }
        ],
      },
      {
        id: 'p_alain_2',
        companyId: 'comp_alain',
        name: 'فيلا مودرن - المرخانية',
        client: 'أ. راشد الدرعي',
        area: 'المرخانية - العين',
        type: 'فيلا مستقلة',
        engineer: 'م. سيف النيادي',
        accountant: 'أ. حمد الشامسي',
        techOffice: 'م. فاطمة البلوشي',
        progress: 30,
        status: 'at_risk',
        budget: 920000,
        spent: 310000,
        startDate: '2026-07-01',
        dueDate: '2026-12-15',
        submittals: [
          { item: 'اعتماد قطاعات الألوميتال والزجاج الدبل', status: 'approved' },
          { item: 'عينة دهانات جوتن فينوماستيك', status: 'pending' },
        ],
        files: [],
        snags: [
          { id: 's1', room: 'الصالة العائلية', desc: 'تعديل مناسيب مفاتيح السمارت هوم', status: 'pending', severity: 'medium' }
        ],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. سيف النيادي', work: 'تأسيس شبكة الكهرباء الذكية وتركيب شاسيهات الجبس', issues: 'تأخر توريد قطاعات الصاج يومين', workers: 8 }
        ],
      },
      {
        id: 'p_alain_3',
        companyId: 'comp_alain',
        name: 'مجلس عربي تراثي ومسبح - زاخر',
        client: 'م. سعيد الكعبي',
        area: 'زاخر - العين',
        type: 'مجلس وملحق خارجي',
        engineer: 'م. خليفة الكعبي',
        accountant: 'أ. حمد الشامسي',
        techOffice: 'م. فاطمة البلوشي',
        progress: 88,
        status: 'on_track',
        budget: 580000,
        spent: 510000,
        startDate: '2026-04-15',
        dueDate: '2026-09-20',
        submittals: [
          { item: 'اعتماد مشربيات الخشب والأرابيسك', status: 'approved' },
          { item: 'اختبار تشغيل فلاتر وإضاءة المسبح', status: 'approved' },
        ],
        files: [],
        snags: [],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. خليفة الكعبي', work: 'دهان الوجه الأخير للتجاليد الخشبية وتلميع الأرضيات', issues: 'لا يوجد', workers: 6 }
        ],
      }
    ];
  }

  if (companyId === 'comp_dhabi') {
    return [
      {
        id: 'p_dhabi_1',
        companyId: 'comp_dhabi',
        name: 'بنتهاوس فاخر - جزيرة السعديات',
        client: 'أ. حمد المزروعي',
        area: 'السعديات - أبوظبي',
        type: 'بنتهاوس',
        engineer: 'م. عبد الله الظاهري',
        accountant: 'أ. سلطان القاسمي',
        techOffice: 'م. شيخة المري',
        progress: 75,
        status: 'on_track',
        budget: 2400000,
        spent: 1750000,
        startDate: '2026-03-01',
        dueDate: '2026-10-15',
        submittals: [
          { item: 'اعتماد باركيه البلوط الطبيعي للغرف', status: 'approved' },
          { item: 'نظام الإضاءة المخفية DALI', status: 'approved' },
        ],
        files: [],
        snags: [
          { id: 's1', room: 'تراس الإطلالة البحرية', desc: 'ضبط فواصل تمدد السيراميك الخارجي', status: 'completed', severity: 'low' }
        ],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. عبد الله الظاهري', work: 'تركيب التجاليد الخشبية المخفية للأبواب وبرمجة الشاشات', issues: 'لا يوجد', workers: 14 }
        ],
      },
      {
        id: 'p_dhabi_2',
        companyId: 'comp_dhabi',
        name: 'فيلا عصرية - مدينة خليفة أ',
        client: 'د. خالد الرميثي',
        area: 'مدينة خليفة - أبوظبي',
        type: 'فيلا مستقلة',
        engineer: 'م. ناصر الهاشمي',
        accountant: 'أ. سلطان القاسمي',
        techOffice: 'م. شيخة المري',
        progress: 40,
        status: 'on_track',
        budget: 1650000,
        spent: 660000,
        startDate: '2026-06-15',
        dueDate: '2027-01-20',
        submittals: [
          { item: 'اعتماد سيراميك الحمامات الإسباني', status: 'approved' },
        ],
        files: [],
        snags: [],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. ناصر الهاشمي', work: 'استكمال أعمال التأسيسات والتلييس الميكانيكي', issues: 'لا يوجد', workers: 10 }
        ],
      },
      {
        id: 'p_dhabi_3',
        companyId: 'comp_dhabi',
        name: 'فيلا شاطئ الراحة VIP',
        client: 'سعادة منصور القبيسي',
        area: 'شاطئ الراحة - أبوظبي',
        type: 'فيلا شاطئية',
        engineer: 'م. راشد المزروعي',
        accountant: 'أ. سلطان القاسمي',
        techOffice: 'م. شيخة المري',
        progress: 20,
        status: 'on_track',
        budget: 1950000,
        spent: 390000,
        startDate: '2026-07-20',
        dueDate: '2027-03-30',
        submittals: [
          { item: 'مخططات العزل المائي للأسطح والمسابح', status: 'approved' }
        ],
        files: [],
        snags: [],
        dailyLogs: [
          { id: 'd1', date: todayISO(), author: 'م. راشد المزروعي', work: 'عزل الأساسات واختبارات الميول', issues: 'لا يوجد', workers: 7 }
        ],
      }
    ];
  }

  // comp_cairo default
  return [
    {
      id: 'p_cairo_1',
      companyId: 'comp_cairo',
      name: 'تشطيب شقة دوبلكس - بيت الوطن',
      client: 'د. طارق المنشاوي',
      area: 'التجمع الخامس - القاهرة',
      type: 'شقة دوبلكس',
      engineer: 'م. أحمد كامل',
      accountant: 'أ. سامح فتحي',
      techOffice: 'م. علياء رمضان',
      progress: 60,
      status: 'on_track',
      budget: 850000,
      spent: 510000,
      startDate: '2026-05-01',
      dueDate: '2026-10-30',
      submittals: [
        { item: 'اعتماد عينات بورسلين كليوباترا', status: 'approved' },
        { item: 'لوحة قواطع شنايدر الفرنسية', status: 'approved' },
      ],
      files: [],
      snags: [],
      dailyLogs: [
        { id: 'd1', date: todayISO(), author: 'م. أحمد كامل', work: 'سحب أسلاك السويدي وتشطيب وجه أول معجون', issues: 'لا يوجد', workers: 6 }
      ],
    },
    {
      id: 'p_cairo_2',
      companyId: 'comp_cairo',
      name: 'تشطيب فيلا الترا سوبر لوكس - النرجس',
      client: 'أ. حسام الدين',
      area: 'النرجس - القاهرة الجديدة',
      type: 'فيلا مستقلة',
      engineer: 'م. ياسر فوزي',
      accountant: 'أ. سامح فتحي',
      techOffice: 'م. علياء رمضان',
      progress: 85,
      status: 'on_track',
      budget: 1400000,
      spent: 1220000,
      startDate: '2026-02-10',
      dueDate: '2026-09-15',
      submittals: [
        { item: 'اعتماد رخام امبرادور للدرج الداخلي', status: 'approved' }
      ],
      files: [],
      snags: [],
      dailyLogs: [
        { id: 'd1', date: todayISO(), author: 'م. ياسر فوزي', work: 'جلي وتلميع الرخام وتركيب سبوتات الإنارة', issues: 'لا يوجد', workers: 8 }
      ],
    }
  ];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
