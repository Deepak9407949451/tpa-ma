import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Claim, ClaimStatus } from './types';
import {
  formatDateForDisplay,
  normalizeDateForStorage,
  toComparableDate,
  getClaimFieldValue,
  computeClaimFinancials,
  buildCoverLetterDocument,
  formatAmountForExcel
} from './utils/formatters';
import { downloadBatchFolderCreationScript } from './utils/folderUtils';
import {
  GOOGLE_SHEETS_SYNC_URL,
  GOOGLE_SHEETS_LOAD_URL,
  addCustomInsuranceCompany
} from './constants/insuranceData';
import {
  loadMetadataFromGoogleSheet,
  autoLoadAllThreeColumnsFromSpreadsheet,
  getDashboardSyncUrl,
  getDashboardSpreadsheetUrl,
  saveDashboardSyncSettingsPermanently
} from './utils/metadataSync';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ImportExportSection } from './components/ImportExportSection';
import { DateFilterSection } from './components/DateFilterSection';
import { InvoiceCalculator } from './components/InvoiceCalculator';
import { ClaimsTable } from './components/ClaimsTable';
import { ClaimsGrid } from './components/ClaimsGrid';
import { ClaimFormModal } from './components/ClaimFormModal';
import { ClaimDetailsModal } from './components/ClaimDetailsModal';
import { SuccessPopup } from './components/SuccessPopup';
import { SyncLoadDetailsModal } from './components/SyncLoadDetailsModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { CoverLetterModal } from './components/CoverLetterModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { StayAlertModal } from './components/StayAlertModal';
import { getOverdueInitialApprovalClaims, StayAlertItem } from './utils/stayAlerts';

