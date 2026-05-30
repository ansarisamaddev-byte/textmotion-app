import React from 'react';
import { Clapperboard, Layers, Edit3, Sparkles, Shapes } from 'lucide-react';

const TOOLS = [
  { id: 'caption-presets', label: 'Preset Caption', icon: Clapperboard },
  { id: 'preset-font', label: 'Preset Font', icon: Layers },
  { id: 'custom-font', label: 'Custom Font', icon: Edit3 },
  { id: 'elements', label: 'Elements', icon: Shapes },
  { id: 'custom-animate', label: 'Custom Animate', icon: Sparkles }
];

export default function EditorToolsMenu({ onSelectPanel }) {
  return (
    <div className="flex flex-col gap-2 min-h-0">
      <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0">Editor Tools</h2>
      <nav className="flex flex-col gap-1.5 min-h-0">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectPanel(item.id)}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-900/90 transition-colors text-left"
          >
            <item.icon className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs font-medium text-zinc-200 leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
