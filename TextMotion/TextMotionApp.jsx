import React, { useState, useRef, useEffect } from 'react';
import WorkspaceHeader from './WorkspaceHeader';
import TranscriptSidebar from './TranscriptSidebar';
import VideoViewport from './VideoViewport';
import TimelineTrack from './TimelineTrack';
import CaptionEditor from './CaptionEditor';
import { Layers } from 'lucide-react';

const MOCK_DATA = [
  { id: '1', start: 0.0, end: 2.0, text: "Welcome to TextMotion project layout!" },
  { id: '2', start: 2.1, end: 5.0, text: "Highly modular and production ready." }
];

export default function TextMotionApp() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [captions, setCaptions] = useState(MOCK_DATA);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [stylePreset, setStylePreset] = useState('bold-yellow');
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);

  // Sync active caption highlights to current video time
  useEffect(() => {
    const matching = captions.find(c => currentTime >= c.start && currentTime <= c.end);
    setActiveId(matching ? matching.id : null);
  }, [currentTime, captions]);

  // Asynchronous network hook to pull live transcribed text layers
useEffect(() => {
  let isCurrentRequest = true;
  console.log("TextMotionApp mounted, initiating fetchTranscribedCaptions..."); // This will confirm the effect is running
  const fetchTranscribedCaptions = async () => {
    setIsLoading(true);
    console.log("Triggering API Fetch Request to Beeceptor..."); // This will now print!
    try {
      const response = await fetch('https://textmotion-test.free.beeceptor.com/v1/captions');
      const data = await response.json();
      console.log("Fetched webhook data:", data);
      
      if (isCurrentRequest) {
        loadWebhookData(data);
      }
    } catch (error) {
      console.error("Failed fetching processing layers:", error);
    } finally {
      if (isCurrentRequest) {
        setIsLoading(false);
      }
    }
  };

  // FORCE EXECUTION ON LOAD: We removed the "if (videoSrc)" wrapper
  fetchTranscribedCaptions();

  return () => {
    isCurrentRequest = false;
  };
}, [videoSrc]);


  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsPlaying(false);
      setCurrentTime(0);
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleUpdateCaption = (id, field, value) => {
    setCaptions(prev => prev.map(c => {
      if (c.id === id) {
        return { 
          ...c, 
          [field]: (field === 'start' || field === 'end') ? parseFloat(value) || 0 : value 
        };
      }
      return c;
    }));
  };

  const handleAddBlock = () => {
    const last = captions[captions.length - 1];
    const start = last ? last.end + 0.2 : 0;
    setCaptions([...captions, { id: Date.now().toString(), start, end: start + 2.5, text: "New Text Line..." }]);
  };

  const handleDeleteBlock = (id) => {
    setCaptions(prev => prev.filter(c => c.id !== id));
  };

  const handleSeekTime = (targetTime) => {
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const loadWebhookData = (webhookPayload) => {
    if (!webhookPayload || !webhookPayload.segments) return;
    
    const formattedData = webhookPayload.segments.map((item, index) => ({
      id: item.id || `cap_${index}_${Date.now()}`,
      text: item.text || item.transcript || '',
      start: parseFloat(item.start ?? item.start_time ?? 0),
      end: parseFloat(item.end ?? item.end_time ?? 0),
    }));
    
    setCaptions(formattedData);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none">
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
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 p-6 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
            
            {/* Columns 1 & 2: Video Workspace */}
            <div className="lg:col-span-2 min-h-0 flex flex-col relative">
              {isLoading && (
                <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl border border-zinc-800">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-zinc-400">Syncing Webhook Sequence Timelines...</span>
                  </div>
                </div>
              )}
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

            {/* Column 3: Config Panel & Webhook Editor Array */}
            <div className="lg:col-span-1 flex flex-col gap-4 min-h-0 overflow-hidden">
              {/* Presets Subsection Box */}
              <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Presets</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['bold-yellow', 'minimal-white', 'cyber-neon'].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setStylePreset(preset)}
                      className={`text-center py-2 rounded-xl border text-[10px] font-medium capitalize transition ${
                        stylePreset === preset 
                          ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-md' 
                          : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {preset.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption Editor Box */}
              <div className="flex-1 min-h-0">
                <CaptionEditor 
                  initialCaptions={captions}
                  onCaptionsChange={(updatedList) => setCaptions(updatedList)}
                  onPreviewSegment={handleSeekTime}
                />
              </div>
            </div>

          </div>

          <TimelineTrack 
            videoSrc={videoSrc} 
            captions={captions} 
            currentTime={currentTime} 
            duration={duration} 
            activeId={activeId}
            onSeek={handleSeekTime}
          />
        </main>
      </div>
    </div>
  );
}