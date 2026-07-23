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

  const CATEGORIES = {
    income: [
      { id: "gaji", label: "Gaji", icon: "💼" },
      { id: "bonus", label: "Bonus / THR", icon: "🎁" },
      { id: "usaha", label: "Usaha", icon: "🧾" },
      { id: "investasi", label: "Investasi", icon: "📈" },
      { id: "hadiah", label: "Hadiah", icon: "💌" },
      { id: "lainnya-in", label: "Lainnya", icon: "✨" },
    ],
    expense: [
      { id: "makanan", label: "Makanan & Minuman", icon: "🍜" },
      { id: "transport", label: "Transportasi", icon: "🚗" },
      { id: "belanja", label: "Belanja Rumah", icon: "🛒" },
      { id: "tagihan", label: "Tagihan & Listrik", icon: "💡" },
      { id: "pendidikan", label: "Pendidikan", icon: "📚" },
      { id: "kesehatan", label: "Kesehatan", icon: "🩺" },
      { id: "hiburan", label: "Hiburan", icon: "🎬" },
      { id: "lainnya-out", label: "Lainnya", icon: "📦" },
    ],
  };

  const CATEGORY_LOOKUP = {};
  [...CATEGORIES.income, ...CATEGORIES.expense].forEach((c) => (CATEGORY_LOOKUP[c.id] = c));

  const MONTH_NAMES_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const MONTH_NAMES_FULL_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  /* ---------------- State ---------------- */
  let transactions = [];
  let currentType = "income"; // untuk form Tambah
  let currentFilter = "all"; // untuk Riwayat
  let searchTerm = "";
  let periodType = "weekly"; // daily | weekly | monthly | yearly
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

  async function loginRequest(username, password) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", username, password }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Login gagal");
    return json.user;
  }

  /* ---------------- Koneksi ke Google Spreadsheet ---------------- */
  async function fetchTransactions() {
    const res = await fetch(`${CONFIG.API_URL}?action=list`);
    if (!res.ok) throw new Error("Gagal memuat data (" + res.status + ")");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal memuat data");
    return (json.data || []).map((t) => ({ ...t, date: normalizeDate(t.date) }));
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
  function getPeriodRange() {
    if (periodType === "daily") {
      const val = document.getElementById("period-daily").value || todayISO();
      return { start: val, end: val };
    }
    if (periodType === "weekly") {
      const weeks = getWeeksInMonth(weekViewYear, weekViewMonth);
      const found = weeks.find((w) => w.index === selectedWeekIndex) || weeks[0];
      return { start: found.start, end: found.end };
    }
    if (periodType === "monthly") {
      const val = document.getElementById("period-monthly").value || todayISO().slice(0, 7);
      const [y, m] = val.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      return { start: `${y}-${pad2(m)}-01`, end: `${y}-${pad2(m)}-${pad2(lastDay)}` };
    }
    const y = document.getElementById("period-yearly").value || String(new Date().getFullYear());
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }

  function formatPeriodLabel(range) {
    if (periodType === "daily") {
      return parseISODate(range.start).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    }
    if (periodType === "weekly") {
      const s = parseISODate(range.start);
      const e = parseISODate(range.end);
      const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
      if (sameMonth) return `${s.getDate()}–${e.getDate()} ${MONTH_NAMES_FULL_ID[s.getMonth()]} ${s.getFullYear()}`;
      return `${s.getDate()} ${MONTH_NAMES_ID[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES_ID[e.getMonth()]} ${e.getFullYear()}`;
    }
    if (periodType === "monthly") {
      const s = parseISODate(range.start);
      return `${MONTH_NAMES_FULL_ID[s.getMonth()]} ${s.getFullYear()}`;
    }
    return range.start.slice(0, 4);
  }

  function filterByPeriod(list, range) {
    return list.filter((t) => t.date >= range.start && t.date <= range.end);
  }

  /* ---------------- Setup kontrol periode ---------------- */
  const periodTypeSelect = document.getElementById("period-type-select");
  const periodForm = document.getElementById("period-form");
  const periodFieldWrappers = {
    daily: document.getElementById("field-daily"),
    weekly: document.getElementById("field-weekly"),
    monthly: document.getElementById("field-monthly"),
    yearly: document.getElementById("field-yearly"),
  };
  const periodInputs = {
    daily: document.getElementById("period-daily"),
    monthly: document.getElementById("period-monthly"),
    yearly: document.getElementById("period-yearly"),
  };
  const weekCalendarGrid = document.getElementById("week-calendar-grid");
  const weekMonthLabel = document.getElementById("week-picker-month-label");
  const weekPrevBtn = document.getElementById("week-prev-month");
  const weekNextBtn = document.getElementById("week-next-month");
  const DAY_LABELS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  let weekViewYear = new Date().getFullYear();
  let weekViewMonth = new Date().getMonth();
  let selectedWeekIndex = 1;

  function initPeriodDefaults() {
    periodInputs.daily.value = todayISO();
    periodInputs.monthly.value = todayISO().slice(0, 7);
    populateYearSelect();
    weekViewYear = new Date().getFullYear();
    weekViewMonth = new Date().getMonth();
    renderWeekCalendar();
    periodType = "weekly";
    periodTypeSelect.value = "weekly";
    showPeriodField("weekly");
  }

  function populateYearSelect() {
    const currentYear = new Date().getFullYear();
    const yearsFromData = transactions.map((t) => Number(t.date.slice(0, 4))).filter((y) => !isNaN(y));
    const years = new Set([currentYear, ...yearsFromData]);
    const minYear = Math.min(...years, currentYear - 4);
    for (let y = currentYear; y >= minYear; y--) years.add(y);
    const sorted = [...years].sort((a, b) => b - a);
    const select = periodInputs.yearly;
    const prevValue = select.value || String(currentYear);
    select.innerHTML = "";
    sorted.forEach((y) => {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      select.appendChild(opt);
    });
    select.value = sorted.includes(Number(prevValue)) ? prevValue : String(currentYear);
  }

  // Kalender minggu: grid tanggal gaya kalender biasa. Klik tanggal manapun
  // menyorot SELURUH baris (minggu) tempat tanggal itu berada. Minggu yang
  // memuat hari ini otomatis tersorot saat bulan berjalan pertama dibuka.
  function renderWeekCalendar() {
    const weeks = getWeeksInMonth(weekViewYear, weekViewMonth);
    weekMonthLabel.textContent = `${MONTH_NAMES_FULL_ID[weekViewMonth]} ${weekViewYear}`;

    const today = new Date();
    let defaultIndex = 1;
    if (weekViewYear === today.getFullYear() && weekViewMonth === today.getMonth()) {
      const todayIso = todayISO();
      const match = weeks.find((w) => todayIso >= w.start && todayIso <= w.end);
      if (match) defaultIndex = match.index;
    }
    selectedWeekIndex = defaultIndex;

    weekCalendarGrid.innerHTML = "";

    const headerRow = document.createElement("div");
    headerRow.className = "week-cal-row week-cal-header";
    DAY_LABELS_ID.forEach((label) => {
      const span = document.createElement("span");
      span.className = "week-cal-daylabel";
      span.textContent = label;
      headerRow.appendChild(span);
    });
    weekCalendarGrid.appendChild(headerRow);

    weeks.forEach((w) => {
      const row = document.createElement("div");
      row.className = "week-cal-row is-selectable";
      row.dataset.weekIndex = String(w.index);
      const startDate = parseISODate(w.start);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const iso = toISODate(d);
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "week-cal-cell";
        if (d.getMonth() !== weekViewMonth) cell.classList.add("is-outside");
        if (iso === todayISO()) cell.classList.add("is-today");
        cell.textContent = String(d.getDate());
        row.appendChild(cell);
      }
      row.addEventListener("click", () => {
        selectedWeekIndex = w.index;
        highlightSelectedWeek();
      });
      weekCalendarGrid.appendChild(row);
    });

    highlightSelectedWeek();
  }

  function highlightSelectedWeek() {
    weekCalendarGrid.querySelectorAll(".week-cal-row.is-selectable").forEach((row) => {
      row.classList.toggle("is-selected", Number(row.dataset.weekIndex) === selectedWeekIndex);
    });
  }

  weekPrevBtn.addEventListener("click", () => {
    weekViewMonth--;
    if (weekViewMonth < 0) { weekViewMonth = 11; weekViewYear--; }
    renderWeekCalendar();
  });
  weekNextBtn.addEventListener("click", () => {
    weekViewMonth++;
    if (weekViewMonth > 11) { weekViewMonth = 0; weekViewYear++; }
    renderWeekCalendar();
  });

  function showPeriodField(type) {
    Object.entries(periodFieldWrappers).forEach(([key, wrapper]) => { wrapper.hidden = key !== type; });
  }

  periodTypeSelect.addEventListener("change", () => showPeriodField(periodTypeSelect.value));

  periodForm.addEventListener("submit", (e) => {
    e.preventDefault();
    periodType = periodTypeSelect.value;
    renderPeriodPanels();
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

  /* ---------------- Routing (sidebar tabs) ---------------- */
  function goToRoute(route) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("is-active"));
    document.getElementById(`page-${route}`).classList.add("is-active");
    document.querySelectorAll(".nav-item[data-route]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.route === route);
    });
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (route === "tambah") {
      const dateInput = document.getElementById("tx-date");
      if (!dateInput.value) dateInput.value = todayISO();
    }
  }

  document.querySelectorAll("[data-route]").forEach((el) => {
    el.addEventListener("click", () => goToRoute(el.dataset.route));
  });

  /* ---------------- Mobile sidebar ---------------- */
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("sidebar-scrim");
  const menuToggle = document.getElementById("menu-toggle");

  function openSidebar() {
    sidebar.classList.add("is-open");
    scrim.classList.add("is-visible");
    menuToggle.setAttribute("aria-expanded", "true");
  }
  function closeSidebar() {
    sidebar.classList.remove("is-open");
    scrim.classList.remove("is-visible");
    menuToggle.setAttribute("aria-expanded", "false");
  }
  menuToggle.addEventListener("click", () => {
    sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar();
  });
  scrim.addEventListener("click", closeSidebar);

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
    document.getElementById("user-name").textContent = currentUser.displayName;
    document.getElementById("user-avatar").textContent = currentUser.displayName.slice(0, 1);
  }

  /* ---------------- Dashboard: saldo & ringkasan (selalu total keseluruhan) ---------------- */
  function renderHeroStats() {
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    document.getElementById("stat-balance").textContent = formatRupiah(balance);
    document.getElementById("stat-income").textContent = formatRupiah(totalIncome);
    document.getElementById("stat-expense").textContent = formatRupiah(totalExpense);
  }

  /* ---------------- Dashboard: panel yang mengikuti periode terpilih ---------------- */
  function renderPeriodPanels() {
    const range = getPeriodRange();
    const label = formatPeriodLabel(range);
    const periodTx = filterByPeriod(transactions, range);

    document.getElementById("period-label-cashflow").textContent = label;
    document.getElementById("period-label-category").textContent = `Kategori teratas — ${label}`;
    document.getElementById("period-label-tx").textContent = `Transaksi — ${label}`;
    document.getElementById("recent-empty-text").textContent = `Belum ada transaksi pada ${label}.`;

    const periodIncome = periodTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const periodExpense = periodTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

    const ringEl = document.getElementById("ring-progress");
    const captionEl = document.getElementById("ring-caption");
    const circumference = 452.4;
    let pct = 0;
    let caption = "Terpakai";

    if (periodIncome > 0) {
      pct = Math.min(periodExpense / periodIncome, 1);
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
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
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
  }

  function renderTxListItem(t) {
    const cat = CATEGORY_LOOKUP[t.category] || { label: t.category, icon: "•" };
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="tx-left">
        <div class="tx-icon ${t.type}">${cat.icon}</div>
        <div class="tx-meta">
          <div class="tx-cat">${escapeHtml(cat.label)}</div>
          <div class="tx-note">${escapeHtml(t.note || "Tanpa catatan")}</div>
        </div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${t.type}">${t.type === "income" ? "+" : "−"} ${formatRupiah(t.amount)}</div>
        <div class="tx-date">${formatDateShort(t.date)}</div>
      </div>
    `;
    return li;
  }

  function renderDashboard() {
    renderHeroStats();
    renderPeriodPanels();
  }

  /* ---------------- Tambah Transaksi form ---------------- */
  const typeButtons = document.querySelectorAll(".type-btn");
  const categorySelect = document.getElementById("tx-category");
  const txForm = document.getElementById("tx-form");
  const amountInput = document.getElementById("tx-amount");
  const submitLabel = document.getElementById("tx-submit-label");
  const submitBtn = document.getElementById("tx-submit");

  function populateCategories(type) {
    categorySelect.innerHTML = "";
    CATEGORIES[type].forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.icon}  ${c.label}`;
      categorySelect.appendChild(opt);
    });
  }

  function setFormType(type) {
    currentType = type;
    typeButtons.forEach((b) => {
      const active = b.dataset.type === type;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });
    populateCategories(type);
    submitLabel.textContent = type === "income" ? "Simpan Pemasukan" : "Simpan Pengeluaran";
  }

  typeButtons.forEach((btn) => btn.addEventListener("click", () => setFormType(btn.dataset.type)));

  amountInput.addEventListener("input", () => {
    const digits = amountInput.value.replace(/\D/g, "");
    amountInput.value = digits ? Number(digits).toLocaleString("id-ID") : "";
    document.getElementById("err-amount").hidden = true;
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

    const newTx = {
      id: uid(),
      type: currentType,
      category: categorySelect.value,
      amount: rawAmount,
      note: document.getElementById("tx-note").value.trim(),
      date: document.getElementById("tx-date").value || todayISO(),
    };

    submitBtn.disabled = true;
    const originalLabel = submitLabel.textContent;
    submitLabel.textContent = "Menyimpan…";

    try {
      await addTransactionRemote(newTx);
      transactions.push(newTx);
      populateYearSelect();

      const successEl = document.getElementById("form-success");
      successEl.hidden = false;
      setTimeout(() => (successEl.hidden = true), 2200);
      showToast(currentType === "income" ? "Pemasukan berhasil dicatat ✓" : "Pengeluaran berhasil dicatat ✓");

      txForm.reset();
      document.getElementById("tx-date").value = todayISO();
      setFormType(currentType);

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

  /* ---------------- Riwayat ---------------- */
  const searchInput = document.getElementById("search-tx");
  const filterChips = document.querySelectorAll("#filter-type .chip");

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

  function renderHistory() {
    const tbody = document.getElementById("tx-table-body");
    const emptyState = document.getElementById("riwayat-empty");
    const tableWrap = document.querySelector("#page-riwayat .table-wrap");

    let list = [...transactions].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    if (currentFilter !== "all") list = list.filter((t) => t.type === currentFilter);
    if (searchTerm) {
      list = list.filter((t) => {
        const cat = CATEGORY_LOOKUP[t.category] || { label: t.category };
        return cat.label.toLowerCase().includes(searchTerm) || (t.note || "").toLowerCase().includes(searchTerm);
      });
    }

    tbody.innerHTML = "";
    if (list.length === 0) {
      tableWrap.style.display = "none";
      emptyState.hidden = false;
      return;
    }
    tableWrap.style.display = "";
    emptyState.hidden = true;

    list.forEach((t) => {
      const cat = CATEGORY_LOOKUP[t.category] || { label: t.category, icon: "•" };
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDateShort(t.date)}</td>
        <td><span class="cat-badge ${t.type}">${cat.icon} ${escapeHtml(cat.label)}</span></td>
        <td class="note-cell">${escapeHtml(t.note || "—")}</td>
        <td class="align-right amount-cell ${t.type}">${t.type === "income" ? "+" : "−"} ${formatRupiah(t.amount)}</td>
        <td class="align-right">
          <button class="row-delete" title="Hapus transaksi" data-id="${t.id}" data-type="${t.type}">
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".row-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const type = btn.dataset.type;
        btn.disabled = true;
        try {
          await deleteTransactionRemote(id, type);
          transactions = transactions.filter((t) => t.id !== id);
          renderHistory();
          renderDashboard();
          showToast("Transaksi dihapus");
        } catch (err) {
          console.error(err);
          showToast("Gagal menghapus. Coba lagi.");
          btn.disabled = false;
        }
      });
    });
  }

  /* ---------------- Muat ulang data ---------------- */
  document.getElementById("reset-data").addEventListener("click", async () => {
    await loadAllData(true);
  });

  /* ---------------- Logout ---------------- */
  document.getElementById("logout-btn").addEventListener("click", () => {
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
      const user = await loginRequest(username, password);
      currentUser = user;
      saveStoredUser(user);
      enterApp();
    } catch (err) {
      loginError.textContent = err.message || "Login gagal. Coba lagi.";
      loginError.hidden = false;
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitLabel.textContent = "Masuk";
    }
  });

  function enterApp() {
    document.getElementById("login-screen").hidden = true;
    document.getElementById("app-shell").hidden = false;
    renderUserBadge();
    renderGreeting();
    setFormType("income");
    document.getElementById("tx-date").value = todayISO();
    initPeriodDefaults();
    loadAllData(false);
  }

  /* ---------------- Load data transaksi ---------------- */
  async function loadAllData(isManualRefresh) {
    try {
      transactions = await fetchTransactions();
      populateYearSelect();
      renderDashboard();
      renderHistory();
      if (isManualRefresh) showToast("Data diperbarui ✓");
    } catch (err) {
      console.error(err);
      showToast("Gagal memuat data dari Spreadsheet. Cek koneksi internet.");
    }
  }

  /* ---------------- Init ---------------- */
  function init() {
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
