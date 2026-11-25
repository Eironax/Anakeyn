import React from 'react';
import type { KeyMatrixItem } from '../../core/keys/layout';

export interface KeyBadgeOverlay {
  top?: string;
  topColor?: string;
  bottom?: string;
  bottomColor?: string;
  bg?: string;
  border?: string;
}

export interface BatchActions {
  onSelectWASD: () => void;
  onSelectAll: () => void;
  onReverse: () => void;
  onCancel: () => void;
}

interface KeyboardCanvasProps {
  keymapRows: KeyMatrixItem[][] | null;
  selectedKey?: KeyMatrixItem | null;
  selectedKeySet?: Set<string>;
  onSelectKey?: (key: KeyMatrixItem | null) => void;
  onToggleKey?: (key: KeyMatrixItem, e: React.MouseEvent) => void;
  isLoading?: boolean;
  badges?: Record<string, KeyBadgeOverlay>;
  batchActions?: BatchActions;
  keyLightingColors?: Record<string, string>;
  onPaintKey?: (key: KeyMatrixItem, isClear: boolean) => void;
  onPaintEnd?: () => void;
  onKeyContextMenu?: (key: KeyMatrixItem, e: React.MouseEvent) => void;
}

const KEY_U_SIZE = 54; // Base 1u key width & height in px (perfect square!)
const KEY_GAP = 6;    // Inter-key gap in px

/**
 * Calculates the exact physical pixel width for a key of width 'w' units (u).
 * Formula: w * U + (w - 1) * gap
 * This guarantees that 1u + 1u + gap = 2u key width, so all rows align to the exact sub-pixel.
 */
function getKeyWidthPx(widthInU: number): number {
  return Math.round(widthInU * KEY_U_SIZE + (widthInU - 1) * KEY_GAP);
}

/**
 * Parses dual legends (e.g. "1 !", "2 @", "[ {", "; :") into top & bottom text
 */
function parseLegends(label: string): { main: string; sub?: string } {
  if (!label || label === '·') return { main: label || '·' };

  // Common shift pair formats like "1 !", "2 @", "- _", "= +"
  const parts = label.split(' ');
  if (parts.length === 2 && parts[0].length <= 2 && parts[1].length <= 2) {
    return { main: parts[0], sub: parts[1] };
  }

  return { main: label };
}

