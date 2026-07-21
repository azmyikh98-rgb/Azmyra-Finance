/**
 * AZMYRA FINANCE — Apps Script backend
 * Menjadikan Google Spreadsheet sebagai "database" bersama untuk aplikasi.
 *
 * CARA PAKAI (ringkas — panduan lengkap ada di README.md):
 * 1. Buat Google Spreadsheet baru.
 * 2. Extensions -> Apps Script, hapus isi default, tempel seluruh isi file ini.
 * 3. Deploy -> New deployment -> Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Salin URL yang diberikan, tempel ke CONFIG.API_URL di js/app.js
 */

const SHEET_NAME = "Transaksi";

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

  if (action === "add") {
    addTransaction(body.transaction);
    return respondJson({ success: true });
  }

  if (action === "delete") {
    deleteTransaction(body.id);
    return respondJson({ success: true });
  }

  return respondJson({ success: false, error: "Aksi tidak dikenal" });
}

/* ---------------- Helpers ---------------- */

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["id", "type", "category", "amount", "note", "date"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getAllTransactions() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1); // buang baris header
  return data
    .filter((r) => r[0] !== "" && r[0] !== null)
    .map((r) => ({
      id: String(r[0]),
      type: String(r[1]),
      category: String(r[2]),
      amount: Number(r[3]) || 0,
      note: r[4] ? String(r[4]) : "",
      date: formatDateCell(r[5]),
    }));
}

function formatDateCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

function addTransaction(t) {
  if (!t || !t.id || !t.type || !t.amount) return;
  const sheet = getSheet();
  sheet.appendRow([t.id, t.type, t.category || "", Number(t.amount), t.note || "", t.date || ""]);
}

function deleteTransaction(id) {
  if (!id) return;
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function respondJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
