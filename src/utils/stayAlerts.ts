import { Claim } from '../types';
import { normalizeDateForStorage, formatDateForDisplay } from './formatters';

export const STAY_ALERTS_STORAGE_KEY = 'initial_approval_stay_notifications_v1';
export const REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours interval (reminder after 3 hours)

export interface StayAlertRecord {
  patientKey: string;
  patientName: string;
  uhid: string;
  claimNo?: string;
  doa?: string;
  status: 'pending' | 'ignored' | 'sent';
  lastIgnoredAt?: number;
  nextReminderAt?: number;
  sentAt?: number;
  ignoreCountToday?: number;
  lastIgnoreDate?: string;
}

/**
 * Generate unique stable key for a patient claim
 */
export function getPatientStayKey(claim: Claim): string {
  const uhid = String(claim.uhid || '').trim();
  const claimNo = String(claim.claimNo || '').trim();
  const ipdNo = String(claim.ipdNo || '').trim();
  const patientName = String(claim.patientName || '').trim();
  const doa = normalizeDateForStorage(claim.doa);

  if (uhid) return `uhid_${uhid}_${doa}`;
  if (claimNo) return `claim_${claimNo}_${doa}`;
  if (ipdNo) return `ipd_${ipdNo}_${doa}`;
  return `pat_${patientName}_${doa}`.replace(/\s+/g, '_');
}

/**
 * Calculates length of stay in calendar days based on DOA to Today
 */
