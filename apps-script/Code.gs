/**
 * AZMYRA FINANCE — Apps Script backend (v2)
 * Struktur spreadsheet:
 *   - Sheet "Pemasukan"      : id, category, amount, note, date, user
 *   - Sheet "Pengeluaran"    : id, category, amount, note, date, user
 *   - Sheet "Users"          : username, password, displayName
 *   - Sheet "Log"            : timestamp, username, action, detail
 *
 * Sheet di atas akan DIBUAT OTOMATIS (beserta header) saat pertama kali
 * dipakai. Yang perlu kamu isi manual hanya sheet "Users" — tambahkan
 * satu baris per anggota keluarga yang boleh login (lihat README.md).
 *
 * CARA PAKAI (ringkas — panduan lengkap ada di README.md):
 * 1. Buat Google Spreadsheet baru.
 * 2. Extensions -> Apps Script, hapus isi default, tempel seluruh isi file ini.
 * 3. Deploy -> New deployment -> Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Salin URL yang diberikan, tempel ke CONFIG.API_URL di js/app.js
 * 5. Buka sheet "Users" di spreadsheet, isi minimal satu baris:
 *    username | password | displayName
 */

const SHEET_INCOME = "Pemasukan";
const SHEET_EXPENSE = "Pengeluaran";
const SHEET_USERS = "Users";
const SHEET_LOG = "Log";

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || "list";
  if (action === "list") {
    return respondJson({ success: true, data: getAllTransactions() });
  }
  return respondJson({ success: false, error: "Aksi tidak dikenal" });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return respondJson({ success: false, error: "Body request tidak valid" });
  }

  const action = body.action;
  if (action === "login") return handleLogin(body);
  if (action === "add") return handleAdd(body);
  if (action === "delete") return handleDelete(body);

  return respondJson({ success: false, error: "Aksi tidak dikenal" });
}

/* ---------------- Sheet helpers ---------------- */

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getIncomeSheet() { return getOrCreateSheet(SHEET_INCOME, ["id", "category", "amount", "note", "date", "user"]); }
function getExpenseSheet() { return getOrCreateSheet(SHEET_EXPENSE, ["id", "category", "amount", "note", "date", "user"]); }
function getUsersSheet() { return getOrCreateSheet(SHEET_USERS, ["username", "password", "displayName"]); }
function getLogSheet() { return getOrCreateSheet(SHEET_LOG, ["timestamp", "username", "action", "detail"]); }

function formatDateCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

function readTransactionRows(sheet, type) {
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1);
  return data
    .filter((r) => r[0] !== "" && r[0] !== null)
    .map((r) => ({
      id: String(r[0]),
      type: type,
      category: String(r[1]),
      amount: Number(r[2]) || 0,
      note: r[3] ? String(r[3]) : "",
      date: formatDateCell(r[4]),
      user: r[5] ? String(r[5]) : "",
    }));
}

function getAllTransactions() {
  const income = readTransactionRows(getIncomeSheet(), "income");
  const expense = readTransactionRows(getExpenseSheet(), "expense");
  return [...income, ...expense];
}

/* ---------------- Login ---------------- */

function handleLogin(body) {
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    return respondJson({ success: false, error: "Username dan password wajib diisi" });
  }
  const sheet = getUsersSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === username.toLowerCase()) {
      if (String(rows[i][1]) === password) {
        logActivity(username, "login", "Login berhasil");
        return respondJson({ success: true, user: { username: String(rows[i][0]), displayName: rows[i][2] ? String(rows[i][2]) : String(rows[i][0]) } });
      }
      return respondJson({ success: false, error: "Password salah" });
    }
  }
  return respondJson({ success: false, error: "Username tidak ditemukan" });
}

/* ---------------- Tambah transaksi ---------------- */

function handleAdd(body) {
  const t = body.transaction;
  const username = body.username || "tidak diketahui";
  if (!t || !t.id || !t.type || !t.amount) {
    return respondJson({ success: false, error: "Data transaksi tidak lengkap" });
  }
  const sheet = t.type === "income" ? getIncomeSheet() : getExpenseSheet();
  sheet.appendRow([t.id, t.category || "", Number(t.amount), t.note || "", t.date || "", username]);
  logActivity(username, "tambah", `${t.type === "income" ? "Pemasukan" : "Pengeluaran"} ${t.category} Rp${t.amount} — ${t.note || "tanpa catatan"}`);
  return respondJson({ success: true });
}

/* ---------------- Hapus transaksi ---------------- */

function handleDelete(body) {
  const id = body.id;
  const type = body.type;
  const username = body.username || "tidak diketahui";
  if (!id || !type) {
    return respondJson({ success: false, error: "Data tidak lengkap" });
  }
  const sheet = type === "income" ? getIncomeSheet() : getExpenseSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      logActivity(username, "hapus", `Hapus transaksi ${type === "income" ? "pemasukan" : "pengeluaran"} (id: ${id})`);
      break;
    }
  }
  return respondJson({ success: true });
}

/* ---------------- Log aktivitas ---------------- */

function logActivity(username, action, detail) {
  try {
    const sheet = getLogSheet();
    sheet.appendRow([new Date(), username, action, detail]);
  } catch (err) {
    // jangan sampai kegagalan logging menggagalkan aksi utama
  }
}

function respondJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
