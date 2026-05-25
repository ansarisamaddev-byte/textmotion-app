import { useEffect } from 'react';
import { renderCaptionFrame } from '../lib/captionRenderer';

export function useCanvasTextDrag({
  previewCanvasRef,
  videoRef,
  captionsRef,
  currentTimeRef,
  captionStylesRef,
  zoomScaleRef,
  translateXRef,
  translateYRef,
  setIsDraggingText,
  onDragCommit
}) {
  useEffect(() => {
    const canvasElement = previewCanvasRef.current;
    if (!canvasElement) return;

    let localIsDragging = false;
    let dragConfig = null;

    const getCanvasRelativeCoords = (clientX, clientY) => {
      const rect = canvasElement.getBoundingClientRect();
      const currentScaleMultiplier = zoomScaleRef.current / 100;
      const visualWidthUnscaled = rect.width / currentScaleMultiplier;
      const visualHeightUnscaled = rect.height / currentScaleMultiplier;
      const visualX = clientX - rect.left;
      const visualY = clientY - rect.top;
      const shiftedVisualX = (visualX - translateXRef.current) / currentScaleMultiplier;
      const shiftedVisualY = (visualY - translateYRef.current) / currentScaleMultiplier;
      const canvasX = (shiftedVisualX / visualWidthUnscaled) * canvasElement.width;
      const canvasY = (shiftedVisualY / visualHeightUnscaled) * canvasElement.height;
      return { canvasX, canvasY, visualWidthUnscaled, visualHeightUnscaled };
    };

    const onMouseDown = (e) => {
      const activeCap = captionsRef.current.find(
        c => currentTimeRef.current >= c.start && currentTimeRef.current <= c.end
      );
      if (!activeCap?._metaBoundingBox) return;

      const { canvasX, canvasY, visualWidthUnscaled, visualHeightUnscaled } = getCanvasRelativeCoords(e.clientX, e.clientY);
      const box = activeCap._metaBoundingBox;

      if (
        canvasX >= box.centerX - box.width / 2 - 30 &&
        canvasX <= box.centerX + box.width / 2 + 30 &&
        canvasY >= box.topY - 30 &&
        canvasY <= box.bottomY + 30
      ) {
        localIsDragging = true;
        setIsDraggingText(true);
        canvasElement.setAttribute('data-dragging-active', 'true');
        dragConfig = {
          captionId: activeCap.id,
          initialXRel: activeCap.xRel ?? 0.5,
          initialYRel: activeCap.yRel ?? 0.82,
          startX: e.clientX,
          startY: e.clientY,
          visualWidthUnscaled,
          visualHeightUnscaled
        };
        e.preventDefault();
      }
    };

    const onMouseMove = (e) => {
      if (!localIsDragging || !dragConfig) return;
      const scale = zoomScaleRef.current / 100;
      const changeXRel = ((e.clientX - dragConfig.startX) / scale) / dragConfig.visualWidthUnscaled;
      const changeYRel = ((e.clientY - dragConfig.startY) / scale) / dragConfig.visualHeightUnscaled;
      const target = captionsRef.current.find(item => item.id === dragConfig.captionId);
      if (target) {
        target.xRel = Math.max(0.05, Math.min(0.95, dragConfig.initialXRel + changeXRel));
        target.yRel = Math.max(0.10, Math.min(0.98, dragConfig.initialYRel + changeYRel));
      }
      const ctx = canvasElement.getContext('2d');
      if (videoRef.current && ctx) {
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        renderCaptionFrame(ctx, canvasElement, videoRef.current, captionsRef.current, captionStylesRef.current);
      }
    };

    const onMouseUp = (e) => {
      if (!localIsDragging || !dragConfig) return;
      const scale = zoomScaleRef.current / 100;
      const changeXRel = ((e.clientX - dragConfig.startX) / scale) / dragConfig.visualWidthUnscaled;
      const changeYRel = ((e.clientY - dragConfig.startY) / scale) / dragConfig.visualHeightUnscaled;
      const finalX = Math.max(0.05, Math.min(0.95, dragConfig.initialXRel + changeXRel));
      const finalY = Math.max(0.10, Math.min(0.98, dragConfig.initialYRel + changeYRel));
      const updatedCaptions = captionsRef.current.map(item =>
        item.id === dragConfig.captionId ? { ...item, xRel: finalX, yRel: finalY } : item
      );
      localIsDragging = false;
      setIsDraggingText(false);
      dragConfig = null;
      canvasElement.removeAttribute('data-dragging-active');
      onDragCommit(updatedCaptions);
    };

    canvasElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      canvasElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [previewCanvasRef, videoRef, captionsRef, currentTimeRef, captionStylesRef, zoomScaleRef, translateXRef, translateYRef, setIsDraggingText, onDragCommit]);
}
