import React from 'react';

export default function ExportOverlay({ exportProgress, onCancel }) {
  return (
    <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-xs z-[9999] flex flex-col items-center justify-center">
      <div className="bg-zinc-900/95 border border-zinc-800/80 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center gap-5">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin" />
          <span className="text-sm font-mono font-bold text-indigo-400">{exportProgress}%</span>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-zinc-100 tracking-wide uppercase">Exporting Project Video</h3>
          <p className="text-xs text-zinc-400 max-w-[240px]">Compiling frames and merging caption overlays...</p>
        </div>
        <div className="w-full bg-zinc-950 rounded-full h-1.5 border border-zinc-800/50 p-0.5 overflow-hidden">
          <div style={{ width: `${exportProgress}%` }} className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out" />
        </div>
        <button type="button" onClick={onCancel} className="mt-1 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg transition active:scale-95 cursor-pointer">
          Cancel Export
        </button>
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest animate-pulse mt-1">Please keep this tab open</span>
      </div>
    </div>
  );
}
