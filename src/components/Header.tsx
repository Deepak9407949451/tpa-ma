import React, { useState, useEffect } from 'react';

interface HeaderProps {
  autoSyncEnabled: boolean;
  onToggleAutoSync: () => void;
  onOpenGoogleSyncModal?: () => void;
  syncSecondsLeft?: number;
  lastSyncedTime?: string;
  isSyncing?: boolean;
  themeMode?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  autoSyncEnabled,
  onToggleAutoSync,
  onOpenGoogleSyncModal,
  syncSecondsLeft = 600,
  lastSyncedTime = '',
  isSyncing = false,
  themeMode = 'dark',
  onToggleTheme
}) => {
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = currentDateTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative bg-white dark:bg-[#121216] text-slate-800 dark:text-white p-6 sm:p-8 text-center rounded-t-2xl border-b border-slate-200 dark:border-white/5 shadow-md dark:shadow-2xl overflow-hidden min-h-[180px] sm:min-h-[250px] flex flex-col justify-center transition-colors duration-200">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.25),transparent_70%)] pointer-events-none"></div>

      {/* Top Right Theme Toggle Switcher */}
      <div className="sm:absolute top-4 right-5 flex items-center gap-2 z-20 mt-2 sm:mt-0 justify-center">
        {onToggleTheme && (
          <button
            id="toggleThemeBtn"
            type="button"
            onClick={onToggleTheme}
            title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer border hover:scale-105 ${
              themeMode === 'dark'
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-700 border-indigo-400/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
            }`}
          >
            <span className="text-sm">{themeMode === 'dark' ? '☀️' : '🌙'}</span>
            <span>{themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}
      </div>

      <div className="sm:absolute top-4 left-5 flex flex-col items-center sm:items-start gap-1.5 z-20 mb-4 sm:mb-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="toggleAutoSyncBtn"
            type="button"
            onClick={onToggleAutoSync}
            title="Auto Sync every 10 minutes to Google Sheets"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer ${
              autoSyncEnabled
                ? themeMode === 'light'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-400 shadow-sm'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : themeMode === 'light'
                  ? 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-400'}`}></span>
            {autoSyncEnabled ? 'Auto Sync (10m): ON' : 'Auto Sync (10m): OFF'}
          </button>
        </div>

        {autoSyncEnabled && (
          <div className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-lg font-mono font-bold shadow-md transition-all ${
            themeMode === 'light'
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-sm'
              : 'bg-[#0A1612] text-emerald-300 border border-emerald-500/40'
          }`}>
            <span className="text-amber-500 text-xs animate-pulse">⏳</span>
            <span className={themeMode === 'light' ? 'text-slate-800 font-bold' : 'text-slate-300'}>Next sync in:</span>
            <span className={`font-extrabold px-2 py-0.5 rounded border tracking-wider ${
              themeMode === 'light'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
            }`}>
              {isSyncing ? 'Syncing...' : formatCountdown(syncSecondsLeft)}
            </span>
          </div>
        )}

        <a
          href="https://docs.google.com/spreadsheets/d/1zdbnr7iGQ4xbKRNOVFrae_g31Gk7_ws085vRZD1-6eo/edit"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Email ID Google Sheet"
          className={`mt-0.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer hover:scale-105 ${
            themeMode === 'light'
              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-sm'
              : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:border-emerald-400/50'
          }`}
        >
          <span>📧</span> Email ID
        </a>
      </div>

      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center">
          <div className="w-4 h-4 bg-white/30 rounded-full animate-pulse border border-white/50"></div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
          Insurance Claims Management System
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-1.5">
        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">
          BY DEEPAK SHRIWAS
        </p>
        <span className="hidden sm:inline text-slate-400 dark:text-slate-600">•</span>
        <div className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-mono bg-indigo-50 dark:bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/20 shadow-xs">
          <span className="text-amber-600 dark:text-amber-400 font-bold">🕒 Live:</span>
          <span className="text-indigo-900 dark:text-indigo-200 font-semibold">{formattedDate}</span>
          <span className="text-slate-400 dark:text-slate-500">|</span>
          <span className="text-amber-600 dark:text-amber-300 font-extrabold tracking-wider">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
};
