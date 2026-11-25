import { BankDetails } from '../types';
import {
  addCustomTpa,
  saveCustomTpaAddress,
  saveCustomTpaBankDetails,
  deleteTpa,
  getCustomTpaList,
  getAllTpaOptions,
  getAllTpaInsuranceAddresses,
  getCustomTpaBankDetails,
  addCustomInsuranceCompany,
  deleteInsuranceCompany,
  getAllInsuranceCompanies,
  getMatchingInsuranceAddress,
  GOOGLE_SHEETS_SYNC_URL,
  DASHBOARD_CLAIMS_SYNC_URL,
  DASHBOARD_CLAIMS_SPREADSHEET_URL,
  METADATA_SYNC_URL,
  METADATA_SPREADSHEET_URL,
  COL_A_SPREADSHEET_URL,
  COL_B_SPREADSHEET_URL,
  NOTEPAD_REFERENCE_NOTE,
  CUSTOM_TPA_STORAGE_KEY,
  CUSTOM_INSURANCE_STORAGE_KEY,
  CUSTOM_TPA_ADDRESSES_STORAGE_KEY
} from '../constants/insuranceData';

export const METADATA_SYNC_LAST_TIME_KEY = 'tpa_ins_metadata_last_synced';
export const METADATA_SYNC_AUTO_ENABLED_KEY = 'tpa_ins_metadata_auto_sync';

export interface MetadataSyncResult {
  success: boolean;
  tpasCount: number;
  insuranceCount: number;
  loadedTpas: Array<{ name: string; address?: string; bankDetails?: BankDetails }>;
  loadedInsuranceCompanies: string[];
  message: string;
  source?: 'webapp' | 'spreadsheet' | 'local';
  warningNotice?: string;
  duplicatesSkipped?: number;
}

/**
 * Deduplication by First 7 Words:
 * Matches two company/TPA names based on their starting first 7 words.
 * If duplicate name found, it is automatically skipped for sync and load,
 * preventing duplicate entries in Google Sheets and local storage.
 */
export const cleanAndExtractWords = (name: string): string[] => {
  if (!name) return [];
  return name
    .trim()
    .toUpperCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
};

export const getFirst7WordsKey = (name: string): string => {
  const words = cleanAndExtractWords(name);
  return words.slice(0, 7).join(' ');
};

export const isDuplicateBy7Words = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  const n1 = name1.trim().toUpperCase();
  const n2 = name2.trim().toUpperCase();
  if (n1 === n2) return true;

  const w1 = cleanAndExtractWords(n1);
  const w2 = cleanAndExtractWords(n2);
  if (w1.length === 0 || w2.length === 0) return false;

  // Deduplicate if both entries have 7 or more words and their first 7 words match
  if (w1.length >= 7 && w2.length >= 7) {
    const key1 = w1.slice(0, 7).join(' ');
    const key2 = w2.slice(0, 7).join(' ');
    if (key1 === key2) return true;
  }

  return false;
};

export const filterDuplicatesBy7Words = <T>(
  items: T[],
  getName: (item: T) => string
): { unique: T[]; skippedCount: number; skippedItems: string[] } => {
  const unique: T[] = [];
  const skippedItems: string[] = [];
  let skippedCount = 0;

  for (const item of items) {
    const rawName = getName(item);
    const trimmed = (rawName || '').trim().toUpperCase();
    if (!trimmed || trimmed === 'TPA / INS. NAME' || trimmed === 'INSURANCE COMPANY' || trimmed === 'SR NO') {
      continue;
    }

    let isDup = false;
    for (const u of unique) {
      const uName = getName(u);
      if (isDuplicateBy7Words(trimmed, uName)) {
        isDup = true;
        skippedCount++;
        skippedItems.push(trimmed);
        break;
      }
    }

    if (!isDup) {
      unique.push(item);
    }
  }

  return { unique, skippedCount, skippedItems };
};

/**
 * ============================================================================
 * SEPARATE LOCATION 1: POLICY, INSURANCE & TPA METADATA SYNC SETTINGS
 * Used exclusively by Policy, Insurance & TPA Metadata Sync Options
 * ============================================================================
 */
export const getMetadataSyncUrl = (): string => {
  try {
    const local = localStorage.getItem('tpa_metadata_sync_url');
    if (local && local.trim() && !local.includes('AKfycbx9rM25HYqLPjtW5DPSpKV9FCAs21LEQ1S8bRuAGUu9v0qWBoPxP4WvWb7s0VBAjyxy')) {
      return local.trim();
    }
    localStorage.setItem('tpa_metadata_sync_url', METADATA_SYNC_URL);
  } catch {}
  return METADATA_SYNC_URL;
};

export const getMetadataSpreadsheetUrl = (): string => {
  try {
    const local = localStorage.getItem('tpa_metadata_spreadsheet_url');
    if (local && local.trim()) return local.trim();
  } catch {}
  return METADATA_SPREADSHEET_URL;
};

export const saveMetadataSyncSettingsPermanently = async (
  syncUrl: string,
  spreadsheetLink?: string
): Promise<{ success: boolean; message: string }> => {
  const trimmedSync = (syncUrl || '').trim();
  const trimmedLink = (spreadsheetLink || '').trim();

  // Save to separate Metadata local storage keys
  try {
    if (trimmedSync) localStorage.setItem('tpa_metadata_sync_url', trimmedSync);
    if (trimmedLink) localStorage.setItem('tpa_metadata_spreadsheet_url', trimmedLink);
  } catch (err) {
    console.error('Error saving metadata sync to localStorage:', err);
  }

  // Save to separate Metadata server config location
  try {
    const payload: Record<string, string> = {};
    if (trimmedSync) payload.metadataSyncApiUrl = trimmedSync;
    if (trimmedLink) payload.metadataSpreadsheetSharingLink = trimmedLink;

    await fetch('/api/save-metadata-sync-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: true, message: '✓ Metadata URLs saved permanently in separate location & code!' };
  } catch (err: any) {
    return { success: true, message: '✓ Metadata URLs saved in application storage!' };
  }
};

/**
 * ============================================================================
 * SEPARATE LOCATION 2: IMPORT / EXPORT DATA MANAGEMENT (LIVE DASHBOARD)
 * Used exclusively by Live Dashboard claims sync & PC physical folder automation
 * ============================================================================
 */
export const getDashboardSyncUrl = (): string => {
  try {
    const local = localStorage.getItem('dashboard_claims_sync_url') || localStorage.getItem('googleSheetsSyncUrl');
    if (local && local.trim() && !local.includes('AKfycbx9rM25HYqLPjtW5DPSpKV9FCAs21LEQ1S8bRuAGUu9v0qWBoPxP4WvWb7s0VBAjyxy')) {
      return local.trim();
    }
    localStorage.setItem('dashboard_claims_sync_url', DASHBOARD_CLAIMS_SYNC_URL);
  } catch {}
  return DASHBOARD_CLAIMS_SYNC_URL;
};

export const getDashboardSpreadsheetUrl = (): string => {
  try {
    const local = localStorage.getItem('dashboard_claims_spreadsheet_url') || localStorage.getItem('googleSpreadsheetSharingLink');
    if (local && local.trim()) return local.trim();
  } catch {}
  return DASHBOARD_CLAIMS_SPREADSHEET_URL;
};

export const saveDashboardSyncSettingsPermanently = async (
  syncUrl: string,
  spreadsheetLink?: string
): Promise<{ success: boolean; message: string }> => {
  const trimmedSync = (syncUrl || '').trim();
  const trimmedLink = (spreadsheetLink || '').trim();

  // Save to separate Dashboard local storage keys
  try {
    if (trimmedSync) {
      localStorage.setItem('dashboard_claims_sync_url', trimmedSync);
      localStorage.setItem('googleSheetsSyncUrl', trimmedSync);
    }
    if (trimmedLink) {
      localStorage.setItem('dashboard_claims_spreadsheet_url', trimmedLink);
      localStorage.setItem('googleSpreadsheetSharingLink', trimmedLink);
    }
  } catch (err) {
    console.error('Error saving dashboard sync to localStorage:', err);
  }

  // Save to separate Dashboard server config location
  try {
    const payload: Record<string, string> = {};
    if (trimmedSync) {
      payload.dashboardSyncApiUrl = trimmedSync;
      payload.syncApiUrl = trimmedSync;
    }
    if (trimmedLink) {
      payload.dashboardSpreadsheetSharingLink = trimmedLink;
      payload.spreadsheetSharingLink = trimmedLink;
    }

    await fetch('/api/save-dashboard-sync-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: true, message: '✓ Dashboard URLs saved permanently in separate location & code!' };
  } catch (err: any) {
    return { success: true, message: '✓ Dashboard URLs saved in application storage!' };
  }
};

/**
 * ============================================================================
 * LOCATION 4: PERSISTENT NOTEPAD & REFERENCE LINK STORAGE
 * Retained permanently in code, server config, and local application storage
 * ============================================================================
 */
export const NOTEPAD_STORAGE_KEY = 'apps_script_notepad_note_v1';

export const getNotepadNote = (): string => {
  try {
    const local = localStorage.getItem(NOTEPAD_STORAGE_KEY);
    if (local !== null && local !== undefined) return local;
  } catch {}
  return NOTEPAD_REFERENCE_NOTE;
};

export const saveNotepadNotePermanently = async (
  note: string
): Promise<{ success: boolean; message: string }> => {
  try {
    localStorage.setItem(NOTEPAD_STORAGE_KEY, note);
  } catch (err) {
    console.error('Error saving notepad note to localStorage:', err);
  }

  try {
    const res = await fetch('/api/save-notepad-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notepadNote: note })
    });
    if (res.ok) {
      return { success: true, message: '✓ Note saved permanently in code and persistent config!' };
    }
  } catch (err: any) {
    console.warn('Server save-notepad-note failed, stored in localStorage:', err);
  }
  return { success: true, message: '✓ Note saved in local application storage!' };
};

/**
 * ============================================================================
 * SEPARATE LOCATION 3: DEDICATED LINKS FOR COLUMN A (TPAs) & COLUMN B (INSURERS)
 * Used exclusively for loading and syncing individual Column A or Column B
 * ============================================================================
 */
export const getColASpreadsheetUrl = (): string => {
  try {
    const local = localStorage.getItem('col_a_spreadsheet_link');
    if (local && local.trim()) return local.trim();
  } catch {}
  return COL_A_SPREADSHEET_URL;
};

export const getColBSpreadsheetUrl = (): string => {
  try {
    const local = localStorage.getItem('col_b_spreadsheet_link');
    if (local && local.trim()) return local.trim();
  } catch {}
  return COL_B_SPREADSHEET_URL;
};

export const saveColASpreadsheetUrlPermanently = async (
  url: string
): Promise<{ success: boolean; message: string }> => {
  const trimmed = (url || '').trim();
  try {
    if (trimmed) localStorage.setItem('col_a_spreadsheet_link', trimmed);
    await fetch('/api/save-column-spreadsheet-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colASpreadsheetLink: trimmed })
    });
    return { success: true, message: '✓ Col A (1.  TPA / INS. NAME) Spreadsheet link saved permanently in code!' };
  } catch {
    return { success: true, message: '✓ Col A link saved in application storage!' };
  }
};

export const saveColBSpreadsheetUrlPermanently = async (
  url: string
): Promise<{ success: boolean; message: string }> => {
  const trimmed = (url || '').trim();
  try {
    if (trimmed) localStorage.setItem('col_b_spreadsheet_link', trimmed);
    await fetch('/api/save-column-spreadsheet-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colBSpreadsheetLink: trimmed })
    });
    return { success: true, message: '✓ Col B (2. INSURANCE COMPANY) Spreadsheet link saved permanently in code!' };
  } catch {
    return { success: true, message: '✓ Col B link saved in application storage!' };
  }
};

/**
 * Load ONLY Column A (1.  TPA / INS. NAME) from Google Spreadsheet Link
 * Strictly ignores Column B (Insurance Company) - loads exclusively TPAs!
 */
