/* =========================================================
   AZMYRA FINANCE — Konfigurasi Firebase (WAJIB DIISI)
   Ambil nilai-nilai ini dari Firebase Console:
   Project settings (ikon gerigi) -> General -> "Your apps" -> SDK setup and configuration

   VAPID key diambil dari:
   Project settings -> Cloud Messaging -> Web Push certificates -> Generate key pair

   PENTING: nilai yang sama juga harus ditempel di firebase-messaging-sw.js
   (file itu tidak bisa membaca file ini karena berjalan sebagai service worker terpisah).
   ========================================================= */
const FIREBASE_CONFIG = {
  apiKey: "TEMPEL_API_KEY",
  authDomain: "TEMPEL_AUTH_DOMAIN",
  projectId: "TEMPEL_PROJECT_ID",
  storageBucket: "TEMPEL_STORAGE_BUCKET",
  messagingSenderId: "TEMPEL_SENDER_ID",
  appId: "TEMPEL_APP_ID",
};

const FIREBASE_VAPID_KEY = "TEMPEL_VAPID_KEY";
