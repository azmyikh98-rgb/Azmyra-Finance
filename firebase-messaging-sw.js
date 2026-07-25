/* =========================================================
   AZMYRA FINANCE — Service Worker untuk Push Notification
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
  apiKey: "TEMPEL_API_KEY",
  authDomain: "TEMPEL_AUTH_DOMAIN",
  projectId: "TEMPEL_PROJECT_ID",
  storageBucket: "TEMPEL_STORAGE_BUCKET",
  messagingSenderId: "TEMPEL_SENDER_ID",
  appId: "TEMPEL_APP_ID",
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
