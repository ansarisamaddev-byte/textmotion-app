import React, { useEffect, useState, useRef, useCallback } from 'react';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function CaptionSelectionOverlay({
  canvasRef,
  currentTime,
  captions,
  activeId,
  zoomScale,
  onSelectCaption,
  onTransformLive,
  onTransformCommit,
  beginTransaction,
  endTransaction,
  renderTick = 0
}) {
  const [box, setBox] = useState(null);
  const dragRef = useRef(null);

  const activeCaption = captions.find(
    c => currentTime >= c.start && currentTime <= c.end && c.id === activeId
  );

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !activeCaption?._metaBoundingBox) {
      setBox(null);
      return;
    }
    const b = activeCaption._metaBoundingBox;
    setBox({
      leftPct: (b.left / canvas.width) * 100,
      topPct: (b.topY / canvas.height) * 100,
      widthPct: (b.width / canvas.width) * 100,
      heightPct: (b.height / canvas.height) * 100
    });
  }, [canvasRef, activeCaption, currentTime, captions, activeId, renderTick]);

  const applyMove = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const drag = dragRef.current;
    if (!canvas || !drag) return;
    const rect = canvas.getBoundingClientRect();
    const deltaX = (clientX - drag.startX) / rect.width;
    const deltaY = (clientY - drag.startY) / rect.height;
    onTransformLive(activeId, {
      xRel: clamp(drag.initialXRel + deltaX, 0.05, 0.95),
      yRel: clamp(drag.initialYRel + deltaY, 0.1, 0.98)
    });
  }, [activeId, canvasRef, onTransformLive]);

  const applyResize = useCallback((clientX, clientY, handle) => {
    const canvas = canvasRef.current;
    const cap = captions.find(c => c.id === activeId);
    if (!canvas || !cap || !dragRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const pointerY = ((clientY - rect.top) / rect.height) * canvas.height;
    const pointerX = ((clientX - rect.left) / rect.width) * canvas.width;
    const b = dragRef.current.initialBox;

    let scale = 1;
    if (handle.includes('s')) {
      scale = (pointerY - b.topY) / Math.max(b.height, 1);
    } else if (handle.includes('n')) {
      scale = (b.bottomY - pointerY) / Math.max(b.height, 1);
    } else if (handle.includes('e')) {
      scale = (pointerX - b.left) / Math.max(b.width, 1);
    } else if (handle.includes('w')) {
      scale = (b.right - pointerX) / Math.max(b.width, 1);
    }

    if (handle.length === 2) {
      const sy = handle.includes('s') ? (pointerY - b.topY) : (b.bottomY - pointerY);
      const sx = handle.includes('e') ? (pointerX - b.left) : (b.right - pointerX);
      scale = (sy / Math.max(b.height, 1) + sx / Math.max(b.width, 1)) / 2;
    }

    scale = clamp(scale, 0.35, 3.5);
    const newSize = Math.round(clamp(dragRef.current.initialFontSize * scale, 14, 160));
    onTransformLive(activeId, { fontSize: `${newSize}px` });
  }, [activeId, canvasRef, captions, onTransformLive]);

  const onPointerDown = (e, mode, handle = null) => {
    e.preventDefault();
    e.stopPropagation();
    const cap = captions.find(c => c.id === activeId);
    if (!cap?._metaBoundingBox) return;

    onSelectCaption?.(activeId);
    beginTransaction?.();

    dragRef.current = {
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialXRel: cap.xRel ?? 0.5,
      initialYRel: cap.yRel ?? 0.82,
      initialFontSize: parseInt(cap.fontSize, 10) || 48,
      initialBox: { ...cap._metaBoundingBox }
    };

    const onMove = (ev) => {
      if (!dragRef.current) return;
      if (dragRef.current.mode === 'move') {
        applyMove(ev.clientX, ev.clientY);
      } else {
        applyResize(ev.clientX, ev.clientY, dragRef.current.handle);
      }
    };

    const onUp = () => {
      dragRef.current = null;
      endTransaction?.();
      onTransformCommit?.();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!box || !activeCaption) return null;

  const handleClass = (h) => {
    const pos = {
      nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize',
      n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize',
      ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize',
      e: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-e-resize',
      se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize',
      s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize',
      sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize',
      w: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-w-resize'
    };
    return pos[h];
  };

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      <div
        className="absolute pointer-events-auto border-2 border-indigo-400 rounded-sm shadow-[0_0_0_1px_rgba(99,102,241,0.35)]"
        style={{
          left: `${box.leftPct}%`,
          top: `${box.topPct}%`,
          width: `${box.widthPct}%`,
          height: `${box.heightPct}%`,
          minWidth: 24,
          minHeight: 16
        }}
        onPointerDown={(e) => onPointerDown(e, 'move')}
      >
        <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-indigo-600/90 text-[9px] font-bold text-white whitespace-nowrap pointer-events-none">
          Caption
        </div>

        {HANDLES.map(h => (
          <div
            key={h}
            className={`absolute w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-sm shadow ${handleClass(h)}`}
            onPointerDown={(e) => onPointerDown(e, 'resize', h)}
          />
        ))}
      </div>
    </div>
  );
}
