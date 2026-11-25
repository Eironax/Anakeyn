import React, { useState, useEffect, useRef } from 'react';
import {
  Circle,
  Square,
  Save,
  Check,
  ChevronDown,
  Layers,
  ArrowDown,
  ArrowUp,
  Clock,
  Trash2,
  Plus,
  Info,
  FileText,
  ListOrdered,
  Zap,
  Copy,
  X,
  Type,
} from 'lucide-react';
import type { KeyMatrixItem } from '../../core/keys/layout';
import { getKeyLabel, BROWSER_CODE_TO_HID } from '../../core/keys/keycodes';
import {
  macroController,
  type MacroAction,
  MACRO_MODES,
  sanitizeMacroActions,
} from '../../core/macro/macroController';
import { keyboardHID } from '../../core/hid/connection';
import { KeyboardCanvas } from '../keyboard/KeyboardCanvas';

interface MacroViewProps {
  keymapRows: KeyMatrixItem[][] | null;
  isLoadingKeymap?: boolean;
  selectedLayer: number;
  onSelectLayer: (layer: number) => void;
  onRemapKey?: (layer: number, row: number, col: number, keycode: number) => Promise<boolean>;
}

interface CharHidDef {
  code: number;
  shift: boolean;
}

const CHAR_TO_HID_MAP: Record<string, CharHidDef> = {
  // Lowercase
  a: { code: 0x04, shift: false }, b: { code: 0x05, shift: false },
  c: { code: 0x06, shift: false }, d: { code: 0x07, shift: false },
  e: { code: 0x08, shift: false }, f: { code: 0x09, shift: false },
  g: { code: 0x0A, shift: false }, h: { code: 0x0B, shift: false },
  i: { code: 0x0C, shift: false }, j: { code: 0x0D, shift: false },
  k: { code: 0x0E, shift: false }, l: { code: 0x0F, shift: false },
  m: { code: 0x10, shift: false }, n: { code: 0x11, shift: false },
  o: { code: 0x12, shift: false }, p: { code: 0x13, shift: false },
  q: { code: 0x14, shift: false }, r: { code: 0x15, shift: false },
  s: { code: 0x16, shift: false }, t: { code: 0x17, shift: false },
  u: { code: 0x18, shift: false }, v: { code: 0x19, shift: false },
  w: { code: 0x1A, shift: false }, x: { code: 0x1B, shift: false },
  y: { code: 0x1C, shift: false }, z: { code: 0x1D, shift: false },

  // Uppercase
  A: { code: 0x04, shift: true }, B: { code: 0x05, shift: true },
  C: { code: 0x06, shift: true }, D: { code: 0x07, shift: true },
  E: { code: 0x08, shift: true }, F: { code: 0x09, shift: true },
  G: { code: 0x0A, shift: true }, H: { code: 0x0B, shift: true },
  I: { code: 0x0C, shift: true }, J: { code: 0x0D, shift: true },
  K: { code: 0x0E, shift: true }, L: { code: 0x0F, shift: true },
  M: { code: 0x10, shift: true }, N: { code: 0x11, shift: true },
  O: { code: 0x12, shift: true }, P: { code: 0x13, shift: true },
  Q: { code: 0x14, shift: true }, R: { code: 0x15, shift: true },
  S: { code: 0x16, shift: true }, T: { code: 0x17, shift: true },
  U: { code: 0x18, shift: true }, V: { code: 0x19, shift: true },
  W: { code: 0x1A, shift: true }, X: { code: 0x1B, shift: true },
  Y: { code: 0x1C, shift: true }, Z: { code: 0x1D, shift: true },

  // Numbers
  '1': { code: 0x1E, shift: false }, '2': { code: 0x1F, shift: false },
  '3': { code: 0x20, shift: false }, '4': { code: 0x21, shift: false },
  '5': { code: 0x22, shift: false }, '6': { code: 0x23, shift: false },
  '7': { code: 0x24, shift: false }, '8': { code: 0x25, shift: false },
  '9': { code: 0x26, shift: false }, '0': { code: 0x27, shift: false },

  // Shifted Symbols
  '!': { code: 0x1E, shift: true }, '@': { code: 0x1F, shift: true },
  '#': { code: 0x20, shift: true }, '$': { code: 0x21, shift: true },
  '%': { code: 0x22, shift: true }, '^': { code: 0x23, shift: true },
  '&': { code: 0x24, shift: true }, '*': { code: 0x25, shift: true },
  '(': { code: 0x26, shift: true }, ')': { code: 0x27, shift: true },

  // Whitespace & Controls
  ' ': { code: 0x2C, shift: false },
  '\n': { code: 0x28, shift: false },
  '\t': { code: 0x2B, shift: false },

  // Punctuation
  '-': { code: 0x2D, shift: false }, '_': { code: 0x2D, shift: true },
  '=': { code: 0x2E, shift: false }, '+': { code: 0x2E, shift: true },
  '[': { code: 0x2F, shift: false }, '{': { code: 0x2F, shift: true },
  ']': { code: 0x30, shift: false }, '}': { code: 0x30, shift: true },
  '\\': { code: 0x31, shift: false }, '|': { code: 0x31, shift: true },
  ';': { code: 0x33, shift: false }, ':': { code: 0x33, shift: true },
  "'": { code: 0x34, shift: false }, '"': { code: 0x34, shift: true },
  '`': { code: 0x35, shift: false }, '~': { code: 0x35, shift: true },
  ',': { code: 0x36, shift: false }, '<': { code: 0x36, shift: true },
  '.': { code: 0x37, shift: false }, '>': { code: 0x37, shift: true },
  '/': { code: 0x38, shift: false }, '?': { code: 0x38, shift: true },
};

