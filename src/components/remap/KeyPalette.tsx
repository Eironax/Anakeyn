import React, { useState } from 'react';
import {
  Keyboard,
  Sparkles,
  Volume2,
  Sun,
  Sliders,
  Mouse as MouseIcon,
  Layers,
  Check,
  Plus,
  Play,
} from 'lucide-react';
import type { KeyMatrixItem } from '../../core/keys/layout';
import { getKeyLabel } from '../../core/keys/keycodes';

interface KeyPaletteProps {
  selectedKey: KeyMatrixItem | null;
  onRemapKey: (keycode: number) => Promise<void>;
  isRemapping?: boolean;
}

export type PaletteCategory =
  | 'basic'
  | 'special'
  | 'media'
  | 'lighting'
  | 'control'
  | 'mouse'
  | 'macro'
  | 'combine';

interface PaletteItem {
  code: number;
  label: string;
  sub?: string;
  desc?: string;
}

interface StandardKeyDef {
  code: number;
  label: string;
  sub?: string;
  w?: number; // width in u, defaults to 1
  type?: 'key' | 'spacer';
  desc?: string;
}

const CATEGORIES: { id: PaletteCategory; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'basic', label: 'Basic', icon: Keyboard },
  { id: 'special', label: 'Special', icon: Sparkles },
  { id: 'media', label: 'Media', icon: Volume2 },
  { id: 'lighting', label: 'Lighting', icon: Sun },
  { id: 'control', label: 'Control', icon: Sliders },
  { id: 'mouse', label: 'Mouse', icon: MouseIcon },
  { id: 'macro', label: 'Macro', icon: Play },
  { id: 'combine', label: 'Combine', icon: Layers },
];