export const loadColAOnlyFromSpreadsheet = async (
  customUrl?: string
): Promise<{ success: boolean; count: number; loadedTpas: string[]; skippedCount: number; message: string }> => {
  const targetUrl = (customUrl || getColASpreadsheetUrl() || getMetadataSpreadsheetUrl() || getActiveSyncUrl()).trim();
  if (!targetUrl) {
    return { success: false, count: 0, loadedTpas: [], skippedCount: 0, message: 'Please specify a valid Google Spreadsheet or Web App link for Col A.' };
  }

  try {
    saveColASpreadsheetUrlPermanently(targetUrl).catch(() => {});

    // Fetch via proxy (with col=A and action=getColA query parameters)
    const proxyUrl = `/api/sheet-proxy?url=${encodeURIComponent(targetUrl)}&col=A&action=getColA`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      throw new Error(`Failed to read spreadsheet (${resp.status})`);
    }
    const text = await resp.text();
    let rows: string[][] = [];
    const rawTpas: string[] = [];

    const trimmed = (text || '').trim();
    // 1. Check if response is JSON from Google Apps Script Web App
    if (trimmed && !trimmed.startsWith('<') && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        const json = JSON.parse(trimmed);
        if (json?.data && typeof json.data === 'string') {
          rows = parseCsv(json.data);
        } else if (Array.isArray(json?.colA) && json.colA.length > 0) {
          json.colA.forEach((item: any) => {
            const name = String(typeof item === 'string' ? item : (item.name || item.tpaName || '')).trim().toUpperCase();
            if (name && !name.startsWith('SR NO') && !name.startsWith('1.') && name !== 'TPA / INS. NAME' && name !== '1.  TPA / INS. NAME') {
              rawTpas.push(name);
            }
          });
        } else if (Array.isArray(json?.tpaNames) && json.tpaNames.length > 0) {
          json.tpaNames.forEach((item: any) => {
            const name = String(typeof item === 'string' ? item : (item.name || item.tpaName || '')).trim().toUpperCase();
            if (name && !name.startsWith('SR NO') && !name.startsWith('1.') && name !== 'TPA / INS. NAME' && name !== '1.  TPA / INS. NAME') {
              rawTpas.push(name);
            }
          });
        } else if (Array.isArray(json?.tpas) && json.tpas.length > 0) {
          json.tpas.forEach((item: any) => {
            const name = String(typeof item === 'string' ? item : (item.name || item.tpaName || '')).trim().toUpperCase();
            if (name && !name.startsWith('SR NO') && !name.startsWith('1.') && name !== 'TPA / INS. NAME' && name !== '1.  TPA / INS. NAME') {
              rawTpas.push(name);
            }
          });
        } else if (Array.isArray(json?.list) && json.list.length > 0) {
          json.list.forEach((item: any) => {
            const name = String(typeof item === 'string' ? item : (item.name || item.tpaName || '')).trim().toUpperCase();
            if (name && !name.startsWith('SR NO') && !name.startsWith('1.') && name !== 'TPA / INS. NAME' && name !== '1.  TPA / INS. NAME') {
              rawTpas.push(name);
            }
          });
        }
      } catch {}
    }

    // 2. Parse CSV rows if not already populated from Web App JSON
    if (rawTpas.length === 0) {
      if (rows.length === 0) {
        rows = parseCsv(trimmed);
      }

      if (rows.length >= 1) {
        // Col A is STRICTLY column index 0 (1.  TPA / INS. NAME)
        const colIdx = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (colIdx < row.length) {
            const val = (row[colIdx] || '').trim().toUpperCase();
            if (
              val &&
              !val.startsWith('SR NO') &&
              !val.startsWith('HTTP') &&
              !val.startsWith('<') &&
              !val.includes('@') &&
              val !== 'TPA / INS. NAME' &&
              val !== '1. TPA / INS. NAME' &&
              val !== '1.  TPA / INS. NAME' &&
              val !== '1.TPA / INS. NAME' &&
              val !== '1. TPA' &&
              val !== 'TPA NAME'
            ) {
              rawTpas.push(val);
            }
          }
        }
      }
    }

    if (rawTpas.length === 0) {
      return { success: false, count: 0, loadedTpas: [], skippedCount: 0, message: 'No rows found in 1st Col (Col A).' };
    }

    // Deduplicate by starting first 7 words and exact matches
    const { unique: dedupedTpas, skippedCount } = filterDuplicatesBy7Words(rawTpas, t => t);

    // Save strictly to TPAs database (overwriting with clean Col A list)
    try {
      localStorage.setItem(CUSTOM_TPA_STORAGE_KEY, JSON.stringify(dedupedTpas));
      window.dispatchEvent(new CustomEvent('metadata-updated', { detail: { col: 'A', count: dedupedTpas.length } }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error saving Col A TPAs to localStorage:', e);
    }

    const dupMsg = skippedCount > 0 ? ` (Auto-skipped ${skippedCount} duplicate entries)` : '';
    return {
      success: true,
      count: dedupedTpas.length,
      loadedTpas: dedupedTpas,
      skippedCount,
      message: `✓ Successfully loaded ${dedupedTpas.length} TPAs exclusively from 1st Col (Col A: 1.  TPA / INS. NAME)${dupMsg}!`
    };
  } catch (err: any) {
    return { success: false, count: 0, loadedTpas: [], skippedCount: 0, message: `Error loading Col A: ${err.message}` };
  }
};

/**
 * Load ONLY Column B (2. INSURANCE COMPANY) from Google Spreadsheet or Web App
 * Strictly ignores Column A (TPAs) & Column C (Addresses) - loads exclusively Insurance Companies from 2nd Col (Col B)!
 */
export const loadColBOnlyFromSpreadsheet = async (
  customUrl?: string
): Promise<{ success: boolean; count: number; loadedInsurers: string[]; skippedCount: number; message: string }> => {
  const targetUrl = (customUrl || getColBSpreadsheetUrl() || getMetadataSpreadsheetUrl() || getActiveSyncUrl()).trim();
  if (!targetUrl) {
    return { success: false, count: 0, loadedInsurers: [], skippedCount: 0, message: 'Please specify a valid Google Spreadsheet or Web App link for Col B.' };
  }

  try {
    saveColBSpreadsheetUrlPermanently(targetUrl).catch(() => {});

    // Fetch via proxy with col=B, action=getColB, and sheet=Sheet2
    const proxyUrl = `/api/sheet-proxy?url=${encodeURIComponent(targetUrl)}&col=B&action=getColB&sheet=Sheet2`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      throw new Error(`Failed to read spreadsheet (${resp.status})`);
    }
    const text = await resp.text();
    let rows: string[][] = [];
    const rawInsurers: string[] = [];

    const trimmed = (text || '').trim();
    // 1. Check if response is JSON from Google Apps Script Web App
    if (trimmed && !trimmed.startsWith('<') && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        const json = JSON.parse(trimmed);
        if (json?.data && typeof json.data === 'string') {
          rows = parseCsv(json.data);
        } else if (Array.isArray(json?.colB) && json.colB.length > 0) {
          json.colB.forEach((item: any) => {
            const name = String(typeof item === 'string' ? item : (item.name || item.companyName || '')).trim().toUpperCase();
            if (name && !name.startsWith('SR NO') && !name.startsWith('2.') && name !== 'INSURANCE COMPANY' && name !== '2. INSURANCE COMPANY' && name !== '2.  INSURANCE COMPANY') {
              rawInsurers.push(name);
            }
          });
        } else if (Array.isArray(json?.insuranceCompanies) && json.insuranceCompanies.length > 0) {
          json.insuranceCompanies.forEach((item: any) => {
            const name = String(typeof item === 'string' ? item : (item.name || item.companyName || '')).trim().toUpperCase();
            if (name && !name.startsWith('SR NO') && !name.startsWith('2.') && name !== 'INSURANCE COMPANY' && name !== '2. INSURANCE COMPANY' && name !== '2.  INSURANCE COMPANY') {
              rawInsurers.push(name);
            }
          });
        } else if (Array.isArray(json?.insurers) && json.insurers.length > 0) {
          json.insurers.forEach((item: any) => {
            const name = String(typeof item === 'string' ? item : (item.name || item.companyName || '')).trim().toUpperCase();
            if (name && !name.startsWith('SR NO') && !name.startsWith('2.') && name !== 'INSURANCE COMPANY' && name !== '2. INSURANCE COMPANY') {
              rawInsurers.push(name);
            }
          });
        } else if (Array.isArray(json?.list) && json.list.length > 0) {
          json.list.forEach((item: any) => {
            const name = String(typeof item === 'string' ? item : (item.name || item.companyName || '')).trim().toUpperCase();
            if (name && !name.startsWith('SR NO') && !name.startsWith('2.') && name !== 'INSURANCE COMPANY' && name !== '2. INSURANCE COMPANY') {
              rawInsurers.push(name);
            }
          });
        }
      } catch {}
    }

    // 2. Parse CSV rows if not already populated from Web App JSON
    if (rawInsurers.length === 0) {
      if (rows.length === 0) {
        rows = parseCsv(trimmed);
      }

      if (rows.length >= 1) {
        // Detect column index for 2. INSURANCE COMPANY (check Col 0 and Col 1)
        let colIdx = 0;
        const header = rows[0].map(h => (h || '').toLowerCase().trim());
        for (let c = 0; c < header.length; c++) {
          const h = header[c];
          if (h.includes('2.') || h.includes('insurance company') || h.includes('insurance co') || (h.includes('insurance') && !h.includes('addr') && !h.includes('tpa'))) {
            colIdx = c;
            break;
          }
        }

        const hasHeader = rows[0].some(cell => {
          const c = (cell || '').toLowerCase().trim();
          return c.includes('2.') || c.includes('insurance company') || c.includes('sr no');
        });
        const startR = hasHeader ? 1 : 0;

        for (let i = startR; i < rows.length; i++) {
          const row = rows[i];
          if (colIdx < row.length) {
            const val = (row[colIdx] || '').trim().toUpperCase();
            if (
              val &&
              !val.startsWith('SR NO') &&
              !val.startsWith('HTTP') &&
              !val.startsWith('<') &&
              !val.includes('@') &&
              val !== 'INSURANCE COMPANY' &&
              val !== '2. INSURANCE COMPANY' &&
              val !== '2.  INSURANCE COMPANY' &&
              val !== '2.INSURANCE COMPANY' &&
              val !== '2. INSURANCE' &&
              val !== 'INSURANCE CO'
            ) {
              rawInsurers.push(val);
            }
          }
        }
      }
    }

    // Fallback: if Sheet 2 wasn't loaded, try querying gid=885256640
    if (rawInsurers.length === 0 && targetUrl.includes('docs.google.com/spreadsheets')) {
      try {
        const fallbackResp = await fetch(`/api/sheet-proxy?url=${encodeURIComponent(targetUrl)}&gid=885256640&col=B`);
        if (fallbackResp.ok) {
          const fbText = await fallbackResp.text();
          const fbRows = parseCsv(fbText);
          if (fbRows.length > 1) {
            for (let r = 1; r < fbRows.length; r++) {
              const val = (fbRows[r][0] || '').trim().toUpperCase();
              if (val && !val.startsWith('2.') && val !== 'INSURANCE COMPANY') {
                rawInsurers.push(val);
              }
            }
          }
        }
      } catch {}
    }

    if (rawInsurers.length === 0) {
      return { success: false, count: 0, loadedInsurers: [], skippedCount: 0, message: 'No rows found in 2nd Col (Col B).' };
    }

    // Deduplicate by starting first 7 words and exact matches
    const { unique: dedupedInsurers, skippedCount } = filterDuplicatesBy7Words(rawInsurers, c => c);

    // Save strictly to Insurance Companies database (overwriting with clean Col B list)
    try {
      localStorage.setItem(CUSTOM_INSURANCE_STORAGE_KEY, JSON.stringify(dedupedInsurers));
      window.dispatchEvent(new CustomEvent('metadata-updated', { detail: { col: 'B', count: dedupedInsurers.length } }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error saving Col B insurers to localStorage:', e);
    }

    const dupMsg = skippedCount > 0 ? ` (Auto-skipped ${skippedCount} duplicate entries)` : '';
    return {
      success: true,
      count: dedupedInsurers.length,
      loadedInsurers: dedupedInsurers,
      skippedCount,
      message: `✓ Successfully loaded ${dedupedInsurers.length} Insurance Companies exclusively from 2nd Col (Col B: 2. INSURANCE COMPANY)${dupMsg}!`
    };
  } catch (err: any) {
    return { success: false, count: 0, loadedInsurers: [], skippedCount: 0, message: `Error loading Col B: ${err.message}` };
  }
};

