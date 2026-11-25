import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Bed,
  FileCheck,
  LogOut,
  ClipboardCheck,
  XCircle,
  Clock,
  Landmark,
  Receipt,
  ShieldCheck,
  Percent,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { Claim, ClaimStatus } from '../types';
import { formatDateForDisplay, normalizeDateForStorage, formatCurrencyDisplay, formatAmountForExcel } from '../utils/formatters';

interface DashboardProps {
  claims: Claim[];
  filteredClaims?: Claim[];
  currentFilter: string;
  onFilterByStatus: (status: ClaimStatus | '') => void;
  onClearFilter: () => void;
  onExportFiltered?: () => void;
  onExportFilteredXLSX?: () => void;
  onEditClaim?: (claim: Claim, index: number) => void;
  fromDate?: string;
  toDate?: string;
  onFromDateChange?: (val: string) => void;
  onToDateChange?: (val: string) => void;
  onApplyDateFilter?: () => void;
  onClearDateFilter?: () => void;
  hasDateFilterActive?: boolean;
  filterStatusText?: string;
  onImportFile?: (file: File) => void;
  onExportCSV?: () => void;
  onLoadFromGoogleSheet?: () => void;
  onToggleInvoiceSection?: () => void;
  isLoadingSheet?: boolean;
  onOpenGoogleSyncModal?: () => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  isSyncDone?: boolean;
  spreadsheetSharingLink?: string;
  onOpenImportExportModal?: () => void;
  onFolderCreate?: () => void;
  overdueStayCount?: number;
  onOpenStayAlerts?: () => void;
  themeMode?: 'dark' | 'light';
}

