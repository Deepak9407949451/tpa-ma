import { Claim } from '../types';

export function formatDateForDisplay(value: any): string {
  if (value === null || value === undefined || value === '') return '-';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '-';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const text = String(value).trim();
  if (!text || text === '-') return '-';

  // 1. ISO string with time component (e.g. "2026-07-24T18:30:00.000Z") - split on 'T' to avoid timezone day shift!
  if (text.includes('T')) {
    const datePart = text.split('T')[0];
    const ymd = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
    }
  }

  // 2. Pure DD-MM-YYYY format (e.g. "12-05-2024" or "05-11-2024") - preserve exact numbers!
  const dmyDashMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDashMatch) {
    const d = dmyDashMatch[1].padStart(2, '0');
    const m = dmyDashMatch[2].padStart(2, '0');
    const y = dmyDashMatch[3];
    return `${d}-${m}-${y}`;
  }

  // 3. Pure DD/MM/YYYY format (e.g. "12/05/2024" or "05/11/2024") - preserve exact numbers!
  const dmySlashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmySlashMatch) {
    const d = dmySlashMatch[1].padStart(2, '0');
    const m = dmySlashMatch[2].padStart(2, '0');
    const y = dmySlashMatch[3];
    return `${d}-${m}-${y}`;
  }

  // 4. Pure DD.MM.YYYY format
  const dmyDotMatch = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmyDotMatch) {
    const d = dmyDotMatch[1].padStart(2, '0');
    const m = dmyDotMatch[2].padStart(2, '0');
    const y = dmyDotMatch[3];
    return `${d}-${m}-${y}`;
  }

  // 5. Pure YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (e.g. "2024-05-12") -> "12-05-2024"
  const ymdMatch = text.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // 6. Excel serial number (e.g. 45424)
  const numericValue = Number(text);
  if (!Number.isNaN(numericValue) && text !== '' && numericValue > 59 && numericValue < 100000) {
    const baseDate = new Date(Date.UTC(1899, 11, 30));
    const converted = new Date(baseDate.getTime() + numericValue * 86400000);
    const y = converted.getUTCFullYear();
    const m = String(converted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(converted.getUTCDate()).padStart(2, '0');
    return `${d}-${m}-${y}`;
  }

  return text;
}

/**
 * Normalizes dates for storage while PRESERVING the exact day, month, and year from Google Sheet.
 * Stores in standard DD-MM-YYYY format (e.g. "12-05-2024") so it matches what is seen in the sheet.
 */
export function normalizeDateForStorage(value: any): string {
  if (value === null || value === undefined || value === '') return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const d = String(value.getDate()).padStart(2, '0');
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const y = value.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const text = String(value).trim();
  if (!text || text === '-') return '';

  // 1. ISO string with time component (e.g. "2026-07-24T18:30:00.000Z") - split on 'T' to avoid timezone day shift!
  if (text.includes('T')) {
    const datePart = text.split('T')[0];
    const ymd = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
    }
  }

  // 2. Pure DD-MM-YYYY (e.g. "12-05-2024", "05-11-2024") -> keep exact string!
  const dmyDashMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDashMatch) {
    const d = dmyDashMatch[1].padStart(2, '0');
    const m = dmyDashMatch[2].padStart(2, '0');
    const y = dmyDashMatch[3];
    return `${d}-${m}-${y}`;
  }

  // 3. Pure DD/MM/YYYY (e.g. "12/05/2024", "05/11/2024") -> convert / to - preserving exact day and month!
  const dmySlashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmySlashMatch) {
    const d = dmySlashMatch[1].padStart(2, '0');
    const m = dmySlashMatch[2].padStart(2, '0');
    const y = dmySlashMatch[3];
    return `${d}-${m}-${y}`;
  }

  // 4. Pure DD.MM.YYYY
  const dmyDotMatch = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmyDotMatch) {
    const d = dmyDotMatch[1].padStart(2, '0');
    const m = dmyDotMatch[2].padStart(2, '0');
    const y = dmyDotMatch[3];
    return `${d}-${m}-${y}`;
  }

  // 5. YYYY-MM-DD or YYYY/MM/DD (e.g. "2024-05-12") -> "12-05-2024"
  const ymdMatch = text.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // 6. Excel serial number (e.g. 45424)
  const numericValue = Number(text);
  if (!Number.isNaN(numericValue) && text !== '' && numericValue > 59 && numericValue < 100000) {
    const baseDate = new Date(Date.UTC(1899, 11, 30));
    const converted = new Date(baseDate.getTime() + numericValue * 86400000);
    const y = converted.getUTCFullYear();
    const m = String(converted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(converted.getUTCDate()).padStart(2, '0');
    return `${d}-${m}-${y}`;
  }

  return text;
}

/**
 * Formats any date string into "YYYY-MM-DD" strictly for HTML <input type="date"> value attribute.
 */
