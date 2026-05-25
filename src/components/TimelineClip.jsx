import React, { useRef } from 'react';

const HANDLE_W = 10;

export default function TimelineClip({
  leftPx,
  widthPx,
  isActive,
  variant = 'caption',
  label,
  subLabel,
  layerIndex = 0,
  maxLayers = 1,
  onSelect,
  onTrimBegin,
  onTrimStart,
  onTrimEnd,
  onTrimCommit,
  onMoveBegin,
  onMove,
  onMoveCommit
}) {
  const trimRef = useRef(null);

  const activeStyles =
    variant === 'caption'
      ? 'bg-indigo-500/30 border-indigo-400 text-indigo-100 ring-1 ring-indigo-500/50 z-20'
      : 'bg-amber-500/25 border-amber-400 text-amber-100 ring-1 ring-amber-500/50 z-20';

  const idleStyles =
    variant === 'caption'
      ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
      : 'bg-zinc-900/90 border-zinc-700 text-zinc-400 hover:border-amber-600/40';

  const startTrim = (e, edge) => {
    e.preventDefault();
    e.stopPropagation();
    const originX = e.clientX;
    onTrimBegin?.(edge);
    onSelect?.();
    trimRef.current = { mode: 'trim', edge };

    const onPointerMove = (ev) => {
      const totalDx = ev.clientX - originX;
      if (edge === 'start') onTrimStart?.(totalDx);
      else onTrimEnd?.(totalDx);
    };

    const onPointerUp = () => {
      trimRef.current = null;
      onTrimCommit?.();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const startMove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const originX = e.clientX;
    const originY = e.clientY;
    onMoveBegin?.();
    onSelect?.();
    trimRef.current = { mode: 'move' };

    const onPointerMove = (ev) => {
      onMove?.({
        deltaX: ev.clientX - originX,
        deltaY: ev.clientY - originY,
        layerIndex,
        maxLayers
      });
    };

    const onPointerUp = () => {
      trimRef.current = null;
      onMoveCommit?.();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      className={`absolute top-0.5 bottom-0.5 rounded border text-[10px] flex items-center overflow-visible select-none ${
        isActive ? activeStyles : idleStyles
      }`}
      style={{ left: leftPx, width: Math.max(widthPx, 24), zIndex: isActive ? 25 : 5 }}
      title={subLabel || label}
    >
      <div
        className="absolute left-0 top-0 bottom-0 z-20 cursor-ew-resize rounded-l hover:bg-white/25 active:bg-white/35"
        style={{ width: HANDLE_W }}
        onPointerDown={(e) => startTrim(e, 'start')}
      />
      <div
        className="absolute right-0 top-0 bottom-0 z-20 cursor-ew-resize rounded-r hover:bg-white/25 active:bg-white/35"
        style={{ width: HANDLE_W }}
        onPointerDown={(e) => startTrim(e, 'end')}
      />
      <div
        data-clip-body
        className="absolute inset-y-0 cursor-grab active:cursor-grabbing z-10 flex items-center min-w-0"
        style={{ left: HANDLE_W, right: HANDLE_W }}
        onPointerDown={startMove}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        <span className="truncate px-1 w-full text-left pointer-events-none font-medium">
          {label}
        </span>
      </div>
    </div>
  );
}