function textToMacroActions(
  text: string,
  intervalMs: number = 10,
): MacroAction[] {
  // Safe lower limit: 10ms ensures OS and USB buffers do not drop keys or produce gibberish
  const safeMs = Math.max(10, Math.min(32767, intervalMs || 10));
  const actions: MacroAction[] = [];
  const SHIFT_CODE = 0xE1; // Left Shift

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const mapping = CHAR_TO_HID_MAP[char];
    if (!mapping) continue;

    if (mapping.shift) {
      actions.push({ status: 1, delay: safeMs, keyCode: SHIFT_CODE });
      actions.push({ status: 1, delay: safeMs, keyCode: mapping.code });
      actions.push({ status: 0, delay: safeMs, keyCode: mapping.code });
      actions.push({ status: 0, delay: safeMs, keyCode: SHIFT_CODE });
    } else {
      actions.push({ status: 1, delay: safeMs, keyCode: mapping.code });
      actions.push({ status: 0, delay: safeMs, keyCode: mapping.code });
    }
  }

  return actions;
}

function reconstructTextFromActions(actions: MacroAction[]): string {
  let text = '';
  let shiftHeld = false;

  const reverseMap: Record<string, string> = {};
  for (const [char, def] of Object.entries(CHAR_TO_HID_MAP)) {
    reverseMap[`${def.code}-${def.shift}`] = char;
  }

  for (const a of actions) {
    if (a.keyCode === 0xE1 || a.keyCode === 0xE5) {
      shiftHeld = a.status === 1;
      continue;
    }

    if (a.status === 1) {
      const char = reverseMap[`${a.keyCode}-${shiftHeld}`];
      if (char !== undefined) {
        text += char;
      } else if (a.keyCode === 0x2A) {
        text = text.slice(0, -1);
      } else if (a.keyCode === 0x28) {
        text += '\n';
      } else {
        const label = getKeyLabel(a.keyCode);
        text += `[${label}]`;
      }
    }
  }

  return text;
}