export function toHtmlDateValue(value: any): string {
  if (!value) return '';
  const text = String(value).trim();
  if (!text || text === '-') return '';

  const dmyMatch = text.match(/^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  const ymdMatch = text.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  return text;
}

/**
 * Converts any date format to "YYYY-MM-DD" for accurate lexicographical comparison in date range filtering.
 */
export function toComparableDate(value: any): string {
  return toHtmlDateValue(value);
}


export function getClaimFieldValue(claim: any, aliases: string[]): string {
  for (const alias of aliases) {
    const value = claim?.[alias];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
  }
  return '';
}

export function computeClaimFinancials(claim: Partial<Claim>, sourceField?: string): void {
  const parseAmountValue = (value: any): number => {
    if (value === undefined || value === null) return 0;
    const numeric = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const settlementEmpty = String(claim.settlementAmount || '').trim() === '';
  const approvedEmpty = String(claim.approved || '').trim() === '';
  const totalBillEmpty = String(claim.totalBill || '').trim() === '';
  const discountEmpty = String(claim.discount || '').trim() === '';

  const settlementAmount = settlementEmpty ? 0 : parseAmountValue(claim.settlementAmount);
  const approved = approvedEmpty ? 0 : parseAmountValue(claim.approved);
  const totalBill = totalBillEmpty ? 0 : parseAmountValue(claim.totalBill);
  const discount = discountEmpty ? 0 : parseAmountValue(claim.discount);

  // Determine base amount (Settlement Amount if present and > 0, otherwise Approved Amount)
  const baseAmount = settlementAmount > 0 ? settlementAmount : approved;

  // Handle TDS calculation or preservation
  let tdsAmount = 0;
  if (sourceField === 'tds' && claim.tds !== undefined && claim.tds !== '') {
    tdsAmount = parseAmountValue(claim.tds);
  } else {
    if (baseAmount > 0) {
      if (claim.tds && String(claim.tds).trim() !== '' && sourceField !== 'settlementAmount' && sourceField !== 'approved') {
        tdsAmount = parseAmountValue(claim.tds);
      } else {
        tdsAmount = Math.round(baseAmount * 0.10 * 100) / 100;
        claim.tds = tdsAmount.toFixed(2);
      }
    } else if (sourceField !== 'tds' && !claim.tds) {
      claim.tds = '';
    }
  }

  // Handle Payment Received (Net Amount) = Base Amount - TDS
  if (sourceField !== 'deduction') {
    if (baseAmount > 0) {
      const netPayment = Math.max(0, Math.round((baseAmount - tdsAmount) * 100) / 100);
      claim.deduction = netPayment > 0 ? netPayment.toFixed(2) : '0.00';
    } else if (sourceField !== 'tds' && !claim.deduction) {
      claim.deduction = '';
    }
  }

  // Handle Patient Pay = Total Bill - Approved - Discount (minimum 0)
  if (sourceField !== 'patientPay') {
    if (totalBill > 0 || approved > 0 || discount > 0) {
      const calculatedPay = Math.max(0, Math.round((totalBill - approved - discount) * 100) / 100);
      claim.patientPay = calculatedPay.toFixed(2);
    } else if (!claim.patientPay) {
      claim.patientPay = '';
    }
  }
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const g = ['', 'Thousand', 'Lakh', 'Crore'];

  function convertLessThanThousand(n: number): string {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  let words = '';
  let factor = 10000000;
  let idx = 3;
  while (idx > 0) {
    const amount = Math.floor(num / factor);
    if (amount > 0) {
      words += convertLessThanThousand(amount) + ' ' + g[idx] + ' ';
      num %= factor;
    }
    factor /= (idx === 1 ? 10 : 100);
    idx--;
  }
  if (num > 0) {
    words += convertLessThanThousand(num) + ' ';
  }
  return words.trim();
}

export function normalizeMobileNumber(mobile: any): string {
  if (!mobile) return '';
  return String(mobile).replace(/[^0-9]/g, '').replace(/^0+/, '');
}

/**
 * Extracts multiple valid mobile/phone numbers from any string (comma, slash, space, semicolon, newline separated).
 * Handles numbers with or without country code '91' and returns unique sanitized 10+ digit phone numbers formatted for WhatsApp (91XXXXXXXXXX).
 */
export function extractValidPhoneNumbers(input: any): string[] {
  if (!input) return [];
  const rawStr = String(input);
  // Split by common delimiters like comma, slash, semicolon, pipe, ampersand, newlines or 'and'
  const tokens = rawStr.split(/[\/,;\n\r|&+]|\band\b/i);
  const results: string[] = [];

  for (const token of tokens) {
    // Also support space-separated numbers if someone pasted 9876543210 9123456789
    const subTokens = token.trim().split(/\s{2,}|\s+(?=\d{10})/);
    for (const sub of subTokens) {
      const digitsOnly = sub.replace(/[^0-9]/g, '');
      if (!digitsOnly) continue;

      let clean = digitsOnly.replace(/^0+/, '');
      // If 12 digits starting with 91, keep it
      if (clean.length === 12 && clean.startsWith('91')) {
        if (!results.includes(clean)) results.push(clean);
      } else if (clean.length === 10) {
        const full = '91' + clean;
        if (!results.includes(full)) results.push(full);
      } else if (clean.length > 10 && clean.length <= 13) {
        // e.g., foreign or 91 with extra digits
        if (!results.includes(clean)) results.push(clean);
      }
    }
  }

  return results;
}

// --- Currency Utilities ---
export interface ExcelAmountCell {
  v: number;
  t: 'n';
  z: string;
  w: string;
}

export function formatAmountForExcel(val: any, defaultToZero = false): ExcelAmountCell | string {
  if (val === null || val === undefined || val === '' || val === '-') {
    return defaultToZero ? { v: 0, t: 'n', z: '0.00', w: '0.00' } : '';
  }
  let num: number;
  if (typeof val === 'number') {
    num = isNaN(val) ? 0 : val;
  } else {
    // Strip any leading or inline ₹, Rs, Rs., INR, comma, space
    const cleaned = String(val).replace(/[₹,RsINR\s]/gi, '').trim();
    num = parseFloat(cleaned);
    if (isNaN(num)) {
      return String(val).trim();
    }
  }
  const rounded = Math.round(num * 100) / 100;
  return {
    v: rounded,
    t: 'n',
    z: '0.00',
    w: rounded.toFixed(2)
  };
}

export function cleanCurrencyAmount(val: any, fallback = '0.00'): string {
  if (val === undefined || val === null || val === '' || val === '-') return fallback;
  const str = String(val).trim();
  if (!str) return fallback;
  // Strip any leading currency symbols/words like ₹, Rs, Rs., INR (case-insensitive) and spaces
  let cleanStr = str.replace(/^(₹|Rs\.?|INR)\s*/gi, '').trim();
  cleanStr = cleanStr.replace(/^(₹|Rs\.?|INR)\s*/gi, '').trim();
  return cleanStr || fallback;
}

export function formatCurrencyDisplay(val: any, fallback = '-'): string {
  if (val === undefined || val === null || val === '' || val === '-') return fallback;
  const cleaned = cleanCurrencyAmount(val, '');
  if (!cleaned) return fallback;
  return `₹ ${cleaned}`;
}

// --- Send WhatsApp Utility ---
export const sendWhatsAppMessage = (record: any, preferredMode: 'single_task' | 'multi_window' = 'single_task') => {
  const contactNumber = record?.contactNumber || record?.mobileNumber || record?.mobile || record?.phone || '';
  if (!contactNumber) {
    alert("No contact number provided for this patient.");
    return;
  }

  // Extract all valid numbers (supports single or multiple numbers entered with comma, slash, space, etc.)
  const phoneNumbers = extractValidPhoneNumbers(contactNumber);
  if (phoneNumbers.length === 0) {
    alert("No valid 10-digit mobile number found for this patient.");
    return;
  }

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || val === '' || val === '-') return '₹ 0.00';
    if (typeof val === 'string' && val.trim().startsWith('₹')) return val.trim();
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(num)) return '₹ 0.00';
    return `₹ ${num.toFixed(2)}`;
  };

  const status = String(record.admissionStatus || record.status || '').trim();
  const isDenial = status === "Denial" || status === "Rejected" || status === "Rejected / Denial" || status.toLowerCase().includes("denial") || status.toLowerCase().includes("reject");

  // --- Handling Claim Rejection / Denial Notification ---
  if (isDenial) {
    const denialMessage = `🏥 *CLAIM REJECTION NOTIFICATION.*
*क्लेम रिजेक्शन की सूचना।*

📋 *मरीज़ की जानकारी:*

• *मरीज़ का नाम:* *${record.patientName || '-'}*

• *TPA का नाम:* *${record.tpaCompanyName || record.tpaName || "-"}*

• *क्लेम की स्थिति:* *रिजेक्टेड*

* आपको अब हॉस्पिटल  का खर्च खुद  से पेमेंट  करना होगा *

*हमें खेद है। की कंपनी के द्वारा आपका इन्शुरन्स से भुगतान निरस्त कर दिया गया है*

Thank you for choosing our Hospital.
For any queries,
Mon-Sat 10am-7pm.
Please contact us: 9009446861,

Best regards,
Hospital Administration - TPA Desk.`;

    dispatchWhatsAppBroadcast(phoneNumbers, denialMessage, preferredMode);
    return;
  }

  const approvedText = formatCurrency(record.finalApprovedAmount || record.approved || 0);
  const deductionText = formatCurrency(record.paymentReceived || record.deduction || 0);
  const discountText = formatCurrency(record.discount || 0);
  const payableText = formatCurrency(record.patientPayableAmount || record.patientPay || 0);

  const message = `🏥 *DISCHARGE & CLAIM APPROVAL NOTIFICATION.*

📋 Patient Details:

Patient Name: *${record.patientName || '-'}*

TPA Name: *${record.tpaCompanyName || record.tpaName || "-"}*

Claim No: *${record.claimNumber || record.claimNo || "-"}*

💰 Insurance Payment Details :

Discharge Approved Amount: *${approvedText}*

Discount: *${discountText}*

Amount Payable by Patient: *${payableText}*

*Kindly visit the Billing Department to finalize your settlement.*

*कृपया अपना  गेट पास /सेटलमेंट / भुगतान पूरा करने के लिए बिलिंग विभाग ( पहली मंजिल ) में संपर्क करें।*

Thank you for choosing our Hospital.
For any queries,
Mon-Sat 10am-7pm.
Please contact us.9009446861,

Best regards,
Hospital Administration - TPA Desk.`;

  dispatchWhatsAppBroadcast(phoneNumbers, message, preferredMode);
};

