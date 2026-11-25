/**
 * Anakeyn — HigherKey (Advanced Magnetic Keys) Controller
 * Interacts with SparkLink Protocol V2 HigherKey Category (0x06) and Global Parameter Save (0x02, 0x02, 0x05).
 * Supports:
 * - SOCD (Snap Tap / Simultaneous Opposing Cardinal Directions): Last Override, A/B Priority, Neutralize
 * - DKS (Dynamic Keystroke): 4-depth travel stroke actions
 * - MT (Mod-Tap): Tap for keycode, Hold for modifier
 * - TGL (Toggle Key): Tap to lock/hold, tap again to release
 * - MPT (Multi-Point Trigger) & RS (Rapid Switch)
 */

import { PROTOCOL_V2, GLOBAL_CMD } from '../hid/constants';
import { keyboardHID } from '../hid/connection';
import type { KeyMatrixItem } from '../keys/layout';

export const HigherKeyType = {
  NONE: 0x00,
  DKS: 0x01,
  MPT: 0x02,
  MT: 0x03,
  TGL: 0x04,
  END: 0x05,
  SOCD: 0x06,
  RS: 0x07,
  MDS: 0x08,
  TURBO: 0x09,
} as const;
export type HigherKeyType = (typeof HigherKeyType)[keyof typeof HigherKeyType];

export const SOCDMode = {
  LastOverride: 0, // 后覆盖 (Snap Tap - latest press overrides previous)
  PriorityA: 1,    // A优先 (Key A always wins)
  PriorityB: 2,    // B优先 (Key B always wins)
  Neutralize: 3,   // 中性 (Both cancel out)
} as const;
export type SOCDMode = (typeof SOCDMode)[keyof typeof SOCDMode];

export interface HigherKeyInfo {
  row: number;
  col: number;
  mode: HigherKeyType;
  // SOCD Data
  socd?: {
    row2: number;
    col2: number;
    kcs: [number, number];
    delay: number;
    socdMode: SOCDMode;
  };
  // DKS Data
  dks?: {
    kcs: [number, number, number, number];
    trps: [number, number, number, number];
    dbs: [number, number]; // [minMm, maxMm]
  };
  // MPT Data
  mpt?: {
    kcs: [number, number, number];
    dbs: [number, number, number];
  };
  // MT Data
  mt?: {
    kcs: [number, number]; // [tap, hold]
    time: number; // ms
  };
  // TGL Data
  tgl?: {
    kcs: number;
    time: number;
  };
  // END Data
  end?: {
    kcs: [number, number];
    delay: number;
  };
  // RS Data
  rs?: {
    row2: number;
    col2: number;
    kcs: [number, number];
    delay: number;
  };
}

const u16 = (low: number, high: number) => (high << 8) | low;
const splitU16 = (val: number): [number, number] => [val & 0xff, (val >> 8) & 0xff];

