/**
 * Anakeyn — Hall Effect & Rapid Trigger Performance Controller
 * Interacts with SparkLink Protocol V2 Performance Category (0x04)
 */

import { PROTOCOL_V2 } from '../hid/constants';
import { keyboardHID } from '../hid/connection';

export interface KeyPerformanceConfig {
  row: number;
  col: number;
  mode: number; // 0 = Normal, 1 = RT (Rapid Trigger), 2 = IntervalRT
  normalPress: number; // mm (actuation point, e.g. 2.00)
  normalRelease: number; // mm (release point, e.g. 2.00)
  rtFirstTouch: number; // mm (RT initial trigger threshold, e.g. 0.50)
  rtPress: number; // mm (RT press sensitivity, e.g. 0.30)
  rtRelease: number; // mm (RT release sensitivity, e.g. 0.30)
  pressDeadStroke: number; // mm (top deadzone, e.g. 0.20)
  releaseDeadStroke: number; // mm (bottom deadzone, e.g. 0.20)
  axis: number; // switch index / profile
  calibrate: number;
  axisV2Id?: number;
  axisRangeMax?: number;
  axisCoefficient?: number;
}

export const DEFAULT_KEY_PERFORMANCE: Omit<KeyPerformanceConfig, 'row' | 'col'> = {
  mode: 0,
  normalPress: 2.0,
  normalRelease: 2.0,
  rtFirstTouch: 0.5,
  rtPress: 0.3,
  rtRelease: 0.3,
  pressDeadStroke: 0.2,
  releaseDeadStroke: 0.2,
  axis: 0,
  calibrate: 0,
  axisV2Id: 0,
  axisRangeMax: 4000,
  axisCoefficient: 1,
};

function u16ToBytes(val: number): [number, number] {
  const rounded = Math.max(0, Math.min(65535, Math.round(val)));
  return [rounded & 0xff, (rounded >> 8) & 0xff];
}

function bytesToU16(low: number, high: number): number {
  return ((high ?? 0) << 8) | (low ?? 0);
}

export class PerformanceController {
  // Persistent Calibration & Sensor Telemetry Cache
  public isCalibrating: boolean = (() => {
    try {
      return (
        localStorage.getItem('anakeyn_is_calibrating') === 'true' ||
        localStorage.getItem('anakey_is_calibrating') === 'true'
      );
    } catch {
      return false;
    }
  })();
  public hwCalibratedMap: Record<string, boolean> = {};
  public hwAdcMap: Record<string, number> = {};