/**
 * Dispatches WhatsApp message to single or multiple numbers.
 * In 'single_task' mode (Direct Single Task Broadcast):
 * - If 1 number: directly opens wa.me with that recipient in one tab/task.
 * - If multiple numbers: opens WhatsApp Web/API in a SINGLE focused tab/task with pre-filled message,
 *   copies message to clipboard, and facilitates broadcasting to all selected numbers without cluttering the screen with multiple tabs.
 * In 'multi_window' mode: opens separate tabs for each recipient.
 */
export function dispatchWhatsAppBroadcast(phoneNumbers: string[], messageText: string, mode: 'single_task' | 'multi_window' = 'single_task') {
  if (!phoneNumbers || phoneNumbers.length === 0) return;

  // Copy message to clipboard automatically for convenience across any chat
  try {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(messageText).catch(() => {});
    }
  } catch (e) {
    // Ignore clipboard errors
  }

  if (phoneNumbers.length === 1) {
    const singleUrl = `https://wa.me/${phoneNumbers[0]}?text=${encodeURIComponent(messageText)}`;
    window.open(singleUrl, '_blank');
    return;
  }

  if (mode === 'single_task') {
    // Single-task direct broadcast flow:
    // Directs into WhatsApp via the first primary phone number in a SINGLE window/tab,
    // while also providing direct fast-links so the user can send to the others in the same flow without multiple cluttered popups.
    const primaryNum = phoneNumbers[0];
    const targetUrl = `https://wa.me/${primaryNum}?text=${encodeURIComponent(messageText)}`;
    window.open(targetUrl, 'whatsapp_broadcast_single_task');
  } else {
    // Multiple tabs/windows mode
    phoneNumbers.forEach((phone, idx) => {
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
      if (idx === 0) {
        window.open(whatsappUrl, '_blank');
      } else {
        setTimeout(() => {
          try {
            window.open(whatsappUrl, '_blank');
          } catch (e) {
            console.error(`Failed to open WhatsApp for ${phone}:`, e);
          }
        }, idx * 300);
      }
    });
  }
}

