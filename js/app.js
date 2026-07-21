/* =========================================================
   AZMYRA FINANCE — app logic (vanilla JS, no build step)
   Data disimpan bersama di Google Spreadsheet lewat Google Apps Script,
   sehingga semua orang yang membuka aplikasi ini melihat data yang sama.
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     KONFIGURASI — WAJIB DIISI
     Tempel URL Web App hasil deploy Google Apps Script kamu di sini.
     Contoh: "https://script.google.com/macros/s/AKfycb.../exec"
     ========================================================= */
  const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbwfB43OF07vUsSYDiqfT_MVHw8YElfohzMa8IpknJXVawbg9f66cVwcOh7rdDGzavLbZA/exec",
  };

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

  /* ---------------- State ---------------- */
  let transactions = [];
  let currentType = "income"; // untuk form Tambah
  let currentFilter = "all"; // untuk Riwayat
  let searchTerm = "";
  let isConfigured = CONFIG.API_URL && CONFIG.API_URL.startsWith("http");

  /* ---------------- Koneksi ke Google Spreadsheet ---------------- */
  async function fetchTransactions() {
    const res = await fetch(`${CONFIG.API_URL}?action=list`);
    if (!res.ok) throw new Error("Gagal memuat data (" + res.status + ")");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal memuat data");
    return json.data || [];
  }

  async function addTransactionRemote(tx) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // hindari CORS preflight
      body: JSON.stringify({ action: "add", transaction: tx }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal menyimpan transaksi");
  }

  async function deleteTransactionRemote(id) {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "delete", id }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Gagal menghapus transaksi");
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------- Helpers ---------------- */
  function formatRupiah(n) {
    const val = Math.round(Number(n) || 0);
    return "Rp " + val.toLocaleString("id-ID");
  }

  function formatDateShort(isoStr) {
    const d = new Date(isoStr + "T00:00:00");
    if (isNaN(d)) return isoStr;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  function isThisMonth(isoStr) {
    const d = new Date(isoStr + "T00:00:00");
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
      if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
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
    document.getElementById("greeting-eyebrow").textContent = `${g}, semoga harimu lancar`;
    document.getElementById("today-date").textContent = new Date().toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  /* ---------------- Dashboard rendering ---------------- */
  function renderDashboard() {
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    document.getElementById("stat-balance").textContent = formatRupiah(balance);
    document.getElementById("stat-income").textContent = formatRupiah(totalIncome);
    document.getElementById("stat-expense").textContent = formatRupiah(totalExpense);

    const monthIncome = transactions.filter((t) => t.type === "income" && isThisMonth(t.date)).reduce((s, t) => s + Number(t.amount), 0);
    const monthExpense = transactions.filter((t) => t.type === "expense" && isThisMonth(t.date)).reduce((s, t) => s + Number(t.amount), 0);
    let pct = monthIncome > 0 ? Math.min(monthExpense / monthIncome, 1) : monthExpense > 0 ? 1 : 0;
    const circumference = 452.4;
    const offset = circumference * (1 - pct);
    const ringEl = document.getElementById("ring-progress");
    ringEl.style.strokeDashoffset = offset;
    ringEl.style.stroke = pct >= 0.9 ? "var(--brick)" : pct >= 0.65 ? "var(--honey)" : "var(--fern)";
    document.getElementById("ring-percent").textContent = Math.round(pct * 100) + "%";

    const catTotals = {};
    transactions
      .filter((t) => t.type === "expense" && isThisMonth(t.date))
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
    const recent = [...transactions].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 5);
    recentList.innerHTML = "";
    if (recent.length === 0) {
      recentEmpty.hidden = false;
    } else {
      recentEmpty.hidden = true;
      recent.forEach((t) => recentList.appendChild(renderTxListItem(t)));
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
      date: document.getElementById("tx-date").value || new Date().toISOString().slice(0, 10),
    };

    submitBtn.disabled = true;
    const originalLabel = submitLabel.textContent;
    submitLabel.textContent = "Menyimpan…";

    try {
      await addTransactionRemote(newTx);
      transactions.push(newTx);

      const successEl = document.getElementById("form-success");
      successEl.hidden = false;
      setTimeout(() => (successEl.hidden = true), 2200);
      showToast(currentType === "income" ? "Pemasukan berhasil dicatat ✓" : "Pengeluaran berhasil dicatat ✓");

      txForm.reset();
      document.getElementById("tx-date").value = new Date().toISOString().slice(0, 10);
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
          <button class="row-delete" title="Hapus transaksi" data-id="${t.id}">
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".row-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        try {
          await deleteTransactionRemote(id);
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

  /* ---------------- Load awal ---------------- */
  async function loadAllData(isManualRefresh) {
    if (!isConfigured) {
      showToast("Tempel URL Apps Script di js/app.js (CONFIG.API_URL) dulu.");
      renderDashboard();
      renderHistory();
      return;
    }
    try {
      transactions = await fetchTransactions();
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
    renderGreeting();
    setFormType("income");
    document.getElementById("tx-date").value = new Date().toISOString().slice(0, 10);
    loadAllData(false);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
