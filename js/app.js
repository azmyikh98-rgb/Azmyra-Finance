/* =========================================================
   AZMYRA FINANCE — app logic (vanilla JS, no build step)
   Data disimpan bersama di Google Spreadsheet (sheet terpisah untuk
   Pemasukan & Pengeluaran) lewat Google Apps Script, dengan login
   sederhana berbasis sheet "Users" dan log aktivitas di sheet "Log".
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     KONFIGURASI — WAJIB DIISI
     Tempel URL Web App hasil deploy Google Apps Script kamu di sini.
     Contoh: "https://script.google.com/macros/s/AKfycb.../exec"
     ========================================================= */
  const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbycRx4yLrKBN1BeBOkzIDGZUj-vaBn2V5HEtthzP2pq9oJBbPJSxJBm4X7rRj8_AU-g/exec",
  };

  const AUTH_STORAGE_KEY = "azmyra_finance_user_v1";

  // Daftar emoji untuk picker "Pilih Emoji" di form Tambah/Edit Kategori —
  // dikelompokkan per tema supaya mudah dijelajah, plus kata kunci (Indonesia
  // & sedikit Inggris) untuk pencarian. [emoji, "kata kunci dipisah spasi"]
  const EMOJI_GROUPS = [
    {
      name: "Populer",
      items: [
        ["💰", "uang duit money cash tabungan"],
        ["💵", "uang kertas cash dollar"],
        ["💳", "kartu kredit debit card"],
        ["🏦", "bank rekening"],
        ["🧾", "struk nota kwitansi receipt bill tagihan"],
        ["📱", "hp ponsel handphone gadget phone"],
        ["🍽️", "makan makanan food restoran"],
        ["🚗", "mobil transportasi car"],
        ["🏠", "rumah tagihan home house"],
        ["🎁", "hadiah kado gift bonus thr"],
        ["💼", "kerja kantor tas kerja job briefcase usaha"],
        ["📈", "investasi grafik naik chart profit untung"],
        ["📉", "rugi turun grafik chart loss"],
        ["🛒", "belanja troli shopping cart"],
        ["⚡", "listrik energi electricity token pln"],
        ["💧", "air pdam water"],
        ["🎓", "pendidikan sekolah wisuda education"],
        ["🏥", "kesehatan rumah sakit health hospital"],
        ["✈️", "liburan pesawat travel flight"],
        ["🐾", "hewan peliharaan pet"],
      ],
    },
    {
      name: "Makanan & Minuman",
      items: [
        ["🍚", "nasi rice"],
        ["🍜", "mie noodle bakso"],
        ["🍔", "burger"],
        ["🍕", "pizza"],
        ["🍗", "ayam chicken"],
        ["🥩", "daging meat"],
        ["🐟", "ikan fish"],
        ["🍤", "udang shrimp seafood"],
        ["🥗", "salad sayur"],
        ["🍲", "sup soto soup"],
        ["🍛", "kari curry nasi"],
        ["🌮", "taco"],
        ["🍣", "sushi"],
        ["🍱", "bento lunch box"],
        ["🥟", "pangsit dumpling"],
        ["🍞", "roti bread"],
        ["🥐", "croissant"],
        ["🧁", "cupcake kue"],
        ["🎂", "kue ulang tahun cake"],
        ["🍪", "kue kering cookie"],
        ["🍩", "donat donut"],
        ["🍫", "coklat chocolate"],
        ["🍬", "permen candy"],
        ["🍿", "popcorn"],
        ["☕", "kopi coffee"],
        ["🍵", "teh tea"],
        ["🥤", "minuman soda drink es"],
        ["🧃", "jus juice"],
        ["🍺", "bir beer"],
        ["🍷", "anggur wine"],
        ["🥛", "susu milk"],
        ["🍳", "telur goreng egg"],
        ["🥦", "brokoli sayur vegetable"],
        ["🍎", "apel apple buah"],
        ["🍌", "pisang banana buah"],
        ["🍇", "anggur grape buah"],
        ["🍉", "semangka watermelon buah"],
        ["🥭", "mangga mango buah"],
      ],
    },
    {
      name: "Belanja",
      items: [
        ["🛍️", "belanja kantong shopping bag"],
        ["🛒", "troli belanja cart"],
        ["👗", "baju pakaian dress fashion"],
        ["👕", "kaos baju shirt"],
        ["👖", "celana jeans"],
        ["👟", "sepatu shoes"],
        ["👜", "tas wanita bag"],
        ["💄", "kosmetik makeup lipstik"],
        ["💇", "salon rambut haircut"],
        ["💅", "nail salon kuku"],
        ["🎮", "game hiburan gaming"],
        ["📚", "buku book"],
        ["🧴", "sabun perawatan skincare"],
        ["🪥", "sikat gigi toothbrush"],
        ["🧻", "tisu tissue"],
        ["🧹", "sapu bersih cleaning"],
        ["🧺", "laundry cucian"],
        ["🔧", "perbaikan tools repair servis"],
      ],
    },
    {
      name: "Transportasi",
      items: [
        ["🚗", "mobil car"],
        ["🚕", "taksi taxi"],
        ["🚙", "suv mobil"],
        ["🚌", "bus"],
        ["🚉", "stasiun kereta station"],
        ["🚆", "kereta train"],
        ["🚄", "kereta cepat highspeed train"],
        ["✈️", "pesawat plane flight"],
        ["🛵", "motor scooter"],
        ["🏍️", "motor motorcycle"],
        ["🚲", "sepeda bicycle"],
        ["⛽", "bensin bbm gas fuel spbu"],
        ["🅿️", "parkir parking"],
        ["🚦", "lalu lintas traffic tilang"],
        ["🛣️", "jalan tol road highway"],
        ["🚢", "kapal ship"],
        ["🚀", "roket rocket travel"],
      ],
    },
    {
      name: "Rumah & Tagihan",
      items: [
        ["🏠", "rumah house home"],
        ["🏢", "gedung kantor building office"],
        ["🔑", "kunci key"],
        ["🛋️", "sofa furniture"],
        ["🛏️", "kasur bed"],
        ["🚿", "shower mandi"],
        ["🚽", "toilet wc"],
        ["🔥", "gas api fire"],
        ["⚡", "listrik electricity token"],
        ["💡", "lampu listrik bulb"],
        ["📶", "internet wifi"],
        ["📡", "sinyal internet signal"],
        ["🖥️", "komputer computer"],
        ["💻", "laptop"],
        ["📺", "tv televisi"],
        ["🧊", "kulkas ac dingin fridge cold"],
        ["🧰", "perkakas toolbox"],
      ],
    },
    {
      name: "Uang & Kerja",
      items: [
        ["💰", "uang tabungan money savings"],
        ["💵", "uang cash dollar"],
        ["💴", "yen"],
        ["💶", "euro"],
        ["💷", "pound"],
        ["🪙", "koin coin"],
        ["💳", "kartu kredit card"],
        ["🏦", "bank"],
        ["🧾", "nota struk kwitansi receipt invoice"],
        ["📊", "laporan statistik report chart"],
        ["📈", "naik untung profit growth"],
        ["📉", "turun rugi loss decline"],
        ["💹", "saham investasi stock market"],
        ["🧮", "hitung kalkulator calculator"],
        ["💼", "kerja kantor tas job briefcase gaji"],
        ["📝", "catatan tugas note"],
        ["📄", "dokumen file document"],
        ["🗂️", "arsip file organizer"],
        ["🤝", "kerjasama deal handshake"],
        ["🎯", "target goal"],
        ["🏆", "penghargaan bonus prestasi award trophy"],
      ],
    },
    {
      name: "Hiburan & Hobi",
      items: [
        ["🎬", "film movie bioskop"],
        ["🎮", "game"],
        ["🎧", "musik headphone"],
        ["🎵", "lagu musik note"],
        ["🎸", "gitar musik"],
        ["📷", "kamera foto photo camera"],
        ["🎨", "seni lukis hobi art painting"],
        ["📖", "buku baca reading book"],
        ["🧩", "puzzle hobi"],
        ["⚽", "bola sepakbola football"],
        ["🏀", "basket basketball"],
        ["🏸", "badminton"],
        ["🎳", "bowling"],
        ["🎣", "mancing fishing"],
        ["🏕️", "camping kemah"],
        ["🎡", "hiburan wisata ferris wheel"],
        ["🎟️", "tiket ticket"],
      ],
    },
    {
      name: "Kesehatan",
      items: [
        ["🏥", "rumah sakit hospital"],
        ["💊", "obat pil medicine pill"],
        ["💉", "suntik vaksin injection vaccine"],
        ["🩺", "dokter checkup stethoscope"],
        ["🦷", "gigi dental"],
        ["👓", "kacamata glasses"],
        ["🧠", "otak kesehatan mental brain"],
        ["🏃", "olahraga lari exercise running gym"],
        ["🧘", "yoga meditasi meditation"],
        ["🚴", "sepeda olahraga cycling exercise"],
      ],
    },
    {
      name: "Pendidikan",
      items: [
        ["🎓", "wisuda sekolah pendidikan graduation education"],
        ["📚", "buku pelajaran books"],
        ["✏️", "pensil pencil"],
        ["🖍️", "crayon"],
        ["🎒", "tas sekolah backpack"],
        ["🏫", "sekolah school"],
      ],
    },
    {
      name: "Hewan & Alam",
      items: [
        ["🐶", "anjing dog"],
        ["🐱", "kucing cat"],
        ["🐦", "burung bird"],
        ["🐟", "ikan fish"],
        ["🐰", "kelinci rabbit"],
        ["🌳", "pohon tree"],
        ["🌸", "bunga flower"],
        ["☀️", "matahari sun"],
        ["🌧️", "hujan rain"],
      ],
    },
    {
      name: "Simbol & Lainnya",
      items: [
        ["🏷️", "label tag kategori"],
        ["📦", "paket kotak box package"],
        ["🎁", "hadiah gift"],
        ["❤️", "hati suka favorite love"],
        ["⭐", "bintang favorit star"],
        ["✅", "selesai centang check done"],
        ["❌", "batal hapus cancel"],
        ["⏰", "waktu jam alarm time"],
        ["📅", "kalender tanggal calendar date"],
        ["🔔", "notifikasi bell"],
        ["🔒", "kunci aman lock secure"],
        ["🌐", "internet web globe"],
        ["📌", "pin penting pin"],
        ["❓", "tanya lainnya question other"],
      ],
    },
  ];

  // Kategori TIDAK lagi hardcode di sini — diambil dari spreadsheet (sheet
  // "KategoriPemasukan" & "KategoriPengeluaran") lewat Apps Script setiap
  // kali data dimuat. Isi array kosong sebagai default sebelum data datang.
  let CATEGORIES = { income: [], expense: [] };
  let CATEGORY_LOOKUP = {};

  function rebuildCategoryLookup() {
    CATEGORY_LOOKUP = {};
    [...CATEGORIES.income, ...CATEGORIES.expense].forEach((c) => (CATEGORY_LOOKUP[c.id] = c));
  }

  const MONTH_NAMES_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const MONTH_NAMES_FULL_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  /* ---------------- State ---------------- */
  let transactions = [];
  let currentType = "income"; // untuk form Tambah
  let currentSource = "rekening"; // sumber dana untuk form Tambah (cash | rekening)
  let currentFilter = "all"; // untuk Riwayat
  let searchTerm = "";
  // Filter "Lihat Periode" di Dashboard & Laporan: sekarang pakai rentang
  // tanggal bebas (dari - sampai), bukan lagi pilihan Harian/Mingguan/
  // Bulanan/Tahunan dengan kalender masing-masing. Default diisi saat
  // initPeriodDefaults() dipanggil (lihat di bawah).
  let rangeStart = todayISO();
  let rangeEnd = todayISO();
  let currentUser = null; // { username, displayName }
  let isConfigured = CONFIG.API_URL && CONFIG.API_URL.startsWith("http");

  /* ---------------- Auth ---------------- */
  function loadStoredUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveStoredUser(user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }

  function clearStoredUser() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  // Cache data transaksi & kategori terakhir di localStorage, supaya saat
  // app dibuka lagi, ada sesuatu yang langsung tampil ("terasa instan")
  // sambil data terbaru masih diambil dari Spreadsheet di belakang layar
  // — daripada layar kosong-total sampai request selesai.
  const DATA_CACHE_KEY = "azmyra_finance_data_cache_v1";
  function saveDataCache(txs, cats) {
    try {
      localStorage.setItem(DATA_CACHE_KEY, JSON.stringify({ transactions: txs, categories: cats }));
    } catch (e) {
      // localStorage penuh/diblokir — abaikan, cache cuma optimisasi, bukan wajib.
    }
  }
  function loadDataCache() {
    try {
      const raw = localStorage.getItem(DATA_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function loginRequest(username, password) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", username, password }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Login gagal");
    // Backend sekarang menyertakan data transaksi & kategori langsung di
    // respons login yang sama (lihat handleLogin di Code.gs) — jadi tidak
    // perlu request kedua terpisah lagi untuk memuat data awal.
    return {
      user: json.user,
      transactions: (json.data || []).map((t) => ({ ...t, date: normalizeDate(t.date) })),
      categories: json.categories || { income: [], expense: [] },
    };
  }

  /* ---------------- Koneksi ke Google Spreadsheet ---------------- */
  async function fetchTransactions() {
    const res = await fetch(`${CONFIG.API_URL}?action=list`);
    if (!res.ok) throw new Error("Gagal memuat data (" + res.status + ")");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal memuat data");
    const transactions = (json.data || []).map((t) => ({ ...t, date: normalizeDate(t.date) }));
    const categories = json.categories || { income: [], expense: [] };
    return { transactions, categories };
  }

  async function addTransactionRemote(tx) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // hindari CORS preflight
      body: JSON.stringify({ action: "add", transaction: tx, username: currentUser ? currentUser.username : "" }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal menyimpan transaksi");
  }

  async function deleteTransactionRemote(id, type) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "delete", id, type, username: currentUser ? currentUser.username : "" }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal menghapus transaksi");
  }

  async function updateTransactionRemote(tx) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "updateTransaction", transaction: tx, username: currentUser ? currentUser.username : "" }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal memperbarui transaksi");
  }

  async function addCategoryRemote(type, label, icon) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "addCategory", type, label, icon }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal menambah kategori");
    return json.category;
  }

  async function updateCategoryRemote(type, id, label, icon) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "updateCategory", type, id, label, icon }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal memperbarui kategori");
  }

  async function deleteCategoryRemote(type, id) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "deleteCategory", type, id }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal menghapus kategori");
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------- Helpers tanggal ---------------- */
  function pad2(n) { return String(n).padStart(2, "0"); }

  function normalizeDate(raw) {
    if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (!isNaN(d)) return toISODate(d);
    return raw;
  }

  function toISODate(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function parseISODate(isoStr) {
    const [y, m, d] = isoStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function todayISO() {
    return toISODate(new Date());
  }

  function getWeeksInMonth(year, month) {
    // Mengembalikan daftar minggu (Minggu–Sabtu, gaya kalender) yang
    // beririsan dengan bulan tertentu, diberi nomor urut 1, 2, 3, ...
    const weeks = [];
    const lastDay = new Date(year, month + 1, 0);
    const cursor = new Date(year, month, 1);
    const dow = cursor.getDay(); // Minggu = 0, sudah pas jadi awal minggu
    cursor.setDate(cursor.getDate() - dow);
    let idx = 1;
    while (cursor <= lastDay) {
      const start = new Date(cursor);
      const end = new Date(cursor);
      end.setDate(end.getDate() + 6);
      weeks.push({ index: idx, start: toISODate(start), end: toISODate(end) });
      idx++;
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }

  /* ---------------- Range periode ---------------- */
  // rangeStart/rangeEnd SELALU sudah tervalidasi (start <= end) oleh
  // handler form di bawah, jadi di sini cukup dibaca apa adanya.
  function getPeriodRange() {
    return { start: rangeStart, end: rangeEnd };
  }

  function formatPeriodLabel(range) {
    const s = parseISODate(range.start);
    const e = parseISODate(range.end);
    if (range.start === range.end) {
      return s.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    }
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    if (sameMonth) return `${s.getDate()}–${e.getDate()} ${MONTH_NAMES_FULL_ID[s.getMonth()]} ${s.getFullYear()}`;
    const sameYear = s.getFullYear() === e.getFullYear();
    if (sameYear) return `${s.getDate()} ${MONTH_NAMES_ID[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES_ID[e.getMonth()]} ${e.getFullYear()}`;
    return `${s.getDate()} ${MONTH_NAMES_ID[s.getMonth()]} ${s.getFullYear()} – ${e.getDate()} ${MONTH_NAMES_ID[e.getMonth()]} ${e.getFullYear()}`;
  }

  function filterByPeriod(list, range) {
    return list.filter((t) => t.date >= range.start && t.date <= range.end);
  }

  /* ---------------- Setup kontrol periode (filter rentang tanggal) ---------------- */
  const periodForm = document.getElementById("period-form");
  const rangeStartInput = document.getElementById("range-start-input");
  const rangeEndInput = document.getElementById("range-end-input");
  const periodPresetButtons = document.querySelectorAll(".period-preset-chip");
  const DAY_LABELS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  // Terapkan rentang baru: validasi (start tidak boleh setelah end, auto
  // tukar posisi kalau kepilih terbalik), simpan ke state, sinkronkan ke
  // input, lalu render ulang Dashboard & Laporan (dua-duanya pakai rentang
  // yang sama persis — lihat movePeriodPanel()).
  function applyDateRange(startVal, endVal) {
    let s = startVal || rangeStart;
    let e = endVal || rangeEnd;
    if (s > e) { const tmp = s; s = e; e = tmp; } // jaga-jaga kalau user pilih terbalik
    rangeStart = s;
    rangeEnd = e;
    rangeStartInput.value = rangeStart;
    rangeEndInput.value = rangeEnd;
    updateActivePresetChip();
    renderPeriodPanels();
    renderLaporan();
  }

  // Chip preset cuma cara cepat mengisi dua input tanggal — tetap lewat
  // applyDateRange() yang sama supaya perilakunya (termasuk render ulang)
  // konsisten dengan submit form biasa.
  function computePresetRange(preset) {
    const today = new Date();
    if (preset === "today") {
      const iso = todayISO();
      return { start: iso, end: iso };
    }
    if (preset === "week") {
      const dow = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - dow);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: toISODate(start), end: toISODate(end) };
    }
    if (preset === "month") {
      const y = today.getFullYear();
      const m = today.getMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      return { start: `${y}-${pad2(m)}-01`, end: `${y}-${pad2(m)}-${pad2(lastDay)}` };
    }
    // year
    const y = today.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }

  function updateActivePresetChip() {
    const matched = ["today", "week", "month", "year"].find((p) => {
      const r = computePresetRange(p);
      return r.start === rangeStart && r.end === rangeEnd;
    });
    periodPresetButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.preset === matched);
    });
  }

  periodPresetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const r = computePresetRange(btn.dataset.preset);
      applyDateRange(r.start, r.end);
      showToast("Periode diterapkan ✓");
    });
  });

  function initPeriodDefaults() {
    // Default: dari awal bulan berjalan sampai hari ini — paling relevan
    // dibuka pertama kali dibanding rentang kosong.
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    rangeStart = `${y}-${pad2(m)}-01`;
    rangeEnd = todayISO();
    rangeStartInput.value = rangeStart;
    rangeEndInput.value = rangeEnd;
    updateActivePresetChip();
  }

  periodForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!rangeStartInput.value || !rangeEndInput.value) {
      showToast("Pilih tanggal mulai dan tanggal akhir dahulu.");
      return;
    }
    applyDateRange(rangeStartInput.value, rangeEndInput.value);
    showToast("Periode diterapkan ✓");
  });

  /* ---------------- Helpers umum ---------------- */
  function formatRupiah(n) {
    const val = Math.round(Number(n) || 0);
    return "Rp " + val.toLocaleString("id-ID");
  }

  function formatDateShort(isoStr) {
    const d = parseISODate(isoStr);
    if (isNaN(d)) return isoStr;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- Modal konfirmasi (dipakai bersama) ---------------- */
  const confirmModal = document.getElementById("confirm-modal");
  const confirmModalTitle = document.getElementById("confirm-modal-title");
  const confirmModalMessage = document.getElementById("confirm-modal-message");
  const confirmModalOk = document.getElementById("confirm-modal-ok");
  const confirmModalCancel = document.getElementById("confirm-modal-cancel");
  let confirmResolver = null;

  function askConfirm(title, message, okLabel, danger) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModalOk.textContent = okLabel || "Ya, Lanjutkan";
    confirmModalOk.classList.toggle("btn--danger", !!danger);
    confirmModalOk.classList.toggle("btn--primary", !danger);
    confirmModal.hidden = false;
    return new Promise((resolve) => { confirmResolver = resolve; });
  }
  function closeConfirmModal(result) {
    confirmModal.hidden = true;
    if (confirmResolver) {
      const r = confirmResolver;
      confirmResolver = null;
      r(result);
    }
  }
  confirmModalOk.addEventListener("click", () => closeConfirmModal(true));
  confirmModalCancel.addEventListener("click", () => closeConfirmModal(false));
  confirmModal.addEventListener("click", (e) => { if (e.target === confirmModal) closeConfirmModal(false); });

  /* ---------------- Routing (sidebar tabs) ---------------- */
  function goToRoute(route) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("is-active"));
    document.getElementById(`page-${route}`).classList.add("is-active");
    document.querySelectorAll(".nav-item[data-route], .bottomnav-item[data-route]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.route === route);
    });
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (route === "tambah") {
      const dateInput = document.getElementById("tx-date");
      if (!dateInput.value) dateInput.value = todayISO();
    }
    movePeriodPanel(route);
  }

  // Panel "Lihat Periode" (dengan kalender harian/mingguan/bulanan/tahunan)
  // dipakai bersama oleh Dashboard & Laporan — bukan diduplikasi, tapi
  // benar-benar dipindah (appendChild) antar halaman saat berganti route.
  // Karena elemennya sama persis (bukan salinan), semua id, event listener,
  // dan state pilihan periode otomatis tetap sama & selalu sinkron di kedua
  // halaman, tanpa perlu menulis ulang logikanya dua kali.
  function movePeriodPanel(route) {
    const panel = document.getElementById("period-panel");
    if (route === "laporan") {
      document.getElementById("laporan-period-slot").appendChild(panel);
    } else {
      document.getElementById("dashboard-period-slot").insertAdjacentElement("afterend", panel);
    }
  }

  document.querySelectorAll("[data-route]").forEach((el) => {
    el.addEventListener("click", () => goToRoute(el.dataset.route));
  });

  /* ---------------- Sidebar ----------------
     Sidebar penuh (desktop), icon-rail (tablet), dan bottom-nav (mobile)
     kini semua SELALU tampil sesuai ukuran layar via CSS — bukan drawer
     yang dibuka-tutup lagi, jadi tidak perlu logika toggle. Fungsi ini
     dibiarkan ada (no-op) karena masih dipanggil dari goToRoute(). */
  function closeSidebar() {}

  /* ---------------- Greeting + date ---------------- */
  function renderGreeting() {
    const hour = new Date().getHours();
    let g = "Selamat malam";
    if (hour < 11) g = "Selamat pagi";
    else if (hour < 15) g = "Selamat siang";
    else if (hour < 19) g = "Selamat sore";
    const name = currentUser ? currentUser.displayName : "";
    document.getElementById("greeting-eyebrow").textContent = name ? `${g}, ${name}` : `${g}, semoga harimu lancar`;
    document.getElementById("today-date").textContent = new Date().toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function renderUserBadge() {
    if (!currentUser) return;
    const initial = currentUser.displayName.slice(0, 1);
    document.getElementById("user-name").textContent = currentUser.displayName;
    document.getElementById("user-avatar").textContent = initial;
    document.getElementById("user-avatar-rail").textContent = initial;
    document.getElementById("user-avatar-mobile").textContent = initial;
  }

  /* ---------------- Dashboard: saldo & ringkasan (selalu total keseluruhan) ---------------- */
  function renderHeroStats() {
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    document.getElementById("stat-balance").textContent = formatRupiah(balance);
    document.getElementById("stat-income").textContent = formatRupiah(totalIncome);
    document.getElementById("stat-expense").textContent = formatRupiah(totalExpense);

    const wallet = computeWalletBalances();
    document.getElementById("wallet-cash").textContent = formatRupiah(wallet.cash);
    document.getElementById("wallet-rekening").textContent = formatRupiah(wallet.rekening);
  }

  // Saldo per dompet: pemasukan/pengeluaran dipisah menurut sumber dananya
  // (cash/rekening), lalu tarik tunai memindahkan saldo dari Rekening ke
  // Cash. Cash + Rekening selalu sama dengan (total pemasukan - total
  // pengeluaran), karena tarik tunai saling meniadakan di jumlah total.
  function computeWalletBalances() {
    let cash = 0;
    let rekening = 0;
    transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") {
        if (t.source === "cash") cash += amt; else rekening += amt;
      } else if (t.type === "expense") {
        if (t.source === "cash") cash -= amt; else rekening -= amt;
      } else if (t.type === "tarik_tunai") {
        cash += amt;
        rekening -= amt;
      }
    });
    return { cash, rekening };
  }

  /* ---------------- Dashboard: panel yang mengikuti periode terpilih ---------------- */
  function renderPeriodPanels() {
    const range = getPeriodRange();
    const label = formatPeriodLabel(range);
    const periodTx = filterByPeriod(transactions, range);

    document.getElementById("period-label-cashflow").textContent = label;
    document.getElementById("period-label-category").textContent = `Diurutkan dari terbesar — ${label}`;
    document.getElementById("period-label-tx").textContent = `Transaksi — ${label}`;
    document.getElementById("recent-empty-text").textContent = `Belum ada transaksi pada ${label}.`;

    const totalIncomeAllTime = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const periodExpense = periodTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

    const ringEl = document.getElementById("ring-progress");
    const captionEl = document.getElementById("ring-caption");
    const circumference = 452.4;
    let pct = 0;
    let caption = "Terpakai";

    // Sengaja pakai TOTAL pemasukan keseluruhan (all-time) sebagai pembanding,
    // bukan cuma pemasukan yang tercatat di periode yang sedang dilihat —
    // supaya ring tetap bermakna walau periode tersebut tidak ada transaksi
    // pemasukan baru (misal minggu ini cuma ada pengeluaran).
    if (totalIncomeAllTime > 0) {
      pct = Math.min(periodExpense / totalIncomeAllTime, 1);
    } else if (periodExpense > 0) {
      pct = 1;
      caption = "Tanpa pemasukan";
    } else {
      pct = 0;
      caption = "Belum ada data";
    }

    ringEl.style.strokeDashoffset = circumference * (1 - pct);
    // Warna arc (brick) & track (honey) sudah diatur tetap di CSS supaya
    // konsisten dengan warna dot di legend "Pemasukan" / "Pengeluaran".
    document.getElementById("ring-percent").textContent = Math.round(pct * 100) + "%";
    captionEl.textContent = caption;

    const catTotals = {};
    periodTx
      .filter((t) => t.type === "expense")
      .forEach((t) => { catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount); });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const maxVal = sorted.length ? sorted[0][1] : 0;
    const barWrap = document.getElementById("category-bars");
    const emptyHint = document.getElementById("category-empty");
    barWrap.innerHTML = "";
    if (sorted.length === 0) {
      emptyHint.hidden = false;
    } else {
      emptyHint.hidden = true;
      sorted.forEach(([catId, val]) => {
        const cat = CATEGORY_LOOKUP[catId] || { label: catId, icon: "•" };
        const row = document.createElement("div");
        row.className = "bar-row";
        row.innerHTML = `
          <div class="bar-row-top"><span>${cat.icon} ${escapeHtml(cat.label)}</span><span>${formatRupiah(val)}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${maxVal ? (val / maxVal) * 100 : 0}%"></div></div>
        `;
        barWrap.appendChild(row);
      });
    }

    const recentList = document.getElementById("recent-tx-list");
    const recentEmpty = document.getElementById("recent-empty");
    const sortedTx = [...periodTx].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 8);
    recentList.innerHTML = "";
    if (sortedTx.length === 0) {
      recentEmpty.hidden = false;
    } else {
      recentEmpty.hidden = true;
      sortedTx.forEach((t) => recentList.appendChild(renderTxListItem(t)));
    }

    equalizeGridCards();
  }

  // Menyamakan tinggi 2 kartu di grid-2 (Arus Kas & Pengeluaran per Kategori)
  // lewat JS, supaya selalu pas berapapun isinya — tidak bergantung pada
  // perilaku "stretch" CSS Grid yang di beberapa kondisi ternyata tidak
  // konsisten menyamakan tinggi otomatis.
  function equalizeGridCards() {
    const cards = document.querySelectorAll(".grid-2 > .panel");
    if (cards.length < 2) return;
    cards.forEach((c) => { c.style.height = "auto"; });
    requestAnimationFrame(() => {
      if (window.innerWidth <= 860) {
        cards.forEach((c) => { c.style.height = ""; });
        return;
      }
      let max = 0;
      cards.forEach((c) => { max = Math.max(max, c.offsetHeight); });
      cards.forEach((c) => { c.style.height = max + "px"; });
    });
  }

  window.addEventListener("resize", () => {
    clearTimeout(equalizeGridCards._t);
    equalizeGridCards._t = setTimeout(equalizeGridCards, 150);
  });

  /* ---------------- Laporan ---------------- */
  function renderLaporan() {
    const range = getPeriodRange();
    const label = formatPeriodLabel(range);
    const periodTx = filterByPeriod(transactions, range);

    document.getElementById("rep-period-label").textContent = `Menampilkan periode: ${label}`;

    const periodIncome = periodTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const periodExpense = periodTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const net = periodIncome - periodExpense;

    document.getElementById("rep-income").textContent = formatRupiah(periodIncome);
    document.getElementById("rep-expense").textContent = formatRupiah(periodExpense);
    const netEl = document.getElementById("rep-net");
    const netLabelEl = document.getElementById("rep-net-label");
    const netCard = document.getElementById("rep-net-card");
    netEl.textContent = formatRupiah(Math.abs(net));
    netLabelEl.textContent = net >= 0 ? "Surplus" : "Defisit";
    netCard.classList.toggle("is-surplus", net >= 0);
    netCard.classList.toggle("is-defisit", net < 0);

    renderHealthCard(periodIncome, periodExpense);
    renderReportCategories(periodTx);
    renderTrendChart();
  }

  function renderHealthCard(periodIncome, periodExpense) {
    const badge = document.getElementById("health-badge");
    const desc = document.getElementById("health-desc");
    badge.className = "health-badge";

    if (periodIncome <= 0) {
      badge.textContent = periodExpense > 0 ? "Belum Ada Pemasukan" : "Belum Ada Data";
      badge.classList.add("health-neutral");
      desc.textContent = periodExpense > 0
        ? "Belum ada pemasukan tercatat pada periode ini, jadi rasio kesehatan belum bisa dihitung."
        : "Belum ada transaksi pada periode ini.";
      return;
    }

    const savingsRate = (periodIncome - periodExpense) / periodIncome;
    let status, cls, text;
    if (savingsRate >= 0.2) {
      status = "Sehat";
      cls = "health-good";
      text = `Kamu menyisihkan sekitar ${Math.round(savingsRate * 100)}% dari pemasukan pada periode ini.`;
    } else if (savingsRate >= 0) {
      status = "Cukup Sehat";
      cls = "health-warn";
      text = `Kamu menyisihkan sekitar ${Math.round(savingsRate * 100)}% dari pemasukan — masih aman, tapi ruang tabungannya tipis.`;
    } else {
      status = "Perlu Perhatian";
      cls = "health-bad";
      text = `Pengeluaran melebihi pemasukan sekitar ${Math.round(Math.abs(savingsRate) * 100)}% pada periode ini.`;
    }
    badge.textContent = status;
    badge.classList.add(cls);
    desc.textContent = text;
  }

  function renderReportCategories(periodTx) {
    const catTotals = {};
    let totalExpense = 0;
    periodTx
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
        totalExpense += Number(t.amount);
      });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const container = document.getElementById("report-cat-bars");
    const emptyEl = document.getElementById("report-cat-empty");
    const calloutEl = document.getElementById("report-cat-callout");
    container.innerHTML = "";

    if (sorted.length === 0) {
      emptyEl.hidden = false;
      calloutEl.hidden = true;
      return;
    }
    emptyEl.hidden = true;

    const [topId, topVal] = sorted[0];
    const topCat = CATEGORY_LOOKUP[topId] || { label: topId, icon: "•" };
    const topPct = totalExpense ? Math.round((topVal / totalExpense) * 100) : 0;
    calloutEl.hidden = false;
    calloutEl.textContent = `${topCat.icon} ${topCat.label} adalah kategori terbesar, menyumbang ${topPct}% dari total pengeluaran periode ini.`;

    const maxVal = sorted[0][1];
    sorted.forEach(([catId, val]) => {
      const cat = CATEGORY_LOOKUP[catId] || { label: catId, icon: "•" };
      const pct = totalExpense ? Math.round((val / totalExpense) * 100) : 0;
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <div class="bar-row-top"><span>${cat.icon} ${escapeHtml(cat.label)}</span><span>${formatRupiah(val)} · ${pct}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${maxVal ? (val / maxVal) * 100 : 0}%"></div></div>
      `;
      container.appendChild(row);
    });
  }

  // Tren di dalam rentang tanggal yang sedang dipilih, dipecah jadi
  // beberapa "kolom" — granularitasnya menyesuaikan PANJANG rentang secara
  // otomatis (bukan lagi jenis periode tetap seperti dulu), supaya tetap
  // terbaca baik untuk rentang pendek (per hari) maupun panjang (per bulan
  // atau per tahun):
  //  - <= 14 hari   -> per hari
  //  - <= 90 hari   -> per minggu (blok 7 hari sejak tanggal mulai)
  //  - <= ~2 tahun  -> per bulan kalender yang beririsan dengan rentang
  //  - lebih dari itu -> per tahun
  // Jumlah kolom dibatasi maksimal 24 (ambil yang paling akhir) supaya
  // grafik tidak terlalu padat/sempit di layar kecil.
  function getTrendIntervals() {
    const start = parseISODate(rangeStart);
    const end = parseISODate(rangeEnd);
    const days = Math.round((end - start) / 86400000) + 1;
    let intervals = [];
    let granularity = "day";

    if (days <= 14) {
      granularity = "day";
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const iso = toISODate(d);
        intervals.push({ label: String(d.getDate()), start: iso, end: iso });
      }
    } else if (days <= 90) {
      granularity = "week";
      const cursor = new Date(start);
      while (cursor <= end) {
        const chunkStart = new Date(cursor);
        const chunkEnd = new Date(cursor);
        chunkEnd.setDate(chunkEnd.getDate() + 6);
        const actualEnd = chunkEnd > end ? end : chunkEnd;
        intervals.push({
          label: `${chunkStart.getDate()}/${chunkStart.getMonth() + 1}`,
          start: toISODate(chunkStart),
          end: toISODate(actualEnd),
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    } else if (days <= 731) {
      granularity = "month";
      let y = start.getFullYear();
      let m = start.getMonth();
      while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
        const monthStart = new Date(y, m, 1);
        const monthEnd = new Date(y, m + 1, 0);
        const clampedStart = monthStart < start ? start : monthStart;
        const clampedEnd = monthEnd > end ? end : monthEnd;
        intervals.push({
          label: `${MONTH_NAMES_ID[m]} ${y}`,
          start: toISODate(clampedStart),
          end: toISODate(clampedEnd),
        });
        m++;
        if (m > 11) { m = 0; y++; }
      }
    } else {
      granularity = "year";
      for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
        const yearStart = new Date(y, 0, 1);
        const yearEnd = new Date(y, 11, 31);
        const clampedStart = yearStart < start ? start : yearStart;
        const clampedEnd = yearEnd > end ? end : yearEnd;
        intervals.push({ label: String(y), start: toISODate(clampedStart), end: toISODate(clampedEnd) });
      }
    }

    if (intervals.length > 24) intervals = intervals.slice(-24);

    const withTotals = intervals.map((iv) => {
      const txs = transactions.filter((t) => t.date >= iv.start && t.date <= iv.end);
      const inc = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const exp = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { ...iv, income: inc, expense: exp, net: inc - exp };
    });
    withTotals.granularity = granularity;
    return withTotals;
  }

  function renderTrendChart() {
    const intervals = getTrendIntervals();
    const subLabel = {
      day: "Surplus/defisit per hari pada rentang terpilih",
      week: "Surplus/defisit per minggu pada rentang terpilih",
      month: "Surplus/defisit per bulan pada rentang terpilih",
      year: "Surplus/defisit per tahun pada rentang terpilih",
    };
    document.getElementById("trend-sub").textContent = subLabel[intervals.granularity] || "Surplus/defisit beberapa periode terakhir";

    const maxAbs = Math.max(1, ...intervals.map((iv) => Math.abs(iv.net)));
    const container = document.getElementById("trend-chart");
    container.innerHTML = "";
    intervals.forEach((iv) => {
      const isPositive = iv.net >= 0;
      const heightPct = Math.min(100, (Math.abs(iv.net) / maxAbs) * 100);
      const col = document.createElement("div");
      col.className = "trend-col";
      col.title = `${iv.label}: ${isPositive ? "Surplus" : "Defisit"} ${formatRupiah(Math.abs(iv.net))}`;
      col.innerHTML = `
        <div class="trend-bar-track">
          <div class="trend-zero-line"></div>
          <div class="trend-bar ${isPositive ? "positive" : "negative"}" style="height:${heightPct / 2}%"></div>
        </div>
        <div class="trend-label">${escapeHtml(iv.label)}</div>
      `;
      container.appendChild(col);
    });
  }

  function renderTxListItem(t) {
    const cat =
      t.type === "tarik_tunai"
        ? { label: "Tarik Tunai", icon: "🏧" }
        : CATEGORY_LOOKUP[t.category] || { label: t.category, icon: "•" };
    const sign = t.type === "income" ? "+" : t.type === "expense" ? "−" : "⇄";
    const isTransfer = t.type === "tarik_tunai";
    const sourceBadge =
      !isTransfer
        ? `<span class="tx-source-badge tx-source-badge--${t.source === "cash" ? "cash" : "rekening"}">${
            t.source === "cash" ? "💵 Cash" : "🏦 Rekening"
          }</span>`
        : "";
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="tx-left">
        <div class="tx-icon ${t.type}">${cat.icon}</div>
        <div class="tx-meta">
          <div class="tx-cat">${escapeHtml(cat.label)}</div>
          <div class="tx-note">${escapeHtml(t.note || "Tanpa catatan")}</div>
          ${sourceBadge}
        </div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${t.type}">${sign} ${formatRupiah(t.amount)}</div>
        <div class="tx-date">${formatDateShort(t.date)}</div>
      </div>
    `;
    return li;
  }

  function renderDashboard() {
    renderHeroStats();
    renderPeriodPanels();
    renderLaporan();
  }

  /* ---------------- Tambah Transaksi form ---------------- */
  const typeButtons = document.querySelectorAll("#tx-type-switch .type-btn");
  const sourceSelect = document.getElementById("tx-source");
  const fieldSourceLabel = document.getElementById("field-source-label");
  const categorySelect = document.getElementById("tx-category");
  const txForm = document.getElementById("tx-form");
  const amountInput = document.getElementById("tx-amount");
  const submitLabel = document.getElementById("tx-submit-label");
  const submitBtn = document.getElementById("tx-submit");
  const fieldSource = document.getElementById("field-source");
  const fieldCategory = document.getElementById("field-category");
  const fieldRowCategory = document.getElementById("field-row-category");
  const tarikTunaiHint = document.getElementById("tarik-tunai-hint");
  const previewIcon = document.getElementById("preview-icon");
  const previewTitle = document.getElementById("preview-title");
  const previewDateEl = document.getElementById("preview-date");
  const previewTypeEl = document.getElementById("preview-type");
  const previewSourceRow = document.getElementById("preview-source-row");
  const previewSourceLabelEl = document.getElementById("preview-source-label");
  const previewSourceValue = document.getElementById("preview-source");
  const previewAmountEl = document.getElementById("preview-amount");
  const dateInput = document.getElementById("tx-date");

  function renderPreview() {
    const isTransfer = currentType === "tarik_tunai";
    previewTypeEl.textContent =
      currentType === "income" ? "Pemasukan" : currentType === "expense" ? "Pengeluaran" : "Tarik Tunai";

    if (isTransfer) {
      previewIcon.textContent = "🏧";
      previewIcon.style.background = "var(--honey-light)";
      previewTitle.textContent = "Tarik Tunai";
      previewSourceRow.hidden = true;
    } else {
      const cat = CATEGORY_LOOKUP[categorySelect.value] || { label: "Pilih kategori", icon: "💼" };
      previewIcon.textContent = cat.icon || "💼";
      previewIcon.style.background = currentType === "income" ? "var(--fern-light)" : "var(--brick-light)";
      previewTitle.textContent = cat.label;
      previewSourceRow.hidden = false;
      previewSourceLabelEl.textContent = fieldSourceLabel.textContent;
      previewSourceValue.textContent = currentSource === "cash" ? "Cash" : "Rekening";
    }

    const rawAmount = Number(amountInput.value.replace(/\D/g, "")) || 0;
    previewAmountEl.textContent = formatRupiah(rawAmount);

    const d = parseISODate(dateInput.value);
    previewDateEl.textContent = isNaN(d)
      ? "—"
      : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }

  function populateCategories(type) {
    categorySelect.innerHTML = "";
    (CATEGORIES[type] || []).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.icon}  ${c.label}`;
      categorySelect.appendChild(opt);
    });
  }

  function setFormSource(source) {
    currentSource = source;
    sourceSelect.value = source;
    renderPreview();
  }

  function setFormType(type) {
    currentType = type;
    typeButtons.forEach((b) => {
      const active = b.dataset.type === type;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });

    const isTransfer = type === "tarik_tunai";
    // Tarik tunai tidak perlu Kategori atau Sumber Dana (selalu Rekening -> Cash).
    fieldSource.hidden = isTransfer;
    fieldCategory.hidden = isTransfer;
    fieldRowCategory.classList.toggle("field-row--single", isTransfer);
    categorySelect.required = !isTransfer;
    tarikTunaiHint.hidden = !isTransfer;

    // Untuk Pemasukan, pertanyaannya "uangnya disimpan ke mana", bukan
    // "dari mana" — jadi labelnya diganti supaya lebih pas secara makna.
    fieldSourceLabel.textContent = type === "income" ? "Simpan Ke" : "Sumber Dana";

    if (!isTransfer) populateCategories(type);

    submitLabel.textContent =
      type === "income" ? "Simpan Pemasukan" : type === "expense" ? "Simpan Pengeluaran" : "Simpan Tarik Tunai";

    renderPreview();
  }

  typeButtons.forEach((btn) => btn.addEventListener("click", () => setFormType(btn.dataset.type)));
  sourceSelect.addEventListener("change", () => setFormSource(sourceSelect.value));
  categorySelect.addEventListener("change", renderPreview);
  dateInput.addEventListener("change", renderPreview);

  amountInput.addEventListener("input", () => {
    const digits = amountInput.value.replace(/\D/g, "");
    amountInput.value = digits ? Number(digits).toLocaleString("id-ID") : "";
    document.getElementById("err-amount").hidden = true;
    renderPreview();
  });

  txForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isConfigured) {
      showToast("Aplikasi belum terhubung ke Google Spreadsheet.");
      return;
    }
    const rawAmount = Number(amountInput.value.replace(/\D/g, ""));
    const errAmount = document.getElementById("err-amount");
    if (!rawAmount || rawAmount <= 0) {
      errAmount.hidden = false;
      amountInput.focus();
      return;
    }
    errAmount.hidden = true;

    const isTransfer = currentType === "tarik_tunai";
    let confirmMsg;
    if (isTransfer) {
      confirmMsg = `Catat tarik tunai sebesar ${formatRupiah(rawAmount)}? Saldo akan dipindahkan dari Rekening ke Dompet Cash.`;
    } else {
      const catObj = CATEGORY_LOOKUP[categorySelect.value] || { label: categorySelect.value, icon: "" };
      const jenisLabel = currentType === "income" ? "pemasukan" : "pengeluaran";
      const sumberLabel = currentSource === "rekening" ? "Rekening" : "Cash";
      confirmMsg = `Simpan ${jenisLabel} ${catObj.icon} ${catObj.label} sebesar ${formatRupiah(rawAmount)} dari ${sumberLabel}?`;
    }
    const ok = await askConfirm("Simpan Transaksi", confirmMsg, "Ya, Simpan");
    if (!ok) return;

    const newTx = {
      id: uid(),
      type: currentType,
      category: isTransfer ? "" : categorySelect.value,
      amount: rawAmount,
      note: document.getElementById("tx-note").value.trim(),
      date: document.getElementById("tx-date").value || todayISO(),
    };
    if (!isTransfer) newTx.source = currentSource;

    submitBtn.disabled = true;
    const originalLabel = submitLabel.textContent;
    submitLabel.textContent = "Menyimpan…";

    try {
      await addTransactionRemote(newTx);
      transactions.push(newTx);

      const successEl = document.getElementById("form-success");
      successEl.hidden = false;
      setTimeout(() => (successEl.hidden = true), 2200);
      showToast(
        currentType === "income"
          ? "Pemasukan berhasil dicatat ✓"
          : currentType === "expense"
          ? "Pengeluaran berhasil dicatat ✓"
          : "Tarik tunai berhasil dicatat ✓"
      );

      txForm.reset();
      document.getElementById("tx-date").value = todayISO();
      setFormType(currentType);
      setFormSource("rekening");

      renderDashboard();
      renderHistory();
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan. Cek koneksi internetmu, lalu coba lagi.");
    } finally {
      submitBtn.disabled = false;
      submitLabel.textContent = originalLabel;
    }
  });

  /* ---------------- Kelola Kategori ---------------- */
  let categoryManageType = "income";
  let catSearchTerm = "";
  const catSearchInput = document.getElementById("search-cat");
  catSearchInput.addEventListener("input", () => {
    catSearchTerm = catSearchInput.value.trim().toLowerCase();
    catPage = 1;
    renderCategoryManageList();
  });
  const catTypeButtons = document.querySelectorAll("[data-cattype]");
  const categoryForm = document.getElementById("category-form");
  const catIconInput = document.getElementById("cat-icon");
  const catIconBtn = document.getElementById("cat-icon-btn");
  const catIconPreview = document.getElementById("cat-icon-preview");
  const catLabelInput = document.getElementById("cat-label");
  const catSubmitBtn = document.getElementById("cat-submit");
  const catSubmitLabel = document.getElementById("cat-submit-label");
  const catManageList = document.getElementById("cat-manage-list");
  const catManageEmpty = document.getElementById("cat-manage-empty");
  const catListSub = document.getElementById("cat-list-sub");
  const categoryModal = document.getElementById("category-modal");
  const catAddOpenBtn = document.getElementById("cat-add-open-btn");
  const categoryModalClose = document.getElementById("category-modal-close");
  const catFormTypeButtons = document.querySelectorAll("[data-formtype]");
  let categoryFormType = "income"; // jenis yang dipilih di form Tambah Kategori (independen dari tab list)

  function setCategoryFormType(type) {
    categoryFormType = type;
    catFormTypeButtons.forEach((b) => {
      const active = b.dataset.formtype === type;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });
  }
  catFormTypeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setCategoryFormType(btn.dataset.formtype));
  });

  catTypeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryManageType = btn.dataset.cattype;
      catTypeButtons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", String(active));
      });
      catPage = 1;
      renderCategoryManageList();
    });
  });

  document.getElementById("cat-prev-page").addEventListener("click", () => {
    catPage--;
    renderCategoryManageList();
  });
  document.getElementById("cat-next-page").addEventListener("click", () => {
    catPage++;
    renderCategoryManageList();
  });

  /* ---- Modal Tambah Kategori ---- */
  function openCategoryModal() {
    categoryForm.reset();
    catIconInput.value = "🏷️";
    catIconPreview.textContent = "🏷️";
    // Defaultnya ikut tab yang lagi aktif di daftar, tapi tetap bisa diganti
    // di dalam form — supaya jelas kategori baru ini masuk Pemasukan atau
    // Pengeluaran, tidak "diam-diam" ikut tab yang sedang dilihat.
    setCategoryFormType(categoryManageType);
    categoryModal.hidden = false;
    catLabelInput.focus();
  }
  function closeCategoryModal() {
    categoryModal.hidden = true;
  }
  catAddOpenBtn.addEventListener("click", openCategoryModal);
  categoryModalClose.addEventListener("click", closeCategoryModal);
  categoryModal.addEventListener("click", (e) => {
    if (e.target === categoryModal) closeCategoryModal();
  });

  /* ---- Emoji picker (dipakai oleh tombol Emoji di form Tambah Kategori) ---- */
  const emojiPickerModal = document.getElementById("emoji-picker-modal");
  const emojiPickerClose = document.getElementById("emoji-picker-close");
  const emojiSearchInput = document.getElementById("emoji-search");
  const emojiCatTabs = document.getElementById("emoji-cat-tabs");
  const emojiGrid = document.getElementById("emoji-grid");
  const emojiEmpty = document.getElementById("emoji-empty");
  let activeEmojiGroup = 0;

  function renderEmojiTabs() {
    emojiCatTabs.innerHTML = "";
    EMOJI_GROUPS.forEach((group, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (idx === activeEmojiGroup ? " is-active" : "");
      btn.textContent = group.name;
      btn.addEventListener("click", () => {
        activeEmojiGroup = idx;
        emojiSearchInput.value = "";
        renderEmojiTabs();
        renderEmojiGrid();
      });
      emojiCatTabs.appendChild(btn);
    });
  }

  function renderEmojiGrid() {
    const term = emojiSearchInput.value.trim().toLowerCase();
    emojiCatTabs.hidden = !!term;
    let items;
    if (term) {
      const seen = new Set();
      items = [];
      EMOJI_GROUPS.forEach((group) => {
        group.items.forEach(([emoji, keywords]) => {
          if (!seen.has(emoji) && keywords.includes(term)) {
            seen.add(emoji);
            items.push(emoji);
          }
        });
      });
    } else {
      items = EMOJI_GROUPS[activeEmojiGroup].items.map(([emoji]) => emoji);
    }

    emojiGrid.innerHTML = "";
    emojiEmpty.hidden = items.length !== 0;
    items.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = emoji;
      btn.title = emoji;
      btn.addEventListener("click", () => {
        catIconInput.value = emoji;
        catIconPreview.textContent = emoji;
        closeEmojiPicker();
      });
      emojiGrid.appendChild(btn);
    });
  }

  function openEmojiPicker() {
    emojiSearchInput.value = "";
    emojiCatTabs.hidden = false;
    renderEmojiTabs();
    renderEmojiGrid();
    emojiPickerModal.hidden = false;
    emojiSearchInput.focus();
  }
  function closeEmojiPicker() {
    emojiPickerModal.hidden = true;
  }
  catIconBtn.addEventListener("click", openEmojiPicker);
  emojiPickerClose.addEventListener("click", closeEmojiPicker);
  emojiPickerModal.addEventListener("click", (e) => {
    if (e.target === emojiPickerModal) closeEmojiPicker();
  });
  emojiSearchInput.addEventListener("input", renderEmojiGrid);

  categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const label = catLabelInput.value.trim();
    const icon = catIconInput.value.trim() || "🏷️";
    if (!label) { showToast("Nama kategori wajib diisi."); return; }

    const typeLabel = categoryFormType === "income" ? "Pemasukan" : "Pengeluaran";
    const ok = await askConfirm("Tambah Kategori", `Tambahkan kategori "${icon} ${label}" ke ${typeLabel}?`, "Ya, Tambah");
    if (!ok) return;

    catSubmitBtn.disabled = true;
    const original = catSubmitLabel.textContent;
    catSubmitLabel.textContent = "Menyimpan…";
    try {
      const newCat = await addCategoryRemote(categoryFormType, label, icon);
      CATEGORIES[categoryFormType].push(newCat);
      rebuildCategoryLookup();
      // Pindahkan tab daftar ke jenis yang baru saja ditambahkan supaya
      // kategori barunya langsung kelihatan, tanpa perlu klik tab manual.
      if (categoryFormType !== categoryManageType) {
        categoryManageType = categoryFormType;
        catTypeButtons.forEach((b) => {
          const active = b.dataset.cattype === categoryManageType;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-selected", String(active));
        });
        catPage = 1;
      }
      renderCategoryManageList();
      populateCategories(currentType);
      closeCategoryModal();
      showToast("Kategori ditambahkan ✓");
    } catch (err) {
      console.error(err);
      showToast("Gagal menambah kategori.");
    } finally {
      catSubmitBtn.disabled = false;
      catSubmitLabel.textContent = original;
    }
  });

  /* ---- Daftar kategori: mode lihat & mode edit per baris ---- */
  let catPage = 1;

  function renderCategoryManageList() {
    let list = CATEGORIES[categoryManageType] || [];
    if (catSearchTerm) {
      list = list.filter((cat) => cat.label.toLowerCase().includes(catSearchTerm));
    }
    catListSub.textContent = categoryManageType === "income" ? "Kategori Pemasukan" : "Kategori Pengeluaran";
    const paginationEl = document.getElementById("cat-pagination");
    catManageList.innerHTML = "";
    if (list.length === 0) {
      catManageList.hidden = true;
      catManageEmpty.hidden = false;
      catManageEmpty.textContent = catSearchTerm ? "Tidak ada kategori yang cocok dengan pencarianmu." : "Belum ada kategori.";
      paginationEl.hidden = true;
      return;
    }
    catManageList.hidden = false;
    catManageEmpty.hidden = true;

    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    catPage = Math.min(Math.max(1, catPage), totalPages);
    const pageList = list.slice((catPage - 1) * PAGE_SIZE, catPage * PAGE_SIZE);

    paginationEl.hidden = totalPages <= 1;
    document.getElementById("cat-page-info").textContent = `Halaman ${catPage} dari ${totalPages}`;
    document.getElementById("cat-prev-page").disabled = catPage <= 1;
    document.getElementById("cat-next-page").disabled = catPage >= totalPages;

    pageList.forEach((cat) => catManageList.appendChild(buildCategoryRow(cat)));
  }

  function buildCategoryRow(cat) {
    const type = categoryManageType;
    const li = document.createElement("li");
    li.className = "cat-row";
    li.innerHTML = `
      <div class="tx-left">
        <div class="tx-icon ${type} cat-view-icon">${escapeHtml(cat.icon)}</div>
        <div class="tx-meta">
          <div class="cat-view-label">${escapeHtml(cat.label)}</div>
        </div>
        <span class="cat-edit-fields" hidden>
          <input type="text" class="cat-manage-input cat-edit-icon" maxlength="4" aria-label="Ikon kategori" />
          <input type="text" class="cat-manage-input cat-edit-label" aria-label="Nama kategori" />
        </span>
      </div>
      <div class="tx-actions">
        <span class="cat-actions" data-mode="view">
          <button type="button" class="icon-btn-sm cat-edit-btn" title="Edit kategori">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="icon-btn-sm cat-delete-btn" title="Hapus kategori">
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </span>
        <span class="cat-actions" data-mode="edit" hidden>
          <button type="button" class="icon-btn-sm cat-save-btn" title="Simpan">
            <svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="icon-btn-sm cat-cancel-btn" title="Batal">
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </span>
      </div>
    `;

    const viewIcon = li.querySelector(".cat-view-icon");
    const viewLabel = li.querySelector(".cat-view-label");
    const editFields = li.querySelector(".cat-edit-fields");
    const editIconInput = li.querySelector(".cat-edit-icon");
    const editLabelInput = li.querySelector(".cat-edit-label");
    const viewActions = li.querySelector('.cat-actions[data-mode="view"]');
    const editActions = li.querySelector('.cat-actions[data-mode="edit"]');

    function enterEditMode() {
      editIconInput.value = cat.icon;
      editLabelInput.value = cat.label;
      viewIcon.hidden = true;
      viewLabel.hidden = true;
      editFields.hidden = false;
      viewActions.hidden = true;
      editActions.hidden = false;
      editLabelInput.focus();
    }

    function exitEditMode() {
      viewIcon.hidden = false;
      viewLabel.hidden = false;
      editFields.hidden = true;
      viewActions.hidden = false;
      editActions.hidden = true;
    }

    li.querySelector(".cat-edit-btn").addEventListener("click", enterEditMode);
    li.querySelector(".cat-cancel-btn").addEventListener("click", exitEditMode);

    li.querySelector(".cat-save-btn").addEventListener("click", async () => {
      const newLabel = editLabelInput.value.trim();
      const newIcon = editIconInput.value.trim() || "🏷";
      if (!newLabel) { showToast("Nama kategori tidak boleh kosong."); return; }
      const ok = await askConfirm("Simpan Perubahan", `Simpan perubahan kategori jadi "${newIcon} ${newLabel}"?`, "Ya, Simpan");
      if (!ok) return;
      try {
        await updateCategoryRemote(type, cat.id, newLabel, newIcon);
        cat.label = newLabel;
        cat.icon = newIcon;
        rebuildCategoryLookup();
        viewIcon.textContent = newIcon;
        viewLabel.textContent = newLabel;
        exitEditMode();
        populateCategories(currentType);
        renderHistory();
        renderDashboard();
        showToast("Kategori diperbarui ✓");
      } catch (err) {
        console.error(err);
        showToast("Gagal memperbarui kategori.");
      }
    });

    li.querySelector(".cat-delete-btn").addEventListener("click", async () => {
      const ok = await askConfirm(
        "Hapus Kategori",
        `Yakin ingin menghapus kategori "${cat.icon} ${cat.label}"? Transaksi lama yang memakai kategori ini tetap tersimpan.`,
        "Ya, Hapus",
        true
      );
      if (!ok) return;
      try {
        await deleteCategoryRemote(type, cat.id);
        CATEGORIES[type] = CATEGORIES[type].filter((c) => c.id !== cat.id);
        rebuildCategoryLookup();
        li.remove();
        if (CATEGORIES[type].length === 0) renderCategoryManageList();
        populateCategories(currentType);
        renderHistory();
        renderDashboard();
        showToast("Kategori dihapus");
      } catch (err) {
        console.error(err);
        showToast("Gagal menghapus kategori.");
      }
    });

    return li;
  }

  /* ---------------- Riwayat (kalender) ---------------- */
  const searchInput = document.getElementById("search-tx");
  const filterChips = document.querySelectorAll("#filter-type .chip");
  const riwayatCalendarEl = document.getElementById("riwayat-calendar");
  const riwayatCalLabel = document.getElementById("riwayat-cal-label");
  let riwayatCalYear = new Date().getFullYear();
  let riwayatCalMonth = new Date().getMonth();
  const PAGE_SIZE = 10; // dipakai juga oleh pagination Kelola Kategori

  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    renderHistory();
  });

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      currentFilter = chip.dataset.filter;
      renderHistory();
    });
  });

  document.getElementById("riwayat-cal-prev").addEventListener("click", () => {
    riwayatCalMonth--;
    if (riwayatCalMonth < 0) { riwayatCalMonth = 11; riwayatCalYear--; }
    renderHistory();
  });
  document.getElementById("riwayat-cal-next").addEventListener("click", () => {
    riwayatCalMonth++;
    if (riwayatCalMonth > 11) { riwayatCalMonth = 0; riwayatCalYear++; }
    renderHistory();
  });

  // Kembalikan daftar transaksi pada satu tanggal ISO tertentu, sudah
  // memperhitungkan filter jenis & pencarian yang aktif di Riwayat.
  function getTxForDate(iso) {
    return transactions.filter((t) => {
      if (t.date !== iso) return false;
      if (currentFilter !== "all" && t.type !== currentFilter) return false;
      if (searchTerm) {
        const cat =
          t.type === "tarik_tunai" ? { label: "Tarik Tunai" } : CATEGORY_LOOKUP[t.category] || { label: t.category };
        const hit = cat.label.toLowerCase().includes(searchTerm) || (t.note || "").toLowerCase().includes(searchTerm);
        if (!hit) return false;
      }
      return true;
    });
  }

  function renderHistory() {
    const emptyState = document.getElementById("riwayat-empty");
    riwayatCalLabel.textContent = `${MONTH_NAMES_FULL_ID[riwayatCalMonth]} ${riwayatCalYear}`;
    riwayatCalendarEl.innerHTML = "";

    DAY_LABELS_ID.forEach((label) => {
      const span = document.createElement("span");
      span.className = "rcal-daylabel";
      span.textContent = label;
      riwayatCalendarEl.appendChild(span);
    });

    const weeks = getWeeksInMonth(riwayatCalYear, riwayatCalMonth);
    const today = todayISO();
    let anyMatchInMonth = false;

    weeks.forEach((w) => {
      const startDate = parseISODate(w.start);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const iso = toISODate(d);
        const isOutside = d.getMonth() !== riwayatCalMonth;
        const dayTx = isOutside ? [] : getTxForDate(iso);
        if (dayTx.length) anyMatchInMonth = true;

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "rcal-cell";
        if (isOutside) cell.classList.add("is-outside");
        if (iso === today) cell.classList.add("is-today");
        if (!isOutside && (searchTerm || currentFilter !== "all") && dayTx.length === 0) cell.classList.add("is-dimmed");

        const hasIncome = dayTx.some((t) => t.type === "income");
        const hasExpense = dayTx.some((t) => t.type === "expense");
        const hasTransfer = dayTx.some((t) => t.type === "tarik_tunai");
        cell.innerHTML = `
          <span class="rcal-daynum">${d.getDate()}</span>
          <span class="rcal-dots">
            ${hasIncome ? '<i class="dot" style="background:var(--fern)"></i>' : ""}
            ${hasExpense ? '<i class="dot" style="background:var(--brick)"></i>' : ""}
            ${hasTransfer ? '<i class="dot" style="background:var(--honey)"></i>' : ""}
          </span>
        `;
        if (!isOutside) cell.addEventListener("click", () => openDayTxModal(iso));
        riwayatCalendarEl.appendChild(cell);
      }
    });

    emptyState.hidden = !(searchTerm || currentFilter !== "all") || anyMatchInMonth;
  }

  /* ---------------- Modal Transaksi per Tanggal ---------------- */
  const dayTxModal = document.getElementById("day-tx-modal");
  const dayTxModalClose = document.getElementById("day-tx-modal-close");
  const dayTxModalTitle = document.getElementById("day-tx-modal-title");
  const dayTxSummary = document.getElementById("day-tx-summary");
  const dayTxList = document.getElementById("day-tx-list");
  const dayTxEmpty = document.getElementById("day-tx-empty");
  const dayTxAddBtn = document.getElementById("day-tx-add-btn");
  let activeDayIso = null;

  function renderDayTxModalContent() {
    const dayTx = getTxForDate(activeDayIso).sort((a, b) => a.id.localeCompare(b.id));
    const income = dayTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

    dayTxSummary.innerHTML = `
      <span>Pemasukan<span class="val" style="color:var(--fern-dk)">${formatRupiah(income)}</span></span>
      <span>Pengeluaran<span class="val" style="color:var(--brick)">${formatRupiah(expense)}</span></span>
    `;

    dayTxList.innerHTML = "";
    dayTxEmpty.hidden = dayTx.length !== 0;
    dayTxAddBtn.hidden = false;

    dayTx.forEach((t) => {
      const li = renderTxListItem(t);
      li.classList.add("tx-clickable");
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", "Lihat detail transaksi");
      const actions = document.createElement("div");
      actions.className = "tx-actions";
      actions.innerHTML = `
        <button class="row-edit" title="Edit transaksi" data-id="${t.id}">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="row-delete" title="Hapus transaksi" data-id="${t.id}" data-type="${t.type}">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      `;
      li.appendChild(actions);
      // Klik baris (di luar tombol edit/hapus) membuka detail transaksi,
      // bukan langsung ke form edit.
      li.addEventListener("click", (e) => {
        if (e.target.closest(".tx-actions")) return;
        openTxDetailModal(t);
      });
      li.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".tx-actions")) {
          e.preventDefault();
          openTxDetailModal(t);
        }
      });
      dayTxList.appendChild(li);
    });

    dayTxList.querySelectorAll(".row-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tx = transactions.find((t) => t.id === btn.dataset.id);
        if (tx) { closeDayTxModal(); openEditTxModal(tx); }
      });
    });

    dayTxList.querySelectorAll(".row-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        btn.disabled = true;
        const done = await deleteTxWithConfirm(btn.dataset.id, btn.dataset.type, {
          afterDelete: () => {
            renderDayTxModalContent();
            renderHistory();
            renderDashboard();
          },
        });
        if (!done) btn.disabled = false;
      });
    });
  }

  // Hapus transaksi dengan konfirmasi — dipakai bareng oleh tombol hapus
  // di list modal per-tanggal dan tombol hapus di modal detail transaksi.
  async function deleteTxWithConfirm(id, type, { afterDelete } = {}) {
    const tx = transactions.find((t) => t.id === id);
    const cat = tx
      ? tx.type === "tarik_tunai"
        ? { label: "Tarik Tunai" }
        : CATEGORY_LOOKUP[tx.category] || { label: tx.category }
      : { label: "" };
    const ok = await askConfirm(
      "Hapus Transaksi",
      `Yakin ingin menghapus transaksi ${cat.label}${tx ? " sebesar " + formatRupiah(tx.amount) : ""}? Tindakan ini tidak bisa dibatalkan.`,
      "Ya, Hapus",
      true
    );
    if (!ok) return false;
    try {
      await deleteTransactionRemote(id, type);
      transactions = transactions.filter((t) => t.id !== id);
      showToast("Transaksi dihapus");
      if (afterDelete) afterDelete();
      return true;
    } catch (err) {
      console.error(err);
      showToast("Gagal menghapus. Coba lagi.");
      return false;
    }
  }

  function openDayTxModal(iso) {
    activeDayIso = iso;
    dayTxModalTitle.textContent = parseISODate(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    renderDayTxModalContent();
    dayTxModal.hidden = false;
  }
  function closeDayTxModal() {
    dayTxModal.hidden = true;
    activeDayIso = null;
  }
  dayTxModalClose.addEventListener("click", closeDayTxModal);
  dayTxModal.addEventListener("click", (e) => { if (e.target === dayTxModal) closeDayTxModal(); });
  dayTxAddBtn.addEventListener("click", () => {
    const iso = activeDayIso;
    closeDayTxModal();
    goToRoute("tambah");
    const dateInput = document.getElementById("tx-date");
    if (dateInput) dateInput.value = iso;
  });

  /* ---------------- Modal Detail Transaksi ---------------- */
  const txDetailModal = document.getElementById("tx-detail-modal");
  const txDetailModalClose = document.getElementById("tx-detail-modal-close");
  const txDetailIcon = document.getElementById("tx-detail-icon");
  const txDetailTitle = document.getElementById("tx-detail-title");
  const txDetailAmount = document.getElementById("tx-detail-amount");
  const txDetailRows = document.getElementById("tx-detail-rows");
  const txDetailEditBtn = document.getElementById("tx-detail-edit-btn");
  const txDetailDeleteBtn = document.getElementById("tx-detail-delete-btn");
  let detailTx = null;

  function detailRow(label, value) {
    return `<div class="tx-detail-row"><span class="tx-detail-label">${escapeHtml(label)}</span><span class="tx-detail-value">${value}</span></div>`;
  }

  function openTxDetailModal(t) {
    detailTx = t;
    const isTransfer = t.type === "tarik_tunai";
    const cat = isTransfer ? { label: "Tarik Tunai", icon: "🏧" } : CATEGORY_LOOKUP[t.category] || { label: t.category, icon: "•" };
    const sign = t.type === "income" ? "+" : t.type === "expense" ? "−" : "⇄";
    const dateLabel = parseISODate(t.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const typeLabel = t.type === "income" ? "Pemasukan" : t.type === "expense" ? "Pengeluaran" : "Tarik Tunai";
    const sourceLabel = t.type === "income" ? "Simpan Ke" : "Sumber Dana";

    txDetailIcon.className = `tx-detail-icon ${t.type}`;
    txDetailIcon.textContent = cat.icon;
    txDetailTitle.textContent = cat.label;
    txDetailAmount.className = `tx-detail-amount ${t.type}`;
    txDetailAmount.textContent = `${sign} ${formatRupiah(t.amount)}`;

    let rows = "";
    rows += detailRow("Jenis", escapeHtml(typeLabel));
    if (!isTransfer) {
      rows += detailRow(sourceLabel, t.source === "cash" ? "💵 Cash" : "🏦 Rekening");
    }
    rows += detailRow("Tanggal", escapeHtml(dateLabel));
    rows += detailRow("Catatan", escapeHtml(t.note || "Tanpa catatan"));
    txDetailRows.innerHTML = rows;

    txDetailModal.hidden = false;
  }
  function closeTxDetailModal() {
    txDetailModal.hidden = true;
    detailTx = null;
  }
  txDetailModalClose.addEventListener("click", closeTxDetailModal);
  txDetailModal.addEventListener("click", (e) => { if (e.target === txDetailModal) closeTxDetailModal(); });

  txDetailEditBtn.addEventListener("click", () => {
    if (!detailTx) return;
    const tx = detailTx;
    closeTxDetailModal();
    closeDayTxModal();
    openEditTxModal(tx);
  });

  txDetailDeleteBtn.addEventListener("click", async () => {
    if (!detailTx) return;
    const { id, type } = detailTx;
    txDetailDeleteBtn.disabled = true;
    const done = await deleteTxWithConfirm(id, type, {
      afterDelete: () => {
        closeTxDetailModal();
        renderDayTxModalContent();
        renderHistory();
        renderDashboard();
      },
    });
    if (!done) txDetailDeleteBtn.disabled = false;
  });

  /* ---------------- Modal Edit Transaksi ---------------- */
  const editTxModal = document.getElementById("edit-tx-modal");
  const editTxModalClose = document.getElementById("edit-tx-modal-close");
  const editTxForm = document.getElementById("edit-tx-form");
  const editTxAmountInput = document.getElementById("edit-tx-amount");
  const editTxCategorySelect = document.getElementById("edit-tx-category");
  const editTxDateInput = document.getElementById("edit-tx-date");
  const editTxNoteInput = document.getElementById("edit-tx-note");
  const editTxSubmitBtn = document.getElementById("edit-tx-submit");
  const editTxSubmitLabel = document.getElementById("edit-tx-submit-label");
  const editFieldSource = document.getElementById("edit-field-source");
  const editFieldSourceLabel = document.getElementById("edit-field-source-label");
  const editFieldCategory = document.getElementById("edit-field-category");
  const editFieldRowCategory = document.getElementById("edit-field-row-category");
  const editSourceSelect = document.getElementById("edit-tx-source");
  let editingTxId = null;
  let editingTxType = null;
  let editingTxSource = "rekening";

  function setEditFormSource(source) {
    editingTxSource = source;
    editSourceSelect.value = source;
  }
  editSourceSelect.addEventListener("change", () => setEditFormSource(editSourceSelect.value));

  function openEditTxModal(tx) {
    editingTxId = tx.id;
    editingTxType = tx.type;
    const isTransfer = tx.type === "tarik_tunai";

    editTxAmountInput.value = Number(tx.amount).toLocaleString("id-ID");
    editFieldSource.hidden = isTransfer;
    editFieldCategory.hidden = isTransfer;
    editFieldRowCategory.classList.toggle("field-row--single", isTransfer);
    editTxCategorySelect.required = !isTransfer;
    editFieldSourceLabel.textContent = tx.type === "income" ? "Simpan Ke" : "Sumber Dana";

    if (!isTransfer) {
      editTxCategorySelect.innerHTML = "";
      (CATEGORIES[tx.type] || []).forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.icon}  ${c.label}`;
        editTxCategorySelect.appendChild(opt);
      });
      editTxCategorySelect.value = tx.category;
      setEditFormSource(tx.source === "cash" ? "cash" : "rekening");
    }

    editTxDateInput.value = tx.date;
    editTxNoteInput.value = tx.note || "";
    document.getElementById("edit-tx-err-amount").hidden = true;
    editTxModal.hidden = false;
  }
  function closeEditTxModal() {
    editTxModal.hidden = true;
    editingTxId = null;
    editingTxType = null;
  }
  editTxModalClose.addEventListener("click", closeEditTxModal);
  editTxModal.addEventListener("click", (e) => { if (e.target === editTxModal) closeEditTxModal(); });

  editTxAmountInput.addEventListener("input", () => {
    const digits = editTxAmountInput.value.replace(/\D/g, "");
    editTxAmountInput.value = digits ? Number(digits).toLocaleString("id-ID") : "";
    document.getElementById("edit-tx-err-amount").hidden = true;
  });

  editTxForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!editingTxId) return;
    const rawAmount = Number(editTxAmountInput.value.replace(/\D/g, ""));
    const errAmount = document.getElementById("edit-tx-err-amount");
    if (!rawAmount || rawAmount <= 0) {
      errAmount.hidden = false;
      editTxAmountInput.focus();
      return;
    }
    errAmount.hidden = true;

    const isTransfer = editingTxType === "tarik_tunai";
    const updatedTx = {
      id: editingTxId,
      type: editingTxType,
      category: isTransfer ? "" : editTxCategorySelect.value,
      amount: rawAmount,
      note: editTxNoteInput.value.trim(),
      date: editTxDateInput.value || todayISO(),
    };
    if (!isTransfer) updatedTx.source = editingTxSource;

    let confirmMsg;
    if (isTransfer) {
      confirmMsg = `Simpan perubahan tarik tunai sebesar ${formatRupiah(rawAmount)}?`;
    } else {
      const catObj = CATEGORY_LOOKUP[updatedTx.category] || { label: updatedTx.category, icon: "" };
      confirmMsg = `Simpan perubahan transaksi ${catObj.icon} ${catObj.label} sebesar ${formatRupiah(rawAmount)}?`;
    }
    const ok = await askConfirm("Simpan Perubahan", confirmMsg, "Ya, Simpan");
    if (!ok) return;

    editTxSubmitBtn.disabled = true;
    const original = editTxSubmitLabel.textContent;
    editTxSubmitLabel.textContent = "Menyimpan…";
    try {
      await updateTransactionRemote(updatedTx);
      const idx = transactions.findIndex((t) => t.id === editingTxId);
      if (idx !== -1) transactions[idx] = { ...transactions[idx], ...updatedTx };
      closeEditTxModal();
      renderHistory();
      renderDashboard();
      showToast("Perubahan tersimpan ✓");
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan perubahan. Coba lagi.");
    } finally {
      editTxSubmitBtn.disabled = false;
      editTxSubmitLabel.textContent = original;
    }
  });

  /* ---------------- Muat ulang data ---------------- */
  document.getElementById("reset-data").addEventListener("click", async () => {
    await loadAllData(true);
  });

  /* ---------------- Dropdown profil (Notifikasi & Keluar) ---------------- */
  const userBadgeBtn = document.getElementById("user-badge");
  const userDropdown = document.getElementById("user-dropdown");

  // Tiga tombol pemicu berbeda (sidebar penuh, icon-rail tablet, topbar
  // mobile) — tampil bergantian sesuai ukuran layar, tapi semuanya
  // membuka panel dropdown yang SAMA (posisinya diatur lewat CSS per
  // breakpoint), supaya tidak perlu menduplikasi isi menu tiga kali.
  const userBadgeTriggers = [userBadgeBtn, document.getElementById("user-badge-rail"), document.getElementById("user-badge-mobile")];

  function openUserDropdown() {
    userDropdown.hidden = false;
    userBadgeTriggers.forEach((btn) => btn.setAttribute("aria-expanded", "true"));
  }
  function closeUserDropdown() {
    userDropdown.hidden = true;
    userBadgeTriggers.forEach((btn) => btn.setAttribute("aria-expanded", "false"));
  }
  userBadgeTriggers.forEach((btn) => {
    btn.addEventListener("click", () => {
      userDropdown.hidden ? openUserDropdown() : closeUserDropdown();
    });
  });
  document.addEventListener("click", (e) => {
    if (userDropdown.hidden) return;
    if (e.target.closest(".user-menu-wrap") || e.target.closest(".user-badge-alt")) return;
    closeUserDropdown();
  });

  /* ---------------- PWA: Install Aplikasi ---------------- */
  let deferredInstallPrompt = null;
  const installAppBtn = document.getElementById("install-app-btn");

  // Chrome/Edge/Android menembak event ini kalau situsnya sudah "installable"
  // (manifest + service worker valid). Kalau event ini tidak pernah muncul
  // (misalnya di Safari/iOS), tombol Instal tetap tersembunyi selamanya —
  // itu wajar, karena iOS memang tidak dukung prompt ini (harus manual
  // lewat Share -> Add to Home Screen, lihat README).
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installAppBtn.hidden = false;
  });

  installAppBtn.addEventListener("click", async () => {
    closeUserDropdown();
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installAppBtn.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installAppBtn.hidden = true;
    showToast("Azmyra Finance berhasil diinstal ✓");
  });

  /* ---------------- Logout ---------------- */
  document.getElementById("logout-btn").addEventListener("click", () => {
    closeUserDropdown();
    clearStoredUser();
    currentUser = null;
    transactions = [];
    document.getElementById("app-shell").hidden = true;
    document.getElementById("login-screen").hidden = false;
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
    document.getElementById("login-username").focus();
  });

  /* ---------------- Login form ---------------- */
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");

  const passwordInput = document.getElementById("login-password");
  const passwordToggle = document.getElementById("login-password-toggle");
  passwordToggle.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    passwordToggle.setAttribute("aria-pressed", String(isHidden));
    passwordToggle.setAttribute("aria-label", isHidden ? "Sembunyikan password" : "Tampilkan password");
    // .hidden = true/false TIDAK bekerja pada elemen SVG di semua browser
    // (properti IDL "hidden" hanya direfleksikan untuk HTMLElement, bukan
    // SVGElement) — jadi pakai toggleAttribute yang bekerja universal.
    passwordToggle.querySelector(".icon-eye").toggleAttribute("hidden", isHidden);
    passwordToggle.querySelector(".icon-eye-off").toggleAttribute("hidden", !isHidden);
  });
  const loginSubmitBtn = document.getElementById("login-submit");
  const loginSubmitLabel = document.getElementById("login-submit-label");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isConfigured) {
      loginError.textContent = "Aplikasi belum terhubung ke Google Spreadsheet (isi CONFIG.API_URL di app.js).";
      loginError.hidden = false;
      return;
    }
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    loginError.hidden = true;
    loginSubmitBtn.disabled = true;
    loginSubmitLabel.textContent = "Memeriksa…";

    try {
      const result = await loginRequest(username, password);
      currentUser = result.user;
      saveStoredUser(result.user);
      enterApp({ transactions: result.transactions, categories: result.categories });
    } catch (err) {
      loginError.textContent = err.message || "Login gagal. Coba lagi.";
      loginError.hidden = false;
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitLabel.textContent = "Masuk";
    }
  });

  /* ---------------- Notifikasi Push (Firebase Cloud Messaging) ---------------- */
  const NOTIF_REGISTERED_KEY = "azmyra_finance_notif_registered_v1";
  const notifBtn = document.getElementById("notif-btn");
  const notifBtnLabel = document.getElementById("notif-btn-label");
  const isFirebaseConfigured =
    typeof FIREBASE_CONFIG !== "undefined" &&
    FIREBASE_CONFIG.apiKey &&
    !FIREBASE_CONFIG.apiKey.startsWith("TEMPEL_");
  let messagingInstance = null;
  let swRegistration = null;

  // Catatan: dulu di sini ada logika banner "ada pembaruan, klik untuk
  // update" (waiting worker + tombol Update + reload). Atas permintaan
  // eksplisit, notifikasi itu DIHAPUS SELURUHNYA — tidak ada lagi popup
  // apa pun yang muncul saat ada versi baru. Pembaruan sekarang berjalan
  // diam-diam: service worker versi baru langsung aktif begitu selesai
  // di-install (lihat self.skipWaiting() di firebase-messaging-sw.js) dan
  // otomatis mengambil alih tab yang sedang terbuka (self.clients.claim()).
  // Karena fetch handler-nya sudah "network-first" + cache:"no-store",
  // setiap kali app dibuka/di-reload, file app shell (html/css/js) yang
  // diambil selalu yang TERBARU dari server — jadi tanpa banner sekalipun,
  // user tetap dapat versi terbaru secara otomatis di kunjungan berikutnya,
  // tanpa perlu diberitahu atau menekan tombol apa pun.

  function updateNotifButtonLabel() {
    if (!isFirebaseConfigured) {
      notifBtnLabel.textContent = "Notifikasi (belum disetel)";
      return;
    }
    if (typeof Notification === "undefined") {
      notifBtnLabel.textContent = "Notifikasi tidak didukung";
      return;
    }
    if (Notification.permission === "granted" && localStorage.getItem(NOTIF_REGISTERED_KEY)) {
      notifBtnLabel.textContent = "Notifikasi Aktif ✓";
    } else if (Notification.permission === "denied") {
      notifBtnLabel.textContent = "Notifikasi Diblokir";
    } else {
      notifBtnLabel.textContent = "Aktifkan Notifikasi";
    }
  }

  // Daftarkan service worker SELALU (lepas dari status Firebase) — ini yang
  // membuat aplikasi bisa di-"Install" sebagai PWA dan tetap bisa dibuka
  // (versi terakhir) walau koneksi internet putus. Kalau Firebase sudah
  // disetel, registration yang sama ini juga dipakai untuk push notification.
  async function registerAppServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;
    // Fungsi ini dipanggil dari beberapa tempat (init, initNotifications,
    // dll). Kalau sudah pernah berhasil register, pakai registration yang
    // sama.
    if (swRegistration) return swRegistration;
    try {
      // updateViaCache:"none" — jangan pernah pakai HTTP cache browser buat
      // file service worker ini sendiri (atau importScripts di dalamnya),
      // supaya pengecekan versi baru (lewat registration.update()) selalu
      // benar-benar nanya ke server, bukan kejawab cache lama diam-diam.
      swRegistration = await navigator.serviceWorker.register("firebase-messaging-sw.js", {
        updateViaCache: "none",
      });
      return swRegistration;
    } catch (err) {
      console.error("Gagal mendaftarkan service worker:", err);
      return null;
    }
  }

  async function initNotifications() {
    updateNotifButtonLabel();
    const swReg = await registerAppServiceWorker();
    if (!isFirebaseConfigured) return;
    if (typeof Notification === "undefined" || !swReg) return;

    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      messagingInstance = firebase.messaging();

      // Kalau izin sudah pernah diberikan sebelumnya, langsung daftarkan ulang
      // token (token FCM bisa berubah dari waktu ke waktu).
      if (Notification.permission === "granted") {
        await registerFcmToken(swReg);
      }

      // Notifikasi saat aplikasi sedang dibuka (foreground) — tampil sebagai toast.
      messagingInstance.onMessage((payload) => {
        const title = (payload.notification && payload.notification.title) || "Transaksi baru";
        const body = (payload.notification && payload.notification.body) || "";
        showToast(`${title} — ${body}`);
        loadAllData(false);
      });
    } catch (err) {
      console.error("Gagal menyiapkan notifikasi:", err);
    }
  }

  async function registerFcmToken(swReg) {
    try {
      const token = await messagingInstance.getToken({
        vapidKey: FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      if (!token) return;
      await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "registerDevice", token, username: currentUser ? currentUser.username : "" }),
      });
      localStorage.setItem(NOTIF_REGISTERED_KEY, "1");
      updateNotifButtonLabel();
    } catch (err) {
      console.error("Gagal mendaftarkan device untuk notifikasi:", err);
    }
  }

  notifBtn.addEventListener("click", async () => {
    closeUserDropdown();
    if (!isFirebaseConfigured) {
      showToast("Firebase belum disetel. Lihat README bagian Notifikasi Push.");
      return;
    }
    if (typeof Notification === "undefined") {
      showToast("Browser ini tidak mendukung notifikasi push.");
      return;
    }
    if (Notification.permission === "denied") {
      showToast("Notifikasi diblokir. Aktifkan lewat pengaturan browser/HP kamu.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      showToast("Izin notifikasi tidak diberikan.");
      updateNotifButtonLabel();
      return;
    }
    const swReg = swRegistration || (await registerAppServiceWorker());
    if (!swReg) {
      showToast("Gagal menyiapkan service worker. Coba lagi.");
      return;
    }
    await registerFcmToken(swReg);
    showToast("Notifikasi diaktifkan ✓");
  });

  function enterApp(preloaded) {
    document.getElementById("login-screen").hidden = true;
    document.getElementById("app-shell").hidden = false;
    renderUserBadge();
    renderGreeting();
    setFormType("income");
    document.getElementById("tx-date").value = todayISO();
    initPeriodDefaults();

    if (preloaded) {
      // Datang dari form login: data sudah ikut di respons login itu
      // sendiri, langsung dipakai — tidak perlu request tambahan sama sekali.
      loadAllData(false, preloaded);
    } else {
      // Datang dari sesi tersimpan (buka app lagi tanpa login ulang): tampilkan
      // cache terakhir dulu (kalau ada) supaya layar tidak kosong menunggu,
      // lalu tetap ambil data terbaru dari Spreadsheet di belakang layar.
      const cached = loadDataCache();
      if (cached) {
        transactions = cached.transactions;
        CATEGORIES = cached.categories;
        rebuildCategoryLookup();
        populateCategories(currentType);
        renderCategoryManageList();
        renderDashboard();
        renderHistory();
      }
      loadAllData(false);
    }
    initNotifications();
  }

  /* ---------------- Load data transaksi ---------------- */
  // preloaded (opsional): { transactions, categories } yang sudah didapat
  // dari respons login — kalau ada, tidak perlu fetch ulang (hemat 1
  // request penuh ke Apps Script, yang masing-masing punya overhead
  // sendiri di server sehingga terasa signifikan).
  async function loadAllData(isManualRefresh, preloaded) {
    try {
      const result = preloaded || (await fetchTransactions());
      transactions = result.transactions;
      CATEGORIES = result.categories;
      rebuildCategoryLookup();
      populateCategories(currentType);
      renderCategoryManageList();
      renderDashboard();
      renderHistory();
      saveDataCache(transactions, CATEGORIES);
      if (isManualRefresh) showToast("Data diperbarui ✓");
    } catch (err) {
      console.error(err);
      showToast("Gagal memuat data dari Spreadsheet. Cek koneksi internet.");
    }
  }

  /* ---------------- Init ---------------- */
  function init() {
    registerAppServiceWorker();
    const stored = loadStoredUser();
    if (stored && stored.username) {
      currentUser = stored;
      enterApp();
    } else {
      document.getElementById("login-username").focus();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