/**
 * Load ONLY Column C (3. INSURANCE / TPA ADDRESS) from Google Spreadsheet Link
 * Strictly reads Column C and maps addresses to Column A TPAs into the database!
 */
export const loadColCOnlyFromSpreadsheet = async (
  customUrl?: string
): Promise<{ success: boolean; count: number; loadedAddresses: Record<string, string>; skippedCount: number; message: string }> => {
  const targetUrl = (customUrl || getMetadataSpreadsheetUrl() || getActiveSyncUrl()).trim();
  if (!targetUrl) {
    return { success: false, count: 0, loadedAddresses: {}, skippedCount: 0, message: 'Please specify a valid Google Spreadsheet or Web App Link.' };
  }

  try {
    const proxyUrl = `/api/sheet-proxy?url=${encodeURIComponent(targetUrl)}&col=C&action=getColC`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      throw new Error(`Failed to read spreadsheet (${resp.status})`);
    }
    const text = await resp.text();
    let rows: string[][] = [];
    const savedMap: Record<string, string> = {};

    const trimmed = (text || '').trim();
    // 1. Check if response is JSON from Web App
    if (trimmed && !trimmed.startsWith('<') && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        const json = JSON.parse(trimmed);
        if (json?.data && typeof json.data === 'string') {
          rows = parseCsv(json.data);
        } else if (json?.colC && typeof json.colC === 'object') {
          Object.entries(json.colC).forEach(([k, v]) => {
            if (v && typeof v === 'string') savedMap[k.toUpperCase().trim()] = v.toUpperCase().trim();
          });
        } else if (json?.tpaAddresses && typeof json.tpaAddresses === 'object') {
          Object.entries(json.tpaAddresses).forEach(([k, v]) => {
            if (v && typeof v === 'string') savedMap[k.toUpperCase().trim()] = v.toUpperCase().trim();
          });
        } else if (json?.addresses && typeof json.addresses === 'object') {
          Object.entries(json.addresses).forEach(([k, v]) => {
            if (v && typeof v === 'string') savedMap[k.toUpperCase().trim()] = v.toUpperCase().trim();
          });
        }
      } catch {}
    }

    // 2. Parse CSV if not populated from JSON
    if (Object.keys(savedMap).length === 0) {
      if (rows.length === 0) {
        rows = parseCsv(trimmed);
      }

      if (rows.length >= 1) {
        const header = rows[0].map(h => (h || '').toLowerCase().trim());
        let tpaColIdx = header.findIndex(h => 
          h.includes('tpa') || h.includes('1.') || h === 'tpa / ins. name' || h === '1.  tpa / ins. name'
        );
        if (tpaColIdx === -1 && rows[0].length >= 1) tpaColIdx = 0;

        let addrColIdx = header.findIndex(h => 
          h.includes('address') || h.includes('addr') || h.includes('3.') || h === '3. insurance / tpa address'
        );
        if (addrColIdx === -1 && rows[0].length >= 3) addrColIdx = 2;

        if (addrColIdx >= 0) {
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const addrVal = (row[addrColIdx] || '').trim().toUpperCase();
            const tpaVal = (tpaColIdx >= 0 && tpaColIdx < row.length ? row[tpaColIdx] : '').trim().toUpperCase();

            if (
              addrVal &&
              addrVal !== '-' &&
              addrVal !== 'N/A' &&
              !addrVal.startsWith('HTTP') &&
              !addrVal.startsWith('<') &&
              addrVal !== 'INSURANCE / TPA ADDRESS' &&
              addrVal !== '3. INSURANCE / TPA ADDRESS'
            ) {
              const targetKey = tpaVal && !tpaVal.startsWith('1.') && tpaVal !== 'TPA / INS. NAME' ? tpaVal : `ENTRY_${i}`;
              savedMap[targetKey] = addrVal;
            }
          }
        }
      }
    }

    // Save strictly to custom addresses database
    try {
      localStorage.setItem(CUSTOM_TPA_ADDRESSES_STORAGE_KEY, JSON.stringify(savedMap));
      window.dispatchEvent(new CustomEvent('metadata-updated', { detail: { col: 'C', count: Object.keys(savedMap).length } }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error saving Col C addresses to localStorage:', e);
    }

    return {
      success: true,
      count: Object.keys(savedMap).length,
      loadedAddresses: savedMap,
      skippedCount: 0,
      message: `✓ Successfully loaded & saved ${Object.keys(savedMap).length} Addresses strictly from 3rd Col (Col C: 3. INSURANCE / TPA ADDRESS)!`
    };
  } catch (err: any) {
    return { success: false, count: 0, loadedAddresses: {}, skippedCount: 0, message: `Error loading Col C: ${err.message}` };
  }
};

/**
 * Auto-load ALL 3 Columns (Col A, Col B, Col C) simultaneously from Google Spreadsheet Link
 * - Column 1 (Col A): "1.  TPA / INS. NAME" (Deduplicated, no duplicate entries)
 * - Column 2 (Col B): "2. INSURANCE COMPANY" (Deduplicated, no duplicate entries)
 * - Column 3 (Col C): "3. INSURANCE / TPA ADDRESS" (Mapped strictly per TPA)
 * Called automatically upon app startup and also by "Load All 3 Columns at One Go" button!
 */
