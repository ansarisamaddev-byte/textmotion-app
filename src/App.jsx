import React, { useState, useRef, useEffect, useCallback } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import TranscriptSidebar from './components/TranscriptSidebar';
import VideoViewport from './components/VideoViewport';
import TimelineTrack from './components/TimelineTrack';
import { Layers, Edit3, X, Bold, Italic, Underline, Strikethrough, Sparkles } from 'lucide-react';
import RecordRTC from 'recordrtc';

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
    id: '3', start: 5.6, end: 9.0, text: "Ready to scale with your custom enhancements.",
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

  const [sidebarWidth, setSidebarWidth] = useState(220); 
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isDraggingText, setIsDraggingText] = useState(false);

  const [captionStyles, setCaptionStyles] = useState({
    preset: 'bold-kinetic',
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

  // High performance references to bypass layout-pass race conditions entirely
  const captionsRef = useRef(captions);
  const currentTimeRef = useRef(currentTime);
  const captionStylesRef = useRef(captionStyles);

  useEffect(() => { captionsRef.current = captions; }, [captions]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { captionStylesRef.current = captionStyles; }, [captionStyles]);

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

  // High Performance Canvas Interaction Sync Hook with Ref Pointers
  useEffect(() => {
    const canvasElement = previewCanvasRef.current;
    if (!canvasElement) return;

    let localIsDragging = false;
    let dragConfig = null;

    const getCanvasRelativeCoords = (clientX, clientY) => {
      const rect = canvasElement.getBoundingClientRect();
      return {
        canvasX: ((clientX - rect.left) / rect.width) * canvasElement.width,
        canvasY: ((clientY - rect.top) / rect.height) * canvasElement.height,
        viewportWidth: rect.width,
        viewportHeight: rect.height
      };
    };

    const onMouseDown = (e) => {
      const activeCap = captionsRef.current.find(c => currentTimeRef.current >= c.start && currentTimeRef.current <= c.end);
      if (!activeCap || !activeCap._metaBoundingBox) return;

      const { canvasX, canvasY, viewportWidth, viewportHeight } = getCanvasRelativeCoords(e.clientX, e.clientY);
      const box = activeCap._metaBoundingBox;

      if (
        canvasX >= box.centerX - (box.width / 2) - 30 &&
        canvasX <= box.centerX + (box.width / 2) + 30 &&
        canvasY >= box.topY - 30 &&
        canvasY <= box.bottomY + 30
      ) {
        localIsDragging = true;
        setIsDraggingText(true);
        canvasElement.setAttribute('data-dragging-active', 'true');
        
        dragConfig = {
          captionId: activeCap.id,
          initialXRel: activeCap.xRel !== undefined ? activeCap.xRel : 0.5,
          initialYRel: activeCap.yRel !== undefined ? activeCap.yRel : 0.82,
          startX: e.clientX,
          startY: e.clientY,
          viewportWidth,
          viewportHeight
        };
        
        e.preventDefault();
      }
    };

    const onMouseMove = (e) => {
      if (!localIsDragging || !dragConfig) return;

      const currentDeltaX = e.clientX - dragConfig.startX;
      const currentDeltaY = e.clientY - dragConfig.startY;

      const changeXRel = currentDeltaX / dragConfig.viewportWidth;
      const changeYRel = currentDeltaY / dragConfig.viewportHeight;

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

        const changeXRel = currentDeltaX / dragConfig.viewportWidth;
        const changeYRel = currentDeltaY / dragConfig.viewportHeight;

        const finalX = Math.max(0.05, Math.min(0.95, dragConfig.initialXRel + changeXRel));
        const finalY = Math.max(0.10, Math.min(0.98, dragConfig.initialYRel + changeYRel));
        
        const targetId = dragConfig.captionId;

        localIsDragging = false;
        setIsDraggingText(false);
        dragConfig = null;
        canvasElement.removeAttribute('data-dragging-active');

        setCaptions(prev => {
          const updated = prev.map(item => item.id === targetId ? { ...item, xRel: finalX, yRel: finalY } : item);
          
          setTimeout(() => {
            const ctx = canvasElement.getContext('2d');
            if (videoRef.current) {
              ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
              renderCaptionFrame(ctx, canvasElement, videoRef.current, updated, captionStylesRef.current);
            }
          }, 0);

          return updated;
        });
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
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      const ctx = canvas.getContext('2d');
      renderCaptionFrame(ctx, canvas, video, captions, captionStyles);
    }
  }, [currentTime, captions, captionStyles]);

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
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      
      // Update our high-performance reference pointer immediately
      currentTimeRef.current = time;

      // Find the caption enclosing the clicked timeline timestamp
      const targetedCaption = captions.find(c => time >= c.start && time <= c.end);

      if (targetedCaption) {
        // Set it as the active and selected caption in your configuration block
        setActiveId(targetedCaption.id);
        setSelectedIds([targetedCaption.id]);

        // Sync custom editing panel inputs with this caption's typography parameters
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
        // Clear active selection if the user clicks an empty gap on the timeline track
        setActiveId(null);
        setSelectedIds([]);
      }

      // Force an immediate canvas layout redraw to instantly display the updated block
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderCaptionFrame(ctx, canvas, videoRef.current, captions, captionStyles);
      }
    }
  };

  const handleUpdateCaption = (id, field, value) => {
    setCaptions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleAddBlock = () => {
    const last = captions[captions.length - 1];
    const start = last ? parseFloat((last.end + 0.1).toFixed(1)) : 0;
    setCaptions([...captions, { 
      id: Date.now().toString(), 
      start, 
      end: start + 2.5, 
      text: "New subtitle line...",
      xRel: 0.5,
      yRel: 0.82 
    }]);
  };

  const handleDeleteBlock = (id) => {
    setCaptions(prev => prev.filter(c => c.id !== id));
    setSelectedIds(prev => prev.filter(item => item !== id));
  };

  const handleSeparatorMouseDown = (e) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent) => {
      setSidebarWidth(Math.max(220, Math.min(300, moveEvent.clientX)));
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSelectCaption = (id) => {
    setSelectedIds([id]);
    setActiveId(id);
    
    const targeted = captions.find(c => c.id === id);
    if (targeted && videoRef.current) {
      videoRef.current.currentTime = targeted.start;
      setCurrentTime(targeted.start);
    }

    if (targeted) {
      setCaptionStyles(prev => ({
        ...prev,
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
      }));
    }
  };

  const handleCustomStyleChange = (field, value) => {
    setCaptionStyles(prev => ({ ...prev, preset: 'custom', [field]: value }));
    if (selectedIds.length > 0) {
      setCaptions(prevCaptions => 
        prevCaptions.map(c => selectedIds.includes(c.id) ? { ...c, [field]: value } : c)
      );
    }
  };

  function setThemePreset(preset) {
    const updatedStyles = {
      preset: preset.id, fontFamily: preset.font, fontSize: preset.size, fontWeight: preset.weight, color: preset.color, textTransform: preset.trans, fontStyle: preset.style, strokeColor: preset.strokeColor, strokeWidth: preset.strokeWidth, shadow: preset.shadow, underline: preset.underline, strike: preset.strike, isEditingCustom: false
    };
    
    setCaptionStyles(updatedStyles);
    
    setCaptions(prevCaptions => {
      return prevCaptions.map(c => {
        if (selectedIds.includes(c.id)) {
          return { 
            ...c, fontFamily: preset.font, fontSize: preset.size, fontWeight: preset.weight, color: preset.color, textTransform: preset.trans, fontStyle: preset.style, strokeColor: preset.strokeColor, strokeWidth: preset.strokeWidth, shadow: preset.shadow, underline: preset.underline, strike: preset.strike
          };
        }
        return c;
      });
    });
  }

const handleExportVideo = async () => {
    if (!videoSrc || !videoRef.current) return;

    setIsExporting(true);
    setExportProgress(0);

    const mainVideo = videoRef.current;
    const nativeWidth = mainVideo.videoWidth || 1080;
    const nativeHeight = mainVideo.videoHeight || 1920;

    const originalTime = mainVideo.currentTime;
    const originalMuted = mainVideo.muted;

    mainVideo.pause();
    mainVideo.currentTime = 0;
    mainVideo.muted = false; 

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = nativeWidth;
    exportCanvas.height = nativeHeight;
    const exportCtx = exportCanvas.getContext('2d');

    const videoStream = exportCanvas.captureStream(30);
    let combinedStream = videoStream;
    let audioDestination = null;

    // Persist and reuse AudioContext globally to prevent resource lockups on the HTML5 video element
    if (!window._sharedAudioContext) {
      window._sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      window._sharedAudioSource = window._sharedAudioContext.createMediaElementSource(mainVideo);
    }

    const audioContext = window._sharedAudioContext;
    const audioSource = window._sharedAudioSource;

    try {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Safely disconnect any previous graph pipelines before reconstruction
      audioSource.disconnect();
      
      audioDestination = audioContext.createMediaStreamDestination();
      
      // Multi-route: Send audio to the recorder track AND back to standard speaker nodes
      audioSource.connect(audioDestination);
      audioSource.connect(audioContext.destination);

      const audioTrack = audioDestination.stream.getAudioTracks()[0];
      if (audioTrack) {
        videoStream.addTrack(audioTrack);
        combinedStream = videoStream;
      }
    } catch (audioErr) {
      console.warn("Web Audio Routing notice:", audioErr);
    }

    const recorder = RecordRTC(combinedStream, {
      type: 'video', 
      mimeType: 'video/webm', 
      bitsPerSecond: 8000000
    });

    recorder.startRecording();
    let animId = null;

    const processFrame = () => {
      if (!mainVideo || mainVideo.paused || mainVideo.ended) return;

      renderCaptionFrame(exportCtx, exportCanvas, mainVideo, captions, captionStyles);

      const progress = Math.min(99, Math.floor((mainVideo.currentTime / duration) * 100));
      setExportProgress(progress);

      if (mainVideo.currentTime < duration && !mainVideo.ended) {
        animId = requestAnimationFrame(processFrame);
      }
    };

    setTimeout(() => {
      mainVideo.play().then(() => {
        animId = requestAnimationFrame(processFrame);
      }).catch(err => {
        console.error("Export frame capture engine error:", err);
        setIsExporting(false);
      });
    }, 150);

    const finalizeVideo = () => {
      if (animId) cancelAnimationFrame(animId);
      clearInterval(safetyInterval);

      recorder.stopRecording(() => {
        setExportProgress(100);
        const blob = recorder.getBlob();
        const url = URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `textmotion-render-${Date.now()}.webm`;
        document.body.appendChild(anchor);
        anchor.click();

        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        // CLEANUP STEP: Tear down target streams but route standard element channel back to speakers
        if (audioSource) {
          audioSource.disconnect();
          audioSource.connect(audioContext.destination);
        }
        if (audioDestination) {
          audioDestination.disconnect();
        }

        mainVideo.pause();
        mainVideo.currentTime = originalTime;
        mainVideo.muted = originalMuted;
        setIsPlaying(false);
        setIsExporting(false);
      });
    };

    const safetyInterval = setInterval(() => {
      if (mainVideo.currentTime >= duration || mainVideo.ended) {
        finalizeVideo();
      }
    }, 100);
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
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      <WorkspaceHeader onVideoUpload={handleVideoUpload} onExport={handleExportVideo} isExporting={isExporting} exportProgress={exportProgress} hasVideo={!!videoSrc} />

      <div className="flex flex-1 overflow-hidden w-full relative">
        <div style={{ width: `${sidebarWidth}px` }} className="shrink-0 h-full overflow-hidden">
          <TranscriptSidebar captions={captions} activeId={activeId} selectedIds={selectedIds} onSelectCaption={handleSelectCaption} onUpdate={handleUpdateCaption} onAdd={handleAddBlock} onDelete={handleDeleteBlock} />
        </div>

        <div onMouseDown={handleSeparatorMouseDown} className="w-1.5 h-full bg-zinc-900 hover:bg-indigo-500/80 cursor-col-resize shrink-0 z-40" />

        <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden min-w-0">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 p-6 gap-6 min-h-0 relative overflow-hidden">
            <div className={`lg:col-span-4 min-h-0 flex flex-col relative ${isDraggingText ? 'cursor-grabbing' : ''}`}>
              <VideoViewport 
                videoSrc={videoSrc} videoRef={videoRef} previewCanvasRef={previewCanvasRef} isPlaying={isPlaying} currentTime={currentTime} duration={duration} activeCaption={currentActiveCaption} captions={captions} captionStyles={activeViewportStyles} onTogglePlay={handleTogglePlay}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                setCaptions={setCaptions}
              />
            </div>

            {/* Config Panel Right Column */}
            <div className="lg:col-span-1 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 shrink-0">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  {captionStyles.isEditingCustom ? <Sparkles className="w-3.5 h-3.5 text-indigo-400"/> : <Layers className="w-3.5 h-3.5 text-indigo-400"/>}
                  {captionStyles.isEditingCustom ? "Custom Controls" : "Style Presets"}
                </span>
                <button 
                  onClick={() => setCaptionStyles(prev => ({ ...prev, isEditingCustom: !prev.isEditingCustom }))} 
                  className={`p-1.5 rounded transition ${captionStyles.isEditingCustom ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'}`}
                >
                  {captionStyles.isEditingCustom ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </button>
              </div>

              {captionStyles.isEditingCustom ? (
                <div className="space-y-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Font Style Preset</label>
                    <select value={captionStyles.fontFamily} onChange={(e) => handleCustomStyleChange('fontFamily', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 focus:outline-none focus:border-indigo-500">
                      <option value="Impact, Arial Black, sans-serif">Impact (Kinetic Bold)</option>
                      <option value="system-ui, sans-serif">System Sans (Minimal)</option>
                      <option value="'Courier New', Courier, monospace">Courier (Typewriter)</option>
                      <option value="Georgia, serif">Georgia (Retro Serif)</option>
                      <option value="Montserrat, sans-serif">Montserrat (Geometric)</option>
                      <option value="Arial Black, sans-serif">Arial Black (Heavy)</option>
                      <option value="'Comic Sans MS', cursive">Comic Sans (Punchy)</option>
                      <option value="Inter, sans-serif">Inter (Clean Sub)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      <label>Font Size</label>
                      <span>{captionStyles.fontSize}</span>
                    </div>
                    <input type="range" min="16" max="100" step="2" value={parseInt(captionStyles.fontSize) || 48} onChange={(e) => handleCustomStyleChange('fontSize', `${e.target.value}px`)} className="w-full h-1 accent-indigo-500 bg-zinc-800 rounded cursor-pointer" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Case Style</label>
                    <select value={captionStyles.textTransform} onChange={(e) => handleCustomStyleChange('textTransform', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 focus:outline-none">
                      <option value="uppercase">UPPERCASE</option>
                      <option value="none">As Written (Standard)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Text Modifiers</label>
                    <div className="grid grid-cols-4 gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-lg text-center">
                      <button type="button" onClick={() => handleCustomStyleChange('fontWeight', captionStyles.fontWeight === '900' ? '400' : '900')} className={`p-2 rounded flex justify-center transition ${captionStyles.fontWeight === '900' ? 'text-indigo-400 bg-indigo-500/10 font-black' : 'text-zinc-500 hover:text-zinc-300'}`} title="Bold Weight"><Bold className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => handleCustomStyleChange('fontStyle', captionStyles.fontStyle === 'italic' ? 'normal' : 'italic')} className={`p-2 rounded flex justify-center transition ${captionStyles.fontStyle === 'italic' ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-zinc-300'}`} title="Italic Slant"><Italic className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => handleCustomStyleChange('underline', !captionStyles.underline)} className={`p-2 rounded flex justify-center transition ${captionStyles.underline ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-zinc-300'}`} title="Underline Line"><Underline className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => handleCustomStyleChange('strike', !captionStyles.strike)} className={`p-2 rounded flex justify-center transition ${captionStyles.strike ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-zinc-300'}`} title="Strike Through"><Strikethrough className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Text</label>
                      <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-1">
                        <input type="color" value={captionStyles.color} onChange={(e) => handleCustomStyleChange('color', e.target.value)} className="w-6 h-6 bg-transparent border-0 cursor-pointer rounded" />
                        <span className="ml-1.5 font-mono text-[10px] text-zinc-400 uppercase">{captionStyles.color}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Stroke</label>
                      <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-1">
                        <input type="color" value={captionStyles.strokeColor || '#000000'} onChange={(e) => handleCustomStyleChange('strokeColor', e.target.value)} className="w-6 h-6 bg-transparent border-0 cursor-pointer rounded" />
                        <span className="ml-1.5 font-mono text-[10px] text-zinc-400 uppercase">{captionStyles.strokeColor || '#000000'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 max-h-[480px] custom-scrollbar">
                  {STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setThemePreset(preset)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col gap-1 ${
                        captionStyles.preset === preset.id
                          ? 'bg-indigo-600/15 border-indigo-500/80 text-white shadow-sm'
                          : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900/60 hover:text-white'
                      }`}
                    >
                      <span className="font-semibold">{preset.name}</span>
                      <span className="text-[10px] opacity-40 font-mono truncate">
                        {preset.font.split(',')[0]} • {preset.size}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 w-full bg-zinc-900 h-[220px] overflow-hidden">
            <TimelineTrack videoSrc={videoSrc} captions={captions} currentTime={currentTime} duration={duration} activeId={activeId} selectedIds={selectedIds} onSelectCaption={handleSelectCaption} onSeek={handleTimelineSeek} />       
          </div>
        </main>
      </div>
    </div>
  );
}