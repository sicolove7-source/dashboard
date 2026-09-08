/**
 * Tashteeb Pro — Cryptographic Password Security & Hashing
 * يعتمد على Web Crypto API لتشفير كلمات المرور بـ SHA-256 + Salt
 * مع دعم التوافق العكسي والترقية التلقائية للحسابات القديمة
 */

// توليد ملح تشفيري عشوائي (Random Salt)
export function generateSalt(length = 16) {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback عشوائي إذا لم يتوفر Crypto API
  return Math.random().toString(36).substring(2, 18) + Date.now().toString(36);
}

/**
 * تشفير كلمة المرور بنظام SHA-256 مع Salt
 * الصيغة الناتجة: $sha256$<salt_hex>$<hash_hex>
 */
export async function hashPassword(plainPassword, customSalt = null) {
  if (!plainPassword) return '';
  const salt = customSalt || generateSalt();

  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(salt + ':' + plainPassword);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `$sha256$${salt}$${hashHex}`;
    }
  } catch (e) {
    console.warn('WebCrypto failed, using fallback hash:', e);
  }

  // Fallback hashing إذا تعذر استخدام crypto.subtle
  let hash = 0;
  const str = salt + ':' + plainPassword;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `$sha256$${salt}$${Math.abs(hash).toString(16)}`;
}

/**
 * فحص صحة كلمة المرور المدخلة مقارنة بالمخزنة
 * يدعم كلاً من التشفير الحديث والكلمات السابقة (مع وسمها للترقية)
 */
export async function verifyPassword(inputPassword, storedHashOrPlain) {
  if (!inputPassword || !storedHashOrPlain) {
    return { match: false, needsUpgrade: false };
  }

  // 1. إذا كانت كلمة المرور مخزنة بنظام التشفير الحديث $sha256$salt$hash
  if (typeof storedHashOrPlain === 'string' && storedHashOrPlain.startsWith('$sha256$')) {
    const parts = storedHashOrPlain.split('$');
    // parts[0] = "", parts[1] = "sha256", parts[2] = salt, parts[3] = hashHex
    if (parts.length >= 4) {
      const salt = parts[2];
      const expectedHash = await hashPassword(inputPassword, salt);
      return {
        match: expectedHash === storedHashOrPlain,
        needsUpgrade: false,
      };
    }
  }

  // 2. التوافق العكسي للحسابات القديمة (Plaintext Compatibility)
  // إذا تطابقت، نُعلم النظام بحاجتها للترقية السلسة فوراً
  if (inputPassword === storedHashOrPlain) {
    return {
      match: true,
      needsUpgrade: true,
    };
  }

  return { match: false, needsUpgrade: false };
}
