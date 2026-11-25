/**
 * ==============================================================================
 * HOSPITAL CLAIMS, TPA & INSURANCE METADATA SYNC - GOOGLE APPS SCRIPT
 * Arpa Medcity Hospital & Research Institute
 * ==============================================================================
 * 
 * 7-Column Layout (Matching exact specifications):
 * [1. Sl.No | 2. TPA / INS. NAME | 3. INSURANCE COMPANY | 4. Bank Name | 5. A/c Number | 6. IFSC CODE | 7. BANK ADDRESS]
 * 
 * Features Included:
 * 1. Styled with Vibrant Green Header Background (#00873D) & Bold White Text (#FFFFFF)
 * 2. Header Border: Bold distinct borders on top, bottom, and between header cells (#005A28)
 * 3. Row Border & Column Border: Clean solid gridlines (#CBD5E1) separating rows & columns
 * 4. Auto Column Adjust: Calculates column widths + comfortable padding
 * 5. Automatic Two-Way Synchronization:
 *    - Auto-load TPAs, Insurance Companies, and linked Hospital Bank Details directly into the app
 *    - When you select a TPA in the app, linked Hospital Bank Details & Insurance Company auto-fill
 *    - Adding or deleting a TPA or Insurance Company automatically updates this Google Sheet
 * 6. Permanent URL support: URL is stored permanently on server and browser
 * 
 * Deployment Instructions:
 * 1. In your Google Sheet, open: Extensions > Apps Script
 * 2. Delete all existing code, paste this entire script, and click Save (Ctrl + S).
 * 3. Click "Deploy" > "New deployment"
 * 4. Click the gear icon next to "Select type" and choose "Web app"
 * 5. Set:
 *    - Description: "Hospital Claims & TPA Sync"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (Required for two-way sync)
 * 6. Click "Deploy" and Authorize access with your Google Account.
 * 7. Copy the "Web app URL" (ending in /exec) and paste into the app's Google Sync dialog!
 */

/**
 * Custom Menu added when spreadsheet is opened
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🏥 Hospital Claims Sync')
    .addItem('✨ Auto-Format All Sheets (Borders & Auto Column Width)', 'autoFormatAllSheets')
    .addItem('📋 Initialize / Refresh All Tabs & Headers', 'setupSheet')
    .addToUi();
}

/**
 * Universal Formatter: Auto Column Adjust, Column Border, Row Border, and Header Border
 * @param {Sheet} sheet The Google Spreadsheet sheet object
 * @param {number} numCols Total number of columns to format
 * @param {string} headerBg Header background color (hex)
 * @param {string} headerColor Header font color (hex)
 */
function formatSheet(sheet, numCols, headerBg, headerColor) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 1 || !numCols || numCols < 1) return;

  // 1. HEADER ROW STYLING & HEADER BORDER
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange
    .setFontWeight("bold")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setBackground(headerBg || "#00873D")
    .setFontColor(headerColor || "#FFFFFF")
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("left");
  
  // Center align Sl.No header if present
  if (numCols >= 1 && String(headerRange.getCell(1, 1).getValue()).toLowerCase().includes("sl")) {
    headerRange.getCell(1, 1).setHorizontalAlignment("center");
  }
  
  // Header Border: (top, left, bottom, right, vertical, horizontal, color, style)
  headerRange.setBorder(
    true, true, true, true, true, true,
    "#005A28",
    SpreadsheetApp.BorderStyle.SOLID_MEDIUM
  );
  sheet.setRowHeight(1, 36);

  // 2. DATA ROWS: ROW BORDER, COLUMN BORDER & CELL STYLING
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, numCols);
    dataRange
      .setFontFamily("Arial")
      .setFontSize(10)
      .setVerticalAlignment("middle")
      .setHorizontalAlignment("left");

    // Row Border & Column Border
    dataRange.setBorder(
      true, true, true, true, true, true,
      "#CBD5E1",
      SpreadsheetApp.BorderStyle.SOLID
    );

    // Center align Sl.No data column
    sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment("center");

    // Enforce plain text on account numbers to preserve leading zeros
    if (numCols >= 5) {
      sheet.getRange(2, 5, lastRow - 1, 1).setNumberFormat('@');
    }

    // Row height
    for (var r = 2; r <= lastRow; r++) {
      sheet.setRowHeight(r, 26);
    }
  }

  // 3. AUTO COLUMN ADJUST (Auto-fit widths with clean padding)
  sheet.autoResizeColumns(1, numCols);
  for (var c = 1; c <= numCols; c++) {
    var currentWidth = sheet.getColumnWidth(c);
    sheet.setColumnWidth(c, Math.min(Math.max(currentWidth + 16, 85), 380));
  }
}

