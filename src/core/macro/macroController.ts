/**
 * Anakeyn — Hardware Macro Controller
 * Interacts with SparkLink Protocol V2 Macro Category (0x07) and Global Macro Space (0x02, 0x0E).
 * Supports 16 hardware macros (M0 - M15), 6 playback trigger modes, repeat counts,
 * and up to 960 individual millisecond-accurate keystroke actions.
 */

import { PROTOCOL_V2, GLOBAL_CMD } from '../hid/constants';
import { keyboardHID } from '../hid/connection';

export interface MacroAction {
  status: 1 | 0; // 1 = Press / Down, 0 = Release / Up
  delay: number; // in milliseconds (0 to 32767)
  keyCode: number; // HID keyCode (e.g. 4 for A)
}

export interface MacroModeConfig {
  macroId: number; // 0 to 15
  mode: number; // 0 to 5
  valid: boolean; // whether macro slot has valid data
  actNum: number; // number of actions in the macro
  repNum: number; // repeat count (for modes 0-3)
}

export interface MacroSpaceInfo {
  macroCount: number; // e.g. 16
  macroNumber: number; // max total macro actions (e.g. 960)
}

/**
 * 6 Hardware Macro Playback Trigger Modes matching Everglide AE64 Pro firmware:
 * 0: Click: repeat N times, re-click: ignored (点击执行，重复n次，执行期间再次点击无效)
 * 1: Click: repeat N times, re-click: restart (点击执行，重复n次，执行期间再次点击重新执行)
 * 2: Click: repeat N times, re-click: stop now (点击执行，重复n次，执行期间再次点击立即停止)
 * 3: Click: repeat N times, re-click: stop after current (点击执行，重复n次，执行期间再次点击完成本次后停止)
 * 4: Hold: repeat, release: stop now (按住执行，重复次数无限，松开后立即停止)
 * 5: Hold: repeat, release: stop after current (按住执行，重复次数无限，松开后完成本次后停止)
 */
export const MACRO_MODES = [
  {
    mode: 0,
    label: 'Click: repeat N, re-click: ignored',
    desc: 'Runs the macro N times. Re-clicking while running is ignored.',
    needsRepeatInput: true,
  },
  {
    mode: 1,
    label: 'Click: repeat N, re-click: restart',
    desc: 'Runs the macro N times. Re-clicking interrupts and restarts from beginning.',
    needsRepeatInput: true,
  },
  {
    mode: 2,
    label: 'Click: repeat N, re-click: stop now',
    desc: 'Runs the macro N times. Re-clicking halts execution immediately.',
    needsRepeatInput: true,
  },
  {
    mode: 3,
    label: 'Click: repeat N, re-click: stop after current',
    desc: 'Runs the macro N times. Re-clicking allows the current cycle to finish, then stops.',
    needsRepeatInput: true,
  },
  {
    mode: 4,
    label: 'Hold: repeat, release: stop now',
    desc: 'Repeats infinitely while key is held down. Stops immediately when released.',
    needsRepeatInput: false,
  },
  {
    mode: 5,
    label: 'Hold: repeat, release: stop after current',
    desc: 'Repeats infinitely while key is held down. Finishes current cycle before stopping on release.',
    needsRepeatInput: false,
  },
];

/**
 * Packs single macro action into 4 bytes (UInt32 LE):
 * - bit 31: status (1 = Down, 0 = Up)
 * - bits 16-30: delay in ms (0 to 32767)
 * - bits 0-15: keyCode (HID code)
 */
export function buildMacroAction(status: number, delay: number, keyCode: number): number[] {
  const clampedDelay = Math.max(0, Math.min(32767, Math.round(delay)));
  const statusBit = status === 1 ? 1 : 0;
  const packed = (statusBit << 31) | (clampedDelay << 16) | (keyCode & 0xffff);
  return [
    packed & 0xff,
    (packed >>> 8) & 0xff,
    (packed >>> 16) & 0xff,
    (packed >>> 24) & 0xff,
  ];
}

/**
 * Decodes 4 bytes (UInt32 LE) into a MacroAction object
 */
export function decodeMacroBytesArrayLE(bytes: number[] | Uint8Array): MacroAction {
  const packed = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
  const status = ((packed >>> 31) & 1) as 1 | 0;
  const delay = (packed >>> 16) & 0x7fff;
  const keyCode = packed & 0xffff;
  return { status, delay, keyCode };
}

