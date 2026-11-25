import { BankDetails } from '../types';

export const TPA_OPTIONS = [
  "ADITYA BIRLA GENERAL INSURANCE",
  "AKNA TPA",
  "BAJAJ ALLIANZ",
  "BAJAJ GENERAL INSURANCE",
  "CARE HEALTH INSURACE",
  "CSEB - VIDAL HEALTH INSURANCE TPA",
  "ERICSON TPA",
  "FAMILY HEALTH PLAN INSURANCE TPA LIMITED",
  "FHPL",
  "FUTURE GENERALI INDIA INSURANCE CO. LTD",
  "GENERALI CENTRAL INSURANCE CO. LTD",
  "GENINS INDIA TPA",
  "GO DIGIT GENERAL INSURANCE",
  "HDFC ERGO",
  "HEALTH ASSIST INSURANCE TPA PVT. LTD",
  "HEALTH INDIA",
  "HEALTH INDIA TPA",
  "HERITAGE TPA",
  "HITPA",
  "ICICI LOMBARD",
  "IFFCO TOKIO GENERAL INSURANCE",
  "LINK K TPA",
  "LINK-K INSURANCE TPA PRIVATE LIMITED",
  "MD INDIA TPA",
  "MED SAVE",
  "MEDIASSIST TPA",
  "MEDSAVE TPA ( MP POWER )",
  "NIVA BUPA",
  "PARAMOUNT TPA",
  "PARK MEDICLAIM TPA",
  "RELIANCE GENERAL INSURANCE",
  "SAFE WAY",
  "SBI GENERAL INSURANCE",
  "STAR HEALTH INSURANCE",
  "TATA AIG",
  "UNIVERSAL SAMPO GENERAL INSURANCE",
  "VIDAL HEALTH TPA",
  "VIDAL HEALTH INSURANCE TPA PVT LTD",
  "VOLO HEALTH INSURANCE TPA",
  "VOLO TPA"
];

export const INSURANCE_COMPANIES = [
  "ADITYA BIRLA HEALTH INSURANCE",
  "BAJAJ GENERAL INSURANCE",
  "BAJAJ ALLIANZ GENERAL INSURANCE CO. LTD",
  "CARE HEALTH INSURANCE",
  "CARE HEALTH INSURANCE LTD",
  "CHOLAMANDALAM MS GENERAL INSURANCE CO. LTD.",
  "CSEB-CSPC-CSP-DCL-VIDAL HEALTH TPA",
  "CSEB-CSPC-CSP-GCL-VIDAL HEALTH TPA",
  "CSEB-CSPC-CSP-TCL-VIDAL HEALTH TPA",
  "FUTURE GENERALI INDIA INSURANCE CO. LTD",
  "GENERALI CENTRAL INSURANCE CO.LTD",
  "GO DIGIT GENERAL INSURANCE COMPANY LIMITED",
  "HDFC ERGO GENERAL INSURANCE CO.LTD",
  "ICICI LOMBARD",
  "ICICI LOMBARD GENERAL INSURANCE CO. LTD",
  "IFFCO TOKIO GENERAL INSURANCE",
  "IFFCO TOKIO GENERAL INSURANCE CO. LTD",
  "INDUSIND GENERAL INSURANCE",
  "MADHYA PRADESH POWER GENERATING COMPANY LIMITED",
  "MAGMA GENERAL INSURANCE COMPANY LIMITED",
  "MAGMA HDI GENERAL INSURANCE CO LTD",
  "MANIPAL CIGNA HEALTH INSURANCE COMPANY LIMITED",
  "NATIONAL INSURANCE CO. LTD",
  "NIVA BUPA HEALTH INSURANCE CO LTD",
  "RELIANCE GERENAL INSURANCE",
  "ROYAL SUNDARAM GENERAL INSURANCE COMPANY LTD",
  "SBI GENERAL INSURANCE",
  "SBI GENERAL INSURANCE CO. LTD",
  "STAR HEALTH AND ALLIED INSURANCE CO.LTD",
  "TATA AIG GENERAL INSURANCE CO. LTD",
  "THE NEW INDIA ASSURANCE CO. LTD",
  "THE ORIENTAL INSURANCE COMPANY LIMITED",
  "UNITED INDIA INSURANCE CO LTD",
  "ZUNO GENERAL INSURANCE COMPANY LTD",
  "ZURICH KOTAK GENERAL INSURANCE COMPANY (INDIA) LIMITED"
];

/**
 * 1st Column (Col A): "1.  TPA / INS. NAME"
 * Direct data from Google Spreadsheet Column A (inbuilt old names excluded)
 */
export const INITIAL_COL_A_TPAS: string[] = [
  "ADITYA BIRLA GENERAL INSURANCE",
  "AKNA TPA",
  "BAJAJ ALLIANZ",
  "BAJAJ GENERAL INSURANCE",
  "CARE HEALTH INSURACE",
  "CHOLAMANDALAM MS",
  "CSEB -VIDAL HEALTH INSURANCE TPA PVT LTD",
  "ERICSON TPA",
  "FAMILY HEALTH PLAN INSURANCE TPA LIMITED",
  "FUTURE GENERALI INDIA INSURANCE CO. LTD",
  "GENINS INDIA TPA",
  "GO DIGIT GENERAL INSURANCE",
  "HDFC ERGO",
  "HEALTH ASSIST INSURANCE TPA PVT. LTD",
  "HEALTH INDIA TPA",
  "HERITAGE TPA",
  "HERITEGE TPA",
  "HITPA",
  "ICICI LOMBARD",
  "IFFCO TOKIO GENERAL INSURANCE",
  "LINK-K INSURANCE TPA PRIVATE LIMITED",
  "MD INDIA TPA",
  "MEDIASSIST TPA",
  "MEDSAVE TPA ( MP POWER )",
  "NIVA BUPA",
  "PARAMOUNT TPA",
  "PARK MEDICLAIM TPA",
  "RELIANCE GENERAL INSURANCE",
  "SAFWAY TPA",
  "SBI GENERAL INSURANCE",
  "STAR HEALTH INSURANCE",
  "TATA AIG",
  "UNIVERSAL SAMPO GENERAL INSURANCE",
  "VIDAL HEALTH INSURANCE TPA PVT LTD",
  "VOLO HEALTH INSURANCE TPA",
  "VOLO TPA"
];

/**
 * 2nd Column (Col B): "2. INSURANCE COMPANY"
 * Direct data from Google Spreadsheet Column B (inbuilt old names excluded)
 */
export const INITIAL_COL_B_INSURERS: string[] = [
  "ADITYA BIRLA GENERAL INSURANCE",
  "BAJAJ ALLIANZ GENERAL INSURANCE CO. LTD",
  "CARE HEALTH INSURANCE LTD",
  "CHOLAMANDALAM MS GENERAL INSURANCE CO. LTD",
  "CSEB-CSPC-CSP-DCL-VIDAL HEALTH TPA",
  "CSEB-CSPC-CSP-GCL-VIDAL HEALTH TPA",
  "CSEB-CSPC-CSP-TCL-VIDAL HEALTH TPA",
  "CSPC-CSP-GCL-VIDAL HEALTH TPA",
  "FUTURE GENERALI HEALTH INSURANCE",
  "GENERALI CENTRAL INSURANCE COMPANY LIMITED",
  "GENINS INDIA TPA",
  "GO DIGIT GENERAL INSURANCE COMPANY LIMITED",
  "HDFC ERGO GENERAL INSURANCE CO.LTD",
  "ICICI LOMBARD GENERAL INSURANCE CO. LTD",
  "IFFCO TOKIO GENERAL INSURANCE CO. LTD",
  "INDUSIND GENERAL INSURANCE",
  "M P POORVA KSHETRA VIDYUT VITARAN COMPANY LTD",
  "MADHYA PRADESH POWER GENERATING COMPANY LIMITED",
  "MAGMA GENERAL INSURANCE LIMITED",
  "MAGMA HDI GENERAL INSURANCE COMPANY",
  "MANIPAL CIGNA HEALTH INSURANCE COMPANY LIMITED",
  "NATIONAL INSURANCE CO. LTD",
  "NIVA BUPA HEALTH INSURANCE CO LTD",
  "PARAMOUNT TPA",
  "RELIANCE GERENAL INSURANCE",
  "ROYAL SUNDARAM ALLIANCE INSURANCE CO. LTD.",
  "SBI GENERAL INSURANCE",
  "STAR HEALTH & ALLIED INSURANCE",
  "STAR HEALTH AND ALLIED INSURANCE CO.LTD",
  "STAR HEALTH INSURANCE",
  "TATA AIG GENERAL INSURANCE CO. LTD",
  "THE NEW INDIA ASSURANCE CO. LTD",
  "THE ORIENTAL INSURANCE COMPANY LIMITED",
  "UNITED INDIA INSURANCE CO LTD",
  "UNIVERSAL SAMPO GENERAL INSURANCE",
  "VIDAL HEALTH TPA ONLY FOR CSEB PATIENT",
  "ZUNO GENERAL INSURANCE COMPANY LTD",
  "ZURICH KOTAK GENERAL INSURANCE COMPANY (INDIA) LIMITED"
];

