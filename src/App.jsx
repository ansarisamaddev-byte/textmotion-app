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

export const STYLE_PRESETS = [
  { id: 'bold-kinetic', name: '🔥 Bold Kinetic', font: 'Impact, Arial Black, sans-serif', size: '56px', weight: '900', color: '#fbbf24', trans: 'uppercase', style: 'normal', strokeColor: '#000000', strokeWidth: 0.15, shadow: true, underline: false, strike: false },
  { id: 'cyber-neon', name: '⚡ Cyber Neon', font: "'Courier New', Courier, monospace", size: '44px', weight: '700', color: '#00ffcc', trans: 'uppercase', style: 'normal', strokeColor: '#050515', strokeWidth: 0.12, shadow: true, underline: false, strike: false },
  { id: 'minimal-lower', name: '📝 Minimalist Lower', font: 'system-ui, sans-serif', size: '32px', weight: '500', color: '#ffffff', trans: 'none', style: 'normal', strokeColor: 'rgba(0,0,0,0.5)', strokeWidth: 0.05, shadow: false, underline: false, strike: false },
  { id: 'tokyo-drift', name: '🏎️ Tokyo Drift', font: 'Arial Black, sans-serif', size: '52px', weight: '900', color: '#ff0055', trans: 'uppercase', style: 'italic', strokeColor: '#ffffff', strokeWidth: 0.08, shadow: true, underline: false, strike: false },
  { id: 'vintage-vibe', name: '📻 Vintage Retro', font: 'Georgia, serif', size: '40px', weight: '700', color: '#ffedd5', trans: 'none', style: 'italic', strokeColor: '#451a03', strokeWidth: 0.06, shadow: true, underline: false, strike: false },
  { id: 'future-hype', name: '🚀 Future Hype', font: 'Montserrat, sans-serif', size: '48px', weight: '800', color: '#ffffff', trans: 'uppercase', style: 'normal', strokeColor: '#6366f1', strokeWidth: 0.18, shadow: true, underline: false, strike: false },
  { id: 'clean-vlog', name: '📸 Clean Vlog', font: 'Arial, sans-serif', size: '36px', weight: '700', color: '#ffffff', trans: 'none', style: 'normal', strokeColor: '#000000', strokeWidth: 0.10, shadow: true, underline: false, strike: false },
  { id: 'comic-boom', name: '💥 Comic Punch', font: 'Comic Sans MS, cursive', size: '60px', weight: '900', color: '#facc15', trans: 'uppercase', style: 'italic', strokeColor: '#000000', strokeWidth: 0.20, shadow: true, underline: false, strike: false },
  { id: 'subtle-sub', name: '💬 Essential Sub', font: 'Inter, sans-serif', size: '28px', weight: '600', color: '#f4f4f5', trans: 'none', style: 'normal', strokeColor: '#000000', strokeWidth: 0.08, shadow: false, underline: false, strike: false },
  { id: 'alert-warn', name: '🚨 Attention Grab', font: 'Impact, Arial Black, sans-serif', size: '56px', weight: '900', color: '#ef4444', trans: 'uppercase', style: 'normal', strokeColor: '#ffffff', strokeWidth: 0.12, shadow: true, underline: true, strike: false }
];