/**
 * Ensures macro actions are safe and well-formed for keyboard firmware:
 * 1. Guarantees every pressed key is released (prevents stuck keys).
 * 2. Removes consecutive duplicate presses for the same key.
 * 3. Enforces a minimum delay of at least 1ms (prevents USB HID drops).
 */
export function sanitizeMacroActions(actions: MacroAction[]): MacroAction[] {
  if (actions.length === 0) return [];

  const sanitized: MacroAction[] = [];
  const currentlyHeldKeys = new Set<number>();

  for (const a of actions) {
    if (a.keyCode === 0) continue;
    const delay = Math.max(1, Math.min(32767, Math.round(a.delay || 1)));

    if (a.status === 1) {
      // If already pressed, insert a release first to avoid firmware state desync
      if (currentlyHeldKeys.has(a.keyCode)) {
        sanitized.push({
          status: 0,
          delay: 10,
          keyCode: a.keyCode,
        });
      }
      currentlyHeldKeys.add(a.keyCode);
      sanitized.push({
        status: 1,
        delay,
        keyCode: a.keyCode,
      });
    } else {
      currentlyHeldKeys.delete(a.keyCode);
      sanitized.push({
        status: 0,
        delay,
        keyCode: a.keyCode,
      });
    }
  }

  // Auto-release any keys that were left pressed at the end
  for (const key of currentlyHeldKeys) {
    sanitized.push({
      status: 0,
      delay: 10,
      keyCode: key,
    });
  }

  return sanitized;
}

export class MacroController {
  public spaceInfo: MacroSpaceInfo = {
    macroCount: 16,
    macroNumber: 960,
  };