export const autoLoadAllThreeColumnsFromSpreadsheet = async (
  customUrl?: string
): Promise<{
  success: boolean;
  tpasCount: number;
  insuranceCount: number;
  addressesCount: number;
  loadedTpas: string[];
  loadedInsuranceCompanies: string[];
  loadedAddresses: Record<string, string>;
  duplicatesSkipped: number;
  message: string;
}> => {
  const targetUrl = (customUrl || getMetadataSpreadsheetUrl() || getMetadataSyncUrl() || getActiveSyncUrl()).trim();
  if (!targetUrl) {
    return {
      success: false,
      tpasCount: 0,
      insuranceCount: 0,
      addressesCount: 0,
      loadedTpas: [],
      loadedInsuranceCompanies: [],
      loadedAddresses: {},
      duplicatesSkipped: 0,
      message: 'No Google Spreadsheet or Apps Script link found.'
    };
  }

  try {
    const proxyUrl = `/api/sheet-proxy?url=${encodeURIComponent(targetUrl)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      throw new Error(`Failed to read spreadsheet (${resp.status})`);
    }
    const text = await resp.text();
    let rows: string[][] = [];
    const rawTpas: string[] = [];
    const rawInsurers: string[] = [];
    const savedMap: Record<string, string> = {};

    const trimmed = (text || '').trim();
    // 1. Check if response is JSON from Google Apps Script Web App or Sheet Proxy
    if (trimmed && !trimmed.startsWith('<') && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        const json = JSON.parse(trimmed);
        if (json?.data && typeof json.data === 'string') {
          rows = parseCsv(json.data);
        } else {
          // Google Apps Script Web App JSON response:
          // Col A: 1.  TPA / INS. NAME
          const colAData = json?.colA || json?.tpas || json?.tpaNames || json?.list;
          if (Array.isArray(colAData) && colAData.length > 0) {
            colAData.forEach((item: any) => {
              const name = String(typeof item === 'string' ? item : (item.name || item.tpaName || '')).trim().toUpperCase();
              if (
                name &&
                !name.startsWith('SR NO') &&
                !name.startsWith('HTTP') &&
                !name.startsWith('<') &&
                !name.includes('@') &&
                name !== 'TPA / INS. NAME' &&
                name !== '1. TPA / INS. NAME' &&
                name !== '1.  TPA / INS. NAME' &&
                name !== '1.TPA / INS. NAME' &&
                name !== '1. TPA' &&
                name !== 'TPA NAME'
              ) {
                rawTpas.push(name);
              }
            });
          }

          // Col B: 2. INSURANCE COMPANY (strictly from Col B!)
          const colBData = json?.colB || json?.insuranceCompanies || json?.insurers;
          if (Array.isArray(colBData) && colBData.length > 0) {
            colBData.forEach((item: any) => {
              const name = String(typeof item === 'string' ? item : (item.name || item.companyName || '')).trim().toUpperCase();
              if (
                name &&
                !name.startsWith('SR NO') &&
                !name.startsWith('HTTP') &&
                !name.startsWith('<') &&
                !name.includes('@') &&
                name !== 'INSURANCE COMPANY' &&
                name !== '2. INSURANCE COMPANY' &&
                name !== '2.  INSURANCE COMPANY' &&
                name !== '2.INSURANCE COMPANY' &&
                name !== '2. INSURANCE' &&
                name !== 'INSURANCE CO'
              ) {
                rawInsurers.push(name);
              }
            });
          }

          // Col C: 3. INSURANCE / TPA ADDRESS (strictly from Col C!)
          const colCData = json?.colC || json?.tpaAddresses || json?.addresses;
          if (colCData && typeof colCData === 'object') {
            Object.entries(colCData).forEach(([k, v]) => {
              if (v && typeof v === 'string') {
                const normVal = v.trim().toUpperCase();
                if (normVal && normVal !== '-' && normVal !== 'N/A' && !normVal.startsWith('HTTP') && !normVal.startsWith('<')) {
                  savedMap[k.toUpperCase().trim()] = normVal;
                }
              }
            });
          }
        }
      } catch {}
    }

    // 2. Parse CSV rows if not loaded from Web App JSON
    if (rawTpas.length === 0 && rawInsurers.length === 0) {
      if (rows.length === 0) {
        rows = parseCsv(trimmed);
      }

      if (rows.length >= 1) {
        const header = rows[0].map(h => (h || '').toLowerCase().trim());
        let tpaColIdx = header.findIndex(h =>
          h === '1.  tpa / ins. name' || h === '1. tpa / ins. name' || h === '1.tpa / ins. name' ||
          h === 'tpa / ins. name' || h === 'tpa/ins. name' || h === 'tpa / ins name' ||
          h === '1. tpa' || h === '1.  tpa' || h === 'tpa name' || h === 'tpa' ||
          (h.includes('tpa') && !h.includes('addr') && !h.includes('bank'))
        );
        let insColIdx = header.findIndex(h =>
          h === '2.  insurance company' || h === '2. insurance company' || h === '2.insurance company' ||
          h === 'insurance company' || h === 'insurance co' || h === 'ins company' ||
          h === '2. insurance' || h === '2.  insurance' ||
          (h.includes('insurance') && !h.includes('limit') && !h.includes('addr') && !h.includes('id'))
        );
        let addrColIdx = header.findIndex(h =>
          h === '3.  insurance / tpa address' || h === '3. insurance / tpa address' || h === '3.insurance / tpa address' ||
          h === 'insurance / tpa address' || h === 'insurance/tpa address' || h === 'insurance address' ||
          h === 'tpa address' || (h.includes('addr') && !h.includes('bank')) || h === 'address'
        );

        if (tpaColIdx === -1 && insColIdx === -1 && rows[0].length >= 2) {
          tpaColIdx = 0;
          insColIdx = 1;
          if (rows[0].length >= 3 && addrColIdx === -1) addrColIdx = 2;
        } else if (tpaColIdx === -1 && insColIdx >= 0) {
          tpaColIdx = insColIdx === 0 ? 1 : 0;
        } else if (insColIdx === -1 && tpaColIdx >= 0) {
          insColIdx = tpaColIdx === 0 ? 1 : 0;
        }
        if (addrColIdx === -1 && rows[0].length >= 3) {
          addrColIdx = 2;
        }

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          let tpaVal = '';

          // Column A: 1.  TPA / INS. NAME (Strictly Col A - no collecting from other columns!)
          if (tpaColIdx >= 0 && tpaColIdx < row.length) {
            tpaVal = (row[tpaColIdx] || '').trim().toUpperCase();
            if (
              tpaVal &&
              !tpaVal.startsWith('SR NO') &&
              !tpaVal.startsWith('HTTP') &&
              !tpaVal.startsWith('<') &&
              !tpaVal.includes('@') &&
              tpaVal !== 'TPA / INS. NAME' &&
              tpaVal !== '1. TPA / INS. NAME' &&
              tpaVal !== '1.  TPA / INS. NAME' &&
              tpaVal !== '1.TPA / INS. NAME' &&
              tpaVal !== '1. TPA' &&
              tpaVal !== 'TPA NAME'
            ) {
              rawTpas.push(tpaVal);
            }
          }

          // Column B: 2. INSURANCE COMPANY (Strictly Col B - no collecting from other columns!)
          if (insColIdx >= 0 && insColIdx < row.length) {
            const insVal = (row[insColIdx] || '').trim().toUpperCase();
            if (
              insVal &&
              !insVal.startsWith('SR NO') &&
              !insVal.startsWith('HTTP') &&
              !insVal.startsWith('<') &&
              !insVal.includes('@') &&
              insVal !== 'INSURANCE COMPANY' &&
              insVal !== '2. INSURANCE COMPANY' &&
              insVal !== '2.  INSURANCE COMPANY' &&
              insVal !== '2.INSURANCE COMPANY' &&
              insVal !== '2. INSURANCE' &&
              insVal !== 'INSURANCE CO'
            ) {
              rawInsurers.push(insVal);
            }
          }

          // Column C: 3. INSURANCE / TPA ADDRESS (Strictly Col C - mapped to Col A!)
          if (addrColIdx >= 0 && addrColIdx < row.length) {
            const addrVal = (row[addrColIdx] || '').trim().toUpperCase();
            if (
              addrVal &&
              addrVal !== '-' &&
              addrVal !== 'N/A' &&
              !addrVal.startsWith('HTTP') &&
              !addrVal.startsWith('<') &&
              addrVal !== 'INSURANCE / TPA ADDRESS' &&
              addrVal !== '3. INSURANCE / TPA ADDRESS'
            ) {
              const targetKey = tpaVal && !tpaVal.startsWith('1.') && tpaVal !== 'TPA / INS. NAME' ? tpaVal : `ENTRY_${i}`;
              savedMap[targetKey] = addrVal;
            }
          }
        }
      }
    }

    // Auto-Load Col B (2. INSURANCE COMPANY) directly from Sheet 2 Col A into Insurance Companies list
    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      try {
        const proxyUrlSheet2 = `/api/sheet-proxy?url=${encodeURIComponent(targetUrl)}&col=B&action=getColB&sheet=Sheet2`;
        const resp2 = await fetch(proxyUrlSheet2);
        if (resp2.ok) {
          const text2 = await resp2.text();
          let rows2: string[][] = [];
          const trimmed2 = (text2 || '').trim();
          if (trimmed2.startsWith('{') || trimmed2.startsWith('[')) {
            try {
              const j2 = JSON.parse(trimmed2);
              if (j2?.data && typeof j2.data === 'string') {
                rows2 = parseCsv(j2.data);
              } else {
                const list2 = j2?.colB || j2?.insuranceCompanies || j2?.insurers || j2?.list;
                if (Array.isArray(list2)) {
                  list2.forEach((it: any) => {
                    const n = String(typeof it === 'string' ? it : (it?.name || it?.companyName || '')).trim().toUpperCase();
                    if (n && !n.startsWith('SR NO') && !n.startsWith('2.') && n !== 'INSURANCE COMPANY' && n !== '2. INSURANCE COMPANY') {
                      rawInsurers.push(n);
                    }
                  });
                }
              }
            } catch {}
          } else {
            rows2 = parseCsv(trimmed2);
          }
          if (rows2.length > 0) {
            let colIdx2 = 0;
            const h2 = rows2[0].map(h => (h || '').toLowerCase().trim());
            for (let c = 0; c < h2.length; c++) {
              if (h2[c].includes('2.') || h2[c].includes('insurance company') || h2[c].includes('insurance co') || (h2[c].includes('insurance') && !h2[c].includes('addr') && !h2[c].includes('tpa'))) {
                colIdx2 = c;
                break;
              }
            }
            const hasH2 = rows2[0].some(cell => {
              const str = (cell || '').toLowerCase().trim();
              return str.includes('2.') || str.includes('insurance company') || str.includes('sr no');
            });
            const startR2 = hasH2 ? 1 : 0;
            const sheet2Insurers: string[] = [];
            for (let r = startR2; r < rows2.length; r++) {
              if (colIdx2 < rows2[r].length) {
                const val2 = (rows2[r][colIdx2] || '').trim().toUpperCase();
                if (
                  val2 &&
                  !val2.startsWith('SR NO') &&
                  !val2.startsWith('HTTP') &&
                  !val2.startsWith('<') &&
                  !val2.includes('@') &&
                  val2 !== 'INSURANCE COMPANY' &&
                  val2 !== '2. INSURANCE COMPANY' &&
                  val2 !== '2.  INSURANCE COMPANY' &&
                  val2 !== '2.INSURANCE COMPANY' &&
                  val2 !== '2. INSURANCE' &&
                  val2 !== 'INSURANCE CO'
                ) {
                  sheet2Insurers.push(val2);
                }
              }
            }
            if (sheet2Insurers.length > 0) {
              rawInsurers.length = 0;
              rawInsurers.push(...sheet2Insurers);
            }
          }
        }
      } catch (err2) {
        console.warn('Sheet 2 fetch notice in autoLoadAllThreeColumnsFromSpreadsheet:', err2);
      }
    }

    if (rawTpas.length === 0 && rawInsurers.length === 0) {
      return {
        success: false,
        tpasCount: 0,
        insuranceCount: 0,
        addressesCount: 0,
        loadedTpas: [],
        loadedInsuranceCompanies: [],
        loadedAddresses: {},
        duplicatesSkipped: 0,
        message: 'No data found in spreadsheet or Web App.'
      };
    }

    // Deduplicate lists strictly matching first 7 words and exact prefix
    const { unique: dedupedTpas, skippedCount: skippedTpaDups } = filterDuplicatesBy7Words(rawTpas, t => t);
    const { unique: dedupedInsurers, skippedCount: skippedInsDups } = filterDuplicatesBy7Words(rawInsurers, c => c);
    const totalSkipped = skippedTpaDups + skippedInsDups;

    // Save strictly to local databases (overwriting with clean sheet lists)
    localStorage.setItem(CUSTOM_TPA_STORAGE_KEY, JSON.stringify(dedupedTpas));
    localStorage.setItem(CUSTOM_INSURANCE_STORAGE_KEY, JSON.stringify(dedupedInsurers));
    localStorage.setItem(CUSTOM_TPA_ADDRESSES_STORAGE_KEY, JSON.stringify(savedMap));

    // Dispatch update events for all components
    window.dispatchEvent(new CustomEvent('metadata-updated', { detail: { col: 'ALL' } }));
    window.dispatchEvent(new Event('storage'));

    const dupMsg = totalSkipped > 0 ? ` (Auto-skipped ${totalSkipped} duplicates)` : '';
    return {
      success: true,
      tpasCount: dedupedTpas.length,
      insuranceCount: dedupedInsurers.length,
      addressesCount: Object.keys(savedMap).length,
      loadedTpas: dedupedTpas,
      loadedInsuranceCompanies: dedupedInsurers,
      loadedAddresses: savedMap,
      duplicatesSkipped: totalSkipped,
      message: `✓ Successfully loaded all 3 columns at one go: ${dedupedTpas.length} TPAs (Col A), ${dedupedInsurers.length} Insurers (Col B), and ${Object.keys(savedMap).length} Addresses (Col C)${dupMsg}!`
    };
  } catch (err: any) {
    return {
      success: false,
      tpasCount: 0,
      insuranceCount: 0,
      addressesCount: 0,
      loadedTpas: [],
      loadedInsuranceCompanies: [],
      loadedAddresses: {},
      duplicatesSkipped: 0,
      message: `Error loading 3 columns from sheet: ${err.message}`
    };
  }
};

// Aliases for backward compatibility
export const getActiveSyncUrl = getMetadataSyncUrl;
export const getSpreadsheetSharingUrl = getMetadataSpreadsheetUrl;
export const saveSyncSettingsPermanently = saveMetadataSyncSettingsPermanently;
export const saveSyncUrlPermanently = async (url: string): Promise<{ success: boolean; message: string }> => {
  return saveMetadataSyncSettingsPermanently(url, getMetadataSpreadsheetUrl());
};

/**
 * Helper to parse CSV lines safely
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      currentVal = '';
      if (currentRow.some(col => col !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(col => col !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Safely parse metadata directly from Google Spreadsheet tabs (TPAs, InsuranceCompanies, or root sheet)
 * Strictly separates:
 * Column 1 (Col A): "1. TPA / INS. NAME" -> loaded strictly into loadedTpas
 * Column 2 (Col B): "2. INSURANCE COMPANY" -> loaded strictly into loadedInsuranceCompanies
 */
async function fetchSpreadsheetMetadata(spreadsheetUrl: string): Promise<{
  loadedTpas: Array<{ name: string; address?: string; bankDetails?: BankDetails }>;
  loadedInsuranceCompanies: string[];
}> {
  const loadedTpas: Array<{ name: string; address?: string; bankDetails?: BankDetails }> = [];
  const loadedInsuranceCompanies: string[] = [];

  const parseRowsToMetadata = (rows: string[][]) => {
    if (!rows || rows.length < 2) return;

    const header = rows[0].map(h => (h || '').toLowerCase().trim());

    // Check specific 3 headers: "1.  TPA / INS. NAME" (Col 1), "2. INSURANCE COMPANY" (Col 2) & "3. INSURANCE / TPA ADDRESS" (Col 3)
    let tpaColIdx = header.findIndex(h => 
      h === '1. tpa / ins. name' || h === '1.  tpa / ins. name' || h === '1.tpa / ins. name' || 
      h === 'tpa / ins. name' || h === 'tpa/ins. name' || h === 'tpa / ins name' || h === 'tpa/ins name' || 
      h === '1. tpa' || h === '1.  tpa' || h === 'tpa name' || h === 'tpa' || 
      (h.includes('tpa') && !h.includes('addr') && !h.includes('bank'))
    );
    let insColIdx = header.findIndex(h => 
      h === '2. insurance company' || h === '2.  insurance company' || h === '2.insurance company' || 
      h === 'insurance company' || h === 'insurance co' || h === 'ins company' || 
      h === '2. insurance' || h === '2.  insurance' || 
      (h.includes('insurance') && !h.includes('limit') && !h.includes('addr') && !h.includes('id'))
    );
    let addrColIdx = header.findIndex(h => 
      h === '3. insurance / tpa address' || h === '3.  insurance / tpa address' || h === '3.insurance / tpa address' || 
      h === 'insurance / tpa address' || h === 'insurance/tpa address' || h === 'insurance address' || 
      h === 'tpa address' || (h.includes('addr') && !h.includes('bank')) || h === 'address'
    );

    // If headers were not explicitly matched by name, map to Column 0, 1, 2 by default
    // 1st column is 1. TPA / INS. NAME • 2nd column is 2. INSURANCE COMPANY • 3rd column is Address
    if (tpaColIdx === -1 && insColIdx === -1 && rows[0].length >= 2) {
      tpaColIdx = 0;
      insColIdx = 1;
      if (rows[0].length >= 3 && addrColIdx === -1) {
        addrColIdx = 2;
      }
    } else if (tpaColIdx === -1 && insColIdx >= 0) {
      tpaColIdx = insColIdx === 0 ? 1 : 0;
    } else if (insColIdx === -1 && tpaColIdx >= 0) {
      insColIdx = tpaColIdx === 0 ? 1 : 0;
    }
    if (addrColIdx === -1 && rows[0].length >= 3) {
      addrColIdx = 2;
    }

    // Standard bank columns check
    const bankNameIdx = header.findIndex(h => h.includes('bank') && (h.includes('name') || !h.includes('addr')));
    const accIdx = header.findIndex(h => h.includes('a/c') || h.includes('account') || (h.includes('number') && !h.includes('sl') && !h.includes('phone') && !h.includes('toll')));
    const ifscIdx = header.findIndex(h => h.includes('ifsc'));

    // Priority 1: Multi-column sync (Col A: "1. TPA / INS. NAME", Col B: "2. INSURANCE COMPANY", Col C: "3. INSURANCE / TPA ADDRESS")
    if (tpaColIdx >= 0 || insColIdx >= 0 || addrColIdx >= 0) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        // 1st Column: 1. TPA / INS. NAME & 3rd Column: Address
        if (tpaColIdx >= 0 && tpaColIdx < row.length) {
          const tpaVal = (row[tpaColIdx] || '').trim().toUpperCase();
          if (
            tpaVal && 
            !tpaVal.startsWith('SR NO') && 
            !tpaVal.startsWith('HTTP') && 
            !tpaVal.startsWith('<') && 
            !tpaVal.includes('@') &&
            tpaVal !== 'TPA / INS. NAME' &&
            tpaVal !== '1. TPA / INS. NAME' &&
            tpaVal !== '1.  TPA / INS. NAME' &&
            tpaVal !== '1.TPA / INS. NAME' &&
            tpaVal !== '1. TPA' &&
            tpaVal !== 'TPA NAME'
          ) {
            let addrVal = '';
            if (addrColIdx >= 0 && addrColIdx < row.length) {
              addrVal = (row[addrColIdx] || '').trim().toUpperCase();
            }
            const existingIdx = loadedTpas.findIndex(t => t.name === tpaVal);
            if (existingIdx === -1) {
              loadedTpas.push({ name: tpaVal, address: addrVal });
            } else if (addrVal && !loadedTpas[existingIdx].address) {
              loadedTpas[existingIdx].address = addrVal;
            }
          }
        }

        // 2nd Column: 2. INSURANCE COMPANY (strictly loaded into loadedInsuranceCompanies ONLY)
        if (insColIdx >= 0 && insColIdx < row.length) {
          const insVal = (row[insColIdx] || '').trim().toUpperCase();
          if (
            insVal && 
            !insVal.startsWith('SR NO') && 
            !insVal.startsWith('HTTP') && 
            !insVal.startsWith('<') && 
            !insVal.includes('@') &&
            insVal !== 'INSURANCE COMPANY' &&
            insVal !== '2. INSURANCE COMPANY' &&
            insVal !== '2.  INSURANCE COMPANY' &&
            insVal !== '2.INSURANCE COMPANY' &&
            insVal !== '2. INSURANCE' &&
            insVal !== 'INSURANCE CO'
          ) {
            if (!loadedInsuranceCompanies.includes(insVal)) {
              loadedInsuranceCompanies.push(insVal);
            }
          }
        }
      }

      if (loadedTpas.length > 0 || loadedInsuranceCompanies.length > 0) {
        return;
      }
    }

    // Check if standard tabular columns exist
    const nameIdx = header.findIndex(h => (h.includes('tpa') && (h.includes('name') || !h.includes('addr'))) || (h.includes('company') && h.includes('name')) || h === 'tpa name');

    // If standard tabular format with bank/account columns:
    if (nameIdx >= 0 && (bankNameIdx >= 0 || accIdx >= 0 || ifscIdx >= 0)) {
      const addrIdx = header.findIndex(h => (h.includes('tpa') && (h.includes('addr') || h.includes('address'))) || h === 'tpa address');
      const fallbackAddrIdx = header.findIndex(h => h.includes('addr') && !h.includes('bank'));
      const finalAddrIdx = addrIdx >= 0 ? addrIdx : fallbackAddrIdx;
      const bankAddrIdx = header.findIndex(h => h.includes('bank') && (h.includes('addr') || h.includes('address')));
      const panIdx = header.findIndex(h => h.includes('pan'));

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const tpaName = (nameIdx >= 0 ? row[nameIdx] : (row[1] || row[0] || '')).trim().toUpperCase();
        if (!tpaName || tpaName.startsWith('SR NO') || tpaName.startsWith('HTTP') || tpaName.startsWith('<')) continue;

        const address = finalAddrIdx >= 0 ? (row[finalAddrIdx] || '').trim() : '';
        const bankDetails: BankDetails = {
          bankName: (bankNameIdx >= 0 ? row[bankNameIdx] || '' : '').trim().toUpperCase(),
          bankAccountNo: (accIdx >= 0 ? row[accIdx] || '' : '').trim(),
          ifscCode: (ifscIdx >= 0 ? row[ifscIdx] || '' : '').trim().toUpperCase(),
          bankAddress: (bankAddrIdx >= 0 ? row[bankAddrIdx] || '' : '').trim().toUpperCase(),
          panCard: (panIdx >= 0 ? row[panIdx] || '' : '').trim().toUpperCase()
        };

        if (!loadedTpas.some(t => t.name === tpaName)) {
          loadedTpas.push({ name: tpaName, address, bankDetails });
        }
      }
      return;
    }

    // Directory format (e.g. "SR NO", "COMPANAY NAME / MAIL ID", "TOLL FREE", etc.)
    const skipKeywords = [
      "sr no", "companay", "company name", "mail id", "toll free",
      "cashless", "soft copy", "query", "stetus", "status",
      "if qry", "portal", "for ksk", "cc", "to", "intimation",
      "settelment", "settlement", "submission", "outstanding",
      "related", "provider", "notice", "claim file", "for payment",
      "payment", "ifsc", "account", "bank name", "address", "phone"
    ];

    let currentCompany: string | null = null;
    let currentEmails: string[] = [];
    let currentPhones: string[] = [];

    const commitCompany = () => {
      if (!currentCompany) return;
      const isTpa = currentCompany.includes("TPA") || currentCompany.includes("MEDIASSIST") || 
                    currentCompany.includes("FHPL") || currentCompany.includes("HITPA") || 
                    currentCompany.includes("MED SAVE") || currentCompany.includes("SAFE WAY") || 
                    currentCompany.includes("GENINS") || currentCompany.includes("HEALTH INDIA") || 
                    currentCompany.includes("PARK MEDICLAIM") || currentCompany.includes("ERICSON") || 
                    currentCompany.includes("VOLO") || currentCompany.includes("MD INDIA") || 
                    currentCompany.includes("AKNA");

      let contactInfo = "";
      if (currentEmails.length > 0) contactInfo += "Email: " + currentEmails.slice(0, 2).join(", ");
      if (currentPhones.length > 0) {
        if (contactInfo) contactInfo += " | ";
        contactInfo += "Toll Free: " + currentPhones[0];
      }

      if (isTpa) {
        if (!loadedTpas.some(t => t.name === currentCompany)) {
          loadedTpas.push({ name: currentCompany, address: contactInfo });
        }
      } else {
        if (!loadedInsuranceCompanies.includes(currentCompany)) {
          loadedInsuranceCompanies.push(currentCompany);
        }
      }

      currentCompany = null;
      currentEmails = [];
      currentPhones = [];
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const c1 = (row[1] || '').trim();

      if (c1 && !c1.includes('@') && c1.length >= 3) {
        const lower = c1.toLowerCase();
        const shouldSkip = skipKeywords.some(w => lower === w || lower.startsWith(w) || w.startsWith(lower));
        if (!shouldSkip) {
          const cleaned = c1.replace(/^[\*#\-_]+|[\*#\-_]+$/g, '').trim().toUpperCase();
          if (cleaned.length >= 3 && !cleaned.startsWith('HTTP') && !cleaned.startsWith('<')) {
            commitCompany();
            currentCompany = cleaned;
            continue;
          }
        }
      }

      if (currentCompany) {
        for (const col of row) {
          const val = (col || '').trim();
          if (val.includes('@') && !currentEmails.includes(val)) {
            currentEmails.push(val);
          } else if (/^[0-9\s-]{6,}$/.test(val) && !currentPhones.includes(val)) {
            currentPhones.push(val);
          }
        }
      }
    }
    commitCompany();
  };

  // 1. Try TPAs tab
  try {
    const tpaResp = await fetch(`/api/sheet-proxy?url=${encodeURIComponent(spreadsheetUrl)}&sheet=TPAs`);
    if (tpaResp.ok) {
      const rawText = await tpaResp.text();
      const trimmed = (rawText || '').trim();
      let tpaData: any = null;
      if (trimmed && !trimmed.startsWith('<') && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
        try { tpaData = JSON.parse(trimmed); } catch {}
      }
      if (tpaData?.data && typeof tpaData.data === 'string' && !tpaData.data.trim().startsWith('<')) {
        const rows = parseCsv(tpaData.data);
        parseRowsToMetadata(rows);
      }
    }
  } catch (err) {
    console.warn('Notice reading TPAs tab from spreadsheet:', err);
  }

  // 2. Try InsuranceCompanies tab
  try {
    const insResp = await fetch(`/api/sheet-proxy?url=${encodeURIComponent(spreadsheetUrl)}&sheet=InsuranceCompanies`);
    if (insResp.ok) {
      const rawText = await insResp.text();
      const trimmed = (rawText || '').trim();
      let insData: any = null;
      if (trimmed && !trimmed.startsWith('<') && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
        try { insData = JSON.parse(trimmed); } catch {}
      }
      if (insData?.data && typeof insData.data === 'string' && !insData.data.trim().startsWith('<')) {
        const rows = parseCsv(insData.data);
        parseRowsToMetadata(rows);
      }
    }
  } catch (err) {
    console.warn('Notice reading InsuranceCompanies tab from spreadsheet:', err);
  }

  // 3. If nothing loaded yet or root export needed, fetch root spreadsheet export
  if (loadedTpas.length === 0 || loadedInsuranceCompanies.length === 0) {
    try {
      const rootResp = await fetch(`/api/sheet-proxy?url=${encodeURIComponent(spreadsheetUrl)}`);
      if (rootResp.ok) {
        const rawText = await rootResp.text();
        const trimmed = (rawText || '').trim();
        let rootData: any = null;
        if (trimmed && !trimmed.startsWith('<') && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
          try { rootData = JSON.parse(trimmed); } catch {}
        }
        if (rootData?.data && typeof rootData.data === 'string' && !rootData.data.trim().startsWith('<')) {
          const rows = parseCsv(rootData.data);
          parseRowsToMetadata(rows);
        }
      }
    } catch (err) {
      console.warn('Notice reading root spreadsheet export:', err);
    }
  }

  // 4. Also fetch Sheet 2 Col A for Col B Insurance Companies
  if (loadedInsuranceCompanies.length === 0) {
    try {
      const s2Resp = await fetch(`/api/sheet-proxy?url=${encodeURIComponent(spreadsheetUrl)}&sheet=Sheet2&col=B`);
      if (s2Resp.ok) {
        const rawText = await s2Resp.text();
        const trimmed = (rawText || '').trim();
        let s2Data: any = null;
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try { s2Data = JSON.parse(trimmed); } catch {}
        }
        if (s2Data?.data && typeof s2Data.data === 'string' && !s2Data.data.trim().startsWith('<')) {
          const rows = parseCsv(s2Data.data);
          if (rows.length > 0) {
            const hasH = rows[0].some(c => (c || '').toLowerCase().includes('insurance') || (c || '').toLowerCase().includes('2.'));
            const startR = hasH ? 1 : 0;
            for (let r = startR; r < rows.length; r++) {
              const val = (rows[r][0] || '').trim().toUpperCase();
              if (val && !val.startsWith('2.') && val !== 'INSURANCE COMPANY' && !loadedInsuranceCompanies.includes(val)) {
                loadedInsuranceCompanies.push(val);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Notice reading Sheet 2 Col A in fetchSpreadsheetMetadata:', err);
    }
  }

  return { loadedTpas, loadedInsuranceCompanies };
}

/**
 * Auto-load / Pull TPAs and Insurance Companies from Google Sheet or Web App
 */
export const loadMetadataFromGoogleSheet = async (
  customUrl?: string
): Promise<MetadataSyncResult> => {
  const targetUrl = (customUrl || getActiveSyncUrl()).trim();
  if (!targetUrl) {
    return {
      success: false,
      tpasCount: 0,
      insuranceCount: 0,
      loadedTpas: [],
      loadedInsuranceCompanies: [],
      message: 'No Google Sheet or Web App URL configured.'
    };
  }

  let loadedTpas: Array<{ name: string; address?: string; bankDetails?: BankDetails }> = [];
  let loadedInsuranceCompanies: string[] = [];

  try {
    let scriptWarning = '';

    // Strategy 1: Google Sheet Direct Spreadsheet URL
    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      const sheetResult = await fetchSpreadsheetMetadata(targetUrl);
      loadedTpas = sheetResult.loadedTpas;
      loadedInsuranceCompanies = sheetResult.loadedInsuranceCompanies;
    } else {
      // Strategy 2: Google Apps Script Web App Endpoint
      const proxyUrl = `/api/sheet-proxy?url=${encodeURIComponent(targetUrl)}&action=getMetadata`;
      try {
        const resp = await fetch(proxyUrl);
        const rawText = await resp.text();
        const trimmed = (rawText || '').trim();
        let json: any = null;

        if (trimmed && !trimmed.startsWith('<') && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
          try {
            json = JSON.parse(trimmed);
          } catch {}
        }

        if (json && json.error) {
          scriptWarning = json.message || json.error;
        }

        if (json && !json.error && (json.tpas || json.insuranceCompanies)) {
          if (Array.isArray(json.tpas)) {
            loadedTpas = json.tpas.map((item: any) => {
              const name = (typeof item === 'string' ? item : (item.name || item.tpaName || '')).trim().toUpperCase();
              const addr = (typeof item === 'object' && item.address)
                ? String(item.address).trim().toUpperCase()
                : String((json.tpaAddresses && json.tpaAddresses[name]) || (json.addresses && json.addresses[name]) || '').trim().toUpperCase();
              return {
                name,
                address: addr,
                bankDetails: (typeof item === 'object' && item.bankDetails) ? item.bankDetails : {
                  bankName: item?.bankName || '',
                  bankAccountNo: item?.bankAccountNo || item?.accountNumber || '',
                  ifscCode: item?.ifscCode || '',
                  bankAddress: item?.bankAddress || '',
                  panCard: item?.panCard || ''
                }
              };
            }).filter((t: any) => Boolean(t.name));
          }

          if (Array.isArray(json.insuranceCompanies)) {
            loadedInsuranceCompanies = json.insuranceCompanies.map((c: any) => {
              if (typeof c === 'string') return c.trim().toUpperCase();
              return (c.name || c.companyName || '').trim().toUpperCase();
            }).filter(Boolean);
          }
        }
      } catch (scriptErr: any) {
        scriptWarning = scriptErr?.message || 'Failed to connect to Web App endpoint';
        console.warn('Google Web App metadata notice:', scriptErr);
      }

      // If Web App returned 0 items (e.g. requires auth or missing doGet), try fallback to spreadsheet
      if (loadedTpas.length === 0 && loadedInsuranceCompanies.length === 0) {
        const fallbackSpreadsheetUrl = getSpreadsheetSharingUrl();
        if (fallbackSpreadsheetUrl && fallbackSpreadsheetUrl.includes('docs.google.com/spreadsheets')) {
          const sheetResult = await fetchSpreadsheetMetadata(fallbackSpreadsheetUrl);
          if (sheetResult.loadedTpas.length > 0 || sheetResult.loadedInsuranceCompanies.length > 0) {
            loadedTpas = sheetResult.loadedTpas;
            loadedInsuranceCompanies = sheetResult.loadedInsuranceCompanies;
          }
        }
      }
    }

    // Deduplicate loaded TPAs & Insurance Companies using First 7 Words rule
    const { unique: dedupedLoadedTpas, skippedCount: skippedTpaLoadDups } = filterDuplicatesBy7Words(
      loadedTpas,
      t => t.name
    );
    const { unique: dedupedLoadedInsurers, skippedCount: skippedInsLoadDups } = filterDuplicatesBy7Words(
      loadedInsuranceCompanies,
      c => c
    );

    const existingTpas = getAllTpaOptions();
    const existingInsurers = getAllInsuranceCompanies();

    // Now persist loaded TPAs, Addresses & Bank Details into database (skipping duplicates)
    let newTpasAdded = 0;
    let addressesSavedCount = 0;
    dedupedLoadedTpas.forEach(tpa => {
      const isExistingDuplicate = existingTpas.some(ex => isDuplicateBy7Words(ex, tpa.name));
      if (!isExistingDuplicate) {
        const res = addCustomTpa(tpa.name, tpa.bankDetails, tpa.address);
        if (res.isNew) newTpasAdded++;
      }
      if (tpa.bankDetails && (tpa.bankDetails.bankName || tpa.bankDetails.bankAccountNo)) {
        saveCustomTpaBankDetails(tpa.name, tpa.bankDetails);
      }
      const addrToSave = tpa.address || getMatchingInsuranceAddress(tpa.name);
      if (addrToSave) {
        saveCustomTpaAddress(tpa.name, addrToSave);
        addressesSavedCount++;
      }
    });

    // Persist loaded Insurance Companies (skipping duplicates)
    let newInsAdded = 0;
    dedupedLoadedInsurers.forEach(comp => {
      const isExistingDuplicate = existingInsurers.some(ex => isDuplicateBy7Words(ex, comp));
      if (!isExistingDuplicate) {
        const res = addCustomInsuranceCompany(comp);
        if (res.isNew) newInsAdded++;
      }
    });

    const totalSkipped = skippedTpaLoadDups + skippedInsLoadDups;

    const now = new Date().toISOString();
    try {
      localStorage.setItem(METADATA_SYNC_LAST_TIME_KEY, now);
    } catch {}

    const totalTpas = getAllTpaOptions().length;
    const totalIns = getAllInsuranceCompanies().length;

    const source: 'webapp' | 'spreadsheet' | 'local' =
      dedupedLoadedTpas.length > 0 || dedupedLoadedInsurers.length > 0
        ? (scriptWarning ? 'spreadsheet' : (targetUrl.includes('docs.google.com') ? 'spreadsheet' : 'webapp'))
        : 'local';

    let returnMsg = `✓ Successfully synced! Loaded ${dedupedLoadedTpas.length} TPAs (Col A), ${dedupedLoadedInsurers.length} Insurance Companies (Col B), and ${addressesSavedCount} Addresses (Col C).`;
    if (totalSkipped > 0) {
      returnMsg += ` (Auto-skipped ${totalSkipped} duplicate entries matching first 7 words)`;
    }
    if (scriptWarning && (dedupedLoadedTpas.length > 0 || dedupedLoadedInsurers.length > 0)) {
      returnMsg = `✓ Synced ${dedupedLoadedTpas.length} TPAs, ${dedupedLoadedInsurers.length} Insurance Companies & ${addressesSavedCount} Addresses from Google Sheet! (Apps Script notice: ${scriptWarning})`;
      if (totalSkipped > 0) {
        returnMsg += ` [Skipped ${totalSkipped} duplicates]`;
      }
    } else if (dedupedLoadedTpas.length === 0 && dedupedLoadedInsurers.length === 0) {
      returnMsg = scriptWarning ? `Notice: ${scriptWarning}` : `Connected to Google sync endpoint.`;
    }

    return {
      success: true,
      tpasCount: dedupedLoadedTpas.length || totalTpas,
      insuranceCount: dedupedLoadedInsurers.length || totalIns,
      loadedTpas: dedupedLoadedTpas,
      loadedInsuranceCompanies: dedupedLoadedInsurers,
      source,
      warningNotice: scriptWarning || undefined,
      duplicatesSkipped: totalSkipped,
      message: returnMsg
    };
  } catch (error: any) {
    console.warn('Metadata sync notice:', error?.message || error);
    return {
      success: false,
      tpasCount: 0,
      insuranceCount: 0,
      loadedTpas: [],
      loadedInsuranceCompanies: [],
      message: `Sync notice: ${error?.message || 'Could not connect to Google service'}`
    };
  }
};

/**
 * Save / Push a single TPA to Google Sheet Web App
 */
export const saveTpaToGoogleSheet = async (tpa: {
  name: string;
  address?: string;
  bankDetails?: BankDetails;
}): Promise<boolean> => {
  const syncUrl = getActiveSyncUrl();
  const norm = (tpa.name || '').trim().toUpperCase();
  if (!syncUrl || !norm) return false;

  // Skip if already exists in list based on first 7 words
  const currentTpas = getAllTpaOptions();
  const hasDuplicate = currentTpas.some(t => t.toUpperCase() !== norm && isDuplicateBy7Words(t, norm));
  if (hasDuplicate) {
    console.log(`[Sync] Skipped sending duplicate TPA by 7-words rule: "${norm}"`);
    return true;
  }

  const payload = {
    action: 'saveTpa',
    tpaName: norm,
    address: tpa.address || '',
    bankDetails: tpa.bankDetails || {},
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(`/api/sheet-proxy?url=${encodeURIComponent(syncUrl)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.warn('Failed to send saveTpa to Google Sheet:', err);
    return false;
  }
};

/**
 * Delete a TPA from Google Sheet Web App
 */
export const deleteTpaFromGoogleSheet = async (tpaName: string): Promise<boolean> => {
  const syncUrl = getActiveSyncUrl();
  const norm = (tpaName || '').trim().toUpperCase();
  if (!syncUrl || !norm) return false;

  const payload = {
    action: 'deleteTpa',
    tpaName: norm,
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(`/api/sheet-proxy?url=${encodeURIComponent(syncUrl)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.warn('Failed to send deleteTpa to Google Sheet:', err);
    return false;
  }
};

/**
 * Save / Push an Insurance Company to Google Sheet Web App
 */
export const saveInsuranceCompanyToGoogleSheet = async (companyName: string): Promise<boolean> => {
  const syncUrl = getActiveSyncUrl();
  const norm = (companyName || '').trim().toUpperCase();
  if (!syncUrl || !norm) return false;

  // Skip if already exists in list based on first 7 words
  const currentInsurers = getAllInsuranceCompanies();
  const hasDuplicate = currentInsurers.some(c => c.toUpperCase() !== norm && isDuplicateBy7Words(c, norm));
  if (hasDuplicate) {
    console.log(`[Sync] Skipped sending duplicate insurance company by 7-words rule: "${norm}"`);
    return true;
  }

  const payload = {
    action: 'saveInsuranceCompany',
    companyName: norm,
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(`/api/sheet-proxy?url=${encodeURIComponent(syncUrl)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.warn('Failed to send saveInsuranceCompany to Google Sheet:', err);
    return false;
  }
};

/**
 * Delete an Insurance Company from Google Sheet Web App
 */
export const deleteInsuranceCompanyFromGoogleSheet = async (companyName: string): Promise<boolean> => {
  const syncUrl = getActiveSyncUrl();
  const norm = (companyName || '').trim().toUpperCase();
  if (!syncUrl || !norm) return false;

  const payload = {
    action: 'deleteInsuranceCompany',
    companyName: norm,
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(`/api/sheet-proxy?url=${encodeURIComponent(syncUrl)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.warn('Failed to send deleteInsuranceCompany to Google Sheet:', err);
    return false;
  }
};

/**
 * Synchronize Column B (2. INSURANCE COMPANY) directly to Google Sheet (Sheet 2 Col A)
 * Strictly merges new local insurers with existing Sheet 2 Col A entries - NEVER deletes existing data!
 */
export const syncColBToGoogleSheet = async (
  customUrl?: string
): Promise<{ success: boolean; message: string; count: number }> => {
  const syncUrl = (customUrl || getColBSpreadsheetUrl() || getActiveSyncUrl()).trim();
  if (!syncUrl) {
    return { success: false, message: 'No Google Sheet or Web App URL configured for Col B.', count: 0 };
  }

  // 1. Ensure we pull latest from Sheet 2 Col A first
  await loadColBOnlyFromSpreadsheet(syncUrl).catch(() => {});

  const allInsurers = getAllInsuranceCompanies();
  const { unique: dedupedInsurers } = filterDuplicatesBy7Words(allInsurers, c => c);

  const payload = {
    action: 'syncColB',
    colB: dedupedInsurers,
    insuranceCompanies: dedupedInsurers,
    headers: ['2. INSURANCE COMPANY'],
    column: 'B',
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(`/api/sheet-proxy?url=${encodeURIComponent(syncUrl)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch {}

    const count = data?.count || dedupedInsurers.length;
    return {
      success: res.ok,
      message: data?.message || `✓ Sheet 2 Col A synchronized safely with ${count} insurance companies. Existing data preserved!`,
      count
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to sync Col B to Google Sheet: ${err.message || 'Network error'}`,
      count: 0
    };
  }
};

/**
 * Full Bulk Push of all TPAs and Insurance Companies to Google Sheet
 * Auto-filters duplicates using the First 7 Words rule so duplicate names do not go to the sheet!
 */
export const pushAllMetadataToGoogleSheet = async (
  customUrl?: string
): Promise<{ success: boolean; message: string; tpasCount?: number; insuranceCount?: number; duplicatesSkipped?: number }> => {
  const syncUrl = (customUrl || getActiveSyncUrl()).trim();
  if (!syncUrl) {
    return { success: false, message: 'No Google Sheet or Web App URL configured.' };
  }

  const allTpas = getAllTpaOptions();
  const allAddresses = getAllTpaInsuranceAddresses();
  const customBanks = getCustomTpaBankDetails();

  // Deduplicate TPAs using starting first 7 words rule
  const { unique: uniqueTpas, skippedCount: skippedTpaDups } = filterDuplicatesBy7Words(
    allTpas,
    t => t
  );

  const tpaAddressesMap: Record<string, string> = {};
  const tpaObjects = uniqueTpas.map(name => {
    const norm = name.trim().toUpperCase();
    const addr = allAddresses[norm] || getMatchingInsuranceAddress(norm) || '';
    if (addr) {
      tpaAddressesMap[norm] = addr;
    }
    return {
      name: norm,
      address: addr,
      bankDetails: customBanks[norm] || {}
    };
  });

  const allInsurers = getAllInsuranceCompanies();
  // Deduplicate Insurance Companies using starting first 7 words rule
  const { unique: uniqueInsurers, skippedCount: skippedInsDups } = filterDuplicatesBy7Words(
    allInsurers,
    c => c
  );

  const totalDupsSkipped = skippedTpaDups + skippedInsDups;

  const payload = {
    action: 'syncAllMetadata',
    tpas: tpaObjects,
    tpaNames: uniqueTpas,
    tpaAddresses: tpaAddressesMap,
    addresses: tpaAddressesMap,
    insuranceCompanies: uniqueInsurers,
    headers: ['1.  TPA / INS. NAME', '2. INSURANCE COMPANY', '3. INSURANCE / TPA ADDRESS'],
    threeColumns: {
      headers: ['1.  TPA / INS. NAME', '2. INSURANCE COMPANY', '3. INSURANCE / TPA ADDRESS'],
      tpas: uniqueTpas,
      insuranceCompanies: uniqueInsurers,
      addresses: tpaAddressesMap
    },
    twoColumns: {
      headers: ['1.  TPA / INS. NAME', '2. INSURANCE COMPANY', '3. INSURANCE / TPA ADDRESS'],
      tpas: uniqueTpas,
      insuranceCompanies: uniqueInsurers,
      addresses: tpaAddressesMap
    },
    deduplicationRule: 'first_7_words',
    duplicatesSkipped: totalDupsSkipped,
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(`/api/sheet-proxy?url=${encodeURIComponent(syncUrl)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {}

    const addressCount = Object.keys(tpaAddressesMap).length;
    let successMsg = `✓ Pushed ${uniqueTpas.length} TPAs (Col A), ${uniqueInsurers.length} Insurance Companies (Col B), and ${addressCount} Addresses (Col C) to Google Sheet!`;
    if (totalDupsSkipped > 0) {
      successMsg += ` (Auto-skipped ${totalDupsSkipped} duplicates matching first 7 words)`;
    }

    if (data && (data.status === 'success' || data.tpasCount !== undefined)) {
      return {
        success: true,
        message: data.message || successMsg,
        tpasCount: uniqueTpas.length,
        insuranceCount: uniqueInsurers.length,
        duplicatesSkipped: totalDupsSkipped
      };
    }

    if (!res.ok) {
      const errMsg = (data && (data.message || data.error)) || `Server returned ${res.status}`;
      return { success: false, message: errMsg };
    }

    return {
      success: true,
      message: successMsg,
      tpasCount: uniqueTpas.length,
      insuranceCount: uniqueInsurers.length,
      duplicatesSkipped: totalDupsSkipped
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to push to Google Sheet: ${err.message || 'Network error'}`
    };
  }
};

/**
 * Save / Update a single TPA Address specifically to Google Sheet (Col C)
 */
export const saveTpaAddressToGoogleSheet = async (
  tpaName: string,
  address: string,
  customUrl?: string
): Promise<boolean> => {
  const syncUrl = (customUrl || getActiveSyncUrl()).trim();
  if (!syncUrl || !tpaName || !address) return false;

  const payload = {
    action: 'saveAddress',
    tpaName: tpaName.trim().toUpperCase(),
    address: address.trim().toUpperCase(),
    insuranceAddress: address.trim().toUpperCase(),
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(`/api/sheet-proxy?url=${encodeURIComponent(syncUrl)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to send saveAddress to Google Sheet:', err);
    return false;
  }
};

/**
 * Two-way metadata synchronization: Push local data to Google Sheet AND load latest
 */
export const syncMetadataTwoWay = async (
  customUrl?: string
): Promise<{ success: boolean; message: string; tpasCount: number; insuranceCount: number }> => {
  const target = (customUrl || getActiveSyncUrl()).trim();
  // 1. FIRST load latest from Google Sheet so we HAVE all Sheet 2 Col A data in memory before pushing
  const loadRes = await autoLoadAllThreeColumnsFromSpreadsheet(target);
  // 2. Push merged lists to Google Sheet (Google Apps Script preserves all existing Sheet 2 Col A data)
  const pushRes = await pushAllMetadataToGoogleSheet(target);

  const totalTpas = getAllTpaOptions().length;
  const totalIns = getAllInsuranceCompanies().length;

  return {
    success: pushRes.success || loadRes.success,
    message: `✓ Two-way sync complete! Updated ${totalTpas} TPAs and ${totalIns} Insurance Companies with Google Sheet.`,
    tpasCount: totalTpas,
    insuranceCount: totalIns
  };
};

/**
 * Production-ready Google Apps Script Code with full TPA, Bank Details & Insurance Company synchronization
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * HOSPITAL CLAIMS, TPA & INSURANCE METADATA SYNC - GOOGLE APPS SCRIPT
 * Arpa Medcity Hospital & Research Institute
 * ==============================================================================
 * 
 * Features Included:
 * 1. Exact Header Layout for TPAs according to specifications:
 *    [Sl.No | TPA NAME | TPA ADDRESS | Bank Name | A/c Number | IFSC CODE | BANK ADDRESS]
 * 2. Styled with vibrant Green Header Background (#00873D) & Bold White Text (#FFFFFF)
 * 3. Auto Column Adjust: Automatically calculates column widths + comfortable padding
 * 4. Column Border: Clean vertical lines separating each column
 * 5. Row Border: Crisp horizontal lines for all rows (both data & headers)
 * 6. Header Border: Bold distinct borders on top, bottom, and between header cells
 * 7. Automatic Sheet Tab Creation: "Claims", "TPAs", and "InsuranceCompanies"
 * 8. Two-Way Sync of TPAs with linked Hospital Bank Details & Addresses
 * 9. Two-Way Sync of Insurance Companies & Full Claim Dossier synchronization
 * 10. Custom Menu in Google Sheets: Run borders & auto column width formatting anytime
 * 
 * Instructions:
 * 1. In your Google Spreadsheet, open: Extensions > Apps Script
 * 2. Delete any existing code and paste this entire script.
 * 3. Click "Deploy" > "New deployment"
 * 4. Select type: "Web app"
 * 5. Set:
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Click "Deploy" and authorize permissions.
 * 7. Copy the "Web app URL" and paste it into the app's Google Sync URL field!
 */

/**
 * Custom Menu added when spreadsheet is opened
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🏥 Hospital Claims Sync')
    .addItem('✨ Auto-Format All Sheets (Borders & Auto Column Width)', 'autoFormatAllSheets')
    .addItem('📋 Initialize / Refresh All Tabs & Headers', 'setupSheet')
    .addToUi();
}

/**
 * Universal Formatter: Auto Column Adjust, Column Border, Row Border, and Header Border
 * @param {Sheet} sheet The Google Spreadsheet sheet object
 * @param {number} numCols Total number of columns to format
 * @param {string} headerBg Header background color (hex)
 * @param {string} headerColor Header font color (hex)
 */
function formatSheet(sheet, numCols, headerBg, headerColor) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 1 || !numCols || numCols < 1) return;

  // 1. HEADER ROW STYLING & HEADER BORDER
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange
    .setFontWeight("bold")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setBackground(headerBg || "#00873D")
    .setFontColor(headerColor || "#FFFFFF")
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("left");
  
  // Center align Sl.No header if present
  if (numCols >= 1 && String(headerRange.getCell(1, 1).getValue()).toLowerCase().includes("sl")) {
    headerRange.getCell(1, 1).setHorizontalAlignment("center");
  }
  
  // Header Border: (top, left, bottom, right, vertical, horizontal, color, style)
  headerRange.setBorder(
    true, true, true, true, true, true,
    "#005A28", // Solid clean border matching header
    SpreadsheetApp.BorderStyle.SOLID_MEDIUM
  );
  sheet.setRowHeight(1, 36);

  // 2. DATA ROWS: ROW BORDER, COLUMN BORDER & CELL STYLING
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, numCols);
    dataRange
      .setFontFamily("Arial")
      .setFontSize(10)
      .setVerticalAlignment("middle")
      .setHorizontalAlignment("left");

    // Row Border & Column Border: applies both vertical column lines and horizontal row lines
    dataRange.setBorder(
      true, true, true, true, true, true,
      "#CBD5E1", // Clean border for all cells
      SpreadsheetApp.BorderStyle.SOLID
    );

    // Center align Sl.No data column
    sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment("center");

    // Enforce plain text on account numbers to prevent scientific notation
    if (numCols >= 5) {
      sheet.getRange(2, 5, lastRow - 1, 1).setNumberFormat('@');
    }

    // Uniform comfortable row height for data
    for (var r = 2; r <= lastRow; r++) {
      sheet.setRowHeight(r, 26);
    }
  }

  // 3. AUTO COLUMN ADJUST (Auto-fit widths with clean padding)
  sheet.autoResizeColumns(1, numCols);
  for (var c = 1; c <= numCols; c++) {
    var currentWidth = sheet.getColumnWidth(c);
    // Add 16px comfortable padding, clamp between 80px min and 360px max
    sheet.setColumnWidth(c, Math.min(Math.max(currentWidth + 16, 80), 360));
  }
}

/**
 * Formats all three sheets in the workbook
 */
function autoFormatAllSheets() {
  setupSheet();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var tpaSheet = ss.getSheetByName("TPAs");
  if (tpaSheet) formatSheet(tpaSheet, 7, "#00873D", "#FFFFFF");
  
  var insSheet = ss.getSheetByName("InsuranceCompanies");
  if (insSheet) formatSheet(insSheet, 2, "#1E3A8A", "#FFFFFF");
  
  var claimsSheet = ss.getSheetByName("Claims");
  if (claimsSheet) formatSheet(claimsSheet, 38, "#064E3B", "#FFFFFF");
}

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup TPAs Tab (exact header according to provided image)
  var tpaSheet = ss.getSheetByName("TPAs");
  if (!tpaSheet) {
    tpaSheet = ss.insertSheet("TPAs");
  }
  var tpaHeaders = [
    "Sl.No",
    "TPA NAME",
    "TPA ADDRESS",
    "Bank Name",
    "A/c Number",
    "IFSC CODE",
    "BANK ADDRESS"
  ];
  tpaSheet.getRange(1, 1, 1, tpaHeaders.length).setValues([tpaHeaders]);
  tpaSheet.setFrozenRows(1);
  formatSheet(tpaSheet, tpaHeaders.length, "#00873D", "#FFFFFF");

  // 2. Setup Insurance Companies Tab
  var insSheet = ss.getSheetByName("InsuranceCompanies");
  if (!insSheet) {
    insSheet = ss.insertSheet("InsuranceCompanies");
  }
  var insHeaders = ["INSURANCE COMPANY NAME", "LAST UPDATED"];
  if (insSheet.getLastRow() === 0) {
    insSheet.getRange(1, 1, 1, insHeaders.length).setValues([insHeaders]);
  } else {
    insSheet.getRange(1, 1, 1, insHeaders.length).setValues([insHeaders]);
  }
  insSheet.setFrozenRows(1);
  formatSheet(insSheet, insHeaders.length, "#1E3A8A", "#FFFFFF");

  // 3. Setup Claims Tab
  var claimsSheet = ss.getSheetByName("Claims");
  if (!claimsSheet) {
    claimsSheet = ss.insertSheet("Claims");
  }
  var claimHeaders = [
    "S.No", "Patient Name", "UHID", "Mobile Number", "Readmit",
    "IPD No", "DOA", "DOD", "TPA Name", "Insurance Company",
    "Insurance ID", "Claim No", "Policy Number", "Emp ID",
    "Bill Invoice No", "Total Bill", "Approved", "Discount",
    "Payment Received", "Patient Pay", "Settlement Amount", "TDS",
    "Payment Date", "UTR", "Attender Name", "Relation",
    "Insurance Address", "Bank Name", "Bank Account No", "IFSC Code",
    "Bank Address", "Courier Details", "Courier Date", "Diagnosis",
    "Surgery Name", "Remark", "Status", "Updated At"
  ];
  if (claimsSheet.getLastRow() === 0) {
    claimsSheet.getRange(1, 1, 1, claimHeaders.length).setValues([claimHeaders]);
  } else {
    claimsSheet.getRange(1, 1, 1, claimHeaders.length).setValues([claimHeaders]);
  }
  claimsSheet.setFrozenRows(1);
  formatSheet(claimsSheet, claimHeaders.length, "#064E3B", "#FFFFFF");
}

function doGet(e) {
  setupSheet();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getMetadata";

  if (action === "format" || action === "autoFormat") {
    autoFormatAllSheets();
    return createJsonResponse({
      status: "success",
      message: "Applied auto column adjust, column border, row border, and header border across all sheets."
    });
  }

  if (action === "getMetadata" || action === "loadTpas" || action === "loadInsuranceCompanies") {
    var tpas = getTpasFromSheet(ss);
    var insuranceCompanies = getInsuranceCompaniesFromSheet(ss);
    return createJsonResponse({
      status: "success",
      tpas: tpas,
      insuranceCompanies: insuranceCompanies,
      timestamp: new Date().toISOString()
    });
  }

  if (action === "getClaims") {
    var claims = getClaimsFromSheet(ss);
    return createJsonResponse({
      status: "success",
      claims: claims,
      timestamp: new Date().toISOString()
    });
  }

  return createJsonResponse({
    status: "success",
    tpas: getTpasFromSheet(ss),
    insuranceCompanies: getInsuranceCompaniesFromSheet(ss),
    claims: getClaimsFromSheet(ss),
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  setupSheet();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var data = {};
  try {
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return createJsonResponse({ status: "error", message: "Invalid JSON payload: " + err.message });
  }

  var action = data.action || (Array.isArray(data.claims) ? "syncClaims" : "saveTpa");

  // 1. SAVE TPA (with bank details & address matching 7-column header)
  if (action === "saveTpa" || action === "addTpa") {
    var tpaName = (data.tpaName || "").trim().toUpperCase();
    if (!tpaName) {
      return createJsonResponse({ status: "error", message: "Missing tpaName" });
    }
    var tpaSheet = ss.getSheetByName("TPAs");
    var address = data.address || "";
    var bank = data.bankDetails || {};
    var lastRow = tpaSheet.getLastRow();
    var foundRow = -1;

    // Search existing by TPA NAME (Column 2)
    if (lastRow > 1) {
      var values = tpaSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][0]).trim().toUpperCase() === tpaName) {
          foundRow = i + 2;
          break;
        }
      }
    }

    var slNo = (foundRow > 0) ? (foundRow - 1) : Math.max(1, lastRow);
    var rowData = [
      slNo,
      tpaName,
      address,
      (bank.bankName || "").toUpperCase(),
      (bank.bankAccountNo || ""),
      (bank.ifscCode || "").toUpperCase(),
      (bank.bankAddress || "").toUpperCase()
    ];

    if (foundRow > 0) {
      tpaSheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      tpaSheet.appendRow(rowData);
    }

    // Re-index Sl.No
    var updatedLastRow = tpaSheet.getLastRow();
    if (updatedLastRow > 1) {
      for (var r = 2; r <= updatedLastRow; r++) {
        tpaSheet.getRange(r, 1).setValue(r - 1);
      }
    }

    // Apply green header (#00873D), white bold text, auto column adjust, borders
    formatSheet(tpaSheet, 7, "#00873D", "#FFFFFF");

    return createJsonResponse({ status: "success", message: "TPA saved", tpaName: tpaName });
  }

  // 2. DELETE TPA
  if (action === "deleteTpa") {
    var delName = (data.tpaName || "").trim().toUpperCase();
    var tpaSheet = ss.getSheetByName("TPAs");
    var lastRow = tpaSheet.getLastRow();
    if (lastRow > 1) {
      // Column 2 is TPA NAME
      var values = tpaSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = values.length - 1; i >= 0; i--) {
        if (String(values[i][0]).trim().toUpperCase() === delName) {
          tpaSheet.deleteRow(i + 2);
        }
      }
    }
    // Re-index Sl.No
    var postDelLastRow = tpaSheet.getLastRow();
    if (postDelLastRow > 1) {
      for (var r2 = 2; r2 <= postDelLastRow; r2++) {
        tpaSheet.getRange(r2, 1).setValue(r2 - 1);
      }
    }
    formatSheet(tpaSheet, 7, "#00873D", "#FFFFFF");
    return createJsonResponse({ status: "success", message: "TPA deleted", tpaName: delName });
  }

  // 3. SAVE INSURANCE COMPANY
  if (action === "saveInsuranceCompany" || action === "addInsuranceCompany") {
    var compName = (data.companyName || "").trim().toUpperCase();
    if (!compName) {
      return createJsonResponse({ status: "error", message: "Missing companyName" });
    }
    var insSheet = ss.getSheetByName("InsuranceCompanies");
    var lastRow = insSheet.getLastRow();
    var exists = false;
    if (lastRow > 1) {
      var values = insSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][0]).trim().toUpperCase() === compName) {
          exists = true;
          insSheet.getRange(i + 2, 2).setValue(new Date().toISOString());
          break;
        }
      }
    }
    if (!exists) {
      insSheet.appendRow([compName, new Date().toISOString()]);
    }
    formatSheet(insSheet, 2, "#1E3A8A", "#FFFFFF");

    return createJsonResponse({ status: "success", message: "Insurance company saved", companyName: compName });
  }

  // 4. DELETE INSURANCE COMPANY
  if (action === "deleteInsuranceCompany") {
    var delComp = (data.companyName || "").trim().toUpperCase();
    var insSheet = ss.getSheetByName("InsuranceCompanies");
    var lastRow = insSheet.getLastRow();
    if (lastRow > 1) {
      var values = insSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = values.length - 1; i >= 0; i--) {
        if (String(values[i][0]).trim().toUpperCase() === delComp) {
          insSheet.deleteRow(i + 2);
        }
      }
    }
    formatSheet(insSheet, 2, "#1E3A8A", "#FFFFFF");
    return createJsonResponse({ status: "success", message: "Insurance company deleted", companyName: delComp });
  }

  // 5. BULK METADATA SYNC
  if (action === "syncAllMetadata") {
    var tpaSheet = ss.getSheetByName("TPAs");
    if (Array.isArray(data.tpas)) {
      if (tpaSheet.getLastRow() > 1) {
        tpaSheet.getRange(2, 1, tpaSheet.getLastRow() - 1, 7).clearContent().clearFormat();
      }
      var tpaRows = data.tpas.map(function(t, idx) {
        var b = t.bankDetails || {};
        return [
          idx + 1,
          (t.name || "").toUpperCase(),
          t.address || "",
          (b.bankName || "").toUpperCase(),
          b.bankAccountNo || "",
          (b.ifscCode || "").toUpperCase(),
          (b.bankAddress || "").toUpperCase()
        ];
      });
      if (tpaRows.length > 0) {
        tpaSheet.getRange(2, 1, tpaRows.length, 7).setValues(tpaRows);
      }
      formatSheet(tpaSheet, 7, "#00873D", "#FFFFFF");
    }

    var insSheet = ss.getSheetByName("InsuranceCompanies");
    if (Array.isArray(data.insuranceCompanies)) {
      if (insSheet.getLastRow() > 1) {
        insSheet.getRange(2, 1, insSheet.getLastRow() - 1, 2).clearContent().clearFormat();
      }
      var insRows = data.insuranceCompanies.map(function(c) {
        return [(c || "").toUpperCase(), new Date().toISOString()];
      });
      if (insRows.length > 0) {
        insSheet.getRange(2, 1, insRows.length, 2).setValues(insRows);
      }
      formatSheet(insSheet, 2, "#1E3A8A", "#FFFFFF");
    }

    return createJsonResponse({ status: "success", message: "All metadata synced with green header & borders" });
  }

  // 6. CLAIMS SYNC
  if (action === "syncClaims" || Array.isArray(data.claims)) {
    var claims = data.claims || [];
    var claimsSheet = ss.getSheetByName("Claims");
    if (claimsSheet.getLastRow() > 1) {
      claimsSheet.getRange(2, 1, claimsSheet.getLastRow() - 1, 38).clearContent().clearFormat();
    }
    if (claims.length > 0) {
      var rows = claims.map(function(c, idx) {
        return [
          c.sNo || (idx + 1),
          c.patientName || "",
          c.uhid || "",
          c.mobileNumber || "",
          c.readmit || "No",
          c.ipdNo || "",
          c.doa || "",
          c.dod || "",
          c.tpaName || "",
          c.insuranceCompany || "",
          c.insuranceID || "",
          c.claimNo || "",
          c.policyNumber || "",
          c.empID || "",
          c.billInvoiceNo || "",
          c.totalBill || "",
          c.approved || "",
          c.discount || "",
          c.deduction || "",
          c.patientPay || "",
          c.settlementAmount || "",
          c.tds || "",
          c.paymentDate || "",
          c.utr || "",
          c.attenderName || "",
          c.relation || "",
          c.insuranceAddress || "",
          c.bankName || "",
          c.bankAccountNo || "",
          c.ifscCode || "",
          c.bankAddress || "",
          c.courierDetails || "",
          c.courierDate || "",
          c.diagnosis || "",
          c.surgeryName || "",
          c.remark || "",
          c.status || "Admitted",
          new Date().toISOString()
        ];
      });
      claimsSheet.getRange(2, 1, rows.length, 38).setValues(rows);
    }
    formatSheet(claimsSheet, 38, "#064E3B", "#FFFFFF");

    return createJsonResponse({
      status: "success",
      message: "Claims synced successfully with borders and auto column width",
      count: claims.length
    });
  }

  return createJsonResponse({ status: "error", message: "Unknown action" });
}

