import React, { useState, useRef, useEffect } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import TranscriptSidebar from './components/TranscriptSidebar';
import VideoViewport from './components/VideoViewport';
import TimelineTrack from './components/TimelineTrack';
import { Layers } from 'lucide-react';

const INITIAL_CAPTIONS = [
  { id: '1', start: 0.0, end: 2.5, text: "Welcome to TextMotion project dashboard!" },
  { id: '2', start: 2.6, end: 5.5, text: "This is a clean, modular React implementation." },
  { id: '3', start: 5.6, end: 9.0, text: "Ready to scale with your custom enhancements." }
];

export default function App() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [captions, setCaptions] = useState(INITIAL_CAPTIONS);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [stylePreset, setStylePreset] = useState('bold-yellow');
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef(null);

  // Synchronize dynamic subtitle highlighting based on timestamps
  useEffect(() => {
    const matching = captions.find(c => currentTime >= c.start && currentTime <= c.end);
    setActiveId(matching ? matching.id : null);
  }, [currentTime, captions]);
// Asynchronous network hook to pull live transcribed text layers
useEffect(() => {
  let isCurrentRequest = true;

  const fetchTranscribedCaptions = async () => {
    setIsLoading(true);
    console.log("Triggering network fetch instance to Beeceptor...");
    try {
      const response = await fetch('https://textmotion-test.free.beeceptor.com/v1/captions');
      const data = await response.json();
      console.log("Network layer execution result:", data);
      
      // UPDATED PARSING STRATEGY: Target data.words instead of data.segments
      if (isCurrentRequest && data && data.words) {
        const formattedData = data.words.map((item, index) => ({
          // Ensure your UI components receive a predictable, unified interface
          id: item.id || `cap_${index}_${Date.now()}`,
          text: item.word || '', // Map 'word' key into 'text' property for components
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
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

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
  };

  const handleTimelineSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      <WorkspaceHeader onVideoUpload={handleVideoUpload} />

      <div className="flex flex-1 overflow-hidden">
        <TranscriptSidebar 
          captions={captions} 
          activeId={activeId} 
          onUpdate={handleUpdateCaption} 
          onAdd={handleAddBlock} 
          onDelete={handleDeleteBlock} 
        />

        <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
          {/* FIXED: Adjusted grid layout bounds from grid-cols-3 to grid-cols-4 for proper column spacing alignment */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 p-6 gap-6 min-h-0 relative">
            
            {/* Loading Overlay State Indicator */}
            {isLoading && (
              <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl border border-zinc-800">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-zinc-400">Syncing Webhook Sequence Timelines...</span>
                </div>
              </div>
            )}

            {/* FIXED: Added lg:col-span-3 so the Video viewport properly stretches across the remaining workspace area */}
            <div className="lg:col-span-3 min-h-0 flex flex-col relative">
              <VideoViewport 
                videoSrc={videoSrc}
                videoRef={videoRef}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                activeCaption={captions.find(c => c.id === activeId)}
                stylePreset={stylePreset}
                onTogglePlay={handleTogglePlay}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              />
            </div>

            {/* Subtitle Presets Column - Takes exactly 1 column space */}
            <div className="lg:col-span-1 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-4 h-full overflow-y-auto">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Caption Presets</h3>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'bold-yellow', label: '🔥 Bold Kinetic (Yellow)' },
                  { id: 'minimal-white', label: '📝 Minimal Lower Third' },
                  { id: 'cyber-neon', label: '⚡ Cyberpunk Glow' }
                ].map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setStylePreset(preset.id)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all duration-200 ${
                      stylePreset === preset.id 
                        ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-md' 
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-800/50 text-zinc-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <TimelineTrack 
            captions={captions} 
            currentTime={currentTime} 
            duration={duration} 
            activeId={activeId}
            onSeek={handleTimelineSeek}
          />
        </main>
      </div>
    </div>
  );
}