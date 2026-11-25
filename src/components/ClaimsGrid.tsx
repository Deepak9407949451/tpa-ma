import React from 'react';
import { Claim } from '../types';
import {
  formatDateForDisplay,
  getStatusColor,
  sendWhatsAppMessage,
  formatCurrencyDisplay,
  extractValidPhoneNumbers
} from '../utils/formatters';
import { WhatsAppIcon } from './WhatsAppIcon';

interface ClaimsGridProps {
  claims: Claim[];
  allClaims: Claim[];
  selectedIndices: Set<number>;
  onToggleSelect: (actualIndex: number) => void;
  onSelectAll?: (checked: boolean) => void;
  onGenerateCoverLetter?: (singleClaim?: Claim) => void;
  onShowDetails: (actualIndex: number) => void;
  onEditClaim: (actualIndex: number) => void;
  onDeleteClaim?: (actualIndex: number) => void;
  onDeleteSelected?: () => void;
  onDateDoubleClick?: (dateStr: string) => void;
  onFolderCreate?: () => void;
  themeMode?: 'dark' | 'light';
}

export const ClaimsGrid: React.FC<ClaimsGridProps> = ({
  claims,
  allClaims,
  selectedIndices,
  onToggleSelect,
  onSelectAll,
  onGenerateCoverLetter,
  onShowDetails,
  onEditClaim,
  onDeleteClaim,
  onDeleteSelected,
  onDateDoubleClick,
  onFolderCreate,
  themeMode = 'dark'
}) => {
  const isLight = themeMode === 'light';
  const isAllSelected =
    claims.length > 0 &&
    claims.every(claim => selectedIndices.has(allClaims.indexOf(claim)));

  if (claims.length === 0) {
    return (
      <div
        className={`text-center py-12 px-4 rounded-2xl border-2 border-dashed ${
          isLight
            ? 'text-slate-500 border-slate-300 bg-white'
            : 'text-slate-400 border-slate-700 bg-[#08080A]'
        }`}
      >
        No claims found.
      </div>
    );
  }

  return (
    <div className="space-y-4 my-4">
      {/* Grid Selection Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border-2 shadow-md ${
          isLight
            ? 'bg-white border-slate-300'
            : 'bg-[#121216] border-slate-700/80'
        }`}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <label
            className={`flex items-center gap-2 cursor-pointer text-xs font-bold ${
              isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-200 hover:text-white'
            }`}
          >
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
            />
            <span>Select All Filtered ({claims.length})</span>
          </label>
        </div>

        {selectedIndices.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {onFolderCreate && (
              <button
                type="button"
                onClick={onFolderCreate}
                className="bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white border border-teal-400/40 px-3 py-1.5 rounded-xl font-extrabold text-xs shadow transition-all hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
                title="Create physical patient folders or download .bat file"
              >
                <span>📂</span> Folder Create ({selectedIndices.size})
              </button>
            )}

            {onGenerateCoverLetter && (
              <button
                type="button"
                onClick={() => onGenerateCoverLetter && onGenerateCoverLetter()}
                className="bg-purple-900/70 hover:bg-purple-800 text-purple-100 border border-purple-400/40 px-3 py-1.5 rounded-xl font-bold text-xs shadow transition-all hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
              >
                📄 Cover Letter ({selectedIndices.size})
              </button>
            )}

            <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-1 rounded-lg">
              {selectedIndices.size} Selected
            </span>

            {onDeleteSelected && (
              <button
                type="button"
                onClick={onDeleteSelected}
                className="bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-500/50 px-3 py-1.5 rounded-xl font-bold text-xs shadow transition-all hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
              >
                <span>🗑️</span> Delete Selected
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid Cards (Permanent Wide 3-Col Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
        {claims.map((claim) => {
          const actualIndex = allClaims.indexOf(claim);
          const isChecked = selectedIndices.has(actualIndex);
          const mobile = claim.mobileNumber || claim.mobile || '';

          const handleWhatsApp = (e: React.MouseEvent) => {
            e.stopPropagation();
            sendWhatsAppMessage(claim);
          };

          return (
            <div
              key={actualIndex}
              className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xl transition-all flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                isChecked
                  ? isLight
                    ? 'bg-indigo-50/70 border-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.25)] ring-2 ring-indigo-500/30'
                    : 'bg-indigo-950/30 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-2 ring-indigo-500/40'
                  : isLight
                    ? 'bg-white border-slate-300 hover:border-indigo-500 shadow-md'
                    : 'bg-[#121216] border-slate-700/80 hover:border-indigo-500/60 shadow-xl'
              }`}
            >
              <div className="space-y-3">
                {/* 1. Header Box (Patient Name + Checkbox + Status) with all 4 borders */}
                <div
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border-2 shadow-xs ${
                    isLight
                      ? 'bg-slate-100 border-slate-300'
                      : 'bg-[#08080A] border-slate-700/90'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelect(actualIndex)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer shrink-0 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => onShowDetails(actualIndex)}
                      className={`font-bold text-sm sm:text-base text-left truncate cursor-pointer transition-colors ${
                        isLight
                          ? 'text-indigo-700 hover:text-indigo-900'
                          : 'text-indigo-300 hover:text-white'
                      }`}
                      title="Click patient name to view details"
                    >
                      {claim.patientName || 'Unnamed Patient'}
                    </button>
                  </div>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold text-white shadow-xs border border-white/20 shrink-0"
                    style={{ backgroundColor: getStatusColor(claim.status) }}
                  >
                    {claim.status || 'Admitted'}
                  </span>
                </div>

                {/* 2. Patient Mobile Number Box with all 4 borders */}
                {(() => {
                  const detectedList = extractValidPhoneNumbers(mobile);
                  const isMultiple = detectedList.length > 1;

                  return (
                    <div
                      className={`flex items-center justify-between gap-2 p-2.5 min-h-[46px] rounded-xl border-2 shadow-xs ${
                        isLight
                          ? 'bg-emerald-50/70 border-emerald-500/60'
                          : 'bg-[#08080A] border-emerald-500/50'
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-2 min-w-0">
                        <span className="text-emerald-500 text-base shrink-0">📱</span>
                        <span className={`font-black uppercase tracking-wider text-[12px] shrink-0 ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
                          Mobile:
                        </span>
                        <span
                          className={`font-mono font-black text-[14.5px] sm:text-[15px] tracking-wide select-all truncate ${
                            isLight ? 'text-emerald-950' : 'text-white'
                          }`}
                          title={mobile || 'N/A'}
                        >
                          {mobile || 'N/A'}
                        </span>
                        {isMultiple && (
                          <span
                            className="text-[10.5px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shrink-0 shadow-xs"
                            title={`${detectedList.length} numbers registered for bulk WhatsApp`}
                          >
                            {detectedList.length} Nos
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleWhatsApp}
                        title={
                          isMultiple
                            ? `Send WhatsApp to all ${detectedList.length} numbers simultaneously`
                            : `Send WhatsApp Message to ${mobile || 'Patient'}`
                        }
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl font-bold border border-emerald-400/50 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  );
                })()}

                {/* 3. Claim Number Box with all 4 borders */}
                <div
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border-2 shadow-xs text-xs ${
                    isLight
                      ? 'bg-indigo-50/70 border-indigo-500/60'
                      : 'bg-[#08080A] border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-indigo-500 text-sm shrink-0">🔖</span>
                    <span className={`font-black uppercase tracking-wider text-[11px] shrink-0 ${isLight ? 'text-indigo-950' : 'text-indigo-300'}`}>
                      Claim No:
                    </span>
                    <span
                      className={`font-mono font-black tracking-wide truncate select-all ${
                        isLight ? 'text-indigo-950' : 'text-indigo-200'
                      }`}
                      title={claim.claimNo || '-'}
                    >
                      {claim.claimNo || '-'}
                    </span>
                  </div>
                  {claim.claimNo ? (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        isLight
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
                      }`}
                    >
                      REF
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">None</span>
                  )}
                </div>

                {/* 4. Patient Identity & Admission Boxes (Inline label and value with adjusted height) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Box 1: UHID */}
                  <div
                    className={`min-h-[42px] py-2 px-2.5 sm:px-3 rounded-xl border-2 flex items-center gap-1.5 sm:gap-2 shadow-2xs transition-colors overflow-hidden ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 hover:border-indigo-400'
                        : 'bg-[#08080A] border-slate-700/80 hover:border-indigo-500/70'
                    }`}
                  >
                    <span className={`text-[11px] uppercase font-black tracking-wider shrink-0 select-none ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      UHID:
                    </span>
                    <span
                      className={`font-bold font-mono text-[13.5px] sm:text-[14.5px] truncate select-all leading-none ${
                        isLight ? 'text-indigo-950' : 'text-indigo-200'
                      }`}
                      title={claim.uhid || '-'}
                    >
                      {claim.uhid || '-'}
                    </span>
                  </div>

                  {/* Box 2: IPD No */}
                  <div
                    className={`min-h-[42px] py-2 px-2.5 sm:px-3 rounded-xl border-2 flex items-center gap-1.5 sm:gap-2 shadow-2xs transition-colors overflow-hidden ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 hover:border-purple-400'
                        : 'bg-[#08080A] border-slate-700/80 hover:border-purple-500/70'
                    }`}
                  >
                    <span className={`text-[11px] uppercase font-black tracking-wider shrink-0 select-none ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      IPD No:
                    </span>
                    <span
                      className={`font-bold font-mono text-[13.5px] sm:text-[14.5px] truncate select-all leading-none ${
                        isLight ? 'text-purple-950' : 'text-purple-200'
                      }`}
                      title={claim.ipdNo || '-'}
                    >
                      {claim.ipdNo || '-'}
                    </span>
                  </div>

                  {/* Box 3: DOA */}
                  <div
                    className={`min-h-[42px] py-2 px-2.5 sm:px-3 rounded-xl border-2 flex items-center gap-1.5 sm:gap-2 shadow-2xs transition-colors overflow-hidden ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 hover:border-indigo-400'
                        : 'bg-[#08080A] border-slate-700/80 hover:border-indigo-500/70'
                    }`}
                  >
                    <span className={`text-[11px] uppercase font-black tracking-wider shrink-0 select-none ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      DOA:
                    </span>
                    <span
                      onDoubleClick={() => onDateDoubleClick && onDateDoubleClick(claim.doa)}
                      className={`font-bold font-mono text-[13px] sm:text-[14px] hover:text-indigo-500 cursor-pointer transition-colors truncate select-all leading-none ${
                        isLight ? 'text-slate-900' : 'text-slate-100'
                      }`}
                      title="Double click DOA to view Daily Info Popup"
                    >
                      {formatDateForDisplay(claim.doa) || '-'}
                    </span>
                  </div>

                  {/* Box 4: DOD */}
                  <div
                    className={`min-h-[42px] py-2 px-2.5 sm:px-3 rounded-xl border-2 flex items-center gap-1.5 sm:gap-2 shadow-2xs transition-colors overflow-hidden ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 hover:border-indigo-400'
                        : 'bg-[#08080A] border-slate-700/80 hover:border-indigo-500/70'
                    }`}
                  >
                    <span className={`text-[11px] uppercase font-black tracking-wider shrink-0 select-none ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      DOD:
                    </span>
                    <span
                      onDoubleClick={() => onDateDoubleClick && onDateDoubleClick(claim.dod)}
                      className={`font-bold font-mono text-[13px] sm:text-[14px] hover:text-indigo-500 cursor-pointer transition-colors truncate select-all leading-none ${
                        isLight ? 'text-slate-900' : 'text-slate-100'
                      }`}
                      title="Double click DOD to view Daily Info Popup"
                    >
                      {formatDateForDisplay(claim.dod) || '-'}
                    </span>
                  </div>
                </div>

                {/* 5. TPA & Insurance Company Box with all 4 borders */}
                <div
                  className={`p-2.5 rounded-xl border-2 text-xs flex items-center justify-between gap-2 shadow-xs ${
                    isLight
                      ? 'bg-purple-50/70 border-purple-400/60'
                      : 'bg-[#08080A] border-purple-500/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-purple-500 text-sm shrink-0">🏢</span>
                    <span className={`font-black uppercase tracking-wider text-[11px] shrink-0 ${isLight ? 'text-purple-950' : 'text-purple-300'}`}>
                      TPA / Ins:
                    </span>
                  </div>
                  <span
                    className={`truncate font-black text-right ${
                      isLight ? 'text-purple-950' : 'text-white'
                    }`}
                    title={claim.tpaName || claim.insuranceCompany || '-'}
                  >
                    {claim.tpaName || claim.insuranceCompany || '-'}
                  </span>
                </div>

                {/* 6. Financial Breakdown Grid - 4 distinct boxes with increased font size & adjusted height */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Total Bill Box */}
                  <div
                    className={`min-h-[58px] p-2.5 rounded-xl border-2 flex flex-col justify-between shadow-2xs ${
                      isLight
                        ? 'bg-indigo-50/60 border-indigo-400/70'
                        : 'bg-[#08080A] border-indigo-500/50'
                    }`}
                  >
                    <span className="text-[11px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 leading-none">
                      Total Bill
                    </span>
                    <span className={`font-extrabold font-mono text-[15.5px] sm:text-[16.5px] tracking-tight truncate leading-tight ${
                      isLight ? 'text-indigo-800' : 'text-indigo-300'
                    }`}>
                      {formatCurrencyDisplay(claim.totalBill, '₹ 0')}
                    </span>
                  </div>

                  {/* Approved Box */}
                  <div
                    className={`min-h-[58px] p-2.5 rounded-xl border-2 flex flex-col justify-between shadow-2xs ${
                      isLight
                        ? 'bg-emerald-50/60 border-emerald-400/70'
                        : 'bg-[#08080A] border-emerald-500/50'
                    }`}
                  >
                    <span className="text-[11px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 leading-none">
                      Approved
                    </span>
                    <span className={`font-extrabold font-mono text-[15.5px] sm:text-[16.5px] tracking-tight truncate leading-tight ${
                      isLight ? 'text-emerald-800' : 'text-emerald-300'
                    }`}>
                      {formatCurrencyDisplay(claim.approved, '₹ 0')}
                    </span>
                  </div>

                  {/* Discount Box */}
                  <div
                    className={`min-h-[58px] p-2.5 rounded-xl border-2 flex flex-col justify-between shadow-2xs ${
                      isLight
                        ? 'bg-purple-50/60 border-purple-400/70'
                        : 'bg-[#08080A] border-purple-500/50'
                    }`}
                  >
                    <span className="text-[11px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 leading-none">
                      Discount
                    </span>
                    <span className={`font-extrabold font-mono text-[15.5px] sm:text-[16.5px] tracking-tight truncate leading-tight ${
                      isLight ? 'text-purple-800' : 'text-purple-300'
                    }`}>
                      {formatCurrencyDisplay(claim.discount, '₹ 0')}
                    </span>
                  </div>

                  {/* Patient Pay / Settlement Box */}
                  <div
                    className={`min-h-[58px] p-2.5 rounded-xl border-2 flex flex-col justify-between shadow-2xs ${
                      isLight
                        ? 'bg-amber-50/60 border-amber-400/70'
                        : 'bg-[#08080A] border-amber-500/50'
                    }`}
                  >
                    <span className="text-[11px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 leading-none">
                      Patient Pay
                    </span>
                    <span className={`font-extrabold font-mono text-[15.5px] sm:text-[16.5px] tracking-tight truncate leading-tight ${
                      isLight ? 'text-amber-800' : 'text-amber-300'
                    }`}>
                      {formatCurrencyDisplay(claim.patientPay || claim.deduction, '₹ 0')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. Action Buttons Container with all 4 borders */}
              <div
                className={`flex items-center gap-1.5 p-1.5 rounded-xl border-2 justify-between ${
                  isLight
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-[#08080A] border-slate-700/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onShowDetails(actualIndex)}
                  title="View full claim details"
                  className="flex-1 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  👁️ View
                </button>
                <button
                  type="button"
                  onClick={() => onEditClaim(actualIndex)}
                  title="Edit this claim"
                  className="flex-1 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  ✎ Edit
                </button>
                {onDeleteClaim && (
                  <button
                    type="button"
                    onClick={() => onDeleteClaim(actualIndex)}
                    title="Delete patient record"
                    className="py-1.5 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
