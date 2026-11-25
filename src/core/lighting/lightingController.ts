/**
 * Anakeyn — RGB Lighting Controller
 * Interacts with SparkLink Protocol V2 Lighting Category (0x05) and Global Lighting Queries.
 * Supports Base Settings, Upper/Lower switches, 20 Lighting Modes (L1 = Static Light to L20 = Reactive Flash),
 * Brightness, Speed, Static Palettes, and Per-Key/Per-LED Custom RGB Direct Drive.
 */

import { PROTOCOL_V2, GLOBAL_CMD, CRW } from '../hid/constants';
import { keyboardHID } from '../hid/connection';

export type LightAreaType = 'Keyboard' | 'Decorate1';

export const LIGHT_AREA_MAP: Record<LightAreaType, number> = {
  Keyboard: 0x00,
  Decorate1: 0x01,
};

export interface LightAreaInfo {
  index: number;
  count: number;
  rows: number;
  cols: number;
}

export interface LightingBaseConfig {
  area: LightAreaType;
  open: 'Close' | 'OpenDown' | 'OpenUp' | 'Open';
  mode: number; // 1 to 20 (maps to firmware mode 0 to 19)
  luminance: number; // 0 to 100
  speed: number; // 0 to 100
  direction: 0 | 1; // 0 = Forward, 1 = Backward
  selectStaticColor: number; // 0 = Rainbow/Dynamic, 1 to 7 = Preset Color
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
  hex?: string;
}

// Convert Hex string to RGB
export function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return { r, g, b, hex: `#${clean.toUpperCase()}` };
  }
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return {
    r: isNaN(r) ? 255 : r,
    g: isNaN(g) ? 0 : g,
    b: isNaN(b) ? 0 : b,
    hex: `#${clean.padStart(6, '0').toUpperCase()}`,
  };
}

// Convert RGB to Hex
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

// 7 Preset Static Colors matching xsyd.top swatches
export const PRESET_STATIC_COLORS: RGBColor[] = [
  { r: 255, g: 0, b: 0, hex: '#FF0000' },     // 1: Red
  { r: 0, g: 255, b: 0, hex: '#00FF00' },     // 2: Green
  { r: 255, g: 255, b: 0, hex: '#FFFF00' },   // 3: Yellow
  { r: 0, g: 0, b: 255, hex: '#0000FF' },     // 4: Blue
  { r: 255, g: 0, b: 255, hex: '#FF00FF' },   // 5: Magenta
  { r: 0, g: 255, b: 255, hex: '#00FFFF' },   // 6: Cyan
  { r: 255, g: 255, b: 255, hex: '#FFFFFF' }, // 7: White
];

export interface LightingModeMeta {
  id: number; // 1 to 20
  firmwareMode: number; // 0 to 19
  label: string;
  nameZh: string;
  description: string;
}

/**
 * Lighting modes L1 to L20:
 * L1: Static Light (firmware mode 0x00 - 常亮单色/全彩)
 * L2: Ripple (firmware mode 0x01 - 波纹荡漾)
 * ...
 * L19: Spectrum Cycle (firmware mode 0x12 - 光谱循环)
 * L20: Reactive Flash (firmware mode 0x13 - 按键点亮)
 */
