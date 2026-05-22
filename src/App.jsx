import React, { useState, useRef, useEffect } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import TranscriptSidebar from './components/TranscriptSidebar';
import VideoViewport from './components/VideoViewport';
import TimelineTrack from './components/TimelineTrack';
import { Layers, Edit3, X, ChevronUp, ChevronDown } from 'lucide-react';
import RecordRTC from 'recordrtc';

const INITIAL_CAPTIONS = [
  { 
    id: '1', start: 0.0, end: 2.5, text: "Welcome to TextMotion project dashboard!",
    fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '48px', fontWeight: '900', fontStyle: 'normal', color: '#fbbf24', textTransform: 'uppercase'
  },
  { 
    id: '2', start: 2.6, end: 5.5, text: "This is a clean, modular React implementation.",
    fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '48px', fontWeight: '900', fontStyle: 'normal', color: '#fbbf24', textTransform: 'uppercase'
  },
  { 
    id: '3', start: 5.6, end: 9.0, text: "Ready to scale with your custom enhancements.",
    fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '48px', fontWeight: '900', fontStyle: 'normal', color: '#fbbf24', textTransform: 'uppercase'
  }
];

// 🔥 GLOBAL SINGLE SOURCE OF TRUTH: Shared Canvas Drawing Core
export const renderCaptionFrame = (ctx, canvas, videoElement, captions, captionStyles) => {
  if (!videoElement || videoElement.paused || videoElement.ended) return;

  // 1. Draw base layer video frame matrix
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const timestamp = videoElement.currentTime;
  const activeCap = captions.find(c => timestamp >= c.start && timestamp <= c.end);

 // 🔥 FIXED SYNTAX: Update this exact block inside renderCaptionFrame in App.jsx
if (activeCap) {
  ctx.save();
  
  // Read properties directly from the active sub-item capsule first to preserve custom individual block selections
  const targetFontFamily = activeCap.fontFamily || captionStyles.fontFamily || 'Impact, Arial Black, sans-serif';
  const targetFontSize = activeCap.fontSize || captionStyles.fontSize || '48px';
  const targetFontWeight = activeCap.fontWeight || captionStyles.fontWeight || '900';
  const targetFontStyle = activeCap.fontStyle || captionStyles.fontStyle || 'normal';
  const targetColor = activeCap.color || captionStyles.color || '#fbbf24';
  const targetTransform = activeCap.textTransform || captionStyles.textTransform || 'uppercase';

  let fontName = targetFontFamily.split(',')[0].replace(/['"]/g, '').trim();
  if (fontName.includes(' ')) {
    fontName = `"${fontName}"`;
  }
  
  const baseSize = parseInt(targetFontSize) || 48;
  const isItalic = targetFontStyle === 'italic' ? 'italic ' : '';
  
  ctx.font = `${isItalic}${targetFontWeight} ${baseSize}px ${fontName}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = targetColor;
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(4, baseSize * 0.14);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const rawText = targetTransform === 'uppercase' ? activeCap.text.toUpperCase() : activeCap.text;

  const words = rawText.split(/\s+/);
  const lines = [];
  const maxTextWidth = canvas.width * 0.85;
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    if (ctx.measureText(testLine).width > maxTextWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const xPos = canvas.width / 2;
  let initialYPos = canvas.height * 0.85; 
  const lineSpacingOffset = baseSize * 1.15;

  for (let j = lines.length - 1; j >= 0; j--) {
    ctx.strokeText(lines[j], xPos, initialYPos);
    ctx.fillText(lines[j], xPos, initialYPos);
    initialYPos -= lineSpacingOffset;
  }

  ctx.restore();
}
};

export default function App() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [captions, setCaptions] = useState(INITIAL_CAPTIONS);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [sidebarWidth, setSidebarWidth] = useState(220); 
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  const [captionStyles, setCaptionStyles] = useState({
    preset: 'bold-yellow',
    fontFamily: 'Impact, Arial Black, sans-serif',
    fontSize: '48px',
    fontWeight: '900',
    fontStyle: 'normal',
    color: '#fbbf24',
    textTransform: 'uppercase',
    isEditingCustom: false 
  });

  const videoRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Sync highlighting active subtitle item blocks
// Inside App.jsx
useEffect(() => {
  // If no media is loaded, reset tracking states completely
  if (!videoSrc) {
    setActiveId(null);
    return;
  }

  // 1. 🔥 THE CONDITION: Only auto-update the active ID via time if the video is actually PLAYING
  if (isPlaying) {
    const currentActiveBlock = captions.find(
      (c) => currentTime >= c.start && currentTime <= c.end
    );

    if (currentActiveBlock) {
      setActiveId(currentActiveBlock.id);
      
      // Keep selectedIds synchronized with active playback automatically
      setSelectedIds([currentActiveBlock.id]);
    } else {
      setActiveId(null);
    }
  } 
  // 2. IF PAUSED: Retain whatever block the user manually clicked in the sidebar or timeline
  else {
    if (selectedIds.length > 0) {
      setActiveId(selectedIds[0]);
    }
  }
}, [currentTime, isPlaying, captions, videoSrc]);

  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith('blob:')) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  // Video Handlers
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (videoSrc && videoSrc.startsWith('blob:')) URL.revokeObjectURL(videoSrc);
      setVideoSrc(URL.createObjectURL(file));
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(err => console.log("Playback interrupted:", err));
      setIsPlaying(true);
    }
  };

  const handleTimelineSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleUpdateCaption = (id, field, value) => {
    setCaptions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleAddBlock = () => {
    const last = captions[captions.length - 1];
    const start = last ? parseFloat((last.end + 0.1).toFixed(1)) : 0;
    setCaptions([...captions, { id: Date.now().toString(), start, end: start + 2.5, text: "New subtitle line..." }]);
  };

  const handleDeleteBlock = (id) => {
    setCaptions(prev => prev.filter(c => c.id !== id));
    setSelectedIds(prev => prev.filter(item => item !== id));
  };

  const handleSeparatorMouseDown = (e) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent) => {
      setSidebarWidth(Math.max(220, Math.min(300, moveEvent.clientX)));
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

 // Inside App.jsx

// Unified selection engine handler for both panels
const handleSelectCaption = (id) => {
  // 1. Mark as globally selected for style sheet tools
  setSelectedIds([id]);
  
  // 2. Set as actively highlighted tracking ID
  setActiveId(id);
  
  // 3. Find the block to instantly snap the video timeline to its start marker
  const targeted = captions.find(c => c.id === id);
  if (targeted && videoRef.current) {
    videoRef.current.currentTime = targeted.start;
    setCurrentTime(targeted.start); // Forces immediate viewport canvas frame refresh
  }

  // 4. Load its unique styles into the editor sidebar panel deck
  if (targeted) {
    setCaptionStyles(prev => ({
      ...prev,
      fontFamily: targeted.fontFamily || 'Impact, Arial Black, sans-serif',
      fontSize: targeted.fontSize || '48px',
      fontWeight: targeted.fontWeight || '900',
      fontStyle: targeted.fontStyle || 'normal',
      color: targeted.color || '#fbbf24',
      textTransform: targeted.textTransform || 'uppercase',
    }));
  }
};

const handleCustomStyleChange = (field, value) => {
  setCaptionStyles(prev => ({ ...prev, preset: 'custom', [field]: value }));
  
  // Instantly force state alignment engine push to the selected caption item block
  if (selectedIds.length > 0) {
    setCaptions(prevCaptions => 
      prevCaptions.map(c => 
        selectedIds.includes(c.id) ? { ...c, [field]: value } : c
      )
    );
  }
};

  function setThemePreset(preset) {
  // 1. Immediately update global fallback baseline configurations
  const updatedStyles = {
    preset: preset.id, 
    fontFamily: preset.font, 
    fontSize: preset.size, 
    fontWeight: preset.weight, 
    color: preset.color, 
    textTransform: preset.trans, 
    fontStyle: preset.style,
    isEditingCustom: false
  };
  
  setCaptionStyles(updatedStyles);
  
  // 2. 🔥 CRITICAL FIX: Explicitly map and replace tracking properties on the selected target object
  setCaptions(prevCaptions => {
    return prevCaptions.map(c => {
      if (selectedIds.includes(c.id)) {
        return { 
          ...c, 
          fontFamily: preset.font, 
          fontSize: preset.size, 
          fontWeight: preset.weight, 
          color: preset.color, 
          textTransform: preset.trans, 
          fontStyle: preset.style 
        };
      }
      return c;
    });
  });
}

  // 🔥 THE MANDATORY FIXED EXPORT: Executes the exact core frame render code
const handleExportVideo = async () => {
  if (!videoSrc || !videoRef.current) return;

  setIsExporting(true);
  setExportProgress(0);

  const mainVideo = videoRef.current;
  const nativeWidth = mainVideo.videoWidth || 1080;
  const nativeHeight = mainVideo.videoHeight || 1920;

  const originalTime = mainVideo.currentTime;
  const originalMuted = mainVideo.muted;

  mainVideo.pause();
  mainVideo.currentTime = 0;
  
  // 🔥 CRITICAL: Unmute the video so the Web Audio API can capture the stream
  mainVideo.muted = false; 

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = nativeWidth;
  exportCanvas.height = nativeHeight;
  const exportCtx = exportCanvas.getContext('2d');

  // 1. Capture the raw visual pixel stream from canvas matrix
  const videoStream = exportCanvas.captureStream(30);

  // 2. Extract and link audio using Web Audio API pipeline
  let combinedStream = videoStream;
  let audioContext = null;
  let audioSource = null;
  let audioDestination = null;

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioSource = audioContext.createMediaElementSource(mainVideo);
    audioDestination = audioContext.createMediaStreamDestination();
    
    // Connect audio source to the recording destination path
    audioSource.connect(audioDestination);
    
    // Connect audio source to master speakers so system components don't freeze
    audioSource.connect(audioContext.destination);

    // Combine visual canvas channels and raw audio tracks into a unified stream payload
    const audioTrack = audioDestination.stream.getAudioTracks()[0];
    if (audioTrack) {
      videoStream.addTrack(audioTrack);
      combinedStream = videoStream;
    }
  } catch (audioErr) {
    console.warn("Web Audio Routing notice (Context might already be active):", audioErr);
  }

  // 3. Initialize Recorder with combined AV Stream
  const recorder = RecordRTC(combinedStream, {
    type: 'video',
    mimeType: 'video/webm',
    bitsPerSecond: 8000000
  });

  recorder.startRecording();
  let animId = null;

  const processFrame = () => {
    if (!mainVideo || mainVideo.paused || mainVideo.ended) return;

    renderCaptionFrame(exportCtx, exportCanvas, mainVideo, captions, captionStyles);

    const progress = Math.min(99, Math.floor((mainVideo.currentTime / duration) * 100));
    setExportProgress(progress);

    if (mainVideo.currentTime < duration && !mainVideo.ended) {
      animId = requestAnimationFrame(processFrame);
    }
  };

  setTimeout(() => {
    mainVideo.play().then(() => {
      animId = requestAnimationFrame(processFrame);
    }).catch(err => {
      console.error("Export frame capture engine error:", err);
      setIsExporting(false);
    });
  }, 150);

  const finalizeVideo = () => {
    if (animId) cancelAnimationFrame(animId);
    clearInterval(safetyInterval);

    recorder.stopRecording(() => {
      setExportProgress(100);
      const blob = recorder.getBlob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `textmotion-render-${Date.now()}.webm`;
      document.body.appendChild(anchor);
      anchor.click();

      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      // Clean up Web Audio graph bindings completely to prevent memory leaks
      if (audioContext) {
        audioSource.disconnect();
        audioDestination.disconnect();
        audioContext.close();
      }

      mainVideo.pause();
      mainVideo.currentTime = originalTime;
      mainVideo.muted = originalMuted;
      setIsPlaying(false);
      setIsExporting(false);
    });
  };

  const safetyInterval = setInterval(() => {
    if (mainVideo.currentTime >= duration || mainVideo.ended) {
      finalizeVideo();
    }
  }, 100);
};
  const currentActiveCaption = captions.find(c => c.id === activeId);
  const activeViewportStyles = currentActiveCaption ? {
    fontFamily: currentActiveCaption.fontFamily || captionStyles.fontFamily,
    fontSize: currentActiveCaption.fontSize || captionStyles.fontSize,
    fontWeight: currentActiveCaption.fontWeight || captionStyles.fontWeight,
    fontStyle: currentActiveCaption.fontStyle || captionStyles.fontStyle,
    color: currentActiveCaption.color || captionStyles.color,
    textTransform: currentActiveCaption.textTransform || captionStyles.textTransform,
  } : captionStyles;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      {/* Target header trigger link layout bind */}
      <WorkspaceHeader 
        onVideoUpload={handleVideoUpload} 
        onExport={handleExportVideo}
        isExporting={isExporting}
        exportProgress={exportProgress}
        hasVideo={!!videoSrc}
      />

      <div className="flex flex-1 overflow-hidden w-full relative">
        <div style={{ width: `${sidebarWidth}px` }} className="shrink-0 h-full overflow-hidden">{/* In your App.jsx layout tree return statement */}
<TranscriptSidebar 
  captions={captions} 
  activeId={activeId} 
  selectedIds={selectedIds} 
  onSelectCaption={handleSelectCaption} // <-- Pass here
  onUpdate={handleUpdateCaption} 
  onAdd={handleAddBlock} 
  onDelete={handleDeleteBlock} 
/>
        </div>

        <div onMouseDown={handleSeparatorMouseDown} className="w-1.5 h-full bg-zinc-900 hover:bg-indigo-500/80 cursor-col-resize shrink-0 z-40" />

        <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden min-w-0">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 p-6 gap-6 min-h-0 relative overflow-hidden">
            <div className="lg:col-span-4 min-h-0 flex flex-col relative">
              <VideoViewport 
                videoSrc={videoSrc} videoRef={videoRef} previewCanvasRef={previewCanvasRef} isPlaying={isPlaying} currentTime={currentTime} duration={duration} activeCaption={currentActiveCaption} captions={captions} captionStyles={activeViewportStyles} onTogglePlay={handleTogglePlay}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              />
            </div>

            {/* Config Panel Right column */}
            <div className="lg:col-span-1 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-4 h-full overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 shrink-0">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Style Deck Presets</span>
                <button onClick={() => setCaptionStyles(prev => ({ ...prev, isEditingCustom: !prev.isEditingCustom }))} className="p-1 rounded bg-zinc-900 text-zinc-400">
                  {captionStyles.isEditingCustom ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </button>
              </div>

              {captionStyles.isEditingCustom ? (
                <div className="space-y-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 font-bold uppercase">Font Family</label>
                    <select value={captionStyles.fontFamily} onChange={(e) => handleCustomStyleChange('fontFamily', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200">
                      <option value="Impact, Arial Black, sans-serif">KINETIC (Impact)</option>
                      <option value="system-ui, sans-serif">MINIMAL SANS</option>
                      <option value="'Courier New', Courier, monospace">SYSTEM COURIER</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { id: 'bold-yellow', label: '🔥 Bold Kinetic (Yellow)', font: 'Impact, Arial Black, sans-serif', size: '48px', weight: '900', color: '#fbbf24', trans: 'uppercase', style: 'normal' },
                    { id: 'minimal-white', label: '📝 Minimal Lower Third', font: 'system-ui, sans-serif', size: '24px', weight: '500', color: '#ffffff', trans: 'none', style: 'normal' }
                  ].map(p => (
                    <button key={p.id} onClick={() => setThemePreset(p)} className={`w-full text-left p-3 rounded-xl border text-xs ${captionStyles.preset === p.id ? 'bg-indigo-600/10 border-indigo-500 text-white' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'}`}>{p.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: isTimelineOpen ? '220px' : '0px' }} className="shrink-0 w-full bg-zinc-900 overflow-hidden transition-[height] duration-200">
   <TimelineTrack 
  videoSrc={videoSrc} 
  captions={captions} 
  currentTime={currentTime} 
  duration={duration} 
  activeId={activeId} 
  selectedIds={selectedIds}          // <-- Pass down selection array
  onSelectCaption={handleSelectCaption} // <-- Pass down selection trigger
  onSeek={handleTimelineSeek} 
/>       </div>
        </main>
      </div>
    </div>
  );
}