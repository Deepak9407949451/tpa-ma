import Tesseract from 'tesseract.js';
import {
  ExtractedDocumentData,
  cleanPatientName,
  cleanIpdNo,
  cleanUhid,
  cleanCodeOrId,
  parseDoaDate,
  matchTpaAndInsurance,
  CardMember
} from './ocrParser';

/**
 * Enhanced heuristic parser for raw OCR text from Admission Slips and Insurance Cards
 */
export function parseComprehensiveOcrText(
  rawTexts: string[],
  targetMode: 'all' | 'admission' | 'insurance' = 'all'
): ExtractedDocumentData {
  const fullCombinedText = rawTexts.join('\n\n');
  const allLines = fullCombinedText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const result: ExtractedDocumentData = {
    documentType: targetMode === 'insurance' ? 'insurance_card' : targetMode === 'admission' ? 'admission_slip' : 'combined',
    rawExtractedText: fullCombinedText,
    members: []
  };

  // 1. IPD / IP / IPID / ADM NO
  const ipdRegexes = [
    /(?:IPD|IP|I\.P\.|IPID|IP\s*ID|ADM(?:ISSION)?|INDOOR|INPATIENT)\s*(?:NO|NUMBER|#|\.)?\s*[:\-\.]?\s*\(?([A-Za-z0-9\/\-]+)\)?/i,
    /\b(?:IP|IPD)\s*[:\-\/]\s*([0-9A-Za-z\-]+)\b/i,
    /\bIP\s*No\.?\s*[:\s]*([0-9A-Za-z\-]+)\b/i,
    /\b\((\d{4,8})\)\b/ // bracketed numeric ID like (16338)
  ];

  for (const regex of ipdRegexes) {
    const match = fullCombinedText.match(regex);
    if (match && match[1]) {
      const candidate = cleanIpdNo(match[1]);
      if (candidate && candidate.length >= 2 && !candidate.startsWith('000000000')) {
        result.ipdNo = candidate;
        break;
      }
    }
  }

  // 2. UHID / Patient Reg Number
  const uhidRegexes = [
    /\b(EM[0-9A-Za-z]+)\b/i,
    /\((EM[0-9A-Za-z]+)\)/i,
    /(?:UHID|REG(?:ISTRATION)?|PATIENT\s*ID|MRN)\s*(?:NO|NUMBER|#|\.)?\s*[:\-\.]?\s*\(?([A-Za-z0-9]+)\)?/i
  ];

  for (const regex of uhidRegexes) {
    const match = fullCombinedText.match(regex);
    if (match && match[1]) {
      const candidate = cleanUhid(match[1]);
      if (candidate && candidate.length >= 3) {
        result.uhid = candidate;
        break;
      }
    }
  }

  // 3. DOA (Date of Admission)
  const doaRegexes = [
    /(?:DOA|D\.O\.A\.|DATE\s*OF\s*ADM(?:ISSION)?|ADM(?:ISSION)?\s*DATE|ADM\s*DT|ENTRY\s*DATE|ADMITTED\s*ON)\s*[:\-\.]?\s*([0-9A-Za-z\/\-\.\s]+?)(?=\s*(?:TIME|DOD|WARD|DEPT|DR|IPD|UHID|\n|$))/i,
    /(?:DATE|DT)\s*[:\-\.]?\s*([0-9]{1,2}[-/\.][0-9]{1,2}[-/\.][0-9]{2,4})/i
  ];

  for (const regex of doaRegexes) {
    const match = fullCombinedText.match(regex);
    if (match && match[1]) {
      const parsed = parseDoaDate(match[1]);
      if (parsed) {
        result.doa = parsed;
        break;
      }
    }
  }

  if (!result.doa) {
    const genericDateMatch = fullCombinedText.match(/\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b/);
    if (genericDateMatch) {
      result.doa = parseDoaDate(genericDateMatch[1]);
    }
  }

  // 4. Policy Number
  const policyRegexes = [
    /(?:POLICY|POL)\s*(?:NO|NUMBER|#|\.)?\s*[:\-\.]?\s*([A-Za-z0-9\/\-\.]+)/i,
    /(?:POLICY|POL\s*NO)\s*[:\s]*([0-9A-Za-z\/\-]+)/i
  ];

  for (const regex of policyRegexes) {
    const match = fullCombinedText.match(regex);
    if (match && match[1]) {
      const candidate = cleanCodeOrId(match[1]);
      if (candidate && candidate.length >= 4) {
        result.policyNumber = candidate;
        break;
      }
    }
  }

  // 5. Insurance ID / Member ID / Card No
  const memberIdRegexes = [
    /(?:MEMBER\s*ID|CARD\s*(?:NO|NUMBER)|BENEFICIARY\s*ID|INSURANCE\s*ID|HEALTH\s*ID|ID\s*NO)\s*[:\-\.]?\s*([A-Za-z0-9\/\-\.]+)/i,
    /(?:MEDICLAIM\s*NO|TPA\s*ID)\s*[:\-\.]?\s*([A-Za-z0-9\/\-\.]+)/i
  ];

  for (const regex of memberIdRegexes) {
    const match = fullCombinedText.match(regex);
    if (match && match[1]) {
      const candidate = cleanCodeOrId(match[1]);
      if (candidate && candidate.length >= 4) {
        result.insuranceID = candidate;
        break;
      }
    }
  }

  // 6. Employee ID / Corporate ID
  const empRegex = /(?:EMP(?:LOYEE)?|STAFF|CORP(?:ORATE)?)\s*(?:ID|NO|CODE)?\s*[:\-\.]?\s*([A-Za-z0-9\-]+)/i;
  const empMatch = fullCombinedText.match(empRegex);
  if (empMatch && empMatch[1]) {
    result.empID = cleanCodeOrId(empMatch[1]);
  }

  // 7. Insurance Company & TPA matching
  const knownMatch = matchTpaAndInsurance(fullCombinedText);
  if (knownMatch.tpaName) result.tpaName = knownMatch.tpaName;
  if (knownMatch.insuranceCompany) result.insuranceCompany = knownMatch.insuranceCompany;

  // Check specific TPA / Third Party labels
  const tpaLabelMatch = fullCombinedText.match(/(?:TPA|THIRD\s*PARTY\s*ADMINISTRATOR|THIRD\s*PARTY)\s*[:\-\.]?\s*([A-Za-z0-9\s\.\,\-]+?)(?=\n|\(|$)/i);
  if (tpaLabelMatch && tpaLabelMatch[1]) {
    const matchRes = matchTpaAndInsurance(tpaLabelMatch[1]);
    if (matchRes.tpaName) result.tpaName = matchRes.tpaName;
    if (matchRes.insuranceCompany && !result.insuranceCompany) result.insuranceCompany = matchRes.insuranceCompany;
  }

  // 8. Patient Name extraction
  for (const line of allLines) {
    // Name with title prefix
    if (/(?:MASTER|MR\.?|MRS\.?|MS\.?|MISS|DR\.?|BABY|SMT\.?|SHRI\.?)\s+[A-Za-z]{2,}/i.test(line)) {
      const cleaned = cleanPatientName(line);
      if (cleaned && cleaned.length >= 3 && !cleaned.includes('HOSPITAL') && !cleaned.includes('INSURANCE')) {
        result.patientName = cleaned;
        break;
      }
    }
  }

  // If no prefix name found, look for "Name:" or "Patient Name:"
  if (!result.patientName) {
    const nameLabelMatch = fullCombinedText.match(/(?:PATIENT\s*NAME|PATIENT|NAME|INSURED\s*NAME|CARD\s*HOLDER)\s*[:\-\.]?\s*([A-Za-z\s\.]+?)(?=\s*(?:AGE|GENDER|SEX|DOB|IPD|UHID|DOA|RELATION|\n|$))/i);
    if (nameLabelMatch && nameLabelMatch[1]) {
      const cleaned = cleanPatientName(nameLabelMatch[1].trim());
      if (cleaned && cleaned.length >= 3 && !cleaned.includes('HOSPITAL')) {
        result.patientName = cleaned;
      }
    }
  }

  // 9. Doctor Name
  const docMatch = fullCombinedText.match(/(?:DR\.?|DOCTOR|CONSULTANT)\s*[:\-\.]?\s*(DR\.?\s+[A-Za-z\s]+|[A-Za-z\s]+)/i);
  if (docMatch && docMatch[1]) {
    let dName = docMatch[1].trim().toUpperCase();
    if (!dName.startsWith('DR')) dName = `DR. ${dName}`;
    if (dName.length >= 4 && !dName.includes('HOSPITAL') && !dName.includes('ADMISSION')) {
      result.doctorName = dName;
    }
  }

  // 10. Diagnosis / Ward
  const diagMatch = fullCombinedText.match(/(?:DIAGNOSIS|WARD|DEPT|DEPARTMENT|BED\s*NO)\s*[:\-\.]?\s*([A-Za-z0-9\s\|\-]+?)(?=\n|$)/i);
  if (diagMatch && diagMatch[1]) {
    result.diagnosis = diagMatch[1].trim();
  }

  // 11. Sum Insured / Policy Limit
  const limitMatch = fullCombinedText.match(/(?:SUM\s*INSURED|LIMIT|FLOATER\s*SUM|SI)\s*[:\-\.]?\s*(?:INR|RS\.?|₹)?\s*([0-9\,]+)/i);
  if (limitMatch && limitMatch[1]) {
    result.insuranceLimit = `₹ ${limitMatch[1].trim()}`;
  }

  // 12. Multiple card members detection
  const memberMatches: CardMember[] = [];
  for (const line of allLines) {
    const idOnLine = line.match(/\b([A-Za-z0-9]{6,16})\b/);
    const nameOnLine = line.match(/\b([A-Z]{3,}\s+[A-Z]{3,}(?:\s+[A-Z]{3,})?)\b/);
    if (nameOnLine && idOnLine && !nameOnLine[1].includes('INSURANCE') && !nameOnLine[1].includes('HOSPITAL')) {
      const memName = cleanPatientName(nameOnLine[1]);
      if (memName && memName.length >= 4) {
        memberMatches.push({
          name: memName,
          memberId: cleanCodeOrId(idOnLine[1])
        });
      }
    }
  }

  if (memberMatches.length > 0) {
    result.members = memberMatches;
  }

  return result;
}

/**
 * Runs local on-device OCR using Tesseract.js across one or multiple images
 */
export async function runClientTesseractOCR(
  images: Array<{ dataUrl: string; name?: string }>,
  targetMode: 'all' | 'admission' | 'insurance' = 'all',
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedDocumentData> {
  const extractedTexts: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    if (onProgress) {
      onProgress(
        Math.round(((i) / images.length) * 100),
        `Scanning document ${i + 1} of ${images.length} with on-device OCR...`
      );
    }

    try {
      const { data } = await Tesseract.recognize(item.dataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            const docProg = Math.round(m.progress * 100);
            const totalProg = Math.round(((i + m.progress) / images.length) * 100);
            onProgress(totalProg, `Reading text in document ${i + 1} (${docProg}%)...`);
          }
        }
      });

      if (data && data.text) {
        extractedTexts.push(data.text);
      }
    } catch (err) {
      console.warn(`[Client OCR] Failed for image ${i + 1}:`, err);
    }
  }

  if (onProgress) {
    onProgress(100, 'Consolidating extracted patient and insurance data...');
  }

  return parseComprehensiveOcrText(extractedTexts, targetMode);
}
