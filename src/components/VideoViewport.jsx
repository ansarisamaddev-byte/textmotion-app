import React, { useEffect } from 'react';
import { renderCaptionFrame } from '../App';

export default function VideoViewport({
  videoSrc,
  videoRef,
  previewCanvasRef,
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

  // Live monitor execution loop feeding the display preview surface canvas
  useEffect(() => {
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let frameId = null;

    const loop = () => {
      // Automatically adjust preview canvas internal size buffer to track raw content video source file dimensions
      if (video.videoWidth && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Shared engine paint call
      renderCaptionFrame(ctx, canvas, video, captions, captionStyles);
      
      if (!video.paused && !video.ended) {
        frameId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      frameId = requestAnimationFrame(loop);
    } else {
      // Force render single frame when paused or seeking timeline tracks
      renderCaptionFrame(ctx, canvas, video, captions, captionStyles);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isPlaying, currentTime, captions, captionStyles, videoSrc]);

  return (
    <div className="w-full h-full bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center relative overflow-hidden p-2">
      {/* HTML video element wrapper stays hidden out of view */}
      <video
        ref={videoRef}
        src={videoSrc || undefined}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        className="hidden"
        playsInline
        crossOrigin="anonymous"
      />

      {videoSrc ? (
        <div className="relative max-w-full max-h-full aspect-[9/16] flex items-center justify-center shadow-2xl">
          {/* 🔥 THE PREVIEW LAYER CANVAS SURFACE SCREEN */}
          <canvas
            ref={previewCanvasRef}
            onClick={onTogglePlay}
            className="max-w-full max-h-full object-contain rounded-xl cursor-pointer bg-black shadow-inner"
            style={{ aspectRatio: '9/16' }}
          />
        </div>
      ) : (
        <div className="text-center font-mono text-zinc-500 text-xs">
          🎬 No active workspace video track data uploaded...
        </div>
      )}
    </div>
  );
}