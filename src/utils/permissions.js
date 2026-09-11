/**
 * =====================================================
 * نظام الصلاحيات — Permissions System
 * =====================================================
 *
 * الأدوار المتاحة:
 *   owner            → مدير الشركة          (صلاحيات كاملة)
 *   accountant       → محاسب                (مالية + موردون)
 *   engineer         → مهندس موقع           (مشاريعه فقط)
 *   procurement      → مسؤول توريدات ومشتريات (إدارة الخامات ومهمات المواقع والموردين)
 *   tech_office      → مكتب فني             (جدول + رسومات + مواصفات)
 *   customer_service → خدمة العملاء         (عرض المشاريع فقط)
 */

// ─── بيانات كل دور ───────────────────────────────────
export const ROLES = {
  super_admin: {
    label: 'المدير العام للمنصة (Super Admin)',
    color: '#0F172A',
    badge: '👑',
    description: 'إدارة جميع الشركات والمشتركين والاشتراكات',
  },
  owner: {
    label: 'مدير الشركة',
    color: '#0F172A',
    badge: '🏢',
    description: 'صلاحيات كاملة على جميع البيانات وإدارة المستخدمين',
  },
  procurement: {
    label: 'مسؤول توريدات ومشتريات',
    color: '#D97706',
    badge: '📦',
    description: 'إدارة خامات ومهمات المواقع، الموردين، وأوامر التوريد والطلبيات',
  },
  accountant: {
    label: 'محاسب',
    color: '#334155',
    badge: '💼',
    description: 'المالية والموردون وعروض الأسعار',
  },
  engineer: {
    label: 'مهندس موقع',
    color: '#2563EB',
    badge: '🏗️',
    description: 'مشاريعه المسندة إليه فقط وطلبيات مواد موقعه',
  },
  tech_office: {
    label: 'مكتب فني',
    color: '#475569',
    badge: '📐',
    description: 'الجداول والرسومات والمواصفات',
  },
  customer_service: {
    label: 'خدمة العملاء',
    color: '#64748B',
    badge: '🎧',
    description: 'عرض حالة المشاريع والتقارير لمتابعة العملاء',
  },
};

// ─── التبويبات المتاحة لكل دور ───────────────────────
export const NAV_PERMISSIONS = {
  super_admin:      ['tenants', 'overview', 'automations', 'crm', 'finance', 'team', 'projects', 'suppliers', 'quotations', 'settings'],
  owner:            ['overview', 'automations', 'crm', 'finance', 'team', 'projects', 'suppliers', 'quotations', 'settings'],
  procurement:      ['projects', 'suppliers', 'overview'],
  accountant:       ['overview', 'automations', 'finance', 'projects', 'suppliers', 'quotations'],
  engineer:         ['projects', 'suppliers'],
  tech_office:      ['overview', 'crm', 'projects', 'suppliers', 'quotations'],
  customer_service: ['overview', 'crm', 'projects'],
};

// ─── التبويب الافتراضي لكل دور عند الدخول ────────────
export const DEFAULT_TAB = {
  super_admin:      'tenants',
  owner:            'overview',
  procurement:      'suppliers',
  accountant:       'finance',
  engineer:         'projects',
  tech_office:      'projects',
  customer_service: 'crm',
};

// ─── صلاحيات الإجراءات (Actions) ─────────────────────
export const PERMISSIONS = {
  // ── المشاريع ──
  projects_create:        ['owner'],
  projects_edit:          ['owner'],
  projects_delete:        ['owner'],
  projects_view_all:      ['owner', 'accountant', 'tech_office', 'customer_service', 'procurement'],

  // ── تفاصيل المشروع: تبويبات داخلية ──
  project_tab_finance:    ['owner', 'accountant'],
  project_tab_gantt:      ['owner', 'engineer', 'tech_office'],
  project_tab_diary:      ['owner', 'engineer', 'tech_office'],
  project_tab_drawings:   ['owner', 'engineer', 'tech_office'],
  project_tab_snags:      ['owner', 'engineer', 'tech_office', 'customer_service'],
  project_tab_supply:     ['owner', 'accountant', 'engineer', 'tech_office', 'procurement'],
  project_tab_rooms:      ['owner', 'engineer', 'tech_office'],
  project_tab_craftsmen:  ['owner', 'engineer', 'tech_office', 'procurement', 'accountant'],
  craftsman_contract_manage: ['owner', 'engineer', 'tech_office'],

  // ── إجراءات التوريدات والخامات ──
  supply_request_create:  ['owner', 'accountant', 'engineer', 'tech_office', 'procurement'],
  supply_request_status:  ['owner', 'accountant', 'engineer', 'tech_office', 'procurement'],

  // ── المالية الشاملة ──
  finance_view:           ['owner', 'accountant'],
  finance_add_expense:    ['owner', 'accountant'],
  finance_add_income:     ['owner', 'accountant'],

  // ── الفريق ──
  team_view:              ['owner'],
  team_add_member:        ['owner'],
  team_remove_member:     ['owner'],
  team_performance_view:  ['owner'],

  // ── مقاولو الباطن والمستخلصات ──
  subcontractors_view:    ['owner', 'accountant', 'engineer', 'tech_office', 'procurement'],
  subcontractors_create:  ['owner', 'accountant', 'tech_office', 'procurement'],
  subcontractors_edit:    ['owner', 'accountant', 'tech_office'],
  subcontractors_delete:  ['owner'],
  work_orders_create:     ['owner', 'accountant', 'tech_office', 'procurement'],
  extracts_create:        ['owner', 'accountant', 'tech_office', 'engineer'],
  extracts_approve:       ['owner', 'accountant', 'tech_office'],
  extracts_pay:           ['owner', 'accountant'],

  // ── الموردون ──
  suppliers_view:         ['owner', 'accountant', 'engineer', 'tech_office', 'procurement'],
  suppliers_add:          ['owner', 'accountant', 'procurement'],
  suppliers_edit:         ['owner', 'accountant', 'procurement'],
  suppliers_delete:       ['owner'],

  // ── المقايسات ──
  quotations_view:        ['owner', 'accountant', 'tech_office', 'procurement'],
  quotations_create:      ['owner', 'accountant', 'tech_office'],
  quotations_edit:        ['owner', 'accountant'],
  quotations_delete:      ['owner'],

  // ── المواصفات ──
  specs_view:             ['owner', 'engineer', 'tech_office'],

  // ── النظام والإعدادات ──
  backup_export:          ['owner'],
  backup_import:          ['owner'],
  settings_manage:        ['owner'],
  company_settings_view:  ['owner'],
};

