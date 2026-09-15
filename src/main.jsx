import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/mobile.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// تسجيل Service Worker لتحويل الموقع لتطبيق هاتف مثبت (PWA) والعمل دون اتصال في الإنتاج فقط
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Tashteeb Pro PWA SW registered successfully:', registration.scope);
      }).catch((err) => {
        console.log('PWA SW registration failed:', err);
      });
    });
  } else {
    // في بيئة التطوير المحلية نلغي تسجيل أي Service Worker سابق لمنع تجميد الكاش
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const r of registrations) {
        r.unregister();
      }
    });
  }
}
