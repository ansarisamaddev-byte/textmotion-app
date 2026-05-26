import React, { useEffect, useMemo, useState } from 'react';
import { X, Lock, CreditCard, Download, Mail } from 'lucide-react';
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
  onEmailChange,
  email,
  paymentState,
  amountInr = 49
}) {
  if (!open) return null;

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Step 1 — Render & download locked file';
    if (step === 2) return 'Step 2 — Pay & receive password by email';
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
                After payment, we email the ZIP password to unlock the file.
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

          {step >= 2 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <label className="block">
                <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email for password
                </span>
                <input
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-100 outline-none focus:border-indigo-500"
                />
              </label>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Amount</span>
                <span className="text-[11px] font-mono font-bold text-zinc-200">₹{amountInr}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <div className="text-[10px] text-zinc-600 min-w-0">
            {step === 1 && <span>Don’t close this tab while rendering.</span>}
            {step === 2 && <span>After payment, password is emailed automatically.</span>}
          </div>

          <button
            type="button"
            disabled={step !== 2 || !zipDownloaded || !email || paymentState === 'opening' || paymentState === 'waiting'}
            onClick={onStartPayment}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:pointer-events-none transition"
            title={zipDownloaded ? 'Pay with Razorpay' : 'Download locked zip first'}
          >
            <Download className="w-4 h-4" />
            <span>{paymentState === 'waiting' ? 'Waiting…' : 'Pay & Email Password'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper used by App.jsx (kept here to avoid duplicating script logic)
export async function startRazorpayCheckout({ keyId, orderId, amount, currency, email, onSuccess }) {
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
      prefill: { email },
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