export const CUSTOMIZABLE_NAV_TABS = [
  { key: 'overview',    label: 'نظرة عامة والتحليلات', badge: '📊', desc: 'مؤشرات الأداء العامة والإحصائيات الحية' },
  { key: 'projects',    label: 'المشاريع والمواقع',    badge: '🏗️', desc: 'استعراض المشاريع ومتابعة سير الأعمال والمواقع' },
  { key: 'subcontractors', label: 'مقاولو الباطن',     badge: '👷', desc: 'متابعة أعمال مقاولي الباطن والمستخلصات' },
  { key: 'suppliers',   label: 'الموردون والتوريدات',  badge: '📦', desc: 'دليل الموردين وطلبيات وتوريدات الخامات' },
  { key: 'finance',     label: 'المالية والمصروفات',   badge: '💼', desc: 'المصروفات والإيرادات ومستخلصات المشاريع' },
  { key: 'quotations',  label: 'المقايسات والتسعير',   badge: '📐', desc: 'إنشاء ومراجعة مقايسات وعروض أسعار التشطيب' },
  { key: 'crm',         label: 'متابعة العملاء CRM',   badge: '🎯', desc: 'مراحل الصفقات والعملاء المحتملين وتتبع التواصل' },
  { key: 'team',        label: 'أداء الفريق',          badge: '👥', desc: 'متابعة أداء مهندسي وموظفي الشركة' },
  { key: 'settings',    label: 'إعدادات الشركة',       badge: '⚙️', desc: 'إعدادات الهوية والعقود وحسابات الدخول' },
];

export const CUSTOMIZABLE_ACTIONS = [
  {
    category: 'المشاريع والتفاصيل',
    icon: '🏗️',
    items: [
      { key: 'projects_view_all',     label: 'رؤية جميع مشاريع الشركة (وليس المسندة إليه فقط)' },
      { key: 'projects_create',       label: 'إضافة وتأسيس مشاريع جديدة' },
      { key: 'projects_edit',         label: 'تعديل بيانات وتفاصيل المشاريع' },
      { key: 'projects_delete',       label: 'حذف المشاريع من النظام' },
      { key: 'project_tab_finance',   label: 'الاطلاع على مالية المشروع الداخلية' },
      { key: 'project_tab_drawings',  label: 'عرض وتحميل المخططات الهندسية' },
      { key: 'project_tab_diary',     label: 'تسجيل ومتابعة يوميات الموقع' },
      { key: 'project_tab_snags',     label: 'تسجيل ومتابعة ملاحظات الجودة (Snags)' },
    ]
  },
  {
    category: 'توريدات وخامات المواقع',
    icon: '📦',
    items: [
      { key: 'project_tab_supply',    label: 'فتح تبويب توريدات الموقع داخل المشروع' },
      { key: 'supply_request_create', label: 'طلب توريد مواد أو معدات جديدة للموقع' },
      { key: 'supply_request_status', label: 'تحديث واعتماد حالات توريد الخامات والاستلام' },
    ]
  },
  {
    category: 'الموردون وأوامر التوريد',
    icon: '🤝',
    items: [
      { key: 'suppliers_view',        label: 'استعراض قائمة الموردين والأسعار' },
      { key: 'suppliers_add',         label: 'إضافة موردين جدد للنظام' },
      { key: 'suppliers_edit',        label: 'تعديل بيانات ومطابقات الموردين' },
      { key: 'suppliers_delete',      label: 'حذف موردين' },
      { key: 'work_orders_create',    label: 'إصدار أوامر التوريد والشراء الرسمية' },
    ]
  },
  {
    category: 'المالية ومقاولو الباطن',
    icon: '💰',
    items: [
      { key: 'finance_view',          label: 'عرض القوائم والتقارير المالية للشركة' },
      { key: 'finance_add_expense',   label: 'تسجيل مصروفات وسندات صرف' },
      { key: 'finance_add_income',    label: 'تسجيل دفعات وإيرادات العملاء' },
      { key: 'extracts_create',       label: 'إصدار مستخلصات مقاولي الباطن' },
      { key: 'extracts_approve',      label: 'اعتماد وصرف المستخلصات المالية' },
    ]
  },
  {
    category: 'المقايسات وعروض الأسعار',
    icon: '📐',
    items: [
      { key: 'quotations_view',       label: 'الاطلاع على المقايسات وقوائم الكميات' },
      { key: 'quotations_create',     label: 'إنشاء وإعداد مقايسات تشطيب جديدة' },
      { key: 'quotations_edit',       label: 'تعديل بنود المقايسات والأسعار' },
    ]
  }
];

