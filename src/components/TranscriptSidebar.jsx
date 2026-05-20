import React from 'react';
import { Trash2, Plus } from 'lucide-react';

export default function TranscriptSidebar({ captions, activeId, onUpdate, onAdd, onDelete }) {
  return (
    <div className="w-full h-full border-r border-zinc-900 bg-zinc-950 flex flex-col p-3 min-w-0">
      
      {/* Header Area with Flex Justification */}
      <div className="flex items-center justify-between gap-2 mb-4 shrink-0 min-w-0">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 truncate">
          Captions
        </h2>
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium py-1.5 px-3 rounded-lg transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span className="inline">Block</span>
        </button>
      </div>

      {/* Elastic Scrollable List Layer */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-w-0 custom-scrollbar">
        {captions.map((cap) => {
          const isActive = cap.id === activeId;
          
          return (
            <div
              key={cap.id}
              className={`p-2.5 rounded-xl border transition-all duration-200 flex flex-col gap-2 min-w-0 ${
                isActive
                  ? 'bg-indigo-600/10 border-indigo-500/80 shadow-md shadow-indigo-950/20'
                  : 'bg-zinc-900/20 border-zinc-900 hover:border-zinc-800'
              }`}
            >
              {/* Top Row Controls: Inputs and Trash Can Icon */}
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <div className="grid grid-cols-2 gap-1 flex-1 min-w-0">
                  <div className="flex items-center bg-zinc-900/60 border border-zinc-800/80 rounded-md px-1.5 py-1 min-w-0">
                    <span className="text-[9px] text-zinc-500 font-mono select-none mr-1 shrink-0">IN</span>
                    <input
                      type="number"
                      step="0.1"
                      value={cap.start}
                      onChange={(e) => onUpdate(cap.id, 'start', e.target.value)}
                      className="w-full bg-transparent text-[10px] font-mono text-zinc-300 focus:outline-none min-w-0"
                    />
                  </div>
                  <div className="flex items-center bg-zinc-900/60 border border-zinc-800/80 rounded-md px-1.5 py-1 min-w-0">
                    <span className="text-[9px] text-zinc-500 font-mono select-none mr-1 shrink-0">OUT</span>
                    <input
                      type="number"
                      step="0.1"
                      value={cap.end}
                      onChange={(e) => onUpdate(cap.id, 'end', e.target.value)}
                      className="w-full bg-transparent text-[10px] font-mono text-zinc-300 focus:outline-none min-w-0"
                    />
                  </div>
                </div>

                <button
                  onClick={() => onDelete(cap.id)}
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dynamic Subtitle Textarea Block Input */}
              <div className="w-full min-w-0">
                <textarea
                  value={cap.text}
                  rows={1}
                  onChange={(e) => onUpdate(cap.id, 'text', e.target.value)}
                  className="w-full bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-800 focus:border-indigo-500/50 rounded-lg p-2 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none transition-all dynamic-text-wrap"
                  placeholder="Enter lyric or narration segment..."
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}