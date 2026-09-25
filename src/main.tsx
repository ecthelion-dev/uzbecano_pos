import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'
import { LanguageProvider } from './lib/i18n/LanguageProvider';
import { UpdateBanner } from './components/UpdateBanner';
import { initAutoUpdater } from './lib/autoUpdater';
import { initPwaUpdater } from './lib/pwaUpdater';
import './index.css';
import { IS_DESKTOP_APP } from './constants';
import { hydrateStorage } from './lib/storage';

/**
 * Saqlash CHIZISHDAN OLDIN ochiladi.
 *
 * Kassaning diskdagi yozuvlari endi IndexedDB da (sabablari `kvStore.ts`
 * da). O'qish sinxron bo'lib qolgani uchun ilova kutmasa ham ishlaydi —
 * xotira `localStorage` dan darhol urug'lanadi — lekin o'shanda bazadagi,
 * ya'ni `localStorage` ga sig'magan yozuvlar birinchi soniyalarda
 * ko'rinmay turardi. Ochiq stol ko'rinmasligi esa kassir uchun
 * "buyurtma yo'qoldi" degani.
 *
 * `hydrateStorage` hech qachon rad etmaydi va o'z vaqt chegarasi bor.
 */
import { ErrorBoundary } from './components/ErrorBoundary';

function renderApp() {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <App />
          {/* Provider ICHIDA: banner ham `useT` ishlatadi, tashqarida u otadi
              va butun ilova oq ekranga aylanadi. */}
          <UpdateBanner />
        </LanguageProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

hydrateStorage()
  .catch((err) => {
    console.warn('[storage] hydrateStorage xatosi, kassa zaxirada ochiladi:', err);
  })
  .finally(renderApp);

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
initPwaUpdater();