// ─── دوال المساعدة ────────────────────────────────────

/** هل يملك الدور أو المستخدم صلاحية معينة؟ */
export function can(roleOrUser, permission) {
  if (!roleOrUser) return false;
  const role = typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser;
  if (role === 'super_admin' || role === 'owner') return true;

  // فحص الصلاحيات المخصصة للمستخدم يدوياً إن وُجدت
  if (typeof roleOrUser === 'object' && roleOrUser?.customPermissions) {
    if (typeof roleOrUser.customPermissions[permission] === 'boolean') {
      return roleOrUser.customPermissions[permission];
    }
  }

  return (PERMISSIONS[permission] || []).includes(role);
}

/** هل يمكن للدور أو المستخدم رؤية تبويب معين؟ */
export function canSeeNav(roleOrUser, navKey) {
  if (!roleOrUser) return false;
  const role = typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser;

  // 1. حماية حاسمة: تبويب إدارة الشركات (Hub) مخصص حصرياً لمالك المنصة الرئيسي (super_admin)
  // لا يمكن لأي حساب فرعي أو صاحب شركة أو أي دور آخر رؤيته نهائياً
  if (navKey === 'tenants') {
    return role === 'super_admin';
  }

  // 2. مالك المنصة يرى كافة تبويبات النظام
  if (role === 'super_admin') return true;

  // 3. صاحب الحساب الفرعي (مدير الشركة) يرى تبويبات شركته المصرح بها فقط
  if (role === 'owner') {
    return (NAV_PERMISSIONS.owner || []).includes(navKey);
  }

  // 4. فحص قائمة التبويبات المخصصة للمستخدم يدوياً إن وُجدت
  if (typeof roleOrUser === 'object' && Array.isArray(roleOrUser?.customNav) && roleOrUser.customNav.length > 0) {
    return roleOrUser.customNav.includes(navKey) && navKey !== 'tenants';
  }

  return (NAV_PERMISSIONS[role] || []).includes(navKey);
}

/** هل المستخدم مهندس؟ */
export function isEngineer(roleOrUser) {
  const role = typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser;
  return role === 'engineer';
}

/** هل المستخدم مسؤول توريدات؟ */
export function isProcurement(roleOrUser) {
  const role = typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser;
  return role === 'procurement';
}

/** هل المستخدم مدير؟ */
export function isOwner(roleOrUser) {
  const role = typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser;
  return role === 'owner' || role === 'super_admin';
}

// ─── حسابات تجريبية (محلي فقط) ───────────────────────
export const DEMO_ACCOUNTS = [
  { email: 'admin@company.com',       password: '123456', role: 'owner',            name: 'أ. مدير الشركة', engineerName: null },
  { email: 'supply@company.com',      password: '123456', role: 'procurement',      name: 'أ. محمود فوزي (مسؤول التوريدات)', engineerName: null },
  { email: 'accountant@company.com',  password: '123456', role: 'accountant',       name: 'أ. سامح فتحي',   engineerName: null },
  { email: 'engineer1@company.com',   password: '123456', role: 'engineer',         name: 'م. أحمد كامل',   engineerName: 'م. أحمد كامل' },
  { email: 'engineer2@company.com',   password: '123456', role: 'engineer',         name: 'م. ياسر فوزي',   engineerName: 'م. ياسر فوزي' },
  { email: 'engineer3@company.com',   password: '123456', role: 'engineer',         name: 'م. مروة سعيد',   engineerName: 'م. مروة سعيد' },
  { email: 'tech@company.com',        password: '123456', role: 'tech_office',      name: 'م. علياء رمضان', engineerName: null },
  { email: 'cs@company.com',          password: '123456', role: 'customer_service', name: 'أ. نورا حسن',    engineerName: null },
];
