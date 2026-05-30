export const ELEMENT_TYPES = [
  { id: 'text', label: 'Text', description: 'Titles & labels' },
  { id: 'emoji', label: 'Emoji', description: 'Stickers & icons' },
  { id: 'line', label: 'Line', description: 'Divider stroke' },
  { id: 'rectangle', label: 'Rectangle', description: 'Box & frame' },
  { id: 'circle', label: 'Circle', description: 'Highlight ring' },
  { id: 'arrow', label: 'Arrow', description: 'Direction pointer' },
  { id: 'star', label: 'Star', description: 'Badge & rating' },
  { id: 'callout', label: 'Callout', description: 'Speech bubble' }
];

export const EMOJI_PICKS = [
  '✨', '🔥', '💯', '⭐', '❤️', '👍', '🎉', '💡', '⚡', '🎯',
  '✅', '❌', '👀', '🚀', '💪', '🎬', '📌', '➡️', '⬇️', '⭕'
];

export const DEFAULT_ELEMENT_ANIMATION = {
  animation: 'fade',
  animationDuration: 0.5,
  animationAnimateAll: true
};

export const ELEMENT_TYPE_DEFAULTS = {
  text: {
    widthRel: 0.5,
    heightRel: 0.1,
    text: 'Your Text',
    fontSize: 48,
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: '800',
    color: '#ffffff',
    fillColor: 'transparent',
    strokeColor: '#000000',
    strokeWidth: 0.08,
    animation: 'slide-up'
  },
  emoji: {
    widthRel: 0.12,
    heightRel: 0.12,
    emojiSize: 72,
    emoji: '✨',
    fillColor: 'transparent',
    strokeColor: 'transparent',
    strokeWidth: 0
  },
  line: {
    widthRel: 0.4,
    heightRel: 0.008,
    fillColor: 'transparent',
    strokeColor: '#ffffff',
    strokeWidth: 5,
    animation: 'slide-up'
  },
  rectangle: {
    widthRel: 0.28,
    heightRel: 0.16,
    fillColor: 'rgba(99,102,241,0.25)',
    strokeColor: '#818cf8',
    strokeWidth: 4,
    animation: 'scale-in'
  },
  circle: {
    widthRel: 0.18,
    heightRel: 0.18,
    fillColor: 'rgba(250,204,21,0.2)',
    strokeColor: '#fbbf24',
    strokeWidth: 4,
    animation: 'pop'
  },
  arrow: {
    widthRel: 0.22,
    heightRel: 0.08,
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    animation: 'fly-in-left'
  },
  star: {
    widthRel: 0.14,
    heightRel: 0.14,
    fillColor: '#fbbf24',
    strokeColor: '#b45309',
    strokeWidth: 2,
    animation: 'bounce'
  },
  callout: {
    widthRel: 0.32,
    heightRel: 0.14,
    text: 'Note!',
    fontSize: 28,
    fontFamily: 'Inter, sans-serif',
    fontWeight: '700',
    color: '#18181b',
    fillColor: '#ffffff',
    strokeColor: '#6366f1',
    strokeWidth: 3,
    animation: 'scale-in'
  }
};
