import React, { useState, useEffect } from 'react';
import { Claim } from '../types';
import {
  StayAlertItem,
  markPatientStaySent,
  markPatientStayIgnored,
  markAllPatientsStayIgnored,
  buildClinicalSummaryWhatsAppText,
  calculateLengthOfStay
} from '../utils/stayAlerts';
import { formatDateForDisplay, normalizeMobileNumber } from '../utils/formatters';
import { WhatsAppIcon } from './WhatsAppIcon';

interface StayAlertModalProps {
  isOpen: boolean;
  alertItems: StayAlertItem[];
  onClose: () => void;
  onRefreshAlerts: () => void;
  onEditClaim?: (claim: Claim, index: number) => void;
  onShowNotification?: (msg: string, type?: 'info' | 'success' | 'error') => void;
  themeMode?: 'dark' | 'light';
}

export const StayAlertModal: React.FC<StayAlertModalProps> = ({
  isOpen,
  alertItems,
  onClose,
  onRefreshAlerts,
  onEditClaim,
  onShowNotification,
  themeMode = 'dark'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sendSuccessPatient, setSendSuccessPatient] = useState<string | null>(null);

  // Keep index within bounds when alert items change
  useEffect(() => {
    if (currentIndex >= alertItems.length && alertItems.length > 0) {
      setCurrentIndex(alertItems.length - 1);
    }
  }, [alertItems.length, currentIndex]);

  if (!isOpen || alertItems.length === 0) return null;

  const currentItem = alertItems[currentIndex] || alertItems[0];
  const claim = currentItem.claim;
  const daysStay = currentItem.daysStay || calculateLengthOfStay(claim.doa);

  const handleSend = (openWhatsApp = false) => {
    // 1. Mark as sent to stop all further notifications for this patient
    markPatientStaySent(claim);
    setSendSuccessPatient(claim.patientName || 'Patient');

    if (openWhatsApp) {
      const mobile = claim.mobileNumber || claim.mobile || '';
      const cleanNum = normalizeMobileNumber(mobile);
      const text = buildClinicalSummaryWhatsAppText(claim, daysStay);
      if (cleanNum) {
        const fullNumber = cleanNum.startsWith('91') ? cleanNum : `91${cleanNum}`;
        window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`, '_blank');
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
    }

    setTimeout(() => {
      setSendSuccessPatient(null);
      onRefreshAlerts();
      if (alertItems.length <= 1) {
        onClose();
      }
    }, 900);
  };

  const handleIgnore = () => {
    // 2. Mark ALL patients as ignored - snoozes all alerts for 3 hours
    const allClaims = alertItems.map(item => item.claim);
    markAllPatientsStayIgnored(allClaims);

    if (onShowNotification) {
      onShowNotification(`⏰ All stay duration alerts snoozed. You will be reminded again after 3 hours.`, 'info');
    }

    onRefreshAlerts();
    onClose();
  };

  const handleCopySummary = () => {
    const text = buildClinicalSummaryWhatsAppText(claim, daysStay);
    navigator.clipboard.writeText(text);
    alert('📋 Clinical summary & running bill request text copied to clipboard!');
  };

  const isLight = themeMode === 'light';

  return (
    <div
      id="stay-alert-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className={`fixed inset-0 z-[11000] flex items-center justify-center p-3 sm:p-4 backdrop-blur-[2px] animate-fadeIn ${
        isLight ? 'bg-slate-900/45' : 'bg-black/60'
      }`}
    >
      {/* Small Floating Popup Window */}
      <div
        id="stay-alert-popup-window"
        className={`stay-alert-modal-container border-2 rounded-2xl w-full max-w-[440px] max-h-[85vh] flex flex-col shadow-2xl relative animate-scaleUp transition-colors ${
          isLight
            ? 'bg-white border-amber-500 shadow-[0_15px_40px_rgba(245,158,11,0.3)] text-slate-900'
            : 'bg-[#0F172A] border-amber-500/80 shadow-[0_0_40px_rgba(245,158,11,0.35)] text-slate-200'
        }`}
      >
        {/* Popup Window Title Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 px-3.5 py-2.5 text-slate-950 flex items-center justify-between shadow-sm shrink-0 rounded-t-[14px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-md bg-black/15 flex items-center justify-center text-sm shrink-0 animate-pulse">
              🚨
            </span>
            <div className="min-w-0">
              <div className="text-[9px] font-black tracking-wider uppercase text-slate-900/80 leading-none">
                Stay Duration Alert
              </div>
              <h2 className="text-xs sm:text-sm font-black text-slate-950 truncate flex items-center gap-1.5 mt-0.5">
                <span>Initial Stay Exceeds 5 Days</span>
                {alertItems.length > 1 && (
                  <span className="text-[9px] bg-slate-950 text-amber-300 font-extrabold px-1.5 py-0.2 rounded-full">
                    {currentIndex + 1}/{alertItems.length}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-black/15 hover:bg-black/30 text-slate-950 flex items-center justify-center font-black text-xs transition-all cursor-pointer shrink-0 ml-2"
            title="Close Popup Window"
          >
            ✕
          </button>
        </div>

        {/* Multi-patient Selector Tabs (if multiple overdue patients) */}
        {alertItems.length > 1 && (
          <div
            className={`px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto border-b shrink-0 ${
              isLight
                ? 'bg-amber-50/80 border-amber-200'
                : 'bg-[#090E17] border-amber-500/30'
            }`}
          >
            <span
              className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                isLight ? 'text-amber-900 font-extrabold' : 'text-amber-400/90'
              }`}
            >
              Patients:
            </span>
            {alertItems.map((item, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                      : isLight
                      ? 'bg-white text-slate-700 hover:bg-amber-100/70 border border-amber-200'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5'
                  }`}
                >
                  <span className="truncate max-w-[100px]">{item.claim.patientName || `Patient #${idx + 1}`}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-slate-950 text-amber-300'
                        : isLight
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.daysStay}d
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Popup Body (Scrollable if needed, compact) */}
        <div className="p-3 space-y-2.5 overflow-y-auto custom-scrollbar flex-1">
          {/* Highlighted Protocol Notice */}
          <div
            className={`border p-2.5 rounded-xl shadow-xs ${
              isLight
                ? 'bg-amber-50 border-amber-400 text-amber-950'
                : 'bg-amber-950/40 border-amber-500/60 text-amber-100 shadow-inner'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-base mt-0.5 shrink-0">⚠️</span>
              <div>
                <div
                  className={`text-[9px] font-black uppercase tracking-wider ${
                    isLight ? 'text-amber-800' : 'text-amber-400'
                  }`}
                >
                  Action Required • Length of Stay Protocol
                </div>
                <p
                  className={`text-xs font-black mt-0.5 leading-snug ${
                    isLight ? 'text-amber-950' : 'text-amber-100'
                  }`}
                >
                  &ldquo;Patient has been admitted for{' '}
                  <span
                    className={`underline font-black ${
                      isLight ? 'text-amber-700' : 'text-amber-300'
                    }`}
                  >
                    {daysStay} days
                  </span>
                  ; clinical summary and running bill required.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Compact Patient Details Card */}
          <div
            className={`rounded-xl p-2.5 space-y-2 border text-xs ${
              isLight
                ? 'bg-slate-50/90 border-amber-300/80'
                : 'bg-[#090E17] border-amber-500/30'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-1.5 ${
                isLight ? 'border-slate-200' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase border ${
                    isLight
                      ? 'bg-amber-100 text-amber-900 border-amber-400'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {claim.status || 'Initial Approved'}
                </span>
                <span className={`text-[10px] font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Stay:{' '}
                  <strong className={isLight ? 'text-amber-800 font-black' : 'text-amber-300 font-bold'}>
                    {daysStay} Days
                  </strong>
                </span>
              </div>

              {onEditClaim && (
                <button
                  type="button"
                  onClick={() => {
                    onEditClaim(claim, currentItem.claimIndex);
                    onClose();
                  }}
                  className={`text-[10px] underline font-bold cursor-pointer transition-colors ${
                    isLight ? 'text-indigo-700 hover:text-indigo-900' : 'text-indigo-400 hover:text-indigo-300'
                  }`}
                >
                  Edit Claim ↗
                </button>
              )}
            </div>

            {/* Concise Information Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {/* Patient Name */}
              <div
                className={`p-1.5 rounded-lg border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-white/5'
                }`}
              >
                <span
                  className={`text-[9px] uppercase font-bold block ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Patient Name
                </span>
                <span
                  className={`text-xs font-black block mt-0.5 truncate ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                  title={claim.patientName}
                >
                  {claim.patientName || '-'}
                </span>
              </div>

              {/* UHID */}
              <div
                className={`p-1.5 rounded-lg border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-white/5'
                }`}
              >
                <span
                  className={`text-[9px] uppercase font-bold block ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  UHID
                </span>
                <span
                  className={`text-xs font-black font-mono block mt-0.5 truncate ${
                    isLight ? 'text-amber-800' : 'text-amber-300'
                  }`}
                >
                  {claim.uhid || '-'}
                </span>
              </div>

              {/* Claim Number */}
              <div
                className={`p-1.5 rounded-lg border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-white/5'
                }`}
              >
                <span
                  className={`text-[9px] uppercase font-bold block ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Claim No.
                </span>
                <span
                  className={`text-xs font-bold font-mono block mt-0.5 truncate ${
                    isLight ? 'text-slate-800' : 'text-slate-100'
                  }`}
                >
                  {claim.claimNo || '-'}
                </span>
              </div>

              {/* Mobile Number */}
              <div
                className={`p-1.5 rounded-lg border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-white/5'
                }`}
              >
                <span
                  className={`text-[9px] uppercase font-bold block ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Mobile
                </span>
                <span
                  className={`text-xs font-bold font-mono block mt-0.5 truncate ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}
                >
                  📱 {claim.mobileNumber || claim.mobile || 'None'}
                </span>
              </div>

              {/* Insurance & TPA */}
              <div
                className={`col-span-2 p-1.5 rounded-lg border space-y-0.5 ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] uppercase font-bold ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    TPA / Insurance
                  </span>
                  <span className={`text-[9px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Policy: {claim.policyNumber || '-'}
                  </span>
                </div>
                <strong className={`block text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {claim.tpaName || claim.insuranceCompany || '-'}
                </strong>
              </div>

              {/* DOA & Bed */}
              <div
                className={`p-1.5 rounded-lg border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-white/5'
                }`}
              >
                <span
                  className={`text-[9px] uppercase font-bold block ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Admission Date
                </span>
                <span className={`text-[10px] font-bold block mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  📅 {formatDateForDisplay(claim.doa)}
                </span>
              </div>

              <div
                className={`p-1.5 rounded-lg border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-white/5'
                }`}
              >
                <span
                  className={`text-[9px] uppercase font-bold block ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Bed / IPD No.
                </span>
                <span className={`text-[10px] font-bold block mt-0.5 truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  🏥 {claim.ipdNo || 'Ward'}
                </span>
              </div>
            </div>
          </div>

          {/* Success Toast when 'Send' is clicked */}
          {sendSuccessPatient && (
            <div className="bg-emerald-600 text-white p-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 animate-fadeIn shadow-md">
              <span>✅</span>
              <span>
                Marked as <strong>SENT</strong> for {sendSuccessPatient}. Alerts stopped!
              </span>
            </div>
          )}

          {/* Mini info bar with Copy */}
          <div
            className={`text-[9px] p-1.5 rounded-lg border flex items-center justify-between ${
              isLight
                ? 'bg-amber-50/80 text-slate-700 border-amber-200'
                : 'bg-slate-900/50 text-slate-400 border-white/5'
            }`}
          >
            <span>
              ℹ️ &apos;Ignore&apos; snoozes all alerts for 3 hours • &apos;Send&apos; marks completed
            </span>
            <button
              type="button"
              onClick={handleCopySummary}
              className={`font-bold shrink-0 ml-2 cursor-pointer ${
                isLight ? 'text-amber-800 hover:text-amber-900' : 'text-amber-400 hover:text-amber-300'
              }`}
              title="Copy text to clipboard"
            >
              📋 Copy Text
            </button>
          </div>
        </div>

        {/* Small Popup Footer */}
        <div
          className={`p-2.5 border-t shrink-0 flex items-center justify-between gap-1.5 rounded-b-[14px] ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#090E17] border-white/5'
          }`}
        >
          {/* Ignore All / 3 Hours Snooze */}
          <button
            type="button"
            id="stay-alert-ignore-btn"
            onClick={handleIgnore}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border hover:scale-105 active:scale-95 shadow-xs ${
              isLight
                ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 border-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
            }`}
            title="Ignore all alerts and remind after 3 hours"
          >
            <span>⏰</span>
            <span>{alertItems.length > 1 ? `Ignore All (${alertItems.length}) • 3h Snooze` : 'Ignore • 3h Snooze'}</span>
          </button>

          {/* Send Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="stay-alert-send-direct-btn"
              onClick={() => handleSend(false)}
              className="px-3 py-1.5 rounded-lg font-black text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition-all uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>✓</span>
              <span>Send</span>
            </button>

            <button
              type="button"
              id="stay-alert-send-whatsapp-btn"
              onClick={() => handleSend(true)}
              className="px-2.5 py-1.5 rounded-lg font-extrabold text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer hover:scale-105 active:scale-95"
              title="Send via WhatsApp and mark as done"
            >
              <WhatsAppIcon className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
