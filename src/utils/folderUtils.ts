import { formatDateForDisplay } from './formatters';

export interface PatientRecord {
  patientName?: string;
  uhid?: string;
  ipidNo?: string;
  ipdNo?: string;
  contactNumber?: string;
  mobileNumber?: string;
  mobile?: string;
  age?: string | number;
  gender?: string;
  admissionDate?: string;
  doa?: string;
  dischargeDate?: string;
  dod?: string;
  diagnosis?: string;
  surgeryName?: string;
  tpaCompanyName?: string;
  tpaName?: string;
  tpa?: string;
  insuranceCompanyName?: string;
  insuranceCompany?: string;
  totalBilledAmount?: number | string;
  totalBill?: number | string;
  initialApprovedAmount?: number | string;
  approved?: number | string;
  finalApprovedAmount?: number | string;
  discount?: number | string;
  settledAmount?: number | string;
  settlementAmount?: number | string;
  paymentReceived?: number | string;
  deduction?: number | string;
  utrNumber?: string;
  utr?: string;
  utrDate?: string;
  paymentDate?: string;
  payment_date?: string;
}

export function getFormattedFolderName(record: any): string {
  const name = (record.patientName || record.patient_name || record.name || 'Patient').trim();
  const tpa = (record.tpaCompanyName || record.tpaName || record.tpa || 'TPA').trim();
  const rawDoa = record.doa || record.admissionDate || '';
  const doaFormatted = formatDateForDisplay(rawDoa) || rawDoa || 'DOA';
  
  let folderName = `${name} ( ${tpa} ) ${doaFormatted}`.trim();
  // Strip characters not allowed in Windows folder paths: \ / : * ? " < > |
  folderName = folderName.replace(/[\\/:*?"<>|]/g, '_');
  return folderName || 'Patient_Folder';
}

export function formatCurrencyDefault(val: any): string {
  if (val === undefined || val === null || val === '') return '₹ 0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(num)) return '₹ 0.00';
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Downloads a single Windows .bat file to create folders for multiple patients in one click.
 */
export function downloadBatchFolderCreationScript(
  records: any[],
  destinationPath: string,
  formatCurrencyFn: (val: number) => string = formatCurrencyDefault
) {
  if (!records || records.length === 0) return;

  let rawPath = (destinationPath || "./PatientFolders").trim();
  let cleanPath = rawPath.replace(/\//g, "\\");

  const isAbsolute = /^[a-zA-Z]:\\/i.test(cleanPath) || 
                     cleanPath.startsWith("\\\\") || 
                     cleanPath.startsWith("%");

  if (!isAbsolute) {
    let relativeSub = cleanPath
      .replace(/^(\.\\|\.\/|\.)/g, '')
      .replace(/^\\+/g, '')
      .trim();
    if (relativeSub) {
      cleanPath = `%~dp0${relativeSub}`;
    } else {
      cleanPath = `%~dp0`;
    }
  }

  let mkdirCommands = "";
  records.forEach((record, index) => {
    const folderName = getFormattedFolderName(record);
    const pName = record.patientName || record.name || "N/A";

    mkdirCommands += `
echo [${index + 1}/${records.length}] Creating folder for: ${pName}...
mkdir "${cleanPath}\\${folderName}" 2>nul
`;
  });

  const batchContent = `@echo off
echo =========================================================
echo   Batch Patient Folders Automation Creator (${records.length} Folders)
echo   Format: Patient Name ( TPA NAME ) DOA
echo =========================================================
echo.
echo Target Location: ${cleanPath}
echo.
${mkdirCommands}
echo =========================================================
echo SUCCESS: All ${records.length} patient folders created successfully!
echo =========================================================
echo.
explorer "${cleanPath}" 2>nul
pause
exit
`;

  const blob = new Blob([batchContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Batch_Create_${records.length}_Folders.bat`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Modern HTML5 File System Access API helper to connect PC Folder directly.
 */
export async function connectPcFolder(): Promise<{ handle: any | null; pathName: string }> {
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      return { handle, pathName: `./${handle.name}` };
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('Directory picker warning:', e);
      }
      return { handle: null, pathName: '' };
    }
  }
  return { handle: null, pathName: '' };
}

/**
 * Creates folders directly on PC hard drive if directory handle is connected via File System Access API.
 */
export async function createPhysicalFoldersInHandle(
  dirHandle: any,
  records: any[],
  _formatCurrencyFn: (val: number) => string = formatCurrencyDefault
): Promise<number> {
  if (!dirHandle) return 0;
  let createdCount = 0;
  for (const record of records) {
    const folderName = getFormattedFolderName(record);
    try {
      await dirHandle.getDirectoryHandle(folderName, { create: true });
      createdCount++;
    } catch (e) {
      console.error('Failed creating subfolder in handle:', folderName, e);
    }
  }
  return createdCount;
}

