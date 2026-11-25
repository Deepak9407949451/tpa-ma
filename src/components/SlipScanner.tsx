import React, { useState, useRef, useEffect } from 'react';
import {
  ExtractedDocumentData,
  CardMember,
  DiscoveredNumberItem,
  cleanPatientName,
  cleanIpdNo,
  cleanUhid,
  cleanCodeOrId,
  parseDoaDate,
  matchTpaAndInsurance
} from '../utils/ocrParser';
import { runClientTesseractOCR } from '../utils/clientOcr';
import { Claim } from '../types';

export type ScanTargetMode = 'all' | 'admission' | 'insurance';

export interface ScannedFileItem {
  id: string;
  name: string;
  dataUrl: string;
  mime: string;
  isPdf: boolean;
}

interface SlipScannerProps {
  onScanComplete?: (data: ExtractedDocumentData, targetMode: ScanTargetMode, previewUrl?: string) => void;
  onApplyField?: (fieldName: string, value: any, fieldLabel: string) => void;
  onApplyAll?: (data: ExtractedDocumentData) => void;
  onApplyMember?: (member: CardMember) => void;
  formData?: Partial<Claim>;
  onShowNotification: (msg: string, type?: 'info' | 'success' | 'error') => void;
  currentPatientName?: string;
  defaultMode?: ScanTargetMode;
  compact?: boolean;
}

