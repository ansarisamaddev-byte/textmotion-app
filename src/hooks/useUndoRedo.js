import { useRef, useState, useCallback } from 'react';

const snapshotsEqual = (a, b) => {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Clipchamp-style history: undo restores last committed edit state.
 * - commit() records pre-change snapshot once, then applies change
 * - beginTransaction/endTransaction batch live typing or slider drags into one undo step
 * - Selection and timeline scrubbing do NOT use this hook
 */
export function useUndoRedo(getSnapshot, applyState) {
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const isApplyingHistory = useRef(false);
  const transactionActive = useRef(false);
  const transactionRecorded = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateStackStatus = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const pushUndoSnapshot = useCallback(() => {
    if (isApplyingHistory.current) return;
    const snap = getSnapshot();
    const last = undoStack.current[undoStack.current.length - 1];
    if (!last || !snapshotsEqual(last, snap)) {
      undoStack.current.push(snap);
      redoStack.current = [];
      updateStackStatus();
    }
  }, [getSnapshot, updateStackStatus]);

  const commit = useCallback((nextCaptions, nextStyles, nextElements) => {
    pushUndoSnapshot();
    const snap = getSnapshot();
    applyState({
      ...snap,
      captions: nextCaptions,
      styles: nextStyles,
      elements: nextElements !== undefined ? nextElements : snap.elements
    });
  }, [getSnapshot, pushUndoSnapshot, applyState]);

  const beginTransaction = useCallback(() => {
    if (!transactionActive.current) {
      transactionActive.current = true;
      transactionRecorded.current = false;
    }
    if (!transactionRecorded.current) {
      pushUndoSnapshot();
      transactionRecorded.current = true;
    }
  }, [pushUndoSnapshot]);

  const endTransaction = useCallback(() => {
    transactionActive.current = false;
    transactionRecorded.current = false;
  }, []);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    isApplyingHistory.current = true;
    endTransaction();
    redoStack.current.push(getSnapshot());
    applyState(undoStack.current.pop());
    isApplyingHistory.current = false;
    updateStackStatus();
  }, [getSnapshot, applyState, endTransaction, updateStackStatus]);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    isApplyingHistory.current = true;
    endTransaction();
    undoStack.current.push(getSnapshot());
    applyState(redoStack.current.pop());
    isApplyingHistory.current = false;
    updateStackStatus();
  }, [getSnapshot, applyState, endTransaction, updateStackStatus]);

  const clearHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    endTransaction();
    updateStackStatus();
  }, [endTransaction, updateStackStatus]);

  const seedBaseline = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    updateStackStatus();
  }, [updateStackStatus]);

  return {
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
    beginTransaction,
    endTransaction,
    clearHistory,
    seedBaseline
  };
}
