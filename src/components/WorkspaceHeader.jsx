import React from 'react';
import { Upload, Download } from 'lucide-react';

export default function WorkspaceHeader({ 
  onVideoUpload, 
  onExport, 
  isExporting, 
  exportProgress, 
  hasVideo 
}) {
  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-50">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm tracking-tighter text-white shadow-lg shadow-indigo-500/20">
          TM
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-zinc-100">TextMotion Pro</h1>
          <p className="text-[10px] text-zinc-500 font-mono">v1.0.0 // Active Sequence</p>
        </div>
      </div>

      {/* Action Control Group */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer transition-all active:scale-95 select-none">
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span>Import Video</span>
          <input 
            type="file" 
            accept="video/*" 
            onChange={onVideoUpload} 
            className="hidden" 
          />
        </label>

        {hasVideo && (
          <button
            onClick={onExport}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all select-none shadow-lg ${
              isExporting
                ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10 active:scale-95'
            }`}
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-pulse text-zinc-500' : 'text-indigo-200'}`} />
            <span>
              {isExporting ? `Exporting (${exportProgress}%)` : 'Export Video'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}