export const MacroView: React.FC<MacroViewProps> = ({
  keymapRows,
  isLoadingKeymap = false,
  selectedLayer,
  onSelectLayer,
  onRemapKey,
}) => {
  // Selected Macro Slot (0 to 15)
  const [selectedMacroId, setSelectedMacroId] = useState<number>(0);

  // Key selected on Keyboard Canvas for binding
  const [selectedKey, setSelectedKey] = useState<KeyMatrixItem | null>(null);

  // Mode settings for currently selected macro
  const [macroMode, setMacroMode] = useState<number>(0);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [recordedActions, setRecordedActions] = useState<MacroAction[]>([]);

  // Preview Display Mode: 'steps' (individual rows) or 'text' (compact full text)
  const [previewViewMode, setPreviewViewMode] = useState<'steps' | 'text'>('steps');

  // Default delay toggle & value
  const [useDefaultDelay, setUseDefaultDelay] = useState<boolean>(false);
  const [defaultDelayMs, setDefaultDelayMs] = useState<number>(10);

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [bindSuccess, setBindSuccess] = useState<boolean>(false);
  const [batchSuccess, setBatchSuccess] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [unbindToast, setUnbindToast] = useState<string | null>(null);

  // Text-to-Macro Modal State
  const [isTextModalOpen, setIsTextModalOpen] = useState<boolean>(false);
  const [textToConvert, setTextToConvert] = useState<string>('');
  const [textStepMs, setTextStepMs] = useState<number>(10);
  const [batchIntervalMs, setBatchIntervalMs] = useState<number>(10);

  // Overview status for all 16 slots (has data or empty)
  const [macroSlotValidMap, setMacroSlotValidMap] = useState<Record<number, boolean>>({});

  // Refs for recording time calculations & auto-scroll
  const lastEventTimeRef = useRef<number | null>(null);
  const recordedActionsRef = useRef<MacroAction[]>([]);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const currentlyHeldKeysRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    recordedActionsRef.current = recordedActions;
  }, [recordedActions]);

  // Auto-scroll to bottom of actions list when new actions are added
  useEffect(() => {
    if (previewViewMode === 'steps' && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [recordedActions.length, previewViewMode]);

  // Load Macro Space and scan slot states on mount
  useEffect(() => {
    if (!keyboardHID.isConnected()) return;

    macroController.getMacroSpaceInfo();

    const checkSlots = async () => {
      const validMap: Record<number, boolean> = {};
      for (let i = 0; i < 16; i++) {
        try {
          const modeInfo = await macroController.getMacroMode(i);
          validMap[i] = modeInfo.valid && modeInfo.actNum > 0;
        } catch {
          validMap[i] = false;
        }
      }
      setMacroSlotValidMap(validMap);
    };

    checkSlots();
  }, []);

  // Fetch full macro data whenever selected slot changes
  useEffect(() => {
    let isCancelled = false;

    const loadSlot = async () => {
      if (keyboardHID.isConnected()) {
        try {
          const res = await macroController.readFullMacro(selectedMacroId);
          if (!isCancelled) {
            setMacroMode(res.config.mode ?? 0);
            setRepeatCount(Math.max(1, res.config.repNum || 1));
            setRecordedActions(res.actions);
            return;
          }
        } catch (err) {
          console.warn('Failed to read macro from hardware:', err);
        }
      }

      try {
        const saved = localStorage.getItem(`anakeyn_macro_${selectedMacroId}`);
        if (saved && !isCancelled) {
          const parsed = JSON.parse(saved);
          setMacroMode(parsed.mode ?? 0);
          setRepeatCount(parsed.repeatCount ?? 1);
          setRecordedActions(parsed.actions ?? []);
        } else if (!isCancelled) {
          setRecordedActions([]);
        }
      } catch {}
    };

    loadSlot();

    return () => {
      isCancelled = true;
    };
  }, [selectedMacroId]);

  // Keystroke Capture during Recording
  useEffect(() => {
    if (!isRecording) {
      lastEventTimeRef.current = null;
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') return;
      if (e.repeat) return; // Prevent OS key-repeat from spamming unreleased keypresses!

      e.preventDefault();
      e.stopPropagation();

      const hidCode = BROWSER_CODE_TO_HID[e.code] || 0x04;
      currentlyHeldKeysRef.current.add(hidCode);

      const now = performance.now();
      const delay = useDefaultDelay
        ? Math.max(1, defaultDelayMs)
        : lastEventTimeRef.current === null
          ? 1
          : Math.min(32767, Math.max(1, Math.round(now - lastEventTimeRef.current)));
      lastEventTimeRef.current = now;

      const newAction: MacroAction = {
        status: 1, // Press
        delay,
        keyCode: hidCode,
      };

      setRecordedActions((prev) => [...prev, newAction]);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'F12') return;

      e.preventDefault();
      e.stopPropagation();

      const hidCode = BROWSER_CODE_TO_HID[e.code] || 0x04;
      currentlyHeldKeysRef.current.delete(hidCode);

      const now = performance.now();
      const delay = useDefaultDelay
        ? Math.max(1, defaultDelayMs)
        : lastEventTimeRef.current === null
          ? 1
          : Math.min(32767, Math.max(1, Math.round(now - lastEventTimeRef.current)));
      lastEventTimeRef.current = now;

      const newAction: MacroAction = {
        status: 0, // Release
        delay,
        keyCode: hidCode,
      };

      setRecordedActions((prev) => [...prev, newAction]);
    };

    const handleBlur = () => {
      if (currentlyHeldKeysRef.current.size > 0) {
        const extraReleases: MacroAction[] = [];
        let rDelay = 2;
        currentlyHeldKeysRef.current.forEach((kCode) => {
          extraReleases.push({ status: 0, delay: rDelay++, keyCode: kCode });
        });
        currentlyHeldKeysRef.current.clear();
        setRecordedActions((prev) => [...prev, ...extraReleases]);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isRecording, useDefaultDelay, defaultDelayMs]);

  // Toggle Recording On/Off
  const handleToggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      lastEventTimeRef.current = null;
      // Auto-release any keys that were held down when recording stopped
      if (currentlyHeldKeysRef.current.size > 0) {
        const extraReleases: MacroAction[] = [];
        let rDelay = 2;
        currentlyHeldKeysRef.current.forEach((kCode) => {
          extraReleases.push({
            status: 0,
            delay: rDelay++,
            keyCode: kCode,
          });
        });
        currentlyHeldKeysRef.current.clear();
        setRecordedActions((prev) => [...prev, ...extraReleases]);
      }
    } else {
      currentlyHeldKeysRef.current.clear();
      setIsRecording(true);
      lastEventTimeRef.current = null;
    }
  };

  // Clear Recorded Keystrokes
  const handleClearData = async () => {
    setRecordedActions([]);
    try {
      localStorage.removeItem(`anakeyn_macro_${selectedMacroId}`);
    } catch {}

    if (keyboardHID.isConnected()) {
      await macroController.clearMacro(selectedMacroId);
      setMacroSlotValidMap((prev) => ({ ...prev, [selectedMacroId]: false }));
    }
  };

  // Batch set all stroke delay intervals to equal ms (e.g. 10ms, 10ms, 10ms...)
  const handleBatchIntervals = (ms: number = 10) => {
    const safeMs = Math.max(10, Math.min(32767, ms || 10));
    setRecordedActions((prev) =>
      prev.map((a) => ({
        ...a,
        delay: safeMs,
      })),
    );
    setBatchSuccess(true);
    setTimeout(() => setBatchSuccess(false), 2000);
  };

  // Convert Text to Macro and Load
  const handleConvertTextSubmit = () => {
    if (!textToConvert.trim()) {
      setIsTextModalOpen(false);
      return;
    }

    const generated = textToMacroActions(textToConvert, textStepMs);
    setRecordedActions(generated);
    setIsTextModalOpen(false);
    setTextToConvert('');
  };

  // Save Macro to Hardware
  const handleSaveMacro = async () => {
    setIsSaving(true);
    try {
      // Sanitize before saving to guarantee zero stuck keys and proper non-zero delays
      const safeActions = sanitizeMacroActions(recordedActions);
      setRecordedActions(safeActions);

      try {
        localStorage.setItem(
          `anakeyn_macro_${selectedMacroId}`,
          JSON.stringify({
            mode: macroMode,
            repeatCount,
            actions: safeActions,
          }),
        );
      } catch {}

      if (keyboardHID.isConnected()) {
        await macroController.writeFullMacro(
          selectedMacroId,
          safeActions,
          macroMode,
          repeatCount,
        );
        setMacroSlotValidMap((prev) => ({
          ...prev,
          [selectedMacroId]: safeActions.length > 0,
        }));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  // Bind Macro keycode (0xF500 + macroId) to selected keyboard key
  const handleBindMacroToKey = async () => {
    if (!selectedKey || !onRemapKey) return;
    const macroKeyCode = 0xF500 + selectedMacroId;
    const ok = await onRemapKey(
      selectedLayer,
      selectedKey.row,
      selectedKey.col,
      macroKeyCode,
    );
    if (ok) {
      setBindSuccess(true);
      setTimeout(() => setBindSuccess(false), 2000);
    }
  };

  // Right-Click to Unbind Macro from a key (reset to pass-through 1)
  const handleKeyContextMenu = async (key: KeyMatrixItem) => {
    // Only unbind if key is currently mapped to a Macro (0xF500 - 0xF50F)
    if (key.keycode >= 0xF500 && key.keycode <= 0xF50F) {
      if (onRemapKey) {
        const ok = await onRemapKey(selectedLayer, key.row, key.col, 1);
        if (ok) {
          const mIdx = key.keycode - 0xF500;
          setUnbindToast(`Unbound M${mIdx} from ${key.label} (Set to Pass-Through)`);
          setTimeout(() => setUnbindToast(null), 2500);
        }
      }
    }
  };

  // Modify individual action delay inline
  const handleUpdateDelay = (index: number, newDelay: number) => {
    const clamped = Math.max(0, Math.min(32767, Math.round(newDelay)));
    setRecordedActions((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], delay: clamped };
      }
      return next;
    });
  };

  // Delete individual action
  const handleDeleteAction = (index: number) => {
    setRecordedActions((prev) => prev.filter((_, i) => i !== index));
  };

  // Manually add key action
  const handleAddKeyAction = (status: 1 | 0) => {
    setRecordedActions((prev) => [
      ...prev,
      {
        status,
        delay: defaultDelayMs || 10,
        keyCode: 0x04,
      },
    ]);
  };

  // Badges to highlight keys that have macros bound to them
  const macroKeyBadges = React.useMemo(() => {
    if (!keymapRows) return {};
    const badges: Record<string, import('../keyboard/KeyboardCanvas').KeyBadgeOverlay> = {};
    keymapRows.forEach((row) => {
      row.forEach((k) => {
        if (k.keycode >= 0xF500 && k.keycode <= 0xF50F) {
          const mIdx = k.keycode - 0xF500;
          badges[`${k.row}-${k.col}`] = {
            top: `M${mIdx}`,
            topColor: '#38bdf8',
            bg: 'rgba(56, 189, 248, 0.12)',
            border: 'rgba(56, 189, 248, 0.45)',
          };
        }
      });
    });
    return badges;
  }, [keymapRows]);

  const reconstructedText = React.useMemo(() => {
    return reconstructTextFromActions(recordedActions);
  }, [recordedActions]);

  const totalRuntimeMs = React.useMemo(() => {
    return recordedActions.reduce((acc, a) => acc + (a.delay || 0), 0);
  }, [recordedActions]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
        maxWidth: 1060,
        margin: '0 auto',
      }}
    >
      {/* 1. TOP KEYBOARD CANVAS WITH LAYER CONTROLS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 16,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Layer Selector Column matching xsyd.top */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginTop: 20,
            zIndex: 2,
          }}
        >
          {['Main Layer', 'Fn1 Layer', 'Fn2 Layer', 'Fn3 Layer'].map((label, idx) => {
            const isSelected = selectedLayer === idx;
            return (
              <button
                key={label}
                onClick={() => onSelectLayer(idx)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 18,
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isSelected
                    ? '1.5px solid var(--accent-cyan)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3))'
                    : 'rgba(15, 18, 26, 0.85)',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  boxShadow: isSelected ? '0 0 12px rgba(6, 182, 212, 0.35)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Keyboard Visualizer */}
        <div style={{ flex: 1, maxWidth: 940 }}>
          <KeyboardCanvas
            keymapRows={keymapRows}
            selectedKey={selectedKey}
            onSelectKey={setSelectedKey}
            onKeyContextMenu={handleKeyContextMenu}
            isLoading={isLoadingKeymap}
            badges={macroKeyBadges}
          />
        </div>
      </div>

      {/* 2. Bind Instruction & Quick Action Pill */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: -10,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#94a3b8',
            fontSize: '0.84rem',
            fontStyle: 'italic',
          }}
        >
          <ChevronDown size={14} color="var(--accent-cyan)" />
          <span>
            Left click to bind M{selectedMacroId} • Right click on an M# key to unbind (pass-through)
          </span>
        </div>

        {/* Unbind Toast Banner */}
        {unbindToast && (
          <div
            style={{
              padding: '4px 14px',
              borderRadius: 16,
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            {unbindToast}
          </div>
        )}

        {/* Quick Bind Button when a key is selected */}
        {selectedKey && (
          <button
            onClick={handleBindMacroToKey}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              background: bindSuccess
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(59, 130, 246, 0.25))',
              border: '1.5px solid var(--accent-cyan)',
              color: '#fff',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {bindSuccess ? <Check size={14} /> : <Layers size={14} />}
            {bindSuccess
              ? `Bound M${selectedMacroId} to ${selectedKey.label}!`
              : `Bind M${selectedMacroId} to ${selectedKey.label} (${selectedKey.row}, ${selectedKey.col})`}
          </button>
        )}
      </div>

      {/* 3. MAIN 3-COLUMN MACRO STUDIO PANEL */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'grid',
          gridTemplateColumns: '180px 320px 1fr',
          gap: 24,
          background: 'rgba(13, 17, 26, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          minHeight: 440,
        }}
      >
        {/* COLUMN 1: MACRO LIST (M0 - M15) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>
              Macro List
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              16 Slots
            </span>
          </div>

          {/* 4x4 Grid of Macro Slot Buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
            }}
          >
            {Array.from({ length: 16 }, (_, i) => {
              const isSelected = selectedMacroId === i;
              const hasData = macroSlotValidMap[i];

              return (
                <button
                  key={i}
                  onClick={() => setSelectedMacroId(i)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected
                      ? '1.5px solid var(--accent-cyan)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.25))'
                      : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? '#fff' : '#cbd5e1',
                    boxShadow: isSelected ? '0 0 12px rgba(6, 182, 212, 0.35)' : 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                  }}
                >
                  <span>M{i}</span>
                  {hasData && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'var(--accent-cyan)',
                        boxShadow: '0 0 4px var(--accent-cyan)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: MACRO SETTING */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '0 20px',
          }}
        >
          {/* Macro Key Select Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#e2e8f0' }}>
              Macro Setting
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.80rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                Macro Key Select:
              </span>
              <div
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid var(--accent-cyan)',
                  color: '#fff',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Macro{selectedMacroId}
              </div>
            </div>
          </div>

          {/* Macro Mode Select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#e2e8f0' }}>
              Macro Mode Select
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {MACRO_MODES.map((m) => {
                const isChecked = macroMode === m.mode;
                return (
                  <label
                    key={m.mode}
                    onClick={() => setMacroMode(m.mode)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: '0.78rem',
                      color: isChecked ? '#fff' : '#94a3b8',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="radio"
                      name="macroMode"
                      checked={isChecked}
                      onChange={() => setMacroMode(m.mode)}
                      style={{ marginTop: 2, accentColor: 'var(--accent-cyan)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>{m.label.split('repeat')[0]}repeat</span>
                        {m.needsRepeatInput && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: 'rgba(0, 0, 0, 0.4)',
                              borderRadius: 4,
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              padding: '1px 4px',
                            }}
                          >
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={repeatCount}
                              onChange={(e) =>
                                setRepeatCount(Math.max(1, parseInt(e.target.value) || 1))
                              }
                              style={{
                                width: 34,
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                outline: 'none',
                              }}
                            />
                          </div>
                        )}
                        <span>{m.label.split('repeat')[1] || ''}</span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                        {m.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 3: MACRO RECORDING */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Top Bar: Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>
                Macro Recording
              </span>
              <span
                title="Records key presses, releases, and exact millisecond delays"
                style={{ cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}
              >
                <Info size={14} />
              </span>
            </div>

            {/* View Mode Switcher: Steps (Detail) vs Text Output */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: 8,
                padding: 2,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                onClick={() => setPreviewViewMode('steps')}
                title="Detailed Action Timeline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: previewViewMode === 'steps' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                  color: previewViewMode === 'steps' ? 'var(--accent-cyan)' : 'var(--text-dim)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ListOrdered size={12} /> Steps ({recordedActions.length})
              </button>
              <button
                onClick={() => setPreviewViewMode('text')}
                title="Compact Output String Preview"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: previewViewMode === 'text' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                  color: previewViewMode === 'text' ? 'var(--accent-cyan)' : 'var(--text-dim)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Type size={12} /> Text Preview
              </button>
            </div>
          </div>

          {/* Quick Tools Row: 1ms Fast Intervals + Text-to-Macro Converter + Default Delay */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Batch Equal Intervals Control */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(56, 189, 248, 0.08)',
                  borderRadius: 6,
                  border: `1px solid ${batchSuccess ? '#10b981' : 'rgba(56, 189, 248, 0.25)'}`,
                  padding: '2px 4px',
                  gap: 4,
                }}
              >
                <button
                  onClick={() => handleBatchIntervals(batchIntervalMs)}
                  title="Sets equal delay for all strokes (safe minimum 10ms to prevent dropped keys and gibberish)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: 'none',
                    background: batchSuccess ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                    color: batchSuccess ? '#34d399' : '#38bdf8',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Zap size={11} /> {batchSuccess ? 'Set!' : 'Equal Intervals'}
                </button>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: 4,
                    padding: '1px 4px',
                  }}
                >
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={batchIntervalMs}
                    onChange={(e) =>
                      setBatchIntervalMs(Math.max(10, parseInt(e.target.value) || 10))
                    }
                    title="Interval in milliseconds (safe minimum 10ms)"
                    style={{
                      width: 28,
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>ms</span>
                </div>
              </div>

              {/* Text to Macro Converter Button */}
              <button
                onClick={() => setIsTextModalOpen(true)}
                title="Convert pasted text or strings directly into macro keystrokes"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#c084fc',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <FileText size={11} /> Text to Macro
              </button>
            </div>

            {/* Default Delay Switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>
                Default Delay
              </span>
              <div
                onClick={() => setUseDefaultDelay(!useDefaultDelay)}
                style={{
                  width: 30,
                  height: 16,
                  borderRadius: 10,
                  background: useDefaultDelay ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: useDefaultDelay ? 16 : 2,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>
              {useDefaultDelay && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    padding: '1px 5px',
                  }}
                >
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={defaultDelayMs}
                    onChange={(e) =>
                      setDefaultDelayMs(Math.max(1, parseInt(e.target.value) || 10))
                    }
                    style={{
                      width: 32,
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row: Start Recording & Clear */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={handleClearData}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.10)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clear Data
            </button>

            <button
              onClick={handleToggleRecording}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                background: isRecording
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, var(--accent-cyan), #3b82f6)',
                border: 'none',
                color: '#fff',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: isRecording
                  ? '0 0 14px rgba(239, 68, 68, 0.5)'
                  : '0 0 10px rgba(6, 182, 212, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              {isRecording ? <Square size={12} fill="#fff" /> : <Circle size={10} fill="#fff" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>

          {/* Recording Flash Status Banner */}
          {isRecording && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.18)',
                border: '1px dashed #ef4444',
                color: '#fca5a5',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <Circle size={8} fill="#ef4444" color="#ef4444" />
              Recording keystrokes live... Press keys on your keyboard!
            </div>
          )}

          {/* MAIN CONTENT AREA: Text Output View OR Detailed Steps List */}
          {previewViewMode === 'text' ? (
            /* COMPACT TEXT OUTPUT PREVIEW */
            <div
              style={{
                flex: 1,
                minHeight: 250,
                maxHeight: 270,
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>
                  Reconstructed Keystroke Output:
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(reconstructedText);
                    setCopiedSuccess(true);
                    setTimeout(() => setCopiedSuccess(false), 1500);
                  }}
                  disabled={!reconstructedText}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'transparent',
                    border: 'none',
                    color: copiedSuccess ? '#34d399' : '#38bdf8',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copiedSuccess ? <Check size={12} /> : <Copy size={12} />}
                  {copiedSuccess ? 'Copied!' : 'Copy Text'}
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  background: 'rgba(10, 14, 22, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.86rem',
                  color: reconstructedText ? '#f1f5f9' : 'var(--text-dim)',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontStyle: reconstructedText ? 'normal' : 'italic',
                }}
              >
                {reconstructedText || 'No text recorded yet. Type or convert text to populate!'}
              </div>

              {/* Statistics Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                <span>Chars: <strong style={{ color: '#fff' }}>{reconstructedText.length}</strong></span>
                <span>Actions: <strong style={{ color: 'var(--accent-cyan)' }}>{recordedActions.length}</strong></span>
                <span>Est. Runtime: <strong style={{ color: '#c084fc' }}>{totalRuntimeMs} ms</strong></span>
              </div>
            </div>
          ) : (
            /* DETAILED ACTION STEPS LIST */
            <div
              style={{
                flex: 1,
                minHeight: 250,
                maxHeight: 270,
                overflowY: 'auto',
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              {recordedActions.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-dim)',
                    fontSize: '0.80rem',
                    fontStyle: 'italic',
                    padding: '40px 0',
                  }}
                >
                  Click &quot;Start Recording&quot; or &quot;Text to Macro&quot; to populate strokes!
                </div>
              ) : (
                recordedActions.map((action, idx) => {
                  const isDown = action.status === 1;
                  const label = getKeyLabel(action.keyCode);

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.74rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 22,
                            color: 'var(--text-dim)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.68rem',
                          }}
                        >
                          #{idx + 1}
                        </span>

                        {/* Direction Tag */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            background: isDown
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                            color: isDown ? '#34d399' : '#fbbf24',
                            border: `1px solid ${isDown ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          }}
                        >
                          {isDown ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
                          {isDown ? 'Press' : 'Release'}
                        </div>

                        {/* Key Code Badge */}
                        <div
                          style={{
                            padding: '1px 8px',
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {label}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Delay Editor */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'rgba(0, 0, 0, 0.3)',
                            padding: '1px 6px',
                            borderRadius: 4,
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <Clock size={10} color="var(--text-dim)" />
                          <input
                            type="number"
                            min="0"
                            max="32767"
                            value={action.delay}
                            onChange={(e) =>
                              handleUpdateDelay(idx, parseInt(e.target.value) || 0)
                            }
                            style={{
                              width: 38,
                              background: 'transparent',
                              border: 'none',
                              color: '#e2e8f0',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              textAlign: 'right',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>ms</span>
                        </div>

                        {/* Delete action */}
                        <button
                          onClick={() => handleDeleteAction(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: 2,
                            display: 'flex',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={listEndRef} />
            </div>
          )}

          {/* Action Footer: Add Key / Save Macro */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => handleAddKeyAction(1)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={12} /> Press
              </button>
              <button
                onClick={() => handleAddKeyAction(0)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={12} /> Release
              </button>
            </div>

            {/* Save Macro Button */}
            <button
              onClick={handleSaveMacro}
              disabled={isSaving}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: saveSuccess
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, var(--accent-cyan), #3b82f6)',
                border: 'none',
                color: '#fff',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              {saveSuccess ? <Check size={14} /> : <Save size={14} />}
              {saveSuccess
                ? 'Saved to Keyboard!'
                : isSaving
                  ? 'Writing Macro...'
                  : `Save Macro to M${selectedMacroId}`}
            </button>
          </div>
        </div>
      </div>

      {/* 4. POPUP MODAL: TEXT TO MACRO CONVERTER */}
      {isTextModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setIsTextModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#0d111a',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                  Convert Text to Macro
                </h3>
              </div>
              <button
                onClick={() => setIsTextModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.80rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              Type or paste text below. It will automatically be transformed into precise hardware keypress and release sequences with shift modifiers.
            </p>

            {/* Input Textarea */}
            <textarea
              rows={4}
              value={textToConvert}
              onChange={(e) => setTextToConvert(e.target.value)}
              placeholder="e.g. glhf or /gamemode creative or any password / sentence..."
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#fff',
                fontSize: '0.86rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                resize: 'vertical',
              }}
            />

            {/* Single Simplified Timing Knob: ms difference between each keystroke (press/lift) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ fontSize: '0.80rem', color: '#f1f5f9', fontWeight: 700 }}>
                  ms difference between each keystroke (press/lift)
                </label>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>
                  Sets equal interval between all strokes (safe minimum 10ms prevents dropped keys &amp; gibberish)
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: 6,
                  border: '1px solid var(--accent-cyan)',
                  padding: '4px 10px',
                }}
              >
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={textStepMs}
                  onChange={(e) => setTextStepMs(Math.max(10, parseInt(e.target.value) || 10))}
                  style={{
                    width: 44,
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>ms</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleConvertTextSubmit}
              disabled={!textToConvert.trim()}
              style={{
                marginTop: 6,
                padding: '10px 16px',
                borderRadius: 8,
                background: textToConvert.trim()
                  ? 'linear-gradient(135deg, var(--accent-cyan), #3b82f6)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: textToConvert.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: textToConvert.trim() ? '0 0 16px rgba(6, 182, 212, 0.35)' : 'none',
              }}
            >
              <Check size={16} /> Convert &amp; Load into Macro
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
