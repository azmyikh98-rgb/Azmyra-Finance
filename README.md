# Azmyra Finance

Aplikasi pencatat pemasukan dan pengeluaran yang hangat, ramah, dan mudah dipakai sehari-hari — untuk individu maupun keluarga.

## ✨ Fitur

- **Dashboard** — saldo saat ini, total pemasukan/pengeluaran, grafik arus kas bulan ini, kategori pengeluaran terbesar, dan transaksi terbaru.
- **Tambah Transaksi** — form cepat untuk mencatat pemasukan atau pengeluaran, lengkap dengan kategori, tanggal, dan catatan.
- **Riwayat** — daftar semua transaksi, bisa dicari dan difilter per jenis, serta dihapus jika perlu.
- Data disimpan langsung di **localStorage** browser — privat, tanpa server, tanpa perlu login.

## 🧱 Teknologi

Dibangun murni dengan **HTML, CSS, dan JavaScript (vanilla)** — tanpa proses build/bundler, sehingga:
- Ringan dan cepat dimuat.
- Bisa langsung dibuka dari file `index.html`.
- Sangat mudah di-deploy sebagai situs statis (termasuk GitHub Pages).

Data transaksi disimpan **bersama** di **Google Spreadsheet**, dijembatani lewat **Google Apps Script** sebagai API sederhana. Artinya semua orang yang membuka aplikasi ini melihat data yang sama — cocok untuk dipakai bersama keluarga.

> ⚠️ **Penting**: karena datanya terbuka bersama, siapapun yang punya link aplikasi ini bisa menambah/menghapus transaksi tanpa login. Jangan bagikan link publik secara luas kalau tidak ingin sembarang orang mengubah data.

## 📁 Struktur Proyek

```
azmyra-finance/
├── index.html                    # struktur halaman & 3 menu (Dashboard, Tambah, Riwayat)
├── css/
│   └── style.css                 # design system (warna, tipografi, komponen)
├── js/
│   ├── app.js                    # logika aplikasi + koneksi ke Google Spreadsheet
│   └── firebase-config.js        # konfigurasi Firebase (untuk push notification)
├── firebase-messaging-sw.js      # service worker penerima push notification
├── manifest.json                 # untuk "Add to Home Screen" (wajib di iPhone)
├── apps-script/
│   └── Code.gs                   # backend API (tempel ke Google Apps Script)
├── assets/
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── .github/
│   └── workflows/
│       └── deploy.yml            # konfigurasi deploy ke GitHub Pages
└── README.md
```

## 🔗 Setup Google Spreadsheet sebagai database