/**
 * Formats all sheets in the workbook
 */
function autoFormatAllSheets() {
  setupSheet();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var tpaSheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
  if (tpaSheet) formatSheet(tpaSheet, 7, "#00873D", "#FFFFFF");
  
  var insSheet = ss.getSheetByName("InsuranceCompanies");
  if (insSheet) formatSheet(insSheet, 2, "#1E3A8A", "#FFFFFF");
  
  var claimsSheet = ss.getSheetByName("Claims");
  if (claimsSheet) formatSheet(claimsSheet, 38, "#064E3B", "#FFFFFF");
}

/**
 * Initializes sheet tabs with exact 7-column layout and styling
 */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup TPAs & Insurance Tab (7 Columns)
  var tpaSheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
  if (!tpaSheet) {
    tpaSheet = ss.insertSheet("TPAs & Insurance");
  }
  var tpaHeaders = [
    "Sl.No",
    "TPA / INS. NAME",
    "INSURANCE COMPANY",
    "Bank Name",
    "A/c Number",
    "IFSC CODE",
    "BANK ADDRESS"
  ];
  tpaSheet.getRange(1, 1, 1, tpaHeaders.length).setValues([tpaHeaders]);
  tpaSheet.setFrozenRows(1);
  formatSheet(tpaSheet, tpaHeaders.length, "#00873D", "#FFFFFF");

  // 2. Setup Optional Dedicated Insurance Companies Tab
  var insSheet = ss.getSheetByName("InsuranceCompanies");
  if (!insSheet) {
    insSheet = ss.insertSheet("InsuranceCompanies");
  }
  var insHeaders = ["INSURANCE COMPANY NAME", "LAST UPDATED"];
  insSheet.getRange(1, 1, 1, insHeaders.length).setValues([insHeaders]);
  insSheet.setFrozenRows(1);
  formatSheet(insSheet, insHeaders.length, "#1E3A8A", "#FFFFFF");

  // 3. Setup Claims Tab
  var claimsSheet = ss.getSheetByName("Claims");
  if (!claimsSheet) {
    claimsSheet = ss.insertSheet("Claims");
  }
  var claimHeaders = [
    "S.No", "Patient Name", "UHID", "Mobile Number", "Readmit",
    "IPD No", "DOA", "DOD", "TPA Name", "Insurance Company",
    "Insurance ID", "Claim No", "Policy Number", "Emp ID",
    "Bill Invoice No", "Total Bill", "Approved", "Discount",
    "Payment Received", "Patient Pay", "Settlement Amount", "TDS",
    "Payment Date", "UTR", "Attender Name", "Relation",
    "Insurance Address", "Bank Name", "Bank Account No", "IFSC Code",
    "Bank Address", "Courier Details", "Courier Date", "Diagnosis",
    "Surgery Name", "Remark", "Status", "Updated At"
  ];
  claimsSheet.getRange(1, 1, 1, claimHeaders.length).setValues([claimHeaders]);
  claimsSheet.setFrozenRows(1);
  formatSheet(claimsSheet, claimHeaders.length, "#064E3B", "#FFFFFF");
}

