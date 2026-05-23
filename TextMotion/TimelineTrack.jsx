// Inside TimelineTrack.jsx
export default function TimelineTrack({ 
  videoSrc, 
  captions, 
  currentTime, 
  duration, 
  activeId, 
  selectedIds = [], 
  onSelectCaption, 
  onSeek,
  // ⚡ Accept the dynamic height parameter passed down from your resize handler wrapper
  timelineHeight 
}) {
  return (
    // Remove the rigid styling anchors; flex-1 and h-full allow this track to absorb the container sizing
    <div className="w-full h-full p-3 relative bg-zinc-950 flex flex-col min-h-0 select-none">
      
      {/* 🗜️ DYNAMIC FLEX CONTAINER: Height responds instantly to timelineHeight adjustments */}
      <div 
        className="relative w-full flex-1 bg-zinc-900/40 rounded-xl border border-zinc-800/60 overflow-hidden"
      >
        {captions.map((caption) => {
          const isCurrentActive = activeId === caption.id;
          const isUserSelected = selectedIds.includes(caption.id);
          const isHighlighted = isCurrentActive || isUserSelected;

          const leftPercent = duration > 0 ? (caption.start / duration) * 100 : 0;
          const widthPercent = duration > 0 ? ((caption.end - caption.start) / duration) * 100 : 0;

          return (
            <div
              key={caption.id}
              onClick={(e) => {
                e.stopPropagation(); 
                if (onSelectCaption) onSelectCaption(caption.id);
              }}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              // 📐 Replacing top-4 bottom-4 with a percentage-based margin (top-[15%] bottom-[15%])
              // This ensures the block shrinks gracefully without spilling outside the frame when squeezed!
              className={`absolute top-[15%] bottom-[15%] rounded-lg px-3 flex items-center justify-center border text-[11px] font-medium transition-all cursor-pointer overflow-hidden ${
                isHighlighted
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/5 font-bold'
                  : 'bg-zinc-900/90 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <span className="truncate max-w-full tracking-wide px-1">
                {caption.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}