/**
 * 3rd Column (Col C): "3. INSURANCE / TPA ADDRESS"
 * Direct data from Google Spreadsheet Column C (inbuilt old addresses excluded)
 */
export const INITIAL_COL_C_ADDRESSES: Record<string, string> = {
  "CHOLAMANDALAM MS": "CHOLA MS GENERAL INSURANCE COMPANY LIMITED,NEW NO. 2, OLD NO. 234,DARE HOUSE, II FLOOR,N. S. C. BOSE ROAD, PARRYS CORNER,CHENNAI - 600001",
  "MEDIASSIST TPA": "MEDI ASSIST INSURANCE TPA PVT. LTD CASHLESS PROCESSING CENTRE#58/1A, SINGASANDRA, HOSUR MAIN ROAD, BEGUR POST, BANGALORE. PIN - 560068. HELPLINE: 080-22068666"
};

export const CUSTOM_INSURANCE_STORAGE_KEY = 'custom_insurance_companies_v1';
export const DELETED_INSURANCE_STORAGE_KEY = 'deleted_insurance_companies_v1';

export const getCustomInsuranceCompanies = (): string[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_INSURANCE_STORAGE_KEY);
    if (!raw) return INITIAL_COL_B_INSURERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_COL_B_INSURERS;
  } catch (err) {
    console.error('Error reading custom insurance companies from localStorage:', err);
    return INITIAL_COL_B_INSURERS;
  }
};

export const getDeletedInsuranceCompanies = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_INSURANCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading deleted insurance companies from localStorage:', err);
    return [];
  }
};

export const addCustomInsuranceCompany = (companyName: string): { isNew: boolean; list: string[] } => {
  const trimmed = (companyName || '').trim().toUpperCase();
  if (!trimmed || trimmed === '__MANUAL_ENTRY__' || trimmed === '__MANAGE_LIST__') {
    return { isNew: false, list: getAllInsuranceCompanies() };
  }

  // If it was in deleted list, remove from deleted list so it gets un-deleted
  const deleted = getDeletedInsuranceCompanies();
  if (deleted.some(d => d.trim().toUpperCase() === trimmed)) {
    const updatedDeleted = deleted.filter(d => d.trim().toUpperCase() !== trimmed);
    try {
      localStorage.setItem(DELETED_INSURANCE_STORAGE_KEY, JSON.stringify(updatedDeleted));
    } catch (e) {
      console.error(e);
    }
  }

  const existingCustom = getCustomInsuranceCompanies();
  const allCurrent = getAllInsuranceCompanies();
  const alreadyExists = allCurrent.some(c => c.trim().toUpperCase() === trimmed);

  if (!alreadyExists) {
    const updatedCustom = [...existingCustom, trimmed];
    try {
      localStorage.setItem(CUSTOM_INSURANCE_STORAGE_KEY, JSON.stringify(updatedCustom));
    } catch (err) {
      console.error('Error writing custom insurance company to localStorage:', err);
    }
    return { isNew: true, list: getAllInsuranceCompanies() };
  }

  return { isNew: false, list: allCurrent };
};

export const deleteInsuranceCompany = (companyName: string): { success: boolean; list: string[] } => {
  const trimmed = (companyName || '').trim().toUpperCase();
  if (!trimmed) return { success: false, list: getAllInsuranceCompanies() };

  // 1. Remove from custom list if present
  const custom = getCustomInsuranceCompanies();
  const updatedCustom = custom.filter(c => c.trim().toUpperCase() !== trimmed);
  try {
    localStorage.setItem(CUSTOM_INSURANCE_STORAGE_KEY, JSON.stringify(updatedCustom));
  } catch (err) {
    console.error('Error updating custom insurance companies on delete:', err);
  }

  // 2. Add to deleted list to suppress default & legacy claim entries
  const deleted = getDeletedInsuranceCompanies();
  if (!deleted.some(d => d.trim().toUpperCase() === trimmed)) {
    const updatedDeleted = [...deleted, trimmed];
    try {
      localStorage.setItem(DELETED_INSURANCE_STORAGE_KEY, JSON.stringify(updatedDeleted));
    } catch (err) {
      console.error('Error writing deleted insurance company to localStorage:', err);
    }
  }

  return { success: true, list: getAllInsuranceCompanies() };
};

