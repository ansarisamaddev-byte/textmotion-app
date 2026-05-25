import React from 'react';
import { ANIMATION_OPTIONS } from '../../constants/animations';

export default function AnimatePanel({
  activeCaption,
  onApplyAnimation,
  onSpeedChange,
  onSpeedCommit,
  onAnimateAllChange
}) {
  if (!activeCaption) {
    return <div className="text-zinc-500 text-xs p-4 italic">Select a caption to animate</div>;
  }

  const currentAnim = activeCaption.animation || 'none';
  const currentSpeed = parseFloat(activeCaption.animationDuration) || 0.5;
  const animateAll = activeCaption.animationAnimateAll !== false;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {ANIMATION_OPTIONS.map(anim => (
          <button
            key={anim.id}
            onClick={() => onApplyAnimation(anim.id)}
            className={`p-2 border rounded-lg text-[11px] text-left transition-all ${
              currentAnim === anim.id
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_10px_rgba(79,70,229,0.3)]'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-indigo-500 hover:text-white'
            }`}
          >
            {anim.name}
          </button>
        ))}
      </div>

      {currentAnim !== 'none' && (
        <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-zinc-800">
          <div className="flex justify-between items-center text-xs text-zinc-400">
            <span>Animation Speed</span>
            <span>{currentSpeed.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={currentSpeed}
            onPointerDown={onSpeedCommit?.begin}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            onPointerUp={onSpeedCommit?.end}
            onPointerCancel={onSpeedCommit?.end}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <label className="flex items-center justify-between gap-3 cursor-pointer group">
            <span className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={animateAll}
                onChange={(e) => onAnimateAllChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
              />
              All
            </span>
            <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400">
              {animateAll ? 'Animate whole caption together' : 'Animate each word one by one'}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
