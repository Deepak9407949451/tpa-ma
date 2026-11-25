import React, { useRef, useState, useEffect } from 'react';
import { Claim, ClaimStatus } from '../types';
import {
  downloadBatchFolderCreationScript,
  connectPcFolder,
  createPhysicalFoldersInHandle
} from '../utils/folderUtils';
import {
  getDashboardSyncUrl,
  getDashboardSpreadsheetUrl,
  saveDashboardSyncSettingsPermanently,
  loadMetadataFromGoogleSheet,
  pushAllMetadataToGoogleSheet,
  syncMetadataTwoWay,
  getColASpreadsheetUrl,
  getColBSpreadsheetUrl,
  saveColASpreadsheetUrlPermanently,
  saveColBSpreadsheetUrlPermanently,
  loadColAOnlyFromSpreadsheet,
  loadColBOnlyFromSpreadsheet,
  getNotepadNote,
  saveNotepadNotePermanently
} from '../utils/metadataSync';
import {
  USER_TWO_HEADER_METADATA_ROWS,
  seedUserTwoHeaderMetadata,
  getAllTpaOptions,
  getAllInsuranceCompanies,
  getMatchingInsuranceAddress
} from '../constants/insuranceData';
import { HOSPITAL_APPS_SCRIPT_CODE } from '../utils/googleAppsScriptTemplate';

interface ImportExportSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  onImportFile: (file: File) => void;
  onExportCSV: () => void;
  onExportXLSX?: () => void;
  onLoadFromGoogleSheet: () => void;
  onToggleInvoiceSection: () => void;
  isLoadingSheet: boolean;
  claims?: Claim[];
  selectedIndices?: Set<number>;
  currentFilter?: string;
  onFilterByStatus?: (status: ClaimStatus | '') => void;
  syncApiUrl?: string;
  onSaveSyncApiUrl?: (url: string) => void;
  spreadsheetSharingLink?: string;
  onSaveSpreadsheetSharingLink?: (url: string) => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  onOpenGoogleSyncModal?: () => void;
  onShowNotification?: (msg: string, type: 'info' | 'success' | 'error') => void;
  themeMode?: 'dark' | 'light';
}

