import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Trash2, Plus, Clock, AlertCircle, Palette, Sliders, Layers, Bold, Italic, Underline, Strikethrough } from 'lucide-react';
import { STYLE_PRESETS } from '../src/constants/stylePresets';

export default function CaptionEditor({ 
  initialCaptions = [], 
  activeId,
  selectedIds = [],
  captionStyles,
  onSelectCaption,
  onCaptionsChange, 
  onPreviewSegment,
  onApplyPreset,
  onUpdateCustomStyle
}) {
  const [activeTab, setActiveTab] = useState('content'); // 'content' or 'style'
  const containerRef = useRef(null);

  const currentFonts = ['Impact', 'Arial Black', 'Helvetica', 'Montserrat', 'Courier New', 'Georgia', 'Inter', 'Comic Sans MS'];
  const fontSizes = ['18px', '24px', '32px', '40px', '48px', '56px', '64px'];
  const fontWeights = ['400', '500', '700', '900'];

  // Auto-scroll loop for playback tracking
  useEffect(() => {
    if (!activeId || activeTab !== 'content') return;
    const activeElement = document.getElementById(`caption-row-${activeId}`);
    if (activeElement && containerRef.current) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId, activeTab]);

  const updateField = (id, field, value) => {
    const updated = initialCaptions.map((cap) => {
      if (cap.id === id) {
        return { ...cap, [field]: (field === 'start' || field === 'end') ? parseFloat(value) || 0 : value };
      }
      return cap;
    });
    if (field === 'start') updated.sort((a, b) => a.start - b.start);
    if (onCaptionsChange) onCaptionsChange(updated);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* Tab Header Switch Station */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/40">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
            activeTab === 'content' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-zinc-950/40' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Captions List
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
            activeTab === 'style' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-zinc-950/40' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Style Deck
        </button>
      </div>

      {/* VIEW PANEL 1: CAPTIONS EDITOR VIEW */}
      {activeTab === 'content' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 bg-zinc-900/20 border-b border-zinc-900/60 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-zinc-500 font-mono">Real-time segment alignment matrix</span>
            <button
              onClick={() => {
                const last = initialCaptions[initialCaptions.length - 1];
                const start = last ? last.end + 0.2 : 0;
                const updated = [...initialCaptions, { id: `layer_${Date.now()}`, text: 'New Text Line...', start, end: start + 2.5 }];
                if (onCaptionsChange) onCaptionsChange(updated);
              }}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-mono text-[10px] px-2 py-1 rounded"
            >
              + Add Block
            </button>
          </div>

          <div ref={containerRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0 custom-scrollbar">
            {initialCaptions.map((cap, idx) => {
              const isHighlighted = activeId === cap.id || selectedIds.includes(cap.id);
              return (
                <div
                  key={cap.id}
                  id={`caption-row-${cap.id}`}
                  onClick={() => onSelectCaption && onSelectCaption(cap.id)}
                  className={`p-3 rounded-xl border flex flex-col gap-2 transition ${
                    isHighlighted ? 'bg-indigo-600/5 border-indigo-500' : 'bg-zinc-900/40 border-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-600 font-bold">#{String(idx + 1).padStart(2, '0')}</span>
                    <div className="flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">
                      <input type="number" step="0.1" value={cap.start} onChange={(e) => updateField(cap.id, 'start', e.target.value)} onClick={e => e.stopPropagation()} className="w-8 bg-transparent text-center focus:outline-none text-zinc-300" />
                      <span className="text-zinc-700">➔</span>
                      <input type="number" step="0.1" value={cap.end} onChange={(e) => updateField(cap.id, 'end', e.target.value)} onClick={e => e.stopPropagation()} className="w-8 bg-transparent text-center focus:outline-none text-zinc-400" />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onCaptionsChange(initialCaptions.filter(c => c.id !== cap.id)); }} className="text-zinc-600 hover:text-red-400 transition">✕</button>
                  </div>
                  <textarea value={cap.text} onChange={(e) => updateField(cap.id, 'text', e.target.value)} onClick={e => e.stopPropagation()} rows={2} className="w-full bg-transparent text-xs font-medium focus:outline-none text-zinc-200 resize-none leading-relaxed" placeholder="Caption dialogue..." />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW PANEL 2: INTEGRATED STYLE DECK OVERRIDES */}
      {activeTab === 'style' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scrollbar">
          
          {/* Preset Chips */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-zinc-400 text-[11px] font-bold uppercase tracking-wider"><Layers className="w-3 h-3 text-indigo-400"/> Quick Presets</div>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onApplyPreset(preset)}
                  className={`text-left px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition ${
                    captionStyles.preset === preset.id ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300' : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-900 my-1" />

          {/* Typography Overrides */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-bold uppercase tracking-wider"><Sliders className="w-3 h-3 text-indigo-400"/> Custom Controls</div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-zinc-500">Font Family</span>
              <select value={captionStyles.fontFamily} onChange={(e) => onUpdateCustomStyle('fontFamily', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none">
                {currentFonts.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-zinc-500">Size</span>
                <select value={captionStyles.fontSize} onChange={(e) => onUpdateCustomStyle('fontSize', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none">
                  {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-zinc-500">Case Style</span>
                <select value={captionStyles.textTransform} onChange={(e) => onUpdateCustomStyle('textTransform', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none">
                  <option value="none">As Written</option>
                  <option value="uppercase">UPPERCASE</option>
                </select>
              </div>
            </div>

            {/* Stylers Group (Bold / Italic / Underline / Strike) */}
            <div className="flex gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-lg justify-around">
              <button onClick={() => onUpdateCustomStyle('fontWeight', captionStyles.fontWeight === '900' ? '400' : '900')} className={`p-1.5 rounded transition ${captionStyles.fontWeight === '900' ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500'}`}><Bold className="w-3.5 h-3.5"/></button>
              <button onClick={() => onUpdateCustomStyle('fontStyle', captionStyles.fontStyle === 'italic' ? 'normal' : 'italic')} className={`p-1.5 rounded transition ${captionStyles.fontStyle === 'italic' ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500'}`}><Italic className="w-3.5 h-3.5"/></button>
              <button onClick={() => onUpdateCustomStyle('underline', !captionStyles.underline)} className={`p-1.5 rounded transition ${captionStyles.underline ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500'}`}><Underline className="w-3.5 h-3.5"/></button>
              <button onClick={() => onUpdateCustomStyle('strike', !captionStyles.strike)} className={`p-1.5 rounded transition ${captionStyles.strike ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500'}`}><Strikethrough className="w-3.5 h-3.5"/></button>
            </div>

            {/* Stroke Controls */}
            <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-lg space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>Outline Border</span>
                <input type="color" value={captionStyles.strokeColor || '#000000'} onChange={(e) => onUpdateCustomStyle('strokeColor', e.target.value)} className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded" />
              </div>
              <input type="range" min="0" max="0.25" step="0.02" value={captionStyles.strokeWidth || 0.1} onChange={(e) => onUpdateCustomStyle('strokeWidth', parseFloat(e.target.value))} className="w-full h-1 accent-indigo-500 cursor-pointer" />
            </div>

            {/* Color Fill */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-950 border border-zinc-900 rounded-lg text-xs">
              <span className="text-[10px] font-mono text-zinc-500">Text Fill Color</span>
              <input type="color" value={captionStyles.color?.startsWith('#') ? captionStyles.color : '#ffffff'} onChange={(e) => onUpdateCustomStyle('color', e.target.value)} className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded" />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}