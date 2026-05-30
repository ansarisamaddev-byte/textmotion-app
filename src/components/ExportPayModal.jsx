import React, { useEffect, useMemo, useState } from 'react';
import { X, Lock, CreditCard, Download, Clipboard, Check } from 'lucide-react';
import { uploadLockedExport, downloadLockedZip, createRazorpayOrder, pollExportStatus } from '../services/exportPay';

function ensureRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector('script[data-razorpay]');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpay = '1';
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function ExportPayModal({
  open,
  onClose,
  disableClose = false,
  exportProgress,
  statusText,
  step,
  exportId,
  zipDownloaded,
  onStartPayment,
  paymentState,
  amountInr = 49,
  exportPassword // Pass the password here once the backend says paid: true
}) {
  if (!open) return null;

  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (exportPassword) {
      navigator.clipboard.writeText(exportPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Step 1 — Render & download locked file';
    if (step === 2) return 'Step 2 — Pay to unlock';
    return 'Export & Pay';
  }, [step]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-zinc-100">Export & Pay</h2>
            <p className="text-[10px] text-zinc-500 font-mono truncate">{stepTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            className={`p-1.5 rounded-lg transition ${
              disableClose
                ? 'text-zinc-700 bg-zinc-800/40 cursor-not-allowed'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl border p-3 ${step === 1 ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-950'}`}>
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                <Lock className="w-4 h-4 text-indigo-400" />
                Render
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                After render finishes, you’ll download an encrypted ZIP (locked).
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${step === 2 ? 'border-amber-500/60 bg-amber-500/10' : 'border-zinc-800 bg-zinc-950'}`}>
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Pay
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                After payment, your password will be revealed instantly on screen.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>{statusText || (step === 1 ? 'Rendering…' : 'Ready for payment')}</span>
              <span className="text-zinc-200 font-bold">{exportProgress}%</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-2 border border-zinc-800/60 p-0.5 overflow-hidden mt-2">
              <div style={{ width: `${exportProgress}%` }} className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-200" />
            </div>
            {exportId && (
              <p className="mt-2 text-[10px] text-zinc-600 font-mono">
                Export ID: <span className="text-zinc-300">{exportId}</span>
              </p>
            )}
          </div>

          {/* Dynamic Content Block: Displays Amount, or displays Password when successful */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            {paymentState === 'success' ? (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Unlock Password</span>
                <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <span className="font-mono text-lg text-white tracking-widest selection:bg-indigo-500">{exportPassword}</span>
                  <button type="button" onClick={copyToClipboard} className="text-zinc-400 hover:text-white p-1 rounded-lg transition" title="Copy to clipboard">
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Clipboard className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">Amount</span>
                <span className="text-sm font-mono font-bold text-zinc-200">₹{amountInr}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <div className="text-[10px] text-zinc-600 min-w-0">
            {step === 1 && <span>Don’t close this tab while rendering.</span>}
            {step === 2 && paymentState !== 'success' && <span>Pay to unlock your password directly on screen.</span>}
            {paymentState === 'success' && <span className="text-emerald-500 font-medium">Payment completed successfully!</span>}
          </div>

          {paymentState !== 'success' && (
            <button
              type="button"
              disabled={step !== 2 || !zipDownloaded || paymentState === 'opening' || paymentState === 'waiting'}
              onClick={onStartPayment}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:pointer-events-none transition"
              title={zipDownloaded ? 'Pay with Razorpay' : 'Download locked zip first'}
            >
              <CreditCard className="w-4 h-4" />
              <span>{paymentState === 'waiting' ? 'Waiting…' : `Pay ₹${amountInr}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper used by App.jsx (kept perfectly intact)
export async function startRazorpayCheckout({ keyId, orderId, amount, currency, onSuccess }) {
  await ensureRazorpayScript();
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-undef
    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      name: 'TextMotion Pro',
      description: 'Unlock exported video',
      order_id: orderId,
      theme: { color: '#f59e0b' },
      handler: function (response) {
        onSuccess?.(response);
        resolve(response);
      },
      modal: {
        ondismiss: () => resolve(null)
      }
    });
    try {
      rzp.open();
    } catch (e) {
      reject(e);
    }
  });
}