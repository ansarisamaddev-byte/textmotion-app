import { applyAnimationTransform, getBlockAnimationProgress } from './animationUtils';
import { normalizeElementLayer } from '../utils/elementLayers';

const TEXT_TYPES = new Set(['text', 'callout']);

function measureTextBlock(ctx, el, canvas) {
  const size = el.fontSize || (el.type === 'callout' ? 28 : 48);
  const weight = el.fontWeight || '800';
  const family = (el.fontFamily || 'Montserrat, sans-serif').split(',')[0].replace(/['"]/g, '').trim();
  const fontName = family.includes(' ') ? `"${family}"` : family;
  ctx.font = `${weight} ${size}px ${fontName}, sans-serif`;
  const text = el.text || (el.type === 'callout' ? 'Note!' : 'Text');
  const w = ctx.measureText(text).width + size * 0.4;
  const h = size * 1.35;
  return { text, w, h, size };
}

export function getElementBounds(el, canvas) {
  const cx = canvas.width * (el.xRel ?? 0.5);
  const cy = canvas.height * (el.yRel ?? 0.5);

  if (el.type === 'emoji') {
    const size = el.emojiSize || 72;
    const half = size / 2;
    return {
      cx, cy, w: size, h: size,
      left: cx - half, right: cx + half,
      topY: cy - half, bottomY: cy + half,
      width: size, height: size,
      hitPad: 16
    };
  }

  if (TEXT_TYPES.has(el.type)) {
    const ctx = canvas.getContext('2d');
    const { w, h } = measureTextBlock(ctx, el, canvas);
    const halfW = w / 2;
    const halfH = h / 2;
    return {
      cx, cy, w, h,
      left: cx - halfW, right: cx + halfW,
      topY: cy - halfH, bottomY: cy + halfH,
      width: w, height: h,
      hitPad: 12
    };
  }

  const w = canvas.width * (el.widthRel ?? 0.2);
  const h = canvas.height * (el.heightRel ?? el.widthRel ?? 0.1);
  const thin = el.type === 'line' || el.type === 'arrow';
  return {
    cx, cy, w, h,
    left: cx - w / 2,
    right: cx + w / 2,
    topY: cy - h / 2,
    bottomY: cy + h / 2,
    width: w,
    height: h,
    hitPad: thin ? 20 : 8
  };
}

function drawTextElement(ctx, el, measured) {
  const { text, size } = measured;
  const color = el.color || '#ffffff';
  const stroke = el.strokeColor || '#000000';
  const strokeFactor = el.strokeWidth ?? 0.08;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (strokeFactor > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = size * strokeFactor;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
}

function drawStar(ctx, outerR, innerR, fill, stroke, strokeW) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fill && fill !== 'transparent') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (strokeW > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.stroke();
  }
}

function drawCallout(ctx, w, h, fill, stroke, strokeW) {
  const r = Math.min(12, h * 0.25);
  const tail = h * 0.35;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.lineTo(w / 2 - r, -h / 2);
  ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  ctx.lineTo(w / 2, h / 2 - r - tail);
  ctx.quadraticCurveTo(w / 2, h / 2 - tail, w / 2 - r, h / 2 - tail);
  ctx.lineTo(0, h / 2);
  ctx.lineTo(-w / 2 + r, h / 2 - tail);
  ctx.quadraticCurveTo(-w / 2, h / 2 - tail, -w / 2, h / 2 - r - tail);
  ctx.lineTo(-w / 2, -h / 2 + r);
  ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  ctx.closePath();
  if (fill && fill !== 'transparent') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (strokeW > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.stroke();
  }
}

function drawElementShape(ctx, el, canvas) {
  const bounds = getElementBounds(el, canvas);
  const { cx, cy, w, h } = bounds;
  const stroke = el.strokeColor || '#ffffff';
  const strokeW = el.strokeWidth ?? 3;
  const fill = el.fillColor || 'transparent';
  const rot = ((el.rotation || 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  if (el.type === 'emoji') {
    const size = el.emojiSize || 72;
    ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.emoji || '✨', 0, 0);
    ctx.restore();
    return;
  }

  if (TEXT_TYPES.has(el.type)) {
    const measured = measureTextBlock(ctx, el, canvas);
    if (el.type === 'callout') {
      drawCallout(ctx, w, h, fill, stroke, strokeW);
    }
    drawTextElement(ctx, el, measured);
    ctx.restore();
    return;
  }

  if (el.type === 'line') {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(w / 2, 0);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (el.type === 'arrow') {
    const len = w / 2;
    const head = Math.min(h * 2, len * 0.35);
    ctx.fillStyle = fill !== 'transparent' ? fill : stroke;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(len - head, 0);
    ctx.lineTo(len - head, -head);
    ctx.lineTo(len, 0);
    ctx.lineTo(len - head, head);
    ctx.lineTo(len - head, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (el.type === 'star') {
    const outer = Math.min(w, h) / 2;
    drawStar(ctx, outer, outer * 0.45, fill, stroke, strokeW);
    ctx.restore();
    return;
  }

  if (el.type === 'circle') {
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    if (fill && fill !== 'transparent') {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (strokeW > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (el.type === 'rectangle') {
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    if (fill && fill !== 'transparent') {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (strokeW > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function renderElements(ctx, canvas, elements, currentTime) {
  if (!elements?.length) return;

  const sorted = [...elements]
    .filter(el => currentTime >= el.start && currentTime <= el.end)
    .sort((a, b) => normalizeElementLayer(a.layer) - normalizeElementLayer(b.layer));

  sorted.forEach(el => {
    const animation = el.animation || 'none';
    const animDuration = Math.min(parseFloat(el.animationDuration) || 0.5, 2);
    const elapsed = currentTime - el.start;
    const bounds = getElementBounds(el, canvas);
    const pivotX = bounds.cx;
    const pivotY = bounds.cy;
    const motionScale = el.type === 'emoji' ? (el.emojiSize || 72) : Math.max(bounds.h, 24);

    el._metaBoundingBox = {
      centerX: pivotX,
      centerY: pivotY,
      left: bounds.left,
      right: bounds.right,
      topY: bounds.topY,
      bottomY: bounds.bottomY,
      width: bounds.width,
      height: bounds.height,
      hitPad: bounds.hitPad ?? 10
    };

    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;

    if (animation !== 'none') {
      const progress = getBlockAnimationProgress(elapsed, animDuration);
      if (progress.raw > 0) {
        applyAnimationTransform(
          ctx, animation, progress.eased, progress.raw, elapsed,
          pivotX, pivotY, canvas.width, motionScale
        );
      } else {
        ctx.restore();
        return;
      }
    }

    drawElementShape(ctx, el, canvas);
    ctx.restore();
  });
}
