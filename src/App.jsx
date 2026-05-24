import React, { useState, useRef, useEffect, useCallback } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import TranscriptSidebar from './components/TranscriptSidebar';
import VideoViewport from './components/VideoViewport';
import TimelineTrack from './components/TimelineTrack';
import {
  Layers, Sparkles, Type, Maximize2, AlignLeft, AlignCenter, AlignRight,
  Palette, BetweenHorizontalEnd, Bold, Italic, Underline, Strikethrough,
  X, Edit3, ChevronLeft
} from 'lucide-react';
import RecordRTC from 'recordrtc';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

const INITIAL_CAPTIONS = [
  {
    id: '1', start: 0.0, end: 2.5, text: "Welcome to TextMotion project dashboard!",
    fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '48px', fontWeight: '900', fontStyle: 'normal', color: '#fbbf24', textTransform: 'uppercase',
    xRel: 0.5, yRel: 0.82
  },
  {
    id: '2', start: 2.6, end: 5.5, text: "This is a clean, modular React implementation.",
    fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '48px', fontWeight: '900', fontStyle: 'normal', color: '#fbbf24', textTransform: 'uppercase',
    xRel: 0.5, yRel: 0.82
  },
  {
    id: '3', start: 5.6, end: 7.0, text: "Ready to scale with your custom enhancements.",
    fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '48px', fontWeight: '900', fontStyle: 'normal', color: '#fbbf24', textTransform: 'uppercase',
    xRel: 0.5, yRel: 0.82
  }
];

export const STYLE_PRESETS = [
  { id: 'bold-kinetic', name: '🔥 Bold Kinetic', font: 'Impact, Arial Black, sans-serif', size: '56px', weight: '900', color: '#fbbf24', trans: 'uppercase', style: 'normal', strokeColor: '#000000', strokeWidth: 0.15, shadow: true, underline: false, strike: false },
  { id: 'cyber-neon', name: '⚡ Cyber Neon', font: "'Courier New', Courier, monospace", size: '44px', weight: '700', color: '#00ffcc', trans: 'uppercase', style: 'normal', strokeColor: '#050515', strokeWidth: 0.12, shadow: true, underline: false, strike: false },
  { id: 'minimal-lower', name: '📝 Minimalist Lower', font: 'system-ui, sans-serif', size: '32px', weight: '500', color: '#ffffff', trans: 'none', style: 'normal', strokeColor: 'rgba(0,0,0,0.5)', strokeWidth: 0.05, shadow: false, underline: false, strike: false },
  { id: 'tokyo-drift', name: '🏎️ Tokyo Drift', font: 'Arial Black, sans-serif', size: '52px', weight: '900', color: '#ff0055', trans: 'uppercase', style: 'italic', strokeColor: '#ffffff', strokeWidth: 0.08, shadow: true, underline: false, strike: false },
  { id: 'vintage-vibe', name: '📻 Vintage Retro', font: 'Georgia, serif', size: '40px', weight: '700', color: '#ffedd5', trans: 'none', style: 'italic', strokeColor: '#451a03', strokeWidth: 0.06, shadow: true, underline: false, strike: false },
  { id: 'future-hype', name: '🚀 Future Hype', font: 'Montserrat, sans-serif', size: '48px', weight: '800', color: '#ffffff', trans: 'uppercase', style: 'normal', strokeColor: '#6366f1', strokeWidth: 0.18, shadow: true, underline: false, strike: false },
  { id: 'clean-vlog', name: '📸 Clean Vlog', font: 'Arial, sans-serif', size: '36px', weight: '700', color: '#ffffff', trans: 'none', style: 'normal', strokeColor: '#000000', strokeWidth: 0.10, shadow: true, underline: false, strike: false },
  { id: 'comic-boom', name: '💥 Comic Punch', font: 'Comic Sans MS, cursive', size: '60px', weight: '900', color: '#facc15', trans: 'uppercase', style: 'italic', strokeColor: '#000000', strokeWidth: 0.20, shadow: true, underline: false, strike: false },
  { id: 'subtle-sub', name: '💬 Essential Sub', font: 'Inter, sans-serif', size: '28px', weight: '600', color: '#f4f4f5', trans: 'none', style: 'normal', strokeColor: '#000000', strokeWidth: 0.08, shadow: false, underline: false, strike: false },
  { id: 'alert-warn', name: '🚨 Attention Grab', font: 'Impact, Arial Black, sans-serif', size: '56px', weight: '900', color: '#ef4444', trans: 'uppercase', style: 'normal', strokeColor: '#ffffff', strokeWidth: 0.12, shadow: true, underline: true, strike: false }
];