export class HigherKeyController {
  /**
   * Queries the HigherKey configuration for a specific matrix key (row, col)
   * Command: [0x06, 0x01, row, col, 0x00]
   */
  public async getHigherKey(row: number, col: number): Promise<HigherKeyInfo> {
    const cmd = [PROTOCOL_V2.HIGHER_KEY, 0x01, row & 0xff, col & 0xff, 0x00];
    try {
      const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x01 &&
          p.raw[2] === (row & 0xff) &&
          p.raw[3] === (col & 0xff)
        );
      });

      const mode = (res.raw[4] ?? 0) as HigherKeyType;
      const info: HigherKeyInfo = { row, col, mode };

      if (mode === HigherKeyType.SOCD) {
        info.socd = {
          row2: res.raw[5],
          col2: res.raw[6],
          kcs: [u16(res.raw[7], res.raw[8]), u16(res.raw[9], res.raw[10])],
          delay: u16(res.raw[11], res.raw[12]),
          socdMode: (res.raw[13] ?? 0) as SOCDMode,
        };
      } else if (mode === HigherKeyType.DKS) {
        info.dks = {
          kcs: [
            u16(res.raw[5], res.raw[6]),
            u16(res.raw[7], res.raw[8]),
            u16(res.raw[9], res.raw[10]),
            u16(res.raw[11], res.raw[12]),
          ],
          trps: [res.raw[13], res.raw[14], res.raw[15], res.raw[16]],
          dbs: [u16(res.raw[17], res.raw[18]) / 1000, u16(res.raw[19], res.raw[20]) / 1000],
        };
      } else if (mode === HigherKeyType.MPT) {
        info.mpt = {
          kcs: [
            u16(res.raw[5], res.raw[6]),
            u16(res.raw[7], res.raw[8]),
            u16(res.raw[9], res.raw[10]),
          ],
          dbs: [
            u16(res.raw[11], res.raw[12]) / 1000,
            u16(res.raw[13], res.raw[14]) / 1000,
            u16(res.raw[15], res.raw[16]) / 1000,
          ],
        };
      } else if (mode === HigherKeyType.MT) {
        info.mt = {
          kcs: [u16(res.raw[5], res.raw[6]), u16(res.raw[7], res.raw[8])],
          time: u16(res.raw[9], res.raw[10]),
        };
      } else if (mode === HigherKeyType.TGL) {
        info.tgl = {
          kcs: u16(res.raw[5], res.raw[6]),
          time: u16(res.raw[7], res.raw[8]),
        };
      } else if (mode === HigherKeyType.END) {
        info.end = {
          kcs: [u16(res.raw[5], res.raw[6]), u16(res.raw[7], res.raw[8])],
          delay: u16(res.raw[9], res.raw[10]),
        };
      } else if (mode === HigherKeyType.RS) {
        info.rs = {
          row2: res.raw[5],
          col2: res.raw[6],
          kcs: [u16(res.raw[7], res.raw[8]), u16(res.raw[9], res.raw[10])],
          delay: u16(res.raw[11], res.raw[12]),
        };
      }

      return info;
    } catch {
      return { row, col, mode: HigherKeyType.NONE };
    }
  }

  /**
   * Deletes an advanced key configuration at (row, col)
   * Command: [0x06, 0x02, row, col, 0x00]
   */
  public async deleteHigherKey(row: number, col: number): Promise<boolean> {
    const cmd = [PROTOCOL_V2.HIGHER_KEY, 0x02, row & 0xff, col & 0xff, 0x00];
    try {
      await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (row & 0xff) &&
          p.raw[3] === (col & 0xff)
        );
      });
      await this.saveHigherKeyToFlash();
      return true;
    } catch (err) {
      console.warn('deleteHigherKey failed:', err);
      return false;
    }
  }

  /**
   * Sets SOCD (Snap Tap) between two keys
   * Sends 2 linked write packets for mutual binding
   */
  public async setSOCD(
    keyA: KeyMatrixItem,
    keyB: KeyMatrixItem,
    socdMode: SOCDMode = SOCDMode.LastOverride,
    delayMs: number = 0,
  ): Promise<boolean> {
    let modeA = 0;
    let modeB = 0;
    if (socdMode === SOCDMode.LastOverride) {
      modeA = 0;
      modeB = 0;
    } else if (socdMode === SOCDMode.PriorityA) {
      modeA = 1;
      modeB = 2;
    } else if (socdMode === SOCDMode.PriorityB) {
      modeA = 2;
      modeB = 1;
    } else if (socdMode === SOCDMode.Neutralize) {
      modeA = 3;
      modeB = 3;
    }

    const [kcA_low, kcA_high] = splitU16(keyA.keycode);
    const [kcB_low, kcB_high] = splitU16(keyB.keycode);
    const [del_low, del_high] = splitU16(Math.max(0, Math.min(32767, delayMs)));

    // Packet 1: Bind Key A -> Key B
    const pack1 = [
      PROTOCOL_V2.HIGHER_KEY,
      0x02,
      keyA.row & 0xff,
      keyA.col & 0xff,
      HigherKeyType.SOCD,
      keyB.row & 0xff,
      keyB.col & 0xff,
      kcA_low,
      kcA_high,
      kcB_low,
      kcB_high,
      del_low,
      del_high,
      modeA,
    ];

    // Packet 2: Bind Key B -> Key A
    const pack2 = [
      PROTOCOL_V2.HIGHER_KEY,
      0x02,
      keyB.row & 0xff,
      keyB.col & 0xff,
      HigherKeyType.SOCD,
      keyA.row & 0xff,
      keyA.col & 0xff,
      kcB_low,
      kcB_high,
      kcA_low,
      kcA_high,
      del_low,
      del_high,
      modeB,
    ];

    try {
      await keyboardHID.sendCommand(pack1, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (keyA.row & 0xff) &&
          p.raw[3] === (keyA.col & 0xff)
        );
      });

      await keyboardHID.sendCommand(pack2, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (keyB.row & 0xff) &&
          p.raw[3] === (keyB.col & 0xff)
        );
      });

      await this.saveHigherKeyToFlash();
      return true;
    } catch (err) {
      console.warn('setSOCD failed:', err);
      return false;
    }
  }

  /**
   * Deletes an SOCD pair (clears both Key A and Key B)
   */
  public async deleteSOCD(keyA: { row: number; col: number }, keyB?: { row: number; col: number }): Promise<boolean> {
    try {
      await this.deleteHigherKey(keyA.row, keyA.col);
      if (keyB) {
        await this.deleteHigherKey(keyB.row, keyB.col);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sets DKS (Dynamic Keystroke) on a key
   */
  public async setDKS(
    row: number,
    col: number,
    kcs: [number, number, number, number],
    trps: [number, number, number, number] = [31, 31, 31, 31],
    dbs: [number, number] = [1.5, 3.0],
  ): Promise<boolean> {
    const kc1 = splitU16(kcs[0]);
    const kc2 = splitU16(kcs[1]);
    const kc3 = splitU16(kcs[2]);
    const kc4 = splitU16(kcs[3]);

    const db1 = splitU16(Math.round(dbs[0] * 1000));
    const db2 = splitU16(Math.round(dbs[1] * 1000));

    const cmd = [
      PROTOCOL_V2.HIGHER_KEY,
      0x02,
      row & 0xff,
      col & 0xff,
      HigherKeyType.DKS,
      ...kc1,
      ...kc2,
      ...kc3,
      ...kc4,
      trps[0] & 0xff,
      trps[1] & 0xff,
      trps[2] & 0xff,
      trps[3] & 0xff,
      ...db1,
      ...db2,
    ];

    try {
      await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (row & 0xff) &&
          p.raw[3] === (col & 0xff)
        );
      });
      await this.saveHigherKeyToFlash();
      return true;
    } catch (err) {
      console.warn('setDKS failed:', err);
      return false;
    }
  }

  /**
   * Sets Mod-Tap (MT) on a key: tap for tapKc, hold for holdKc
   */
  public async setMT(
    row: number,
    col: number,
    tapKc: number,
    holdKc: number,
    timeMs: number = 200,
  ): Promise<boolean> {
    const kc1 = splitU16(tapKc);
    const kc2 = splitU16(holdKc);
    const time = splitU16(Math.max(1, Math.min(2000, timeMs)));

    const cmd = [
      PROTOCOL_V2.HIGHER_KEY,
      0x02,
      row & 0xff,
      col & 0xff,
      HigherKeyType.MT,
      ...kc1,
      ...kc2,
      ...time,
    ];

    try {
      await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (row & 0xff) &&
          p.raw[3] === (col & 0xff)
        );
      });
      await this.saveHigherKeyToFlash();
      return true;
    } catch (err) {
      console.warn('setMT failed:', err);
      return false;
    }
  }

  /**
   * Sets Toggle Key (TGL) on a key
   */
  public async setTGL(
    row: number,
    col: number,
    kc: number,
    delayMs: number = 0,
  ): Promise<boolean> {
    const kcBytes = splitU16(kc);
    const timeBytes = splitU16(delayMs);

    const cmd = [
      PROTOCOL_V2.HIGHER_KEY,
      0x02,
      row & 0xff,
      col & 0xff,
      HigherKeyType.TGL,
      ...kcBytes,
      ...timeBytes,
    ];

    try {
      await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (row & 0xff) &&
          p.raw[3] === (col & 0xff)
        );
      });
      await this.saveHigherKeyToFlash();
      return true;
    } catch (err) {
      console.warn('setTGL failed:', err);
      return false;
    }
  }

  /**
   * Sets MPT (Multi-Point Trigger) on a key: triggers 3 keycodes at 3 different travel depths
   */
  public async setMPT(
    row: number,
    col: number,
    kcs: [number, number, number],
    dbs: [number, number, number] = [1.0, 2.0, 3.0],
  ): Promise<boolean> {
    const kc1 = splitU16(kcs[0]);
    const kc2 = splitU16(kcs[1]);
    const kc3 = splitU16(kcs[2]);
    const db1 = splitU16(Math.round(dbs[0] * 1000));
    const db2 = splitU16(Math.round(dbs[1] * 1000));
    const db3 = splitU16(Math.round(dbs[2] * 1000));

    const cmd = [
      PROTOCOL_V2.HIGHER_KEY,
      0x02,
      row & 0xff,
      col & 0xff,
      HigherKeyType.MPT,
      ...kc1,
      ...kc2,
      ...kc3,
      ...db1,
      ...db2,
      ...db3,
    ];

    try {
      await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (row & 0xff) &&
          p.raw[3] === (col & 0xff)
        );
      });
      await this.saveHigherKeyToFlash();
      return true;
    } catch (err) {
      console.warn('setMPT failed:', err);
      return false;
    }
  }

  /**
   * Sets END (Key Interlock / Mutual Exclusion) on a key
   */
  public async setEND(
    row: number,
    col: number,
    kcs: [number, number],
    delayMs: number = 0,
  ): Promise<boolean> {
    const kc1 = splitU16(kcs[0]);
    const kc2 = splitU16(kcs[1]);
    const delays = splitU16(delayMs);

    const cmd = [
      PROTOCOL_V2.HIGHER_KEY,
      0x02,
      row & 0xff,
      col & 0xff,
      HigherKeyType.END,
      ...kc1,
      ...kc2,
      ...delays,
    ];

    try {
      await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (row & 0xff) &&
          p.raw[3] === (col & 0xff)
        );
      });
      await this.saveHigherKeyToFlash();
      return true;
    } catch (err) {
      console.warn('setEND failed:', err);
      return false;
    }
  }

  /**
   * Sets RS (Rapid Strike / 双按键联动) between two linked keys
   */
  public async setRS(
    keyA: KeyMatrixItem,
    keyB: KeyMatrixItem,
    delayMs: number = 0,
  ): Promise<boolean> {
    const [kcA_low, kcA_high] = splitU16(keyA.keycode);
    const [kcB_low, kcB_high] = splitU16(keyB.keycode);
    const [del_low, del_high] = splitU16(delayMs);

    // Linked Packet 1
    const pack1 = [
      PROTOCOL_V2.HIGHER_KEY,
      0x02,
      keyA.row & 0xff,
      keyA.col & 0xff,
      HigherKeyType.RS,
      keyB.row & 0xff,
      keyB.col & 0xff,
      kcA_low,
      kcA_high,
      kcB_low,
      kcB_high,
      del_low,
      del_high,
    ];

    // Linked Packet 2
    const pack2 = [
      PROTOCOL_V2.HIGHER_KEY,
      0x02,
      keyB.row & 0xff,
      keyB.col & 0xff,
      HigherKeyType.RS,
      keyA.row & 0xff,
      keyA.col & 0xff,
      kcB_low,
      kcB_high,
      kcA_low,
      kcA_high,
      del_low,
      del_high,
    ];

    try {
      await keyboardHID.sendCommand(pack1, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (keyA.row & 0xff) &&
          p.raw[3] === (keyA.col & 0xff)
        );
      });
      await keyboardHID.sendCommand(pack2, 1500, (p) => {
        return (
          p.protocol === PROTOCOL_V2.HIGHER_KEY &&
          p.raw[1] === 0x02 &&
          p.raw[2] === (keyB.row & 0xff) &&
          p.raw[3] === (keyB.col & 0xff)
        );
      });
      await this.saveHigherKeyToFlash();
      return true;
    } catch (err) {
      console.warn('setRS failed:', err);
      return false;
    }
  }

  /**
   * Persists HigherKey configurations to onboard flash
   * Command: [0x02, 0x02, 0x05] (Global, SaveParam, HigherKey)
   */
  public async saveHigherKeyToFlash(): Promise<boolean> {
    try {
      const cmd = [PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SAVE_PARAM, 0x05];
      await keyboardHID.sendCommand(cmd, 2000, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === GLOBAL_CMD.SAVE_PARAM;
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const higherKeyController = new HigherKeyController();
