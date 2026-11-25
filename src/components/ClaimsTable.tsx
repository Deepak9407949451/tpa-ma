import React, { useState, useRef, useEffect } from 'react';
import { Claim } from '../types';
import { ALL_COLUMNS } from '../constants/insuranceData';
import {
  formatDateForDisplay,
  getStatusColor,
  buildWhatsAppMessage,
  openWhatsAppChat,
  normalizeMobileNumber,
  sendWhatsAppMessage,
  formatCurrencyDisplay
} from '../utils/formatters';
import { WhatsAppIcon } from './WhatsAppIcon';
import { ClaimsGrid } from './ClaimsGrid';

interface ClaimsTableProps {
  claims: Claim[];
  allClaims: Claim[];
  currentFilter?: string;
  onClearFilter?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  onOpenAddModal: () => void;
  selectedIndices: Set<number>;
  onToggleSelect: (actualIndex: number) => void;
  onSelectAll: (checked: boolean) => void;
  onExportCSV?: (exportList?: Claim[]) => void;
  onExportXLSX?: (exportList?: Claim[]) => void;
  onGenerateCoverLetter?: (singleClaim?: Claim) => void;
  onShowDetails: (actualIndex: number) => void;
  onEditClaim: (actualIndex: number) => void;
  onDeleteClaim?: (actualIndex: number) => void;
  onDeleteSelected?: () => void;
  onDateDoubleClick?: (dateStr: string) => void;
  onFolderCreate?: () => void;
  themeMode?: 'dark' | 'light';
}