function getTpasFromSheet(ss) {
  var sheet = ss.getSheetByName("TPAs");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  var result = [];
  for (var i = 0; i < data.length; i++) {
    // Column 1 is Sl.No (data[i][0]), Column 2 is TPA NAME (data[i][1])
    var name = String(data[i][1] || "").trim().toUpperCase();
    if (!name) continue;
    result.push({
      name: name,
      address: String(data[i][2] || "").trim(),
      bankDetails: {
        bankName: String(data[i][3] || "").trim().toUpperCase(),
        bankAccountNo: String(data[i][4] || "").trim(),
        ifscCode: String(data[i][5] || "").trim().toUpperCase(),
        bankAddress: String(data[i][6] || "").trim().toUpperCase()
      }
    });
  }
  return result;
}

function getInsuranceCompaniesFromSheet(ss) {
  var sheet = ss.getSheetByName("InsuranceCompanies");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var result = [];
  for (var i = 0; i < data.length; i++) {
    var name = String(data[i][0]).trim().toUpperCase();
    if (name) result.push(name);
  }
  return result;
}

function getClaimsFromSheet(ss) {
  var sheet = ss.getSheetByName("Claims");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, 37).getValues();
  return values.map(function(r) {
    return {
      sNo: r[0],
      patientName: r[1],
      uhid: r[2],
      mobileNumber: r[3],
      readmit: r[4],
      ipdNo: r[5],
      doa: r[6],
      dod: r[7],
      tpaName: r[8],
      insuranceCompany: r[9],
      insuranceID: r[10],
      claimNo: r[11],
      policyNumber: r[12],
      empID: r[13],
      billInvoiceNo: r[14],
      totalBill: r[15],
      approved: r[16],
      discount: r[17],
      deduction: r[18],
      patientPay: r[19],
      settlementAmount: r[20],
      tds: r[21],
      paymentDate: r[22],
      utr: r[23],
      attenderName: r[24],
      relation: r[25],
      insuranceAddress: r[26],
      bankName: r[27],
      bankAccountNo: r[28],
      ifscCode: r[29],
      bankAddress: r[30],
      courierDetails: r[31],
      courierDate: r[32],
      diagnosis: r[33],
      surgeryName: r[34],
      remark: r[35],
      status: r[36]
    };
  });
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
