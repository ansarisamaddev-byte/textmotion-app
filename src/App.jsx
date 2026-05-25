import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import TranscriptSidebar from './components/TranscriptSidebar';
import VideoViewport from './components/VideoViewport';
import TimelineTrack from './components/TimelineTrack';
import ExportOverlay from './components/ExportOverlay';
import EditorToolsMenu from './components/editor/EditorToolsMenu';
import PresetCaptionPanel from './components/editor/PresetCaptionPanel';
import ElementsPanel from './components/editor/ElementsPanel';
import StyleEditorPanel from './components/editor/StyleEditorPanel';
import AnimatePanel from './components/editor/AnimatePanel';
import { ChevronLeft } from 'lucide-react';
import { renderCaptionFrame } from './lib/captionRenderer';
import { INITIAL_CAPTIONS, DEFAULT_CAPTION_STYLES, DEFAULT_CAPTION_FIELDS } from './constants/captions';
import { STYLE_PRESETS } from './constants/stylePresets';
import { stylesFromCaption, reorderCaptions } from './utils/captionStyles';
import { retimeCaptionsSequential } from './utils/captionTiming';
import { buildStateFromLookPreset } from './utils/applyLookPreset';
import { createElement } from './utils/elementFactory';
import {
  clampClipRange,
  splitCaptionAtTime,
  splitElementAtTime,
  replaceItemWithSplit,
  resolveCutTarget
} from './utils/timelineEdit';
import { remapElementsAfterRemoveTrack } from './utils/elementLayers';
import { timelineTracksHeight } from './constants/timeline';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { exportVideo } from './services/videoExport';

export { STYLE_PRESETS } from './constants/stylePresets';
export { renderCaptionFrame } from './lib/captionRenderer';

