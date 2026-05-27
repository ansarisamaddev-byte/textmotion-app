import { easeOutCubic, applyAnimationTransform } from './animationUtils';
import { renderElements } from './elementRenderer';

const getWordAnimationProgress = (elapsed, animDuration, wordIndex, wordCount, animateAll) => {
  if (animateAll) {
    const raw = Math.min(Math.max(elapsed / animDuration, 0), 1);
    return { raw, eased: easeOutCubic(raw) };
  }
  const count = Math.max(wordCount, 1);
  const staggerWindow = animDuration * 0.9;
  const slot = count > 1 ? staggerWindow / (count - 1) : 0;
  const wordAnimLen = Math.max(animDuration * 0.5, 0.14);
  const wordElapsed = elapsed - wordIndex * slot;
  const raw = Math.min(Math.max(wordElapsed / wordAnimLen, 0), 1);
  return { raw, eased: easeOutCubic(raw) };
};

const layoutCaptionWords = (ctx, text, anchorX, bottomY, maxWidth, baseSize, textAlign = 'center') => {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const space = ctx.measureText(' ').width;
  const lineHeight = baseSize * 1.2;
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  for (const token of tokens) {
    const width = ctx.measureText(token).width;
    const addWidth = currentLine.length ? space + width : width;
    if (currentLine.length && currentWidth + addWidth > maxWidth) {
      lines.push(currentLine);
      currentLine = [{ text: token, width }];
      currentWidth = width;
    } else {
      currentLine.push({ text: token, width });
      currentWidth += addWidth;
    }
  }
  if (currentLine.length) lines.push(currentLine);

  const placements = [];
  const totalLines = lines.length;

  lines.forEach((line, lineIdx) => {
    const lineWidth = line.reduce((sum, t, i) => sum + t.width + (i ? space : 0), 0);
    let x;
    if (textAlign === 'left') {
      x = anchorX - maxWidth / 2;
    } else if (textAlign === 'right') {
      x = anchorX + maxWidth / 2 - lineWidth;
    } else {
      x = anchorX - lineWidth / 2;
    }
    const y = bottomY - (totalLines - 1 - lineIdx) * lineHeight;

    line.forEach((token) => {
      placements.push({
        text: token.text,
        // Keep the calculated alignment positions centered relative to their allocated row chunk
        x: x + token.width / 2,
        y,
        width: token.width,
        lineIndex: lineIdx
      });
      x += token.width + space;
    });
  });

  return placements;
};

