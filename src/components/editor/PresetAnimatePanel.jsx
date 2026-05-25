import React from 'react';
import { ANIMATION_PRESETS } from '../../constants/animationPresets';

export default function PresetAnimatePanel({ onApplyAnimationPreset, activeAnimationPresetId }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Apply animation timing to every caption block at once.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {ANIMATION_PRESETS.map((preset) => {
          const isActive = activeAnimationPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyAnimationPreset(preset)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500/40'
                  : 'border-zinc-800 bg-zinc-950 hover:border-indigo-500/60 hover:bg-zinc-900'
              }`}
            >
              <span className="text-[11px] font-bold text-zinc-100 block">{preset.name}</span>
              <span className="text-[9px] text-zinc-500 mt-0.5 block">{preset.tagline}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
