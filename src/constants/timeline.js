export const MAX_ELEMENT_LAYERS = 5;
export const MIN_CLIP_DURATION = 0.2;
export const TIMELINE_PX_PER_SEC_BASE = 72;
export const TIMELINE_LABEL_WIDTH = 76;
export const TRACK = {
  ruler: 28,
  video: 36,
  caption: 30,
  elementLayer: 26
};

export function timelineTracksHeight(elementLayerCount = 1) {
  const layers = Math.min(MAX_ELEMENT_LAYERS, Math.max(1, elementLayerCount));
  return TRACK.ruler + TRACK.video + TRACK.caption + TRACK.elementLayer * layers;
}
