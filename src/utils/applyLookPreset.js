import { DEFAULT_CAPTION_STYLES } from '../constants/captions';

const LOOK_PATCH_KEYS = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'color', 'textTransform',
  'textAlign', 'strokeColor', 'strokeWidth', 'shadow', 'underline', 'strike',
  'xRel', 'yRel', 'animation', 'animationDuration', 'animationAnimateAll'
];

export function captionPatchFromLook(look) {
  const patch = { preset: look.id };
  for (const key of LOOK_PATCH_KEYS) {
    if (look[key] !== undefined) patch[key] = look[key];
  }
  return patch;
}

/** Apply a content look to every caption and sync global editor styles. */
export function buildStateFromLookPreset(look, captions) {
  const patch = captionPatchFromLook(look);
  const styles = {
    ...DEFAULT_CAPTION_STYLES,
    preset: look.id,
    fontFamily: look.fontFamily,
    fontSize: look.fontSize,
    fontWeight: look.fontWeight,
    fontStyle: look.fontStyle,
    color: look.color,
    textTransform: look.textTransform,
    textAlign: look.textAlign,
    strokeColor: look.strokeColor,
    strokeWidth: look.strokeWidth,
    shadow: look.shadow,
    underline: look.underline,
    strike: look.strike,
    isEditingCustom: false
  };
  const nextCaptions = captions.map(c => ({ ...c, ...patch }));
  return { styles, captions: nextCaptions };
}
