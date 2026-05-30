export function buildCaptionsWithAnimationPreset(captions, preset) {
  const patch = {
    animation: preset.animation,
    animationDuration: preset.animationDuration,
    animationAnimateAll: preset.animationAnimateAll
  };
  return captions.map(c => ({ ...c, ...patch }));
}
