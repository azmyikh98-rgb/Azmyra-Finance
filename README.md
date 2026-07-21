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
- Sangat mudah di-deploy sebagai situs statis (termasuk GitLab Pages).

## 📁 Struktur Proyek

```
azmyra-finance/
├── index.html                    # struktur halaman & 3 menu (Dashboard, Tambah, Riwayat)
├── css/
│   └── style.css                 # design system (warna, tipografi, komponen)
├── js/
│   └── app.js                    # logika aplikasi & penyimpanan data
├── assets/
│   └── favicon.svg
├── .github/
│   └── workflows/
│       └── deploy.yml            # konfigurasi deploy ke GitHub Pages
└── README.md
```

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
