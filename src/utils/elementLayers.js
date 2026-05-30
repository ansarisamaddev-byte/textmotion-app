import { MAX_ELEMENT_LAYERS, TRACK } from '../constants/timeline';

export function normalizeElementLayer(layer, maxLayer = MAX_ELEMENT_LAYERS) {
  const n = Number(layer);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(maxLayer - 1, Math.floor(n)));
}

export function getRequiredLayerCount(elements, userLayerCount = 1) {
  const usedMax = elements.reduce(
    (m, el) => Math.max(m, normalizeElementLayer(el.layer, MAX_ELEMENT_LAYERS) + 1),
    0
  );
  return Math.min(MAX_ELEMENT_LAYERS, Math.max(1, userLayerCount, usedMax));
}

export function getLayerForNewElement(elements, activeElement, visibleLayerCount) {
  const max = visibleLayerCount;
  if (activeElement) {
    return Math.min(normalizeElementLayer(activeElement.layer, max) + 1, max - 1);
  }
  const used = new Set(elements.map(el => normalizeElementLayer(el.layer, max)));
  for (let i = 0; i < max; i++) {
    if (!used.has(i)) return i;
  }
  return max - 1;
}

export function elementsByLayer(elements, layerCount) {
  const count = Math.min(MAX_ELEMENT_LAYERS, Math.max(1, layerCount));
  const buckets = Array.from({ length: count }, () => []);
  elements.forEach(el => {
    const layer = normalizeElementLayer(el.layer, count);
    buckets[layer].push(el);
  });
  return buckets;
}

export function layerIndexFromDrag(startLayer, deltaY, layerCount) {
  const rowStep = TRACK.elementLayer + 4;
  const delta = Math.round(deltaY / rowStep);
  return Math.max(0, Math.min(layerCount - 1, startLayer + delta));
}

/** After removing a track index, shift elements down and clamp layers. */
export function remapElementsAfterRemoveTrack(elements, removedIndex, newLayerCount) {
  return elements.map(el => {
    let layer = normalizeElementLayer(el.layer, MAX_ELEMENT_LAYERS);
    if (layer === removedIndex) {
      layer = Math.max(0, removedIndex - 1);
    } else if (layer > removedIndex) {
      layer -= 1;
    }
    return { ...el, layer: Math.min(layer, newLayerCount - 1) };
  });
}

export function canRemoveElementTrack(layerCount, elements) {
  if (layerCount <= 1) return false;
  return true;
}