const drawWordText = (ctx, text, x, y, color, strokeColor, strokeFactor, baseSize) => {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  if (strokeFactor > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = baseSize * strokeFactor;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};

export const renderCaptionFrame = (ctx, canvas, video, captions, captionStyles, elements = []) => {
  if (!video || !canvas || video.readyState < 2) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const currentTime = video.currentTime;
  const activeCap = captions.find(c => currentTime >= c.start && currentTime <= c.end);
  
  if (activeCap) {
    ctx.save();

    const animation = activeCap.animation || 'none';
    const animDuration = Math.min(parseFloat(activeCap.animationDuration) || 0.5, 2.0);
    const animateAll = activeCap.animationAnimateAll !== false;
    const elapsed = currentTime - activeCap.start;

    // APPLY STYLES
    const fontFamily = activeCap.fontFamily || captionStyles.fontFamily || 'Impact';
    const fontSize = activeCap.fontSize || captionStyles.fontSize || '48px';
    const fontWeight = activeCap.fontWeight || captionStyles.fontWeight || '900';
    const fontStyle = activeCap.fontStyle || captionStyles.fontStyle || 'normal';
    const color = activeCap.color || captionStyles.color || '#fbbf24';
    const textTransform = activeCap.textTransform || captionStyles.textTransform || 'uppercase';
    const textAlign = activeCap.textAlign || captionStyles.textAlign || 'center';

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

    let baseText = activeCap.text;
    const blockProgress = getWordAnimationProgress(elapsed, animDuration, 0, 1, true);

    if (animation === 'typewriter' && animateAll) {
      const visibleCharacters = Math.floor(blockProgress.raw * baseText.length);
      baseText = baseText.substring(0, visibleCharacters);
    }

    const rawText = textTransform === 'uppercase' ? baseText.toUpperCase() : baseText;
    
    // FIX: Read custom box width if modified by side drag. Fall back to default 88% canvas width
    const maxTextWidth = activeCap.boxWidth !== undefined ? activeCap.boxWidth : canvas.width * 0.88;
    
    const currentXPercent = activeCap.xRel !== undefined ? activeCap.xRel : 0.5;
    const currentYPercent = activeCap.yRel !== undefined ? activeCap.yRel : 0.82;
    const xPos = canvas.width * currentXPercent;
    const bottomY = canvas.height * currentYPercent;
    const pivotX = xPos;
    const pivotY = bottomY;

    const wordPlacements = layoutCaptionWords(ctx, rawText, xPos, bottomY, maxTextWidth, baseSize, textAlign);

    const strokePad = strokeFactor > 0 ? baseSize * strokeFactor * 0.55 : 0;
    const shadowPad = hasShadow ? baseSize * 0.1 : 0;
    const padX = 4 + strokePad + shadowPad;
    const padY = 4 + strokePad + shadowPad * 0.5;

    // FIX: Instead of auto-collapsing left and right metadata to the text edges,
    // lock the boundary handles exactly to your drag allocation width to stop jitter.
    const tightLeft = xPos - maxTextWidth / 2 - padX;
    const tightRight = xPos + maxTextWidth / 2 + padX;

    const lineCount = wordPlacements.length
      ? Math.max(...wordPlacements.map(w => w.lineIndex)) + 1
      : 1;
    const totalBlockHeight = lineCount * baseSize * 1.2;
    const tightTop = bottomY - totalBlockHeight;
    const tightTopY = tightTop - padY;
    const tightBottomY = bottomY + padY * 0.35;

    activeCap._metaBoundingBox = {
      centerX: xPos,
      bottomY: tightBottomY,
      topY: tightTopY,
      left: tightLeft,
      right: tightRight,
      width: tightRight - tightLeft,
      height: tightBottomY - tightTopY
    };

    const renderWord = (word, progress) => {
      if (animation === 'none' || progress.raw <= 0) {
        if (animation !== 'none') return;
      }
      ctx.save();
      if (animation !== 'none' && animation !== 'typewriter') {
        applyAnimationTransform(
          ctx, animation, progress.eased, progress.raw, elapsed,
          word.x, word.y, canvas.width, baseSize
        );
      } else if (animation === 'typewriter') {
        ctx.globalAlpha = progress.eased;
      }
      ctx.shadowColor = hasShadow ? 'rgba(0, 0, 0, 0.85)' : 'transparent';
      drawWordText(ctx, word.text, word.x, word.y, color, strokeColor, strokeFactor, baseSize);
      ctx.restore();
    };

    if (animation === 'none') {
      wordPlacements.forEach(word => {
        ctx.shadowColor = hasShadow ? 'rgba(0, 0, 0, 0.85)' : 'transparent';
        drawWordText(ctx, word.text, word.x, word.y, color, strokeColor, strokeFactor, baseSize);
      });
    } else if (animateAll) {
      if (animation === 'typewriter') {
        wordPlacements.forEach(word => {
          ctx.shadowColor = hasShadow ? 'rgba(0, 0, 0, 0.85)' : 'transparent';
          drawWordText(ctx, word.text, word.x, word.y, color, strokeColor, strokeFactor, baseSize);
        });
      } else {
        ctx.save();
        applyAnimationTransform(
          ctx, animation, blockProgress.eased, blockProgress.raw, elapsed,
          pivotX, pivotY, canvas.width, baseSize
        );
        ctx.shadowColor = hasShadow ? 'rgba(0, 0, 0, 0.85)' : 'transparent';
        wordPlacements.forEach(word => {
          drawWordText(ctx, word.text, word.x, word.y, color, strokeColor, strokeFactor, baseSize);
        });
        ctx.restore();
      }
    } else {
      wordPlacements.forEach((word, wordIndex) => {
        const progress = getWordAnimationProgress(
          elapsed, animDuration, wordIndex, wordPlacements.length, false
        );
        if (animation === 'typewriter') {
          if (progress.raw <= 0) return;
          renderWord(word, progress);
          return;
        }
        if (progress.raw <= 0) return;
        renderWord(word, progress);
      });
    }

    if (hasUnderline || hasStrike) {
      const linesByIndex = {};
      wordPlacements.forEach(w => {
        if (!linesByIndex[w.lineIndex]) linesByIndex[w.lineIndex] = [];
        linesByIndex[w.lineIndex].push(w);
      });
      Object.values(linesByIndex).forEach(lineWords => {
        const sorted = [...lineWords].sort((a, b) => a.x - b.x);
        const left = sorted[0].x - sorted[0].width / 2;
        const right = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width / 2;
        const lineY = sorted[0].y;
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, baseSize * 0.06);
        ctx.beginPath();
        if (hasUnderline) {
          const underlineY = lineY + baseSize * 0.12;
          ctx.moveTo(left, underlineY);
          ctx.lineTo(right, underlineY);
        }
        if (hasStrike) {
          const strikeY = lineY - baseSize * 0.35;
          ctx.moveTo(left, strikeY);
          ctx.lineTo(right, strikeY);
        }
        ctx.stroke();
        ctx.restore();
      });
    }

    ctx.restore();
  }

  renderElements(ctx, canvas, elements, currentTime);
};