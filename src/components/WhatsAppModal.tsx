import React, { useState } from 'react';
import { Claim } from '../types';
import { sendWhatsAppMessage, extractValidPhoneNumbers, dispatchWhatsAppBroadcast } from '../utils/formatters';
import { WhatsAppIcon } from './WhatsAppIcon';
import { Check, Copy, ExternalLink, Radio } from 'lucide-react';

interface WhatsAppModalProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ claim, isOpen, onClose }) => {
  if (!isOpen || !claim) return null;

  const [copied, setCopied] = useState(false);
  const [sendMode, setSendMode] = useState<'single_task' | 'multi_window'>('single_task');

  const status = String(claim.admissionStatus || claim.status || '').trim();
  const isDenial = status === "Denial" || status === "Rejected" || status === "Rejected / Denial" || status.toLowerCase().includes("denial") || status.toLowerCase().includes("reject");

  const rawMobile = claim.mobileNumber || claim.mobile || '';
  const detectedNumbers = extractValidPhoneNumbers(rawMobile);

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || val === '' || val === '-') return '₹ 0.00';
    if (typeof val === 'string' && val.trim().startsWith('₹')) return val.trim();
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(num)) return '₹ 0.00';
    return `₹ ${num.toFixed(2)}`;
  };

  const getMessageText = () => {
    if (isDenial) {
      return `🏥 *CLAIM REJECTION NOTIFICATION.*
*क्लेम रिजेक्शन की सूचना।*

📋 *मरीज़ की जानकारी:*

• *मरीज़ का नाम:* *${claim.patientName || '-'}*

• *TPA का नाम:* *${claim.tpaCompanyName || claim.tpaName || "-"}*

• *क्लेम की स्थिति:* *रिजेक्टेड*

* आपको अब हॉस्पिटल का खर्च खुद से पेमेंट करना होगा *

*हमें खेद है। की कंपनी के द्वारा आपका इन्शुरन्स से भुगतान निरस्त कर दिया गया है*

Thank you for choosing our Hospital.
For any queries,
Mon-Sat 10am-7pm.
Please contact us: 9009446861,

Best regards,
Hospital Administration - TPA Desk.`;
    }

    const approvedText = formatCurrency(claim.finalApprovedAmount || claim.approved || 0);
    const discountText = formatCurrency(claim.discount || 0);
    const payableText = formatCurrency(claim.patientPayableAmount || claim.patientPay || 0);

    return `🏥 *DISCHARGE & CLAIM APPROVAL NOTIFICATION.*

📋 Patient Details:

Patient Name: *${claim.patientName || '-'}*

TPA Name: *${claim.tpaCompanyName || claim.tpaName || "-"}*

Claim No: *${claim.claimNumber || claim.claimNo || "-"}*

💰 Insurance Payment Details :

Discharge Approved Amount: *${approvedText}*

Discount: *${discountText}*

Amount Payable by Patient: *${payableText}*

*Kindly visit the Billing Department to finalize your settlement.*

*कृपया अपना गेट पास /सेटलमेंट / भुगतान पूरा करने के लिए बिलिंग विभाग ( पहली मंजिल ) में संपर्क करें।*

Thank you for choosing our Hospital.
For any queries,
Mon-Sat 10am-7pm.
Please contact us.9009446861,

Best regards,
Hospital Administration - TPA Desk.`;
  };

  const handleCopyMessage = () => {
    const text = getMessageText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleSendAll = () => {
    sendWhatsAppMessage(claim, sendMode);
    onClose();
  };

  const handleSendSingle = (phone: string) => {
    const message = getMessageText();
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, 'whatsapp_single_window');
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className={`bg-white dark:bg-[#0F172A] border-2 ${isDenial ? 'border-rose-500/50 shadow-[0_0_50px_rgba(244,63,94,0.3)]' : 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)]'} p-6 rounded-2xl max-w-md w-full text-slate-800 dark:text-slate-200 text-center space-y-4 transition-colors`}>
        <div className={`w-14 h-14 ${isDenial ? 'bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-md dark:shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-md dark:shadow-[0_0_20px_rgba(16,185,129,0.4)]'} border rounded-full flex items-center justify-center mx-auto`}>
          <WhatsAppIcon className={`w-8 h-8 ${isDenial ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
        </div>

        <div>
          <div className={`text-xs font-extrabold uppercase tracking-widest ${isDenial ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} mb-1`}>
            {isDenial ? 'Claim Rejection / Denial Notification' : 'Patient Discharge Approved successfully'}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {detectedNumbers.length > 1 ? `Broadcast WhatsApp to ${detectedNumbers.length} Numbers` : 'Do you want to send a WhatsApp message?'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            Send WhatsApp discharge notification for <strong className="text-slate-900 dark:text-white">{claim.patientName}</strong>
          </p>

          {detectedNumbers.length > 0 ? (
            <div className="mt-3 space-y-2 text-left">
              {/* Numbers list with quick 1-click send buttons without multiple tabs */}
              <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
                  <span>Target Numbers ({detectedNumbers.length})</span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                {detectedNumbers.map((num, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      <span>📱</span>
                      <span>+{num}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendSingle(num)}
                      title={`Open chat with +${num}`}
                      className="px-2 py-1 text-[11px] font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Send</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Single Task vs Multi-Window Mode Toggle for multi-number */}
              {detectedNumbers.length > 1 && (
                <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 text-xs space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Sending Mode:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSendMode('single_task')}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        sendMode === 'single_task'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center gap-1">
                        <span>🎯 Direct Single Task</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        One window, message pre-loaded & copied to clipboard
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendMode('multi_window')}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        sendMode === 'multi_window'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center gap-1">
                        <span>🗂️ Multiple Tabs</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        Opens separate tabs for each recipient number
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : rawMobile ? (
            <div className={`mt-2 text-xs font-mono ${isDenial ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800/40' : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800/40'} border py-1 px-3 rounded-lg inline-block`}>
              📱 {rawMobile}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-all uppercase tracking-wider cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSendAll}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs ${isDenial ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'} text-white transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer`}
          >
            <WhatsAppIcon className="w-4 h-4" />
            {detectedNumbers.length > 1
              ? (sendMode === 'single_task' ? `Direct Broadcast (${detectedNumbers.length})` : `Open All Tabs (${detectedNumbers.length})`)
              : 'Yes, Send WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
};
