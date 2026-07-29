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
  let currentFilter = "all"; // untuk Riwayat
  let searchTerm = "";
  let periodType = "monthly"; // daily | weekly | monthly | yearly
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
  function getPeriodRange() {
    if (periodType === "daily") {
      const val = selectedDailyDate || todayISO();
      return { start: val, end: val };
    }
    if (periodType === "weekly") {
      const weeks = getWeeksInMonth(weekViewYear, weekViewMonth);
      const found = weeks.find((w) => w.index === selectedWeekIndex) || weeks[0];
      return { start: found.start, end: found.end };
    }
    if (periodType === "monthly") {
      const y = selectedMonthYear;
      const m = selectedMonthIndex + 1;
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
    yearly: document.getElementById("period-yearly"),
  };
  const DAY_LABELS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  function populateMonthYearSelects(monthSelect, yearSelect) {
    monthSelect.innerHTML = "";
    MONTH_NAMES_FULL_ID.forEach((name, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = name;
      monthSelect.appendChild(opt);
    });
    const currentYear = new Date().getFullYear();
    const yearsFromData = transactions.map((t) => Number(t.date.slice(0, 4))).filter((y) => !isNaN(y));
    const minYear = Math.min(currentYear - 4, ...yearsFromData, currentYear);
    const maxYear = Math.max(currentYear + 1, ...yearsFromData, currentYear);
    yearSelect.innerHTML = "";
    for (let y = maxYear; y >= minYear; y--) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      yearSelect.appendChild(opt);
    }
  }

  /* ---- Kalender Harian ---- */
  const dayCalendarGrid = document.getElementById("day-calendar-grid");
  const dayMonthSelect = document.getElementById("day-month-select");
  const dayYearSelect = document.getElementById("day-year-select");
  const dayTrigger = document.getElementById("day-trigger");
  const dayTriggerLabel = document.getElementById("day-trigger-label");
  const dayCalendarEl = document.getElementById("day-calendar");
  const dayPickerWrap = dayTrigger.closest(".week-picker-wrap");
  let dayViewYear = new Date().getFullYear();
  let dayViewMonth = new Date().getMonth();
  let selectedDailyDate = todayISO();

  function openDayCalendar() { dayCalendarEl.hidden = false; dayTrigger.setAttribute("aria-expanded", "true"); }
  function closeDayCalendar() { dayCalendarEl.hidden = true; dayTrigger.setAttribute("aria-expanded", "false"); }
  dayTrigger.addEventListener("click", () => (dayCalendarEl.hidden ? openDayCalendar() : closeDayCalendar()));

  dayMonthSelect.addEventListener("change", () => { dayViewMonth = Number(dayMonthSelect.value); renderDayCalendar(); });
  dayYearSelect.addEventListener("change", () => { dayViewYear = Number(dayYearSelect.value); renderDayCalendar(); });

  function renderDayCalendar() {
    const weeks = getWeeksInMonth(dayViewYear, dayViewMonth);
    dayMonthSelect.value = String(dayViewMonth);
    dayYearSelect.value = String(dayViewYear);
    dayCalendarGrid.innerHTML = "";

    const headerRow = document.createElement("div");
    headerRow.className = "week-cal-row week-cal-header";
    DAY_LABELS_ID.forEach((label) => {
      const span = document.createElement("span");
      span.className = "week-cal-daylabel";
      span.textContent = label;
      headerRow.appendChild(span);
    });
    dayCalendarGrid.appendChild(headerRow);

    weeks.forEach((w) => {
      const row = document.createElement("div");
      row.className = "week-cal-row";
      const startDate = parseISODate(w.start);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const iso = toISODate(d);
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "week-cal-cell";
        if (d.getMonth() !== dayViewMonth) cell.classList.add("is-outside");
        if (iso === todayISO()) cell.classList.add("is-today");
        if (iso === selectedDailyDate) cell.classList.add("is-selected-day");
        cell.textContent = String(d.getDate());
        cell.addEventListener("click", () => {
          selectedDailyDate = iso;
          updateDayTriggerLabel();
          renderDayCalendar();
          closeDayCalendar();
        });
        row.appendChild(cell);
      }
      dayCalendarGrid.appendChild(row);
    });
  }

  function updateDayTriggerLabel() {
    dayTriggerLabel.textContent = parseISODate(selectedDailyDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }

  /* ---- Kalender Mingguan ---- */
  const weekCalendarGrid = document.getElementById("week-calendar-grid");
  const weekMonthSelect = document.getElementById("week-month-select");
  const weekYearSelect = document.getElementById("week-year-select");
  const weekTrigger = document.getElementById("week-trigger");
  const weekTriggerLabel = document.getElementById("week-trigger-label");
  const weekCalendarEl = document.getElementById("week-calendar");
  const weekPickerWrap = weekTrigger.closest(".week-picker-wrap");
  let weekViewYear = new Date().getFullYear();
  let weekViewMonth = new Date().getMonth();
  let selectedWeekIndex = 1;

  function openWeekCalendar() { weekCalendarEl.hidden = false; weekTrigger.setAttribute("aria-expanded", "true"); }
  function closeWeekCalendar() { weekCalendarEl.hidden = true; weekTrigger.setAttribute("aria-expanded", "false"); }
  weekTrigger.addEventListener("click", () => (weekCalendarEl.hidden ? openWeekCalendar() : closeWeekCalendar()));

  weekMonthSelect.addEventListener("change", () => { weekViewMonth = Number(weekMonthSelect.value); renderWeekCalendar(); });
  weekYearSelect.addEventListener("change", () => { weekViewYear = Number(weekYearSelect.value); renderWeekCalendar(); });

  /* ---- Kalender Bulanan ---- */
  const monthGrid = document.getElementById("month-grid");
  const monthYearLabel = document.getElementById("month-picker-year-label");
  const monthPrevBtn = document.getElementById("month-prev-year");
  const monthNextBtn = document.getElementById("month-next-year");
  const monthTrigger = document.getElementById("month-trigger");
  const monthTriggerLabel = document.getElementById("month-trigger-label");
  const monthCalendarEl = document.getElementById("month-calendar");
  const monthPickerWrap = monthTrigger.closest(".week-picker-wrap");
  let monthViewYear = new Date().getFullYear();
  let selectedMonthYear = new Date().getFullYear();
  let selectedMonthIndex = new Date().getMonth();

  function openMonthCalendar() { monthCalendarEl.hidden = false; monthTrigger.setAttribute("aria-expanded", "true"); }
  function closeMonthCalendar() { monthCalendarEl.hidden = true; monthTrigger.setAttribute("aria-expanded", "false"); }
  monthTrigger.addEventListener("click", () => (monthCalendarEl.hidden ? openMonthCalendar() : closeMonthCalendar()));

  function renderMonthGrid() {
    monthYearLabel.textContent = String(monthViewYear);
    monthGrid.innerHTML = "";
    MONTH_NAMES_ID.forEach((name, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "month-grid-btn";
      const today = new Date();
      if (monthViewYear === today.getFullYear() && idx === today.getMonth()) btn.classList.add("is-current");
      if (monthViewYear === selectedMonthYear && idx === selectedMonthIndex) btn.classList.add("is-selected");
      btn.textContent = name;
      btn.addEventListener("click", () => {
        selectedMonthYear = monthViewYear;
        selectedMonthIndex = idx;
        updateMonthTriggerLabel();
        renderMonthGrid();
        closeMonthCalendar();
      });
      monthGrid.appendChild(btn);
    });
  }

  function updateMonthTriggerLabel() {
    monthTriggerLabel.textContent = `${MONTH_NAMES_FULL_ID[selectedMonthIndex]} ${selectedMonthYear}`;
  }

  monthPrevBtn.addEventListener("click", () => { monthViewYear--; renderMonthGrid(); });
  monthNextBtn.addEventListener("click", () => { monthViewYear++; renderMonthGrid(); });

  // Satu listener global untuk menutup popover manapun saat klik di luar area-nya.
  document.addEventListener("click", (e) => {
    if (!dayCalendarEl.hidden && !dayPickerWrap.contains(e.target)) closeDayCalendar();
    if (!weekCalendarEl.hidden && !weekPickerWrap.contains(e.target)) closeWeekCalendar();
    if (!monthCalendarEl.hidden && !monthPickerWrap.contains(e.target)) closeMonthCalendar();
  });

  function initPeriodDefaults() {
    populateYearSelect();
    populateMonthYearSelects(dayMonthSelect, dayYearSelect);
    populateMonthYearSelects(weekMonthSelect, weekYearSelect);

    dayViewYear = new Date().getFullYear();
    dayViewMonth = new Date().getMonth();
    selectedDailyDate = todayISO();
    renderDayCalendar();
    updateDayTriggerLabel();

    weekViewYear = new Date().getFullYear();
    weekViewMonth = new Date().getMonth();
    renderWeekCalendar();

    monthViewYear = new Date().getFullYear();
    selectedMonthYear = new Date().getFullYear();
    selectedMonthIndex = new Date().getMonth();
    renderMonthGrid();
    updateMonthTriggerLabel();

    periodType = "monthly";
    periodTypeSelect.value = "monthly";
    showPeriodField("monthly");
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
    weekMonthSelect.value = String(weekViewMonth);
    weekYearSelect.value = String(weekViewYear);

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
        updateWeekTriggerLabel();
        closeWeekCalendar();
      });
      weekCalendarGrid.appendChild(row);
    });

    highlightSelectedWeek();
    updateWeekTriggerLabel();
  }

  function updateWeekTriggerLabel() {
    const weeks = getWeeksInMonth(weekViewYear, weekViewMonth);
    const found = weeks.find((w) => w.index === selectedWeekIndex) || weeks[0];
    const s = parseISODate(found.start);
    const e = parseISODate(found.end);
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    weekTriggerLabel.textContent = sameMonth
      ? `${s.getDate()}–${e.getDate()} ${MONTH_NAMES_FULL_ID[s.getMonth()]} ${s.getFullYear()}`
      : `${s.getDate()} ${MONTH_NAMES_ID[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES_ID[e.getMonth()]} ${e.getFullYear()}`;
  }

  function highlightSelectedWeek() {
    weekCalendarGrid.querySelectorAll(".week-cal-row.is-selectable").forEach((row) => {
      row.classList.toggle("is-selected", Number(row.dataset.weekIndex) === selectedWeekIndex);
    });
  }

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

  // Tren beberapa sub-periode terakhir (mengakhiri di periode yang sedang
  // dipilih), granularitasnya menyesuaikan jenis periode aktif — supaya
  // "perkembangan tabungan" selalu relevan dengan konteks yang sedang dilihat.
  function getTrendIntervals() {
    const intervals = [];
    if (periodType === "daily") {
      const endDate = parseISODate(selectedDailyDate);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const iso = toISODate(d);
        intervals.push({ label: String(d.getDate()), start: iso, end: iso });
      }
    } else if (periodType === "weekly") {
      const weeks = getWeeksInMonth(weekViewYear, weekViewMonth);
      const current = weeks.find((w) => w.index === selectedWeekIndex) || weeks[0];
      const curStart = parseISODate(current.start);
      for (let i = 5; i >= 0; i--) {
        const s = new Date(curStart);
        s.setDate(s.getDate() - i * 7);
        const e = new Date(s);
        e.setDate(e.getDate() + 6);
        intervals.push({ label: `${s.getDate()}/${s.getMonth() + 1}`, start: toISODate(s), end: toISODate(e) });
      }
    } else if (periodType === "monthly") {
      for (let i = 5; i >= 0; i--) {
        let mm = selectedMonthIndex - i;
        let yy = selectedMonthYear;
        while (mm < 0) { mm += 12; yy--; }
        const lastDay = new Date(yy, mm + 1, 0).getDate();
        intervals.push({
          label: MONTH_NAMES_ID[mm],
          start: `${yy}-${pad2(mm + 1)}-01`,
          end: `${yy}-${pad2(mm + 1)}-${pad2(lastDay)}`,
        });
      }
    } else {
      const y = Number(document.getElementById("period-yearly").value) || new Date().getFullYear();
      for (let i = 4; i >= 0; i--) {
        const yy = y - i;
        intervals.push({ label: String(yy), start: `${yy}-01-01`, end: `${yy}-12-31` });
      }
    }
    return intervals.map((iv) => {
      const txs = transactions.filter((t) => t.date >= iv.start && t.date <= iv.end);
      const inc = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const exp = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { ...iv, income: inc, expense: exp, net: inc - exp };
    });
  }

  function renderTrendChart() {
    const intervals = getTrendIntervals();
    const subLabel = {
      daily: "Surplus/defisit 7 hari terakhir",
      weekly: "Surplus/defisit 6 minggu terakhir",
      monthly: "Surplus/defisit 6 bulan terakhir",
      yearly: "Surplus/defisit 5 tahun terakhir",
    };
    document.getElementById("trend-sub").textContent = subLabel[periodType] || "Surplus/defisit beberapa periode terakhir";

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
    renderLaporan();
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

  /* ---------------- Kelola Kategori ---------------- */
  let categoryManageType = "income";
  let catSearchTerm = "";
  const catSearchInput = document.getElementById("search-cat");
  catSearchInput.addEventListener("input", () => {
    catSearchTerm = catSearchInput.value.trim().toLowerCase();
    renderCategoryManageList();
  });
  const catTypeButtons = document.querySelectorAll("[data-cattype]");
  const categoryForm = document.getElementById("category-form");
  const catIconInput = document.getElementById("cat-icon");
  const catLabelInput = document.getElementById("cat-label");
  const catSubmitBtn = document.getElementById("cat-submit");
  const catSubmitLabel = document.getElementById("cat-submit-label");
  const catManageList = document.getElementById("cat-manage-list");
  const catManageEmpty = document.getElementById("cat-manage-empty");
  const catListSub = document.getElementById("cat-list-sub");
  const categoryModal = document.getElementById("category-modal");
  const catAddOpenBtn = document.getElementById("cat-add-open-btn");
  const categoryModalClose = document.getElementById("category-modal-close");

  catTypeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryManageType = btn.dataset.cattype;
      catTypeButtons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", String(active));
      });
      renderCategoryManageList();
    });
  });

  /* ---- Modal Tambah Kategori ---- */
  function openCategoryModal() {
    categoryForm.reset();
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

  categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const label = catLabelInput.value.trim();
    const icon = catIconInput.value.trim() || "🏷️";
    if (!label) { showToast("Nama kategori wajib diisi."); return; }

    catSubmitBtn.disabled = true;
    const original = catSubmitLabel.textContent;
    catSubmitLabel.textContent = "Menyimpan…";
    try {
      const newCat = await addCategoryRemote(categoryManageType, label, icon);
      CATEGORIES[categoryManageType].push(newCat);
      rebuildCategoryLookup();
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
  function renderCategoryManageList() {
    let list = CATEGORIES[categoryManageType] || [];
    if (catSearchTerm) {
      list = list.filter((cat) => cat.label.toLowerCase().includes(catSearchTerm));
    }
    catListSub.textContent = categoryManageType === "income" ? "Kategori Pemasukan" : "Kategori Pengeluaran";
    const tableWrap = document.querySelector("#page-kategori .table-wrap");
    catManageList.innerHTML = "";
    if (list.length === 0) {
      tableWrap.style.display = "none";
      catManageEmpty.hidden = false;
      catManageEmpty.textContent = catSearchTerm ? "Tidak ada kategori yang cocok dengan pencarianmu." : "Belum ada kategori.";
      return;
    }
    tableWrap.style.display = "";
    catManageEmpty.hidden = true;
    list.forEach((cat) => catManageList.appendChild(buildCategoryRow(cat)));
  }

  function buildCategoryRow(cat) {
    const type = categoryManageType;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="cat-view-icon">${escapeHtml(cat.icon)}</span>
        <span class="cat-view-label">${escapeHtml(cat.label)}</span>
        <span class="cat-edit-fields" hidden>
          <input type="text" class="cat-manage-input cat-edit-icon" maxlength="4" />
          <input type="text" class="cat-manage-input cat-edit-label" />
        </span>
      </td>
      <td class="align-right">
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
      </td>
    `;

    const viewIcon = tr.querySelector(".cat-view-icon");
    const viewLabel = tr.querySelector(".cat-view-label");
    const editFields = tr.querySelector(".cat-edit-fields");
    const editIconInput = tr.querySelector(".cat-edit-icon");
    const editLabelInput = tr.querySelector(".cat-edit-label");
    const viewActions = tr.querySelector('.cat-actions[data-mode="view"]');
    const editActions = tr.querySelector('.cat-actions[data-mode="edit"]');

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

    tr.querySelector(".cat-edit-btn").addEventListener("click", enterEditMode);
    tr.querySelector(".cat-cancel-btn").addEventListener("click", exitEditMode);

    tr.querySelector(".cat-save-btn").addEventListener("click", async () => {
      const newLabel = editLabelInput.value.trim();
      const newIcon = editIconInput.value.trim() || "🏷";
      if (!newLabel) { showToast("Nama kategori tidak boleh kosong."); return; }
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

    tr.querySelector(".cat-delete-btn").addEventListener("click", async () => {
      if (!confirm(`Hapus kategori "${cat.label}"? Transaksi lama yang memakai kategori ini tetap tersimpan.`)) return;
      try {
        await deleteCategoryRemote(type, cat.id);
        CATEGORIES[type] = CATEGORIES[type].filter((c) => c.id !== cat.id);
        rebuildCategoryLookup();
        tr.remove();
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

    return tr;
  }

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

  /* ---------------- Notifikasi Push (Firebase Cloud Messaging) ---------------- */
  const NOTIF_REGISTERED_KEY = "azmyra_finance_notif_registered_v1";
  const notifBtn = document.getElementById("notif-btn");
  const notifBtnLabel = document.getElementById("notif-btn-label");
  const isFirebaseConfigured =
    typeof FIREBASE_CONFIG !== "undefined" &&
    FIREBASE_CONFIG.apiKey &&
    !FIREBASE_CONFIG.apiKey.startsWith("TEMPEL_");
  let messagingInstance = null;

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

  async function initNotifications() {
    updateNotifButtonLabel();
    if (!isFirebaseConfigured) return;
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return;

    try {
      const app = firebase.initializeApp(FIREBASE_CONFIG);
      messagingInstance = firebase.messaging();
      const swReg = await navigator.serviceWorker.register("firebase-messaging-sw.js");

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
    const swReg = await navigator.serviceWorker.getRegistration();
    await registerFcmToken(swReg || (await navigator.serviceWorker.register("firebase-messaging-sw.js")));
    showToast("Notifikasi diaktifkan ✓");
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
    initNotifications();
  }

  /* ---------------- Load data transaksi ---------------- */
  async function loadAllData(isManualRefresh) {
    try {
      const result = await fetchTransactions();
      transactions = result.transactions;
      CATEGORIES = result.categories;
      rebuildCategoryLookup();
      populateCategories(currentType);
      renderCategoryManageList();
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