export const KeyboardCanvas: React.FC<KeyboardCanvasProps> = ({
  keymapRows,
  selectedKey,
  selectedKeySet,
  onSelectKey,
  onToggleKey,
  isLoading = false,
  badges,
  batchActions,
  keyLightingColors,
  onPaintKey,
  onPaintEnd,
  onKeyContextMenu,
}) => {
  const isPaintingRef = React.useRef<null | 'paint' | 'clear'>(null);
  // 15u total width across 64-key layout: 15 * 54 + 14 * 6 = 894px
  const totalWidthPx = 15 * KEY_U_SIZE + 14 * KEY_GAP;

  return (
    <div
      onMouseUp={() => {
        if (isPaintingRef.current) {
          isPaintingRef.current = null;
          onPaintEnd?.();
        }
      }}
      onMouseLeave={() => {
        if (isPaintingRef.current) {
          isPaintingRef.current = null;
          onPaintEnd?.();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        width: '100%',
        margin: '10px 0 24px',
        position: 'relative',
      }}
    >
      {/* Keyboard Outer Case / Bezel */}
      <div
        style={{
          width: totalWidthPx + 36,
          background: 'linear-gradient(180deg, #161922 0%, #0d0f15 100%)',
          borderRadius: 18,
          padding: '16px 18px',
          border: '1.5px solid rgba(255, 255, 255, 0.10)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: KEY_GAP,
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {/* Subtle case chamfer highlight */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 20,
            right: 20,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            pointerEvents: 'none',
          }}
        />

        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 13, 20, 0.65)',
              backdropFilter: 'blur(3px)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              color: 'var(--accent-cyan)',
              fontSize: '0.86rem',
              fontWeight: 600,
            }}
          >
            Reading Keyboard Matrix...
          </div>
        )}

        {keymapRows ? (
          keymapRows.map((row, rIdx) => (
            <div
              key={rIdx}
              style={{
                display: 'flex',
                gap: KEY_GAP,
                alignItems: 'center',
                width: totalWidthPx,
              }}
            >
              {row.map((key) => {
                const keyId = `${key.row}-${key.col}`;
                const isSelected = selectedKeySet
                  ? selectedKeySet.has(keyId)
                  : selectedKey?.row === key.row && selectedKey?.col === key.col;
                const isPassThrough = key.keycode === 1;
                const widthPx = getKeyWidthPx(key.width);
                const { main, sub } = parseLegends(key.label);
                const badge = badges?.[keyId];

                const customLightingHex = keyLightingColors?.[keyId];

                return (
                  <button
                    key={keyId}
                    onClick={(e) => {
                      if (onToggleKey) {
                        onToggleKey(key, e);
                      } else if (onSelectKey) {
                        if (isSelected) {
                          onSelectKey(null);
                        } else {
                          onSelectKey(key);
                        }
                      }
                    }}
                    onMouseDown={(e) => {
                      if (onPaintKey) {
                        e.preventDefault();
                        if (e.button === 0) {
                          isPaintingRef.current = 'paint';
                          onPaintKey(key, false);
                        } else if (e.button === 2) {
                          isPaintingRef.current = 'clear';
                          onPaintKey(key, true);
                        }
                      }
                    }}
                    onMouseEnter={() => {
                      if (onPaintKey && isPaintingRef.current) {
                        onPaintKey(key, isPaintingRef.current === 'clear');
                      }
                    }}
                    onContextMenu={(e) => {
                      if (onKeyContextMenu) {
                        e.preventDefault();
                        onKeyContextMenu(key, e);
                      } else if (onPaintKey) {
                        e.preventDefault();
                        onPaintKey(key, true);
                      }
                    }}
                    title={`Key: ${key.label}\nMatrix: Row ${key.row}, Col ${key.col}\nWidth: ${key.width}u\nKeycode: 0x${key.keycode.toString(16).toUpperCase()} (${key.keycode})`}
                    style={{
                      width: widthPx,
                      height: KEY_U_SIZE,
                      flexShrink: 0,
                      borderRadius: 8,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: sub ? 'flex-start' : 'center',
                      justifyContent: sub ? 'space-between' : 'center',
                      padding: sub ? '6px 8px' : '4px 6px',
                      background: customLightingHex
                        ? customLightingHex
                        : badge?.bg
                        ? badge.bg
                        : isSelected
                        ? 'linear-gradient(135deg, #4f46e5, #06b6d4)'
                        : isPassThrough
                        ? 'linear-gradient(180deg, #151822 0%, #10121a 100%)'
                        : 'linear-gradient(180deg, #222736 0%, #171b26 100%)',
                      border: customLightingHex
                        ? `1.5px solid ${customLightingHex}`
                        : badge?.border
                        ? badge.border
                        : isSelected
                        ? '1.5px solid #fff'
                        : isPassThrough
                        ? '1px dashed rgba(255, 255, 255, 0.12)'
                        : '1px solid rgba(255, 255, 255, 0.10)',
                      boxShadow: customLightingHex
                        ? `0 0 16px ${customLightingHex}bb, inset 0 1px 1px rgba(255, 255, 255, 0.4)`
                        : isSelected
                        ? '0 0 20px rgba(99, 102, 241, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                        : '0 3px 6px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
                      cursor: onPaintKey ? 'crosshair' : onToggleKey || onSelectKey ? 'pointer' : 'default',
                      transition: 'all 0.12s ease',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Performance / Trigger Top Badge Overlay (e.g. "2.0" mm actuation or Switch Name) */}
                    {badge?.top && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: 4,
                          fontSize:
                            badge.top.length > 8
                              ? '0.48rem'
                              : badge.top.length > 4
                              ? '0.54rem'
                              : '0.62rem',
                          fontWeight: 800,
                          color: badge.topColor || '#f87171',
                          lineHeight: 1,
                          pointerEvents: 'none',
                          zIndex: 2,
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                          maxWidth: '92%',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {badge.top}
                      </span>
                    )}

                    {/* Shift legend (top) */}
                    {sub && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: isSelected ? '#fff' : 'var(--text-muted)',
                          lineHeight: 1,
                          marginTop: badge?.top ? 4 : 0,
                        }}
                      >
                        {sub}
                      </span>
                    )}

                    {/* Primary legend */}
                    <span
                      style={{
                        fontSize:
                          main.length > 5
                            ? '0.64rem'
                            : main.length > 3
                            ? '0.74rem'
                            : sub
                            ? '0.78rem'
                            : '0.84rem',
                        fontWeight: 700,
                        color: isSelected
                          ? '#fff'
                          : isPassThrough
                          ? 'var(--text-dim)'
                          : 'var(--text-main)',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {main}
                    </span>

                    {/* Performance Bottom Badge Overlay (e.g. deadzone "0.2") */}
                    {badge?.bottom ? (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          left: 4,
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          color: badge.bottomColor || '#fbbf24',
                          lineHeight: 1,
                          pointerEvents: 'none',
                          zIndex: 2,
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                        }}
                      >
                        {badge.bottom}
                      </span>
                    ) : (
                      /* Coordinate indicator on bottom-right for debugging */
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 4,
                          fontSize: '0.48rem',
                          fontFamily: 'var(--font-mono)',
                          color: isSelected
                            ? 'rgba(255, 255, 255, 0.8)'
                            : 'rgba(255, 255, 255, 0.22)',
                          pointerEvents: 'none',
                        }}
                      >
                        {key.row}:{key.col}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        ) : (
          <div
            style={{
              height: 5 * KEY_U_SIZE + 4 * KEY_GAP,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.90rem',
            }}
          >
            No key matrix data loaded. Connect keyboard to display.
          </div>
        )}
      </div>

      {/* Batch Selection Action Buttons (matching OEM trigger.png) */}
      {batchActions && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignSelf: 'center',
          }}
        >
          {[
            { label: 'WASD', onClick: batchActions.onSelectWASD, highlight: true },
            { label: 'Select All', onClick: batchActions.onSelectAll, highlight: false },
            { label: 'Reverse', onClick: batchActions.onReverse, highlight: false },
            { label: 'Cancel', onClick: batchActions.onCancel, highlight: false },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              style={{
                width: 105,
                padding: '9px 12px',
                borderRadius: 20,
                background: btn.highlight
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))'
                  : 'var(--bg-secondary)',
                border: btn.highlight
                  ? '1px solid var(--accent-indigo)'
                  : '1px solid var(--border-subtle)',
                color: btn.highlight ? 'var(--accent-cyan)' : 'var(--text-main)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                e.currentTarget.style.transform = 'translateX(2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = btn.highlight
                  ? 'var(--accent-indigo)'
                  : 'var(--border-subtle)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