  /**
   * Queries hardware macro space info
   * Command: [0x02, 0x0E, 0x00] (Global, MacroSpaceInfoQuery)
   */
  public async getMacroSpaceInfo(): Promise<MacroSpaceInfo> {
    try {
      const cmd = [PROTOCOL_V2.GLOBAL, 0x0e, 0x00];
      const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x0e;
      });
      const macroCount = res.raw[3] || 16;
      const macroNumber = res.raw[4] | ((res.raw[5] || 0) << 8);
      this.spaceInfo = {
        macroCount,
        macroNumber: macroNumber || 960,
      };
      return this.spaceInfo;
    } catch {
      return this.spaceInfo;
    }
  }

  /**
   * Reads playback mode and metadata for a specific macro ID
   * Command: [0x07, 0x01, macroId] (Macro, GetMacroMode, macroId)
   */
  public async getMacroMode(macroId: number): Promise<MacroModeConfig> {
    const cmd = [PROTOCOL_V2.MACRO, 0x01, macroId & 0xff];
    try {
      const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.MACRO &&
          p.raw[1] === 0x01 &&
          p.raw[2] === (macroId & 0xff)
        );
      });

      const valid = res.raw[3] === 1;
      const actNum = res.raw[4] | (res.raw[5] << 8);
      const repNum = res.raw[6] | (res.raw[7] << 8);
      const mode = res.raw[8] ?? 0;

      return {
        macroId,
        mode,
        valid,
        actNum,
        repNum,
      };
    } catch {
      return {
        macroId,
        mode: 0,
        valid: false,
        actNum: 0,
        repNum: 1,
      };
    }
  }

  /**
   * Writes playback mode and metadata for a specific macro ID
   * Command: [0x07, 0x02, macroId, valid, actNumLow, actNumHigh, repNumLow, repNumHigh, mode]
   */
  public async setMacroMode(
    macroId: number,
    mode: number,
    valid: boolean,
    actNum: number,
    repNum: number,
  ): Promise<boolean> {
    const cmd = [
      PROTOCOL_V2.MACRO,
      0x02, // SetMacroMode
      macroId & 0xff,
      valid ? 1 : 0,
      actNum & 0xff,
      (actNum >> 8) & 0xff,
      repNum & 0xff,
      (repNum >> 8) & 0xff,
      mode & 0xff,
    ];

    try {
      await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.MACRO &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (macroId & 0xff)
        );
      });
      return true;
    } catch (err) {
      console.warn('setMacroMode failed:', err);
      return false;
    }
  }

  /**
   * Reads 1 page (15 actions) of macro data at the given offset
   * Command: [0x07, 0x03, macroId, offset] (Macro, GetMacro)
   */
  public async getMacroData(macroId: number, offset: number): Promise<MacroAction[]> {
    const cmd = [PROTOCOL_V2.MACRO, 0x03, macroId & 0xff, offset & 0xff];
    try {
      const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.MACRO &&
          p.raw[1] === 0x03 &&
          p.raw[2] === (macroId & 0xff) &&
          p.raw[3] === (offset & 0xff)
        );
      });

      const actions: MacroAction[] = [];
      const dataSlice = res.raw.slice(4, 4 + 60);
      for (let i = 0; i < dataSlice.length; i += 4) {
        const chunk = dataSlice.slice(i, i + 4);
        if (chunk.length === 4) {
          actions.push(decodeMacroBytesArrayLE(chunk));
        }
      }
      return actions;
    } catch {
      return [];
    }
  }

  /**
   * Writes 1 page (up to 15 actions) of macro data at the given offset
   * Command: [0x07, 0x04, macroId, offset, ...60 bytes] (Macro, SetMacro)
   */
  public async setMacroData(
    macroId: number,
    offset: number,
    actions: MacroAction[],
  ): Promise<boolean> {
    const payload = [
      PROTOCOL_V2.MACRO,
      0x04, // SetMacro
      macroId & 0xff,
      offset & 0xff,
    ];

    for (const a of actions.slice(0, 15)) {
      payload.push(...buildMacroAction(a.status, a.delay, a.keyCode));
    }

    // Pad to 60 bytes (15 actions * 4 bytes)
    while (payload.length < 4 + 60) {
      payload.push(0, 0, 0, 0);
    }

    try {
      await keyboardHID.sendCommand(payload, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.MACRO &&
          p.raw[1] === 0x04 &&
          p.raw[2] === (macroId & 0xff) &&
          p.raw[3] === (offset & 0xff)
        );
      });
      return true;
    } catch (err) {
      console.warn('setMacroData failed:', err);
      return false;
    }
  }

  /**
   * Reads all pages of actions for a macro
   */
  public async readFullMacro(
    macroId: number,
  ): Promise<{ config: MacroModeConfig; actions: MacroAction[] }> {
    const config = await this.getMacroMode(macroId);
    if (!config.valid || config.actNum === 0) {
      return { config, actions: [] };
    }

    const totalPages = Math.ceil(config.actNum / 15);
    const allActions: MacroAction[] = [];

    for (let offset = 0; offset < totalPages; offset++) {
      const pageActions = await this.getMacroData(macroId, offset);
      allActions.push(...pageActions);
    }

    // Trim padding actions to exact actNum
    return {
      config: {
        ...config,
        repNum: (config.repNum ?? 0) + 1, // Convert from protocol repeat count (0 = 1 run) to UI count
      },
      actions: allActions.slice(0, config.actNum),
    };
  }

  /**
   * Writes full sequence of actions to a macro, updates mode and saves to flash
   */
  public async writeFullMacro(
    macroId: number,
    actions: MacroAction[],
    mode: number = 0,
    repNum: number = 1,
  ): Promise<boolean> {
    const safeActions = sanitizeMacroActions(actions);
    const actNum = safeActions.length;
    const isValid = actNum > 0;
    const totalPages = Math.max(1, Math.ceil(actNum / 15));
    // SparkLink protocol: repNum = 0 means execute once (0 repeats).
    const protoRepNum = Math.max(0, repNum - 1);

    try {
      // 1. Write all action chunks
      for (let offset = 0; offset < totalPages; offset++) {
        const slice = safeActions.slice(offset * 15, (offset + 1) * 15);
        await this.setMacroData(macroId, offset, slice);
      }

      // 2. Set macro mode config
      await this.setMacroMode(macroId, mode, isValid, actNum, protoRepNum);

      // 3. Persist to flash
      await this.saveMacroToFlash();

      return true;
    } catch (err) {
      console.warn('writeFullMacro failed:', err);
      return false;
    }
  }

  /**
   * Clears a macro slot on hardware
   */
  public async clearMacro(macroId: number): Promise<boolean> {
    try {
      // Send 1 empty chunk
      await this.setMacroData(macroId, 0, []);
      // Set valid = false, actNum = 0
      await this.setMacroMode(macroId, 0, false, 0, 1);
      await this.saveMacroToFlash();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Persists macro configuration to onboard flash
   * Command: [0x02, 0x02, 0x06] (Global, SaveParam, Macro)
   */
  public async saveMacroToFlash(): Promise<boolean> {
    try {
      const cmd = [PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SAVE_PARAM, 0x06];
      await keyboardHID.sendCommand(cmd, 2000, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === GLOBAL_CMD.SAVE_PARAM;
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const macroController = new MacroController();
