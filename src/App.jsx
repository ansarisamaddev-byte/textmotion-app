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

  if (activeCap) {
    ctx.save();
    
    // Parse baseline fonts precisely
    const baseSize = parseInt(activeCap.fontSize || captionStyles.fontSize) || 48;
    const fontName = (activeCap.fontFamily || captionStyles.fontFamily).split(',')[0].replace(/['"]/g, '').trim();
    const isItalic = (activeCap.fontStyle || captionStyles.fontStyle) === 'italic' ? 'italic ' : '';
    const fontWeight = activeCap.fontWeight || captionStyles.fontWeight || '900';
    
    // Explicit system lookup layout execution pass
    ctx.font = `${isItalic}${fontWeight} ${baseSize}px "${fontName}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = activeCap.color || captionStyles.color || '#fbbf24';
    
    // High-impact outline configuration matching premium short forms
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(4, baseSize * 0.14);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const rawText = (activeCap.textTransform || captionStyles.textTransform) === 'uppercase' 
      ? activeCap.text.toUpperCase() 
      : activeCap.text;

    // Word Wrap Helper Engine
    const words = rawText.split(/\s+/);
    const lines = [];
    const maxTextWidth = canvas.width * 0.85; // Secure 85% layout width boundary
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
    let initialYPos = canvas.height * 0.85; // Ground position inside lower third
    const lineSpacingOffset = baseSize * 1.15;

    // Stack lines cleanly upward
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
  useEffect(() => {
    const matching = captions.find(c => currentTime >= c.start && currentTime <= c.end);
    setActiveId(matching ? matching.id : null);
  }, [currentTime, captions]);

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

  const handleSelectCaption = (id, event) => {
    setSelectedIds([id]);
    setActiveId(id);
    const targeted = captions.find(c => c.id === id);
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
    if (selectedIds.length > 0) {
      setCaptions(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, [field]: value } : c));
    }
  };

  function setThemePreset(preset) {
    setCaptionStyles(prev => ({
      ...prev,
      preset: preset.id, fontFamily: preset.font, fontSize: preset.size, fontWeight: preset.weight, color: preset.color, textTransform: preset.trans, fontStyle: preset.style
    }));
    if (selectedIds.length > 0) {
      setCaptions(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, fontFamily: preset.font, fontSize: preset.size, fontWeight: preset.weight, color: preset.color, textTransform: preset.trans, fontStyle: preset.style } : c));
    }
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
    mainVideo.muted = true;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = nativeWidth;
    exportCanvas.height = nativeHeight;
    const exportCtx = exportCanvas.getContext('2d');

    const stream = exportCanvas.captureStream(30);
    const recorder = RecordRTC(stream, {
      type: 'video',
      mimeType: 'video/webm',
      bitsPerSecond: 8000000
    });

    recorder.startRecording();
    let animId = null;

    const processFrame = () => {
      if (!mainVideo || mainVideo.paused || mainVideo.ended) return;

      // CALLS THE EXACT SAME LOGIC FUNCTION AS PREVIEW
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

        mainVideo.pause();
        mainVideo.currentTime = originalTime;
        mainVideo.muted = originalMuted;
        setIsPlaying(false);
        setIsExporting(false);
      });
    };

    mainVideo.addEventListener('ended', finalizeVideo);
    const safetyInterval = setInterval(() => {
      if (mainVideo.currentTime >= duration || mainVideo.ended) finalizeVideo();
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
        <div style={{ width: `${sidebarWidth}px` }} className="shrink-0 h-full overflow-hidden">
          <TranscriptSidebar captions={captions} activeId={activeId} selectedIds={selectedIds} onSelectCaption={handleSelectCaption} onUpdate={handleUpdateCaption} onAdd={handleAddBlock} onDelete={handleDeleteBlock} />
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
            <TimelineTrack videoSrc={videoSrc} captions={captions} currentTime={currentTime} duration={duration} activeId={activeId} onSeek={handleTimelineSeek} />
          </div>
        </main>
      </div>
    </div>
  );
}