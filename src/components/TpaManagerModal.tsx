import React, { useState } from 'react';
import {
  deleteTpa,
  deleteMultipleTpas,
  addCustomTpa,
  saveCustomTpaAddress,
  restoreAllTpas,
  getCustomTpaList,
  getDeletedTpaList,
  getMatchingBankDetails,
  getMatchingInsuranceAddress
} from '../constants/insuranceData';
import {
  saveTpaToGoogleSheet,
  deleteTpaFromGoogleSheet,
  pushAllMetadataToGoogleSheet
} from '../utils/metadataSync';
import { Trash2, Building2, Search, X, RotateCcw, Plus, CheckSquare, Square } from 'lucide-react';

interface TpaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tpaList: string[];
  onUpdateList: (newList: string[]) => void;
  onShowNotification: (msg: string, type?: 'info' | 'success' | 'error') => void;
  selectedTpa?: string;
  onSelectTpa?: (name: string) => void;
  themeMode?: 'dark' | 'light';
}

export const TpaManagerModal: React.FC<TpaManagerModalProps> = ({
  isOpen,
  onClose,
  tpaList,
  onUpdateList,
  onShowNotification,
  selectedTpa = '',
  onSelectTpa,
  themeMode = 'dark'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newTpaName, setNewTpaName] = useState('');
  const [newTpaAddress, setNewTpaAddress] = useState('');
  const [showAddressField, setShowAddressField] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [selectedTpas, setSelectedTpas] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handlePushAllToSheet = async () => {
    setIsPushing(true);
    try {
      const res = await pushAllMetadataToGoogleSheet();
      if (res.success) {
        onShowNotification(res.message || '✓ All TPAs successfully pushed to Google Sheet!', 'success');
      } else {
        onShowNotification(res.message || 'Notice pushing TPAs to Google Sheet', 'info');
      }
    } catch (err: any) {
      onShowNotification(`Error: ${err.message}`, 'error');
    } finally {
      setIsPushing(false);
    }
  };

  const customSet = new Set(getCustomTpaList().map(c => c.toUpperCase()));
  const deletedCount = getDeletedTpaList().length;

  const filteredTpas = tpaList.filter(c =>
    c.toUpperCase().includes(searchTerm.toUpperCase().trim())
  );

  const isAllSelected =
    filteredTpas.length > 0 &&
    filteredTpas.every(t => selectedTpas.has(t.toUpperCase()));

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const next = new Set(selectedTpas);
      filteredTpas.forEach(t => next.add(t.toUpperCase()));
      setSelectedTpas(next);
    } else {
      const next = new Set(selectedTpas);
      filteredTpas.forEach(t => next.delete(t.toUpperCase()));
      setSelectedTpas(next);
    }
  };

  const handleToggleSelectOne = (name: string) => {
    const norm = name.toUpperCase();
    const next = new Set(selectedTpas);
    if (next.has(norm)) {
      next.delete(norm);
    } else {
      next.add(norm);
    }
    setSelectedTpas(next);
  };

  const handleDelete = (name: string) => {
    const res = deleteTpa(name);
    if (res.success) {
      onUpdateList(res.list);
      if (selectedTpa.toUpperCase() === name.toUpperCase() && onSelectTpa) {
        onSelectTpa('');
      }
      setSelectedTpas(prev => {
        const next = new Set(prev);
        next.delete(name.toUpperCase());
        return next;
      });
      // Sync deletion with Google Sheet
      deleteTpaFromGoogleSheet(name).catch(() => {});
      onShowNotification(`✓ "${name}" deleted from TPA list & Google Sheet`, 'success');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedTpas.size === 0) return;
    const toDelete: string[] = Array.from(selectedTpas);
    const count = toDelete.length;

    const res = deleteMultipleTpas(toDelete);
    if (res.success) {
      onUpdateList(res.list);
      if (selectedTpa && selectedTpas.has(selectedTpa.toUpperCase()) && onSelectTpa) {
        onSelectTpa('');
      }

      // Sync batch deletions with Google Sheet
      toDelete.forEach(name => {
        deleteTpaFromGoogleSheet(name).catch(() => {});
      });

      setSelectedTpas(new Set());
      onShowNotification(`✓ Deleted ${count} TPA(s) successfully from database & Google Sheet`, 'success');
    }
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTpaName.trim().toUpperCase();
    if (!trimmed) return;

    const res = addCustomTpa(trimmed);
    const trimmedAddr = newTpaAddress.trim().toUpperCase();
    if (trimmedAddr) {
      saveCustomTpaAddress(trimmed, trimmedAddr);
    }
    onUpdateList(res.list);
    setNewTpaName('');
    setNewTpaAddress('');
    setShowAddressField(false);
    if (onSelectTpa) {
      onSelectTpa(trimmed);
    }

    // Sync new TPA with Google Sheet
    saveTpaToGoogleSheet({
      name: trimmed,
      address: trimmedAddr,
      bankDetails: getMatchingBankDetails(trimmed) || undefined
    }).catch(() => {});

    if (res.isNew) {
      onShowNotification(`✓ "${trimmed}" added and saved to TPA list & Google Sheet!`, 'success');
    } else {
      onShowNotification(`"${trimmed}" is already present in TPA list`, 'info');
    }
  };

  const handleRestoreDefaults = () => {
    const res = restoreAllTpas();
    onUpdateList(res);
    setSelectedTpas(new Set());
    onShowNotification('✓ Default TPA list restored successfully', 'success');
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
                <span>Manage / Delete TPAs</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {tpaList.length} Total
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Add new TPA, delete unwanted TPAs, or manage dropdown list
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
          <form onSubmit={handleAddNew} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTpaName}
                onChange={(e) => setNewTpaName(e.target.value)}
                placeholder="Type new TPA / Insurance name to add..."
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#0b0b12] border border-slate-300 dark:border-slate-700 font-semibold uppercase focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowAddressField(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  showAddressField
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
                title="Add official address for this TPA"
              >
                📍 Address
              </button>
              <button
                type="submit"
                disabled={!newTpaName.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {showAddressField && (
              <input
                type="text"
                value={newTpaAddress}
                onChange={(e) => setNewTpaAddress(e.target.value)}
                placeholder="Enter official office address for this TPA (optional)..."
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#0b0b12] border border-slate-300 dark:border-slate-700 font-medium uppercase text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            )}
          </form>
        </div>

        {/* Search Bar & Action Controls */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151522] flex items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search TPA name..."
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
              title="Restore all default TPAs that were deleted"
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
                ({filteredTpas.length} shown)
              </span>
            </span>
          </label>

          <div className="flex items-center gap-2">
            {selectedTpas.size > 0 && (
              <span className="text-[11px] font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                {selectedTpas.size} Selected
              </span>
            )}

            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedTpas.size === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedTpas.size > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 cursor-pointer hover:scale-102 active:scale-98'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-700/60'
              }`}
              title={selectedTpas.size > 0 ? `Delete ${selectedTpas.size} selected TPA(s)` : 'Select one or more TPAs to delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected {selectedTpas.size > 0 ? `(${selectedTpas.size})` : ''}</span>
            </button>
          </div>
        </div>

        {/* TPA List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#12121c]">
          {filteredTpas.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No TPAs found matching &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            filteredTpas.map((name) => {
              const isCustom = customSet.has(name.toUpperCase());
              const isSelectedAsActive = selectedTpa.toUpperCase() === name.toUpperCase();
              const isChecked = selectedTpas.has(name.toUpperCase());

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

                  {/* TPA Label & Details */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer py-1"
                    onClick={() => {
                      if (onSelectTpa) {
                        onSelectTpa(name);
                        onClose();
                      }
                    }}
                    title="Click to select this TPA for the claim dossier"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {name}
                      </span>
                      {(() => {
                        const bank = getMatchingBankDetails(name);
                        if (!bank) return null;
                        return (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0"
                            title={`Linked Bank: ${bank.bankName} (${bank.bankAccountNo || 'No A/C'})`}
                          >
                            🏦 {bank.bankName || 'Bank'}
                          </span>
                        );
                      })()}
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
                    {(() => {
                      const addr = getMatchingInsuranceAddress(name);
                      if (!addr) return null;
                      return (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5" title={addr}>
                          📍 {addr}
                        </div>
                      );
                    })()}
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
                      title={`Direct delete "${name}" from TPA list`}
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
            <span>Click any TPA to select</span>
            <button
              type="button"
              onClick={handlePushAllToSheet}
              disabled={isPushing}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 text-[10.5px]"
              title="Push all TPAs and bank details to Google Sheet"
            >
              <span>📤</span>
              <span>{isPushing ? 'Sending...' : 'Send TPAs to Sheet'}</span>
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
