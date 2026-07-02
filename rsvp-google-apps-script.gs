const RSVP_SHEET_NAME = "Respuestas";
const RSVP_SUMMARY_SHEET_NAME = "Resumen";

const RSVP_HEADERS = [
  "Fecha de respuesta",
  "Nombre",
  "Asistencia",
  "Numero de invitados",
  "Cancion",
  "Restriccion alimentaria",
  "Origen",
  "Navegador",
];

function doGet() {
  return jsonResponse_({ ok: true, message: "RSVP activo" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || "{}");

    if (payload.website) {
      return jsonResponse_({ ok: true, ignored: true });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(spreadsheet, RSVP_SHEET_NAME);
    ensureHeaders_(sheet, RSVP_HEADERS);

    sheet.appendRow([
      new Date(),
      clean_(payload.nombre),
      clean_(payload.asistencia),
      clean_(payload.invitados),
      clean_(payload.cancion),
      clean_(payload.restriccion),
      clean_(payload.origen),
      clean_(payload.userAgent),
    ]);

    updateSummary_(spreadsheet);

    return jsonResponse_({ ok: true });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function ensureHeaders_(sheet, headers) {
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = currentHeaders.some(Boolean);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function updateSummary_(spreadsheet) {
  const responses = getOrCreateSheet_(spreadsheet, RSVP_SHEET_NAME);
  const lastRow = responses.getLastRow();
  const rows = lastRow > 1 ? responses.getRange(2, 1, lastRow - 1, RSVP_HEADERS.length).getValues() : [];
  const confirmedText = "¡Absolutamente! No me lo perdería.";
  const declinedText = "No podré asistir esta vez.";
  let confirmed = 0;
  let declined = 0;
  let confirmedGuests = 0;

  rows.forEach((row) => {
    const attendance = row[2];
    const guests = Number(row[3]) || 0;

    if (attendance === confirmedText) {
      confirmed += 1;
      confirmedGuests += guests;
    }

    if (attendance === declinedText) {
      declined += 1;
    }
  });

  const summary = getOrCreateSheet_(spreadsheet, RSVP_SUMMARY_SHEET_NAME);
  summary.clear();

  summary.getRange("A1:B5").setValues([
    ["Dato", "Total"],
    ["Confirmados", confirmed],
    ["No asistiran", declined],
    ["Invitados confirmados", confirmedGuests],
    ["Total de respuestas", rows.length],
  ]);

  summary.setFrozenRows(1);
  summary.autoResizeColumns(1, 2);
}

function clean_(value) {
  return String(value || "").trim();
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
