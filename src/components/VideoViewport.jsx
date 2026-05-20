import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize2, Volume2, ZoomIn, Move } from 'lucide-react';

export default function VideoViewport({ 
  videoSrc, 
  videoRef, 
  isPlaying, 
  currentTime, 
  duration, 
  activeCaption,    
  captionStyles,    
  onTogglePlay, 
  onTimeUpdate, 
  onLoadedMetadata 
}) {
  // Pan and Zoom Tracking Vectors
  const [zoomScale, setZoomScale] = useState(100);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressBarClick = (e) => {
    if (!videoRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPositionX = e.clientX - rect.left;
    const newTime = (clickPositionX / rect.width) * duration;
    videoRef.current.currentTime = newTime;
  };

  // --- Pan Execution Flow (Drag and Drop Frame Logic) ---
  const handleMouseDown = (e) => {
    // Only allow dragging if zoomed in past baseline limits
    if (zoomScale <= 100) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset viewport orientation matrix
  const handleResetView = () => {
    setZoomScale(100);
    setPanPosition({ x: 0, y: 0 });
  };

  // Clean mouseup event handlers globally if mouse leaves bounding window frame
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging]);

  return (
    <div className="relative flex-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden flex flex-col justify-between p-3 h-full min-h-0 select-none backdrop-blur-sm">
      
      {/* 1. Main Canvas Monitoring Deck */}
      <div 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className={`relative flex-1 flex items-center justify-center min-h-0 w-full rounded-xl bg-zinc-950 border border-zinc-900/60 overflow-hidden group shadow-inner ${
          zoomScale > 100 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        
        {videoSrc ? (
          /* Production Scale Translation Transform Viewport Container */
          <div 
            style={{ 
              transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale / 100})`,
              transformOrigin: 'center center'
            }}
            className="relative max-h-full max-w-full w-full h-full flex items-center justify-center transition-transform duration-75 ease-out pointer-events-none"
          >
            <video
              ref={videoRef}
              src={videoSrc}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onClick={(e) => {
                // Prevent single play click from triggering canvas changes
                if (zoomScale <= 100) onTogglePlay();
              }}
              className="max-h-full max-w-full object-contain pointer-events-auto"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-500 font-mono text-xs">
            <span className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">🎬</span>
            <span>No active workspace sequence media loaded...</span>
          </div>
        )}

        {/* Floating Reset View Indicator Alert */}
        {zoomScale > 100 && (
          <button 
            onClick={handleResetView}
            className="absolute top-3 right-3 z-30 bg-zinc-900/80 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-white font-mono px-2 py-1 rounded border border-zinc-800 transition backdrop-blur"
          >
            Reset View
          </button>
        )}

        {/* 2. Captions Render Sub-Layer (Kept isolated from Panning translation shifts so subtitles stay perfectly locked on screen) */}
        {activeCaption && (
          <div 
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none select-none px-6 w-full max-w-[85%] z-20"
            style={{
              fontFamily: activeCaption.fontFamily || captionStyles.fontFamily,
              fontSize: activeCaption.fontSize || captionStyles.fontSize,
              fontWeight: activeCaption.fontWeight || captionStyles.fontWeight,
              fontStyle: activeCaption.fontStyle || captionStyles.fontStyle,
              color: activeCaption.color || captionStyles.color,
              textTransform: activeCaption.textTransform || captionStyles.textTransform,
              textShadow: '0px 2px 4px rgba(0,0,0,0.9), 0px 4px 12px rgba(0,0,0,0.5), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              letterSpacing: '0.02em',
              lineHeight: '1.2'
            }}
          >
            {activeCaption.text}
          </div>
        )}
      </div>

      {/* 3. Transport Control Deck Area */}
      <div className="flex flex-col gap-2.5 mt-3 pt-2 border-t border-zinc-900 shrink-0">
        
        {/* Scrub Track timeline bar */}
        <div 
          onClick={handleProgressBarClick}
          className="w-full h-1 bg-zinc-800 hover:h-1.5 rounded-full cursor-pointer relative group transition-all duration-150"
        >
          <div 
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-indigo-500 rounded-full relative"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform duration-150" />
          </div>
        </div>

        {/* System Action buttons loop */}
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onTogglePlay}
              className={`p-1.5 rounded-lg border text-zinc-300 transition-all active:scale-90 ${
                isPlaying 
                  ? 'bg-zinc-800 border-zinc-700 text-white shadow-md' 
                  : 'bg-zinc-950 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            
            <div className="text-[11px] font-mono font-medium text-zinc-400 select-none tracking-tight">
              <span className="text-zinc-200">{formatTime(currentTime)}</span>
              <span className="text-zinc-600 mx-1">/</span>
              <span className="text-zinc-500">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Dynamic Slider Console Panel */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 px-2 py-1 rounded-lg shrink-0">
            {zoomScale > 100 ? <Move className="w-3 h-3 text-indigo-400" /> : <ZoomIn className="w-3 h-3 text-zinc-500" />}
            <input 
              type="range"
              min="100" // Clamped at 100% minimum so users don't break aspect ratio scales negatively
              max="400" // Max out at 400% zoom depth tracking 
              value={zoomScale}
              onChange={(e) => {
                const nextScale = Number(e.target.value);
                setZoomScale(nextScale);
                if (nextScale <= 100) setPanPosition({ x: 0, y: 0 }); // Clean pan offset matrix if restored to normal sizing bounds
              }}
              className="w-16 md:w-24 h-1 bg-zinc-800 appearance-none rounded-lg cursor-pointer accent-indigo-500 focus:outline-none"
            />
            <span className="text-[9px] font-mono font-bold text-zinc-400 min-w-[28px] text-right">
              {zoomScale}%
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <button className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition">
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}