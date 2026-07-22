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
│   └── app.js                    # logika aplikasi + koneksi ke Google Spreadsheet
├── apps-script/
│   └── Code.gs                   # backend API (tempel ke Google Apps Script)
├── assets/
│   └── favicon.svg
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

Setelah ini, empat sheet berikut akan **otomatis terbuat** di spreadsheet kamu begitu aplikasi pertama kali dipakai:

| Sheet | Isi |
|---|---|
| `Pemasukan` | Semua transaksi pemasukan |
| `Pengeluaran` | Semua transaksi pengeluaran |
| `Users` | Daftar akun yang boleh login |
| `Log` | Catatan aktivitas (siapa menambah/menghapus apa, kapan) |

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

## 🛠️ Troubleshooting

**Update kode Apps Script TANPA mengubah URL:**
Kalau kamu mengedit `apps-script/Code.gs` dan perlu mempublikasikan perubahannya:
1. Buka project Apps Script → **Deploy → Manage deployments**.
2. Pilih deployment yang **sudah aktif/dipakai** (cek dulu URL-nya cocok dengan yang ada di `js/app.js`).
3. Klik ikon **pensil (Edit)** → di dropdown **Version**, pilih **New version** → klik **Deploy**.

Jangan pilih **"New deployment"** untuk update biasa — itu akan membuat **URL baru yang berbeda**, sehingga `js/app.js` kamu perlu diperbarui lagi. Gunakan "New deployment" hanya saat pertama kali setup.

**Error "CORS policy" / "Failed to fetch" di Console:**
Biasanya berarti URL di `CONFIG.API_URL` (`js/app.js`) sudah tidak valid atau salah ketik. Tes langsung di browser: buka `<URL_KAMU>?action=list` — kalau muncul teks JSON, URL-nya benar; kalau muncul "file tidak ditemukan", URL-nya salah/kadaluarsa.
