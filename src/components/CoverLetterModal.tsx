import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { Claim } from '../types';
import { buildCoverLetterDocument } from '../utils/formatters';

const DEFAULT_ENCLOSED_DOCS = [
  'ORIGINAL DISCHARGE SUMMARY',
  'FINAL BILL WITH BREAKUP / DETAILS BILL',
  'AADHAAR CARD, PAN CARD, POLICY CARD',
  'OPERATION THEATRE NOTE',
  'DEATH SUMMARY AND DEATH CERTIFICATE',
  'ALL INVESTIGATIONS REPORTS'
];

const PRESET_EXTRA_DOCS = [
  'FINAL AUTHORIZATION LETTER',
  'PRE-AUTHORIZATION APPROVAL COPY',
  'POLICE FIR / MLC REPORT'
];

interface CoverLetterModalProps {
  isOpen: boolean;
  claims: Claim[];
  onClose: () => void;
  themeMode?: 'dark' | 'light';
}

export const CoverLetterModal: React.FC<CoverLetterModalProps> = ({
  isOpen,
  claims,
  onClose,
  themeMode = 'dark'
}) => {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [viewAllPages, setViewAllPages] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(0.85);

  // Enclosed documents state
  const [selectedDocs, setSelectedDocs] = useState<string[]>(DEFAULT_ENCLOSED_DOCS);
  const [customDocs, setCustomDocs] = useState<string[]>([]);
  const [newDocInput, setNewDocInput] = useState<string>('');
  const [showEnclosuresPanel, setShowEnclosuresPanel] = useState<boolean>(true);

  const isLight = themeMode === 'light';

  useEffect(() => {
    if (isOpen) {
      setActivePageIndex(0);
    }
  }, [isOpen, claims]);

  // Toggle single document checkbox
  const toggleDoc = (doc: string) => {
    setSelectedDocs(prev =>
      prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]
    );
  };

  // Add custom manual document
  const handleAddCustomDoc = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newDocInput.trim();
    if (!trimmed) return;
    if (!customDocs.includes(trimmed)) {
      setCustomDocs(prev => [...prev, trimmed]);
    }
    if (!selectedDocs.includes(trimmed)) {
      setSelectedDocs(prev => [...prev, trimmed]);
    }
    setNewDocInput('');
  };

  // Remove custom document
  const handleRemoveCustomDoc = (docToRemove: string) => {
    setCustomDocs(prev => prev.filter(d => d !== docToRemove));
    setSelectedDocs(prev => prev.filter(d => d !== docToRemove));
  };

  // Quick preset selections
  const handleSelectAllDocs = () => {
    const allAvailable = Array.from(new Set([...DEFAULT_ENCLOSED_DOCS, ...PRESET_EXTRA_DOCS, ...customDocs]));
    setSelectedDocs(allAvailable);
  };

  const handleDeselectAllDocs = () => {
    setSelectedDocs([]);
  };

  const handleResetDefaultDocs = () => {
    setSelectedDocs(DEFAULT_ENCLOSED_DOCS);
  };

  // Inject print styles for 1:1 exact print
  useEffect(() => {
    const styleId = 'claim-cover-letter-print-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 5mm 6mm !important;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > * {
          display: none !important;
        }
        #cover-letter-modal-root {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .no-print {
          display: none !important;
        }
        #cover-letter-print-area {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
        }
        .letter-container {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: 285mm !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
          break-after: page !important;
          break-inside: avoid !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
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
        }
        .box-title-row,
        .enclosures-title {
          background-color: #0f172a !important;
          color: #ffffff !important;
          border: 1.5px solid #0f172a !important;
          border-bottom: none !important;
          font-weight: 800 !important;
          padding: 3.5px 8px !important;
          font-size: 10px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
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
    `;

    return () => {
      if (styleEl) styleEl.remove();
    };
  }, []);

  if (!isOpen || !claims || claims.length === 0) return null;

  const totalPages = claims.length;

  const handleOpenPrintWindow = () => {
    const claimsToPrint = viewAllPages ? claims : [claims[activePageIndex] || claims[0]];
    const htmlContent = buildCoverLetterDocument(claimsToPrint, true, selectedDocs, true);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    } else {
      window.print();
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    let container: HTMLDivElement | null = null;
    try {
      const claimsToExport = viewAllPages ? claims : [claims[activePageIndex] || claims[0]];
      const htmlContent = buildCoverLetterDocument(claimsToExport, true, selectedDocs);

      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0px';
      container.style.left = '0px';
      container.style.width = '794px';
      container.style.backgroundColor = '#ffffff';
      container.style.zIndex = '-9999';
      container.style.opacity = '0.99';
      container.style.pointerEvents = 'none';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Make sure all .letter-container elements fill 794px width with zero border and clean fit
      container.querySelectorAll<HTMLElement>('.letter-container').forEach(el => {
        el.style.width = '794px';
        el.style.maxWidth = '794px';
        el.style.margin = '0 auto';
        el.style.border = 'none';
        el.style.outline = 'none';
        el.style.boxShadow = 'none';
        el.style.boxSizing = 'border-box';
      });

      // Wait for all images inside container to finish loading
      const images = Array.from(container.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // Wait a short tick for layout & font rendering to settle
      await new Promise((resolve) => setTimeout(resolve, 250));

      const currentClaim = claimsToExport[0] || claims[0];
      const claimNoClean = (currentClaim?.claimNo || 'CLAIM').replace(/[^a-zA-Z0-9]/g, '_');
      const patientNameClean = (currentClaim?.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = claimsToExport.length > 1
        ? `Claim_Cover_Letters_Batch_${claimsToExport.length}_Patients.pdf`
        : `Claim_Cover_Letter_${claimNoClean}_${patientNameClean}.pdf`;

      const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      const letters = container.querySelectorAll('.letter-container');
      const elementToConvert = letters.length === 1 ? (letters[0] as HTMLElement) : container;

      await html2pdf().set(opt).from(elementToConvert).save();
    } catch (err: any) {
      console.error('PDF Export error:', err);
      // Fallback: Open print window where user can choose 'Save as PDF'
      handleOpenPrintWindow();
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setIsExportingPdf(false);
    }
  };

  // Render HTML preview string safely
  const previewHtml = buildCoverLetterDocument(
    viewAllPages ? claims : [claims[activePageIndex]],
    true,
    selectedDocs
  );

  return (
    <div
      id="cover-letter-modal-root"
      className={`fixed inset-0 z-[6000] backdrop-blur-md flex flex-col p-2 sm:p-4 animate-fadeIn overflow-hidden ${
        isLight ? 'bg-slate-900/60' : 'bg-black/90'
      }`}
    >
      <div className={`max-w-6xl w-full h-full max-h-[98vh] mx-auto rounded-2xl flex flex-col shadow-2xl overflow-hidden border ${
        isLight ? 'bg-white border-slate-200 text-slate-900 shadow-slate-900/30' : 'bg-[#0A0E17] border-slate-800 text-slate-100'
      }`}>
        
        {/* Top Header Controls */}
        <div className={`no-print p-3 sm:p-4 flex items-center justify-between shrink-0 border-b ${
          isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-[#0B0F19] border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-extrabold shadow-inner border ${
              isLight ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-blue-600/20 border-blue-500/40 text-blue-400'
            }`}>
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm sm:text-base font-black uppercase tracking-wide ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  CLAIM COVER LETTER PRINT & PDF EXPORT
                </h2>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                  isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  STRICT A4 FIT
                </span>
              </div>
              <p className={`text-xs hidden sm:block ${
                isLight ? 'text-slate-500 font-medium' : 'text-slate-400'
              }`}>
                Exact 1:1 A4 document formatting with letterhead and NEFT bank details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-200/80 hover:bg-slate-300 text-slate-700 hover:text-slate-900'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className={`no-print px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b ${
          isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-[#121826] border-slate-800/80'
        }`}>
          <div className="flex items-center gap-3 flex-wrap">
            {totalPages > 1 && (
              <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                isLight ? 'bg-white border-slate-300 shadow-xs' : 'bg-[#080B12] border-slate-700/80'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setViewAllPages(false);
                    setActivePageIndex(prev => Math.max(0, prev - 1));
                  }}
                  disabled={activePageIndex === 0 && !viewAllPages}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs disabled:opacity-40 cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  ◀
                </button>
                <span className={`text-xs font-bold px-2 font-mono ${
                  isLight ? 'text-slate-800' : 'text-slate-200'
                }`}>
                  {viewAllPages ? `All ${totalPages} Pages` : `Page ${activePageIndex + 1} of ${totalPages}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setViewAllPages(false);
                    setActivePageIndex(prev => Math.min(totalPages - 1, prev + 1));
                  }}
                  disabled={activePageIndex === totalPages - 1 && !viewAllPages}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs disabled:opacity-40 cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={() => setViewAllPages(!viewAllPages)}
                  className={`ml-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    viewAllPages
                      ? 'bg-indigo-600 text-white'
                      : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {viewAllPages ? 'View Single Page' : 'View All Pages'}
                </button>
              </div>
            )}

            {/* Scale control */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border ${
              isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-[#080B12] border-slate-700/80 text-slate-400'
            }`}>
              <span className="text-[11px] font-bold">Scale:</span>
              <select
                value={zoomScale}
                onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${
                  isLight ? 'text-indigo-600' : 'text-blue-400'
                }`}
              >
                <option value={1.0} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-200'}>100% Full Size</option>
                <option value={0.85} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-200'}>85% Fit Screen</option>
                <option value={0.7} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-200'}>70% Small</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl font-extrabold text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isExportingPdf ? '⏳ Generating PDF...' : '📥 Export PDF'}
            </button>

            <button
              type="button"
              onClick={handleOpenPrintWindow}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-xl font-extrabold text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span> Print / Open Document
            </button>
          </div>
        </div>

        {/* Enclosed Documents Selection Panel */}
        <div className={`no-print px-4 py-3 shrink-0 border-b ${
          isLight ? 'bg-indigo-50/50 border-indigo-100' : 'bg-[#0F1523] border-slate-800/80'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs sm:text-sm font-black uppercase tracking-wide flex items-center gap-1.5 ${
                isLight ? 'text-indigo-950' : 'text-indigo-400'
              }`}>
                📋 Enclosed Claim Documents
              </span>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                {selectedDocs.length} Selected
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllDocs}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAllDocs}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={handleResetDefaultDocs}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                  isLight
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                    : 'bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 border-amber-500/30'
                }`}
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => setShowEnclosuresPanel(!showEnclosuresPanel)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ml-1 cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                {showEnclosuresPanel ? 'Hide Options ▲' : 'Show Options ▼'}
              </button>
            </div>
          </div>

          {showEnclosuresPanel && (
            <div className={`mt-3 space-y-3 pt-2 border-t ${
              isLight ? 'border-indigo-100' : 'border-slate-800/60'
            }`}>
              {/* Checkbox Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {/* Default docs */}
                {DEFAULT_ENCLOSED_DOCS.map((doc) => {
                  const isChecked = selectedDocs.includes(doc);
                  return (
                    <label
                      key={doc}
                      className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                        isChecked
                          ? isLight
                            ? 'bg-blue-50/90 border-blue-400 text-blue-950 font-semibold shadow-xs'
                            : 'bg-blue-950/40 border-blue-500/50 text-blue-100 font-semibold shadow-sm'
                          : isLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDoc(doc)}
                        className="mt-0.5 rounded border-slate-400 text-blue-600 focus:ring-blue-500/30 shrink-0 cursor-pointer"
                      />
                      <span className="leading-tight">{doc}</span>
                    </label>
                  );
                })}

                {/* Additional Presets */}
                {PRESET_EXTRA_DOCS.map((doc) => {
                  const isChecked = selectedDocs.includes(doc);
                  return (
                    <label
                      key={doc}
                      className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                        isChecked
                          ? isLight
                            ? 'bg-indigo-50/90 border-indigo-400 text-indigo-950 font-semibold shadow-xs'
                            : 'bg-indigo-950/40 border-indigo-500/50 text-indigo-100 font-semibold shadow-sm'
                          : isLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDoc(doc)}
                        className="mt-0.5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500/30 shrink-0 cursor-pointer"
                      />
                      <span className="leading-tight">{doc}</span>
                    </label>
                  );
                })}

                {/* User added custom docs */}
                {customDocs.map((doc) => {
                  const isChecked = selectedDocs.includes(doc);
                  return (
                    <div
                      key={doc}
                      className={`flex items-start justify-between gap-1.5 p-2 rounded-xl border text-xs transition-all select-none ${
                        isChecked
                          ? isLight
                            ? 'bg-purple-50/90 border-purple-400 text-purple-950 font-semibold shadow-xs'
                            : 'bg-purple-950/40 border-purple-500/50 text-purple-100 font-semibold shadow-sm'
                          : isLight
                            ? 'bg-white border-slate-200 text-slate-700'
                            : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDoc(doc)}
                          className="mt-0.5 rounded border-slate-400 text-purple-600 focus:ring-purple-500/30 shrink-0 cursor-pointer"
                        />
                        <span className="leading-tight break-words">{doc}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomDoc(doc)}
                        className={`p-0.5 rounded transition-colors shrink-0 ml-1 cursor-pointer ${
                          isLight
                            ? 'text-slate-400 hover:text-red-600 hover:bg-slate-100'
                            : 'text-slate-500 hover:text-red-400 hover:bg-slate-800'
                        }`}
                        title="Delete custom document"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Manual Entry / Custom Add Bar */}
              <form onSubmit={handleAddCustomDoc} className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${
                    isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}>✍️</span>
                  <input
                    type="text"
                    value={newDocInput}
                    onChange={(e) => setNewDocInput(e.target.value)}
                    placeholder="Type custom document name (e.g. Implant Invoice, Death Certificate...)"
                    className={`w-full rounded-xl pl-8 pr-3 py-1.5 text-xs transition-all border focus:outline-none focus:ring-1 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500/30'
                        : 'bg-[#080C16] border-slate-700/80 text-slate-100 placeholder-slate-500 focus:border-indigo-500/80 focus:ring-indigo-500/30'
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newDocInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <span>+</span> Add Document
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Scrollable Document Preview Area */}
        <div className={`flex-1 overflow-y-auto p-4 flex justify-center items-start border-b ${
          isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-[#131722] border-slate-800'
        }`}>
          <div
            id="cover-letter-print-area"
            className="w-full max-w-[800px] flex flex-col items-center"
            style={{
              transform: zoomScale !== 1.0 ? `scale(${zoomScale})` : 'none',
              transformOrigin: 'top center',
              marginBottom: zoomScale !== 1.0 ? `-${(1 - zoomScale) * 300}mm` : '0'
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

        {/* Bottom Footer */}
        <div className={`no-print px-4 py-3 flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0B0F19] border-slate-800 text-slate-400'
        }`}>
          <span className="text-[11px] font-medium">
            A4 Dimensions: 210mm × 297mm | Prepared for TPA / Reimbursements
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 shadow-xs'
                : 'bg-[#1E293B] hover:bg-[#334155] text-white'
            }`}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

