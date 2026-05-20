import React, { useRef, useState, useEffect } from 'react';
import { Clock, Film, ZoomIn, ZoomOut } from 'lucide-react';

export default function TimelineTrack({ videoSrc, captions, currentTime, duration, activeId, onSeek }) {
  const trackRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1x to 5x zoom scale
  const [thumbnails, setThumbnails] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Programmatically extract frames from the video source file
  useEffect(() => {
    if (!videoSrc || !duration || duration <= 0) {
      setThumbnails([]);
      return;
    }

    const generateThumbnails = async () => {
      setIsGenerating(true);
      const generatedImages = [];
      const numberOfThumbnails = 15; // Target density across the standard view
      const interval = duration / numberOfThumbnails;

      // Create an isolated headless video element for background frame rendering
      const hiddenVideo = document.createElement('video');
      hiddenVideo.src = videoSrc;
      hiddenVideo.muted = true;
      hiddenVideo.playsInline = true;
      hiddenVideo.crossOrigin = 'anonymous';

      // Create a canvas to extract frames
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Wait for metadata to load so we know dimensions
      await new Promise((resolve) => {
        hiddenVideo.onloadedmetadata = () => {
          // Keep canvas dimensions reasonable for fast processing and low memory
          canvas.width = 160;
          canvas.height = 90;
          resolve();
        };
      });

      // Seek and snap pictures at discrete points
      for (let i = 0; i < numberOfThumbnails; i++) {
        const targetTime = i * interval;
        hiddenVideo.currentTime = targetTime;

        await new Promise((resolve) => {
          hiddenVideo.onseeked = () => {
            if (ctx) {
              ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
              generatedImages.push({
                time: targetTime,
                url: canvas.toDataURL('image/jpeg', 0.6) // Compressed JPG for optimal UI performance
              });
            }
            resolve();
          };
        });
      }

      setThumbnails(generatedImages);
      setIsGenerating(false);
    };

    generateThumbnails();
  }, [videoSrc, duration]);

  // 2. Adjust click-to-seek formulas to account for the scaled scrollable container width
  const handleTrackClick = (e) => {
    if (!trackRef.current || !duration) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(percentage * duration);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity) return '0.0';
    return seconds.toFixed(1);
  };

  // Generate ticks according to current zoom factor
  const generateTimeTicks = () => {
    if (!duration || duration <= 0) return [];
    // If zoomed in, show ticks more frequently (e.g., 0.5s intervals)
    const step = zoomLevel > 3 ? 0.5 : zoomLevel > 1.5 ? 1 : 2;
    const ticks = [];
    for (let i = 0; i <= duration; i += step) {
      ticks.push(i);
    }
    return ticks;
  };

  // Base layout sizing calculation
  const timelineWidthStyle = { width: `${zoomLevel * 100}%` };

  return (
    <footer className="h-56 border-t border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3 select-none">
      
      {/* Control Header Strip */}
      <div className="flex items-center justify-between text-[11px] font-mono px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>PLAYHEAD: <span className="text-zinc-200 font-bold">{formatTime(currentTime)}s</span></span>
          </div>
          <div className="text-zinc-500 hidden sm:block">
            TOTAL DURATION: <span className="text-zinc-300">{formatTime(duration)}s</span>
          </div>
          {isGenerating && (
            <span className="text-amber-400 text-[10px] animate-pulse bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Generating Filmstrip Frames...
            </span>
          )}
        </div>

        {/* Interactive Zoom Controls UI Slider layout */}
        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
          <button 
            onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.5))}
            disabled={zoomLevel <= 1}
            className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-zinc-400 min-w-[32px] text-center font-bold">
            {zoomLevel.toFixed(1)}x
          </span>
          <button 
            onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.5))}
            disabled={zoomLevel >= 5}
            className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Scrollable Timeline viewport */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800/60 rounded-xl overflow-x-auto overflow-y-hidden relative custom-scrollbar"
      >
        <div 
          ref={trackRef}
          style={timelineWidthStyle}
          className="h-full flex flex-col relative min-w-full transition-all duration-150 ease-out"
        >
          
          {/* 1. Dynamic Timestamp Ruler Track */}
          <div className="h-6 bg-zinc-900/60 border-b border-zinc-800/80 relative flex items-end pb-1 overflow-hidden pointer-events-none">
            {duration > 0 && generateTimeTicks().map((tick) => {
              const leftPct = (tick / duration) * 100;
              return (
                <div 
                  key={tick} 
                  className="absolute transform -translate-x-1/2 flex flex-col items-center gap-0.5"
                  style={{ left: `${leftPct}%` }}
                >
                  <span className="text-[9px] font-mono text-zinc-500 font-semibold">{tick.toFixed(1)}s</span>
                  <div className="w-0.5 h-1.5 bg-zinc-700" />
                </div>
              );
            })}
          </div>

          {/* 2. Interactive Tracks Sandbox Canvas */}
          <div 
            onClick={handleTrackClick}
            className="flex-1 relative cursor-ew-resize group/track flex flex-col justify-center gap-1.5 p-2"
          >
            {/* Playhead Overlay Layer */}
            {duration > 0 && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-zinc-950 shadow" />
              </div>
            )}

            {/* Track Layer A: Filmstrip Video Track Preview Canvas Container */}
            <div className="h-14 bg-zinc-900/20 border border-zinc-800/50 rounded-lg relative overflow-hidden flex items-center">
              {thumbnails.length > 0 ? (
                <div className="absolute inset-0 flex w-full h-full">
                  {thumbnails.map((thumb, index) => (
                    <div 
                      key={index} 
                      className="flex-1 h-full border-r border-zinc-950/40 relative overflow-hidden group/frame"
                      style={{ background: '#0e0e11' }}
                    >
                      <img 
                        src={thumb.url} 
                        alt={`Frame at ${thumb.time}s`} 
                        className="w-full h-full object-cover opacity-60 group-hover/frame:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 text-zinc-600 z-10">
                  <Film className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">
                    {videoSrc ? "Loading sequence strip..." : "No Video context loaded"}
                  </span>
                </div>
              )}
            </div>

            {/* Track Layer B: Text Subtitle Elements Sequence Track */}
            <div className="h-9 relative flex items-center">
              {duration > 0 && captions.map((cap) => {
                const leftPct = (cap.start / duration) * 100;
                const widthPct = ((cap.end - cap.start) / duration) * 100;
                const isHighlighted = cap.id === activeId;
                
                return (
                  <div
                    key={cap.id}
                    className={`absolute h-8 rounded-md text-[10px] px-2 flex items-center border font-medium overflow-hidden whitespace-nowrap text-ellipsis transition-all duration-150 shadow-sm ${
                      isHighlighted 
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-100 z-10 shadow-indigo-500/10' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                    style={{ 
                      left: `${leftPct}%`, 
                      width: `${widthPct}%`,
                      minWidth: '40px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(cap.start);
                    }}
                  >
                    <span className="truncate">{cap.text || "(Empty Text Block)"}</span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}