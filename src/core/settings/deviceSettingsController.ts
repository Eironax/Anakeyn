/**
 * Anakeyn — Device Settings & Firmware Upgrade Controller
 * Handles Sleep Time, Polling Rate, Factory Reset,
 * Online & Local Firmware querying, version rollback history, and WebHID firmware flashing.
 */

import { keyboardHID } from '../hid/connection';
import { PROTOCOL_V2, GLOBAL_CMD, DEVICE_CMD, CRW } from '../hid/constants';

export const FIRMWARE_CMD = {
  APP_TO_BOOT: 0x01,
  FLASH: 0x02,
  VALIDATE: 0x03,
  BOOT_TO_APP: 0x04,
} as const;

export type ResetTarget =
  | 'All'
  | 'Calibration'
  | 'Performance'
  | 'Lighting'
  | 'Layout'
  | 'HigherKey'
  | 'Macro'
  | 'Axis';

export const RESET_TARGET_CODES: Record<ResetTarget, number> = {
  All: 0x00,
  Calibration: 0x01,
  Performance: 0x02,
  Lighting: 0x03,
  Layout: 0x04,
  HigherKey: 0x05,
  Macro: 0x06,
  Axis: 0x07,
};

export interface FirmwareVersionInfo {
  firmware_version: string;
  firmware_time: string;
  firmware_file: string;
  firmware_name: string;
  description?: string;
  isLatest?: boolean;
}

export interface UpgradeProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
  phase: 'idle' | 'bootloader' | 'needs_reconnect' | 'writing' | 'validating' | 'rebooting' | 'complete' | 'error';
}

const SPARK_API_KEY = '860DE3DB584158536BC89030D8640E29';
const SPARK_API_BASE = 'https://api.sparklinkplayjoy.com/api/v1';

// Verified official release catalog for Everglide AE64 Pro (from OEM server)
export const KNOWN_AE64_FIRMWARES: FirmwareVersionInfo[] = [
  {
    firmware_version: 'v0.1.0.0',
    firmware_time: '2026-09-30',
    firmware_name: 'XS117_C048P010_AE64Pro_App_v0.1.0.0_20260930a.bin',
    firmware_file: '/storage/firmware/cos/202610/XS117_C048P010_AE64Pro_App_v0.1.0.0_20260930a.bin',
    description: 'Latest Official Release: Optimized 8000Hz polling rate jitter, improved 0.01mm Rapid Trigger accuracy, and enhanced SOCD snap-tap latency.',
    isLatest: true,
  },
  {
    firmware_version: 'v0.0.8.0',
    firmware_time: '2026-09-01',
    firmware_name: 'XS117_C048P010_AE64Pro_App_v0.0.8.0_20260901a.bin',
    firmware_file: '/storage/firmware/cos/202609/XS117_C048P010_AE64Pro_App_v0.0.8.0_20260901a.bin',
    description: 'Added high-precision RT deadzone calibration curves and lighting standby sleep synchronization.',
  },
  {
    firmware_version: 'v0.0.7.0',
    firmware_time: '2026-06-25',
    firmware_name: 'XS117_C048P010_AE64Pro_App_v0.0.7.0_20260625a.bin',
    firmware_file: '/storage/firmware/cos/202606/XS117_C048P010_AE64Pro_App_v0.0.7.0_20260625a.bin',
    description: 'Base production firmware build for AE64 Pro Hall Effect controller.',
  },
  {
    firmware_version: 'v0.0.6.0',
    firmware_time: '2026-05-19',
    firmware_name: 'XS117_C048P010_AE64Pro_App_v0.0.6.0_20260519a.bin',
    firmware_file: '/storage/firmware/cos/202605/XS117_C048P010_AE64Pro_App_v0.0.6.0_20260519a.bin',
    description: 'Earlier stable build with standard DKS and MPT actuation triggers.',
  },
  {
    firmware_version: 'v0.0.5.0',
    firmware_time: '2026-03-05',
    firmware_name: 'XS117_C048P010_AE64Pro_App_v0.0.5.0_20260305a.bin',
    firmware_file: '/storage/firmware/cos/202603/XS117_C048P010_AE64Pro_App_v0.0.5.0_20260305a.bin',
    description: 'Initial factory baseline firmware release.',
  },
];

class DeviceSettingsController {
  private pendingBin: Uint8Array | null = null;

