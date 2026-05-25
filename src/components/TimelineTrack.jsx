import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, Film, ZoomIn, ZoomOut, Scissors, Plus, Minus } from 'lucide-react';
import { resolveCutTarget } from '../utils/timelineEdit';
import { getElementTimelineLabel } from '../utils/elementFactory';
import { elementsByLayer, layerIndexFromDrag } from '../utils/elementLayers';
import {
  MAX_ELEMENT_LAYERS,
  TIMELINE_PX_PER_SEC_BASE,
  TIMELINE_LABEL_WIDTH,
  TRACK
} from '../constants/timeline';
import TimelineClip from './TimelineClip';

export default function TimelineTrack({
  videoSrc,
  captions = [],
  elements = [],
  currentTime,
  duration,
  activeId,
  activeElementId,
  elementLayerCount = 1,
  timelineHeight = 200,
  onSeek,
  onSelectCaption,
  onSelectElement,
  onCaptionTimeLive,
  onElementTimeLive,
  onElementLayerLive,
  onTrimBegin,
  onTrimCommit,
  onMoveCommit,
  onCutAtPlayhead,
  onAddElementLayer,
  onRemoveElementLayer
}) {
  const scrollRef = useRef(null);
  const measureRef = useRef(null);
  const trimSessionRef = useRef(null);
  const moveSessionRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [thumbnails, setThumbnails] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const visibleLayers = Math.min(MAX_ELEMENT_LAYERS, Math.max(1, elementLayerCount));

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setViewportWidth(Math.max(320, entry.contentRect.width));
    });
    ro.observe(el);
    setViewportWidth(Math.max(320, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const pxPerSec = TIMELINE_PX_PER_SEC_BASE * zoomLevel;
  const contentWidth = useMemo(() => {
    if (!duration || duration <= 0) return viewportWidth;
    return Math.max(viewportWidth, duration * pxPerSec);
  }, [duration, viewportWidth, pxPerSec]);

  const timeToX = useCallback((t) => {
    if (!duration) return 0;
    return (t / duration) * contentWidth;
  }, [duration, contentWidth]);

  const pxToDeltaTime = useCallback((dx) => {
    if (!duration || !contentWidth) return 0;
    return (dx / contentWidth) * duration;
  }, [duration, contentWidth]);

  const elementLayers = useMemo(
    () => elementsByLayer(elements, visibleLayers),
    [elements, visibleLayers]
  );

  useEffect(() => {
    if (!videoSrc || !duration || duration <= 0) {
      setThumbnails([]);
      return;
    }
    let alive = true;
    let hiddenVideo = null;
    const generateThumbnails = async () => {
      setIsGenerating(true);
      const generatedImages = [];
      const count = 12;
      const interval = duration / count;
      try {
        hiddenVideo = document.createElement('video');
        hiddenVideo.src = videoSrc;
        hiddenVideo.muted = true;
        hiddenVideo.playsInline = true;
        hiddenVideo.crossOrigin = 'anonymous';
        hiddenVideo.style.cssText = 'position:fixed;opacity:0.001;width:1px;height:1px;pointer-events:none';
        document.body.appendChild(hiddenVideo);
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        await new Promise((resolve, reject) => {
          if (hiddenVideo.readyState >= 2) resolve();
          else {
            hiddenVideo.onloadeddata = () => resolve();
            hiddenVideo.onerror = () => reject();
          }
        });
        for (let i = 0; i < count; i++) {
          if (!alive) break;
          hiddenVideo.currentTime = Math.min(duration - 0.05, i * interval);
          await new Promise((resolve) => {
            const done = () => {
              hiddenVideo.removeEventListener('seeked', done);
              try {
                ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
                generatedImages.push({ url: canvas.toDataURL('image/jpeg', 0.35) });
              } catch (_) { /* skip */ }
              resolve();
            };
            hiddenVideo.addEventListener('seeked', done);
            setTimeout(done, 350);
          });
        }
        if (alive && generatedImages.length) setThumbnails(generatedImages);
      } catch (err) {
        console.warn('Timeline thumbnails:', err);
      } finally {
        if (alive) setIsGenerating(false);
        hiddenVideo?.parentNode?.removeChild(hiddenVideo);
      }
    };
    generateThumbnails();
    return () => {
      alive = false;
      hiddenVideo?.parentNode?.removeChild(hiddenVideo);
    };
  }, [videoSrc, duration]);

  const ticks = useMemo(() => {
    if (!duration || duration <= 0) return [];
    let step = 1;
    if (zoomLevel >= 4) step = 0.1;
    else if (zoomLevel >= 3) step = 0.25;
    else if (zoomLevel >= 2) step = 0.5;
    else if (zoomLevel >= 1.5) step = 1;
    else step = 2;
    const out = [];
    for (let t = 0; t <= duration + 0.001; t += step) {
      const time = parseFloat(t.toFixed(2));
      if (time > duration) break;
      const isMajor = Math.abs(time - Math.round(time)) < 0.01;
      out.push({
        time,
        label: isMajor ? `${Math.round(time)}s` : `${time.toFixed(1)}s`,
        leftPx: timeToX(time),
        isMajor
      });
    }
    return out;
  }, [duration, zoomLevel, timeToX]);

  const seekFromClientX = useCallback((clientX, contentEl) => {
    if (!contentEl || !duration) return;
    const rect = contentEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    onSeek((x / contentWidth) * duration);
  }, [contentWidth, duration, onSeek]);

  const formatTime = (s) => (Number.isFinite(s) ? s.toFixed(2) : '0.00');
  const playheadLeft = duration > 0 ? timeToX(currentTime) : 0;

  const beginCaptionTrim = (id, edge) => {
    const cap = captions.find(c => c.id === id);
    if (!cap) return;
    trimSessionRef.current = { kind: 'caption', id, start: cap.start, end: cap.end, edge };
    onTrimBegin?.();
  };

  const beginElementTrim = (id, edge) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    trimSessionRef.current = { kind: 'element', id, start: el.start, end: el.end, edge };
    onTrimBegin?.();
  };

  const applyCaptionTrim = (id, totalDx, edge) => {
    const s = trimSessionRef.current;
    if (!s || s.id !== id || s.kind !== 'caption') return;
    const dt = pxToDeltaTime(totalDx);
    if (edge === 'start') {
      onCaptionTimeLive?.(id, { start: s.start + dt, end: s.end });
    } else {
      onCaptionTimeLive?.(id, { start: s.start, end: s.end + dt });
    }
  };

  const applyElementTrim = (id, totalDx, edge) => {
    const s = trimSessionRef.current;
    if (!s || s.id !== id || s.kind !== 'element') return;
    const dt = pxToDeltaTime(totalDx);
    if (edge === 'start') {
      onElementTimeLive?.(id, { start: s.start + dt, end: s.end });
    } else {
      onElementTimeLive?.(id, { start: s.start, end: s.end + dt });
    }
  };

  const beginCaptionMove = (id) => {
    const cap = captions.find(c => c.id === id);
    if (!cap) return;
    moveSessionRef.current = { kind: 'caption', id, start: cap.start, end: cap.end, layer: 0 };
    onTrimBegin?.();
  };

  const beginElementMove = (id, layer) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    moveSessionRef.current = { kind: 'element', id, start: el.start, end: el.end, layer };
    onTrimBegin?.();
  };

  const applyCaptionMove = (id, { deltaX }) => {
    const s = moveSessionRef.current;
    if (!s || s.id !== id || s.kind !== 'caption') return;
    const dt = pxToDeltaTime(deltaX);
    const len = s.end - s.start;
    onCaptionTimeLive?.(id, { start: s.start + dt, end: s.start + dt + len });
  };

  const applyElementMove = (id, { deltaX, deltaY, layerIndex, maxLayers }) => {
    const s = moveSessionRef.current;
    if (!s || s.id !== id || s.kind !== 'element') return;
    const dt = pxToDeltaTime(deltaX);
    const len = s.end - s.start;
    onElementTimeLive?.(id, { start: s.start + dt, end: s.start + dt + len });
    const newLayer = layerIndexFromDrag(s.layer, deltaY, maxLayers);
    if (newLayer !== s.layer) {
      onElementLayerLive?.(id, newLayer);
      s.layer = newLayer;
    }
  };

  const cutTarget = useMemo(() => {
    if (!duration) return null;
    return resolveCutTarget(captions, elements, currentTime, activeId, activeElementId);
  }, [captions, elements, currentTime, duration, activeId, activeElementId]);

  const canCut = !!cutTarget;

  const TrackRow = ({ height, children, onBackgroundSeek }) => (
    <div data-timeline-row style={{ height }} className="shrink-0">
      <div
        className="relative bg-zinc-950/60 border border-zinc-800/50 rounded-md overflow-hidden h-full"
        style={{ width: contentWidth }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onBackgroundSeek?.(e);
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 select-none min-h-0">
      <div className="shrink-0 flex items-center justify-between gap-2 px-2 py-1.5 border-b border-zinc-800/80 text-[11px] font-mono">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center gap-1 text-zinc-500 shrink-0">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-zinc-200 font-bold">{formatTime(currentTime)}s</span>
          </span>
          <span className="text-zinc-600 hidden sm:inline">/ {formatTime(duration)}s</span>
          {isGenerating && <span className="text-[9px] text-indigo-400 animate-pulse">Filmstrip…</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <button
            type="button"
            disabled={visibleLayers >= MAX_ELEMENT_LAYERS}
            onClick={() => onAddElementLayer?.()}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-emerald-300 hover:border-emerald-500/50 disabled:opacity-30 text-[10px] font-semibold"
            title="Add element track (max 5)"
          >
            <Plus className="w-3.5 h-3.5" />
            Track
          </button>
          <button
            type="button"
            disabled={visibleLayers <= 1}
            onClick={() => onRemoveElementLayer?.()}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-red-300 hover:border-red-500/50 disabled:opacity-30 text-[10px] font-semibold"
            title="Remove bottom element track"
          >
            <Minus className="w-3.5 h-3.5" />
            Track
          </button>
          <button
            type="button"
            disabled={!canCut || !duration}
            onClick={() => onCutAtPlayhead?.()}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-amber-300 hover:border-amber-500/50 disabled:opacity-30 text-[10px] font-semibold"
          >
            <Scissors className="w-3.5 h-3.5" />
            Cut
          </button>
          <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
            <button type="button" onClick={() => setZoomLevel(z => Math.max(1, z - 0.25))} disabled={zoomLevel <= 1} className="text-zinc-400 hover:text-white disabled:opacity-30">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-zinc-400 min-w-[36px] text-center">{zoomLevel.toFixed(2)}x</span>
            <button type="button" onClick={() => setZoomLevel(z => Math.min(6, z + 0.25))} disabled={zoomLevel >= 6} className="text-zinc-400 hover:text-white disabled:opacity-30">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div ref={measureRef} className="flex-1 min-h-0 flex overflow-hidden">
        <div
          className="shrink-0 flex flex-col border-r border-zinc-800/80 bg-zinc-900/40 text-[9px] font-bold uppercase tracking-wide text-zinc-500"
          style={{ width: TIMELINE_LABEL_WIDTH }}
        >
          <div style={{ height: TRACK.ruler }} className="shrink-0 flex items-end pb-1 px-1.5">Time</div>
          <div style={{ height: TRACK.video }} className="shrink-0 flex items-center px-1.5 gap-1">
            <Film className="w-3 h-3 text-indigo-400" /> Video
          </div>
          <div style={{ height: TRACK.caption }} className="shrink-0 flex items-center px-1.5 text-indigo-400/90">Subs</div>
          {Array.from({ length: visibleLayers }, (_, i) => (
            <div key={i} style={{ height: TRACK.elementLayer }} className="shrink-0 flex items-center px-1.5 text-amber-500/80">
              El {i + 1}
            </div>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 min-w-0 overflow-x-auto overflow-y-auto custom-scrollbar">
          <div className="relative p-1" style={{ width: contentWidth }}>
            <div
              className="relative border-b border-zinc-800/60 bg-zinc-900/50 mb-1"
              style={{ height: TRACK.ruler, width: contentWidth }}
              onPointerDown={(e) => seekFromClientX(e.clientX, e.currentTarget)}
            >
              {ticks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                  style={{ left: tick.leftPx, transform: 'translateX(-50%)' }}
                >
                  {tick.isMajor && <span className="text-[8px] font-mono text-zinc-500 mb-0.5">{tick.label}</span>}
                  <div className={`w-px ${tick.isMajor ? 'h-2.5 bg-zinc-600' : 'h-1 bg-zinc-800'}`} />
                </div>
              ))}
            </div>

            {duration > 0 && (
              <div className="absolute top-0 bottom-0 w-px bg-red-500 z-40 pointer-events-none" style={{ left: playheadLeft }}>
                <div className="absolute -top-0.5 -left-[5px] w-2.5 h-2.5 rounded-full bg-red-500 border border-zinc-950" />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <TrackRow height={TRACK.video} onBackgroundSeek={(e) => seekFromClientX(e.clientX, e.currentTarget)}>
                {thumbnails.length > 0 ? (
                  <div className="absolute inset-0 flex">
                    {thumbnails.map((thumb, idx) => (
                      <div key={idx} className="flex-1 h-full border-r border-zinc-900/50 last:border-0 overflow-hidden">
                        <img src={thumb.url} alt="" className="w-full h-full object-cover opacity-75" draggable={false} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center px-2 text-[9px] text-zinc-600 font-mono">
                    {videoSrc ? 'Loading preview…' : 'Import video'}
                  </div>
                )}
              </TrackRow>

              <TrackRow height={TRACK.caption} onBackgroundSeek={(e) => seekFromClientX(e.clientX, e.currentTarget)}>
                {duration > 0 && captions.map((cap, i) => (
                  <TimelineClip
                    key={cap.id}
                    leftPx={timeToX(cap.start)}
                    widthPx={timeToX(cap.end) - timeToX(cap.start)}
                    isActive={cap.id === activeId && !activeElementId}
                    variant="caption"
                    label={cap.text || '(Empty)'}
                    subLabel={`Caption ${i + 1}`}
                    onSelect={() => onSelectCaption?.(cap.id)}
                    onTrimBegin={(edge) => beginCaptionTrim(cap.id, edge)}
                    onTrimStart={(dx) => applyCaptionTrim(cap.id, dx, 'start')}
                    onTrimEnd={(dx) => applyCaptionTrim(cap.id, dx, 'end')}
                    onTrimCommit={() => { trimSessionRef.current = null; onTrimCommit?.(); }}
                    onMoveBegin={() => beginCaptionMove(cap.id)}
                    onMove={(payload) => applyCaptionMove(cap.id, payload)}
                    onMoveCommit={() => { moveSessionRef.current = null; onMoveCommit?.(); }}
                  />
                ))}
              </TrackRow>

              {elementLayers.map((layerItems, layerIndex) => (
                <TrackRow key={layerIndex} height={TRACK.elementLayer} onBackgroundSeek={(e) => seekFromClientX(e.clientX, e.currentTarget)}>
                  {duration > 0 && layerItems.map((el) => {
                    const label = getElementTimelineLabel(el);
                    return (
                      <TimelineClip
                        key={el.id}
                        leftPx={timeToX(el.start)}
                        widthPx={timeToX(el.end) - timeToX(el.start)}
                        isActive={el.id === activeElementId}
                        variant="element"
                        layerIndex={layerIndex}
                        maxLayers={visibleLayers}
                        label={el.type === 'emoji' ? (el.emoji || label) : label}
                        subLabel={`Layer ${layerIndex + 1}`}
                        onSelect={() => onSelectElement?.(el.id)}
                        onTrimBegin={(edge) => beginElementTrim(el.id, edge)}
                        onTrimStart={(dx) => applyElementTrim(el.id, dx, 'start')}
                        onTrimEnd={(dx) => applyElementTrim(el.id, dx, 'end')}
                        onTrimCommit={() => { trimSessionRef.current = null; onTrimCommit?.(); }}
                        onMoveBegin={() => beginElementMove(el.id, layerIndex)}
                        onMove={(payload) => applyElementMove(el.id, payload)}
                        onMoveCommit={() => { moveSessionRef.current = null; onMoveCommit?.(); }}
                      />
                    );
                  })}
                </TrackRow>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
