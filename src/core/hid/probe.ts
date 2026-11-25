/**
 * Anakeyn — SparkLink Protocol V2 Diagnostic & Hardware Probing Suite
 * Queries Protocol v2 endpoints for exact firmware, Hall Effect switch details,
 * polling rate, active profile, and controller emulation modes.
 */

import { PROTOCOL_V2, DEVICE_CMD, GLOBAL_CMD, CRW, POLLING_RATE_LABELS } from './constants';
import { decodeString } from './protocol';
import { keyboardHID, type DeviceInfo } from './connection';

export interface V2ProbeResult {
  deviceInfo: DeviceInfo;
  protocolVersion: string;
  appVersion: string;
  pcbVersion: string;
  boardId: number | string;
  serialNumber: string;
  buildDate: string;
  switchTypes: {
    magneticHallEffect: boolean;
    mechanical: boolean;
    optical: boolean;
  };
  connectionModes: {
    usb: boolean;
    mode2_4G: boolean;
    bluetooth: boolean;
  };
  osMode: 'Windows' | 'macOS' | 'Unknown';
  pollingRate: string;
  pollingRateCode?: number;
  sleepTimeMinutes?: number;
  activeProfile: number;
  gamepadMode: string;
  rtPrecisionUm?: number;
  rawDetails: Record<string, string>;
}

