import React from 'react';
import { Type, Plus, Trash2 } from 'lucide-react';

export default function TranscriptSidebar({ captions, activeId, onUpdate, onAdd, onDelete }) {
  return (
    <aside className="w-[380px] border-r border-zinc-800 bg-zinc-900/20 flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Captions Timelines</h2>
        </div>
        <button 
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Block
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {captions.map((cap) => (
          <div 
            key={cap.id} 
            className={`p-3 rounded-xl border transition-all duration-150 flex flex-col gap-2.5 ${
              cap.id === activeId 
                ? 'bg-zinc-800/80 border-indigo-500/60 shadow-md' 
                : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <input 
                  type="number" 
                  step="0.1"
                  value={cap.start} 
                  onChange={(e) => onUpdate(cap.id, 'start', e.target.value)}
                  className="w-14 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-zinc-400 text-center focus:outline-none focus:border-indigo-500"
                />
                <span className="text-zinc-600 text-xs">→</span>
                <input 
                  type="number" 
                  step="0.1"
                  value={cap.end} 
                  onChange={(e) => onUpdate(cap.id, 'end', e.target.value)}
                  className="w-14 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-zinc-400 text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                onClick={() => onDelete(cap.id)}
                className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              value={cap.text}
              onChange={(e) => onUpdate(cap.id, 'text', e.target.value)}
              className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-none h-14 leading-relaxed"
              placeholder="Type line text..."
            />
          </div>
        ))}
      </div>
    </aside>
  );
}
