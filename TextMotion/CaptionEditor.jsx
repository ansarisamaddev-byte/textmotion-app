import React, { useState, useEffect } from 'react';
import { Edit3, Trash2, Plus, Check, Clock, AlertCircle } from 'lucide-react';

export default function CaptionEditor({ initialCaptions, onCaptionsChange, onPreviewSegment }) {
  const [captions, setCaptions] = useState(initialCaptions || []);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ text: '', start: 0, end: 0 });

  // Watch for incoming webhook data updates from parent state
  useEffect(() => {
    if (initialCaptions) {
      setCaptions(initialCaptions);
    }
  }, [initialCaptions]);

  const startEditing = (caption) => {
    setEditingId(caption.id);
    setEditForm({ text: caption.text, start: caption.start, end: caption.end });
  };

  const saveEdit = (id) => {
    // FIXED: Corrected mapping syntax closure bracket here
    const updated = captions.map((cap) => {
      if (cap.id === id) {
        return {
          ...cap,
          text: editForm.text,
          start: parseFloat(editForm.start) || 0,
          end: parseFloat(editForm.end) || 0
        };
      }
      return cap;
    });
    
    updated.sort((a, b) => a.start - b.start);
    
    setCaptions(updated);
    setEditingId(null);
    if (onCaptionsChange) onCaptionsChange(updated);
  };

  const deleteCaption = (id) => {
    const filtered = captions.filter((cap) => cap.id !== id);
    setCaptions(filtered);
    if (onCaptionsChange) onCaptionsChange(filtered);
  };

  const addNewCaptionBlock = () => {
    const lastBlock = captions[captions.length - 1];
    const newStart = lastBlock ? lastBlock.end + 0.2 : 0;
    const newBlock = {
      id: `webhook_added_${Date.now()}`,
      text: 'New subtitle text line...',
      start: parseFloat(newStart.toFixed(2)),
      end: parseFloat((newStart + 2.0).toFixed(2))
    };
    
    const updated = [...captions, newBlock];
    setCaptions(updated);
    if (onCaptionsChange) onCaptionsChange(updated);
    startEditing(newBlock);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between p-4 bg-zinc-900/50 border-b border-zinc-800/80">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-zinc-100 tracking-wide uppercase flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-indigo-400" />
            Transcribed Layers Manager
          </h3>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Adjust timing offsets or text hooks manually</p>
        </div>
        <button
          onClick={addNewCaptionBlock}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-md transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Layer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar max-h-[480px]">
        {captions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-zinc-800 rounded-xl text-zinc-500 my-auto">
            <AlertCircle className="w-8 h-8 text-zinc-600 mb-2" />
            <span className="text-xs font-mono">No webhook sequence payload detected.</span>
          </div>
        ) : (
          captions.map((cap, idx) => {
            const isEditing = editingId === cap.id;

            return (
              <div
                key={cap.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'bg-indigo-950/20 border-indigo-500/80 shadow-lg shadow-indigo-950/40'
                    : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900/80 hover:border-zinc-700'
                }`}
              >
                <span className="text-[10px] font-mono font-bold text-zinc-600 min-w-[20px]">
                  #{String(idx + 1).padStart(2, '0')}
                </span>

                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.text}
                      onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                      className="w-full bg-zinc-950 text-sm border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  ) : (
                    <div 
                      onClick={() => onPreviewSegment && onPreviewSegment(cap.start)}
                      className="text-sm font-medium text-zinc-200 cursor-pointer hover:text-indigo-400 transition truncate max-w-[120px] sm:max-w-none"
                    >
                      {cap.text || <span className="text-zinc-600 italic">(Empty sequence text line)</span>}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px]">
                  {isEditing ? (
                    <div className="flex items-center gap-1 text-zinc-400 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800">
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.start}
                        onChange={(e) => setEditForm({ ...editForm, start: e.target.value })}
                        className="w-12 bg-transparent text-center focus:outline-none text-zinc-200"
                      />
                      <span>➔</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.end}
                        onChange={(e) => setEditForm({ ...editForm, end: e.target.value })}
                        className="w-12 bg-transparent text-center focus:outline-none text-zinc-200"
                      />
                    </div>
                  ) : (
                    <div 
                      onClick={() => onPreviewSegment && onPreviewSegment(cap.start)}
                      className="flex items-center gap-1.5 text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition"
                    >
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span className="text-zinc-300">{cap.start.toFixed(2)}s</span>
                      <span>-</span>
                      <span className="text-zinc-400">{cap.end.toFixed(2)}s</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 border-l border-zinc-800/80 pl-2">
                  {isEditing ? (
                    <button
                      onClick={() => saveEdit(cap.id)}
                      className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-md transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startEditing(cap)}
                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 rounded-md transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteCaption(cap.id)}
                    className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-md transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}