return (
  <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none">
    <WorkspaceHeader onVideoUpload={handleVideoUpload} />

    {/* Primary Layout Container Deck */}
    <div className="flex flex-1 overflow-hidden">
      
      {/* ⚠️ NOTE: We removed TranscriptSidebar completely from the far left! */}

      <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 p-6 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
          
          {/* Columns 1 & 2: Main Interactive Media Screen Monitoring Viewport */}
          <div className="lg:col-span-2 min-h-0 flex flex-col relative">
            {isLoading && (
              <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl border border-zinc-800">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
              captions={captions}
              captionStyles={captionStyles}
              onTogglePlay={handleTogglePlay}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            />
          </div>

          {/* Column 3: The Combined Captions & Style Workspace Editor */}
          <div className="lg:col-span-1 flex flex-col min-h-0 overflow-hidden">
            <CaptionEditor 
              initialCaptions={captions}
              activeId={activeId}
              selectedIds={selectedIds}
              captionStyles={captionStyles}
              onSelectCaption={handleSelectCaption}
              onCaptionsChange={(updatedList) => setCaptions(updatedList)}
              onPreviewSegment={handleSeekTime}
              onApplyPreset={handleApplyPreset}
              onUpdateCustomStyle={handleUpdateCustomStyle}
            />
          </div>

        </div>

        {/* Bottom Horizontal Timeline Strip */}
        <TimelineTrack 
          videoSrc={videoSrc} 
          captions={captions} 
          currentTime={currentTime} 
          duration={duration} 
          activeId={activeId}
          selectedIds={selectedIds}
          onSelectCaption={handleSelectCaption}
          onSeek={handleSeekTime}
        />
      </main>
    </div>
  </div>
);