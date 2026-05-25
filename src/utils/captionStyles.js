export function stylesFromCaption(caption, baseStyles) {
  if (!caption) return baseStyles;
  return {
    ...baseStyles,
    fontFamily: caption.fontFamily || baseStyles.fontFamily,
    fontSize: caption.fontSize || baseStyles.fontSize,
    fontWeight: caption.fontWeight || baseStyles.fontWeight,
    fontStyle: caption.fontStyle || baseStyles.fontStyle,
    color: caption.color || baseStyles.color,
    textTransform: caption.textTransform || baseStyles.textTransform,
    strokeColor: caption.strokeColor || baseStyles.strokeColor,
    strokeWidth: caption.strokeWidth !== undefined ? caption.strokeWidth : baseStyles.strokeWidth,
    shadow: caption.shadow !== undefined ? caption.shadow : baseStyles.shadow,
    underline: caption.underline !== undefined ? caption.underline : baseStyles.underline,
    strike: caption.strike !== undefined ? caption.strike : baseStyles.strike
  };
}

export function reorderCaptions(captions, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return captions;
  const next = [...captions];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
