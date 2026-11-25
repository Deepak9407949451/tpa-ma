import React, { useState } from 'react';
import {
  deleteInsuranceCompany,
  deleteMultipleInsuranceCompanies,
  addCustomInsuranceCompany,
  restoreAllInsuranceCompanies,
  getCustomInsuranceCompanies,
  getDeletedInsuranceCompanies
} from '../constants/insuranceData';
import {
  saveInsuranceCompanyToGoogleSheet,
  deleteInsuranceCompanyFromGoogleSheet,
  pushAllMetadataToGoogleSheet
} from '../utils/metadataSync';
import { Trash2, Building2, Search, X, RotateCcw, Plus } from 'lucide-react';

interface InsuranceCompanyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: string[];
  onUpdateList: (newList: string[]) => void;
  onShowNotification: (msg: string, type?: 'info' | 'success' | 'error') => void;
  selectedCompany?: string;
  onSelectCompany?: (name: string) => void;
  themeMode?: 'dark' | 'light';
}

export const InsuranceCompanyManagerModal: React.FC<InsuranceCompanyManagerModalProps> = ({
  isOpen,
  onClose,
  companies,
  onUpdateList,
  onShowNotification,
  selectedCompany = '',
  onSelectCompany,
  themeMode = 'dark'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handlePushAllToSheet = async () => {
    setIsPushing(true);
    try {
      const res = await pushAllMetadataToGoogleSheet();
      if (res.success) {
        onShowNotification(res.message || '✓ All Insurance Companies successfully pushed to Google Sheet!', 'success');
      } else {
        onShowNotification(res.message || 'Notice pushing Insurance Companies to Google Sheet', 'info');
      }
    } catch (err: any) {
      onShowNotification(`Error: ${err.message}`, 'error');
    } finally {
      setIsPushing(false);
    }
  };

  const customSet = new Set(getCustomInsuranceCompanies().map(c => c.toUpperCase()));
  const deletedCount = getDeletedInsuranceCompanies().length;

  const filteredCompanies = companies.filter(c =>
    c.toUpperCase().includes(searchTerm.toUpperCase().trim())
  );

  const isAllSelected =
    filteredCompanies.length > 0 &&
    filteredCompanies.every(c => selectedCompanies.has(c.toUpperCase()));

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const next = new Set(selectedCompanies);
      filteredCompanies.forEach(c => next.add(c.toUpperCase()));
      setSelectedCompanies(next);
    } else {
      const next = new Set(selectedCompanies);
      filteredCompanies.forEach(c => next.delete(c.toUpperCase()));
      setSelectedCompanies(next);
    }
  };

  const handleToggleSelectOne = (name: string) => {
    const norm = name.toUpperCase();
    const next = new Set(selectedCompanies);
    if (next.has(norm)) {
      next.delete(norm);
    } else {
      next.add(norm);
    }
    setSelectedCompanies(next);
  };

  const handleDelete = (name: string) => {
    const res = deleteInsuranceCompany(name);
    if (res.success) {
      onUpdateList(res.list);
      if (selectedCompany.toUpperCase() === name.toUpperCase() && onSelectCompany) {
        onSelectCompany('');
      }
      setSelectedCompanies(prev => {
        const next = new Set(prev);
        next.delete(name.toUpperCase());
        return next;
      });
      // Sync deletion with Google Sheet
      deleteInsuranceCompanyFromGoogleSheet(name).catch(() => {});
      onShowNotification(`✓ "${name}" deleted from insurance list & Google Sheet`, 'success');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCompanies.size === 0) return;
    const toDelete: string[] = Array.from(selectedCompanies);
    const count = toDelete.length;

    const res = deleteMultipleInsuranceCompanies(toDelete);
    if (res.success) {
      onUpdateList(res.list);
      if (selectedCompany && selectedCompanies.has(selectedCompany.toUpperCase()) && onSelectCompany) {
        onSelectCompany('');
      }

      // Sync batch deletions with Google Sheet
      toDelete.forEach(name => {
        deleteInsuranceCompanyFromGoogleSheet(name).catch(() => {});
      });

      setSelectedCompanies(new Set());
      onShowNotification(`✓ Deleted ${count} Insurance Company(ies) successfully from database & Google Sheet`, 'success');
    }
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCompanyName.trim().toUpperCase();
    if (!trimmed) return;

    const res = addCustomInsuranceCompany(trimmed);
    onUpdateList(res.list);
    setNewCompanyName('');
    if (onSelectCompany) {
      onSelectCompany(trimmed);
    }

    // Sync addition with Google Sheet
    saveInsuranceCompanyToGoogleSheet(trimmed).catch(() => {});

    if (res.isNew) {
      onShowNotification(`✓ "${trimmed}" added and saved to insurance list & Google Sheet`, 'success');
    } else {
      onShowNotification(`"${trimmed}" is already present in company list`, 'info');
    }
  };

  const handleRestoreDefaults = () => {
    const res = restoreAllInsuranceCompanies();
    onUpdateList(res);
    setSelectedCompanies(new Set());
    onShowNotification('✓ Default insurance company list restored successfully', 'success');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white dark:bg-[#12121c] border-2 border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[88vh] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50 via-indigo-50 to-white dark:from-[#18152e] dark:via-[#131322] dark:to-[#0f0f18] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-purple-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Manage Insurance Companies</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {companies.length} Total
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Delete unwanted companies, add new insurers, or manage dropdown list
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Add Form */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 shrink-0">
          <form onSubmit={handleAddNew} className="flex gap-2">
            <input
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Type new Insurance Company name to add..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#0b0b12] border border-slate-300 dark:border-slate-700 font-semibold uppercase focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!newCompanyName.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Search Bar & Stats */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12121c] flex items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Insurance Company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#101018] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 font-semibold uppercase"
            />
          </div>

          {deletedCount > 0 && (
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 transition-colors shrink-0 cursor-pointer"
              title="Restore all default insurance companies that were deleted"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore ({deletedCount})</span>
            </button>
          )}
        </div>

        {/* SELECT ALL AND BATCH DELETE ACTION BAR */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-purple-50/60 dark:bg-purple-950/20 flex items-center justify-between gap-2 shrink-0">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => handleToggleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 dark:text-purple-500 accent-purple-600 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <span>Select All</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                ({filteredCompanies.length} shown)
              </span>
            </span>
          </label>

          <div className="flex items-center gap-2">
            {selectedCompanies.size > 0 && (
              <span className="text-[11px] font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                {selectedCompanies.size} Selected
              </span>
            )}

            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedCompanies.size === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCompanies.size > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 cursor-pointer hover:scale-102 active:scale-98'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-700/60'
              }`}
              title={selectedCompanies.size > 0 ? `Delete ${selectedCompanies.size} selected company(ies)` : 'Select one or more companies to delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected {selectedCompanies.size > 0 ? `(${selectedCompanies.size})` : ''}</span>
            </button>
          </div>
        </div>

        {/* Companies List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#12121c]">
          {filteredCompanies.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No companies found matching &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            filteredCompanies.map((name) => {
              const isCustom = customSet.has(name.toUpperCase());
              const isSelectedAsActive = selectedCompany.toUpperCase() === name.toUpperCase();
              const isChecked = selectedCompanies.has(name.toUpperCase());

              return (
                <div
                  key={name}
                  className={`pt-1.5 pb-1 flex items-center justify-between gap-2.5 transition-colors rounded-xl px-2.5 ${
                    isChecked
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50'
                      : isSelectedAsActive
                      ? 'bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/50 border border-transparent'
                  }`}
                >
                  {/* Item Checkbox */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleSelectOne(name)}
                    className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer shrink-0"
                    title="Select for batch delete"
                  />

                  {/* Company Name & Badges */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer py-1"
                    onClick={() => {
                      if (onSelectCompany) {
                        onSelectCompany(name);
                        onClose();
                      }
                    }}
                    title="Click to select this Insurance Company"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {name}
                      </span>
                      {isCustom && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                          Custom
                        </span>
                      )}
                      {isSelectedAsActive && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 shrink-0">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Single Delete Action */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(name);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title={`Direct delete "${name}" from company list`}
                    >
                      <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-[#101018] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <span>Click any company to select</span>
            <button
              type="button"
              onClick={handlePushAllToSheet}
              disabled={isPushing}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 text-[10.5px]"
              title="Push all insurance companies to Google Sheet"
            >
              <span>📤</span>
              <span>{isPushing ? 'Sending...' : 'Send to Sheet'}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
