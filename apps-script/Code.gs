const SHEET_INCOME = "Pemasukan";
const SHEET_EXPENSE = "Pengeluaran";
const SHEET_CAT_INCOME = "KategoriPemasukan";
const SHEET_CAT_EXPENSE = "KategoriPengeluaran";
const SHEET_USERS = "Users";
const SHEET_LOG = "Log";
const SHEET_DEVICES = "Devices";
const SHEET_TRANSFER = "TarikTunai";

const DEFAULT_CATEGORIES_INCOME = [
  ["gaji", "Gaji", "💼"],
  ["bonus", "Bonus / THR", "🎁"],
  ["usaha", "Usaha", "🧾"],
  ["investasi", "Investasi", "📈"],
  ["hadiah", "Hadiah", "💌"],
  ["lainnya-in", "Lainnya", "✨"],
];

const DEFAULT_CATEGORIES_EXPENSE = [
  ["makanan", "Makanan & Minuman", "🍜"],
  ["transport", "Transportasi", "🚗"],
  ["belanja", "Belanja Rumah", "🛒"],
  ["tagihan", "Tagihan & Listrik", "💡"],
  ["pendidikan", "Pendidikan", "📚"],
  ["kesehatan", "Kesehatan", "🩺"],
  ["hiburan", "Hiburan", "🎬"],
  ["lainnya-out", "Lainnya", "📦"],
];

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || "list";
  if (action === "list") {
    return respondJson({ success: true, data: getAllTransactions(), categories: getAllCategories() });
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
  if (action === "updateTransaction") return handleUpdateTransaction(body);
  if (action === "delete") return handleDelete(body);
  if (action === "registerDevice") return handleRegisterDevice(body);
  if (action === "addCategory") return handleAddCategory(body);
  if (action === "updateCategory") return handleUpdateCategory(body);
  if (action === "deleteCategory") return handleDeleteCategory(body);

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

function getOrCreateCategorySheet(name, defaults) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(["id", "label", "icon"]);
    sheet.setFrozenRows(1);
    defaults.forEach((row) => sheet.appendRow(row));
  }
  return sheet;
}

// Menambahkan kolom baru ke sheet yang SUDAH ADA kalau belum punya kolom
// dengan nama tersebut (dicocokkan dari baris header/baris 1) — dipakai
// supaya sheet lama (Pemasukan/Pengeluaran) otomatis dapat kolom "source"
// tanpa perlu diedit manual di spreadsheet, dan tanpa mengubah data lama.
function ensureColumn(sheet, headerName) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase() === headerName.toLowerCase()) return i + 1;
  }
  const newCol = lastCol + 1;
  sheet.getRange(1, newCol).setValue(headerName);
  return newCol;
}

function getIncomeSheet() { return getOrCreateSheet(SHEET_INCOME, ["id", "category", "amount", "note", "date", "user", "source"]); }
function getExpenseSheet() { return getOrCreateSheet(SHEET_EXPENSE, ["id", "category", "amount", "note", "date", "user", "source"]); }
function getCategoryIncomeSheet() { return getOrCreateCategorySheet(SHEET_CAT_INCOME, DEFAULT_CATEGORIES_INCOME); }
function getCategoryExpenseSheet() { return getOrCreateCategorySheet(SHEET_CAT_EXPENSE, DEFAULT_CATEGORIES_EXPENSE); }
function getUsersSheet() { return getOrCreateSheet(SHEET_USERS, ["username", "password", "displayName"]); }
function getLogSheet() { return getOrCreateSheet(SHEET_LOG, ["timestamp", "username", "action", "detail"]); }
function getDevicesSheet() { return getOrCreateSheet(SHEET_DEVICES, ["username", "token", "updatedAt"]); }
// Sheet baru untuk mencatat tarik tunai (Rekening -> Cash).
function getTransferSheet() { return getOrCreateSheet(SHEET_TRANSFER, ["id", "amount", "note", "date", "user"]); }

