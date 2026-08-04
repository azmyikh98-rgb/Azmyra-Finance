/* =========================================================
   AZMYRA FINANCE — Service Worker
   Satu file ini menangani DUA hal sekaligus:
   1. Push notification (Firebase Cloud Messaging)
   2. Cache app shell supaya bisa di-install sebagai PWA & tetap
      bisa dibuka (versi terakhir) walau koneksi internet putus.

   File ini WAJIB berada di root (bukan di dalam folder js/),
   supaya cakupannya (scope) mencakup seluruh situs.

   PENTING: file ini TIDAK bisa membaca js/firebase-config.js
   (berjalan di konteks terpisah dari halaman web), jadi nilai
   konfigurasi di bawah ini HARUS ditempel ulang secara manual,
   sama persis dengan yang ada di js/firebase-config.js.
   ========================================================= */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDtLyGrA65UhUWXfLtTeahi7HNdcoc2BFs",
  authDomain: "azmyra-finance.firebaseapp.com",
  projectId: "azmyra-finance",
  storageBucket: "azmyra-finance.firebasestorage.app",
  messagingSenderId: "587100493197",
  appId: "1:587100493197:web:38227c7173bee63f1c19c4",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Azmyra Finance";
  const options = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "assets/icon-192.png",
    badge: "assets/icon-192.png",
  };
  self.registration.showNotification(title, options);
});

/* ---------------- PWA: cache app shell untuk mode offline ----------------
   NAIKKAN angka versi ini (v1 -> v2 -> ...) setiap kali kamu ganti isi
   file-file di bawah, supaya pengguna lama otomatis dapat versi terbaru. */
const CACHE_NAME = "azmyra-finance-v1";
const APP_SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/firebase-config.js",
  "manifest.json",
  "assets/favicon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // jangan sampai gagal cache 1 file membatalkan install
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Cuma tangani request ke situs sendiri (app shell: html/css/js/ikon).
  // Request ke Apps Script/Firebase/CDN dibiarkan lewat langsung ke
  // jaringan, supaya data transaksi selalu real-time & tidak ke-cache basi.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