1. Buka [sheets.google.com](https://sheets.google.com) → buat spreadsheet baru, beri nama misalnya "Azmyra Finance DB".
2. Klik menu **Extensions → Apps Script**.
3. Hapus semua kode default (`function myFunction() {...}`), lalu buka file `apps-script/Code.gs` di proyek ini, salin seluruh isinya, dan tempel ke editor Apps Script.
4. Klik **Save** (ikon disket), beri nama project misalnya "Azmyra API".
5. Klik tombol **Deploy → New deployment**.
6. Klik ikon gerigi ⚙️ di sebelah "Select type" → pilih **Web app**.
7. Isi:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
8. Klik **Deploy**. Google akan meminta otorisasi — ikuti langkah **Authorize access**, pilih akun Google kamu, lalu klik **Advanced → Go to (nama project) (unsafe) → Allow** (ini normal karena scriptnya buatan sendiri, bukan aplikasi pihak ketiga).
9. Setelah berhasil, klik tombol **"Salin"** di bagian **Web app URL** yang muncul (formatnya `https://script.google.com/macros/s/xxxxx/exec`). **Selalu pakai tombol Salin** — jangan select teks URL secara manual dari layar, karena tampilan URL panjang sering terpotong dengan tanda "...".
10. Buka file `js/app.js`, cari baris:
    ```js
    const CONFIG = {
      API_URL: "TEMPEL_URL_APPS_SCRIPT_KAMU_DI_SINI",
    };
    ```
    Ganti `"TEMPEL_URL_APPS_SCRIPT_KAMU_DI_SINI"` dengan URL yang kamu salin tadi.
11. Simpan, lalu commit & push perubahan ini ke GitHub agar situs ter-update.

Setelah ini, sheet-sheet berikut akan **otomatis terbuat** di spreadsheet kamu begitu aplikasi pertama kali dipakai:

| Sheet | Isi |
|---|---|
| `Pemasukan` | Semua transaksi pemasukan |
| `Pengeluaran` | Semua transaksi pengeluaran |
| `KategoriPemasukan` | Master data kategori pemasukan (bisa diedit) |
| `KategoriPengeluaran` | Master data kategori pengeluaran (bisa diedit) |
| `Users` | Daftar akun yang boleh login |
| `Log` | Catatan aktivitas (siapa menambah/menghapus apa, kapan) |

### 🏷️ Mengelola kategori

Sheet `KategoriPemasukan` dan `KategoriPengeluaran` otomatis terisi kategori bawaan saat pertama kali dibuat. Kamu bebas **menambah, mengubah, atau menghapus baris** kapan saja — perubahan langsung terlihat di aplikasi begitu halaman di-refresh, tanpa perlu edit kode.

| id | label | icon |
|---|---|---|
| makanan | Makanan & Minuman | 🍜 |
| baru | Kategori Baru | 🆕 |

- **id**: kode unik internal, tanpa spasi (dipakai untuk mencocokkan transaksi lama — jangan diubah kalau kategori itu sudah dipakai di transaksi yang ada).
- **label**: nama yang tampil di aplikasi.
- **icon**: 1 emoji bebas.

Untuk kategori yang benar-benar baru, cukup tambah baris baru dengan `id` unik yang belum pernah dipakai.

### 👤 Menambahkan akun login (WAJIB sebelum bisa dipakai)

Aplikasi ini butuh login sederhana. Buka sheet **`Users`** di spreadsheet kamu (kalau belum ada, buka aplikasi sekali dulu di browser supaya sheet-nya otomatis terbuat, atau tambahkan manual dengan header `username | password | displayName`), lalu isi satu baris per anggota keluarga, contoh:

| username | password | displayName |
|---|---|---|
| ayah | rahasia123 | Ayah |
| ibu | rahasia456 | Ibu |

⚠️ **Penting untuk diketahui**: ini login level dasar untuk mencegah orang asing iseng membuka aplikasi — **bukan** keamanan tingkat tinggi. Password disimpan sebagai teks biasa di spreadsheet (tidak dienkripsi), dan siapapun yang tahu URL Apps Script secara teknis masih bisa memanggil API-nya langsung tanpa lewat halaman login. Jangan gunakan password yang juga kamu pakai di akun penting lain.

Setiap transaksi yang ditambahkan/dihapus lewat aplikasi akan otomatis tercatat di sheet `Log` beserta nama usernya — dan sebaliknya, siapapun yang login akan melihat data terbaru dari spreadsheet yang sama.


## 🚀 Menjalankan secara lokal

Karena tidak ada proses build, cukup buka `index.html` langsung di browser, **atau** jalankan server statis sederhana agar lebih stabil (disarankan):

```bash
# Python
python3 -m http.server 8080

# atau Node.js
npx serve .
```

Lalu buka `http://localhost:8080`.

## 🐙 Deploy ke GitHub Pages

1. Buat repository baru di GitHub (jangan centang "Add a README"), lalu push proyek ini:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Azmyra Finance"
   git branch -M main
   git remote add origin <URL_REPO_GITHUB_KAMU>
   git push -u origin main
   ```
2. Buka repo di GitHub → **Settings → Pages**.
3. Pada bagian **Build and deployment → Source**, pilih **GitHub Actions**.
4. Workflow `.github/workflows/deploy.yml` yang sudah disiapkan akan otomatis berjalan setiap kali kamu push ke branch `main`. Pantau progresnya di tab **Actions**.
5. Setelah workflow selesai (centang hijau), buka kembali **Settings → Pages** untuk melihat URL situsmu — biasanya:
   ```
   https://<username>.github.io/<nama-repo>/
   ```

> Catatan: karena data disimpan di localStorage browser masing-masing pengguna, setiap orang yang membuka situs akan punya catatan keuangannya sendiri-sendiri (tidak saling terhubung).

## 🎨 Desain

- **Warna**: hijau pinus & fern yang tenang, aksen madu (honey) yang hangat, serta merah bata (brick) lembut untuk pengeluaran — dipilih agar terasa ramah keluarga, tidak kaku seperti aplikasi fintech korporat.
- **Tipografi**: perpaduan *Fraunces* (serif hangat, untuk judul & angka saldo) dan *Plus Jakarta Sans* (untuk teks & antarmuka).
- **Elemen khas**: cincin "arus kas" pada dashboard yang menunjukkan proporsi pengeluaran terhadap pemasukan bulan ini secara sekilas.

## 💡 Ide pengembangan lanjutan

- Ekspor riwayat ke CSV/PDF.
- Target/anggaran bulanan per kategori.
- Mode gelap.
- Sinkronisasi ke backend (mis. Supabase/Firebase) jika ingin data lintas perangkat.

## 📲 Install sebagai App (PWA)

Azmyra Finance sudah bisa di-install seperti aplikasi native — ikonnya muncul di home screen, terbuka tanpa address bar browser, dan tetap bisa dibuka (tampilan terakhir) walau koneksi internet putus.

**Android / Desktop (Chrome, Edge):**
1. Buka situsnya, login seperti biasa.
2. Klik profil di sidebar → akan muncul tombol **"Instal Aplikasi"** (kalau browser mendeteksi situsnya installable).
3. Klik, konfirmasi **Install** pada dialog yang muncul.
4. Ikon Azmyra Finance akan muncul di home screen (Android) / desktop & start menu (Windows/Mac).

Kalau tombol "Instal Aplikasi" tidak muncul, cara alternatif: klik ikon **⊕ / Install** yang biasanya muncul di ujung kanan address bar Chrome.

**iPhone (Safari):** wajib manual, iOS tidak mendukung prompt otomatis di atas —
1. Buka situsnya lewat **Safari** (bukan Chrome).
2. Tap ikon **Share** (kotak dengan panah ke atas) → **"Add to Home Screen"**.
3. Selanjutnya buka dari ikon di layar utama, bukan dari Safari langsung (supaya notifikasi push juga aktif, lihat bagian bawah).

## 🔔 Setup Notifikasi Push (opsional)

Fitur ini membuat notifikasi muncul di lock screen/home screen HP setiap ada anggota keluarga lain yang menambahkan transaksi. Perlu setup **Firebase Cloud Messaging (FCM)** — gratis, tidak perlu kartu kredit.

### A. Buat project Firebase

1. Buka [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → beri nama (misal "Azmyra Finance") → ikuti langkah sampai selesai.
2. Di dashboard project, klik ikon **`</>`** (Web) untuk mendaftarkan web app baru. Beri nama, tidak perlu centang Firebase Hosting.
3. Setelah selesai, akan muncul kode konfigurasi `firebaseConfig` berisi `apiKey`, `authDomain`, `projectId`, dst. **Salin semua nilainya.**

### B. Isi konfigurasi di 2 tempat

Buka `js/firebase-config.js`, ganti semua nilai `"TEMPEL_..."` dengan nilai dari langkah A. **Lakukan hal yang sama** di `firebase-messaging-sw.js` (isi objek `firebase.initializeApp({...})` di sana dengan nilai yang **persis sama**) — file ini tidak bisa membaca `firebase-config.js` karena berjalan terpisah sebagai service worker.

### C. Buat VAPID key (untuk web push)

1. Di Firebase Console: **Project settings** (ikon gerigi) → tab **Cloud Messaging**.
2. Scroll ke **Web Push certificates** → klik **Generate key pair**.
3. Salin key yang muncul, tempel ke `FIREBASE_VAPID_KEY` di `js/firebase-config.js`.

### D. Buat Service Account (supaya Apps Script bisa mengirim notifikasi)

1. Masih di **Project settings** → tab **Service accounts** → klik **Generate new private key** → akan terunduh file `.json`.
2. Buka file `.json` itu dengan text editor, cari 2 nilai: `client_email` dan `private_key`.
3. Buka project Apps Script kamu ("Azmyra API") → klik ikon **gerigi (Project Settings)** di sidebar kiri → scroll ke **Script Properties** → klik **Add script property**, tambahkan 3 baris:
   | Property | Value |
   |---|---|
   | `FCM_PROJECT_ID` | project ID Firebase kamu (terlihat di Project settings → General) |
   | `FCM_CLIENT_EMAIL` | nilai `client_email` dari file JSON tadi |
   | `FCM_PRIVATE_KEY` | nilai `private_key` dari file JSON tadi (termasuk `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`-nya) |
4. Deploy ulang Apps Script (**Deploy → Manage deployments → Edit → New version → Deploy**) supaya kode terbarunya (yang sudah mendukung push) aktif.

### E. Commit & push perubahan

```bash
git add .
git commit -m "Setup push notification"
git push
```

### F. Aktifkan notifikasi di aplikasi

Setiap anggota keluarga tinggal buka aplikasi → klik **"Aktifkan Notifikasi"** di sidebar → izinkan saat diminta browser.

**Khusus pengguna iPhone**, wajib langkah tambahan (batasan dari Apple, bukan dari aplikasi):
1. Buka aplikasi lewat **Safari** (bukan Chrome).
2. Tap ikon **Share** (kotak dengan panah ke atas) → **"Add to Home Screen"**.
3. Selanjutnya, selalu buka aplikasi dari **ikon di layar utama**, bukan dari Safari langsung.
4. Minimal iOS 16.4.

## 🛠️ Troubleshooting

**Update kode Apps Script TANPA mengubah URL:**
Kalau kamu mengedit `apps-script/Code.gs` dan perlu mempublikasikan perubahannya:
1. Buka project Apps Script → **Deploy → Manage deployments**.
2. Pilih deployment yang **sudah aktif/dipakai** (cek dulu URL-nya cocok dengan yang ada di `js/app.js`).
3. Klik ikon **pensil (Edit)** → di dropdown **Version**, pilih **New version** → klik **Deploy**.

Jangan pilih **"New deployment"** untuk update biasa — itu akan membuat **URL baru yang berbeda**, sehingga `js/app.js` kamu perlu diperbarui lagi. Gunakan "New deployment" hanya saat pertama kali setup.

**Error "CORS policy" / "Failed to fetch" di Console:**
Biasanya berarti URL di `CONFIG.API_URL` (`js/app.js`) sudah tidak valid atau salah ketik. Tes langsung di browser: buka `<URL_KAMU>?action=list` — kalau muncul teks JSON, URL-nya benar; kalau muncul "file tidak ditemukan", URL-nya salah/kadaluarsa.