function readCategoryRows(sheet) {
  const rows = sheet.getDataRange().getValues();
  return rows
    .slice(1)
    .filter((r) => r[0] !== "" && r[0] !== null)
    .map((r) => ({
      id: String(r[0]),
      label: r[1] ? String(r[1]) : String(r[0]),
      icon: r[2] ? String(r[2]) : "•",
    }));
}

function getAllCategories() {
  return {
    income: readCategoryRows(getCategoryIncomeSheet()),
    expense: readCategoryRows(getCategoryExpenseSheet()),
  };
}

function formatDateCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

function readTransactionRows(sheet, type) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0] || [];
  let sourceIdx = -1;
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase() === "source") { sourceIdx = i; break; }
  }
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
      // Transaksi lama yang belum punya kolom/isi "source" default-nya
      // dianggap "rekening" (bukan "cash"), sesuai kondisi nyata: saldo
      // lama tersebut memang uang di rekening, bukan uang tunai fisik.
      source: sourceIdx >= 0 && r[sourceIdx] ? String(r[sourceIdx]) : "rekening",
    }));
}

// Tarik tunai selalu berarti uang berpindah dari Rekening ke Cash, jadi
// sumber dananya tidak perlu disimpan per baris — cukup ditandai tetap
// "rekening" di sini supaya perhitungan saldo dompet konsisten.
function readTransferRows() {
  const sheet = getTransferSheet();
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1);
  return data
    .filter((r) => r[0] !== "" && r[0] !== null)
    .map((r) => ({
      id: String(r[0]),
      type: "tarik_tunai",
      category: "",
      amount: Number(r[1]) || 0,
      note: r[2] ? String(r[2]) : "",
      date: formatDateCell(r[3]),
      user: r[4] ? String(r[4]) : "",
      source: "rekening",
    }));
}

function getAllTransactions() {
  const income = readTransactionRows(getIncomeSheet(), "income");
  const expense = readTransactionRows(getExpenseSheet(), "expense");
  const transfer = readTransferRows();
  return [...income, ...expense, ...transfer];
}

function getDisplayName(username) {
  const sheet = getUsersSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === String(username).toLowerCase()) {
      return rows[i][2] ? String(rows[i][2]) : username;
    }
  }
  return username;
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

  // ---- Tarik tunai: dicatat di sheet terpisah, tanpa kategori/sumber dana
  // (selalu berarti Rekening -> Cash). ----
  if (t.type === "tarik_tunai") {
    const sheet = getTransferSheet();
    sheet.appendRow([t.id, Number(t.amount), t.note || "", t.date || "", username]);
    logActivity(username, "tambah", `Tarik tunai Rp${t.amount} — ${t.note || "tanpa catatan"}`);

    const displayName = getDisplayName(username);
    sendPushToOthers(
      username,
      `${displayName} melakukan tarik tunai`,
      `Rp${Number(t.amount).toLocaleString("id-ID")} dipindahkan dari Rekening ke Cash`
    );
    return respondJson({ success: true });
  }

  // ---- Pemasukan / Pengeluaran biasa ----
  const sheet = t.type === "income" ? getIncomeSheet() : getExpenseSheet();
  const sourceCol = ensureColumn(sheet, "source");
  sheet.appendRow([t.id, t.category || "", Number(t.amount), t.note || "", t.date || "", username]);
  sheet.getRange(sheet.getLastRow(), sourceCol).setValue(t.source === "cash" ? "cash" : "rekening");

  logActivity(
    username,
    "tambah",
    `${t.type === "income" ? "Pemasukan" : "Pengeluaran"} ${t.category} Rp${t.amount} — ${t.note || "tanpa catatan"} (${t.source === "rekening" ? "Rekening" : "Cash"})`
  );

  const displayName = getDisplayName(username);
  const jenis = t.type === "income" ? "pemasukan" : "pengeluaran";
  const title = `${displayName} menambahkan ${jenis}`;
  const pesan = `${t.category} — Rp${Number(t.amount).toLocaleString("id-ID")} (${t.source === "rekening" ? "Rekening" : "Cash"})`;
  sendPushToOthers(username, title, pesan);

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
  const sheet = type === "income" ? getIncomeSheet() : type === "expense" ? getExpenseSheet() : getTransferSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      const label = type === "income" ? "pemasukan" : type === "expense" ? "pengeluaran" : "tarik tunai";
      logActivity(username, "hapus", `Hapus transaksi ${label} (id: ${id})`);
      break;
    }
  }
  return respondJson({ success: true });
}