export const ImportExportSection: React.FC<ImportExportSectionProps> = ({
  isOpen,
  onToggle,
  onImportFile,
  onExportCSV,
  onExportXLSX,
  onLoadFromGoogleSheet,
  onToggleInvoiceSection,
  isLoadingSheet,
  claims = [],
  selectedIndices = new Set(),
  currentFilter = '',
  onFilterByStatus,
  syncApiUrl = '',
  onSaveSyncApiUrl,
  spreadsheetSharingLink = '',
  onSaveSpreadsheetSharingLink,
  onSyncNow,
  isSyncing = false,
  onOpenGoogleSyncModal,
  onShowNotification,
  themeMode = 'dark'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [outputDirectory, setOutputDirectory] = useState<string>(() => {
    return localStorage.getItem('automationOutputDir') || './PatientFolders';
  });
  const [pcDirHandle, setPcDirHandle] = useState<any | null>(null);

  // Live Sync Local States (SEPARATE LOCATION 1: Live Dashboard Import/Export)
  const [sharingLink, setSharingLink] = useState<string>(() => {
    return (spreadsheetSharingLink || getDashboardSpreadsheetUrl()).trim();
  });
  const [colALink, setColALink] = useState<string>(() => {
    return getColASpreadsheetUrl();
  });
  const [colBLink, setColBLink] = useState<string>(() => {
    return getColBSpreadsheetUrl();
  });
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    return (syncApiUrl || getDashboardSyncUrl()).trim();
  });
  const [isSavingUrls, setIsSavingUrls] = useState(false);
  const [isLinkSaved, setIsLinkSaved] = useState(false);
  const [isColASaved, setIsColASaved] = useState(false);
  const [isColBSaved, setIsColBSaved] = useState(false);
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [isAllSaved, setIsAllSaved] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isLoadingColA, setIsLoadingColA] = useState(false);
  const [isLoadingColB, setIsLoadingColB] = useState(false);
  const [isPushingMetadata, setIsPushingMetadata] = useState(false);
  const [isTwoWaySyncing, setIsTwoWaySyncing] = useState(false);
  const [showTwoHeadersTable, setShowTwoHeadersTable] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedColALink, setCopiedColALink] = useState(false);
  const [copiedColBLink, setCopiedColBLink] = useState(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);
  const [showAppsScriptCode, setShowAppsScriptCode] = useState(true);
  const [copiedAppsScriptCode, setCopiedAppsScriptCode] = useState(false);
  const appsScriptSectionRef = useRef<HTMLDivElement>(null);

  // Persistent Notepad Note State
  const [notepadNote, setNotepadNote] = useState<string>(() => {
    return getNotepadNote();
  });
  const [isNoteSaved, setIsNoteSaved] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Section 2, 3 & Notepad Collapsible / Hide State
  const [isSection2Hidden, setIsSection2Hidden] = useState<boolean>(() => {
    return localStorage.getItem('hideSection2_pcFolder') === 'true';
  });
  const [isSection3Hidden, setIsSection3Hidden] = useState<boolean>(() => {
    return localStorage.getItem('hideSection3_columnFormat') === 'true';
  });
  const [isNotepadHidden, setIsNotepadHidden] = useState<boolean>(() => {
    return localStorage.getItem('hideNotepad_reference') === 'true';
  });

  // Sync state when props change
  useEffect(() => {
    if (spreadsheetSharingLink) {
      setSharingLink(spreadsheetSharingLink);
    }
  }, [spreadsheetSharingLink]);

  useEffect(() => {
    if (syncApiUrl) {
      setWebAppUrl(syncApiUrl);
    }
  }, [syncApiUrl]);

  // Synchronize Col A & Col B spreadsheet links and notepad note from persistent server configuration
  useEffect(() => {
    fetch('/api/config')
      .then(r => (r.ok ? r.json() : null))
      .then(cfg => {
        if (cfg) {
          if (cfg.colASpreadsheetLink && typeof cfg.colASpreadsheetLink === 'string') {
            setColALink(cfg.colASpreadsheetLink.trim());
          }
          if (cfg.colBSpreadsheetLink && typeof cfg.colBSpreadsheetLink === 'string') {
            setColBLink(cfg.colBSpreadsheetLink.trim());
          }
          if (cfg.dashboardSpreadsheetSharingLink && !spreadsheetSharingLink) {
            setSharingLink(cfg.dashboardSpreadsheetSharingLink.trim());
          }
          if (cfg.dashboardSyncApiUrl && !syncApiUrl) {
            setWebAppUrl(cfg.dashboardSyncApiUrl.trim());
          }
          if (cfg.notepadNote !== undefined && typeof cfg.notepadNote === 'string') {
            const local = localStorage.getItem('apps_script_notepad_note_v1');
            if (local === null || local === undefined) {
              setNotepadNote(cfg.notepadNote);
              try { localStorage.setItem('apps_script_notepad_note_v1', cfg.notepadNote); } catch {}
            }
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportFile(e.target.files[0]);
    }
  };

  const handleOpenSpreadsheet = () => {
    const target = sharingLink.trim() || getDashboardSpreadsheetUrl();
    window.open(target, '_blank');
  };

  const handleCopyLink = () => {
    const target = sharingLink.trim() || getDashboardSpreadsheetUrl();
    navigator.clipboard.writeText(target);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    if (onShowNotification) {
      onShowNotification('✓ Google Spreadsheet Link copied to clipboard!', 'info');
    }
  };

  const handleCopyApiUrl = () => {
    const target = webAppUrl.trim() || getDashboardSyncUrl();
    navigator.clipboard.writeText(target);
    setCopiedApiUrl(true);
    setTimeout(() => setCopiedApiUrl(false), 2000);
    if (onShowNotification) {
      onShowNotification('✓ Web App API URL copied!', 'info');
    }
  };

  const handleCopyAppsScriptCode = () => {
    navigator.clipboard.writeText(HOSPITAL_APPS_SCRIPT_CODE);
    setCopiedAppsScriptCode(true);
    setTimeout(() => setCopiedAppsScriptCode(false), 2500);
    if (onShowNotification) {
      onShowNotification('✓ Apps Script Source Code (Code.gs) copied to clipboard!', 'success');
    }
  };

  const handleScrollToAppsScript = () => {
    setShowAppsScriptCode(true);
    if (appsScriptSectionRef.current) {
      appsScriptSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
      if (onShowNotification) {
        onShowNotification('✓ Text Notepad & Link permanently saved in code & server config!', 'success');
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification(`Error saving note: ${err.message}`, 'error');
      }
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCopyNote = () => {
    if (!notepadNote) return;
    navigator.clipboard.writeText(notepadNote);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
    if (onShowNotification) {
      onShowNotification('✓ Notepad text / link copied to clipboard!', 'info');
    }
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
        if (onShowNotification) {
          onShowNotification('✓ Pasted from clipboard and saved permanently!', 'success');
        }
      }
    } catch {
      if (onShowNotification) {
        onShowNotification('Click inside the notepad and press Ctrl+V to paste.', 'info');
      }
    }
  };

  const handleClearNote = async () => {
    handleNoteChange('');
    await saveNotepadNotePermanently('');
    if (onShowNotification) {
      onShowNotification('Notepad note cleared and updated.', 'info');
    }
  };

  const handleCopyColALink = () => {
    const target = colALink.trim() || getColASpreadsheetUrl();
    navigator.clipboard.writeText(target);
    setCopiedColALink(true);
    setTimeout(() => setCopiedColALink(false), 2000);
    if (onShowNotification) {
      onShowNotification('✓ Col A Spreadsheet Link copied to clipboard!', 'info');
    }
  };

  const handleCopyColBLink = () => {
    const target = colBLink.trim() || getColBSpreadsheetUrl();
    navigator.clipboard.writeText(target);
    setCopiedColBLink(true);
    setTimeout(() => setCopiedColBLink(false), 2000);
    if (onShowNotification) {
      onShowNotification('✓ Col B Spreadsheet Link copied to clipboard!', 'info');
    }
  };

  const handleSaveColALink = async () => {
    const trimmed = colALink.trim();
    if (!trimmed) return;
    setIsSavingUrls(true);
    try {
      await saveColASpreadsheetUrlPermanently(trimmed);
      setIsColASaved(true);
      setTimeout(() => setIsColASaved(false), 4000);
      if (onShowNotification) {
        onShowNotification('✓ Col A (1.  TPA / INS. NAME) Google Spreadsheet Link saved permanently in code!', 'success');
      }
    } catch (err: any) {
      if (onShowNotification) onShowNotification(`Error saving Col A link: ${err.message}`, 'error');
    } finally {
      setIsSavingUrls(false);
    }
  };

  const handleSaveColBLink = async () => {
    const trimmed = colBLink.trim();
    if (!trimmed) return;
    setIsSavingUrls(true);
    try {
      await saveColBSpreadsheetUrlPermanently(trimmed);
      setIsColBSaved(true);
      setTimeout(() => setIsColBSaved(false), 4000);
      if (onShowNotification) {
        onShowNotification('✓ Col B (2. INSURANCE COMPANY) Google Spreadsheet Link saved permanently in code!', 'success');
      }
    } catch (err: any) {
      if (onShowNotification) onShowNotification(`Error saving Col B link: ${err.message}`, 'error');
    } finally {
      setIsSavingUrls(false);
    }
  };

  const handleLoadColAOnly = async () => {
    const target = colALink.trim() || getColASpreadsheetUrl();
    if (!target) {
      if (onShowNotification) onShowNotification('Please enter a Google Spreadsheet link for Col A', 'error');
      return;
    }
    setIsLoadingColA(true);
    try {
      const res = await loadColAOnlyFromSpreadsheet(target);
      if (onShowNotification) {
        onShowNotification(res.message, res.success ? 'success' : 'error');
      }
    } catch (err: any) {
      if (onShowNotification) onShowNotification(`Error loading Col A: ${err.message}`, 'error');
    } finally {
      setIsLoadingColA(false);
    }
  };

  const handleLoadColBOnly = async () => {
    const target = colBLink.trim() || getColBSpreadsheetUrl();
    if (!target) {
      if (onShowNotification) onShowNotification('Please enter a Google Spreadsheet link for Col B', 'error');
      return;
    }
    setIsLoadingColB(true);
    try {
      const res = await loadColBOnlyFromSpreadsheet(target);
      if (onShowNotification) {
        onShowNotification(res.message, res.success ? 'success' : 'error');
      }
    } catch (err: any) {
      if (onShowNotification) onShowNotification(`Error loading Col B: ${err.message}`, 'error');
    } finally {
      setIsLoadingColB(false);
    }
  };

  const handleSaveLinkPermanent = async () => {
    const trimmedLink = sharingLink.trim();
    if (!trimmedLink) return;
    setIsSavingUrls(true);
    try {
      await saveDashboardSyncSettingsPermanently(webAppUrl.trim(), trimmedLink);
      if (onSaveSpreadsheetSharingLink) onSaveSpreadsheetSharingLink(trimmedLink);
      setIsLinkSaved(true);
      setTimeout(() => setIsLinkSaved(false), 4000);
      if (onShowNotification) {
        onShowNotification('✓ Live Dashboard Google Spreadsheet Link saved permanently in code & server!', 'success');
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification(`Error saving spreadsheet link: ${err.message}`, 'error');
      }
    } finally {
      setIsSavingUrls(false);
    }
  };

  const handleSaveUrlPermanent = async () => {
    const trimmedUrl = webAppUrl.trim();
    if (!trimmedUrl) return;
    setIsSavingUrls(true);
    try {
      await saveDashboardSyncSettingsPermanently(trimmedUrl, sharingLink.trim());
      if (onSaveSyncApiUrl) onSaveSyncApiUrl(trimmedUrl);
      setIsUrlSaved(true);
      setTimeout(() => setIsUrlSaved(false), 4000);
      if (onShowNotification) {
        onShowNotification('✓ Live Dashboard Apps Script URL saved permanently in code & server!', 'success');
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification(`Error saving Apps Script URL: ${err.message}`, 'error');
      }
    } finally {
      setIsSavingUrls(false);
    }
  };

  const handleSavePermanentUrls = async () => {
    setIsSavingUrls(true);
    try {
      const trimmedLink = sharingLink.trim();
      const trimmedUrl = webAppUrl.trim();
      await saveDashboardSyncSettingsPermanently(trimmedUrl, trimmedLink);

      if (colALink.trim()) await saveColASpreadsheetUrlPermanently(colALink.trim());
      if (colBLink.trim()) await saveColBSpreadsheetUrlPermanently(colBLink.trim());
      if (notepadNote !== undefined) await saveNotepadNotePermanently(notepadNote);

      if (onSaveSpreadsheetSharingLink) onSaveSpreadsheetSharingLink(trimmedLink);
      if (onSaveSyncApiUrl) onSaveSyncApiUrl(trimmedUrl);
      setIsAllSaved(true);
      setIsNoteSaved(true);
      setTimeout(() => {
        setIsAllSaved(false);
        setIsNoteSaved(false);
      }, 5000);

      if (onShowNotification) {
        onShowNotification('✓ Live Dashboard Google Sheets & Apps Script URLs, Col A & Col B Links saved permanently in separate location & code!', 'success');
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification(`Error saving URLs: ${err.message}`, 'error');
      }
    } finally {
      setIsSavingUrls(false);
    }
  };

  // Direct load from Google Spreadsheet Link with 7-word duplicate skip
  const handleLoadDirectFromSpreadsheet = async () => {
    const target = sharingLink.trim() || getDashboardSpreadsheetUrl();
    if (!target) {
      if (onShowNotification) {
        onShowNotification('Please specify a valid Google Spreadsheet Sharing Link', 'error');
      }
      return;
    }

    setIsLoadingMetadata(true);
    try {
      // Save permanently in Dashboard location first
      await saveDashboardSyncSettingsPermanently(webAppUrl.trim(), target);
      if (onSaveSpreadsheetSharingLink) onSaveSpreadsheetSharingLink(target);

      const res = await loadMetadataFromGoogleSheet(target);
      const dupInfo = (res.duplicatesSkipped && res.duplicatesSkipped > 0)
        ? ` (${res.duplicatesSkipped} duplicates automatically skipped by first 7 words)`
        : '';

      const countMsg = `Loaded ${res.loadedTpas.length} TPAs (Col A: 1.  TPA / INS. NAME) & ${res.loadedInsuranceCompanies.length} Insurance Companies (Col B: 2. INSURANCE COMPANY)${dupInfo}!`;
      if (onShowNotification) {
        onShowNotification(`✓ ${countMsg}`, 'success');
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification(`Error loading from spreadsheet: ${err.message}`, 'error');
      }
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // Push TPAs and Insurance Companies to Google Sheet
  const handlePushDirectToSheet = async () => {
    const target = webAppUrl.trim() || getDashboardSyncUrl();
    if (!target) {
      if (onShowNotification) {
        onShowNotification('Please enter a valid Google Apps Script Web App URL', 'error');
      }
      return;
    }

    setIsPushingMetadata(true);
    try {
      await saveDashboardSyncSettingsPermanently(target, sharingLink.trim());
      const res = await pushAllMetadataToGoogleSheet(target);
      if (onShowNotification) {
        onShowNotification(res.message, res.success ? 'success' : 'error');
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification(`Error pushing metadata: ${err.message}`, 'error');
      }
    } finally {
      setIsPushingMetadata(false);
    }
  };

  // Live Bidirectional Sync
  const handleSyncTwoWayDirect = async () => {
    const target = webAppUrl.trim() || getDashboardSyncUrl();
    setIsTwoWaySyncing(true);
    try {
      await saveDashboardSyncSettingsPermanently(target, sharingLink.trim());
      const res = await syncMetadataTwoWay(target);
      if (onShowNotification) {
        onShowNotification(res.message, res.success ? 'success' : 'error');
      }
      if (onSyncNow) {
        onSyncNow();
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification(`Error during bidirectional sync: ${err.message}`, 'error');
      }
    } finally {
      setIsTwoWaySyncing(false);
    }
  };

  // 1-Click seed of user's 35 TPAs & 23 Insurers
  const handleSeedUserMetadata = () => {
    const result = seedUserTwoHeaderMetadata();
    const currentTpas = getAllTpaOptions();
    const currentInsurers = getAllInsuranceCompanies();
    if (onShowNotification) {
      onShowNotification(
        `✓ Pre-configured list active! Current Database: ${currentTpas.length} TPAs & ${currentInsurers.length} Insurance Companies (Added ${result.tpasAdded} new TPAs, ${result.insurersAdded} new Insurers).`,
        'success'
      );
    }
  };

  const handleSaveOutputDir = (val: string) => {
    setOutputDirectory(val);
    localStorage.setItem('automationOutputDir', val);
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputDirectory: val })
    }).catch(err => console.warn('Output directory server save error:', err));
  };

  const handleConnectPcFolder = async () => {
    const { handle, pathName } = await connectPcFolder();
    if (handle) {
      setPcDirHandle(handle);
      if (pathName) {
        handleSaveOutputDir(pathName);
      }
      if (onShowNotification) {
        onShowNotification(`✓ Connected PC Folder handle "${handle.name}" successfully!`, 'success');
      }
    } else {
      if (onShowNotification) {
        onShowNotification(`Connected directory path: ${outputDirectory}`, 'info');
      }
    }
  };

  // Target records calculation for Folder Creation
  const getTargetFolderRecords = (): Claim[] => {
    if (selectedIndices.size > 0) {
      return (Array.from(selectedIndices) as number[]).map(idx => claims[idx]).filter(Boolean);
    }
    if (currentFilter) {
      return claims.filter(c => c.status === currentFilter);
    }
    const dischargeApproved = claims.filter(c => c.status === 'Discharge Approved');
    if (dischargeApproved.length > 0) {
      return dischargeApproved;
    }
    return claims;
  };

  const handleCreateFolders = async () => {
    const targetRecords = getTargetFolderRecords();
    if (!targetRecords || targetRecords.length === 0) {
      if (onShowNotification) {
        onShowNotification('No patient records found for folder creation', 'error');
      }
      return;
    }

    downloadBatchFolderCreationScript(targetRecords, outputDirectory);

    let directCount = 0;
    if (pcDirHandle) {
      directCount = await createPhysicalFoldersInHandle(pcDirHandle, targetRecords);
    }

    const msg = pcDirHandle && directCount > 0
      ? `✓ Created ${directCount} physical folders directly on PC & downloaded .bat file! (Format: Patient Name ( TPA Name ) DOA)`
      : `✓ Downloaded folder creation .bat file for ${targetRecords.length} patient(s)! (Format: Patient Name ( TPA Name ) DOA)`;

    if (onShowNotification) {
      onShowNotification(msg, 'success');
    }
  };

  if (!isOpen) return null;

  const targetRecordsCount = getTargetFolderRecords().length;

  return (
    <div className="fixed inset-0 z-[8000] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-[#0B0F19] border-2 border-slate-300 dark:border-indigo-500/50 p-5 sm:p-6 rounded-2xl shadow-2xl dark:shadow-[0_0_60px_rgba(99,102,241,0.35)] max-w-4xl w-full text-slate-800 dark:text-slate-200 space-y-4 max-h-[92vh] flex flex-col overflow-hidden transition-colors">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-indigo-500/30 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xl font-bold shadow-inner">
              📁
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Quick Operations &amp; PC Folder Management</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1. Quick File Operations &bull; 2. PC Folder Creation &bull; 3. Column Format &bull; 4. Apps Script
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleScrollToAppsScript}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/30 dark:hover:bg-indigo-600/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:border-indigo-400"
              title="Show MAIN DATA LOAD, SYNC & Apps Script Code.gs inside Quick Operations"
            >
              <span>📜</span>
              <span>Apps Script Source Code (Code.gs)</span>
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* 1. ⚡ Quick File Operations */}
          <div className="bg-slate-50 dark:bg-[#08080A] p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <span>⚡ 1. Quick File Operations</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-3 rounded-xl font-bold text-xs shadow-md border border-indigo-400/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📥</span> Import CSV / Excel
              </button>

              <button
                type="button"
                onClick={onExportCSV}
                className="bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30 p-3 rounded-xl font-bold text-xs shadow-xs transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⬆️</span> Export to CSV
              </button>

              {onExportXLSX && (
                <button
                  type="button"
                  onClick={onExportXLSX}
                  className="bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 dark:hover:bg-teal-800/80 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-500/30 p-3 rounded-xl font-bold text-xs shadow-xs transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📊</span> Export to Excel (.XLSX)
                </button>
              )}

              <button
                type="button"
                onClick={onLoadFromGoogleSheet}
                disabled={isLoadingSheet}
                className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-800/80 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-500/30 p-3 rounded-xl font-bold text-xs shadow-xs transition-all hover:-translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📊</span> {isLoadingSheet ? 'Loading Claims Sheet...' : 'Load Claims From Sheet'}
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggle();
                  onToggleInvoiceSection();
                }}
                className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800/80 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-500/30 p-3 rounded-xl font-bold text-xs shadow-xs transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🧮</span> Invoice Calculator
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = '/api/download-single-html';
                }}
                className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 p-3 rounded-xl font-bold text-xs shadow-xs transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                title="Download this entire application as a single offline HTML file"
              >
                <span>💾</span> Download Single HTML
              </button>
            </div>
          </div>

          {/* 2. 📁 PC Folder Creation & Automation Configuration */}
          <div className="bg-slate-50 dark:bg-[#08080A] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-indigo-500/30 space-y-3 shadow-inner transition-all">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <span>📁 2. PC Folder Creation &amp; Automation Configuration</span>
                </h4>
                {currentFilter && (
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                    Status: {currentFilter}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isSection2Hidden;
                    setIsSection2Hidden(next);
                    localStorage.setItem('hideSection2_pcFolder', String(next));
                  }}
                  className="text-[11px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  title={isSection2Hidden ? "Show PC Folder Creation section" : "Hide PC Folder Creation section"}
                >
                  <span>{isSection2Hidden ? '▼ Show' : '▲ Hide'}</span>
                </button>
              </div>
            </div>

            {!isSection2Hidden && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Automation Configuration Output Directory
                  </label>
                  <input
                    type="text"
                    value={outputDirectory}
                    onChange={(e) => handleSaveOutputDir(e.target.value)}
                    placeholder="./PatientFolders or D:\PatientFolders"
                    className="w-full bg-white dark:bg-[#121216] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-all font-mono shadow-xs"
                  />
                </div>

                {/* CONNECT PC FOLDER Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleConnectPcFolder}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-[#0E1526] dark:hover:bg-[#162038] text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 font-extrabold text-xs py-3 rounded-xl shadow-sm dark:shadow-lg transition-all tracking-wider uppercase cursor-pointer hover:border-indigo-500"
                  >
                    CONNECT PC FOLDER
                  </button>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 text-left font-normal leading-relaxed">
                    Connect directory to auto-create physical folders directly on your PC hard drive.
                  </p>
                </div>

                {/* Folder Create Action Button */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <span>Naming format: </span>
                    <strong className="text-indigo-700 dark:text-indigo-300 font-mono">Patient Name ( TPA Name ) DOA</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateFolders}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs px-6 py-2.5 rounded-xl font-extrabold shadow-md border border-emerald-400/30 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>📁</span>
                    <span>Folder Create ({targetRecordsCount} Claims)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. 📑 Headers Format: Column A, Column B & Column C */}
          <div className="bg-slate-50 dark:bg-[#090D17] border border-slate-200 dark:border-indigo-500/20 rounded-xl p-4 space-y-3 shadow-xs transition-all">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  📑 3. Format: Column A, Column B &amp; Column C (Address)
                </span>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  7-Word Duplicate Protection Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isSection3Hidden && (
                  <>
                    <button
                      type="button"
                      onClick={handleSeedUserMetadata}
                      className="text-[11px] bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-800 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-500/30 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Ensures all 35 TPAs and 23 Insurance Companies with addresses are registered"
                    >
                      <span>⚡ Seed 35 TPAs &amp; 23 Insurers</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTwoHeadersTable(!showTwoHeadersTable)}
                      className="text-[11px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>{showTwoHeadersTable ? '▲ Hide Reference' : '▼ View 35 TPAs &amp; 23 Companies'}</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isSection3Hidden;
                    setIsSection3Hidden(next);
                    localStorage.setItem('hideSection3_columnFormat', String(next));
                  }}
                  className="text-[11px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  title={isSection3Hidden ? "Show Column Format section" : "Hide Column Format section"}
                >
                  <span>{isSection3Hidden ? '▼ Show' : '▲ Hide'}</span>
                </button>
              </div>
            </div>

            {!isSection3Hidden && (
              <>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Synchronizes Column A <strong className="text-slate-900 dark:text-slate-200 font-mono">1.  TPA / INS. NAME</strong>, Column B <strong className="text-slate-900 dark:text-slate-200 font-mono">2. INSURANCE COMPANY</strong>, and Column C <strong className="text-slate-900 dark:text-slate-200 font-mono">3. INSURANCE / TPA ADDRESS</strong>. If the starting <span className="text-emerald-600 dark:text-emerald-400 font-bold">first 7 words</span> of any company match an existing entry, it is automatically skipped to prevent duplicates.
                </p>

                {/* Collapsible reference preview of 35 TPAs, 23 Insurers & Addresses */}
                {showTwoHeadersTable && (
                  <div className="mt-2 border border-slate-300 dark:border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-slate-200 dark:bg-[#151D2E] text-slate-800 dark:text-slate-300 sticky top-0 border-b border-slate-300 dark:border-white/10">
                        <tr>
                          <th className="p-2 border-r border-slate-300 dark:border-white/10 text-emerald-700 dark:text-emerald-400">#</th>
                          <th className="p-2 border-r border-slate-300 dark:border-white/10 text-emerald-800 dark:text-emerald-300">1.  TPA / INS. NAME (Col A)</th>
                          <th className="p-2 border-r border-slate-300 dark:border-white/10 text-indigo-800 dark:text-indigo-300">2. INSURANCE COMPANY (Col B)</th>
                          <th className="p-2 text-purple-800 dark:text-purple-300">3. INSURANCE / TPA ADDRESS (Col C)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-[#0A0E1A]">
                        {USER_TWO_HEADER_METADATA_ROWS.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="p-2 text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-white/5">{idx + 1}</td>
                            <td className="p-2 text-slate-900 dark:text-slate-200 border-r border-slate-200 dark:border-white/5 font-semibold">{row.tpa || '—'}</td>
                            <td className="p-2 text-slate-800 dark:text-slate-300 border-r border-slate-200 dark:border-white/5">{row.insurance || '—'}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-400 text-[10px] max-w-xs truncate" title={getMatchingInsuranceAddress(row.tpa)}>
                              {getMatchingInsuranceAddress(row.tpa) || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 4. Apps Script Source Code (Code.gs) & Live Google Sheets Sync */}
          <div
            ref={appsScriptSectionRef}
            className="bg-slate-50 dark:bg-[#090D18] p-5 rounded-2xl border-2 border-indigo-300 dark:border-indigo-500/50 space-y-4 shadow-md transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base font-bold shadow-xs">
                  📊
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">
                      BIDIRECTIONAL LIVE SYNC
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                      📜 4. Apps Script Source Code (Code.gs) &amp; Live Sync
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Live Google Sheets synchronization settings &amp; full 37-column Apps Script source code
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onOpenGoogleSyncModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggle();
                      onOpenGoogleSyncModal();
                    }}
                    className="text-[11px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1"
                    title="Open in dedicated full modal"
                  >
                    <span>↗️</span>
                    <span>Open in Separate Modal</span>
                  </button>
                )}
              </div>
            </div>

            {/* Field 1: MAIN DATA Google Spreadsheet LOAD */}
            <div className="bg-white dark:bg-[#121726] border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2 shadow-xs">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between flex-wrap gap-1">
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
                  onChange={(e) => {
                    setSharingLink(e.target.value);
                    if (onSaveSpreadsheetSharingLink) onSaveSpreadsheetSharingLink(e.target.value);
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 bg-slate-50 dark:bg-[#090C14] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveLinkPermanent}
                  disabled={isSavingUrls}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>💾</span>
                  <span>{isLinkSaved ? '✓ Saved Permanent!' : 'Save Link Permanent'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenSpreadsheet}
                  className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-600/30 hover:bg-indigo-100 dark:hover:bg-indigo-600/50 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/40 rounded-xl font-bold text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>↗️</span>
                  <span>Open</span>
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
            <div className="bg-white dark:bg-[#121726] border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2 shadow-xs">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between flex-wrap gap-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center">2</span>
                  MAIN DATA Google Spreadsheet SYNC
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Deployed Web App API URL (Google Apps Script Endpoint &bull; Exec Endpoint)
                </span>
              </label>

              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={webAppUrl}
                  onChange={(e) => {
                    setWebAppUrl(e.target.value);
                    if (onSaveSyncApiUrl) onSaveSyncApiUrl(e.target.value);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-slate-50 dark:bg-[#090C14] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveUrlPermanent}
                  disabled={isSavingUrls}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>💾</span>
                  <span>{isUrlSaved ? '✓ Saved Permanent!' : 'Save URL Permanent'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyApiUrl}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer"
                >
                  {copiedApiUrl ? '✓ Copied' : '📋 Copy Endpoint'}
                </button>
                {onSyncNow && (
                  <button
                    type="button"
                    onClick={onSyncNow}
                    disabled={isSyncing}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>{isSyncing ? '🔄 Syncing...' : '🔄 Sync Now'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Field: Text Note Pad & Permanent Link Reference */}
            <div className="bg-white dark:bg-[#121726] border-2 border-indigo-300/80 dark:border-indigo-500/40 rounded-xl p-4 space-y-3 shadow-xs transition-all">
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
                                  handleSaveLinkPermanent();
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

            {/* Field 3: Apps Script Source Code (Code.gs) Viewer */}
            <div className="bg-white dark:bg-[#121726] border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <span>📜</span> Apps Script Source Code (<code className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">Code.gs</code>)
                  </span>
                  <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                    37 Columns
                  </span>
                  <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                    Left Aligned
                  </span>
                  <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                    Sorted by DOA
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAppsScriptCode}
                    className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>📋</span>
                    <span>{copiedAppsScriptCode ? 'Copied Code!' : 'Copy Code.gs'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAppsScriptCode(!showAppsScriptCode)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold underline cursor-pointer"
                  >
                    {showAppsScriptCode ? 'Hide Code' : 'View Full Code'}
                  </button>
                </div>
              </div>

              {showAppsScriptCode && (
                <div className="relative mt-2">
                  <pre className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-80 leading-relaxed selection:bg-indigo-500 selection:text-white">
                    {HOSPITAL_APPS_SCRIPT_CODE}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyAppsScriptCode}
                    className="absolute top-2.5 right-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow cursor-pointer transition-all"
                  >
                    {copiedAppsScriptCode ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Save All Links Permanent */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/10 flex-wrap gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAllSaved ? '✓ All URLs saved permanently in code and persistent config!' : 'Saved URLs are permanently retained across page refreshes and server rebuilds.'}
              </span>
              <button
                type="button"
                onClick={handleSavePermanentUrls}
                disabled={isSavingUrls}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>💾</span>
                <span>{isAllSaved ? '✓ Saved All Permanent!' : 'Save All Links Permanent'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-indigo-500/20 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>Supported Formats: CSV, XLSX, Windows .BAT automation, Live Google Sheets Sync</span>
          <button
            type="button"
            onClick={onToggle}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-bold transition-all shadow-md cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};



