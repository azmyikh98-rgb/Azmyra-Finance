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
  apiKey: "AIzaSyDtLyGrA65UhUWXfLtTeahi7HNdcoc2BFs",
  authDomain: "azmyra-finance.firebaseapp.com",
  projectId: "azmyra-finance",
  storageBucket: "azmyra-finance.firebasestorage.app",
  messagingSenderId: "587100493197",
  appId: "1:587100493197:web:38227c7173bee63f1c19c4",
};

const FIREBASE_VAPID_KEY = "BIPJ8UFAZ13d2G88tzzGVuNuf066qInGAGNZNOfHyP0KOCqEmguBNb-npYJHC36mrFMt5Uym7VbW3uI6zonhNF8";
