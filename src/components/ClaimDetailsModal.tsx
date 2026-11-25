import React, { useState } from 'react';
import { Claim } from '../types';
import { formatDateForDisplay, getStatusColor, buildWhatsAppMessage, openWhatsAppChat, normalizeMobileNumber, sendWhatsAppMessage } from '../utils/formatters';
import { WhatsAppIcon } from './WhatsAppIcon';

interface ClaimDetailsModalProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onCoverLetter?: () => void;
  indexNo?: number | string;
  themeMode?: 'dark' | 'light';
}

const fmtCurrency = (val: any): string => {
  if (val === undefined || val === null || val === '' || val === '-') return '₹0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const ClaimDetailsModal: React.FC<ClaimDetailsModalProps> = ({
  claim,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onCoverLetter,
  indexNo,
  themeMode = 'dark'
}) => {
  const [copyNotice, setCopyNotice] = useState(false);

  if (!isOpen || !claim) return null;

  const sno = indexNo || claim.sNo || claim.id || 83;
  const statusColor = getStatusColor(claim.status);

  const handlePrintDossier = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Claim Dossier - ${claim.patientName || 'Patient'}</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          *, *::before, *::after { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 12px; color: #0f172a; line-height: 1.4; background: #fff; margin: 0; }
          .page-frame { border: 3.5px solid #000000; padding: 16px; border-radius: 4px; }
          .header { border-bottom: 2px solid ${statusColor}; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
          .subtitle { font-size: 12px; color: #475569; font-weight: 700; margin-top: 3px; }
          .badge { background: ${statusColor}; color: #ffffff; border: 1.5px solid ${statusColor}; padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 11px; text-transform: uppercase; }
          .section-box { border: 2px solid #334155; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; background: #ffffff; }
          .section-title { font-weight: 900; font-size: 11px; color: #0f172a; margin-bottom: 8px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .field { background: #f8fafc; border: 1.5px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; }
          .label { font-size: 9.5px; color: #475569; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 2px; }
          .value { font-size: 12.5px; color: #0f172a; font-weight: 700; word-break: break-word; }
          .footer { margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; color: #64748b; text-align: center; font-weight: 600; }
          @media print { body { padding: 0; } .page-frame { border: 3.5px solid #000000 !important; } }
        </style>
      </head>
      <body>
        <div class="page-frame">
          <div class="header">
            <div>
              <div class="title">CLAIM DOSSIER DETAILS — ${claim.patientName || 'PATIENT'}</div>
              <div class="subtitle">S.NO: ${sno} | UHID: ${claim.uhid || '-'} | IPID: ${claim.ipdNo || '-'}</div>
            </div>
            <div class="badge">• ${claim.status || 'Pending'}</div>
          </div>

          <!-- 1. PATIENT DEMOGRAPHICS -->
          <div class="section-box">
            <div class="section-title">1. PATIENT DEMOGRAPHICS</div>
            <div class="grid">
              <div class="field"><span class="label">Patient Name</span><span class="value" style="font-size: 14px; font-weight: 900; color: #000;">${claim.patientName || '-'}</span></div>
              <div class="field"><span class="label">UHID</span><span class="value" style="font-size: 13px; font-weight: 900; color: #000;">${claim.uhid || '-'}</span></div>
              <div class="field"><span class="label">IPD NO</span><span class="value" style="font-size: 13px; font-weight: 900; color: #000;">${claim.ipdNo || '-'}</span></div>
              <div class="field"><span class="label">Mobile Number</span><span class="value" style="font-size: 13px; font-weight: 900; color: #000;">${claim.mobileNumber || claim.mobile || '-'}</span></div>
              <div class="field"><span class="label">Attender Name</span><span class="value" style="font-weight: 800;">${claim.attenderName || '-'}</span></div>
              <div class="field"><span class="label">Relation</span><span class="value" style="font-weight: 800;">${claim.relation || '-'}</span></div>
            </div>
          </div>

          <!-- 2. CLINICAL & ADMISSION DETAILS -->
          <div class="section-box">
            <div class="section-title" style="color: ${statusColor};">2. CLINICAL & ADMISSION DETAILS</div>
            <div class="grid">
              <div class="field"><span class="label">Diagnosis</span><span class="value">${claim.diagnosis || '-'}</span></div>
              <div class="field"><span class="label">Surgery Name</span><span class="value">${claim.surgeryName || '-'}</span></div>
              <div class="field"><span class="label">IP Billing Number</span><span class="value">${claim.billInvoiceNo || claim.ipBillingNo || '-'}</span></div>
              <div class="field"><span class="label">Admission Status</span><span class="value" style="color: ${statusColor}; font-weight: 800;">• ${claim.status || '-'}</span></div>
              <div class="field"><span class="label">Admission Date</span><span class="value">${formatDateForDisplay(claim.doa)}</span></div>
              <div class="field"><span class="label">Discharge Date</span><span class="value">${formatDateForDisplay(claim.dod)}</span></div>
            </div>
          </div>

          <!-- 3. HOSPITAL BANK DETAILS -->
          <div class="section-box">
            <div class="section-title">3. HOSPITAL BANK DETAILS</div>
            <div class="grid">
              <div class="field"><span class="label">Bank Name</span><span class="value">${claim.bankName || '-'}</span></div>
              <div class="field"><span class="label">Account Number</span><span class="value">${claim.bankAccountNo || '-'}</span></div>
              <div class="field"><span class="label">IFSC Code</span><span class="value">${claim.ifscCode || '-'}</span></div>
              <div class="field"><span class="label">PAN Card</span><span class="value">${claim.panCard || 'N/A'}</span></div>
              <div class="field" style="grid-column: span 2;"><span class="label">Bank Address</span><span class="value">${claim.bankAddress || '-'}</span></div>
            </div>
          </div>

          <!-- 4. POLICY, INSURANCE & TPA METADATA -->
          <div class="section-box">
            <div class="section-title">4. POLICY, INSURANCE & TPA METADATA</div>
            <div class="grid">
              <div class="field"><span class="label">TPA / Ins. Name</span><span class="value" style="font-weight: 900; color: #000;">${claim.tpaName || '-'}</span></div>
              <div class="field"><span class="label">Insurance Company</span><span class="value">${claim.insuranceCompany || '-'}</span></div>
              <div class="field"><span class="label">Policy Number</span><span class="value" style="font-weight: 900; color: #000;">${claim.policyNumber || '-'}</span></div>
              <div class="field"><span class="label">Insurance ID / Member ID</span><span class="value" style="font-weight: 900; color: #000;">${claim.insuranceID || '-'}</span></div>
              <div class="field"><span class="label">Employee ID</span><span class="value" style="font-weight: 900; color: #000;">${claim.empID || '-'}</span></div>
              <div class="field"><span class="label">Claim Number</span><span class="value" style="font-weight: 900; color: #000;">${claim.claimNo || '-'}</span></div>
              <div class="field"><span class="label">Insurance Limit</span><span class="value">${claim.insuranceLimit || '-'}</span></div>
              <div class="field" style="grid-column: span 2;"><span class="label">Insurance Address</span><span class="value">${claim.insuranceAddress || '-'}</span></div>
            </div>
          </div>

          <!-- 5. FINANCIAL AUDIT & CALCULATIONS -->
          <div class="section-box">
            <div class="section-title">5. FINANCIAL AUDIT & CALCULATIONS</div>
            <div class="grid">
              <div class="field"><span class="label">Total Bill Amount</span><span class="value">${fmtCurrency(claim.totalBill)}</span></div>
              <div class="field"><span class="label">Approved Amount</span><span class="value">${fmtCurrency(claim.approved)}</span></div>
              <div class="field"><span class="label">Discount</span><span class="value">${fmtCurrency(claim.discount)}</span></div>
              <div class="field"><span class="label">Patient Pay</span><span class="value">${fmtCurrency(claim.patientPay)}</span></div>
              <div class="field"><span class="label">TDS Amount</span><span class="value">${fmtCurrency(claim.tds)}</span></div>
              <div class="field"><span class="label">Net Payable Amount</span><span class="value">${fmtCurrency(Number(claim.approved || 0) > 0 ? (Number(claim.approved || 0) - Number(claim.tds || 0)) : 0)}</span></div>
              <div class="field"><span class="label">Courier Details (POD No)</span><span class="value">${claim.courierDetails || '-'}</span></div>
              <div class="field"><span class="label">Courier Date</span><span class="value">${formatDateForDisplay(claim.courierDate)}</span></div>
            </div>

            <div style="margin-top: 10px; padding-top: 8px; border-top: 1.5px dashed #94a3b8;">
              <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e293b; margin-bottom: 6px; letter-spacing: 0.5px;">
                Settlement & Payout Summary • Formula: Approved - Settlement = Total Deducted
              </div>
              <div class="grid" style="grid-template-columns: repeat(3, 1fr); gap: 6px;">
                <div class="field" style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1.5px solid #cbd5e1;">
                  <span class="label" style="color: #475569; font-size: 9.5px; font-weight: 800;">SETTLEMENT</span>
                  <span class="value" style="color: #047857; font-weight: 900; font-size: 13px;">${fmtCurrency(claim.settlementAmount)}</span>
                </div>
                <div class="field" style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1.5px solid #cbd5e1;">
                  <span class="label" style="color: #475569; font-size: 9.5px; font-weight: 800;">PAYMENT RECEIVED</span>
                  <span class="value" style="color: #0f766e; font-weight: 900; font-size: 13px;">${fmtCurrency(claim.paymentReceived || claim.deduction || 0)}</span>
                </div>
                <div class="field" style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1.5px solid #cbd5e1;">
                  <span class="label" style="color: #475569; font-size: 9.5px; font-weight: 800;">TOTAL DEDUCTED AMOUNT</span>
                  <span class="value" style="color: #dc2626; font-weight: 900; font-size: 13px;">${fmtCurrency((Number(claim.approved || 0) > 0 || Number(claim.settlementAmount || 0) > 0) ? (Number(claim.approved || 0) - Number(claim.settlementAmount || 0)) : 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 6. ADMINISTRATIVE REMARKS -->
          <div class="section-box">
            <div class="section-title">6. ADMINISTRATIVE REMARKS</div>
            <div class="field" style="min-height: 40px;">
              <span class="value" style="white-space: pre-wrap;">${claim.remark || claim.administrativeRemarks || claim.remarks || '-'}</span>
            </div>
          </div>

          <div class="footer">
            Hospital Insurance Claims Management System • Claim Dossier Document
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleCopyDossierText = () => {
    const text = `
CLAIM DOSSIER DETAILS — ${claim.patientName || '-'}
==========================================
S.NO: ${sno} | Status: ${claim.status || '-'}
UHID: ${claim.uhid || '-'} | IPID: ${claim.ipdNo || '-'}
Contact: ${claim.mobileNumber || claim.mobile || '-'}
Attender: ${claim.attenderName ? `${claim.attenderName} (${claim.relation || '-'})` : '-'}

CLINICAL & ADMISSION
------------------------------------------
Diagnosis: ${claim.diagnosis || '-'}
Surgery Name: ${claim.surgeryName || '-'}
IP Billing No: ${claim.billInvoiceNo || '-'}
DOA: ${formatDateForDisplay(claim.doa)} | DOD: ${formatDateForDisplay(claim.dod)}

POLICY & INSURANCE
------------------------------------------
TPA/Insurer: ${claim.tpaName || '-'}
Insurance Co: ${claim.insuranceCompany || '-'}
Policy No: ${claim.policyNumber || '-'} | Claim No: ${claim.claimNo || '-'}
Insurance ID: ${claim.insuranceID || '-'} | Emp ID: ${claim.empID || '-'}
Insurance Limit: ${claim.insuranceLimit || '-'}
Address: ${claim.insuranceAddress || '-'}

FINANCIAL AUDIT & CALCULATIONS
------------------------------------------
Total Bill Amount: ${fmtCurrency(claim.totalBill)}
Approved Amount: ${fmtCurrency(claim.approved)}
Discount: ${fmtCurrency(claim.discount)}
Patient Pay: ${fmtCurrency(claim.patientPay)}
TDS Amount: ${fmtCurrency(claim.tds)}
Net Payable Amount: ${fmtCurrency(netPayableVal)}

SETTLEMENT & PAYOUT SUMMARY
------------------------------------------
Settlement: ${fmtCurrency(settlementVal)}
Payment Received: ${fmtCurrency(paymentReceivedVal)}
Total Deducted Amount: ${fmtCurrency(deductedVal)} (Approved - Settlement)

BANK & COURIER
------------------------------------------
Bank Name: ${claim.bankName || '-'} | Account: ${claim.bankAccountNo || '-'}
IFSC: ${claim.ifscCode || '-'} | PAN: ${claim.panCard || 'N/A'}
Courier POD: ${claim.courierDetails || '-'} | Courier Date: ${formatDateForDisplay(claim.courierDate)}

ADMINISTRATIVE REMARKS
------------------------------------------
Remarks: ${claim.remark || claim.administrativeRemarks || claim.remarks || '-'}
==========================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 2500);
  };

  const handleWhatsApp = () => {
    sendWhatsAppMessage(claim);
  };

  // Calculations for financial ledger display
  const totalBillVal = claim.totalBill;
  const approvedVal = claim.approved;
  const discountVal = claim.discount;
  const patientPayVal = claim.patientPay;
  const tdsVal = claim.tds;
  const settlementVal = claim.settlementAmount;

  const approvedNum = parseFloat(String(claim.approved || '0').replace(/[^0-9.-]/g, '')) || 0;
  const settlementNum = parseFloat(String(claim.settlementAmount || '0').replace(/[^0-9.-]/g, '')) || 0;
  const tdsNum = parseFloat(String(claim.tds || '0').replace(/[^0-9.-]/g, '')) || 0;

  // NET PAYABLE AMOUNT = Approved - TDS
  const netPayableVal = approvedNum > 0 ? (approvedNum - tdsNum) : 0;

  // PAYMENT RECEIVED = paymentReceived field or deduction field
  const paymentReceivedVal = claim.paymentReceived || claim.deduction || 0;

  // TOTAL DEDUCTED AMOUNT = APPROVED AMOUNT - SETTLEMENT
  const deductedVal = (approvedNum > 0 || settlementNum > 0) ? (approvedNum - settlementNum) : 0;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#0B101D] border-2 border-slate-300 dark:border-slate-700/60 rounded-2xl shadow-2xl max-w-[1000px] w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-200 transition-colors">
        
        {/* Top Header Bar */}
        <div className="bg-slate-50 dark:bg-[#0B101D] text-slate-900 dark:text-white px-5 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#1E293B] border border-blue-200 dark:border-slate-700/80 flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg shadow-inner">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-blue-100 dark:bg-[#1E293B] text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wider">
                  S.NO: {sno}
                </span>
                <span
                  className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-wide uppercase text-white shadow-xs"
                  style={{ backgroundColor: statusColor }}
                >
                  • {claim.status || 'PENDING'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-wide uppercase mt-1 select-text cursor-text">
                CLAIM DOSSIER DETAILS — <span className="text-indigo-600 dark:text-indigo-300">{claim.patientName || 'Unnamed Patient'}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDossier}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1 border border-slate-700"
              title="Print Official Dossier"
            >
              <span>🖨️</span>
            </button>

            <button
              type="button"
              onClick={handleCopyDossierText}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1 border border-slate-700"
              title="Copy Summary Text"
            >
              <span>{copyNotice ? '✓' : '📋'}</span>
            </button>

            {(claim.mobileNumber || claim.mobile) && (
              <button
                type="button"
                onClick={handleWhatsApp}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)] border border-emerald-400/40"
                title="Send WhatsApp Message"
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-bold flex items-center justify-center text-base transition-all ml-1 border border-slate-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Main Canvas - Clean Light/Dark Card Style */}
        <div
          className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100 dark:bg-[#08080C] space-y-4 select-text"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              
              {/* CARD 1: PATIENT DEMOGRAPHICS */}
              <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-800">
                <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                    👤
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    PATIENT DEMOGRAPHICS
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DossierField
                    label="PATIENT NAME"
                    value={claim.patientName}
                    valueColor="text-[14px] sm:text-[15px] font-black text-slate-950 dark:text-white leading-snug"
                  />
                  <DossierField
                    label="UHID (UID)"
                    value={claim.uhid}
                    isMono
                    valueColor="text-[13px] sm:text-[13.5px] font-black text-indigo-700 dark:text-indigo-400"
                  />
                  <DossierField
                    label="IPD NO"
                    value={claim.ipdNo}
                    isMono
                    valueColor="text-[13px] sm:text-[13.5px] font-black text-purple-700 dark:text-purple-400"
                  />
                  <DossierField
                    label="MOBILE NUMBER"
                    value={claim.mobileNumber || claim.mobile}
                    isMono
                    valueColor="text-[13px] sm:text-[13.5px] font-black text-emerald-700 dark:text-emerald-400"
                  />
                  <DossierField
                    label="ATTENDER NAME"
                    value={claim.attenderName}
                    valueColor="text-[13px] sm:text-[13.5px] font-bold text-slate-900 dark:text-slate-100 leading-snug"
                  />
                  <DossierField
                    label="RELATION"
                    value={claim.relation}
                    valueColor="text-[13px] sm:text-[13.5px] font-bold text-slate-900 dark:text-slate-100 leading-snug"
                  />
                </div>
              </div>

              {/* CARD 2: CLINICAL & ADMISSION DETAILS */}
              <div
                className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-800"
                style={{ borderLeft: `6px solid ${statusColor}` }}
              >
                <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: statusColor }}
                  >
                    ⚡
                  </span>
                  <h3
                    className="text-xs font-black uppercase tracking-wider"
                    style={{ color: statusColor }}
                  >
                    CLINICAL & ADMISSION DETAILS
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <DossierField
                      label="DIAGNOSIS"
                      value={claim.diagnosis}
                      valueColor="text-[13px] sm:text-[13.5px] font-black text-slate-900 dark:text-white leading-snug break-words"
                    />
                  </div>

                  <div>
                    <DossierField
                      label="SURGERY NAME"
                      value={claim.surgeryName}
                      valueColor="text-[13px] sm:text-[13.5px] font-black text-slate-900 dark:text-white leading-snug break-words"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <DossierField
                      label="IP BILLING NUMBER"
                      value={claim.billInvoiceNo || claim.ipBillingNo || `IP${claim.ipdNo || ''}`}
                      isMono
                      valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100"
                    />
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#161622] border border-slate-200 dark:border-slate-800 flex flex-col justify-center min-h-[52px] shadow-2xs">
                      <span className="text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 truncate select-text cursor-text">
                        ADMISSION STATUS
                      </span>
                      <div>
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase text-white shadow-xs tracking-wide select-text cursor-text"
                          style={{ backgroundColor: statusColor }}
                        >
                          • {claim.status || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    <DossierField
                      label="ADMISSION DATE"
                      value={formatDateForDisplay(claim.doa)}
                      isMono
                      valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100"
                    />
                    <DossierField
                      label="DISCHARGE DATE"
                      value={formatDateForDisplay(claim.dod)}
                      isMono
                      valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 3: HOSPITAL BANK DETAILS */}
              <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-800">
                <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    🏥
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    HOSPITAL BANK DETAILS
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DossierField
                    label="BANK NAME"
                    value={claim.bankName}
                    valueColor="text-[13px] sm:text-[13.5px] font-black text-slate-900 dark:text-white"
                  />
                  <DossierField
                    label="ACCOUNT NUMBER"
                    value={claim.bankAccountNo}
                    isMono
                    valueColor="text-[13.5px] font-black tracking-wider text-slate-950 dark:text-white"
                  />
                  <DossierField
                    label="IFSC CODE"
                    value={claim.ifscCode}
                    isMono
                    valueColor="text-[13.5px] font-black tracking-wider text-indigo-700 dark:text-indigo-400"
                  />
                  <DossierField
                    label="PAN CARD"
                    value={claim.panCard || 'N/A'}
                    isMono
                    valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100"
                  />
                  <div className="col-span-2">
                    <DossierField
                      label="BANK ADDRESS"
                      value={claim.bankAddress}
                      valueColor="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200 leading-relaxed break-words"
                    />
                  </div>
                  <DossierField
                    label="UTR NUMBER"
                    value={claim.utr || 'N/A'}
                    isMono
                    valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100"
                  />
                  <DossierField
                    label="UTR DATE"
                    value={formatDateForDisplay(claim.paymentDate)}
                    isMono
                    valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">

              {/* CARD 4: POLICY, INSURANCE & TPA METADATA */}
              <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-800">
                <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
                    💳
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    POLICY, INSURANCE & TPA METADATA
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DossierField
                    label="TPA / INS. NAME"
                    value={claim.tpaName}
                    valueColor="text-[13.5px] sm:text-[14px] font-black text-purple-700 dark:text-purple-300 leading-snug break-words"
                  />
                  <DossierField
                    label="INSURANCE COMPANY"
                    value={claim.insuranceCompany}
                    valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100 break-words"
                  />
                  <DossierField
                    label="POLICY NUMBER"
                    value={claim.policyNumber}
                    isMono
                    valueColor="text-[13px] font-black text-slate-950 dark:text-white"
                  />
                  <DossierField
                    label="INSURANCE ID / MEMBER ID"
                    value={claim.insuranceID}
                    isMono
                    valueColor="text-[13px] font-black text-slate-950 dark:text-white"
                  />
                  <DossierField
                    label="EMPLOYEE ID"
                    value={claim.empID}
                    isMono
                    valueColor="text-[13px] font-black text-slate-900 dark:text-slate-100"
                  />
                  <DossierField
                    label="CLAIM NUMBER"
                    value={claim.claimNo}
                    isMono
                    valueColor="text-[13.5px] font-black text-indigo-600 dark:text-indigo-400"
                  />
                  <div className="col-span-2">
                    <DossierField
                      label="INSURANCE LIMIT"
                      value={claim.insuranceLimit}
                      isMono
                      valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="col-span-2">
                    <DossierField
                      label="INSURANCE ADDRESS"
                      value={claim.insuranceAddress}
                      valueColor="text-[12px] font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed break-words"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 5: FINANCIAL AUDIT & CALCULATIONS */}
              <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-800">
                <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    💰
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    FINANCIAL AUDIT & CALCULATIONS
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DossierField
                    label="TOTAL BILL AMOUNT"
                    value={fmtCurrency(totalBillVal)}
                    isMono
                    valueColor="text-slate-950 dark:text-white font-black text-[13.5px] sm:text-sm"
                  />
                  <DossierField
                    label="APPROVED AMOUNT"
                    value={fmtCurrency(approvedVal)}
                    isMono
                    valueColor="text-[#2563EB] dark:text-blue-400 font-black text-[13.5px] sm:text-sm"
                  />
                  <DossierField
                    label="DISCOUNT"
                    value={fmtCurrency(discountVal)}
                    isMono
                    valueColor="text-[#4F46E5] dark:text-indigo-400 font-black text-[13.5px] sm:text-sm"
                  />
                  <DossierField
                    label="PATIENT PAY"
                    value={fmtCurrency(patientPayVal)}
                    isMono
                    valueColor="text-[#DC2626] dark:text-rose-400 font-black text-[13.5px] sm:text-sm"
                  />
                  <DossierField
                    label="TDS AMOUNT (10%)"
                    value={fmtCurrency(tdsVal)}
                    isMono
                    valueColor="text-amber-700 dark:text-amber-400 font-black text-[13.5px] sm:text-sm"
                  />
                  <DossierField
                    label="NET PAYABLE AMOUNT"
                    value={fmtCurrency(netPayableVal)}
                    isMono
                    valueColor="text-[#2563EB] dark:text-blue-400 font-black text-[13.5px] sm:text-sm"
                  />
                </div>

                {/* Inset Box: Courier Details */}
                <div className="bg-slate-50 dark:bg-[#161622] border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3 my-3 grid grid-cols-2 gap-3 shadow-2xs">
                  <DossierField
                    label="COURIER DETAILS (POD NO)"
                    value={claim.courierDetails}
                    isMono
                    valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100"
                  />
                  <DossierField
                    label="COURIER DATE"
                    value={formatDateForDisplay(claim.courierDate)}
                    isMono
                    valueColor="text-[13px] font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Settlement & Payout Summary (Only Settlement, Payment Received, Total Deducted Amount) */}
                <div className="mt-3.5 pt-3 border-t-2 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2.5 px-0.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Settlement & Payout Summary
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      Approved − Settlement = Total Deducted
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <DossierField
                      label="SETTLEMENT"
                      value={fmtCurrency(settlementVal)}
                      isMono
                      valueColor="text-[#10B981] dark:text-emerald-400 font-black text-[13.5px] sm:text-sm"
                    />
                    <DossierField
                      label="PAYMENT RECEIVED"
                      value={fmtCurrency(paymentReceivedVal)}
                      isMono
                      valueColor="text-[#0D9488] dark:text-teal-400 font-black text-[13.5px] sm:text-sm"
                    />
                    <DossierField
                      label="TOTAL DEDUCTED AMOUNT"
                      value={fmtCurrency(deductedVal)}
                      isMono
                      valueColor="text-[#DC2626] dark:text-rose-400 font-black text-[13.5px] sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 6: ADMINISTRATIVE REMARKS */}
              <div className="bg-white dark:bg-[#121218] border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-800">
                <div className="flex items-center gap-2.5 border-b-2 border-slate-200 dark:border-slate-700 pb-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                    💬
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    ADMINISTRATIVE REMARKS
                  </h3>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-[#161622] border-2 border-slate-200 dark:border-slate-800 rounded-xl min-h-[64px] flex items-center">
                  <p className="text-[13px] text-slate-900 dark:text-slate-100 font-bold whitespace-pre-wrap leading-relaxed select-text cursor-text">
                    {claim.remark || claim.administrativeRemarks || claim.remarks || (
                      <span className="text-slate-400 dark:text-slate-500 font-normal italic select-text">No administrative remarks recorded for this claim.</span>
                    )}
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#0B101D] border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all flex items-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              <span>✏️</span> EDIT RECORD
            </button>

            {onCoverLetter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCoverLetter();
                }}
                className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2 uppercase tracking-wide cursor-pointer"
              >
                <span>📄</span> COVER LETTER
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all flex items-center gap-2 uppercase tracking-wide cursor-pointer"
              >
                <span>🗑️</span> DELETE RECORD
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-extrabold text-xs bg-slate-200 dark:bg-[#1E293B] hover:bg-slate-300 dark:hover:bg-[#0F172A] text-slate-800 dark:text-white transition-all uppercase tracking-wide border border-slate-300 dark:border-slate-700 cursor-pointer"
          >
            CLOSE DOSSIER
          </button>
        </div>

      </div>
    </div>
  );
};

// Helper Field Component for Exact Replica Alignment & Optimal Box Fit
const DossierField: React.FC<{
  label: string;
  value?: string | number;
  valueColor?: string;
  isBoldText?: boolean;
  isMono?: boolean;
  className?: string;
}> = ({ label, value, valueColor, isBoldText, isMono, className = '' }) => {
  const [copied, setCopied] = useState(false);
  const displayVal = value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : '-';

  const handleCopySingle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayVal !== '-') {
      navigator.clipboard.writeText(displayVal);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      className={`group relative p-2.5 rounded-xl bg-slate-50 dark:bg-[#161622] border border-slate-200 dark:border-slate-800 flex flex-col justify-center min-h-[52px] shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors select-text ${className}`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span
          className="text-[10px] sm:text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight truncate select-text cursor-text"
          title={label}
        >
          {label}
        </span>
        {displayVal !== '-' && (
          <button
            type="button"
            onClick={handleCopySingle}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-[10px] font-extrabold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer select-none ml-1 shrink-0"
            title={`Copy ${label}: ${displayVal}`}
          >
            {copied ? '✓' : '📋'}
          </button>
        )}
      </div>
      <span
        title={displayVal}
        className={`text-[13px] sm:text-[13.5px] leading-snug break-words select-text cursor-text ${
          isMono ? 'font-mono font-black tracking-tight' : ''
        } ${
          valueColor
            ? valueColor
            : isBoldText
            ? 'font-black text-slate-950 dark:text-white'
            : 'font-bold text-slate-900 dark:text-slate-100'
        }`}
      >
        {displayVal}
      </span>
    </div>
  );
};
