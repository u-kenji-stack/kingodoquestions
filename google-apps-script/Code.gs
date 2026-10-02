/**
 * 金吾堂まるわかり検定 - 回答結果ロガー
 *
 * セットアップ手順は README.md の「回答結果の記録」を参照してください。
 * このファイルの内容を、記録用スプレッドシートの
 * 拡張機能 → Apps Script → Code.gs に丸ごと貼り付けてください。
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("シート1")
      || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    var data = JSON.parse(e.postData.contents);
    var pct = data.total ? Math.round((data.score / data.total) * 100) : 0;

    sheet.appendRow([
      new Date(),
      data.name || "",
      data.category || "",
      data.categoryName || "",
      data.score,
      data.total,
      pct,
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
