// ════════════════════════════════════════════════
//  SCADENZARIO — Service Worker + FCM
//  ⚠️  AGGIORNA la firebaseConfig qui sotto
//     con gli stessi valori di index.html
// ════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "LA_TUA_API_KEY",
  authDomain:        "IL_TUO_PROJECT.firebaseapp.com",
  databaseURL:       "https://IL_TUO_PROJECT-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "IL_TUO_PROJECT",
  storageBucket:     "IL_TUO_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:000000000000"
});

const messaging = firebase.messaging();

// FCM: notifiche quando l'app è chiusa
messaging.onBackgroundMessage(payload => {
  const n = payload.notification || {};
  self.registration.showNotification(n.title || '📅 Scadenzario', {
    body:               n.body || '',
    icon:               './icon-192.png',
    badge:              './icon-192.png',
    vibrate:            [300, 150, 300],
    requireInteraction: true,
    data:               payload.data || {}
  });
});

// ─────────────────────────────────────────────────
const CACHE_NAME = 'scadenzario-v1';
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// ── INSTALL ──────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
  // Avvia il ciclo di controllo
  startCheckLoop();
});

// ── FETCH (offline support) ───────────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

// ── Apre l'app al click della notifica ───────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('./index.html');
    })
  );
});
