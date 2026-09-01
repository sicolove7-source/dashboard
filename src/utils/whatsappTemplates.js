import { getGlobalCurrency } from './helpers';

/**
 * WhatsApp Automation Engine for Fit-out & Construction
 * Generates direct WhatsApp URLs (https://wa.me/...) with pre-filled, professional Arabic messages.
 */

// Cleans phone numbers (removes spaces, dashes, leading 0 to international Egypt +20 format)
export function formatPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "20" + cleaned.slice(1);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  } else if (!cleaned.startsWith("20") && cleaned.length === 10) {
    cleaned = "20" + cleaned;
  }
  return cleaned;
}

export function openWhatsApp(phone, message) {
  const formatted = formatPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  const url = formatted ? `https://wa.me/${formatted}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank");
}

export const WHATSAPP_TEMPLATES = {
  // 1. ترحيب بعميل جديد
  welcome: (clientName, companyName, projectName) => `مرحباً أستاذ ${clientName || ""} 👋
يسعدنا انضمامكم إلى عائلة عملاء *${companyName || "إدارة التشطيبات"}*! 🏢

تم إنشاء ملف مشروعكم: *${projectName || "الموقع"}* بنجاح.
يمكنكم متابعة نسب الإنجاز والتحديثات اليومية والصور لحظة بلحظة عبر المنصة.

لأي استفسار لا تتردد بالتواصل معنا! 🏗️`,

  // 2. إرسال المقايسة ورابط العرض
  quotationReady: (clientName, companyName, totalCost, unitType) => `عزيزي أستاذ ${clientName || ""} 🌟
تحياتنا من فريق *${companyName || "إدارة التشطيبات"}*.

يسرنا إبلاغكم بأنه تم الانتهاء من إعداد المقايسة الفنية الشاملة والتوصيف الهندسي لـ *(${unitType || "الموقع"})*.
💰 التكلفة التقديرية: *${Number(totalCost || 0).toLocaleString("ar-EG")} ${getGlobalCurrency()}*

يسعدنا مناقشة التفاصيل معكم وتحديد بنود الخامات والتصميم النهائي في أي وقت. ✨`,

  // 3. تذكير بدفعة مستحقة
  paymentDue: (clientName, companyName, milestoneTitle, amount, dueDate) => `مرحباً أستاذ ${clientName || ""} 💼
نحيطكم علماً من شركة *${companyName || "إدارة التشطيبات"}* بأنه تم استحقاق دفعة:
🔹 المرحلة: *${milestoneTitle || "الدفعة المستحقة"}*
💵 المبلغ: *${Number(amount || 0).toLocaleString("ar-EG")} ${getGlobalCurrency()}*
📅 تاريخ الاستحقاق: *${dueDate || "اليوم"}*

شاكرين لسيادتكم حسن التعاون لاستمرار وتيرة العمل بالموقع دون تأخير. 🙏`,

  // 4. تقرير إنجاز يومي وصور الموقع
  dailyReport: (clientName, companyName, projectName, progress, workDone) => `السلام عليكم أستاذ ${clientName || ""} 🏗️
تقرير متابعة الأعمال اليومية من *${companyName || "إدارة التشطيبات"}*:

📍 المشروع: *${projectName || ""}*
📈 نسبة الإنجاز الحالية: *${progress || 0}%*
🔨 الأعمال المنفذة اليوم:
${workDone || "جاري استكمال بنود المرحلة الحالية وفقاً للجدول الزمني المعتمد."}

مرفق مع التقرير صور وفيديوهات التوثيق لأعمال الموقع اليوم. دمتم بخير! ✨`,

  // 5. أمر توريد مواد للمورد
  supplierOrder: (supplierName, companyName, projectName, itemsList, deliveryDate) => `السلام عليكم ورحمة الله *${supplierName || "السيد المورد"}* 🚚
طلب توريد خامات عاجل من شركة *${companyName || "إدارة التشطيبات"}*:

🏢 الموقع: *${projectName || ""}*
📅 موعد التوريد المطلوب: *${deliveryDate || "في أقرب وقت"}*
📦 البنود المطلوبة:
${itemsList || "يرجى مراجعة التفاصيل المرفقة."}

برجاء تأكيد استلام الطلب وتحديد ساعة الوصول لموقع العمل للتفريغ. شكراً لتعاونكم!`,

  // 6. تذكير مهندس الموقع بتسجيل اليوميات
  engineerDailyReminder: (engineerName, companyName, projectName) => `مرحباً *${engineerName || "بشمهندس"}* 👷‍♂️
تذكير يومي من إدارة *${companyName || "إدارة التشطيبات"}*:

📍 الموقع: *${projectName || "مشروعك"}*
📝 نرجو التكرم بتسجيل تقرير يوميات الموقع للأعمال المنفذة والعمالة اليومية قبل مغادرة الموقع لتوثيق الإنجاز.

يمكنك التسجيل بالصوت أو النص عبر لوحة التحكم بنقرة واحدة. بالتوفيق! 🏗️`,

  // 7. تكليف الصنايعي بملاحظة استلام ومعالجة عيب
  craftsmanSnagDispatch: (craftsmanName, companyName, projectName, snagDesc, location, deadline) => `السلام عليكم يا أسطى *${craftsmanName || "الفاضل"}* 🛠️
تكليف عمل وملاحظة تشطيب من *${companyName || "إدارة التشطيبات"}*:

📍 الموقع: *${projectName || "موقع العمل"}*
📌 المكان / الفراغ: *${location || "الموقع"}*
⚠️ الملاحظة المطلوب تعديلها: *${snagDesc || "يرجى مراجعة الملاحظة"}*
⏳ المهلة المحددة للإصلاح: *${deadline || "خلال 48 ساعة"}*

برجاء المعاينة والإفادة فور الانتهاء لاعتماد البند وصرف المستحقات. شكراً لجهودكم! ✨`,

  // 8. متابعة العملاء المحتملين الراكدين (CRM Nudge)
  leadFollowupNudge: (clientName, companyName, unitType) => `مرحباً أستاذ *${clientName || ""}* 👋
يسعدنا التواصل معكم مجدداً من فريق *${companyName || "إدارة التشطيبات"}*.

نود الاطمئنان على سير خططكم لتشطيب وتجهيز *(${unitType || "الموقع"})*. 🏡
هل لديكم أي استفسار حول المقايسة أو التصاميم؟ فريقنا الفني جاهز لمساعدتكم في أي وقت لترتيب موعد أو مناقشة الخيارات المناسبة. ✨`,
};

