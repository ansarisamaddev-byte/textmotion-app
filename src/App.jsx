import React, { useState, useRef, useEffect } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import TranscriptSidebar from './components/TranscriptSidebar';
import VideoViewport from './components/VideoViewport';
import TimelineTrack from './components/TimelineTrack';
import { Layers, Edit3, X, ChevronUp, ChevronDown } from 'lucide-react';

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

export default function App() {
  // Video and Data Layer States
  const [videoSrc, setVideoSrc] = useState(null);
  const [captions, setCaptions] = useState(INITIAL_CAPTIONS);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Layout Sizing States
  const [sidebarWidth, setSidebarWidth] = useState(220); 
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  // Combined Advanced Typography State Object
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

  // Synchronize dynamic subtitle highlighting based on timestamps
  useEffect(() => {
    const matching = captions.find(c => currentTime >= c.start && currentTime <= c.end);
    setActiveId(matching ? matching.id : null);
  }, [currentTime, captions]);

  // Clean up object URLs to prevent browser memory leaks
  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith('blob:')) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  // Integrated Network Loop to ingest live segments from Beeceptor
  useEffect(() => {
    let isCurrentRequest = true;

    const fetchTranscribedCaptions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('https://caption-data-webhook.free.beeceptor.com/v1/captions');
        const data = await response.json();
        
        if (isCurrentRequest && data && data.words) {
          const formattedData = data.words.map((item, index) => ({
            id: item.id || `cap_${index}_${Date.now()}`,
            text: item.word || '',
            start: parseFloat(item.start ?? 0),
            end: parseFloat(item.end ?? 0),
          }));
          setCaptions(formattedData);
        }
      } catch (error) {
        console.error("Failed fetching processing layers:", error);
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      }
    };

    fetchTranscribedCaptions();

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  // Video Actions
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
      setIsPlaying(false);
      setCurrentTime(0);
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

  // Caption Data Actions
  const handleUpdateCaption = (id, field, value) => {
    setCaptions(prev => prev.map(c => {
      if (c.id === id) {
        return { 
          ...c, 
          [field]: (field === 'start' || field === 'end') ? (parseFloat(value) || 0) : value 
        };
      }
      return c;
    }));
  };

  const handleUpdateCaptionsBulk = (id, updatedFields) => {
    setCaptions(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
  };

  const handleAddBlock = () => {
    const last = captions[captions.length - 1];
    const start = last ? parseFloat((last.end + 0.1).toFixed(1)) : 0;
    setCaptions([...captions, { 
      id: Date.now().toString(), 
      start, 
      end: parseFloat((start + 2.5).toFixed(1)), 
      text: "New text line..." 
    }]);
  };

  const handleDeleteBlock = (id) => {
    setCaptions(prev => prev.filter(c => c.id !== id));
    setSelectedIds(prev => prev.filter(item => item !== id));
  };

  // Draggable Left Sidebar Splitting Handler
  const handleSeparatorMouseDown = (e) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent) => {
      const maxAllowedWidth = 300;
      const newWidth = Math.max(220, Math.min(maxAllowedWidth, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSelectCaption = (id, event) => {
    if (event.metaKey || event.ctrlKey) {
      setSelectedIds(prev => {
        const isAlreadySelected = prev.includes(id);
        return isAlreadySelected ? prev.filter(item => item !== id) : [...prev, id];
      });
    } else if (event.shiftKey && selectedIds.length > 0) {
      const lastSelected = selectedIds[selectedIds.length - 1];
      const currentIndex = captions.findIndex(c => c.id === id);
      const lastIndex = captions.findIndex(c => c.id === lastSelected);
      const start = Math.min(currentIndex, lastIndex);
      const end = Math.max(currentIndex, lastIndex);
      const rangeIds = captions.slice(start, end + 1).map(c => c.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
    } else {
      setSelectedIds([id]);
      setActiveId(id);

      const targetedCaption = captions.find(c => c.id === id);
      if (targetedCaption) {
        setCaptionStyles(prev => ({
          ...prev,
          fontFamily: targetedCaption.fontFamily || 'Impact, Arial Black, sans-serif',
          fontSize: targetedCaption.fontSize || '48px',
          fontWeight: targetedCaption.fontWeight || '900',
          fontStyle: targetedCaption.fontStyle || 'normal',
          color: targetedCaption.color || '#fbbf24',
          textTransform: targetedCaption.textTransform || 'uppercase',
        }));
      }
    }
  };

  const handleCustomStyleChange = (field, value) => {
    setCaptionStyles(prev => ({ ...prev, preset: 'custom', [field]: value }));
    
    if (selectedIds.length > 0) {
      setCaptions(prev => prev.map(c => 
        selectedIds.includes(c.id) ? { ...c, [field]: value } : c
      ));
    }
  };

  function setThemePreset(preset) {
    setCaptionStyles(prev => ({
      ...prev,
      preset: preset.id,
      fontFamily: preset.font,
      fontSize: preset.size,
      fontWeight: preset.weight,
      color: preset.color,
      textTransform: preset.trans,
      fontStyle: preset.style
    }));

    if (selectedIds.length > 0) {
      setCaptions(prev => prev.map(c => {
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
      }));
    }
  }

  // Find the current active playback caption slice
  const currentActiveCaption = captions.find(c => c.id === activeId);

  // Secure styling merge down to the active viewport canvas frame
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
      <WorkspaceHeader onVideoUpload={handleVideoUpload} />

      <div className="flex flex-1 overflow-hidden w-full relative">
        
        {/* Left Sidebar Layout */}
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

        {/* Vertical Width Separator Handle Bar */}
        <div 
          onMouseDown={handleSeparatorMouseDown}
          className="w-1.5 h-full bg-zinc-900 hover:bg-indigo-500/80 active:bg-indigo-500 cursor-col-resize transition-colors duration-150 relative z-40 shrink-0 after:content-[''] after:absolute after:inset-y-0 after:-left-1 after:-right-1"
        />

        {/* Center Canvas + Bottom Timeline Panel Stack Area */}
        <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden min-w-0">
          
          {/* Main Top Content Area — MODIFIED layout split weights to grid-cols-5 */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 p-6 gap-6 min-h-0 relative overflow-hidden">
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl border border-zinc-800">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-zinc-400">Syncing Webhook Sequence Timelines...</span>
                </div>
              </div>
            )}

            {/* Video Viewport Column — Expanded from col-span-3 to col-span-4 */}
            <div className="lg:col-span-4 min-h-0 flex flex-col relative">
              <VideoViewport 
                videoSrc={videoSrc}
                videoRef={videoRef}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                activeCaption={currentActiveCaption}
                captionStyles={activeViewportStyles} 
                onTogglePlay={handleTogglePlay}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              />
            </div>

            {/* Right Panel Subtitle Preset Controls — Set to col-span-1 for premium spacing layout */}
            <div className="lg:col-span-1 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-4 h-full overflow-y-auto min-w-0">
              
              {/* Preset Panel Header Area */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 shrink-0 flex-nowrap gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 truncate">Caption Presets</h3>
                </div>
                
                <button
                  onClick={() => setCaptionStyles(prev => ({ 
                    ...prev, 
                    isEditingCustom: !prev.isEditingCustom 
                  }))}
                  className={`w-8 h-8 rounded-lg border transition-all duration-150 flex items-center justify-center shrink-0 min-w-[32px] ${
                    captionStyles.isEditingCustom 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                  title={captionStyles.isEditingCustom ? "Close Custom Controls" : "Open Custom Controls"}
                >
                  {captionStyles.isEditingCustom ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Dynamic View Selector */}
              {captionStyles.isEditingCustom ? (
                /* VIEW 1: Custom Font Suite Panel */
                <div className="space-y-3 text-zinc-300 select-none animate-fadeIn">
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Font Family</label>
                    <select
                      value={captionStyles.fontFamily}
                      onChange={(e) => handleCustomStyleChange('fontFamily', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 pr-8 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Impact, Arial Black, sans-serif">KINETIC (Impact)</option>
                      <option value="'Courier New', Courier, monospace">SYSTEM COURIER</option>
                      <option value="system-ui, sans-serif">MINIMAL SANS</option>
                      <option value="'Georgia', serif">EDITORIAL SERIF</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Size</label>
                    <select
                      value={captionStyles.fontSize}
                      onChange={(e) => handleCustomStyleChange('fontSize', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 pr-8 text-xs text-zinc-200 focus:outline-none"
                    >
                      <option value="12px">12px</option>
                      <option value="24px">24px</option>
                      <option value="36px">36px</option>
                      <option value="48px">48px</option>
                      <option value="64px">64px</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Styles</label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => handleCustomStyleChange('fontWeight', captionStyles.fontWeight === '700' ? '400' : '700')}
                        className={`py-2 rounded-lg border text-xs font-bold transition-all ${captionStyles.fontWeight === '700' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'}`}
                      >
                        B
                      </button>
                      <button
                        onClick={() => handleCustomStyleChange('fontStyle', captionStyles.fontStyle === 'italic' ? 'normal' : 'italic')}
                        className={`py-2 rounded-lg border text-xs italic font-serif transition-all ${captionStyles.fontStyle === 'italic' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'}`}
                      >
                        I
                      </button>
                      <button
                        onClick={() => handleCustomStyleChange('textTransform', captionStyles.textTransform === 'uppercase' ? 'none' : 'uppercase')}
                        className={`py-2 rounded-lg border text-xs font-mono transition-all ${captionStyles.textTransform === 'uppercase' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'}`}
                      >
                        TT
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Color Accent</label>
                    <div className="flex gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                      {[
                        { label: 'Yellow', hex: '#fbbf24' },
                        { label: 'White', hex: '#ffffff' },
                        { label: 'Cyan', hex: '#22d3ee' },
                        { label: 'Red', hex: '#f87171' }
                      ].map(colorOpt => (
                        <button
                          key={colorOpt.hex}
                          onClick={() => handleCustomStyleChange('color', colorOpt.hex)}
                          className="w-6 h-6 rounded-full border border-zinc-800 transition-transform active:scale-90 relative shrink-0"
                          style={{ backgroundColor: colorOpt.hex }}
                        >
                          {captionStyles.color === colorOpt.hex && (
                            <div className="absolute inset-0 m-auto w-1.5 h-1.5 bg-zinc-950 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                /* VIEW 2: Default Presets List View */
                <div className="space-y-3">
                  {[
                    { id: 'bold-yellow', label: '🔥 Bold Kinetic (Yellow)', font: 'Impact, Arial Black, sans-serif', size: '48px', weight: '900', color: '#fbbf24', trans: 'uppercase', style: 'normal' },
                    { id: 'minimal-white', label: '📝 Minimal Lower Third', font: 'system-ui, sans-serif', size: '24px', weight: '500', color: '#ffffff', trans: 'none', style: 'normal' },
                    { id: 'cyber-neon', label: '⚡ Cyberpunk Glow', font: "'Courier New', Courier, monospace", size: '32px', weight: '700', color: '#22d3ee', trans: 'uppercase', style: 'italic' }
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setThemePreset(preset)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all duration-200 ${
                        captionStyles.preset === preset.id 
                          ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-md' 
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-800/50 text-zinc-400'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CLICKABLE TOGGLE SLIDE BAR KEY TRIGGER */}
          <button 
            onClick={() => setIsTimelineOpen(!isTimelineOpen)}
            className="h-3 w-full bg-zinc-900 border-t border-zinc-800 hover:bg-zinc-800/60 flex items-center justify-center transition-all group shrink-0"
          >
            <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-300">
              {isTimelineOpen ? <ChevronDown className="w-2 h-2" /> : <ChevronUp className="w-2 h-2" />}
            </div>
          </button>

          {/* SMOOTH ANIMATED SLIDING TIMELINE PANEL CONTAINER */}
          <div 
            style={{ height: isTimelineOpen ? '220px' : '0px' }} 
            className="shrink-0 w-full bg-zinc-900 overflow-hidden transition-[height] duration-300 ease-in-out"
          >
            <TimelineTrack 
              videoSrc={videoRef}
              captions={captions} 
              currentTime={currentTime} 
              duration={duration} 
              activeId={activeId}
              onSeek={handleTimelineSeek}
              onUpdateCaptions={handleUpdateCaptionsBulk}
            />
          </div>
        </main>
      </div>
    </div>
  );
}