export const LIGHTING_MODES: LightingModeMeta[] = [
  { id: 1, firmwareMode: 0, label: 'Static Light', nameZh: '常亮单色', description: 'Solid steady backlight (single color or full RGB)' },
  { id: 2, firmwareMode: 1, label: 'Ripple', nameZh: '波纹荡漾', description: 'Expanding concentric wave ripples on press' },
  { id: 3, firmwareMode: 2, label: 'Ebb & Flow', nameZh: '潮起潮落', description: 'Gentle oceanic tidal breathing' },
  { id: 4, firmwareMode: 3, label: 'Ripple Gently', nameZh: '涟漪轻漾', description: 'Subtle reactive radial ripple' },
  { id: 5, firmwareMode: 4, label: 'Rotating Storm', nameZh: '旋转风暴', description: 'Vortex rotating rainbow spiral' },
  { id: 6, firmwareMode: 5, label: 'Lucky Rainbow', nameZh: '幸运彩虹', description: 'Diagonal flowing spectrum wave' },
  { id: 7, firmwareMode: 6, label: 'Shining Rainbow', nameZh: '闪耀彩虹', description: 'Full spectrum cycling shimmer' },
  { id: 8, firmwareMode: 7, label: 'Shining', nameZh: '熠熠生辉', description: 'Starlight shimmering glitter' },
  { id: 9, firmwareMode: 8, label: 'Moving Window', nameZh: '移动窗格', description: 'Matrix columns scanning across board' },
  { id: 10, firmwareMode: 9, label: 'Wave Transform', nameZh: '波形变换', description: 'Harmonic sine wave color shift' },
  { id: 11, firmwareMode: 10, label: 'Shift', nameZh: '移形换影', description: 'Cascading reactive tracer waves' },
  { id: 12, firmwareMode: 11, label: 'Sine Curve', nameZh: '正弦曲线', description: 'Smooth sinusoidal undulating light' },
  { id: 13, firmwareMode: 12, label: 'Cloud Flow', nameZh: '行云流水', description: 'Silky smooth horizontal cloud drift' },
  { id: 14, firmwareMode: 13, label: 'Blooming', nameZh: '百花争艳', description: 'Bursting floral bloom on actuation' },
  { id: 15, firmwareMode: 14, label: 'Mosaic Rainbow', nameZh: '斑斓镶嵌', description: 'Prismatic gemstone facet shifts' },
  { id: 16, firmwareMode: 15, label: 'Rainfall', nameZh: '雨落如注', description: 'Cascading vertical neon raindrops' },
  { id: 17, firmwareMode: 16, label: 'Jump', nameZh: '跃动不息', description: 'Dynamic bouncing equalizer pulses' },
  { id: 18, firmwareMode: 17, label: 'Breathing', nameZh: '呼吸律动', description: 'Smooth pulsing fade cycle' },
  { id: 19, firmwareMode: 18, label: 'Spectrum Cycle', nameZh: '光谱循环', description: 'Continuous smooth color hue rotation' },
  { id: 20, firmwareMode: 19, label: 'Reactive Flash', nameZh: '按键点亮', description: 'Instant key illumination on press' },
];

// Modes available for Decorative1 (L1 to L5 only)
export const DECORATIVE_LIGHTING_MODES = LIGHTING_MODES.slice(0, 5);

export const DEFAULT_LIGHTING_BASE: LightingBaseConfig = {
  area: 'Keyboard',
  open: 'Open',
  mode: 1, // L1: Static Light
  luminance: 80,
  speed: 80,
  direction: 0,
  selectStaticColor: 0,
};

export class LightingController {
  public baseConfigCache: Record<LightAreaType, LightingBaseConfig> = {
    Keyboard: { ...DEFAULT_LIGHTING_BASE },
    Decorate1: { ...DEFAULT_LIGHTING_BASE, area: 'Decorate1' },
  };

  public hasDoubleLighting: boolean = true;
  public availableAreas: LightAreaInfo[] = [];

  // Cached palette colors (8 slots)
  public paletteCache: Record<LightAreaType, RGBColor[]> = {
    Keyboard: [...PRESET_STATIC_COLORS, { r: 255, g: 0, b: 0, hex: '#FF0000' }],
    Decorate1: [...PRESET_STATIC_COLORS, { r: 255, g: 0, b: 0, hex: '#FF0000' }],
  };