function handleUpdateTransaction(body) {
  const t = body.transaction;
  const username = body.username || "tidak diketahui";
  if (!t || !t.id || !t.type) {
    return respondJson({ success: false, error: "Data transaksi tidak lengkap" });
  }

  // ---- Edit tarik tunai ----
  if (t.type === "tarik_tunai") {
    const sheet = getTransferSheet();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(t.id)) {
        sheet.getRange(i + 1, 2).setValue(Number(t.amount) || 0);
        sheet.getRange(i + 1, 3).setValue(t.note || "");
        sheet.getRange(i + 1, 4).setValue(t.date || "");
        logActivity(username, "edit", `Edit tarik tunai (id: ${t.id}) — Rp${t.amount}`);
        return respondJson({ success: true });
      }
    }
    return respondJson({ success: false, error: "Transaksi tidak ditemukan" });
  }

  // ---- Edit pemasukan / pengeluaran biasa ----
  const sheet = t.type === "income" ? getIncomeSheet() : getExpenseSheet();
  const sourceCol = ensureColumn(sheet, "source");
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(t.id)) {
      // Kolom: id, category, amount, note, date, user, source — kolom "id"
      // & "user" (pencatat asli) sengaja tidak diubah, cuma isi transaksinya.
      sheet.getRange(i + 1, 2).setValue(t.category || "");
      sheet.getRange(i + 1, 3).setValue(Number(t.amount) || 0);
      sheet.getRange(i + 1, 4).setValue(t.note || "");
      sheet.getRange(i + 1, 5).setValue(t.date || "");
      sheet.getRange(i + 1, sourceCol).setValue(t.source === "cash" ? "cash" : "rekening");
      logActivity(username, "edit", `Edit transaksi ${t.type === "income" ? "pemasukan" : "pengeluaran"} (id: ${t.id}) — ${t.category} Rp${t.amount}`);
      return respondJson({ success: true });
    }
  }
  return respondJson({ success: false, error: "Transaksi tidak ditemukan" });
}

/* ---------------- Daftarkan device untuk notifikasi push ---------------- */

function handleRegisterDevice(body) {
  const username = body.username || "tidak diketahui";
  const token = body.token;
  if (!token) return respondJson({ success: false, error: "Token tidak valid" });

  const sheet = getDevicesSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === token) {
      sheet.getRange(i + 1, 1).setValue(username);
      sheet.getRange(i + 1, 3).setValue(new Date());
      return respondJson({ success: true });
    }
  }
  sheet.appendRow([username, token, new Date()]);
  return respondJson({ success: true });
}

/* ---------------- Kelola kategori (tambah/edit/hapus) ---------------- */

function getCategorySheetByType(type) {
  return type === "income" ? getCategoryIncomeSheet() : getCategoryExpenseSheet();
}

function slugifyCategory(str) {
  const slug = String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "kategori";
}

