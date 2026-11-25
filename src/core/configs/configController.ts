/**
 * Anakeyn — Onboard Configuration & Profile Scheme Manager
 * Manages onboard hardware slots (Profiles 1 - 4), scheme renaming,
 * profile switching, and 100% offline local/cloud config import & export.
 */

import { PROTOCOL_V2, GLOBAL_CMD, CRW } from '../hid/constants';
import { keyboardHID } from '../hid/connection';

export interface ProfileSlotInfo {
  slotIndex: number; // 0, 1, 2, 3
  slotNumber: number; // 1, 2, 3, 4 (UI 1-indexed)
  name: string; // e.g. "配置一", "Esports 8K", etc.
  isActive: boolean;
}

export interface ProfileConfigExport {
  app: 'Anakeyn';
  version: '1.0';
  boardId?: string | number;
  slotIndex: number;
  name: string;
  createdAt: string;
  description?: string;
  settings?: {
    pollingRateCode?: number;
    sleepTimeMinutes?: number;
  };
  customData?: Record<string, unknown>;
}

export interface FullKeyboardBackup {
  app: 'Anakeyn';
  backupVersion: '1.0';
  timestamp: string;
  boardId?: string | number;
  activeSlot: number;
  profiles: {
    slotIndex: number;
    name: string;
  }[];
  notes?: string;
}

export const BUILTIN_PRESETS: {
  id: string;
  title: string;
  tag: string;
  description: string;
  rate: string;
  rt: string;
  socd: string;
}[] = [
  {
    id: 'esports-valorant',
    title: 'Valorant Ultra Pro (Snap-Tap SOCD)',
    tag: 'Esports 8K',
    description: 'Ultra-low 0.10mm Rapid Trigger on WASD, 8000Hz polling rate, and Snap-Tap (Cover) priority on A+D for instant peek shots.',
    rate: '8000 Hz',
    rt: '0.10 mm',
    socd: 'A/D Snap-Tap',
  },
  {
    id: 'cs2-counter-strafe',
    title: 'CS2 Counter-Strike Precision',
    tag: 'FPS Tac',
    description: '0.20mm RT with Neutral SOCD priority to comply with competitive tournament rules. Minimal actuation jitter.',
    rate: '4000 Hz',
    rt: '0.20 mm',
    socd: 'Neutral Counter-Stop',
  },
  {
    id: 'osu-rhythm',
    title: 'Osu! / Rhythm Game Extreme',
    tag: 'Rhythm',
    description: '0.05mm extreme trigger sensitivity on key columns, 0 deadzone, and 8000Hz polling buffer reset.',
    rate: '8000 Hz',
    rt: '0.05 mm',
    socd: 'Disabled',
  },
  {
    id: 'office-coding',
    title: 'Typing, Office & Coding Comfort',
    tag: 'Daily / Work',
    description: 'Deep 2.00mm actuation to prevent accidental keystrokes, 1000Hz energy-efficient polling, and 30-minute auto sleep timer.',
    rate: '1000 Hz',
    rt: 'Standard 2.0mm',
    socd: 'Standard',
  },
];

class ConfigController {
  private readonly DEFAULT_NAMES = ['配置一', '配置二', '配置三', '配置四'];