// Standard 104-Key Full Keyboard Pattern (Matching Combine.png)
const STANDARD_LAYOUT_ROWS: StandardKeyDef[][] = [
  // Row 0: F-Row + Nav + Numpad Spacer
  [
    { code: 41, label: 'Esc', w: 1, desc: 'Escape' },
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 58, label: 'F1' },
    { code: 59, label: 'F2' },
    { code: 60, label: 'F3' },
    { code: 61, label: 'F4' },
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 62, label: 'F5' },
    { code: 63, label: 'F6' },
    { code: 64, label: 'F7' },
    { code: 65, label: 'F8' },
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 66, label: 'F9' },
    { code: 67, label: 'F10' },
    { code: 68, label: 'F11' },
    { code: 69, label: 'F12' },
    // Gap to Nav
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 70, label: 'PrtSc', desc: 'Print Screen' },
    { code: 71, label: 'ScrLk', desc: 'Scroll Lock' },
    { code: 72, label: 'Pause', desc: 'Pause / Break' },
    // Gap to Numpad
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 0, label: '', w: 4, type: 'spacer' },
  ],
  // Row 1: Numbers + Nav + Numpad
  [
    { code: 53, label: '`', sub: '~' },
    { code: 30, label: '1', sub: '!' },
    { code: 31, label: '2', sub: '@' },
    { code: 32, label: '3', sub: '#' },
    { code: 33, label: '4', sub: '$' },
    { code: 34, label: '5', sub: '%' },
    { code: 35, label: '6', sub: '^' },
    { code: 36, label: '7', sub: '&' },
    { code: 37, label: '8', sub: '*' },
    { code: 38, label: '9', sub: '(' },
    { code: 39, label: '0', sub: ')' },
    { code: 45, label: '-', sub: '_' },
    { code: 46, label: '=', sub: '+' },
    { code: 42, label: 'Backspace', w: 2, desc: 'Backspace' },
    // Gap to Nav
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 73, label: 'Ins', desc: 'Insert' },
    { code: 74, label: 'Home', desc: 'Home' },
    { code: 75, label: 'PgUp', desc: 'Page Up' },
    // Gap to Numpad
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 83, label: 'Num', desc: 'NumLock' },
    { code: 84, label: '/', desc: 'KP Divide' },
    { code: 85, label: '*', desc: 'KP Multiply' },
    { code: 86, label: '-', desc: 'KP Minus' },
  ],
  // Row 2: QWERTY + Nav + Numpad
  [
    { code: 43, label: 'Tab', w: 1.5, desc: 'Tab' },
    { code: 20, label: 'Q' },
    { code: 26, label: 'W' },
    { code: 8, label: 'E' },
    { code: 21, label: 'R' },
    { code: 23, label: 'T' },
    { code: 28, label: 'Y' },
    { code: 24, label: 'U' },
    { code: 12, label: 'I' },
    { code: 18, label: 'O' },
    { code: 19, label: 'P' },
    { code: 47, label: '[', sub: '{' },
    { code: 48, label: ']', sub: '}' },
    { code: 49, label: '\\', sub: '|', w: 1.5 },
    // Gap to Nav
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 76, label: 'Del', desc: 'Delete' },
    { code: 77, label: 'End', desc: 'End' },
    { code: 78, label: 'PgDn', desc: 'Page Down' },
    // Gap to Numpad
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 95, label: '7', desc: 'KP 7' },
    { code: 96, label: '8', desc: 'KP 8' },
    { code: 97, label: '9', desc: 'KP 9' },
    { code: 87, label: '+', desc: 'KP Plus' },
  ],
  // Row 3: ASDF + Nav Gap + Numpad
  [
    { code: 57, label: 'Caps', w: 1.75, desc: 'Caps Lock' },
    { code: 4, label: 'A' },
    { code: 22, label: 'S' },
    { code: 7, label: 'D' },
    { code: 9, label: 'F' },
    { code: 10, label: 'G' },
    { code: 11, label: 'H' },
    { code: 13, label: 'J' },
    { code: 14, label: 'K' },
    { code: 15, label: 'L' },
    { code: 51, label: ';', sub: ':' },
    { code: 52, label: "'", sub: '"' },
    { code: 40, label: 'Enter', w: 2.25, desc: 'Enter' },
    // Gap to Nav + Nav Empty
    { code: 0, label: '', w: 4, type: 'spacer' },
    // Numpad
    { code: 92, label: '4', desc: 'KP 4' },
    { code: 93, label: '5', desc: 'KP 5' },
    { code: 94, label: '6', desc: 'KP 6' },
    { code: 0, label: '', w: 1, type: 'spacer' },
  ],
  // Row 4: ZXCV + Arrows + Numpad
  [
    { code: 225, label: 'Shift', w: 2.25, desc: 'Left Shift' },
    { code: 29, label: 'Z' },
    { code: 27, label: 'X' },
    { code: 6, label: 'C' },
    { code: 25, label: 'V' },
    { code: 5, label: 'B' },
    { code: 17, label: 'N' },
    { code: 16, label: 'M' },
    { code: 54, label: ',', sub: '<' },
    { code: 55, label: '.', sub: '>' },
    { code: 56, label: '/', sub: '?' },
    { code: 229, label: 'Shift', w: 2.75, desc: 'Right Shift' },
    // Gap to Arrows
    { code: 0, label: '', w: 1.5, type: 'spacer' },
    { code: 82, label: '↑', desc: 'Up Arrow' },
    { code: 0, label: '', w: 1.5, type: 'spacer' },
    // Numpad
    { code: 89, label: '1', desc: 'KP 1' },
    { code: 90, label: '2', desc: 'KP 2' },
    { code: 91, label: '3', desc: 'KP 3' },
    { code: 88, label: 'Enter', desc: 'KP Enter' },
  ],
  // Row 5: Bottom Mods & Space + Arrows + Numpad
  [
    { code: 224, label: 'Ctrl', w: 1.25, desc: 'Left Control' },
    { code: 227, label: 'Win', w: 1.25, desc: 'Left Windows / GUI' },
    { code: 226, label: 'Alt', w: 1.25, desc: 'Left Alt' },
    { code: 44, label: 'Space', w: 6.25, desc: 'Spacebar' },
    { code: 230, label: 'Alt', w: 1.25, desc: 'Right Alt' },
    { code: 231, label: 'Win', w: 1.25, desc: 'Right Windows / GUI' },
    { code: 101, label: 'App', w: 1.25, desc: 'Menu / Context' },
    { code: 228, label: 'Ctrl', w: 1.25, desc: 'Right Control' },
    // Gap to Arrows
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 80, label: '←', desc: 'Left Arrow' },
    { code: 81, label: '↓', desc: 'Down Arrow' },
    { code: 79, label: '→', desc: 'Right Arrow' },
    // Gap to Numpad
    { code: 0, label: '', w: 0.5, type: 'spacer' },
    { code: 98, label: '0', w: 2, desc: 'KP 0' },
    { code: 99, label: '.', desc: 'KP Decimal' },
    { code: 0, label: '', w: 1, type: 'spacer' },
  ],
];

