const crypto = require("crypto");

/**
 * قائمة الأدوار المسموح بها في النظام
 */
const ALLOWED_ROLES = Object.freeze([
  "owner",
  "admin",
  "manager",
  "engineer",
  "supervisor",
  "accountant",
  "viewer",
  "super_admin",
]);

/**
 * مستويات الصلاحية لكل دور (Hierarchy)
 */
const ROLE_LEVELS = Object.freeze({
  super_admin: 100,
  owner: 80,
  admin: 60,
  manager: 40,
  engineer: 20,
  supervisor: 20,
  accountant: 20,
  viewer: 10,
});

/**
 * النطاقات الفرعية المحجوزة للمنصة والبنية التحتية
 */
const RESERVED_SUBDOMAINS = Object.freeze([
  "admin",
  "app",
  "portal",
  "api",
  "dashboard",
  "www",
  "mail",
  "support",
  "tashteeb",
  "tashteebpro",
  "superadmin",
  "auth",
  "billing",
  "staging",
  "test",
  "demo",
  "login",
  "signup",
  "static",
  "assets",
  "cdn",
  "help",
  "status",
]);

/**
 * التحقق من صحة الدور المطلوب
 */
function isValidRole(role) {
  return typeof role === "string" && ALLOWED_ROLES.includes(role);
}

/**
 * التحقق الهرمي من صلاحية المستدعي لمنح دور معين
 * - سوبر أدمن يمنح أي دور
 * - المالك يمنح الأدوار الأدنى منه (admin, manager, engineer, ...) ولا يمنح super_admin
 * - الأدمن يمنح (manager, engineer, ...) ولا يمنح owner أو admin
 * - المدير يمنح (engineer, supervisor, viewer) فقط
 */
function canAssignRole(callerRole, targetRole, isCallerSuperAdmin = false) {
  if (isCallerSuperAdmin) return true;
  if (!isValidRole(callerRole) || !isValidRole(targetRole)) return false;
  if (targetRole === "super_admin") return false; // سوبر أدمن يمنحه سوبر أدمن فقط

  const callerLevel = ROLE_LEVELS[callerRole] || 0;
  const targetLevel = ROLE_LEVELS[targetRole] || 0;

  // المالك يمكنه تعيين أدوار حتى مستوى admin (أقل منه مباشرة)
  if (callerRole === "owner") {
    return targetLevel < ROLE_LEVELS.owner;
  }

  // الأدمن يمكنه تعيين أدوار أقل من admin فقط
  if (callerRole === "admin") {
    return targetLevel < ROLE_LEVELS.admin;
  }

  // المدير يمنح الأدوار التنفيذية الأقل من manager فقط
  if (callerRole === "manager") {
    return targetLevel < ROLE_LEVELS.manager;
  }

  return false;
}

/**
 * التحقق من صحة وسلامة النطاق الفرعي (Subdomain)
 */
function validateSubdomain(rawSubdomain) {
  if (!rawSubdomain || typeof rawSubdomain !== "string") {
    return { valid: false, error: "النطاق الفرعي مطلوب." };
  }

  const clean = rawSubdomain.toLowerCase().trim();

  // الطول بين 3 و 30 حرفاً
  if (clean.length < 3 || clean.length > 30) {
    return { valid: false, error: "يجب أن يتراوح طول النطاق الفرعي بين 3 و 30 حرفاً." };
  }

  // حروف إنجليزية وأرقام وشرطة فقط، ولا يبدأ أو ينتهي بشرطة
  const validPattern = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
  if (!validPattern.test(clean)) {
    return {
      valid: false,
      error: "النطاق الفرعي يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط، ولا يبدأ أو ينتهي بشرطة.",
    };
  }

  // التحقق من الأسماء المحجوزة
  if (RESERVED_SUBDOMAINS.includes(clean)) {
    return { valid: false, error: `النطاق الفرعي '${clean}' محجوز من قِبل إدارة المنصة.` };
  }

  return { valid: true, cleanSubdomain: clean };
}

