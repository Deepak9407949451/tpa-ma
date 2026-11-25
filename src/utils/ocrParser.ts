import { TPA_OPTIONS, INSURANCE_COMPANIES } from '../constants/insuranceData';

export interface CardMember {
  name: string;
  memberId: string;
  relation?: string;
  ageGender?: string;
  dob?: string;
}

export interface DiscoveredNumberItem {
  value: string;
  label?: string;
  context?: string;
}

export interface ExtractedDocumentData {
  documentType?: 'admission_slip' | 'insurance_card' | 'combined' | 'unknown';
  // Patient / Admission fields
  patientName?: string;
  ipdNo?: string;
  uhid?: string;
  doa?: string;
  dod?: string;
  doctorName?: string;
  ageGender?: string;
  diagnosis?: string;
  surgeryName?: string;
  mobileNumber?: string;

  // Policy & Insurance metadata
  tpaName?: string;
  insuranceCompany?: string;
  policyNumber?: string;
  empID?: string;
  insuranceID?: string; // Member ID / Card No / Beneficiary ID
  claimNo?: string;
  insuranceLimit?: string;
  validFrom?: string;
  validUpto?: string;

  // If card contains multiple members (e.g. family floater / corporate card)
  members?: CardMember[];
  rawExtractedText?: string;
  discoveredNumbers?: DiscoveredNumberItem[];
  allTextLines?: string[];
}

// Backward compatibility alias
export type ExtractedSlipData = ExtractedDocumentData;

/**
 * Strips honorary titles and prefixes from patient name (Mr., Mrs., Master, Dr., Baby, Smt, Shri, etc.)
 */
export function cleanPatientName(name: string): string {
  if (!name) return '';
  let cleaned = name.trim();
  // Regex to strip prefixes (can be chained e.g. "DR. MR.")
  const prefixRegex = /^(MASTER|MR\.?|MRS\.?|MS\.?|MISS|DR\.?|BABY|BABY OF|B\/O|SMT\.?|SHRI\.?|KUMAR|KUMARI|PT\.?)\s+/i;

  let prev = '';
  while (cleaned !== prev && prefixRegex.test(cleaned)) {
    prev = cleaned;
    cleaned = cleaned.replace(prefixRegex, '').trim();
  }
  return cleaned.toUpperCase();
}

/**
 * Normalizes Date of Admission into YYYY-MM-DD HTML date input format (strips time like 18:59:58)
 */