export const App: React.FC = () => {
  // Claims State
  const [claims, setClaims] = useState<Claim[]>(() => {
    try {
      const saved = localStorage.getItem('claims');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(claim => {
            const paymentDateVal =
              claim.paymentDate ??
              claim.payment_date ??
              claim['Payment Date'] ??
              claim['payment date'] ??
              claim['payment/utr'] ??
              claim['Payment/UTR'] ??
              '';
            const courierDateVal =
              claim.courierDate ?? claim.courier_date ?? claim['Courier Date'] ?? '';

            return {
              ...claim,
              doa: normalizeDateForStorage(claim.doa),
              dod: normalizeDateForStorage(claim.dod),
              paymentDate: normalizeDateForStorage(paymentDateVal),
              courierDate: normalizeDateForStorage(courierDateVal)
            };
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse localStorage claims:', e);
    }
    return [];
  });

  // UI Visibility States
  const [showImportExport, setShowImportExport] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showInvoiceCalc, setShowInvoiceCalc] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    return (localStorage.getItem('claimsViewMode') as 'table' | 'grid') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('claimsViewMode', viewMode);
  }, [viewMode]);

  // Theme Mode State
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('themeMode') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    if (themeMode === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };
  const [whatsAppPromptClaim, setWhatsAppPromptClaim] = useState<Claim | null>(null);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [coverLetterClaims, setCoverLetterClaims] = useState<Claim[]>([]);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false);

  // Hospital Stay Alert (> 5 Days Initial Approved Stay)
  const [isStayAlertModalOpen, setIsStayAlertModalOpen] = useState(false);
  const [activeStayAlertItems, setActiveStayAlertItems] = useState<StayAlertItem[]>([]);
  const [hasAutoTriggeredStayAlert, setHasAutoTriggeredStayAlert] = useState(false);

  // Filters & Search
  const [currentFilter, setCurrentFilter] = useState<ClaimStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateFilterFrom, setDateFilterFrom] = useState<Date | null>(null);
  const [dateFilterTo, setDateFilterTo] = useState<Date | null>(null);

  // Selection & Modals
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [claimToEdit, setClaimToEdit] = useState<{ claim: Claim; index: number } | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsIndex, setDetailsIndex] = useState<number | null>(null);

  // Daily Date Info Popup
  const [selectedDateDetailInfo, setSelectedDateDetailInfo] = useState<{
    dateKey: string;
    displayDate: string;
    admissions: number;
    discharges: number;
    admittedPatients: Claim[];
    dischargedPatients: Claim[];
  } | null>(null);

  const handleDateDoubleClick = useCallback((dateStr: string) => {
    if (!dateStr) return;
    const normalizedKey = normalizeDateForStorage(dateStr);
    if (!normalizedKey || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedKey)) return;

    const displayDate = formatDateForDisplay(normalizedKey);
    const admittedPatients = claims.filter(c => c.doa && normalizeDateForStorage(c.doa) === normalizedKey);
    const dischargedPatients = claims.filter(c => c.dod && normalizeDateForStorage(c.dod) === normalizedKey);

    setSelectedDateDetailInfo({
      dateKey: normalizedKey,
      displayDate,
      admissions: admittedPatients.length,
      discharges: dischargedPatients.length,
      admittedPatients,
      dischargedPatients
    });
  }, [claims]);

  // Feedback Notifications
  const [notification, setNotification] = useState<{ msg: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [successPopupMsg, setSuccessPopupMsg] = useState('');

  // Delete Confirmation Pop-Up Window State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'selected';
    singleIndex?: number;
    patientName?: string;
    count?: number;
  }>({ isOpen: false, type: 'single' });

  // Sync state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('hospitalAppAutoSyncEnabled') === 'true';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncDone, setIsSyncDone] = useState(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [syncSecondsLeft, setSyncSecondsLeft] = useState<number>(600);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return localStorage.getItem('lastGoogleSyncTime') || '';
  });

  // Sync Load Details Modal State
  const [syncLoadModalState, setSyncLoadModalState] = useState<{
    isOpen: boolean;
    loadedClaims: Claim[];
    timestamp: string;
  }>({
    isOpen: false,
    loadedClaims: [],
    timestamp: ''
  });

  const isDeprecatedUrl = (u?: string | null) => {
    if (!u) return true;
    return (
      u.includes('AKfycbx9rM25HYqLPjtW5DPSpKV9FCAs21LEQ1S8bRuAGUu9v0qWBoPxP4WvWb7s0VBAjyxy') ||
      u.includes('AKfycbwRh9f8LwDgm0SI1Lj934SeJxmmCMnEBFqWX5SlcR37qeQzcyo4XTLbKGoO2i7D54pm')
    );
  };

  const [syncApiUrl, setSyncApiUrl] = useState<string>(() => {
    const local = localStorage.getItem('googleSheetsSyncUrl');
    if (local && !isDeprecatedUrl(local)) {
      return local;
    }
    localStorage.setItem('googleSheetsSyncUrl', GOOGLE_SHEETS_SYNC_URL);
    return GOOGLE_SHEETS_SYNC_URL;
  });
  const [spreadsheetSharingLink, setSpreadsheetSharingLink] = useState<string>(() => {
    return localStorage.getItem('googleSpreadsheetSharingLink') || getDashboardSpreadsheetUrl();
  });

  // Load configuration permanently from server storage on startup
  useEffect(() => {
    const localSyncUrl = localStorage.getItem('googleSheetsSyncUrl');
    const validLocalSync = localSyncUrl && !isDeprecatedUrl(localSyncUrl) ? localSyncUrl : null;
    const localSharingLink = localStorage.getItem('googleSpreadsheetSharingLink');

    fetch('/api/config')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch config');
      })
      .then((data) => {
        if (data) {
          const rawServerSync = data.syncApiUrl && !isDeprecatedUrl(data.syncApiUrl) ? data.syncApiUrl : null;
          const chosenSyncUrl = validLocalSync || rawServerSync || GOOGLE_SHEETS_SYNC_URL;
          const chosenSharingLink = localSharingLink || data.spreadsheetSharingLink || getDashboardSpreadsheetUrl();

          setSyncApiUrl(chosenSyncUrl);
          localStorage.setItem('googleSheetsSyncUrl', chosenSyncUrl);

          setSpreadsheetSharingLink(chosenSharingLink);
          localStorage.setItem('googleSpreadsheetSharingLink', chosenSharingLink);

          if (data.outputDirectory) {
            localStorage.setItem('automationOutputDir', data.outputDirectory);
          }

          // Sync backend config file with chosen URLs
          fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              syncApiUrl: chosenSyncUrl,
              spreadsheetSharingLink: chosenSharingLink
            })
          }).catch(() => {});

          // Auto-load list from 1st Col (Col A), 2nd Col (Col B), 3rd Col (Col C) on app startup without clicking
          autoLoadAllThreeColumnsFromSpreadsheet().catch(err => {
            console.warn('Initial 3-column metadata autoload notice:', err);
          });
        }
      })
      .catch((err) => {
        console.warn('Backend server config fetch notice:', err);
        // Fallback auto-load on initial startup
        autoLoadAllThreeColumnsFromSpreadsheet().catch(() => {});
      });
  }, []);

  const handleSaveSyncApiUrl = (url: string) => {
    setSyncApiUrl(url);
    localStorage.setItem('googleSheetsSyncUrl', url);
    localStorage.setItem('dashboard_claims_sync_url', url);
    saveDashboardSyncSettingsPermanently(url, spreadsheetSharingLink).catch(err => console.warn('Sync API URL server save error:', err));
  };

  const handleSaveSpreadsheetSharingLink = (url: string) => {
    setSpreadsheetSharingLink(url);
    localStorage.setItem('googleSpreadsheetSharingLink', url);
    localStorage.setItem('dashboard_claims_spreadsheet_url', url);
    saveDashboardSyncSettingsPermanently(syncApiUrl, url).catch(err => console.warn('Spreadsheet sharing link server save error:', err));
  };

  // Sync claims to LocalStorage whenever modified
  useEffect(() => {
    localStorage.setItem('claims', JSON.stringify(claims));
  }, [claims]);

  // Stay Alert Calculation and Refresh Logic
  const refreshStayAlerts = useCallback((forceOpen = false) => {
    const overdue = getOverdueInitialApprovalClaims(claims);
    setActiveStayAlertItems(overdue);

    if (overdue.length === 0) {
      setIsStayAlertModalOpen(false);
      return;
    }

    const dueItems = overdue.filter(item => item.isDueForReminder);
    if (forceOpen || dueItems.length > 0) {
      setIsStayAlertModalOpen(true);
    }
  }, [claims]);

  // Initial and reactive check on claims change
  useEffect(() => {
    const overdue = getOverdueInitialApprovalClaims(claims);
    setActiveStayAlertItems(overdue);

    const dueItems = overdue.filter(item => item.isDueForReminder);
    if (dueItems.length > 0 && !hasAutoTriggeredStayAlert) {
      setIsStayAlertModalOpen(true);
      setHasAutoTriggeredStayAlert(true);
    }
  }, [claims, hasAutoTriggeredStayAlert]);

  // Background recurring timer (checks every 60s for 2-3h snooze expiration to issue 4x daily reminders)
  useEffect(() => {
    const interval = setInterval(() => {
      const overdue = getOverdueInitialApprovalClaims(claims);
      setActiveStayAlertItems(overdue);

      const dueItems = overdue.filter(item => item.isDueForReminder);
      if (dueItems.length > 0) {
        setIsStayAlertModalOpen(true);
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [claims]);

  const showNotification = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Google Sheets Sync Implementation
  const syncToGoogleSheet = useCallback(
    async (isManual = true) => {
      if (!claims.length) {
        if (isManual) alert('No data to sync.');
        return;
      }

      if (isManual) setIsSyncing(true);

      try {
        const syncData = claims.map((p, idx) => ({
          sNo: p.sNo || (idx + 1),
          patientName: p.patientName || p.name || '-',
          uhid: p.uhid || '-',
          mobileNumber: p.mobileNumber || p.mobile || '-',
          insuranceLimit: p.insuranceLimit || '-',
          ipdNo: p.ipdNo || '-',
          doa: formatDateForDisplay(p.doa || ''),
          dod: formatDateForDisplay(p.dod || ''),
          tpaName: p.tpaName || p.tpa || '-',
          insuranceCompany: p.insuranceCompany || '-',
          insuranceID: p.insuranceID || p.insuranceId || '-',
          claimNo: p.claimNo || '-',
          policyNumber: p.policyNumber || p.policyNo || '-',
          empID: p.empID || p.empId || '-',
          billInvoiceNo: p.billInvoiceNo || '-',
          totalBill: p.totalBill || '',
          approved: p.approved || '',
          discount: p.discount || '',
          patientPay: p.patientPay || '',
          settlementAmount: p.settlementAmount || '',
          tds: p.tds || p.tdsAmount || '',
          deduction: p.deduction || '',
          paymentDate: formatDateForDisplay(p.paymentDate || ''),
          utr: p.utr || p.paymentUTR || '',
          attenderName: p.attenderName || p.contact || '-',
          relation: p.relation || '-',
          insuranceAddress: p.insuranceAddress || '-',
          bankName: p.bankName || '-',
          bankAccountNo: p.bankAccountNo || '-',
          ifscCode: p.ifscCode || '-',
          bankAddress: p.bankAddress || '-',
          courierDetails: p.courierDetails || '-',
          courierDate: p.courierDate || '-',
          diagnosis: p.diagnosis || '-',
          surgeryName: p.surgeryName || '-',
          remark: p.remark || '-',
          status: p.status || '-'
        }));

        const response = await fetch(syncApiUrl || GOOGLE_SHEETS_SYNC_URL, {
          method: 'POST',
          body: JSON.stringify(syncData)
        });

        if (response.ok) {
          const timeStr = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
          setLastSyncedTime(timeStr);
          localStorage.setItem('lastGoogleSyncTime', timeStr);
          setSyncSecondsLeft(600);
          setIsSyncDone(true);
          showNotification('✓ Sync Done! Claims successfully updated in Google Sheet.', 'success');
          setTimeout(() => {
            setIsSyncDone(false);
          }, 4000);
          console.log('Sync completed successfully at:', new Date().toLocaleString());
        } else {
          const errText = await response.text();
          console.error('Sync failed', response.status, response.statusText, errText);
          showNotification(`❌ Sync failed: ${response.status} ${response.statusText}`, 'error');
        }
      } catch (e: any) {
        console.error('Error connecting to script:', e);
        showNotification('❌ Error connecting to Google Sheet script.', 'error');
      } finally {
        setIsSyncing(false);
      }
    },
    [claims, syncApiUrl]
  );

  // Auto Sync 10-Minute Live Countdown Timer (600s)
  useEffect(() => {
    localStorage.setItem('hospitalAppAutoSyncEnabled', autoSyncEnabled ? 'true' : 'false');
    if (!autoSyncEnabled) {
      setSyncSecondsLeft(600);
      return;
    }

    const interval = setInterval(() => {
      setSyncSecondsLeft((prev) => {
        if (prev <= 1) {
          console.log('Auto-sync triggered at:', new Date().toLocaleString());
          syncToGoogleSheet(false);
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSyncEnabled, syncToGoogleSheet]);

  const handleToggleAutoSync = () => {
    const nextState = !autoSyncEnabled;
    setAutoSyncEnabled(nextState);
    if (nextState) {
      setSyncSecondsLeft(600);
      syncToGoogleSheet(false);
    }
  };

  // Load from Google Sheet
  const handleLoadFromGoogleSheet = async () => {
    setIsLoadingSheet(true);
    let loadedRawItems: any[] = [];
    let loadSource = '';

    // Strategy 1: Try Deployed Web App API URL (syncApiUrl) via GET
    const targetApiUrl = syncApiUrl || localStorage.getItem('googleSheetsSyncUrl') || GOOGLE_SHEETS_SYNC_URL;
    if (targetApiUrl) {
      try {
        console.log('Attempting to fetch from Apps Script Web App URL:', targetApiUrl);
        const res = await fetch(targetApiUrl, { method: 'GET' });
        if (res.ok) {
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            const arrayData = Array.isArray(json)
              ? json
              : Array.isArray(json?.rows)
              ? json.rows
              : Array.isArray(json?.data)
              ? json.data
              : [];
            if (arrayData.length > 0) {
              loadedRawItems = arrayData;
              loadSource = 'Apps Script Web App API';
            }
          } catch (e) {
            console.warn('Response from Web App URL was not JSON:', text.substring(0, 100));
          }
        }
      } catch (err) {
        console.warn('Failed fetching from Web App API URL:', err);
      }
    }

    // Strategy 2: If Strategy 1 returned no items, try Google Spreadsheet Sharing Link export format
    const currentSharingLink = spreadsheetSharingLink || localStorage.getItem('googleSpreadsheetSharingLink') || getDashboardSpreadsheetUrl();
    if (loadedRawItems.length === 0 && currentSharingLink) {
      try {
        const sheetIdMatch = currentSharingLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const gidMatch = currentSharingLink.match(/gid=([0-9]+)/);
        const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;
        const gid = gidMatch ? gidMatch[1] : '0';

        if (sheetId) {
          const csvExportUrls = [
            `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
            `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`
          ];

          for (const csvUrl of csvExportUrls) {
            try {
              console.log('Attempting to fetch spreadsheet CSV from:', csvUrl);
              const csvRes = await fetch(csvUrl);
              if (csvRes.ok) {
                const csvText = await csvRes.text();
                if (csvText && csvText.trim().length > 0) {
                  const workbook = XLSX.read(csvText, { type: 'string', raw: true, cellDates: false });
                  const firstSheet = workbook.SheetNames[0];
                  if (firstSheet) {
                    const parsedJson = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { raw: true, defval: '' });
                    if (Array.isArray(parsedJson) && parsedJson.length > 0) {
                      loadedRawItems = parsedJson;
                      loadSource = 'Google Spreadsheet Link';
                      break;
                    }
                  }
                }
              }
            } catch (csvErr) {
              console.warn('Error fetching CSV URL:', csvUrl, csvErr);
            }
          }
        }
      } catch (linkErr) {
        console.warn('Error parsing Google Spreadsheet Sharing Link:', linkErr);
      }
    }

    // Strategy 3: Fallback to default GOOGLE_SHEETS_LOAD_URL if both failed
    if (loadedRawItems.length === 0 && GOOGLE_SHEETS_LOAD_URL) {
      try {
        console.log('Attempting fallback load URL:', GOOGLE_SHEETS_LOAD_URL);
        const res = await fetch(GOOGLE_SHEETS_LOAD_URL, { method: 'GET' });
        if (res.ok) {
          const json = await res.json();
          const arrayData = Array.isArray(json)
            ? json
            : Array.isArray(json?.rows)
            ? json.rows
            : Array.isArray(json?.data)
            ? json.data
            : [];
          if (arrayData.length > 0) {
            loadedRawItems = arrayData;
            loadSource = 'Fallback Endpoint';
          }
        }
      } catch (fallbackErr) {
        console.warn('Fallback load endpoint failed:', fallbackErr);
      }
    }

    if (loadedRawItems.length === 0) {
      showNotification('No data found in Google Sheet. Please verify your Spreadsheet Sharing Link and Apps Script URL.', 'error');
      setIsLoadingSheet(false);
      return;
    }

    const loadedClaims: Claim[] = loadedRawItems.map((rawClaim: any, idx: number) => ({
      ...rawClaim,
      sNo: getClaimFieldValue(rawClaim, ['sNo', 'S.No', 'SNo', 's_no', 'slNo']) || (idx + 1),
      patientName: getClaimFieldValue(rawClaim, ['patientName', 'Patient Details', 'Patient Name', 'patientDetails', 'name']),
      uhid: getClaimFieldValue(rawClaim, ['uhid', 'UHID']),
      mobileNumber: getClaimFieldValue(rawClaim, ['mobileNumber', 'mobile', 'Mobile Number']),
      insuranceLimit: getClaimFieldValue(rawClaim, ['insuranceLimit', 'Insurance Limit']),
      ipdNo: getClaimFieldValue(rawClaim, ['ipdNo', 'IPD No']),
      doa: normalizeDateForStorage(getClaimFieldValue(rawClaim, ['doa', 'DOA', 'doaDate', 'Date of Admission', 'Admission Date'])),
      dod: normalizeDateForStorage(getClaimFieldValue(rawClaim, ['dod', 'DOD', 'dodDate', 'Date of Discharge', 'Discharge Date'])),
      tpaName: getClaimFieldValue(rawClaim, ['tpaName', 'tpa', 'TPA/Ins. Name', 'TPA/Ins.Name', 'tpaInsName']),
      insuranceCompany: getClaimFieldValue(rawClaim, ['insuranceCompany', 'Insurance Company', 'settlementSummary', 'Settlement Summary']),
      insuranceID: getClaimFieldValue(rawClaim, ['insuranceID', 'insuranceIdNo', 'Insurance ID No', 'Insurance ID']),
      claimNo: getClaimFieldValue(rawClaim, ['claimNo', 'Claim No']),
      policyNumber: getClaimFieldValue(rawClaim, ['policyNumber', 'policyNo', 'Policy No']),
      empID: getClaimFieldValue(rawClaim, ['empID', 'empIdNo', 'EMP ID No', 'EMP ID']),
      billInvoiceNo: getClaimFieldValue(rawClaim, ['billInvoiceNo', 'Bill Invoice No']),
      totalBill: getClaimFieldValue(rawClaim, ['totalBill', 'Total Bill']),
      approved: getClaimFieldValue(rawClaim, ['approved', 'Approved']),
      discount: getClaimFieldValue(rawClaim, ['discount', 'Discount']),
      deduction: getClaimFieldValue(rawClaim, ['deduction', 'Deduction', 'Payment Recived', 'Payment Received']),
      patientPay: getClaimFieldValue(rawClaim, ['patientPay', 'Patient Pay']),
      settlementAmount: getClaimFieldValue(rawClaim, ['settlementAmount', 'Settlement Amount']),
      tds: getClaimFieldValue(rawClaim, ['tds', 'tdsAmount', 'TDS Amount']),
      paymentDate: normalizeDateForStorage(getClaimFieldValue(rawClaim, ['paymentDate', 'payment_date', 'Payment Date'])),
      utr: getClaimFieldValue(rawClaim, ['utr', 'UTR', 'utrno', 'payment_utr']),
      attenderName: getClaimFieldValue(rawClaim, ['attenderName', 'Attender Name']),
      relation: getClaimFieldValue(rawClaim, ['relation', 'Relation']),
      insuranceAddress: getClaimFieldValue(rawClaim, ['insuranceAddress', 'Insurance Address', 'insuranceaddress']),
      bankName: getClaimFieldValue(rawClaim, ['bankName', 'Bank Name', 'bank', 'Bank', 'bankname']),
      bankAccountNo: getClaimFieldValue(rawClaim, ['bankAccountNo', 'Bank Account No.', 'Bank Account No', 'Bank Account Number', 'Account Number', 'bankaccountno', 'bankaccountnumber']),
      ifscCode: getClaimFieldValue(rawClaim, ['ifscCode', 'IFSC Code', 'IFSC', 'ifsc']),
      bankAddress: getClaimFieldValue(rawClaim, ['bankAddress', 'Bank Address', 'bankaddress']),
      courierDetails: getClaimFieldValue(rawClaim, ['courierDetails', 'Courier Details']),
      courierDate: normalizeDateForStorage(getClaimFieldValue(rawClaim, ['courierDate', 'Courier Date'])),
      diagnosis: getClaimFieldValue(rawClaim, ['diagnosis', 'Diagnosis']),
      surgeryName: getClaimFieldValue(rawClaim, ['surgeryName', 'SurgeryName', 'Surgery Name']),
      remark: getClaimFieldValue(rawClaim, ['remark', 'Remark']),
      status: (getClaimFieldValue(rawClaim, ['status', 'Status']) as ClaimStatus) || 'Admitted'
    }));

    setClaims(loadedClaims);
    setSelectedIndices(new Set());
    const loadTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    showNotification(`Loaded ${loadedClaims.length} claims from Google Sheet (${loadSource})`, 'success');
    setSyncLoadModalState({
      isOpen: true,
      loadedClaims,
      timestamp: loadTimeStr
    });
    setIsLoadingSheet(false);
  };

  // Import File Handler (CSV or XLSX)
  const handleImportFile = (file: File) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!jsonRows.length) {
            showNotification('File must contain at least a header row and one data row', 'error');
            return;
          }

          const importedClaims: Claim[] = jsonRows.map((row: any) => {
            const c: Partial<Claim> = {
              patientName: String(row['Patient Name'] || row['Patient Details'] || row['patientName'] || row['name'] || '').trim(),
              uhid: String(row['UHID'] || row['uhid'] || '').trim(),
              mobileNumber: String(row['Mobile Number'] || row['mobileNumber'] || row['mobile'] || '').trim(),
              insuranceLimit: String(row['Insurance Limit'] || row['insuranceLimit'] || '').trim(),
              ipdNo: String(row['IPD No'] || row['ipdNo'] || '').trim(),
              doa: normalizeDateForStorage(row['DOA'] || row['doa'] || ''),
              dod: normalizeDateForStorage(row['DOD'] || row['dod'] || ''),
              tpaName: String(row['TPA/Ins. Name'] || row['tpaName'] || row['tpa'] || '').trim(),
              insuranceCompany: String(row['Insurance Company'] || row['insuranceCompany'] || '').trim(),
              insuranceID: String(row['Insurance ID'] || row['insuranceID'] || row['Insurance ID No'] || '').trim(),
              claimNo: String(row['Claim No'] || row['claimNo'] || '').trim(),
              policyNumber: String(row['Policy No'] || row['policyNumber'] || '').trim(),
              empID: String(row['EMP ID'] || row['empID'] || row['EMP ID No'] || '').trim(),
              billInvoiceNo: String(row['Bill Invoice No'] || row['billInvoiceNo'] || '').trim(),
              totalBill: String(row['Total Bill'] || row['totalBill'] || '').trim(),
              approved: String(row['Approved'] || row['approved'] || '').trim(),
              discount: String(row['Discount'] || row['discount'] || '').trim(),
              deduction: String(row['Payment Received'] || row['Payment Recived'] || row['Deduction'] || row['deduction'] || '').trim(),
              patientPay: String(row['Patient Pay'] || row['patientPay'] || '').trim(),
              settlementAmount: String(row['Settlement Amount'] || row['settlementAmount'] || '').trim(),
              tds: String(row['TDS Amount'] || row['tds'] || '').trim(),
              paymentDate: normalizeDateForStorage(row['Payment Date'] || row['paymentDate'] || ''),
              utr: String(row['UTR'] || row['utr'] || '').trim(),
              attenderName: String(row['Attender Name'] || row['attenderName'] || '').trim(),
              relation: String(row['Relation'] || row['relation'] || '').trim(),
              insuranceAddress: String(row['Insurance Address'] || row['insuranceAddress'] || '').trim(),
              bankName: String(row['Bank Name'] || row['bankName'] || '').trim(),
              bankAccountNo: String(row['Bank Account No'] || row['bankAccountNo'] || '').trim(),
              ifscCode: String(row['IFSC Code'] || row['ifscCode'] || '').trim(),
              bankAddress: String(row['Bank Address'] || row['bankAddress'] || '').trim(),
              courierDetails: String(row['Courier Details'] || row['courierDetails'] || '').trim(),
              courierDate: normalizeDateForStorage(row['Courier Date'] || row['courierDate'] || ''),
              diagnosis: String(row['Diagnosis'] || row['diagnosis'] || '').trim(),
              surgeryName: String(row['Surgery Name'] || row['surgeryName'] || '').trim(),
              remark: String(row['Remark'] || row['remark'] || '').trim(),
              status: (row['Status'] || row['status'] || 'Admitted') as ClaimStatus
            };
            computeClaimFinancials(c);
            return c as Claim;
          });

          setClaims(prev => [...prev, ...importedClaims]);
          showNotification(`✓ Imported ${importedClaims.length} records from Excel`, 'success');
        } catch (err: any) {
          showNotification('Error parsing XLSX file: ' + err.message, 'error');
        }
      };
      reader.readAsBinaryString(file);
    } else if (fileName.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim() !== '');
          if (lines.length < 2) {
            showNotification('File must contain at least a header row and one data row', 'error');
            return;
          }

          const parseCSVLine = (line: string) => {
            const res = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                res.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            res.push(current.trim());
            return res;
          };

          const rawHeaders = parseCSVLine(lines[0]);
          const newClaims: Claim[] = [];

          for (let i = 1; i < lines.length; i++) {
            const vals = parseCSVLine(lines[i]);
            if (!vals.length || (vals.length === 1 && !vals[0])) continue;

            const row: Record<string, string> = {};
            rawHeaders.forEach((h, idx) => {
              row[h] = vals[idx] || '';
            });

            const c: Partial<Claim> = {
              patientName: row['Patient Name'] || row['Patient Details'] || row['patientName'] || row['name'] || '',
              uhid: row['UHID'] || row['uhid'] || '',
              mobileNumber: row['Mobile Number'] || row['mobileNumber'] || '',
              insuranceLimit: row['Insurance Limit'] || row['insuranceLimit'] || '',
              ipdNo: row['IPD No'] || row['ipdNo'] || '',
              doa: normalizeDateForStorage(row['DOA'] || row['doa'] || ''),
              dod: normalizeDateForStorage(row['DOD'] || row['dod'] || ''),
              tpaName: row['TPA/Ins. Name'] || row['tpaName'] || '',
              insuranceCompany: row['Insurance Company'] || row['insuranceCompany'] || '',
              insuranceID: row['Insurance ID'] || row['insuranceID'] || '',
              claimNo: row['Claim No'] || row['claimNo'] || '',
              policyNumber: row['Policy No'] || row['policyNumber'] || '',
              empID: row['EMP ID'] || row['empID'] || '',
              billInvoiceNo: row['Bill Invoice No'] || row['billInvoiceNo'] || '',
              totalBill: row['Total Bill'] || row['totalBill'] || '',
              approved: row['Approved'] || row['approved'] || '',
              discount: row['Discount'] || row['discount'] || '',
              deduction: row['Payment Recived'] || row['deduction'] || '',
              patientPay: row['Patient Pay'] || row['patientPay'] || '',
              settlementAmount: row['Settlement Amount'] || row['settlementAmount'] || '',
              tds: row['TDS Amount'] || row['tds'] || '',
              paymentDate: normalizeDateForStorage(row['Payment Date'] || row['paymentDate'] || ''),
              utr: row['UTR'] || row['utr'] || '',
              attenderName: row['Attender Name'] || row['attenderName'] || '',
              relation: row['Relation'] || row['relation'] || '',
              insuranceAddress: row['Insurance Address'] || row['insuranceAddress'] || '',
              bankName: row['Bank Name'] || row['bankName'] || '',
              bankAccountNo: row['Bank Account No'] || row['bankAccountNo'] || '',
              ifscCode: row['IFSC Code'] || row['ifscCode'] || '',
              bankAddress: row['Bank Address'] || row['bankAddress'] || '',
              courierDetails: row['Courier Details'] || row['courierDetails'] || '',
              courierDate: normalizeDateForStorage(row['Courier Date'] || row['courierDate'] || ''),
              diagnosis: row['Diagnosis'] || row['diagnosis'] || '',
              surgeryName: row['Surgery Name'] || row['surgeryName'] || '',
              remark: row['Remark'] || row['remark'] || '',
              status: (row['Status'] || row['status'] || 'Admitted') as ClaimStatus
            };
            computeClaimFinancials(c);
            if (c.patientName || c.uhid) {
              newClaims.push(c as Claim);
            }
          }

          setClaims(prev => [...prev, ...newClaims]);
          showNotification(`✓ Imported ${newClaims.length} claims from CSV`, 'success');
        } catch (err: any) {
          showNotification('Error reading CSV file: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    } else {
      showNotification('Unsupported file format. Please use CSV or XLSX.', 'error');
    }
  };

  // CSV & Excel Export Handlers
  const formatExportDate = (dateVal: any): string => {
    if (!dateVal || dateVal === '-') return '';
    const formatted = formatDateForDisplay(dateVal);
    return formatted === '-' ? '' : formatted;
  };

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/[",\n\r\t]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCSV = (exportClaims: Claim[] = getFilteredClaims()) => {
    if (!exportClaims.length) {
      showNotification('No claims available to export', 'error');
      return;
    }

    const headers = [
      'S.No', 'Patient Details', 'UHID', 'Mobile Number', 'Insurance Limit', 'IPD No', 'DOA', 'DOD',
      'TPA/Ins. Name', 'Insurance Company', 'Insurance ID', 'Claim No', 'Policy No', 'EMP ID',
      'Bill Invoice No', 'Total Bill', 'Approved', 'Discount', 'Patient Pay', 'Settlement Amount',
      'TDS Amount', 'Payment Recived', 'Payment Date', 'UTR', 'Attender Name', 'Relation',
      'Insurance Address', 'Bank Name', 'Bank Account No', 'IFSC Code', 'Bank Address',
      'Courier Details', 'Courier Date', 'Diagnosis', 'Surgery Name', 'Remark', 'Status'
    ];

    let csv = headers.map(h => escapeCSV(h)).join(',') + '\n';

    exportClaims.forEach((claim, idx) => {
      const row = [
        (idx + 1).toString(),
        claim.patientName || '',
        claim.uhid || '',
        claim.mobileNumber || '',
        claim.insuranceLimit || '',
        claim.ipdNo || '',
        formatExportDate(claim.doa),
        formatExportDate(claim.dod),
        claim.tpaName || '',
        claim.insuranceCompany || '',
        claim.insuranceID || '',
        claim.claimNo || '',
        claim.policyNumber || '',
        claim.empID || '',
        claim.billInvoiceNo || '',
        claim.totalBill || '',
        claim.approved || '',
        claim.discount || '',
        claim.patientPay || '',
        claim.settlementAmount || '',
        claim.tds || '',
        claim.deduction || '',
        formatExportDate(claim.paymentDate),
        claim.utr || '',
        claim.attenderName || '',
        claim.relation || '',
        claim.insuranceAddress || '',
        claim.bankName || '',
        claim.bankAccountNo || '',
        claim.ifscCode || '',
        claim.bankAddress || '',
        claim.courierDetails || '',
        formatExportDate(claim.courierDate),
        claim.diagnosis || '',
        claim.surgeryName || '',
        claim.remark || '',
        claim.status || ''
      ].map(val => escapeCSV(val));

      csv += row.join(',') + '\n';
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `claims_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`✓ Exported ${exportClaims.length} claims to CSV!`, 'success');
  };

  const handleExportXLSX = (exportClaims: Claim[] = getFilteredClaims()) => {
    if (!exportClaims.length) {
      showNotification('No claims available to export', 'error');
      return;
    }

    const headers = [
      'S.No', 'Patient Details', 'UHID', 'Mobile Number', 'Insurance Limit', 'IPD No', 'DOA', 'DOD',
      'TPA/Ins. Name', 'Insurance Company', 'Insurance ID', 'Claim No', 'Policy No', 'EMP ID',
      'Bill Invoice No', 'Total Bill', 'Approved', 'Discount', 'Patient Pay', 'Settlement Amount',
      'TDS Amount', 'Payment Received', 'Payment Date', 'UTR', 'Attender Name', 'Relation',
      'Insurance Address', 'Bank Name', 'Bank Account No', 'IFSC Code', 'Bank Address',
      'Courier Details', 'Courier Date', 'Diagnosis', 'Surgery Name', 'Remark', 'Status'
    ];

    const rows = exportClaims.map((claim, idx) => [
      (idx + 1).toString(),
      claim.patientName || '',
      claim.uhid || '',
      claim.mobileNumber || '',
      formatAmountForExcel(claim.insuranceLimit),
      claim.ipdNo || '',
      formatExportDate(claim.doa),
      formatExportDate(claim.dod),
      claim.tpaName || '',
      claim.insuranceCompany || '',
      claim.insuranceID || '',
      claim.claimNo || '',
      claim.policyNumber || '',
      claim.empID || '',
      claim.billInvoiceNo || '',
      formatAmountForExcel(claim.totalBill),
      formatAmountForExcel(claim.approved),
      formatAmountForExcel(claim.discount),
      formatAmountForExcel(claim.patientPay),
      formatAmountForExcel(claim.settlementAmount),
      formatAmountForExcel(claim.tds),
      formatAmountForExcel(claim.deduction),
      formatExportDate(claim.paymentDate),
      claim.utr || '',
      claim.attenderName || '',
      claim.relation || '',
      claim.insuranceAddress || '',
      claim.bankName || '',
      claim.bankAccountNo || '',
      claim.ifscCode || '',
      claim.bankAddress || '',
      claim.courierDetails || '',
      formatExportDate(claim.courierDate),
      claim.diagnosis || '',
      claim.surgeryName || '',
      claim.remark || '',
      claim.status || ''
    ]);

    const aoa = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    const colWidths = headers.map((header, colIdx) => {
      let maxLen = header.length;
      rows.forEach(row => {
        const cell = row[colIdx];
        const val = typeof cell === 'object' && cell !== null ? (cell.w || String(cell.v || '')) : String(cell || '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Claims');
    XLSX.writeFile(workbook, `claims_export_${new Date().toISOString().slice(0, 10)}.xlsx`);

    showNotification(`✓ Exported ${exportClaims.length} claims to Excel (.XLSX)!`, 'success');
  };

  // Date Filter Helpers
  const handleApplyDateFilter = () => {
    if (!fromDate || !toDate) {
      showNotification('Please select both From Date and To Date', 'error');
      return;
    }
    if (fromDate > toDate) {
      showNotification('From Date cannot be greater than To Date', 'error');
      return;
    }

    setDateFilterFrom(new Date(fromDate));
    setDateFilterTo(new Date(toDate));
    showNotification(`Filtered by DOA date range: ${fromDate} to ${toDate}`, 'success');
  };

  const handleClearDateFilter = () => {
    setFromDate('');
    setToDate('');
    setDateFilterFrom(null);
    setDateFilterTo(null);
    showNotification('Date filter cleared', 'info');
  };

  // Filtered Claims calculation
  function getFilteredClaims(): Claim[] {
    let list = [...claims];

    if (fromDate || toDate) {
      const fromCmp = fromDate ? toComparableDate(fromDate) : '';
      const toCmp = toDate ? toComparableDate(toDate) : '';
      list = list.filter(c => {
        if (!c.doa) return false;
        const cmpDoa = toComparableDate(c.doa);
        if (!cmpDoa) return false;
        if (fromCmp && cmpDoa < fromCmp) return false;
        if (toCmp && cmpDoa > toCmp) return false;
        return true;
      });
    }

    if (currentFilter) {
      list = list.filter(c => c.status === currentFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => {
        // 1. Direct match on any property
        const directMatch = Object.values(c).some(val =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        );
        if (directMatch) return true;

        // 2. Serial Number (S.No in Total Patient list)
        const totalIdx = claims.indexOf(c);
        if (totalIdx !== -1) {
          const sNoStr = String(totalIdx + 1);
          if (sNoStr === q || sNoStr.includes(q)) return true;
        }

        // 3. Formatted Date search (DD-MM-YYYY, DD/MM/YYYY, etc.)
        const dateValues = [c.doa, c.dod, c.paymentDate, c.courierDate];
        for (const dv of dateValues) {
          if (dv && typeof dv === 'string') {
            const formattedDisplay = formatDateForDisplay(dv).toLowerCase();
            if (formattedDisplay.includes(q)) return true;
            const parts = dv.split('-');
            if (parts.length === 3) {
              const reverseDash = `${parts[2]}-${parts[1]}-${parts[0]}`.toLowerCase();
              const reverseSlash = `${parts[2]}/${parts[1]}/${parts[0]}`.toLowerCase();
              if (reverseDash.includes(q) || reverseSlash.includes(q)) return true;
            }
          }
        }

        // 4. Formatted Currency numbers (without currency symbols / commas)
        const numValues = [c.totalBill, c.approved, c.discount, c.deduction, c.patientPay, c.settlementAmount, c.tds];
        for (const nv of numValues) {
          if (nv) {
            const cleanDigits = String(nv).replace(/[^0-9.]/g, '');
            if (cleanDigits && cleanDigits.includes(q)) return true;
          }
        }

        return false;
      });
    }

    return list;
  }

  const filteredClaims = getFilteredClaims();

  // Selection actions
  const handleToggleSelect = (actualIndex: number) => {
    const next = new Set(selectedIndices);
    if (next.has(actualIndex)) {
      next.delete(actualIndex);
    } else {
      next.add(actualIndex);
    }
    setSelectedIndices(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleIndices = new Set<number>();
      filteredClaims.forEach(c => {
        const idx = claims.indexOf(c);
        if (idx !== -1) visibleIndices.add(idx);
      });
      setSelectedIndices(visibleIndices);
    } else {
      setSelectedIndices(new Set());
    }
  };

  const handleGenerateCoverLetter = (claimOrEvent?: Claim | any) => {
    let singleClaim: Claim | undefined = undefined;
    if (claimOrEvent && typeof claimOrEvent === 'object' && ('patientName' in claimOrEvent || 'claimNo' in claimOrEvent || 'uhid' in claimOrEvent || 'totalBill' in claimOrEvent)) {
      singleClaim = claimOrEvent as Claim;
    }

    let rowsToUse: Claim[] = [];
    if (singleClaim) {
      rowsToUse = [singleClaim];
    } else {
      const selectedList = Array.from(selectedIndices).map(idx => claims[idx]).filter(Boolean);
      rowsToUse = selectedList.length > 0 ? selectedList : filteredClaims;
    }

    if (!rowsToUse.length) {
      showNotification('No claims available to generate cover letter', 'error');
      return;
    }

    setCoverLetterClaims(rowsToUse);
    setShowCoverLetterModal(true);
  };

  const handleDeleteSingleClaim = (actualIndex: number) => {
    if (actualIndex < 0 || actualIndex >= claims.length) return;
    const target = claims[actualIndex];
    const patientName = target?.patientName || 'this patient';

    setDeleteConfirmModal({
      isOpen: true,
      type: 'single',
      singleIndex: actualIndex,
      patientName,
      count: 1
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIndices.size === 0) {
      showNotification('No patient records selected for deletion', 'error');
      return;
    }
    setDeleteConfirmModal({
      isOpen: true,
      type: 'selected',
      count: selectedIndices.size
    });
  };

  const executeDelete = () => {
    if (!deleteConfirmModal.isOpen) return;

    if (deleteConfirmModal.type === 'single' && deleteConfirmModal.singleIndex !== undefined) {
      const actualIndex = deleteConfirmModal.singleIndex;
      if (actualIndex >= 0 && actualIndex < claims.length) {
        const targetName = claims[actualIndex]?.patientName || deleteConfirmModal.patientName || 'Patient';
        const nextClaims = claims.filter((_, idx) => idx !== actualIndex);
        setClaims(nextClaims);
        setSelectedIndices(prev => {
          const next = new Set<number>();
          prev.forEach(idx => {
            if (idx < actualIndex) next.add(idx);
            else if (idx > actualIndex) next.add(idx - 1);
          });
          return next;
        });
        showNotification(`✓ Patient record "${targetName}" deleted successfully`, 'success');
        if (isDetailsModalOpen && detailsIndex === actualIndex) {
          setIsDetailsModalOpen(false);
          setDetailsIndex(null);
        }
      }
    } else if (deleteConfirmModal.type === 'selected') {
      const count = selectedIndices.size;
      if (count > 0) {
        const nextClaims = claims.filter((_, idx) => !selectedIndices.has(idx));
        setClaims(nextClaims);
        setSelectedIndices(new Set());
        showNotification(`✓ ${count} selected patient record(s) deleted successfully`, 'success');
      }
    }

    setDeleteConfirmModal({ isOpen: false, type: 'single' });
  };

  const cancelDelete = () => {
    setDeleteConfirmModal({ isOpen: false, type: 'single' });
  };

  // Batch Folder Creation Logic
  const handleBatchFolderCreate = () => {
    let targetClaims: Claim[] = [];
    if (selectedIndices.size > 0) {
      targetClaims = (Array.from(selectedIndices) as number[]).map(idx => claims[idx]).filter(Boolean);
    } else if (currentFilter) {
      targetClaims = filteredClaims;
    } else {
      const dischargeApproved = claims.filter(c => c.status === 'Discharge Approved');
      if (dischargeApproved.length > 0) {
        targetClaims = dischargeApproved;
      } else {
        targetClaims = filteredClaims;
      }
    }

    if (!targetClaims.length) {
      showNotification('No patient claims available for folder creation', 'error');
      return;
    }

    const outputDir = localStorage.getItem('automationOutputDir') || './PatientFolders';
    downloadBatchFolderCreationScript(targetClaims, outputDir);
    showNotification(`✓ Downloaded folder creation .bat file for ${targetClaims.length} patient(s)! (Format: Patient Name ( TPA Name ) DOA)`, 'success');
  };

  // Save Claim (Add or Update)
  const handleSaveClaim = useCallback((claim: Claim, isEdit: boolean, editIndex: number) => {
    if (claim.insuranceCompany && claim.insuranceCompany.trim()) {
      addCustomInsuranceCompany(claim.insuranceCompany);
    }
    if (isEdit && editIndex >= 0) {
      setClaims(prev => {
        const next = [...prev];
        next[editIndex] = claim;
        return next;
      });
    } else {
      setClaims(prev => [claim, ...prev]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0A0A0C] text-slate-800 dark:text-slate-300 p-3 sm:p-6 font-sans transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden border border-slate-200 dark:border-white/5 transition-colors duration-200">
        {/* Header */}
        <Header
          autoSyncEnabled={autoSyncEnabled}
          onToggleAutoSync={handleToggleAutoSync}
          onOpenGoogleSyncModal={() => setIsGoogleSyncModalOpen(true)}
          syncSecondsLeft={syncSecondsLeft}
          lastSyncedTime={lastSyncedTime}
          isSyncing={isSyncing}
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
        />

        {/* Floating / Top Toast Notification (Theme-Adaptive) */}
        {notification && (
          <div
            className={`fixed top-5 right-5 z-[10000] px-4 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-2xl border max-w-md transition-all animate-bounceIn flex items-center gap-2.5 backdrop-blur-md ${
              themeMode === 'light'
                ? notification.type === 'success'
                  ? 'bg-emerald-100/95 text-emerald-950 border-emerald-400 shadow-emerald-950/10'
                  : notification.type === 'error'
                  ? 'bg-rose-100/95 text-rose-950 border-rose-400 shadow-rose-950/10'
                  : 'bg-indigo-100/95 text-indigo-950 border-indigo-400 shadow-indigo-950/10'
                : notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/50 shadow-black'
                : notification.type === 'error'
                ? 'bg-rose-950/90 text-rose-100 border-rose-500/50 shadow-black'
                : 'bg-indigo-950/90 text-indigo-100 border-indigo-500/50 shadow-black'
            }`}
          >
            <span className="text-base leading-none">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>{notification.msg}</span>
          </div>
        )}

        <div className="p-4 sm:p-8 space-y-6">
          {/* Live Dashboard Section */}
          <Dashboard
            claims={claims}
            filteredClaims={filteredClaims}
            currentFilter={currentFilter}
            onFilterByStatus={(st) => setCurrentFilter(st)}
            onClearFilter={() => setCurrentFilter('')}
            onExportFiltered={() => handleExportCSV(filteredClaims)}
            onExportFilteredXLSX={() => handleExportXLSX(filteredClaims)}
            onEditClaim={(claim, index) => {
              setClaimToEdit({ claim, index });
              setIsFormModalOpen(true);
            }}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onApplyDateFilter={handleApplyDateFilter}
            onClearDateFilter={handleClearDateFilter}
            hasDateFilterActive={Boolean(dateFilterFrom && dateFilterTo)}
            filterStatusText={
              dateFilterFrom && dateFilterTo
                ? `Filtered: ${fromDate} to ${toDate}`
                : ''
            }
            onOpenImportExportModal={() => setShowImportExport(true)}
            onOpenGoogleSyncModal={() => setIsGoogleSyncModalOpen(true)}
            onSyncNow={() => syncToGoogleSheet(true)}
            isSyncing={isSyncing}
            isSyncDone={isSyncDone}
            onFolderCreate={handleBatchFolderCreate}
            overdueStayCount={activeStayAlertItems.length}
            onOpenStayAlerts={() => {
              refreshStayAlerts(true);
              setIsStayAlertModalOpen(true);
            }}
            themeMode={themeMode}
          />

          {/* Import / Export Section Modal */}
          <ImportExportSection
            isOpen={showImportExport}
            onToggle={() => setShowImportExport(!showImportExport)}
            onImportFile={handleImportFile}
            onExportCSV={() => handleExportCSV()}
            onExportXLSX={() => handleExportXLSX()}
            onLoadFromGoogleSheet={handleLoadFromGoogleSheet}
            onToggleInvoiceSection={() => setShowInvoiceCalc(!showInvoiceCalc)}
            isLoadingSheet={isLoadingSheet}
            claims={claims}
            selectedIndices={selectedIndices}
            currentFilter={currentFilter}
            onFilterByStatus={(st) => setCurrentFilter(st)}
            syncApiUrl={syncApiUrl}
            onSaveSyncApiUrl={handleSaveSyncApiUrl}
            spreadsheetSharingLink={spreadsheetSharingLink}
            onSaveSpreadsheetSharingLink={handleSaveSpreadsheetSharingLink}
            onSyncNow={() => syncToGoogleSheet(true)}
            isSyncing={isSyncing}
            onOpenGoogleSyncModal={() => setIsGoogleSyncModalOpen(true)}
            onShowNotification={(msg, type) => showNotification(msg, type)}
          />

          {/* Invoice Calculator Popup Modal & Floating Widget */}
          <InvoiceCalculator
            isOpen={showInvoiceCalc}
            onClose={() => setShowInvoiceCalc(false)}
          />

          {/* Claims List View (Table / Grid) */}
          <ClaimsTable
            claims={filteredClaims}
            allClaims={claims}
            currentFilter={currentFilter}
            onClearFilter={() => setCurrentFilter('')}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (currentFilter) {
                setCurrentFilter('');
              }
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenAddModal={() => {
              setClaimToEdit(null);
              setIsFormModalOpen(true);
            }}
            selectedIndices={selectedIndices}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onExportCSV={(exportList) => handleExportCSV(exportList || filteredClaims)}
            onExportXLSX={(exportList) => handleExportXLSX(exportList || filteredClaims)}
            onGenerateCoverLetter={handleGenerateCoverLetter}
            onShowDetails={(actualIdx) => {
              setDetailsIndex(actualIdx);
              setIsDetailsModalOpen(true);
            }}
            onEditClaim={(actualIdx) => {
              setClaimToEdit({ claim: claims[actualIdx], index: actualIdx });
              setIsFormModalOpen(true);
            }}
            onDeleteClaim={handleDeleteSingleClaim}
            onDeleteSelected={handleDeleteSelected}
            onDateDoubleClick={handleDateDoubleClick}
            onFolderCreate={handleBatchFolderCreate}
            themeMode={themeMode}
          />
        </div>
      </div>

      {/* Tabbed Add/Edit Modal */}
      <ClaimFormModal
        isOpen={isFormModalOpen}
        claimToEdit={claimToEdit}
        onClose={() => setIsFormModalOpen(false)}
        onSaveClaim={handleSaveClaim}
        existingClaims={claims}
        onShowSuccessPopup={(msg) => setSuccessPopupMsg(msg)}
        onShowNotification={showNotification}
        onPromptWhatsApp={(claim) => setWhatsAppPromptClaim(claim)}
      />

      {/* Details Popup Modal */}
      <ClaimDetailsModal
        isOpen={isDetailsModalOpen}
        claim={detailsIndex !== null ? claims[detailsIndex] : null}
        indexNo={detailsIndex !== null ? detailsIndex + 1 : undefined}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setDetailsIndex(null);
        }}
        onEdit={() => {
          if (detailsIndex !== null) {
            setClaimToEdit({ claim: claims[detailsIndex], index: detailsIndex });
            setIsDetailsModalOpen(false);
            setIsFormModalOpen(true);
          }
        }}
        onDelete={() => {
          if (detailsIndex !== null) {
            handleDeleteSingleClaim(detailsIndex);
          }
        }}
        onCoverLetter={() => {
          if (detailsIndex !== null && claims[detailsIndex]) {
            handleGenerateCoverLetter(claims[detailsIndex]);
          }
        }}
      />

      {/* Success Popup Dialog */}
      <SuccessPopup
        isOpen={Boolean(successPopupMsg)}
        message={successPopupMsg}
        onClose={() => setSuccessPopupMsg('')}
      />

      {/* WhatsApp Prompt Popup Modal */}
      <WhatsAppModal
        isOpen={Boolean(whatsAppPromptClaim)}
        claim={whatsAppPromptClaim}
        onClose={() => setWhatsAppPromptClaim(null)}
      />

      {/* Sync Load Details Popup Modal */}
      <SyncLoadDetailsModal
        isOpen={syncLoadModalState.isOpen}
        onClose={() => setSyncLoadModalState(prev => ({ ...prev, isOpen: false }))}
        loadedClaims={syncLoadModalState.loadedClaims}
        timestamp={syncLoadModalState.timestamp}
        spreadsheetUrl={spreadsheetSharingLink}
      />

      {/* Cover Letter Modal */}
      <CoverLetterModal
        isOpen={showCoverLetterModal}
        claims={coverLetterClaims}
        onClose={() => setShowCoverLetterModal(false)}
        themeMode={themeMode}
      />

      {/* Google Sheets Sync Setup Modal */}
      <GoogleSyncModal
        isOpen={isGoogleSyncModalOpen}
        onClose={() => setIsGoogleSyncModalOpen(false)}
        syncApiUrl={syncApiUrl}
        onSaveSyncApiUrl={handleSaveSyncApiUrl}
        spreadsheetSharingLink={spreadsheetSharingLink}
        onSaveSpreadsheetSharingLink={handleSaveSpreadsheetSharingLink}
        onSyncNow={() => syncToGoogleSheet(true)}
        isSyncing={isSyncing}
      />

      {/* Hospital Stay Duration Alert Modal (> 5 Days Initial Approved Stay) */}
      <StayAlertModal
        isOpen={isStayAlertModalOpen}
        alertItems={activeStayAlertItems}
        onClose={() => setIsStayAlertModalOpen(false)}
        onRefreshAlerts={() => refreshStayAlerts(false)}
        onShowNotification={showNotification}
        onEditClaim={(claim, index) => {
          setClaimToEdit({ claim, index });
          setIsStayAlertModalOpen(false);
          setIsFormModalOpen(true);
        }}
        themeMode={themeMode}
      />

      {/* Small Popup Window for Double-Clicked Date Details (Info Only) */}
      {selectedDateDetailInfo && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0F172A] border-2 border-indigo-400 dark:border-indigo-500/60 p-5 rounded-2xl shadow-2xl dark:shadow-[0_0_50px_rgba(99,102,241,0.4)] max-w-md w-full text-slate-800 dark:text-slate-200 space-y-4 transition-colors">
            {/* Popup Header */}
            <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-lg">
                  📅
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedDateDetailInfo.displayDate}</span>
                    <span className="text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Info Only
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Daily Admission & Discharge Summary</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateDetailInfo(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50/70 dark:bg-[#08080A] p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-500/30">
                <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Admissions</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-300 mt-0.5">{selectedDateDetailInfo.admissions}</div>
              </div>
              <div className="bg-purple-50/70 dark:bg-[#08080A] p-2.5 rounded-xl border border-purple-300 dark:border-purple-500/30">
                <div className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400 tracking-wider">Discharges</div>
                <div className="text-xl font-black text-purple-600 dark:text-purple-300 mt-0.5">{selectedDateDetailInfo.discharges}</div>
              </div>
              <div className="bg-indigo-50/70 dark:bg-[#08080A] p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-500/30">
                <div className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">Total Patients</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedDateDetailInfo.admissions + selectedDateDetailInfo.discharges}
                </div>
              </div>
            </div>

            {/* Patient Breakdown lists for information only */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {/* Admitted List */}
              <div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center justify-between">
                  <span>🟢 Admitted Patients ({selectedDateDetailInfo.admittedPatients.length})</span>
                </div>
                {selectedDateDetailInfo.admittedPatients.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-[#08080A] p-2 rounded-lg border border-slate-200 dark:border-white/5">
                    No admissions on this date.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {selectedDateDetailInfo.admittedPatients.map((p, idx) => {
                      const actualIdx = claims.indexOf(p);
                      return (
                        <div
                          key={idx}
                          onDoubleClick={() => {
                            if (actualIdx !== -1) {
                              setClaimToEdit({ claim: p, index: actualIdx });
                              setIsFormModalOpen(true);
                              setSelectedDateDetailInfo(null);
                            }
                          }}
                          className="bg-slate-50 dark:bg-[#08080A] p-2 rounded-lg border border-slate-200 dark:border-white/5 text-xs flex justify-between items-center hover:border-emerald-500/40 transition-all cursor-pointer group"
                          title="Double click or click Quick Edit to modify record"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">{p.patientName || 'Unnamed'}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">UHID: {p.uhid || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                              {p.status || 'Admitted'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (actualIdx !== -1) {
                                  setClaimToEdit({ claim: p, index: actualIdx });
                                  setIsFormModalOpen(true);
                                  setSelectedDateDetailInfo(null);
                                }
                              }}
                              className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded border border-indigo-400/30 transition-all hover:scale-105 flex items-center gap-1 cursor-pointer"
                              title="Quick Edit Patient Record"
                            >
                              <span>✏️</span> Quick Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Discharged List */}
              <div>
                <div className="text-xs font-bold text-purple-700 dark:text-purple-400 mb-1 flex items-center justify-between">
                  <span>🟣 Discharged Patients ({selectedDateDetailInfo.dischargedPatients.length})</span>
                </div>
                {selectedDateDetailInfo.dischargedPatients.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-[#08080A] p-2 rounded-lg border border-slate-200 dark:border-white/5">
                    No discharges on this date.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {selectedDateDetailInfo.dischargedPatients.map((p, idx) => {
                      const actualIdx = claims.indexOf(p);
                      return (
                        <div
                          key={idx}
                          onDoubleClick={() => {
                            if (actualIdx !== -1) {
                              setClaimToEdit({ claim: p, index: actualIdx });
                              setIsFormModalOpen(true);
                              setSelectedDateDetailInfo(null);
                            }
                          }}
                          className="bg-slate-50 dark:bg-[#08080A] p-2 rounded-lg border border-slate-200 dark:border-white/5 text-xs flex justify-between items-center hover:border-purple-500/40 transition-all cursor-pointer group"
                          title="Double click or click Quick Edit to modify record"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">{p.patientName || 'Unnamed'}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">UHID: {p.uhid || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 px-1.5 py-0.5 rounded font-bold">
                              {p.status || 'Discharged'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (actualIdx !== -1) {
                                  setClaimToEdit({ claim: p, index: actualIdx });
                                  setIsFormModalOpen(true);
                                  setSelectedDateDetailInfo(null);
                                }
                              }}
                              className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded border border-indigo-400/30 transition-all hover:scale-105 flex items-center gap-1 cursor-pointer"
                              title="Quick Edit Patient Record"
                            >
                              <span>✏️</span> Quick Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDateDetailInfo(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-bold transition-all shadow-md cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup Window */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[12000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0F172A] border-2 border-rose-500/60 p-6 rounded-2xl shadow-2xl dark:shadow-[0_0_50px_rgba(225,29,72,0.4)] max-w-md w-full text-slate-800 dark:text-slate-200 space-y-4 transition-colors">
            <div className="flex items-center gap-3 border-b border-rose-200 dark:border-rose-500/30 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400 text-xl font-bold shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Confirm Patient Deletion</span>
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-300 font-medium">Permanent Record Removal</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#08080A] p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {deleteConfirmModal.type === 'single' ? (
                <span>
                  Are you sure you want to delete patient record for{' '}
                  <strong className="text-slate-900 dark:text-white font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-500/30">
                    {deleteConfirmModal.patientName || 'this patient'}
                  </strong>
                  ? This data will be permanently removed.
                </span>
              ) : (
                <span>
                  Are you sure you want to delete{' '}
                  <strong className="text-slate-900 dark:text-white font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-500/30">
                    {deleteConfirmModal.count || selectedIndices.size} selected patient record(s)
                  </strong>
                  ? All selected records will be permanently removed.
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Cancel (Keep Data)
              </button>

              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🗑️</span>
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
