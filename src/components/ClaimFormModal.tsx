import React, { useState, useEffect } from 'react';
import { Claim, ClaimStatus, BankDetails } from '../types';
import {
  RELATIONS,
  BANK_DETAILS_BY_NAME,
  TPA_BANK_DETAILS,
  getAllInsuranceCompanies,
  addCustomInsuranceCompany,
  deleteInsuranceCompany,
  getMatchingInsuranceAddress,
  getMatchingBankDetails,
  getAllTpaOptions,
  addCustomTpa,
  deleteTpa,
  saveCustomTpaAddress,
  getAllTpaInsuranceAddresses,
  getSavedBankProfiles,
  saveNewBankProfile,
  saveCustomTpaBankDetails,
  SavedBankProfile
} from '../constants/insuranceData';
import {
  computeClaimFinancials,
  getStatusSuccessMessage,
  extractValidPhoneNumbers,
  toHtmlDateValue,
  normalizeDateForStorage
} from '../utils/formatters';
import { SlipScanner, ScanTargetMode } from './SlipScanner';
import { Save, Building2, Check, Sparkles, X, Trash2, Landmark, Plus, CheckCircle2 } from 'lucide-react';
import {
  ExtractedDocumentData,
  CardMember,
  cleanIpdNo,
  cleanUhid,
  cleanCodeOrId,
  parseDoaDate,
  cleanPatientName
} from '../utils/ocrParser';
import { InsuranceCompanyManagerModal } from './InsuranceCompanyManagerModal';
import { TpaManagerModal } from './TpaManagerModal';
import {
  loadMetadataFromGoogleSheet,
  pushAllMetadataToGoogleSheet,
  syncMetadataTwoWay,
  saveTpaToGoogleSheet,
  saveInsuranceCompanyToGoogleSheet,
  getActiveSyncUrl,
  getSpreadsheetSharingUrl,
  saveSyncSettingsPermanently,
  getMetadataSyncUrl,
  getMetadataSpreadsheetUrl,
  saveMetadataSyncSettingsPermanently,
  loadColAOnlyFromSpreadsheet,
  loadColBOnlyFromSpreadsheet,
  loadColCOnlyFromSpreadsheet,
  autoLoadAllThreeColumnsFromSpreadsheet
} from '../utils/metadataSync';
import { TPA_INSURANCE_TWO_HEADER_SCRIPT_CODE, HOSPITAL_APPS_SCRIPT_CODE } from '../utils/googleAppsScriptTemplate';

interface ClaimFormModalProps {
  claimToEdit: { claim: Claim; index: number } | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveClaim: (claim: Claim, isEdit: boolean, editIndex: number) => void;
  existingClaims: Claim[];
  onShowSuccessPopup: (msg: string) => void;
  onShowNotification: (msg: string, type?: 'info' | 'success' | 'error') => void;
  onPromptWhatsApp?: (claim: Claim) => void;
  themeMode?: 'dark' | 'light';
}

