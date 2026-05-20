import React from 'react';
import { Video, Upload } from 'lucide-react';

export default function WorkspaceHeader({ onVideoUpload }) {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <Video className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm tracking-wide text-zinc-200">
          TextMotion <span className="text-indigo-400 text-[10px] font-mono px-1.5 py-0.5 bg-indigo-950/50 rounded border border-indigo-900/40 ml-1">Alpha</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <label className="cursor-pointer flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-1.5 rounded-lg text-xs font-medium transition">
          <Upload className="w-3.5 h-3.5" />
          Load Video
          <input type="file" accept="video/*" onChange={onVideoUpload} className="hidden" />
        </label>
      </div>
    </header>
  );
}