/**
 * Tashteeb Pro — Security & Authentication Architecture
 * =====================================================
 * كافة عمليات المصادقة وإدارة كلمات المرور مفوضة بنسبة 100% لخوادم
 * Firebase Authentication الرسمية المشفرة بنظام Scrypt/Argon2id.
 * 
 * تم التخلص نهائياً من أي تخزين أو تشفير محلي لكلمات المرور في المتصفح
 * لضمان نموذج أمني صارم (Zero Plaintext Passwords & Zero-Trust Client).
 */

export const AUTH_SYSTEM = 'firebase_auth_cloud';