export default function App() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [captions, setCaptions] = useState(INITIAL_CAPTIONS);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(180);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [zoomScale, setZoomScale] = useState(100);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [activePanel, setActivePanel] = useState('menu');
  const [captionStyles, setCaptionStyles] = useState(DEFAULT_CAPTION_STYLES);
  const [timelineHeight, setTimelineHeight] = useState(() => Math.max(200, timelineTracksHeight(1) + 44));
  const [helpOpen, setHelpOpen] = useState(false);
  const [elements, setElements] = useState([]);
  const [activeElementId, setActiveElementId] = useState(null);
  const [elementLayerCount, setElementLayerCount] = useState(1);

  const videoRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const isExportingRef = useRef(false);
  const captionsRef = useRef(captions);
  const elementsRef = useRef(elements);
  const currentTimeRef = useRef(currentTime);
  const captionStylesRef = useRef(captionStyles);
  const zoomScaleRef = useRef(zoomScale);
  const translateXRef = useRef(translateX);
  const translateYRef = useRef(translateY);

  useEffect(() => { captionsRef.current = captions; }, [captions]);
  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { captionStylesRef.current = captionStyles; }, [captionStyles]);
  useEffect(() => { zoomScaleRef.current = zoomScale; }, [zoomScale]);
  useEffect(() => { translateXRef.current = translateX; }, [translateX]);
  useEffect(() => { translateYRef.current = translateY; }, [translateY]);

  const getSnapshot = useCallback(() => ({
    captions: captions.map(c => ({ ...c })),
    elements: (elements || []).map(e => ({ ...e })),
    styles: { ...captionStyles },
    activeId,
    activeElementId,
    elementLayerCount,
    selectedIds: [...selectedIds],
    currentTime: videoRef.current ? videoRef.current.currentTime : currentTime
  }), [captions, elements, captionStyles, activeId, activeElementId, elementLayerCount, selectedIds, currentTime]);

  const applyHistoryState = useCallback((state) => {
    captionsRef.current = state.captions;
    elementsRef.current = state.elements || [];
    captionStylesRef.current = state.styles;
    currentTimeRef.current = state.currentTime;
    setCaptions(state.captions);
    setElements(state.elements || []);
    setCaptionStyles(state.styles);
    setActiveId(state.activeId);
    setActiveElementId(state.activeElementId ?? null);
    setElementLayerCount(state.elementLayerCount ?? 1);
    setSelectedIds(state.selectedIds);
    setCurrentTime(state.currentTime);
    if (videoRef.current) videoRef.current.currentTime = state.currentTime;
  }, []);

  const {
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
    beginTransaction,
    endTransaction,
    clearHistory
  } = useUndoRedo(getSnapshot, applyHistoryState);

  const dispatchChange = useCallback((newCaptions, newStyles, newElements) => {
    const nextElements = newElements !== undefined ? newElements : elementsRef.current;
    commit(newCaptions, newStyles, nextElements);
    captionsRef.current = newCaptions;
    captionStylesRef.current = newStyles;
    elementsRef.current = nextElements;
    setElements(nextElements);
  }, [commit]);

  const updateElementsLive = useCallback((nextElements) => {
    elementsRef.current = nextElements;
    setElements(nextElements);
  }, []);

  const updateCaptionsLive = useCallback((nextCaptions) => {
    captionsRef.current = nextCaptions;
    setCaptions(nextCaptions);
  }, []);

  const refreshCanvas = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderCaptionFrame(ctx, canvas, video, captionsRef.current, captionStylesRef.current, elementsRef.current);
    }
  }, []);

  const handleElementTransformLive = useCallback((id, props) => {
    updateElementsLive(
      elementsRef.current.map(el => (el.id === id ? { ...el, ...props } : el))
    );
    refreshCanvas();
  }, [updateElementsLive, refreshCanvas]);

  const handleElementTransformCommit = useCallback(() => {
    dispatchChange(captionsRef.current, captionStylesRef.current, elementsRef.current);
  }, [dispatchChange]);

  const handleTransformLive = useCallback((id, props) => {
    updateCaptionsLive(
      captionsRef.current.map(c => (c.id === id ? { ...c, ...props } : c))
    );
    refreshCanvas();
  }, [updateCaptionsLive, refreshCanvas]);

  const handleTransformCommit = useCallback(() => {
    dispatchChange(captionsRef.current, captionStylesRef.current, elementsRef.current);
  }, [dispatchChange]);

  useEffect(() => {
    return () => {
      if (videoSrc?.startsWith('blob:')) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  useEffect(() => {
    refreshCanvas();
  }, [currentTime, captions, elements, captionStyles, activeId, activeElementId, selectedIds, refreshCanvas]);

  useEffect(() => {
    let animId;
    const updateLoop = () => {
      const video = videoRef.current;
      const canvas = previewCanvasRef.current;
      if (video && canvas && !video.paused && !video.ended) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderCaptionFrame(ctx, canvas, video, captionsRef.current, captionStylesRef.current, elementsRef.current);
      }
      animId = requestAnimationFrame(updateLoop);
    };
    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    if (!videoSrc) {
      setActiveId(null);
      return;
    }
    if (isPlaying) {
      const block = captions.find(c => currentTime >= c.start && currentTime <= c.end);
      if (block) {
        setActiveId(block.id);
        setSelectedIds([block.id]);
      } else {
        setActiveId(null);
      }
    } else if (selectedIds.length > 0) {
      setActiveId(selectedIds[0]);
    }
  }, [currentTime, isPlaying, captions, videoSrc, selectedIds]);

  const syncActiveCaptionFromTime = useCallback((time, caps = captions) => {
    const match = caps.find(c => time >= c.start && time <= c.end);
    if (match) {
      if (activeId !== match.id) setActiveId(match.id);
      setSelectedIds([match.id]);
      setCaptionStyles(prev => stylesFromCaption(match, prev));
    } else {
      setActiveId(null);
      setSelectedIds([]);
    }
  }, [captions, activeId]);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (videoSrc?.startsWith('blob:')) URL.revokeObjectURL(videoSrc);
    setVideoSrc(URL.createObjectURL(file));
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setElements([]);
    setActiveElementId(null);
    setElementLayerCount(1);
    elementsRef.current = [];
    clearHistory();
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimelineSeek = (time) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    currentTimeRef.current = time;
    setCurrentTime(time);
    syncActiveCaptionFromTime(time);
    refreshCanvas();
  };

  const handleSelectCaption = (id) => {
    setActiveElementId(null);
    setSelectedIds([id]);
    setActiveId(id);
    const targeted = captions.find(c => c.id === id);
    if (targeted) {
      setCaptionStyles(prev => stylesFromCaption(targeted, prev));
      if (videoRef.current) {
        const video = videoRef.current;
        const onSeeked = () => {
          setCurrentTime(targeted.start);
          currentTimeRef.current = targeted.start;
          refreshCanvas();
          video.removeEventListener('seeked', onSeeked);
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = targeted.start;
      }
    }
  };

  const handleAddBlock = () => {
    const last = captions[captions.length - 1];
    const start = last ? parseFloat((last.end + 0.1).toFixed(1)) : 0;
    dispatchChange([...captions, {
      id: Date.now().toString(),
      start,
      end: start + 2.5,
      text: 'New...',
      ...DEFAULT_CAPTION_FIELDS
    }], captionStyles);
  };

  const handleDeleteBlock = (id) => {
    dispatchChange(captions.filter(c => c.id !== id), captionStyles);
  };

  const handleReorderCaptions = (fromIndex, toIndex) => {
    const reordered = reorderCaptions(captions, fromIndex, toIndex);
    const retimed = retimeCaptionsSequential(reordered);
    dispatchChange(retimed, captionStyles);
    const moved = retimed[toIndex];
    if (moved) handleSelectCaption(moved.id);
  };

  const handleZoomIn = useCallback(() => {
    setZoomScale(prev => Math.min(400, prev + 25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomScale(prev => {
      const next = Math.max(100, prev - 25);
      if (next <= 100) {
        setTranslateX(0);
        setTranslateY(0);
      }
      return next;
    });
  }, []);

  const handleResetView = useCallback(() => {
    setZoomScale(100);
    setTranslateX(0);
    setTranslateY(0);
  }, []);

  const handleSelectElement = useCallback((id) => {
    setActiveElementId(id);
    setActiveId(null);
    setSelectedIds([]);
    const el = elementsRef.current.find(e => e.id === id);
    if (!el || !videoRef.current) return;
    const video = videoRef.current;
    const t = video.currentTime;
    const inRange = t >= el.start && t <= el.end;
    const seekTime = inRange
      ? t
      : el.start + Math.min(0.2, Math.max(0.05, (el.end - el.start) * 0.15));

    const afterSeek = () => {
      setCurrentTime(seekTime);
      currentTimeRef.current = seekTime;
      refreshCanvas();
      video.removeEventListener('seeked', afterSeek);
    };

    if (!inRange || Math.abs(t - seekTime) > 0.02) {
      video.addEventListener('seeked', afterSeek);
      video.currentTime = seekTime;
    } else {
      afterSeek();
    }
  }, [refreshCanvas]);

  const handleCaptionTimeLive = useCallback((id, { start, end }) => {
    const cap = captionsRef.current.find(c => c.id === id);
    if (!cap || !duration) return;
    const range = clampClipRange(start ?? cap.start, end ?? cap.end, duration);
    updateCaptionsLive(
      captionsRef.current.map(c => (c.id === id ? { ...c, ...range } : c))
    );
  }, [duration, updateCaptionsLive]);

  useEffect(() => {
    const minH = timelineTracksHeight(elementLayerCount) + 44;
    setTimelineHeight(prev => Math.max(prev, minH));
  }, [elementLayerCount]);

  const handleElementTimeLive = useCallback((id, { start, end }) => {
    const el = elementsRef.current.find(e => e.id === id);
    if (!el || !duration) return;
    const range = clampClipRange(start ?? el.start, end ?? el.end, duration);
    updateElementsLive(
      elementsRef.current.map(e => (e.id === id ? { ...e, ...range } : e))
    );
    refreshCanvas();
  }, [duration, updateElementsLive, refreshCanvas]);

  const handleElementLayerLive = useCallback((id, layer) => {
    updateElementsLive(
      elementsRef.current.map(e => (e.id === id ? { ...e, layer } : e))
    );
    setElementLayerCount(c => Math.max(c, layer + 1));
  }, [updateElementsLive]);

  const handleCaptionTimeLiveWithRefresh = useCallback((id, range) => {
    handleCaptionTimeLive(id, range);
    refreshCanvas();
  }, [handleCaptionTimeLive, refreshCanvas]);

  const handleTrimCommit = useCallback(() => {
    endTransaction();
    dispatchChange(captionsRef.current, captionStylesRef.current, elementsRef.current);
    refreshCanvas();
  }, [dispatchChange, endTransaction, refreshCanvas]);

  const handleAddElementLayer = useCallback(() => {
    setElementLayerCount(c => Math.min(5, c + 1));
  }, []);

  const handleRemoveElementLayer = useCallback(() => {
    setElementLayerCount(c => {
      if (c <= 1) return c;
      const removedIndex = c - 1;
      const newCount = c - 1;
      const remapped = remapElementsAfterRemoveTrack(elementsRef.current, removedIndex, newCount);
      dispatchChange(captionsRef.current, captionStylesRef.current, remapped);
      if (activeElementId) {
        const still = remapped.find(e => e.id === activeElementId);
        if (!still) setActiveElementId(null);
      }
      setTimeout(refreshCanvas, 0);
      return newCount;
    });
  }, [activeElementId, dispatchChange, refreshCanvas]);

  const handleCutAtPlayhead = useCallback(() => {
    const t = videoRef.current?.currentTime ?? currentTimeRef.current;
    const target = resolveCutTarget(
      captionsRef.current,
      elementsRef.current,
      t,
      activeId,
      activeElementId
    );
    if (!target) return;

    if (target.kind === 'element') {
      const pair = splitElementAtTime(target.item, t);
      if (!pair) return;
      const next = replaceItemWithSplit(elementsRef.current, target.item.id, pair);
      dispatchChange(captionsRef.current, captionStylesRef.current, next);
      setActiveElementId(pair[1].id);
      setActiveId(null);
      setSelectedIds([]);
    } else {
      const pair = splitCaptionAtTime(target.item, t);
      if (!pair) return;
      const next = replaceItemWithSplit(captionsRef.current, target.item.id, pair);
      dispatchChange(next, captionStylesRef.current, elementsRef.current);
      setActiveId(pair[1].id);
      setActiveElementId(null);
      setSelectedIds([pair[1].id]);
    }
    setTimeout(refreshCanvas, 0);
  }, [activeId, activeElementId, dispatchChange, refreshCanvas]);

  const handleAddElement = useCallback((type) => {
    const t = videoRef.current?.currentTime ?? currentTime;
    const activeEl = elementsRef.current.find(e => e.id === activeElementId);
    const el = createElement(type, t, duration, elementsRef.current, activeEl, elementLayerCount);
    const neededTracks = (el.layer ?? 0) + 1;
    if (neededTracks > elementLayerCount) setElementLayerCount(neededTracks);
    const next = [...elementsRef.current, el];
    dispatchChange(captionsRef.current, captionStylesRef.current, next);
    setActiveElementId(el.id);
    setActiveId(null);
    setSelectedIds([]);
    setActivePanel('elements');
    setTimeout(refreshCanvas, 0);
  }, [currentTime, duration, elementLayerCount, dispatchChange, refreshCanvas]);

  const handleUpdateElement = useCallback((id, props) => {
    const next = elementsRef.current.map(el => (el.id === id ? { ...el, ...props } : el));
    dispatchChange(captionsRef.current, captionStylesRef.current, next);
    setTimeout(refreshCanvas, 0);
  }, [dispatchChange, refreshCanvas]);

  const handleDeleteElement = useCallback((id) => {
    const next = elementsRef.current.filter(el => el.id !== id);
    dispatchChange(captionsRef.current, captionStylesRef.current, next);
    if (activeElementId === id) setActiveElementId(null);
    setTimeout(refreshCanvas, 0);
  }, [activeElementId, dispatchChange, refreshCanvas]);

  const handleElementSpeedLive = useCallback((speed) => {
    if (!activeElementId) return;
    updateElementsLive(elementsRef.current.map(el =>
      el.id === activeElementId ? { ...el, animationDuration: speed } : el
    ));
    refreshCanvas();
  }, [activeElementId, updateElementsLive, refreshCanvas]);

  const handleDeleteActive = useCallback(() => {
    if (activeElementId) {
      handleDeleteElement(activeElementId);
      return;
    }
    if (!activeId || captions.length <= 1) return;
    handleDeleteBlock(activeId);
  }, [activeElementId, activeId, captions.length, handleDeleteElement]);

  const handleSeekBy = useCallback((delta) => {
    if (!videoRef.current || !duration) return;
    const t = Math.max(0, Math.min(duration, (videoRef.current.currentTime || 0) + delta));
    handleTimelineSeek(t);
  }, [duration, handleTimelineSeek]);

  const handleUpdateCaptionLive = (id, property, value) => {
    beginTransaction();
    const parsed = property === 'start' || property === 'end' ? parseFloat(value) : value;
    updateCaptionsLive(captionsRef.current.map(c =>
      c.id === id ? { ...c, [property]: parsed } : c
    ));
  };

  const handleUpdateCaptionCommit = () => {
    endTransaction();
  };

  const previewCaptionAnimation = (caption) => {
    if (!caption || !videoRef.current) return;
    const video = videoRef.current;
    video.pause();
    setIsPlaying(false);
    const previewTime = caption.start + Math.min(0.1, (parseFloat(caption.animationDuration) || 0.5) * 0.15);
    const refresh = () => {
      setCurrentTime(previewTime);
      currentTimeRef.current = previewTime;
      refreshCanvas();
    };
    if (Math.abs(video.currentTime - previewTime) < 0.05) {
      refresh();
      return;
    }
    const onSeeked = () => {
      refresh();
      video.removeEventListener('seeked', onSeeked);
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = previewTime;
  };

  const updateCaption = (id, newProps) => {
    if (!id) return;
    const updatedCaptions = captions.map(c => c.id === id ? { ...c, ...newProps } : c);
    const { animation, animationDuration, animationAnimateAll, ...styleOnly } = newProps;
    const nextStyles = Object.keys(styleOnly).length > 0
      ? { ...captionStyles, ...styleOnly }
      : captionStyles;
    dispatchChange(updatedCaptions, nextStyles);
    if (animation !== undefined || animationAnimateAll !== undefined) {
      const target = updatedCaptions.find(c => c.id === id);
      if (target?.animation && target.animation !== 'none') previewCaptionAnimation(target);
    }
  };

  const updateCaptionSpeedLive = (speed) => {
    if (!activeId) return;
    updateCaptionsLive(captionsRef.current.map(c =>
      c.id === activeId ? { ...c, animationDuration: speed } : c
    ));
  };

  const handleCustomStyleChange = (field, value) => {
    const nextStyles = { ...captionStyles, preset: 'custom', [field]: value };
    const nextCaptions = captions.map(c =>
      selectedIds.includes(c.id) ? { ...c, [field]: value } : c
    );
    dispatchChange(nextCaptions, nextStyles);
  };

  const setThemePreset = (preset) => {
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
    const nextCaptions = captions.map(c =>
      selectedIds.includes(c.id) ? { ...c, ...updatedStyles } : c
    );
    dispatchChange(nextCaptions, updatedStyles);
  };

  const applyLookPreset = useCallback((look) => {
    const { styles, captions: nextCaptions } = buildStateFromLookPreset(look, captionsRef.current);
    dispatchChange(nextCaptions, styles, elementsRef.current);
    setTimeout(refreshCanvas, 0);
    if (activeId) {
      const cap = nextCaptions.find(c => c.id === activeId);
      if (cap?.animation && cap.animation !== 'none') previewCaptionAnimation(cap);
    }
  }, [dispatchChange, refreshCanvas, activeId]);

  const handleExportVideo = async () => {
    if (!videoSrc || !videoRef.current) return;
    isExportingRef.current = true;
    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportVideo({
        videoSrc,
        mainVideo: videoRef.current,
        captions,
        captionStyles,
        elements,
        duration,
        isExportingRef,
        onProgress: setExportProgress,
        onStatus: () => {}
      });
    } finally {
      isExportingRef.current = false;
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleCancelExport = () => {
    isExportingRef.current = false;
    setIsExporting(false);
    setExportProgress(0);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    syncActiveCaptionFromTime(t);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleTimelineResizeStart = (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    const startY = mouseDownEvent.clientY;
    const startHeight = timelineHeight;
    const minH = timelineTracksHeight(elementLayerCount) + 40;
    const doDrag = (e) => {
      const newHeight = startHeight - (e.clientY - startY);
      if (newHeight >= minH && newHeight <= 420) setTimelineHeight(newHeight);
    };
    const stopDrag = () => {
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  const handleSeparatorMouseDown = (e) => {
    e.preventDefault();
    const onMove = (ev) => setSidebarWidth(Math.max(180, Math.min(250, ev.clientX)));
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const currentActiveCaption = captions.find(c => c.id === activeId);
  const currentActiveElement = elements.find(e => e.id === activeElementId);

  const shortcutHandlers = useMemo(() => ({
    onTogglePlay: () => videoSrc && handleTogglePlay(),
    onUndo: undo,
    onRedo: redo,
    onDelete: handleDeleteActive,
    onSeekBack: () => handleSeekBy(-0.1),
    onSeekForward: () => handleSeekBy(0.1),
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onResetView: handleResetView,
    onAddCaption: handleAddBlock,
    onOpenPanel: setActivePanel,
    onEscape: () => setActivePanel('menu'),
    onShowHelp: () => setHelpOpen(true),
    onCut: handleCutAtPlayhead
  }), [
    videoSrc, undo, redo, handleDeleteActive, handleSeekBy,
    handleZoomIn, handleZoomOut, handleResetView, handleAddBlock,
    handleCutAtPlayhead
  ]);

  useKeyboardShortcuts(shortcutHandlers, true);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden relative">
      <WorkspaceHeader
        onVideoUpload={handleVideoUpload}
        onExport={handleExportVideo}
        isExporting={isExporting}
        exportProgress={exportProgress}
        hasVideo={!!videoSrc}
        helpOpen={helpOpen}
        onHelpOpenChange={setHelpOpen}
      />

      <div className="flex flex-1 overflow-hidden w-full relative">
        <div style={{ width: `${sidebarWidth}px` }} className="shrink-0 h-full overflow-hidden">
          <TranscriptSidebar
            captions={captions}
            activeId={activeId}
            selectedIds={selectedIds}
            onSelectCaption={handleSelectCaption}
            onUpdate={handleUpdateCaptionLive}
            onUpdateCommit={handleUpdateCaptionCommit}
            onAdd={handleAddBlock}
            onDelete={handleDeleteBlock}
            onReorder={handleReorderCaptions}
          />
        </div>

        <div onMouseDown={handleSeparatorMouseDown} className="w-1.5 h-full bg-zinc-900 hover:bg-indigo-500/80 cursor-col-resize shrink-0 z-40" />

        <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden min-w-0">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 p-6 gap-6 min-h-0 relative overflow-hidden">
            <div className={`lg:col-span-4 min-h-0 flex flex-col relative ${isDraggingText ? 'cursor-grabbing' : ''}`}>
              <VideoViewport
                videoSrc={videoSrc}
                videoRef={videoRef}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onTogglePlay={handleTogglePlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                zoomScale={zoomScale}
                translateX={translateX}
                translateY={translateY}
                onZoomChange={setZoomScale}
                onPanChange={(x, y) => { setTranslateX(x); setTranslateY(y); }}
                handleResetView={handleResetView}
                previewCanvasRef={previewCanvasRef}
                captions={captions}
                elements={elements}
                captionStyles={captionStyles}
                activeId={activeId}
                activeElementId={activeElementId}
                onSelectCaption={handleSelectCaption}
                onSelectElement={handleSelectElement}
                onTransformLive={handleTransformLive}
                onTransformCommit={handleTransformCommit}
                onElementTransformLive={handleElementTransformLive}
                onElementTransformCommit={handleElementTransformCommit}
                beginTransaction={beginTransaction}
                endTransaction={endTransaction}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
              />
            </div>

            <div className="lg:col-span-1 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-3 flex flex-col min-h-0 h-full overflow-hidden">
              {activePanel === 'menu' ? (
                <EditorToolsMenu onSelectPanel={setActivePanel} />
              ) : (
                <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300 min-h-0">
                  <button
                    type="button"
                    onClick={() => setActivePanel('menu')}
                    className="flex items-center text-xs text-zinc-500 hover:text-white mb-3 transition-colors shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Tools
                  </button>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                    {activePanel === 'caption-presets' && (
                      <PresetCaptionPanel
                        onApplyLookPreset={applyLookPreset}
                        activeLookId={captionStyles.preset}
                      />
                    )}
                    {activePanel === 'preset-font' && (
                      <div className="space-y-2">
                        {STYLE_PRESETS.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setThemePreset(p)}
                            className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-left hover:border-indigo-500"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {activePanel === 'custom-font' && (
                      <StyleEditorPanel captionStyles={captionStyles} onStyleChange={handleCustomStyleChange} />
                    )}
                    {activePanel === 'elements' && (
                      <ElementsPanel
                        activeElement={currentActiveElement}
                        elementLayerCount={elementLayerCount}
                        onAddElementLayer={handleAddElementLayer}
                        onRemoveElementLayer={handleRemoveElementLayer}
                        onAddElement={handleAddElement}
                        onUpdateElement={handleUpdateElement}
                        onDeleteElement={handleDeleteElement}
                        onApplyAnimation={(id, animId) => handleUpdateElement(id, { animation: animId })}
                        onSpeedChange={handleElementSpeedLive}
                        onSpeedCommit={{ begin: beginTransaction, end: endTransaction }}
                        onAnimateAllChange={(id, val) => handleUpdateElement(id, { animationAnimateAll: val })}
                      />
                    )}
                    {activePanel === 'custom-animate' && (
                      <AnimatePanel
                        activeCaption={currentActiveCaption}
                        onApplyAnimation={(animId) => updateCaption(activeId, { animation: animId })}
                        onSpeedChange={updateCaptionSpeedLive}
                        onSpeedCommit={{ begin: beginTransaction, end: endTransaction }}
                        onAnimateAllChange={(val) => updateCaption(activeId, { animationAnimateAll: val })}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: `${timelineHeight}px` }} className="shrink-0 w-full bg-zinc-900 overflow-hidden relative border-t border-zinc-800/80 flex flex-col min-h-0">
            <div onMouseDown={handleTimelineResizeStart} className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize bg-transparent hover:bg-indigo-500/60 transition-colors z-50" />
            <div className="flex-1 min-h-0 w-full">
              <TimelineTrack
                videoSrc={videoSrc}
                captions={captions}
                elements={elements}
                currentTime={currentTime}
                duration={duration}
                activeId={activeId}
                activeElementId={activeElementId}
                onSelectCaption={handleSelectCaption}
                onSelectElement={handleSelectElement}
                onSeek={handleTimelineSeek}
                elementLayerCount={elementLayerCount}
                onCaptionTimeLive={handleCaptionTimeLiveWithRefresh}
                onElementTimeLive={handleElementTimeLive}
                onElementLayerLive={handleElementLayerLive}
                onTrimBegin={beginTransaction}
                onTrimCommit={handleTrimCommit}
                onMoveCommit={handleTrimCommit}
                onAddElementLayer={handleAddElementLayer}
                onRemoveElementLayer={handleRemoveElementLayer}
                onCutAtPlayhead={handleCutAtPlayhead}
                timelineHeight={timelineHeight}
              />
            </div>
          </div>
        </main>
      </div>

      {isExporting && <ExportOverlay exportProgress={exportProgress} onCancel={handleCancelExport} />}
    </div>
  );
}
