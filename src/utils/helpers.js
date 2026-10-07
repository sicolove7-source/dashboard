import { STAGES } from './constants';

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export let ACTIVE_CURRENCY = 'د.إ';

export function setGlobalCurrency(curr) {
  if (curr) {
    ACTIVE_CURRENCY = curr;
    try {
      localStorage.setItem('active_currency', curr);
    } catch (e) {}
  }
}

export function getGlobalCurrency() {
  try {
    const stored = localStorage.getItem('active_currency');
    if (stored) return stored;
  } catch (e) {}
  return ACTIVE_CURRENCY || 'د.إ';
}

export const money = (n, customCurr) => {
  const curr = customCurr || getGlobalCurrency();
  return Number(n || 0).toLocaleString("en-US") + " " + curr;
};

export const fmtDate = (d) => {
  if (!d) return "—";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "—";
  return dateObj.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
};
export const todayISO = () => new Date().toISOString().slice(0, 10);

export const nowTimeISO = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const fmtTime = (t, timestamp) => {
  if (t) {
    if (/^\d{1,2}:\d{2}/.test(t)) {
      const [h, m] = t.split(':').map(Number);
      const period = h >= 12 ? 'م' : 'ص';
      const hour12 = h % 12 || 12;
      const minStr = String(m).padStart(2, '0');
      return `${hour12}:${minStr} ${period}`;
    }
    return t;
  }
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const period = hours >= 12 ? 'م' : 'ص';
      const hour12 = hours % 12 || 12;
      const minStr = String(minutes).padStart(2, '0');
      return `${hour12}:${minStr} ${period}`;
    }
  }
  return '';
};

export const fmtDateTime = (date, time, timestamp) => {
  const datePart = fmtDate(date);
  const timePart = fmtTime(time, timestamp);
  if (timePart) return `${datePart} • ${timePart}`;
  return datePart;
};

/**
 * استخراج كائن تاريخ ووقت تسجيل الشركة بدقة مع التوافق الذكي لاستخراجه من المعرف المرمز
 */
export function getTenantRegistrationDate(tenantOrSettings) {
  if (!tenantOrSettings) return null;
  // 1. الحقول المباشرة
  const raw = tenantOrSettings.registeredAt || tenantOrSettings.createdAt || tenantOrSettings.startDate;
  if (raw && typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (!isNaN(parsed) && parsed > 1600000000000) {
      return new Date(parsed);
    }
  }
  // 2. استخراج الطابع الزمني المرمز بـ base36 من معرف الشركة
  const id = tenantOrSettings.id || tenantOrSettings.companyId;
  if (id && typeof id === 'string') {
    const slug = id.replace(/^comp_(c_)?/, '');
    const num = parseInt(slug, 36);
    if (!isNaN(num) && num > 1650000000000 && num < 2500000000000) {
      return new Date(num);
    }
  }
  // 3. طابع التحديث كبديل أخير
  if (tenantOrSettings.updatedAt) {
    const parsed = Date.parse(tenantOrSettings.updatedAt);
    if (!isNaN(parsed)) return new Date(parsed);
  }
  return null;
}

/**
 * تنسيق تاريخ ووقت تسجيل الشركة بالعربية الفصحى بدقة (اليوم، الشهر، السنة، والساعة والدقيقة)
 */
export function formatRegistrationDateTime(val) {
  if (!val) return { date: '—', arabicDate: '—', time: '—', full: '—', iso: null };
  let dateObj = null;
  if (val instanceof Date) {
    dateObj = val;
  } else if (typeof val === 'object') {
    dateObj = getTenantRegistrationDate(val);
  } else if (typeof val === 'string' || typeof val === 'number') {
    const parsed = Date.parse(val);
    if (!isNaN(parsed) && parsed > 1600000000000) {
      dateObj = new Date(parsed);
    } else {
      const slug = String(val).replace(/^comp_(c_)?/, '');
      const num = parseInt(slug, 36);
      if (!isNaN(num) && num > 1650000000000) dateObj = new Date(num);
    }
  }
  if (!dateObj || isNaN(dateObj.getTime())) {
    return { date: '—', arabicDate: '—', time: '—', full: '—', iso: null };
  }

  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 || 12;
  const timeStr = `${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`;

  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const formattedArabicDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${y}`;

  return {
    date: dateStr,
    arabicDate: formattedArabicDate,
    time: timeStr,
    full: `${formattedArabicDate} • ${timeStr}`,
    iso: dateObj.toISOString(),
  };
}

export function currentStageKey(progress) {
  let cum = 0;
  for (const s of STAGES) { 
    cum += s.weight; 
    if (progress <= cum) return s.key; 
  }
  return STAGES[STAGES.length - 1].key;
}

/**
 * ضغط الصور تلقائياً لتناسب التخزين السحابي الفوري في Firestore وتفتح بسرعة البرق على الموبايل
 */
export function compressImageFile(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

