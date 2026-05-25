import { useEffect } from 'react';

const isTypingTarget = (el) => {
  const tag = el?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable;
};

export function useKeyboardShortcuts(handlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e) => {
      if (isTypingTarget(document.activeElement)) return;

      const meta = e.ctrlKey || e.metaKey;
      const key = e.key?.toLowerCase();

      if (e.code === 'Space' && handlers.onTogglePlay) {
        e.preventDefault();
        handlers.onTogglePlay();
        return;
      }

      if (key === '?' && handlers.onShowHelp) {
        e.preventDefault();
        handlers.onShowHelp();
        return;
      }

      if (e.key === 'Escape' && handlers.onEscape) {
        handlers.onEscape();
        return;
      }

      if (meta && key === 'z' && !e.shiftKey && handlers.onUndo) {
        e.preventDefault();
        handlers.onUndo();
        return;
      }

      if (meta && ((key === 'z' && e.shiftKey) || key === 'y') && handlers.onRedo) {
        e.preventDefault();
        handlers.onRedo();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && handlers.onDelete) {
        e.preventDefault();
        handlers.onDelete();
        return;
      }

      if (e.key === 'ArrowLeft' && handlers.onSeekBack) {
        e.preventDefault();
        handlers.onSeekBack();
        return;
      }

      if (e.key === 'ArrowRight' && handlers.onSeekForward) {
        e.preventDefault();
        handlers.onSeekForward();
        return;
      }

      if (meta && (e.key === '=' || e.key === '+') && handlers.onZoomIn) {
        e.preventDefault();
        handlers.onZoomIn();
        return;
      }

      if (meta && e.key === '-' && handlers.onZoomOut) {
        e.preventDefault();
        handlers.onZoomOut();
        return;
      }

      if (meta && key === '0' && handlers.onResetView) {
        e.preventDefault();
        handlers.onResetView();
        return;
      }

      if (!meta && key === 'n' && handlers.onAddCaption) {
        e.preventDefault();
        handlers.onAddCaption();
        return;
      }

      if (!meta && e.key === '1' && handlers.onOpenPanel) {
        handlers.onOpenPanel('presets');
        return;
      }
      if (!meta && e.key === '2' && handlers.onOpenPanel) {
        handlers.onOpenPanel('custom');
        return;
      }
      if (!meta && e.key === '3' && handlers.onOpenPanel) {
        handlers.onOpenPanel('animate');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, enabled]);
}
