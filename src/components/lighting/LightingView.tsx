import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sun,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  Palette,
} from 'lucide-react';
import type { KeyMatrixItem } from '../../core/keys/layout';
import {
  lightingController,
  type LightAreaType,
  type LightingBaseConfig,
  type RGBColor,
  LIGHTING_MODES,
  DECORATIVE_LIGHTING_MODES,
  PRESET_STATIC_COLORS,
  DEFAULT_LIGHTING_BASE,
  hexToRgb,
  rgbToHex,
} from '../../core/lighting/lightingController';
import { keyboardHID } from '../../core/hid/connection';
import { KeyboardCanvas } from '../keyboard/KeyboardCanvas';
import { DecorateLightBarCanvas } from './DecorateLightBarCanvas';

interface LightingViewProps {
  keymapRows: KeyMatrixItem[][] | null;
  isLoadingKeymap?: boolean;
}

export const LightingView: React.FC<LightingViewProps> = ({
  keymapRows,
  isLoadingKeymap = false,
}) => {
  const [selectedArea, setSelectedArea] = useState<LightAreaType>('Keyboard');
  const [lightingConfig, setLightingConfig] = useState<LightingBaseConfig>({
    ...DEFAULT_LIGHTING_BASE,
  });

  const [activeColor, setActiveColor] = useState<RGBColor>({
    r: 255,
    g: 0,
    b: 0,
    hex: '#FF0000',
  });
  const [hexInput, setHexInput] = useState<string>('#FF0000');

  // Custom key colors for Keyboard (mapped by "row-col")
  const [customKeyColors, setCustomKeyColors] = useState<Record<string, RGBColor>>(() => {
    try {
      const saved = localStorage.getItem('anakeyn_custom_lighting_keyboard') || localStorage.getItem('anakeyn_custom_lighting');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Custom LED colors for Decorate1 (mapped by LED index 0..28)
  const [customDecorateColors, setCustomDecorateColors] = useState<Record<number, RGBColor>>(() => {
    try {
      const saved = localStorage.getItem('anakeyn_custom_lighting_decorate');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Refs for tracking throttled custom lighting transmission
  const customKeyColorsRef = useRef(customKeyColors);
  const customDecorateColorsRef = useRef(customDecorateColors);

  useEffect(() => {
    customKeyColorsRef.current = customKeyColors;
  }, [customKeyColors]);

  useEffect(() => {
    customDecorateColorsRef.current = customDecorateColors;
  }, [customDecorateColors]);

  const paintPendingRef = useRef(false);
  const paintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Interaction tracking to prevent background polling from clobbering active user edits
  const isInteractingRef = useRef(false);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markInteraction = useCallback(() => {
    isInteractingRef.current = true;
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 2000);
  }, []);

  // Flush pending custom lighting packets to hardware
  const flushPaintHID = useCallback((area: LightAreaType) => {
    if (area === 'Keyboard') {
      lightingController.setPerKeyCustomLighting(customKeyColorsRef.current, 6, 21);
    } else {
      lightingController.setDecorateCustomLighting(customDecorateColorsRef.current, 29);
    }
  }, []);

  // Schedule throttled paint transmission during mouse drag
  const schedulePaintHID = useCallback(
    (area: LightAreaType) => {
      markInteraction();
      paintPendingRef.current = true;
      if (!paintTimerRef.current) {
        paintTimerRef.current = setTimeout(() => {
          paintTimerRef.current = null;
          if (paintPendingRef.current) {
            paintPendingRef.current = false;
            flushPaintHID(area);
          }
        }, 120);
      }
    },
    [flushPaintHID, markInteraction],
  );

  // Immediate flush on mouse release
  const handlePaintEnd = useCallback(
    (area: LightAreaType) => {
      if (paintTimerRef.current) {
        clearTimeout(paintTimerRef.current);
        paintTimerRef.current = null;
      }
      paintPendingRef.current = false;
      flushPaintHID(area);
    },
    [flushPaintHID],
  );

  // Fetch initial lighting config and palette when area changes
  useEffect(() => {
    lightingController.getLightingBase(selectedArea).then((conf) => {
      setLightingConfig(conf);
    });
    lightingController.getLightingPalette(selectedArea);
  }, [selectedArea]);

  // Real-time status sync: polls hardware every 1.2s to mirror Fn key shortcuts
  useEffect(() => {
    if (!keyboardHID.isConnected()) return;

    const interval = setInterval(async () => {
      if (isInteractingRef.current) return;
      try {
        const live = await lightingController.getLightingBase(selectedArea);
        setLightingConfig((prev) => {
          if (
            prev.mode !== live.mode ||
            prev.luminance !== live.luminance ||
            prev.speed !== live.speed ||
            prev.open !== live.open ||
            prev.selectStaticColor !== live.selectStaticColor
          ) {
            return { ...live };
          }
          return prev;
        });
      } catch {}
    }, 1200);

    return () => clearInterval(interval);
  }, [selectedArea]);

  // Handle Upper / Lower toggles (for Main Keyboard)
  const handleToggleKeyboardSwitch = useCallback(
    (type: 'upper' | 'lower') => {
      markInteraction();
      const isUpper = lightingConfig.open === 'Open' || lightingConfig.open === 'OpenUp';
      const isLower = lightingConfig.open === 'Open' || lightingConfig.open === 'OpenDown';

      const nextUpper = type === 'upper' ? !isUpper : isUpper;
      const nextLower = type === 'lower' ? !isLower : isLower;

      let openState: 'Close' | 'OpenDown' | 'OpenUp' | 'Open' = 'Close';
      if (nextUpper && nextLower) openState = 'Open';
      else if (nextUpper) openState = 'OpenUp';
      else if (nextLower) openState = 'OpenDown';

      const updated: LightingBaseConfig = {
        ...lightingConfig,
        open: openState,
      };
      setLightingConfig(updated);
      lightingController.setLightingBase(updated);
    },
    [lightingConfig, markInteraction],
  );

  // Handle Single Switch (for Decorative1)
  const handleToggleDecorateSwitch = useCallback(() => {
    markInteraction();
    const isCurrentlyOpen = lightingConfig.open !== 'Close';
    const updated: LightingBaseConfig = {
      ...lightingConfig,
      open: isCurrentlyOpen ? 'Close' : 'Open',
    };
    setLightingConfig(updated);
    lightingController.setLightingBase(updated);
  }, [lightingConfig, markInteraction]);

  // Handle Mode Selection (L1 to L20 for Keyboard, L1 to L5 for Decorate1)
  const handleSelectMode = useCallback(
    (modeId: number) => {
      markInteraction();
      const updated: LightingBaseConfig = {
        ...lightingConfig,
        mode: modeId,
      };
      setLightingConfig(updated);
      lightingController.setLightingBase(updated);
    },
    [lightingConfig, markInteraction],
  );

  // Handle Brightness Change
  const handleChangeBrightness = useCallback(
    (val: number) => {
      markInteraction();
      const clamped = Math.max(0, Math.min(100, Math.round(val)));
      const updated: LightingBaseConfig = {
        ...lightingConfig,
        luminance: clamped,
      };
      setLightingConfig(updated);
      lightingController.setLightingBase(updated);
    },
    [lightingConfig, markInteraction],
  );

  // Handle Speed Change
  const handleChangeSpeed = useCallback(
    (val: number) => {
      markInteraction();
      const clamped = Math.max(0, Math.min(100, Math.round(val)));
      const updated: LightingBaseConfig = {
        ...lightingConfig,
        speed: clamped,
      };
      setLightingConfig(updated);
      lightingController.setLightingBase(updated);
    },
    [lightingConfig, markInteraction],
  );

  // Handle Preset Color Swatch Click (0 = Dynamic Rainbow, 1..7 = Preset Static Colors)
  const handleSelectPresetColor = useCallback(
    (colorIndex: number) => {
      markInteraction();
      const updated: LightingBaseConfig = {
        ...lightingConfig,
        selectStaticColor: colorIndex,
      };
      setLightingConfig(updated);
      lightingController.setLightingBase(updated);

      if (colorIndex > 0) {
        const preset = PRESET_STATIC_COLORS[colorIndex - 1];
        if (preset) {
          setActiveColor(preset);
          setHexInput(preset.hex || '#FFFFFF');
        }
      }
    },
    [lightingConfig, markInteraction],
  );

  // Apply chosen Custom Color to hardware palette & active mode
  const handleApplyCustomColor = async () => {
    markInteraction();
    setApplySuccess(true);
    await lightingController.applyCustomColor(selectedArea, activeColor);
    setLightingConfig((prev) => ({
      ...prev,
      selectStaticColor: 7,
    }));
    setTimeout(() => setApplySuccess(false), 2000);
  };

  // Handle Hex Input
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    markInteraction();
    let val = e.target.value.toUpperCase();
    if (!val.startsWith('#')) val = '#' + val;
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      const rgb = hexToRgb(val);
      setActiveColor(rgb);
      // Auto-apply if in Static Light mode (L1)
      if (lightingConfig.mode === 1) {
        lightingController.applyCustomColor(selectedArea, rgb);
      }
    }
  };

  // Handle Keyboard Key Paint
  const handlePaintKey = (key: KeyMatrixItem, isClear: boolean) => {
    const keyId = `${key.row}-${key.col}`;
    setCustomKeyColors((prev) => {
      const next = { ...prev };
      if (isClear) {
        delete next[keyId];
      } else {
        next[keyId] = activeColor;
      }
      try {
        localStorage.setItem('anakeyn_custom_lighting_keyboard', JSON.stringify(next));
      } catch {}
      return next;
    });
    schedulePaintHID('Keyboard');
  };

  // Handle Decorative1 LED Paint
  const handlePaintLed = (ledIndex: number, isClear: boolean) => {
    setCustomDecorateColors((prev) => {
      const next = { ...prev };
      if (isClear) {
        delete next[ledIndex];
      } else {
        next[ledIndex] = activeColor;
      }
      try {
        localStorage.setItem('anakeyn_custom_lighting_decorate', JSON.stringify(next));
      } catch {}
      return next;
    });
    schedulePaintHID('Decorate1');
  };

  // Clear Custom Lighting
  const handleClearCustomLighting = () => {
    markInteraction();
    if (selectedArea === 'Keyboard') {
      setCustomKeyColors({});
      try {
        localStorage.removeItem('anakeyn_custom_lighting_keyboard');
        localStorage.removeItem('anakeyn_custom_lighting');
      } catch {}
      lightingController.setPerKeyCustomLighting({}, 6, 21);
    } else {
      setCustomDecorateColors({});
      try {
        localStorage.removeItem('anakeyn_custom_lighting_decorate');
      } catch {}
      lightingController.setDecorateCustomLighting({}, 29);
    }
  };

  // Save to Keyboard Flash
  const handleSaveToFlash = async () => {
    markInteraction();
    setIsSaving(true);
    try {
      await lightingController.saveLightingToFlash();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const isDecorate = selectedArea === 'Decorate1';
  const modesToDisplay = isDecorate ? DECORATIVE_LIGHTING_MODES : LIGHTING_MODES;
  const isSingleSwitchOpen = lightingConfig.open !== 'Close';
  const isUpperOn = lightingConfig.open === 'Open' || lightingConfig.open === 'OpenUp';
  const isLowerOn = lightingConfig.open === 'Open' || lightingConfig.open === 'OpenDown';

  const paintedCount = isDecorate
    ? Object.keys(customDecorateColors).length
    : Object.keys(customKeyColors).length;

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
      {/* 1. VISUALIZER CANVAS (Keyboard Canvas OR Light Bar Canvas) */}
      {isDecorate ? (
        <DecorateLightBarCanvas
          ledColors={Object.fromEntries(
            Object.entries(customDecorateColors).map(([k, v]) => [
              Number(k),
              v.hex || rgbToHex(v.r, v.g, v.b),
            ]),
          )}
          onPaintLed={handlePaintLed}
          onPaintEnd={() => handlePaintEnd('Decorate1')}
        />
      ) : (
        <KeyboardCanvas
          keymapRows={keymapRows}
          isLoading={isLoadingKeymap}
          keyLightingColors={Object.fromEntries(
            Object.entries(customKeyColors).map(([k, v]) => [
              k,
              v.hex || rgbToHex(v.r, v.g, v.b),
            ]),
          )}
          onPaintKey={handlePaintKey}
          onPaintEnd={() => handlePaintEnd('Keyboard')}
        />
      )}

      {/* 2. Drag & Drop Helper Text matching xsyd.top */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: '#cbd5e1',
          fontSize: '0.86rem',
          marginTop: -6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: '0.92rem' }}>🖱</span>
        <span style={{ fontStyle: 'italic', letterSpacing: '0.02em', color: '#94a3b8' }}>
          Drag with left mouse to change color, right click to clear color
        </span>
      </div>

      {/* 3. Area Switcher Tabs: Main Keyboard | Decorative1 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {(['Keyboard', 'Decorate1'] as LightAreaType[]).map((area) => {
          const isActive = selectedArea === area;
          return (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              style={{
                padding: '8px 26px',
                borderRadius: 20,
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: isActive
                  ? '1.5px solid var(--accent-cyan)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.28), rgba(59, 130, 246, 0.28))'
                  : 'rgba(15, 18, 26, 0.85)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                boxShadow: isActive ? '0 0 16px rgba(6, 182, 212, 0.35)' : 'none',
              }}
            >
              {area === 'Keyboard' ? 'Main Keyboard' : 'Decorative 1'}
            </button>
          );
        })}
      </div>

      {/* 4. MAIN LIGHTING CONTROL PANEL (3 Columns matching xsyd.top) */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'grid',
          gridTemplateColumns: '270px 1fr 280px',
          gap: 28,
          background: 'rgba(13, 17, 26, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* COLUMN 1: Custom Color Picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>
              Custom Color
            </span>
            {paintedCount > 0 && (
              <div style={{ fontSize: '0.70rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                {paintedCount} Painted {isDecorate ? 'LEDs' : 'Keys'}
              </div>
            )}
          </div>

          {/* Interactive Native / Visual Color Wheel Input */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 135,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              background: activeColor.hex || '#FF0000',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
            }}
          >
            <input
              type="color"
              value={activeColor.hex || '#FF0000'}
              onChange={(e) => {
                markInteraction();
                const rgb = hexToRgb(e.target.value);
                setActiveColor(rgb);
                setHexInput(e.target.value.toUpperCase());
                if (lightingConfig.mode === 1) {
                  lightingController.applyCustomColor(selectedArea, rgb);
                }
              }}
              style={{
                position: 'absolute',
                top: -10,
                left: -10,
                width: '120%',
                height: '120%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.82rem',
                pointerEvents: 'none',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              <span>Click to Pick Color</span>
              <span style={{ fontSize: '0.74rem', opacity: 0.85, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {activeColor.hex || '#FF0000'}
              </span>
            </div>
          </div>

          {/* RGB Numeric Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[
              { label: 'R', val: activeColor.r, color: '#f87171' },
              { label: 'G', val: activeColor.g, color: '#4ade80' },
              { label: 'B', val: activeColor.b, color: '#60a5fa' },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '5px 8px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color }}>{label}</span>
                <span
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: '#f1f5f9',
                  }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>

          {/* Hex Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-dim)' }}>
              HEX COLOR CODE
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 8,
                padding: '0 10px',
              }}
            >
              <input
                type="text"
                value={hexInput}
                onChange={handleHexChange}
                maxLength={7}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  padding: '7px 0',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Apply Custom Color Button */}
          <button
            onClick={handleApplyCustomColor}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              background: applySuccess
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.25))',
              border: '1px solid var(--accent-cyan)',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            {applySuccess ? <Check size={14} /> : <Palette size={14} />}
            {applySuccess ? 'Applied to Hardware!' : 'Apply to Active Mode'}
          </button>

          {/* Clear Custom Lighting Button */}
          <button
            onClick={handleClearCustomLighting}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
            }}
          >
            <RotateCcw size={13} />
            Clear Custom Lighting
          </button>
        </div>

        {/* COLUMN 2: Lighting Modes (L1 - L20 for Keyboard, L1 - L5 for Decorate1) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>
              Lighting Mode
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              Mode: {modesToDisplay.find((m) => m.id === lightingConfig.mode)?.label || `L${lightingConfig.mode}`}
            </span>
          </div>

          {/* Grid of Modes: 4 cols for 20 modes, or 4 cols for 5 modes matching screenshot */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
            }}
          >
            {modesToDisplay.map((mode) => {
              const isSelected = lightingConfig.mode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleSelectMode(mode.id)}
                  title={`${mode.label} (${mode.nameZh})\n${mode.description}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 4px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected
                      ? '1.5px solid var(--accent-cyan)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.22), rgba(59, 130, 246, 0.22))'
                      : 'rgba(255, 255, 255, 0.03)',
                    boxShadow: isSelected ? '0 0 12px rgba(6, 182, 212, 0.35)' : 'none',
                    transform: isSelected ? 'scale(1.02)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      color: isSelected ? 'var(--accent-cyan)' : '#f1f5f9',
                    }}
                  >
                    L{mode.id}
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      color: isSelected ? '#e2e8f0' : 'var(--text-dim)',
                      marginTop: 2,
                      maxWidth: '90%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 3: Switches, Sliders & Color Palette */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Lighting Switches: Single toggle for Decorate1, Dual for Keyboard */}
          {isDecorate ? (
            /* Single Switch matching Decorate1 in xsyd.top */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sun size={15} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Lighting Switch:
                </span>
              </div>
              <div
                onClick={handleToggleDecorateSwitch}
                style={{
                  width: 38,
                  height: 20,
                  borderRadius: 12,
                  background: isSingleSwitchOpen
                    ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                    : 'rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: isSingleSwitchOpen ? 20 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>
            </div>
          ) : (
            /* Dual Switches for Main Keyboard */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Upper Switch */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sun size={15} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Upper Lighting Switch:
                  </span>
                </div>
                <div
                  onClick={() => handleToggleKeyboardSwitch('upper')}
                  style={{
                    width: 38,
                    height: 20,
                    borderRadius: 12,
                    background: isUpperOn
                      ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                      : 'rgba(255, 255, 255, 0.15)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: isUpperOn ? 20 : 2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {/* Lower Switch */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={15} color="var(--accent-purple)" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Lower Lighting Switch:
                  </span>
                </div>
                <div
                  onClick={() => handleToggleKeyboardSwitch('lower')}
                  style={{
                    width: 38,
                    height: 20,
                    borderRadius: 12,
                    background: isLowerOn
                      ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                      : 'rgba(255, 255, 255, 0.15)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: isLowerOn ? 20 : 2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Brightness Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 600, color: '#e2e8f0' }}>
                Brightness
              </span>
              <span
                style={{
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-cyan)',
                }}
              >
                {lightingConfig.luminance}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={lightingConfig.luminance}
              onChange={(e) => handleChangeBrightness(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--accent-cyan)',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Speed Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 600, color: '#e2e8f0' }}>Speed</span>
              <span
                style={{
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-purple)',
                }}
              >
                {lightingConfig.speed}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={lightingConfig.speed}
              onChange={(e) => handleChangeSpeed(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--accent-purple)',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Static Color Swatches Palette */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 600, color: '#e2e8f0' }}>Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Rainbow / Dynamic Swatch (Index 0) */}
              <button
                onClick={() => handleSelectPresetColor(0)}
                title="Dynamic Rainbow Spectrum"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background:
                    'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)',
                  border:
                    lightingConfig.selectStaticColor === 0
                      ? '2.5px solid #fff'
                      : '1.5px solid rgba(255, 255, 255, 0.2)',
                  boxShadow:
                    lightingConfig.selectStaticColor === 0
                      ? '0 0 10px rgba(255, 255, 255, 0.8)'
                      : 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                  transform: lightingConfig.selectStaticColor === 0 ? 'scale(1.15)' : 'none',
                }}
              />

              {/* 7 Solid Colors (Index 1 to 7) */}
              {PRESET_STATIC_COLORS.map((col, idx) => {
                const colorIndex = idx + 1;
                const isSelected = lightingConfig.selectStaticColor === colorIndex;
                return (
                  <button
                    key={col.hex}
                    onClick={() => handleSelectPresetColor(colorIndex)}
                    title={col.hex}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: col.hex,
                      border: isSelected ? '2.5px solid #fff' : '1.5px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: isSelected ? `0 0 10px ${col.hex}cc` : 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                      transform: isSelected ? 'scale(1.15)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Flash Save Button */}
          <button
            onClick={handleSaveToFlash}
            disabled={isSaving}
            style={{
              marginTop: 4,
              padding: '10px 16px',
              borderRadius: 10,
              background: saveSuccess
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, var(--accent-cyan), #3b82f6)',
              border: 'none',
              color: '#fff',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {saveSuccess ? <Check size={16} /> : <Save size={16} />}
            {isSaving ? 'Saving to Flash...' : saveSuccess ? 'Saved to Keyboard!' : 'Save Lighting'}
          </button>
        </div>
      </div>
    </div>
  );
};