export const SlipScanner: React.FC<SlipScannerProps> = ({
  onScanComplete,
  onApplyField,
  onApplyAll,
  onApplyMember,
  formData,
  onShowNotification,
  currentPatientName = '',
  defaultMode = 'all',
  compact = false
}) => {
  const [targetMode, setTargetMode] = useState<ScanTargetMode>(defaultMode);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState('');
  const [scanEngineUsed, setScanEngineUsed] = useState<'gemini' | 'client_ocr' | null>(null);
  const [forceClientOcr, setForceClientOcr] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ScannedFileItem[]>([]);
  const [lastExtracted, setLastExtracted] = useState<ExtractedDocumentData | null>(null);
  const [appliedFieldKeys, setAppliedFieldKeys] = useState<string[]>([]);
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [selectedFieldKeysForBatch, setSelectedFieldKeysForBatch] = useState<string[]>([]);
  const [activeResultsTab, setActiveResultsTab] = useState<'all' | 'admission' | 'insurance' | 'numbers' | 'members' | 'raw'>('all');
  const [mappingPopoverNumber, setMappingPopoverNumber] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Convert File to base64 Data URL (optimizing images if necessary)
  const processFileToDataUrl = (file: File): Promise<{ dataUrl: string; isPdfFile: boolean; mime: string }> => {
    return new Promise((resolve, reject) => {
      const isPdfFile = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const reader = new FileReader();

      reader.onload = (e) => {
        const rawDataUrl = e.target?.result as string;
        if (!rawDataUrl) {
          return reject(new Error('Failed to read file contents'));
        }

        if (isPdfFile) {
          return resolve({ dataUrl: rawDataUrl, isPdfFile: true, mime: 'application/pdf' });
        }

        if (!file.type.startsWith('image/')) {
          return resolve({ dataUrl: rawDataUrl, isPdfFile: false, mime: file.type || 'image/jpeg' });
        }

        // Optimize image resolution if overly large for fast transmission
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 2048;
          const MAX_HEIGHT = 2048;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            } else {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
            resolve({ dataUrl: optimizedDataUrl, isPdfFile: false, mime: 'image/jpeg' });
          } else {
            resolve({ dataUrl: rawDataUrl, isPdfFile: false, mime: 'image/jpeg' });
          }
        };
        img.onerror = () => resolve({ dataUrl: rawDataUrl, isPdfFile: false, mime: file.type || 'image/jpeg' });
        img.src = rawDataUrl;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Perform scan with automatic on-device OCR fallback
  const performAiScan = async (
    filesToScan: ScannedFileItem[],
    preferClientOcr = forceClientOcr,
    modeToUse: ScanTargetMode = targetMode
  ) => {
    if (!filesToScan || filesToScan.length === 0) return;

    setIsScanning(true);
    const modeLabel = modeToUse === 'insurance' ? 'Insurance Card' : modeToUse === 'admission' ? 'Admission Slip' : 'Combined Documents';
    setScanStatusMsg(`Initiating scan for ${modeLabel}...`);

    let rawData: Partial<ExtractedDocumentData> | null = null;
    let engineUsed: 'gemini' | 'client_ocr' = 'gemini';

    if (!preferClientOcr) {
      try {
        setScanStatusMsg(`Scanning ${filesToScan.length} document(s) in ${modeLabel} mode with Gemini AI...`);
        const response = await fetch('/api/scan-admission-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: filesToScan.map(f => ({
              image: f.dataUrl,
              mimeType: f.mime
            })),
            targetMode: modeToUse
          })
        });

        if (response.ok) {
          const json = await response.json();
          if (json && json.data) {
            rawData = json.data;
            engineUsed = 'gemini';
          }
        } else {
          let errDetail = `Status ${response.status}`;
          try {
            const errJson = await response.json();
            if (errJson && errJson.error) errDetail = errJson.error;
          } catch {
            // ignore
          }
          console.warn('[SlipScanner] Server scan returned error, triggering automatic on-device OCR fallback:', errDetail);
        }
      } catch (cloudErr: any) {
        console.warn('[SlipScanner] Cloud scan failed, switching to on-device OCR:', cloudErr);
      }
    }

    // If Cloud OCR failed or preferClientOcr is true, run high-precision On-Device Tesseract OCR
    if (!rawData) {
      engineUsed = 'client_ocr';
      setScanStatusMsg(`⚡ Running On-Device OCR Scanner for ${modeLabel} (Zero Quota Limit)...`);
      try {
        const localExtracted = await runClientTesseractOCR(
          filesToScan,
          modeToUse,
          (_pct, status) => setScanStatusMsg(status)
        );
        rawData = localExtracted;
      } catch (localErr: any) {
        console.error('[SlipScanner] Both Cloud AI and On-Device OCR failed:', localErr);
        onShowNotification(`⚠️ Scan could not complete: ${localErr.message || 'Error processing document'}. You can fill the form fields manually.`, 'error');
        setIsScanning(false);
        setScanStatusMsg('');
        return;
      }
    }

    try {
      setScanEngineUsed(engineUsed);
      const raw: Partial<ExtractedDocumentData> = rawData || {};

      // Normalize extracted fields
      const cleanedPatient = cleanPatientName(raw.patientName || '');
      const cleanedIpd = cleanIpdNo(raw.ipdNo || '');
      const cleanedUhidNum = cleanUhid(raw.uhid || '');
      const cleanedDoa = parseDoaDate(raw.doa || '');
      const cleanedPolicy = cleanCodeOrId(raw.policyNumber || '');
      const cleanedEmpId = cleanCodeOrId(raw.empID || '');
      const cleanedMemberId = cleanCodeOrId(raw.insuranceID || '');

      const { tpaName, insuranceCompany } = matchTpaAndInsurance(
        raw.tpaName || raw.insuranceCompany || ''
      );

      // Clean members array if present
      const cleanedMembers: CardMember[] = (raw.members || []).map(m => ({
        name: cleanPatientName(m.name || ''),
        memberId: cleanCodeOrId(m.memberId || ''),
        relation: (m.relation || '').toUpperCase().trim(),
        ageGender: m.ageGender || '',
        dob: m.dob || ''
      })).filter(m => m.name || m.memberId);

      // Compile Discovered Numbers & Codes array
      const discoveredNumbersMap = new Map<string, DiscoveredNumberItem>();
      const addNum = (val?: string, label?: string, context?: string) => {
        if (!val) return;
        const v = String(val).trim();
        if (v.length >= 2 && !discoveredNumbersMap.has(v.toUpperCase())) {
          discoveredNumbersMap.set(v.toUpperCase(), { value: v, label: label || 'Identifier / Number', context });
        }
      };

      // Add structured numbers first
      if (cleanedIpd) addNum(cleanedIpd, 'IPD / Admission No', 'Inpatient Number');
      if (cleanedUhidNum) addNum(cleanedUhidNum, 'UHID / Reg No', 'Hospital Record Number');
      if (cleanedPolicy) addNum(cleanedPolicy, 'Policy Number', 'Insurance Policy Number');
      if (cleanedMemberId) addNum(cleanedMemberId, 'Member ID / Card No', 'Beneficiary Identifier');
      if (cleanedEmpId) addNum(cleanedEmpId, 'Employee ID', 'Corporate Employee ID');
      if (raw.claimNo) addNum(cleanCodeOrId(raw.claimNo), 'Claim / Pre-Auth No', 'Claim Reference');
      if (raw.mobileNumber) addNum(raw.mobileNumber, 'Mobile / Contact', 'Phone Number');
      if (raw.insuranceLimit) addNum(raw.insuranceLimit, 'Sum Insured / Limit', 'Coverage Limit');
      if (cleanedDoa) addNum(cleanedDoa, 'Admission Date', 'DOA');
      if (raw.dod) addNum(parseDoaDate(raw.dod), 'Discharge Date', 'DOD');

      // Add any members' member IDs
      cleanedMembers.forEach(m => {
        if (m.memberId) addNum(m.memberId, `Member ID (${m.name || 'Beneficiary'})`, m.relation || 'Member');
      });

      // Add discovered numbers from raw output or regex tokens
      if (Array.isArray(raw.discoveredNumbers)) {
        raw.discoveredNumbers.forEach(n => {
          if (n && n.value) addNum(n.value, n.label, n.context);
        });
      }

      // If raw text exists, extract additional numeric and alphanumeric codes
      const rawText = raw.rawExtractedText || '';
      if (rawText) {
        const matches = rawText.match(/\b(?:[A-Z]{1,4}[0-9]{3,}|[0-9]{3,}[A-Z0-9\/\-]*)\b/gi) || [];
        matches.slice(0, 30).forEach(m => {
          if (!/^(19\d\d|20\d\d)$/.test(m)) {
            addNum(m, 'Discovered Code / ID');
          }
        });
      }

      // Compile all lines
      let allLines: string[] = Array.isArray(raw.allTextLines) && raw.allTextLines.length > 0
        ? raw.allTextLines
        : rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      const finalExtracted: ExtractedDocumentData = {
        documentType: raw.documentType || (filesToScan.length > 1 ? 'combined' : modeToUse === 'insurance' ? 'insurance_card' : 'admission_slip'),
        patientName: cleanedPatient,
        ipdNo: cleanedIpd,
        uhid: cleanedUhidNum,
        doa: cleanedDoa,
        dod: parseDoaDate(raw.dod || ''),
        doctorName: raw.doctorName,
        ageGender: raw.ageGender,
        diagnosis: raw.diagnosis,
        surgeryName: raw.surgeryName,
        mobileNumber: raw.mobileNumber,
        tpaName: tpaName || raw.tpaName,
        insuranceCompany: insuranceCompany || raw.insuranceCompany,
        policyNumber: cleanedPolicy,
        empID: cleanedEmpId,
        insuranceID: cleanedMemberId,
        claimNo: raw.claimNo,
        insuranceLimit: raw.insuranceLimit,
        validFrom: parseDoaDate(raw.validFrom || ''),
        validUpto: parseDoaDate(raw.validUpto || ''),
        members: cleanedMembers,
        rawExtractedText: rawText,
        discoveredNumbers: Array.from(discoveredNumbersMap.values()),
        allTextLines: allLines
      };

      // If multiple members found, try auto-matching current form patient name
      if (cleanedMembers.length > 0) {
        const normCurrent = currentPatientName.trim().toUpperCase();
        let matchIdx = -1;
        if (normCurrent) {
          matchIdx = cleanedMembers.findIndex(m => 
            m.name.includes(normCurrent) || normCurrent.includes(m.name)
          );
        }
        if (matchIdx >= 0) {
          setSelectedMemberIndex(matchIdx);
          finalExtracted.patientName = cleanedMembers[matchIdx].name;
          finalExtracted.insuranceID = cleanedMembers[matchIdx].memberId;
        } else {
          setSelectedMemberIndex(0);
          if (!finalExtracted.insuranceID && cleanedMembers[0].memberId) {
            finalExtracted.insuranceID = cleanedMembers[0].memberId;
          }
        }
      }

      setLastExtracted(finalExtracted);
      
      // Determine initial applied fields if already present in formData
      const initialApplied: string[] = [];
      if (formData) {
        if (formData.patientName && finalExtracted.patientName && formData.patientName.trim().toUpperCase() === finalExtracted.patientName.trim().toUpperCase()) initialApplied.push('patientName');
        if (formData.ipdNo && finalExtracted.ipdNo && formData.ipdNo.trim().toUpperCase() === finalExtracted.ipdNo.trim().toUpperCase()) initialApplied.push('ipdNo');
        if (formData.uhid && finalExtracted.uhid && formData.uhid.trim().toUpperCase() === finalExtracted.uhid.trim().toUpperCase()) initialApplied.push('uhid');
        if (formData.doa && finalExtracted.doa && formData.doa.trim() === finalExtracted.doa.trim()) initialApplied.push('doa');
        if (formData.dod && finalExtracted.dod && formData.dod.trim() === finalExtracted.dod.trim()) initialApplied.push('dod');
        if (formData.insuranceCompany && finalExtracted.insuranceCompany && formData.insuranceCompany.trim().toUpperCase() === finalExtracted.insuranceCompany.trim().toUpperCase()) initialApplied.push('insuranceCompany');
        if (formData.tpaName && finalExtracted.tpaName && formData.tpaName.trim().toUpperCase() === finalExtracted.tpaName.trim().toUpperCase()) initialApplied.push('tpaName');
        if (formData.policyNumber && finalExtracted.policyNumber && formData.policyNumber.trim().toUpperCase() === finalExtracted.policyNumber.trim().toUpperCase()) initialApplied.push('policyNumber');
        if (formData.insuranceID && finalExtracted.insuranceID && formData.insuranceID.trim().toUpperCase() === finalExtracted.insuranceID.trim().toUpperCase()) initialApplied.push('insuranceID');
        if (formData.empID && finalExtracted.empID && formData.empID.trim().toUpperCase() === finalExtracted.empID.trim().toUpperCase()) initialApplied.push('empID');
        if (formData.claimNo && finalExtracted.claimNo && formData.claimNo.trim().toUpperCase() === finalExtracted.claimNo.trim().toUpperCase()) initialApplied.push('claimNo');
        if (formData.insuranceLimit && finalExtracted.insuranceLimit && formData.insuranceLimit.trim() === finalExtracted.insuranceLimit.trim()) initialApplied.push('insuranceLimit');
        if (formData.diagnosis && finalExtracted.diagnosis && formData.diagnosis.trim().toUpperCase() === finalExtracted.diagnosis.trim().toUpperCase()) initialApplied.push('diagnosis');
        if (formData.surgeryName && finalExtracted.surgeryName && formData.surgeryName.trim().toUpperCase() === finalExtracted.surgeryName.trim().toUpperCase()) initialApplied.push('surgeryName');
        if (formData.mobileNumber && finalExtracted.mobileNumber && formData.mobileNumber.trim() === finalExtracted.mobileNumber.trim()) initialApplied.push('mobileNumber');
      }
      setAppliedFieldKeys(initialApplied);

      // Select all extracted fields for batch apply by default
      const availableKeys: string[] = [];
      if (finalExtracted.patientName) availableKeys.push('patientName');
      if (finalExtracted.ipdNo) availableKeys.push('ipdNo');
      if (finalExtracted.uhid) availableKeys.push('uhid');
      if (finalExtracted.doa) availableKeys.push('doa');
      if (finalExtracted.dod) availableKeys.push('dod');
      if (finalExtracted.insuranceCompany) availableKeys.push('insuranceCompany');
      if (finalExtracted.tpaName) availableKeys.push('tpaName');
      if (finalExtracted.policyNumber) availableKeys.push('policyNumber');
      if (finalExtracted.insuranceID) availableKeys.push('insuranceID');
      if (finalExtracted.empID) availableKeys.push('empID');
      if (finalExtracted.claimNo) availableKeys.push('claimNo');
      if (finalExtracted.insuranceLimit) availableKeys.push('insuranceLimit');
      if (finalExtracted.doctorName) availableKeys.push('doctorName');
      if (finalExtracted.diagnosis) availableKeys.push('diagnosis');
      if (finalExtracted.surgeryName) availableKeys.push('surgeryName');
      if (finalExtracted.mobileNumber) availableKeys.push('mobileNumber');
      setSelectedFieldKeysForBatch(availableKeys);

      const docCountLabel = filesToScan.length > 1 
        ? `Cross-scanned ${filesToScan.length} documents collectively`
        : `Scanned ${finalExtracted.documentType === 'insurance_card' ? 'Insurance Card' : 'Admission Slip'}`;

      const engineBadge = engineUsed === 'client_ocr' ? ' (⚡ On-Device Engine)' : ' (✦ Cloud AI)';

      onShowNotification(
        `✓ ${docCountLabel}${engineBadge}! Found ${availableKeys.length} fields & ${(finalExtracted.discoveredNumbers || []).length} numbers. Click any item or '⚡ Apply All'.`,
        'success'
      );
    } catch (err: any) {
      console.error('Scan normalization error:', err);
      onShowNotification(
        `⚠️ Error processing scan results: ${err.message || 'Error processing files'}.`,
        'error'
      );
    } finally {
      setIsScanning(false);
      setScanStatusMsg('');
    }
  };

  // Handle mode selection (Admission, Insurance Card, All/Auto)
  const handleSelectTargetMode = async (newMode: ScanTargetMode) => {
    setTargetMode(newMode);
    setActiveResultsTab(newMode === 'all' ? 'all' : newMode);
    
    if (uploadedFiles.length > 0) {
      const modeTitle = newMode === 'admission' ? 'Admission Slip' : newMode === 'insurance' ? 'Insurance Card' : 'All Documents';
      onShowNotification(`🔍 Re-analyzing ${uploadedFiles.length} document(s) with focus on ${modeTitle}...`, 'info');
      await performAiScan(uploadedFiles, forceClientOcr, newMode);
    }
  };

  // Handle incoming list of files (from file picker, drop, or camera)
  const handleAddFiles = async (fileList: FileList | File[], append = false) => {
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const validFiles = filesArray.filter(f => {
      const isPdfFile = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      const isImage = f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|bmp|heic)$/i);
      return isPdfFile || isImage;
    });

    if (validFiles.length === 0) {
      onShowNotification('Please upload valid images (JPG, PNG, WEBP) or PDF documents.', 'error');
      return;
    }

    try {
      const processedItems: ScannedFileItem[] = [];
      for (const file of validFiles) {
        const { dataUrl, isPdfFile, mime } = await processFileToDataUrl(file);
        processedItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          dataUrl,
          mime,
          isPdf: isPdfFile
        });
      }

      const updatedQueue = append ? [...uploadedFiles, ...processedItems] : processedItems;
      setUploadedFiles(updatedQueue);

      // Trigger scan immediately
      await performAiScan(updatedQueue, forceClientOcr, targetMode);
    } catch (err: any) {
      console.error('Error processing files for upload:', err);
      onShowNotification(`Error loading files: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  // Remove a specific file from the queue
  const handleRemoveFile = async (idToRemove: string) => {
    const updated = uploadedFiles.filter(f => f.id !== idToRemove);
    setUploadedFiles(updated);

    if (updated.length === 0) {
      handleClearAll();
    } else {
      await performAiScan(updated, forceClientOcr, targetMode);
    }
  };

  // Clear all uploaded files and extracted state
  const handleClearAll = () => {
    setUploadedFiles([]);
    setLastExtracted(null);
    setAppliedFieldKeys([]);
    setSelectedMemberIndex(null);
    setMappingPopoverNumber(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (addMoreInputRef.current) addMoreInputRef.current.value = '';
  };

  const handleClearExtracted = () => {
    setLastExtracted(null);
    setAppliedFieldKeys([]);
    setSelectedMemberIndex(null);
    setMappingPopoverNumber(null);
  };

  // Check if a field has been applied or matches current form data
  const isFieldApplied = (key: string, val?: any): boolean => {
    if (appliedFieldKeys.includes(key)) return true;
    if (!formData || !val) return false;
    const formVal = (formData as any)[key];
    if (!formVal) return false;
    return String(formVal).trim().toUpperCase() === String(val).trim().toUpperCase();
  };

  // Click individual field to apply to form
  const handleFieldClick = (fieldKey: string, value: any, fieldLabel: string) => {
    if (!value) return;
    setAppliedFieldKeys(prev => (prev.includes(fieldKey) ? prev : [...prev, fieldKey]));
    if (onApplyField) {
      onApplyField(fieldKey, value, fieldLabel);
    } else if (onScanComplete && lastExtracted) {
      onScanComplete({ ...lastExtracted, [fieldKey]: value }, targetMode);
    }
  };

  // Map arbitrary number/token to a specific field
  const handleMapNumberToField = (fieldKey: string, value: string, fieldLabel: string) => {
    if (!value) return;
    setAppliedFieldKeys(prev => (prev.includes(fieldKey) ? prev : [...prev, fieldKey]));
    if (onApplyField) {
      onApplyField(fieldKey, value, fieldLabel);
    }
    setMappingPopoverNumber(null);
    onShowNotification(`✓ Filled "${value}" into ${fieldLabel}!`, 'success');
  };

  // Toggle selection of a single field for batch apply
  const handleToggleSelectField = (fieldKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFieldKeysForBatch(prev =>
      prev.includes(fieldKey) ? prev.filter(k => k !== fieldKey) : [...prev, fieldKey]
    );
  };

  // Toggle select / deselect all
  const handleToggleSelectAll = () => {
    if (!lastExtracted) return;
    const allAvailable = extractedFieldList.map(f => f.key);
    if (selectedFieldKeysForBatch.length === allAvailable.length) {
      setSelectedFieldKeysForBatch([]);
    } else {
      setSelectedFieldKeysForBatch(allAvailable);
    }
  };

  // Apply selected batch of fields
  const handleApplySelectedBatch = () => {
    if (!lastExtracted || selectedFieldKeysForBatch.length === 0) {
      onShowNotification('Please select at least one field to apply.', 'info');
      return;
    }

    const partialData: Partial<ExtractedDocumentData> = {};
    for (const key of selectedFieldKeysForBatch) {
      const val = (lastExtracted as any)[key];
      if (val !== undefined && val !== null && val !== '') {
        (partialData as any)[key] = val;
        if (onApplyField) {
          const item = extractedFieldList.find(f => f.key === key);
          onApplyField(key, val, item?.label || key);
        }
      }
    }

    if (!onApplyField && onScanComplete) {
      onScanComplete(partialData as ExtractedDocumentData, targetMode, uploadedFiles[0]?.dataUrl);
    }

    setAppliedFieldKeys(prev => Array.from(new Set([...prev, ...selectedFieldKeysForBatch])));
    onShowNotification(`✓ Applied ${selectedFieldKeysForBatch.length} selected field(s) to the claim form!`, 'success');
  };

  // Apply all extracted fields at once
  const handleApplyAll = () => {
    if (!lastExtracted) return;
    if (onApplyAll) {
      onApplyAll(lastExtracted);
    } else if (onScanComplete) {
      onScanComplete(lastExtracted, targetMode, uploadedFiles[0]?.dataUrl);
    }
    
    // Mark all available fields as applied
    const allKeys: string[] = extractedFieldList.map(f => f.key);
    setAppliedFieldKeys(allKeys);
    setSelectedFieldKeysForBatch(allKeys);
    onShowNotification(`✓ Auto-filled all ${allKeys.length} scanned details into form boxes!`, 'success');
  };

  const handleSelectMember = (idx: number) => {
    if (!lastExtracted || !lastExtracted.members || !lastExtracted.members[idx]) return;
    setSelectedMemberIndex(idx);
    const member = lastExtracted.members[idx];
    
    setAppliedFieldKeys(prev => {
      const set = new Set(prev);
      if (member.name) set.add('patientName');
      if (member.memberId) set.add('insuranceID');
      return Array.from(set);
    });

    if (onApplyMember) {
      onApplyMember(member);
    } else if (onApplyField) {
      if (member.name) onApplyField('patientName', member.name, 'Patient Name');
      if (member.memberId) onApplyField('insuranceID', member.memberId, 'Member ID');
    } else if (onScanComplete) {
      const updated: ExtractedDocumentData = {
        ...lastExtracted,
        patientName: member.name || lastExtracted.patientName,
        insuranceID: member.memberId || lastExtracted.insuranceID
      };
      setLastExtracted(updated);
      onScanComplete(updated, targetMode, uploadedFiles[0]?.dataUrl);
    }
  };

  // Support global / modal paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1 || items[i].type === 'application/pdf') {
          const file = items[i].getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        handleAddFiles(pastedFiles, true);
        onShowNotification(`📋 Pasted ${pastedFiles.length} image(s) from clipboard`, 'info');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [targetMode, currentPatientName, uploadedFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files, uploadedFiles.length > 0);
    }
  };

  const extractedFieldList = lastExtracted ? [
    { key: 'patientName', label: 'Patient Name', value: lastExtracted.patientName, icon: '👤', category: 'admission' },
    { key: 'ipdNo', label: 'IPD / IP Number', value: lastExtracted.ipdNo, icon: '🏥', category: 'admission', mono: true },
    { key: 'uhid', label: 'UHID / Reg ID', value: lastExtracted.uhid, icon: '🆔', category: 'admission', mono: true },
    { key: 'doa', label: 'Admission Date (DOA)', value: lastExtracted.doa, icon: '📅', category: 'admission' },
    { key: 'dod', label: 'Discharge Date (DOD)', value: lastExtracted.dod, icon: '📅', category: 'admission' },
    { key: 'insuranceCompany', label: 'Insurance Company', value: lastExtracted.insuranceCompany, icon: '🛡️', category: 'insurance' },
    { key: 'tpaName', label: 'TPA Name', value: lastExtracted.tpaName, icon: '🏢', category: 'insurance' },
    { key: 'policyNumber', label: 'Policy Number', value: lastExtracted.policyNumber, icon: '📄', category: 'insurance', mono: true },
    { key: 'insuranceID', label: 'Member ID / Card ID', value: lastExtracted.insuranceID, icon: '💳', category: 'insurance', mono: true },
    { key: 'empID', label: 'Employee ID', value: lastExtracted.empID, icon: '💼', category: 'insurance', mono: true },
    { key: 'claimNo', label: 'Claim / Pre-Auth No', value: lastExtracted.claimNo, icon: '🔖', category: 'insurance', mono: true },
    { key: 'insuranceLimit', label: 'Sum Insured / Limit', value: lastExtracted.insuranceLimit, icon: '💰', category: 'insurance' },
    { key: 'doctorName', label: 'Doctor / Consultant', value: lastExtracted.doctorName, icon: '👨‍⚕️', category: 'admission' },
    { key: 'diagnosis', label: 'Diagnosis / Ward', value: lastExtracted.diagnosis, icon: '🩺', category: 'admission' },
    { key: 'surgeryName', label: 'Surgery / Procedure', value: lastExtracted.surgeryName, icon: '💉', category: 'admission' },
    { key: 'mobileNumber', label: 'Mobile Number', value: lastExtracted.mobileNumber, icon: '📞', category: 'admission' },
  ].filter(f => Boolean(f.value && String(f.value).trim())) : [];

  const discoveredNumbers = lastExtracted?.discoveredNumbers || [];
  const textLines = lastExtracted?.allTextLines || [];

  return (
    <div
      id="ai-slip-scanner-box"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
        isDragging
          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg scale-[1.005]'
          : 'border-indigo-300/70 dark:border-indigo-800/70 bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-white dark:from-[#11111e] dark:via-[#16122d] dark:to-[#0e0e18] shadow-sm'
      }`}
    >
      {/* Hidden file inputs supporting multiple selection */}
      <input
        id="slip-scanner-file-input"
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAddFiles(e.target.files, false);
          }
        }}
      />
      <input
        ref={addMoreInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAddFiles(e.target.files, true);
          }
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAddFiles(e.target.files, uploadedFiles.length > 0);
          }
        }}
      />

      <div className="p-3.5 sm:p-4">
        {/* TOP ROW: Header, Mode Selector Tabs & Upload Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-200/60 dark:border-indigo-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center text-sm font-black shadow-md shadow-indigo-500/30">
              ✨
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>AI Multi-Image Slip & Card Auto-Fill</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                  Multiple Images & PDFs
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Upload <strong>Admission Slip</strong> & <strong>Insurance Card (Front/Back)</strong> together for complete auto-fill
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs (Admission / Insurance Card / All Auto) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-indigo-200 dark:border-indigo-800/80 shadow-xs">
              <button
                type="button"
                onClick={() => handleSelectTargetMode('all')}
                className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  targetMode === 'all'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Cross-scan all attached documents collectively and extract all numbers and text"
              >
                <span>📑</span>
                <span>All / Auto</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectTargetMode('admission')}
                className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  targetMode === 'admission'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Special focus on IPD, UHID, Patient Name, Admission Date (DOA), Doctor & all admission numbers/text"
              >
                <span>🏥</span>
                <span>Admission</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectTargetMode('insurance')}
                className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  targetMode === 'insurance'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Special focus on Policy No, Member ID, Emp ID, Claim No, Sum Insured, TPA, Insurer & covered members"
              >
                <span>💳</span>
                <span>Insurance Card</span>
              </button>
            </div>

            {/* Offline / On-Device Engine Toggle */}
            <button
              type="button"
              onClick={() => setForceClientOcr(!forceClientOcr)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                forceClientOcr
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-400 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-indigo-400'
              }`}
              title="Toggle to force On-Device OCR Scanner (bypasses all Gemini API quotas completely)"
            >
              <span>{forceClientOcr ? '⚡' : '✦'}</span>
              <span>{forceClientOcr ? 'On-Device OCR (Zero Quota)' : 'Auto Cloud AI + Fallback'}</span>
            </button>
          </div>

          {/* Upload, Camera & Clear Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isScanning}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Select one or multiple images/PDFs from device"
            >
              <span>📁 Upload Images / Cards</span>
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => cameraInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-600 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Take photo from camera"
            >
              <span>📸 Camera</span>
            </button>

            {uploadedFiles.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-xs transition-colors cursor-pointer border border-transparent hover:border-rose-300 dark:hover:border-rose-800"
                title="Clear all attached files"
              >
                ✕ Clear All
              </button>
            )}
          </div>
        </div>

        {/* MULTI-IMAGE THUMBNAIL GALLERY STRIP (When files are uploaded) */}
        {uploadedFiles.length > 0 && (
          <div className="mt-3 p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wide flex items-center gap-1.5">
                  <span>🖼️</span> Attached Documents ({uploadedFiles.length}):
                </span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-md">
                  All images cross-analyzed together
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => addMoreInputRef.current?.click()}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors"
                  title="Upload additional image (e.g. Card Back, Admission Slip, Sticker)"
                >
                  ➕ Add More Image
                </button>
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => performAiScan(uploadedFiles, false, targetMode)}
                  className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:text-purple-800 flex items-center gap-1 bg-purple-100 dark:bg-purple-950/50 px-2.5 py-1 rounded-lg border border-purple-300 dark:border-purple-800 cursor-pointer transition-colors"
                  title="Re-scan all attached images with Gemini AI"
                >
                  ✦ AI Re-Scan
                </button>
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => performAiScan(uploadedFiles, true, targetMode)}
                  className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 flex items-center gap-1 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 cursor-pointer transition-colors"
                  title="Scan using On-Device OCR Engine (Zero quota consumption)"
                >
                  ⚡ On-Device OCR
                </button>
              </div>
            </div>

            {/* Thumbnails Row */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-1">
              {uploadedFiles.map((fileItem, idx) => (
                <div
                  key={fileItem.id}
                  className="relative group flex-shrink-0 w-24 h-24 rounded-xl border-2 border-indigo-300 dark:border-indigo-700 overflow-hidden bg-slate-900 shadow-sm"
                >
                  {fileItem.isPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white p-1 text-center">
                      <span className="text-xl">📄</span>
                      <span className="text-[9px] font-bold truncate max-w-full px-1">{fileItem.name}</span>
                    </div>
                  ) : (
                    <img
                      src={fileItem.dataUrl}
                      alt={fileItem.name}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Document sequence label badge */}
                  <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                    #{idx + 1}
                  </span>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(fileItem.id);
                    }}
                    title={`Remove ${fileItem.name}`}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white font-black text-[10px] flex items-center justify-center shadow transition-transform hover:scale-110 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Quick Add More Box */}
              <button
                type="button"
                disabled={isScanning}
                onClick={() => addMoreInputRef.current?.click()}
                className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 flex flex-col items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 cursor-pointer transition-all"
              >
                <span className="text-lg">➕</span>
                <span className="text-[10px] font-bold text-center leading-tight">Add Another<br />Slip / Card</span>
              </button>
            </div>
          </div>
        )}

        {/* Scanning State Loader */}
        {isScanning && (
          <div className="mt-3 p-4 bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center gap-3.5 animate-pulse">
            <div className="w-8 h-8 rounded-full border-3 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
            <div className="space-y-0.5">
              <div className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <span>
                  {scanStatusMsg || `Scanning ${uploadedFiles.length > 1 ? `${uploadedFiles.length} Documents Collectively` : targetMode === 'insurance' ? 'Insurance Card' : targetMode === 'admission' ? 'Admission Slip' : 'Document'}...`}
                </span>
              </div>
              <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                Extracting Admission details (IPD, UHID, DOA, Doctor) + Policy details (Insurer, TPA, Policy No, Member ID, Emp ID) & all numbers...
              </div>
            </div>
          </div>
        )}

        {/* Extracted Fields Interactive Selection Area */}
        {!isScanning && lastExtracted && (
          <div className="mt-3 p-4 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-emerald-500/10 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-emerald-950/30 border-2 border-indigo-300 dark:border-indigo-700/80 rounded-2xl space-y-3 shadow-sm">
            {/* Header with engine badge and main action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-indigo-200 dark:border-indigo-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="text-sm">🎯</span> Scanned Results Dashboard:
                </span>
                {scanEngineUsed === 'client_ocr' ? (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <span>⚡</span> On-Device OCR Engine
                  </span>
                ) : (
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-300 dark:border-purple-700 flex items-center gap-1">
                    <span>✦</span> Gemini Cloud AI
                  </span>
                )}
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-700">
                  {extractedFieldList.length} fields | {discoveredNumbers.length} numbers
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleApplySelectedBatch}
                  disabled={selectedFieldKeysForBatch.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Apply checked fields only to the form"
                >
                  <span>✓</span>
                  <span>Apply Selected ({selectedFieldKeysForBatch.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyAll}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-emerald-400/40"
                  title="Fill all extracted values into their matching form boxes at once"
                >
                  <span>⚡</span>
                  <span>Apply All ({extractedFieldList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearExtracted}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-400 hover:text-rose-600 font-bold text-xs transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
                  title="Dismiss extracted items"
                >
                  ✕ Dismiss
                </button>
              </div>
            </div>

            {/* SELECTION TABS BAR & SELECT ALL TOGGLE */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 p-1 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveResultsTab('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeResultsTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🌟 All Fields</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                    {extractedFieldList.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab('admission')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeResultsTab === 'admission'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🏥 Admission</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                    {extractedFieldList.filter(f => f.category === 'admission').length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab('insurance')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeResultsTab === 'insurance'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🛡️ Policy & TPA</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                    {extractedFieldList.filter(f => f.category === 'insurance').length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab('numbers')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeResultsTab === 'numbers'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🔢 All Numbers & Codes</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                    {discoveredNumbers.length}
                  </span>
                </button>
                {lastExtracted.members && lastExtracted.members.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveResultsTab('members')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      activeResultsTab === 'members'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>👥 Members</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                      {lastExtracted.members.length}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveResultsTab('raw')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeResultsTab === 'raw'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📝 OCR Text Lines</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                    {textLines.length}
                  </span>
                </button>
              </div>

              {/* Select all toggle checkbox */}
              {activeResultsTab !== 'raw' && activeResultsTab !== 'numbers' && (
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-white/70 dark:bg-slate-900/60 px-2.5 py-1 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 hover:border-indigo-400">
                  <input
                    type="checkbox"
                    checked={extractedFieldList.length > 0 && selectedFieldKeysForBatch.length === extractedFieldList.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Select All ({selectedFieldKeysForBatch.length}/{extractedFieldList.length})</span>
                </label>
              )}
            </div>

            {/* TAB CONTENT: FIELDS GRID */}
            {activeResultsTab !== 'raw' && activeResultsTab !== 'members' && activeResultsTab !== 'numbers' && (
              <>
                {extractedFieldList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {extractedFieldList
                      .filter(item => activeResultsTab === 'all' || item.category === activeResultsTab)
                      .map((item) => {
                        const isApplied = isFieldApplied(item.key, item.value);
                        const isChecked = selectedFieldKeysForBatch.includes(item.key);
                        return (
                          <div
                            key={item.key}
                            onClick={() => handleFieldClick(item.key, item.value, item.label)}
                            className={`relative p-2.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-1.5 cursor-pointer select-none group ${
                              isApplied
                                ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-600 shadow-xs ring-1 ring-emerald-400/30'
                                : isChecked
                                ? 'bg-white dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-600 shadow-xs ring-1 ring-indigo-400/20'
                                : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 shadow-xs'
                            }`}
                            title={`Click to fill "${item.value}" into ${item.label} box`}
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <div className="flex items-center gap-1.5 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleSelectField(item.key);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  title="Check to include in batch apply"
                                />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                                  <span>{item.icon}</span>
                                  <span>{item.label}</span>
                                </span>
                              </div>
                              {isApplied ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-600 text-white shadow-2xs shrink-0 flex items-center gap-0.5">
                                  <span>✓</span> Filled
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 flex items-center gap-0.5">
                                  <span>➕</span> Fill
                                </span>
                              )}
                            </div>

                            <div className={`text-xs font-black truncate w-full mt-0.5 ${
                              item.mono ? 'font-mono' : ''
                            } ${
                              isApplied
                                ? 'text-emerald-900 dark:text-emerald-200'
                                : 'text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300'
                            }`}>
                              {item.value}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic text-center py-4 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                    No distinct textual fields recognized in this category. You can try clicking another tab or uploading a clearer image.
                  </div>
                )}
              </>
            )}

            {/* TAB CONTENT: ALL NUMBERS & CODES PALETTE */}
            {activeResultsTab === 'numbers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                    <span>🔢</span> All Discovered Numbers & Codes ({discoveredNumbers.length}):
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Click any number to fill it into a form box or copy to clipboard
                  </span>
                </div>

                {discoveredNumbers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {discoveredNumbers.map((numItem, idx) => (
                      <div
                        key={`${numItem.value}-${idx}`}
                        className="p-2.5 bg-white/95 dark:bg-slate-900/90 rounded-xl border border-amber-300/80 dark:border-amber-700/80 hover:border-amber-500 shadow-xs flex flex-col justify-between gap-1.5 transition-all"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider truncate">
                            {numItem.label || 'Code / Number'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(numItem.value);
                              onShowNotification(`✓ Copied "${numItem.value}" to clipboard!`, 'info');
                            }}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-600 dark:text-slate-300 rounded font-bold cursor-pointer"
                            title="Copy number"
                          >
                            📋 Copy
                          </button>
                        </div>

                        <div className="font-mono font-black text-xs text-slate-900 dark:text-white break-all">
                          {numItem.value}
                        </div>

                        {numItem.context && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {numItem.context}
                          </div>
                        )}

                        {/* Quick 1-Click Fill Buttons */}
                        <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleMapNumberToField('ipdNo', numItem.value, 'IPD Number')}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white cursor-pointer transition-colors"
                          >
                            + IPD
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMapNumberToField('uhid', numItem.value, 'UHID')}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
                          >
                            + UHID
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMapNumberToField('policyNumber', numItem.value, 'Policy Number')}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white cursor-pointer transition-colors"
                          >
                            + Policy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMapNumberToField('insuranceID', numItem.value, 'Member ID')}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white cursor-pointer transition-colors"
                          >
                            + Member ID
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMapNumberToField('empID', numItem.value, 'Employee ID')}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-600 hover:text-white cursor-pointer transition-colors"
                          >
                            + Emp ID
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMapNumberToField('claimNo', numItem.value, 'Claim Number')}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white cursor-pointer transition-colors"
                          >
                            + Claim No
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic text-center py-4 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                    No individual numbers isolated yet. Upload a document or slip to view discovered numbers.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: MEMBERS */}
            {activeResultsTab === 'members' && lastExtracted.members && lastExtracted.members.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-purple-900 dark:text-purple-300 flex items-center gap-1">
                    <span>👥</span> Covered Member Beneficiaries on Card (Click to select patient & Member ID):
                  </span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-md">
                    {lastExtracted.members.length} covered members
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {lastExtracted.members.map((m, idx) => {
                    const isSelected = selectedMemberIndex === idx || (
                      formData?.patientName && m.name &&
                      formData.patientName.trim().toUpperCase() === m.name.trim().toUpperCase()
                    );
                    return (
                      <button
                        key={`${m.memberId}-${idx}`}
                        type="button"
                        onClick={() => handleSelectMember(idx)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-400/40'
                            : 'bg-white/90 dark:bg-slate-900/90 hover:bg-purple-50 dark:hover:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {m.name || 'Covered Member'}
                          </span>
                          {m.relation && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              isSelected ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {m.relation}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className={`font-mono font-bold ${isSelected ? 'text-purple-200' : 'text-purple-600 dark:text-purple-400'}`}>
                            ID: {m.memberId}
                          </span>
                          {isSelected ? (
                            <span className="text-[10px] font-black text-amber-300">✓ Selected</span>
                          ) : (
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Click to Select</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: RAW TEXT & OCR TEXT LINES */}
            {activeResultsTab === 'raw' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <span>📄</span> Extracted OCR Text Lines ({textLines.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const full = lastExtracted.rawExtractedText || textLines.join('\n');
                      if (full) {
                        navigator.clipboard.writeText(full);
                        onShowNotification('✓ Copied full OCR text to clipboard!', 'success');
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold border border-slate-600 cursor-pointer flex items-center gap-1"
                  >
                    📋 Copy All Text
                  </button>
                </div>

                {textLines.length > 0 ? (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                    {textLines.map((line, lIdx) => (
                      <div
                        key={lIdx}
                        className="p-1.5 rounded bg-slate-900/90 border border-slate-800/80 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-300 hover:bg-slate-850"
                      >
                        <span className="truncate">{line}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(line);
                              onShowNotification(`✓ Copied line: "${line}"`, 'info');
                            }}
                            className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-950/80 p-3 rounded-lg max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                    {lastExtracted.rawExtractedText || 'No raw text available.'}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Drag / Paste Hint */}
        {!isScanning && uploadedFiles.length === 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
            <span className="flex items-center gap-1.5">
              <span>💡</span>
              <span>
                Upload or drag <strong>multiple files</strong> (e.g. Admission Slip + Insurance Card Front/Back), or press <strong>Ctrl+V</strong> to paste.
              </span>
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
              Supports Star Health, Niva Bupa, Care, HDFC, MediAssist, Vidal & all Indian TPAs
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
