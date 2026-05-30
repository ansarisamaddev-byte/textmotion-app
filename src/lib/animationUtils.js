export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export const scaleAroundPoint = (ctx, pivotX, pivotY, scale) => {
  ctx.translate(pivotX, pivotY);
  ctx.scale(scale, scale);
  ctx.translate(-pivotX, -pivotY);
};

export const getBlockAnimationProgress = (elapsed, animDuration) => {
  const raw = Math.min(Math.max(elapsed / animDuration, 0), 1);
  return { raw, eased: easeOutCubic(raw) };
};

export const applyAnimationTransform = (ctx, animation, eased, raw, elapsed, pivotX, pivotY, canvasWidth, motionScale) => {
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
