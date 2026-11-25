/**
 * Google Apps Script for Synchronizing 3 Headers:
 * Header 1 (Col A): "1.  TPA / INS. NAME"
 * Header 2 (Col B): "2. INSURANCE COMPANY"
 * Header 3 (Col C): "3. INSURANCE / TPA ADDRESS"
 */
export const TPA_INSURANCE_TWO_HEADER_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: TPA / INS. NAME, INSURANCE COMPANY & ADDRESS SYNC (3 HEADERS)
 * =========================================================================
 *
 * Setup:
 * 1. Open your Google Spreadsheet (where your TPA & Insurance data is).
 * 2. Sheet 1 (Sheet1):
 *      Column A: 1.  TPA / INS. NAME
 *      Column B: 2. INSURANCE COMPANY (Optional mirror)
 *      Column C: 3. INSURANCE / TPA ADDRESS
 * 3. Sheet 2 (Sheet2):
 *      Contains: 2. INSURANCE COMPANY list (Row 1 Header: "2. INSURANCE COMPANY", Rows 2+: Company names)
 * 4. Go to: Extensions > Apps Script.
 * 5. Delete existing code, paste this script into Code.gs, and click Save (💾).
 * 6. Click "Deploy" > "New deployment".
 * 7. Select type: "Web App"
 * 8. Set:
 *      - Description: TPA, Insurance Company & Address Live 3-Columns Sync
 *      - Execute as: "Me"
 *      - Who has access: "Anyone" (Required so the application can sync)
 * 9. Click "Deploy", authorize access, and copy the Web App URL.
 * 10. Paste the URL into the app's Sync Settings and click "Save Permanent in Code"!
 *
 * Features:
 * - Automatic Auto-Load on startup & refresh: pulls Col A from Sheet 1, Col B from Sheet 2, Col C from Sheet 1!
 * - Selective Single Column loading:
 *     - Request ?col=A: returns strictly Col A (1. TPA / INS. NAME) from Sheet 1
 *     - Request ?col=B: returns strictly Col B (2. INSURANCE COMPANY) from Sheet 2
 *     - Request ?col=C: returns strictly Col C (3. INSURANCE / TPA ADDRESS) from Sheet 1
 * - Automatic 7-word deduplication without dropping valid company names
 * - Two-Way live sync: Send to Sheet & Load from Sheet with full address preservation
 */