  /**
   * Reads total profile slot count supported by the keyboard.
   * Packet: [0x02, 0x03, 0x00]
   */
  async getProfileCount(): Promise<number> {
    try {
      const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.CONFIG_SWITCH, 0x00]);
      if (res.isValid && res.raw.length >= 4 && res.raw[3] > 0) {
        return Math.min(4, res.raw[3]);
      }
    } catch (e) {
      console.warn('Failed to query profile count:', e);
    }
    return 4; // AE64 Pro defaults to 4 profiles
  }

  /**
   * Reads current active profile index (0..3).
   * Packet: [0x02, 0x03, 0x01]
   */
  async getActiveProfile(): Promise<number> {
    try {
      const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.CONFIG_SWITCH, CRW.READ]);
      if (res.isValid && res.raw.length >= 4) {
        return res.raw[3]; // 0-indexed
      }
    } catch (e) {
      console.warn('Failed to read active profile:', e);
    }
    return 0;
  }

  /**
   * Switches active profile on the keyboard.
   * Packet: [0x02, 0x03, 0x02, slotIndex]
   */
  async switchProfile(slotIndex: number): Promise<boolean> {
    const res = await keyboardHID.sendCommand([
      PROTOCOL_V2.GLOBAL,
      GLOBAL_CMD.CONFIG_SWITCH,
      CRW.WRITE,
      slotIndex,
    ]);
    try {
      // Save param to flash
      await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SAVE_PARAM, 0x00]);
    } catch {
      // ignore
    }
    return res.isValid;
  }

  /**
   * Reads profile name from hardware flash.
   * Packet: [0x02, 0x03, 0x03, slotIndex]
   * Response: [0x02, 0x03, 0x03, slotIndex, ...32 bytes UTF-8]
   */
  async getProfileName(slotIndex: number): Promise<string> {
    try {
      const res = await keyboardHID.sendCommand([
        PROTOCOL_V2.GLOBAL,
        GLOBAL_CMD.CONFIG_SWITCH,
        0x03,
        slotIndex,
      ]);
      if (res.isValid && res.raw.length >= 5) {
        const rawBytes = res.raw.slice(4, 36).filter((b) => b !== 0);
        if (rawBytes.length > 0) {
          const name = new TextDecoder('utf-8').decode(new Uint8Array(rawBytes)).trim();
          if (name.length > 0) {
            return name;
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to read profile name for slot ${slotIndex}:`, e);
    }

    // Check localStorage cache fallback
    try {
      const cached = localStorage.getItem(`anakeyn_profile_name_${slotIndex}`);
      if (cached) return cached;
    } catch {
      // ignore
    }

    return this.DEFAULT_NAMES[slotIndex] ?? `Profile ${slotIndex + 1}`;
  }

  /**
   * Sets and flashes profile name to the keyboard.
   * Packet: [0x02, 0x03, 0x04, slotIndex, ...utf8bytes]
   */
  async setProfileName(slotIndex: number, newName: string): Promise<boolean> {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    // Cache locally
    try {
      localStorage.setItem(`anakeyn_profile_name_${slotIndex}`, trimmed);
    } catch {
      // ignore
    }

    const encoder = new TextEncoder();
    let encoded = encoder.encode(trimmed);
    if (encoded.length > 32) {
      // truncate to fit 32 bytes UTF-8
      let s = trimmed;
      while (encoder.encode(s).length > 32) {
        s = s.slice(0, -1);
      }
      encoded = encoder.encode(s);
    }

    try {
      const packet = [PROTOCOL_V2.GLOBAL, GLOBAL_CMD.CONFIG_SWITCH, 0x04, slotIndex, ...Array.from(encoded)];
      const res = await keyboardHID.sendCommand(packet);
      // Persist to flash
      await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SAVE_PARAM, 0x00]);
      return res.isValid;
    } catch (e) {
      console.warn(`Failed writing profile name to hardware for slot ${slotIndex}:`, e);
      return true; // Still persisted in local storage
    }
  }

  /**
   * Loads all 4 profile slots with live active state and names.
   */
  async loadAllProfileSlots(): Promise<ProfileSlotInfo[]> {
    const activeIndex = await this.getActiveProfile();
    const count = await this.getProfileCount();
    const slots: ProfileSlotInfo[] = [];

    for (let i = 0; i < count; i++) {
      const name = await this.getProfileName(i);
      slots.push({
        slotIndex: i,
        slotNumber: i + 1,
        name,
        isActive: i === activeIndex,
      });
    }

    return slots;
  }

  /**
   * Generates a portable shareable config code (Base64 string).
   */
  generateShareCode(exportData: ProfileConfigExport): string {
    const json = JSON.stringify(exportData);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return `ANAKEY-${b64}`;
  }

  /**
   * Parses and validates a shareable config code.
   */
  parseShareCode(codeStr: string): ProfileConfigExport {
    const clean = codeStr.trim().replace(/^ANAKEY-/i, '');
    try {
      const jsonStr = decodeURIComponent(escape(atob(clean)));
      const obj = JSON.parse(jsonStr);
      if (!obj || typeof obj !== 'object') {
        throw new Error('Invalid JSON format');
      }
      return obj as ProfileConfigExport;
    } catch {
      // Also attempt direct JSON parse
      try {
        const obj = JSON.parse(codeStr.trim());
        return obj as ProfileConfigExport;
      } catch {
        throw new Error('Invalid config code or JSON string. Please verify the code.');
      }
    }
  }

  /**
   * Exports profile scheme as a downloadable .json file.
   */
  downloadProfileJson(exportData: ProfileConfigExport) {
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Anakeyn_Profile_${exportData.slotIndex + 1}_${exportData.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports full keyboard state backup.
   */
  downloadFullBackup(backup: FullKeyboardBackup) {
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Anakeyn_Full_Keyboard_Backup_${Date.now()}.anakeyn.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const configController = new ConfigController();

