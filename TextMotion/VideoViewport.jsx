import React from 'react';
import { Play, Pause, Video } from 'lucide-react';

export default function VideoViewport({ 
  videoSrc, videoRef, isPlaying, currentTime, duration, activeCaption, stylePreset, onTogglePlay, onTimeUpdate, onLoadedMetadata 
}) {
  
  const getStylePresetClass = () => {
    switch (stylePreset) {
      case 'bold-yellow':
        return 'text-yellow-400 font-extrabold text-2xl uppercase tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]';
      case 'cyber-neon':
        return 'text-cyan-400 font-black text-2xl italic drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]';
      default:
        return 'text-white font-medium text-lg bg-black/60 px-4 py-1 rounded-md';
    }
  };

  return (
    <div className="lg:col-span-2 flex flex-col items-center justify-center bg-zinc-900/20 rounded-2xl border border-zinc-800/50 p-4 relative">
      <div className="aspect-[9/16] h-full max-h-[440px] bg-black rounded-xl overflow-hidden shadow-2xl relative border border-zinc-800 flex items-center justify-center">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onClick={onTogglePlay}
          />
        ) : (
          <div className="text-center p-6 flex flex-col items-center gap-3">
            <div className="p-4 bg-zinc-900 rounded-full text-zinc-500 border border-zinc-800">
              <Video className="w-6 h-6" />
            </div>
            <p className="text-xs text-zinc-400 max-w-[180px]">
              Load a vertical video file to preview captions overlay layout.
            </p>
          </div>
        )}

        {/* Caption Layer Rendering */}
        {activeCaption && (
          <div className="absolute inset-x-4 bottom-20 flex justify-center pointer-events-none text-center z-20">
            <span className={getStylePresetClass()}>
              {activeCaption.text}
            </span>
          </div>
        )}
      </div>

      {/* Control Strip */}
      <div className="w-full max-w-[280px] flex items-center justify-between mt-4 bg-zinc-900/90 border border-zinc-800/80 px-4 py-2 rounded-full backdrop-blur">
        <button onClick={onTogglePlay} className="text-zinc-200 hover:text-white transition">
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
        </button>
        <div className="text-[11px] font-mono text-zinc-400">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </div>
      </div>
    </div>
  );
}