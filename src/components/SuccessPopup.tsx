import React, { useEffect, useRef } from 'react';

interface SuccessPopupProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SuccessPopup: React.FC<SuccessPopupProps> = ({ message, isOpen, onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onCloseRef.current();
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
      onClick={() => onClose()}
    >
      <div
        className="bg-white dark:bg-[#0F0F12] border-2 border-emerald-500/50 p-6 rounded-2xl text-center shadow-2xl dark:shadow-[0_0_50px_rgba(16,185,129,0.3)] max-w-xs w-full animate-bounceIn text-slate-800 dark:text-slate-200 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400 text-3xl font-bold shadow-md dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          ✓
        </div>
        <div className="text-slate-900 dark:text-white font-extrabold text-base leading-snug mb-4">
          {message}
        </div>
        <button
          type="button"
          onClick={() => onClose()}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-wider cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
};

