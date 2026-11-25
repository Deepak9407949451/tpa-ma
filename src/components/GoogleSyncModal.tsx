import React, { useEffect, useState } from 'react';
import {
  saveDashboardSyncSettingsPermanently,
  getNotepadNote,
  saveNotepadNotePermanently
} from '../utils/metadataSync';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncApiUrl: string;
  onSaveSyncApiUrl: (url: string) => void;
  spreadsheetSharingLink: string;
  onSaveSpreadsheetSharingLink: (url: string) => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  themeMode?: 'dark' | 'light';
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  syncApiUrl,
  onSaveSyncApiUrl,
  spreadsheetSharingLink,
  onSaveSpreadsheetSharingLink,
  onSyncNow,
  isSyncing = false,
  themeMode = 'dark'
}) => {
  const [sharingLink, setSharingLink] = useState(spreadsheetSharingLink);
  const [apiUrl, setApiUrl] = useState(syncApiUrl);
  const [showCode, setShowCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Persistent Notepad Note State
  const [notepadNote, setNotepadNote] = useState<string>(() => {
    return getNotepadNote();
  });
  const [isNoteSaved, setIsNoteSaved] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isNotepadHidden, setIsNotepadHidden] = useState<boolean>(() => {
    return localStorage.getItem('hideNotepad_reference') === 'true';
  });

  useEffect(() => {
    setSharingLink(spreadsheetSharingLink);
  }, [spreadsheetSharingLink]);

  useEffect(() => {
    setApiUrl(syncApiUrl);
  }, [syncApiUrl]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/config')
      .then(r => (r.ok ? r.json() : null))
      .then(cfg => {
        if (cfg && cfg.notepadNote !== undefined && typeof cfg.notepadNote === 'string') {
          const local = localStorage.getItem('apps_script_notepad_note_v1');
          if (local === null || local === undefined) {
            setNotepadNote(cfg.notepadNote);
            try { localStorage.setItem('apps_script_notepad_note_v1', cfg.notepadNote); } catch {}
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNoteChange = (text: string) => {
    setNotepadNote(text);
    try {
      localStorage.setItem('apps_script_notepad_note_v1', text);
    } catch {}
  };

  const handleSaveNotePermanent = async () => {
    setIsSavingNote(true);
    try {
      await saveNotepadNotePermanently(notepadNote);
      setIsNoteSaved(true);
      setTimeout(() => setIsNoteSaved(false), 3500);
    } catch (err) {
      console.error('Error saving notepad note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCopyNote = () => {
    if (!notepadNote) return;
    navigator.clipboard.writeText(notepadNote);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  const handlePasteIntoNote = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const updated = notepadNote ? `${notepadNote}\n${text}` : text;
        handleNoteChange(updated);
        await saveNotepadNotePermanently(updated);
        setIsNoteSaved(true);
        setTimeout(() => setIsNoteSaved(false), 3000);
      }
    } catch {
      // fallback
    }
  };

  const handleClearNote = async () => {
    handleNoteChange('');
    await saveNotepadNotePermanently('');
  };

  const handleSaveAllLinks = async () => {
    const cleanLink = (sharingLink || '').trim();
    const cleanUrl = (apiUrl || '').trim();
    if (onSaveSpreadsheetSharingLink) onSaveSpreadsheetSharingLink(cleanLink);
    if (onSaveSyncApiUrl) onSaveSyncApiUrl(cleanUrl);
    try {
      localStorage.setItem('googleSpreadsheetSharingLink', cleanLink);
      localStorage.setItem('dashboard_claims_spreadsheet_url', cleanLink);
      localStorage.setItem('googleSheetsSyncUrl', cleanUrl);
      localStorage.setItem('dashboard_claims_sync_url', cleanUrl);
    } catch {}
    await saveDashboardSyncSettingsPermanently(cleanUrl, cleanLink);
    if (notepadNote !== undefined) {
      await saveNotepadNotePermanently(notepadNote);
      setIsNoteSaved(true);
      setTimeout(() => setIsNoteSaved(false), 3500);
    }
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3500);
  };

  const handleOpenSpreadsheet = () => {
    window.open(sharingLink, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyApiUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopiedApiUrl(true);
    setTimeout(() => setCopiedApiUrl(false), 2000);
  };

  const appsScriptCode = `/**
 * Google Apps Script for Hospital Claims Synchronization (37 Columns)
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
 * - Horizontal Alignment: Left side for all data rows
 * - Automatic Sorting: By Date of Admission (DOA)
 * - Sequential S.No auto-calculated after sorting
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
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

    // Support TPA & Insurance metadata synchronization (3 Columns: TPA, Insurance Company, Address)
    if (data && (data.action === "syncAllMetadata" || data.action === "syncTwoHeaders" || data.action === "syncThreeHeaders" || (data.tpas && !Array.isArray(data) && !data.patientName))) {
      var tpaSheet = ss.getSheetByName("TPA & Insurance") || ss.getSheetByName("TPAs & Insurance") || ss.getSheetByName("TPAs");
      if (!tpaSheet) tpaSheet = ss.insertSheet("TPA & Insurance");
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
        if (w1.slice(0, 7).join(' ') === w2.slice(0, 7).join(' ')) return true;
        var m = Math.min(w1.length, w2.length, 7);
        if (m >= 2 && w1.slice(0, m).join(' ') === w2.slice(0, m).join(' ')) return true;
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
      
      // First enforce plain text format ('@') across all data cells
      dataRange.setNumberFormat('@');
      dataRange.setValues(rows);
      dataRange.setVerticalAlignment("middle");
      dataRange.setHorizontalAlignment("left"); // Horizontal alignment left side
      dataRange.setFontFamily("Arial");
      dataRange.setFontSize(10);

      // Currency / Financial Amounts Formatting ONLY for Financial Columns (Total Bill to Payment Recived: Cols 16 to 22)
      var numericCols = [16, 17, 18, 19, 20, 21, 22];
      numericCols.forEach(function(colIdx) {
        sheet.getRange(2, colIdx, rows.length, 1).setNumberFormat('"₹"#,##0.00').setHorizontalAlignment("left");
      });

      // Text / ID / Insurance Limit / Date Columns Formatting as Plain Text (@) to preserve exact text & raw numbers as entered
      var textAndDateCols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37];
      textAndDateCols.forEach(function(colIdx) {
        sheet.getRange(2, colIdx, rows.length, 1).setNumberFormat('@').setHorizontalAlignment("left");
      });

      // Explicitly enforce left alignment across all data cells
      dataRange.setHorizontalAlignment("left");

      // Cell Borders
      dataRange.setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
    }
    
    // Auto Adjust Column Widths automatically with compact padding
    sheet.autoResizeColumns(1, headers.length);
    for (var col = 1; col <= headers.length; col++) {
      var currentWidth = sheet.getColumnWidth(col);
      // Compact width calculation: add 8px padding, keep min width 75px and max width 250px
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
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[6000] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#0F131D] border-2 border-slate-300 dark:border-indigo-500/40 rounded-2xl shadow-2xl dark:shadow-[0_0_60px_rgba(79,70,229,0.3)] max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-white transition-colors">
        
        {/* Modal Header */}
        <div className="bg-slate-50 dark:bg-[#181D2D] border-b border-slate-200 dark:border-indigo-900/80 px-5 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shadow-inner">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#0F9D58" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">
                  BIDIRECTIONAL LIVE SYNC
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide uppercase mt-0.5">
                GOOGLE SHEETS APPS SCRIPT SYNCHRONIZATION
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center text-sm transition-all cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-100 dark:bg-[#090C14] flex-1">
          {/* Field 1: MAIN DATA Google Spreadsheet LOAD */}
          <div className="bg-white dark:bg-[#121726] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2 shadow-sm">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center justify-center">1</span>
                MAIN DATA Google Spreadsheet LOAD
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Live Google Sheet View/Edit URL</span>
            </label>

            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={sharingLink}
                onChange={e => {
                  setSharingLink(e.target.value);
                  if (onSaveSpreadsheetSharingLink) onSaveSpreadsheetSharingLink(e.target.value);
                }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 bg-slate-50 dark:bg-[#090C14] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={async () => {
                  const cleanLink = (sharingLink || '').trim();
                  if (onSaveSpreadsheetSharingLink) onSaveSpreadsheetSharingLink(cleanLink);
                  try {
                    localStorage.setItem('googleSpreadsheetSharingLink', cleanLink);
                    localStorage.setItem('dashboard_claims_spreadsheet_url', cleanLink);
                  } catch {}
                  await saveDashboardSyncSettingsPermanently(apiUrl, cleanLink);
                  setSavedFeedback(true);
                  setTimeout(() => setSavedFeedback(false), 3500);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shrink-0 shadow-sm cursor-pointer"
              >
                💾 Save Link Permanent
              </button>
              <button
                type="button"
                onClick={handleOpenSpreadsheet}
                className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-600/30 hover:bg-indigo-100 dark:hover:bg-indigo-600/50 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/40 rounded-xl font-bold text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
              >
                ↗️ Open
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer"
              >
                {copiedLink ? '✓ Copied' : '📋 Copy Link'}
              </button>
            </div>
          </div>

          {/* Field 2: MAIN DATA Google Spreadsheet SYNC */}
          <div className="bg-white dark:bg-[#121726] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2 shadow-sm">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center">2</span>
                MAIN DATA Google Spreadsheet SYNC
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Deployed Web App API URL (Google Apps Script Endpoint &bull; Exec Endpoint)</span>
            </label>

            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={apiUrl}
                onChange={e => {
                  setApiUrl(e.target.value);
                  if (onSaveSyncApiUrl) onSaveSyncApiUrl(e.target.value);
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-slate-50 dark:bg-[#090C14] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={async () => {
                  const cleanUrl = (apiUrl || '').trim();
                  if (onSaveSyncApiUrl) onSaveSyncApiUrl(cleanUrl);
                  try {
                    localStorage.setItem('googleSheetsSyncUrl', cleanUrl);
                    localStorage.setItem('dashboard_claims_sync_url', cleanUrl);
                  } catch {}
                  await saveDashboardSyncSettingsPermanently(cleanUrl, sharingLink);
                  setSavedFeedback(true);
                  setTimeout(() => setSavedFeedback(false), 3500);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shrink-0 shadow-sm cursor-pointer"
              >
                💾 Save URL Permanent
              </button>
              <button
                type="button"
                onClick={handleCopyApiUrl}
                className="px-3.5 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer"
              >
                {copiedApiUrl ? '✓ Copied' : '📋 Copy Endpoint'}
              </button>
            </div>
          </div>

          {/* Field: Text Note Pad & Permanent Link Reference */}
          <div className="bg-white dark:bg-[#121726] border-2 border-indigo-300/80 dark:border-indigo-500/40 rounded-2xl p-4 space-y-3 shadow-sm transition-all">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[11px] font-black flex items-center justify-center">
                  📝
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                      Text Note Pad &amp; Permanent Link Reference
                    </span>
                    <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                      Permanently Saved
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Mention this link, Google Sheets URLs, Apps Script deployment IDs, or reference text. Permanently retained even after publishing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {!isNotepadHidden && (
                  <>
                    <button
                      type="button"
                      onClick={handlePasteIntoNote}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                      title="Paste text or link from clipboard"
                    >
                      <span>📋</span>
                      <span>Paste</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyNote}
                      disabled={!notepadNote}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                      title="Copy text note or link to clipboard"
                    >
                      <span>{copiedNote ? '✓ Copied' : '📋 Copy Note'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveNotePermanent}
                      disabled={isSavingNote}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Save permanently before publishing or deployment"
                    >
                      <span>💾</span>
                      <span>{isNoteSaved ? '✓ Saved Permanent!' : 'Save Note Permanent'}</span>
                    </button>

                    {notepadNote && (
                      <button
                        type="button"
                        onClick={handleClearNote}
                        className="px-2 py-1.5 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 rounded-lg font-semibold text-xs transition-all cursor-pointer"
                        title="Clear text note"
                      >
                        Clear
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const next = !isNotepadHidden;
                    setIsNotepadHidden(next);
                    localStorage.setItem('hideNotepad_reference', String(next));
                  }}
                  className="text-[11px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  title={isNotepadHidden ? "Show Text Note Pad" : "Hide Text Note Pad"}
                >
                  <span>{isNotepadHidden ? '▼ Show' : '▲ Hide'}</span>
                </button>
              </div>
            </div>

            {!isNotepadHidden && (
              <>
                {/* Textarea Notepad */}
                <div className="relative">
                  <textarea
                    value={notepadNote}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder="Paste or type any link, spreadsheet URL, Web App endpoint, or reference notes here... (e.g. https://docs.google.com/spreadsheets/d/...)"
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-[#080B14] border border-slate-300 dark:border-indigo-500/30 rounded-xl p-3 text-xs text-slate-900 dark:text-emerald-300 font-mono placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y min-h-[90px] leading-relaxed"
                  />
                </div>

                {/* Extra helpers: link detection & action buttons */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] pt-1 border-t border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {notepadNote && (notepadNote.includes('http://') || notepadNote.includes('https://')) ? (
                      (() => {
                        const match = notepadNote.match(/https?:\/\/[^\s"'<>]+/);
                        const detectedUrl = match ? match[0] : '';
                        return detectedUrl ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-500 dark:text-slate-400">Detected Link:</span>
                            <a
                              href={detectedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 underline font-mono max-w-xs sm:max-w-md truncate hover:text-indigo-500"
                              title={detectedUrl}
                            >
                              {detectedUrl}
                            </a>
                            <button
                              type="button"
                              onClick={() => window.open(detectedUrl, '_blank')}
                              className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-500/40 text-[10px] font-bold cursor-pointer"
                            >
                              ↗️ Open
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSharingLink(detectedUrl);
                                if (onSaveSpreadsheetSharingLink) onSaveSpreadsheetSharingLink(detectedUrl);
                                handleSaveAllLinks();
                              }}
                              className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-500/40 text-[10px] font-bold cursor-pointer"
                              title="Set this detected URL as the Main Spreadsheet Load Link"
                            >
                              📥 Use as Main Sheet Link
                            </button>
                          </div>
                        ) : null;
                      })()
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">
                        💡 Tip: Paste your Google Sheet sharing link here. You can update it anytime, copy it with 1-click, and it stays saved forever before and after publishing.
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    {notepadNote.length} characters &bull; {isNoteSaved ? '✓ Saved Permanent' : 'Auto-Saved'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Apps Script Code Box */}
          <div className="bg-white dark:bg-[#121726] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <span>📜</span> Apps Script Source Code (<code className="text-emerald-600 dark:text-emerald-400">Code.gs</code>)
                </span>
                <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                  Left Aligned
                </span>
                <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                  Sorted by DOA
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>📋</span> {copiedCode ? 'Copied Code!' : 'Copy Code.gs'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold underline cursor-pointer"
                >
                  {showCode ? 'Hide Code' : 'View Full Code'}
                </button>
              </div>
            </div>

            {showCode && (
              <div className="relative">
                <pre className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-72 leading-relaxed selection:bg-indigo-500 selection:text-white">
                  {appsScriptCode}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow cursor-pointer"
                >
                  {copiedCode ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-[#181D2D] border-t border-slate-200 dark:border-indigo-900/80 px-5 py-3.5 flex justify-between items-center shrink-0">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {savedFeedback ? '✓ Settings Saved Successfully!' : ''}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAllLinks}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              💾 Save All Links
            </button>

            {onSyncNow && (
              <button
                type="button"
                onClick={() => {
                  handleSaveAllLinks();
                  onSyncNow();
                }}
                disabled={isSyncing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span>🔄</span> {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
