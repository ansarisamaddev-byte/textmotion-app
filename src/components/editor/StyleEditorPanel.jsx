import React from 'react';
import {
  Type, Maximize2, AlignLeft, AlignCenter, AlignRight,
  Palette, Bold, Italic, Underline, Strikethrough, CaseSensitive, Minus
} from 'lucide-react';
import { FONT_OPTIONS } from '../../constants/fonts';

const Section = ({ title, children }) => (
  <section className="space-y-2.5">
    <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/80 pb-1.5">
      {title}
    </h3>
    {children}
  </section>
);

const ToggleBtn = ({ active, onClick, children, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`p-2 rounded-md flex justify-center transition-all ${
      active ? 'bg-indigo-600/25 text-indigo-300 ring-1 ring-indigo-500/50' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
    }`}
  >
    {children}
  </button>
);

export default function StyleEditorPanel({ captionStyles, onStyleChange }) {
  const fontSize = parseInt(captionStyles.fontSize, 10) || 48;
  const align = captionStyles.textAlign || 'center';

  return (
    <div className="space-y-5 text-xs">
      <Section title="Typography">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-zinc-500 flex items-center gap-1"><Type className="w-3 h-3" /> Font family</label>
          <select
            value={captionStyles.fontFamily}
            onChange={(e) => onStyleChange('fontFamily', e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-[11px] text-zinc-200 focus:border-indigo-500/60 focus:outline-none"
          >
            {FONT_OPTIONS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.fonts.map(f => (
                  <option key={f.value} value={f.value}>{f.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> Size</span>
            <span className="font-mono text-zinc-400">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="16"
            max="120"
            value={fontSize}
            onChange={(e) => onStyleChange('fontSize', `${e.target.value}px`)}
            className="w-full h-1.5 accent-indigo-500 bg-zinc-800 rounded-full"
          />
        </div>

        <div className="grid grid-cols-4 gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
          <ToggleBtn active={captionStyles.fontWeight === '900'} onClick={() => onStyleChange('fontWeight', captionStyles.fontWeight === '900' ? '400' : '900')} title="Bold">
            <Bold className="w-3.5 h-3.5" />
          </ToggleBtn>
          <ToggleBtn active={captionStyles.fontStyle === 'italic'} onClick={() => onStyleChange('fontStyle', captionStyles.fontStyle === 'italic' ? 'normal' : 'italic')} title="Italic">
            <Italic className="w-3.5 h-3.5" />
          </ToggleBtn>
          <ToggleBtn active={captionStyles.underline} onClick={() => onStyleChange('underline', !captionStyles.underline)} title="Underline">
            <Underline className="w-3.5 h-3.5" />
          </ToggleBtn>
          <ToggleBtn active={captionStyles.strike} onClick={() => onStyleChange('strike', !captionStyles.strike)} title="Strikethrough">
            <Strikethrough className="w-3.5 h-3.5" />
          </ToggleBtn>
        </div>

        <button
          type="button"
          onClick={() => onStyleChange('textTransform', captionStyles.textTransform === 'uppercase' ? 'none' : 'uppercase')}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition ${
            captionStyles.textTransform === 'uppercase'
              ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200'
              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <CaseSensitive className="w-3.5 h-3.5 shrink-0" />
          {captionStyles.textTransform === 'uppercase' ? 'UPPERCASE' : 'Normal case'}
        </button>
      </Section>

      <Section title="Alignment">
        <div className="grid grid-cols-3 gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
          <ToggleBtn active={align === 'left'} onClick={() => onStyleChange('textAlign', 'left')} title="Align left">
            <AlignLeft className="w-4 h-4" />
          </ToggleBtn>
          <ToggleBtn active={align === 'center'} onClick={() => onStyleChange('textAlign', 'center')} title="Align center">
            <AlignCenter className="w-4 h-4" />
          </ToggleBtn>
          <ToggleBtn active={align === 'right'} onClick={() => onStyleChange('textAlign', 'right')} title="Align right">
            <AlignRight className="w-4 h-4" />
          </ToggleBtn>
        </div>
        <p className="text-[10px] text-zinc-600">Aligns text within the caption safe area on the video.</p>
      </Section>

      <Section title="Colors & stroke">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-500 flex items-center gap-1"><Palette className="w-3 h-3" /> Fill</label>
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1.5">
              <input type="color" value={captionStyles.color} onChange={(e) => onStyleChange('color', e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
              <span className="text-[10px] font-mono text-zinc-400 truncate">{captionStyles.color}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-500 flex items-center gap-1"><Palette className="w-3 h-3" /> Outline</label>
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1.5">
              <input type="color" value={captionStyles.strokeColor} onChange={(e) => onStyleChange('strokeColor', e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
              <span className="text-[10px] font-mono text-zinc-400 truncate">{captionStyles.strokeColor}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><Minus className="w-3 h-3" /> Outline width</span>
            <span className="font-mono">{Math.round((captionStyles.strokeWidth ?? 0.14) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.35"
            step="0.01"
            value={captionStyles.strokeWidth ?? 0.14}
            onChange={(e) => onStyleChange('strokeWidth', parseFloat(e.target.value))}
            className="w-full h-1.5 accent-indigo-500 bg-zinc-800 rounded-full"
          />
        </div>

        <label className="flex items-center justify-between cursor-pointer px-2 py-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700">
          <span className="text-[11px] text-zinc-300">Drop shadow</span>
          <input
            type="checkbox"
            checked={!!captionStyles.shadow}
            onChange={(e) => onStyleChange('shadow', e.target.checked)}
            className="accent-indigo-500"
          />
        </label>
      </Section>
    </div>
  );
}
