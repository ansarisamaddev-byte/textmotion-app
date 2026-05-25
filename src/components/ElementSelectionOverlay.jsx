import React, { useEffect, useState, useRef, useCallback } from 'react';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const handlePos = {
  nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  e: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  w: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize'
};

export default function ElementSelectionOverlay({
  canvasRef,
  currentTime,
  elements,
  activeElementId,
  onSelectElement,
  onTransformLive,
  onTransformCommit,
  beginTransaction,
  endTransaction,
  renderTick = 0
}) {
  const [box, setBox] = useState(null);
  const dragRef = useRef(null);

  const activeElement = elements.find(el => el.id === activeElementId);
  const isVisibleAtPlayhead =
    activeElement &&
    currentTime >= activeElement.start &&
    currentTime <= activeElement.end;

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !activeElement) {
      setBox(null);
      return;
    }
    if (!activeElement._metaBoundingBox && !isVisibleAtPlayhead) {
      setBox(null);
      return;
    }
    const b = activeElement._metaBoundingBox;
    if (!b) {
      setBox(null);
      return;
    }
    const pad = 4;
    setBox({
      leftPct: ((b.left - pad) / canvas.width) * 100,
      topPct: ((b.topY - pad) / canvas.height) * 100,
      widthPct: ((b.width + pad * 2) / canvas.width) * 100,
      heightPct: ((b.height + pad * 2) / canvas.height) * 100
    });
  }, [canvasRef, activeElement, isVisibleAtPlayhead, currentTime, elements, activeElementId, renderTick]);

  const applyMove = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const drag = dragRef.current;
    if (!canvas || !drag) return;
    const rect = canvas.getBoundingClientRect();
    const deltaX = (clientX - drag.startX) / rect.width;
    const deltaY = (clientY - drag.startY) / rect.height;
    onTransformLive(activeElementId, {
      xRel: clamp(drag.initialXRel + deltaX, 0.05, 0.95),
      yRel: clamp(drag.initialYRel + deltaY, 0.05, 0.95)
    });
  }, [activeElementId, canvasRef, onTransformLive]);

  const applyResize = useCallback((clientX, clientY, handle) => {
    const canvas = canvasRef.current;
    const drag = dragRef.current;
    if (!canvas || !drag) return;
    const rect = canvas.getBoundingClientRect();
    const pointerX = ((clientX - rect.left) / rect.width);
    const pointerY = ((clientY - rect.top) / rect.height);
    const el = drag.element;

    let widthRel = el.widthRel ?? 0.2;
    let heightRel = el.heightRel ?? 0.2;

    if (el.type === 'emoji') {
      const dist = Math.hypot(pointerX - el.xRel, pointerY - el.yRel);
      const size = Math.round(clamp(dist * canvas.width * 1.2, 32, 160));
      onTransformLive(activeElementId, { emojiSize: size, widthRel: size / canvas.width, heightRel: size / canvas.width });
      return;
    }
    if (el.type === 'text' || el.type === 'callout') {
      const dist = Math.hypot(pointerX - el.xRel, pointerY - el.yRel);
      const size = Math.round(clamp(dist * canvas.width * 0.5, 16, 120));
      onTransformLive(activeElementId, { fontSize: size });
      return;
    }

    if (handle.includes('e')) widthRel = Math.abs(pointerX - el.xRel) * 2;
    if (handle.includes('w')) widthRel = Math.abs(el.xRel - pointerX) * 2;
    if (handle.includes('s')) heightRel = Math.abs(pointerY - el.yRel) * 2;
    if (handle.includes('n')) heightRel = Math.abs(el.yRel - pointerY) * 2;

    if (el.type === 'circle') {
      const s = Math.max(widthRel, heightRel);
      widthRel = s;
      heightRel = s;
    }

    onTransformLive(activeElementId, {
      widthRel: clamp(widthRel, 0.04, 0.9),
      heightRel: clamp(heightRel, el.type === 'line' ? 0.003 : 0.04, 0.9)
    });
  }, [activeElementId, canvasRef, onTransformLive]);

  const onPointerDown = (e, mode, handle = null) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elements.find(item => item.id === activeElementId);
    if (!el?._metaBoundingBox) return;

    onSelectElement?.(activeElementId);
    beginTransaction?.();

    dragRef.current = {
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialXRel: el.xRel ?? 0.5,
      initialYRel: el.yRel ?? 0.5,
      element: { ...el }
    };

    const onMove = (ev) => {
      if (!dragRef.current) return;
      if (dragRef.current.mode === 'move') applyMove(ev.clientX, ev.clientY);
      else applyResize(ev.clientX, ev.clientY, dragRef.current.handle);
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

  if (!box || !activeElement) return null;

  const isEmoji = activeElement.type === 'emoji';
  const isTextLike = activeElement.type === 'text' || activeElement.type === 'callout';
  const useCornerOnly = isEmoji || isTextLike;

  return (
    <div className="absolute inset-0 z-25 pointer-events-none" style={{ touchAction: 'none' }}>
      <div
        className="absolute pointer-events-auto rounded-[3px]"
        style={{
          left: `${box.leftPct}%`,
          top: `${box.topPct}%`,
          width: `${box.widthPct}%`,
          height: `${box.heightPct}%`,
          boxShadow: '0 0 0 1px rgba(250,204,21,0.95), 0 0 0 4px rgba(250,204,21,0.12)'
        }}
        onPointerDown={(e) => onPointerDown(e, 'move')}
      >
        <div className="absolute inset-0 border border-amber-200/90 rounded-[3px] pointer-events-none" />
        {!useCornerOnly && HANDLES.map(h => (
          <div
            key={h}
            className={`absolute w-3 h-3 rounded-full bg-white border-2 border-amber-400 shadow-md ${handlePos[h]}`}
            onPointerDown={(e) => onPointerDown(e, 'resize', h)}
          />
        ))}
        {useCornerOnly && (
          <div
            className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-amber-400 cursor-nwse-resize"
            onPointerDown={(e) => onPointerDown(e, 'resize', 'se')}
          />
        )}
      </div>
    </div>
  );
}
