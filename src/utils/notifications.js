/**
 * Tashteeb Pro — Native Web & Mobile Push Notifications Utility
 * يتيح إرسال إشعارات النظام الحقيقية إلى هواتف وحواسيب المهندسين والإدارة
 */

const NOTIFICATION_STORAGE_KEY = 'tashteeb_native_notifications_enabled';
const NOTIFICATION_HISTORY_KEY = 'tashteeb_sent_notifications_v1';

/**
 * فحص هل المتصفح أو الهاتف يدعم إشعارات الويب
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * معرفة حالة الإذن الحالي
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * طلب الإذن من المستخدم لتفعيل الإشعارات
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return { success: false, status: 'unsupported', message: 'المتصفح لا يدعم إشعارات النظام' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'true');
      
      // إرسال إشعار ترحيبي وتأكيدي فوري
      sendNativeNotification('تشطيب برو | تم تفعيل الإشعارات 🔔', {
        body: 'ستصلك الآن تنبيهات تجاوز الميزانيات، التكليفات الجديدة، وتذكيرات اليوميات فوراً.',
        tag: 'welcome-notification',
      });

      return { success: true, status: 'granted' };
    } else {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
      return { success: false, status: permission };
    }
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return { success: false, status: 'error', error };
  }
}

/**
 * إرسال إشعار نظام حقيقي إلى الهاتف أو الحاسوب
 */
export async function sendNativeNotification(title, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions = {
    icon: options.icon || '/favicon.svg',
    badge: options.badge || '/favicon.svg',
    body: options.body || '',
    tag: options.tag || `notif_${Date.now()}`,
    renotify: !!options.renotify,
    vibrate: options.vibrate || [100, 50, 100],
    data: options.data || { url: '/' },
    dir: 'rtl',
    lang: 'ar',
    requireInteraction: options.requireInteraction || false,
  };

  // الأفضلية: استخدام Service Worker إذا كان مسجلاً (خاصة على الهواتف والأجهزة المحمولة)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    } catch (e) {
      // الرجوع للطريقة المباشرة
    }
  }

  // الطريقة المباشرة (Desktop fallback)
  try {
    const notification = new Notification(title, notificationOptions);
    notification.onclick = function (event) {
      event.preventDefault();
      window.focus();
      if (options.data?.url) {
        window.location.hash = options.data.url;
      }
      notification.close();
    };

    // إغلاق الإشعار تلقائياً بعد 8 ثوانٍ على أجهزة الكمبيوتر
    setTimeout(() => {
      try { notification.close(); } catch (e) {}
    }, 8000);

    return true;
  } catch (e) {
    console.warn('sendNativeNotification direct failed:', e);
    return false;
  }
}

/**
 * إرسال إشعار مرة واحدة فقط مع منع التكرار والإزعاج (Deduplication)
 */
export function notifyOnce(key, title, options = {}, ttlHours = 6) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  try {
    const raw = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    const ttlMs = ttlHours * 60 * 60 * 1000;

    // إذا تم إرساله مؤخراً خلال فترة الـ TTL نتجاهله لمنع تكرار الإزعاج
    if (history[key] && (now - history[key] < ttlMs)) {
      return;
    }

    // إرسال الإشعار
    sendNativeNotification(title, options);

    // تسجيل المفتاح
    history[key] = now;
    localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('notifyOnce failed:', e);
  }
}