export function buildWhatsAppMessage(patient: Partial<Claim>): string {
  const name = patient.patientName || patient.name || '-';
  const claim = patient.claimNo || '-';
  const approved = patient.settlementAmount || patient.finalApproved || patient.approved || '-';
  const deduction = patient.deduction || '-';
  const discount = patient.discount || '-';
  const payable = patient.patientPay || '-';

  const approvedText = approved === '-' ? '-' : `₹ ${Number(approved).toFixed(2)}`;
  const deductionText = deduction === '-' ? '-' : `₹ ${Number(deduction).toFixed(2)}`;
  const discountText = discount === '-' ? '-' : `₹ ${Number(discount).toFixed(2)}`;
  const payableText = payable === '-' ? '-' : `₹ ${Number(payable).toFixed(2)}`;

  return `Hello Sir/Madam,

🏥 *DISCHARGE & CLAIM APPROVAL NOTIFICATION.*

📋 Patient Details:

Patient Name: *${name}*

TPA Name: *${patient.tpaName || patient.tpa || '-'}*

Claim No: *${claim}*

💰 Insurance Payment Details :

Discharge Approved Amount: *${approvedText}*

Payment Recived: *${deductionText}*

Discount: *${discountText}*

Amount Payable by Patient: *${payableText}*

*Kindly visit the Billing Department to finalize your settlement.*

Thank you for choosing our hospital.
For any queries,
Mon-Sat 10am-7pm.
Please contact us.9009446861,

Best regards,
Hospital Administration - TPA Desk.`;
}