  public getPendingBin(): Uint8Array | null {
    return this.pendingBin;
  }

  public setPendingBin(bin: Uint8Array | null): void {
    this.pendingBin = bin;
  }
  /**
   * Reads the keyboard sleep timer delay in minutes.
   * Packet: [0x02, 0x0D, 0x01]
   * Response: [0x02, 0x0D, 0x01, lowByte, highByte]
   */
  async getSleepTime(): Promise<number> {
    try {
      const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, 0x0d, 0x01]);
      if (res.isValid && res.raw.length >= 5) {
        return res.raw[3] | (res.raw[4] << 8);
      }
      if (res.isValid && res.raw.length >= 4) {
        return res.raw[3];
      }
    } catch (e) {
      console.warn('Failed to get sleep time:', e);
    }
    return 30; // fallback to 30 mins
  }

  /**
   * Sets the keyboard sleep timer delay in minutes.
   * Packet: [0x02, 0x0D, 0x00, lowByte, highByte]
   */
  async setSleepTime(minutes: number): Promise<boolean> {
    const low = minutes & 0xff;
    const high = (minutes >> 8) & 0xff;
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, 0x0d, 0x00, low, high]);
    try {
      // Save global parameters to flash
      await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SAVE_PARAM, 0x00]);
    } catch {
      // Ignore save param if hardware auto-persists
    }
    return res.isValid;
  }

  /**
   * Reads current report rate (polling rate code 0..6).
   * Packet: [0x02, 0x05, 0x01]
   * Response: [0x02, 0x05, 0x01, rateCode]
   */
  async getPollingRate(): Promise<number> {
    try {
      const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.REPORT_RATE_SETTING, CRW.READ]);
      if (res.isValid && res.raw.length >= 4) {
        return res.raw[3];
      }
    } catch (e) {
      console.warn('Failed to get polling rate:', e);
    }
    return 3; // Default 1000 Hz
  }

  /**
   * Sets report rate (polling rate code 0..6).
   * Packet: [0x02, 0x05, 0x02, rateCode]
   */
  async setPollingRate(rateCode: number): Promise<boolean> {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.REPORT_RATE_SETTING, CRW.WRITE, rateCode]);
    try {
      // Save global parameters to flash
      await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SAVE_PARAM, 0x00]);
    } catch {
      // Ignore save param if hardware auto-persists
    }
    return res.isValid;
  }

  /**
   * Resets high polling rate buffer/state for 8K operation.
   * Packet: [0x02, 0x02, 0x0F, 0x01]
   */
  async highPollingRateReset(): Promise<boolean> {
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SAVE_PARAM, 0x0f, 0x01]);
    return res.isValid;
  }

  /**
   * Restores factory settings on device.
   * Packet: [0x02, 0x01, resetCode]
   */
  async restoreFactory(target: ResetTarget = 'All'): Promise<boolean> {
    const code = RESET_TARGET_CODES[target] ?? 0x00;
    const res = await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.RESET_FACTORY, code]);
    return res.isValid;
  }

  /**
   * Query online firmware versions from SparkLink OEM API.
   * Returns available list or merges with known historical catalog.
   */
  async fetchFirmwareVersions(boardId?: string | number, vid = '1ca6', pid = '300a'): Promise<FirmwareVersionInfo[]> {
    const bIdStr = boardId ? String(boardId).replace(/^0x/i, '').padStart(8, '0') : '0030000a';
    const params = new URLSearchParams({
      board_id: bIdStr,
      vid,
      pid,
      t: Date.now().toString(),
    });

    const candidateUrls = [
      `/spark-api/api/v1/getKeyboardFirmware?${params}`,
      `${SPARK_API_BASE}/getKeyboardFirmware?${params}`,
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            'Xs-API-Key': SPARK_API_KEY,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.code === 200 && json.data) {
            const list: FirmwareVersionInfo[] = [];
            if (json.data.firmware) {
              list.push({
                firmware_version: json.data.firmware.firmware_version,
                firmware_time: String(json.data.firmware.firmware_time || ''),
                firmware_name: json.data.firmware.firmware_name || 'firmware.bin',
                firmware_file: json.data.firmware.firmware_file,
                isLatest: true,
              });
            }
            if (Array.isArray(json.data.firmwares)) {
              for (const f of json.data.firmwares) {
                if (!list.some(x => x.firmware_version === f.firmware_version)) {
                  list.push({
                    firmware_version: f.firmware_version,
                    firmware_time: String(f.firmware_time || ''),
                    firmware_name: f.firmware_name || 'firmware.bin',
                    firmware_file: f.firmware_file,
                  });
                }
              }
            }
            if (list.length > 0) {
              return list;
            }
          }
        }
      } catch (e) {
        console.warn(`Firmware fetch failed on ${url}:`, e);
      }
    }
    return KNOWN_AE64_FIRMWARES;
  }

  /**
   * Fetches the firmware binary (.bin) from a URL with automatic proxy & CORS fallback.
   */
  async downloadFirmwareBin(url: string): Promise<Uint8Array> {
    const cleanPath = url.replace(/^https?:\/\/[^/]+/i, '');
    const isRelative = url.startsWith('/') || !url.startsWith('http');

    // Build candidate URLs in priority order
    const candidateUrls: string[] = [];
    if (isRelative) {
      candidateUrls.push(`/spark-api${cleanPath}`); // 1. Vite proxy (bypasses browser CORS)
      candidateUrls.push(`https://api.sparklinkplayjoy.com${cleanPath}`); // 2. Direct OEM
      candidateUrls.push(`https://hub.xsyd.top${cleanPath}`); // 3. Web driver hub
    } else {
      if (url.includes('api.sparklinkplayjoy.com')) {
        candidateUrls.push(`/spark-api${cleanPath}`);
      }
      candidateUrls.push(url);
    }

    let lastError: Error | null = null;
    for (const fetchUrl of candidateUrls) {
      try {
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 0) {
            return new Uint8Array(buf);
          }
        } else {
          lastError = new Error(`HTTP ${res.status} from ${fetchUrl}`);
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw new Error(
      `Could not download firmware binary from cloud (${lastError?.message || 'Network blocked'}). ` +
      `You can download the file manually or use 'Local Update (.bin)' to select your file.`
    );
  }

  /**
   * Queries the MCU operating mode:
   * Returns 'bootloader' (raw[16] === 0xFF / 255), 'app' (raw[16] === 0), or 'unknown'.
   */
  async getRunMode(): Promise<'bootloader' | 'app' | 'unknown'> {
    try {
      const res = await keyboardHID.sendCommand([PROTOCOL_V2.DEVICE, DEVICE_CMD.DEVICE_INFO]);
      if (res.isValid && res.raw.length >= 17) {
        const mode = res.raw[16];
        if (mode === 255 || mode === 0xff) return 'bootloader';
        if (mode === 0) return 'app';
      }
    } catch (e) {
      console.warn('Failed to query run mode:', e);
    }
    return 'unknown';
  }

  /**
   * Flashes firmware binary to the keyboard MCU using SparkLink V2 Bootloader Protocol.
   * Hardened with:
   * - 6-second physical USB reset countdown
   * - Mode verification (app vs bootloader)
   * - Extended 8000ms timeout on chunk 0x0 (allows hardware flash sector erase to finish)
   * - Interactive user-gesture reconnection fallback if browser security requires permission
   * - CRITICAL SAFETY INTERLOCK: Never send BOOT_TO_APP on incomplete/corrupted flash!
   */
  async flashFirmware(
    bin: Uint8Array,
    onProgress: (p: UpgradeProgress) => void
  ): Promise<boolean> {
    if (!bin || bin.length === 0) {
      throw new Error('Firmware binary is empty');
    }

    this.pendingBin = bin;

    // Step 0: Check current mode
    const initialMode = await this.getRunMode();

    if (initialMode !== 'bootloader') {
      // Phase 1: Notify keyboard to switch from App mode to Bootloader mode
      onProgress({
        current: 0,
        total: bin.length,
        percentage: 0,
        status: 'Commanding keyboard MCU to enter Bootloader mode...',
        phase: 'bootloader',
      });

      try {
        await keyboardHID.sendCommand([PROTOCOL_V2.FIRMWARE_UPGRADE, FIRMWARE_CMD.APP_TO_BOOT], 3000);
      } catch (e) {
        console.warn('AppToBoot command sent (device resets to bootloader):', e);
      }

      // Explicitly disconnect stale App-mode WebHID handle
      await keyboardHID.disconnect();

      // Wait 6 FULL SECONDS for MCU hardware reset & USB D+ re-enumeration (official SDK specification)
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        onProgress({
          current: 0,
          total: bin.length,
          percentage: Math.min(10, Math.floor((i + 1) * 1.6)),
          status: `Waiting for MCU hardware bootloader reboot (${6 - i}s)...`,
          phase: 'bootloader',
        });
      }

      // Now actively search for the re-enumerated bootloader device
      onProgress({
        current: 0,
        total: bin.length,
        percentage: 10,
        status: 'Reconnecting to keyboard bootloader interface...',
        phase: 'bootloader',
      });

      const reconnected = await keyboardHID.waitForReconnection(10000, 1000);

      if (!reconnected) {
        // If Chrome requires a direct user permission click for the bootloader endpoint,
        // do NOT abort or crash! Transition to 'needs_reconnect' phase so the user can click
        // "Connect Bootloader & Flash" in the UI with a valid user gesture.
        onProgress({
          current: 0,
          total: bin.length,
          percentage: 10,
          status: 'Keyboard is in Bootloader mode. Click "Select Bootloader & Continue Flash" below to grant browser permission.',
          phase: 'needs_reconnect',
        });
        return false;
      }
    }

    return await this.flashFirmwareChunks(bin, onProgress);
  }

  /**
   * Resumes flashing firmware chunks after the user provides a click gesture
   * to connect the bootloader device in Chrome's WebHID picker.
   */
  async resumeFlashAfterUserGesture(
    onProgress: (p: UpgradeProgress) => void
  ): Promise<boolean> {
    if (!this.pendingBin || this.pendingBin.length === 0) {
      throw new Error('No firmware binary loaded in memory to flash.');
    }

    onProgress({
      current: 0,
      total: this.pendingBin.length,
      percentage: 10,
      status: 'Connecting to bootloader device via browser picker...',
      phase: 'bootloader',
    });

    await keyboardHID.requestDevice(false);

    return await this.flashFirmwareChunks(this.pendingBin, onProgress);
  }

  /**
   * Core flashing pipeline for 56-byte chunks, flash verification, and reboot.
   */
  async flashFirmwareChunks(
    bin: Uint8Array,
    onProgress: (p: UpgradeProgress) => void
  ): Promise<boolean> {
    if (!keyboardHID.isConnected()) {
      throw new Error('Keyboard is not connected.');
    }

    // Safety Interlock: Verify that MCU is not in App mode before writing
    const verifiedMode = await this.getRunMode();
    if (verifiedMode === 'app') {
      throw new Error(
        'Safety Abort: Keyboard is in normal typing (Application) mode, not Bootloader mode. ' +
        'Flashing cancelled to protect your device.'
      );
    }

    // Phase 2: Flash firmware chunks (dynamically aligned to 4096-byte sector boundaries)
    const totalBytes = bin.length;
    let written = 0;
    let offset = 0;

    onProgress({
      current: 0,
      total: totalBytes,
      percentage: 12,
      status: 'Bootloader verified (Mode 255). Preparing MCU flash sectors...',
      phase: 'writing',
    });

    try {
      while (offset < totalBytes) {
        if (!keyboardHID.isConnected()) {
          throw new Error('Connection lost while flashing chunks.');
        }

        // Microcontroller flash controllers (ARM/AT32/WCH) and bootloaders strictly
        // prohibit writes that cross 4096-byte (4KB) flash sector boundaries.
        // Chunk 72 ends at 4087. At address 4088 (0x0FF8), exactly 8 bytes remain in Sector 0.
        // Writing 8 bytes completes Sector 0 (0..4095, the firmware header), allowing
        // Sector 1 (address 4096 / 0x1000, the application code) to begin on an exact
        // sector-aligned boundary so the MCU can erase and write Sector 1 cleanly.
        const bytesRemainingInSector = 4096 - (offset % 4096);
        const currentChunkSize = Math.min(56, bytesRemainingInSector, totalBytes - offset);

        const slice = bin.slice(offset, offset + currentChunkSize);
        // Little endian 4-byte address
        const addrBytes = [
          offset & 0xff,
          (offset >> 8) & 0xff,
          (offset >> 16) & 0xff,
          (offset >> 24) & 0xff,
        ];
        // 2-byte chunk size
        const sizeBytes = [slice.length & 0xff, (slice.length >> 8) & 0xff];

        const packet = [
          PROTOCOL_V2.FIRMWARE_UPGRADE,
          FIRMWARE_CMD.FLASH,
          ...addrBytes,
          ...sizeBytes,
          ...Array.from(slice),
        ];

        // Address 0x0 and sector starts (offset % 4096 === 0) may trigger flash sector erase
        const isSectorStart = offset % 4096 === 0;
        const chunkTimeout = offset === 0 ? 8000 : (isSectorStart ? 4000 : 2500);

        let sentOk = false;
        let lastErr = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await keyboardHID.sendCommand(
              packet,
              chunkTimeout,
              (p) => p.protocol === PROTOCOL_V2.FIRMWARE_UPGRADE && p.subCommand === FIRMWARE_CMD.FLASH
            );
            // In vendor SDK: 4095 !== e[2] (i.e. status byte raw[2] !== 0xFF)
            if (res.isValid && res.raw[2] !== 0xff) {
              sentOk = true;
              break;
            } else {
              lastErr = `MCU error status byte: 0x${(res.raw[2] ?? 0).toString(16)}`;
            }
          } catch (err: unknown) {
            lastErr = err instanceof Error ? err.message : String(err);
            await new Promise((r) => setTimeout(r, 200));
          }
        }

        if (!sentOk) {
          throw new Error(`Failed flashing chunk at address 0x${offset.toString(16).toUpperCase()}: ${lastErr}`);
        }

        written += slice.length;
        offset += currentChunkSize;

        const pct = 12 + Math.floor((written / totalBytes) * 78);
        onProgress({
          current: written,
          total: totalBytes,
          percentage: pct,
          status: `Flashing firmware: ${written} / ${totalBytes} bytes (${pct}%)...`,
          phase: 'writing',
        });

        // Small pacing delay to prevent USB FIFO buffer congestion
        if (offset % 560 === 0) {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      // Phase 3: Validate Flash Integrity
      onProgress({
        current: totalBytes,
        total: totalBytes,
        percentage: 92,
        status: 'Validating flash integrity with checksum verification...',
        phase: 'validating',
      });

      await new Promise((r) => setTimeout(r, 600));
      const validateRes = await keyboardHID.sendCommand(
        [PROTOCOL_V2.FIRMWARE_UPGRADE, FIRMWARE_CMD.VALIDATE],
        5000
      );
      // In vendor SDK: 1 === (await this.deviceBase.sendData(e))[2]
      if (!validateRes.isValid || validateRes.raw[2] !== 0x01) {
        throw new Error(
          `Firmware validation check failed on MCU (status: 0x${(validateRes.raw[2] ?? 0).toString(16)})`
        );
      }

      // Phase 4: Reboot MCU to application mode (ONLY after validation succeeds!)
      onProgress({
        current: totalBytes,
        total: totalBytes,
        percentage: 96,
        status: 'Validation successful! Rebooting MCU to application mode...',
        phase: 'rebooting',
      });

      try {
        await keyboardHID.sendCommand([PROTOCOL_V2.FIRMWARE_UPGRADE, FIRMWARE_CMD.BOOT_TO_APP], 3000);
      } catch (e) {
        console.warn('BootToApp command sent (device reboots):', e);
      }

      // Disconnect bootloader handle
      await keyboardHID.disconnect();

      // Wait 4.5 seconds for MCU application reboot
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        onProgress({
          current: totalBytes,
          total: totalBytes,
          percentage: 96 + i,
          status: `Rebooting into normal mode (${4 - i}s)...`,
          phase: 'rebooting',
        });
      }

      // Reconnect to keyboard in Application mode
      await keyboardHID.waitForReconnection(10000, 1000);

      this.pendingBin = null;

      onProgress({
        current: totalBytes,
        total: totalBytes,
        percentage: 100,
        status: 'Firmware successfully installed! Keyboard rebooted and ready.',
        phase: 'complete',
      });

      return true;
    } catch (flashErr) {
      // CRITICAL SAFETY INTERLOCK:
      // NEVER SEND BOOT_TO_APP ON FLASH FAILURE!
      // If flashing fails or is interrupted, the MCU MUST stay safely in Bootloader mode!
      // Sending BOOT_TO_APP to corrupted flash would crash the MCU into a HardFault loop!
      console.error('Firmware flashing halted safely in Bootloader mode:', flashErr);
      throw flashErr;
    }
  }
}

export const deviceSettingsController = new DeviceSettingsController();