export const ClaimsTable: React.FC<ClaimsTableProps> = ({
  claims,
  allClaims,
  currentFilter = '',
  onClearFilter,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenAddModal,
  selectedIndices,
  onToggleSelect,
  onSelectAll,
  onExportCSV,
  onExportXLSX,
  onGenerateCoverLetter,
  onShowDetails,
  onEditClaim,
  onDeleteClaim,
  onDeleteSelected,
  onDateDoubleClick,
  onFolderCreate,
  themeMode = 'dark'
}) => {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.map(c => c.key))
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const columnPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, claims.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalItems = claims.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = currentPage * pageSize;
  const paginatedClaims = claims.slice(pageStart, pageEnd);

  const toggleColumn = (key: string) => {
    const next = new Set(visibleColumns);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setVisibleColumns(next);
  };

  const resetColumns = () => {
    setVisibleColumns(new Set(ALL_COLUMNS.map(c => c.key)));
  };

  const isAllPageSelected =
    paginatedClaims.length > 0 &&
    paginatedClaims.every(c => selectedIndices.has(allClaims.indexOf(c)));

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAll(e.target.checked);
  };

  const isColVisible = (key: string) => visibleColumns.has(key);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/5 pb-2 mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
          <span>Claims Records</span>
          {currentFilter && (
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 rounded-full shadow-sm">
              Applied Filter: {currentFilter} ({claims.length} Records)
            </span>
          )}
        </h2>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Showing <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{claims.length}</strong> of <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{allClaims.length}</strong> Total Patient(s)</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2.5 items-center mb-4">
        <div className="flex-1 min-w-[220px] relative">
          <input
            type="text"
            value={searchQuery}
            onClick={() => {
              if (currentFilter && onClearFilter) {
                onClearFilter();
              }
            }}
            onFocus={() => {
              if (currentFilter && onClearFilter) {
                onClearFilter();
              }
            }}
            onChange={(e) => {
              if (currentFilter && onClearFilter) {
                onClearFilter();
              }
              onSearchChange(e.target.value);
            }}
            placeholder="🔍 Search all fields..."
            className="w-full px-3.5 py-2 border border-slate-300 dark:border-white/10 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#08080A] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-xs"
            title="Clicking or typing here automatically triggers the Total Patient filter and searches all fields"
          />
        </div>

        {onExportCSV && (
          <button
            type="button"
            onClick={() => onExportCSV(claims)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-900/80 dark:hover:bg-emerald-800 dark:text-emerald-200 border border-emerald-500/40 px-3.5 py-2 rounded-xl font-bold text-xs shadow transition-all hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
            title="Export currently filtered claims data to CSV"
          >
            <span>⬆️</span> CSV ({claims.length})
          </button>
        )}

        {onExportXLSX && (
          <button
            type="button"
            onClick={() => onExportXLSX(claims)}
            className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-900/80 dark:hover:bg-teal-800 dark:text-teal-200 border border-teal-500/40 px-3.5 py-2 rounded-xl font-bold text-xs shadow transition-all hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
            title="Export currently filtered claims data to Excel (.XLSX)"
          >
            <span>📊</span> Excel ({claims.length})
          </button>
        )}

        {viewMode === 'table' && (
          <div className="relative" ref={columnPickerRef}>
            <button
              type="button"
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:border-white/10 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border"
            >
              Columns ▾
            </button>

            {showColumnPicker && (
              <div className="absolute top-11 left-0 w-72 max-h-80 overflow-y-auto bg-white dark:bg-[#121216] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-3.5 z-30">
                <div className="space-y-1">
                  {ALL_COLUMNS.map(col => (
                    <label
                      key={col.key}
                      className="flex items-center justify-between text-xs text-slate-800 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1.5 rounded-lg"
                    >
                      <span>{col.label}</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="w-4 h-4 accent-indigo-500"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={resetColumns}
                  className="mt-3 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 text-xs font-bold py-2 rounded-xl transition-colors border border-slate-300 dark:border-white/10 cursor-pointer"
                >
                  Reset Columns
                </button>
              </div>
            )}
          </div>
        )}

        <div className="inline-flex bg-slate-200 dark:bg-[#08080A] p-1 rounded-full border border-slate-300 dark:border-white/10">
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'table' ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            📋 Table View
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            🧩 Grid View
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/30 transition-all hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>+ Add Claim</span>
          </button>
        </div>

        {viewMode === 'table' && onGenerateCoverLetter && selectedIndices.size > 0 && (
          <button
            type="button"
            onClick={() => onGenerateCoverLetter && onGenerateCoverLetter()}
            className="bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/30 px-3.5 py-2 rounded-lg font-bold text-xs shadow transition-all hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
          >
            📄 Cover Letter ({selectedIndices.size})
          </button>
        )}

        {viewMode === 'table' && onFolderCreate && selectedIndices.size > 0 && (
          <button
            type="button"
            onClick={onFolderCreate}
            className="bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white border border-teal-400/30 px-3.5 py-2 rounded-lg font-extrabold text-xs shadow transition-all hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
            title="Create physical patient folders or download .bat file"
          >
            <span>📂</span> Folder Create ({selectedIndices.size})
          </button>
        )}

        {viewMode === 'table' && selectedIndices.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-lg">
              {selectedIndices.size} Selected
            </span>

            {onDeleteSelected && (
              <button
                type="button"
                onClick={onDeleteSelected}
                className="bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-500/40 px-3.5 py-2 rounded-lg font-bold text-xs shadow transition-all hover:-translate-y-0.5 flex items-center gap-1.5"
                title="Delete selected patient records"
              >
                <span>🗑️</span> Delete Selected ({selectedIndices.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl max-h-[520px] bg-white dark:bg-[#0F0F12]">
          <table className="w-full min-w-[2400px] border-collapse text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-[#0F0F12] sticky top-0 z-10 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                {isColVisible('action') && (
                  <th className="p-3 text-left border-r border-slate-200 dark:border-white/5 sticky left-0 z-20 bg-slate-100 dark:bg-[#0F0F12] min-w-[180px]">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleSelectAllChange}
                      className="w-4 h-4 accent-indigo-500 mr-2 align-middle cursor-pointer"
                    />
                    Action
                  </th>
                )}
                {isColVisible('sNo') && (
                  <th className="p-3 text-left border-r border-slate-200 dark:border-white/5 sticky left-[180px] z-20 bg-slate-100 dark:bg-[#0F0F12] min-w-[70px]">
                    S.No
                  </th>
                )}
                {isColVisible('patientName') && (
                  <th className="p-3 text-left border-r-2 border-indigo-500/50 sticky left-[250px] z-20 bg-slate-100 dark:bg-[#0F0F12] min-w-[160px]">
                    Patient Details
                  </th>
                )}
                {isColVisible('uhid') && <th className="p-3 text-left border-r border-white/5">UHID</th>}
                {isColVisible('mobileNumber') && <th className="p-3 text-left border-r border-white/5">Mobile Number</th>}
                {isColVisible('insuranceLimit') && <th className="p-3 text-left border-r border-white/5">Insurance Limit</th>}
                {isColVisible('ipdNo') && <th className="p-3 text-left border-r border-white/5">IPD No</th>}
                {isColVisible('doa') && <th className="p-3 text-left border-r border-white/5">DOA</th>}
                {isColVisible('dod') && <th className="p-3 text-left border-r border-white/5">DOD</th>}
                {isColVisible('tpaName') && <th className="p-3 text-left border-r border-white/5">TPA/Ins. Name</th>}
                {isColVisible('insuranceCompany') && <th className="p-3 text-left border-r border-white/5">Insurance Company</th>}
                {isColVisible('insuranceID') && <th className="p-3 text-left border-r border-white/5">Insurance ID</th>}
                {isColVisible('claimNo') && <th className="p-3 text-left border-r border-white/5">Claim No</th>}
                {isColVisible('policyNumber') && <th className="p-3 text-left border-r border-white/5">Policy No</th>}
                {isColVisible('empID') && <th className="p-3 text-left border-r border-white/5">EMP ID</th>}
                {isColVisible('billInvoiceNo') && <th className="p-3 text-left border-r border-white/5">Bill Invoice No</th>}
                {isColVisible('totalBill') && <th className="p-3 text-left border-r border-white/5">Total Bill</th>}
                {isColVisible('approved') && <th className="p-3 text-left border-r border-white/5">Approved</th>}
                {isColVisible('discount') && <th className="p-3 text-left border-r border-white/5">Discount</th>}
                {isColVisible('patientPay') && <th className="p-3 text-left border-r border-white/5">Patient Pay</th>}
                {isColVisible('settlementAmount') && <th className="p-3 text-left border-r border-white/5">Settlement Amount</th>}
                {isColVisible('tds') && <th className="p-3 text-left border-r border-white/5">TDS Amount</th>}
                {isColVisible('deduction') && <th className="p-3 text-left border-r border-white/5">Payment Recived</th>}
                {isColVisible('paymentDate') && <th className="p-3 text-left border-r border-white/5">Payment Date</th>}
                {isColVisible('utr') && <th className="p-3 text-left border-r border-white/5">UTR</th>}
                {isColVisible('attenderName') && <th className="p-3 text-left border-r border-white/5">Attender Name</th>}
                {isColVisible('relation') && <th className="p-3 text-left border-r border-white/5">Relation</th>}
                {isColVisible('insuranceAddress') && <th className="p-3 text-left border-r border-white/5">Insurance Address</th>}
                {isColVisible('bankName') && <th className="p-3 text-left border-r border-white/5">Bank Name</th>}
                {isColVisible('bankAccountNo') && <th className="p-3 text-left border-r border-white/5">Bank Account No</th>}
                {isColVisible('ifscCode') && <th className="p-3 text-left border-r border-white/5">IFSC Code</th>}
                {isColVisible('bankAddress') && <th className="p-3 text-left border-r border-white/5">Bank Address</th>}
                {isColVisible('courierDetails') && <th className="p-3 text-left border-r border-white/5">Courier Details</th>}
                {isColVisible('courierDate') && <th className="p-3 text-left border-r border-white/5">Courier Date</th>}
                {isColVisible('diagnosis') && <th className="p-3 text-left border-r border-white/5">Diagnosis</th>}
                {isColVisible('surgeryName') && <th className="p-3 text-left border-r border-white/5">Surgery Name</th>}
                {isColVisible('remark') && <th className="p-3 text-left border-r border-white/5">Remark</th>}
                {isColVisible('status') && <th className="p-3 text-left border-r border-white/5">Status</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedClaims.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.size} className="p-8 text-center text-slate-500 font-medium">
                    No claims found.
                  </td>
                </tr>
              ) : (
                paginatedClaims.map((claim, displayIndex) => {
                  const actualIndex = allClaims.indexOf(claim);
                  const isChecked = selectedIndices.has(actualIndex);

                  const handleWhatsApp = () => {
                    sendWhatsAppMessage(claim);
                  };

                  return (
                    <tr key={actualIndex} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-200 dark:border-white/5">
                      {isColVisible('action') && (
                        <td className="p-3 border-r border-slate-200 dark:border-white/5 sticky left-0 z-10 bg-white dark:bg-[#121216] font-medium">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => onToggleSelect(actualIndex)}
                              className="w-4 h-4 accent-indigo-500 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => onShowDetails(actualIndex)}
                              title="View"
                              className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                            >
                              👁️
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditClaim(actualIndex)}
                              title="Edit"
                              className="p-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => onGenerateCoverLetter ? onGenerateCoverLetter(claim) : onShowDetails(actualIndex)}
                              title="Generate Cover Letter"
                              className="p-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer"
                            >
                              📄
                            </button>
                            <button
                              type="button"
                              onClick={handleWhatsApp}
                              title="Send WhatsApp Message"
                              className="p-1.5 rounded-lg bg-emerald-600/80 text-white border border-emerald-400/30 hover:bg-emerald-500 transition-colors shadow-[0_0_8px_rgba(16,185,129,0.3)] flex items-center justify-center cursor-pointer"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                            </button>
                            {onDeleteClaim && (
                              <button
                                type="button"
                                onClick={() => onDeleteClaim(actualIndex)}
                                title="Delete patient record"
                                className="p-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/25 transition-colors cursor-pointer"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      {isColVisible('sNo') && (
                        <td className="p-3 border-r border-slate-200 dark:border-white/5 sticky left-[180px] z-10 bg-white dark:bg-[#121216] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {pageStart + displayIndex + 1}
                        </td>
                      )}
                      {isColVisible('patientName') && (
                        <td className="p-3 border-r-2 border-indigo-500/50 sticky left-[250px] z-10 bg-white dark:bg-[#121216] font-bold text-slate-900 dark:text-white">
                          <button
                            type="button"
                            onClick={() => onShowDetails(actualIndex)}
                            className="text-left font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 hover:underline cursor-pointer"
                            title="Click to view details"
                          >
                            <span>{claim.patientName || '-'}</span>
                          </button>
                        </td>
                      )}
                      {isColVisible('uhid') && <td className="p-3 border-r border-white/5 font-semibold text-slate-300">{claim.uhid || '-'}</td>}
                      {isColVisible('mobileNumber') && <td className="p-3 border-r border-white/5">{claim.mobileNumber || '-'}</td>}
                      {isColVisible('insuranceLimit') && <td className="p-3 border-r border-white/5">{claim.insuranceLimit || '-'}</td>}
                      {isColVisible('ipdNo') && <td className="p-3 border-r border-white/5">{claim.ipdNo || '-'}</td>}
                      {isColVisible('doa') && (
                        <td
                          className="p-3 border-r border-white/5 hover:bg-indigo-500/10 transition-colors cursor-pointer select-none"
                          onDoubleClick={() => onDateDoubleClick && onDateDoubleClick(claim.doa)}
                          title="Double click date to view Daily Admission & Discharge Info Popup"
                        >
                          {formatDateForDisplay(claim.doa)}
                        </td>
                      )}
                      {isColVisible('dod') && (
                        <td
                          className="p-3 border-r border-white/5 hover:bg-indigo-500/10 transition-colors cursor-pointer select-none"
                          onDoubleClick={() => onDateDoubleClick && onDateDoubleClick(claim.dod)}
                          title="Double click date to view Daily Admission & Discharge Info Popup"
                        >
                          {formatDateForDisplay(claim.dod)}
                        </td>
                      )}
                      {isColVisible('tpaName') && <td className="p-3 border-r border-white/5">{claim.tpaName || '-'}</td>}
                      {isColVisible('insuranceCompany') && <td className="p-3 border-r border-white/5">{claim.insuranceCompany || '-'}</td>}
                      {isColVisible('insuranceID') && <td className="p-3 border-r border-white/5">{claim.insuranceID || '-'}</td>}
                      {isColVisible('claimNo') && <td className="p-3 border-r border-white/5 font-mono text-[11px] text-indigo-300">{claim.claimNo || '-'}</td>}
                      {isColVisible('policyNumber') && <td className="p-3 border-r border-white/5">{claim.policyNumber || '-'}</td>}
                      {isColVisible('empID') && <td className="p-3 border-r border-white/5">{claim.empID || '-'}</td>}
                      {isColVisible('billInvoiceNo') && <td className="p-3 border-r border-white/5">{claim.billInvoiceNo || '-'}</td>}
                      {isColVisible('totalBill') && <td className="p-3 border-r border-white/5 font-semibold text-indigo-400">{formatCurrencyDisplay(claim.totalBill, '-')}</td>}
                      {isColVisible('approved') && <td className="p-3 border-r border-white/5 font-semibold text-emerald-400">{formatCurrencyDisplay(claim.approved, '-')}</td>}
                      {isColVisible('discount') && <td className="p-3 border-r border-white/5 font-semibold text-slate-300">{formatCurrencyDisplay(claim.discount, '-')}</td>}
                      {isColVisible('patientPay') && <td className="p-3 border-r border-white/5 font-semibold text-amber-400">{formatCurrencyDisplay(claim.patientPay, '-')}</td>}
                      {isColVisible('settlementAmount') && <td className="p-3 border-r border-white/5 font-semibold text-indigo-300">{formatCurrencyDisplay(claim.settlementAmount, '-')}</td>}
                      {isColVisible('tds') && <td className="p-3 border-r border-white/5 font-semibold text-slate-400">{formatCurrencyDisplay(claim.tds, '-')}</td>}
                      {isColVisible('deduction') && <td className="p-3 border-r border-white/5 font-semibold text-emerald-400">{formatCurrencyDisplay(claim.deduction, '-')}</td>}
                      {isColVisible('paymentDate') && <td className="p-3 border-r border-white/5">{formatDateForDisplay(claim.paymentDate)}</td>}
                      {isColVisible('utr') && <td className="p-3 border-r border-white/5 font-mono text-[11px] text-slate-400">{claim.utr || '-'}</td>}
                      {isColVisible('attenderName') && <td className="p-3 border-r border-white/5">{claim.attenderName || '-'}</td>}
                      {isColVisible('relation') && <td className="p-3 border-r border-white/5">{claim.relation || '-'}</td>}
                      {isColVisible('insuranceAddress') && <td className="p-3 border-r border-white/5 max-w-xs truncate text-slate-400">{claim.insuranceAddress || '-'}</td>}
                      {isColVisible('bankName') && <td className="p-3 border-r border-white/5">{claim.bankName || '-'}</td>}
                      {isColVisible('bankAccountNo') && <td className="p-3 border-r border-white/5 font-mono text-[11px]">{claim.bankAccountNo || '-'}</td>}
                      {isColVisible('ifscCode') && <td className="p-3 border-r border-white/5 font-mono text-[11px]">{claim.ifscCode || '-'}</td>}
                      {isColVisible('bankAddress') && <td className="p-3 border-r border-white/5 max-w-xs truncate text-slate-400">{claim.bankAddress || '-'}</td>}
                      {isColVisible('courierDetails') && <td className="p-3 border-r border-white/5">{claim.courierDetails || '-'}</td>}
                      {isColVisible('courierDate') && <td className="p-3 border-r border-white/5">{formatDateForDisplay(claim.courierDate)}</td>}
                      {isColVisible('diagnosis') && <td className="p-3 border-r border-white/5">{claim.diagnosis || '-'}</td>}
                      {isColVisible('surgeryName') && <td className="p-3 border-r border-white/5">{claim.surgeryName || '-'}</td>}
                      {isColVisible('remark') && <td className="p-3 border-r border-white/5 max-w-xs truncate text-slate-400">{claim.remark || '-'}</td>}
                      {isColVisible('status') && (
                        <td className="p-3 border-r border-white/5">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs border border-white/10"
                            style={{ backgroundColor: getStatusColor(claim.status) }}
                          >
                            {claim.status || '-'}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <ClaimsGrid
          claims={paginatedClaims}
          allClaims={allClaims}
          selectedIndices={selectedIndices}
          onToggleSelect={onToggleSelect}
          onSelectAll={(checked) => onSelectAll(checked)}
          onGenerateCoverLetter={onGenerateCoverLetter}
          onShowDetails={onShowDetails}
          onEditClaim={onEditClaim}
          onDeleteClaim={onDeleteClaim}
          onDeleteSelected={onDeleteSelected}
          onFolderCreate={onFolderCreate}
          themeMode={themeMode}
        />
      )}

      {/* Pagination Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 mt-4 p-3.5 bg-white dark:bg-[#121216] border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-700 dark:text-slate-300 shadow-md dark:shadow-lg transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Show per page:</span>
          {[10, 25, 50, 100].map(sz => (
            <button
              key={sz}
              type="button"
              onClick={() => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                pageSize === sz
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#08080A] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>

        <div className="font-medium text-slate-500 dark:text-slate-400">
          {totalItems > 0
            ? `Showing ${pageStart + 1} to ${Math.min(totalItems, pageEnd)} of ${totalItems}`
            : 'No records to show'}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