export function parseDoaDate(dateStr: string): string {
  if (!dateStr) return '';
  let trimmed = String(dateStr).trim();

  // Strip timestamp part e.g. "18:59:58", "18:59", "07:30 PM", "T18:59:58"
  trimmed = trimmed.replace(/[T\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|am|pm))?.*$/, '').trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Month dictionary for textual months
  const monthMap: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
  };

  // Textual month: DD-Mon-YYYY or DD Mon YYYY (e.g. "26-AUG-2024", "26 Aug 2024", "26-August-2024")
  const textMonthMatch1 = trimmed.match(/(\d{1,2})(?:st|nd|rd|th)?[\s\-\/\.]([a-zA-Z]+)[\s\-\/\.](\d{2,4})/);
  if (textMonthMatch1) {
    const day = textMonthMatch1[1].padStart(2, '0');
    const mStr = textMonthMatch1[2].toLowerCase();
    const rawYear = textMonthMatch1[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const monthKey = Object.keys(monthMap).find(k => mStr.startsWith(k));
    const month = monthKey ? monthMap[monthKey] : null;
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Textual month: Mon DD, YYYY (e.g. "Aug 26, 2024", "August 26 2024")
  const textMonthMatch2 = trimmed.match(/([a-zA-Z]+)[\s\-\/\.](\d{1,2})(?:st|nd|rd|th)?(?:,)?[\s\-\/\.](\d{2,4})/);
  if (textMonthMatch2) {
    const mStr = textMonthMatch2[1].toLowerCase();
    const day = textMonthMatch2[2].padStart(2, '0');
    const rawYear = textMonthMatch2[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const monthKey = Object.keys(monthMap).find(k => mStr.startsWith(k));
    const month = monthKey ? monthMap[monthKey] : null;
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Look for DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{2,4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const rawYear = dmyMatch[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    // If day > 12 and month <= 12, standard DD-MM-YYYY
    // If month > 12 and day <= 12, swap them
    if (parseInt(month, 10) > 12 && parseInt(day, 10) <= 12) {
      return `${year}-${day}-${month}`;
    }
    return `${year}-${month}-${day}`;
  }

  // Look for YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Strips parentheses, brackets, and prefixes from IPD / IP / IPID No (e.g. "IPD NO : (16338)" -> "16338", "IP NO: 16338" -> "16338")
 */
export function cleanIpdNo(ipd: string): string {
  if (!ipd) return '';
  let cleaned = String(ipd).trim();
  
  // Remove outer parentheses or quotes
  cleaned = cleaned.replace(/^[\(\[\{\"\']+|[\)\]\}\"\']+$/g, '').trim();
  
  // Remove common hospital IPD/IP/IPID/Adm prefixes
  cleaned = cleaned.replace(/^(?:IPD|IP|I\.P\.|IPID|IP\s*ID|ADM(?:ISSION)?|INDOOR|REG(?:ISTRATION)?)(?:\s*(?:NO|NUMBER|ID|#|\.))?\s*[:\-\.]?\s*/gi, '');
  cleaned = cleaned.replace(/^(?:NO|NUMBER|#)\s*[:\-\.]?\s*/gi, '');
  
  // Remove remaining parentheses
  cleaned = cleaned.replace(/[\(\)\[\]\{\}]/g, '').trim();
  
  return cleaned.toUpperCase();
}

/**
 * Normalizes UHID number, extracting EM codes or stripping parentheses (e.g. "(EM260820021)" -> "EM260820021")
 */
export function cleanUhid(uhid: string): string {
  if (!uhid) return '';
  const emMatch = uhid.match(/\b(EM[0-9A-Za-z]+)\b/i);
  if (emMatch) {
    return emMatch[1].toUpperCase();
  }
  return uhid
    .replace(/[\(\)\[\]\{\}]/g, '')
    .replace(/UHID\s*[:\-\.]?/gi, '')
    .trim()
    .toUpperCase();
}

/**
 * Strips labels, colons, or noise from Policy Number, Member ID, or Employee ID
 */
export function cleanCodeOrId(code: string): string {
  if (!code) return '';
  return code
    .replace(/^(?:POLICY\s*(?:NO|NUMBER)?|MEMBER\s*(?:ID|NO|NUMBER)?|EMP(?:LOYEE)?\s*(?:ID|NO)?|CARD\s*NO|INSURANCE\s*ID)\s*[:\-\.]?\s*/gi, '')
    .replace(/[\(\)\[\]\{\}]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Matches extracted TPA / Insurer string with closest known options in constants
 */
export function matchTpaAndInsurance(rawThirdParty: string): { tpaName: string; insuranceCompany: string } {
  if (!rawThirdParty) return { tpaName: '', insuranceCompany: '' };

  const norm = rawThirdParty.trim().toUpperCase();

  // Find direct or partial match in TPA options
  let matchedTpa = TPA_OPTIONS.find(tpa => {
    const tNorm = tpa.toUpperCase();
    return tNorm === norm || norm.includes(tNorm) || tNorm.includes(norm);
  }) || '';

  // Find direct or partial match in Insurance Companies
  let matchedIns = INSURANCE_COMPANIES.find(ins => {
    const iNorm = ins.toUpperCase();
    return iNorm === norm || norm.includes(iNorm) || iNorm.includes(norm);
  }) || '';

  // Common hospital & insurer mappings in India
  if (norm.includes('NIVA BUPA') || norm.includes('MAX BUPA')) {
    matchedTpa = matchedTpa || 'NIVA BUPA';
    matchedIns = matchedIns || 'NIVA BUPA HEALTH INSURANCE CO LTD';
  } else if (norm.includes('STAR HEALTH')) {
    matchedTpa = matchedTpa || 'STAR HEALTH INSURANCE';
    matchedIns = matchedIns || 'STAR HEALTH AND ALLIED INSURANCE CO.LTD';
  } else if (norm.includes('CARE HEALTH') || norm.includes('RELIGARE')) {
    matchedTpa = matchedTpa || 'CARE HEALTH INSURACE';
    matchedIns = matchedIns || 'CARE HEALTH INSURANCE LTD';
  } else if (norm.includes('HDFC ERGO')) {
    matchedTpa = matchedTpa || 'HDFC ERGO';
    matchedIns = matchedIns || 'HDFC ERGO GENERAL INSURANCE CO.LTD';
  } else if (norm.includes('ICICI LOMBARD')) {
    matchedTpa = matchedTpa || 'ICICI LOMBARD';
    matchedIns = matchedIns || 'ICICI LOMBARD GENERAL INSURANCE CO. LTD';
  } else if (norm.includes('BAJAJ ALLIANZ')) {
    matchedTpa = matchedTpa || 'BAJAJ ALLIANZ';
    matchedIns = matchedIns || 'BAJAJ ALLIANZ GENERAL INSURANCE CO. LTD';
  } else if (norm.includes('SBI GENERAL')) {
    matchedTpa = matchedTpa || 'SBI GENERAL INSURANCE';
    matchedIns = matchedIns || 'SBI GENERAL INSURANCE CO. LTD';
  } else if (norm.includes('TATA AIG')) {
    matchedTpa = matchedTpa || 'TATA AIG';
    matchedIns = matchedIns || 'TATA AIG GENERAL INSURANCE CO. LTD';
  } else if (norm.includes('ORIENTAL')) {
    matchedIns = matchedIns || 'THE ORIENTAL INSURANCE CO. LTD';
  } else if (norm.includes('NATIONAL INSURANCE')) {
    matchedIns = matchedIns || 'NATIONAL INSURANCE CO. LTD';
  } else if (norm.includes('NEW INDIA')) {
    matchedIns = matchedIns || 'THE NEW INDIA ASSURANCE CO. LTD';
  } else if (norm.includes('UNITED INDIA')) {
    matchedIns = matchedIns || 'UNITED INDIA INSURANCE CO. LTD';
  } else if (norm.includes('MEDIASSIST') || norm.includes('MEDI ASSIST')) {
    matchedTpa = matchedTpa || 'MEDIASSIST TPA';
  } else if (norm.includes('VIDAL')) {
    matchedTpa = matchedTpa || 'VIDAL HEALTH INSURANCE TPA PVT LTD';
  } else if (norm.includes('HERITAGE')) {
    matchedTpa = matchedTpa || 'HERITAGE TPA';
  } else if (norm.includes('MD INDIA')) {
    matchedTpa = matchedTpa || 'MD INDIA TPA';
  } else if (norm.includes('PARAMOUNT')) {
    matchedTpa = matchedTpa || 'PARAMOUNT HEALTH SERVICES & INSURANCE TPA PVT. LTD.';
  } else if (norm.includes('RAKSHA')) {
    matchedTpa = matchedTpa || 'RAKSHA HEALTH INSURANCE TPA PVT. LTD.';
  } else if (norm.includes('FAMILY HEALTH') || norm.includes('FHPL')) {
    matchedTpa = matchedTpa || 'FAMILY HEALTH PLAN INSURANCE TPA LTD.';
  } else if (norm.includes('HEALTH INDIA')) {
    matchedTpa = matchedTpa || 'HEALTH INDIA INSURANCE TPA SERVICES PVT. LTD.';
  } else if (norm.includes('ERICSON') || norm.includes('ERICSSON')) {
    matchedTpa = matchedTpa || 'ERICSON INSURANCE TPA PVT. LTD.';
  } else if (norm.includes('GENINS')) {
    matchedTpa = matchedTpa || 'GENINS INDIA INSURANCE TPA LTD.';
  } else if (norm.includes('VIPUL')) {
    matchedTpa = matchedTpa || 'VIPUL MEDCORP INSURANCE TPA PVT. LTD.';
  }

  return {
    tpaName: matchedTpa || norm,
    insuranceCompany: matchedIns || norm
  };
}

/**
 * Local fast heuristic regex fallback in case server OCR needs preprocessing or offline fallback
 */
export function parseAdmissionSlipText(text: string): ExtractedDocumentData {
  const result: ExtractedDocumentData = {
    rawExtractedText: text
  };

  if (!text) return result;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. IPD / IP / IPID / ADM NO
  const ipdMatch = text.match(/(?:IPD|IP|I\.P\.|IPID|IP\s*ID|ADM(?:ISSION)?|INDOOR)\s*(?:NO|NUMBER|#|\.)?\s*[:\-\.]?\s*\(?([A-Za-z0-9\/\-]+)\)?/i);
  if (ipdMatch) {
    result.ipdNo = cleanIpdNo(ipdMatch[1]);
  }

  // 2. UHID (starts with EM or is inside parentheses with EM or UHID: ...)
  const uhidMatch = text.match(/\b(EM[0-9A-Za-z]+)\b/i) || text.match(/\((EM[0-9A-Za-z]+)\)/i) || text.match(/UHID\s*[:\-\.]?\s*\(?([A-Za-z0-9]+)\)?/i);
  if (uhidMatch) {
    result.uhid = cleanUhid(uhidMatch[1]);
  }

  // 3. DOA (Date of Admission / Adm Date / DOA / Date)
  const doaLabelMatch = text.match(/(?:DOA|D\.O\.A\.|DATE\s*OF\s*ADM(?:ISSION)?|ADM(?:ISSION)?\s*DATE|ADM\s*DT|ENTRY\s*DATE|ADMITTED\s*ON|DATE)\s*[:\-\.]?\s*([0-9A-Za-z\/\-\.\s]+?)(?=\s*(?:TIME|DOD|WARD|DEPT|DR|IPD|UHID|\n|$))/i);
  if (doaLabelMatch) {
    const parsed = parseDoaDate(doaLabelMatch[1]);
    if (parsed) result.doa = parsed;
  }
  if (!result.doa) {
    const genericDateMatch = text.match(/(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/);
    if (genericDateMatch) {
      result.doa = parseDoaDate(genericDateMatch[1]);
    }
  }

  // 4. THIRD PARTY / TPA & INSURANCE COMPANY
  const thirdPartyMatch = text.match(/(?:THIRD\s*PARTY|TPA|INSURER|INSURANCE\s*(?:CO|COMPANY)?)\s*[:\-\.]?\s*([A-Za-z0-9\s\.\,\-]+?)(?=\n|\(|$)/i);
  if (thirdPartyMatch) {
    const rawTp = thirdPartyMatch[1].trim();
    const { tpaName, insuranceCompany } = matchTpaAndInsurance(rawTp);
    result.tpaName = tpaName;
    result.insuranceCompany = insuranceCompany;
  } else {
    // Check known TPA names in full text
    for (const tpa of TPA_OPTIONS) {
      if (text.toUpperCase().includes(tpa.toUpperCase())) {
        result.tpaName = tpa;
        break;
      }
    }
    // Check known Insurance companies in full text
    for (const ic of INSURANCE_COMPANIES) {
      if (text.toUpperCase().includes(ic.toUpperCase())) {
        result.insuranceCompany = ic;
        break;
      }
    }
  }

  // 5. Policy Number
  const polMatch = text.match(/(?:POLICY\s*(?:NO|NUM|NUMBER|#)?|POL\s*NO)\s*[:\-\.]?\s*([A-Za-z0-9\/\-]+)/i);
  if (polMatch) {
    result.policyNumber = cleanCodeOrId(polMatch[1]);
  }

  // 6. Member ID / Card No / Beneficiary ID
  const memberIdMatch = text.match(/(?:MEMBER\s*(?:ID|NO|NUM|#)?|CARD\s*(?:NO|ID|#)?|BENEFICIARY\s*ID|INSURANCE\s*ID|TPA\s*ID)\s*[:\-\.]?\s*([A-Za-z0-9\/\-]+)/i);
  if (memberIdMatch) {
    result.insuranceID = cleanCodeOrId(memberIdMatch[1]);
  }

  // 7. Employee ID / Corporate ID
  const empMatch = text.match(/(?:EMP(?:LOYEE)?\s*(?:ID|NO|#)?|CORP(?:ORATE)?\s*ID|STAFF\s*ID)\s*[:\-\.]?\s*([A-Za-z0-9\/\-]+)/i);
  if (empMatch) {
    result.empID = cleanCodeOrId(empMatch[1]);
  }

  // 8. Claim No
  const claimMatch = text.match(/(?:CLAIM\s*(?:NO|NUM|NUMBER|#)?|PRE[\-\s]*AUTH\s*(?:NO|NUM|#)?)\s*[:\-\.]?\s*([A-Za-z0-9\/\-]+)/i);
  if (claimMatch) {
    result.claimNo = cleanCodeOrId(claimMatch[1]);
  }

  // 9. Insurance Limit / Sum Insured
  const limitMatch = text.match(/(?:SUM\s*INSURED|SI|SUM\s*ASSURED|LIMIT|FLOATER\s*LIMIT)\s*[:\-\.]?\s*(?:RS\.?|INR|₹)?\s*([0-9\.,]+)/i) || text.match(/(?:RS\.?|INR|₹)\s*([0-9\.,]+)/i);
  if (limitMatch) {
    result.insuranceLimit = limitMatch[1].trim();
  }

  // 10. Mobile / Phone Number
  const mobileMatch = text.match(/(?:MOB(?:ILE)?|PH(?:ONE)?|CONTACT|TEL)\s*[:\-\.]?\s*(\+?91[\-\s]*)?([6-9]\d{9})/i) || text.match(/\b([6-9]\d{9})\b/);
  if (mobileMatch) {
    result.mobileNumber = mobileMatch[2] || mobileMatch[1];
  }

  // 11. Patient Name
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:MASTER|MR\.?|MRS\.?|MS\.?|MISS|DR\.?|BABY|SMT\.?|SHRI\.?)\s+[A-Za-z]/i.test(line)) {
      result.patientName = cleanPatientName(line);
      break;
    }
  }

  // 12. Doctor Name
  const docMatch = text.match(/(DR\.?\s+[A-Za-z\s]+)/i);
  if (docMatch) {
    result.doctorName = docMatch[1].trim().toUpperCase();
  }

  // 13. Diagnosis / Ward
  const diagMatch = text.match(/(?:DIAGNOSIS|DIAG|PROVISIONAL\s*DIAGNOSIS|WARD|EMERGENCY|DEPT)\s*[:\-\.]?\s*([A-Za-z0-9\s\/\-\|\,]+?)(?=\n|$)/i);
  if (diagMatch) {
    result.diagnosis = diagMatch[1].trim().toUpperCase();
  }

  // 14. Surgery / Procedure
  const surgMatch = text.match(/(?:SURGERY|PROCEDURE|OPERATION|SURGICAL\s*PROCEDURE)\s*[:\-\.]?\s*([A-Za-z0-9\s\/\-\|\,]+?)(?=\n|$)/i);
  if (surgMatch) {
    result.surgeryName = surgMatch[1].trim().toUpperCase();
  }

  // 15. Discovered Numbers & Codes
  const discovered: DiscoveredNumberItem[] = [];
  const addedValues = new Set<string>();

  const addDiscovered = (val: string, label: string, context?: string) => {
    const cleaned = String(val).trim();
    if (cleaned && cleaned.length >= 2 && !addedValues.has(cleaned.toUpperCase())) {
      addedValues.add(cleaned.toUpperCase());
      discovered.push({ value: cleaned, label, context });
    }
  };

  if (result.ipdNo) addDiscovered(result.ipdNo, 'IPD No', 'Admission Number');
  if (result.uhid) addDiscovered(result.uhid, 'UHID No', 'Hospital Reg ID');
  if (result.doa) addDiscovered(result.doa, 'Admission Date', 'DOA');
  if (result.dod) addDiscovered(result.dod, 'Discharge Date', 'DOD');
  if (result.policyNumber) addDiscovered(result.policyNumber, 'Policy No', 'Policy Schedule');
  if (result.insuranceID) addDiscovered(result.insuranceID, 'Member ID', 'Card Identifier');
  if (result.empID) addDiscovered(result.empID, 'Employee ID', 'Corporate Code');
  if (result.claimNo) addDiscovered(result.claimNo, 'Claim No', 'Claim Reference');
  if (result.mobileNumber) addDiscovered(result.mobileNumber, 'Mobile No', 'Phone Number');
  if (result.insuranceLimit) addDiscovered(result.insuranceLimit, 'Sum Insured', 'Policy Limit');

  // Generic number patterns in lines
  const genericTokens = text.match(/\b(?:[A-Z]{1,4}[0-9]{3,}|[0-9]{3,}[A-Z0-9\/\-]*)\b/gi) || [];
  for (const token of genericTokens.slice(0, 20)) {
    if (!addedValues.has(token.toUpperCase()) && !/^(19\d\d|20\d\d)$/.test(token)) {
      addDiscovered(token, 'Code / Number');
    }
  }

  result.discoveredNumbers = discovered;
  result.allTextLines = lines.slice(0, 50);

  return result;
}
