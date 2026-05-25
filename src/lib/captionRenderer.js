const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const scaleAroundPoint = (ctx, pivotX, pivotY, scale) => {
  ctx.translate(pivotX, pivotY);
  ctx.scale(scale, scale);
  ctx.translate(-pivotX, -pivotY);
};

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

const applyAnimationTransform = (ctx, animation, eased, raw, elapsed, pivotX, pivotY, canvasWidth, motionScale) => {
  const slideDistance = motionScale * 2.5;
  const flyDistance = canvasWidth * 0.35;

  switch (animation) {
    case 'fade':
    case 'fade-in':
      ctx.globalAlpha = eased;
      break;
    case 'slide-up':
    case 'slide-up-in':
      ctx.translate(0, slideDistance * (1 - eased));
      ctx.globalAlpha = eased;
      break;
    case 'slide-down':
    case 'slide-down-out':
      ctx.translate(0, -slideDistance * (1 - eased));
      ctx.globalAlpha = eased;
      break;
    case 'scale-in':
      scaleAroundPoint(ctx, pivotX, pivotY, Math.max(eased, 0.01));
      ctx.globalAlpha = eased;
      break;
    case 'pop':
    case 'pop-in': {
      let popScale = eased;
      if (eased > 0.65) {
        popScale = 1 + Math.sin((eased - 0.65) * (Math.PI / 0.35)) * 0.18;
      }
      scaleAroundPoint(ctx, pivotX, pivotY, Math.max(popScale, 0.01));
      ctx.globalAlpha = Math.min(raw * 1.4, 1);
      break;
    }
    case 'bounce':
    case 'bounce-in': {
      const bounceAmt = Math.abs(Math.sin(raw * Math.PI * 2.5)) * (1 - raw) * slideDistance;
      ctx.translate(0, -bounceAmt);
      ctx.globalAlpha = Math.min(raw * 1.8, 1);
      break;
    }
    case 'shake':
    case 'shake-in': {
      const shakeAmt = Math.sin(elapsed * 38) * motionScale * 0.35 * (1 - raw);
      ctx.translate(shakeAmt, 0);
      ctx.globalAlpha = Math.min(raw * 1.5, 1);
      break;
    }
    case 'rotate-in':
      ctx.translate(pivotX, pivotY);
      ctx.rotate((1 - eased) * Math.PI * 0.5);
      ctx.scale(Math.max(eased, 0.01), Math.max(eased, 0.01));
      ctx.translate(-pivotX, -pivotY);
      ctx.globalAlpha = eased;
      break;
    case 'fly-in-left':
      ctx.translate(-flyDistance * (1 - eased), 0);
      ctx.globalAlpha = eased;
      break;
    default:
      break;
  }
};

const layoutCaptionWords = (ctx, text, centerX, bottomY, maxWidth, baseSize) => {
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
    let x = centerX - lineWidth / 2;
    const y = bottomY - (totalLines - 1 - lineIdx) * lineHeight;

    line.forEach((token) => {
      placements.push({
        text: token.text,
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

export const renderCaptionFrame = (ctx, canvas, video, captions, captionStyles) => {
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

    // 3. APPLY STYLES
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

    let baseText = activeCap.text;
    const blockProgress = getWordAnimationProgress(elapsed, animDuration, 0, 1, true);

    if (animation === 'typewriter' && animateAll) {
      const visibleCharacters = Math.floor(blockProgress.raw * baseText.length);
      baseText = baseText.substring(0, visibleCharacters);
    }

    const rawText = textTransform === 'uppercase' ? baseText.toUpperCase() : baseText;
    const maxTextWidth = canvas.width * 0.88;
    const currentXPercent = activeCap.xRel !== undefined ? activeCap.xRel : 0.5;
    const currentYPercent = activeCap.yRel !== undefined ? activeCap.yRel : 0.82;
    const xPos = canvas.width * currentXPercent;
    const bottomY = canvas.height * currentYPercent;
    const pivotX = xPos;
    const pivotY = bottomY;

    const wordPlacements = layoutCaptionWords(ctx, rawText, xPos, bottomY, maxTextWidth, baseSize);

    let calculatedMaxWidth = 0;
    let minY = bottomY;
    let maxY = bottomY;
    wordPlacements.forEach(w => {
      calculatedMaxWidth = Math.max(calculatedMaxWidth, w.width);
      minY = Math.min(minY, w.y - baseSize);
      maxY = Math.max(maxY, w.y);
    });

    const lineCount = wordPlacements.length
      ? Math.max(...wordPlacements.map(w => w.lineIndex)) + 1
      : 1;
    const totalBlockHeight = lineCount * baseSize * 1.2;

    activeCap._metaBoundingBox = {
      centerX: xPos,
      bottomY,
      topY: bottomY - totalBlockHeight,
      width: calculatedMaxWidth,
      height: totalBlockHeight
    };

    if (canvas.hasAttribute('data-dragging-active')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      const boxWidth = Math.max(
        wordPlacements.reduce((sum, w, i, arr) => {
          const lineWords = arr.filter(x => x.lineIndex === w.lineIndex);
          const lw = lineWords.reduce((s, t, idx) => s + t.width + (idx ? ctx.measureText(' ').width : 0), 0);
          return Math.max(sum, lw);
        }, 0),
        calculatedMaxWidth
      );
      ctx.strokeRect(
        xPos - boxWidth / 2 - 16,
        activeCap._metaBoundingBox.topY - 8,
        boxWidth + 32,
        totalBlockHeight + 16
      );
      ctx.restore();
    }

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
};