  public clearCalibrationState(): void {
    this.isCalibrating = false;
    this.hwCalibratedMap = {};
    this.hwAdcMap = {};
    try {
      localStorage.removeItem('anakeyn_is_calibrating');
      localStorage.removeItem('anakey_is_calibrating');
    } catch {}
  }
  /**
   * Reads performance parameters for a specific key
   */
  public async getKeyPerformance(row: number, col: number): Promise<KeyPerformanceConfig> {
    const cmd = [PROTOCOL_V2.PERFORMANCE, 0x01, row, col];
    const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
      return p.protocol === PROTOCOL_V2.PERFORMANCE && p.subCommand === 0x01 && p.raw[2] === row && p.raw[3] === col;
    });

    const raw = res.raw;
    const mode = raw[4] ?? 0;
    const normalPress = bytesToU16(raw[5], raw[6]) / 1000;
    const normalRelease = bytesToU16(raw[7], raw[8]) / 1000;
    const rtFirstTouch = bytesToU16(raw[9], raw[10]) / 1000;
    const rtPress = bytesToU16(raw[11], raw[12]) / 1000;
    const rtRelease = bytesToU16(raw[13], raw[14]) / 1000;
    const pressDeadStroke = bytesToU16(raw[15], raw[16]) / 1000;
    const releaseDeadStroke = bytesToU16(raw[17], raw[18]) / 1000;
    const axis = raw[19] ?? 0;
    const calibrate = raw[20] ?? 0;
    const axisV2Id = bytesToU16(raw[21], raw[22]);
    const axisRangeMax = bytesToU16(raw[23], raw[24]);
    const axisCoefficient = bytesToU16(raw[25], raw[26]);

    const conf: KeyPerformanceConfig = {
      row,
      col,
      mode,
      normalPress: normalPress > 0 ? Number(normalPress.toFixed(3)) : 2.0,
      normalRelease: normalRelease > 0 ? Number(normalRelease.toFixed(3)) : 2.0,
      rtFirstTouch: rtFirstTouch > 0 ? Number(rtFirstTouch.toFixed(3)) : 0.5,
      rtPress: rtPress > 0 ? Number(rtPress.toFixed(3)) : 0.3,
      rtRelease: rtRelease > 0 ? Number(rtRelease.toFixed(3)) : 0.3,
      pressDeadStroke: Number(pressDeadStroke.toFixed(3)),
      releaseDeadStroke: Number(releaseDeadStroke.toFixed(3)),
      axis,
      calibrate,
      axisV2Id,
      axisRangeMax,
      axisCoefficient,
    };

    if (row === 0 && col === 0) {
      console.log(`[ANAKEYN HARDWARE INSPECT] Esc (0,0):`, {
        axis,
        axisV2Id,
        axisRangeMax,
        axisCoefficient,
        normalPress: conf.normalPress,
        mode: conf.mode,
        rawBytes: Array.from(raw.slice(0, 28))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' '),
      });
    }

    return conf;
  }

  /**
   * Sets performance parameters for a specific key
   */
  public async setKeyPerformance(config: KeyPerformanceConfig): Promise<void> {
    const {
      row,
      col,
      mode,
      normalPress,
      normalRelease,
      rtFirstTouch,
      rtPress,
      rtRelease,
      pressDeadStroke,
      releaseDeadStroke,
      axis = 0,
      calibrate = 0,
      axisV2Id = 0,
      axisRangeMax = 4000,
      axisCoefficient = 1,
    } = config;

    const cmd = [
      PROTOCOL_V2.PERFORMANCE,
      0x02, // SetPerformance
      row,
      col,
      mode,
      ...u16ToBytes(normalPress * 1000),
      ...u16ToBytes((normalRelease || normalPress) * 1000),
      ...u16ToBytes(rtFirstTouch * 1000),
      ...u16ToBytes(rtPress * 1000),
      ...u16ToBytes(rtRelease * 1000),
      ...u16ToBytes(pressDeadStroke * 1000),
      ...u16ToBytes(releaseDeadStroke * 1000),
      axis & 0xff,
      calibrate,
      ...u16ToBytes(axisV2Id),
      ...u16ToBytes(axisRangeMax),
      ...u16ToBytes(axisCoefficient),
    ];

    await keyboardHID.sendCommand(cmd, 1500, (p) => {
      return p.protocol === PROTOCOL_V2.PERFORMANCE && p.subCommand === 0x02;
    });
  }

  /**
   * Persists performance, axis, and all global parameters to keyboard onboard flash
   * Command: [0x02, 0x02, type] (Global, SaveParam, type)
   * 0x02: Performance
   * 0x07: Axis / Switch parameters
   * 0x00: All parameters
   */
  public async savePerformanceToFlash(): Promise<void> {
    // 1. Save Performance parameters
    try {
      await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, 0x02, 0x02], 2000, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.subCommand === 0x02;
      });
    } catch (err) {
      console.warn('SaveParam Performance warning:', err);
    }

    // 2. Save Axis parameters (0x07)
    try {
      await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, 0x02, 0x07], 2000, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.subCommand === 0x02;
      });
    } catch (err) {
      console.warn('SaveParam Axis warning:', err);
    }

    // 3. Save All parameters (0x00)
    try {
      await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, 0x02, 0x00], 2000, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.subCommand === 0x02;
      });
    } catch (err) {
      console.warn('SaveParam All warning:', err);
    }
  }

  /**
   * Queries default keyboard axis / switch index
   * Command: [0x02, 0x09, 0x01] (Global, ModifyDefaultAxis, Read)
   */
  public async getDefaultAxis(): Promise<number> {
    try {
      const cmd = [PROTOCOL_V2.GLOBAL, 0x09, 0x01];
      const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x09;
      });
      return res.raw[3] ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Modifies default keyboard axis / switch index
   * Command: [0x02, 0x09, 0x00, val] (Global, ModifyDefaultAxis, Write, value)
   */
  public async setDefaultAxis(value: number): Promise<void> {
    try {
      const cmd = [PROTOCOL_V2.GLOBAL, 0x09, 0x00, value & 0xff];
      await keyboardHID.sendCommand(cmd, 1500, (p) => {
        return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x09;
      });
    } catch (err) {
      console.warn('setDefaultAxis warning:', err);
    }
  }

  /**
   * Starts keyboard hardware sensor calibration mode
   * Command: [0x02, 0x06, 0x00] (Global, CalibrationSetting, Open)
   */
  public async startCalibration(): Promise<void> {
    const cmd = [PROTOCOL_V2.GLOBAL, 0x06, 0x00];
    await keyboardHID.sendCommand(cmd, 1500, (p) => {
      return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x06;
    });
    this.isCalibrating = true;
    try {
      localStorage.setItem('anakeyn_is_calibrating', 'true');
    } catch {}
  }

  /**
   * Finishes keyboard hardware sensor calibration mode
   * Command: [0x02, 0x06, 0x01] (Global, CalibrationSetting, Close)
   */
  public async finishCalibration(): Promise<void> {
    const cmd = [PROTOCOL_V2.GLOBAL, 0x06, 0x01];
    await keyboardHID.sendCommand(cmd, 1500, (p) => {
      return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x06;
    });
    this.isCalibrating = false;
    try {
      localStorage.removeItem('anakeyn_is_calibrating');
      localStorage.removeItem('anakey_is_calibrating');
    } catch {}
  }

  /**
   * Saves calibration parameters permanently to onboard flash
   * Command: [0x02, 0x02, 0x01] (Global, SaveParam, Calibration)
   */
  public async saveCalibrationToFlash(): Promise<void> {
    const cmd = [PROTOCOL_V2.GLOBAL, 0x02, 0x01];
    await keyboardHID.sendCommand(cmd, 2000, (p) => {
      return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x02;
    });
  }

  /**
   * Clears/resets hardware sensor calibration to factory baseline
   * Command: [0x02, 0x01, 0x01] (Global, ResetFactory, Calibration)
   */
  public async resetCalibration(): Promise<void> {
    const cmd = [PROTOCOL_V2.GLOBAL, 0x01, 0x01];
    await keyboardHID.sendCommand(cmd, 2000, (p) => {
      return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x01;
    });
    this.isCalibrating = false;
    this.hwCalibratedMap = {};
    this.hwAdcMap = {};
    try {
      localStorage.removeItem('anakeyn_is_calibrating');
      localStorage.removeItem('anakey_is_calibrating');
    } catch {}
  }

  /**
   * Reads calibration status and ADC baselines across all 5 matrix rows
   */
  public async syncCalibrationData(): Promise<{
    calibratedMap: Record<string, boolean>;
    adcMap: Record<string, number>;
  }> {
    const VALID_ROWS = [1, 2, 3, 4, 5];
    for (const r of VALID_ROWS) {
      if (!keyboardHID.isConnected()) break;
      try {
        const [calibList, adcList] = await Promise.all([
          this.getRowCalibrateStatus(r),
          this.getRowAdcData(r),
        ]);
        if (calibList && calibList.length > 0) {
          calibList.forEach((val, c) => {
            this.hwCalibratedMap[`${r}-${c}`] = val > 0;
          });
        }
        if (adcList && adcList.length > 0) {
          adcList.forEach((val, c) => {
            if (val > 0) this.hwAdcMap[`${r}-${c}`] = val;
          });
        }
      } catch (err) {
        console.warn(`Row ${r} calibration sync warning:`, err);
      }
    }
    return {
      calibratedMap: { ...this.hwCalibratedMap },
      adcMap: { ...this.hwAdcMap },
    };
  }

  /**
   * Reads real-time ADC raw sensor data for a specific matrix row
   * Command: [0x04, 0x03, 0x00, row] (Performance, AxisData, ADC, row)
   */
  public async getRowAdcData(row: number): Promise<number[]> {
    try {
      const cmd = [PROTOCOL_V2.PERFORMANCE, 0x03, 0x00, row];
      const res = await keyboardHID.sendCommand(cmd, 1000, (p) => {
        return p.protocol === PROTOCOL_V2.PERFORMANCE && p.subCommand === 0x03 && p.raw[2] === 0x00 && p.raw[3] === row;
      });
      const dataSlice = res.raw.slice(4);
      const adc: number[] = [];
      for (let i = 0; i < dataSlice.length; i += 2) {
        if (i + 1 < dataSlice.length) {
          adc.push(bytesToU16(dataSlice[i], dataSlice[i + 1]));
        }
      }
      return adc;
    } catch {
      return [];
    }
  }

  /**
   * Reads real-time travel stroke (Route in micrometers) for a specific matrix row
   * Command: [0x04, 0x03, 0x01, row] (Performance, AxisData, Route, row)
   */
  public async getRowRouteData(row: number): Promise<number[]> {
    try {
      const cmd = [PROTOCOL_V2.PERFORMANCE, 0x03, 0x01, row];
      const res = await keyboardHID.sendCommand(cmd, 1000, (p) => {
        return p.protocol === PROTOCOL_V2.PERFORMANCE && p.subCommand === 0x03 && p.raw[2] === 0x01 && p.raw[3] === row;
      });
      const dataSlice = res.raw.slice(4);
      const route: number[] = [];
      for (let i = 0; i < dataSlice.length; i += 2) {
        if (i + 1 < dataSlice.length) {
          route.push(bytesToU16(dataSlice[i], dataSlice[i + 1]));
        }
      }
      return route;
    } catch {
      return [];
    }
  }

  /**
   * Reads calibration status / max displacement for a specific matrix row
   * Command: [0x04, 0x03, 0x02, row] (Performance, AxisData, Calibrate, row)
   */
  public async getRowCalibrateStatus(row: number): Promise<number[]> {
    try {
      const cmd = [PROTOCOL_V2.PERFORMANCE, 0x03, 0x02, row];
      const res = await keyboardHID.sendCommand(cmd, 1000, (p) => {
        return p.protocol === PROTOCOL_V2.PERFORMANCE && p.subCommand === 0x03 && p.raw[2] === 0x02 && p.raw[3] === row;
      });
      const dataSlice = res.raw.slice(4);
      const status: number[] = [];
      for (let i = 0; i < dataSlice.length; i += 2) {
        if (i + 1 < dataSlice.length) {
          status.push(bytesToU16(dataSlice[i], dataSlice[i + 1]));
        }
      }
      return status;
    } catch {
      return [];
    }
  }

  /**
   * Reads performance for all keys in background, progressively caching them
   */
  public async readAllKeyPerformance(
    keys: { row: number; col: number }[],
    onProgress?: (keyId: string, conf: KeyPerformanceConfig) => void,
    shouldCancel?: () => boolean,
  ): Promise<Record<string, KeyPerformanceConfig>> {
    const cache: Record<string, KeyPerformanceConfig> = {};
    for (const k of keys) {
      if (shouldCancel && shouldCancel()) break;
      if (!keyboardHID.isConnected()) break;

      try {
        const conf = await this.getKeyPerformance(k.row, k.col);
        const keyId = `${k.row}-${k.col}`;
        cache[keyId] = conf;
        if (onProgress) {
          onProgress(keyId, conf);
        }
      } catch {
        // Continue on individual key timeout
      }
    }
    return cache;
  }

  /**
   * Reads anti-jitter / anti-shake optimization switch state
   * Command: [0x02, 0x10, 0x01]
   */
  public async getShakeOptimization(): Promise<boolean> {
    const cmd = [PROTOCOL_V2.GLOBAL, 0x10, 0x01];
    const res = await keyboardHID.sendCommand(cmd, 1500, (p) => {
      return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x10;
    });
    return res.raw[3] === 0x01;
  }

  /**
   * Sets anti-jitter / anti-shake optimization switch state
   * Command: [0x02, 0x10, 0x00, enabled ? 1 : 0]
   */
  public async setShakeOptimization(enabled: boolean): Promise<void> {
    const cmd = [PROTOCOL_V2.GLOBAL, 0x10, 0x00, enabled ? 1 : 0];
    await keyboardHID.sendCommand(cmd, 1500, (p) => {
      return p.protocol === PROTOCOL_V2.GLOBAL && p.raw[1] === 0x10;
    });
  }
}

export const performanceController = new PerformanceController();
