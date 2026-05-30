import React from 'react';
import {
  Trash2, Minus, Square, Circle, Smile, Type, ArrowRight, Star, MessageCircle, Plus, MinusCircle
} from 'lucide-react';
import { ELEMENT_TYPES, EMOJI_PICKS } from '../../constants/elements';
import AnimatePanel from './AnimatePanel';

const TYPE_ICONS = {
  text: Type,
  emoji: Smile,
  line: Minus,
  rectangle: Square,
  circle: Circle,
  arrow: ArrowRight,
  star: Star,
  callout: MessageCircle
};

const TEXT_LIKE = new Set(['text', 'callout']);

export default function ElementsPanel({
  activeElement,
  elementLayerCount = 1,
  maxElementLayers = 5,
  onAddElement,
  onAddElementLayer,
  onRemoveElementLayer,
  onUpdateElement,
  onDeleteElement,
  onSpeedChange,
  onSpeedCommit,
  onApplyAnimation,
  onAnimateAllChange
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] text-zinc-500 mb-2">
          8 element types · drag clips between tracks on the timeline.
        </p>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            disabled={elementLayerCount >= maxElementLayers}
            onClick={onAddElementLayer}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-zinc-700 text-[10px] font-semibold text-zinc-400 hover:text-emerald-300 hover:border-emerald-500/50 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            Add track
          </button>
          <button
            type="button"
            disabled={elementLayerCount <= 1}
            onClick={onRemoveElementLayer}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-zinc-700 text-[10px] font-semibold text-zinc-400 hover:text-red-300 hover:border-red-500/50 disabled:opacity-40"
          >
            <MinusCircle className="w-3.5 h-3.5" />
            Remove track
          </button>
        </div>
        <p className="text-[9px] text-zinc-600 mb-2 text-center">
          Tracks: {elementLayerCount} / {maxElementLayers}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ELEMENT_TYPES.map((t) => {
            const Icon = TYPE_ICONS[t.id] || Square;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onAddElement(t.id)}
                className="flex flex-col items-start gap-1 p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-amber-500/50 hover:bg-zinc-900 transition-all text-left"
              >
                <Icon className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-bold text-zinc-100">{t.label}</span>
                <span className="text-[9px] text-zinc-500 leading-tight">{t.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeElement && (
        <div className="pt-3 border-t border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-400 uppercase">
              Track {(activeElement.layer ?? 0) + 1} · {activeElement.type}
            </h3>
            <button
              type="button"
              onClick={() => onDeleteElement(activeElement.id)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
              title="Delete element"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {TEXT_LIKE.has(activeElement.type) && (
            <label className="text-[10px] text-zinc-500 block">
              Text
              <input
                type="text"
                value={activeElement.text || ''}
                onChange={(e) => onUpdateElement(activeElement.id, { text: e.target.value, label: e.target.value.slice(0, 20) })}
                className="mt-1 w-full px-2 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-zinc-100"
              />
            </label>
          )}

          {activeElement.type === 'emoji' && (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block">Emoji</label>
              <div className="grid grid-cols-5 gap-1.5">
                {EMOJI_PICKS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => onUpdateElement(activeElement.id, { emoji: em, label: em })}
                    className={`text-lg p-1.5 rounded-lg border transition ${
                      activeElement.emoji === em
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-zinc-500">
              Stroke
              <input
                type="color"
                value={activeElement.strokeColor?.startsWith('#') ? activeElement.strokeColor : '#ffffff'}
                onChange={(e) => onUpdateElement(activeElement.id, { strokeColor: e.target.value })}
                className="mt-1 w-full h-8 rounded border border-zinc-800 bg-zinc-950 cursor-pointer"
              />
            </label>
            {!['emoji', 'line', 'arrow'].includes(activeElement.type) && (
              <label className="text-[10px] text-zinc-500">
                Fill
                <input
                  type="color"
                  value={activeElement.fillColor?.startsWith('#') ? activeElement.fillColor : '#6366f1'}
                  onChange={(e) => onUpdateElement(activeElement.id, { fillColor: e.target.value })}
                  className="mt-1 w-full h-8 rounded border border-zinc-800 bg-zinc-950 cursor-pointer"
                />
              </label>
            )}
            {TEXT_LIKE.has(activeElement.type) && (
              <label className="text-[10px] text-zinc-500 col-span-2">
                Text color
                <input
                  type="color"
                  value={activeElement.color?.startsWith('#') ? activeElement.color : '#ffffff'}
                  onChange={(e) => onUpdateElement(activeElement.id, { color: e.target.value })}
                  className="mt-1 w-full h-8 rounded border border-zinc-800 bg-zinc-950 cursor-pointer"
                />
              </label>
            )}
          </div>

          {!['emoji', 'text', 'callout'].includes(activeElement.type) && (
            <label className="text-[10px] text-zinc-500 block">
              Stroke width: {activeElement.strokeWidth ?? 3}px
              <input
                type="range"
                min={1}
                max={12}
                value={activeElement.strokeWidth ?? 3}
                onChange={(e) => onUpdateElement(activeElement.id, { strokeWidth: Number(e.target.value) })}
                className="w-full mt-1 accent-amber-500"
              />
            </label>
          )}

          {activeElement.type === 'emoji' && (
            <label className="text-[10px] text-zinc-500 block">
              Size: {activeElement.emojiSize ?? 72}px
              <input
                type="range"
                min={32}
                max={140}
                value={activeElement.emojiSize ?? 72}
                onChange={(e) => onUpdateElement(activeElement.id, { emojiSize: Number(e.target.value) })}
                className="w-full mt-1 accent-amber-500"
              />
            </label>
          )}

          {TEXT_LIKE.has(activeElement.type) && (
            <label className="text-[10px] text-zinc-500 block">
              Font size: {activeElement.fontSize ?? 48}px
              <input
                type="range"
                min={16}
                max={96}
                value={activeElement.fontSize ?? 48}
                onChange={(e) => onUpdateElement(activeElement.id, { fontSize: Number(e.target.value) })}
                className="w-full mt-1 accent-amber-500"
              />
            </label>
          )}

          <label className="text-[10px] text-zinc-500 block">
            Rotation: {activeElement.rotation ?? 0}°
            <input
              type="range"
              min={-180}
              max={180}
              value={activeElement.rotation ?? 0}
              onChange={(e) => onUpdateElement(activeElement.id, { rotation: Number(e.target.value) })}
              className="w-full mt-1 accent-amber-500"
            />
          </label>

          <div className="pt-2 border-t border-zinc-800">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Layer animation</h4>
            <AnimatePanel
              activeCaption={activeElement}
              onApplyAnimation={(animId) => onApplyAnimation(activeElement.id, animId)}
              onSpeedChange={onSpeedChange}
              onSpeedCommit={onSpeedCommit}
              onAnimateAllChange={(val) => onAnimateAllChange(activeElement.id, val)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
