import React, { useState } from 'react';
import { Trash2, Plus, GripVertical } from 'lucide-react';

export default function TranscriptSidebar({
  captions,
  activeId,
  selectedIds = [],
  onSelectCaption,
  onUpdate,
  onUpdateCommit,
  onAdd,
  onDelete,
  onReorder
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex !== null && dragIndex !== index) {
      setHoverIndex(index);
    }
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = dragIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!Number.isNaN(fromIndex) && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
    setDragIndex(null);
    setHoverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setHoverIndex(null);
  };

  return (
    <div className="w-full h-full border-r border-zinc-900 bg-zinc-950 flex flex-col p-3 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-4 shrink-0 min-w-0">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 truncate">Captions</h2>
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium py-1.5 px-3 rounded-lg transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span className="inline">Block</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-w-0 custom-scrollbar">
        {captions.map((cap, index) => {
          const isActive = cap.id === activeId;
          const isSelected = selectedIds.includes(cap.id);
          const isDragging = dragIndex === index;
          const isDropTarget = hoverIndex === index && dragIndex !== null && dragIndex !== index;

          return (
            <div
              key={cap.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectCaption?.(cap.id)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col gap-2 min-w-0 ${
                isDragging ? 'opacity-40 scale-[0.98]' : ''
              } ${
                isDropTarget ? 'border-indigo-400 ring-2 ring-indigo-500/40' : ''
              } ${
                isSelected
                  ? 'bg-indigo-600/10 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                  : isActive
                    ? 'bg-zinc-800/50 border-zinc-700 text-zinc-200'
                    : 'bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <div
                  className="p-1 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 shrink-0 touch-none"
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Drag to reorder"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
                <div className="grid grid-cols-2 gap-1 flex-1 min-w-0">
                  <div className="flex items-center bg-zinc-900/60 border border-zinc-800/80 rounded-md px-1.5 py-1 min-w-0">
                    <input
                      type="number"
                      step="0.1"
                      value={cap.start}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdate(cap.id, 'start', e.target.value)}
                      onBlur={() => onUpdateCommit?.(cap.id, 'start')}
                      className="w-full bg-transparent text-[10px] font-mono text-zinc-300 focus:outline-none min-w-0"
                    />
                  </div>
                  <div className="flex items-center bg-zinc-900/60 border border-zinc-800/80 rounded-md px-1.5 py-1 min-w-0">
                    <input
                      type="number"
                      step="0.1"
                      value={cap.end}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdate(cap.id, 'end', e.target.value)}
                      onBlur={() => onUpdateCommit?.(cap.id, 'end')}
                      className="w-full bg-transparent text-[10px] font-mono text-zinc-300 focus:outline-none min-w-0"
                    />
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(cap.id);
                  }}
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-full min-w-0">
                <textarea
                  value={cap.text}
                  rows={1}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdate(cap.id, 'text', e.target.value)}
                  onBlur={() => onUpdateCommit?.(cap.id, 'text')}
                  className="w-full bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-800 focus:border-indigo-500/50 rounded-lg p-2 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none transition-all"
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