export const ClaimFormModal: React.FC<ClaimFormModalProps> = ({
  claimToEdit,
  isOpen,
  onClose,
  onSaveClaim,
  existingClaims,
  onShowSuccessPopup,
  onShowNotification,
  onPromptWhatsApp,
  themeMode = 'dark'
}) => {
  // Form State
  const [formData, setFormData] = useState<Partial<Claim>>({
    readmit: 'No',
    patientName: '',
    uhid: '',
    mobileNumber: '',
    attenderName: '',
    relation: '',
    ipdNo: '',
    doa: '',
    dod: '',
    diagnosis: '',
    surgeryName: '',
    status: 'Admitted' as ClaimStatus,
    insuranceLimit: '',
    tpaName: '',
    insuranceCompany: '',
    insuranceID: '',
    claimNo: '',
    policyNumber: '',
    empID: '',
    insuranceAddress: '',
    billInvoiceNo: '',
    totalBill: '',
    approved: '',
    discount: '',
    deduction: '',
    patientPay: '',
    settlementAmount: '',
    tds: '',
    paymentDate: '',
    utr: '',
    bankName: '',
    bankAccountNo: '',
    ifscCode: '',
    bankAddress: '',
    courierDetails: '',
    courierDate: '',
    remark: ''
  });

  const [isReadmitChecked, setIsReadmitChecked] = useState(false);
  const [matchedUhidClaim, setMatchedUhidClaim] = useState<Claim | null>(null);
  const [dismissedUhid, setDismissedUhid] = useState<string>('');

  // Dynamic Insurance Companies List with custom manual persistence
  const [insuranceCompaniesList, setInsuranceCompaniesList] = useState<string[]>(() =>
    getAllInsuranceCompanies(existingClaims)
  );
  // Dynamic TPA List with custom manual persistence
  const [tpaOptionsList, setTpaOptionsList] = useState<string[]>(() =>
    getAllTpaOptions(existingClaims)
  );
  const [savedAddressesMap, setSavedAddressesMap] = useState<Record<string, string>>(() =>
    getAllTpaInsuranceAddresses()
  );
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [isManualInsuranceEntry, setIsManualInsuranceEntry] = useState(false);
  const [isManualTpaEntry, setIsManualTpaEntry] = useState(false);
  const [isCompanyManagerOpen, setIsCompanyManagerOpen] = useState(false);
  const [isTpaManagerOpen, setIsTpaManagerOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);

  // New TP Insurance & Address Prompt State with Bank Details Linking
  const [isNewTpPromptOpen, setIsNewTpPromptOpen] = useState(false);
  const [newTpPromptName, setNewTpPromptName] = useState('');
  const [newTpPromptAddress, setNewTpPromptAddress] = useState('');
  const [bankSaveMode, setBankSaveMode] = useState<'saved' | 'new'>('saved');
  const [selectedBankProfileId, setSelectedBankProfileId] = useState<string>('hdfc');
  const [newBankName, setNewBankName] = useState('');
  const [newBankAccountNo, setNewBankAccountNo] = useState('');
  const [newBankIfscCode, setNewBankIfscCode] = useState('');
  const [newBankAddress, setNewBankAddress] = useState('');
  const [newBankPanCard, setNewBankPanCard] = useState('ABOFA7356E');
  const [saveNewBankToGlobal, setSaveNewBankToGlobal] = useState(true);
  const [savedBankProfilesList, setSavedBankProfilesList] = useState<SavedBankProfile[]>([]);

  const handleOpenSaveTpPrompt = (tpName?: string) => {
    const nameToUse = (tpName || formData.tpaName || '').trim();
    setNewTpPromptName(nameToUse ? nameToUse.toUpperCase() : '');
    const currentAddr = (formData.insuranceAddress || '').trim();
    const matchedAddr = nameToUse ? getMatchingInsuranceAddress(nameToUse) : '';
    setNewTpPromptAddress(currentAddr || matchedAddr || '');

    const profiles = getSavedBankProfiles();
    setSavedBankProfilesList(profiles);

    // Check if current form or matched bank matches an existing profile
    const existingBank = getMatchingBankDetails(nameToUse || '') || {
      bankName: formData.bankName,
      bankAccountNo: formData.bankAccountNo,
      ifscCode: formData.ifscCode,
      bankAddress: formData.bankAddress,
      panCard: formData.panCard
    };

    if (existingBank?.bankName || existingBank?.bankAccountNo) {
      const match = profiles.find(p =>
        (existingBank.bankAccountNo && p.bankAccountNo === existingBank.bankAccountNo) ||
        (existingBank.bankName && p.bankName === (existingBank.bankName || '').toUpperCase())
      );
      if (match) {
        setSelectedBankProfileId(match.id);
        setBankSaveMode('saved');
      } else {
        setBankSaveMode('new');
        setNewBankName(existingBank.bankName || '');
        setNewBankAccountNo(existingBank.bankAccountNo || '');
        setNewBankIfscCode(existingBank.ifscCode || '');
        setNewBankAddress(existingBank.bankAddress || '');
        setNewBankPanCard(existingBank.panCard || 'ABOFA7356E');
      }
    } else {
      setSelectedBankProfileId(profiles[0]?.id || 'hdfc');
      setBankSaveMode('saved');
    }

    setIsNewTpPromptOpen(true);
  };

  const handleSaveNewTpAndAddress = () => {
    const finalTpName = newTpPromptName.trim().toUpperCase();
    const finalAddress = newTpPromptAddress.trim().toUpperCase();

    if (!finalTpName) {
      onShowNotification('Please enter the TPA / INS. Name', 'error');
      return;
    }

    // Determine bank details to link
    let finalBankDetails: BankDetails | undefined = undefined;
    if (bankSaveMode === 'saved') {
      const chosen = savedBankProfilesList.find(p => p.id === selectedBankProfileId) || savedBankProfilesList[0];
      if (chosen) {
        finalBankDetails = {
          bankName: chosen.bankName,
          bankAccountNo: chosen.bankAccountNo,
          ifscCode: chosen.ifscCode,
          bankAddress: chosen.bankAddress,
          panCard: chosen.panCard || 'ABOFA7356E'
        };
      }
    } else if (bankSaveMode === 'new') {
      if (!newBankName.trim() || !newBankAccountNo.trim()) {
        onShowNotification('Please enter Bank Name and Account Number', 'error');
        return;
      }
      finalBankDetails = {
        bankName: newBankName.trim().toUpperCase(),
        bankAccountNo: newBankAccountNo.trim(),
        ifscCode: newBankIfscCode.trim().toUpperCase(),
        bankAddress: newBankAddress.trim().toUpperCase(),
        panCard: (newBankPanCard || 'ABOFA7356E').trim().toUpperCase()
      };
      if (saveNewBankToGlobal) {
        const updatedProfiles = saveNewBankProfile(finalBankDetails);
        setSavedBankProfilesList(updatedProfiles);
      }
    }

    // 1. Save new TPA name and linked bank details to persistent database
    const tpaRes = addCustomTpa(finalTpName, finalBankDetails, finalAddress);
    setTpaOptionsList(tpaRes.list);

    // 2. Save new TPA address if provided
    if (finalAddress) {
      const addrRes = saveCustomTpaAddress(finalTpName, finalAddress);
      if (addrRes.success) {
        setSavedAddressesMap(addrRes.allAddresses);
      }
    }

    // 3. Immediately update form data and auto-fill bank details and address
    setFormData(prev => ({
      ...prev,
      tpaName: finalTpName,
      insuranceAddress: finalAddress || prev.insuranceAddress || '',
      bankName: finalBankDetails?.bankName || prev.bankName || '',
      bankAccountNo: finalBankDetails?.bankAccountNo || prev.bankAccountNo || '',
      ifscCode: finalBankDetails?.ifscCode || prev.ifscCode || '',
      bankAddress: finalBankDetails?.bankAddress || prev.bankAddress || '',
      panCard: finalBankDetails?.panCard || prev.panCard || ''
    }));

    // 4. Save to Google Sheet in background
    saveTpaToGoogleSheet({
      name: finalTpName,
      address: finalAddress,
      bankDetails: finalBankDetails || undefined
    }).catch(err => console.warn('Google Sheet save TPA error:', err));

    setIsManualTpaEntry(false);
    setIsNewTpPromptOpen(false);

    onShowNotification(
      `✓ "${finalTpName}" saved in database & linked with ${finalBankDetails?.bankName || 'bank details'}! Auto-filled and reflected in list.`,
      'success'
    );
  };

  // Sync Configuration & Diagnostic State (Separate Location for Policy, Insurance & TPA Metadata)
  const [isSyncConfigOpen, setIsSyncConfigOpen] = useState(false);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);
  const [syncConfigUrl, setSyncConfigUrl] = useState(() => getMetadataSyncUrl());
  const [syncSpreadsheetUrl, setSyncSpreadsheetUrl] = useState(() => getMetadataSpreadsheetUrl());
  const [isTestingSyncUrl, setIsTestingSyncUrl] = useState(false);
  const [isSavingSyncSettings, setIsSavingSyncSettings] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [isPushingMetadata, setIsPushingMetadata] = useState(false);
  const [isLoadingFromSpreadsheet, setIsLoadingFromSpreadsheet] = useState(false);
  const [syncTestMessage, setSyncTestMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showAppsScriptSection, setShowAppsScriptSection] = useState(false);

  // Close sync action menu on outside click
  useEffect(() => {
    if (!isSyncMenuOpen) return;
    const handleClickOutside = () => setIsSyncMenuOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isSyncMenuOpen]);

  // Directly load TPAs and Insurance Companies through Google Spreadsheet Link
  const handleLoadFromSpreadsheetLink = async () => {
    const targetLink = (syncSpreadsheetUrl || getSpreadsheetSharingUrl()).trim();
    if (!targetLink || !targetLink.includes('docs.google.com/spreadsheets')) {
      setIsSyncConfigOpen(true);
      onShowNotification('Please paste your Google Spreadsheet Link below to load TPAs & Insurers', 'info');
      setSyncTestMessage({
        type: 'info',
        text: 'Please paste your Google Spreadsheet link below (e.g. https://docs.google.com/spreadsheets/d/.../edit)'
      });
      return;
    }

    setIsLoadingFromSpreadsheet(true);
    try {
      handleSaveSyncSettings();
      const res = await autoLoadAllThreeColumnsFromSpreadsheet(targetLink);
      const updatedTpas = getAllTpaOptions(existingClaims);
      const updatedInsurers = getAllInsuranceCompanies(existingClaims);
      const updatedAddresses = getAllTpaInsuranceAddresses();
      setTpaOptionsList(updatedTpas);
      setInsuranceCompaniesList(updatedInsurers);
      setSavedAddressesMap(updatedAddresses);

      // If form already has a TPA selected, auto-populate matched address
      if (formData.tpaName) {
        const curTpaNorm = (formData.tpaName || '').trim().toUpperCase();
        const matchedAddr = updatedAddresses[curTpaNorm] || getMatchingInsuranceAddress(curTpaNorm);
        if (matchedAddr) {
          setFormData(prev => ({ ...prev, insuranceAddress: matchedAddr.toUpperCase() }));
        }
      }

      const dupInfo = (res.duplicatesSkipped && res.duplicatesSkipped > 0)
        ? ` (${res.duplicatesSkipped} duplicates skipped)`
        : '';

      const addrCount = Object.keys(updatedAddresses).length;
      const successMsg = `✓ Successfully loaded & refreshed all 3 columns at one go! Loaded ${res.loadedTpas.length || updatedTpas.length} TPAs (Col A), ${res.loadedInsuranceCompanies.length || updatedInsurers.length} Insurance Companies (Col B), and ${addrCount} Addresses (Col C) from sheet!${dupInfo}`;
      onShowNotification(successMsg, 'success');
      setSyncTestMessage({
        type: 'success',
        text: successMsg
      });
    } catch (err: any) {
      onShowNotification(`Error loading from spreadsheet: ${err.message}`, 'error');
      setSyncTestMessage({
        type: 'error',
        text: `Error loading from spreadsheet: ${err.message}`
      });
    } finally {
      setIsLoadingFromSpreadsheet(false);
    }
  };

  const handleLoadColAOnlyModal = async () => {
    const target = (syncSpreadsheetUrl || syncConfigUrl || getMetadataSpreadsheetUrl() || getMetadataSyncUrl() || getActiveSyncUrl()).trim();
    if (!target) {
      onShowNotification('Please enter a Google Spreadsheet link or Apps Script URL', 'error');
      return;
    }
    setIsLoadingFromSpreadsheet(true);
    try {
      const res = await loadColAOnlyFromSpreadsheet(target);
      const updatedTpas = res.loadedTpas && res.loadedTpas.length > 0 ? res.loadedTpas : getAllTpaOptions(existingClaims);
      setTpaOptionsList(updatedTpas);
      onShowNotification(res.message, res.success ? 'success' : 'error');
      setSyncTestMessage({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
    } catch (err: any) {
      onShowNotification(`Error loading Col A: ${err.message}`, 'error');
    } finally {
      setIsLoadingFromSpreadsheet(false);
    }
  };

  const handleLoadColBOnlyModal = async () => {
    const target = (syncSpreadsheetUrl || syncConfigUrl || getMetadataSpreadsheetUrl() || getMetadataSyncUrl() || getActiveSyncUrl()).trim();
    if (!target) {
      onShowNotification('Please enter a Google Spreadsheet link or Apps Script URL', 'error');
      return;
    }
    setIsLoadingFromSpreadsheet(true);
    try {
      const res = await loadColBOnlyFromSpreadsheet(target);
      const updatedInsurers = res.loadedInsurers && res.loadedInsurers.length > 0 ? res.loadedInsurers : getAllInsuranceCompanies(existingClaims);
      setInsuranceCompaniesList(updatedInsurers);
      onShowNotification(res.message, res.success ? 'success' : 'error');
      setSyncTestMessage({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
    } catch (err: any) {
      onShowNotification(`Error loading Col B: ${err.message}`, 'error');
    } finally {
      setIsLoadingFromSpreadsheet(false);
    }
  };

  const handleLoadColCOnlyModal = async () => {
    const target = (syncSpreadsheetUrl || syncConfigUrl || getMetadataSpreadsheetUrl() || getMetadataSyncUrl() || getActiveSyncUrl()).trim();
    if (!target) {
      onShowNotification('Please enter a Google Spreadsheet link or Apps Script URL', 'error');
      return;
    }
    setIsLoadingFromSpreadsheet(true);
    try {
      const res = await loadColCOnlyFromSpreadsheet(target);
      const updatedAddresses = (res.loadedAddresses && Object.keys(res.loadedAddresses).length > 0)
        ? res.loadedAddresses
        : getAllTpaInsuranceAddresses();
      setSavedAddressesMap(updatedAddresses);

      if (formData.tpaName) {
        const curTpaNorm = (formData.tpaName || '').trim().toUpperCase();
        const matchedAddr = updatedAddresses[curTpaNorm] || getMatchingInsuranceAddress(curTpaNorm);
        if (matchedAddr) {
          setFormData(prev => ({ ...prev, insuranceAddress: matchedAddr.toUpperCase() }));
        }
      }

      onShowNotification(res.message, res.success ? 'success' : 'error');
      setSyncTestMessage({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
    } catch (err: any) {
      onShowNotification(`Error loading Col C: ${err.message}`, 'error');
    } finally {
      setIsLoadingFromSpreadsheet(false);
    }
  };

  // Explicitly Send / Push all TPA and Insurance Company lists to Google Sheet
  const handlePushMetadataToGoogleSheet = async (overrideUrl?: string) => {
    setIsPushingMetadata(true);
    try {
      const target = (overrideUrl || syncConfigUrl || getActiveSyncUrl()).trim();
      const res = await pushAllMetadataToGoogleSheet(target);
      if (res.success) {
        onShowNotification(
          res.message || `✓ Pushed ${tpaOptionsList.length} TPAs & ${insuranceCompaniesList.length} Insurance Companies to Google Sheet!`,
          'success'
        );
        setSyncTestMessage({
          type: 'success',
          text: `✓ Success! Sent ${tpaOptionsList.length} TPAs to 'TPA / INS. NAME' (Col A) and ${insuranceCompaniesList.length} Insurance Companies to 'INSURANCE COMPANY' (Col B) in your Google Sheet!`
        });
      } else {
        onShowNotification(res.message || 'Failed to push list data to Google Sheet.', 'error');
        setSyncTestMessage({
          type: 'error',
          text: res.message || 'Failed to push list data to Google Sheet.'
        });
      }
    } catch (err: any) {
      onShowNotification(`Error sending list data: ${err.message}`, 'error');
      setSyncTestMessage({
        type: 'error',
        text: `Error sending data: ${err.message}`
      });
    } finally {
      setIsPushingMetadata(false);
    }
  };

  // Two-way synchronization: Push local lists to Google Sheet AND load latest from Google Sheet
  const handleSyncMetadataFromUrl = async (overrideUrl?: string) => {
    setIsSyncingMetadata(true);
    try {
      const target = (overrideUrl || syncConfigUrl || getActiveSyncUrl()).trim();
      
      // 1. FIRST load latest from Google Sheet so we HAVE all Sheet 2 Col A data in memory before pushing
      await autoLoadAllThreeColumnsFromSpreadsheet(target).catch(() => {});

      // 2. Push merged lists to Google Sheet (Google Apps Script preserves all existing data in Sheet 2 Col A)
      await pushAllMetadataToGoogleSheet(target).catch(e => console.warn('Push during sync notice:', e));

      // 3. Re-read latest to verify synchronized state
      const res = await autoLoadAllThreeColumnsFromSpreadsheet(target);
      const updatedTpas = res.loadedTpas && res.loadedTpas.length > 0 ? res.loadedTpas : getAllTpaOptions(existingClaims);
      const updatedInsurers = res.loadedInsuranceCompanies && res.loadedInsuranceCompanies.length > 0 ? res.loadedInsuranceCompanies : getAllInsuranceCompanies(existingClaims);
      setTpaOptionsList(updatedTpas);
      setInsuranceCompaniesList(updatedInsurers);
      setSavedAddressesMap(res.loadedAddresses || getAllTpaInsuranceAddresses());

      onShowNotification(
        `✓ Sync complete! Preserved and updated ${updatedTpas.length} TPAs (Col A) & ${updatedInsurers.length} Insurance Companies (Sheet 2 Col A) without deleting any existing data.`,
        'success'
      );
      setSyncTestMessage({
        type: 'success',
        text: `✓ Sync complete! Preserved and updated ${updatedTpas.length} TPAs (Col A) & ${updatedInsurers.length} Insurance Companies (Sheet 2 Col A). No existing data was deleted.`
      });
    } catch {
      const updatedTpas = getAllTpaOptions(existingClaims);
      const updatedInsurers = getAllInsuranceCompanies(existingClaims);
      setTpaOptionsList(updatedTpas);
      setInsuranceCompaniesList(updatedInsurers);
      onShowNotification('Sync completed. Current TPA & Insurance lists are updated.', 'info');
    } finally {
      setIsSyncingMetadata(false);
    }
  };

  const handleTestSyncConnection = async () => {
    setIsTestingSyncUrl(true);
    setSyncTestMessage(null);
    try {
      const testUrl = (syncConfigUrl || getActiveSyncUrl()).trim();
      const proxyUrl = `/api/sheet-proxy?url=${encodeURIComponent(testUrl)}&action=getMetadata`;
      const res = await fetch(proxyUrl);
      const data = await res.json();
      if (res.ok && !data.error) {
        setSyncTestMessage({
          type: 'success',
          text: `✓ Connection successful! Received response from Google Web App. Ready to sync. Click "📤 Send / Push Lists to Google Sheet" below to write all ${tpaOptionsList.length} TPAs and ${insuranceCompaniesList.length} Insurance Companies into your Google Sheet columns!`
        });
      } else if (data.error === 'missing_doget') {
        setSyncTestMessage({
          type: 'info',
          text: `⚠️ Web App returned: "doGet function not found in script". Our system automatically falls back to direct Google Sheet sync. To enable Web App directly, paste the updated Apps Script code below into Code.gs.`
        });
      } else {
        setSyncTestMessage({
          type: 'info',
          text: `Notice: ${data.message || 'Google returned non-JSON response. You can still test sending data using the button below.'}`
        });
      }
    } catch (err: any) {
      setSyncTestMessage({
        type: 'error',
        text: `Error connecting: ${err.message}`
      });
    } finally {
      setIsTestingSyncUrl(false);
    }
  };

  const handleSaveSyncSettings = async () => {
    setIsSavingSyncSettings(true);
    const trimmedSync = syncConfigUrl ? syncConfigUrl.trim() : '';
    const trimmedSheet = syncSpreadsheetUrl ? syncSpreadsheetUrl.trim() : '';
    try {
      await saveMetadataSyncSettingsPermanently(trimmedSync, trimmedSheet);
      setIsSavedSuccess(true);
      setTimeout(() => setIsSavedSuccess(false), 5000);
      onShowNotification('✓ Policy & TPA Metadata URLs saved permanently in separate location & code!', 'success');
      setSyncTestMessage({
        type: 'success',
        text: '✓ Metadata URLs permanently saved in separate location and server storage! This is kept separate from Live Dashboard sync and will never overwrite it.'
      });
    } catch (err: any) {
      setIsSavedSuccess(true);
      setTimeout(() => setIsSavedSuccess(false), 5000);
      onShowNotification(`✓ Metadata URLs saved to separate local storage & server.`, 'success');
    } finally {
      setIsSavingSyncSettings(false);
    }
  };

  // Sync available insurance companies and TPAs when modal opens or claims change
  useEffect(() => {
    if (isOpen) {
      const list = getAllInsuranceCompanies(existingClaims);
      setInsuranceCompaniesList(list);
      setTpaOptionsList(getAllTpaOptions(existingClaims));
      setSavedAddressesMap(getAllTpaInsuranceAddresses());
      setIsScannerOpen(false);
      setShowAddressPicker(false);

      // Refresh Metadata URLs from separate server config if available
      fetch('/api/config')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const cfg = data?.config || data || {};
          if (cfg?.metadataSyncApiUrl && typeof cfg.metadataSyncApiUrl === 'string' && cfg.metadataSyncApiUrl.trim()) {
            setSyncConfigUrl(cfg.metadataSyncApiUrl.trim());
          }
          if (cfg?.metadataSpreadsheetSharingLink && typeof cfg.metadataSpreadsheetSharingLink === 'string' && cfg.metadataSpreadsheetSharingLink.trim()) {
            setSyncSpreadsheetUrl(cfg.metadataSpreadsheetSharingLink.trim());
          }
        })
        .catch(() => {});

      // Auto-load latest lists from 1st Col (Col A), 2nd Col (Col B), 3rd Col (Col C) from sheet on modal open
      autoLoadAllThreeColumnsFromSpreadsheet()
        .then(res => {
          if (res.success) {
            if (res.loadedInsuranceCompanies && res.loadedInsuranceCompanies.length > 0) {
              setInsuranceCompaniesList(res.loadedInsuranceCompanies);
            } else {
              setInsuranceCompaniesList(getAllInsuranceCompanies(existingClaims));
            }
            if (res.loadedTpas && res.loadedTpas.length > 0) {
              setTpaOptionsList(res.loadedTpas);
            } else {
              setTpaOptionsList(getAllTpaOptions(existingClaims));
            }
            if (res.loadedAddresses && Object.keys(res.loadedAddresses).length > 0) {
              setSavedAddressesMap(res.loadedAddresses);
            } else {
              setSavedAddressesMap(getAllTpaInsuranceAddresses());
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, existingClaims]);

  useEffect(() => {
    const handleMetadataChange = () => {
      setInsuranceCompaniesList(getAllInsuranceCompanies(existingClaims));
      setTpaOptionsList(getAllTpaOptions(existingClaims));
      setSavedAddressesMap(getAllTpaInsuranceAddresses());
    };
    window.addEventListener('metadata-updated', handleMetadataChange);
    window.addEventListener('storage', handleMetadataChange);
    return () => {
      window.removeEventListener('metadata-updated', handleMetadataChange);
      window.removeEventListener('storage', handleMetadataChange);
    };
  }, [existingClaims]);

  useEffect(() => {
    // Only search for matched patient record in ADD NEW CLAIM DOSSIER mode, not in EDIT mode
    if (claimToEdit) {
      setMatchedUhidClaim(null);
      return;
    }

    const inputUhid = (formData.uhid || '').trim().toLowerCase();
    if (!inputUhid || inputUhid.length < 2 || inputUhid === dismissedUhid) {
      setMatchedUhidClaim(null);
      return;
    }

    const currentEditIndex = claimToEdit ? claimToEdit.index : -1;
    const match = existingClaims.find((c, idx) => {
      if (idx === currentEditIndex) return false;
      const cUhid = (c.uhid || '').trim().toLowerCase();
      return cUhid.length > 0 && (cUhid === inputUhid || cUhid.includes(inputUhid));
    });

    if (match) {
      setMatchedUhidClaim(match);
    } else {
      setMatchedUhidClaim(null);
    }
  }, [formData.uhid, existingClaims, claimToEdit, dismissedUhid]);

  const handleApplyMatchedClaim = (claim: Claim) => {
    setFormData(prev => ({
      ...prev,
      patientName: claim.patientName || prev.patientName,
      mobileNumber: claim.mobileNumber || prev.mobileNumber,
      attenderName: claim.attenderName || prev.attenderName,
      relation: claim.relation || prev.relation,
      tpaName: claim.tpaName || prev.tpaName,
      insuranceCompany: claim.insuranceCompany || prev.insuranceCompany,
      insuranceID: claim.insuranceID || prev.insuranceID,
      policyNumber: claim.policyNumber || prev.policyNumber,
      empID: claim.empID || prev.empID,
      insuranceAddress: claim.insuranceAddress || prev.insuranceAddress,
      bankName: claim.bankName || prev.bankName,
      bankAccountNo: claim.bankAccountNo || prev.bankAccountNo,
      ifscCode: claim.ifscCode || prev.ifscCode,
      bankAddress: claim.bankAddress || prev.bankAddress,
      readmit: 'Yes'
    }));
    setIsReadmitChecked(true);
    setDismissedUhid((formData.uhid || '').trim().toLowerCase());
    setMatchedUhidClaim(null);
    onShowNotification(`✓ Auto-filled patient name "${claim.patientName}" and details from last admission record`, 'success');
  };

  const handleApplyField = (fieldKey: string, value: any, fieldLabel: string) => {
    if (value === undefined || value === null || value === '') return;

    setFormData(prev => {
      const updated: Partial<Claim> = { ...prev };
      if (fieldKey === 'patientName') {
        updated.patientName = cleanPatientName(value) || value;
      } else if (fieldKey === 'ipdNo') {
        updated.ipdNo = cleanIpdNo(value);
      } else if (fieldKey === 'uhid') {
        updated.uhid = cleanUhid(value);
      } else if (fieldKey === 'doa') {
        updated.doa = parseDoaDate(value) || value;
      } else if (fieldKey === 'dod') {
        updated.dod = parseDoaDate(value) || value;
      } else if (fieldKey === 'insuranceCompany') {
        updated.insuranceCompany = value;
        // Do NOT auto-populate insuranceAddress from Insurance Company (only from TPA / INS. NAME)
        const res = addCustomInsuranceCompany(value);
        if (res.isNew) {
          setInsuranceCompaniesList(res.list);
        }
      } else if (fieldKey === 'tpaName') {
        updated.tpaName = value;
        const matchedAddr = getMatchingInsuranceAddress(value) || getAllTpaInsuranceAddresses()[String(value).trim().toUpperCase()] || '';
        if (matchedAddr) {
          updated.insuranceAddress = matchedAddr.toUpperCase();
          const addrRes = saveCustomTpaAddress(value, matchedAddr.toUpperCase());
          if (addrRes.success) {
            setSavedAddressesMap(addrRes.allAddresses);
          }
        }
        const bankInfo = getMatchingBankDetails(value);
        if (bankInfo) {
          if (bankInfo.bankName) updated.bankName = (bankInfo.bankName || '').toUpperCase();
          if (bankInfo.bankAccountNo) updated.bankAccountNo = (bankInfo.bankAccountNo || '').toUpperCase();
          if (bankInfo.ifscCode) updated.ifscCode = (bankInfo.ifscCode || '').toUpperCase();
          if (bankInfo.bankAddress) updated.bankAddress = (bankInfo.bankAddress || '').toUpperCase();
        }
      } else if (fieldKey === 'insuranceAddress') {
        const addrVal = String(value || '').toUpperCase();
        updated.insuranceAddress = addrVal;
        const targetTpa = (updated.tpaName || formData.tpaName || '').trim().toUpperCase();
        if (targetTpa && addrVal) {
          const addrRes = saveCustomTpaAddress(targetTpa, addrVal);
          if (addrRes.success) {
            setSavedAddressesMap(addrRes.allAddresses);
          }
        }
      } else if (fieldKey === 'policyNumber') {
        updated.policyNumber = cleanCodeOrId(value);
        const res = addCustomInsuranceCompany(value);
        if (res.isNew) {
          setInsuranceCompaniesList(res.list);
        }
      } else if (fieldKey === 'insuranceID') {
        updated.insuranceID = cleanCodeOrId(value);
      } else if (fieldKey === 'empID') {
        updated.empID = cleanCodeOrId(value);
      } else if (fieldKey === 'claimNo') {
        updated.claimNo = value;
      } else if (fieldKey === 'insuranceLimit') {
        updated.insuranceLimit = value;
      } else if (fieldKey === 'diagnosis') {
        updated.diagnosis = value;
      } else if (fieldKey === 'surgeryName') {
        updated.surgeryName = value;
      } else if (fieldKey === 'mobileNumber') {
        updated.mobileNumber = value;
      } else if (fieldKey === 'doctorName') {
        const docText = `Doctor: ${value}`;
        if (!updated.remark) {
          updated.remark = docText;
        } else if (!updated.remark.toUpperCase().includes(String(value).toUpperCase())) {
          updated.remark = `${updated.remark} | ${docText}`;
        }
      } else {
        (updated as any)[fieldKey] = value;
      }
      return updated;
    });

    if (fieldKey === 'patientName' || fieldKey === 'uhid') {
      checkAutoReadmit(fieldKey === 'patientName' ? value : (formData.patientName || ''), fieldKey === 'uhid' ? value : (formData.uhid || ''));
    }

    onShowNotification(`✓ Auto-filled ${fieldLabel}: "${value}" into form box`, 'success');
  };

  const handleApplyMember = (member: CardMember) => {
    setFormData(prev => {
      const updated = { ...prev };
      if (member.name) updated.patientName = cleanPatientName(member.name) || member.name;
      if (member.memberId) updated.insuranceID = cleanCodeOrId(member.memberId);
      return updated;
    });
    if (member.name) {
      checkAutoReadmit(member.name, formData.uhid || '');
    }
    onShowNotification(`✓ Selected Covered Member: ${member.name} (Member ID: ${member.memberId})`, 'success');
  };

  const handleScanComplete = (extracted: ExtractedDocumentData, mode: ScanTargetMode = 'all') => {
    setFormData(prev => {
      const updated: Partial<Claim> = { ...prev };

      // Admission & Patient fields
      if (mode === 'admission' || mode === 'all') {
        if (extracted.ipdNo) updated.ipdNo = cleanIpdNo(extracted.ipdNo);
        if (extracted.patientName) updated.patientName = cleanPatientName(extracted.patientName) || extracted.patientName;
        if (extracted.uhid) updated.uhid = extracted.uhid;
        if (extracted.doa) updated.doa = parseDoaDate(extracted.doa) || extracted.doa;
        if (extracted.dod) updated.dod = parseDoaDate(extracted.dod) || extracted.dod;
        if (extracted.diagnosis) updated.diagnosis = extracted.diagnosis;
        if (extracted.surgeryName) updated.surgeryName = extracted.surgeryName;
        if (extracted.mobileNumber) updated.mobileNumber = extracted.mobileNumber;

        if (extracted.doctorName) {
          const docText = `Doctor: ${extracted.doctorName}`;
          if (!updated.remark) {
            updated.remark = docText;
          } else if (!updated.remark.toUpperCase().includes(extracted.doctorName.toUpperCase())) {
            updated.remark = `${updated.remark} | ${docText}`;
          }
        }
      }

      // Policy & Insurance fields
      if (mode === 'insurance' || mode === 'all') {
        if (extracted.tpaName) {
          updated.tpaName = extracted.tpaName;
          const matchedAddr = getMatchingInsuranceAddress(extracted.tpaName);
          if (matchedAddr) {
            updated.insuranceAddress = matchedAddr.toUpperCase();
          }
          const bankInfo = getMatchingBankDetails(extracted.tpaName);
          if (bankInfo) {
            if (bankInfo.bankName) updated.bankName = (bankInfo.bankName || '').toUpperCase();
            if (bankInfo.bankAccountNo) updated.bankAccountNo = (bankInfo.bankAccountNo || '').toUpperCase();
            if (bankInfo.ifscCode) updated.ifscCode = (bankInfo.ifscCode || '').toUpperCase();
            if (bankInfo.bankAddress) updated.bankAddress = (bankInfo.bankAddress || '').toUpperCase();
          }
        }
        if (extracted.insuranceCompany) {
          updated.insuranceCompany = extracted.insuranceCompany;
          // Auto-save unknown insurance company (do not auto-populate address from insurance company)
          const res = addCustomInsuranceCompany(extracted.insuranceCompany);
          if (res.isNew) {
            setInsuranceCompaniesList(res.list);
          }
        }
        if (extracted.policyNumber) updated.policyNumber = extracted.policyNumber;
        if (extracted.empID) updated.empID = extracted.empID;
        if (extracted.insuranceID) updated.insuranceID = extracted.insuranceID;
        if (extracted.claimNo) updated.claimNo = extracted.claimNo;
        if (extracted.insuranceLimit) updated.insuranceLimit = extracted.insuranceLimit;

        // If patient name in form is empty and insurance card has a member/patient name
        if (!updated.patientName && extracted.patientName) {
          updated.patientName = cleanPatientName(extracted.patientName) || extracted.patientName;
        }

        // Also check if insurance card had admission date or IPD if missing
        if (!updated.ipdNo && extracted.ipdNo) updated.ipdNo = cleanIpdNo(extracted.ipdNo);
        if (!updated.doa && extracted.doa) updated.doa = parseDoaDate(extracted.doa) || extracted.doa;
      }

      return updated;
    });

    if (extracted.patientName || extracted.uhid) {
      checkAutoReadmit(extracted.patientName || '', extracted.uhid || '');
    }
  };

  useEffect(() => {
    if (claimToEdit && claimToEdit.claim) {
      const uppercaseClaim = { ...claimToEdit.claim };
      Object.keys(uppercaseClaim).forEach(key => {
        const k = key as keyof Claim;
        if (
          typeof uppercaseClaim[k] === 'string' &&
          k !== 'doa' &&
          k !== 'dod' &&
          k !== 'paymentDate' &&
          k !== 'courierDate' &&
          k !== 'status' &&
          k !== 'relation' &&
          k !== 'readmit'
        ) {
          (uppercaseClaim as any)[k] = String(uppercaseClaim[k]).toUpperCase();
        }
      });
      setFormData(uppercaseClaim);
      setIsReadmitChecked(claimToEdit.claim.readmit === 'Yes');

      const currentList = getAllInsuranceCompanies(existingClaims);
      setInsuranceCompaniesList(currentList);
      const curIns = (claimToEdit.claim.insuranceCompany || '').trim().toUpperCase();
      if (curIns && !currentList.includes(curIns)) {
        setIsManualInsuranceEntry(true);
      } else {
        setIsManualInsuranceEntry(false);
      }

      const currentTpaList = getAllTpaOptions(existingClaims);
      setTpaOptionsList(currentTpaList);
      const curTpa = (claimToEdit.claim.tpaName || '').trim().toUpperCase();
      if (curTpa && !currentTpaList.includes(curTpa)) {
        setIsManualTpaEntry(true);
      } else {
        setIsManualTpaEntry(false);
      }
    } else {
      setFormData({
        readmit: 'No',
        patientName: '',
        uhid: '',
        mobileNumber: '',
        attenderName: '',
        relation: '',
        ipdNo: '',
        doa: '',
        dod: '',
        diagnosis: '',
        surgeryName: '',
        status: 'Admitted',
        insuranceLimit: '',
        tpaName: '',
        insuranceCompany: '',
        insuranceID: '',
        claimNo: '',
        policyNumber: '',
        empID: '',
        insuranceAddress: '',
        billInvoiceNo: '',
        totalBill: '',
        approved: '',
        discount: '',
        deduction: '',
        patientPay: '',
        settlementAmount: '',
        tds: '',
        paymentDate: '',
        utr: '',
        bankName: '',
        bankAccountNo: '',
        ifscCode: '',
        bankAddress: '',
        courierDetails: '',
        courierDate: '',
        remark: ''
      });
      setIsReadmitChecked(false);
      setIsManualInsuranceEntry(false);
      setIsManualTpaEntry(false);
      setInsuranceCompaniesList(getAllInsuranceCompanies(existingClaims));
      setTpaOptionsList(getAllTpaOptions(existingClaims));
    }
  }, [claimToEdit, isOpen]);

  if (!isOpen) return null;

  const sno = claimToEdit
    ? (claimToEdit.claim.sNo || claimToEdit.index + 1)
    : (existingClaims.length + 1);

  // Handle re-admission check
  const checkAutoReadmit = (name: string, uhid: string) => {
    const norm = (s: string) => String(s || '').toLowerCase().trim();
    if (!name || !uhid) return;

    const found = existingClaims.some(
      c => norm(c.patientName) === norm(name) && norm(c.uhid) === norm(uhid)
    );
    if (found) {
      setIsReadmitChecked(true);
      setFormData(prev => ({ ...prev, readmit: 'Yes' }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name === 'readmit') {
        setIsReadmitChecked(checked);
        if (checked) {
          const norm = (s: string) => String(s || '').toLowerCase().trim();
          const pName = formData.patientName || '';
          const pUhid = formData.uhid || '';
          const pMobile = formData.mobileNumber || '';

          if (!pName || (!pUhid && !pMobile)) {
            alert('Please enter Patient Name and UHID or Mobile before selecting Re-admission');
            setIsReadmitChecked(false);
            return;
          }

          const existing = existingClaims.find(c => {
            const nameMatch = norm(c.patientName) === norm(pName);
            if (!nameMatch) return false;
            return (pUhid && norm(c.uhid) === norm(pUhid)) || (pMobile && norm(c.mobileNumber) === norm(pMobile));
          });

          if (!existing) {
            alert('No existing patient found for re-admission');
            setIsReadmitChecked(false);
            return;
          }

          onShowNotification(`✓ Existing patient found! Loaded details for "${existing.patientName}". Review and update admission details.`, 'success');
          setFormData({
            ...existing,
            readmit: 'Yes',
            ipdNo: '',
            doa: '',
            dod: '',
            claimNo: '',
            billInvoiceNo: '',
            totalBill: '',
            approved: '',
            discount: '',
            deduction: '',
            patientPay: '',
            settlementAmount: '',
            tds: '',
            paymentDate: '',
            utr: '',
            courierDetails: '',
            courierDate: '',
            diagnosis: '',
            surgeryName: '',
            remark: '',
            status: 'Admitted'
          });
        } else {
          setFormData(prev => ({ ...prev, readmit: 'No' }));
        }
      }
      return;
    }

    let processedValue = value;
    if (type === 'date') {
      processedValue = normalizeDateForStorage(value);
    } else if (
      typeof value === 'string' &&
      type !== 'date' &&
      name !== 'status' &&
      name !== 'relation' &&
      name !== 'readmit' &&
      name !== 'doa' &&
      name !== 'dod' &&
      name !== 'paymentDate' &&
      name !== 'courierDate'
    ) {
      processedValue = value.toUpperCase();
    }

    const updated = { ...formData, [name]: processedValue };

    // Auto-populate TPA details and Address
    if (name === 'tpaName' && processedValue) {
      const insAddr = getMatchingInsuranceAddress(processedValue) || getAllTpaInsuranceAddresses()[processedValue.trim().toUpperCase()] || '';
      if (insAddr) {
        updated.insuranceAddress = insAddr.toUpperCase();
        const addrRes = saveCustomTpaAddress(processedValue, insAddr.toUpperCase());
        if (addrRes.success) {
          setSavedAddressesMap(addrRes.allAddresses);
        }
      }
      const bankInfo = getMatchingBankDetails(processedValue);
      if (bankInfo) {
        if (bankInfo.bankName) updated.bankName = (bankInfo.bankName || '').toUpperCase();
        if (bankInfo.bankAccountNo) updated.bankAccountNo = (bankInfo.bankAccountNo || '').toUpperCase();
        if (bankInfo.ifscCode) updated.ifscCode = (bankInfo.ifscCode || '').toUpperCase();
        if (bankInfo.bankAddress) updated.bankAddress = (bankInfo.bankAddress || '').toUpperCase();
        if (bankInfo.panCard) updated.panCard = (bankInfo.panCard || '').toUpperCase();
      }
    }

    // Auto-save modified address to current TPA / INS. NAME
    if (name === 'insuranceAddress' && processedValue) {
      const curTpa = (updated.tpaName || formData.tpaName || '').trim().toUpperCase();
      if (curTpa) {
        const addrRes = saveCustomTpaAddress(curTpa, processedValue);
        if (addrRes.success) {
          setSavedAddressesMap(addrRes.allAddresses);
        }
      }
    }

    // Auto-populate Bank details when Insurance Company is chosen
    if (name === 'insuranceCompany' && processedValue) {
      const bankInfo = getMatchingBankDetails(processedValue) || (updated.tpaName ? getMatchingBankDetails(updated.tpaName) : null);
      if (bankInfo && (!updated.bankName || !updated.bankAccountNo)) {
        if (bankInfo.bankName) updated.bankName = (bankInfo.bankName || '').toUpperCase();
        if (bankInfo.bankAccountNo) updated.bankAccountNo = (bankInfo.bankAccountNo || '').toUpperCase();
        if (bankInfo.ifscCode) updated.ifscCode = (bankInfo.ifscCode || '').toUpperCase();
        if (bankInfo.bankAddress) updated.bankAddress = (bankInfo.bankAddress || '').toUpperCase();
        if (bankInfo.panCard) updated.panCard = (bankInfo.panCard || '').toUpperCase();
      }
    }

    // Auto-populate Bank details
    if (name === 'bankName' && processedValue) {
      const bankInfo = getMatchingBankDetails(processedValue);
      if (bankInfo) {
        if (bankInfo.bankAccountNo) updated.bankAccountNo = (bankInfo.bankAccountNo || '').toUpperCase();
        if (bankInfo.ifscCode) updated.ifscCode = (bankInfo.ifscCode || '').toUpperCase();
        if (bankInfo.bankAddress) updated.bankAddress = (bankInfo.bankAddress || '').toUpperCase();
        if (bankInfo.panCard) updated.panCard = (bankInfo.panCard || '').toUpperCase();
      }
    }

    // Note: Do NOT auto-populate insuranceAddress when insuranceCompany changes (address is only auto-fetched from TPA / INS. NAME)

    // Recalculate financial amounts
    computeClaimFinancials(updated, name);

    setFormData(updated);
  };

  const handleSubmit = async () => {
    if (!formData.patientName || !formData.uhid) {
      alert('Patient Name and UHID are required!');
      return;
    }

    const uppercaseStr = (s?: string) => (s || '').trim().toUpperCase();

    const updatedClaim: Claim = {
      sNo: sno,
      patientName: uppercaseStr(formData.patientName),
      uhid: uppercaseStr(formData.uhid),
      mobileNumber: uppercaseStr(formData.mobileNumber),
      readmit: isReadmitChecked ? 'Yes' : 'No',
      attenderName: uppercaseStr(formData.attenderName),
      relation: formData.relation || '',
      ipdNo: uppercaseStr(formData.ipdNo),
      doa: formData.doa || '',
      dod: formData.dod || '',
      diagnosis: uppercaseStr(formData.diagnosis),
      surgeryName: uppercaseStr(formData.surgeryName),
      status: (formData.status as ClaimStatus) || 'Admitted',
      insuranceLimit: uppercaseStr(formData.insuranceLimit),
      tpaName: uppercaseStr(formData.tpaName),
      insuranceCompany: uppercaseStr(formData.insuranceCompany),
      insuranceID: uppercaseStr(formData.insuranceID),
      claimNo: uppercaseStr(formData.claimNo),
      policyNumber: uppercaseStr(formData.policyNumber),
      empID: uppercaseStr(formData.empID),
      insuranceAddress: uppercaseStr(formData.insuranceAddress),
      billInvoiceNo: uppercaseStr(formData.billInvoiceNo),
      totalBill: uppercaseStr(formData.totalBill),
      approved: uppercaseStr(formData.approved),
      discount: uppercaseStr(formData.discount),
      deduction: uppercaseStr(formData.deduction),
      patientPay: uppercaseStr(formData.patientPay),
      settlementAmount: uppercaseStr(formData.settlementAmount),
      tds: uppercaseStr(formData.tds),
      paymentDate: formData.paymentDate || '',
      utr: uppercaseStr(formData.utr),
      bankName: uppercaseStr(formData.bankName),
      bankAccountNo: uppercaseStr(formData.bankAccountNo),
      ifscCode: uppercaseStr(formData.ifscCode),
      bankAddress: uppercaseStr(formData.bankAddress),
      courierDetails: uppercaseStr(formData.courierDetails),
      courierDate: formData.courierDate || '',
      remark: uppercaseStr(formData.remark)
    };

    computeClaimFinancials(updatedClaim);

    // Auto-save any manual or custom Insurance Company into system storage for future use
    if (updatedClaim.insuranceCompany && updatedClaim.insuranceCompany.trim()) {
      const saveRes = addCustomInsuranceCompany(updatedClaim.insuranceCompany);
      if (saveRes.isNew) {
        setInsuranceCompaniesList(saveRes.list);
        onShowNotification(`✓ Saved new Insurance Company "${updatedClaim.insuranceCompany}" for all future claims!`, 'success');
      }
    }

    // Auto-save any manual or custom TPA Name into system database for future use
    if (updatedClaim.tpaName && updatedClaim.tpaName.trim()) {
      const bankDataToSave: BankDetails = {
        bankName: updatedClaim.bankName,
        bankAccountNo: updatedClaim.bankAccountNo,
        ifscCode: updatedClaim.ifscCode,
        bankAddress: updatedClaim.bankAddress,
        panCard: updatedClaim.panCard || 'ABOFA7356E'
      };
      const tpaRes = addCustomTpa(updatedClaim.tpaName, bankDataToSave, updatedClaim.insuranceAddress);
      setTpaOptionsList(tpaRes.list);
      if (tpaRes.isNew) {
        onShowNotification(`✓ Saved new TPA "${updatedClaim.tpaName}" & linked bank details to database!`, 'success');
      }
    }

    // Auto-save manual or modified Insurance/TPA Address into system database for future use
    if (updatedClaim.insuranceAddress && updatedClaim.insuranceAddress.trim()) {
      const addrTarget = updatedClaim.tpaName || 'MANUAL TPA';
      const addrRes = saveCustomTpaAddress(addrTarget, updatedClaim.insuranceAddress);
      if (addrRes.success) {
        setSavedAddressesMap(addrRes.allAddresses);
      }
    }

    const isEdit = claimToEdit !== null;
    const editIdx = claimToEdit ? claimToEdit.index : -1;

    onSaveClaim(updatedClaim, isEdit, editIdx);

    const msg = getStatusSuccessMessage(updatedClaim.status, isEdit ? 'update' : 'save');
    onShowSuccessPopup(msg);

    const statusVal = String(updatedClaim.status || '').trim();
    const isWhatsAppEligible = statusVal === 'Discharge Approved' || statusVal === 'Denial' || statusVal === 'Rejected' || statusVal.toLowerCase().includes('denial') || statusVal.toLowerCase().includes('reject');

    if (isWhatsAppEligible && onPromptWhatsApp) {
      onPromptWhatsApp(updatedClaim);
    }

    onClose();
  };

  // Financial Calculations for Projections
  const totalBillNum = parseFloat(String(formData.totalBill || '0').replace(/[^0-9.-]/g, '')) || 0;
  const approvedNum = parseFloat(String(formData.approved || '0').replace(/[^0-9.-]/g, '')) || 0;
  const discountNum = parseFloat(String(formData.discount || '0').replace(/[^0-9.-]/g, '')) || 0;
  const settlementNum = parseFloat(String(formData.settlementAmount || '0').replace(/[^0-9.-]/g, '')) || 0;
  const formTdsNum = parseFloat(String(formData.tds || '0').replace(/[^0-9.-]/g, '')) || 0;

  const totalDeductible = Math.max(0, totalBillNum - approvedNum - discountNum);

  const baseForTds = settlementNum > 0 ? settlementNum : approvedNum;
  const autoTds = formTdsNum > 0 ? formTdsNum : baseForTds * 0.10;
  const netClaimPayable = Math.max(0, baseForTds - autoTds);

  const patientPayNum = parseFloat(String(formData.patientPay || '0').replace(/[^0-9.-]/g, '')) || totalDeductible;
  const paymentReceivedNum = parseFloat(String(formData.deduction || '0').replace(/[^0-9.-]/g, '')) || netClaimPayable;
  const totalDeductedAmount = (approvedNum > 0 || settlementNum > 0) ? (approvedNum - settlementNum) : 0;

  const formatCurr = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-[#0B101D] border-2 border-slate-300 dark:border-slate-700/60 rounded-2xl shadow-2xl max-w-[1000px] w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-200 transition-colors"
      >
        
        {/* Top Header Bar */}
        <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-6 py-4 flex flex-wrap justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0 gap-3">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-lg border ${
              claimToEdit
                ? 'bg-gradient-to-br from-amber-500/20 to-indigo-600/30 border-amber-500/40 text-amber-300'
                : 'bg-gradient-to-br from-blue-500/20 to-indigo-600/30 border-blue-500/40 text-blue-300'
            }`}>
              {claimToEdit ? '✏️' : '📋'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">
                  S.NO #{sno}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                  formData.status === 'Settled' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  formData.status === 'Discharge Approved' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                  formData.status === 'Denial' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {formData.status || 'PENDING'}
                </span>
                {isReadmitChecked && (
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">
                    ⚡ RE-ADMISSION
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-0.5">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>{claimToEdit ? 'EDIT CLAIM DOSSIER' : 'ADD NEW CLAIM DOSSIER'}</span>
                  <span className="text-slate-400 font-normal">|</span>
                  <span className="text-indigo-300 font-bold">{formData.patientName || 'New Patient Record'}</span>
                </h2>

                <button
                  type="button"
                  onClick={() => setIsScannerOpen(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
                    isScannerOpen
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                      : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border-indigo-400/40 hover:-translate-y-0.5'
                  }`}
                  title={isScannerOpen ? 'Hide AI Slip Scanner' : 'Upload Admission Slip, Health Insurance Card, or PDF to Auto-Fill Claim'}
                >
                  <span>{isScannerOpen ? '✕' : '✨'}</span>
                  <span>{isScannerOpen ? 'Hide Scanner' : '📸 Scan Slip / Insurance Card'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {formData.uhid && (
              <div className="hidden sm:flex flex-col text-right pr-3 border-r border-slate-800">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">UHID</span>
                <span className="text-xs font-mono font-bold text-slate-200">{formData.uhid}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold flex items-center justify-center text-lg transition-all border border-slate-700 hover:scale-105 active:scale-95"
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Main Form Canvas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-[#08080c] space-y-5">
          <form onSubmit={e => e.preventDefault()} className="space-y-5">
            {/* AI Admission Slip & Health Insurance Card Scanner & Auto-Fill (Shows ONLY when user clicks Scan Slip / Insurance Card button) */}
            {isScannerOpen && (
              <div className="relative animate-fadeIn">
                <div className="flex items-center justify-between bg-gradient-to-r from-indigo-900/60 to-purple-900/50 border border-indigo-500/40 rounded-xl px-4 py-2.5 mb-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="text-base animate-pulse">✨</span>
                    <span className="text-xs font-black text-indigo-100 uppercase tracking-wide">
                      AI Multi-Image Slip & Card Auto-Fill Active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(false)}
                    className="text-[11px] font-black text-slate-200 hover:text-white bg-slate-800/80 hover:bg-rose-600 px-3 py-1 rounded-lg border border-slate-700 hover:border-rose-500 transition-all flex items-center gap-1 cursor-pointer"
                    title="Close scanner"
                  >
                    ✕ Close / Hide Scanner
                  </button>
                </div>
                <SlipScanner
                  formData={formData}
                  onApplyField={handleApplyField}
                  onApplyMember={handleApplyMember}
                  onApplyAll={(data) => handleScanComplete(data, 'all')}
                  onScanComplete={handleScanComplete}
                  onShowNotification={onShowNotification}
                  currentPatientName={formData.patientName || ''}
                />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              
              {/* LEFT COLUMN */}
              <div className="space-y-5">
                
                {/* CARD 1: PATIENT DEMOGRAPHICS */}
                <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200/70 dark:ring-slate-800">
                  <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                        👤
                      </div>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        PATIENT DEMOGRAPHICS
                      </h3>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer select-none bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors">
                      <input
                        type="checkbox"
                        name="readmit"
                        checked={isReadmitChecked}
                        onChange={handleInputChange}
                        className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                      />
                      <span>Re-admission Record</span>
                    </label>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <FormFieldLabel label="PATIENT NAME" required />
                      <input
                        type="text"
                        name="patientName"
                        value={formData.patientName || ''}
                        onChange={handleInputChange}
                        onBlur={() => checkAutoReadmit(formData.patientName || '', formData.uhid || '')}
                        placeholder="Full Patient Name"
                        required
                        className="form-input-styled text-sm font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormFieldLabel label="UHID" required />
                        <input
                          type="text"
                          name="uhid"
                          value={formData.uhid || ''}
                          onChange={handleInputChange}
                          onBlur={() => checkAutoReadmit(formData.patientName || '', formData.uhid || '')}
                          placeholder="UHID Number"
                          required
                          className="form-input-styled font-mono text-sm"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="IPD NO" />
                        <input
                          type="text"
                          name="ipdNo"
                          value={formData.ipdNo || ''}
                          onChange={handleInputChange}
                          placeholder="IPD Number"
                          className="form-input-styled font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* MATCHED UHID PATIENT POPUP / DETAILS CARD - Only shown in ADD NEW mode */}
                    {!claimToEdit && matchedUhidClaim && (
                      <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 border-2 border-indigo-500/40 rounded-xl shadow-md relative animate-fadeIn transition-all">
                        <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-800/60 pb-2 mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                            <span className="text-amber-500 animate-pulse">⚡</span>
                            <span>Matched Patient Record Found</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setDismissedUhid((formData.uhid || '').trim().toLowerCase());
                              setMatchedUhidClaim(null);
                            }}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold px-2 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                            title="Dismiss Popup"
                          >
                            ✕
                          </button>
                        </div>

                        <div
                          onClick={() => handleApplyMatchedClaim(matchedUhidClaim)}
                          className="cursor-pointer group bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/80 shadow-sm transition-all"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <div className="text-xs font-black text-indigo-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                <span>{matchedUhidClaim.patientName || 'Unnamed Patient'}</span>
                                <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                                  UHID: {matchedUhidClaim.uhid}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                  {matchedUhidClaim.ipdNo && <span>IPD: <strong className="text-slate-900 dark:text-white">{matchedUhidClaim.ipdNo}</strong></span>}
                                  {matchedUhidClaim.mobileNumber && <span>Mob: <strong className="text-slate-900 dark:text-white">{matchedUhidClaim.mobileNumber}</strong></span>}
                                  {matchedUhidClaim.status && <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.2 rounded text-[10px] font-bold">Status: {matchedUhidClaim.status}</span>}
                                </div>
                                {(matchedUhidClaim.doa || matchedUhidClaim.dod) && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Last Admission: <strong>{matchedUhidClaim.doa || 'N/A'}</strong> to <strong>{matchedUhidClaim.dod || 'N/A'}</strong>
                                  </div>
                                )}
                                {(matchedUhidClaim.diagnosis || matchedUhidClaim.surgeryName) && (
                                  <div className="text-[10px] text-indigo-900 dark:text-indigo-300 font-medium">
                                    Diag: {matchedUhidClaim.diagnosis || matchedUhidClaim.surgeryName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyMatchedClaim(matchedUhidClaim);
                            }}
                            className="mt-2.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-lg shadow transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide"
                          >
                            <span>📋 Click to Auto-Fill Patient Name & Details</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormFieldLabel label="MOBILE NUMBER" />
                        <input
                          type="text"
                          name="mobileNumber"
                          value={formData.mobileNumber || ''}
                          onChange={handleInputChange}
                          placeholder="e.g. 9876543210, 9123456789"
                          className="form-input-styled font-mono"
                          title="Enter one or multiple mobile numbers separated by comma, slash or space"
                        />
                        {/* Multiple Mobile Numbers Badge indicator */}
                        {(() => {
                          const numbers = extractValidPhoneNumbers(formData.mobileNumber);
                          if (numbers.length > 1) {
                            return (
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  ✓ {numbers.length} Numbers detected:
                                </span>
                                {numbers.map((n, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 px-1.5 py-0.2 rounded"
                                  >
                                    +{n}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              Supports multiple numbers (e.g. 98260XXXXX, 94250XXXXX) for bulk WhatsApp
                            </p>
                          );
                        })()}
                      </div>
                      <div>
                        <FormFieldLabel label="ATTENDER NAME" />
                        <input
                          type="text"
                          name="attenderName"
                          value={formData.attenderName || ''}
                          onChange={handleInputChange}
                          placeholder="Attender Name"
                          className="form-input-styled"
                        />
                      </div>
                    </div>

                    <div>
                      <FormFieldLabel label="RELATION" />
                      <select
                        name="relation"
                        value={formData.relation || ''}
                        onChange={handleInputChange}
                        className="form-select-styled"
                      >
                        <option value="">Select Relation</option>
                        {RELATIONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* CARD 2: CLINICAL & ADMISSION DETAILS */}
                <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200/70 dark:ring-slate-800">
                  <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs font-bold">
                      ⚡
                    </div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      CLINICAL & ADMISSION DETAILS
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <FormFieldLabel label="DIAGNOSIS" />
                      <input
                        type="text"
                        name="diagnosis"
                        value={formData.diagnosis || ''}
                        onChange={handleInputChange}
                        placeholder="Diagnosis Details"
                        className="form-input-styled"
                      />
                    </div>

                    <div>
                      <FormFieldLabel label="SURGERY / PROCEDURE NAME" />
                      <input
                        type="text"
                        name="surgeryName"
                        value={formData.surgeryName || ''}
                        onChange={handleInputChange}
                        placeholder="Surgery / Procedure Details"
                        className="form-input-styled font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormFieldLabel label="BILL INVOICE NO" />
                        <input
                          type="text"
                          name="billInvoiceNo"
                          value={formData.billInvoiceNo || ''}
                          onChange={handleInputChange}
                          placeholder="Invoice Number"
                          className="form-input-styled font-mono"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="CLAIM STATUS" required />
                        <select
                          name="status"
                          value={formData.status || ''}
                          onChange={handleInputChange}
                          required
                          className="form-select-styled font-black text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                        >
                          <option value="Admitted">Admitted</option>
                          <option value="Initial Approved">Initial Approved</option>
                          <option value="Discharge">Discharge</option>
                          <option value="Discharge Approved">Discharge Approved</option>
                          <option value="Pending">Pending</option>
                          <option value="Settled">Settled</option>
                          <option value="Denial">Rejected / Denial</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormFieldLabel label="DOA (DATE OF ADMISSION)" />
                        <input
                          type="date"
                          name="doa"
                          value={toHtmlDateValue(formData.doa)}
                          onChange={handleInputChange}
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                          className="form-input-styled cursor-pointer"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="DOD (DATE OF DISCHARGE - OPTIONAL)" />
                        <input
                          type="date"
                          name="dod"
                          value={toHtmlDateValue(formData.dod)}
                          onChange={handleInputChange}
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                          className="form-input-styled cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 3: HOSPITAL BANK DETAILS */}
                <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200/70 dark:ring-slate-800">
                  <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      🏥
                    </div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      HOSPITAL BANK DETAILS
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <FormFieldLabel label="BANK NAME" />
                      <select
                        name="bankName"
                        value={formData.bankName || ''}
                        onChange={handleInputChange}
                        className="form-select-styled font-semibold"
                      >
                        <option value="">Choose Bank</option>
                        <option value="UNION BANK">UNION BANK</option>
                        <option value="HDFC BANK">HDFC BANK</option>
                        <option value="AXIS BANK">AXIS BANK</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormFieldLabel label="BANK ACCOUNT NO" />
                        <input
                          type="text"
                          name="bankAccountNo"
                          value={formData.bankAccountNo || ''}
                          onChange={handleInputChange}
                          placeholder="Account Number"
                          className="form-input-styled font-mono"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="IFSC CODE" />
                        <input
                          type="text"
                          name="ifscCode"
                          value={formData.ifscCode || ''}
                          onChange={handleInputChange}
                          placeholder="IFSC Code"
                          className="form-input-styled font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <FormFieldLabel label="BANK ADDRESS" />
                      <textarea
                        name="bankAddress"
                        value={formData.bankAddress || ''}
                        onChange={handleInputChange}
                        placeholder="Bank Address"
                        rows={2}
                        className="form-textarea-styled text-xs"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-5">

                {/* CARD 4: POLICY, INSURANCE & TPA METADATA */}
                <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200/70 dark:ring-slate-800">
                  <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
                        💳
                      </div>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        POLICY, INSURANCE &amp; TPA METADATA
                      </h3>
                    </div>
                    {/* Sync Settings Button & Dropdown Options */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSyncMenuOpen(prev => !prev);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl border transition-all cursor-pointer shadow-xs ${
                          isSyncMenuOpen
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/25 ring-2 ring-purple-400/40'
                            : 'bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        }`}
                        title="Click to show Sync options: Send to sheet, Load From Sheet, and Sync Two-Way"
                      >
                        <span className="text-sm">⚙️</span>
                        <span>Sync Settings</span>
                        <span className={`text-[10px] transition-transform duration-200 ${isSyncMenuOpen ? 'rotate-180' : ''}`}>▾</span>
                      </button>

                      {/* Dropdown Options showing under Sync Settings button */}
                      {isSyncMenuOpen && (
                        <div
                          className="absolute right-0 top-full mt-2 z-50 w-72 bg-white dark:bg-[#13131c] border-2 border-purple-500/40 rounded-2xl p-2.5 shadow-2xl space-y-1.5 animate-fadeIn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              Sync Options
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsSyncMenuOpen(false)}
                              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          {/* 1. Send to sheet */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSyncMenuOpen(false);
                              handlePushMetadataToGoogleSheet();
                            }}
                            disabled={isPushingMetadata || isSyncingMetadata || isLoadingFromSpreadsheet}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-all cursor-pointer disabled:opacity-50"
                            title="Send / Push TPA & Insurance Company list data directly to Google Sheet (Col A: TPA / INS. NAME, Col B: INSURANCE COMPANY)"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">📤</span>
                              <span>Send to sheet</span>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Col A &amp; B</span>
                          </button>

                          {/* 2. Load From Sheet (near Send to sheet) */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSyncMenuOpen(false);
                              handleLoadFromSpreadsheetLink();
                            }}
                            disabled={isLoadingFromSpreadsheet || isPushingMetadata || isSyncingMetadata}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition-all cursor-pointer disabled:opacity-50"
                            title="Load TPAs and Insurance Companies through Google Spreadsheet Link (Skips duplicate names matching first 7 words)"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">📥</span>
                              <span>Load From Sheet</span>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">Spreadsheet Link</span>
                          </button>

                          {/* 3. Sync Two-Way (near Load From Sheet) */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSyncMenuOpen(false);
                              handleSyncMetadataFromUrl();
                            }}
                            disabled={isSyncingMetadata || isPushingMetadata || isLoadingFromSpreadsheet}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-all cursor-pointer disabled:opacity-50"
                            title="Two-way sync: Push local TPAs & Insurance Companies to Google Sheet AND load any updates"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🔄</span>
                              <span>Sync Two-Way</span>
                            </div>
                            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">Two-Way</span>
                          </button>

                          {/* 4. Full Settings, URLs & Apps Script Code */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSyncMenuOpen(false);
                              setSyncTestMessage(null);
                              setIsSyncConfigOpen(true);
                            }}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                            title="Configure URLs, Spreadsheet link & Apps Script Code"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs">⚙️</span>
                              <span>Configure URLs &amp; Script</span>
                            </div>
                            <span className="text-[10px] text-slate-400">Settings ↗</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <FormFieldLabel label="TPA / INS. NAME" />
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/50">
                            {tpaOptionsList.length} TPAs
                          </span>
                        </div>

                        {isManualTpaEntry ? (
                          <div className="space-y-1.5">
                            <div className="relative">
                              <input
                                type="text"
                                name="tpaName"
                                value={formData.tpaName || ''}
                                onChange={handleInputChange}
                                placeholder="Type custom TPA / Insurance name..."
                                list="tpa-options-list"
                                className="form-input-styled font-semibold uppercase pr-28 text-xs"
                                autoFocus
                              />
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {formData.tpaName && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const trimmed = (formData.tpaName || '').trim().toUpperCase();
                                      if (!trimmed) return;
                                      handleOpenSaveTpPrompt(trimmed);
                                    }}
                                    title="Save to database with bank details"
                                    className="text-[10px] font-black text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/80 hover:bg-purple-200 dark:hover:bg-purple-800 transition-all border border-purple-300 dark:border-purple-700 shadow-xs cursor-pointer"
                                  >
                                    + Save &amp; Link Bank
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setIsManualTpaEntry(false)}
                                  className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
                                  title="Switch back to list"
                                >
                                  📋 List
                                </button>
                              </div>
                            </div>
                            <datalist id="tpa-options-list">
                              {tpaOptionsList.map(tpa => (
                                <option key={tpa} value={tpa} />
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <select
                            name="tpaName"
                            value={formData.tpaName || ''}
                            onChange={(e) => {
                              if (e.target.value === '__ADD_NEW__') {
                                handleOpenSaveTpPrompt('');
                              } else if (e.target.value === '__MANUAL_ENTRY__') {
                                setIsManualTpaEntry(true);
                              } else if (e.target.value === '__MANAGE_LIST__') {
                                setIsTpaManagerOpen(true);
                              } else {
                                handleInputChange(e);
                              }
                            }}
                            className="form-select-styled font-semibold"
                          >
                            <option value="">Select TPA / Ins. Name</option>
                            <option value="__ADD_NEW__" className="text-purple-600 dark:text-purple-400 font-black bg-purple-50 dark:bg-purple-950/80">
                              ➕ 🏦 + Add New TPA &amp; Link Bank Details...
                            </option>
                            <option value="__MANUAL_ENTRY__" className="text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-950">
                              ✏️ Type Manual Custom Name...
                            </option>
                            <option value="__MANAGE_LIST__" className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950">
                              🗑️ Delete / Manage TPAs ({tpaOptionsList.length})...
                            </option>
                            <option disabled value="">────────────────────────────</option>
                            {tpaOptionsList.map(tpa => (
                              <option key={tpa} value={tpa}>{tpa}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <FormFieldLabel label="INSURANCE COMPANY" />
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50">
                            {insuranceCompaniesList.length} Insurers
                          </span>
                        </div>

                        {isManualInsuranceEntry ? (
                          <div className="space-y-1.5">
                            <div className="relative">
                              <input
                                type="text"
                                name="insuranceCompany"
                                value={formData.insuranceCompany || ''}
                                onChange={handleInputChange}
                                placeholder="Type custom insurance company name..."
                                list="insurance-companies-list"
                                className="form-input-styled font-semibold uppercase pr-28 text-xs"
                                autoFocus
                              />
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {formData.insuranceCompany && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const res = addCustomInsuranceCompany(formData.insuranceCompany || '');
                                      if (res.isNew) {
                                        setInsuranceCompaniesList(res.list);
                                        saveInsuranceCompanyToGoogleSheet(formData.insuranceCompany || '').catch(() => {});
                                        onShowNotification(`✓ "${formData.insuranceCompany}" saved to list & Google Sheet!`, 'success');
                                      } else {
                                        onShowNotification(`"${formData.insuranceCompany}" is already saved in company list`, 'info');
                                      }
                                    }}
                                    title="Save to company list and Google Sheet"
                                    className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/80 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-all border border-indigo-300 dark:border-indigo-700 shadow-xs cursor-pointer"
                                  >
                                    + Save
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setIsManualInsuranceEntry(false)}
                                  className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
                                  title="Switch back to list"
                                >
                                  📋 List
                                </button>
                              </div>
                            </div>
                            <datalist id="insurance-companies-list">
                              {insuranceCompaniesList.map(ic => (
                                <option key={ic} value={ic} />
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <select
                            name="insuranceCompany"
                            value={formData.insuranceCompany || ''}
                            onChange={(e) => {
                              if (e.target.value === '__MANUAL_ENTRY__') {
                                setIsManualInsuranceEntry(true);
                              } else if (e.target.value === '__MANAGE_LIST__') {
                                setIsCompanyManagerOpen(true);
                              } else {
                                handleInputChange(e);
                              }
                            }}
                            className="form-select-styled font-semibold"
                          >
                            <option value="">Select Insurance Co.</option>
                            <option value="__MANUAL_ENTRY__" className="text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-950">
                              ➕ ✏️ Type Manual / + Add New Insurance Co...
                            </option>
                            <option value="__MANAGE_LIST__" className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950">
                              🗑️ Delete / Manage Insurance Companies ({insuranceCompaniesList.length})...
                            </option>
                            <option disabled value="">────────────────────────────</option>
                            {insuranceCompaniesList.map(ic => (
                              <option key={ic} value={ic}>{ic}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormFieldLabel label="POLICY NUMBER" />
                        <input
                          type="text"
                          name="policyNumber"
                          value={formData.policyNumber || ''}
                          onChange={handleInputChange}
                          placeholder="Policy Number"
                          className="form-input-styled font-mono"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="INSURANCE ID / MEMBER ID" />
                        <input
                          type="text"
                          name="insuranceID"
                          value={formData.insuranceID || ''}
                          onChange={handleInputChange}
                          placeholder="Member ID"
                          className="form-input-styled font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormFieldLabel label="EMPLOYEE ID" />
                        <input
                          type="text"
                          name="empID"
                          value={formData.empID || ''}
                          onChange={handleInputChange}
                          placeholder="Employee ID"
                          className="form-input-styled"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="CLAIM NUMBER" />
                        <input
                          type="text"
                          name="claimNo"
                          value={formData.claimNo || ''}
                          onChange={handleInputChange}
                          placeholder="Claim Number"
                          className="form-input-styled font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <FormFieldLabel label="INSURANCE LIMIT" />
                      <input
                        type="text"
                        name="insuranceLimit"
                        value={formData.insuranceLimit || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. 5,00,000 or 5 Lakh"
                        className="form-input-styled font-semibold"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5 gap-1.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <FormFieldLabel label="INSURANCE / TPA ADDRESS" />
                          {formData.insuranceAddress && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                              <span>✓</span> {savedAddressesMap[(formData.tpaName || '').trim().toUpperCase()] ? 'Saved in DB' : 'Manual Address'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {formData.insuranceAddress && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetKey = formData.tpaName || 'MANUAL TPA ADDRESS';
                                const res = saveCustomTpaAddress(targetKey, formData.insuranceAddress || '');
                                if (res.success) {
                                  setSavedAddressesMap(res.allAddresses);
                                  onShowNotification(`✓ TPA Address saved to database for "${targetKey}"!`, 'success');
                                }
                              }}
                              className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/80 dark:hover:bg-emerald-800 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Save this manual address into the database permanently for future claims"
                            >
                              <span>💾</span> + Save Address to DB
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowAddressPicker(prev => !prev)}
                            className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Pick an address from the saved database"
                          >
                            <span>📋</span> {showAddressPicker ? 'Hide Saved List' : 'Saved List'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const query = formData.tpaName || '';
                              if (!query.trim()) {
                                onShowNotification('Please select or type a TPA / INS. NAME first to auto-fetch address', 'info');
                                return;
                              }
                              const matched = getMatchingInsuranceAddress(query);
                              if (matched) {
                                setFormData(prev => ({ ...prev, insuranceAddress: matched.toUpperCase() }));
                                onShowNotification(`✓ Address auto-matched from TPA "${query}"`, 'success');
                              } else {
                                onShowNotification(`No pre-saved address found for TPA "${query}"`, 'info');
                              }
                            }}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 cursor-pointer"
                            title="Re-fetch matched official address from selected TPA / INS. Name"
                          >
                            🔄 Auto-Fetch
                          </button>
                        </div>
                      </div>

                      {showAddressPicker && (
                        <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-900/70 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <span>Select from Saved TPA / Insurance Addresses:</span>
                            <span className="text-[10px] text-slate-400 font-medium">({Object.keys(savedAddressesMap).length} in database)</span>
                          </div>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                setFormData(prev => ({ ...prev, insuranceAddress: val.toUpperCase() }));
                                setShowAddressPicker(false);
                                onShowNotification('✓ Selected saved address loaded', 'info');
                              }
                            }}
                            defaultValue=""
                            className="form-select-styled text-xs font-semibold w-full"
                          >
                            <option value="">-- Choose pre-saved address --</option>
                            {Object.entries(savedAddressesMap).map(([key, addr]) => {
                              const text = String(addr || '');
                              return (
                                <option key={key} value={text}>
                                  {key}: {text.length > 60 ? text.substring(0, 60) + '...' : text}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      <textarea
                        name="insuranceAddress"
                        value={formData.insuranceAddress || ''}
                        onChange={handleInputChange}
                        onBlur={() => {
                          const curTpa = (formData.tpaName || '').trim().toUpperCase();
                          const curAddr = (formData.insuranceAddress || '').trim().toUpperCase();
                          if (curTpa && curAddr) {
                            const res = saveCustomTpaAddress(curTpa, curAddr);
                            if (res.success) {
                              setSavedAddressesMap(res.allAddresses);
                            }
                          }
                        }}
                        placeholder="Type or paste Manual TPA Address here (Automatically saved according to TPA / INS. NAME)"
                        rows={2}
                        className="form-textarea-styled text-xs font-medium"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        <span>💡 Manual TPA addresses saved here are permanently preserved in the main database for future auto-match.</span>
                        {formData.insuranceAddress && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, insuranceAddress: '' }))}
                            className="text-[10px] text-slate-400 hover:text-rose-500 underline cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 5: FINANCIAL AUDIT & CALCULATIONS */}
                <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200/70 dark:ring-slate-800">
                  <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      💰
                    </div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      FINANCIAL AUDIT & CALCULATIONS
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    {/* Balanced, Evenly Aligned 2-Column Financial Audit Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Row 1: TOTAL BILL & APPROVED */}
                      <div>
                        <FormFieldLabel label="TOTAL BILL" />
                        <input
                          type="text"
                          name="totalBill"
                          value={formData.totalBill || ''}
                          onChange={handleInputChange}
                          placeholder="Total Bill"
                          className="form-input-styled font-extrabold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="APPROVED" />
                        <input
                          type="text"
                          name="approved"
                          value={formData.approved || ''}
                          onChange={handleInputChange}
                          placeholder="Approved"
                          className="form-input-styled font-extrabold text-blue-600 dark:text-blue-400"
                        />
                      </div>

                      {/* Row 2: DISCOUNT & PATIENT PAY */}
                      <div>
                        <FormFieldLabel label="DISCOUNT" />
                        <input
                          type="text"
                          name="discount"
                          value={formData.discount || ''}
                          onChange={handleInputChange}
                          placeholder="Discount"
                          className="form-input-styled font-extrabold text-indigo-600 dark:text-indigo-400"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="PATIENT PAY" />
                        <input
                          type="text"
                          name="patientPay"
                          value={formData.patientPay || ''}
                          onChange={handleInputChange}
                          placeholder="Patient Pay"
                          className="form-input-styled font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50/40 dark:bg-amber-950/30"
                        />
                      </div>

                      {/* Row 3: SETTLEMENT AMOUNT & TDS AMOUNT */}
                      <div>
                        <FormFieldLabel label="SETTLEMENT AMOUNT" />
                        <input
                          type="text"
                          name="settlementAmount"
                          value={formData.settlementAmount || ''}
                          onChange={handleInputChange}
                          placeholder="Settlement"
                          className="form-input-styled font-extrabold text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="TDS AMOUNT (10%)" />
                        <input
                          type="text"
                          name="tds"
                          value={formData.tds || ''}
                          onChange={handleInputChange}
                          placeholder="TDS (10%)"
                          className="form-input-styled font-extrabold text-indigo-600 dark:text-indigo-400"
                        />
                      </div>

                      {/* Row 4: PAYMENT RECEIVED (Centered Key Metric) */}
                      <div className="col-span-2">
                        <FormFieldLabel label="PAYMENT RECEIVED (NET SETTLED AMOUNT)" />
                        <input
                          type="text"
                          name="deduction"
                          value={formData.deduction || ''}
                          onChange={handleInputChange}
                          placeholder="Net Payment Received"
                          className="form-input-styled font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                        />
                      </div>

                      {/* Row 5: UTR NO & PAYMENT DATE */}
                      <div>
                        <FormFieldLabel label="UTR NO" />
                        <input
                          type="text"
                          name="utr"
                          value={formData.utr || ''}
                          onChange={handleInputChange}
                          placeholder="UTR Reference No"
                          className="form-input-styled font-mono"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="PAYMENT DATE" />
                        <input
                          type="date"
                          name="paymentDate"
                          value={toHtmlDateValue(formData.paymentDate)}
                          onChange={handleInputChange}
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                          className="form-input-styled cursor-pointer"
                        />
                      </div>

                      {/* Row 6: COURIER DETAILS & COURIER DATE */}
                      <div>
                        <FormFieldLabel label="COURIER DETAILS" />
                        <input
                          type="text"
                          name="courierDetails"
                          value={formData.courierDetails || ''}
                          onChange={handleInputChange}
                          placeholder="Courier POD No"
                          className="form-input-styled font-mono"
                        />
                      </div>
                      <div>
                        <FormFieldLabel label="COURIER DATE" />
                        <input
                          type="date"
                          name="courierDate"
                          value={toHtmlDateValue(formData.courierDate)}
                          onChange={handleInputChange}
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                          className="form-input-styled cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Auto-Computed Financial Projections Box */}
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl p-3.5 space-y-2 mt-2">
                      <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-800/60 pb-1.5 mb-1.5">
                        <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                          AUTO-COMPUTED FINANCIAL PROJECTIONS
                        </span>
                        <span className="text-[9px] font-bold bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 px-1.5 py-0.5 rounded">
                          REALTIME
                        </span>
                      </div>
                      <div className="grid grid-cols-2 text-xs font-bold gap-y-1.5">
                        <span className="text-slate-600 dark:text-slate-300">Total Deductible:</span>
                        <span className="text-right text-rose-600 dark:text-rose-400 font-extrabold">
                          ({formatCurr(totalDeductible)})
                        </span>

                        <span className="text-slate-600 dark:text-slate-300">Auto-TDS Deducted:</span>
                        <span className="text-right text-purple-600 dark:text-purple-400 font-extrabold">
                          ({formatCurr(autoTds)})
                        </span>

                        <span className="text-slate-600 dark:text-slate-300">Net Claim Payable:</span>
                        <span className="text-right text-indigo-700 dark:text-indigo-300 font-black">
                          {formatCurr(netClaimPayable)}
                        </span>

                        <span className="text-slate-600 dark:text-slate-300">Patient Pay:</span>
                        <span className="text-right text-amber-600 dark:text-amber-400 font-black">
                          {formatCurr(patientPayNum)}
                        </span>

                        <span className="text-slate-600 dark:text-slate-300">Payment Received:</span>
                        <span className="text-right text-emerald-600 dark:text-emerald-400 font-black">
                          {formatCurr(paymentReceivedNum)}
                        </span>

                        <span className="text-slate-600 dark:text-slate-300">Total Deducted (Approved − Settlement):</span>
                        <span className="text-right text-rose-600 dark:text-rose-400 font-black">
                          {formatCurr(totalDeductedAmount)}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* CARD 6: ADMINISTRATIVE REMARKS */}
                <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200/70 dark:ring-slate-800">
                  <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold">
                      💬
                    </div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      ADMINISTRATIVE REMARKS
                    </h3>
                  </div>

                  <div>
                    <textarea
                      name="remark"
                      value={formData.remark || ''}
                      onChange={handleInputChange}
                      placeholder="Remarks / Additional Notes..."
                      rows={2}
                      className="form-textarea-styled text-xs font-semibold leading-relaxed"
                    />
                  </div>
                </div>

              </div>

            </div>
          </form>
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>All changes stored in local dossier state</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all uppercase tracking-wide hover:scale-105 active:scale-95 cursor-pointer"
            >
              CANCEL
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all flex items-center gap-2 uppercase tracking-wide hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>💾</span> {claimToEdit ? 'UPDATE RECORD' : 'SAVE CLAIM RECORD'}
            </button>
          </div>
        </div>

      </div>

      {/* Insurance Company List & Deletion Manager Modal */}
      <InsuranceCompanyManagerModal
        isOpen={isCompanyManagerOpen}
        onClose={() => setIsCompanyManagerOpen(false)}
        companies={insuranceCompaniesList}
        onUpdateList={(newList) => setInsuranceCompaniesList(newList)}
        onShowNotification={onShowNotification}
        selectedCompany={formData.insuranceCompany}
        onSelectCompany={(comp) => {
          setFormData(prev => ({ ...prev, insuranceCompany: comp }));
          setIsManualInsuranceEntry(false);
        }}
        themeMode={themeMode}
      />

      {/* Modal / Dialog Prompt for New TP Insurance & Address Permanent Save */}
      {isNewTpPromptOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#15151c] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black tracking-wide">Save New TPA &amp; Link Bank Details</h3>
                  <p className="text-[11px] text-purple-100">Permanently save to database with auto-fill bank configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTpPromptOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  TPA / INS. Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTpPromptName}
                  onChange={(e) => setNewTpPromptName(e.target.value.toUpperCase())}
                  placeholder="e.g. STAR HEALTH INSURANCE TPA"
                  className="form-input-styled font-semibold uppercase text-xs w-full"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Official Office Address
                  </label>
                  <span className="text-[10px] text-slate-400">Used for cover letter &amp; claims</span>
                </div>
                <textarea
                  value={newTpPromptAddress}
                  onChange={(e) => setNewTpPromptAddress(e.target.value.toUpperCase())}
                  placeholder="Enter complete office address (building, street, city, pin code)..."
                  rows={2}
                  className="form-textarea-styled text-xs font-medium w-full"
                />
              </div>

              {/* Bank Details Save Options */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🏥</span>
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Hospital Bank Details For This TPA <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-extrabold bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-800">
                    ⚡ Auto-fills in future
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Choose already saved bank details or enter new bank details. Future claims selecting <strong>{newTpPromptName || 'this TPA'}</strong> will automatically pull these bank details!
                </p>

                {/* Bank Options Selector Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBankSaveMode('saved')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      bankSaveMode === 'saved'
                        ? 'bg-white dark:bg-[#1e1e2d] text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200 dark:border-slate-700 font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>🏦</span>
                    <span>Already Saved Bank Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankSaveMode('new')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      bankSaveMode === 'new'
                        ? 'bg-white dark:bg-[#1e1e2d] text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200 dark:border-slate-700 font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>➕</span>
                    <span>New Bank Details</span>
                  </button>
                </div>

                {/* Option A: Already Saved Bank Details */}
                {bankSaveMode === 'saved' && (
                  <div className="space-y-2.5 bg-purple-50/60 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-200/70 dark:border-purple-900/40">
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select Bank Account Profile
                    </label>
                    <select
                      value={selectedBankProfileId}
                      onChange={(e) => setSelectedBankProfileId(e.target.value)}
                      className="form-select-styled font-semibold text-xs w-full bg-white dark:bg-[#0f0f18]"
                    >
                      {savedBankProfilesList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label || `${p.bankName} — ${p.bankAccountNo}`}
                        </option>
                      ))}
                    </select>

                    {/* Live Preview Card */}
                    {(() => {
                      const cur = savedBankProfilesList.find(p => p.id === selectedBankProfileId) || savedBankProfilesList[0];
                      if (!cur) return null;
                      return (
                        <div className="bg-white dark:bg-[#121218] p-3 rounded-lg border border-purple-200 dark:border-purple-800/80 text-[11px] space-y-1 shadow-2xs">
                          <div className="flex justify-between items-center text-slate-900 dark:text-white font-black">
                            <span className="text-purple-700 dark:text-purple-300 font-bold">{cur.bankName}</span>
                            <span className="font-mono text-slate-950 dark:text-white">A/C: {cur.bankAccountNo}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-0.5">
                            <span>IFSC: <strong className="text-slate-800 dark:text-slate-200 font-mono">{cur.ifscCode}</strong></span>
                            <span>PAN: <strong className="text-slate-800 dark:text-slate-200 font-mono">{cur.panCard || 'ABOFA7356E'}</strong></span>
                          </div>
                          {cur.bankAddress && (
                            <div className="text-slate-500 dark:text-slate-400 text-[10.5px] truncate pt-0.5">
                              📍 {cur.bankAddress}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Option B: Enter & Save New Bank Details */}
                {bankSaveMode === 'new' && (
                  <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Bank Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newBankName}
                          onChange={(e) => setNewBankName(e.target.value.toUpperCase())}
                          placeholder="e.g. STATE BANK OF INDIA"
                          className="form-input-styled uppercase text-xs w-full font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Account Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newBankAccountNo}
                          onChange={(e) => setNewBankAccountNo(e.target.value.trim())}
                          placeholder="e.g. 50200059120370"
                          className="form-input-styled font-mono text-xs w-full font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={newBankIfscCode}
                          onChange={(e) => setNewBankIfscCode(e.target.value.toUpperCase().trim())}
                          placeholder="e.g. SBIN0001234"
                          className="form-input-styled font-mono uppercase text-xs w-full font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                          PAN Card Number
                        </label>
                        <input
                          type="text"
                          value={newBankPanCard}
                          onChange={(e) => setNewBankPanCard(e.target.value.toUpperCase().trim())}
                          placeholder="e.g. ABOFA7356E"
                          className="form-input-styled font-mono uppercase text-xs w-full font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Bank Branch Address
                      </label>
                      <input
                        type="text"
                        value={newBankAddress}
                        onChange={(e) => setNewBankAddress(e.target.value.toUpperCase())}
                        placeholder="e.g. LINK ROAD, MAIN BRANCH, BILASPUR"
                        className="form-input-styled text-xs w-full font-medium"
                      />
                    </div>

                    <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveNewBankToGlobal}
                        onChange={(e) => setSaveNewBankToGlobal(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Save this bank profile for quick re-use across other TPAs
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsNewTpPromptOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewTpAndAddress}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save TPA &amp; Bank Details to Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheet & Apps Script Sync Diagnostic Modal */}
      {isSyncConfigOpen && (
        <div className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white dark:bg-[#14141c] border-2 border-purple-500/30 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm">
                  🔄
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Google Sheets &amp; Apps Script Sync
                    </h3>
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded font-black uppercase">
                      SEPARATE LOCATION 2
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    POLICY, INSURANCE &amp; TPA METADATA &bull; Live 3-Columns Synchronization Settings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncConfigOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Separate Location Identifier Banner */}
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <span className="font-bold text-purple-900 dark:text-purple-200">
                    SEPARATE SAVE LOCATION 2: POLICY, INSURANCE &amp; TPA METADATA
                  </span>
                </div>
                <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold">
                  Independent from Live Dashboard Sync
                </span>
              </div>

              {/* One-Click Load All 3 Columns Primary Feature Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-md border border-indigo-400/30 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-black flex items-center gap-2">
                    <span className="text-amber-400">⚡</span>
                    <span>Load All 3 Columns at One Go (Col A, Col B &amp; Col C)</span>
                    <span className="text-[9px] bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 px-1.5 py-0.5 rounded font-black uppercase">
                      No Duplicates
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-300 leading-tight">
                    Loads all 3 columns together at one go without loading separately again and again. Auto-filters duplicates!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadFromSpreadsheetLink}
                  disabled={isLoadingFromSpreadsheet}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all hover:scale-105 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  title="Loads Column A (TPAs), Column B (Insurers) and Column C (Addresses) at one go"
                >
                  <span>{isLoadingFromSpreadsheet ? '⏳' : '📥'}</span>
                  <span>{isLoadingFromSpreadsheet ? 'Loading All 3 Cols...' : 'Load All 3 Columns at One Go'}</span>
                </button>
              </div>

              {/* All 3 Columns In Separate Dedicated Panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* 1st Column: 1. TPA / INS. NAME */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50/50 dark:from-purple-950/40 dark:to-indigo-950/30 border-2 border-purple-300 dark:border-purple-800/80 space-y-1.5 shadow-xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        1st Col (Col A)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-black text-[10px]">
                        {tpaOptionsList.length} TPAs
                      </span>
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                      1.  TPA / INS. NAME
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                      Strictly loaded from 1st column of Google Sheet into TPA options &amp; database.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadColAOnlyModal}
                    disabled={isLoadingFromSpreadsheet}
                    className="w-full mt-2 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10.5px] shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
                    title="Load strictly Column 1 (Col A: 1.  TPA / INS. NAME)"
                  >
                    <span>📥</span>
                    <span>Load 1st Col Only (TPAs)</span>
                  </button>
                </div>

                {/* 2nd Column: 2. INSURANCE COMPANY (Sheet 2) */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/40 dark:to-blue-950/30 border-2 border-indigo-300 dark:border-indigo-800/80 space-y-1.5 shadow-xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        2nd Col (Col B • Sheet 2)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[10px]">
                        {insuranceCompaniesList.length} Insurers
                      </span>
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                      2. INSURANCE COMPANY
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                      Loaded directly from Sheet 2 Col A into Insurance Companies list. Existing data in Sheet 2 Col A is permanently preserved and never deleted on sync.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadColBOnlyModal}
                    disabled={isLoadingFromSpreadsheet}
                    className="w-full mt-2 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10.5px] shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
                    title="Load strictly Column 2 (Col B: 2. INSURANCE COMPANY from Sheet 2)"
                  >
                    <span>📥</span>
                    <span>Load 2nd Col Only (Sheet 2)</span>
                  </button>
                </div>

                {/* 3rd Column: 3. INSURANCE / TPA ADDRESS */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/30 border-2 border-emerald-300 dark:border-emerald-800/80 space-y-1.5 shadow-xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        3rd Col (Col C)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px]">
                        {Object.keys(savedAddressesMap).length} Addresses
                      </span>
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                      3. INSURANCE / TPA ADDRESS
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                      Strictly loaded from 3rd column of Google Sheet and auto-saved per TPA name.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadColCOnlyModal}
                    disabled={isLoadingFromSpreadsheet}
                    className="w-full mt-2 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10.5px] shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
                    title="Load strictly Column 3 (Col C: 3. INSURANCE / TPA ADDRESS)"
                  >
                    <span>📥</span>
                    <span>Load 3rd Col Only (Addresses)</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Sync Actions for All 3 Columns (Col A, Col B &amp; Col C):
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSaveSyncSettings}
                    disabled={isSavingSyncSettings}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-black text-[11px] shadow-sm transition-all flex items-center gap-1 cursor-pointer hover:scale-105 disabled:opacity-50"
                    title="Permanently save both URLs in code & database"
                  >
                    <span>{isSavedSuccess ? '✓' : '💾'}</span>
                    <span>{isSavedSuccess ? 'Saved Permanent!' : 'Save Permanent in Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePushMetadataToGoogleSheet()}
                    disabled={isPushingMetadata || isSyncingMetadata || isLoadingFromSpreadsheet}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10.5px] shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Send lists to Google Sheet (Col A: 1.  TPA / INS. NAME, Col B: 2. INSURANCE COMPANY, Col C: 3. INSURANCE / TPA ADDRESS)"
                  >
                    <span>📤</span>
                    <span>{isPushingMetadata ? 'Sending...' : 'Send to Sheet'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadFromSpreadsheetLink()}
                    disabled={isLoadingFromSpreadsheet || isPushingMetadata || isSyncingMetadata}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10.5px] shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Load all 3 columns at one go from Google Spreadsheet Link"
                  >
                    <span>📥</span>
                    <span>{isLoadingFromSpreadsheet ? 'Loading...' : 'Load All 3 Columns'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncMetadataFromUrl()}
                    disabled={isSyncingMetadata || isPushingMetadata || isLoadingFromSpreadsheet}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10.5px] shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Two-way synchronization of all 3 columns"
                  >
                    <span>🔄</span>
                    <span>{isSyncingMetadata ? 'Syncing...' : 'Sync Two-Way'}</span>
                  </button>
                </div>
              </div>

              {isSavedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
                  <span className="text-base text-emerald-600 dark:text-emerald-400">✓</span>
                  <span>
                    URLs saved permanent in code &amp; server configuration! They are permanently preserved and will not be deleted or reset until you manually change them.
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Google Apps Script Web App URL
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    🔒 Saves Permanently in Code
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    value={syncConfigUrl}
                    onChange={(e) => setSyncConfigUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="form-input-styled font-mono text-[11px] flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSyncSettings}
                    disabled={isSavingSyncSettings}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer shadow-sm transition-all flex items-center gap-1.5 shrink-0 hover:scale-102 disabled:opacity-50"
                    title="Permanently save this Apps Script URL into code & server"
                  >
                    <span>{isSavedSuccess ? '✓' : '💾'}</span>
                    <span>{isSavedSuccess ? 'Saved Permanent!' : 'Save URL Permanent'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestSyncConnection}
                    disabled={isTestingSyncUrl}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isTestingSyncUrl ? 'Testing...' : 'Test URL'}
                  </button>
                </div>
              </div>

              {syncTestMessage && (
                <div className={`p-3 rounded-xl text-[11px] leading-relaxed border ${
                  syncTestMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : syncTestMessage.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                }`}>
                  <div className="font-bold mb-1">{syncTestMessage.text}</div>
                  {syncTestMessage.type === 'success' && (
                    <button
                      type="button"
                      onClick={() => handlePushMetadataToGoogleSheet()}
                      disabled={isPushingMetadata}
                      className="mt-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-extrabold text-[10.5px] cursor-pointer shadow-xs inline-flex items-center gap-1"
                    >
                      <span>📤</span>
                      <span>Click to Send {tpaOptionsList.length} TPAs (Col A), {insuranceCompaniesList.length} Insurers (Col B) &amp; {Object.keys(savedAddressesMap).length} Addresses (Col C) to Google Sheet</span>
                    </button>
                  )}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Google Spreadsheet Link (Direct Load &amp; Live View)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      🔒 Saves Permanently in Code
                    </span>
                    {syncSpreadsheetUrl && (
                      <a
                        href={syncSpreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>↗️ Open Live Sheet</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    value={syncSpreadsheetUrl}
                    onChange={(e) => setSyncSpreadsheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="form-input-styled font-mono text-[11px] flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSyncSettings}
                    disabled={isSavingSyncSettings}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer shadow-sm transition-all flex items-center gap-1.5 shrink-0 hover:scale-102 disabled:opacity-50"
                    title="Permanently save this Google Spreadsheet link in code & server"
                  >
                    <span>{isSavedSuccess ? '✓' : '💾'}</span>
                    <span>{isSavedSuccess ? 'Saved Permanent!' : 'Save Link Permanent'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadFromSpreadsheetLink}
                    disabled={isLoadingFromSpreadsheet}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer shadow-sm transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    title="Load all 3 columns (TPAs, Insurance Companies & Addresses) directly from this Google Spreadsheet Link at one go"
                  >
                    <span>{isLoadingFromSpreadsheet ? '⏳' : '📥'}</span>
                    <span>{isLoadingFromSpreadsheet ? 'Loading All 3 Cols...' : 'Load All 3 Columns from Sheet'}</span>
                  </button>
                  {syncSpreadsheetUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(syncSpreadsheetUrl, '_blank')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer shrink-0 border border-slate-300 dark:border-slate-700"
                      title="Open spreadsheet in new browser tab"
                    >
                      ↗️ Open
                    </button>
                  )}
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Click <strong className="text-indigo-600 dark:text-indigo-300 font-bold">&ldquo;Load All 3 Columns from Sheet&rdquo;</strong> to pull and refresh TPAs (Column A), Insurance Companies (Column B), and Addresses (Column C) directly from this spreadsheet link in one go.
                </p>
              </div>

              {/* 3-Header Apps Script Section with Hide/Show Toggle */}
              <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl p-3.5 space-y-2.5 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div
                    onClick={() => setShowAppsScriptSection(prev => !prev)}
                    className="cursor-pointer select-none flex-1 min-w-[240px] group"
                    title={showAppsScriptSection ? "Click to hide Apps Script instructions" : "Click to show Apps Script instructions"}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black text-purple-900 dark:text-purple-300 text-[11.5px] uppercase tracking-wider group-hover:text-purple-700 dark:group-hover:text-purple-200 transition-colors">
                        ⚡ Apps Script for 3 Headers: 1.  TPA / INS. NAME • 2. INSURANCE COMPANY • 3. INSURANCE / TPA ADDRESS
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-200/80 dark:bg-purple-800/80 text-purple-800 dark:text-purple-200">
                        {showAppsScriptSection ? 'Shown' : 'Hidden'}
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-400 font-medium block mt-0.5">
                      Synchronizes all three columns live: Col A (1. TPA / INS. NAME), Col B (2. INSURANCE COMPANY), Col C (3. INSURANCE / TPA ADDRESS)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Hide / Show Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowAppsScriptSection(prev => !prev)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black rounded-lg border transition-all cursor-pointer shadow-xs ${
                        showAppsScriptSection
                          ? 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-100 border-purple-300 dark:border-purple-700'
                          : 'bg-white hover:bg-purple-50 dark:bg-purple-950/80 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:shadow'
                      }`}
                      title={showAppsScriptSection ? 'Click to hide Apps Script instructions & details' : 'Click to show Apps Script instructions & details'}
                    >
                      <span>{showAppsScriptSection ? '▲' : '▼'}</span>
                      <span>{showAppsScriptSection ? 'Hide Apps Script' : 'Show Apps Script'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(TPA_INSURANCE_TWO_HEADER_SCRIPT_CODE);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 2500);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black rounded-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-sm transition-all"
                    >
                      {copiedScript ? '✓ Copied 3-Header Code!' : '📋 Copy 3-Header Apps Script Code'}
                    </button>
                  </div>
                </div>

                {/* Only show when user clicks Show toggle, otherwise hidden */}
                {showAppsScriptSection && (
                  <div className="pt-2 border-t border-purple-200/80 dark:border-purple-800/60 space-y-2.5 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-black/30 border border-purple-200/80 dark:border-purple-800/50 rounded-lg p-2.5 text-[10.5px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                      <div className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400">
                        Row 1 Headers written to your Google Sheet:
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className="bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded font-bold text-purple-800 dark:text-purple-200">
                          Col A (1st Col): 1.  TPA / INS. NAME ({tpaOptionsList.length} rows)
                        </span>
                        <span className="bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded font-bold text-purple-800 dark:text-purple-200">
                          Col B (2nd Col • Sheet 2): 2. INSURANCE COMPANY ({insuranceCompaniesList.length} rows)
                        </span>
                        <span className="bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded font-bold text-purple-800 dark:text-purple-200">
                          Col C (3rd Col): 3. INSURANCE / TPA ADDRESS (Auto-saved per TPA)
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[10.5px] text-emerald-800 dark:text-emerald-300">
                      🛡️ <strong>7-Word Deduplication &amp; Address Link Protection:</strong> TPA names and their corresponding official addresses are automatically linked. If identical company or TPA names are found based on their starting first 7 words, duplicates are safely deduplicated without data loss.
                    </div>

                    <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong>How to deploy in 30 seconds:</strong> In your Google Spreadsheet, open <code className="font-mono bg-purple-100 dark:bg-purple-900/60 px-1 py-0.5 rounded">Extensions &gt; Apps Script</code>, paste this code into <code className="font-mono bg-purple-100 dark:bg-purple-900/60 px-1 py-0.5 rounded">Code.gs</code>, click <strong>Deploy &gt; New deployment &gt; Web app</strong>, set <em>Who has access: Anyone</em>, and copy your Web App URL here!
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveSyncSettings}
                disabled={isSavingSyncSettings}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-1.5 transition-all hover:scale-102 disabled:opacity-50"
              >
                <span>{isSavedSuccess ? '✓' : '💾'}</span>
                <span>{isSavedSuccess ? 'URLs Saved Permanent in Code & Server!' : 'Save URLs Permanent in Code'}</span>
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    handleSaveSyncSettings();
                    await handlePushMetadataToGoogleSheet();
                  }}
                  disabled={isPushingMetadata}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  title="Push lists to Google Sheet"
                >
                  <span>📤</span>
                  <span>{isPushingMetadata ? 'Sending...' : 'Send to Sheet'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    handleSaveSyncSettings();
                    await handleLoadFromSpreadsheetLink();
                  }}
                  disabled={isLoadingFromSpreadsheet}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  title="Load lists directly through Google Spreadsheet Link"
                >
                  <span>📥</span>
                  <span>{isLoadingFromSpreadsheet ? 'Loading...' : 'Load From Sheet'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    handleSaveSyncSettings();
                    await handleSyncMetadataFromUrl();
                  }}
                  disabled={isSyncingMetadata}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  title="Two-way sync: Push to sheet and load updates"
                >
                  <span>🔄</span>
                  <span>{isSyncingMetadata ? 'Syncing...' : 'Sync Two-Way'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSyncConfigOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 font-bold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TPA List & Deletion Manager Modal */}
      <TpaManagerModal
        isOpen={isTpaManagerOpen}
        onClose={() => setIsTpaManagerOpen(false)}
        tpaList={tpaOptionsList}
        onUpdateList={(newList) => setTpaOptionsList(newList)}
        onShowNotification={onShowNotification}
        selectedTpa={formData.tpaName}
        themeMode={themeMode}
        onSelectTpa={(tpa) => {
          setFormData(prev => {
            const next = { ...prev, tpaName: tpa };
            const matched = getMatchingInsuranceAddress(tpa) || getAllTpaInsuranceAddresses()[tpa.trim().toUpperCase()] || '';
            if (matched) {
              next.insuranceAddress = matched.toUpperCase();
              saveCustomTpaAddress(tpa, matched.toUpperCase());
              setSavedAddressesMap(getAllTpaInsuranceAddresses());
            }
            const bankInfo = getMatchingBankDetails(tpa);
            if (bankInfo) {
              if (bankInfo.bankName) next.bankName = (bankInfo.bankName || '').toUpperCase();
              if (bankInfo.bankAccountNo) next.bankAccountNo = (bankInfo.bankAccountNo || '').toUpperCase();
              if (bankInfo.ifscCode) next.ifscCode = (bankInfo.ifscCode || '').toUpperCase();
              if (bankInfo.bankAddress) next.bankAddress = (bankInfo.bankAddress || '').toUpperCase();
              if (bankInfo.panCard) next.panCard = (bankInfo.panCard || '').toUpperCase();
            }
            return next;
          });
        }}
      />


    </div>
  );
};

// Form Label Helper
const FormFieldLabel: React.FC<{ label: string; required?: boolean; className?: string }> = ({ label, required, className = '' }) => (
  <label className={`flex items-center justify-between text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 min-h-[16px] select-text cursor-text ${className}`}>
    <span className="truncate" title={label}>{label}</span>
    {required && <span className="text-rose-500 font-black text-[12px] ml-1 shrink-0" title="Required field">*</span>}
  </label>
);