const CATEGORY_ITEMS: Record<Exclude<PaletteCategory, 'basic' | 'combine'>, PaletteItem[]> = {
  special: [
    { code: 1, label: '△', desc: 'Pass-through to base layer (穿透键)' },
    { code: 0, label: '· Empty', desc: 'Unassigned / Disabled Key (空键)' },
    { code: 0xF100, label: 'Fn0', desc: 'Switch to Main/Base Layer' },
    { code: 0xF101, label: 'Fn1', desc: 'Switch to FN1 Layer' },
    { code: 0xF102, label: 'Fn2', desc: 'Switch to FN2 Layer' },
    { code: 0xF103, label: 'Fn3', desc: 'Switch to FN3 Layer' },
  ],

  media: [
    { code: 0x20CD, label: '⏯ Play', desc: 'Play / Pause' },
    { code: 0x20E9, label: '🔊 Vol+', desc: 'Volume Increment' },
    { code: 0x20EA, label: '🔉 Vol-', desc: 'Volume Decrement' },
    { code: 0x20E2, label: '🔇 Mute', desc: 'Mute Audio' },
    { code: 0x20B5, label: '⏭ Next', desc: 'Scan Next Track' },
    { code: 0x20B6, label: '⏮ Prev', desc: 'Scan Previous Track' },
    { code: 0x20B7, label: '⏹ Stop', desc: 'Stop Playback' },
    { code: 0x2192, label: '🧮 Calc', desc: 'Open Calculator' },
    { code: 0x2194, label: '💻 PC', desc: 'Open This PC' },
    { code: 0x2223, label: '🌐 Browser', desc: 'Open Web Browser' },
    { code: 0x2183, label: '🎵 Music', desc: 'Open Media Player' },
    { code: 0x218A, label: '✉️ Mail', desc: 'Open Mail Client' },
    { code: 0x206F, label: '☀️ Bri +', desc: 'Screen Brightness Up' },
    { code: 0x2070, label: '🔅 Bri -', desc: 'Screen Brightness Down' },
    // System Shortcuts
    { code: 0x1329, label: 'Task Mgr', desc: 'Windows Task Manager (Ctrl+Shift+Esc)' },
    { code: 0x1807, label: 'Desktop', desc: 'Show Desktop (Win+D)' },
    { code: 0x1808, label: 'Explorer', desc: 'File Explorer (Win+E)' },
    { code: 0x1815, label: 'Run', desc: 'Run Command Window (Win+R)' },
    { code: 0x1152, label: 'Mac Console', desc: 'macOS Terminal / Console' },
  ],

  lighting: [
    { code: 0xF300, label: '💡 Light Mode', desc: 'Cycle RGB Animation Effect' },
    { code: 0xF301, label: '🎨 Color', desc: 'Cycle RGB Color Palette' },
    { code: 0xF302, label: '🔆 Bri +', desc: 'Backlight Brightness +' },
    { code: 0xF303, label: '🔅 Bri -', desc: 'Backlight Brightness -' },
    { code: 0xF304, label: '⚡ Speed +', desc: 'Backlight Animation Speed +' },
    { code: 0xF305, label: '⚡ Speed -', desc: 'Backlight Animation Speed -' },
    { code: 0xF306, label: '⏮ Prev Mode', desc: 'Previous Lighting Effect' },
    { code: 0xF307, label: '💡 Light On/Off', desc: 'Toggle Backlight On / Off' },
    { code: 0xF308, label: '↔️ Light Dir', desc: 'Lighting Flow Direction' },
    // Decorative Lighting D1
    { code: 0xF310, label: '✨ D1 Mode', desc: 'Decorative LED Effect Mode' },
    { code: 0xF311, label: '🎨 D1 Color', desc: 'Decorative LED Color' },
    { code: 0xF312, label: '🔆 D1 Bri +', desc: 'Decorative LED Brightness +' },
    { code: 0xF313, label: '🔅 D1 Bri -', desc: 'Decorative LED Brightness -' },
    { code: 0xF314, label: '⚡ D1 Spd +', desc: 'Decorative LED Speed +' },
    { code: 0xF315, label: '⚡ D1 Spd -', desc: 'Decorative LED Speed -' },
    { code: 0xF316, label: '⏮ D1 Prev', desc: 'Decorative LED Previous Mode' },
    { code: 0xF317, label: '✨ D1 On/Off', desc: 'Toggle Decorative LEDs' },
    { code: 0xF318, label: '↔️ D1 Dir', desc: 'Decorative LED Direction' },
  ],

  control: [
    { code: 0xF209, label: '🔒 Win Lock', desc: 'Lock / Unlock Windows Key' },
    { code: 0xF201, label: '⊞ Win Mode', desc: 'Switch to Windows Layout' },
    { code: 0xF202, label: ' Mac Mode', desc: 'Switch to macOS Layout' },
    { code: 0xF203, label: '⟲ Calibrate', desc: 'Calibrate Magnetic Switch Stroke' },
    { code: 0xF205, label: 'Prof 1', desc: 'Switch to Profile 1' },
    { code: 0xF206, label: 'Prof 2', desc: 'Switch to Profile 2' },
    { code: 0xF207, label: 'Prof 3', desc: 'Switch to Profile 3' },
    { code: 0xF208, label: 'Prof 4', desc: 'Switch to Profile 4' },
    { code: 0xF200, label: '⚠️ Reset', desc: 'Factory Reset (Hold to Trigger)' },
  ],

  mouse: [
    { code: 0x4100, label: '🖱️ Left Click', desc: 'Mouse Left Button' },
    { code: 0x4200, label: '🖱️ Right Click', desc: 'Mouse Right Button' },
    { code: 0x4300, label: '🖱️ Mid Click', desc: 'Mouse Middle Button' },
    { code: 0x4400, label: '🖱️ Forward', desc: 'Mouse Browser Forward' },
    { code: 0x4500, label: '🖱️ Back', desc: 'Mouse Browser Back' },
    { code: 0x4A01, label: '📜 Wheel ↑', desc: 'Scroll Wheel Forward' },
    { code: 0x4B01, label: '📜 Wheel ↓', desc: 'Scroll Wheel Backward' },
    { code: 0x4600, label: '← Cursor X', desc: 'Move Mouse Cursor Left' },
    { code: 0x4700, label: '→ Cursor X', desc: 'Move Mouse Cursor Right' },
    { code: 0x4800, label: '↑ Cursor Y', desc: 'Move Mouse Cursor Up' },
    { code: 0x4900, label: '↓ Cursor Y', desc: 'Move Mouse Cursor Down' },
    { code: 0x4000, label: 'M-Release', desc: 'Release All Mouse Buttons' },
  ],

  macro: Array.from({ length: 16 }, (_, i) => ({
    code: 0xF500 + i,
    label: `M${i}`,
    desc: `Trigger Hardware Macro M${i}`,
  })),
};