export function calculateLengthOfStay(doaStr?: string): number {
  if (!doaStr) return 0;
  const normalized = normalizeDateForStorage(doaStr);
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return 0;

  const [y, m, d] = normalized.split('-').map(Number);
  const admissionDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  admissionDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - admissionDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

/**
 * Checks if claim belongs to the Initial Approval batch
 */
export function isInitialApprovalBatch(claim: Claim): boolean {
  const statusStr = String(claim.status || '').trim().toLowerCase();
  
  // Exclude discharged, settled, or denial
  if (statusStr.includes('discharge') || statusStr.includes('settled') || statusStr.includes('denial') || statusStr.includes('reject')) {
    return false;
  }
  
  // Match initial approved / initial approval / admitted with initial approval
  if (statusStr === 'initial approved' || statusStr === 'initial approval' || statusStr.includes('initial')) {
    return true;
  }

  // Also include active admissions if not discharged
  if (statusStr === 'admitted' && !claim.dod) {
    return true;
  }

  return false;
}

/**
 * Retrieve all alert records from localStorage
 */
export function getStoredStayAlerts(): Record<string, StayAlertRecord> {
  try {
    const raw = localStorage.getItem(STAY_ALERTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save alert records to localStorage
 */
export function saveStoredStayAlerts(records: Record<string, StayAlertRecord>): void {
  try {
    localStorage.setItem(STAY_ALERTS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save stay alert records:', e);
  }
}

/**
 * Mark patient as Sent - stops all further notifications
 */
export function markPatientStaySent(claim: Claim): void {
  const key = getPatientStayKey(claim);
  const stored = getStoredStayAlerts();
  stored[key] = {
    patientKey: key,
    patientName: claim.patientName || '',
    uhid: claim.uhid || '',
    claimNo: claim.claimNo || '',
    doa: claim.doa || '',
    status: 'sent',
    sentAt: Date.now()
  };
  saveStoredStayAlerts(stored);
}

/**
 * Mark patient as Ignored - schedules reminders after 3 hours
 */
export function markPatientStayIgnored(claim: Claim): void {
  const key = getPatientStayKey(claim);
  const stored = getStoredStayAlerts();
  const existing = stored[key];
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);

  const prevCount = existing?.lastIgnoreDate === todayStr ? (existing.ignoreCountToday || 0) : 0;

  stored[key] = {
    patientKey: key,
    patientName: claim.patientName || '',
    uhid: claim.uhid || '',
    claimNo: claim.claimNo || '',
    doa: claim.doa || '',
    status: 'ignored',
    lastIgnoredAt: now,
    nextReminderAt: now + REMINDER_INTERVAL_MS,
    ignoreCountToday: prevCount + 1,
    lastIgnoreDate: todayStr
  };
  saveStoredStayAlerts(stored);
}

/**
 * Mark ALL patients as Ignored - snoozes all active stay alerts for 3 hours
 */
export function markAllPatientsStayIgnored(claims: Claim[]): void {
  const stored = getStoredStayAlerts();
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextReminder = now + REMINDER_INTERVAL_MS;

  claims.forEach(claim => {
    const key = getPatientStayKey(claim);
    const existing = stored[key];
    const prevCount = existing?.lastIgnoreDate === todayStr ? (existing.ignoreCountToday || 0) : 0;

    stored[key] = {
      patientKey: key,
      patientName: claim.patientName || '',
      uhid: claim.uhid || '',
      claimNo: claim.claimNo || '',
      doa: claim.doa || '',
      status: 'ignored',
      lastIgnoredAt: now,
      nextReminderAt: nextReminder,
      ignoreCountToday: prevCount + 1,
      lastIgnoreDate: todayStr
    };
  });

  saveStoredStayAlerts(stored);
}

/**
 * Reset patient stay alert (e.g., if user wants to re-enable alerts)
 */
export function resetPatientStayAlert(claim: Claim): void {
  const key = getPatientStayKey(claim);
  const stored = getStoredStayAlerts();
  delete stored[key];
  saveStoredStayAlerts(stored);
}

export interface StayAlertItem {
  claim: Claim;
  claimIndex: number;
  patientKey: string;
  daysStay: number;
  record?: StayAlertRecord;
  isDueForReminder: boolean;
}

/**
 * Compute all patients exceeding 5 days in the Initial Approval batch
 */
export function getOverdueInitialApprovalClaims(claims: Claim[]): StayAlertItem[] {
  const stored = getStoredStayAlerts();
  const now = Date.now();

  const overdueList: StayAlertItem[] = [];

  claims.forEach((claim, index) => {
    // 1. Must be in initial approval batch and not discharged
    if (!isInitialApprovalBatch(claim)) return;

    // 2. Length of stay must exceed 5 days (> 5 days)
    const daysStay = calculateLengthOfStay(claim.doa);
    if (daysStay <= 5) return;

    const key = getPatientStayKey(claim);
    const rec = stored[key];

    // If already sent, do not alert
    if (rec && rec.status === 'sent') {
      return;
    }

    // Check if due for reminder
    let isDue = false;
    if (!rec) {
      // First time alert
      isDue = true;
    } else if (rec.status === 'ignored') {
      // Ignored: check if 2-3 hours (2.5h) interval has elapsed
      if (!rec.nextReminderAt || now >= rec.nextReminderAt) {
        isDue = true;
      }
    }

    overdueList.push({
      claim,
      claimIndex: index,
      patientKey: key,
      daysStay,
      record: rec,
      isDueForReminder: isDue
    });
  });

  // Sort descending by days of stay (highest stay length first)
  return overdueList.sort((a, b) => b.daysStay - a.daysStay);
}

/**
 * Build WhatsApp message for Clinical Summary & Running Bill request
 */
export function buildClinicalSummaryWhatsAppText(claim: Claim, daysStay: number): string {
  const patientName = claim.patientName || '-';
  const uhid = claim.uhid || '-';
  const claimNo = claim.claimNo || '-';
  const ipdNo = claim.ipdNo || '-';
  const tpa = claim.tpaName || claim.insuranceCompany || '-';
  const doa = formatDateForDisplay(claim.doa);
  const mobile = claim.mobileNumber || claim.mobile || '-';

  return `🏥 *HOSPITAL TPA & BILLING DESK NOTICE*
*INTERIM CLINICAL SUMMARY & RUNNING BILL REQUIRED*

📋 *Patient Information:*
• *Patient Name:* ${patientName}
• *UHID:* ${uhid}
• *IPD No:* ${ipdNo}
• *Claim Number:* ${claimNo}
• *TPA / Insurance:* ${tpa}
• *Admission Date (DOA):* ${doa}
• *Current Length of Stay:* *${daysStay} Days*

⚠️ *Mandatory Requirement:*
Patient has been admitted for *${daysStay} days*. As per TPA/Insurance protocol for extended hospital stay exceeding 5 days, the *Interim Clinical Summary* and *Updated Running Bill* are required immediately for authorization enhancement.

Kindly prepare and submit the necessary documents.

Best regards,
*Hospital Administration - TPA & Claims Department*
📞 Contact: 9009446861`.trim();
}