export function openWhatsAppChat(phone: string, text: string): void {
  if (!phone) {
    alert('Patient mobile number is required to send WhatsApp message.');
    return;
  }
  const encodedText = encodeURIComponent(text);
  const fullNumber = phone.startsWith('91') ? phone : `91${phone}`;
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${fullNumber}&text=${encodedText}`;
  window.open(whatsappUrl, '_blank');
}

export function getStatusColor(status?: string): string {
  const cleanStatus = String(status || '').replace(/^•\s*/, '').trim();
  const colors: Record<string, string> = {
    'Admitted': '#65a30d',
    'Initial Approved': '#2151ed',
    'Discharge': '#229bf0',
    'Discharge Approved': '#059669',
    'Denial': '#e8392a',
    'Pending': '#b811f0',
    'Settled': '#089c4e'
  };

  const lower = cleanStatus.toLowerCase();
  for (const [key, val] of Object.entries(colors)) {
    if (key.toLowerCase() === lower) return val;
  }

  return colors[cleanStatus] || '#2563eb';
}

export function getStatusSuccessMessage(status?: string, mode: 'save' | 'update' = 'save'): string {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'settled') {
    return 'Payment Settled successfully';
  }
  if (normalized === 'pending') {
    return 'Payment Pending updated';
  }
  if (normalized === 'initial approved') {
    return 'Initial Approved updated';
  }
  if (normalized === 'discharge approved') {
    return 'Patient Discharge Approved successfully';
  }
  if (normalized === 'rejected' || normalized === 'denial') {
    return 'Ab Gya Beta To Rejected successfully';
  }

  return mode === 'update' ? 'Patient Record Updated Successfully!' : 'New Patient Admitted Successfully!';
}

function escapeHtml(text: any): string {
  return String(text || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

function numToIndianWords(num: number): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const g = (nVal: number, suffix: string) => {
    if (nVal === 0) return '';
    let str = '';
    if (nVal > 99) {
      str += a[Math.floor(nVal / 100)] + ' Hundred ';
      nVal %= 100;
    }
    if (nVal > 0) {
      if (nVal < 20) str += a[nVal] + ' ';
      else str += b[Math.floor(nVal / 10)] + (nVal % 10 ? ' ' + a[nVal % 10] + ' ' : ' ');
    }
    return str + suffix + ' ';
  };
  return (g(Math.floor(n / 10000000), 'Crore') + g(Math.floor((n / 100000) % 100), 'Lakh') + g(Math.floor((n / 1000) % 100), 'Thousand') + g(Math.floor((n / 100) % 10), 'Hundred') + g(n % 100, '')).trim();
}

export function buildCoverLetterInstance(row: any, index: number, showHeader = true, enclosedDocs?: string[]): string {
  const hospitalName = 'ARPA MEDCITY HOSPITAL & RESEARCH INSTITUTE';
  const tagline = 'Rohini ID ; 8900080534254';
  const address = 'Vyapar Vihar, Main Road, Near SBI Commercial Bank Branch, Bilaspur, Chhattisgarh 495001';
  const contactPhone = '9009446861, 07752-446322';
  const contactEmail = 'elitemedcityhospitals@gmail.com';
  const registrationNo = 'TIBLA18427';
  const logoUrl = 'https://i.ibb.co/gb33HXZS/logo.png';
  const monoUrl = 'https://i.ibb.co/spzFbKhC/Screenshot-2026-08-08-193323.png';

  const tpaVal = getClaimFieldValue(row, ['tpaName', 'tpa', 'TPA/Ins. Name', 'TPA/Ins.Name', 'tpaInsName']) || row.tpaName || '';
  const insVal = getClaimFieldValue(row, ['insuranceCompany', 'Insurance Company', 'insuranceCompanyName', 'settlementSummary']) || row.insuranceCompany || '';

  let companyName = '';
  if (insVal && tpaVal && insVal.trim().toLowerCase() !== tpaVal.trim().toLowerCase()) {
    companyName = `${insVal} / ${tpaVal}`;
  } else {
    companyName = insVal || tpaVal || 'Star Health & Allied Insurance Co. Ltd. / Family Health Plan TPA';
  }

  const insuranceAddress = getClaimFieldValue(row, ['insuranceAddress', 'Insurance Address', 'insuranceaddress', 'tpaAddress', 'address']) || row.insuranceAddress || 'Claims Department, 3rd Floor, Corporate Tower, Finance District, City - 500032';

  const claimNo = getClaimFieldValue(row, ['claimNo', 'Claim No', 'claim_no', 'claimNumber']) || row.claimNo || 'N/A';
  const memberId = getClaimFieldValue(row, ['insuranceID', 'insuranceIdNo', 'Insurance ID No', 'Insurance ID', 'memberId', 'memberID']) || row.insuranceID || 'N/A';
  const policyNo = getClaimFieldValue(row, ['policyNumber', 'policyNo', 'Policy No', 'policy_no']) || row.policyNumber || 'N/A';
  const empId = getClaimFieldValue(row, ['empID', 'empIdNo', 'EMP ID No', 'EMP ID', 'empId']) || row.empID || 'N/A';

  const patientName = getClaimFieldValue(row, ['patientName', 'Patient Details', 'Patient Name', 'patientDetails', 'name']) || row.patientName || 'N/A';
  const ipId = getClaimFieldValue(row, ['ipdNo', 'IPD No', 'ipd_no', 'ipd', 'uhid', 'UHID']) || row.ipdNo || row.uhid || 'N/A';
  const billingNumber = getClaimFieldValue(row, ['billInvoiceNo', 'Bill Invoice No', 'billNo', 'invoiceNo']) || row.billInvoiceNo || 'N/A';
  const doaRaw = getClaimFieldValue(row, ['doa', 'DOA', 'doaDate', 'Date of Admission', 'Admission Date']) || row.doa;
  const dodRaw = getClaimFieldValue(row, ['dod', 'DOD', 'dodDate', 'Date of Discharge', 'Discharge Date']) || row.dod;
  const doa = formatDateForDisplay(doaRaw) || doaRaw || 'N/A';
  const dod = formatDateForDisplay(dodRaw) || dodRaw || 'N/A';

  const approvedRaw = getClaimFieldValue(row, ['approved', 'Approved', 'approvedAmount', 'approved_amount']) || row.approved || row.totalBill || row.settlementAmount || '0';
  const approvedNumeric = parseFloat(String(cleanCurrencyAmount(approvedRaw, '0')).replace(/[^0-9.-]/g, '')) || 0;

  const patientPayRaw = getClaimFieldValue(row, ['patientPay', 'Patient Pay', 'patient_pay']) || row.patientPay || '0';
  const patientPayNumeric = parseFloat(String(cleanCurrencyAmount(patientPayRaw, '0')).replace(/[^0-9.-]/g, '')) || 0;

  const discountRaw = getClaimFieldValue(row, ['discount', 'Discount', 'discountAmount']) || row.discount || '0';
  const discountNumeric = parseFloat(String(cleanCurrencyAmount(discountRaw, '0')).replace(/[^0-9.-]/g, '')) || 0;

  const totalBillFormatted = approvedNumeric.toLocaleString('en-IN');
  const discountFormatted = discountNumeric.toLocaleString('en-IN');
  const patientPayFormatted = patientPayNumeric.toLocaleString('en-IN');
  const claimedAmountFormatted = approvedNumeric.toLocaleString('en-IN');

  const amountForWords = approvedNumeric;
  const totalBillWords = amountForWords === 0 ? 'Rupees Zero Only' : `Rupees ${numToIndianWords(Math.floor(amountForWords))} Only`;

  const panCardNo = 'ABOFA7356E';
  const accountNo = getClaimFieldValue(row, ['bankAccountNo', 'Bank Account No.', 'Bank Account No', 'Bank Account Number', 'Account Number', 'bankaccountno']) || row.bankAccountNo || '3982010048291';
  const ifscCode = getClaimFieldValue(row, ['ifscCode', 'IFSC Code', 'IFSC', 'ifsc']) || row.ifscCode || 'SBIN0004829';
  const bankNameBranch = getClaimFieldValue(row, ['bankName', 'Bank Name', 'bank', 'bankAddress', 'Bank Address']) || row.bankName || row.bankAddress || 'State Bank of India, Commercial Branch, Bilaspur';

  const today = new Date();
  const headerDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

  const defaultEnclosures = [
    'ORIGINAL DISCHARGE SUMMARY',
    'FINAL BILL WITH BREAKUP / DETAILS BILL',
    'AADHAAR CARD, PAN CARD, POLICY CARD',
    'OPERATION THEATRE NOTE',
    'DEATH SUMMARY AND DEATH CERTIFICATE',
    'ALL INVESTIGATIONS REPORTS'
  ];

  const enclosuresToRender = enclosedDocs && enclosedDocs.length > 0 ? enclosedDocs : (enclosedDocs ? [] : defaultEnclosures);

  const encCount = enclosuresToRender.length;
  let encGridCols = 'repeat(2, minmax(0, 1fr))';
  let encFontSize = '10.5px';
  let encGap = '3px 12px';
  let encPadding = '5px 12px';

  if (encCount <= 6) {
    encGridCols = 'repeat(2, minmax(0, 1fr))';
    encFontSize = '10.5px';
    encGap = '3px 12px';
    encPadding = '5px 10px';
  } else if (encCount <= 9) {
    encGridCols = 'repeat(3, minmax(0, 1fr))';
    encFontSize = '9.8px';
    encGap = '2px 8px';
    encPadding = '4px 8px';
  } else if (encCount <= 12) {
    encGridCols = 'repeat(3, minmax(0, 1fr))';
    encFontSize = '9.2px';
    encGap = '2px 6px';
    encPadding = '3px 6px';
  } else {
    encGridCols = 'repeat(4, minmax(0, 1fr))';
    encFontSize = '8.6px';
    encGap = '2px 5px';
    encPadding = '3px 6px';
  }

  const enclosuresHtml = enclosuresToRender.length > 0
    ? enclosuresToRender.map(doc => `<div class="enc-item"><span class="check-mark">✓</span><span class="enc-label" title="${escapeHtml(doc)}">${escapeHtml(doc)}</span></div>`).join('')
    : `<div class="enc-item" style="color: #94a3b8; font-style: italic;"><span>No documents enclosed</span></div>`;

  return `
  <div class="letter-container">
    <div class="top-stripe"></div>

    <div class="letter-body">
      <!-- HEADER -->
      <div class="letter-header">
        <div class="header-left">
          <h1 class="hospital-name">${escapeHtml(hospitalName)}</h1>
          <p class="tagline">${escapeHtml(tagline)}</p>
          <p class="address">${escapeHtml(address)}</p>
        </div>

        <div class="header-right">
          <div class="logo-group">
            <img src="${escapeHtml(logoUrl)}" alt="Logo" class="logo-img" crossorigin="anonymous" />
            <img src="${escapeHtml(monoUrl)}" alt="Emblem" class="emblem-img" crossorigin="anonymous" />
          </div>
          <p class="meta-line">Reg: <strong>${escapeHtml(registrationNo)}</strong></p>
          <p class="meta-line">Phone: <strong>${escapeHtml(contactPhone)}</strong></p>
          <p class="meta-line">Email: <strong>${escapeHtml(contactEmail)}</strong></p>
        </div>
      </div>

      <!-- RECIPIENT & SUBJECT -->
      <div class="recipient-subject-section">
        <div class="recipient-row">
          <div class="recipient-to">
            <p class="to-label">To,</p>
            <p class="company-name">${escapeHtml(companyName)}</p>
            <p class="insurance-address">${escapeHtml(insuranceAddress)}</p>
          </div>
          <div class="submission-date-box">
            <p class="date-label">Submission Date</p>
            <p class="date-val">${escapeHtml(headerDate)}</p>
          </div>
        </div>

        <div class="subject-box">
          <strong>Subject:</strong> <span>Submission of Final Medical Claim &amp; Bills for In-Patient Reimbursement / Settlement</span>
        </div>
      </div>

      <p class="salutation">Dear Sir/Madam,</p>

      <!-- GRID BOXES -->
      <div class="grid-boxes">
        <!-- BOX 1 -->
        <div class="box-card">
          <div class="box-title-row">
            <span>1. POLICY &amp; CLAIM DETAILS</span>
          </div>
          <div class="box-content grid-2col">
            <span class="field-label">CLAIM NO:</span><span class="field-val font-mono">${escapeHtml(claimNo)}</span>
            <span class="field-label">MEMBER ID:</span><span class="field-val font-mono">${escapeHtml(memberId)}</span>
            <span class="field-label">POLICY NO:</span><span class="field-val font-mono">${escapeHtml(policyNo)}</span>
            <span class="field-label">EMP_ID:</span><span class="field-val font-mono">${escapeHtml(empId)}</span>
          </div>
        </div>

        <!-- BOX 2 -->
        <div class="box-card">
          <div class="box-title-row">
            <span>2. PATIENT DETAILS</span>
          </div>
          <div class="box-content grid-2col">
            <span class="field-label">Patient Name:</span><span class="field-val font-bold">${escapeHtml(patientName)}</span>
            <span class="field-label">IP ID:</span><span class="field-val font-mono">${escapeHtml(ipId)}</span>
            <span class="field-label">Billing Number:</span><span class="field-val font-mono">${escapeHtml(billingNumber)}</span>
            <span class="field-label">Date of Admission:</span><span class="field-val">${escapeHtml(doa)}</span>
            <span class="field-label">Date of Discharge:</span><span class="field-val">${escapeHtml(dod)}</span>
          </div>
        </div>

        <!-- BOX 3 - BILLING -->
        <div class="box-card full-width">
          <div class="box-title-row">
            <span>3. BILLING DETAILS</span>
          </div>
          <div class="billing-box-content">
            <div class="billing-amounts-row">
              <div class="amount-group">
                <p class="amount-label">Total Amount Due</p>
                <p class="amount-val">₹${escapeHtml(totalBillFormatted)}</p>
              </div>
              <div class="amount-group">
                <p class="amount-label">Discount Amount</p>
                <p class="amount-val discount-val">₹${escapeHtml(discountFormatted)}</p>
              </div>
              <div class="amount-group">
                <p class="amount-label">Amount Paid by Patient</p>
                <p class="amount-val paid-val">₹${escapeHtml(patientPayFormatted)}</p>
              </div>
              <div class="amount-group claimable-group">
                <p class="amount-label">Claimable Balance</p>
                <p class="amount-val claimable-val">₹${escapeHtml(claimedAmountFormatted)}</p>
              </div>
            </div>

            <div class="words-row">
              <span class="words-label">TOTAL AMOUNT IN WORDS:</span>
              <span class="words-val">${escapeHtml(totalBillWords)}</span>
            </div>
          </div>
        </div>

        <!-- BOX 4 - BANK DISBURSEMENT -->
        <div class="box-card full-width">
          <div class="box-title-row">
            <span>4. BANK DISBURSEMENT DETAILS (FOR NEFT)</span>
          </div>
          <div class="bank-box-content">
            <div class="bank-col">
              <p class="bank-label">PAN Card No</p>
              <p class="bank-val uppercase font-mono">${escapeHtml(panCardNo)}</p>
            </div>
            <div class="bank-col">
              <p class="bank-label">Account No</p>
              <p class="bank-val font-mono">${escapeHtml(accountNo)}</p>
            </div>
            <div class="bank-col">
              <p class="bank-label">IFSC Code</p>
              <p class="bank-val uppercase font-mono">${escapeHtml(ifscCode)}</p>
            </div>
            <div class="bank-col">
              <p class="bank-label">Bank Name/Branch</p>
              <p class="bank-val">${escapeHtml(bankNameBranch)}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ENCLOSURES -->
      <div class="enclosures-section">
        <p class="enclosures-title">ENCLOSED CLAIM DOCUMENTS:</p>
        <div class="enclosures-list" style="grid-template-columns: ${encGridCols}; gap: ${encGap}; padding: ${encPadding}; font-size: ${encFontSize};">
          ${enclosuresHtml}
        </div>
      </div>

      <!-- DECLARATION & SIGNATURE -->
      <div class="footer-sign-section">
        <div class="declaration-text">
          I hereby declare that the information provided above is true and verified against hospital records.
        </div>

        <div class="signatory-block">
          <div class="seal-box">
            <span>HOSPITAL<br>SEAL</span>
          </div>
          <div class="sign-line"></div>
          <p class="sign-name">Authorized Signatory</p>
          <p class="sign-desig">Executive TPA Desk</p>
          <p class="sign-dept">Finance Department</p>
          <p class="sign-phone">Ph: 9407949451</p>
        </div>
      </div>
    </div>
  </div>`;
}

export function buildCoverLetterDocument(rows: any[], showHeader = true, enclosedDocs?: string[], autoPrint = false): string {
  const letters = rows.map((row, index) => buildCoverLetterInstance(row, index, showHeader, enclosedDocs)).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim Cover Letter</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            color: #1e293b;
            padding: 0;
            margin: 0;
        }
        .font-mono {
            font-family: 'JetBrains Mono', monospace;
        }
        .uppercase {
            text-transform: uppercase;
        }
        .letter-container {
            background-color: #ffffff;
            color: #1e293b;
            width: 100%;
            max-width: 800px;
            font-size: 11.5px;
            line-height: 1.35;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            border: none;
            outline: none;
            box-shadow: 0 4px 20px -2px rgba(0,0,0,0.12);
            margin: 10px auto;
            overflow: hidden;
            border-radius: 2px;
            box-sizing: border-box;
        }
        .top-stripe {
            background-color: #0f172a !important;
            height: 5px;
            width: 100%;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .letter-body {
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 7px;
            box-sizing: border-box;
        }
        .letter-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 7px;
            gap: 12px;
        }
        .header-left {
            flex: 1;
        }
        .hospital-name {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.02em;
            margin: 0 0 2px 0;
        }
        .tagline {
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
            margin: 0 0 2px 0;
        }
        .address {
            font-size: 10px;
            color: #64748b;
            max-width: 440px;
            line-height: 1.3;
            margin: 0;
        }
        .header-right {
            text-align: right;
            flex-shrink: 0;
            padding-left: 12px;
            border-left: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        .logo-group {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            margin-bottom: 3px;
        }
        .logo-img {
            height: 38px;
            width: auto;
            object-fit: contain;
            max-width: 105px;
        }
        .emblem-img {
            width: 38px;
            height: 38px;
            object-fit: contain;
            border-radius: 4px;
        }
        .meta-line {
            font-size: 9.5px;
            font-family: 'JetBrains Mono', monospace;
            color: #475569;
            margin: 1px 0 0 0;
        }
        .meta-line strong {
            color: #1e293b;
            font-weight: 600;
        }
        .recipient-subject-section {
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .recipient-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: 11.5px;
        }
        .to-label {
            color: #475569;
            font-weight: 600;
            margin: 0;
        }
        .company-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 12.5px;
            margin: 1px 0 0 0;
            word-break: break-word;
        }
        .insurance-address {
            color: #475569;
            white-space: pre-line;
            max-width: 440px;
            font-size: 10.5px;
            margin: 1px 0 0 0;
            line-height: 1.3;
            word-break: break-word;
        }
        .submission-date-box {
            text-align: right;
            background-color: #f1f5f9 !important;
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .date-label {
            color: #64748b;
            font-size: 9.5px;
            text-transform: uppercase;
            font-weight: 700;
            margin: 0;
        }
        .date-val {
            font-weight: 700;
            color: #0f172a;
            font-size: 11px;
            margin: 1px 0 0 0;
        }
        .subject-box {
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
            background-color: #f1f5f9 !important;
            padding: 4px 10px;
            border-radius: 4px;
            border-left: 4px solid #0f172a !important;
            border-top: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .subject-box span {
            font-weight: 400;
            color: #1e293b;
        }
        .salutation {
            font-size: 11px;
            font-weight: 600;
            color: #334155;
            margin: 0;
        }
        .grid-boxes {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 7px;
        }
        .box-card {
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        .box-card.full-width {
            grid-column: span 2;
        }
        .box-title-row {
            font-size: 10.5px;
            font-weight: 800;
            color: #ffffff !important;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            background-color: #0f172a !important;
            padding: 4px 10px;
            border-radius: 3px 3px 0 0;
            border: 1.5px solid #0f172a !important;
            border-bottom: none !important;
            display: flex;
            justify-content: space-between;
            align-items: center;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        .box-title-row span {
            color: #ffffff !important;
            font-weight: 800;
            letter-spacing: 0.04em;
        }
        .box-content {
            background-color: #ffffff !important;
            padding: 6px 10px;
            border-radius: 0 0 3px 3px;
            border: 1.5px solid #0f172a !important;
            flex: 1;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        .grid-2col {
            display: grid;
            grid-template-columns: auto 1fr;
            row-gap: 3px;
            column-gap: 10px;
            align-items: center;
            font-size: 10.5px;
        }
        .field-label {
            color: #000000;
            font-weight: 800;
        }
        .field-val {
            color: #000000;
            font-weight: 800;
            word-break: break-word;
            overflow-wrap: break-word;
        }
        .field-val.font-mono {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 800;
            color: #000000;
        }
        .field-val.font-bold {
            font-weight: 900;
            color: #000000;
        }
        .billing-box-content {
            background-color: #ffffff !important;
            padding: 6px 12px;
            border-radius: 0 0 3px 3px;
            border: 1.5px solid #0f172a !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        .billing-amounts-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        .amount-group {
            display: flex;
            flex-direction: column;
        }
        .amount-label {
            font-size: 9px;
            color: #000000;
            text-transform: uppercase;
            font-weight: 800;
            margin-bottom: 1px;
        }
        .amount-val {
            font-size: 14.5px;
            font-weight: 800;
            color: #000000;
            font-family: 'JetBrains Mono', monospace;
        }
        .amount-val.paid-val {
            color: #047857;
            font-weight: 900;
        }
        .amount-val.discount-val {
            color: #b45309;
            font-weight: 900;
        }
        .amount-val.claimable-val {
            color: #000000;
            font-size: 16px;
            font-weight: 900;
        }
        .claimable-group {
            border-left: 1.5px solid #0f172a;
            padding-left: 14px;
            text-align: right;
        }
        .words-row {
            margin-top: 5px;
            padding-top: 5px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #000000;
            display: flex;
            gap: 6px;
            align-items: baseline;
            flex-wrap: wrap;
            word-break: break-word;
        }
        .words-label {
            font-weight: 800;
            color: #000000;
            font-size: 9.5px;
            letter-spacing: 0.04em;
        }
        .words-val {
            font-style: italic;
            font-weight: 800;
            color: #000000;
        }
        .bank-box-content {
            background-color: #ffffff !important;
            padding: 5px 10px;
            border-radius: 0 0 3px 3px;
            border: 1.5px solid #0f172a !important;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            font-size: 10.5px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        .bank-col {
            display: flex;
            flex-direction: column;
        }
        .bank-label {
            font-size: 9px;
            color: #000000;
            text-transform: uppercase;
            font-weight: 800;
            margin-bottom: 1px;
        }
        .bank-val {
            font-weight: 800;
            color: #000000;
            word-break: break-word;
            overflow-wrap: break-word;
        }
        .enclosures-section {
            padding-top: 0px;
        }
        .enclosures-title {
            font-size: 10.5px;
            font-weight: 800;
            color: #ffffff !important;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            background-color: #0f172a !important;
            padding: 4px 10px;
            border-radius: 3px 3px 0 0;
            border: 1.5px solid #0f172a !important;
            border-bottom: none !important;
            margin: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        .enclosures-list {
            display: grid;
            background-color: #ffffff !important;
            border-radius: 0 0 3px 3px;
            border: 1.5px solid #0f172a !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            max-height: 85px;
            overflow: hidden;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .enc-item {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #0f172a;
            font-weight: 700;
            line-height: 1.25;
            min-width: 0;
        }
        .enc-label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .check-mark {
            color: #047857;
            font-weight: 800;
            flex-shrink: 0;
            font-size: 11px;
        }
        .footer-sign-section {
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .declaration-text {
            font-size: 10px;
            color: #475569;
            max-width: 380px;
            font-style: italic;
            line-height: 1.35;
        }
        .signatory-block {
            text-align: center;
        }
        .seal-box {
            margin: 0 auto 3px auto;
            width: 48px;
            height: 48px;
            border: 1.5px dashed #cbd5e1;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .seal-box span {
            font-size: 8px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            line-height: 1.2;
        }
        .sign-line {
            width: 125px;
            border-bottom: 1px solid #94a3b8;
            margin: 0 auto 3px auto;
        }
        .sign-name {
            font-size: 10.5px;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
        }
        .sign-desig {
            font-size: 9.5px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            margin: 0;
        }
        .sign-dept {
            font-size: 9px;
            color: #94a3b8;
            margin: 0;
        }
        .sign-phone {
            font-size: 9px;
            color: #64748b;
            font-family: 'JetBrains Mono', monospace;
            margin: 0;
        }
        @media print {
            @page {
                size: A4 portrait;
                margin: 5mm 6mm !important;
            }
            *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            html, body {
                width: 100% !important;
                height: 100% !important;
                background-color: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .no-print {
                display: none !important;
            }
            .letter-container {
                border: none !important;
                outline: none !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: 285mm !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                page-break-after: always !important;
                page-break-inside: avoid !important;
                break-after: page !important;
                break-inside: avoid !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
                background-color: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .letter-body {
                padding: 2mm 3mm !important;
                gap: 5px !important;
                box-sizing: border-box !important;
            }
            .top-stripe {
                background-color: #0f172a !important;
                height: 4px !important;
                width: 100% !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .box-title-row,
            .enclosures-title {
                background-color: #0f172a !important;
                color: #ffffff !important;
                border: 1.5px solid #0f172a !important;
                border-bottom: none !important;
                padding: 3.5px 8px !important;
                font-size: 10px !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .box-title-row span,
            .enclosures-title span {
                color: #ffffff !important;
                font-weight: 800 !important;
            }
            .subject-box,
            .submission-date-box {
                background-color: #f1f5f9 !important;
                border-left: 3px solid #0f172a !important;
                border-top: 1px solid #cbd5e1 !important;
                border-right: 1px solid #cbd5e1 !important;
                border-bottom: 1px solid #cbd5e1 !important;
                padding: 3px 8px !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .box-content,
            .billing-box-content,
            .bank-box-content,
            .enclosures-list {
                background-color: #ffffff !important;
                border: 1.5px solid #0f172a !important;
                box-shadow: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .box-content {
                padding: 4px 8px !important;
                font-size: 10px !important;
            }
            .billing-box-content {
                padding: 4px 10px !important;
            }
            .bank-box-content {
                padding: 4px 8px !important;
                font-size: 10px !important;
            }
            .enclosures-list {
                max-height: 80px !important;
                overflow: hidden !important;
            }
            .seal-box {
                background-color: #f8fafc !important;
                border: 1.5px dashed #94a3b8 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .claimable-group {
                border-left: 1.5px solid #0f172a !important;
            }
            .words-row {
                border-top: 1px solid #cbd5e1 !important;
                margin-top: 3px !important;
                padding-top: 3px !important;
            }
            .footer-sign-section {
                margin-top: 4px !important;
                padding-top: 4px !important;
            }
        }
    </style>
</head>
<body>
    ${letters}
    ${autoPrint ? `<script>
        window.addEventListener('load', function() {
            setTimeout(function() {
                window.print();
            }, 300);
        });
    </script>` : ''}
</body>
</html>`;
}
