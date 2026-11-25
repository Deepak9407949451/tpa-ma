import React, { useState } from 'react';
import { Claim } from '../types';
import { getDashboardSpreadsheetUrl } from '../utils/metadataSync';
import { formatDateForDisplay } from '../utils/formatters';

interface SyncLoadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadedClaims: Claim[];
  timestamp: string;
  spreadsheetUrl?: string;
}

export const SyncLoadDetailsModal: React.FC<SyncLoadDetailsModalProps> = ({
  isOpen,
  onClose,
  loadedClaims,
  timestamp,
  spreadsheetUrl
}) => {
  const activeSpreadsheetUrl = spreadsheetUrl || getDashboardSpreadsheetUrl();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'standard' | 'full37'>('standard');

  if (!isOpen) return null;

  // Calculate Summary Statistics
  const totalCount = loadedClaims.length;

  const parseNum = (val: string | number | undefined) => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const totalBillSum = loadedClaims.reduce((sum, c) => sum + parseNum(c.totalBill), 0);
  const totalApprovedSum = loadedClaims.reduce((sum, c) => sum + parseNum(c.approved), 0);
  const totalSettlementSum = loadedClaims.reduce((sum, c) => sum + parseNum(c.settlementAmount), 0);
  const totalPatientPaySum = loadedClaims.reduce((sum, c) => sum + parseNum(c.patientPay), 0);

  // Status breakdown map
  const statusCounts: Record<string, number> = {
    Admitted: 0,
    'Initial Approved': 0,
    Discharge: 0,
    'Discharge Approved': 0,
    Pending: 0,
    Settled: 0,
    Denial: 0
  };

  loadedClaims.forEach(c => {
    const st = c.status || 'Admitted';
    if (statusCounts[st] !== undefined) {
      statusCounts[st]++;
    } else {
      statusCounts[st] = 1;
    }
  });

  const formatRupee = (num: number) =>
    `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Filter claims for table view inside popup
  const filteredClaims = loadedClaims.filter((c, idx) => {
    const sNoStr = String(c.sNo || idx + 1);
    const doaStr = formatDateForDisplay(c.doa);
    const dodStr = formatDateForDisplay(c.dod);
    const payDateStr = formatDateForDisplay(c.paymentDate);

    const matchesSearch =
      !searchTerm ||
      sNoStr === searchTerm.trim() ||
      (c.patientName && c.patientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.uhid && c.uhid.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.ipdNo && c.ipdNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.tpaName && c.tpaName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.insuranceCompany && c.insuranceCompany.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.claimNo && c.claimNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.policyNumber && c.policyNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doaStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dodStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payDateStr.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'ALL' ||
      (c.status || '').toLowerCase() === selectedStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeStyle = (st: string) => {
    switch (st) {
      case 'Settled':
        return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30';
      case 'Discharge Approved':
        return 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/30';
      case 'Initial Approved':
        return 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/30';
      case 'Admitted':
        return 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30';
      case 'Discharge':
        return 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/30';
      case 'Pending':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
      case 'Denial':
      case 'Rejected / Denial':
        return 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#121216] border-2 border-slate-300 dark:border-indigo-500/40 rounded-2xl shadow-2xl dark:shadow-[0_0_50px_rgba(79,70,229,0.25)] max-w-[1240px] w-full max-h-[94vh] flex flex-col overflow-hidden text-slate-800 dark:text-white transition-colors">
        
        {/* Top Bar / Header */}
        <div className="bg-slate-50 dark:bg-[#1E1B4B] border-b border-slate-200 dark:border-indigo-900/80 px-5 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xl shadow-inner">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  GOOGLE SHEETS SYNC SUCCESS
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {timestamp || new Date().toLocaleTimeString()}
                </span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-bold">
                  ✓ Exact Google Sheet Places &amp; Dates Preserved
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide uppercase mt-0.5">
                LOADED CLAIM DOSSIER DETAILS
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-indigo-900/60 hover:bg-slate-300 dark:hover:bg-indigo-800 text-slate-700 dark:text-indigo-200 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center text-base transition-all border border-slate-300 dark:border-indigo-700/50 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-100 dark:bg-[#0A0A0E] flex-1">
          
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#16161E] border border-slate-200 dark:border-indigo-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                TOTAL CLAIMS LOADED
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {totalCount} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">Records</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Retaining Exact Sheet Order</div>
            </div>

            <div className="bg-white dark:bg-[#16161E] border border-slate-200 dark:border-blue-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                TOTAL BILL AMOUNT
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {formatRupee(totalBillSum)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Sum of all loaded bills</div>
            </div>

            <div className="bg-white dark:bg-[#16161E] border border-slate-200 dark:border-emerald-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                TOTAL APPROVED AMOUNT
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatRupee(totalApprovedSum)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Settlement: {formatRupee(totalSettlementSum)}
              </div>
            </div>

            <div className="bg-white dark:bg-[#16161E] border border-slate-200 dark:border-amber-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                TOTAL PATIENT PAY
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {formatRupee(totalPatientPaySum)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Direct patient payments</div>
            </div>
          </div>

          {/* Status Breakdown Bar */}
          <div className="bg-white dark:bg-[#16161E] border border-slate-200 dark:border-white/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                STATUS DISTRIBUTION (CLICK TO FILTER)
              </span>
              <span className="text-[10px] text-slate-400">Filter loaded dossiers by current stage</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedStatusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>ALL RECORDS:</span>
                <span className="font-mono bg-black/10 dark:bg-black/40 px-1.5 py-0.2 rounded text-[11px]">{totalCount}</span>
              </button>

              {Object.entries(statusCounts).map(([stKey, count]) => (
                <button
                  key={stKey}
                  type="button"
                  onClick={() => setSelectedStatusFilter(stKey)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedStatusFilter === stKey
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                      : getStatusBadgeStyle(stKey)
                  }`}
                >
                  <span>{stKey}:</span>
                  <span className="font-mono bg-black/10 dark:bg-black/40 px-1.5 py-0.2 rounded text-[11px]">{count}</span>
                </button>
              ))}
              {selectedStatusFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('ALL')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Reset Filter ✕
                </button>
              )}
            </div>
          </div>

          {/* Search, Filter & View Mode Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by Patient, UHID, IPD, Claim No, TPA, or exact date (e.g. 12-05-2024)..."
                className="w-full bg-white dark:bg-[#16161E] border border-slate-300 dark:border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle view mode */}
              <div className="inline-flex rounded-xl bg-slate-200 dark:bg-slate-800 p-0.5 border border-slate-300 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('standard')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'standard'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  📋 Key Columns &amp; Dates
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('full37')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'full37'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  📑 Full 37-Column Sheet View (Col A-AK)
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                Showing <span className="text-indigo-600 dark:text-indigo-300 font-bold">{filteredClaims.length}</span> of {loadedClaims.length}
              </div>
            </div>
          </div>

          {/* TABLE VIEW: STANDARD OR FULL 37-COLUMN */}
          {viewMode === 'standard' ? (
            <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#121218] max-h-[380px] overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-[#1E1B4B] text-slate-700 dark:text-indigo-200 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-indigo-900/60 z-10 whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">S.NO</th>
                    <th className="py-2.5 px-3">PATIENT DETAILS</th>
                    <th className="py-2.5 px-3">UHID / IPD / CLAIM NO</th>
                    <th className="py-2.5 px-3 text-center bg-indigo-50/60 dark:bg-indigo-950/40">
                      📅 DOA (ADMISSION)
                    </th>
                    <th className="py-2.5 px-3 text-center bg-indigo-50/60 dark:bg-indigo-950/40">
                      📅 DOD (DISCHARGE)
                    </th>
                    <th className="py-2.5 px-3">TPA / INSURANCE COMPANY</th>
                    <th className="py-2.5 px-3 text-right">TOTAL BILL</th>
                    <th className="py-2.5 px-3 text-right">APPROVED</th>
                    <th className="py-2.5 px-3 text-right">SETTLEMENT</th>
                    <th className="py-2.5 px-3 text-right">PAYMENT REC.</th>
                    <th className="py-2.5 px-3 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium whitespace-nowrap">
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500 italic">
                        No claims match your search or status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((item, index) => {
                      const doaDisplay = formatDateForDisplay(item.doa);
                      const dodDisplay = formatDateForDisplay(item.dod);
                      return (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-indigo-950/30 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            {item.sNo || index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            <div>{item.patientName || '-'}</div>
                            {item.mobileNumber && (
                              <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                📱 {item.mobileNumber}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            <div>{item.uhid || '-'}</div>
                            <div className="text-[10px] text-slate-500 flex gap-2">
                              {item.ipdNo && <span>IPD: {item.ipdNo}</span>}
                              {item.claimNo && <span>Claim: {item.claimNo}</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20">
                            {doaDisplay}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-700 dark:text-purple-300 bg-indigo-50/30 dark:bg-indigo-950/20">
                            {dodDisplay}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                            <div className="font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                              {item.tpaName || '-'}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {item.insuranceCompany || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.totalBill ? formatRupee(parseNum(item.totalBill)) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.approved ? formatRupee(parseNum(item.approved)) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {item.settlementAmount ? formatRupee(parseNum(item.settlementAmount)) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                            {item.deduction ? formatRupee(parseNum(item.deduction)) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeStyle(
                                item.status || 'Admitted'
                              )}`}
                            >
                              {item.status || 'Admitted'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Full 37-Column Sheet View (Col A through Col AK in exact order) */
            <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#121218] max-h-[380px] overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-[#1E1B4B] text-slate-700 dark:text-indigo-200 text-[9px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-indigo-900/60 z-10 whitespace-nowrap">
                  <tr>
                    <th className="py-2 px-2.5 text-center">1 (A): S.No</th>
                    <th className="py-2 px-2.5">2 (B): Patient Details</th>
                    <th className="py-2 px-2.5">3 (C): UHID</th>
                    <th className="py-2 px-2.5">4 (D): Mobile Number</th>
                    <th className="py-2 px-2.5">5 (E): Insurance Limit</th>
                    <th className="py-2 px-2.5">6 (F): IPD No</th>
                    <th className="py-2 px-2.5 bg-indigo-50/60 dark:bg-indigo-950/60">7 (G): DOA (Exact Date)</th>
                    <th className="py-2 px-2.5 bg-indigo-50/60 dark:bg-indigo-950/60">8 (H): DOD (Exact Date)</th>
                    <th className="py-2 px-2.5">9 (I): TPA/Ins. Name</th>
                    <th className="py-2 px-2.5">10 (J): Insurance Company</th>
                    <th className="py-2 px-2.5">11 (K): Insurance ID</th>
                    <th className="py-2 px-2.5">12 (L): Claim No</th>
                    <th className="py-2 px-2.5">13 (M): Policy No</th>
                    <th className="py-2 px-2.5">14 (N): EMP ID</th>
                    <th className="py-2 px-2.5">15 (O): Bill Invoice No</th>
                    <th className="py-2 px-2.5 text-right">16 (P): Total Bill</th>
                    <th className="py-2 px-2.5 text-right">17 (Q): Approved</th>
                    <th className="py-2 px-2.5 text-right">18 (R): Discount</th>
                    <th className="py-2 px-2.5 text-right">19 (S): Patient Pay</th>
                    <th className="py-2 px-2.5 text-right">20 (T): Settlement Amount</th>
                    <th className="py-2 px-2.5 text-right">21 (U): TDS Amount</th>
                    <th className="py-2 px-2.5 text-right">22 (V): Payment Received</th>
                    <th className="py-2 px-2.5 bg-indigo-50/60 dark:bg-indigo-950/60">23 (W): Payment Date</th>
                    <th className="py-2 px-2.5">24 (X): UTR</th>
                    <th className="py-2 px-2.5">25 (Y): Attender Name</th>
                    <th className="py-2 px-2.5">26 (Z): Relation</th>
                    <th className="py-2 px-2.5">27 (AA): Insurance Address</th>
                    <th className="py-2 px-2.5">28 (AB): Bank Name</th>
                    <th className="py-2 px-2.5">29 (AC): Bank Account No</th>
                    <th className="py-2 px-2.5">30 (AD): IFSC Code</th>
                    <th className="py-2 px-2.5">31 (AE): Bank Address</th>
                    <th className="py-2 px-2.5">32 (AF): Courier Details</th>
                    <th className="py-2 px-2.5">33 (AG): Courier Date</th>
                    <th className="py-2 px-2.5">34 (AH): Diagnosis</th>
                    <th className="py-2 px-2.5">35 (AI): Surgery Name</th>
                    <th className="py-2 px-2.5">36 (AJ): Remark</th>
                    <th className="py-2 px-2.5 text-center">37 (AK): Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono text-[11px] whitespace-nowrap">
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={37} className="py-8 text-center text-slate-500 italic">
                        No claims match your search or status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-indigo-950/30 transition-colors">
                        <td className="py-2 px-2.5 text-center font-bold text-slate-500">{item.sNo || index + 1}</td>
                        <td className="py-2 px-2.5 font-bold font-sans text-slate-900 dark:text-white">{item.patientName || '-'}</td>
                        <td className="py-2 px-2.5">{item.uhid || '-'}</td>
                        <td className="py-2 px-2.5">{item.mobileNumber || '-'}</td>
                        <td className="py-2 px-2.5">{item.insuranceLimit || '-'}</td>
                        <td className="py-2 px-2.5">{item.ipdNo || '-'}</td>
                        <td className="py-2 px-2.5 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/20">
                          {formatDateForDisplay(item.doa)}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-purple-700 dark:text-purple-300 bg-indigo-50/20 dark:bg-indigo-950/20">
                          {formatDateForDisplay(item.dod)}
                        </td>
                        <td className="py-2 px-2.5 font-sans font-semibold text-indigo-700 dark:text-indigo-300">{item.tpaName || '-'}</td>
                        <td className="py-2 px-2.5 font-sans">{item.insuranceCompany || '-'}</td>
                        <td className="py-2 px-2.5">{item.insuranceID || '-'}</td>
                        <td className="py-2 px-2.5">{item.claimNo || '-'}</td>
                        <td className="py-2 px-2.5">{item.policyNumber || '-'}</td>
                        <td className="py-2 px-2.5">{item.empID || '-'}</td>
                        <td className="py-2 px-2.5">{item.billInvoiceNo || '-'}</td>
                        <td className="py-2 px-2.5 text-right font-bold">{item.totalBill || '-'}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-blue-600 dark:text-blue-400">{item.approved || '-'}</td>
                        <td className="py-2 px-2.5 text-right">{item.discount || '-'}</td>
                        <td className="py-2 px-2.5 text-right text-amber-600 dark:text-amber-400">{item.patientPay || '-'}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{item.settlementAmount || '-'}</td>
                        <td className="py-2 px-2.5 text-right text-purple-600 dark:text-purple-400">{item.tds || '-'}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-teal-600 dark:text-teal-400">{item.deduction || '-'}</td>
                        <td className="py-2 px-2.5 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/20">
                          {formatDateForDisplay(item.paymentDate)}
                        </td>
                        <td className="py-2 px-2.5">{item.utr || '-'}</td>
                        <td className="py-2 px-2.5 font-sans">{item.attenderName || '-'}</td>
                        <td className="py-2 px-2.5 font-sans">{item.relation || '-'}</td>
                        <td className="py-2 px-2.5 font-sans max-w-[180px] truncate" title={item.insuranceAddress || ''}>{item.insuranceAddress || '-'}</td>
                        <td className="py-2 px-2.5 font-sans">{item.bankName || '-'}</td>
                        <td className="py-2 px-2.5">{item.bankAccountNo || '-'}</td>
                        <td className="py-2 px-2.5">{item.ifscCode || '-'}</td>
                        <td className="py-2 px-2.5 font-sans max-w-[180px] truncate" title={item.bankAddress || ''}>{item.bankAddress || '-'}</td>
                        <td className="py-2 px-2.5 font-sans">{item.courierDetails || '-'}</td>
                        <td className="py-2 px-2.5">{formatDateForDisplay(item.courierDate)}</td>
                        <td className="py-2 px-2.5 font-sans max-w-[180px] truncate">{item.diagnosis || '-'}</td>
                        <td className="py-2 px-2.5 font-sans max-w-[180px] truncate">{item.surgeryName || '-'}</td>
                        <td className="py-2 px-2.5 font-sans max-w-[180px] truncate">{item.remark || '-'}</td>
                        <td className="py-2 px-2.5 text-center font-sans">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeStyle(
                              item.status || 'Admitted'
                            )}`}
                          >
                            {item.status || 'Admitted'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-[#1E1B4B] border-t border-slate-200 dark:border-indigo-900/80 px-5 py-3.5 flex justify-between items-center shrink-0 flex-wrap gap-2">
          <a
            href={activeSpreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>↗️</span> Open Source Google Sheet
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>✓</span> CONFIRM &amp; APPLY TO APP
          </button>
        </div>

      </div>
    </div>
  );
};