  /**
   * Queries whether the hardware supports upper and lower lighting (Double Lighting)
   * Command: [0x02, 0x0A, 0x00] (Global, DoubleLightingQuery, ReadList)
   */
  public async queryDoubleLighting(): Promise<boolean> {
    try {
      const cmd = [PROTOCOL_V2.GLOBAL, 0x0a, 0x00];
      const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x0a;
      });
      this.hasDoubleLighting = res.raw[3] > 0;
      return this.hasDoubleLighting;
    } catch {
      return true;
    }
  }

  /**
   * Queries hardware light areas (Keyboard, Decorate1...)
   * Command: [0x02, 0x08, 0x00] (Global, EffectAreaQuery, ReadList)
   */
  public async queryLightAreas(): Promise<LightAreaInfo[]> {
    try {
      const cmd = [PROTOCOL_V2.GLOBAL, 0x08, 0x00];
      const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x08;
      });
      const total = res.raw[3] || 0;
      const areas: LightAreaInfo[] = [];
      for (let i = 0; i < total; i++) {
        const offset = 4 + i * 4;
        areas.push({
          index: res.raw[offset],
          count: res.raw[offset + 1],
          rows: res.raw[offset + 2],
          cols: res.raw[offset + 3],
        });
      }
      this.availableAreas = areas;
      return areas;
    } catch {
      return [{ index: 0, count: 64, rows: 6, cols: 21 }];
    }
  }

  /**
   * Reads basic lighting configuration for an area
   * Command: [0x05, 0x01, area, 0x00] (Lighting, Read, Area, Base)
   */
  public async getLightingBase(area: LightAreaType = 'Keyboard'): Promise<LightingBaseConfig> {
    const areaVal = LIGHT_AREA_MAP[area];
    const cmd = [PROTOCOL_V2.LIGHTING, CRW.READ, areaVal, 0x00];

    try {
      const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.LIGHTING &&
          p.raw[1] === CRW.READ &&
          p.raw[2] === areaVal &&
          p.raw[3] === 0x00
        );
      });

      const openByte = res.raw[4];
      let openState: 'Close' | 'OpenDown' | 'OpenUp' | 'Open' = 'Open';
      if (area === 'Decorate1') {
        openState = openByte === 0 ? 'Close' : 'Open';
      } else {
        if (openByte === 0) openState = 'Close';
        else if (openByte === 1) openState = 'OpenDown';
        else if (openByte === 2) openState = 'OpenUp';
        else openState = 'Open';
      }

      // Firmware mode is 0-based: 0 = L1 (Static), 19 = L20 (Reactive Flash)
      const rawMode = res.raw[5] ?? 0;
      const maxModes = area === 'Decorate1' ? 5 : 20;
      const modeId = Math.max(1, Math.min(maxModes, rawMode + 1));

      const config: LightingBaseConfig = {
        area,
        open: openState,
        mode: modeId,
        luminance: res.raw[6] ?? 80,
        speed: res.raw[7] ?? 80,
        direction: res.raw[8] === 1 ? 1 : 0,
        selectStaticColor: res.raw[9] ?? 0,
      };

      this.baseConfigCache[area] = config;
      return config;
    } catch {
      return this.baseConfigCache[area] || DEFAULT_LIGHTING_BASE;
    }
  }

  /**
   * Sets basic lighting configuration for an area
   * Command: [0x05, 0x02, area, 0x00, switchVal, firmwareMode, luminance, speed, direction, selectStaticColor]
   */
  public async setLightingBase(config: LightingBaseConfig): Promise<boolean> {
    const areaVal = LIGHT_AREA_MAP[config.area];
    let switchVal = 3;
    if (config.area === 'Decorate1') {
      switchVal = config.open === 'Close' ? 0 : 1;
    } else {
      if (config.open === 'Close') switchVal = 0;
      else if (config.open === 'OpenDown') switchVal = 1;
      else if (config.open === 'OpenUp') switchVal = 2;
      else if (config.open === 'Open') switchVal = 3;
    }

    // Convert 1-based modeId (L1..L20) to 0-based firmwareMode (0..19)
    const firmwareMode = Math.max(0, Math.min(19, (config.mode - 1) & 0xff));

    const cmd = [
      PROTOCOL_V2.LIGHTING,
      CRW.WRITE,
      areaVal,
      0x00, // Base setting
      switchVal,
      firmwareMode,
      Math.max(0, Math.min(100, Math.round(config.luminance))),
      Math.max(0, Math.min(100, Math.round(config.speed))),
      config.direction === 1 ? 1 : 0,
      config.selectStaticColor & 0xff,
    ];

    try {
      await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.LIGHTING &&
          p.raw[1] === CRW.WRITE &&
          p.raw[2] === areaVal &&
          p.raw[3] === 0x00
        );
      });
      this.baseConfigCache[config.area] = { ...config };
      return true;
    } catch (err) {
      console.warn('setLightingBase failed:', err);
      return false;
    }
  }

  /**
   * Reads 8-slot static color palette from hardware
   * Command: [0x05, 0x01, area, 0x01] (Lighting, Read, Area, Palette)
   */
  public async getLightingPalette(area: LightAreaType = 'Keyboard'): Promise<RGBColor[]> {
    const areaVal = LIGHT_AREA_MAP[area];
    const cmd = [PROTOCOL_V2.LIGHTING, CRW.READ, areaVal, 0x01];

    try {
      const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.LIGHTING &&
          p.raw[1] === CRW.READ &&
          p.raw[2] === areaVal &&
          p.raw[3] === 0x01
        );
      });

      const colors: RGBColor[] = [];
      for (let i = 0; i < 8; i++) {
        const offset = 4 + i * 4;
        const b = res.raw[offset] ?? 0;
        const g = res.raw[offset + 1] ?? 0;
        const r = res.raw[offset + 2] ?? 0;
        colors.push({ r, g, b, hex: rgbToHex(r, g, b) });
      }
      this.paletteCache[area] = colors;
      return colors;
    } catch {
      return this.paletteCache[area] || PRESET_STATIC_COLORS;
    }
  }

  /**
   * Writes 8-slot static color palette to hardware
   * Command: [0x05, 0x02, area, 0x01, ...32 bytes BGRH]
   */
  public async setLightingPalette(
    area: LightAreaType = 'Keyboard',
    colors: RGBColor[],
  ): Promise<boolean> {
    const areaVal = LIGHT_AREA_MAP[area];
    const payload = [PROTOCOL_V2.LIGHTING, CRW.WRITE, areaVal, 0x01];

    for (let i = 0; i < 8; i++) {
      const c = colors[i] || PRESET_STATIC_COLORS[i] || { r: 255, g: 255, b: 255 };
      payload.push(c.b & 0xff, c.g & 0xff, c.r & 0xff, 0); // B, G, R, H
    }

    try {
      await keyboardHID.sendCommand(payload, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.LIGHTING &&
          p.raw[1] === CRW.WRITE &&
          p.raw[2] === areaVal &&
          p.raw[3] === 0x01
        );
      });
      this.paletteCache[area] = [...colors];
      return true;
    } catch (err) {
      console.warn('setLightingPalette failed:', err);
      return false;
    }
  }

  /**
   * Updates custom static color slot and immediately applies it to hardware
   */
  public async applyCustomColor(area: LightAreaType, customColor: RGBColor): Promise<boolean> {
    try {
      // Build updated 8-slot palette where slot 7 is the custom color
      const current = [...(this.paletteCache[area] || PRESET_STATIC_COLORS)];
      while (current.length < 8) {
        current.push({ r: 255, g: 255, b: 255, hex: '#FFFFFF' });
      }
      current[7] = { ...customColor, hex: customColor.hex || rgbToHex(customColor.r, customColor.g, customColor.b) };

      // 1. Write the palette
      await this.setLightingPalette(area, current);

      // 2. Select slot 7 in base config
      const base = this.baseConfigCache[area] || DEFAULT_LIGHTING_BASE;
      const updatedBase: LightingBaseConfig = {
        ...base,
        area,
        selectStaticColor: 7, // Select custom color slot
      };
      await this.setLightingBase(updatedBase);
      return true;
    } catch (err) {
      console.warn('applyCustomColor failed:', err);
      return false;
    }
  }

  /**
   * Persists lighting parameters to onboard flash memory
   * Command: [0x02, 0x02, 0x02] (Global, SaveParam, Lighting)
   */
  public async saveLightingToFlash(): Promise<boolean> {
    try {
      const cmd = [PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SAVE_PARAM, 0x02];
      await keyboardHID.sendCommand(cmd, 2000, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === GLOBAL_CMD.SAVE_PARAM;
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sets per-key custom RGB lighting for Keyboard area.
   * Maps 6x21 matrix layout into 9 chunked packets of 15 keys each.
   * Command: [0x05, 0x04, 0x00, pIdx, ...15 * [B, G, R, alpha]]
   */
  public async setPerKeyCustomLighting(
    keyColors: Record<string, RGBColor>,
    matrixRows: number = 6,
    matrixCols: number = 21,
  ): Promise<boolean> {
    const areaVal = LIGHT_AREA_MAP.Keyboard;
    const PACK_SIZE = 15;
    const totalKeys = matrixRows * matrixCols; // 126 cells
    const totalPacks = Math.ceil(totalKeys / PACK_SIZE); // 9 packets

    try {
      // Flatten 6x21 matrix cells
      const flatCells: Array<{ b: number; g: number; r: number; alpha: number }> = [];
      for (let r = 0; r < matrixRows; r++) {
        for (let c = 0; c < matrixCols; c++) {
          const keyId = `${r}-${c}`;
          const col = keyColors[keyId];
          if (col) {
            flatCells.push({ b: col.b & 0xff, g: col.g & 0xff, r: col.r & 0xff, alpha: 255 });
          } else {
            flatCells.push({ b: 0, g: 0, r: 0, alpha: 0 }); // Transparent / default
          }
        }
      }

      for (let pIdx = 0; pIdx < totalPacks; pIdx++) {
        const slice = flatCells.slice(pIdx * PACK_SIZE, (pIdx + 1) * PACK_SIZE);
        const payload: number[] = [
          PROTOCOL_V2.LIGHTING,
          0x04, // Custom Lighting Protocol
          areaVal,
          pIdx,
        ];

        for (const cell of slice) {
          payload.push(cell.b, cell.g, cell.r, cell.alpha);
        }

        // Pad to exactly 15 keys (60 bytes)
        while (payload.length < 4 + PACK_SIZE * 4) {
          payload.push(0, 0, 0, 0);
        }

        await keyboardHID.sendCommand(payload, 800, (p) => {
          return p.protocol === PROTOCOL_V2.LIGHTING && p.raw[1] === 0x04 && p.raw[3] === pIdx;
        });
      }
      return true;
    } catch (err) {
      console.warn('setPerKeyCustomLighting failed:', err);
      return false;
    }
  }

  /**
   * Sets custom RGB lighting for Decorative1 (Light Bar: 29 LEDs total).
   * Row 1: 17 LEDs, Row 2: 12 LEDs.
   * Sends 2 packets of 15 LEDs each.
   * Command: [0x05, 0x04, 0x01, pIdx, ...15 * [B, G, R, alpha]]
   */
  public async setDecorateCustomLighting(
    ledColors: Record<number, RGBColor>,
    totalLeds: number = 29,
  ): Promise<boolean> {
    const areaVal = LIGHT_AREA_MAP.Decorate1;
    const PACK_SIZE = 15;
    const totalPacks = Math.ceil(totalLeds / PACK_SIZE); // 2 packets

    try {
      const flatLeds: Array<{ b: number; g: number; r: number; alpha: number }> = [];
      for (let i = 0; i < totalLeds; i++) {
        const col = ledColors[i];
        if (col) {
          flatLeds.push({ b: col.b & 0xff, g: col.g & 0xff, r: col.r & 0xff, alpha: 255 });
        } else {
          flatLeds.push({ b: 0, g: 0, r: 0, alpha: 0 });
        }
      }

      for (let pIdx = 0; pIdx < totalPacks; pIdx++) {
        const slice = flatLeds.slice(pIdx * PACK_SIZE, (pIdx + 1) * PACK_SIZE);
        const payload: number[] = [
          PROTOCOL_V2.LIGHTING,
          0x04,
          areaVal,
          pIdx,
        ];

        for (const cell of slice) {
          payload.push(cell.b, cell.g, cell.r, cell.alpha);
        }

        // Pad to exactly 15 keys
        while (payload.length < 4 + PACK_SIZE * 4) {
          payload.push(0, 0, 0, 0);
        }

        await keyboardHID.sendCommand(payload, 800, (p) => {
          return p.protocol === PROTOCOL_V2.LIGHTING && p.raw[1] === 0x04 && p.raw[3] === pIdx;
        });
      }
      return true;
    } catch (err) {
      console.warn('setDecorateCustomLighting failed:', err);
      return false;
    }
  }
}

export const lightingController = new LightingController();
