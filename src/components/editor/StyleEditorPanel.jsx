import React from 'react';
import {
  Type, Maximize2, AlignLeft, AlignCenter, AlignRight,
  Palette, Bold, Italic, Underline, Strikethrough
} from 'lucide-react';

export default function StyleEditorPanel({ captionStyles, onStyleChange }) {
  return (
    <div className="space-y-5 text-xs animate-in fade-in duration-300">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5"><Type className="w-3 h-3" /> Font</label>
          <select value={captionStyles.fontFamily} onChange={(e) => onStyleChange('fontFamily', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5">
            <option value="Impact">Impact</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Courier New">Courier</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5"><Maximize2 className="w-3 h-3" /> Size</label>
          <input type="range" min="16" max="120" value={parseInt(captionStyles.fontSize)} onChange={(e) => onStyleChange('fontSize', e.target.value + 'px')} className="w-full h-1 accent-indigo-500 bg-zinc-800 rounded mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Case</label>
          <button onClick={() => onStyleChange('textTransform', captionStyles.textTransform === 'uppercase' ? 'none' : 'uppercase')} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-left">
            {captionStyles.textTransform === 'uppercase' ? 'ABC (Upper)' : 'Abc (Normal)'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase">Alignment</label>
        <div className="grid grid-cols-3 gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
          <button onClick={() => onStyleChange('textAlign', 'left')} className="p-1.5 hover:bg-zinc-800 rounded flex justify-center"><AlignLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => onStyleChange('textAlign', 'center')} className="p-1.5 hover:bg-zinc-800 rounded flex justify-center"><AlignCenter className="w-3.5 h-3.5" /></button>
          <button onClick={() => onStyleChange('textAlign', 'right')} className="p-1.5 hover:bg-zinc-800 rounded flex justify-center"><AlignRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
        <button onClick={() => onStyleChange('fontWeight', captionStyles.fontWeight === '900' ? '400' : '900')} className={`p-2 rounded flex justify-center ${captionStyles.fontWeight === '900' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}><Bold className="w-3.5 h-3.5" /></button>
        <button onClick={() => onStyleChange('fontStyle', captionStyles.fontStyle === 'italic' ? 'normal' : 'italic')} className={`p-2 rounded flex justify-center ${captionStyles.fontStyle === 'italic' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}><Italic className="w-3.5 h-3.5" /></button>
        <button onClick={() => onStyleChange('underline', !captionStyles.underline)} className={`p-2 rounded flex justify-center ${captionStyles.underline ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}><Underline className="w-3.5 h-3.5" /></button>
        <button onClick={() => onStyleChange('strike', !captionStyles.strike)} className={`p-2 rounded flex justify-center ${captionStyles.strike ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}><Strikethrough className="w-3.5 h-3.5" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1"><Palette className="w-3 h-3" /> Text</label>
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
            <input type="color" value={captionStyles.color} onChange={(e) => onStyleChange('color', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
            <span className="text-[10px] font-mono text-zinc-400">{captionStyles.color}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1"><Palette className="w-3 h-3" /> Stroke</label>
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
            <input type="color" value={captionStyles.strokeColor} onChange={(e) => onStyleChange('strokeColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
            <span className="text-[10px] font-mono text-zinc-400">{captionStyles.strokeColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