const KEY_U_BASE = 32; // Base unit width in px
const KEY_GAP = 2;     // Gap between keys in px

const getKeyFontSize = (label: string, w: number): string => {
  if (w <= 1) {
    if (label.length >= 6) return '0.50rem';
    if (label.length >= 5) return '0.53rem';
    if (label.length >= 4) return '0.58rem';
    if (label.length >= 3) return '0.64rem';
    return '0.74rem';
  }
  if (w <= 1.5) {
    if (label.length >= 5) return '0.58rem';
    return '0.66rem';
  }
  if (label.length >= 8) return '0.60rem';
  return '0.68rem';
};

export const KeyPalette: React.FC<KeyPaletteProps> = ({
  selectedKey,
  onRemapKey,
  isRemapping = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<PaletteCategory>('basic');
  const [hoveredInfo, setHoveredInfo] = useState<{ label: string; desc?: string; code: number } | null>(null);

  // Combine Tab state
  const [combineMods, setCombineMods] = useState<{
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    win: boolean;
  }>({
    ctrl: true,
    shift: false,
    alt: false,
    win: false,
  });
  const [selectedTriggerCode, setSelectedTriggerCode] = useState<number>(6); // Default 'C' (Ctrl+C)

  // Compound keycode calculation: 0x1000 | (modBits << 8) | triggerCode
  const modBits =
    (combineMods.ctrl ? 0x01 : 0) |
    (combineMods.shift ? 0x02 : 0) |
    (combineMods.alt ? 0x04 : 0) |
    (combineMods.win ? 0x08 : 0);

  const compoundKeycode =
    modBits > 0 ? (0x1000 | (modBits << 8) | (selectedTriggerCode & 0xff)) : selectedTriggerCode;

  const compoundLabel = getKeyLabel(compoundKeycode);

  const toggleMod = (mod: keyof typeof combineMods) => {
    setCombineMods((prev) => ({ ...prev, [mod]: !prev[mod] }));
  };

  // Render a standard 104-key pattern keyboard
  const renderStandardKeyboard = (onKeyClick: (code: number) => void, activeHighlightCode?: number) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: KEY_GAP,
          padding: '12px 14px',
          background: 'rgba(10, 13, 20, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 12,
          overflowX: 'auto',
          alignItems: 'center',
          userSelect: 'none',
        }}
      >
        {STANDARD_LAYOUT_ROWS.map((row, rIdx) => {
          const isFRow = rIdx === 0;
          const rowHeight = isFRow ? 26 : 33;

          return (
            <div
              key={rIdx}
              style={{
                display: 'flex',
                gap: KEY_GAP,
                alignItems: 'center',
                marginBottom: isFRow ? 4 : 0,
              }}
            >
              {row.map((k, kIdx) => {
                const widthMultiplier = k.w || 1;
                const keyWidth = Math.round(widthMultiplier * KEY_U_BASE + (widthMultiplier - 1) * KEY_GAP);

                if (k.type === 'spacer') {
                  return (
                    <div
                      key={kIdx}
                      style={{
                        width: keyWidth,
                        height: rowHeight,
                        flexShrink: 0,
                      }}
                    />
                  );
                }

                const isCurrent = activeHighlightCode !== undefined
                  ? activeHighlightCode === k.code
                  : selectedKey?.keycode === k.code;

                return (
                  <button
                    key={kIdx}
                    type="button"
                    onClick={() => onKeyClick(k.code)}
                    onMouseEnter={() => setHoveredInfo({ label: k.label, desc: k.desc, code: k.code })}
                    onMouseLeave={() => setHoveredInfo(null)}
                    disabled={activeCategory === 'basic' && (!selectedKey || isRemapping)}
                    title={k.desc || k.label}
                    style={{
                      width: keyWidth,
                      height: rowHeight,
                      borderRadius: 5,
                      background: isCurrent
                        ? 'linear-gradient(180deg, rgba(6, 182, 212, 0.28) 0%, rgba(6, 182, 212, 0.12) 100%)'
                        : 'linear-gradient(180deg, #1b202c 0%, #131722 100%)',
                      border: isCurrent
                        ? '1.5px solid var(--accent-cyan)'
                        : '1px solid rgba(255, 255, 255, 0.09)',
                      color: isCurrent
                        ? 'var(--accent-cyan)'
                        : selectedKey || activeCategory === 'combine'
                        ? 'var(--text-main)'
                        : 'var(--text-dim)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                      cursor: (selectedKey || activeCategory === 'combine') && !isRemapping ? 'pointer' : 'not-allowed',
                      opacity: selectedKey || activeCategory === 'combine' ? 1 : 0.5,
                      transition: 'all 0.1s ease',
                      flexShrink: 0,
                      boxShadow: isCurrent ? '0 0 10px rgba(6, 182, 212, 0.35)' : '0 2px 3px rgba(0,0,0,0.35)',
                      position: 'relative',
                    }}
                  >
                    {k.sub && (
                      <span
                        style={{
                          fontSize: '0.56rem',
                          fontWeight: 600,
                          color: isCurrent ? 'var(--accent-cyan)' : 'var(--text-dim)',
                          lineHeight: 1,
                        }}
                      >
                        {k.sub}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: getKeyFontSize(k.label, widthMultiplier),
                        fontWeight: 700,
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '96%',
                        textAlign: 'center',
                        letterSpacing: k.label.length >= 5 ? '-0.02em' : 'normal',
                      }}
                    >
                      {k.label}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="glass-panel-elevated"
      style={{
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        userSelect: 'none',
        maxWidth: 1120,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Target Status Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {selectedKey ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Dynamic Badge that flexes to any text length with zero overflow */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))',
                  border: '1.5px solid var(--accent-cyan)',
                  boxShadow: '0 0 14px rgba(6, 182, 212, 0.2)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-dim)',
                    letterSpacing: '0.06em',
                  }}
                >
                  Selected:
                </span>
                <span
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: 'var(--accent-cyan)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedKey.label}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Matrix [Row {selectedKey.row}, Col {selectedKey.col}] • {selectedKey.width}u Key
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  Active Layer: <span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>Layer {selectedKey.layer}</span>
                  {' '}• Current Code: 0x{selectedKey.keycode.toString(16).toUpperCase()}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                No Key Selected on Canvas
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                Click any key on the AE64 keyboard canvas above to remap it.
              </div>
            </div>
          )}
        </div>

        {/* Quick Pass-through Action for FN layers */}
        {selectedKey && selectedKey.layer > 0 && (
          <button
            onClick={() => onRemapKey(1)}
            disabled={isRemapping}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px dashed rgba(255, 255, 255, 0.2)',
              color: 'var(--text-muted)',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>Set to Pass-through (△)</span>
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 14px',
                borderRadius: 8,
                background: isActive
                  ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))'
                  : 'var(--bg-tertiary)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                border: isActive
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid var(--border-subtle)',
                fontSize: '0.80rem',
                fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 10px var(--accent-indigo-glow)' : 'none',
              }}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Basic vs Combine vs Other Categories */}
      {activeCategory === 'basic' ? (
        /* Standard 104-key pattern layout */
        renderStandardKeyboard((code) => onRemapKey(code))
      ) : activeCategory === 'combine' ? (
        /* Combine Tab: Modifiers + Full Standard Keyboard trigger picker */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 14,
          }}
        >
          {/* Top description */}
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              paddingBottom: 8,
            }}
          >
            <span>
              <strong>Hardware Combination Hotkey:</strong> Select modifier(s) below, click any trigger key, and apply compound keypress directly to AE64 firmware.
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
              Protocol 0x1000 | (Mods &lt;&lt; 8) | Key
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'start' }}>
            {/* Associated Modifiers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Associated Keys
              </div>
              {(['ctrl', 'shift', 'alt', 'win'] as const).map((mod) => {
                const isChecked = combineMods[mod];
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => toggleMod(mod)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: 7,
                      background: isChecked
                        ? 'linear-gradient(135deg, var(--accent-indigo), #3b82f6)'
                        : 'var(--bg-secondary)',
                      color: isChecked ? '#fff' : 'var(--text-muted)',
                      border: isChecked
                        ? '1px solid var(--accent-cyan)'
                        : '1px solid var(--border-subtle)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      boxShadow: isChecked ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
                    }}
                  >
                    <span>{mod.toUpperCase()}</span>
                    {isChecked ? <Check size={13} /> : <Plus size={13} opacity={0.3} />}
                  </button>
                );
              })}
            </div>

            {/* Trigger Key Keyboard Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0, overflowX: 'auto' }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trigger Key (Click on Standard Layout)
              </div>
              {renderStandardKeyboard((code) => setSelectedTriggerCode(code), selectedTriggerCode)}
            </div>
          </div>

          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 10,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Synthesized Hotkey:</span>
              <span
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: 'var(--accent-cyan)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {compoundLabel}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                (0x{compoundKeycode.toString(16).toUpperCase()})
              </span>
            </div>

            <button
              onClick={() => onRemapKey(compoundKeycode)}
              disabled={!selectedKey || isRemapping}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 20px',
                borderRadius: 8,
                background: selectedKey && !isRemapping
                  ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)'
                  : 'var(--bg-tertiary)',
                color: selectedKey && !isRemapping ? '#fff' : 'var(--text-dim)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: selectedKey && !isRemapping ? 'pointer' : 'not-allowed',
                boxShadow: selectedKey && !isRemapping ? '0 2px 10px rgba(6, 182, 212, 0.3)' : 'none',
              }}
            >
              {isRemapping ? (
                <>
                  <span className="spin">⟳</span> Writing to AE64...
                </>
              ) : (
                <>
                  <Check size={15} /> Apply Combination Key
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Grid for Special, Media, Lighting, Control, Mouse */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
            gap: 8,
            maxHeight: 240,
            overflowY: 'auto',
            padding: '4px 2px',
          }}
        >
          {CATEGORY_ITEMS[activeCategory].map((item) => {
            const isCurrent = selectedKey?.keycode === item.code;

            return (
              <button
                key={item.code}
                onClick={() => onRemapKey(item.code)}
                onMouseEnter={() => setHoveredInfo({ label: item.label, desc: item.desc, code: item.code })}
                onMouseLeave={() => setHoveredInfo(null)}
                disabled={!selectedKey || isRemapping}
                title={item.desc || item.label}
                style={{
                  height: 50,
                  borderRadius: 8,
                  background: isCurrent
                    ? 'rgba(6, 182, 212, 0.15)'
                    : 'linear-gradient(180deg, #1b202c 0%, #131722 100%)',
                  border: isCurrent
                    ? '1.5px solid var(--accent-cyan)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isCurrent
                    ? 'var(--accent-cyan)'
                    : selectedKey
                    ? 'var(--text-main)'
                    : 'var(--text-dim)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 2px',
                  cursor: selectedKey && !isRemapping ? 'pointer' : 'not-allowed',
                  opacity: selectedKey ? 1 : 0.5,
                  transition: 'all 0.12s ease',
                  boxShadow: isCurrent ? '0 0 10px rgba(6, 182, 212, 0.3)' : '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                {item.sub && (
                  <span style={{ fontSize: '0.60rem', fontWeight: 600, color: 'var(--text-dim)', lineHeight: 1 }}>
                    {item.sub}
                  </span>
                )}
                <span
                  style={{
                    fontSize: item.label.length > 6 ? '0.64rem' : '0.78rem',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '92%',
                    textAlign: 'center',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Hover Info & Keycode Details */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: 'var(--text-dim)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 8,
        }}
      >
        <div>
          {hoveredInfo ? (
            <span>
              <strong>{hoveredInfo.label}</strong> {hoveredInfo.desc ? `— ${hoveredInfo.desc}` : ''}{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>(0x{hoveredInfo.code.toString(16).toUpperCase()})</span>
            </span>
          ) : (
            <span>Hover any key for code details • Click to apply to selected key</span>
          )}
        </div>

        {isRemapping && (
          <div style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="spin">⟳</span> Writing to AE64 hardware...
          </div>
        )}
      </div>
    </div>
  );
};