// Deduplication helper: Check if two names match in the starting first 7 words (only when both have 7+ words, or exact match)
function isDuplicate7Words(name1, name2) {
  if (!name1 || !name2) return false;
  var c1 = String(name1).toUpperCase().replace(/[^\\w\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
  var c2 = String(name2).toUpperCase().replace(/[^\\w\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
  if (c1 === c2) return true;

  var w1 = c1.split(' ').filter(Boolean);
  var w2 = c2.split(' ').filter(Boolean);
  if (w1.length === 0 || w2.length === 0) return false;

  // If both have 7 or more words and first 7 words match exactly
  if (w1.length >= 7 && w2.length >= 7) {
    var key1 = w1.slice(0, 7).join(' ');
    var key2 = w2.slice(0, 7).join(' ');
    if (key1 === key2) return true;
  }
  return false;
}

// Deduplication helper: Filters list to remove duplicate entries matching first 7 words
function filterUnique7Words(list) {
  var unique = [];
  var skippedCount = 0;
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var val = (typeof item === 'object' && item !== null) ? (item.name || item.tpaName || item.companyName || '') : String(item || '');
    val = String(val).trim().toUpperCase();
    if (!val || val === 'TPA / INS. NAME' || val === 'TPA/INS. NAME' || val === '1.  TPA / INS. NAME' || val === '1. TPA / INS. NAME' || val === 'INSURANCE COMPANY' || val === '2. INSURANCE COMPANY' || val === 'SR NO') continue;

    var isDup = false;
    for (var u = 0; u < unique.length; u++) {
      var existingVal = (typeof unique[u] === 'object' && unique[u] !== null) ? (unique[u].name || unique[u].tpaName || unique[u].companyName || '') : String(unique[u] || '');
      if (isDuplicate7Words(val, existingVal)) {
        isDup = true;
        skippedCount++;
        // If existing item lacks address but current has one, update it
        if (typeof item === 'object' && item !== null && item.address) {
          if (typeof unique[u] === 'object' && unique[u] !== null && !unique[u].address) {
            unique[u].address = item.address;
          }
        }
        break;
      }
    }
    if (!isDup) {
      if (typeof item === 'object' && item !== null) {
        unique.push({ name: val, address: item.address || '' });
      } else {
        unique.push(val);
      }
    }
  }
  return { list: unique, skippedCount: skippedCount };
}

function getTpaSheet(ss) {
  var preferred = ["Sheet1", "TPA & Insurance", "TPAs & Insurance", "TPAs", "Sheet 1"];
  for (var i = 0; i < preferred.length; i++) {
    var s = ss.getSheetByName(preferred[i]);
    if (s && s.getLastRow() > 0) return s;
  }
  var sheets = ss.getSheets();
  for (var j = 0; j < sheets.length; j++) {
    var sh = sheets[j];
    if (sh.getLastRow() > 0) {
      var top = sh.getRange(1, 1, 1, Math.min(sh.getLastColumn(), 5)).getDisplayValues()[0];
      var str = top.join(" ").toLowerCase();
      if (str.indexOf("tpa") !== -1 || str.indexOf("1.") !== -1) {
        return sh;
      }
    }
  }
  return ss.getSheets()[0];
}

function getInsuranceSheet(ss) {
  // Specifically look for Sheet 2 (Sheet2) for 2. INSURANCE COMPANY (Col B)
  var preferred = ["Sheet2", "Sheet 2", "Insurance", "Insurers", "Insurance Companies", "Insurance Company", "List 2", "Data 2"];
  for (var i = 0; i < preferred.length; i++) {
    var s = ss.getSheetByName(preferred[i]);
    if (s && s.getLastRow() > 0) return s;
  }
  var sheets = ss.getSheets();
  // If spreadsheet has 2 or more sheets, 2nd sheet is Sheet 2
  if (sheets.length > 1 && sheets[1].getLastRow() > 0) {
    return sheets[1];
  }
  for (var j = 0; j < sheets.length; j++) {
    var sh = sheets[j];
    if (sh.getLastRow() > 0) {
      var top = sh.getRange(1, 1, 1, Math.min(sh.getLastColumn(), 5)).getDisplayValues()[0];
      var str = top.join(" ").toLowerCase();
      if ((str.indexOf("insurance") !== -1 && str.indexOf("tpa") === -1) || str.indexOf("2.") !== -1) {
        return sh;
      }
    }
  }
  // Fallback to Sheet 1 if no separate Sheet 2
  return getTpaSheet(ss);
}

// Helper to extract Insurance Companies strictly from Sheet 2 (with Sheet 1 fallback)
function extractInsurersFromSheet(sheet2, fallbackSheet1) {
  var rawIns = [];
  if (sheet2 && sheet2.getLastRow() > 0) {
    var data2 = sheet2.getDataRange().getDisplayValues();
    if (data2.length >= 1) {
      var hRow = (data2[0] || []).map(function(h) { return String(h || '').trim().toLowerCase(); });
      var targetCol = 0;
      for (var c = 0; c < hRow.length; c++) {
        var h = hRow[c];
        if (h.indexOf("2.") === 0 || h.indexOf("2. ") !== -1 || h.indexOf("insurance company") !== -1 || h.indexOf("insurance co") !== -1 || (h.indexOf("insurance") !== -1 && h.indexOf("tpa") === -1 && h.indexOf("addr") === -1)) {
          targetCol = c;
          break;
        }
      }
      var hasHeader = (hRow[targetCol].indexOf("2.") !== -1 || hRow[targetCol].indexOf("insurance") !== -1 || hRow[targetCol].indexOf("company") !== -1);
      var startR = (data2.length > 1 && hasHeader) ? 1 : 0;
      for (var r = startR; r < data2.length; r++) {
        var val = (targetCol < data2[r].length) ? String(data2[r][targetCol] || '').trim().toUpperCase() : '';
        if (val && !val.startsWith("SR NO") && !val.startsWith("HTTP") && !val.startsWith("<") && !val.includes("@") &&
            val !== "INSURANCE COMPANY" && val !== "2. INSURANCE COMPANY" && val !== "2.  INSURANCE COMPANY" && val !== "2.INSURANCE COMPANY" && val !== "2. INSURANCE" && val !== "INS. COMPANY") {
          rawIns.push(val);
        }
      }
    }
  }

  // Fallback to Sheet 1 Col B if Sheet 2 was empty
  if (rawIns.length === 0 && fallbackSheet1 && fallbackSheet1 !== sheet2 && fallbackSheet1.getLastRow() > 1) {
    var data1 = fallbackSheet1.getDataRange().getDisplayValues();
    var h1 = (data1[0] || []).map(function(h) { return String(h || '').trim().toLowerCase(); });
    var colBIdx = 1;
    for (var c1 = 1; c1 < h1.length; c1++) {
      if (h1[c1].indexOf("2.") !== -1 || h1[c1].indexOf("insurance") !== -1) {
        colBIdx = c1;
        break;
      }
    }
    for (var r1 = 1; r1 < data1.length; r1++) {
      if (colBIdx < data1[r1].length) {
        var val1 = String(data1[r1][colBIdx] || '').trim().toUpperCase();
        if (val1 && !val1.startsWith("SR NO") && !val1.startsWith("HTTP") && !val1.startsWith("<") && !val1.includes("@") &&
            val1 !== "INSURANCE COMPANY" && val1 !== "2. INSURANCE COMPANY" && val1 !== "2.  INSURANCE COMPANY") {
          rawIns.push(val1);
        }
      }
    }
  }

  return filterUnique7Words(rawIns);
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet1 = getTpaSheet(ss);       // Sheet 1: Col A (1.  TPA / INS. NAME) & Col C (3. INSURANCE / TPA ADDRESS)
    var sheet2 = getInsuranceSheet(ss); // Sheet 2: Col B (2. INSURANCE COMPANY)
    var data = sheet1.getDataRange().getDisplayValues();

    if (!data || data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        headersSynced: ["1.  TPA / INS. NAME", "2. INSURANCE COMPANY", "3. INSURANCE / TPA ADDRESS"],
        colA: [],
        colB: [],
        colC: {},
        tpas: [],
        insuranceCompanies: [],
        tpaAddresses: {},
        message: "No data rows found"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Locate headers with strict column isolation:
    // 1st Column (Col A) = Index 0: "1.  TPA / INS. NAME"
    // 2nd Column (Col B) = Index 1: "2. INSURANCE COMPANY"
    // 3rd Column (Col C) = Index 2: "3. INSURANCE / TPA ADDRESS"
    var headerRow = (data[0] || []).map(function(h) { return String(h || '').trim().toLowerCase(); });
    
    var tpaColIdx = 0;
    var insColIdx = (data[0].length > 1) ? 1 : 0;
    var addrColIdx = (data[0].length > 2) ? 2 : -1;

    for (var col = 0; col < headerRow.length; col++) {
      var h = headerRow[col];
      // TPA Column: Index 0 or starts with 1.
      if (h.indexOf("1.") === 0 || h.indexOf("1. ") !== -1 || (h.indexOf("tpa") !== -1 && h.indexOf("addr") === -1 && h.indexOf("bank") === -1)) {
        tpaColIdx = col;
      }
      // Insurance Company Column: Strictly 2. or insurance company (never Col A)
      if (h.indexOf("2.") === 0 || h.indexOf("2. ") !== -1 || h.indexOf("insurance company") !== -1 || h.indexOf("insurance co") !== -1 || (col === 1 && h.indexOf("insurance") !== -1 && h.indexOf("addr") === -1)) {
        insColIdx = col;
      }
      // Address Column: Strictly 3. or address
      if (h.indexOf("3.") === 0 || h.indexOf("3. ") !== -1 || h.indexOf("address") !== -1 || h.indexOf("addr") !== -1) {
        addrColIdx = col;
      }
    }

    // Safety checks: ensure Col B NEVER reads Col A, and Col A is 0, Col B is 1, Col C is 2
    if (data[0].length >= 2 && insColIdx === tpaColIdx) {
      insColIdx = 1;
      tpaColIdx = 0;
    }
    if (data[0].length >= 3 && addrColIdx === -1) {
      addrColIdx = 2;
    }

    // Check requested column filter (?col=A, ?col=B, ?col=C or action=getColA/B/C)
    var colParam = "";
    if (e && e.parameter) {
      colParam = String(e.parameter.col || e.parameter.column || e.parameter.targetCol || "").trim().toUpperCase();
    }
    var actionParam = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : "";

    // OPTION 1: Request strictly 2nd Col (Col B: 2. INSURANCE COMPANY) - Loaded from Sheet 2
    if (colParam === "B" || colParam === "2" || actionParam === "getColB") {
      var dedupedInsOnly = extractInsurersFromSheet(sheet2, sheet1);
      var resB = {
        status: "success",
        column: "B",
        sheetSource: sheet2.getName(),
        header: "2. INSURANCE COMPANY",
        count: dedupedInsOnly.list.length,
        colB: dedupedInsOnly.list,
        insuranceCompanies: dedupedInsOnly.list,
        insurers: dedupedInsOnly.list,
        list: dedupedInsOnly.list,
        duplicatesSkipped: dedupedInsOnly.skippedCount,
        timestamp: new Date().toISOString()
      };
      return ContentService.createTextOutput(JSON.stringify(resB)).setMimeType(ContentService.MimeType.JSON);
    }

    // OPTION 2: Request strictly 1st Col (Col A: 1.  TPA / INS. NAME) - Do not collect data from other columns!
    if (colParam === "A" || colParam === "1" || actionParam === "getColA") {
      var rawTpaOnly = [];
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        if (tpaColIdx >= 0 && tpaColIdx < row.length) {
          var tpaVal = String(row[tpaColIdx] || '').trim().toUpperCase();
          if (tpaVal && !tpaVal.startsWith("SR NO") && !tpaVal.startsWith("HTTP") && !tpaVal.startsWith("<") && !tpaVal.includes("@") && tpaVal !== "TPA / INS. NAME" && tpaVal !== "1. TPA / INS. NAME" && tpaVal !== "1.  TPA / INS. NAME" && tpaVal !== "1.TPA / INS. NAME" && tpaVal !== "1. TPA" && tpaVal !== "TPA NAME") {
            rawTpaOnly.push(tpaVal);
          }
        }
      }
      var dedupedTpaOnly = filterUnique7Words(rawTpaOnly);
      var resA = {
        status: "success",
        column: "A",
        header: "1.  TPA / INS. NAME",
        count: dedupedTpaOnly.list.length,
        colA: dedupedTpaOnly.list,
        tpas: dedupedTpaOnly.list,
        tpaNames: dedupedTpaOnly.list,
        list: dedupedTpaOnly.list,
        duplicatesSkipped: dedupedTpaOnly.skippedCount,
        timestamp: new Date().toISOString()
      };
      return ContentService.createTextOutput(JSON.stringify(resA)).setMimeType(ContentService.MimeType.JSON);
    }

    // OPTION 3: Request strictly 3rd Col (Col C: 3. INSURANCE / TPA ADDRESS) - Do not collect data from other columns!
    if (colParam === "C" || colParam === "3" || actionParam === "getColC") {
      var addrOnlyMap = {};
      var addrArrayList = [];
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var tpaVal = (tpaColIdx >= 0 && tpaColIdx < row.length) ? String(row[tpaColIdx] || '').trim().toUpperCase() : "";
        var addrVal = (addrColIdx >= 0 && addrColIdx < row.length) ? String(row[addrColIdx] || '').trim().toUpperCase() : "";
        if (addrVal && addrVal !== "-" && addrVal !== "N/A" && !addrVal.startsWith("HTTP") && !addrVal.startsWith("<") && addrVal !== "INSURANCE / TPA ADDRESS" && addrVal !== "3. INSURANCE / TPA ADDRESS") {
          var targetKey = (tpaVal && !tpaVal.startsWith("1.") && tpaVal !== "TPA / INS. NAME") ? tpaVal : ("ENTRY_" + r);
          addrOnlyMap[targetKey] = addrVal;
          addrArrayList.push({ tpa: targetKey, address: addrVal });
        }
      }
      var resC = {
        status: "success",
        column: "C",
        header: "3. INSURANCE / TPA ADDRESS",
        count: Object.keys(addrOnlyMap).length,
        colC: addrOnlyMap,
        addresses: addrOnlyMap,
        tpaAddresses: addrOnlyMap,
        list: addrArrayList,
        timestamp: new Date().toISOString()
      };
      return ContentService.createTextOutput(JSON.stringify(resC)).setMimeType(ContentService.MimeType.JSON);
    }

    // OPTION 4: Default - Return all 3 Columns cleanly separated:
    // Col A & Col C loaded from Sheet 1
    // Col B loaded from Sheet 2 (Sheet2)
    var rawTpasFromSheet = [];
    var tpaAddressMap = {};

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      
      // 1st Column: 1.  TPA / INS. NAME (from Sheet 1)
      var tpaVal = "";
      if (tpaColIdx >= 0 && tpaColIdx < row.length) {
        tpaVal = String(row[tpaColIdx] || '').trim().toUpperCase();
        if (tpaVal && !tpaVal.startsWith("SR NO") && !tpaVal.startsWith("HTTP") && !tpaVal.startsWith("<") && !tpaVal.includes("@") && tpaVal !== "TPA / INS. NAME" && tpaVal !== "1. TPA / INS. NAME" && tpaVal !== "1.  TPA / INS. NAME" && tpaVal !== "1.TPA / INS. NAME" && tpaVal !== "1. TPA" && tpaVal !== "TPA NAME") {
          rawTpasFromSheet.push(tpaVal);
        }
      }

      // 3rd Column: 3. INSURANCE / TPA ADDRESS (from Sheet 1)
      if (addrColIdx >= 0 && addrColIdx < row.length) {
        var addrVal = String(row[addrColIdx] || '').trim().toUpperCase();
        if (addrVal && addrVal !== "-" && addrVal !== "N/A" && !addrVal.startsWith("HTTP") && !addrVal.startsWith("<") && addrVal !== "INSURANCE / TPA ADDRESS" && addrVal !== "3. INSURANCE / TPA ADDRESS") {
          var targetKey = (tpaVal && !tpaVal.startsWith("1.") && tpaVal !== "TPA / INS. NAME") ? tpaVal : ("ENTRY_" + r);
          tpaAddressMap[targetKey] = addrVal;
        }
      }
    }

    // Deduplicate lists strictly matching first 7 words and exact prefix
    var tpaFiltered = filterUnique7Words(rawTpasFromSheet);
    // Extract 2. INSURANCE COMPANY strictly from Sheet 2 (Sheet2)
    var insFiltered = extractInsurersFromSheet(sheet2, sheet1);

    var response = {
      status: "success",
      headersSynced: ["1.  TPA / INS. NAME", "2. INSURANCE COMPANY", "3. INSURANCE / TPA ADDRESS"],
      sheetSources: {
        colA: sheet1.getName(),
        colB: sheet2.getName(),
        colC: sheet1.getName()
      },
      tpasCount: tpaFiltered.list.length,
      insuranceCount: insFiltered.list.length,
      addressCount: Object.keys(tpaAddressMap).length,
      colA: tpaFiltered.list,
      colB: insFiltered.list,
      colC: tpaAddressMap,
      tpas: tpaFiltered.list,
      tpaNames: tpaFiltered.list,
      insuranceCompanies: insFiltered.list,
      insurers: insFiltered.list,
      tpaAddresses: tpaAddressMap,
      addresses: tpaAddressMap,
      duplicatesSkipped: tpaFiltered.skippedCount + insFiltered.skippedCount,
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet1 = getTpaSheet(ss);       // Sheet 1: Col A (TPAs) & Col C (Addresses)
    var sheet2 = getInsuranceSheet(ss); // Sheet 2: Col B (2. INSURANCE COMPANY)
    if (!sheet2 || sheet2 === sheet1) {
      sheet2 = ss.getSheetByName("Sheet2") || ss.getSheetByName("Sheet 2") || ss.insertSheet("Sheet2");
    }

    var postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }

    var action = postData.action || "";

    // 1. BULK PUSH: Write all 3 Columns across Sheet 1 & Sheet 2
    // Sheet 1: Col A (1.  TPA / INS. NAME), Col B (2. INSURANCE COMPANY), Col C (3. INSURANCE / TPA ADDRESS)
    // Sheet 2: Col A (2. INSURANCE COMPANY list)
    if (action === "syncAllMetadata" || action === "syncTwoHeaders" || action === "syncThreeHeaders" || Array.isArray(postData.tpas) || Array.isArray(postData.tpaNames) || Array.isArray(postData.insuranceCompanies)) {
      var headers1 = ["1.  TPA / INS. NAME", "2. INSURANCE COMPANY", "3. INSURANCE / TPA ADDRESS"];
      
      // Ensure Sheet 1 Row 1 has 3 headers
      sheet1.getRange(1, 1, 1, 3).setValues([headers1]);
      sheet1.setFrozenRows(1);
      
      var headerRange1 = sheet1.getRange(1, 1, 1, 3);
      headerRange1.setFontWeight("bold")
                  .setFontFamily("Arial")
                  .setFontSize(11)
                  .setBackground("#1E1B4B")
                  .setFontColor("#FFFFFF")
                  .setVerticalAlignment("middle")
                  .setHorizontalAlignment("left");
      headerRange1.setBorder(true, true, true, true, true, true, "#475569", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      sheet1.setRowHeight(1, 38);

      // Extract & Deduplicate TPA list by starting first 7 words (preserving address)
      var rawTpas = postData.tpas || postData.tpaNames || postData.tpaList || [];
      var tpaFilterRes = filterUnique7Words(rawTpas);
      var tpaList = tpaFilterRes.list;

      // Extract & Deduplicate Insurance Company list by starting first 7 words
      var rawIns = postData.insuranceCompanies || postData.insuranceList || [];
      var insFilterRes = filterUnique7Words(rawIns);
      var insList = insFilterRes.list;

      // Extract Address lookup map
      var tpaAddressMap = postData.tpaAddresses || postData.addresses || {};

      // Clear previous data rows across Sheet 1
      var lastRow1 = sheet1.getLastRow();
      if (lastRow1 > 1) {
        sheet1.getRange(2, 1, lastRow1 - 1, Math.max(3, sheet1.getLastColumn())).clearContent().clearFormat();
      }

      // Prepare 3-column matrix for Sheet 1
      var maxRows = Math.max(tpaList.length, insList.length);
      var rows1 = [];
      var addressCount = 0;

      for (var i = 0; i < maxRows; i++) {
        var tpaItem = i < tpaList.length ? tpaList[i] : "";
        var tpaCol = (typeof tpaItem === 'object' && tpaItem !== null) ? (tpaItem.name || tpaItem.tpaName || "") : String(tpaItem || "");
        var insItem = i < insList.length ? insList[i] : "";
        var insCol = (typeof insItem === 'object' && insItem !== null) ? (insItem.name || insItem.companyName || "") : String(insItem || "");
        
        var addrCol = "";
        if (tpaCol) {
          if (typeof tpaItem === 'object' && tpaItem !== null && tpaItem.address) {
            addrCol = String(tpaItem.address).trim().toUpperCase();
          } else if (tpaAddressMap[tpaCol]) {
            addrCol = String(tpaAddressMap[tpaCol]).trim().toUpperCase();
          }
          if (addrCol) addressCount++;
        }

        rows1.push([tpaCol, insCol, addrCol]);
      }

      if (rows1.length > 0) {
        var dataRange1 = sheet1.getRange(2, 1, rows1.length, 3);
        dataRange1.setNumberFormat('@');
        dataRange1.setValues(rows1);
        dataRange1.setFontFamily("Arial");
        dataRange1.setFontSize(10);
        dataRange1.setVerticalAlignment("middle");
        dataRange1.setHorizontalAlignment("left");
        dataRange1.setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
        for (var r1 = 2; r1 <= rows1.length + 1; r1++) {
          sheet1.setRowHeight(r1, 26);
        }
      }

      sheet1.autoResizeColumns(1, 3);
      sheet1.setColumnWidth(1, Math.min(Math.max(sheet1.getColumnWidth(1) + 24, 250), 450));
      sheet1.setColumnWidth(2, Math.min(Math.max(sheet1.getColumnWidth(2) + 24, 250), 450));
      sheet1.setColumnWidth(3, Math.min(Math.max(sheet1.getColumnWidth(3) + 24, 300), 650));

      // 2. PRESERVE & MERGE 2. INSURANCE COMPANY IN SHEET 2 (Sheet2) COL A - NEVER DELETE EXISTING DATA!
      if (sheet2) {
        sheet2.getRange(1, 1).setValue("2. INSURANCE COMPANY");
        sheet2.setFrozenRows(1);
        var headerRange2 = sheet2.getRange(1, 1);
        headerRange2.setFontWeight("bold")
                    .setFontFamily("Arial")
                    .setFontSize(11)
                    .setBackground("#1E1B4B")
                    .setFontColor("#FFFFFF")
                    .setVerticalAlignment("middle")
                    .setHorizontalAlignment("left");
        sheet2.setRowHeight(1, 38);

        // Read all EXISTING insurance companies already in Sheet 2 Col A
        var existingInsurers = [];
        var existingMap = {};
        var lastRow2 = sheet2.getLastRow();
        if (lastRow2 > 1) {
          var curVals2 = sheet2.getRange(2, 1, lastRow2 - 1, 1).getDisplayValues();
          for (var e2 = 0; e2 < curVals2.length; e2++) {
            var valExisting = String(curVals2[e2][0] || '').trim().toUpperCase();
            if (valExisting && !valExisting.startsWith("SR NO") && !valExisting.startsWith("2.") && valExisting !== "INSURANCE COMPANY") {
              if (!existingMap[valExisting]) {
                existingMap[valExisting] = true;
                existingInsurers.push(valExisting);
              }
            }
          }
        }

        // Merge existing Sheet 2 Col A companies with incoming insList (never delete existing data!)
        var finalInsList = existingInsurers.slice();
        for (var iIdx = 0; iIdx < insList.length; iIdx++) {
          var inItem = insList[iIdx];
          var inName = (typeof inItem === 'object' && inItem !== null) ? (inItem.name || inItem.companyName || "") : String(inItem || "");
          inName = inName.trim().toUpperCase();
          if (!inName || inName.startsWith("SR NO") || inName.startsWith("2.") || inName === "INSURANCE COMPANY") continue;

          var dupFound = false;
          for (var fIdx = 0; fIdx < finalInsList.length; fIdx++) {
            if (isDuplicate7Words(inName, finalInsList[fIdx]) || inName === finalInsList[fIdx]) {
              dupFound = true;
              break;
            }
          }
          if (!dupFound) {
            finalInsList.push(inName);
            existingMap[inName] = true;
          }
        }

        if (finalInsList.length > 0) {
          var insMatrix = finalInsList.map(function(item) {
            return [item];
          });
          var dataRange2 = sheet2.getRange(2, 1, insMatrix.length, 1);
          dataRange2.setNumberFormat('@');
          dataRange2.setValues(insMatrix);
          dataRange2.setFontFamily("Arial");
          dataRange2.setFontSize(10);
          dataRange2.setVerticalAlignment("middle");
          dataRange2.setHorizontalAlignment("left");
          dataRange2.setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
          for (var r2 = 2; r2 <= insMatrix.length + 1; r2++) {
            sheet2.setRowHeight(r2, 26);
          }
        }
        sheet2.autoResizeColumns(1, 1);
        sheet2.setColumnWidth(1, Math.min(Math.max(sheet2.getColumnWidth(1) + 24, 250), 500));
      }

      var totalSkippedDups = tpaFilterRes.skippedCount + insFilterRes.skippedCount;

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "✓ Successfully written " + tpaList.length + " TPAs (Col A: Sheet 1), " + insList.length + " Insurance Companies (Col B: Sheet 2 & Sheet 1), and " + addressCount + " Addresses (Col C: Sheet 1)!",
        headers: ["1.  TPA / INS. NAME", "2. INSURANCE COMPANY", "3. INSURANCE / TPA ADDRESS"],
        sheetSources: { colA: sheet1.getName(), colB: sheet2.getName(), colC: sheet1.getName() },
        tpasCount: tpaList.length,
        insuranceCount: insList.length,
        addressCount: addressCount,
        duplicatesSkipped: totalSkippedDups,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. SINGLE TPA & ADDRESS ADDITION (Sheet 1)
    if (action === "saveTpa" || action === "addTpa" || postData.tpaName) {
      var tName = String(postData.tpaName || postData.name || "").trim().toUpperCase();
      var tAddr = String(postData.address || postData.insuranceAddress || "").trim().toUpperCase();
      if (tName) {
        var lastR = sheet1.getLastRow();
        var foundRow = -1;
        if (lastR > 1) {
          var valsA = sheet1.getRange(2, 1, lastR - 1, 1).getValues();
          for (var a = 0; a < valsA.length; a++) {
            var existingA = String(valsA[a][0]).trim().toUpperCase();
            if (isDuplicate7Words(existingA, tName)) {
              foundRow = a + 2;
              break;
            }
          }
        }
        if (foundRow === -1) {
          var nextEmptyA = 2;
          if (lastR >= 2) {
            var fullA = sheet1.getRange(2, 1, lastR - 1, 1).getValues();
            for (var k = 0; k < fullA.length; k++) {
              if (String(fullA[k][0]).trim() !== "") {
                nextEmptyA = k + 3;
              }
            }
          }
          sheet1.getRange(nextEmptyA, 1).setValue(tName).setNumberFormat('@');
          if (tAddr) {
            sheet1.getRange(nextEmptyA, 3).setValue(tAddr).setNumberFormat('@');
          }
        } else if (tAddr) {
          sheet1.getRange(foundRow, 3).setValue(tAddr).setNumberFormat('@');
        }
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: foundRow !== -1 ? "TPA already present, address updated in Col C: " + tName : "TPA saved to Col A & Address saved to Col C: " + tName
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 3. SAVE / UPDATE TPA ADDRESS SPECIFICALLY (Col C in Sheet 1)
    if (action === "saveAddress" || action === "saveTpaAddress" || action === "updateAddress") {
      var targetTpa = String(postData.tpaName || postData.name || "").trim().toUpperCase();
      var newAddr = String(postData.address || postData.insuranceAddress || "").trim().toUpperCase();
      if (targetTpa && newAddr) {
        var lastR_addr = sheet1.getLastRow();
        var matchedR = -1;
        if (lastR_addr > 1) {
          var colAData = sheet1.getRange(2, 1, lastR_addr - 1, 1).getValues();
          for (var r_idx = 0; r_idx < colAData.length; r_idx++) {
            var existingTpa = String(colAData[r_idx][0]).trim().toUpperCase();
            if (isDuplicate7Words(existingTpa, targetTpa) || existingTpa === targetTpa) {
              matchedR = r_idx + 2;
              break;
            }
          }
        }
        if (matchedR !== -1) {
          sheet1.getRange(matchedR, 3).setValue(newAddr).setNumberFormat('@');
        } else {
          var newRowIdx = Math.max(lastR_addr + 1, 2);
          sheet1.getRange(newRowIdx, 1).setValue(targetTpa).setNumberFormat('@');
          sheet1.getRange(newRowIdx, 3).setValue(newAddr).setNumberFormat('@');
        }
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "✓ Address successfully saved into Col C (3. INSURANCE / TPA ADDRESS) for TPA: " + targetTpa
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 4. SINGLE INSURANCE COMPANY ADDITION (Saves to Sheet 2 & Sheet 1)
    if (action === "saveInsuranceCompany" || action === "addInsuranceCompany" || postData.companyName || postData.insuranceCompany) {
      var cName = String(postData.companyName || postData.insuranceCompany || "").trim().toUpperCase();
      if (cName) {
        // Save to Sheet 2
        var lastR2 = sheet2.getLastRow();
        var found2 = false;
        if (lastR2 > 1) {
          var vals2 = sheet2.getRange(2, 1, lastR2 - 1, 1).getValues();
          for (var b = 0; b < vals2.length; b++) {
            var existingB = String(vals2[b][0]).trim().toUpperCase();
            if (isDuplicate7Words(existingB, cName) || existingB === cName) {
              found2 = true;
              break;
            }
          }
        }
        if (!found2) {
          var nextEmpty2 = Math.max(lastR2 + 1, 2);
          sheet2.getRange(nextEmpty2, 1).setValue(cName).setNumberFormat('@');
          // Also mirror in Sheet 1 Col B
          var lastR1 = sheet1.getLastRow();
          sheet1.getRange(Math.max(lastR1 + 1, 2), 2).setValue(cName).setNumberFormat('@');
        }
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: found2 ? "Insurance Company already present in Sheet 2, skipped duplicate" : "Insurance Company saved to Sheet 2 (Col B): " + cName
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 4B. DEDICATED COL B SYNCHRONIZATION (Preserves all existing data in Sheet 2 Col A)
    if (action === "syncColB" || action === "syncColBOnly" || action === "syncInsuranceCompanies") {
      sheet2.getRange(1, 1).setValue("2. INSURANCE COMPANY");
      sheet2.setFrozenRows(1);

      var existingBList = [];
      var existingBMap = {};
      var lastR2_b = sheet2.getLastRow();
      if (lastR2_b > 1) {
        var curVals2 = sheet2.getRange(2, 1, lastR2_b - 1, 1).getDisplayValues();
        for (var idx2 = 0; idx2 < curVals2.length; idx2++) {
          var valB = String(curVals2[idx2][0] || '').trim().toUpperCase();
          if (valB && !valB.startsWith("SR NO") && !valB.startsWith("2.") && valB !== "INSURANCE COMPANY") {
            if (!existingBMap[valB]) {
              existingBMap[valB] = true;
              existingBList.push(valB);
            }
          }
        }
      }

      var incomingB = postData.insuranceCompanies || postData.colB || postData.insurers || [];
      for (var incIdx = 0; incIdx < incomingB.length; incIdx++) {
        var itm = incomingB[incIdx];
        var nme = (typeof itm === 'object' && itm !== null) ? (itm.name || itm.companyName || '') : String(itm || '');
        nme = nme.trim().toUpperCase();
        if (!nme || nme.startsWith("SR NO") || nme.startsWith("2.") || nme === "INSURANCE COMPANY") continue;

        var isD = false;
        for (var exI = 0; exI < existingBList.length; exI++) {
          if (isDuplicate7Words(nme, existingBList[exI]) || nme === existingBList[exI]) {
            isD = true;
            break;
          }
        }
        if (!isD) {
          existingBList.push(nme);
          existingBMap[nme] = true;
        }
      }

      if (existingBList.length > 0) {
        var matrixB = existingBList.map(function(item) { return [item]; });
        sheet2.getRange(2, 1, matrixB.length, 1).setNumberFormat('@').setValues(matrixB);
        sheet2.autoResizeColumns(1, 1);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "✓ Sheet 2 Col A synchronized safely: preserved " + existingBList.length + " insurance companies without deleting existing data!",
        count: existingBList.length,
        colB: existingBList,
        insuranceCompanies: existingBList
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. DELETE TPA (and its address) from Sheet 1
    if (action === "deleteTpa") {
      var delTpa = String(postData.tpaName || "").trim().toUpperCase();
      var lastR3 = sheet1.getLastRow();
      if (lastR3 > 1) {
        var colAVals = sheet1.getRange(2, 1, lastR3 - 1, 1).getValues();
        var colCVals = sheet1.getRange(2, 3, lastR3 - 1, 1).getValues();
        var remainingA = [];
        var remainingC = [];
        for (var d = 0; d < colAVals.length; d++) {
          var v = String(colAVals[d][0] || '').trim().toUpperCase();
          var vc = String(colCVals[d][0] || '').trim();
          if (v && v !== delTpa) {
            remainingA.push([v]);
            remainingC.push([vc]);
          }
        }
        sheet1.getRange(2, 1, lastR3 - 1, 1).clearContent();
        sheet1.getRange(2, 3, lastR3 - 1, 1).clearContent();
        if (remainingA.length > 0) {
          sheet1.getRange(2, 1, remainingA.length, 1).setValues(remainingA);
          sheet1.getRange(2, 3, remainingC.length, 1).setValues(remainingC);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "TPA & Address removed from Col A & Col C: " + delTpa
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 6. DELETE INSURANCE COMPANY (From Sheet 2 & Sheet 1)
    if (action === "deleteInsuranceCompany") {
      var delComp = String(postData.companyName || "").trim().toUpperCase();
      // Remove from Sheet 2
      var lastR4_2 = sheet2.getLastRow();
      if (lastR4_2 > 1) {
        var col2Vals = sheet2.getRange(2, 1, lastR4_2 - 1, 1).getValues();
        var rem2 = [];
        for (var e2 = 0; e2 < col2Vals.length; e2++) {
          var v2 = String(col2Vals[e2][0] || '').trim().toUpperCase();
          if (v2 && v2 !== delComp) rem2.push([v2]);
        }
        sheet2.getRange(2, 1, lastR4_2 - 1, 1).clearContent();
        if (rem2.length > 0) {
          sheet2.getRange(2, 1, rem2.length, 1).setValues(rem2);
        }
      }
      // Remove from Sheet 1 Col B
      var lastR4_1 = sheet1.getLastRow();
      if (lastR4_1 > 1) {
        var col1BVals = sheet1.getRange(2, 2, lastR4_1 - 1, 1).getValues();
        var rem1B = [];
        for (var e1 = 0; e1 < col1BVals.length; e1++) {
          var v1B = String(col1BVals[e1][0] || '').trim().toUpperCase();
          if (v1B && v1B !== delComp) rem1B.push([v1B]);
        }
        sheet1.getRange(2, 2, lastR4_1 - 1, 1).clearContent();
        if (rem1B.length > 0) {
          sheet1.getRange(2, 2, rem1B.length, 1).setValues(rem1B);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Insurance company removed from Sheet 2 & Sheet 1: " + delComp
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return doGet(e);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * Full 37-Column Hospital Claims & TPA Synchronization Script
 */
export const HOSPITAL_APPS_SCRIPT_CODE = `/**
 * Google Apps Script for Hospital Claims Synchronization (37 Columns) & TPA/Insurance Metadata
 * Copy and Paste this code into: Google Sheet -> Extensions -> Apps Script
 *
 * Deployment Instructions:
 * 1. Open your Google Spreadsheet
 * 2. Click "Extensions" -> "Apps Script"
 * 3. Delete existing code and paste this script into Code.gs
 * 4. Click "Deploy" -> "New Deployment"
 * 5. Select type: "Web App"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone"
 * 8. Click "Deploy", grant permissions, and copy the Web App URL into the App.
 *
 * Features:
 * - doGet(e): Reads claims AND syncs TPAs & Insurance metadata live!
 * - doPost(e): Saves claims (37 columns) sorted by DOA, left-aligned
 * - Automatic S.No generation
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Claims") || ss.getActiveSheet();
    
    var headers = [
      "S.No", "Patient Details", "UHID", "Mobile Number", "Insurance Limit",
      "IPD No", "DOA", "DOD", "TPA/Ins. Name", "Insurance Company",
      "Insurance ID", "Claim No", "Policy No", "EMP ID", "Bill Invoice No",
      "Total Bill", "Approved", "Discount", "Patient Pay", "Settlement Amount",
      "TDS Amount", "Payment Recived", "Payment Date", "UTR", "Attender Name",
      "Relation", "Insurance Address", "Bank Name", "Bank Account No", "IFSC Code",
      "Bank Address", "Courier Details", "Courier Date", "Diagnosis", "Surgery Name",
      "Remark", "Status"
    ];
    
    // Ensure header row exists and set exact headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    } else {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Freeze Header Row
    sheet.setFrozenRows(1);

    // Style Header Row & Header Border
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold")
               .setBackground("#1E1B4B")
               .setFontColor("#FFFFFF")
               .setVerticalAlignment("middle")
               .setHorizontalAlignment("left");
    headerRange.setBorder(true, true, true, true, true, true, "#475569", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sheet.setRowHeight(1, 35);
    
    var data = JSON.parse(e.postData.contents);

    // If payload is for TPA & Insurance metadata sync
    if (data && (data.action === "syncAllMetadata" || data.action === "syncTwoHeaders" || data.action === "syncThreeHeaders" || (data.tpas && !Array.isArray(data) && !data.patientName))) {
      var tpaSheet = ss.getSheetByName("TPA & Insurance") || ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
      if (!tpaSheet) {
        tpaSheet = ss.insertSheet("TPA & Insurance");
      }
      var tHeaders = ["1.  TPA / INS. NAME", "2. INSURANCE COMPANY", "3. INSURANCE / TPA ADDRESS"];
      tpaSheet.getRange(1, 1, 1, 3).setValues([tHeaders]);
      tpaSheet.setFrozenRows(1);
      var tHeaderRange = tpaSheet.getRange(1, 1, 1, 3);
      tHeaderRange.setFontWeight("bold").setBackground("#1E1B4B").setFontColor("#FFFFFF").setVerticalAlignment("middle").setHorizontalAlignment("left");
      tHeaderRange.setBorder(true, true, true, true, true, true, "#475569", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

      function isDup7(n1, n2) {
        if (!n1 || !n2) return false;
        var s1 = String(n1).toUpperCase().replace(/[^\\w\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
        var s2 = String(n2).toUpperCase().replace(/[^\\w\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
        if (s1 === s2) return true;
        var w1 = s1.split(' ').filter(Boolean);
        var w2 = s2.split(' ').filter(Boolean);
        if (w1.length === 0 || w2.length === 0) return false;
        if (w1.length >= 7 && w2.length >= 7 && w1.slice(0, 7).join(' ') === w2.slice(0, 7).join(' ')) return true;
        return false;
      }

      function dedup7(arr) {
        var res = [];
        var skipped = 0;
        if (!Array.isArray(arr)) return { list: res, skipped: skipped };
        for (var i = 0; i < arr.length; i++) {
          var item = arr[i];
          var val = (typeof item === 'object' && item !== null) ? (item.name || item.tpaName || item.companyName || '') : String(item || '');
          val = String(val).trim().toUpperCase();
          if (!val || val === 'TPA / INS. NAME' || val === 'INSURANCE COMPANY' || val === 'SR NO') continue;
          var dup = false;
          for (var j = 0; j < res.length; j++) {
            var existing = (typeof res[j] === 'object' && res[j] !== null) ? res[j].name : String(res[j]);
            if (isDup7(val, existing)) {
              dup = true;
              skipped++;
              if (typeof item === 'object' && item !== null && item.address) {
                if (typeof res[j] === 'object' && res[j] !== null && !res[j].address) {
                  res[j].address = item.address;
                }
              }
              break;
            }
          }
          if (!dup) {
            if (typeof item === 'object' && item !== null) {
              res.push({ name: val, address: item.address || '' });
            } else {
              res.push(val);
            }
          }
        }
        return { list: res, skipped: skipped };
      }

      var rawTpas = data.tpas || data.tpaNames || [];
      var tpasRes = dedup7(rawTpas);
      var tpas = tpasRes.list;

      var rawIns = data.insuranceCompanies || data.insuranceList || [];
      var insCosRes = dedup7(rawIns);
      var insCos = insCosRes.list;

      var tpaAddrMap = data.tpaAddresses || data.addresses || {};

      if (tpaSheet.getLastRow() > 1) {
        tpaSheet.getRange(2, 1, tpaSheet.getLastRow() - 1, Math.max(3, tpaSheet.getLastColumn())).clearContent().clearFormat();
      }

      var maxM = Math.max(tpas.length, insCos.length);
      var mRows = [];
      var addressesCount = 0;
      for (var mi = 0; mi < maxM; mi++) {
        var tItem = mi < tpas.length ? tpas[mi] : "";
        var tCol = (typeof tItem === 'object' && tItem !== null) ? (tItem.name || "") : String(tItem || "");
        var cItem = mi < insCos.length ? insCos[mi] : "";
        var cCol = (typeof cItem === 'object' && cItem !== null) ? (cItem.name || "") : String(cItem || "");
        var aCol = "";
        if (tCol) {
          if (typeof tItem === 'object' && tItem !== null && tItem.address) {
            aCol = String(tItem.address).trim().toUpperCase();
          } else if (tpaAddrMap[tCol]) {
            aCol = String(tpaAddrMap[tCol]).trim().toUpperCase();
          }
          if (aCol) addressesCount++;
        }
        mRows.push([tCol, cCol, aCol]);
      }

      if (mRows.length > 0) {
        var dR = tpaSheet.getRange(2, 1, mRows.length, 3);
        dR.setNumberFormat('@').setValues(mRows).setFontFamily("Arial").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("left");
        dR.setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
      }
      tpaSheet.autoResizeColumns(1, 3);
      tpaSheet.setColumnWidth(1, Math.min(Math.max(tpaSheet.getColumnWidth(1) + 20, 240), 400));
      tpaSheet.setColumnWidth(2, Math.min(Math.max(tpaSheet.getColumnWidth(2) + 20, 240), 400));
      tpaSheet.setColumnWidth(3, Math.min(Math.max(tpaSheet.getColumnWidth(3) + 20, 280), 550));

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "✓ Successfully written " + tpas.length + " TPAs (Col A), " + insCos.length + " Insurance Companies (Col B), and " + addressesCount + " Addresses (Col C) into Google Sheet!",
        headers: ["1.  TPA / INS. NAME", "2. INSURANCE COMPANY", "3. INSURANCE / TPA ADDRESS"],
        tpasCount: tpas.length,
        insuranceCount: insCos.length,
        addressCount: addressesCount
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!Array.isArray(data)) data = [data];
    
    // Clear old data rows below headers
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent().clearFormat();
    }

    function parseNum(val) {
      if (val === null || val === undefined || val === '') return '';
      var cleaned = String(val).replace(/[^0-9.-]/g, '');
      var num = parseFloat(cleaned);
      return isNaN(num) ? '' : num;
    }

    function parseDateVal(val) {
      if (!val) return 0;
      if (val instanceof Date) return val.getTime();
      var s = String(val).trim();
      if (!s) return 0;
      var parts = s.split(/[-/.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          if (!isNaN(d.getTime())) return d.getTime();
        } else if (parts[2].length === 4) {
          var d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          if (!isNaN(d.getTime())) return d.getTime();
        }
      }
      var parsed = Date.parse(s);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    var rows = data.map(function(item, idx) {
      return [
        parseNum(item.sNo) || (idx + 1),
        String(item.patientName || item.patientDetails || ''),
        String(item.uhid || ''),
        String(item.mobileNumber || item.mobile || ''),
        String(item.insuranceLimit || ''),
        String(item.ipdNo || ''),
        String(item.doa || ''),
        String(item.dod || ''),
        String(item.tpaName || item.tpaInsName || ''),
        String(item.insuranceCompany || ''),
        String(item.insuranceID || item.insuranceIdNo || ''),
        String(item.claimNo || ''),
        String(item.policyNumber || item.policyNo || ''),
        String(item.empID || item.empIdNo || ''),
        String(item.billInvoiceNo || ''),
        parseNum(item.totalBill),
        parseNum(item.approved),
        parseNum(item.discount),
        parseNum(item.patientPay),
        parseNum(item.settlementAmount),
        parseNum(item.tds || item.tdsAmount),
        parseNum(item.deduction || item.paymentReceived || item.paymentRecived),
        String(item.paymentDate || ''),
        String(item.utr || ''),
        String(item.attenderName || ''),
        String(item.relation || ''),
        String(item.insuranceAddress || ''),
        String(item.bankName || ''),
        String(item.bankAccountNo || ''),
        String(item.ifscCode || ''),
        String(item.bankAddress || ''),
        String(item.courierDetails || ''),
        String(item.courierDate || ''),
        String(item.diagnosis || ''),
        String(item.surgeryName || ''),
        String(item.remark || ''),
        String(item.status || '')
      ];
    });

    // Preserve exact row places as entered without altering sheet order
    for (var s = 0; s < rows.length; s++) {
      if (!rows[s][0] || rows[s][0] === '') {
        rows[s][0] = s + 1;
      }
    }
    
    if (rows.length > 0) {
      var dataRange = sheet.getRange(2, 1, rows.length, headers.length);
      
      // Enforce plain text format ('@') across all data cells
      dataRange.setNumberFormat('@');
      dataRange.setValues(rows);
      dataRange.setVerticalAlignment("middle");
      dataRange.setHorizontalAlignment("left"); // Horizontal alignment left side
      dataRange.setFontFamily("Arial");
      dataRange.setFontSize(10);

      // Financial Amounts Formatting (Cols 16 to 22)
      var numericCols = [16, 17, 18, 19, 20, 21, 22];
      numericCols.forEach(function(colIdx) {
        sheet.getRange(2, colIdx, rows.length, 1).setNumberFormat('"₹"#,##0.00').setHorizontalAlignment("left");
      });

      // Cell Borders
      dataRange.setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
    }
    
    // Auto Adjust Column Widths
    sheet.autoResizeColumns(1, headers.length);
    for (var col = 1; col <= headers.length; col++) {
      var currentWidth = sheet.getColumnWidth(col);
      sheet.setColumnWidth(col, Math.min(Math.max(currentWidth + 8, 75), 250));
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Synced " + rows.length + " claims successfully (Sorted by DOA & Left Aligned)",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

    // 1. Return TPAs & Insurance Companies Metadata
    if (action === "getMetadata") {
      var allSheets = ss.getSheets();
      var tpasMap = {};
      var insMap = {};
      
      var skipWords = [
        "sr no", "companay", "company", "mail id", "toll free",
        "cashless", "soft copy", "query", "stetus", "status",
        "if qry", "portal", "for ksk", "cc", "to", "intimation",
        "settelment", "settlement", "submission", "outstanding",
        "related", "provider", "notice", "claim file", "for payment"
      ];

      allSheets.forEach(function(sh) {
        var vals = sh.getDataRange().getDisplayValues();
        for (var r = 0; r < vals.length; r++) {
          var c1 = String(vals[r][1] || vals[r][0] || '').trim();
          if (c1 && c1.indexOf('@') === -1 && c1.length >= 3) {
            var lower = c1.toLowerCase();
            var skip = skipWords.some(function(w) { return lower.indexOf(w) !== -1; });
            if (!skip) {
              var clean = c1.replace(/^[\*#\-_]+|[\*#\-_]+$/g, '').trim().toUpperCase();
              if (clean.length >= 3 && clean.indexOf('HTTP') === -1 && clean.indexOf('<') === -1) {
                var isTpa = clean.indexOf('TPA') !== -1 || clean.indexOf('MEDIASSIST') !== -1 ||
                            clean.indexOf('FHPL') !== -1 || clean.indexOf('HITPA') !== -1 ||
                            clean.indexOf('SAFE WAY') !== -1 || clean.indexOf('GENINS') !== -1 ||
                            clean.indexOf('HEALTH INDIA') !== -1 || clean.indexOf('PARK MEDICLAIM') !== -1 ||
                            clean.indexOf('ERICSON') !== -1 || clean.indexOf('VOLO') !== -1 ||
                            clean.indexOf('MD INDIA') !== -1 || clean.indexOf('AKNA') !== -1;
                if (isTpa) {
                  tpasMap[clean] = { name: clean };
                } else {
                  insMap[clean] = true;
                }
              }
            }
          }
        }
      });

      var loadedTpas = Object.keys(tpasMap).map(function(k) { return tpasMap[k]; });
      var loadedIns = Object.keys(insMap);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        tpas: loadedTpas,
        insuranceCompanies: loadedIns
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Return Claims
    var sheet = ss.getSheetByName("Claims") || ss.getActiveSheet();
    var data = sheet.getDataRange().getDisplayValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    function parseDateVal(val) {
      if (!val) return 0;
      if (val instanceof Date) return val.getTime();
      var s = String(val).trim();
      if (!s) return 0;
      var parts = s.split(/[-/.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          if (!isNaN(d.getTime())) return d.getTime();
        } else if (parts[2].length === 4) {
          var d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          if (!isNaN(d.getTime())) return d.getTime();
        }
      }
      var parsed = Date.parse(s);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.join("").trim() === "") continue;

      result.push({
        sNo: row[0],
        patientName: row[1],
        uhid: row[2],
        mobileNumber: row[3],
        insuranceLimit: row[4],
        ipdNo: row[5],
        doa: row[6],
        dod: row[7],
        tpaName: row[8],
        insuranceCompany: row[9],
        insuranceID: row[10],
        claimNo: row[11],
        policyNumber: row[12],
        empID: row[13],
        billInvoiceNo: row[14],
        totalBill: row[15],
        approved: row[16],
        discount: row[17],
        patientPay: row[18],
        settlementAmount: row[19],
        tds: row[20],
        deduction: row[21],
        paymentDate: row[22],
        utr: row[23],
        attenderName: row[24],
        relation: row[25],
        insuranceAddress: row[26],
        bankName: row[27],
        bankAccountNo: row[28],
        ifscCode: row[29],
        bankAddress: row[30],
        courierDetails: row[31],
        courierDate: row[32],
        diagnosis: row[33],
        surgeryName: row[34],
        remark: row[35],
        status: row[36]
      });
    }

    // Retain exact row positions directly from the Google Sheet without changing places
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
