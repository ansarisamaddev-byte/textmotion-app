import React from 'react';

export default function TimelineTrack({ captions, currentTime, duration, activeId }) {
  return (
    <footer className="h-28 border-t border-zinc-800 bg-zinc-900/30 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono px-1">
        <span>TIMELINE BASELINE TRACK</span>
        <span>Duration: {duration ? `${duration.toFixed(1)}s` : '0.0s'}</span>
      </div>
      
      <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-xl relative overflow-hidden">
        {/* Playhead Tracking Bar */}
        {duration > 0 && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.7)]"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        )}
        
        {/* Render Block Blocks */}
        <div className="absolute inset-0 flex items-center px-2">
          {duration > 0 && captions.map((cap) => {
            const leftPct = (cap.start / duration) * 100;
            const widthPct = ((cap.end - cap.start) / duration) * 100;
            
            return (
              <div
                key={cap.id}
                className={`absolute h-8 rounded-md text-[10px] px-2 flex items-center border font-medium overflow-hidden whitespace-nowrap text-ellipsis ${
                  cap.id === activeId 
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '20px' }}
              >
                {cap.text}
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
}