/**
 * مقارنة سلاسل نصوص حساسة (أسرار، توكنز) بطريقة آمنة ضد هجمات التوقيت
 */
function safeTimingCompare(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }

  const hashA = crypto.createHash("sha256").update(provided).digest();
  const hashB = crypto.createHash("sha256").update(expected).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * تنقية وتوحيد أرقام الهواتف (تحويل الأرقام العربية وحذف المسافات والرموز)
 */
function cleanPhone(raw) {
  if (!raw) return "";
  let str = String(raw).trim()
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[\s\-\(\)\.]/g, "");

  if (str.startsWith("00")) str = str.slice(2);
  if (str.startsWith("+")) str = str.slice(1);

  if (str.startsWith("20") && str.length === 12 && ["10", "11", "12", "15"].includes(str.slice(2, 4))) {
    str = "0" + str.slice(2);
  }

  return str.replace(/\D/g, "");
}

/**
 * تنقية بيانات المشروع للبوابة العامة (Client Portal)
 * استبعاد صارم لكافة التكاليف الداخلية، مقاولي الباطن، المشتريات، وهوامش الربح
 */
function sanitizePortalPayload(project, token, companySettings = null) {
  if (!project) return null;

  return {
    id: project.id || project.projectId,
    projectId: project.id || project.projectId,
    companyId: project.companyId,
    name: project.name || "مشروع بدون اسم",
    client: project.client || "عميلنا العزيز",
    clientPhone: project.clientPhone || "",
    location: project.location || "",
    type: project.type || "",
    floors: project.floors || "",
    area: Number(project.area || 0),
    // إتاحة القيمة التعاقدية فقط مع العميل بدون أي تكاليف داخلية
    contractValue: Number(project.contractValue || project.budget || 0),
    budget: Number(project.contractValue || project.budget || 0),
    progress: Number(project.progress || 0),
    status: project.status || "active",
    startDate: project.startDate || "",
    endDate: project.endDate || "",
    dueDate: project.dueDate || "",
    // بنود العمل الموجهة للعميل
    workItems: Array.isArray(project.workItems)
      ? project.workItems.map((item) => ({
          id: item.id,
          title: item.title || item.name,
          status: item.status || "pending",
          progress: item.progress || 0,
          description: item.description || "",
        }))
      : [],
    // السجلات اليومية المعتمدة
    dailyLogs: Array.isArray(project.dailyLogs) ? project.dailyLogs : [],
    photos: Array.isArray(project.photos) ? project.photos : [],
    sitePhotos: Array.isArray(project.sitePhotos) ? project.sitePhotos : [],
    // الدفعات التعاقدية للعميل فقط (المستحقة والمسددة)
    payments: Array.isArray(project.clientPayments || project.payments)
      ? (project.clientPayments || project.payments).map((p) => ({
          id: p.id,
          title: p.title || p.name,
          amount: Number(p.amount || 0),
          status: p.status || "pending",
          dueDate: p.dueDate || "",
          paidDate: p.paidDate || "",
        }))
      : [],
    clientPayments: Array.isArray(project.clientPayments || project.payments)
      ? (project.clientPayments || project.payments).map((p) => ({
          id: p.id,
          title: p.title || p.name,
          amount: Number(p.amount || 0),
          status: p.status || "pending",
          dueDate: p.dueDate || "",
          paidDate: p.paidDate || "",
        }))
      : [],
    // التوقيع والاعتماد الإلكتروني
    clientSignature: project.clientSignature || null,
    clientApprovalDate: project.clientApprovalDate || null,
    clientApprovalNotes: project.clientApprovalNotes || null,
    clientContract: project.clientContract || null,
    clientPortalEnabled: true,
    clientPortalToken: token,
    token: token,
    companySettings: companySettings,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  ALLOWED_ROLES,
  ROLE_LEVELS,
  RESERVED_SUBDOMAINS,
  isValidRole,
  canAssignRole,
  validateSubdomain,
  safeTimingCompare,
  cleanPhone,
  sanitizePortalPayload,
};
