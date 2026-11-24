/**
 * 金吾堂まるわかり検定 - 回答結果ロガー
 *
 * セットアップ手順は README.md の「回答結果の記録」を参照してください。
 * このファイルの内容を、記録用スプレッドシートの
 * 拡張機能 → Apps Script → Code.gs に丸ごと貼り付けてください。
 *
 * 1行目は見出し行として扱うため、2行目以降のB列(氏名)を集計対象にしています。
 */

function getSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("シート1")
    || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

// 指定した氏名が、すでに記録済み(回答済み)かどうかを調べる
function hasAlreadyAnswered_(name) {
  var trimmed = (name || "").trim();
  if (!trimmed) return false;
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var names = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // B列(氏名)
  for (var i = 0; i < names.length; i++) {
    if (String(names[i][0] || "").trim() === trimmed) {
      return true;
    }
  }
  return false;
}

// クイズ開始前の事前チェック用: GET ?name=xxx で呼び出す
function doGet(e) {
  var name = e.parameter && e.parameter.name;
  var alreadyAnswered = hasAlreadyAnswered_(name);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, alreadyAnswered: alreadyAnswered }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_();
    var data = JSON.parse(e.postData.contents);

    // 同じ氏名が既に記録済みの場合は、二重記録を防ぐため追記しない
    if (hasAlreadyAnswered_(data.name)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, alreadyAnswered: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

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