export const deleteMultipleInsuranceCompanies = (companyNames: string[]): { success: boolean; count: number; list: string[] } => {
  const normList = companyNames.map(n => (n || '').trim().toUpperCase()).filter(Boolean);
  if (normList.length === 0) return { success: false, count: 0, list: getAllInsuranceCompanies() };

  const normSet = new Set(normList);

  // 1. Remove from custom list if present
  const custom = getCustomInsuranceCompanies();
  const updatedCustom = custom.filter(c => !normSet.has(c.trim().toUpperCase()));
  try {
    localStorage.setItem(CUSTOM_INSURANCE_STORAGE_KEY, JSON.stringify(updatedCustom));
  } catch (err) {
    console.error('Error updating custom insurance companies on delete:', err);
  }

  // 2. Add to deleted list to suppress default & legacy claim entries
  const deleted = getDeletedInsuranceCompanies();
  const deletedSet = new Set(deleted.map(d => d.trim().toUpperCase()));
  normList.forEach(n => deletedSet.add(n));
  try {
    localStorage.setItem(DELETED_INSURANCE_STORAGE_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch (err) {
    console.error('Error writing deleted insurance companies to localStorage:', err);
  }

  return { success: true, count: normList.length, list: getAllInsuranceCompanies() };
};

export const restoreAllInsuranceCompanies = (): string[] => {
  try {
    localStorage.removeItem(DELETED_INSURANCE_STORAGE_KEY);
  } catch (err) {
    console.error('Error resetting deleted insurance companies in localStorage:', err);
  }
  return getAllInsuranceCompanies();
};

export const getAllInsuranceCompanies = (extraClaims: { insuranceCompany?: string }[] = [], includeInbuilt = false): string[] => {
  const custom = getCustomInsuranceCompanies();
  const deleted = new Set(getDeletedInsuranceCompanies().map(d => d.trim().toUpperCase()));
  const set = new Set<string>();

  // Only include legacy static base list if explicitly requested (inbuilt excluded by default)
  if (includeInbuilt) {
    INSURANCE_COMPANIES.forEach(item => {
      if (item && item.trim()) {
        const norm = item.trim().toUpperCase();
        if (!deleted.has(norm)) {
          set.add(norm);
        }
      }
    });
  }

  // Saved Custom list (from 2nd Col (Col B))
  custom.forEach(item => {
    if (item && item.trim()) {
      const norm = item.trim().toUpperCase();
      if (!deleted.has(norm)) {
        set.add(norm);
      }
    }
  });

  // Extra claims list
  extraClaims.forEach(claim => {
    const name = (claim.insuranceCompany || '').trim().toUpperCase();
    if (name && name !== '-' && name !== 'N/A' && !deleted.has(name)) {
      set.add(name);
    }
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

export const CUSTOM_TPA_STORAGE_KEY = 'custom_tpa_names_v1';
export const CUSTOM_TPA_ADDRESSES_STORAGE_KEY = 'custom_tpa_addresses_v1';
export const CUSTOM_TPA_BANK_DETAILS_STORAGE_KEY = 'custom_tpa_bank_details_v1';
export const SAVED_BANK_PROFILES_STORAGE_KEY = 'saved_hospital_bank_profiles_v1';

export const getCustomTpaList = (): string[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_TPA_STORAGE_KEY);
    if (!raw) return INITIAL_COL_A_TPAS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_COL_A_TPAS;
  } catch (err) {
    console.error('Error reading custom TPA list from localStorage:', err);
    return INITIAL_COL_A_TPAS;
  }
};

export const getCustomTpaBankDetails = (): Record<string, BankDetails> => {
  try {
    const raw = localStorage.getItem(CUSTOM_TPA_BANK_DETAILS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (err) {
    console.error('Error reading custom TPA bank details from localStorage:', err);
    return {};
  }
};

export const saveCustomTpaBankDetails = (tpaName: string, details: BankDetails): void => {
  const norm = (tpaName || '').trim().toUpperCase();
  if (!norm) return;
  const current = getCustomTpaBankDetails();
  const updated = {
    ...current,
    [norm]: {
      bankName: (details.bankName || '').trim().toUpperCase(),
      bankAccountNo: (details.bankAccountNo || '').trim(),
      ifscCode: (details.ifscCode || '').trim().toUpperCase(),
      bankAddress: (details.bankAddress || '').trim().toUpperCase(),
      panCard: (details.panCard || 'ABOFA7356E').trim().toUpperCase()
    }
  };
  try {
    localStorage.setItem(CUSTOM_TPA_BANK_DETAILS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving custom TPA bank details to localStorage:', err);
  }
};

export const deleteCustomTpaBankDetails = (tpaName: string): void => {
  const norm = (tpaName || '').trim().toUpperCase();
  if (!norm) return;
  const current = getCustomTpaBankDetails();
  if (current[norm]) {
    delete current[norm];
    try {
      localStorage.setItem(CUSTOM_TPA_BANK_DETAILS_STORAGE_KEY, JSON.stringify(current));
    } catch (err) {
      console.error('Error deleting custom TPA bank details from localStorage:', err);
    }
  }
};

export interface SavedBankProfile extends BankDetails {
  id: string;
  label: string;
}

export const DEFAULT_BANK_PROFILES: SavedBankProfile[] = [
  {
    id: 'hdfc',
    label: 'HDFC BANK — Bilaspur',
    bankName: 'HDFC BANK',
    bankAccountNo: '50200059120370',
    ifscCode: 'HDFC0000771',
    bankAddress: 'LINK ROAD BILASPUR',
    panCard: 'ABOFA7356E'
  },
  {
    id: 'union',
    label: 'UNION BANK — Bilaspur',
    bankName: 'UNION BANK',
    bankAccountNo: '619701010050404',
    ifscCode: 'UBIN0561975',
    bankAddress: 'VYPAR VIHAR BILASPUR',
    panCard: 'ABOFA7356E'
  },
  {
    id: 'axis',
    label: 'AXIS BANK — Bilaspur',
    bankName: 'AXIS BANK',
    bankAccountNo: '923020008483463',
    ifscCode: 'UTIB0000164',
    bankAddress: 'RAMA TRADE, OLD BUS STAND BILASPUR',
    panCard: 'ABOFA7356E'
  }
];

export const getSavedBankProfiles = (): SavedBankProfile[] => {
  try {
    const raw = localStorage.getItem(SAVED_BANK_PROFILES_STORAGE_KEY);
    let customList: SavedBankProfile[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        customList = parsed;
      }
    }
    const combined = [...DEFAULT_BANK_PROFILES];
    customList.forEach(c => {
      if (!combined.some(d => d.bankAccountNo === c.bankAccountNo && d.bankName === c.bankName)) {
        combined.push(c);
      }
    });
    return combined;
  } catch (err) {
    console.error('Error reading saved bank profiles from localStorage:', err);
    return DEFAULT_BANK_PROFILES;
  }
};

export const saveNewBankProfile = (bank: BankDetails): SavedBankProfile[] => {
  const normName = (bank.bankName || '').trim().toUpperCase();
  const accNo = (bank.bankAccountNo || '').trim();
  if (!normName || !accNo) return getSavedBankProfiles();

  const current = getSavedBankProfiles();
  const exists = current.some(p => p.bankAccountNo === accNo && p.bankName === normName);
  if (!exists) {
    const newProfile: SavedBankProfile = {
      id: 'bank_' + Date.now(),
      label: `${normName} — ${accNo}`,
      bankName: normName,
      bankAccountNo: accNo,
      ifscCode: (bank.ifscCode || '').trim().toUpperCase(),
      bankAddress: (bank.bankAddress || '').trim().toUpperCase(),
      panCard: (bank.panCard || 'ABOFA7356E').trim().toUpperCase()
    };
    const customOnly = current.filter(p => !DEFAULT_BANK_PROFILES.some(d => d.id === p.id));
    customOnly.push(newProfile);
    try {
      localStorage.setItem(SAVED_BANK_PROFILES_STORAGE_KEY, JSON.stringify(customOnly));
    } catch (err) {
      console.error('Error saving new bank profile to localStorage:', err);
    }
  }
  return getSavedBankProfiles();
};

export const addCustomTpa = (
  tpaName: string,
  bankDetails?: BankDetails,
  address?: string
): { isNew: boolean; list: string[] } => {
  const trimmed = (tpaName || '').trim().toUpperCase();
  if (!trimmed || trimmed === '__MANUAL_TPA__' || trimmed === 'SELECT TPA' || trimmed === '-' || trimmed === 'N/A') {
    return { isNew: false, list: getAllTpaOptions() };
  }

  // 1. Remove from deleted TPA list if previously marked as deleted
  const deleted = getDeletedTpaList();
  if (deleted.some(d => d.trim().toUpperCase() === trimmed)) {
    const updatedDeleted = deleted.filter(d => d.trim().toUpperCase() !== trimmed);
    try {
      localStorage.setItem(DELETED_TPA_STORAGE_KEY, JSON.stringify(updatedDeleted));
    } catch (e) {
      console.error('Error removing from deleted TPAs:', e);
    }
  }

  // 2. Ensure it is saved in Custom TPA storage list
  const existingCustom = getCustomTpaList();
  let isNew = false;
  if (!existingCustom.some(t => t.trim().toUpperCase() === trimmed)) {
    const updatedCustom = [...existingCustom, trimmed];
    try {
      localStorage.setItem(CUSTOM_TPA_STORAGE_KEY, JSON.stringify(updatedCustom));
    } catch (err) {
      console.error('Error saving custom TPA to localStorage:', err);
    }
    isNew = true;
  }

  // 3. If bank details provided, save them mapped to this TPA
  if (bankDetails && (bankDetails.bankName || bankDetails.bankAccountNo)) {
    saveCustomTpaBankDetails(trimmed, bankDetails);
  }

  // 4. If address provided, save it mapped to this TPA
  if (address && address.trim()) {
    saveCustomTpaAddress(trimmed, address.trim());
  }

  return { isNew, list: getAllTpaOptions() };
};

export const DELETED_TPA_STORAGE_KEY = 'deleted_tpa_names_v1';

export const getDeletedTpaList = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_TPA_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading deleted TPA list:', err);
    return [];
  }
};

export const deleteTpa = (tpaName: string): { success: boolean; list: string[] } => {
  const norm = (tpaName || '').trim().toUpperCase();
  if (!norm) return { success: false, list: getAllTpaOptions() };

  // 1. Remove from custom TPA list if present
  const custom = getCustomTpaList();
  const updatedCustom = custom.filter(c => c.trim().toUpperCase() !== norm);
  try {
    localStorage.setItem(CUSTOM_TPA_STORAGE_KEY, JSON.stringify(updatedCustom));
  } catch (err) {
    console.error('Error removing custom TPA from localStorage:', err);
  }

  // 2. Remove from custom addresses if present
  try {
    const rawAddr = localStorage.getItem(CUSTOM_TPA_ADDRESSES_STORAGE_KEY);
    if (rawAddr) {
      const map = JSON.parse(rawAddr);
      if (map && typeof map === 'object') {
        delete map[norm];
        localStorage.setItem(CUSTOM_TPA_ADDRESSES_STORAGE_KEY, JSON.stringify(map));
      }
    }
  } catch (err) {
    console.error('Error removing custom address for deleted TPA:', err);
  }

  // 3. Remove custom bank details if present
  deleteCustomTpaBankDetails(norm);

  // 4. Mark as deleted so base static list also excludes it
  const deleted = getDeletedTpaList();
  if (!deleted.some(d => d.trim().toUpperCase() === norm)) {
    const updatedDeleted = [...deleted, norm];
    try {
      localStorage.setItem(DELETED_TPA_STORAGE_KEY, JSON.stringify(updatedDeleted));
    } catch (err) {
      console.error('Error saving deleted TPA to localStorage:', err);
    }
  }

  return { success: true, list: getAllTpaOptions() };
};

export const deleteMultipleTpas = (tpaNames: string[]): { success: boolean; count: number; list: string[] } => {
  const normList = tpaNames.map(n => (n || '').trim().toUpperCase()).filter(Boolean);
  if (normList.length === 0) return { success: false, count: 0, list: getAllTpaOptions() };

  const normSet = new Set(normList);

  // 1. Remove from custom TPA list
  const custom = getCustomTpaList();
  const updatedCustom = custom.filter(c => !normSet.has(c.trim().toUpperCase()));
  try {
    localStorage.setItem(CUSTOM_TPA_STORAGE_KEY, JSON.stringify(updatedCustom));
  } catch (err) {
    console.error('Error removing custom TPAs from localStorage:', err);
  }

  // 2. Remove from custom addresses
  try {
    const rawAddr = localStorage.getItem(CUSTOM_TPA_ADDRESSES_STORAGE_KEY);
    if (rawAddr) {
      const map = JSON.parse(rawAddr);
      if (map && typeof map === 'object') {
        normList.forEach(n => delete map[n]);
        localStorage.setItem(CUSTOM_TPA_ADDRESSES_STORAGE_KEY, JSON.stringify(map));
      }
    }
  } catch (err) {
    console.error('Error removing custom addresses for deleted TPAs:', err);
  }

  // 3. Remove custom bank details
  normList.forEach(n => deleteCustomTpaBankDetails(n));

  // 4. Mark as deleted so base static list also excludes them
  const deleted = getDeletedTpaList();
  const deletedSet = new Set(deleted.map(d => d.trim().toUpperCase()));
  normList.forEach(n => deletedSet.add(n));
  try {
    localStorage.setItem(DELETED_TPA_STORAGE_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch (err) {
    console.error('Error saving deleted TPAs to localStorage:', err);
  }

  return { success: true, count: normList.length, list: getAllTpaOptions() };
};

export const restoreAllTpas = (): string[] => {
  try {
    localStorage.removeItem(DELETED_TPA_STORAGE_KEY);
  } catch (err) {
    console.error('Error resetting deleted TPAs in localStorage:', err);
  }
  return getAllTpaOptions();
};

export const getAllTpaOptions = (extraClaims: { tpaName?: string }[] = [], includeInbuilt = false): string[] => {
  const custom = getCustomTpaList();
  const deleted = new Set(getDeletedTpaList().map(d => d.trim().toUpperCase()));
  const set = new Set<string>();

  // Only include legacy static base list if explicitly requested (inbuilt excluded by default)
  if (includeInbuilt) {
    TPA_OPTIONS.forEach(item => {
      if (item && item.trim()) {
        const norm = item.trim().toUpperCase();
        if (!deleted.has(norm)) {
          set.add(norm);
        }
      }
    });
  }

  // Saved Custom list (from 1st Col (Col A))
  custom.forEach(item => {
    if (item && item.trim()) {
      const norm = item.trim().toUpperCase();
      if (!deleted.has(norm)) {
        set.add(norm);
      }
    }
  });

  // Extra claims list
  extraClaims.forEach(claim => {
    const name = (claim.tpaName || '').trim().toUpperCase();
    if (name && name !== '-' && name !== 'N/A' && name !== '__MANUAL_TPA__' && !deleted.has(name)) {
      set.add(name);
    }
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

export const getCustomTpaAddresses = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(CUSTOM_TPA_ADDRESSES_STORAGE_KEY);
    if (!raw) return INITIAL_COL_C_ADDRESSES;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) ? parsed : INITIAL_COL_C_ADDRESSES;
  } catch (err) {
    console.error('Error reading custom TPA addresses from localStorage:', err);
    return INITIAL_COL_C_ADDRESSES;
  }
};

export const getAllTpaInsuranceAddresses = (includeInbuilt = false): Record<string, string> => {
  const custom = getCustomTpaAddresses();
  if (includeInbuilt) {
    return {
      ...TPA_INSURANCE_ADDRESSES,
      ...custom
    };
  }
  return {
    ...custom
  };
};

export const saveCustomTpaAddress = (
  name: string,
  address: string
): { success: boolean; allAddresses: Record<string, string>; isNew: boolean } => {
  const trimmedName = (name || '').trim().toUpperCase();
  const trimmedAddress = (address || '').trim().toUpperCase();

  if (!trimmedAddress) {
    return { success: false, allAddresses: getAllTpaInsuranceAddresses(), isNew: false };
  }

  const existingCustom = getCustomTpaAddresses();
  const effectiveKey = trimmedName || 'CUSTOM TPA ADDRESS';
  const isNew = !existingCustom[effectiveKey] || existingCustom[effectiveKey] !== trimmedAddress;

  const updatedCustom = {
    ...existingCustom,
    [effectiveKey]: trimmedAddress
  };

  try {
    localStorage.setItem(CUSTOM_TPA_ADDRESSES_STORAGE_KEY, JSON.stringify(updatedCustom));
  } catch (err) {
    console.error('Error saving custom TPA address to localStorage:', err);
  }

  // Also sync to savedAddresses (used by Google Sheet)
  try {
    const rawSaved = localStorage.getItem('savedAddresses');
    let savedList: any[] = [];
    if (rawSaved) {
      try {
        const parsed = JSON.parse(rawSaved);
        if (Array.isArray(parsed)) savedList = parsed;
      } catch (e) {
        savedList = [];
      }
    }

    const toNameVal = effectiveKey;
    const existingIdx = savedList.findIndex((item: any) => 
      (item.toName || '').trim().toUpperCase() === toNameVal
    );

    const addressRecord = {
      toName: toNameVal,
      toAddress: trimmedAddress,
      toPhone: '',
      fromName: 'DEEPAK SHRIWAS',
      fromCompany: 'ARPA MEDCITY HOSPITAL & RESEARCH INSTITUTE',
      fromAddress: 'VYAPAR VIHAR MAIN ROAD,\nNEAR SBI COMMERCIAL BANK,\nBILASPUR (C.G.) 495001',
      fromPhone: '9407949451',
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      savedList[existingIdx] = {
        ...savedList[existingIdx],
        ...addressRecord
      };
    } else {
      savedList.push({
        id: 'custom-' + Date.now(),
        ...addressRecord
      });
    }

    localStorage.setItem('savedAddresses', JSON.stringify(savedList));

    // Optional background sync with Google Script if URL is configured
    const scriptUrl = localStorage.getItem('googleScriptUrl') || 'https://script.google.com/macros/s/AKfycbwWIy4-5vgSHrAIRCmDUU3DL0yA1ZWSaT091KbtaBPYaDIOEBpC32XkGW4GMyAP47Vi/exec';
    if (scriptUrl) {
      fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(addressRecord)
      }).catch(() => {
        // non-blocking
      });
    }
  } catch (err) {
    console.error('Error syncing address to savedAddresses / Google Sheet:', err);
  }

  return { success: true, allAddresses: getAllTpaInsuranceAddresses(), isNew };
};

export const RELATIONS = [
  "Self",
  "wife",
  "Daughter",
  "Husband",
  "Son",
  "Father",
  "Mother",
  "Grand son",
  "Grandparent",
  "Grandchild",
  "Uncle/Aunt",
  "Nephew/Niece",
  "Brother in Law",
  "sister in law",
  "Brother",
  "sister",
  "Other"
];

export const BANK_DETAILS_BY_NAME: Record<string, BankDetails> = {
  "HDFC BANK": {
    bankAccountNo: "50200059120370",
    ifscCode: "HDFC0000771",
    bankAddress: "LINK ROAD BILASPUR"
  },
  "UNION BANK": {
    bankAccountNo: "619701010050404",
    ifscCode: "UBIN0561975",
    bankAddress: "VYPAR VIHAR BILASPUR"
  },
  "AXIS BANK": {
    bankAccountNo: "923020008483463",
    ifscCode: "UTIB0000164",
    bankAddress: "RAMA TRADE, OLD BUS STAND BILASPUR"
  }
};

const createBankMapping = (names: string[], details: BankDetails) => {
  const acc: Record<string, BankDetails> = {};
  names.forEach(name => {
    acc[name] = details;
  });
  return acc;
};

export const TPA_BANK_DETAILS: Record<string, BankDetails> = {
  ...createBankMapping([
    "ADITYA BIRLA GENERAL INSURANCE",
    "SBI GENERAL INSURANCE",
    "MEDIASSIST TPA",
    "GENINS INDIA TPA",
    "IFFCO TOKIO GENERAL INSURANCE",
    "STAR HEALTH INSURANCE",
    "HERITAGE TPA",
    "HEALTH INDIA TPA",
    "BAJAJ ALLIANZ",
    "ICICI LOMBARD",
    "RELIANCE GENERAL INSURANCE",
    "GO DIGIT GENERAL INSURANCE",
    "HDFC ERGO"
  ], { bankName: "HDFC BANK", ...BANK_DETAILS_BY_NAME["HDFC BANK"] }),

  ...createBankMapping([
    "UNIVERSAL SAMPO GENERAL INSURANCE",
    "Health Assist Insurance TPA PVT. LTD",
    "TATA AIG",
    "NIVA BUPA",
    "CARE HEALTH INSURACE"
  ], { bankName: "UNION BANK", ...BANK_DETAILS_BY_NAME["UNION BANK"] }),

  ...createBankMapping([
    "CSEB - VIDAL HEALTH INSURANCE TPA",
    "VIDAL HEALTH INSURANCE TPA PVT LTD",
    "MD INDIA TPA",
    "HITPA",
    "FAMILY HEALTH PLAN INSURANCE TPA LIMITED",
    "VOLO HEALTH INSURANCE TPA",
    "LINK-K INSURANCE TPA PRIVATE LIMITED",
    "GENERALI CENTRAL INSURANCE CO. LTD",
    "AKNA TPA",
    "ERICSON TPA",
    "MEDSAVE TPA ( MP POWER )",
    "PARK MEDICLAIM TPA",
    "PARAMOUNT TPA"
  ], { bankName: "AXIS BANK", ...BANK_DETAILS_BY_NAME["AXIS BANK"] })
};

export const TPA_INSURANCE_ADDRESSES: Record<string, string> = {
  "ADITYA BIRLA GENERAL INSURANCE": "ADITYA BIRLA GENERAL INSURANCE 9th Floor, Tower 1, One Indiabulls Centre, Jupiter Mills Compound, 841, Senapati Bapat Marg, Elphinstone Road, Mumbai 400013",
  "ADITYA BIRLA HEALTH INSURANCE": "Aditya Birla Health Insurance Co. Limited, 9th Floor, Tower 1, One World Centre, Jupiter Mills Compound, 841, Senapati Bapat Marg, Elphinstone Road, Mumbai - 400013",
  "FUTURE GENERALI INDIA INSURANCE CO. LTD": "Future Generali India Insurance Co. Ltd., Unit No. 801 & 802, 8th Floor, Tower C, Embassy 247, LBS Marg, Vikhroli (West), Mumbai - 400083",
  "GENERALI CENTRAL INSURANCE CO. LTD": "Generali Central Insurance Company Limited / Future Generali Health, Office No. 3, 3rd Floor, Embassy 247, LBS Marg, Vikhroli (W), Mumbai - 400083",
  "GENERALI CENTRAL INSURANCE CO.LTD": "Generali Central Insurance Company Limited / Future Generali Health, Office No. 3, 3rd Floor, Embassy 247, LBS Marg, Vikhroli (W), Mumbai - 400083",
  "SBI GENERAL INSURANCE": "Health Insurance Vertical SBI General Insurance Company Limited 9th Floor, Westport, Pan Card Club Road, Baner, Pune, Maharashtra - 411 045",
  "SBI GENERAL INSURANCE CO. LTD": "Health Insurance Vertical SBI General Insurance Company Limited 9th Floor, Westport, Pan Card Club Road, Baner, Pune, Maharashtra - 411 045",
  "MEDIASSIST TPA": "Medi Assist Insurance TPA Pvt. Ltd Cashless Processing Centre#58/1A, Singasandra, Hosur Main Road, Begur Post, Bangalore. PIN - 560068. Helpline: 080-22068666",
  "GENINS INDIA TPA": "Genins India Insurance TPA Ltd. Flat No SF-3, Second Floor, Tulsi Vihar, Opp. Tanjore Restaurant, Abhyankar Nagar, Nagpur, Maharashtra 440010 Phone No. 0712-2225029",
  "UNIVERSAL SAMPO GENERAL INSURANCE": "Universal Sompo General Insurance Co. Ltd. Health Claims Department, 1st Floor, Plot No. C-56 A/13, C Block, Sector - 62, Noida, Uttar Pradesh - 201309",
  "IFFCO TOKIO GENERAL INSURANCE": "IFFCO TOKIO GENERAL INSURANCE IFFCO Tower II, Plot No.3, 5th Floor, Sector 29, Gurgaon-122001 (Haryana)",
  "IFFCO TOKIO GENERAL INSURANCE CO. LTD": "IFFCO TOKIO GENERAL INSURANCE IFFCO Tower II, Plot No.3, 5th Floor, Sector 29, Gurgaon-122001 (Haryana)",
  "STAR HEALTH INSURANCE": "STAR HEALTH & ALLIED INSURANCE CO. LTD CLAIM DEPARTMENT, LAL GANGA SHOPPING MALL 2ND FLOOR SHOP NO 06 TO 10 G.E. ROAD, RAIPUR (492001) PH.NO:- 0771-4017396",
  "STAR HEALTH AND ALLIED INSURANCE CO.LTD": "STAR HEALTH & ALLIED INSURANCE CO. LTD CLAIM DEPARTMENT, LAL GANGA SHOPPING MALL 2ND FLOOR SHOP NO 06 TO 10 G.E. ROAD, RAIPUR (492001) PH.NO:- 0771-4017396",
  "CSEB - VIDAL HEALTH INSURANCE TPA": "CSEB - VIDAL HEALTH INSURANCE Vidal Health-CSPC Helpdesk for Cashless, CSEB Campus, Dangania, Raipur, Chhattisgarh-493013 Pho.No:- 0771-2574019",
  "CSEB-CSPC-CSP-DCL-VIDAL HEALTH TPA": "CSEB - VIDAL HEALTH INSURANCE Vidal Health-CSPC Helpdesk for Cashless, CSEB Campus, Dangania, Raipur, Chhattisgarh-493013 Pho.No:- 0771-2574019",
  "CSEB-CSPC-CSP-GCL-VIDAL HEALTH TPA": "CSEB - VIDAL HEALTH INSURANCE Vidal Health-CSPC Helpdesk for Cashless, CSEB Campus, Dangania, Raipur, Chhattisgarh-493013 Pho.No:- 0771-2574019",
  "CSEB-CSPC-CSP-TCL-VIDAL HEALTH TPA": "CSEB - VIDAL HEALTH INSURANCE Vidal Health-CSPC Helpdesk for Cashless, CSEB Campus, Dangania, Raipur, Chhattisgarh-493013 Pho.No:- 0771-2574019",
  "HERITAGE TPA": "Heritage Health Insurance TPA Nicco House, 5th Floor, 2, Hare Street KOLKATA, West Bengal, Pin: 700001 Phone: (033) 2248 6430; Fax: (033) 2231 0287",
  "Health Assist Insurance TPA PVT. LTD": "Health Assist Insurance TPA PVT 815, Vishwa Sadan, District Centre, Janak Puri, New Delhi - 110058",
  "HEALTH INDIA TPA": "Health India Insurance TPA Services Pvt. Ltd., Neelkanth Corporate IT Park, 4th floor, 406-412, Kirol Road, Vidhyavihar (W), Mumbai-400086",
  "BAJAJ ALLIANZ": "Bajaj Allianz Insurance Company, Health Administration Team, 2nd Floor, Bajaj Finserv Building, Survey No. 208 / B - 1, Behind Weikfield IT Park, Off Nagar Road, Viman Nagar, Pune-411 014",
  "BAJAJ ALLIANZ GENERAL INSURANCE CO. LTD": "Bajaj Allianz Insurance Company, Health Administration Team, 2nd Floor, Bajaj Finserv Building, Survey No. 208 / B - 1, Behind Weikfield IT Park, Off Nagar Road, Viman Nagar, Pune-411 014",
  "ICICI LOMBARD": "Lombard GIC, ICICI Lombard Healthcare, 01st, 04th, 05th & 06th floor, Varun Towers II, Opp Hyderabad Public School, Begumpet, Hyderabad, Telangana, 500016.",
  "ICICI LOMBARD GENERAL INSURANCE CO. LTD": "Lombard GIC, ICICI Lombard Healthcare, 01st, 04th, 05th & 06th floor, Varun Towers II, Opp Hyderabad Public School, Begumpet, Hyderabad, Telangana, 500016.",
  "TATA AIG": "Tata AIG Health Claims Hub Door No. 615, 616, 5th and 6th Floors, Imperial Towers, Ameerpet, Next to Ameerpet Metro Station, Hyderabad, Telangana - 500016",
  "TATA AIG GENERAL INSURANCE CO. LTD": "Tata AIG Health Claims Hub Door No. 615, 616, 5th and 6th Floors, Imperial Towers, Ameerpet, Next to Ameerpet Metro Station, Hyderabad, Telangana - 500016",
  "RELIANCE GENERAL INSURANCE": "Reliance General Insurance, RCareHealth, No.1-89/3/B/40to42/KS/301, 3rd floor, Krishe Block, Krishe Sapphire, Madhapur, Hyderabad-Telangana-500081",
  "RELIANCE GERENAL INSURANCE": "Reliance General Insurance, RCareHealth, No.1-89/3/B/40to42/KS/301, 3rd floor, Krishe Block, Krishe Sapphire, Madhapur, Hyderabad-Telangana-500081",
  "VIDAL HEALTH INSURANCE TPA PVT LTD": "Vidal Health Insurance TPA Pvt. Ltd, 306, 3RD FLOOR SHREEVARDHAN COMPLEX, 4-RNT MARG, INDORE, MADHYA PRADESH, 452001",
  "MD INDIA TPA": "MDIndia Health Insurance Pvt. Ltd Head Office: S.NO.46/1, E-Space, A2 Building, 3rd Floor, Pune Nagar Rd., Vadgaonsheri, Pune - 411014 (India)",
  "GO DIGIT GENERAL INSURANCE": "Go Digit General Insurance Limited Atlantis, 95, 4th B Cross Road, Koramangala Industrial Layout, 5th Block, Bengaluru 560095",
  "GO DIGIT GENERAL INSURANCE COMPANY LIMITED": "Go Digit General Insurance Limited Atlantis, 95, 4th B Cross Road, Koramangala Industrial Layout, 5th Block, Bengaluru 560095",
  "NIVA BUPA": "Niva Bupa Health Insurance Company Limited, C-98, First Floor, Lajpat Nagar 1, New Delhi-110024,",
  "NIVA BUPA HEALTH INSURANCE CO LTD": "Niva Bupa Health Insurance Company Limited, C-98, First Floor, Lajpat Nagar 1, New Delhi-110024,",
  "HITPA": "Health Insurance TPA of India Ltd, 2nd Floor, Majestic Omnia Building, A-110, Sector 4 Noida, Uttar Pradesh - 201301",
  "FAMILY HEALTH PLAN INSURANCE TPA LIMITED": "Family Health Plan Insurance TPA Ltd, Srinilaya - Cyber Spazio, Second Floor, Road No.2, Banjara Hills, Hyderabad-500 034.",
  "VOLO HEALTH INSURANCE TPA": "Volo Health Insurance TPA Pvt Ltd 2nd Floor, J.P House Plot No. 172, Lane 2, Westend Marg Saket Metro Station, New Delhi- 110003",
  "LINK-K INSURANCE TPA PRIVATE LIMITED": "Link - k Insurance TPA Pvt. Ltd West Woods Building, Old No. Y-205, New No. 32, 3rd Floor, 5th Ave, Anna Nagar West, Chennai, Tamil Nadu 600040., Chennai- 600040",
  "HDFC ERGO": "HDFC ERGO General Insurance Company Limited Registered & Corporate Office: 1st Floor, HDFC House, 165/166 Backbay Reclamation, H.T.Parekh Marg, Churchgate, Mumbai - 400 020",
  "HDFC ERGO GENERAL INSURANCE CO.LTD": "HDFC ERGO General Insurance Company Limited Registered & Corporate Office: 1st Floor, HDFC House, 165/166 Backbay Reclamation, H.T.Parekh Marg, Churchgate, Mumbai - 400 020",
  "AKNA TPA": "Akna Health Care TPA, 2nd Floor, Corporate Heights, Near Metro Station, Sector 18, Noida, Uttar Pradesh - 201301",
  "CARE HEALTH INSURACE": "Care Health Insurance Limited, 3rd Floor, Vipul Tech Square, Tower C, Golf Course Road, Sector - 43, Gurgaon - 122009 (HARYANA)",
  "CARE HEALTH INSURANCE LTD": "Care Health Insurance Limited, 3rd Floor, Vipul Tech Square, Tower C, Golf Course Road, Sector - 43, Gurgaon - 122009 (HARYANA)",
  "ERICSON TPA": "Ericson Insurance TPA Pvt. Ltd. 11-C, Corporate Park, S. T. Road, Chembur, Mumbai - 400071. Maharashtra. Tel : 022-25280280",
  "MEDSAVE TPA ( MP POWER )": "MedSave Health Insurance TPA Limited Plot No. 195A, 3rd Floor, Opposite D.B. City Mall, M.P Nagar, Zone-I, Bhopal.",
  "PARK MEDICLAIM TPA": "Park Mediclaim Consultants Pvt. Ltd., 702, Vikrant Tower, 4, Rajendra Place, New Delhi - 110008, Phone: 011-41538050",
  "PARAMOUNT TPA": "Paramount TPA c/o Medi-Assist TPA Road No. 28, M.I.D.C. Industrial Area  , Wagle Estate, Ram Nagar, Thane (W), Maharashtra 400604",
  "NATIONAL INSURANCE CO. LTD": "National Insurance Company Limited, Regd & Head Office: Premises No. 18-0374, Plot No. CBD-81, New Town, Kolkata - 700156",
  "THE ORIENTAL INSURANCE COMPANY LIMITED": "The Oriental Insurance Company Limited, Oriental House, A-25/27, Asaf Ali Road, New Delhi - 110002",
  "THE NEW INDIA ASSURANCE CO. LTD": "The New India Assurance Co. Ltd., Head Office: 87, M.G. Road, Fort, Mumbai - 400001",
  "UNITED INDIA INSURANCE CO LTD": "United India Insurance Co. Ltd., Head Office: 24, Whites Road, Chennai - 600014",
  "MANIPAL CIGNA HEALTH INSURANCE COMPANY LIMITED": "ManipalCigna Health Insurance Company Limited, 401/402, 4th Floor, Raheja Titanium, Western Express Highway, Goregaon (East), Mumbai - 400063",
  "MAGMA GENERAL INSURANCE COMPANY LIMITED": "Magma HDI General Insurance Co. Ltd., Unit No. 401 & 402, 4th Floor, Platinum Techno Park, Sector 30A, Vashi, Navi Mumbai - 400703",
  "MAGMA HDI GENERAL INSURANCE CO LTD": "Magma HDI General Insurance Co. Ltd., Unit No. 401 & 402, 4th Floor, Platinum Techno Park, Sector 30A, Vashi, Navi Mumbai - 400703",
  "ZURICH KOTAK GENERAL INSURANCE COMPANY (INDIA) LIMITED": "Zurich Kotak General Insurance Company (India) Limited, 8th Floor, Building No. 9, Infinity Park, General A.K. Vaidya Marg, Malad (East), Mumbai - 400097",
  "ZUNO GENERAL INSURANCE COMPANY LTD": "Zuno General Insurance Limited, 2nd Floor, Tower 2, Equinox Business Park, LBS Marg, Kurla (West), Mumbai - 400070",
  "ROYAL SUNDARAM GENERAL INSURANCE COMPANY LTD": "Royal Sundaram General Insurance Co. Limited, Vishranthi Melaram Towers, No.2/319, Rajiv Gandhi Salai (OMR) Karapakkam, Chennai - 600097",
  "CHOLAMANDALAM MS GENERAL INSURANCE CO. LTD.": "Cholamandalam MS General Insurance Company Limited, 2nd Floor, Dare House, 2, N.S.C. Bose Road, Chennai - 600001",
  "MADHYA PRADESH POWER GENERATING COMPANY LIMITED": "Madhya Pradesh Power Generating Co. Ltd., Block No. 9, Shakti Bhawan, Vidyut Nagar, Rampur, Jabalpur, Madhya Pradesh - 482008",
  "INDUSIND GENERAL INSURANCE": "IndusInd General Insurance, 8th Floor, Tower 1, One World Center, Jupiter Mills Compound, 841, Senapati Bapat Marg, Elphinstone Road, Mumbai - 400013"
};

/**
 * Intelligent helper to match and retrieve official Insurance/TPA Address
 * by checking exact keys, normalized tokens, abbreviations, and keywords.
 */
export const getMatchingInsuranceAddress = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'N/A') return '';

  const allAddresses = getAllTpaInsuranceAddresses();

  // 1. Direct Key Match (custom saved address takes priority)
  if (allAddresses[trimmed]) {
    return allAddresses[trimmed];
  }

  // 2. Case-Insensitive Exact Match
  const lowerTrimmed = trimmed.toLowerCase();
  for (const [key, addr] of Object.entries(allAddresses)) {
    if (key.toLowerCase() === lowerTrimmed && addr) {
      return addr;
    }
  }

  // 3. Normalized string match (remove punctuation, special chars, multiple spaces)
  const simplify = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const simpleInput = simplify(trimmed);

  for (const [key, addr] of Object.entries(allAddresses)) {
    const simpleKey = simplify(key);
    if ((simpleKey === simpleInput || simpleKey.includes(simpleInput) || simpleInput.includes(simpleKey)) && addr) {
      return addr;
    }
  }

  // 4. Keyword / Alias rules for high accuracy matching
  const rules: Array<{ keywords: string[]; targetKey: string }> = [
    { keywords: ['STAR'], targetKey: 'STAR HEALTH INSURANCE' },
    { keywords: ['MEDIASSIST', 'MEDI ASSIST'], targetKey: 'MEDIASSIST TPA' },
    { keywords: ['VIDAL', 'CSEB'], targetKey: 'CSEB - VIDAL HEALTH INSURANCE TPA' },
    { keywords: ['GENINS'], targetKey: 'GENINS INDIA TPA' },
    { keywords: ['HERITAGE'], targetKey: 'HERITAGE TPA' },
    { keywords: ['HEALTH ASSIST'], targetKey: 'Health Assist Insurance TPA PVT. LTD' },
    { keywords: ['HEALTH INDIA'], targetKey: 'HEALTH INDIA TPA' },
    { keywords: ['BAJAJ'], targetKey: 'BAJAJ ALLIANZ' },
    { keywords: ['ICICI', 'LOMBARD'], targetKey: 'ICICI LOMBARD' },
    { keywords: ['TATA', 'AIG'], targetKey: 'TATA AIG' },
    { keywords: ['RELIANCE'], targetKey: 'RELIANCE GENERAL INSURANCE' },
    { keywords: ['MD INDIA', 'MDINDIA'], targetKey: 'MD INDIA TPA' },
    { keywords: ['DIGIT', 'GO DIGIT'], targetKey: 'GO DIGIT GENERAL INSURANCE' },
    { keywords: ['NIVA', 'BUPA', 'MAX BUPA'], targetKey: 'NIVA BUPA' },
    { keywords: ['HITPA'], targetKey: 'HITPA' },
    { keywords: ['FAMILY HEALTH', 'FHPL'], targetKey: 'FAMILY HEALTH PLAN INSURANCE TPA LIMITED' },
    { keywords: ['VOLO'], targetKey: 'VOLO HEALTH INSURANCE TPA' },
    { keywords: ['LINK-K', 'LINK K'], targetKey: 'LINK-K INSURANCE TPA PRIVATE LIMITED' },
    { keywords: ['FUTURE GENERALI', 'GENERALI'], targetKey: 'FUTURE GENERALI INDIA INSURANCE CO. LTD' },
    { keywords: ['HDFC', 'ERGO'], targetKey: 'HDFC ERGO' },
    { keywords: ['AKNA'], targetKey: 'AKNA TPA' },
    { keywords: ['CARE', 'RELIGARE'], targetKey: 'CARE HEALTH INSURACE' },
    { keywords: ['ERICSON'], targetKey: 'ERICSON TPA' },
    { keywords: ['MEDSAVE', 'MP POWER', 'MADHYA PRADESH POWER'], targetKey: 'MEDSAVE TPA ( MP POWER )' },
    { keywords: ['PARK MEDICLAIM', 'PARK'], targetKey: 'PARK MEDICLAIM TPA' },
    { keywords: ['PARAMOUNT'], targetKey: 'PARAMOUNT TPA' },
    { keywords: ['ADITYA BIRLA'], targetKey: 'ADITYA BIRLA GENERAL INSURANCE' },
    { keywords: ['SBI'], targetKey: 'SBI GENERAL INSURANCE' },
    { keywords: ['UNIVERSAL', 'SOMPO', 'SAMPO'], targetKey: 'UNIVERSAL SAMPO GENERAL INSURANCE' },
    { keywords: ['IFFCO', 'TOKIO'], targetKey: 'IFFCO TOKIO GENERAL INSURANCE' },
    { keywords: ['NATIONAL'], targetKey: 'NATIONAL INSURANCE CO. LTD' },
    { keywords: ['ORIENTAL'], targetKey: 'THE ORIENTAL INSURANCE COMPANY LIMITED' },
    { keywords: ['NEW INDIA'], targetKey: 'THE NEW INDIA ASSURANCE CO. LTD' },
    { keywords: ['UNITED INDIA'], targetKey: 'UNITED INDIA INSURANCE CO LTD' },
    { keywords: ['MANIPAL', 'CIGNA'], targetKey: 'MANIPAL CIGNA HEALTH INSURANCE COMPANY LIMITED' },
    { keywords: ['MAGMA'], targetKey: 'MAGMA GENERAL INSURANCE COMPANY LIMITED' },
    { keywords: ['ZURICH', 'KOTAK'], targetKey: 'ZURICH KOTAK GENERAL INSURANCE COMPANY (INDIA) LIMITED' },
    { keywords: ['ZUNO'], targetKey: 'ZUNO GENERAL INSURANCE COMPANY LTD' },
    { keywords: ['ROYAL SUNDARAM', 'SUNDARAM'], targetKey: 'ROYAL SUNDARAM GENERAL INSURANCE COMPANY LTD' },
    { keywords: ['CHOLAMANDALAM', 'CHOLA'], targetKey: 'CHOLAMANDALAM MS GENERAL INSURANCE CO. LTD.' },
    { keywords: ['INDUSIND'], targetKey: 'INDUSIND GENERAL INSURANCE' }
  ];

  for (const rule of rules) {
    const isMatch = rule.keywords.some(kw => simpleInput.includes(simplify(kw)));
    if (isMatch && allAddresses[rule.targetKey]) {
      return allAddresses[rule.targetKey];
    }
  }

  return '';
};

/**
 * Intelligent helper to match Bank Details from TPA or Bank Name
 */
export const getMatchingBankDetails = (name: string): BankDetails | null => {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();

  // 1. Direct check in user-saved Custom TPA Bank Details
  const customTpaBanks = getCustomTpaBankDetails();
  if (customTpaBanks[upper]) {
    return customTpaBanks[upper];
  }
  for (const [key, details] of Object.entries(customTpaBanks)) {
    const kUpper = key.trim().toUpperCase();
    if (kUpper === upper) {
      return details;
    }
  }
  // Also check containment match in custom TPA bank details
  for (const [key, details] of Object.entries(customTpaBanks)) {
    const kUpper = key.trim().toUpperCase();
    if (kUpper.length >= 3 && (upper.includes(kUpper) || kUpper.includes(upper))) {
      return details;
    }
  }

  // 2. Direct check in TPA_BANK_DETAILS
  if (TPA_BANK_DETAILS[trimmed]) {
    return TPA_BANK_DETAILS[trimmed];
  }

  const lower = trimmed.toLowerCase();
  for (const [key, details] of Object.entries(TPA_BANK_DETAILS)) {
    if (key.toLowerCase() === lower) {
      return details;
    }
  }

  // 3. Check in saved bank profiles by name
  const savedProfiles = getSavedBankProfiles();
  const profileMatch = savedProfiles.find(p => 
    p.bankName?.toUpperCase() === upper || 
    upper.includes(p.bankName?.toUpperCase() || '') ||
    p.label?.toUpperCase().includes(upper)
  );
  if (profileMatch) {
    return profileMatch;
  }

  // 4. Check in BANK_DETAILS_BY_NAME
  for (const [bName, details] of Object.entries(BANK_DETAILS_BY_NAME)) {
    if (lower.includes(bName.toLowerCase()) || bName.toLowerCase().includes(lower)) {
      return { bankName: bName, ...details };
    }
  }

  // 5. Keyword check for banks mapped to TPA
  const addr = getMatchingInsuranceAddress(trimmed);
  if (addr) {
    for (const [tpaKey, details] of Object.entries(TPA_BANK_DETAILS)) {
      if (addr === TPA_INSURANCE_ADDRESSES[tpaKey]) {
        return details;
      }
    }
  }

  return null;
};

export const ALL_COLUMNS = [
  { key: 'action', label: 'Action' },
  { key: 'sNo', label: 'S.No' },
  { key: 'patientName', label: 'Patient Details' },
  { key: 'uhid', label: 'UHID' },
  { key: 'mobileNumber', label: 'Mobile Number' },
  { key: 'insuranceLimit', label: 'Insurance Limit' },
  { key: 'ipdNo', label: 'IPD No' },
  { key: 'doa', label: 'DOA' },
  { key: 'dod', label: 'DOD' },
  { key: 'tpaName', label: 'TPA/Ins. Name' },
  { key: 'insuranceCompany', label: 'Insurance Company' },
  { key: 'insuranceID', label: 'Insurance ID' },
  { key: 'claimNo', label: 'Claim No' },
  { key: 'policyNumber', label: 'Policy No' },
  { key: 'empID', label: 'EMP ID' },
  { key: 'billInvoiceNo', label: 'Bill Invoice No' },
  { key: 'totalBill', label: 'Total Bill' },
  { key: 'approved', label: 'Approved' },
  { key: 'discount', label: 'Discount' },
  { key: 'patientPay', label: 'Patient Pay' },
  { key: 'settlementAmount', label: 'Settlement Amount' },
  { key: 'tds', label: 'TDS Amount' },
  { key: 'deduction', label: 'Payment Recived' },
  { key: 'paymentDate', label: 'Payment Date' },
  { key: 'utr', label: 'UTR' },
  { key: 'attenderName', label: 'Attender Name' },
  { key: 'relation', label: 'Relation' },
  { key: 'insuranceAddress', label: 'Insurance Address' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'bankAccountNo', label: 'Bank Account No' },
  { key: 'ifscCode', label: 'IFSC Code' },
  { key: 'bankAddress', label: 'Bank Address' },
  { key: 'courierDetails', label: 'Courier Details' },
  { key: 'courierDate', label: 'Courier Date' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'surgeryName', label: 'Surgery Name' },
  { key: 'remark', label: 'Remark' },
  { key: 'status', label: 'Status' }
];

// 1. Dashboard Claims & Import/Export URLs (Live Dashboard)
export const DASHBOARD_CLAIMS_SYNC_URL = "https://script.google.com/macros/s/AKfycbzjgJGCVtceinpTwI2jVMjLKoMokTR2Vu_V224GwnSftBiozRxnQqwMF08SWerRy9qL/exec";
export const DASHBOARD_CLAIMS_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1l_TC7-xxIKC9BX10m2N4y6NS3a2hfsJRfpDC8TONBaM/edit?gid=0#gid=0";

// 2. Metadata (TPA & Insurance 2-Headers) Separate URLs (Policy, Insurance & TPA Metadata)
export const METADATA_SYNC_URL = "https://script.google.com/macros/s/AKfycbzjgJGCVtceinpTwI2jVMjLKoMokTR2Vu_V224GwnSftBiozRxnQqwMF08SWerRy9qL/exec";
export const METADATA_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1ka0u9rFh0nMLIVp8wdziBxIRyl17ZfkzllF5ALR29x0/edit?gid=0#gid=0";

// 3. Dedicated Spreadsheet Sharing Links for 1st Column (Col A) and 2nd Column (Col B)
export const COL_A_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/14cBw04czMq6RivZhYPdNH3Y3fw_JmQiG_Tx6qh4w4as/edit?gid=0#gid=0";
export const COL_B_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/14cBw04czMq6RivZhYPdNH3Y3fw_JmQiG_Tx6qh4w4as/edit?gid=0#gid=0";

// 4. Persistent Notepad Text & Reference Note Link (Retained Permanently before and after publish)
export const NOTEPAD_REFERENCE_NOTE = "https://docs.google.com/spreadsheets/d/1l_TC7-xxIKC9BX10m2N4y6NS3a2hfsJRfpDC8TONBaM/edit?gid=0#gid=0";

// Legacy aliases for backward compatibility
export const GOOGLE_SHEETS_SYNC_URL = DASHBOARD_CLAIMS_SYNC_URL;
export const GOOGLE_SHEETS_LOAD_URL = DASHBOARD_CLAIMS_SYNC_URL;

export const USER_TWO_HEADER_METADATA_ROWS = [
  { tpa: "ADITYA BIRLA GENERAL INSURANCE", insurance: "ADITYA BIRLA HEALTH INSURANCE" },
  { tpa: "AKNA TPA", insurance: "BAJAJ GENERAL INSURANCE" },
  { tpa: "BAJAJ GENERAL INSURANCE", insurance: "CARE HEALTH INSURANCE" },
  { tpa: "CARE HEALTH INSURACE", insurance: "CHOLAMANDALAM MS GENERAL INSURANCE CO. LTD." },
  { tpa: "CSEB - VIDAL HEALTH INSURANCE TPA", insurance: "CSEB-CSPC-CSP-DCL-VIDAL HEALTH TPA" },
  { tpa: "ERICSON TPA", insurance: "CSEB-CSPC-CSP-GCL-VIDAL HEALTH TPA" },
  { tpa: "FAMILY HEALTH PLAN INSURANCE TPA LIMITED", insurance: "CSEB-CSPC-CSP-TCL-VIDAL HEALTH TPA" },
  { tpa: "FHPL", insurance: "ICICI LOMBARD" },
  { tpa: "GENERALI CENTRAL INSURANCE CO. LTD", insurance: "IFFCO TOKIO GENERAL INSURANCE" },
  { tpa: "GENINS INDIA TPA", insurance: "INDUSIND GENERAL INSURANCE" },
  { tpa: "GO DIGIT GENERAL INSURANCE", insurance: "MADHYA PRADESH POWER GENERATING COMPANY LIMITED" },
  { tpa: "HDFC ERGO", insurance: "MAGMA GENERAL INSURANCE COMPANY LIMITED" },
  { tpa: "HEALTH ASSIST INSURANCE TPA PVT. LTD", insurance: "MAGMA HDI GENERAL INSURANCE CO LTD" },
  { tpa: "HEALTH INDIA", insurance: "NATIONAL INSURANCE CO. LTD" },
  { tpa: "HERITAGE TPA", insurance: "RELIANCE GERENAL INSURANCE" },
  { tpa: "HITPA", insurance: "ROYAL SUNDARAM GENERAL INSURANCE COMPANY LTD" },
  { tpa: "ICICI LOMBARD", insurance: "SBI GENERAL INSURANCE" },
  { tpa: "IFFCO TOKIO GENERAL INSURANCE", insurance: "STAR HEALTH AND ALLIED INSURANCE CO.LTD" },
  { tpa: "LINK K TPA", insurance: "THE NEW INDIA ASSURANCE CO. LTD" },
  { tpa: "MD INDIA TPA", insurance: "THE ORIENTAL INSURANCE COMPANY LIMITED" },
  { tpa: "MED SAVE", insurance: "UNITED INDIA INSURANCE CO LTD" },
  { tpa: "MEDIASSIST TPA", insurance: "ZUNO GENERAL INSURANCE COMPANY LTD" },
  { tpa: "MEDSAVE TPA ( MP POWER )", insurance: "ZURICH KOTAK GENERAL INSURANCE COMPANY (INDIA) LIMITED" },
  { tpa: "NIVA BUPA", insurance: "" },
  { tpa: "PARAMOUNT TPA", insurance: "" },
  { tpa: "PARK MEDICLAIM TPA", insurance: "" },
  { tpa: "RELIANCE GENERAL INSURANCE", insurance: "" },
  { tpa: "SAFE WAY", insurance: "" },
  { tpa: "SBI GENERAL INSURANCE", insurance: "" },
  { tpa: "STAR HEALTH INSURANCE", insurance: "" },
  { tpa: "TATA AIG", insurance: "" },
  { tpa: "UNIVERSAL SAMPO GENERAL INSURANCE", insurance: "" },
  { tpa: "VIDAL HEALTH TPA", insurance: "" },
  { tpa: "VOLO HEALTH INSURANCE TPA", insurance: "" },
  { tpa: "VOLO TPA", insurance: "" }
];

export const seedUserTwoHeaderMetadata = (): { tpasAdded: number; insurersAdded: number; addressesAdded: number } => {
  let tpasAdded = 0;
  let insurersAdded = 0;
  let addressesAdded = 0;

  USER_TWO_HEADER_METADATA_ROWS.forEach(row => {
    if (row.tpa && row.tpa.trim()) {
      const tpaName = row.tpa.trim();
      const addr = getMatchingInsuranceAddress(tpaName);
      const res = addCustomTpa(tpaName, undefined, addr);
      if (res.isNew) tpasAdded++;
      if (addr) {
        const addrRes = saveCustomTpaAddress(tpaName, addr);
        if (addrRes.isNew) addressesAdded++;
      }
    }
    if (row.insurance && row.insurance.trim()) {
      const res = addCustomInsuranceCompany(row.insurance.trim());
      if (res.isNew) insurersAdded++;
    }
  });

  return { tpasAdded, insurersAdded, addressesAdded };
};

