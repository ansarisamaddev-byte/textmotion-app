import React from 'react';
import { Layers, Edit3, Sparkles } from 'lucide-react';

const TOOLS = [
  { id: 'presets', label: 'Preset', icon: Layers },
  { id: 'custom', label: 'Custom', icon: Edit3 },
  { id: 'animate', label: 'Animate', icon: Sparkles }
];

export default function EditorToolsMenu({ onSelectPanel }) {
  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      <h2 className="text-xs font-bold text-zinc-500 uppercase">Editor Tools</h2>
      <div className="grid grid-cols-1 gap-3">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectPanel(item.id)}
            className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-indigo-500/50 transition-all group"
          >
            <item.icon className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-semibold text-zinc-200 group-hover:text-white">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
