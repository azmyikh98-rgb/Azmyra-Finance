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
const CACHE_NAME = "azmyra-finance-v5";
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
  // TIDAK lagi self.skipWaiting() otomatis di sini. Dulu ini dipanggil
  // langsung, jadi worker versi baru langsung aktif walau tab lama masih
  // kebuka — akibatnya banner "ada pembaruan" bisa muncul lagi setelah
  // user klik Update (karena proses aktivasi versi baru itu masih
  // berlangsung tepat saat halaman reload, lalu "selesai" sendiri di
  // reload berikutnya dan dianggap pembaruan baru lagi).
  // Sekarang worker baru sengaja DIBIARKAN "menunggu" (waiting) sampai
  // ada perintah eksplisit dari halaman (lewat tombol "Update" di
  // js/app.js, yang kirim pesan SKIP_WAITING di bawah) — jadi aktivasinya
  // cuma terjadi SEKALI, persis saat user benar-benar klik Update.
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Dulu strateginya "cache dulu, update belakangan" (cache lama langsung
   ditampilkan, versi baru cuma disimpan buat load BERIKUTNYA) — makanya
   setelah deploy, app shell (html/css/js) terasa "nyangkut" di versi lama
   dan baru sungguhan ter-update di reload kedua. Sekarang dibalik jadi
   "coba jaringan dulu": kalau online, SELALU pakai file terbaru dari
   jaringan (dan diam-diam disimpan lagi ke cache buat cadangan offline).
   Cache versi lama cuma dipakai kalau requestnya benar-benar gagal
   (offline / tidak ada koneksi) — bukan lagi jadi jawaban default. */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Cuma tangani request ke situs sendiri (app shell: html/css/js/ikon).
  // Request ke Apps Script/Firebase/CDN dibiarkan lewat langsung ke
  // jaringan, supaya data transaksi selalu real-time & tidak ke-cache basi.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    // { cache: "no-store" } ini WAJIB, bukan sekadar tambahan — tanpa ini,
    // fetch() di bawah masih bisa diam-diam dijawab oleh HTTP cache bawaan
    // BROWSER (lapisan yang beda dari Cache Storage kita sendiri di atas),
    // karena GitHub Pages (Fastly) ngirim header Cache-Control: max-age
    // untuk semua file statis. Tanpa cache:"no-store", kode ini KELIHATANNYA
    // "coba jaringan dulu" tapi PRAKTIKNYA bisa tetap menjawab pakai salinan
    // lama dari cache HTTP browser selama beberapa menit — persis gejala
    // "cache masih tertinggal" yang dilaporkan, walau strateginya sudah
    // "network-first" di kode.
    fetch(event.request, { cache: "no-store" })
      .then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return res;
      })
      .catch(() =>
        // Jaringan gagal (offline, dsb.) — baru di sini fallback ke cache
        // terakhir yang tersimpan, supaya app tetap bisa dibuka offline.
        caches.match(event.request).then((cached) => cached || Response.error())
      )
  );
});
