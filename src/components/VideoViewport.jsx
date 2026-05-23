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
  onLoadedMetadata,
  previewCanvasRef, 
  
  // Lifted Global View State Pointers
  zoomScale,      // Controlled externally (e.g., 100 to 400)
  translateX,     // Controlled externally (panning X offset)
  translateY,     // Controlled externally (panning Y offset)
  onZoomChange,   // State setter function passed from App.jsx
  onPanChange,    // State setter function passed from App.jsx
  handleResetView,
  setCaptions       
}) {
  const [isViewportDragging, setIsViewportDragging] = useState(false);
  
  const viewportDragStart = useRef({ x: 0, y: 0 });
  const textDragConfig = useRef(null); 

  const captionsRef = useRef(captions);
  useEffect(() => {
    captionsRef.current = captions;
  }, [captions]);

  // --- KEYBOARD SPACEBAR LISTENERS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault(); 
        if (videoSrc) onTogglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay, videoSrc]);

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

  const getCanvasRelativeCoords = (clientX, clientY, canvasElement) => {
    const rect = canvasElement.getBoundingClientRect();
    return {
      canvasX: ((clientX - rect.left) / rect.width) * canvasElement.width,
      canvasY: ((clientY - rect.top) / rect.height) * canvasElement.height,
      viewportWidth: rect.width,
      viewportHeight: rect.height
    };
  };

  const handleCanvasMouseDown = (e) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !videoSrc) return;

    const activeCap = captionsRef.current?.find(c => currentTime >= c.start && currentTime <= c.end);
    
    if (activeCap && activeCap._metaBoundingBox) {
      const { canvasX, canvasY, viewportWidth, viewportHeight } = getCanvasRelativeCoords(e.clientX, e.clientY, canvas);
      const box = activeCap._metaBoundingBox;

      const isWithinX = canvasX >= (box.centerX - (box.width / 2) - 60) && canvasX <= (box.centerX + (box.width / 2) + 60);
      const isWithinY = canvasY >= (box.topY - 60) && canvasY <= (box.bottomY + 60);

      if (isWithinX && isWithinY) {
        e.preventDefault();
        e.stopPropagation();

        textDragConfig.current = {
          captionId: activeCap.id,
          initialXRel: activeCap.xRel !== undefined ? activeCap.xRel : 0.5,
          initialYRel: activeCap.yRel !== undefined ? activeCap.yRel : 0.82,
          startX: e.clientX,
          startY: e.clientY,
          viewportWidth,
          viewportHeight
        };

        window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return; 
      }
    }

    // Panning framework triggered if zoom scale exceeds baseline parameters
    if (zoomScale > 100) {
      setIsViewportDragging(true);
      viewportDragStart.current = { x: e.clientX - translateX, y: e.clientY - translateY };
      window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
  };

  const handleGlobalMouseMove = (e) => {
    if (textDragConfig.current) {
      const config = textDragConfig.current;
      const canvas = previewCanvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const currentDeltaX = e.clientX - config.startX;
      const currentDeltaY = e.clientY - config.startY;

      const changeXRel = currentDeltaX / config.viewportWidth;
      const changeYRel = currentDeltaY / config.viewportHeight;

      const calculatedX = Math.max(0.01, Math.min(0.99, config.initialXRel + changeXRel));
      const calculatedY = Math.max(0.01, Math.min(0.99, config.initialYRel + changeYRel));

      const activeCap = captionsRef.current?.find(c => c.id === config.captionId);
      if (activeCap) {
        activeCap.xRel = calculatedX;
        activeCap.yRel = calculatedY;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderCaptionFrame(ctx, canvas, video, captionsRef.current || [], captionStyles);
    } else if (isViewportDragging) {
      // Emit spatial adjustments upward to App.jsx global tracking metrics
      onPanChange(
        e.clientX - viewportDragStart.current.x,
        e.clientY - viewportDragStart.current.y
      );
    }
  };

  const handleGlobalMouseUp = (e) => {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);

    if (textDragConfig.current) {
      const config = textDragConfig.current;
      
      const finalDeltaX = e.clientX - config.startX;
      const finalDeltaY = e.clientY - config.startY;

      const changeXRel = finalDeltaX / config.viewportWidth;
      const changeYRel = finalDeltaY / config.viewportHeight;

      const calculatedX = Math.max(0.01, Math.min(0.99, config.initialXRel + changeXRel));
      const calculatedY = Math.max(0.01, Math.min(0.99, config.initialYRel + changeYRel));

      setCaptions(prevTrackList => prevTrackList.map(item => {
        if (item.id === config.captionId) {
          return { ...item, xRel: calculatedX, yRel: calculatedY };
        }
        return item;
      }));

      textDragConfig.current = null;
    }
    setIsViewportDragging(false);
  };

  // Canvas Synchronization Pipeline
  useEffect(() => {
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas || !videoSrc) return;

    const ctx = canvas.getContext('2d');
    let frameId = null;

    const syncCanvasAndDraw = (shouldClear = false) => {
      if (video.videoWidth && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (shouldClear) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      renderCaptionFrame(ctx, canvas, video, captions || [], captionStyles);
    };

    const playbackLoop = () => {
      if (!textDragConfig.current) {
        syncCanvasAndDraw(true); 
      }
      if (!video.paused && !video.ended) {
        frameId = requestAnimationFrame(playbackLoop);
      }
    };

    if (isPlaying) {
      frameId = requestAnimationFrame(playbackLoop);
    } else {
      syncCanvasAndDraw(false);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPlaying, currentTime, captions, captionStyles, videoSrc, videoRef, previewCanvasRef]);

  return (
    <div className="relative flex-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden flex flex-col justify-between p-3 h-full min-h-0 select-none backdrop-blur-sm">
      
      {/* Monitoring Viewport Screen Container Wrapper */}
      <div 
        onMouseDown={handleCanvasMouseDown}
        className="relative flex-1 flex items-center justify-center min-h-0 w-full rounded-xl bg-zinc-950 border border-zinc-900/60 overflow-hidden group shadow-inner"
        style={{ cursor: zoomScale > 100 ? (isViewportDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {!videoSrc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 font-mono text-xs z-10 bg-zinc-950">
            <span className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-base">🎬</span>
            <span>No active media loaded into the workspace track sequence...</span>
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

        {/* CSS Transformation Matrix synchronized directly with Global Layout States */}
        <div 
          style={{ 
            transform: `translate(${translateX}px, ${translateY}px) scale(${zoomScale / 100})`,
            transformOrigin: 'center center',
            display: videoSrc ? 'flex' : 'none'
          }}
          className="relative max-h-full max-w-full w-full h-full items-center justify-center transition-transform duration-75 ease-out pointer-events-none"
        >
          <canvas
            ref={previewCanvasRef} 
            className="max-h-full max-w-full object-contain bg-black rounded-xl shadow-2xl pointer-events-auto"
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
                onZoomChange(nextScale);
                if (nextScale <= 100) onPanChange(0, 0); 
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