export const renderCaptionFrame = (ctx, canvas, video, captions, captionStyles) => {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const currentTime = video.currentTime;
  const activeCap = captions.find(c => currentTime >= c.start && currentTime <= c.end);

  if (activeCap) {
    ctx.save();
    
    const fontFamily = activeCap.fontFamily || captionStyles.fontFamily || 'Impact';
    const fontSize = activeCap.fontSize || captionStyles.fontSize || '48px';
    const fontWeight = activeCap.fontWeight || captionStyles.fontWeight || '900';
    const fontStyle = activeCap.fontStyle || captionStyles.fontStyle || 'normal';
    const color = activeCap.color || captionStyles.color || '#fbbf24';
    const textTransform = activeCap.textTransform || captionStyles.textTransform || 'uppercase';
    
    const strokeColor = activeCap.strokeColor || captionStyles.strokeColor || '#000000';
    const strokeFactor = activeCap.strokeWidth !== undefined ? activeCap.strokeWidth : (captionStyles.strokeWidth !== undefined ? captionStyles.strokeWidth : 0.14);
    const hasShadow = activeCap.shadow !== undefined ? activeCap.shadow : (captionStyles.shadow || false);
    const hasUnderline = activeCap.underline !== undefined ? activeCap.underline : (captionStyles.underline || false);
    const hasStrike = activeCap.strike !== undefined ? activeCap.strike : (captionStyles.strike || false);

    const baseSize = parseInt(fontSize) || 48;
    const isItalic = fontStyle === 'italic' ? 'italic ' : '';
    
    let fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    if (fontName.includes(' ')) fontName = `"${fontName}"`;
    
    ctx.font = `${isItalic}${fontWeight} ${baseSize}px ${fontName}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    if (hasShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = baseSize * 0.15;
      ctx.shadowOffsetX = baseSize * 0.08;
      ctx.shadowOffsetY = baseSize * 0.08;
    } else {
      ctx.shadowColor = 'transparent';
    }

    const rawText = textTransform === 'uppercase' ? activeCap.text.toUpperCase() : activeCap.text;
    const words = rawText.split(/\s+/);
    const lines = [];
    const maxTextWidth = canvas.width * 0.88;
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
    let initialYPos = canvas.height * 0.82; 
    const lineSpacingOffset = baseSize * 1.2;

    for (let j = lines.length - 1; j >= 0; j--) {
      const currentTextLine = lines[j];
      const textWidth = ctx.measureText(currentTextLine).width;
      const lineXStart = xPos - (textWidth / 2);
      
      if (strokeFactor > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = baseSize * strokeFactor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeText(currentTextLine, xPos, initialYPos);
      }
      
      ctx.fillStyle = color;
      ctx.fillText(currentTextLine, xPos, initialYPos);
      
      if (hasUnderline || hasStrike) {
        ctx.save();
        ctx.shadowColor = 'transparent'; 
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, baseSize * 0.06);
        
        ctx.beginPath();
        if (hasUnderline) {
          const underlineY = initialYPos + (baseSize * 0.12);
          ctx.moveTo(lineXStart, underlineY);
          ctx.lineTo(lineXStart + textWidth, underlineY);
        }
        if (hasStrike) {
          const strikeY = initialYPos - (baseSize * 0.35);
          ctx.moveTo(lineXStart, strikeY);
          ctx.lineTo(lineXStart + textWidth, strikeY);
        }
        ctx.stroke();
        ctx.restore();
      }

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
    preset: 'bold-kinetic',
    fontFamily: 'Impact, Arial Black, sans-serif',
    fontSize: '48px',
    fontWeight: '900',
    fontStyle: 'normal',
    color: '#fbbf24',
    textTransform: 'uppercase',
    strokeColor: '#000000',
    strokeWidth: 0.15,
    shadow: true,
    underline: false,
    strike: false,
    isEditingCustom: false 
  });

  const videoRef = useRef(null);
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    if (!videoSrc) {
      setActiveId(null);
      return;
    }

    if (isPlaying) {
      const currentActiveBlock = captions.find(
        (c) => currentTime >= c.start && currentTime <= c.end
      );

      if (currentActiveBlock) {
        setActiveId(currentActiveBlock.id);
        setSelectedIds([currentActiveBlock.id]);
      } else {
        setActiveId(null);
      }
    } else {
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

  const handleSelectCaption = (id) => {
    setSelectedIds([id]);
    setActiveId(id);
    
    const targeted = captions.find(c => c.id === id);
    if (targeted && videoRef.current) {
      videoRef.current.currentTime = targeted.start;
      setCurrentTime(targeted.start);
    }

    if (targeted) {
      setCaptionStyles(prev => ({
        ...prev,
        fontFamily: targeted.fontFamily || 'Impact, Arial Black, sans-serif',
        fontSize: targeted.fontSize || '48px',
        fontWeight: targeted.fontWeight || '900',
        fontStyle: targeted.fontStyle || 'normal',
        color: targeted.color || '#fbbf24',
        textTransform: targeted.textTransform || 'uppercase',
        strokeColor: targeted.strokeColor || '#000000',
        strokeWidth: targeted.strokeWidth !== undefined ? targeted.strokeWidth : 0.14,
        shadow: targeted.shadow !== undefined ? targeted.shadow : true,
        underline: targeted.underline !== undefined ? targeted.underline : false,
        strike: targeted.strike !== undefined ? targeted.strike : false,
      }));
    }
  };

  const handleCustomStyleChange = (field, value) => {
    setCaptionStyles(prev => ({ ...prev, preset: 'custom', [field]: value }));
    
    if (selectedIds.length > 0) {
      setCaptions(prevCaptions => 
        prevCaptions.map(c => 
          selectedIds.includes(c.id) ? { ...c, [field]: value } : c
        )
      );
    }
  };

  function setThemePreset(preset) {
    const updatedStyles = {
      preset: preset.id, 
      fontFamily: preset.font, 
      fontSize: preset.size, 
      fontWeight: preset.weight, 
      color: preset.color, 
      textTransform: preset.trans, 
      fontStyle: preset.style,
      strokeColor: preset.strokeColor,
      strokeWidth: preset.strokeWidth,
      shadow: preset.shadow,
      underline: preset.underline,
      strike: preset.strike,
      isEditingCustom: false
    };
    
    setCaptionStyles(updatedStyles);
    
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
            fontStyle: preset.style,
            strokeColor: preset.strokeColor,
            strokeWidth: preset.strokeWidth,
            shadow: preset.shadow,
            underline: preset.underline,
            strike: preset.strike
          };
        }
        return c;
      });
    });
  }

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
    mainVideo.muted = false; 

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = nativeWidth;
    exportCanvas.height = nativeHeight;
    const exportCtx = exportCanvas.getContext('2d');

    const videoStream = exportCanvas.captureStream(30);
    let combinedStream = videoStream;
    let audioContext = null;
    let audioSource = null;
    let audioDestination = null;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioSource = audioContext.createMediaElementSource(mainVideo);
      audioDestination = audioContext.createMediaStreamDestination();
      
      audioSource.connect(audioDestination);
      audioSource.connect(audioContext.destination);

      const audioTrack = audioDestination.stream.getAudioTracks()[0];
      if (audioTrack) {
        videoStream.addTrack(audioTrack);
        combinedStream = videoStream;
      }
    } catch (audioErr) {
      console.warn("Web Audio Routing notice:", audioErr);
    }

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
    strokeColor: currentActiveCaption.strokeColor || captionStyles.strokeColor,
    strokeWidth: currentActiveCaption.strokeWidth !== undefined ? currentActiveCaption.strokeWidth : captionStyles.strokeWidth,
    shadow: currentActiveCaption.shadow !== undefined ? currentActiveCaption.shadow : captionStyles.shadow,
    underline: currentActiveCaption.underline !== undefined ? currentActiveCaption.underline : captionStyles.underline,
    strike: currentActiveCaption.strike !== undefined ? currentActiveCaption.strike : captionStyles.strike,
  } : captionStyles;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      <WorkspaceHeader 
        onVideoUpload={handleVideoUpload} 
        onExport={handleExportVideo}
        isExporting={isExporting}
        exportProgress={exportProgress}
        hasVideo={!!videoSrc}
      />

      <div className="flex flex-1 overflow-hidden w-full relative">
        <div style={{ width: `${sidebarWidth}px` }} className="shrink-0 h-full overflow-hidden">
          <TranscriptSidebar 
            captions={captions} 
            activeId={activeId} 
            selectedIds={selectedIds} 
            onSelectCaption={handleSelectCaption} 
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
                <div className="space-y-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Font Family</label>
                    <select value={captionStyles.fontFamily} onChange={(e) => handleCustomStyleChange('fontFamily', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200">
                      <option value="Impact, Arial Black, sans-serif">KINETIC (Impact)</option>
                      <option value="system-ui, sans-serif">MINIMAL SANS</option>
                      <option value="'Courier New', Courier, monospace">SYSTEM COURIER</option>
                      <option value="Georgia, serif">RETRO GEORGIA</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Text Color</label>
                    <input type="color" value={captionStyles.color} onChange={(e) => handleCustomStyleChange('color', e.target.value)} className="w-full bg-transparent h-8 border border-zinc-800 rounded cursor-pointer" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 🔥 FIXED SYSTEM LINK: Correctly maps over the full 10-item global array */}
                  {STYLE_PRESETS.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => setThemePreset(p)} 
                      className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition duration-150 ${
                        captionStyles.preset === p.id 
                          ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-md' 
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {p.name}
                    </button>
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
              selectedIds={selectedIds}          
              onSelectCaption={handleSelectCaption} 
              onSeek={handleTimelineSeek} 
            />       
          </div>
        </main>
      </div>
    </div>
  );
}