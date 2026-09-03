import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'
import { LanguageProvider } from './lib/i18n/LanguageProvider';
import { UpdateBanner } from './components/UpdateBanner';
import { initAutoUpdater } from './lib/autoUpdater';
import './index.css';
import { IS_DESKTOP_APP } from './constants';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
    <UpdateBanner />
  </React.StrictMode>
);

/**
 * Service worker faqat brauzerdagi PWA uchun.
 *
 * Tauri ichida ilovaning barcha fayllari binary bilan birga keladi, ya'ni SW
 * hech nimani tezlashtirmaydi — u faqat WebView2 ning ma'lumotlar papkasida
 * ilova yangilanishidan ham omon qoladigan kesh qatlamini qo'shadi. "Nega
 * kassada eski versiya turibdi?" degan savolning eng keng tarqalgan sababi
 * shu, shuning uchun desktop ilovada umuman ro'yxatdan o'tkazmaymiz.
 */
if ('serviceWorker' in navigator && !IS_DESKTOP_APP) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

initAutoUpdater();
