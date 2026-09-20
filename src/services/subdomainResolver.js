/**
 * subdomainResolver.js
 * معالج النطاقات الفرعية (Subdomains) لمنصة تشطيب برو (Tashteeb Pro)
 * 
 * يحدد النطاق الفرعي تلقائياً لدعم المعمارية متعددة النطاقات:
 * 1. admin.tashteebpro.com -> بوابة إدارة المنصة المركزية للمشرف العام
 * 2. {company}.tashteebpro.com -> مساحة عمل خاصة بكل شركة مقاولات
 * 3. tashteebpro.com / www -> صفحة الهبوط والتسجيل العام
 * 
 * يدعم أيضاً بيئة التطوير المحلية (Localhost):
 * - ?subdomain=admin
 * - ?subdomain=amlak
 * - admin.localhost
 */

const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'static', 'assets', 'cdn', 'mail', 'portal'];
const SUBDOMAIN_SESSION_KEY = 'tashteeb_active_subdomain';

export function getSubdomain() {
  if (typeof window === 'undefined') return null;

  // 1. فحص معلمة الاستعلام الأولية لتسهيل التطوير والاختبار المحلي
  const params = new URLSearchParams(window.location.search);
  const querySubdomain = params.get('subdomain') || params.get('tenant') || params.get('sub');
  if (querySubdomain !== null && querySubdomain !== undefined) {
    const clean = querySubdomain.trim().toLowerCase();
    if (clean && !RESERVED_SUBDOMAINS.includes(clean)) {
      try {
        sessionStorage.setItem(SUBDOMAIN_SESSION_KEY, clean);
      } catch (e) {}
      return clean;
    } else {
      clearActiveSubdomain();
      return null;
    }
  }

  const hostname = window.location.hostname || '';

  // 2. إذا كان عنوان IP محلي أو عام، أو localhost عادي:
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname === 'localhost') {
    // إذا كان الرابط نظيفاً بدون معاملات بحث، لا نفرض أي نطاق فرعي سابق
    if (!window.location.search) {
      return null;
    }
    try {
      const savedSub = sessionStorage.getItem(SUBDOMAIN_SESSION_KEY);
      if (savedSub && !RESERVED_SUBDOMAINS.includes(savedSub)) {
        return savedSub;
      }
    } catch (e) {}
    return null;
  }

  // 3. دعم *.localhost في بيئة التطوير (مثال: admin.localhost)
  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      const sub = parts[0].toLowerCase();
      if (!RESERVED_SUBDOMAINS.includes(sub)) {
        return sub;
      }
    }
  }

  // 4. استخراج النطاق الفرعي في النطاقات الحقيقية (مثل admin.tashteebpro.com أو amlak.tashteebpro.com)
  const parts = hostname.split('.');
  if (parts.length > 2) {
    const sub = parts[0].toLowerCase();
    if (!RESERVED_SUBDOMAINS.includes(sub)) {
      return sub;
    }
  }

  return null;
}

export function clearActiveSubdomain() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SUBDOMAIN_SESSION_KEY);
    }
  } catch (e) {}
}

/**
 * هل نحن في نطاق إدارة المنصة المركزية؟
 * مثل: admin.tashteebpro.com أو ?subdomain=admin
 */
export function isAdminSubdomain() {
  const sub = getSubdomain();
  return sub === 'admin' || sub === 'superadmin' || sub === 'platform';
}

/**
 * هل نحن في نطاق شركة مقاولات؟
 * مثل: amlak.tashteebpro.com
 */
export function isCompanySubdomain() {
  const sub = getSubdomain();
  return Boolean(sub && !isAdminSubdomain());
}

/**
 * استخراج معرف (Slug) الشركة من النطاق الفرعي إن وجد
 */
export function getCompanySlugFromSubdomain() {
  const sub = getSubdomain();
  if (!sub || isAdminSubdomain()) return null;
  return sub;
}

/**
 * البحث عن الشركة المطابقة للنطاق الفرعي أو النطاق المخصص
 */
export function resolveTenantBySubdomain(tenants = [], subdomain = null) {
  const targetSub = (subdomain || getSubdomain() || '').toLowerCase().trim();
  if (!targetSub || targetSub === 'admin' || targetSub === 'superadmin') return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';

  return (
    tenants.find((t) => {
      if (!t) return false;
      const tSub = (t.subdomain || '').toLowerCase().trim();
      const tSlug = (t.slug || '').toLowerCase().trim();
      const tId = (t.id || '').toLowerCase().trim();
      const tCustomDomain = (t.customDomain || '').toLowerCase().trim();

      // مطابقة الدومين المخصص
      if (tCustomDomain && currentHost === tCustomDomain) return true;

      // مطابقة النطاق الفرعي
      if (tSub && tSub === targetSub) return true;
      if (tSlug && tSlug === targetSub) return true;
      if (tId && (tId === targetSub || tId === `comp_${targetSub}` || tId === `comp_c_${targetSub}`)) return true;

      return false;
    }) || null
  );
}

/**
 * توليد رابط النطاق الفرعي لأي شركة
 */
export function getSubdomainUrl(subdomain) {
  if (typeof window === 'undefined') return '#';
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';

  // في بيئة التطوير المحلية
  if (hostname.includes('localhost') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return `${protocol}//${window.location.host}/?subdomain=${subdomain}`;
  }

  // في بيئة الإنتاج السحابية
  const rootDomain = hostname.split('.').slice(-2).join('.');
  return `${protocol}//${subdomain}.${rootDomain}${port}`;
}