export async function runHardwareProbe(): Promise<V2ProbeResult> {
  const deviceInfo = keyboardHID.getDeviceInfo();
  if (!deviceInfo) {
    throw new Error('Keyboard is not connected.');
  }

  const rawDetails: Record<string, string> = {};

  // 1. Get Protocol Version: [0x01, 0x01]
  let protocolVersion = 'v1.0.0.0';
  try {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.DEVICE, DEVICE_CMD.PROTOCOL_VERSION]);
    if (res.isValid && res.raw.length >= 6) {
      protocolVersion = `v${res.raw[2]}.${res.raw[3]}.${res.raw[4]}.${res.raw[5]}`;
      rawDetails['PROTOCOL_VERSION'] = protocolVersion;
    }
  } catch (e) {
    rawDetails['PROTOCOL_VERSION_ERR'] = String(e);
  }

  // 2. Get Device Info: [0x01, 0x02] (Board ID, App Version, PCB Version, SN, Build Timestamp)
  let appVersion = 'Unknown';
  let pcbVersion = 'Unknown';
  let boardId: number | string = 'Unknown';
  let serialNumber = 'Unknown';
  let buildDate = '';
  try {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.DEVICE, DEVICE_CMD.DEVICE_INFO]);
    if (res.isValid && res.raw.length >= 41) {
      const bId = (res.raw[7] << 0) | (res.raw[6] << 8) | (res.raw[5] << 16) | (res.raw[4] << 24);
      boardId = `0x${bId.toString(16).toUpperCase()}`;
      appVersion = Array.from(res.raw.slice(8, 12)).join('.');
      pcbVersion = Array.from(res.raw.slice(12, 16)).join('-');
      serialNumber = Array.from(res.raw.slice(17, 29)).join('');
      buildDate = decodeString(res.raw.slice(29, 41));
      rawDetails['BOARD_ID'] = String(boardId);
      rawDetails['APP_VERSION'] = appVersion;
      rawDetails['PCB_VERSION'] = pcbVersion;
      rawDetails['SERIAL'] = serialNumber;
      rawDetails['BUILD_DATE'] = buildDate;
    }
  } catch (e) {
    rawDetails['DEVICE_INFO_ERR'] = String(e);
  }

  // 3. Get Device Features: [0x01, 0x03] (Hall Effect / Mechanical / Optical, Wireless modes)
  const switchTypes = {
    magneticHallEffect: false,
    mechanical: false,
    optical: false,
  };
  const connectionModes = {
    usb: true,
    mode2_4G: false,
    bluetooth: false,
  };
  try {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.DEVICE, DEVICE_CMD.DEVICE_FEATURE]);
    if (res.isValid && res.raw.length >= 4) {
      const axisByte = res.raw[2];
      switchTypes.mechanical = !!(axisByte & 0x01);
      switchTypes.magneticHallEffect = !!(axisByte & 0x02);
      switchTypes.optical = !!(axisByte & 0x04);

      const connByte = res.raw[3];
      connectionModes.usb = !!(connByte & 0x01);
      connectionModes.mode2_4G = !!(connByte & 0x02);
      connectionModes.bluetooth = !!(connByte & 0x04);

      rawDetails['AXIS_BYTE'] = `0x${axisByte.toString(16)}`;
      rawDetails['CONN_BYTE'] = `0x${connByte.toString(16)}`;
    }
  } catch (e) {
    rawDetails['DEVICE_FEATURE_ERR'] = String(e);
  }

  // 4. Query System Mode (Win/Mac): [0x02, 0x04, 0x01]
  let osMode: 'Windows' | 'macOS' | 'Unknown' = 'Windows';
  try {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SYSTEM_SETTING, CRW.READ]);
    if (res.isValid && res.raw.length >= 4) {
      // Byte 0: Protocol (0x02), Byte 1: SubCmd (0x04), Byte 2: CRW (0x01), Byte 3: Value (0=WIN, 1=MAC)
      osMode = res.raw[3] === 0x01 ? 'macOS' : 'Windows';
      rawDetails['OS_MODE'] = osMode;
    }
  } catch (e) {
    rawDetails['OS_MODE_ERR'] = String(e);
  }

  // 5. Query Polling Rate: [0x02, 0x05, 0x01]
  let pollingRate = '1000 Hz (1.0ms)';
  let pollingRateCode = 3;
  try {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.REPORT_RATE_SETTING, CRW.READ]);
    if (res.isValid && res.raw.length >= 4) {
      // Byte 0: Protocol (0x02), Byte 1: SubCmd (0x05), Byte 2: CRW (0x01), Byte 3: Rate Code (0=8k, 1=4k, 2=2k, 3=1k, ...)
      const code = res.raw[3];
      pollingRateCode = code;
      pollingRate = POLLING_RATE_LABELS[code] || `Mode ${code}`;
      rawDetails['POLLING_RATE_CODE'] = String(code);
    }
  } catch (e) {
    rawDetails['POLLING_RATE_ERR'] = String(e);
  }

  // 5b. Query Sleep Time: [0x02, 0x0D, 0x01]
  let sleepTimeMinutes = 30;
  try {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SLEEP_TIME, 0x01]);
    if (res.isValid && res.raw.length >= 5) {
      sleepTimeMinutes = res.raw[3] | (res.raw[4] << 8);
      rawDetails['SLEEP_TIME'] = `${sleepTimeMinutes} min`;
    } else if (res.isValid && res.raw.length >= 4) {
      sleepTimeMinutes = res.raw[3];
      rawDetails['SLEEP_TIME'] = `${sleepTimeMinutes} min`;
    }
  } catch (e) {
    rawDetails['SLEEP_TIME_ERR'] = String(e);
  }

  // 6. Query Active Profile Slot: [0x02, 0x03, 0x01]
  let activeProfile = 1;
  try {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.CONFIG_SWITCH, CRW.READ]);
    if (res.isValid && res.raw.length >= 4) {
      // Byte 3 is the active profile index (0=Profile 1, 1=Profile 2, ...)
      // Normalized to 1-indexed (1-4) for UI matching
      activeProfile = (res.raw[3] ?? 0) + 1;
      rawDetails['ACTIVE_PROFILE'] = `Profile ${activeProfile} (Index ${res.raw[3]})`;
    }
  } catch (e) {
    rawDetails['CONFIG_SWITCH_ERR'] = String(e);
  }

  // 7. Query Gamepad / Handle Mode: [0x10, 0x01]
  let gamepadMode = 'Standard Keyboard';
  try {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.HANDLE, 0x01]);
    if (res.isValid && res.raw.length >= 3) {
      const mode = res.raw[2];
      gamepadMode = mode === 1 ? 'Xbox Gamepad' : mode === 2 ? 'Classic Controller' : 'Standard Keyboard';
      rawDetails['HANDLE_MODE'] = gamepadMode;
    }
  } catch (e) {
    rawDetails['HANDLE_MODE_ERR'] = String(e);
  }

  // 8. Query Rapid Trigger Precision: [0x02, 0x0c, 0x00]
  let rtPrecisionUm: number | undefined;
  try {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.RT_PRECISION_QUERY, 0x00]);
    if (res.isValid && res.raw.length >= 3) {
      rtPrecisionUm = res.raw[2];
      rawDetails['RT_PRECISION'] = `${rtPrecisionUm} μm (${(rtPrecisionUm / 1000).toFixed(2)}mm)`;
    }
  } catch (e) {
    rawDetails['RT_PRECISION_ERR'] = String(e);
  }

  return {
    deviceInfo,
    protocolVersion,
    appVersion,
    pcbVersion,
    boardId,
    serialNumber,
    buildDate,
    switchTypes,
    connectionModes,
    osMode,
    pollingRate,
    pollingRateCode,
    sleepTimeMinutes,
    activeProfile,
    gamepadMode,
    rtPrecisionUm,
    rawDetails,
  };
}
