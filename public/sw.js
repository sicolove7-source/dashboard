/**
 * Tashteeb Pro — Service Worker (PWA & Offline Support & Web Push)
 * الإصدار الأول المطور لتطبيقات الهواتف والويب التقدمية
 */

const CACHE_NAME = 'tashteeb-pro-v2.1';
const PRECACHE_ASSETS = [
  './favicon.svg',
  './manifest.json'
];

// 1. التثبيت والتخزين المؤقت لملفات الهيكل الأساسي
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('SW Precache non-blocking error:', err);
      });
    })
  );
});

// 2. تفعيل وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting obsolete cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. معالجة طلبات الشبكة (Stale-While-Revalidate للأصول الثابتة + Network-First للبيانات)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // لا نقوم بكاش طلبات بيئة التطوير المحلية أو طلبات Firebase Firestore أو Cloud Functions أو الوسائط المرفوعة
  if (
    request.url.includes('localhost') ||
    request.url.includes('127.0.0.1') ||
    request.url.includes('firestore.googleapis.com') ||
    request.url.includes('firebasestorage.googleapis.com') ||
    request.url.includes('google.firestore') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // معالجة صفحات التصفح (HTML navigation) - دائماً Network-First لضمان استلام أحدث أكواد النظام فوراً
  if (request.mode === 'navigate' || request.url.endsWith('index.html') || request.url.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('./index.html') || await cache.match('/');
          return cachedIndex || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // معالجة الأصول الثابتة (JS, CSS, الخطوط, الصور)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          }).catch(() => {});
        }
        return networkResponse;
      });
    })
  );
});

// 4. دعم إشعارات Web Push من النظام
self.addEventListener('push', (event) => {
  let data = {
    title: 'تشطيب برو | تنبيه فوري',
    body: 'لديك إشعار جديد في منصة تشطيب برو',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    dir: 'rtl',
    lang: 'ar'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. التفاعل عند الضغط على الإشعار في الهاتف أو الكمبيوتر
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
