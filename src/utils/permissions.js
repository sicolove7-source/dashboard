/**
 * =====================================================
 * نظام الصلاحيات — Permissions System
 * =====================================================
 *
 * الأدوار المتاحة:
 *   owner            → مدير الشركة       (صلاحيات كاملة)
 *   accountant       → محاسب             (مالية + موردون)
 *   engineer         → مهندس             (مشاريعه فقط)
 *   tech_office      → مكتب فني          (جدول + رسومات + مواصفات)
 *   customer_service → خدمة العملاء      (عرض المشاريع فقط)
 */

// ─── بيانات كل دور ───────────────────────────────────
export const ROLES = {
  super_admin: {
    label: 'المدير العام للمنصة (Super Admin)',
    color: '#EC4899',
    badge: '👑',
    description: 'إدارة جميع الشركات والمشتركين والاشتراكات',
  },
  owner: {
    label: 'مدير الشركة',
    color: '#6366F1',
    badge: '🏢',
    description: 'صلاحيات كاملة على جميع البيانات',
  },
  accountant: {
    label: 'محاسب',
    color: '#F59E0B',
    badge: '💼',
    description: 'المالية والموردون وعروض الأسعار',
  },
  engineer: {
    label: 'مهندس موقع',
    color: '#10B981',
    badge: '🏗️',
    description: 'مشاريعه المسندة إليه فقط',
  },
  tech_office: {
    label: 'مكتب فني',
    color: '#3B82F6',
    badge: '📐',
    description: 'الجداول والرسومات والمواصفات',
  },
  customer_service: {
    label: 'خدمة العملاء',
    color: '#EC4899',
    badge: '🎧',
    description: 'عرض حالة المشاريع والتقارير فقط',
  },
};

// ─── التبويبات المتاحة لكل دور ───────────────────────
export const NAV_PERMISSIONS = {
  super_admin:      ['tenants', 'overview', 'automations', 'crm', 'finance', 'team', 'projects', 'subcontractors', 'suppliers', 'quotations', 'specs', 'settings'],
  owner:            ['overview', 'automations', 'crm', 'finance', 'team', 'projects', 'subcontractors', 'suppliers', 'quotations', 'specs', 'settings'],
  accountant:       ['overview', 'automations', 'finance', 'projects', 'subcontractors', 'suppliers', 'quotations'],
  engineer:         ['projects', 'subcontractors', 'specs'],
  tech_office:      ['overview', 'crm', 'projects', 'subcontractors', 'specs', 'quotations'],
  customer_service: ['overview', 'crm', 'projects'],
};


// ─── التبويب الافتراضي لكل دور عند الدخول ────────────
export const DEFAULT_TAB = {
  super_admin:      'tenants',
  owner:            'overview',
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
  projects_view_all:      ['owner', 'accountant', 'tech_office', 'customer_service'],

  // ── تفاصيل المشروع: تبويبات داخلية ──
  project_tab_finance:    ['owner', 'accountant'],
  project_tab_gantt:      ['owner', 'engineer', 'tech_office'],
  project_tab_diary:      ['owner', 'engineer', 'tech_office'],
  project_tab_drawings:   ['owner', 'engineer', 'tech_office'],
  project_tab_snags:      ['owner', 'engineer', 'tech_office', 'customer_service'],
  project_tab_supply:     ['owner', 'accountant'],
  project_tab_rooms:      ['owner', 'engineer', 'tech_office'],

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
  subcontractors_view:    ['owner', 'accountant', 'engineer', 'tech_office'],
  subcontractors_create:  ['owner', 'accountant', 'tech_office'],
  subcontractors_edit:    ['owner', 'accountant', 'tech_office'],
  subcontractors_delete:  ['owner'],
  work_orders_create:     ['owner', 'accountant', 'tech_office'],
  extracts_create:        ['owner', 'accountant', 'tech_office', 'engineer'],
  extracts_approve:       ['owner', 'accountant', 'tech_office'],
  extracts_pay:           ['owner', 'accountant'],

  // ── الموردون ──
  suppliers_view:         ['owner', 'accountant', 'engineer', 'tech_office'],
  suppliers_add:          ['owner', 'accountant'],
  suppliers_edit:         ['owner', 'accountant'],
  suppliers_delete:       ['owner'],

  // ── المقايسات ──
  quotations_view:        ['owner', 'accountant', 'tech_office'],
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

// ─── دوال المساعدة ────────────────────────────────────

/** هل يملك الدور صلاحية معينة؟ */
export function can(role, permission) {
  if (role === 'super_admin') return true;
  return (PERMISSIONS[permission] || []).includes(role);
}

/** هل يمكن للدور رؤية تبويب معين؟ */
export function canSeeNav(role, navKey) {
  if (role === 'super_admin') return true;
  return (NAV_PERMISSIONS[role] || []).includes(navKey);
}

/** هل المستخدم مهندس؟ */
export function isEngineer(role) {
  return role === 'engineer';
}

/** هل المستخدم مدير؟ */
export function isOwner(role) {
  return role === 'owner' || role === 'super_admin';
}

// ─── حسابات تجريبية (محلي فقط) ───────────────────────
export const DEMO_ACCOUNTS = [
  { email: 'admin@company.com',       password: '123456', role: 'owner',            name: 'أ. مدير الشركة', engineerName: null },
  { email: 'accountant@company.com',  password: '123456', role: 'accountant',       name: 'أ. سامح فتحي',   engineerName: null },
  { email: 'engineer1@company.com',   password: '123456', role: 'engineer',         name: 'م. أحمد كامل',   engineerName: 'م. أحمد كامل' },
  { email: 'engineer2@company.com',   password: '123456', role: 'engineer',         name: 'م. ياسر فوزي',   engineerName: 'م. ياسر فوزي' },
  { email: 'engineer3@company.com',   password: '123456', role: 'engineer',         name: 'م. مروة سعيد',   engineerName: 'م. مروة سعيد' },
  { email: 'tech@company.com',        password: '123456', role: 'tech_office',      name: 'م. علياء رمضان', engineerName: null },
  { email: 'cs@company.com',          password: '123456', role: 'customer_service', name: 'أ. نورا حسن',    engineerName: null },
];
