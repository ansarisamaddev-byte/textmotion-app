import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Clock, Film, ZoomIn, ZoomOut } from 'lucide-react';

export default function TimelineTrack({ videoSrc, captions = [], currentTime, duration, activeId, onSeek, onSelectCaption }) {
  const trackRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1); 
  const [thumbnails, setThumbnails] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!videoSrc || !duration || duration <= 0) {
      setThumbnails([]);
      return;
    }

    let isCurrentGeneration = true;
    let hiddenVideo = null;

    const generateThumbnails = async () => {
      setIsGenerating(true);
      const generatedImages = [];
      const numberOfThumbnails = 12; 
      const interval = duration / numberOfThumbnails;

      try {
        hiddenVideo = document.createElement('video');
        hiddenVideo.src = videoSrc;
        hiddenVideo.muted = true;
        hiddenVideo.playsInline = true;
        hiddenVideo.setAttribute('preload', 'auto');
        hiddenVideo.crossOrigin = 'anonymous';

        hiddenVideo.style.position = 'fixed';
        hiddenVideo.style.pointerEvents = 'none';
        hiddenVideo.style.opacity = '0.001';
        hiddenVideo.style.width = '1px';
        hiddenVideo.style.height = '1px';
        document.body.appendChild(hiddenVideo);

        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');

        await new Promise((resolve, reject) => {
          if (hiddenVideo.readyState >= 2) resolve();
          else {
            hiddenVideo.onloadeddata = () => resolve();
            hiddenVideo.onerror = () => reject(new Error("Video element extraction failed"));
          }
        });

        for (let i = 0; i < numberOfThumbnails; i++) {
          if (!isCurrentGeneration) break;

          const targetTime = Math.min(duration - 0.1, i * interval);
          hiddenVideo.currentTime = targetTime;

          await new Promise((resolve) => {
            const handleSeeked = () => {
              hiddenVideo.removeEventListener('seeked', handleSeeked);
              if (ctx && isCurrentGeneration) {
                try {
                  ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
                  generatedImages.push({
                    time: targetTime,
                    url: canvas.toDataURL('image/jpeg', 0.4)
                  });
                } catch (err) {
                  console.warn("Canvas parsing skipped:", err);
                }
              }
              resolve();
            };
            hiddenVideo.addEventListener('seeked', handleSeeked);
            setTimeout(handleSeeked, 400);
          });
        }

        if (isCurrentGeneration && generatedImages.length > 0) {
          setThumbnails(generatedImages);
        }
      } catch (error) {
        console.error("Timeline thumbnail pipeline exception:", error);
      } finally {
        if (isCurrentGeneration) setIsGenerating(false);
        if (hiddenVideo && hiddenVideo.parentNode) {
          hiddenVideo.parentNode.removeChild(hiddenVideo);
        }
      }
    };

    generateThumbnails();

    return () => {
      isCurrentGeneration = false;
      if (hiddenVideo && hiddenVideo.parentNode) {
        hiddenVideo.parentNode.removeChild(hiddenVideo);
      }
    };
  }, [videoSrc, duration]);

  // 🔥 HIGH-PRECISION TICK ENGINE
  const ticks = useMemo(() => {
    if (!duration || duration <= 0) return [];

    let step = 2.0;         
    let showLabelsOn = 2.0; 

    if (zoomLevel >= 5.0) {
      step = 0.1;           
      showLabelsOn = 0.5;   
    } else if (zoomLevel >= 3.5) {
      step = 0.2;           
      showLabelsOn = 1.0;   
    } else if (zoomLevel >= 2.0) {
      step = 0.5;           
      showLabelsOn = 1.0;   
    } else if (zoomLevel >= 1.5) {
      step = 1.0;           
      showLabelsOn = 1.0;
    }

    const generatedTicks = [];
    for (let time = 0; time <= duration + 0.001; time = parseFloat((time + step).toFixed(1))) {
      if (time > duration) break;

      // FIXED: Force standard integer comparison to strip decimal trails safely (e.g. 1s instead of 1.0s)
      const isWholeSecond = Math.abs(time - Math.round(time)) < 0.001;
      const displayLabel = isWholeSecond ? `${Math.round(time)}s` : `${time.toFixed(1)}s`;
      
      const isLabelVisible = parseFloat((time % showLabelsOn).toFixed(1)) === 0 || time === 0;
      const isSubTick = !isWholeSecond;

      generatedTicks.push({
        time,
        label: displayLabel,
        positionPct: (time / duration) * 100,
        showLabel: isLabelVisible,
        isSubTick
      });
    }
    return generatedTicks;
  }, [duration, zoomLevel]);

  const handleTrackClick = (e) => {
    if (!trackRef.current || !duration) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(percentage * duration);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity) return '0.00';
    return seconds.toFixed(2);
  };

  return (
    <footer className="h-56 border-t border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-3 select-none">
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
            <span className="text-indigo-400 text-[10px] animate-pulse bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Generating filmstrip preview...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800/60">
          <button onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.5))} disabled={zoomLevel <= 1} className="text-zinc-400 hover:text-white disabled:opacity-30">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-zinc-400 min-w-[32px] text-center font-bold">{zoomLevel.toFixed(1)}x</span>
          <button onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.5))} disabled={zoomLevel >= 5} className="text-zinc-400 hover:text-white disabled:opacity-30">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div ref={scrollContainerRef} className="flex-1 flex flex-col bg-zinc-900/20 border border-zinc-800/60 overflow-x-auto overflow-y-hidden relative custom-scrollbar">
        <div ref={trackRef} style={{ width: `${zoomLevel * 100}%` }} className="h-full flex flex-col relative min-w-full">
          
          {/* 🔥 FIXED RULER: 
            Increased height from h-6 to h-8, added pt-1.5 padding to clear text cut-offs completely.
          */}
          <div className="h-8 bg-zinc-900/40 border-b border-zinc-800/50 relative flex items-end pb-1 pt-1.5 overflow-hidden pointer-events-none">
            {ticks.map((tick, idx) => (
              <div 
                key={idx} 
                className="absolute transform -translate-x-1/2 flex flex-col items-center justify-end h-full w-8" 
                style={{ left: `${tick.positionPct}%` }}
              >
                {tick.showLabel && (
                  <span className="text-[8px] font-mono text-zinc-400 tracking-tighter mb-1 block leading-none">
                    {tick.label}
                  </span>
                )}
                <div 
                  className={`w-0.5 transition-all duration-100 ${
                    tick.isSubTick 
                      ? 'h-1 bg-zinc-800/60' 
                      : 'h-2.5 bg-zinc-700'  
                  }`} 
                />
              </div>
            ))}
          </div>

          {/* Interactive Core Tracks Area */}
          <div onClick={handleTrackClick} className="flex-1 relative cursor-ew-resize flex flex-col justify-center gap-2 p-2">
            
            {/* Red Playhead Vertical Marker */}
            {duration > 0 && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ left: `${(currentTime / duration) * 100}%` }}>
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-zinc-950" />
              </div>
            )}

            {/* Video Thumbnail Filmstrip Strip */}
            <div className="h-12 bg-zinc-950 border border-zinc-800/60 rounded-lg relative overflow-hidden flex items-center w-full">
              {thumbnails.length > 0 ? (
                <div className="absolute inset-0 flex w-full h-full">
                  {thumbnails.map((thumb, idx) => (
                    <div key={idx} className="flex-1 h-full border-r border-zinc-900/40 last:border-0 overflow-hidden">
                      <img src={thumb.url} alt="" className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 text-zinc-600 z-10">
                  <Film className="w-3.5 h-3.5 text-indigo-500/70" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">
                    {videoSrc ? "Processing filmstrip tracks..." : "No Video context loaded"}
                  </span>
                </div>
              )}
            </div>

            {/* Subtitle Blocks Sub-track Layer */}
            <div className="h-10 relative flex items-center">
              {duration > 0 && captions.map((cap, orderIndex) => {
                const leftPct = (cap.start / duration) * 100;
                const widthPct = ((cap.end - cap.start) / duration) * 100;
                return (
                  <div
                    key={cap.id}
                    className={`absolute h-8 rounded-md text-[10px] pl-6 pr-2 flex items-center gap-1 border font-medium overflow-hidden whitespace-nowrap text-ellipsis cursor-pointer transition-all ${
                      cap.id === activeId ? 'bg-indigo-500/25 border-indigo-400 text-indigo-100 z-10 shadow-sm ring-1 ring-indigo-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '48px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCaption?.(cap.id);
                      onSeek(cap.start);
                    }}
                    title={`#${orderIndex + 1}: ${cap.text || 'Empty'}`}
                  >
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-indigo-400/90 min-w-[12px]">
                      {orderIndex + 1}
                    </span>
                    <span className="truncate w-full text-left">{cap.text || '(Empty)'}</span>
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