function doGet(e) {
  setupSheet();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getMetadata";

  if (action === "format" || action === "autoFormat") {
    autoFormatAllSheets();
    return createJsonResponse({
      status: "success",
      message: "Applied auto column adjust, column border, row border, and header border across all sheets."
    });
  }

  if (action === "getMetadata" || action === "loadTpas" || action === "loadInsuranceCompanies") {
    var tpas = getTpasFromSheet(ss);
    var insuranceCompanies = getInsuranceCompaniesFromSheet(ss);
    return createJsonResponse({
      status: "success",
      tpas: tpas,
      insuranceCompanies: insuranceCompanies,
      timestamp: new Date().toISOString()
    });
  }

  if (action === "getClaims") {
    var claims = getClaimsFromSheet(ss);
    return createJsonResponse({
      status: "success",
      claims: claims,
      timestamp: new Date().toISOString()
    });
  }

  return createJsonResponse({
    status: "success",
    tpas: getTpasFromSheet(ss),
    insuranceCompanies: getInsuranceCompaniesFromSheet(ss),
    claims: getClaimsFromSheet(ss),
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  setupSheet();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var data = {};
  try {
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return createJsonResponse({ status: "error", message: "Invalid JSON payload: " + err.message });
  }

  var action = data.action || (Array.isArray(data.claims) ? "syncClaims" : "saveTpa");

  // 1. SAVE TPA (with linked Insurance Company & Hospital Bank Details)
  if (action === "saveTpa" || action === "addTpa") {
    var tpaName = (data.tpaName || data.name || "").trim().toUpperCase();
    if (!tpaName) {
      return createJsonResponse({ status: "error", message: "Missing tpaName" });
    }
    var tpaSheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
    if (!tpaSheet) {
      setupSheet();
      tpaSheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
    }
    var insCompany = (data.insuranceCompany || "").trim().toUpperCase();
    var bank = data.bankDetails || {};
    var lastRow = tpaSheet.getLastRow();
    var foundRow = -1;

    // Search existing by TPA NAME (Column 2)
    if (lastRow > 1) {
      var values = tpaSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][0]).trim().toUpperCase() === tpaName) {
          foundRow = i + 2;
          break;
        }
      }
    }

    var slNo = (foundRow > 0) ? (foundRow - 1) : Math.max(1, lastRow);
    var rowData = [
      slNo,
      tpaName,
      insCompany,
      (bank.bankName || "").toUpperCase(),
      (bank.bankAccountNo || ""),
      (bank.ifscCode || "").toUpperCase(),
      (bank.bankAddress || "").toUpperCase()
    ];

    if (foundRow > 0) {
      tpaSheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      tpaSheet.appendRow(rowData);
    }

    // Re-index Sl.No
    var updatedLastRow = tpaSheet.getLastRow();
    if (updatedLastRow > 1) {
      for (var r = 2; r <= updatedLastRow; r++) {
        tpaSheet.getRange(r, 1).setValue(r - 1);
      }
    }

    formatSheet(tpaSheet, 7, "#00873D", "#FFFFFF");
    return createJsonResponse({ status: "success", message: "TPA and Hospital Bank Details saved", tpaName: tpaName });
  }

  // 2. DELETE TPA
  if (action === "deleteTpa") {
    var delName = (data.tpaName || data.name || "").trim().toUpperCase();
    var tpaSheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
    if (tpaSheet && tpaSheet.getLastRow() > 1) {
      var values = tpaSheet.getRange(2, 2, tpaSheet.getLastRow() - 1, 1).getValues();
      for (var i = values.length - 1; i >= 0; i--) {
        if (String(values[i][0]).trim().toUpperCase() === delName) {
          tpaSheet.deleteRow(i + 2);
        }
      }
      var updatedLastRow = tpaSheet.getLastRow();
      if (updatedLastRow > 1) {
        for (var r = 2; r <= updatedLastRow; r++) {
          tpaSheet.getRange(r, 1).setValue(r - 1);
        }
      }
      formatSheet(tpaSheet, 7, "#00873D", "#FFFFFF");
    }
    return createJsonResponse({ status: "success", message: "TPA deleted", tpaName: delName });
  }

  // 3. SAVE INSURANCE COMPANY
  if (action === "saveInsuranceCompany" || action === "addInsuranceCompany") {
    var compName = (data.companyName || data.name || "").trim().toUpperCase();
    if (!compName) {
      return createJsonResponse({ status: "error", message: "Missing companyName" });
    }
    var insSheet = ss.getSheetByName("InsuranceCompanies");
    if (!insSheet) {
      insSheet = ss.insertSheet("InsuranceCompanies");
      insSheet.getRange(1, 1, 1, 2).setValues([["INSURANCE COMPANY NAME", "LAST UPDATED"]]);
    }
    var lastRow = insSheet.getLastRow();
    var found = false;
    if (lastRow > 1) {
      var values = insSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][0]).trim().toUpperCase() === compName) {
          found = true;
          break;
        }
      }
    }
    if (!found) {
      insSheet.appendRow([compName, new Date().toISOString()]);
    }
    formatSheet(insSheet, 2, "#1E3A8A", "#FFFFFF");
    return createJsonResponse({ status: "success", message: "Insurance company saved", companyName: compName });
  }

  // 4. DELETE INSURANCE COMPANY
  if (action === "deleteInsuranceCompany") {
    var delComp = (data.companyName || data.name || "").trim().toUpperCase();
    var insSheet = ss.getSheetByName("InsuranceCompanies");
    if (insSheet && insSheet.getLastRow() > 1) {
      var values = insSheet.getRange(2, 1, insSheet.getLastRow() - 1, 1).getValues();
      for (var i = values.length - 1; i >= 0; i--) {
        if (String(values[i][0]).trim().toUpperCase() === delComp) {
          insSheet.deleteRow(i + 2);
        }
      }
      formatSheet(insSheet, 2, "#1E3A8A", "#FFFFFF");
    }
    // Also clear from main TPAs & Insurance sheet if assigned
    var tpaSheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
    if (tpaSheet && tpaSheet.getLastRow() > 1) {
      var tpaValues = tpaSheet.getRange(2, 3, tpaSheet.getLastRow() - 1, 1).getValues();
      for (var j = 0; j < tpaValues.length; j++) {
        if (String(tpaValues[j][0]).trim().toUpperCase() === delComp) {
          tpaSheet.getRange(j + 2, 3).setValue("");
        }
      }
    }
    return createJsonResponse({ status: "success", message: "Insurance company deleted", companyName: delComp });
  }

  // 5. BULK METADATA SYNC (with 7-word deduplication)
  if (action === "syncAllMetadata" || action === "syncTwoHeaders") {
    function isDup7(n1, n2) {
      if (!n1 || !n2) return false;
      var s1 = String(n1).toUpperCase().replace(/[^\\w\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
      var s2 = String(n2).toUpperCase().replace(/[^\\w\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
      if (s1 === s2) return true;
      var w1 = s1.split(' ').filter(Boolean);
      var w2 = s2.split(' ').filter(Boolean);
      if (w1.length === 0 || w2.length === 0) return false;
      if (w1.slice(0, 7).join(' ') === w2.slice(0, 7).join(' ')) return true;
      var m = Math.min(w1.length, w2.length, 7);
      if (m >= 2 && w1.slice(0, m).join(' ') === w2.slice(0, m).join(' ')) return true;
      return false;
    }

    var tpaSheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs") || ss.getSheetByName("TPA & Insurance");
    if (!tpaSheet) {
      setupSheet();
      tpaSheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs") || ss.getActiveSheet();
    }
    if (Array.isArray(data.tpas)) {
      if (tpaSheet.getLastRow() > 1) {
        tpaSheet.getRange(2, 1, tpaSheet.getLastRow() - 1, Math.min(7, tpaSheet.getLastColumn())).clearContent().clearFormat();
      }
      var dedupedTpas = [];
      data.tpas.forEach(function(t) {
        var tName = (t.name || "").trim().toUpperCase();
        if (!tName) return;
        var dup = dedupedTpas.some(function(dt) { return isDup7(tName, dt.name); });
        if (!dup) dedupedTpas.push(t);
      });

      var tpaRows = dedupedTpas.map(function(t, idx) {
        var b = t.bankDetails || {};
        return [
          idx + 1,
          (t.name || "").toUpperCase(),
          (t.insuranceCompany || "").toUpperCase(),
          (b.bankName || "").toUpperCase(),
          b.bankAccountNo || "",
          (b.ifscCode || "").toUpperCase(),
          (b.bankAddress || "").toUpperCase()
        ];
      });
      if (tpaRows.length > 0) {
        tpaSheet.getRange(2, 1, tpaRows.length, 7).setValues(tpaRows);
      }
      formatSheet(tpaSheet, 7, "#00873D", "#FFFFFF");
    }

    var insSheet = ss.getSheetByName("InsuranceCompanies");
    if (!insSheet) {
      insSheet = ss.insertSheet("InsuranceCompanies");
      insSheet.getRange(1, 1, 1, 2).setValues([["INSURANCE COMPANY NAME", "LAST UPDATED"]]);
      insSheet.setFrozenRows(1);
    }
    if (Array.isArray(data.insuranceCompanies)) {
      if (insSheet.getLastRow() > 1) {
        insSheet.getRange(2, 1, insSheet.getLastRow() - 1, 2).clearContent().clearFormat();
      }
      var dedupedIns = [];
      data.insuranceCompanies.forEach(function(c) {
        var val = (typeof c === 'object' && c !== null) ? (c.name || c.companyName || '') : String(c || '');
        var insName = String(val).trim().toUpperCase();
        if (!insName) return;
        var dup = dedupedIns.some(function(di) { return isDup7(insName, di); });
        if (!dup) dedupedIns.push(insName);
      });

      var insRows = dedupedIns.map(function(cName) {
        return [cName, new Date().toISOString()];
      });
      if (insRows.length > 0) {
        insSheet.getRange(2, 1, insRows.length, 2).setValues(insRows);
      }
      formatSheet(insSheet, 2, "#1E3A8A", "#FFFFFF");
    }

    return createJsonResponse({ status: "success", message: "All metadata synced with 7-word deduplication & styling" });
  }

  // 6. CLAIMS SYNC
  if (action === "syncClaims" || Array.isArray(data.claims)) {
    var claims = data.claims || [];
    var claimsSheet = ss.getSheetByName("Claims");
    if (claimsSheet.getLastRow() > 1) {
      claimsSheet.getRange(2, 1, claimsSheet.getLastRow() - 1, 38).clearContent().clearFormat();
    }
    if (claims.length > 0) {
      var rows = claims.map(function(c, idx) {
        return [
          c.sNo || (idx + 1),
          c.patientName || "",
          c.uhid || "",
          c.mobileNumber || "",
          c.readmit || "No",
          c.ipdNo || "",
          c.doa || "",
          c.dod || "",
          c.tpaName || "",
          c.insuranceCompany || "",
          c.insuranceID || "",
          c.claimNo || "",
          c.policyNumber || "",
          c.empID || "",
          c.billInvoiceNo || "",
          c.totalBill || "",
          c.approved || "",
          c.discount || "",
          c.paymentReceived || "",
          c.patientPay || "",
          c.settlementAmount || "",
          c.tds || "",
          c.paymentDate || "",
          c.utr || "",
          c.attenderName || "",
          c.relation || "",
          c.insuranceAddress || "",
          c.bankName || "",
          c.bankAccountNo || "",
          c.ifscCode || "",
          c.bankAddress || "",
          c.courierDetails || "",
          c.courierDate || "",
          c.diagnosis || "",
          c.surgeryName || "",
          c.remark || "",
          c.status || "Admitted",
          new Date().toISOString()
        ];
      });
      claimsSheet.getRange(2, 1, rows.length, 38).setValues(rows);
    }
    formatSheet(claimsSheet, 38, "#064E3B", "#FFFFFF");

    return createJsonResponse({
      status: "success",
      message: "Claims synced successfully with borders and auto column width",
      count: claims.length
    });
  }

  return createJsonResponse({ status: "error", message: "Unknown action" });
}

function getTpasFromSheet(ss) {
  var sheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return [];

  var headers = sheet.getRange(1, 1, 1, Math.max(7, lastCol)).getValues()[0].map(function(h) {
    return String(h || "").trim().toLowerCase();
  });

  var nameIdx = headers.findIndex(function(h) { return h.indexOf("tpa") >= 0; });
  if (nameIdx < 0) nameIdx = 1;

  var insIdx = headers.findIndex(function(h) { return h.indexOf("insurance") >= 0 && h.indexOf("addr") < 0; });
  if (insIdx < 0 && headers.length > 2 && headers[2].indexOf("addr") < 0) insIdx = 2;

  var addrIdx = headers.findIndex(function(h) { return h.indexOf("tpa") >= 0 && h.indexOf("addr") >= 0; });

  var bankNameIdx = headers.findIndex(function(h) { return h.indexOf("bank") >= 0 && h.indexOf("name") >= 0; });
  if (bankNameIdx < 0) bankNameIdx = headers.findIndex(function(h) { return h === "bank"; });
  if (bankNameIdx < 0) bankNameIdx = 3;

  var accIdx = headers.findIndex(function(h) { return h.indexOf("a/c") >= 0 || h.indexOf("account") >= 0; });
  if (accIdx < 0) accIdx = 4;

  var ifscIdx = headers.findIndex(function(h) { return h.indexOf("ifsc") >= 0; });
  if (ifscIdx < 0) ifscIdx = 5;

  var bankAddrIdx = headers.findIndex(function(h) { return h.indexOf("bank") >= 0 && (h.indexOf("addr") >= 0 || h.indexOf("address") >= 0); });
  if (bankAddrIdx < 0) bankAddrIdx = 6;

  var data = sheet.getRange(2, 1, lastRow - 1, Math.max(7, lastCol)).getValues();
  var result = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var name = String(row[nameIdx] || "").trim().toUpperCase();
    if (!name || name.indexOf("SL.NO") >= 0 || name.indexOf("HTTP") >= 0) continue;

    var insCompany = (insIdx >= 0 && row[insIdx]) ? String(row[insIdx]).trim().toUpperCase() : "";
    var address = (addrIdx >= 0 && row[addrIdx]) ? String(row[addrIdx]).trim() : "";
    var bankName = (bankNameIdx >= 0 && row[bankNameIdx]) ? String(row[bankNameIdx]).trim().toUpperCase() : "";
    var acc = (accIdx >= 0 && row[accIdx]) ? String(row[accIdx]).trim() : "";
    var ifsc = (ifscIdx >= 0 && row[ifscIdx]) ? String(row[ifscIdx]).trim().toUpperCase() : "";
    var bankAddr = (bankAddrIdx >= 0 && row[bankAddrIdx]) ? String(row[bankAddrIdx]).trim().toUpperCase() : "";

    result.push({
      name: name,
      insuranceCompany: insCompany,
      address: address,
      bankDetails: {
        bankName: bankName,
        bankAccountNo: acc,
        ifscCode: ifsc,
        bankAddress: bankAddr
      }
    });
  }
  return result;
}

function getInsuranceCompaniesFromSheet(ss) {
  var companiesSet = {};
  var result = [];

  // 1. First collect from main TPAs & Insurance sheet (Column 3)
  var mainSheet = ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
  if (mainSheet && mainSheet.getLastRow() > 1) {
    var tpas = getTpasFromSheet(ss);
    tpas.forEach(function(t) {
      if (t.insuranceCompany && !companiesSet[t.insuranceCompany]) {
        companiesSet[t.insuranceCompany] = true;
        result.push(t.insuranceCompany);
      }
    });
  }

  // 2. Also collect from dedicated InsuranceCompanies sheet if present
  var insSheet = ss.getSheetByName("InsuranceCompanies");
  if (insSheet && insSheet.getLastRow() > 1) {
    var data = insSheet.getRange(2, 1, insSheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      var name = String(data[i][0] || "").trim().toUpperCase();
      if (name && !companiesSet[name]) {
        companiesSet[name] = true;
        result.push(name);
      }
    }
  }

  return result.sort();
}

function getClaimsFromSheet(ss) {
  var sheet = ss.getSheetByName("Claims");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, 37).getValues();
  return values.map(function(r) {
    return {
      sNo: r[0],
      patientName: r[1],
      uhid: r[2],
      mobileNumber: r[3],
      readmit: r[4],
      ipdNo: r[5],
      doa: r[6],
      dod: r[7],
      tpaName: r[8],
      insuranceCompany: r[9],
      insuranceID: r[10],
      claimNo: r[11],
      policyNumber: r[12],
      empID: r[13],
      billInvoiceNo: r[14],
      totalBill: r[15],
      approved: r[16],
      discount: r[17],
      deduction: r[18],
      patientPay: r[19],
      settlementAmount: r[20],
      tds: r[21],
      paymentDate: r[22],
      utr: r[23],
      attenderName: r[24],
      relation: r[25],
      insuranceAddress: r[26],
      bankName: r[27],
      bankAccountNo: r[28],
      ifscCode: r[29],
      bankAddress: r[30],
      courierDetails: r[31],
      courierDate: r[32],
      diagnosis: r[33],
      surgeryName: r[34],
      remark: r[35],
      status: r[36]
    };
  });
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
