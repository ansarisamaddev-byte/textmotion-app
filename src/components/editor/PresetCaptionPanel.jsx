import React from 'react';
import { LOOK_PRESETS } from '../../constants/lookPresets';

export default function PresetCaptionPanel({ onApplyLookPreset, activeLookId }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-zinc-500 leading-relaxed">
        One-tap shorts & reels styles — applies font, position, and animation to every caption.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {LOOK_PRESETS.map((look) => {
          const isActive = activeLookId === look.id;
          return (
            <button
              key={look.id}
              type="button"
              onClick={() => onApplyLookPreset(look)}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500/40'
                  : 'border-zinc-800 bg-zinc-950 hover:border-indigo-500/60 hover:bg-zinc-900'
              }`}
            >
              <span className="text-xl leading-none" aria-hidden>{look.emoji}</span>
              <span className="text-[11px] font-bold text-zinc-100">{look.name}</span>
              <span className="text-[9px] text-zinc-500 line-clamp-2">{look.tagline}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
