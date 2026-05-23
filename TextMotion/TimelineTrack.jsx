// Inside TimelineTrack.jsx
export default function TimelineTrack({ 
  videoSrc, 
  captions, 
  currentTime, 
  duration, 
  activeId, 
  selectedIds = [], // Fallback default array
  onSelectCaption, 
  onSeek 
}) {
  return (
    <div className="w-full h-full p-4 relative bg-zinc-900 border-t border-zinc-800">
      {/* ... layout timeline boundaries and scrub bars ... */}
      
      <div className="relative w-full h-24 bg-zinc-950/60 rounded-xl border border-zinc-800/80 overflow-hidden">
        {captions.map((caption) => {
          // Check if this block matches current playback time OR if the user manually clicked it
          const isCurrentActive = activeId === caption.id;
          const isUserSelected = selectedIds.includes(caption.id);
          const isHighlighted = isCurrentActive || isUserSelected;

          // Convert timeline timestamps to percentages for absolute layout styling position
          const leftPercent = duration > 0 ? (caption.start / duration) * 100 : 0;
          const widthPercent = duration > 0 ? ((caption.end - caption.start) / duration) * 100 : 0;

          return (
            <div
              key={caption.id}
              onClick={(e) => {
                e.stopPropagation(); // Stop timeline track click bubbles from breaking selection
                if (onSelectCaption) onSelectCaption(caption.id);
              }}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              className={`absolute top-4 bottom-4 rounded-lg px-2 flex items-center justify-center border text-[10px] font-mono transition-all cursor-pointer select-none overflow-hidden ${
                isHighlighted
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10 font-bold'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <span className="truncate max-w-full">
                {caption.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}