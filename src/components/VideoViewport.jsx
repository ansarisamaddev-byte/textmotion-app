import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize2, Volume2, ZoomIn, Move } from 'lucide-react';
import { renderCaptionFrame } from '../App';

export default function VideoViewport({ 
  videoSrc, 
  videoRef, 
  isPlaying, 
  currentTime, 
  duration, 
  activeCaption,    
  captions, 
  captionStyles,    
  onTogglePlay, 
  onTimeUpdate, 
  onLoadedMetadata 
}) {
  const [zoomScale, setZoomScale] = useState(100);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0 });
  const previewCanvasRef = useRef(null);

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

  const handleMouseDown = (e) => {
    if (zoomScale <= 100 || !videoSrc) return;
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

  const handleResetView = () => {
    setZoomScale(100);
    setPanPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging]);

// 🔥 FIXED: Bulletproof Canvas Frame Synchronization Loop
useEffect(() => {
  const video = videoRef.current;
  const canvas = previewCanvasRef.current;
  if (!video || !canvas || !videoSrc) return;

  const ctx = canvas.getContext('2d');
  let frameId = null;

  const syncCanvasAndDraw = (shouldClear = false) => {
    // 1. Align resolution grids cleanly
    if (video.videoWidth && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // 2. Only clear when explicitly requested (during active playback loops)
    if (shouldClear) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // 3. Paint both video and subtitle matrix strings
    renderCaptionFrame(ctx, canvas, video, captions || [], captionStyles);
  };

  const playbackLoop = () => {
    // Clear is safe here because frames are streaming constantly at 60Hz
    syncCanvasAndDraw(true); 
    if (!video.paused && !video.ended) {
      frameId = requestAnimationFrame(playbackLoop);
    }
  };

  if (isPlaying) {
    frameId = requestAnimationFrame(playbackLoop);
  } else {
    // 🔥 THE FIX: Draw instantly WITHOUT clearing the canvas first.
    // This safely preserves the last rendered video frame image array perfectly.
    syncCanvasAndDraw(false);
  }

  return () => {
    if (frameId) cancelAnimationFrame(frameId);
  };
}, [isPlaying, currentTime, captions, captionStyles, videoSrc, videoRef]);

  return (
    <div className="relative flex-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden flex flex-col justify-between p-3 h-full min-h-0 select-none backdrop-blur-sm">
      
      {/* Main Monitoring Deck */}
      <div 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className={`relative flex-1 flex items-center justify-center min-h-0 w-full rounded-xl bg-zinc-950 border border-zinc-900/60 overflow-hidden group shadow-inner ${
          zoomScale > 100 && videoSrc ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {!videoSrc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 font-mono text-xs z-10 bg-zinc-950">
            <span className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-base">🎬</span>
            <span>No active workspace sequence media loaded...</span>
          </div>
        )}

        <video
          ref={videoRef}
          src={videoSrc || undefined}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          className="hidden"
          playsInline
          crossOrigin="anonymous"
        />

        <div 
          style={{ 
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale / 100})`,
            transformOrigin: 'center center',
            display: videoSrc ? 'flex' : 'none'
          }}
          className="relative max-h-full max-w-full w-full h-full items-center justify-center transition-transform duration-75 ease-out"
        >
          <canvas
            ref={previewCanvasRef}
            onClick={(e) => {
              if (zoomScale <= 100) onTogglePlay();
            }}
            className="max-h-full max-w-full object-contain bg-black rounded-xl shadow-2xl pointer-events-auto cursor-pointer"
            style={{ aspectRatio: '9/16' }}
          />
        </div>

        {zoomScale > 100 && videoSrc && (
          <button 
            onClick={handleResetView}
            className="absolute top-3 right-3 z-30 bg-zinc-900/80 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-white font-mono px-2 py-1 rounded border border-zinc-800 transition backdrop-blur"
          >
            Reset View
          </button>
        )}
      </div>

      {/* Transport Control Deck Area */}
      <div className="flex flex-col gap-2.5 mt-3 pt-2 border-t border-zinc-900 shrink-0">
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

        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onTogglePlay}
              disabled={!videoSrc}
              className={`p-1.5 rounded-lg border text-zinc-300 transition-all active:scale-90 disabled:opacity-20 disabled:pointer-events-none ${
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

          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 px-2 py-1 rounded-lg shrink-0">
            {zoomScale > 100 ? <Move className="w-3 h-3 text-indigo-400" /> : <ZoomIn className="w-3 h-3 text-zinc-500" />}
            <input 
              type="range"
              min="100" 
              max="400" 
              disabled={!videoSrc}
              value={zoomScale}
              onChange={(e) => {
                const nextScale = Number(e.target.value);
                setZoomScale(nextScale);
                if (nextScale <= 100) setPanPosition({ x: 0, y: 0 }); 
              }}
              className="w-16 md:w-24 h-1 bg-zinc-800 appearance-none rounded-lg cursor-pointer accent-indigo-500 focus:outline-none disabled:opacity-20"
            />
            <span className="text-[9px] font-mono font-bold text-zinc-400 min-w-[28px] text-right">
              {zoomScale}%
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <button className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition" disabled={!videoSrc}>
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition" disabled={!videoSrc}>
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}