function generateUniqueCategoryId(sheet, label) {
  const base = slugifyCategory(label);
  const existingIds = readCategoryRows(sheet).map((c) => c.id.toLowerCase());
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function handleAddCategory(body) {
  const type = body.type;
  const label = String(body.label || "").trim();
  const icon = String(body.icon || "🏷️").trim() || "🏷️";
  if ((type !== "income" && type !== "expense") || !label) {
    return respondJson({ success: false, error: "Data kategori tidak lengkap" });
  }
  const sheet = getCategorySheetByType(type);
  const id = generateUniqueCategoryId(sheet, label);
  sheet.appendRow([id, label, icon]);
  return respondJson({ success: true, category: { id, label, icon } });
}

function handleUpdateCategory(body) {
  const type = body.type;
  const id = body.id;
  const label = String(body.label || "").trim();
  const icon = String(body.icon || "").trim();
  if ((type !== "income" && type !== "expense") || !id) {
    return respondJson({ success: false, error: "Data tidak lengkap" });
  }
  const sheet = getCategorySheetByType(type);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      if (label) sheet.getRange(i + 1, 2).setValue(label);
      if (icon) sheet.getRange(i + 1, 3).setValue(icon);
      return respondJson({ success: true });
    }
  }
  return respondJson({ success: false, error: "Kategori tidak ditemukan" });
}

function handleDeleteCategory(body) {
  const type = body.type;
  const id = body.id;
  if ((type !== "income" && type !== "expense") || !id) {
    return respondJson({ success: false, error: "Data tidak lengkap" });
  }
  const sheet = getCategorySheetByType(type);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return respondJson({ success: true });
}


/* ---------------- Kirim push notification via Firebase Cloud Messaging ---------------- */

function sendPushToOthers(excludeUsername, title, body) {
  try {
    const props = PropertiesService.getScriptProperties();
    const projectId = props.getProperty("FCM_PROJECT_ID");
    if (!projectId) return; // Push belum disetel, lewati diam-diam.

    const sheet = getDevicesSheet();
    const rows = sheet.getDataRange().getValues();
    const tokens = new Set();
    for (let i = 1; i < rows.length; i++) {
      const username = String(rows[i][0] || "");
      const token = String(rows[i][1] || "");
      if (!token) continue;
      if (username.toLowerCase() === String(excludeUsername).toLowerCase()) continue;
      tokens.add(token);
    }
    if (tokens.size === 0) return;

    const accessToken = getFcmAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    // Kirim semua notifikasi SEKALIGUS secara paralel (fetchAll), bukan satu
    // per satu — supaya "Simpan Transaksi" tidak ikut lambat kalau device
    // yang terdaftar banyak. Waktu totalnya jadi ~1x request, bukan Nx.
    const requests = [...tokens].map((token) => ({
      url: url,
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + accessToken },
      payload: JSON.stringify({
        message: {
          token: token,
          notification: { title: title, body: body },
          webpush: { fcm_options: { link: "/" } },
        },
      }),
      muteHttpExceptions: true,
    }));
    UrlFetchApp.fetchAll(requests);
  } catch (err) {
    // Jangan sampai kegagalan kirim notifikasi menggagalkan penyimpanan transaksi utama.
  }
}

function getFcmAccessToken() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("fcm_access_token");
  if (cached) return cached;

  const props = PropertiesService.getScriptProperties();
  const clientEmail = props.getProperty("FCM_CLIENT_EMAIL");
  const privateKey = props.getProperty("FCM_PRIVATE_KEY").replace(/\\n/g, "\n");

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encClaim = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = encHeader + "." + encClaim;
  const signatureBytes = Utilities.computeRsaSha256Signature(signatureInput, privateKey);
  const encSignature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, "");
  const jwt = signatureInput + "." + encSignature;

  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    },
    muteHttpExceptions: true,
  });
  const json = JSON.parse(res.getContentText());
  if (!json.access_token) throw new Error("Gagal mendapatkan access token FCM: " + res.getContentText());
  cache.put("fcm_access_token", json.access_token, 3000); // cache 50 menit
  return json.access_token;
}

function base64UrlEncode(str) {
  return Utilities.base64EncodeWebSafe(str).replace(/=+$/, "");
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
