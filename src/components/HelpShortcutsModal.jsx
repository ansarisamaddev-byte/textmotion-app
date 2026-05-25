import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../constants/shortcuts';

export default function HelpShortcutsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-zinc-100">Keyboard shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-4 space-y-1">
          {KEYBOARD_SHORTCUTS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-4 py-2 px-2 rounded-lg hover:bg-zinc-800/50"
            >
              <span className="text-xs text-zinc-400">{item.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((key, i) => (
                  <kbd
                    key={i}
                    className="px-1.5 py-0.5 min-w-[1.5rem] text-center text-[10px] font-mono font-semibold text-zinc-200 bg-zinc-950 border border-zinc-700 rounded shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="px-5 py-3 text-[10px] text-zinc-600 border-t border-zinc-800">
          Shortcuts are disabled while typing in text fields.
        </p>
      </div>
    </div>
  );
}