export const renderCaptionFrame = (ctx, canvas, video, captions, captionStyles) => {
  if (!video || !canvas || video.readyState < 2) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const currentTime = video.currentTime;
  const activeCap = captions.find(c => currentTime >= c.start && currentTime <= c.end);
  if (activeCap) {
    ctx.save();

    const animation = activeCap.animation || captionStyles.animation || 'none';
    
    // Apply Animation Logic safely
    if (animation === 'fade') {
      const elapsed = currentTime - activeCap.start;
      const opacity = Math.min(elapsed / 0.5, 1);
      ctx.globalAlpha = opacity;
    } else if (animation === 'slide') {
      const elapsed = currentTime - activeCap.start;
      const slideOffset = Math.max(0, 50 - (elapsed * 100)); // Moves up 50px
      ctx.transform(1, 0, 0, 1, 0, slideOffset);
    }

    const fontFamily = activeCap.fontFamily || captionStyles.fontFamily || 'Impact';
    const fontSize = activeCap.fontSize || captionStyles.fontSize || '48px';
    const fontWeight = activeCap.fontWeight || captionStyles.fontWeight || '900';
    const fontStyle = activeCap.fontStyle || captionStyles.fontStyle || 'normal';
    const color = activeCap.color || captionStyles.color || '#fbbf24';
    const textTransform = activeCap.textTransform || captionStyles.textTransform || 'uppercase';

    const strokeColor = activeCap.strokeColor || captionStyles.strokeColor || '#000000';
    const strokeFactor = activeCap.strokeWidth !== undefined ? activeCap.strokeWidth : (captionStyles.strokeWidth !== undefined ? captionStyles.strokeWidth : 0.14);
    const hasShadow = activeCap.shadow !== undefined ? activeCap.shadow : (captionStyles.shadow || false);
    const hasUnderline = activeCap.underline !== undefined ? activeCap.underline : (captionStyles.underline || false);
    const hasStrike = activeCap.strike !== undefined ? activeCap.strike : (captionStyles.strike || false);

    const baseSize = parseInt(fontSize) || 48;
    const isItalic = fontStyle === 'italic' ? 'italic ' : '';

    let fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    if (fontName.includes(' ')) fontName = `"${fontName}"`;

    ctx.font = `${isItalic}${fontWeight} ${baseSize}px ${fontName}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    if (hasShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = baseSize * 0.15;
      ctx.shadowOffsetX = baseSize * 0.08;
      ctx.shadowOffsetY = baseSize * 0.08;
    } else {
      ctx.shadowColor = 'transparent';
    }

    const rawText = textTransform === 'uppercase' ? activeCap.text.toUpperCase() : activeCap.text;
    const words = rawText.split(/\s+/);
    const lines = [];
    const maxTextWidth = canvas.width * 0.88;
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      if (ctx.measureText(testLine).width > maxTextWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const currentXPercent = activeCap.xRel !== undefined ? activeCap.xRel : 0.5;
    const currentYPercent = activeCap.yRel !== undefined ? activeCap.yRel : 0.82;

    const xPos = canvas.width * currentXPercent;
    let initialYPos = canvas.height * currentYPercent;
    const lineSpacingOffset = baseSize * 1.2;

    let calculatedMaxWidth = 0;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > calculatedMaxWidth) calculatedMaxWidth = w;
    });
    const totalBlockHeight = lines.length * lineSpacingOffset;
    activeCap._metaBoundingBox = {
      centerX: xPos,
      bottomY: canvas.height * currentYPercent,
      topY: (canvas.height * currentYPercent) - totalBlockHeight,
      width: calculatedMaxWidth,
      height: totalBlockHeight
    };

    if (canvas.hasAttribute('data-dragging-active')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(
        xPos - (calculatedMaxWidth / 2) - 16,
        activeCap._metaBoundingBox.topY - 8,
        calculatedMaxWidth + 32,
        totalBlockHeight + 16
      );
      ctx.restore();
    }

    for (let j = lines.length - 1; j >= 0; j--) {
      const currentTextLine = lines[j];
      const textWidth = ctx.measureText(currentTextLine).width;
      const lineXStart = xPos - (textWidth / 2);

      if (strokeFactor > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = baseSize * strokeFactor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeText(currentTextLine, xPos, initialYPos);
      }

      ctx.fillStyle = color;
      ctx.fillText(currentTextLine, xPos, initialYPos);

      if (hasUnderline || hasStrike) {
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, baseSize * 0.06);

        ctx.beginPath();
        if (hasUnderline) {
          const underlineY = initialYPos + (baseSize * 0.12);
          ctx.moveTo(lineXStart, underlineY);
          ctx.lineTo(lineXStart + textWidth, underlineY);
        }
        if (hasStrike) {
          const strikeY = initialYPos - (baseSize * 0.35);
          ctx.moveTo(lineXStart, strikeY);
          ctx.lineTo(lineXStart + textWidth, strikeY);
        }
        ctx.stroke();
        ctx.restore();
      }



      initialYPos -= lineSpacingOffset;
    }

    ctx.restore();
  }
};

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
  const [exportStatusText, setExportStatusText] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(180);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isDraggingText, setIsDraggingText] = useState(false);
  // Inside your App.jsx state block:
  const [zoomScale, setZoomScale] = useState(100); // Track as 100 baseline
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activePanel, setActivePanel] = useState('menu');

  const updateStackStatus = () => {
    console.log('[Undo] Stack status - Undo stack length:', undoStack.current.length, 'Redo stack length:', redoStack.current.length);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  };


  const [captionStyles, setCaptionStyles] = useState({
    preset: 'bold-kinetic',
    animation: 'none', // Add this
    fontFamily: 'Impact, Arial Black, sans-serif',
    fontSize: '48px',
    fontWeight: '900',
    fontStyle: 'normal',
    color: '#fbbf24',
    textTransform: 'uppercase',
    strokeColor: '#000000',
    strokeWidth: 0.15,
    shadow: true,
    underline: false,
    strike: false,
    isEditingCustom: false
  });

  const videoRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // High performance references to bypass layout-pass race conditions entirely
  const captionsRef = useRef(captions);
  const currentTimeRef = useRef(currentTime);
  const captionStylesRef = useRef(captionStyles);
  const isExportingRef = useRef(false);

  const zoomScaleRef = useRef(zoomScale);
  const translateXRef = useRef(translateX);
  const translateYRef = useRef(translateY);

  useEffect(() => { captionsRef.current = captions; }, [captions]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { captionStylesRef.current = captionStyles; }, [captionStyles]);
  useEffect(() => { zoomScaleRef.current = zoomScale; }, [zoomScale]);
  useEffect(() => { translateXRef.current = translateX; }, [translateX]);
  useEffect(() => { translateYRef.current = translateY; }, [translateY]);


  const [timelineHeight, setTimelineHeight] = useState(220);
  const isResizingRef = useRef(false);
  const isTimelineResizingRef = useRef(false);

  const getSnapshot = () => ({
    captions: captions.map(c => ({ ...c })), // Safer than JSON.stringify for arrays
    styles: { ...captionStyles },
    activeId,
    selectedIds,
    currentTime: videoRef.current ? videoRef.current.currentTime : currentTime
  });

  const areSnapshotsEqual = (left, right) => {
    if (!left || !right) return false;
    return JSON.stringify(left) === JSON.stringify(right);
  };

  // Record state BEFORE making changes (Clipchamp style)
  const recordUndo = () => {
    const currentSnapshot = getSnapshot();
    const lastSnapshot = undoStack.current[undoStack.current.length - 1];

    // If there is no last snapshot, or if the current state is different, record it.
    if (!lastSnapshot || !areSnapshotsEqual(lastSnapshot, currentSnapshot)) {
      undoStack.current.push(currentSnapshot);
      // Crucial: Clear redo stack whenever a new action is performed
      redoStack.current = [];
      updateStackStatus();
    }
  };

  const dispatchChange = (newCaptions, newStyles) => {
    recordUndo(); // Save state BEFORE change
    setCaptions(newCaptions);
    setCaptionStyles(newStyles);
  };

  const handleCaptionMove = (updatedCaptions) => {
    dispatchChange(updatedCaptions, captionStylesRef.current);
  };

  const applyState = (state) => {
    // 1. Update references first to prevent race conditions during render
    captionsRef.current = state.captions;
    currentTimeRef.current = state.currentTime;

    // 2. Batch React updates
    setCaptions(state.captions);
    setCaptionStyles(state.styles);
    setActiveId(state.activeId);
    setSelectedIds(state.selectedIds);
    setCurrentTime(state.currentTime);

    // 3. Force Video Sync
    if (videoRef.current) {
      // Setting currentTime is asynchronous; it will trigger the video onSeeked/onTimeUpdate
      videoRef.current.currentTime = state.currentTime;
    }
  };

  const handleUndo = () => {
    if (undoStack.current.length === 0) {
      console.log('[Undo] handleUndo: no undo available');
      return;
    }
    console.log('[Undo] handleUndo: undoing, current snapshot saved to redo', {
      captions: getSnapshot().captions.map(c => ({ id: c.id, xRel: c.xRel, yRel: c.yRel })),
      activeId: getSnapshot().activeId,
      selectedIds: getSnapshot().selectedIds,
      currentTime: getSnapshot().currentTime
    });
    redoStack.current.push(getSnapshot());
    const previousState = undoStack.current.pop();
    console.log('[Undo] handleUndo: applying previous state', {
      captions: previousState.captions.map(c => ({ id: c.id, xRel: c.xRel, yRel: c.yRel })),
      activeId: previousState.activeId,
      selectedIds: previousState.selectedIds,
      currentTime: previousState.currentTime
    });
    applyState(previousState);
    updateStackStatus();
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) {
      console.log('[Redo] handleRedo: no redo available');
      return;
    }
    console.log('[Redo] handleRedo: redoing, current snapshot saved to undo', {
      captions: getSnapshot().captions.map(c => ({ id: c.id, xRel: c.xRel, yRel: c.yRel })),
      activeId: getSnapshot().activeId,
      selectedIds: getSnapshot().selectedIds,
      currentTime: getSnapshot().currentTime
    });
    undoStack.current.push(getSnapshot());
    const nextState = redoStack.current.pop();
    console.log('[Redo] handleRedo: applying next state', {
      captions: nextState.captions.map(c => ({ id: c.id, xRel: c.xRel, yRel: c.yRel })),
      activeId: nextState.activeId,
      selectedIds: nextState.selectedIds,
      currentTime: nextState.currentTime
    });
    applyState(nextState);
    updateStackStatus();
  };

  const handleTimelineResizeStart = useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    isResizingRef.current = true;

    const startY = mouseDownEvent.clientY;
    const startHeight = timelineHeight;

    const doDrag = (mouseMoveEvent) => {
      if (!isResizingRef.current) return;
      // Squeezing up moves mouse Y up (negative delta), which INCREASES timeline height.
      // Pulling down decreases timeline height.
      const deltaY = mouseMoveEvent.clientY - startY;
      const newHeight = startHeight - deltaY;

      // 🔒 Define your explicit absolute Min and Max bounds here:
      if (newHeight >= 50 && newHeight <= 220) {
        setTimelineHeight(newHeight);
      }
    };

    const stopDrag = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
    };

    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
  }, [timelineHeight]);

  // Synchronize Active Subtitle Block ID
  useEffect(() => {
    if (!videoSrc) {
      setActiveId(null);
      return;
    }

    if (isPlaying) {
      const currentActiveBlock = captions.find(
        (c) => currentTime >= c.start && currentTime <= c.end
      );

      if (currentActiveBlock) {
        setActiveId(currentActiveBlock.id);
        setSelectedIds([currentActiveBlock.id]);
      } else {
        setActiveId(null);
      }
    } else {
      if (selectedIds.length > 0) {
        setActiveId(selectedIds[0]);
      }
    }
  }, [currentTime, isPlaying, captions, videoSrc]);

  const handleViewportMouseDown = (e) => {
    const canvasElement = previewCanvasRef.current;
    if (!canvasElement) return;

    const activeCap = captionsRef.current.find(
      c => currentTimeRef.current >= c.start && currentTimeRef.current <= c.end
    );

    if (!activeCap || !activeCap._metaBoundingBox) return;

    const { canvasX, canvasY, visualWidthUnscaled, visualHeightUnscaled } = getCanvasRelativeCoords(e.clientX, e.clientY);
    const box = activeCap._metaBoundingBox;

    if (
      canvasX >= box.centerX - (box.width / 2) - 30 &&
      canvasX <= box.centerX + (box.width / 2) + 30 &&
      canvasY >= box.topY - 30 &&
      canvasY <= box.bottomY + 30
    ) {
      // ✅ Hit Text: Intercept and handle text motion
      localIsDragging = true;
      if (typeof setIsDraggingText === 'function') setIsDraggingText(true);
      canvasElement.setAttribute('data-dragging-active', 'true');

      dragConfig = {
        captionId: activeCap.id,
        initialXRel: activeCap.xRel !== undefined ? activeCap.xRel : 0.5,
        initialYRel: activeCap.yRel !== undefined ? activeCap.yRel : 0.82,
        startX: e.clientX,
        startY: e.clientY,
        visualWidthUnscaled,
        visualHeightUnscaled
      };

      e.preventDefault();
      e.stopPropagation(); // Stop the event right here so the frame doesn't pan while moving text
    }
    // 💡 No else block: If we miss the text, the event bubbles naturally to the panning container
  };

  useEffect(() => {
    const canvasElement = previewCanvasRef.current;
    if (!canvasElement) return;

    let localIsDragging = false;
    let dragConfig = null;

    const getCanvasRelativeCoords = (clientX, clientY) => {
      const rect = canvasElement.getBoundingClientRect();

      // 1. Get the real CSS-unscaled size of the visual canvas element on screen
      const currentScaleMultiplier = zoomScaleRef.current / 100;
      const visualWidthUnscaled = rect.width / currentScaleMultiplier;
      const visualHeightUnscaled = rect.height / currentScaleMultiplier;

      // 2. Map coordinates relative to top-left of the bounding box, stripping out translation pans
      const visualX = clientX - rect.left;
      const visualY = clientY - rect.top;

      const shiftedVisualX = (visualX - translateXRef.current) / currentScaleMultiplier;
      const shiftedVisualY = (visualY - translateYRef.current) / currentScaleMultiplier;

      // 3. Project positions perfectly into the internal 1080x1920 (or similar) resolution grid
      const canvasX = (shiftedVisualX / visualWidthUnscaled) * canvasElement.width;
      const canvasY = (shiftedVisualY / visualHeightUnscaled) * canvasElement.height;

      return {
        canvasX,
        canvasY,
        // Pass unscaled visual boundaries down to dragConfig to keep structural movement tracking smooth
        visualWidthUnscaled,
        visualHeightUnscaled
      };
    };

    const onMouseDown = (e) => {
      const activeCap = captionsRef.current.find(
        c => currentTimeRef.current >= c.start && currentTimeRef.current <= c.end
      );

      // IF NO ACTIVE TEXT EXISTS: Let the event bubble up naturally to your panning engine!
      if (!activeCap || !activeCap._metaBoundingBox) return;

      const { canvasX, canvasY, visualWidthUnscaled, visualHeightUnscaled } = getCanvasRelativeCoords(e.clientX, e.clientY);
      const box = activeCap._metaBoundingBox;

      if (
        canvasX >= box.centerX - (box.width / 2) - 30 &&
        canvasX <= box.centerX + (box.width / 2) + 30 &&
        canvasY >= box.topY - 30 &&
        canvasY <= box.bottomY + 30
      ) {
        // ✅ We hit text! Lock the interaction to text dragging only.
        localIsDragging = true;
        if (typeof setIsDraggingText === 'function') setIsDraggingText(true);
        canvasElement.setAttribute('data-dragging-active', 'true');

        dragConfig = {
          captionId: activeCap.id,
          initialXRel: activeCap.xRel !== undefined ? activeCap.xRel : 0.5,
          initialYRel: activeCap.yRel !== undefined ? activeCap.yRel : 0.82,
          startX: e.clientX,
          startY: e.clientY,
          visualWidthUnscaled,
          visualHeightUnscaled
        };

        e.preventDefault(); // Only prevent default behavior when actually moving text
      }
      // 💡 NO ELSE BLOCK HERE. If the hit test fails, we don't call e.preventDefault(),
      // allowing the click event to fall through to your video frame pan handler.
    };

    const onMouseMove = (e) => {
      if (!localIsDragging || !dragConfig) return;

      // Calculate mouse delta movement on screen
      const currentDeltaX = e.clientX - dragConfig.startX;
      const currentDeltaY = e.clientY - dragConfig.startY;

      // Incorporate current viewport zoom level directly into delta velocity calculations
      const currentScaleMultiplier = zoomScaleRef.current / 100;

      const changeXRel = (currentDeltaX / currentScaleMultiplier) / dragConfig.visualWidthUnscaled;
      const changeYRel = (currentDeltaY / currentScaleMultiplier) / dragConfig.visualHeightUnscaled;

      const targetCaption = captionsRef.current.find(item => item.id === dragConfig.captionId);
      if (targetCaption) {
        targetCaption.xRel = Math.max(0.05, Math.min(0.95, dragConfig.initialXRel + changeXRel));
        targetCaption.yRel = Math.max(0.10, Math.min(0.98, dragConfig.initialYRel + changeYRel));
      }

      const ctx = canvasElement.getContext('2d');
      if (videoRef.current) {
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        renderCaptionFrame(ctx, canvasElement, videoRef.current, captionsRef.current, captionStylesRef.current);
      }
    };

    const onMouseUp = (e) => {
      if (localIsDragging && dragConfig) {
        const currentDeltaX = e.clientX - dragConfig.startX;
        const currentDeltaY = e.clientY - dragConfig.startY;

        const currentScaleMultiplier = zoomScaleRef.current / 100;
        const changeXRel = (currentDeltaX / currentScaleMultiplier) / dragConfig.visualWidthUnscaled;
        const changeYRel = (currentDeltaY / currentScaleMultiplier) / dragConfig.visualHeightUnscaled;

        const finalX = Math.max(0.05, Math.min(0.95, dragConfig.initialXRel + changeXRel));
        const finalY = Math.max(0.10, Math.min(0.98, dragConfig.initialYRel + changeYRel));

        const targetId = dragConfig.captionId;

        localIsDragging = false;
        if (typeof setIsDraggingText === 'function') setIsDraggingText(false);
        dragConfig = null;
        canvasElement.removeAttribute('data-dragging-active');

        const updatedCaptions = captionsRef.current.map(item =>
          item.id === targetId ? { ...item, xRel: finalX, yRel: finalY } : item
        );

        // We call the dispatchChange function from your component scope
        // Note: You may need to ensure dispatchChange is accessible here
        dispatchChange(updatedCaptions, captionStylesRef.current);
        // --- FIX ENDS HERE ---

        setTimeout(() => {
          const ctx = canvasElement.getContext('2d');
          if (videoRef.current) {
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            renderCaptionFrame(ctx, canvasElement, videoRef.current, updatedCaptions, captionStylesRef.current);
          }
        }, 0);
      }
    };

    canvasElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvasElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);


  // Standard cleanup loop for blob tracking structures
  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith('blob:')) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  // Frame monitoring hook running layout passes when video parameters shift
  // Frame monitoring hook running layout passes when video parameters shift
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderCaptionFrame(ctx, canvas, video, captions, captionStyles);
      }
    }
  }, [currentTime, captions, captionStyles, activeId, selectedIds]); // 🌟 Added activeId and selectedIds here!

  useEffect(() => {
    let animId;

    const updateLoop = () => {
      const video = videoRef.current;
      const canvas = previewCanvasRef.current;

      if (video && canvas && !video.paused && !video.ended) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Pulls directly from fresh Ref pointers instead of stale component state
        renderCaptionFrame(ctx, canvas, video, captionsRef.current, captionStylesRef.current);
      }

      animId = requestAnimationFrame(updateLoop);
    };

    // Start the hardware-accelerated draw loop
    animId = requestAnimationFrame(updateLoop);

    return () => cancelAnimationFrame(animId);
  }, []);

  const handleInteractionEnd = (updatedCaptions) => {
    // 1. Capture the snapshot BEFORE updating state
    const previousState = getSnapshot();

    // 2. Push the OLD state to undoStack
    undoStack.current.push(previousState);
    redoStack.current = []; // Clear redo
    updateStackStatus();

    // 3. Perform the update
    setCaptions(updatedCaptions);
  };

  useEffect(() => {
    if (videoSrc && undoStack.current.length === 0) {
      // Save the initial state immediately when the video is loaded
      undoStack.current.push(getSnapshot());
      updateStackStatus();
      console.log('[Undo] Initial state recorded');
    }
  }, [videoSrc]);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (videoSrc && videoSrc.startsWith('blob:')) URL.revokeObjectURL(videoSrc);
      setVideoSrc(URL.createObjectURL(file));
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
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
    const currentTimeValue = currentTimeRef.current || 0;
    const targetedCaption = captions.find(c => time >= c.start && time <= c.end);
    const selectionChanged = targetedCaption ? selectedIds[0] !== targetedCaption.id : selectedIds.length > 0;
    const timeChanged = Math.abs(time - currentTimeValue) > 0.01;

    if (timeChanged || selectionChanged) {
      recordUndo();
    }

    if (videoRef.current) {
      videoRef.current.currentTime = time;
      currentTimeRef.current = time;
      setCurrentTime(time);

      syncActiveCaptionFromTime(time);
      if (targetedCaption) {
        setActiveId(targetedCaption.id);
        setSelectedIds([targetedCaption.id]);

        setCaptionStyles(prev => ({
          ...prev,
          fontFamily: targetedCaption.fontFamily || 'Impact, Arial Black, sans-serif',
          fontSize: targetedCaption.fontSize || '48px',
          fontWeight: targetedCaption.fontWeight || '900',
          fontStyle: targetedCaption.fontStyle || 'normal',
          color: targetedCaption.color || '#fbbf24',
          textTransform: targetedCaption.textTransform || 'uppercase',
          strokeColor: targetedCaption.strokeColor || '#000000',
          strokeWidth: targetedCaption.strokeWidth !== undefined ? targetedCaption.strokeWidth : 0.14,
          shadow: targetedCaption.shadow !== undefined ? targetedCaption.shadow : true,
          underline: targetedCaption.underline !== undefined ? targetedCaption.underline : false,
          strike: targetedCaption.strike !== undefined ? targetedCaption.strike : false,
        }));
      } else {
        setActiveId(null);
        setSelectedIds([]);
      }

      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderCaptionFrame(ctx, canvas, videoRef.current, captions, captionStyles);
      }
    }
  };

  const syncActiveCaptionFromTime = (time, currentCaptions = captions) => {
    // 1. Find the caption block that wraps around the current playhead time
    const matchingCaption = currentCaptions.find(
      c => time >= c.start && time <= c.end
    );

    if (matchingCaption) {
      // 2. Automatically activate and highlight it across both panels
      setActiveId(matchingCaption.id);
      setSelectedIds([matchingCaption.id]);

      // 3. Keep style presets synchronized in the right custom styles builder panel
      setCaptionStyles(prev => ({
        ...prev,
        fontFamily: matchingCaption.fontFamily || 'Impact, Arial Black, sans-serif',
        fontSize: matchingCaption.fontSize || '48px',
        fontWeight: matchingCaption.fontWeight || '900',
        fontStyle: matchingCaption.fontStyle || 'normal',
        color: matchingCaption.color || '#fbbf24',
        textTransform: matchingCaption.textTransform || 'uppercase',
        strokeColor: matchingCaption.strokeColor || '#000000',
        strokeWidth: matchingCaption.strokeWidth !== undefined ? matchingCaption.strokeWidth : 0.14,
        shadow: matchingCaption.shadow !== undefined ? matchingCaption.shadow : true,
        underline: matchingCaption.underline !== undefined ? matchingCaption.underline : false,
        strike: matchingCaption.strike !== undefined ? matchingCaption.strike : false,
      }));
    } else {
      // Clear active highlight states if scrubbing into an empty gap containing no text
      setActiveId(null);
      setSelectedIds([]);
    }
  };

  const handleAddBlock = () => {
    const last = captions[captions.length - 1];
    const start = last ? parseFloat((last.end + 0.1).toFixed(1)) : 0;
    dispatchChange([...captions, { id: Date.now().toString(), start, end: start + 2.5, text: "New...", xRel: 0.5, yRel: 0.82 }], captionStyles);
  };

  const handleDeleteBlock = (id) => {
    dispatchChange(captions.filter(c => c.id !== id), captionStyles);
  };

const handleUpdateCaption = (id, updates) => {
  const updatedCaptions = captions.map(c => (c.id === id ? { ...c, ...updates } : c));
  dispatchChange(updatedCaptions, captionStyles);
};

  const handleSeparatorMouseDown = (e) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent) => {
      setSidebarWidth(Math.max(180, Math.min(250, moveEvent.clientX)));
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSelectCaption = (id) => {
    if (id !== activeId || selectedIds[0] !== id) {
      recordUndo();
    }
    setSelectedIds([id]);
    setActiveId(id);

    const targeted = captions.find(c => c.id === id);

    let nextStyles = { ...captionStyles };
    if (targeted) {
      nextStyles = {
        ...captionStyles,
        fontFamily: targeted.fontFamily || 'Impact, Arial Black, sans-serif',
        fontSize: targeted.fontSize || '48px',
        fontWeight: targeted.fontWeight || '900',
        fontStyle: targeted.fontStyle || 'normal',
        color: targeted.color || '#fbbf24',
        textTransform: targeted.textTransform || 'uppercase',
        strokeColor: targeted.strokeColor || '#000000',
        strokeWidth: targeted.strokeWidth !== undefined ? targeted.strokeWidth : 0.14,
        shadow: targeted.shadow !== undefined ? targeted.shadow : true,
        underline: targeted.underline !== undefined ? targeted.underline : false,
        strike: targeted.strike !== undefined ? targeted.strike : false,
      };
      setCaptionStyles(nextStyles);
    }

    if (targeted && videoRef.current) {
      const video = videoRef.current;

      const handleVideoSeekComplete = () => {
        const canvas = previewCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            renderCaptionFrame(
              ctx,
              canvas,
              video,
              captionsRef.current || captions,
              nextStyles
            );
          }
        }
        video.removeEventListener('seeked', handleVideoSeekComplete);
      };

      video.addEventListener('seeked', handleVideoSeekComplete);
      video.currentTime = targeted.start;
      setCurrentTime(targeted.start);
      currentTimeRef.current = targeted.start;
    }
  };

  const handleCustomStyleChange = (field, value) => {
    const nextStyles = { ...captionStyles, preset: 'custom', [field]: value };
    const nextCaptions = captions.map(c => selectedIds.includes(c.id) ? { ...c, [field]: value } : c);
    dispatchChange(nextCaptions, nextStyles);
  };


  // Handler to snap the viewport dimensions back to center focus defaults
  const handleResetView = () => {
    setZoomScale(100);
    setTranslateX(0);
    setTranslateY(0);
  };

  // Handlers for click-and-drag frame grabbing adjustments
  const handlePanChange = (newX, newY) => {
    setTranslateX(newX);
    setTranslateY(newY);
  };

  const handleZoomChange = (newScale) => {
    setZoomScale(newScale);
  };

  const setThemePreset = (preset) => {
    const updatedStyles = { preset: preset.id, fontFamily: preset.font, fontSize: preset.size, fontWeight: preset.weight, color: preset.color, textTransform: preset.trans, fontStyle: preset.style, strokeColor: preset.strokeColor, strokeWidth: preset.strokeWidth, shadow: preset.shadow, underline: preset.underline, strike: preset.strike, isEditingCustom: false };
    const nextCaptions = captions.map(c => selectedIds.includes(c.id) ? { ...c, ...updatedStyles } : c);
    dispatchChange(nextCaptions, updatedStyles);
  };

  const handleExportVideo = async () => {
    if (!videoSrc || !videoRef.current) return;

    isExportingRef.current = true; // Activate the processing flag
    setIsExporting(true);
    setExportProgress(0);
    setExportStatusText("Extracting clean audio track...");

    const mainVideo = videoRef.current;
    const nativeWidth = mainVideo.videoWidth || 1080;
    const nativeHeight = mainVideo.videoHeight || 1920;
    const originalTime = mainVideo.currentTime;
    const originalMuted = mainVideo.muted;

    mainVideo.pause();

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width: nativeWidth, height: nativeHeight },
      audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 44100 },
      fastStart: 'fragmented'
    });

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error("Video encoder error:", e)
    });
    await videoEncoder.configure({ codec: 'avc1.4d002a', width: nativeWidth, height: nativeHeight, bitrate: 8000000, framerate: 30, latencyMode: 'quality' });

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => console.error("Audio encoder error:", e)
    });
    await audioEncoder.configure({ codec: 'mp4a.40.2', numberOfChannels: 2, sampleRate: 44100, bitrate: 192000 });

    // Audio Processing...
    try {
      const response = await fetch(videoSrc);
      const arrayBuffer = await response.arrayBuffer();
      const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await tempCtx.decodeAudioData(arrayBuffer);
      tempCtx.close();
      const offlineCtx = new OfflineAudioContext(2, Math.floor(duration * 44100), 44100);
      const source = offlineCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(offlineCtx.destination);
      source.start(0);
      const rendered = await offlineCtx.startRendering();
      const len = rendered.length;
      const audioDataBlock = new AudioData({
        format: 'f32-planar',
        sampleRate: 44100,
        numberOfFrames: len,
        numberOfChannels: 2,
        timestamp: 0,
        data: new Float32Array([...rendered.getChannelData(0), ...rendered.getChannelData(1)])
      });
      audioEncoder.encode(audioDataBlock);
      audioDataBlock.close();
    } catch (e) { console.warn("Audio extraction skipped", e); }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = nativeWidth; exportCanvas.height = nativeHeight;
    const exportCtx = exportCanvas.getContext('2d');

    let frameCount = 0;
    const fps = 30;

    const renderNextFrame = async () => {
      // 🛑 KILL SWITCH CHECK
      if (!isExportingRef.current) {
        videoEncoder.close();
        audioEncoder.close();
        mainVideo.currentTime = originalTime;
        return;
      }

      const currentFrameTime = frameCount / fps;

      if (currentFrameTime >= duration) {
        setExportStatusText("Compiling final video...");
        await videoEncoder.flush();
        await audioEncoder.flush();
        muxer.finalize();

        const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `render-${Date.now()}.mp4`;
        a.click();
        URL.revokeObjectURL(url);

        mainVideo.currentTime = originalTime;
        setIsExporting(false);
        return;
      }

      mainVideo.currentTime = currentFrameTime;

      await new Promise((resolve) => {
        if ('requestVideoFrameCallback' in mainVideo) {
          mainVideo.requestVideoFrameCallback(() => resolve());
        } else {
          const onSeeked = () => {
            mainVideo.removeEventListener('seeked', onSeeked);
            setTimeout(resolve, 40);
          };
          mainVideo.addEventListener('seeked', onSeeked);
        }
      });

      renderCaptionFrame(exportCtx, exportCanvas, mainVideo, captions, captionStyles);

      const frameInstance = new VideoFrame(exportCanvas, {
        timestamp: frameCount * (1000000 / fps),
        duration: 1000000 / fps
      });

      videoEncoder.encode(frameInstance, { keyFrame: frameCount % 90 === 0 });
      frameInstance.close();

      const p = Math.floor((currentFrameTime / duration) * 100);
      setExportProgress(p);
      setExportStatusText(`Rendering: ${p}%`);

      frameCount++;
      setTimeout(renderNextFrame, 5);
    };

    renderNextFrame();
  };

  const handleCancelExport = () => {
    // 1. Hide the modal overlay visually
    setIsExporting(false);
    setExportProgress(0);

    // 2. CASE A: If you are using an explicit loop controller flag
    // Ensure your export loop checks this ref flag on every frame execution step!
    if (isExportingRef) {
      isExportingRef.current = false;
    }

    // 3. CASE B: If your video export runs inside a background Web Worker
    // Calling terminate kills the thread hardware immediately
    if (exportWorkerRef && exportWorkerRef.current) {
      exportWorkerRef.current.terminate();
      exportWorkerRef.current = null; // Reset reference
      console.log("Export worker process terminated cleanly.");
    }

    // 4. CASE C: If you are using requestAnimationFrame or a setTimeout loop
    if (exportFrameIdRef && exportFrameIdRef.current) {
      cancelAnimationFrame(exportFrameIdRef.current);
      // or clearTimeout(exportFrameIdRef.current);
    }
  };

  // Add these mappings right before your return (...) block in App.jsx:
  const handleTimeUpdate = (e) => {
    if (!videoRef.current) return;
    const newTime = videoRef.current.currentTime;
    setCurrentTime(newTime);

    // Keep tracking positions highlighted dynamically while video rolls forward frame-by-frame
    syncActiveCaptionFromTime(newTime);
  };

  const handleLoadedMetadata = (e) => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

const AnimatePanel = ({ activeId, onApplyAnimation }) => {
  const anims = [
    { id: 'none', name: 'None' },
    { id: 'fade', name: 'Fade In' },
    { id: 'slide', name: 'Slide Up' }
  ];

  return (
    <div className="grid grid-cols-1 gap-2">
      {anims.map(anim => (
        <button 
          key={anim.id}
          onClick={() => onApplyAnimation(anim.id)}
          className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs hover:border-indigo-500 text-left transition-all"
        >
          {anim.name}
        </button>
      ))}
    </div>
  );
};

const handleApplyAnimation = (animationType) => {
  console.log("Applying animation:", animationType);
  
  // 1. Update the style state
  setCaptionStyles(prev => ({ ...prev, animation: animationType }));

  // 2. If a specific caption is active, update it in the array too
  if (activeId) {
    const updatedCaptions = captions.map(c => 
      c.id === activeId ? { ...c, animation: animationType } : c
    );
    dispatchChange(updatedCaptions, { ...captionStyles, animation: animationType });
  }
};

  const currentActiveCaption = captions.find(c => c.id === activeId);
  const activeViewportStyles = currentActiveCaption ? {
    fontFamily: currentActiveCaption.fontFamily || captionStyles.fontFamily,
    fontSize: currentActiveCaption.fontSize || captionStyles.fontSize,
    fontWeight: currentActiveCaption.fontWeight || captionStyles.fontWeight,
    fontStyle: currentActiveCaption.fontStyle || captionStyles.fontStyle,
    color: currentActiveCaption.color || captionStyles.color,
    textTransform: currentActiveCaption.textTransform || captionStyles.textTransform,
    strokeColor: currentActiveCaption.strokeColor || captionStyles.strokeColor,
    strokeWidth: currentActiveCaption.strokeWidth !== undefined ? currentActiveCaption.strokeWidth : captionStyles.strokeWidth,
    shadow: currentActiveCaption.shadow !== undefined ? currentActiveCaption.shadow : captionStyles.shadow,
    underline: currentActiveCaption.underline !== undefined ? currentActiveCaption.underline : captionStyles.underline,
    strike: currentActiveCaption.strike !== undefined ? currentActiveCaption.strike : captionStyles.strike,
    xRel: currentActiveCaption.xRel !== undefined ? currentActiveCaption.xRel : 0.5,
    yRel: currentActiveCaption.yRel !== undefined ? currentActiveCaption.yRel : 0.82
  } : captionStyles;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden relative">
      <WorkspaceHeader onVideoUpload={handleVideoUpload} onExport={handleExportVideo} isExporting={isExporting} exportProgress={exportProgress} hasVideo={!!videoSrc} />

      <div className="flex flex-1 overflow-hidden w-full relative">
        <div style={{ width: `${sidebarWidth}px` }} className="shrink-0 h-full overflow-hidden">
          <TranscriptSidebar captions={captions} activeId={activeId} selectedIds={selectedIds} onSelectCaption={handleSelectCaption} onUpdate={handleUpdateCaption} onAdd={handleAddBlock} onDelete={handleDeleteBlock} />
        </div>

        <div onMouseDown={handleSeparatorMouseDown} className="w-1.5 h-full bg-zinc-900 hover:bg-indigo-500/80 cursor-col-resize shrink-0 z-40" />

        <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden min-w-0">
          {/* Main Content Workspace: flex-1 ensures this area dynamically shrinks or expands when the timeline changes height */}
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
                onPanChange={(x, y) => {
                  setTranslateX(x);
                  setTranslateY(y);
                }}
                handleResetView={handleResetView}
                previewCanvasRef={previewCanvasRef}
                captions={captions}
                captionStyles={captionStyles}
                onCaptionMove={handleCaptionMove}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
              />
            </div>

            {/* Config Panel Right Column */}
            <div className="lg:col-span-1 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-4 h-full overflow-hidden">

              {/* VIEW MANAGER: Switches between "MENU" and "SETTINGS" */}
              {activePanel === 'menu' ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <h2 className="text-xs font-bold text-zinc-500 uppercase">Editor Tools</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'presets', label: 'Preset Captions', icon: Layers },
                      { id: 'custom', label: 'Custom Captions', icon: Edit3 },
                      { id: 'animate', label: 'Animate Captions', icon: Sparkles },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActivePanel(item.id)}
                        className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-indigo-500/50 transition-all group"
                      >
                        <item.icon className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-semibold text-zinc-200 group-hover:text-white">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* SUB-PANEL: Settings View */
                <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                  <button
                    onClick={() => setActivePanel('menu')}
                    className="flex items-center text-xs text-zinc-500 hover:text-white mb-4 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Tools
                  </button>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {activePanel === 'presets' && (
                      <div className="space-y-2">
                        {STYLE_PRESETS.map(p => (
                          <button key={p.id} onClick={() => setThemePreset(p)} className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-left hover:border-indigo-500">{p.name}</button>
                        ))}
                      </div>
                    )}

{activePanel === 'custom' && (
  <div className="space-y-5 text-xs animate-in fade-in duration-300">
    
    {/* Font & Size Row */}
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5"><Type className="w-3 h-3" /> Font</label>
        <select value={captionStyles.fontFamily} onChange={(e) => handleCustomStyleChange('fontFamily', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5">
          <option value="Impact">Impact</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Courier New">Courier</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5"><Maximize2 className="w-3 h-3" /> Size</label>
        <input type="range" min="16" max="120" value={parseInt(captionStyles.fontSize)} onChange={(e) => handleCustomStyleChange('fontSize', e.target.value + 'px')} className="w-full h-1 accent-indigo-500 bg-zinc-800 rounded mt-2" />
      </div>
    </div>

    {/* Tracking & Case */}
    <div className="grid grid-cols-2 gap-3">

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase">Case</label>
        <button onClick={() => handleCustomStyleChange('textTransform', captionStyles.textTransform === 'uppercase' ? 'none' : 'uppercase')} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-left">
          {captionStyles.textTransform === 'uppercase' ? 'ABC (Upper)' : 'Abc (Normal)'}
        </button>
      </div>
    </div>

    {/* Alignment */}
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-zinc-500 uppercase">Alignment</label>
      <div className="grid grid-cols-3 gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
        <button onClick={() => handleCustomStyleChange('textAlign', 'left')} className="p-1.5 hover:bg-zinc-800 rounded flex justify-center"><AlignLeft className="w-3.5 h-3.5" /></button>
        <button onClick={() => handleCustomStyleChange('textAlign', 'center')} className="p-1.5 hover:bg-zinc-800 rounded flex justify-center"><AlignCenter className="w-3.5 h-3.5" /></button>
        <button onClick={() => handleCustomStyleChange('textAlign', 'right')} className="p-1.5 hover:bg-zinc-800 rounded flex justify-center"><AlignRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>

    {/* Modifiers Grid */}
    <div className="grid grid-cols-4 gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
      <button onClick={() => handleCustomStyleChange('fontWeight', captionStyles.fontWeight === '900' ? '400' : '900')} className={`p-2 rounded flex justify-center ${captionStyles.fontWeight === '900' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}><Bold className="w-3.5 h-3.5"/></button>
      <button onClick={() => handleCustomStyleChange('fontStyle', captionStyles.fontStyle === 'italic' ? 'normal' : 'italic')} className={`p-2 rounded flex justify-center ${captionStyles.fontStyle === 'italic' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}><Italic className="w-3.5 h-3.5"/></button>
      <button onClick={() => handleCustomStyleChange('underline', !captionStyles.underline)} className={`p-2 rounded flex justify-center ${captionStyles.underline ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}><Underline className="w-3.5 h-3.5"/></button>
      <button onClick={() => handleCustomStyleChange('strike', !captionStyles.strike)} className={`p-2 rounded flex justify-center ${captionStyles.strike ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}><Strikethrough className="w-3.5 h-3.5"/></button>
    </div>

    {/* Colors */}
    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
       <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1"><Palette className="w-3 h-3" /> Text</label>
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
            <input type="color" value={captionStyles.color} onChange={(e) => handleCustomStyleChange('color', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
            <span className="text-[10px] font-mono text-zinc-400">{captionStyles.color}</span>
          </div>
       </div>
       <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1"><Palette className="w-3 h-3" /> Stroke</label>
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
            <input type="color" value={captionStyles.strokeColor} onChange={(e) => handleCustomStyleChange('strokeColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
            <span className="text-[10px] font-mono text-zinc-400">{captionStyles.strokeColor}</span>
          </div>
       </div>
    </div>
  </div>
)}

                    {activePanel === 'animate' && (
                      <AnimatePanel activeId={activeId} onApplyAnimation={handleApplyAnimation} />
                    )}
                  </div>
                </div>
              )}
            </div>



          </div>
          {/* ─── 📥 DYNAMIC RESIZABLE TIMELINE FOOTER ─── */}
          <div
            style={{ height: `${timelineHeight}px` }}
            className="shrink-0 w-full bg-zinc-900 overflow-hidden relative border-t border-zinc-800/80 flex flex-col min-h-0"
          >
            {/* ↕️ THE RESIZER GHOST HANDLE */}
            <div
              onMouseDown={handleTimelineResizeStart}
              className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize bg-transparent hover:bg-indigo-500/60 transition-colors duration-150 z-50"
            />

            <div className="flex-1 min-h-0 w-full">
              <TimelineTrack
                videoSrc={videoSrc}
                captions={captions}
                currentTime={currentTime}
                duration={duration}
                activeId={activeId}
                selectedIds={selectedIds}
                onSelectCaption={handleSelectCaption}
                onSeek={handleTimelineSeek}
                timelineHeight={timelineHeight}
              />
            </div>
          </div>
        </main>
      </div>

      {/* ─── 🔒 GLOBAL EXPORT BLOCKING OVERLAY WITH CANCEL ─── */}
      {isExporting && (
        <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-xs z-[9999] flex flex-col items-center justify-center">

          {/* Glassmorphic Loader Container */}
          <div className="bg-zinc-900/95 border border-zinc-800/80 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center gap-5">

            {/* Circular Progress Ring Indicator */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin" />
              <span className="text-sm font-mono font-bold text-indigo-400">
                {exportProgress}%
              </span>
            </div>

            {/* Status Metadata Strings */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-zinc-100 tracking-wide uppercase">
                Exporting Project Video
              </h3>
              <p className="text-xs text-zinc-400 max-w-[240px]">
                Compiling frame matrices and merging dynamic graphic overlay text tracks...
              </p>
            </div>

            {/* Realtime Action Tracking Bar */}
            <div className="w-full bg-zinc-950 rounded-full h-1.5 border border-zinc-800/50 p-0.5 overflow-hidden">
              <div
                style={{ width: `${exportProgress}%` }}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
              />
            </div>

            {/* 🛑 CANCEL EXPORT INTERACTION HANDLE */}
            <button
              type="button"
              onClick={handleCancelExport} // ⚡ Cleanly terminates background rendering threads
              className="mt-1 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg transition active:scale-95 cursor-pointer"
            >
              Cancel Export
            </button>

            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest animate-pulse mt-1">
              Please keep this tab open
            </span>
          </div>

        </div>
      )}
    </div>
  );

}