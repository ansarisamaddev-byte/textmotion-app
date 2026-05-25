import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Maximize2, Volume2, ZoomIn, ZoomOut, Move, Undo2, Redo2 } from 'lucide-react';
import { renderCaptionFrame } from '../lib/captionRenderer';
import CaptionSelectionOverlay from './CaptionSelectionOverlay';
import ElementSelectionOverlay from './ElementSelectionOverlay';

export default function VideoViewport({ 
  videoSrc, 
  videoRef, 
  isPlaying, 
  currentTime, 
  duration, 
  captions,
  elements = [],
  captionStyles,    
  onTogglePlay, 
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onTimeUpdate,    
  onLoadedMetadata, 
  previewCanvasRef, 
  
  // Lifted Global View State Pointers
  zoomScale,      
  translateX,     
  translateY,     
  onZoomChange,   
  onPanChange,    
  handleResetView,
  activeId,
  activeElementId,
  onSelectCaption,
  onSelectElement,
  onTransformLive,
  onTransformCommit,
  onElementTransformLive,
  onElementTransformCommit,
  beginTransaction,
  endTransaction
}) {
  const isViewportDraggingRef = useRef(false);
  const viewportDragStart = useRef({ x: 0, y: 0 });
  const [renderTick, setRenderTick] = useState(0);
  const [videoAspect, setVideoAspect] = useState('9 / 16');

  const captionsRef = useRef(captions);
  const elementsRef = useRef(elements);
  useEffect(() => {
    captionsRef.current = captions;
  }, [captions]);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;
    const syncAspect = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoAspect(`${video.videoWidth} / ${video.videoHeight}`);
      }
    };
    video.addEventListener('loadedmetadata', syncAspect);
    syncAspect();
    return () => video.removeEventListener('loadedmetadata', syncAspect);
  }, [videoSrc, videoRef]);

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

  // ✅ FIXED COORDINATE MAPPING METHOD
  const getCanvasRelativeCoords = (clientX, clientY, canvasElement, containerElement) => {
    const canvasRect = canvasElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    
    const currentScaleMultiplier = zoomScale / 100;

    // 1. Calculate where the canvas top-left corner sits natively inside its unscaled parent frame
    const canvasVisualWidthUnscaled = canvasRect.width / currentScaleMultiplier;
    const canvasVisualHeightUnscaled = canvasRect.height / currentScaleMultiplier;

    // 2. Track screen client click offsets relative to the parent bounding frame
    const rawVisualX = clientX - canvasRect.left;
    const rawVisualY = clientY - canvasRect.top;

    // 3. Reverse project translation vectors and scaling factors
    const canvasX = (rawVisualX / canvasRect.width) * canvasElement.width;
    const canvasY = (rawVisualY / canvasRect.height) * canvasElement.height;

    return {
      canvasX,
      canvasY,
      viewportWidth: canvasVisualWidthUnscaled,
      viewportHeight: canvasVisualHeightUnscaled
    };
  };

  const handleCanvasMouseDown = (e) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !videoSrc) return;

    const visibleElements = (elementsRef.current || [])
      .filter(el => currentTime >= el.start && currentTime <= el.end)
      .sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0));

    for (let i = 0; i < visibleElements.length; i++) {
      const el = visibleElements[i];
      if (!el._metaBoundingBox) continue;
      const { canvasX, canvasY } = getCanvasRelativeCoords(e.clientX, e.clientY, canvas, e.currentTarget);
      const box = el._metaBoundingBox;
      const pad = box.hitPad ?? 14;
      const hit =
        canvasX >= box.left - pad &&
        canvasX <= box.right + pad &&
        canvasY >= box.topY - pad &&
        canvasY <= box.bottomY + pad;
      if (hit) {
        e.preventDefault();
        onSelectElement?.(el.id);
        return;
      }
    }

    const activeCap = captionsRef.current?.find(
      c => currentTime >= c.start && currentTime <= c.end
    );

    if (activeCap?._metaBoundingBox && !activeElementId) {
      const { canvasX, canvasY } = getCanvasRelativeCoords(e.clientX, e.clientY, canvas, e.currentTarget);
      const box = activeCap._metaBoundingBox;
      const pad = 12;
      const hit =
        canvasX >= box.left - pad &&
        canvasX <= box.right + pad &&
        canvasY >= box.topY - pad &&
        canvasY <= box.bottomY + pad;

      if (hit) {
        e.preventDefault();
        onSelectCaption?.(activeCap.id);
        return;
      }
    }

    isViewportDraggingRef.current = true;
    viewportDragStart.current = { x: e.clientX - translateX, y: e.clientY - translateY };
    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleGlobalMouseMove = (e) => {
    if (isViewportDraggingRef.current) {
      onPanChange(
        e.clientX - viewportDragStart.current.x,
        e.clientY - viewportDragStart.current.y
      );
    }
  };

  const handleGlobalMouseUp = () => {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
    isViewportDraggingRef.current = false;
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

      renderCaptionFrame(ctx, canvas, video, captions || [], captionStyles, elements || []);
      setRenderTick(t => t + 1);
    };

    const playbackLoop = () => {
      syncCanvasAndDraw(true);
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
  }, [isPlaying, currentTime, captions, elements, captionStyles, videoSrc, videoRef, previewCanvasRef]);

  const zoomIn = () => {
    const next = Math.min(400, zoomScale + 25);
    onZoomChange(next);
  };

  const zoomOut = () => {
    const next = Math.max(100, zoomScale - 25);
    onZoomChange(next);
    if (next <= 100) onPanChange(0, 0);
  };

  return (
    <div className="relative flex-1 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden flex flex-col justify-between p-3 h-full min-h-0 select-none backdrop-blur-sm">

      <div
        onMouseDown={handleCanvasMouseDown}
        className={`relative flex-1 flex items-center justify-center min-h-0 w-full rounded-xl bg-zinc-950 border border-zinc-900/60 group shadow-inner pointer-events-auto ${
          zoomScale > 100 ? 'overflow-auto' : 'overflow-hidden'
        }`}
        style={{ cursor: zoomScale > 100 ? (isViewportDraggingRef.current ? 'grabbing' : 'grab') : 'default' }}
      >
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1 p-1 rounded-full bg-zinc-950/90 border border-zinc-800 shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-full transition ${canUndo ? 'text-white hover:bg-indigo-500/20' : 'text-zinc-600 bg-zinc-900/70 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-full transition ${canRedo ? 'text-white hover:bg-indigo-500/20' : 'text-zinc-600 bg-zinc-900/70 cursor-not-allowed'}`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

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

        <div
          style={{
            transform: `translate(${translateX}px, ${translateY}px) scale(${zoomScale / 100})`,
            transformOrigin: 'center center',
            display: videoSrc ? 'flex' : 'none'
          }}
          className="relative flex items-center justify-center min-h-full min-w-full p-6 transition-transform duration-75 ease-out shrink-0"
        >
          <div
            className="relative pointer-events-auto shadow-2xl ring-1 ring-zinc-800/80"
            style={{
              aspectRatio: videoAspect,
              height: zoomScale > 100 ? '70vh' : '100%',
              maxHeight: '100%',
              width: 'auto',
              maxWidth: '100%'
            }}
          >
            <canvas ref={previewCanvasRef} className="block w-full h-full bg-black rounded-sm" />

            {activeElementId ? (
              <ElementSelectionOverlay
                canvasRef={previewCanvasRef}
                currentTime={currentTime}
                elements={elements}
                activeElementId={activeElementId}
                onSelectElement={onSelectElement}
                onTransformLive={onElementTransformLive}
                onTransformCommit={onElementTransformCommit}
                beginTransaction={beginTransaction}
                endTransaction={endTransaction}
                renderTick={renderTick}
              />
            ) : (
              <CaptionSelectionOverlay
                canvasRef={previewCanvasRef}
                currentTime={currentTime}
                captions={captions}
                activeId={activeId}
                onSelectCaption={onSelectCaption}
                onTransformLive={onTransformLive}
                onTransformCommit={onTransformCommit}
                beginTransaction={beginTransaction}
                endTransaction={endTransaction}
                renderTick={renderTick}
              />
            )}
          </div>
        </div>

        {zoomScale > 100 && videoSrc && (
          <button 
            onClick={handleResetView}
            className="absolute top-3 left-3 z-30 bg-zinc-900/80 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-white font-mono px-2 py-1 rounded border border-zinc-800 transition backdrop-blur pointer-events-auto"
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

          <div
            className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 px-1.5 py-1 rounded-lg shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={!videoSrc || zoomScale <= 100}
              onClick={zoomOut}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
              title="Zoom out (Ctrl+-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {zoomScale > 100 ? <Move className="w-3 h-3 text-indigo-400 mx-0.5" /> : <ZoomIn className="w-3 h-3 text-zinc-500 mx-0.5" />}
            <input
              type="range"
              min="100"
              max="400"
              step="25"
              disabled={!videoSrc}
              value={zoomScale}
              onChange={(e) => {
                const nextScale = Number(e.target.value);
                onZoomChange(nextScale);
                if (nextScale <= 100) onPanChange(0, 0);
              }}
              className="w-16 md:w-24 h-1 bg-zinc-800 appearance-none rounded-lg cursor-pointer accent-indigo-500 focus:outline-none disabled:opacity-20"
            />
            <button
              type="button"
              disabled={!videoSrc || zoomScale >= 400}
              onClick={zoomIn}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
              title="Zoom in (Ctrl++)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[9px] font-mono font-bold text-zinc-400 min-w-[32px] text-right pl-1">
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