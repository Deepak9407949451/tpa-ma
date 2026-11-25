import React from 'react';

interface DateFilterSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  onApplyDateFilter: () => void;
  onClearDateFilter: () => void;
  onSyncGoogleSheet: () => void;
  isSyncing: boolean;
  hasFilterActive: boolean;
  onExportFiltered: () => void;
  onExportFilteredXLSX?: () => void;
  filterStatusText: string;
}

export const DateFilterSection: React.FC<DateFilterSectionProps> = ({
  isOpen,
  onToggle,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onApplyDateFilter,
  onClearDateFilter,
  onSyncGoogleSheet,
  isSyncing,
  hasFilterActive,
  onExportFiltered,
  onExportFilteredXLSX,
  filterStatusText
}) => {
  return (
    <div className="mb-4">
      <div
        onClick={onToggle}
        className="bg-white dark:bg-[#121216] border border-slate-200 dark:border-white/5 hover:border-amber-500/40 p-4 rounded-2xl cursor-pointer flex justify-between items-center font-bold text-slate-800 dark:text-white transition-all shadow-md dark:shadow-lg select-none"
      >
        <span className="flex items-center gap-2">
          <span className="text-amber-500 dark:text-amber-400">📅</span> Filter by Date of Admission:
        </span>
        <span className={`text-amber-500 dark:text-amber-400 text-sm font-bold transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="bg-slate-50 dark:bg-[#08080A] p-5 rounded-b-2xl border border-slate-200 dark:border-white/10 border-t-0 flex flex-wrap gap-3 items-center mt-0 shadow-inner">
          <div className="flex flex-wrap gap-2.5 items-center">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
              placeholder="From Date"
              className="p-2 border border-slate-300 dark:border-white/10 rounded-xl text-xs bg-white dark:bg-[#121216] text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-xs"
            />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
              placeholder="To Date"
              className="p-2 border border-slate-300 dark:border-white/10 rounded-xl text-xs bg-white dark:bg-[#121216] text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-xs"
            />

            <button
              type="button"
              onClick={onApplyDateFilter}
              className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              Apply Filter
            </button>

            <button
              type="button"
              onClick={onClearDateFilter}
              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs cursor-pointer"
            >
              Clear Filter
            </button>

            <button
              id="syncBtn"
              type="button"
              onClick={onSyncGoogleSheet}
              disabled={isSyncing}
              className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-800 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-500/30 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <span>🔄</span> {isSyncing ? 'Syncing...' : 'Sync to Google Sheet'}
            </button>

            {hasFilterActive && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onExportFiltered}
                  className="bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/80 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Download CSV file of filtered records"
                >
                  <span>⬆️</span> Export CSV
                </button>
                {onExportFilteredXLSX && (
                  <button
                    type="button"
                    onClick={onExportFilteredXLSX}
                    className="bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/80 dark:hover:bg-teal-800 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-500/40 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Download Excel (.XLSX) file of filtered records"
                  >
                    <span>📊</span> Export Excel
                  </button>
                )}
              </div>
            )}
          </div>

          {filterStatusText && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/20 ml-2 shadow-xs">
              ℹ️ {filterStatusText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
