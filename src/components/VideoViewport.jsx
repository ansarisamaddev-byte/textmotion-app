import React from 'react';
import { Play, Pause, Video } from 'lucide-react';

export default function VideoViewport({ videoSrc, videoRef, isPlaying, currentTime, duration, activeCaption, captionStyles, onTogglePlay, onTimeUpdate, onLoadedMetadata }) {
  return (
    <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 relative overflow-hidden flex flex-col justify-between shadow-2xl">
      
      {/* Video Screen Layout Surface area */}
      <div className="flex-1 relative flex items-center justify-center bg-black/40">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            className="max-h-[420px] object-contain rounded-xl shadow-lg"
            onClick={onTogglePlay}
          />
        ) : (
          <div className="text-zinc-600 text-xs font-mono">Load a media clip to mount canvas context...</div>
        )}

        {/* Dynamic Display Overlap Engine Layer */}
        {activeCaption && captionStyles && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-10 z-30">
            <h1 
              style={{
                fontFamily: captionStyles.fontFamily,
                fontSize: captionStyles.fontSize,
                fontWeight: captionStyles.fontWeight,
                fontStyle: captionStyles.fontStyle,
                color: captionStyles.color,
                textTransform: captionStyles.textTransform,
              }}
              className={`text-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] transition-all duration-75 select-none ${
                captionStyles.preset === 'cyber-neon' ? 'blur-[0.2px] animate-pulse' : ''
              }`}
            >
              {activeCaption.text}
            </h1>
          </div>
        )}
      </div>

      {/* Control Strip Layout Bar Container details below... */}
    </div>
  );
}