export const Dashboard: React.FC<DashboardProps> = ({
  claims,
  filteredClaims,
  currentFilter,
  onFilterByStatus,
  onClearFilter,
  onExportFiltered,
  onExportFilteredXLSX,
  onEditClaim,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onApplyDateFilter,
  onClearDateFilter,
  hasDateFilterActive,
  filterStatusText,
  onImportFile,
  onExportCSV,
  onLoadFromGoogleSheet,
  onToggleInvoiceSection,
  isLoadingSheet,
  onOpenGoogleSyncModal,
  onSyncNow,
  isSyncing = false,
  isSyncDone = false,
  spreadsheetSharingLink,
  onOpenImportExportModal,
  onFolderCreate,
  overdueStayCount = 0,
  onOpenStayAlerts,
  themeMode = 'dark'
}) => {
  const [showMonthlyTracker, setShowMonthlyTracker] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showBillingInfoModal, setShowBillingInfoModal] = useState(false);
  const [billingInfoTab, setBillingInfoTab] = useState<'all' | 'doa' | 'dod'>('all');
  const [billingSearchTerm, setBillingSearchTerm] = useState('');
  const [showTpaWiseModal, setShowTpaWiseModal] = useState(false);
  const [tpaSelectedMonth, setTpaSelectedMonth] = useState<string>('');
  const [tpaSearchTerm, setTpaSearchTerm] = useState('');
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [dailyMonthOnly, setDailyMonthOnly] = useState(true);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [dailySearchTerm, setDailySearchTerm] = useState('');
  const [popupSearchTerm, setPopupSearchTerm] = useState('');
  
  // Filtered Applied Data Popup Window State
  const [filteredDataModal, setFilteredDataModal] = useState<{
    isOpen: boolean;
    title: string;
    records: Claim[];
  } | null>(null);

  const [selectedDateDetail, setSelectedDateDetail] = useState<{
    dateKey: string;
    displayDate: string;
    admissions: number;
    discharges: number;
    admittedPatients: Claim[];
    dischargedPatients: Claim[];
  } | null>(null);

  const handleOpenDateInfoPopup = (dateKey: string, displayDate: string) => {
    const admittedPatients = claims.filter(c => {
      if (!c.doa) return false;
      const key = normalizeDateForStorage(c.doa);
      return key === dateKey;
    });

    const dischargedPatients = claims.filter(c => {
      if (!c.dod) return false;
      const key = normalizeDateForStorage(c.dod);
      return key === dateKey;
    });

    setSelectedDateDetail({
      dateKey,
      displayDate,
      admissions: admittedPatients.length,
      discharges: dischargedPatients.length,
      admittedPatients,
      dischargedPatients
    });
  };

  const handleCardDoubleClick = (titleLabel: string, statusFilter: string | null) => {
    let targetRecords: Claim[] = [];
    if (statusFilter === '') {
      targetRecords = claims;
    } else if (statusFilter === 'Settled') {
      targetRecords = claims.filter(c => c.status === 'Settled' || parseNum(c.settlementAmount) > 0);
      if (targetRecords.length === 0) targetRecords = claims.filter(c => c.status === 'Settled');
    } else if (statusFilter !== null) {
      targetRecords = claims.filter(c => c.status === statusFilter);
    } else if (titleLabel.includes('Total Bill')) {
      targetRecords = claims.filter(c => parseNum(c.totalBill) > 0);
      if (targetRecords.length === 0) targetRecords = claims;
    } else if (titleLabel.includes('Approved')) {
      targetRecords = claims.filter(c => parseNum(c.approved) > 0);
      if (targetRecords.length === 0) targetRecords = claims;
    } else if (titleLabel.includes('Discount')) {
      targetRecords = claims.filter(c => parseNum(c.discount) > 0);
    } else if (titleLabel.includes('Payment Recived') || titleLabel.includes('Deduction')) {
      targetRecords = claims.filter(c => parseNum(c.deduction) > 0);
    } else if (titleLabel.includes('Patient Pay')) {
      targetRecords = claims.filter(c => parseNum(c.patientPay) > 0);
    } else {
      targetRecords = activeFilteredList;
    }

    setPopupSearchTerm('');
    setFilteredDataModal({
      isOpen: true,
      title: titleLabel,
      records: targetRecords
    });
  };

  // Stats calculations
  const totalPatients = claims.length;
  const activeFilteredList = filteredClaims || claims.filter(c => currentFilter ? c.status === currentFilter : true);
  const filteredCount = activeFilteredList.length;
  const admitted = claims.filter(c => c.status === 'Admitted').length;
  const initialApproved = claims.filter(c => c.status === 'Initial Approved').length;
  const discharge = claims.filter(c => c.status === 'Discharge').length;
  const dischargeApproved = claims.filter(c => c.status === 'Discharge Approved').length;
  const denial = claims.filter(c => c.status === 'Denial').length;
  const pending = claims.filter(c => c.status === 'Pending').length;

  const parseNum = (val: any) => {
    if (!val) return 0;
    const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    return Number.isNaN(num) ? 0 : num;
  };

  const totalBill = claims.reduce((sum, c) => sum + parseNum(c.totalBill), 0);
  const approvedAmount = claims.reduce((sum, c) => sum + parseNum(c.approved), 0);
  const discountAmount = claims.reduce((sum, c) => sum + parseNum(c.discount), 0);
  const deductionAmount = claims.reduce((sum, c) => sum + parseNum(c.deduction), 0);
  const patientPayAmount = claims.reduce((sum, c) => sum + parseNum(c.patientPay), 0);
  const settledAmount = claims.reduce((sum, c) => {
    const sVal = parseNum(c.settlementAmount);
    if (c.status === 'Settled' || sVal > 0) {
      return sum + (sVal > 0 ? sVal : parseNum(c.approved));
    }
    return sum;
  }, 0);

  const formatCurrency = (amount: number) => {
    return '₹ ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Monthly Tracker calculations
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const months: { monthIndex: number; label: string; isCurrentMonth: boolean; count: number }[] = [];

  for (let idx = 0; idx <= currentMonth; idx++) {
    const monthDate = new Date(currentYear, idx, 1);
    months.push({
      monthIndex: idx,
      label: monthDate.toLocaleString('en-IN', { month: 'short' }),
      isCurrentMonth: idx === currentMonth,
      count: 0
    });
  }

  claims.forEach(claim => {
    if (!claim.doa) return;
    const parsedDate = new Date(claim.doa);
    if (Number.isNaN(parsedDate.getTime())) return;
    if (parsedDate.getFullYear() !== currentYear) return;
    if (parsedDate.getMonth() > currentMonth) return;

    const monthItem = months.find(item => item.monthIndex === parsedDate.getMonth());
    if (monthItem) monthItem.count++;
  });

  const defaultYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const [selectedMonthForDOD, setSelectedMonthForDOD] = useState<string>(defaultYearMonth);

  // Monthly Calculation according to DOD (Exact 01st of month to End of month)
  const getMonthlyDODCalculation = (yearMonthStr: string) => {
    let ym = yearMonthStr;
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
      ym = defaultYearMonth;
    }
    const [yStr, mStr] = ym.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1; // 0-indexed month

    const dateObj = new Date(y, m, 1);
    const monthName = dateObj.toLocaleString('en-IN', { month: 'long' });
    const fullMonthYearLabel = dateObj.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    const startOfMonthKey = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDayNum = new Date(y, m + 1, 0).getDate();
    const endOfMonthKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    const formattedStart = formatDateForDisplay(startOfMonthKey);
    const formattedEnd = formatDateForDisplay(endOfMonthKey);

    // Discharges according to DOD (01st to End of Month)
    const dischargedInMonth = claims.filter(c => {
      if (!c.dod) return false;
      const dodKey = normalizeDateForStorage(c.dod);
      if (!dodKey || !/^\d{4}-\d{2}-\d{2}$/.test(dodKey)) return false;
      return dodKey >= startOfMonthKey && dodKey <= endOfMonthKey;
    });

    // Admissions according to DOA (01st to End of Month)
    const admittedInMonth = claims.filter(c => {
      if (!c.doa) return false;
      const doaKey = normalizeDateForStorage(c.doa);
      if (!doaKey || !/^\d{4}-\d{2}-\d{2}$/.test(doaKey)) return false;
      return doaKey >= startOfMonthKey && doaKey <= endOfMonthKey;
    });

    return {
      yearMonthStr: ym,
      monthName,
      fullMonthYearLabel,
      startOfMonthKey,
      endOfMonthKey,
      formattedStart,
      formattedEnd,
      lastDayNum,
      dischargesCount: dischargedInMonth.length,
      admissionsCount: admittedInMonth.length,
      dischargedInMonth,
      admittedInMonth
    };
  };

  const currentMonthDODData = getMonthlyDODCalculation(selectedMonthForDOD);

  // Calculation of Month Billing Totals derived from dates of admission (DOA) and discharge (DOD)
  const getMonthlyBillingData = (yearMonthStr: string) => {
    const currentDOD = getMonthlyDODCalculation(yearMonthStr);
    const startOfMonthKey = currentDOD.startOfMonthKey;
    const endOfMonthKey = currentDOD.endOfMonthKey;

    // Strict discharges in selected month (DOD: 01st to end of month)
    const dodClaims = claims.filter(c => {
      if (!c.dod) return false;
      const dodKey = normalizeDateForStorage(c.dod);
      if (!dodKey || !/^\d{4}-\d{2}-\d{2}$/.test(dodKey)) return false;
      return dodKey >= startOfMonthKey && dodKey <= endOfMonthKey;
    });

    // Strict admissions in selected month (DOA: 01st to end of month)
    const doaClaims = claims.filter(c => {
      if (!c.doa) return false;
      const doaKey = normalizeDateForStorage(c.doa);
      if (!doaKey || !/^\d{4}-\d{2}-\d{2}$/.test(doaKey)) return false;
      return doaKey >= startOfMonthKey && doaKey <= endOfMonthKey;
    });

    // All claims active in month:
    // A claim belongs to the selected month if its Date of Discharge (DOD) is in the month,
    // OR if its Date of Admission (DOA) is in the month.
    const monthClaimsMap = new Map<string, typeof claims[0]>();
    dodClaims.forEach(c => {
      const id = String(c.id ?? c.sNo ?? `${c.uhid}-${c.ipdNo}-${c.dod}`);
      monthClaimsMap.set(id, c);
    });
    doaClaims.forEach(c => {
      const id = String(c.id ?? c.sNo ?? `${c.uhid}-${c.ipdNo}-${c.doa}`);
      monthClaimsMap.set(id, c);
    });
    claims.forEach(c => {
      const doaKey = c.doa ? normalizeDateForStorage(c.doa) : '';
      const dodKey = c.dod ? normalizeDateForStorage(c.dod) : '';
      const isDoa = !!(doaKey && /^\d{4}-\d{2}-\d{2}$/.test(doaKey) && doaKey >= startOfMonthKey && doaKey <= endOfMonthKey);
      const isDod = !!(dodKey && /^\d{4}-\d{2}-\d{2}$/.test(dodKey) && dodKey >= startOfMonthKey && dodKey <= endOfMonthKey);
      if (isDoa || isDod) {
        const id = String(c.id ?? c.sNo ?? `${c.uhid}-${c.ipdNo}-${c.doa || c.dod}`);
        monthClaimsMap.set(id, c);
      }
    });

    const monthClaims = Array.from(monthClaimsMap.values());

    // DOD (Discharges) Subtotals & Metrics
    const dodBilled = dodClaims.reduce((sum, c) => sum + parseNum(c.totalBill), 0);
    const dodApproved = dodClaims.reduce((sum, c) => sum + parseNum(c.approved), 0);
    const dodSettled = dodClaims.reduce((sum, c) => {
      const sVal = parseNum(c.settlementAmount);
      return sum + (c.status === 'Settled' || sVal > 0 ? (sVal > 0 ? sVal : parseNum(c.approved)) : 0);
    }, 0);
    const dodDiscount = dodClaims.reduce((sum, c) => sum + parseNum(c.discount), 0);
    const dodDeduction = dodClaims.reduce((sum, c) => sum + parseNum(c.deduction), 0);
    const dodPatientPay = dodClaims.reduce((sum, c) => sum + parseNum(c.patientPay), 0);
    const dodTds = dodClaims.reduce((sum, c) => sum + parseNum(c.tds), 0);
    const dodApprovalRate = dodBilled > 0 ? ((dodApproved / dodBilled) * 100).toFixed(1) : '0';

    // DOA (Admissions) Subtotals & Metrics
    const doaBilled = doaClaims.reduce((sum, c) => sum + parseNum(c.totalBill), 0);
    const doaApproved = doaClaims.reduce((sum, c) => sum + parseNum(c.approved), 0);
    const doaSettled = doaClaims.reduce((sum, c) => {
      const sVal = parseNum(c.settlementAmount);
      return sum + (c.status === 'Settled' || sVal > 0 ? (sVal > 0 ? sVal : parseNum(c.approved)) : 0);
    }, 0);
    const doaDiscount = doaClaims.reduce((sum, c) => sum + parseNum(c.discount), 0);
    const doaDeduction = doaClaims.reduce((sum, c) => sum + parseNum(c.deduction), 0);
    const doaPatientPay = doaClaims.reduce((sum, c) => sum + parseNum(c.patientPay), 0);
    const doaTds = doaClaims.reduce((sum, c) => sum + parseNum(c.tds), 0);
    const doaApprovalRate = doaBilled > 0 ? ((doaApproved / doaBilled) * 100).toFixed(1) : '0';

    // All Month Overall Totals
    const totalBilled = monthClaims.reduce((sum, c) => sum + parseNum(c.totalBill), 0);
    const totalApproved = monthClaims.reduce((sum, c) => sum + parseNum(c.approved), 0);
    const totalSettled = monthClaims.reduce((sum, c) => {
      const settledVal = parseNum(c.settlementAmount);
      if (c.status === 'Settled' || settledVal > 0) {
        return sum + (settledVal > 0 ? settledVal : parseNum(c.approved));
      }
      return sum;
    }, 0);

    const pendingClaims = monthClaims.filter(c => c.status === 'Pending' || c.status === 'Initial Approved' || !c.status);
    const totalPendingAmount = pendingClaims.reduce((sum, c) => sum + parseNum(c.totalBill), 0);

    const totalDiscount = monthClaims.reduce((sum, c) => sum + parseNum(c.discount), 0);
    const totalDeduction = monthClaims.reduce((sum, c) => sum + parseNum(c.deduction), 0);
    const totalPatientPay = monthClaims.reduce((sum, c) => sum + parseNum(c.patientPay), 0);
    const totalTds = monthClaims.reduce((sum, c) => sum + parseNum(c.tds), 0);

    const billedVsApprovedDiff = Math.max(0, totalBilled - totalApproved);
    const approvalRate = totalBilled > 0 ? ((totalApproved / totalBilled) * 100).toFixed(1) : '0';

    return {
      monthClaims,
      doaClaims,
      dodClaims,
      totalBilled,
      totalApproved,
      totalSettled,
      totalPendingAmount,
      pendingCount: pendingClaims.length,
      settledCount: monthClaims.filter(c => c.status === 'Settled').length,
      totalDiscount,
      totalDeduction,
      totalPatientPay,
      totalTds,
      billedVsApprovedDiff,
      approvalRate,
      doaBilled,
      doaApproved,
      doaSettled,
      doaDiscount,
      doaDeduction,
      doaPatientPay,
      doaTds,
      doaApprovalRate,
      dodBilled,
      dodApproved,
      dodSettled,
      dodDiscount,
      dodDeduction,
      dodPatientPay,
      dodTds,
      dodApprovalRate
    };
  };

  const currentMonthBillingData = getMonthlyBillingData(selectedMonthForDOD);

  const getAvailableMonthsOptions = () => {
    const monthSet = new Set<string>();
    monthSet.add(defaultYearMonth);

    const nowObj = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(nowObj.getFullYear(), nowObj.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(ym);
    }

    claims.forEach(c => {
      if (c.dod) {
        const key = normalizeDateForStorage(c.dod);
        if (key && key.length >= 7 && /^\d{4}-\d{2}/.test(key)) {
          monthSet.add(key.substring(0, 7));
        }
      }
      if (c.doa) {
        const key = normalizeDateForStorage(c.doa);
        if (key && key.length >= 7 && /^\d{4}-\d{2}/.test(key)) {
          monthSet.add(key.substring(0, 7));
        }
      }
    });

    const sorted = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    return sorted.map(ym => {
      const [yStr, mStr] = ym.split('-');
      const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
      return {
        value: ym,
        label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
      };
    });
  };

  // Daily Admission & Discharge calculations
  const getDailyDetailsList = () => {
    const map: Record<string, { admissions: number; discharges: number }> = {};

    claims.forEach(claim => {
      // DOA count
      if (claim.doa) {
        const doaKey = normalizeDateForStorage(claim.doa);
        if (doaKey && /^\d{4}-\d{2}-\d{2}$/.test(doaKey)) {
          if (!map[doaKey]) map[doaKey] = { admissions: 0, discharges: 0 };
          map[doaKey].admissions++;
        }
      }

      // DOD count
      if (claim.dod) {
        const dodKey = normalizeDateForStorage(claim.dod);
        if (dodKey && /^\d{4}-\d{2}-\d{2}$/.test(dodKey)) {
          if (!map[dodKey]) map[dodKey] = { admissions: 0, discharges: 0 };
          map[dodKey].discharges++;
        }
      }
    });

    const sortedDates = Object.keys(map).sort((a, b) => b.localeCompare(a)); // Newest first

    return sortedDates.map(dateKey => {
      const displayDate = formatDateForDisplay(dateKey);
      return {
        dateKey,
        displayDate,
        admissions: map[dateKey].admissions,
        discharges: map[dateKey].discharges
      };
    });
  };

  const dailyDetailsList = getDailyDetailsList();
  const filteredDailyList = dailyDetailsList.filter(item => {
    if (dailyMonthOnly && selectedMonthForDOD) {
      if (!item.dateKey.startsWith(selectedMonthForDOD)) return false;
    }
    if (!dailySearchTerm.trim()) return true;
    const q = dailySearchTerm.toLowerCase();
    return item.dateKey.toLowerCase().includes(q) || item.displayDate.toLowerCase().includes(q);
  });

  const totalDailyAdmissions = dailyDetailsList.reduce((acc, item) => acc + item.admissions, 0);
  const totalDailyDischarges = dailyDetailsList.reduce((acc, item) => acc + item.discharges, 0);

  // Helper to ensure numeric values in Excel have NO currency symbols ('₹', 'Rs.') and are formatted cleanly
  const cleanNumberForExport = (val: any) => formatAmountForExcel(val);

  // Export Selected Month Data to Excel (Guaranteed NO ₹ signs, exact .00 formatting, and NO extra 00 appended)
  const handleExportMonthlyExcel = () => {
    const currentDOD = getMonthlyDODCalculation(selectedMonthForDOD);
    const billing = getMonthlyBillingData(selectedMonthForDOD);
    const monthLabel = currentDOD.fullMonthYearLabel;

    const claimHeaders = [
      'S.No', 'Patient Name', 'UHID', 'Mobile Number', 'Insurance Limit', 'IPD No', 'DOA', 'DOD',
      'TPA / INS. Name', 'Insurance Company', 'Insurance ID', 'Claim No', 'Policy No', 'EMP ID',
      'Bill Invoice No', 'Total Bill', 'Approved Amount', 'Discount', 'Patient Pay', 'Settlement Amount',
      'TDS Amount', 'Payment Received', 'Payment Date', 'UTR', 'Attender Name', 'Relation',
      'Insurance Address', 'Bank Name', 'Bank Account No', 'IFSC Code', 'Bank Address',
      'Courier Details', 'Courier Date', 'Diagnosis', 'Surgery Name', 'Remark', 'Status'
    ];

    const createRowsWithTotals = (list: Claim[], label: string) => {
      const rows = list.map((claim, idx) => [
        idx + 1,
        claim.patientName || '',
        claim.uhid || '',
        claim.mobileNumber || '',
        formatAmountForExcel(claim.insuranceLimit),
        claim.ipdNo || '',
        formatDateForDisplay(claim.doa),
        formatDateForDisplay(claim.dod),
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
        formatDateForDisplay(claim.paymentDate),
        claim.utr || '',
        claim.attenderName || '',
        claim.relation || '',
        claim.insuranceAddress || '',
        claim.bankName || '',
        claim.bankAccountNo || '',
        claim.ifscCode || '',
        claim.bankAddress || '',
        claim.courierDetails || '',
        formatDateForDisplay(claim.courierDate),
        claim.diagnosis || '',
        claim.surgeryName || '',
        claim.remark || '',
        claim.status || ''
      ]);

      const sumBill = Math.round(list.reduce((sum, c) => sum + parseNum(c.totalBill), 0) * 100) / 100;
      const sumAppr = Math.round(list.reduce((sum, c) => sum + parseNum(c.approved), 0) * 100) / 100;
      const sumDisc = Math.round(list.reduce((sum, c) => sum + parseNum(c.discount), 0) * 100) / 100;
      const sumPay = Math.round(list.reduce((sum, c) => sum + parseNum(c.patientPay), 0) * 100) / 100;
      const sumSet = Math.round(list.reduce((sum, c) => sum + parseNum(c.settlementAmount), 0) * 100) / 100;
      const sumTds = Math.round(list.reduce((sum, c) => sum + parseNum(c.tds), 0) * 100) / 100;
      const sumDed = Math.round(list.reduce((sum, c) => sum + parseNum(c.deduction), 0) * 100) / 100;

      const totalRow = [
        'TOTAL',
        `${list.length} ${label}`,
        '', '', '', '', '', '', '', '', '', '', '', '', '',
        formatAmountForExcel(sumBill, true),
        formatAmountForExcel(sumAppr, true),
        formatAmountForExcel(sumDisc, true),
        formatAmountForExcel(sumPay, true),
        formatAmountForExcel(sumSet, true),
        formatAmountForExcel(sumTds, true),
        formatAmountForExcel(sumDed, true),
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
      ];

      return [...rows, totalRow];
    };

    // 1. Sheet 1: Month Discharges (by DOD)
    const dodRows = createRowsWithTotals(billing.dodClaims, 'Discharges');
    const dodSheet = XLSX.utils.aoa_to_sheet([claimHeaders, ...dodRows]);
    dodSheet['!cols'] = claimHeaders.map((h, i) => {
      let maxLen = h.length;
      dodRows.forEach(r => {
        const cell = r[i];
        const valStr = typeof cell === 'object' && cell !== null ? (cell.w || String(cell.v || '')) : String(cell || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });

    // 2. Sheet 2: Month Admissions (by DOA)
    const doaRows = createRowsWithTotals(billing.doaClaims, 'Admissions');
    const doaSheet = XLSX.utils.aoa_to_sheet([claimHeaders, ...doaRows]);
    doaSheet['!cols'] = claimHeaders.map((h, i) => {
      let maxLen = h.length;
      doaRows.forEach(r => {
        const cell = r[i];
        const valStr = typeof cell === 'object' && cell !== null ? (cell.w || String(cell.v || '')) : String(cell || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });

    // 3. Sheet 3: All Month Patients
    const allRows = createRowsWithTotals(billing.monthClaims, 'Patients');
    const allSheet = XLSX.utils.aoa_to_sheet([claimHeaders, ...allRows]);
    allSheet['!cols'] = claimHeaders.map((h, i) => {
      let maxLen = h.length;
      allRows.forEach(r => {
        const cell = r[i];
        const valStr = typeof cell === 'object' && cell !== null ? (cell.w || String(cell.v || '')) : String(cell || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });

    // 4. Sheet 4: Daily Breakdown (Admissions and Discharges)
    const dateSummaryHeaders = [
      'Date', 'Admissions (DOA)', 'Discharges (DOD)', 'Total Patients',
      'Admissions Billed Amount', 'Admissions Approved Amount',
      'Discharges Billed Amount', 'Discharges Approved Amount',
      'Total Day Billed Amount', 'Total Day Approved Amount'
    ];

    const monthDailyItems = dailyDetailsList.filter(d => d.dateKey >= currentDOD.startOfMonthKey && d.dateKey <= currentDOD.endOfMonthKey);
    let totalAdmCount = 0;
    let totalDisCount = 0;
    let totalAdmBilled = 0;
    let totalAdmApproved = 0;
    let totalDisBilled = 0;
    let totalDisApproved = 0;

    const dateRows = monthDailyItems.map(dItem => {
      const dayAdmittedPatients = claims.filter(c => c.doa && normalizeDateForStorage(c.doa) === dItem.dateKey);
      const dayDischargedPatients = claims.filter(c => c.dod && normalizeDateForStorage(c.dod) === dItem.dateKey);

      const admBilled = dayAdmittedPatients.reduce((sum, c) => sum + parseNum(c.totalBill), 0);
      const admApproved = dayAdmittedPatients.reduce((sum, c) => sum + parseNum(c.approved), 0);
      const disBilled = dayDischargedPatients.reduce((sum, c) => sum + parseNum(c.totalBill), 0);
      const disApproved = dayDischargedPatients.reduce((sum, c) => sum + parseNum(c.approved), 0);

      totalAdmCount += dayAdmittedPatients.length;
      totalDisCount += dayDischargedPatients.length;
      totalAdmBilled += admBilled;
      totalAdmApproved += admApproved;
      totalDisBilled += disBilled;
      totalDisApproved += disApproved;

      return [
        dItem.displayDate,
        dayAdmittedPatients.length,
        dayDischargedPatients.length,
        dayAdmittedPatients.length + dayDischargedPatients.length,
        formatAmountForExcel(admBilled, true),
        formatAmountForExcel(admApproved, true),
        formatAmountForExcel(disBilled, true),
        formatAmountForExcel(disApproved, true),
        formatAmountForExcel(admBilled + disBilled, true),
        formatAmountForExcel(admApproved + disApproved, true)
      ];
    });

    const dateTotalRow = [
      'TOTAL',
      totalAdmCount,
      totalDisCount,
      totalAdmCount + totalDisCount,
      formatAmountForExcel(totalAdmBilled, true),
      formatAmountForExcel(totalAdmApproved, true),
      formatAmountForExcel(totalDisBilled, true),
      formatAmountForExcel(totalDisApproved, true),
      formatAmountForExcel(totalAdmBilled + totalDisBilled, true),
      formatAmountForExcel(totalAdmApproved + totalDisApproved, true)
    ];

    const dateSheet = XLSX.utils.aoa_to_sheet([dateSummaryHeaders, ...dateRows, dateTotalRow]);
    dateSheet['!cols'] = [
      { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
      { wch: 24 }, { wch: 26 }, { wch: 24 }, { wch: 26 },
      { wch: 22 }, { wch: 24 }
    ];

    // 5. Sheet 5: Monthly Billing & Approvals Summary
    const summaryHeaders = ['Metric Description', 'Value'];
    const summaryRows = [
      ['Selected Month & Year', monthLabel],
      ['Period Start Date', currentDOD.formattedStart],
      ['Period End Date', currentDOD.formattedEnd],
      ['--- DISCHARGES OF THE MONTH (BY DOD) ---', '------------------------'],
      ['Total Discharges in Month (by DOD)', currentDOD.dischargesCount],
      ['Discharges Total Billed Amount', formatAmountForExcel(billing.dodBilled, true)],
      ['Discharges Total Approved Amount', formatAmountForExcel(billing.dodApproved, true)],
      ['Discharges Approval Rate (%)', parseFloat(billing.dodApprovalRate) || 0],
      ['Discharges Total Settled Amount', formatAmountForExcel(billing.dodSettled, true)],
      ['Discharges Total Discounts', formatAmountForExcel(billing.dodDiscount, true)],
      ['Discharges Total Deductions', formatAmountForExcel(billing.dodDeduction, true)],
      ['Discharges Total Patient Pay', formatAmountForExcel(billing.dodPatientPay, true)],
      ['Discharges Total TDS Amount', formatAmountForExcel(billing.dodTds, true)],
      ['--- ADMISSIONS OF THE MONTH (BY DOA) ---', '------------------------'],
      ['Total Admissions in Month (by DOA)', currentDOD.admissionsCount],
      ['Admissions Total Billed Amount', formatAmountForExcel(billing.doaBilled, true)],
      ['Admissions Total Approved Amount', formatAmountForExcel(billing.doaApproved, true)],
      ['Admissions Approval Rate (%)', parseFloat(billing.doaApprovalRate) || 0],
      ['--- ALL MONTH PATIENT CLAIMS (DOA OR DOD) ---', '------------------------'],
      ['Total Unique Patient Claims in Month', billing.monthClaims.length],
      ['All Month Total Billed Amount', formatAmountForExcel(billing.totalBilled, true)],
      ['All Month Total Approved Amount', formatAmountForExcel(billing.totalApproved, true)],
      ['All Month Overall Approval Rate (%)', parseFloat(billing.approvalRate) || 0],
      ['Total Settled Amount', formatAmountForExcel(billing.totalSettled, true)],
      ['Settled Claims Count', billing.settledCount],
      ['Total Pending Amount', formatAmountForExcel(billing.totalPendingAmount, true)],
      ['Pending Claims Count', billing.pendingCount],
      ['Total Discounts', formatAmountForExcel(billing.totalDiscount, true)],
      ['Total Deductions', formatAmountForExcel(billing.totalDeduction, true)],
      ['Total Patient Pay', formatAmountForExcel(billing.totalPatientPay, true)],
      ['Total TDS Amount', formatAmountForExcel(billing.totalTds, true)]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
    summarySheet['!cols'] = [{ wch: 45 }, { wch: 28 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, dodSheet, 'Month Discharges (DOD)');
    XLSX.utils.book_append_sheet(workbook, doaSheet, 'Month Admissions (DOA)');
    XLSX.utils.book_append_sheet(workbook, allSheet, 'All Month Patients');
    XLSX.utils.book_append_sheet(workbook, dateSheet, 'Daily Breakdown');
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Monthly Summary');

    const cleanMonth = monthLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(workbook, `Monthly_Report_${cleanMonth}.xlsx`);
  };

  // Helper to export filtered records directly from popup windows
  const handleExportFilteredModalRecords = (records: Claim[], title: string) => {
    const claimHeaders = [
      'S.No', 'Patient Name', 'UHID', 'Mobile Number', 'Insurance Limit', 'IPD No', 'DOA', 'DOD',
      'TPA / INS. Name', 'Insurance Company', 'Insurance ID', 'Claim No', 'Policy No', 'EMP ID',
      'Bill Invoice No', 'Total Bill', 'Approved Amount', 'Discount', 'Patient Pay', 'Settlement Amount',
      'TDS Amount', 'Payment Received', 'Payment Date', 'UTR', 'Attender Name', 'Relation',
      'Insurance Address', 'Bank Name', 'Bank Account No', 'IFSC Code', 'Bank Address',
      'Courier Details', 'Courier Date', 'Diagnosis', 'Surgery Name', 'Remark', 'Status'
    ];

    const claimRows = records.map((claim, idx) => [
      idx + 1,
      claim.patientName || '',
      claim.uhid || '',
      claim.mobileNumber || '',
      formatAmountForExcel(claim.insuranceLimit),
      claim.ipdNo || '',
      formatDateForDisplay(claim.doa),
      formatDateForDisplay(claim.dod),
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
      formatDateForDisplay(claim.paymentDate),
      claim.utr || '',
      claim.attenderName || '',
      claim.relation || '',
      claim.insuranceAddress || '',
      claim.bankName || '',
      claim.bankAccountNo || '',
      claim.ifscCode || '',
      claim.bankAddress || '',
      claim.courierDetails || '',
      formatDateForDisplay(claim.courierDate),
      claim.diagnosis || '',
      claim.surgeryName || '',
      claim.remark || '',
      claim.status || ''
    ]);

    const totalBillSum = Math.round(records.reduce((sum, c) => sum + parseNum(c.totalBill), 0) * 100) / 100;
    const totalApprovedSum = Math.round(records.reduce((sum, c) => sum + parseNum(c.approved), 0) * 100) / 100;
    const totalDiscountSum = Math.round(records.reduce((sum, c) => sum + parseNum(c.discount), 0) * 100) / 100;
    const totalPatientPaySum = Math.round(records.reduce((sum, c) => sum + parseNum(c.patientPay), 0) * 100) / 100;
    const totalSettlementSum = Math.round(records.reduce((sum, c) => sum + parseNum(c.settlementAmount), 0) * 100) / 100;
    const totalTdsSum = Math.round(records.reduce((sum, c) => sum + parseNum(c.tds), 0) * 100) / 100;
    const totalDeductionSum = Math.round(records.reduce((sum, c) => sum + parseNum(c.deduction), 0) * 100) / 100;

    const totalRow = [
      'TOTAL',
      `${records.length} Records`,
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      formatAmountForExcel(totalBillSum, true),
      formatAmountForExcel(totalApprovedSum, true),
      formatAmountForExcel(totalDiscountSum, true),
      formatAmountForExcel(totalPatientPaySum, true),
      formatAmountForExcel(totalSettlementSum, true),
      formatAmountForExcel(totalTdsSum, true),
      formatAmountForExcel(totalDeductionSum, true),
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];

    const sheet = XLSX.utils.aoa_to_sheet([claimHeaders, ...claimRows, totalRow]);
    sheet['!cols'] = claimHeaders.map((h, i) => {
      let maxLen = h.length;
      claimRows.forEach(r => {
        const cell = r[i];
        const valStr = typeof cell === 'object' && cell !== null ? (cell.w || String(cell.v || '')) : String(cell || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Records');
    const cleanTitle = (title || 'Filtered_Records').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    XLSX.writeFile(wb, `${cleanTitle}.xlsx`);
  };

  // Month-wise TPA Admission calculation according to TPA / INS. NAME
  const getTpaWiseData = (yearMonthStr: string) => {
    let ym = yearMonthStr;
    if (!ym) ym = selectedMonthForDOD || defaultYearMonth;

    const isAllMonths = ym === 'ALL';
    let startOfMonthKey = '';
    let endOfMonthKey = '';
    let fullMonthYearLabel = 'All Months Cumulative';

    if (!isAllMonths) {
      const [yStr, mStr] = ym.split('-');
      const y = parseInt(yStr, 10) || currentYear;
      const m = (parseInt(mStr, 10) || (currentMonth + 1)) - 1;
      const dateObj = new Date(y, m, 1);
      fullMonthYearLabel = dateObj.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      startOfMonthKey = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDayNum = new Date(y, m + 1, 0).getDate();
      endOfMonthKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
    }

    const tpaMap: Record<string, {
      name: string;
      tpaNameOnly: string;
      insNameOnly: string;
      admittedClaims: Claim[];
      dischargedClaims: Claim[];
      allClaims: Claim[];
      totalBilled: number;
      totalApproved: number;
    }> = {};

    claims.forEach(c => {
      let isAdmittedInPeriod = false;
      let isDischargedInPeriod = false;

      if (c.doa) {
        const doaKey = normalizeDateForStorage(c.doa);
        if (doaKey && /^\d{4}-\d{2}-\d{2}$/.test(doaKey)) {
          if (isAllMonths || (doaKey >= startOfMonthKey && doaKey <= endOfMonthKey)) {
            isAdmittedInPeriod = true;
          }
        }
      }

      if (c.dod) {
        const dodKey = normalizeDateForStorage(c.dod);
        if (dodKey && /^\d{4}-\d{2}-\d{2}$/.test(dodKey)) {
          if (isAllMonths || (dodKey >= startOfMonthKey && dodKey <= endOfMonthKey)) {
            isDischargedInPeriod = true;
          }
        }
      }

      if (isAdmittedInPeriod || isDischargedInPeriod || isAllMonths) {
        const tpaOnly = (c.tpaName || '').trim();
        const insOnly = (c.insuranceCompany || '').trim();
        let displayName = '';

        if (tpaOnly && insOnly) {
          if (tpaOnly.toLowerCase() === insOnly.toLowerCase()) {
            displayName = tpaOnly;
          } else {
            displayName = `${tpaOnly} / ${insOnly}`;
          }
        } else {
          displayName = tpaOnly || insOnly || 'Unspecified TPA / Insurance';
        }

        if (!tpaMap[displayName]) {
          tpaMap[displayName] = {
            name: displayName,
            tpaNameOnly: tpaOnly,
            insNameOnly: insOnly,
            admittedClaims: [],
            dischargedClaims: [],
            allClaims: [],
            totalBilled: 0,
            totalApproved: 0
          };
        }

        if (!tpaMap[displayName].allClaims.includes(c)) {
          tpaMap[displayName].allClaims.push(c);
          tpaMap[displayName].totalBilled += parseNum(c.totalBill);
          tpaMap[displayName].totalApproved += parseNum(c.approved);
        }

        if (isAdmittedInPeriod && !tpaMap[displayName].admittedClaims.includes(c)) {
          tpaMap[displayName].admittedClaims.push(c);
        }

        if (isDischargedInPeriod && !tpaMap[displayName].dischargedClaims.includes(c)) {
          tpaMap[displayName].dischargedClaims.push(c);
        }
      }
    });

    const fullList = Object.values(tpaMap).sort((a, b) => {
      const aCount = a.admittedClaims.length + a.dischargedClaims.length;
      const bCount = b.admittedClaims.length + b.dischargedClaims.length;
      if (bCount !== aCount) return bCount - aCount;
      return b.allClaims.length - a.allClaims.length;
    });

    const filteredList = fullList.filter(item => {
      if (!tpaSearchTerm.trim()) return true;
      const q = tpaSearchTerm.toLowerCase();
      return item.name.toLowerCase().includes(q) ||
             item.tpaNameOnly.toLowerCase().includes(q) ||
             item.insNameOnly.toLowerCase().includes(q);
    });

    return {
      selectedYm: ym,
      fullMonthYearLabel,
      fullList,
      filteredList,
      totalTpaCount: fullList.length,
      totalAdmissions: fullList.reduce((sum, item) => sum + item.admittedClaims.length, 0),
      totalDischarges: fullList.reduce((sum, item) => sum + item.dischargedClaims.length, 0),
      totalBilled: fullList.reduce((sum, item) => sum + item.totalBilled, 0),
      totalApproved: fullList.reduce((sum, item) => sum + item.totalApproved, 0)
    };
  };

  const cards = [
    {
      label: 'Total Patients',
      value: totalPatients,
      status: '' as const,
      isAmount: false,
      icon: Users,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/15 border-indigo-500/30 group-hover:border-indigo-500/60'
    },
    {
      label: 'Admitted',
      value: admitted,
      status: 'Admitted' as const,
      isAmount: false,
      icon: Bed,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15 border-blue-500/30 group-hover:border-blue-500/60'
    },
    {
      label: 'Initial Approved',
      value: initialApproved,
      status: 'Initial Approved' as const,
      isAmount: false,
      icon: FileCheck,
      color: 'text-teal-400',
      bg: 'bg-teal-500/15 border-teal-500/30 group-hover:border-teal-500/60'
    },
    {
      label: 'Discharge',
      value: discharge,
      status: 'Discharge' as const,
      isAmount: false,
      icon: LogOut,
      color: 'text-orange-400',
      bg: 'bg-orange-500/15 border-orange-500/30 group-hover:border-orange-500/60'
    },
    {
      label: 'Discharge Approved',
      value: dischargeApproved,
      status: 'Discharge Approved' as const,
      isAmount: false,
      icon: ClipboardCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15 border-emerald-500/30 group-hover:border-emerald-500/60'
    },
    {
      label: 'Denial',
      value: denial,
      status: 'Denial' as const,
      isAmount: false,
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/15 border-rose-500/30 group-hover:border-rose-500/60'
    },
    {
      label: 'Pending',
      value: pending,
      status: 'Pending' as const,
      isAmount: false,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15 border-amber-500/30 group-hover:border-amber-500/60'
    },
    {
      label: 'Settled',
      value: formatCurrency(settledAmount),
      status: 'Settled' as const,
      isAmount: true,
      icon: Landmark,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15 border-cyan-500/30 group-hover:border-cyan-500/60'
    },
    {
      label: 'Total Bill',
      value: formatCurrency(totalBill),
      status: null,
      isAmount: true,
      icon: Receipt,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/15 border-yellow-500/30 group-hover:border-yellow-500/60'
    },
    {
      label: 'Approved',
      value: formatCurrency(approvedAmount),
      status: null,
      isAmount: true,
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15 border-emerald-500/30 group-hover:border-emerald-500/60'
    },
    {
      label: 'Discount',
      value: formatCurrency(discountAmount),
      status: null,
      isAmount: true,
      icon: Percent,
      color: 'text-violet-400',
      bg: 'bg-violet-500/15 border-violet-500/30 group-hover:border-violet-500/60'
    },
    {
      label: 'Payment Recived',
      value: formatCurrency(deductionAmount),
      status: null,
      isAmount: true,
      icon: CreditCard,
      color: 'text-sky-400',
      bg: 'bg-sky-500/15 border-sky-500/30 group-hover:border-sky-500/60'
    },
    {
      label: 'Patient Pay',
      value: formatCurrency(patientPayAmount),
      status: null,
      isAmount: true,
      icon: UserCheck,
      color: 'text-purple-400',
      bg: 'bg-purple-500/15 border-purple-500/30 group-hover:border-purple-500/60'
    }
  ];

  return (
    <div className="bg-[#121216] border border-white/5 p-6 rounded-2xl text-white shadow-2xl mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-40 bg-[radial-gradient(circle_at_100%_0%,rgba(99,102,241,0.12),transparent_70%)] pointer-events-none"></div>

      <div className="flex justify-between items-center mb-6 flex-wrap gap-4 relative z-10">
        <h2 className="text-xl font-bold flex items-center gap-2.5 text-white tracking-tight">
          <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse"></span>
          Live Dashboard
          {currentFilter && (
            <span
              onDoubleClick={() => handleCardDoubleClick(`Filtered Applied: ${currentFilter}`, currentFilter)}
              className="text-xs font-semibold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full shadow-sm cursor-pointer hover:bg-indigo-500/30 transition-all"
              title="Double click to view filtered applied records in popup window"
            >
              Filtered: {currentFilter} ({filteredCount} records) 💬
            </span>
          )}
        </h2>

        {currentFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            {onExportFiltered && (
              <button
                type="button"
                onClick={onExportFiltered}
                className="bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow flex items-center gap-1.5 hover:-translate-y-0.5"
                title="Export only the applied filter claims data to CSV"
              >
                <span>⬆️</span> CSV ({filteredCount})
              </button>
            )}

            {onExportFilteredXLSX && (
              <button
                type="button"
                onClick={onExportFilteredXLSX}
                className="bg-teal-900/80 hover:bg-teal-800 text-teal-200 border border-teal-500/40 text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow flex items-center gap-1.5 hover:-translate-y-0.5"
                title="Export only the applied filter claims data to Excel (.XLSX)"
              >
                <span>📊</span> Excel ({filteredCount})
              </button>
            )}

            <button
              type="button"
              onClick={onClearFilter}
              className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/30 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shadow"
            >
              ✕ Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* OVERDUE STAY ALERT BANNER (> 5 DAYS IN INITIAL APPROVAL) */}
      {overdueStayCount > 0 && onOpenStayAlerts && (
        <div
          className={`stay-alert-banner mb-5 border-2 p-3 sm:p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 relative z-10 animate-fadeIn transition-colors ${
            themeMode === 'light'
              ? 'bg-gradient-to-r from-amber-100/90 via-amber-50 to-orange-100/90 border-amber-500 shadow-md text-slate-900'
              : 'bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-orange-950/80 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.25)] text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-9 h-9 rounded-xl border text-lg flex items-center justify-center shrink-0 animate-bounce ${
                themeMode === 'light'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-800'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              }`}
            >
              🚨
            </span>
            <div>
              <div
                className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                  themeMode === 'light' ? 'text-amber-900' : 'text-amber-400'
                }`}
              >
                <span>Hospital Stay Protocol Alert</span>
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                  {overdueStayCount} Patient{overdueStayCount > 1 ? 's' : ''} Exceeding 5 Days
                </span>
              </div>
              <p
                className={`text-xs font-medium mt-0.5 ${
                  themeMode === 'light' ? 'text-amber-950' : 'text-amber-200/90'
                }`}
              >
                Initial approval patients hospitalized for &gt; 5 days require interim Clinical Summary &amp; Running Bill submission.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="view-stay-alerts-btn"
            onClick={onOpenStayAlerts}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 hover:scale-105 shrink-0 uppercase tracking-wider cursor-pointer"
          >
            <span>⚠️</span>
            <span>View Stay Alerts ({overdueStayCount})</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 relative z-10">
        {cards.map((card, idx) => {
          const isActive = card.status !== null && currentFilter === card.status;
          const isClickable = card.status !== null;
          const IconComponent = card.icon;

          return (
            <div
              key={idx}
              onClick={() => {
                if (isClickable) {
                  onFilterByStatus(card.status as ClaimStatus | '');
                }
              }}
              onDoubleClick={() => handleCardDoubleClick(card.label, card.status)}
              className={`p-3 rounded-xl text-center transition-all shadow-md border cursor-pointer select-none group hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] flex flex-col items-center justify-between ${
                isActive
                  ? 'bg-[#16161C] border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                  : 'bg-[#08080A] border-white/5'
              }`}
              title="Click to filter • Double click to view records popup window"
            >
              <div className="w-full flex flex-col items-center">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 border transition-transform group-hover:scale-110 shadow-xs ${card.bg}`}>
                  <IconComponent className={`w-4 h-4 ${card.color}`} />
                </div>
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider mb-1 leading-tight text-center ${
                    isActive ? 'text-indigo-300 font-extrabold' : 'text-slate-400'
                  }`}
                >
                  {card.label}
                </div>
              </div>
              <div className="w-full mt-0.5">
                <div
                  className={`font-extrabold ${
                    card.isAmount ? 'text-xs break-words font-mono' : 'text-xl'
                  } ${isActive ? 'text-white' : 'text-indigo-300'}`}
                >
                  {card.value}
                </div>
                <div className="text-[8px] text-indigo-400/80 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  2x click popup
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tracker Controls Section */}
      <div className="mt-5 pt-3 border-t border-white/5 relative z-10 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowMonthlyTracker(!showMonthlyTracker)}
          title="Show Monthly Admissions Tracker"
          className="bg-white/5 hover:bg-white/10 text-indigo-400 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold shadow transition-all flex items-center gap-2"
        >
          <span>📅</span> Admissions Tracker ({currentYear})
        </button>

        <button
          type="button"
          onClick={() => setShowDailyModal(true)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setShowBillingInfoModal(true);
          }}
          title="Open Daily Admissions & Discharges Details Popup (Double-click for Month Billing Info)"
          className="bg-indigo-600/80 hover:bg-indigo-500 text-white border border-indigo-400/30 px-3.5 py-2 rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 hover:scale-105 cursor-pointer"
        >
          <span>📊</span> Daily Details & Discharges
          <span className="bg-purple-500/30 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full text-[10px] font-extrabold ml-1">
            Month DOD: {currentMonthDODData.dischargesCount}
          </span>
          {hasDateFilterActive && (
            <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full text-[9px] shadow-sm ml-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
              DOA Filter
            </span>
          )}
        </button>

        {/* Import / Export Data Management Icon Button in Live Dashboard Toolbar */}
        <button
          type="button"
          onClick={() => {
            if (onOpenImportExportModal) onOpenImportExportModal();
            else setShowImportExportModal(true);
          }}
          title="Open Import / Export Data Management Popup Window"
          className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold shadow transition-all flex items-center gap-2 hover:scale-105 cursor-pointer"
        >
          <span className="bg-emerald-500/20 p-1 rounded-md text-emerald-300 text-xs">📁</span>
          <span>Import / Export</span>
        </button>

        {/* Sync Button right after Import / Export */}
        <button
          type="button"
          onClick={() => {
            if (onSyncNow) {
              onSyncNow();
            } else if (onOpenGoogleSyncModal) {
              onOpenGoogleSyncModal();
            }
          }}
          title="Sync now to Google Sheet"
          className={`px-3 py-2 rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 hover:scale-105 cursor-pointer border ${
            isSyncDone
              ? 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 border-indigo-500/40'
          }`}
        >
          <span className={`text-xs ${isSyncing ? 'animate-spin' : ''}`}>
            {isSyncDone ? '✅' : '🔄'}
          </span>
          <span>{isSyncing ? 'Syncing...' : isSyncDone ? 'Sync Done!' : 'Sync'}</span>
        </button>

        {/* Compact Address Button linking to Insurance Address Directory */}
        <a
          href="https://insurance-address.ai.studio"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Insurance Address Directory (https://insurance-address.ai.studio)"
          className="bg-teal-950/70 hover:bg-teal-900/90 text-teal-300 border border-teal-500/40 px-3 py-2 rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 hover:scale-105 cursor-pointer no-underline"
        >
          <span>📍</span>
          <span>Address</span>
        </a>

        {/* Small Toggle Link Button for ESIC Smart Patient Manager near Address */}
        <a
          href="https://esic-smart-patient-manager.ai.studio"
          target="_blank"
          rel="noopener noreferrer"
          title="Open ESIC Smart Patient Manager (https://esic-smart-patient-manager.ai.studio)"
          className="bg-sky-950/70 hover:bg-sky-900/90 text-sky-300 border border-sky-500/40 px-3 py-2 rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 hover:scale-105 cursor-pointer no-underline"
        >
          <span>🏥</span>
          <span>ESIC Manager</span>
          <span className="text-[10px] text-sky-400">↗</span>
        </a>

        {showMonthlyTracker && (
          <div className="w-full mt-4 bg-[#08080A] border border-white/10 rounded-2xl p-4 text-white">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <span>Admissions by Date of Admission ({currentYear})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDailyModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 text-xs px-3 py-1 rounded-xl font-bold transition-all shadow flex items-center gap-1.5"
                  title="View Daily Admission & Discharge Count Popup"
                >
                  <span>📊</span> Daily Details
                </button>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                  Total: {months.reduce((acc, m) => acc + m.count, 0)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {months.map(item => (
                <div
                  key={item.monthIndex}
                  className={`p-2.5 rounded-xl text-center shadow transition-all border ${
                    item.isCurrentMonth
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                      : 'bg-[#121216] border-white/5 text-slate-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {item.label}
                  </div>
                  <div
                    className={`text-base font-extrabold mt-0.5 ${
                      item.isCurrentMonth ? 'text-indigo-300' : 'text-indigo-400'
                    }`}
                  >
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Small Popup Modal: Daily Admission and Discharge Details */}
      {showDailyModal && (
        <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0F172A] border border-indigo-500/40 p-5 sm:p-6 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.3)] max-w-2xl w-full text-slate-200 space-y-4 max-h-[88vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-lg">
                  📊
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Daily Admission & Discharge Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    Date-wise patient admissions and discharges count
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDailyModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter by Date of Admission Section - Moved right under Daily Admission & Discharge Details */}
            <div className="bg-[#080C14] border border-amber-500/40 p-3 sm:p-3.5 rounded-xl shadow-md space-y-2.5 shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-amber-500/20 text-amber-300 text-xs">🔍</span>
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                    Filter by Date of Admission
                  </span>
                  {hasDateFilterActive && (
                    <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                      Active Filter
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowDateFilterModal(true)}
                    className="text-[10px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    title="Open full Date Filter popup window with export options"
                  >
                    <span>🗗</span> Full Window
                  </button>
                  {hasDateFilterActive && onClearDateFilter && (
                    <button
                      type="button"
                      onClick={onClearDateFilter}
                      className="text-[10px] font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 px-2 py-1 rounded-lg transition-all cursor-pointer"
                      title="Clear active date filter"
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Date Filter Inputs & Action Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-4">
                  <div className="flex items-center gap-1.5 bg-[#0F172A] border border-white/10 px-2.5 py-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">From:</span>
                    <input
                      type="date"
                      value={fromDate || ''}
                      onChange={(e) => onFromDateChange && onFromDateChange(e.target.value)}
                      onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                      className="bg-transparent border-none text-white text-xs font-bold focus:outline-none cursor-pointer w-full p-0"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <div className="flex items-center gap-1.5 bg-[#0F172A] border border-white/10 px-2.5 py-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">To:</span>
                    <input
                      type="date"
                      value={toDate || ''}
                      onChange={(e) => onToDateChange && onToDateChange(e.target.value)}
                      onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                      className="bg-transparent border-none text-white text-xs font-bold focus:outline-none cursor-pointer w-full p-0"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onApplyDateFilter) onApplyDateFilter();
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-1.5 px-3 rounded-lg shadow transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-102"
                  >
                    <span>🔍</span> Apply Filter
                  </button>
                  {hasDateFilterActive && onClearDateFilter && (
                    <button
                      type="button"
                      onClick={onClearDateFilter}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-1.5 px-2.5 rounded-lg border border-white/10 transition-all cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {filterStatusText && (
                <div className="text-[11px] font-semibold text-amber-300/90 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  <span>ℹ️</span> {filterStatusText}
                </div>
              )}
            </div>

            {/* Total Monthly Discharges (by DOD) Banner & Month Selector */}
            <div className="bg-[#0A0E17] border border-slate-700/70 p-4 rounded-xl shadow-lg space-y-3 shrink-0">
              {/* Header and Controls Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-start gap-2.5">
                  <span className="text-purple-400 text-xl mt-0.5">🏥</span>
                  <div>
                    <div className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                      <span>Total Discharges of the Month</span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-400/30 font-bold">
                        Calculated by DOD
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium mt-1">
                      Period: <strong className="text-amber-300">{currentMonthDODData.formattedStart}</strong> to <strong className="text-amber-300">{currentMonthDODData.formattedEnd}</strong> (01 to {currentMonthDODData.lastDayNum} {currentMonthDODData.monthName})
                    </p>
                  </div>
                </div>

                {/* Integrated Month Selector & Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  {/* Month Selector Dropdown - strictly styled inside the box */}
                  <div className="flex items-center gap-1.5 bg-[#0F172A] border border-purple-500/40 px-2.5 py-1 rounded-xl shadow-inner">
                    <label className="text-[10px] uppercase font-black text-purple-300 flex items-center gap-1">
                      <span>📅</span> Month:
                    </label>
                    <select
                      value={selectedMonthForDOD}
                      onChange={e => setSelectedMonthForDOD(e.target.value)}
                      className="bg-transparent border-none text-amber-300 text-xs font-bold focus:outline-none cursor-pointer pr-1"
                    >
                      {getAvailableMonthsOptions().map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-[#0F172A] text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Monthly Data Export Toggle Button */}
                  <button
                    type="button"
                    onClick={handleExportMonthlyExcel}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 text-xs px-2.5 py-1 rounded-xl font-bold shadow flex items-center gap-1 transition-all hover:scale-105 cursor-pointer shrink-0"
                    title="Export Excel format of selected month data (Numbers without ₹ sign)"
                  >
                    <span>📊</span>
                    <span>Export Excel</span>
                  </button>

                  {/* Billing Info Button - Click or Double-click opens Month Billing & Approval Details Popup */}
                  <button
                    type="button"
                    onClick={() => {
                      setBillingInfoTab('dod');
                      setShowBillingInfoModal(true);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setBillingInfoTab('dod');
                      setShowBillingInfoModal(true);
                    }}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-sm group select-none hover:scale-105 shrink-0"
                    title="Click or double-click to view billing amount and approval amount for the selected month"
                  >
                    <span className="text-sm group-hover:rotate-12 transition-transform">🧾</span>
                    <span className="text-[10px] font-black uppercase tracking-wider">BILLING INFO (2X)</span>
                  </button>
                </div>
              </div>

              {/* Month Statistics Cards */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div
                  onClick={() => {
                    setFilteredDataModal({
                      isOpen: true,
                      title: `Total Discharges in ${currentMonthDODData.fullMonthYearLabel} (by DOD: 01st to End of Month)`,
                      records: currentMonthDODData.dischargedInMonth
                    });
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setBillingInfoTab('dod');
                    setShowBillingInfoModal(true);
                  }}
                  className="bg-[#0F172A] p-2.5 rounded-lg border border-purple-500/30 hover:border-purple-400/80 transition-all cursor-pointer group"
                  title="Click for Discharged Patients List • Double Click for Month Billing & Approval Info"
                >
                  <div className="text-[10px] uppercase font-extrabold text-purple-300 flex items-center justify-center gap-1">
                    <span>Total Month Discharges (DOD)</span>
                  </div>
                  <div className="text-base font-black text-purple-200 group-hover:scale-105 transition-transform flex items-center justify-center gap-1 mt-0.5">
                    <span>{currentMonthDODData.dischargesCount} Discharges</span>
                    <span className="text-[9px] text-purple-400 font-normal">🔍</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-purple-500/20 flex items-center justify-center gap-2 text-[10px] flex-wrap">
                    <span className="text-amber-300 font-bold">Bill: {formatCurrency(currentMonthBillingData.dodBilled)}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-300 font-bold">Appr: {formatCurrency(currentMonthBillingData.dodApproved)}</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setFilteredDataModal({
                      isOpen: true,
                      title: `Total Admissions in ${currentMonthDODData.fullMonthYearLabel} (by DOA: 01st to End of Month)`,
                      records: currentMonthDODData.admittedInMonth
                    });
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setBillingInfoTab('doa');
                    setShowBillingInfoModal(true);
                  }}
                  className="bg-[#0F172A] p-2.5 rounded-lg border border-emerald-500/30 hover:border-emerald-400/80 transition-all cursor-pointer group"
                  title="Click for Admitted Patients List • Double Click for Month Billing & Approval Info"
                >
                  <div className="text-[10px] uppercase font-extrabold text-emerald-300 flex items-center justify-center gap-1">
                    <span>Total Admissions in {currentMonthDODData.fullMonthYearLabel} (by DOA)</span>
                  </div>
                  <div className="text-base font-black text-emerald-200 group-hover:scale-105 transition-transform flex items-center justify-center gap-1 mt-0.5">
                    <span>{currentMonthDODData.admissionsCount} Admissions</span>
                    <span className="text-[9px] text-emerald-400 font-normal">🔍</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-emerald-500/20 flex items-center justify-center gap-2 text-[10px] flex-wrap">
                    <span className="text-amber-300 font-bold">Bill: {formatCurrency(currentMonthBillingData.doaBilled)}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-300 font-bold">Appr: {formatCurrency(currentMonthBillingData.doaApproved)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Clickable Bar: Month Billing & Approval Amount */}
              <div
                onClick={() => {
                  setBillingInfoTab('dod');
                  setShowBillingInfoModal(true);
                }}
                className="bg-gradient-to-r from-amber-950/40 via-[#0F172A] to-purple-950/40 border border-amber-500/30 hover:border-amber-400/60 p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 shadow-xs group select-none"
                title="Click to view detailed billing and approval figures for the month"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition-transform">🧾</span>
                  <div>
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Month Billing &amp; Approval Amount</span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-200 border border-amber-500/40 px-1.5 py-0.2 rounded font-extrabold">
                        Click to View
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Discharges: {formatCurrency(currentMonthBillingData.dodBilled)} billed • {formatCurrency(currentMonthBillingData.dodApproved)} approved ({currentMonthBillingData.dodApprovalRate}%)
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-black text-purple-300 block">
                    All Month: {formatCurrency(currentMonthBillingData.totalBilled)}
                  </span>
                  <span className="text-[10.5px] font-black text-emerald-300 block">
                    Approved: {formatCurrency(currentMonthBillingData.totalApproved)}
                  </span>
                </div>
              </div>
            </div>

            {/* TPA Wise Show Details Option Banner */}
            <div
              onClick={() => setShowTpaWiseModal(true)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setShowTpaWiseModal(true);
              }}
              className="tpa-banner-card bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 border-2 border-indigo-500/50 hover:border-indigo-400 p-3 rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.01] group select-none flex items-center justify-between flex-wrap gap-2"
              title="Double-click or click to view Month-wise TPA Admission According to TPA / INS. NAME list in popup window"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-lg group-hover:scale-110 transition-transform">
                  🏥
                </div>
                <div>
                  <div className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>TPA Wise Show Details</span>
                    <span className="text-[9px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                      2x Click Popup
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                    Month-wise TPA Admission according to TPA / INS. NAME list
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTpaWiseModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 text-xs px-3 py-1.5 rounded-lg font-bold shadow flex items-center gap-1.5 group-hover:bg-indigo-500 transition-all cursor-pointer shrink-0"
              >
                <span>🏢</span>
                <span>View TPA Details</span>
              </button>
            </div>

            {/* Overall Summary Cards with Month Filter Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">
                  {dailyMonthOnly ? `📅 ${currentMonthDODData.monthName} Daily Breakdown` : '🌐 All Dates Daily Breakdown'}
                </span>
                <button
                  type="button"
                  onClick={() => setDailyMonthOnly(!dailyMonthOnly)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                    dailyMonthOnly
                      ? 'bg-purple-600/30 text-purple-200 border-purple-400/50 hover:bg-purple-600/40'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title="Toggle between Selected Month Only and All Historic Dates"
                >
                  <span>{dailyMonthOnly ? `Showing ${currentMonthDODData.monthName} Only (Switch to All)` : 'Showing All Dates (Switch to Month)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#08080A] p-2 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    {dailyMonthOnly ? `${currentMonthDODData.monthName} Days` : 'Total Days'}
                  </div>
                  <div className="text-sm font-extrabold text-white mt-0.5">{filteredDailyList.length}</div>
                </div>
                <div className="bg-[#08080A] p-2 rounded-xl border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold">Admissions</div>
                  <div className="text-sm font-extrabold text-emerald-300 mt-0.5">
                    {filteredDailyList.reduce((acc, item) => acc + item.admissions, 0)}
                  </div>
                </div>
                <div className="bg-[#08080A] p-2 rounded-xl border border-purple-500/20">
                  <div className="text-[10px] text-purple-400 uppercase font-bold">Discharges</div>
                  <div className="text-sm font-extrabold text-purple-300 mt-0.5">
                    {filteredDailyList.reduce((acc, item) => acc + item.discharges, 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div>
              <input
                type="text"
                value={dailySearchTerm}
                onChange={e => setDailySearchTerm(e.target.value)}
                placeholder="🔍 Search date (e.g., 24-07-2026 or 2026)..."
                className="w-full bg-[#08080A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Helper Hint */}
            <div className="flex items-center justify-between text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-medium">
              <span>⚡ Double-click any date to view small popup window with patient details</span>
            </div>

            {/* Date-wise Table */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 border border-white/5 rounded-xl bg-[#08080A]/50 p-2">
              {filteredDailyList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No daily records found.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                      <th className="py-2 px-3">Date (2x Click)</th>
                      <th className="py-2 px-3 text-center">Admissions</th>
                      <th className="py-2 px-3 text-center">Discharges</th>
                      <th className="py-2 px-3 text-right">Total Patients</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredDailyList.map(item => (
                      <tr
                        key={item.dateKey}
                        onDoubleClick={() => handleOpenDateInfoPopup(item.dateKey, item.displayDate)}
                        className="hover:bg-indigo-500/15 transition-colors cursor-pointer select-none group"
                        title="Double click to view detailed patient information popup"
                      >
                        <td className="py-2 px-3 font-semibold text-indigo-300 group-hover:text-indigo-200 flex items-center justify-between">
                          <span>📅 {item.displayDate}</span>
                          <span className="text-[9px] text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            2x click
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            item.admissions > 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-slate-500'
                          }`}>
                            {item.admissions}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            item.discharges > 0
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'text-slate-500'
                          }`}>
                            {item.discharges}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-white">
                          {item.admissions + item.discharges}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDailyModal(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-bold shadow-md transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Small Popup Window for Double-Clicked Date Details (Info Only) */}
      {selectedDateDetail && (
        <div className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0F172A] border-2 border-indigo-500/60 p-5 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.4)] max-w-md w-full text-slate-200 space-y-4">
            {/* Popup Header */}
            <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-lg">
                  📅
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedDateDetail.displayDate}</span>
                    <span className="text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Info Only
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Daily Admission & Discharge Summary</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateDetail(null)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#08080A] p-2.5 rounded-xl border border-emerald-500/30">
                <div className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Admissions</div>
                <div className="text-xl font-black text-emerald-300 mt-0.5">{selectedDateDetail.admissions}</div>
              </div>
              <div className="bg-[#08080A] p-2.5 rounded-xl border border-purple-500/30">
                <div className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Discharges</div>
                <div className="text-xl font-black text-purple-300 mt-0.5">{selectedDateDetail.discharges}</div>
              </div>
              <div className="bg-[#08080A] p-2.5 rounded-xl border border-indigo-500/30">
                <div className="text-[10px] font-bold uppercase text-indigo-300 tracking-wider">Total Patients</div>
                <div className="text-xl font-black text-white mt-0.5">
                  {selectedDateDetail.admissions + selectedDateDetail.discharges}
                </div>
              </div>
            </div>

            {/* Patient Breakdown lists for information only */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {/* Admitted List */}
              <div>
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>🟢 Admitted Patients ({selectedDateDetail.admittedPatients.length})</span>
                </div>
                {selectedDateDetail.admittedPatients.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic bg-[#08080A] p-2 rounded-lg border border-white/5">
                    No admissions on this date.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {selectedDateDetail.admittedPatients.map((p, idx) => {
                      const actualIdx = claims.indexOf(p);
                      return (
                        <div
                          key={idx}
                          onDoubleClick={() => {
                            if (actualIdx !== -1 && onEditClaim) {
                              onEditClaim(p, actualIdx);
                              setSelectedDateDetail(null);
                            }
                          }}
                          className="bg-[#08080A] p-2 rounded-lg border border-white/5 text-xs flex justify-between items-center hover:border-emerald-500/40 transition-all cursor-pointer group"
                          title="Double click or click Quick Edit to modify record"
                        >
                          <div>
                            <span className="font-bold text-white group-hover:text-emerald-300 transition-colors">{p.patientName || 'Unnamed'}</span>
                            <span className="text-[10px] text-slate-400 ml-2">UHID: {p.uhid || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                              {p.status || 'Admitted'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (actualIdx !== -1 && onEditClaim) {
                                  onEditClaim(p, actualIdx);
                                  setSelectedDateDetail(null);
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
                <div className="text-xs font-bold text-purple-400 mb-1 flex items-center justify-between">
                  <span>🟣 Discharged Patients ({selectedDateDetail.dischargedPatients.length})</span>
                </div>
                {selectedDateDetail.dischargedPatients.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic bg-[#08080A] p-2 rounded-lg border border-white/5">
                    No discharges on this date.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {selectedDateDetail.dischargedPatients.map((p, idx) => {
                      const actualIdx = claims.indexOf(p);
                      return (
                        <div
                          key={idx}
                          onDoubleClick={() => {
                            if (actualIdx !== -1 && onEditClaim) {
                              onEditClaim(p, actualIdx);
                              setSelectedDateDetail(null);
                            }
                          }}
                          className="bg-[#08080A] p-2 rounded-lg border border-white/5 text-xs flex justify-between items-center hover:border-purple-500/40 transition-all cursor-pointer group"
                          title="Double click or click Quick Edit to modify record"
                        >
                          <div>
                            <span className="font-bold text-white group-hover:text-purple-300 transition-colors">{p.patientName || 'Unnamed'}</span>
                            <span className="text-[10px] text-slate-400 ml-2">UHID: {p.uhid || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold">
                              {p.status || 'Discharged'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (actualIdx !== -1 && onEditClaim) {
                                  onEditClaim(p, actualIdx);
                                  setSelectedDateDetail(null);
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
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDateDetail(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-bold transition-all shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtered Applied Data Popup Window */}
      {filteredDataModal && filteredDataModal.isOpen && (() => {
        const modalFilteredRecords = filteredDataModal.records.filter(c => {
          if (!popupSearchTerm.trim()) return true;
          const q = popupSearchTerm.toLowerCase();
          return Object.values(c).some(v => String(v || '').toLowerCase().includes(q));
        });

        const modalTotalBill = modalFilteredRecords.reduce((sum, c) => sum + parseNum(c.totalBill), 0);
        const modalTotalApproved = modalFilteredRecords.reduce((sum, c) => sum + parseNum(c.approved), 0);
        const modalTotalDiscount = modalFilteredRecords.reduce((sum, c) => sum + parseNum(c.discount), 0);
        const modalTotalDeduction = modalFilteredRecords.reduce((sum, c) => sum + parseNum(c.deduction), 0);
        const modalTotalPatientPay = modalFilteredRecords.reduce((sum, c) => sum + parseNum(c.patientPay), 0);
        const modalTotalSettlement = modalFilteredRecords.reduce((sum, c) => sum + parseNum(c.settlementAmount), 0);
        const modalTotalTds = modalFilteredRecords.reduce((sum, c) => sum + parseNum(c.tds), 0);

        const shouldShowTotalAmounts = modalFilteredRecords.length > 0;

        return (
          <div className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0F172A] border-2 border-indigo-500/60 p-5 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.5)] max-w-3xl w-full text-slate-200 space-y-3.5 max-h-[88vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-indigo-500/30 pb-3 shrink-0 gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xl font-bold shrink-0 mt-0.5">
                    🏥
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                      <span>{filteredDataModal.title}</span>
                      <span className="text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                        {modalFilteredRecords.length} of {filteredDataModal.records.length} Records
                      </span>
                    </h4>
                    
                    {/* Exact Total Amount Display for all filtered records */}
                    {shouldShowTotalAmounts && (
                      <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                        <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1 shadow-xs">
                          <span>💵</span>
                          <span>Total Bill:</span>
                          <strong className="text-white text-xs">{formatCurrency(modalTotalBill)}</strong>
                        </span>
                        <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1 shadow-xs">
                          <span>🟢</span>
                          <span>Approved:</span>
                          <strong className="text-white text-xs">{formatCurrency(modalTotalApproved)}</strong>
                        </span>
                        {modalTotalSettlement > 0 && (
                          <span className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1 shadow-xs">
                            <span>💰</span>
                            <span>Settled:</span>
                            <strong className="text-white text-xs">{formatCurrency(modalTotalSettlement)}</strong>
                          </span>
                        )}
                        {modalTotalDiscount > 0 && (
                          <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1 shadow-xs">
                            <span>🔻</span>
                            <span>Discount:</span>
                            <strong className="text-white text-xs">{formatCurrency(modalTotalDiscount)}</strong>
                          </span>
                        )}
                        {modalTotalPatientPay > 0 && (
                          <span className="bg-purple-500/20 border border-purple-500/40 text-purple-300 font-extrabold px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1 shadow-xs">
                            <span>👤</span>
                            <span>Patient Pay:</span>
                            <strong className="text-white text-xs">{formatCurrency(modalTotalPatientPay)}</strong>
                          </span>
                        )}
                        {modalTotalDeduction > 0 && (
                          <span className="bg-rose-500/20 border border-rose-500/40 text-rose-300 font-extrabold px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1 shadow-xs">
                            <span>🛡️</span>
                            <span>Deduction:</span>
                            <strong className="text-white text-xs">{formatCurrency(modalTotalDeduction)}</strong>
                          </span>
                        )}
                        {modalTotalTds > 0 && (
                          <span className="bg-teal-500/20 border border-teal-500/40 text-teal-300 font-extrabold px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1 shadow-xs">
                            <span>📋</span>
                            <span>TDS:</span>
                            <strong className="text-white text-xs">{formatCurrency(modalTotalTds)}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start shrink-0">
                  <button
                    type="button"
                    onClick={() => handleExportFilteredModalRecords(modalFilteredRecords, filteredDataModal.title)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow transition-all cursor-pointer"
                    title="Export these filtered records to Excel"
                  >
                    <span>📊</span> Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilteredDataModal(null)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Search Input inside Popup */}
              <div className="shrink-0">
                <input
                  type="text"
                  value={popupSearchTerm}
                  onChange={(e) => setPopupSearchTerm(e.target.value)}
                  placeholder="🔍 Search patient name, UHID, IPD No., Claim No., TPA Name, or Status inside this list..."
                  className="w-full bg-[#08080A] border border-white/10 text-white placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* List of Filtered Patient Records */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {modalFilteredRecords.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500">
                    No matching patient records found in this view.
                  </div>
                ) : (
                  modalFilteredRecords.map((claim) => {
                    const actualIdx = claims.indexOf(claim);

                    return (
                      <div
                        key={actualIdx}
                        onDoubleClick={() => {
                          if (actualIdx !== -1 && onEditClaim) {
                            onEditClaim(claim, actualIdx);
                            setFilteredDataModal(null);
                          }
                        }}
                        className="bg-[#08080A] p-3 rounded-xl border border-white/10 hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer"
                        title="Double click to Quick Edit patient record"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs group-hover:text-indigo-300 transition-colors">
                              👤 {claim.patientName || 'Unnamed Patient'}
                            </span>
                            <span className="text-[10px] bg-white/5 border border-white/10 text-slate-300 px-2 py-0.5 rounded font-mono">
                              UHID: {claim.uhid || '-'}
                            </span>
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-bold">
                              {claim.status || 'Pending'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-300 flex flex-wrap gap-2.5">
                            <span>TPA / INS: <strong className="text-indigo-300 font-semibold">{claim.tpaName || claim.insuranceCompany || '-'}</strong></span>
                            {claim.insuranceCompany && claim.tpaName && claim.insuranceCompany !== claim.tpaName && (
                              <span>Company: <strong className="text-slate-200">{claim.insuranceCompany}</strong></span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap gap-3">
                            <span>IPD: <strong className="text-slate-200">{claim.ipdNo || '-'}</strong></span>
                            <span>Claim: <strong className="text-slate-200">{claim.claimNo || '-'}</strong></span>
                            <span>DOA: <strong className="text-emerald-400">{formatDateForDisplay(claim.doa)}</strong></span>
                            <span>DOD: <strong className="text-purple-400">{formatDateForDisplay(claim.dod)}</strong></span>
                            <span>Bill: <strong className="text-amber-300">{formatCurrencyDisplay(claim.totalBill, '₹ 0')}</strong></span>
                            <span>Approved: <strong className="text-emerald-300">{formatCurrencyDisplay(claim.approved, '₹ 0')}</strong></span>
                            {parseNum(claim.deduction) > 0 && (
                              <span>Deductions: <strong className="text-rose-400">{formatCurrencyDisplay(claim.deduction, '₹ 0')}</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (actualIdx !== -1 && onEditClaim) {
                                onEditClaim(claim, actualIdx);
                                setFilteredDataModal(null);
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-400/30 shadow transition-all hover:scale-105 flex items-center gap-1.5 cursor-pointer"
                            title="Quick Edit Patient Record"
                          >
                            <span>✏️</span> Quick Edit
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-slate-400 shrink-0">
                <span>💡 Double click any row or click "Quick Edit" to modify record</span>
                <button
                  type="button"
                  onClick={() => setFilteredDataModal(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-5 py-2 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filter by Date of Admission Popup Modal */}
      {showDateFilterModal && (
        <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0F172A] border-2 border-amber-500/60 p-6 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.3)] max-w-md w-full text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-lg font-bold">
                  📅
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Filter by Date of Admission</span>
                  </h3>
                  <p className="text-xs text-amber-300/80 font-medium">Select date range to filter patient records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDateFilterModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-[#08080A] p-4 rounded-xl border border-white/5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate || ''}
                    onChange={(e) => onFromDateChange && onFromDateChange(e.target.value)}
                    onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                    className="w-full p-2.5 border border-white/10 rounded-xl text-xs bg-[#121216] text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate || ''}
                    onChange={(e) => onToDateChange && onToDateChange(e.target.value)}
                    onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                    className="w-full p-2.5 border border-white/10 rounded-xl text-xs bg-[#121216] text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {filterStatusText && (
                <div className="text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-2 bg-amber-500/10 text-amber-300 border border-amber-500/30 light:bg-amber-100 light:text-amber-950 light:border-amber-300 shadow-sm">
                  <span>ℹ️</span> {filterStatusText}
                </div>
              )}
            </div>

            {/* Export Section Feature - Appears when filter is active */}
            {hasDateFilterActive && (
              <div className="bg-[#08080A] border border-emerald-500/40 p-4 rounded-xl space-y-2.5 shadow-md animate-fadeIn">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📥 EXPORT FILTERED DATA</span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {(filteredClaims || claims).length} Records
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Download patient claims matching the selected Date of Admission range:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onExportFiltered) onExportFiltered();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl border border-emerald-400/30 shadow transition-all hover:scale-105 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>⬆️</span> Download CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onExportFilteredXLSX) onExportFilteredXLSX();
                    }}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl border border-teal-400/30 shadow transition-all hover:scale-105 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>📊</span> Download Excel
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onClearDateFilter) onClearDateFilter();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all cursor-pointer"
              >
                Clear Filter
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDateFilterModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onApplyDateFilter) onApplyDateFilter();
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-900/40 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔍</span> Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month-wise TPA Admission According to TPA / INS. NAME Popup Window */}
      {showTpaWiseModal && (() => {
        const activeMonthKey = tpaSelectedMonth || selectedMonthForDOD || defaultYearMonth;
        const tpaData = getTpaWiseData(activeMonthKey);

        return (
          <div className="fixed inset-0 z-[8200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="tpa-modal-card bg-[#0F172A] border-2 border-indigo-500/60 p-5 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.4)] max-w-3xl w-full text-slate-200 space-y-4 max-h-[88vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xl font-bold">
                    🏥
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Month-wise TPA Admission According to TPA / INS. NAME</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Period: <strong className="text-amber-300">{tpaData.fullMonthYearLabel}</strong> • Double-click row or click View Patients
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Month Selector */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Month:</label>
                    <select
                      value={activeMonthKey}
                      onChange={e => setTpaSelectedMonth(e.target.value)}
                      className="bg-[#08080A] border border-slate-700 text-indigo-200 text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-400 transition-all cursor-pointer"
                    >
                      <option value="ALL" className="bg-[#0F172A] text-amber-300 font-bold">
                        🌐 All Months Cumulative
                      </option>
                      {getAvailableMonthsOptions().map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-[#0F172A] text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTpaWiseModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* TPA Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-center">
                <div className="bg-[#08080A] p-2.5 rounded-xl border border-indigo-500/30">
                  <div className="text-[10px] font-bold uppercase text-indigo-300 tracking-wider">Total TPAs / Insurers</div>
                  <div className="text-lg font-black text-white mt-0.5">{tpaData.totalTpaCount}</div>
                </div>
                <div className="bg-[#08080A] p-2.5 rounded-xl border border-emerald-500/30">
                  <div className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Total Admissions (DOA)</div>
                  <div className="text-lg font-black text-emerald-300 mt-0.5">{tpaData.totalAdmissions}</div>
                </div>
                <div className="bg-[#08080A] p-2.5 rounded-xl border border-purple-500/30">
                  <div className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Total Discharges (DOD)</div>
                  <div className="text-lg font-black text-purple-300 mt-0.5">{tpaData.totalDischarges}</div>
                </div>
                <div className="bg-[#08080A] p-2.5 rounded-xl border border-amber-500/30">
                  <div className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">Total Billed Amount</div>
                  <div className="text-xs font-black text-amber-300 mt-1 truncate">{formatCurrency(tpaData.totalBilled)}</div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="shrink-0">
                <input
                  type="text"
                  value={tpaSearchTerm}
                  onChange={e => setTpaSearchTerm(e.target.value)}
                  placeholder="🔍 Search TPA / Insurance Company Name..."
                  className="w-full bg-[#08080A] border border-white/10 text-white placeholder-slate-500 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* TPA List Table */}
              <div className="flex-1 overflow-y-auto space-y-2 border border-white/5 rounded-xl bg-[#08080A]/50 p-2 pr-1">
                {tpaData.filteredList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No TPA or Insurance records found for this selection.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                        <th className="py-2.5 px-3">TPA / INS. NAME (2x Click)</th>
                        <th className="py-2.5 px-3 text-center">Admissions</th>
                        <th className="py-2.5 px-3 text-center">Discharges</th>
                        <th className="py-2.5 px-3 text-right">Total Billed</th>
                        <th className="py-2.5 px-3 text-right">Approved</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tpaData.filteredList.map((item, idx) => (
                        <tr
                          key={idx}
                          onDoubleClick={() => {
                            setPopupSearchTerm('');
                            setFilteredDataModal({
                              isOpen: true,
                              title: `Patients under ${item.name} (${tpaData.fullMonthYearLabel})`,
                              records: item.allClaims
                            });
                          }}
                          className="tpa-table-row hover:bg-indigo-500/15 transition-colors cursor-pointer select-none group"
                          title="Double click to view patient list for this TPA / Insurer"
                        >
                          <td className="py-2.5 px-3 font-semibold text-white group-hover:text-indigo-300">
                            <div className="flex items-center gap-1.5">
                              <span>🏥 {item.name}</span>
                              <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.allClaims.length} records
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              item.admittedClaims.length > 0
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'text-slate-500'
                            }`}>
                              {item.admittedClaims.length}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              item.dischargedClaims.length > 0
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'text-slate-500'
                            }`}>
                              {item.dischargedClaims.length}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                            {formatCurrency(item.totalBilled)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                            {formatCurrency(item.totalApproved)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPopupSearchTerm('');
                                setFilteredDataModal({
                                  isOpen: true,
                                  title: `Patients under ${item.name} (${tpaData.fullMonthYearLabel})`,
                                  records: item.allClaims
                                });
                              }}
                              className="bg-indigo-600/80 hover:bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-indigo-400/30 transition-all hover:scale-105 cursor-pointer"
                            >
                              View Patients
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-slate-400 shrink-0">
                <span>💡 Double click any TPA row or click "View Patients" to view patient records</span>
                <button
                  type="button"
                  onClick={() => setShowTpaWiseModal(false)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-bold transition-all shadow-md cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Month Billing & Approval Details Modal (Triggered by BILLING INFO (2X) in Daily Details) */}
      {showBillingInfoModal && (() => {
        const billingData = getMonthlyBillingData(selectedMonthForDOD);
        const currentDOD = getMonthlyDODCalculation(selectedMonthForDOD);

        const activeList = billingInfoTab === 'doa' 
          ? billingData.doaClaims 
          : billingInfoTab === 'dod' 
          ? billingData.dodClaims 
          : billingData.monthClaims;

        const filteredList = activeList.filter(c => {
          if (!billingSearchTerm.trim()) return true;
          const q = billingSearchTerm.toLowerCase();
          return (
            String(c.patientName || '').toLowerCase().includes(q) ||
            String(c.uhid || '').toLowerCase().includes(q) ||
            String(c.claimNumber || '').toLowerCase().includes(q) ||
            String(c.status || '').toLowerCase().includes(q) ||
            String(c.insuranceCompany || '').toLowerCase().includes(q) ||
            String(c.tpa || '').toLowerCase().includes(q)
          );
        });

        const displayedBilledTotal = filteredList.reduce((sum, c) => sum + parseNum(c.totalBill), 0);
        const displayedApprovedTotal = filteredList.reduce((sum, c) => sum + parseNum(c.approved), 0);
        const displayedSettledTotal = filteredList.reduce((sum, c) => {
          const sVal = parseNum(c.settlementAmount);
          return sum + (c.status === 'Settled' || sVal > 0 ? (sVal > 0 ? sVal : parseNum(c.approved)) : 0);
        }, 0);
        const displayedDiscountTotal = filteredList.reduce((sum, c) => sum + parseNum(c.discount), 0);
        const displayedDeductionTotal = filteredList.reduce((sum, c) => sum + parseNum(c.deduction), 0);
        const displayedPatientPayTotal = filteredList.reduce((sum, c) => sum + parseNum(c.patientPay), 0);
        const displayedTdsTotal = filteredList.reduce((sum, c) => sum + parseNum(c.tds), 0);
        const displayedApprovalRate = displayedBilledTotal > 0 ? ((displayedApprovedTotal / displayedBilledTotal) * 100).toFixed(1) : '0';

        const activeTabTitle = billingInfoTab === 'dod' 
          ? 'DISCHARGES (DOD)' 
          : billingInfoTab === 'doa' 
          ? 'ADMISSIONS (DOA)' 
          : 'ALL MONTH';

        const activeTabLabel = billingInfoTab === 'dod' 
          ? `Discharges in ${currentDOD.monthName} (by DOD)` 
          : billingInfoTab === 'doa' 
          ? `Admissions in ${currentDOD.monthName} (by DOA)` 
          : `All Month Patients in ${currentDOD.monthName}`;

        return (
          <div className="fixed inset-0 z-[8500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0F172A] border-2 border-amber-500/60 p-5 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.3)] max-w-4xl w-full text-slate-200 space-y-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-xl font-bold">
                    🧾
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Month Billing & Approval Amount</span>
                      <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {currentDOD.fullMonthYearLabel}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Period: <strong className="text-amber-300">{currentDOD.formattedStart}</strong> to <strong className="text-amber-300">{currentDOD.formattedEnd}</strong> (01 to {currentDOD.lastDayNum} {currentDOD.monthName})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Month Selector in Modal Header */}
                  <div className="flex items-center gap-1.5 bg-[#08080A] px-2.5 py-1 rounded-xl border border-slate-700">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Month:</label>
                    <select
                      value={selectedMonthForDOD}
                      onChange={e => setSelectedMonthForDOD(e.target.value)}
                      className="bg-transparent border-none text-amber-300 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      {getAvailableMonthsOptions().map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-[#0F172A] text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportMonthlyExcel}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-1.5 border border-emerald-400/30 cursor-pointer hover:scale-105"
                    title="Export this month's data to Excel"
                  >
                    <span>📊</span> Export Excel
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBillingInfoModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Dynamic KPI Cards - reflects active tab (Discharges/Admissions/All) and search filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                <div className="bg-[#08080A] p-4 rounded-xl border-2 border-amber-500/40 shadow-lg text-center">
                  <div className="text-xs uppercase font-black text-amber-400 tracking-wider flex items-center justify-center gap-1.5">
                    <span>💵 {activeTabTitle} BILLED AMOUNT</span>
                  </div>
                  <div className="text-2xl font-black text-amber-300 mt-1.5">{formatCurrency(displayedBilledTotal)}</div>
                  <div className="text-[11px] text-slate-300 mt-1 font-medium">
                    {activeTabLabel} ({filteredList.length} {filteredList.length === 1 ? 'Patient' : 'Patients'})
                  </div>
                </div>

                <div className="bg-[#08080A] p-4 rounded-xl border-2 border-emerald-500/40 shadow-lg text-center">
                  <div className="text-xs uppercase font-black text-emerald-400 tracking-wider flex items-center justify-center gap-1.5">
                    <span>✅ {activeTabTitle} APPROVED AMOUNT</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-300 mt-1.5">{formatCurrency(displayedApprovedTotal)}</div>
                  <div className="text-[11px] text-emerald-400/90 mt-1 font-bold">
                    Approval Rate: {displayedApprovalRate}% in {currentDOD.monthName}
                  </div>
                </div>
              </div>

              {/* Financial Metric Badges for Current View */}
              <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] shrink-0">
                <span className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-extrabold px-2.5 py-1 rounded-lg">
                  💰 Settled: <strong className="text-white font-mono">{formatCurrency(displayedSettledTotal)}</strong>
                </span>
                <span className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-extrabold px-2.5 py-1 rounded-lg">
                  🔻 Discount: <strong className="text-white font-mono">{formatCurrency(displayedDiscountTotal)}</strong>
                </span>
                <span className="bg-purple-500/15 border border-purple-500/30 text-purple-300 font-extrabold px-2.5 py-1 rounded-lg">
                  👤 Patient Pay: <strong className="text-white font-mono">{formatCurrency(displayedPatientPayTotal)}</strong>
                </span>
                <span className="bg-rose-500/15 border border-rose-500/30 text-rose-300 font-extrabold px-2.5 py-1 rounded-lg">
                  🛡️ Deduction: <strong className="text-white font-mono">{formatCurrency(displayedDeductionTotal)}</strong>
                </span>
                <span className="bg-teal-500/15 border border-teal-500/30 text-teal-300 font-extrabold px-2.5 py-1 rounded-lg">
                  📋 TDS: <strong className="text-white font-mono">{formatCurrency(displayedTdsTotal)}</strong>
                </span>
              </div>

              {/* Admissions (DOA) vs Discharges (DOD) Subtotals Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                <div 
                  onClick={() => setBillingInfoTab('doa')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    billingInfoTab === 'doa' 
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-md' 
                      : 'bg-[#08080A] border-emerald-500/20 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-emerald-500/20 pb-1.5">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <span>🟢 Admissions in {currentDOD.monthName} (by DOA)</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      {billingData.doaClaims.length} Patients
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Billed Amount</div>
                      <div className="font-extrabold text-amber-300 text-sm mt-0.5">{formatCurrency(billingData.doaBilled)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Approved Amount</div>
                      <div className="font-extrabold text-emerald-300 text-sm mt-0.5">{formatCurrency(billingData.doaApproved)}</div>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setBillingInfoTab('dod')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    billingInfoTab === 'dod' 
                      ? 'bg-purple-950/40 border-purple-400 shadow-md' 
                      : 'bg-[#08080A] border-purple-500/20 hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-purple-500/20 pb-1.5">
                    <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                      <span>🟣 Discharges in {currentDOD.monthName} (by DOD)</span>
                    </span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-full font-bold">
                      {billingData.dodClaims.length} Patients
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Billed Amount</div>
                      <div className="font-extrabold text-amber-300 text-sm mt-0.5">{formatCurrency(billingData.dodBilled)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Approved Amount</div>
                      <div className="font-extrabold text-purple-300 text-sm mt-0.5">{formatCurrency(billingData.dodApproved)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search Controls */}
              <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-1 bg-[#08080A] p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setBillingInfoTab('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      billingInfoTab === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Month Records ({billingData.monthClaims.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingInfoTab('doa')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      billingInfoTab === 'doa'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Admissions ({billingData.doaClaims.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingInfoTab('dod')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      billingInfoTab === 'dod'
                        ? 'bg-purple-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Discharges ({billingData.dodClaims.length})
                  </button>
                </div>

                <div className="flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={billingSearchTerm}
                    onChange={(e) => setBillingSearchTerm(e.target.value)}
                    placeholder="🔍 Search patient name, UHID, claim no. in this month..."
                    className="w-full bg-[#08080A] border border-white/10 text-white placeholder-slate-500 text-xs rounded-xl px-3.5 py-1.5 focus:outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              </div>

              {/* Table of Patient Records */}
              <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-[#08080A] shadow-inner">
                {filteredList.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500">
                    No matching patient records found for this month.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#121826] text-slate-300 border-b border-white/10 uppercase tracking-wider text-[10px] z-10">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Patient Name</th>
                        <th className="py-2.5 px-3">UHID / Claim No.</th>
                        <th className="py-2.5 px-3">DOA</th>
                        <th className="py-2.5 px-3">DOD</th>
                        <th className="py-2.5 px-3 text-right">Billed Amount</th>
                        <th className="py-2.5 px-3 text-right">Approved Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {filteredList.map((claim, idx) => {
                        const actualIdx = claims.indexOf(claim);
                        return (
                          <tr
                            key={idx}
                            onDoubleClick={() => {
                              if (actualIdx !== -1 && onEditClaim) {
                                onEditClaim(claim, actualIdx);
                                setShowBillingInfoModal(false);
                              }
                            }}
                            className="hover:bg-amber-500/10 transition-colors group cursor-pointer"
                            title="Double click to Quick Edit"
                          >
                            <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-white group-hover:text-amber-300 transition-colors">
                              {claim.patientName || 'Unnamed Patient'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                              <div>{claim.uhid || '-'}</div>
                              {(claim.claimNo || claim.claimNumber) && (
                                <div className="text-[10px] text-slate-500">{claim.claimNo || claim.claimNumber}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-emerald-300 font-medium">
                              {formatDateForDisplay(claim.doa)}
                            </td>
                            <td className="py-2.5 px-3 text-purple-300 font-medium">
                              {formatDateForDisplay(claim.dod)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-300 font-mono text-[13px]">
                              {formatCurrencyDisplay(claim.totalBill, '₹ 0.00')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-300 font-mono text-[13px]">
                              {formatCurrencyDisplay(claim.approved, '₹ 0.00')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-[10px] bg-slate-800 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full font-bold">
                                {claim.status || 'Pending'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (actualIdx !== -1 && onEditClaim) {
                                    onEditClaim(claim, actualIdx);
                                    setShowBillingInfoModal(false);
                                  }
                                }}
                                className="bg-indigo-600/80 hover:bg-indigo-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold border border-indigo-400/30 transition-all hover:scale-105 cursor-pointer"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-[#121826] border-t-2 border-amber-500/40 text-xs font-black">
                      <tr>
                        <td colSpan={5} className="py-2 px-3 text-right text-slate-300 uppercase tracking-wider text-[11px]">
                          Showing {filteredList.length} Records Total:
                        </td>
                        <td className="py-2 px-3 text-right text-amber-300 font-mono text-sm">
                          {formatCurrency(displayedBilledTotal)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-300 font-mono text-sm">
                          {formatCurrency(displayedApprovedTotal)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-slate-400 shrink-0">
                <span>💡 Double click any row or click Edit to modify patient record</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportMonthlyExcel}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5 border border-emerald-400/30"
                  >
                    <span>📊</span> Export Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBillingInfoModal(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-5 py-2 rounded-xl font-bold transition-all cursor-pointer shadow-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

