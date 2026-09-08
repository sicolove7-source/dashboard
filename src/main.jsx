import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/mobile.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// تسجيل Service Worker لتحويل الموقع لتطبيق هاتف مثبت (PWA) والعمل دون اتصال
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      console.log('Tashteeb Pro PWA SW registered successfully:', registration.scope);
    }).catch((err) => {
      console.log('PWA SW registration failed:', err);
    });
  });
}
