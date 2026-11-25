import React, { useState } from 'react';
import { InvoiceItem } from '../types';
import { numberToWords } from '../utils/formatters';

interface InvoiceCalculatorProps {
  isOpen: boolean;
  onClose?: () => void;
  themeMode?: 'dark' | 'light';
}

export const InvoiceCalculator: React.FC<InvoiceCalculatorProps> = ({ isOpen, onClose, themeMode = 'dark' }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [rows, setRows] = useState<InvoiceItem[]>([
    {
      id: '1',
      gstRate: 5,
      mrp: 0,
      qty: 0,
      rateExclGst: 0,
      amount: 0,
      gstAmount: 0
    }
  ]);

  if (!isOpen) return null;

  const handleRowChange = (id: string, field: 'gstRate' | 'mrp' | 'qty', value: number) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };
        const gstRate = updated.gstRate || 0;
        const mrp = updated.mrp || 0;
        const qty = updated.qty || 0;

        const gstComponent = (mrp * gstRate) / (100 + gstRate);
        const roundedGstComponent = Math.round(gstComponent * 100) / 100;
        const rateBeforeTax = mrp - roundedGstComponent;
        const finalAmount = qty * rateBeforeTax;
        const finalGst = qty * roundedGstComponent;

        return {
          ...updated,
          rateExclGst: rateBeforeTax,
          amount: finalAmount,
          gstAmount: finalGst
        };
      })
    );
  };

  const addRow = () => {
    const newRow: InvoiceItem = {
      id: Date.now().toString(),
      gstRate: 5,
      mrp: 0,
      qty: 0,
      rateExclGst: 0,
      amount: 0,
      gstAmount: 0
    };
    setRows(prev => [...prev, newRow]);
  };

  const removeRow = () => {
    if (rows.length > 1) {
      setRows(prev => prev.slice(0, -1));
    }
  };

  const totalQty = rows.reduce((sum, r) => sum + (r.qty || 0), 0);
  const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalGst = rows.reduce((sum, r) => sum + (r.gstAmount || 0), 0);
  const splitGst = totalGst / 2;
  const grandTotal = totalAmount + totalGst;

  // Floating Minimized Widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-[5500] bg-white dark:bg-[#121216] border-2 border-slate-300 dark:border-indigo-500/50 rounded-2xl p-3.5 shadow-2xl dark:shadow-[0_0_30px_rgba(79,70,229,0.35)] flex items-center gap-3 text-slate-800 dark:text-white animate-bounce-short transition-colors">
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 border border-purple-200 dark:border-purple-500/40 flex items-center justify-center text-xl shadow-inner text-purple-700 dark:text-purple-300">
          🧮
        </div>
        <div>
          <div className="text-xs font-black text-slate-900 dark:text-slate-200">
            Invoice Calculator <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">(Minimized)</span>
          </div>
          <div className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
            Grand Total: ₹ {grandTotal.toFixed(2)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer"
            title="Restore Invoice Calculator"
          >
            ↗️ Open
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  // Interactive Popup Modal Window
  return (
    <div
      className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#121216] rounded-2xl shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] border-2 border-slate-300 dark:border-white/10 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-300 transition-colors">
        
        {/* Window Header Bar */}
        <div className="bg-slate-50 dark:bg-[#181820] border-b border-slate-200 dark:border-white/10 px-5 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-lg text-purple-700 dark:text-purple-300">
              🧮
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
                Invoice Calculator
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Interactive GST &amp; MRP rate breakdown with automatic rupee conversion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Minimize to floating widget"
            >
              <span>➖</span> Minimize
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center text-sm transition-all cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 bg-slate-100 dark:bg-[#0A0A0E] flex-1">
          <div className="flex gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={addRow}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition-all cursor-pointer"
            >
              + Add Item Row
            </button>
            <button
              type="button"
              onClick={removeRow}
              className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition-all cursor-pointer"
            >
              - Remove Last Row
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-white/10 shadow-sm">
            <table className="w-full min-w-[700px] border-collapse text-xs text-center bg-white dark:bg-[#08080A]">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#0F0F12] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10 uppercase tracking-wider text-[10px]">
                  <th className="p-3 border-r border-slate-200 dark:border-white/10 w-16">Sl No.</th>
                  <th className="p-3 border-r border-slate-200 dark:border-white/10 w-28">GST Rate (%)</th>
                  <th className="p-3 border-r border-slate-200 dark:border-white/10 w-32">MRP/Marginal</th>
                  <th className="p-3 border-r border-slate-200 dark:border-white/10 w-24">Quantity</th>
                  <th className="p-3 border-r border-slate-200 dark:border-white/10 w-36">Rate (Excl. GST)</th>
                  <th className="p-3 border-r border-slate-200 dark:border-white/10 w-32">Amount</th>
                  <th className="p-3 border-r border-slate-200 dark:border-white/10 w-28">GST</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-200 dark:border-white/5">
                    <td className="p-2 border-r border-slate-200 dark:border-white/5 font-semibold text-indigo-600 dark:text-indigo-400">{index + 1}</td>
                    <td className="p-1 border-r border-slate-200 dark:border-white/5">
                      <input
                        type="number"
                        value={row.gstRate}
                        step="0.01"
                        onChange={e => handleRowChange(row.id, 'gstRate', parseFloat(e.target.value) || 0)}
                        className="w-full text-center p-1.5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 bg-white dark:bg-[#121216] text-slate-900 dark:text-white text-xs rounded-lg"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200 dark:border-white/5">
                      <input
                        type="number"
                        value={row.mrp}
                        step="0.01"
                        onChange={e => handleRowChange(row.id, 'mrp', parseFloat(e.target.value) || 0)}
                        className="w-full text-center p-1.5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 bg-white dark:bg-[#121216] text-slate-900 dark:text-white text-xs rounded-lg"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200 dark:border-white/5">
                      <input
                        type="number"
                        value={row.qty}
                        step="1"
                        onChange={e => handleRowChange(row.id, 'qty', parseInt(e.target.value, 10) || 0)}
                        className="w-full text-center p-1.5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 bg-white dark:bg-[#121216] text-slate-900 dark:text-white text-xs rounded-lg"
                      />
                    </td>
                    <td className="p-2.5 border-r border-slate-200 dark:border-white/5 font-mono text-slate-800 dark:text-slate-300">{row.rateExclGst?.toFixed(2)}</td>
                    <td className="p-2.5 border-r border-slate-200 dark:border-white/5 font-mono font-bold text-slate-900 dark:text-white">{row.amount?.toFixed(2)}</td>
                    <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{row.gstAmount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* CGST Row */}
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121216]">
                  <td colSpan={5} className="p-2.5 border-r border-slate-200 dark:border-white/10 text-right font-bold text-slate-700 dark:text-slate-300">CGST (50% of GST):</td>
                  <td colSpan={2} className="p-2.5 border-r border-slate-200 dark:border-white/10"></td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-white/10 text-right bg-slate-50 dark:bg-[#121216] text-indigo-600 dark:text-indigo-300 font-mono font-bold">{splitGst.toFixed(2)}</td>
                  <td className="p-2.5 bg-slate-50 dark:bg-[#121216]"></td>
                </tr>
                {/* SGST Row */}
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121216]">
                  <td colSpan={5} className="p-2.5 border-r border-slate-200 dark:border-white/10 text-right font-bold text-slate-700 dark:text-slate-300">SGST (50% of GST):</td>
                  <td colSpan={2} className="p-2.5 border-r border-slate-200 dark:border-white/10"></td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-white/10 text-right bg-slate-50 dark:bg-[#121216] text-indigo-600 dark:text-indigo-300 font-mono font-bold">{splitGst.toFixed(2)}</td>
                  <td className="p-2.5 bg-slate-50 dark:bg-[#121216]"></td>
                </tr>
                <tr className="font-bold bg-slate-100 dark:bg-[#0F0F12] border-b border-slate-200 dark:border-white/10">
                  <td colSpan={3} className="p-2.5 border-r border-slate-200 dark:border-white/10 text-left text-slate-900 dark:text-white">Total</td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-white/10 text-center text-slate-900 dark:text-white">{totalQty}</td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-white/10"></td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-white/10 text-right text-indigo-600 dark:text-indigo-400 font-mono">{totalAmount.toFixed(2)}</td>
                  <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400 font-mono">{totalGst.toFixed(2)}</td>
                </tr>
                <tr className="font-bold border-b border-slate-200 dark:border-white/10">
                  <td colSpan={5} className="p-3 border-r border-slate-200 dark:border-white/10 text-right bg-slate-50 dark:bg-[#121216] text-sm text-slate-700 dark:text-slate-300">
                    TOTAL AMOUNT (Incl. GST):
                  </td>
                  <td colSpan={2} className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-right text-base text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-300 dark:border-indigo-500/40 font-mono">
                    ₹ {grandTotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={7} className="p-4 text-left bg-slate-50 dark:bg-[#121216] space-y-1.5 border-b border-slate-200 dark:border-white/5">
                    <div>
                      <strong className="text-slate-600 dark:text-slate-400">Amount Chargeable (in words):</strong>{' '}
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {numberToWords(Math.round(grandTotal))} Rupees Only
                      </span>
                    </div>
                    <div>
                      <strong className="text-slate-600 dark:text-slate-400">Total GST Amount (in words):</strong>{' '}
                      <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                        {numberToWords(Math.round(totalGst))} Rupees Only
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-[#181820] border-t border-slate-200 dark:border-white/10 px-5 py-3 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Grand Total: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">₹ {grandTotal.toFixed(2)}</strong>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              Minimize
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Close Window
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
