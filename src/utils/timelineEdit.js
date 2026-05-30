import { MIN_CLIP_DURATION } from '../constants/timeline';
import { normalizeElementLayer } from './elementLayers';

export const CUT_TIME_EPS = 0.03;

export const roundTime = (t) => parseFloat(Math.max(0, t).toFixed(2));

export function clampClipRange(start, end, duration, minLen = MIN_CLIP_DURATION) {
  let s = roundTime(start);
  let e = roundTime(end);
  const max = duration > 0 ? duration : 9999;
  e = Math.min(e, max);
  if (e - s < minLen) {
    if (s + minLen <= max) e = s + minLen;
    else s = Math.max(0, e - minLen);
  }
  return { start: s, end: e };
}

export function isTimeInsideClip(time, start, end) {
  return time > start + CUT_TIME_EPS && time < end - CUT_TIME_EPS;
}

export function splitCaptionAtTime(caption, cutTime) {
  if (!isTimeInsideClip(cutTime, caption.start, caption.end)) return null;

  const raw = caption.text || '';
  const words = raw.split(/\s+/).filter(Boolean);
  let firstText;
  let secondText;

  if (words.length <= 1) {
    const mid = Math.max(1, Math.floor(raw.length / 2));
    firstText = raw.slice(0, mid) || raw || '…';
    secondText = raw.slice(mid) || '…';
  } else {
    const ratio = (cutTime - caption.start) / (caption.end - caption.start);
    const splitIdx = Math.max(1, Math.min(words.length - 1, Math.round(words.length * ratio)));
    firstText = words.slice(0, splitIdx).join(' ');
    secondText = words.slice(splitIdx).join(' ') || '…';
  }

  const first = { ...caption, end: roundTime(cutTime), text: firstText };
  const second = {
    ...caption,
    id: `${caption.id}-cut-${Date.now()}`,
    start: roundTime(cutTime),
    text: secondText
  };
  return [first, second];
}

export function splitElementAtTime(element, cutTime) {
  if (!isTimeInsideClip(cutTime, element.start, element.end)) return null;
  const first = { ...element, end: roundTime(cutTime) };
  const second = {
    ...element,
    id: `el-cut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    start: roundTime(cutTime)
  };
  return [first, second];
}

export function replaceItemWithSplit(items, itemId, pair) {
  const idx = items.findIndex(i => i.id === itemId);
  if (idx < 0 || !pair) return items;
  const next = [...items];
  next.splice(idx, 1, pair[0], pair[1]);
  return next;
}

/** Resolve which clip to split at playhead (prefers selection when valid). */
export function resolveCutTarget(captions, elements, time, activeId, activeElementId) {
  const capsAt = captions.filter(c => isTimeInsideClip(time, c.start, c.end));
  const elsAt = elements.filter(e => isTimeInsideClip(time, e.start, e.end));

  if (activeElementId) {
    const sel = elsAt.find(e => e.id === activeElementId);
    if (sel) return { kind: 'element', item: sel };
  }
  if (activeId) {
    const sel = capsAt.find(c => c.id === activeId);
    if (sel) return { kind: 'caption', item: sel };
  }

  if (elsAt.length) {
    const top = [...elsAt].sort((a, b) => normalizeElementLayer(b.layer) - normalizeElementLayer(a.layer))[0];
    return { kind: 'element', item: top };
  }
  if (capsAt.length) {
    return { kind: 'caption', item: capsAt[0] };
  }
  return null;
}
