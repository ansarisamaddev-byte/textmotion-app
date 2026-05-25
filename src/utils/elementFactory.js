import { DEFAULT_ELEMENT_ANIMATION, ELEMENT_TYPE_DEFAULTS } from '../constants/elements';
import { getLayerForNewElement } from './elementLayers';

const LABELS = {
  text: 'Text',
  emoji: '✨',
  line: 'Line',
  rectangle: 'Rectangle',
  circle: 'Circle',
  arrow: 'Arrow',
  star: 'Star',
  callout: 'Callout'
};

export function createElement(type, currentTime, duration = 30, existingElements = [], activeElement = null, visibleLayerCount = 1) {
  const start = Math.max(0, parseFloat(currentTime.toFixed(2)));
  const end = Math.min(duration || 30, parseFloat((start + 2.5).toFixed(2)));
  const typeDefaults = ELEMENT_TYPE_DEFAULTS[type] || {};

  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label: type === 'emoji' ? (typeDefaults.emoji || '✨') : (LABELS[type] || type),
    layer: getLayerForNewElement(existingElements, activeElement, visibleLayerCount),
    start,
    end: Math.max(start + 0.4, end),
    xRel: 0.5,
    yRel: 0.5,
    rotation: 0,
    opacity: 1,
    ...DEFAULT_ELEMENT_ANIMATION,
    ...typeDefaults
  };
}

export function getElementTimelineLabel(el) {
  if (el.type === 'emoji') return el.emoji || el.label || 'Emoji';
  if (el.type === 'text' || el.type === 'callout') return (el.text || el.label || 'Text').slice(0, 24);
  return el.label || el.type;
}
