/**
 * Anakeyn — WebHID Connection Manager & Command Pipeline
 * Handles browser device authorization, opening channels, and queued send/receive.
 */

import { HID_CONFIG } from './constants';
import { buildV2Packet, parseV2Packet, toHex, type ParsedPacket } from './protocol';

export interface DeviceInfo {
  productName: string;
  vendorId: number;
  productId: number;
  usagePage?: number;
  usage?: number;
  opened: boolean;
}

export interface LogEntry {
  id?: string;
  timestamp: string;
  type: 'tx' | 'rx' | 'info' | 'warn' | 'error';
  message: string;
  hex?: string;
}

export type LogListener = (entry: LogEntry) => void;

export class KeyboardHID {
  private device: HIDDevice | null = null;
  private logListeners: Set<LogListener> = new Set();
  private queue: Promise<unknown> = Promise.resolve();
  private pendingResolver: ((packet: ParsedPacket) => void) | null = null;
  private pendingMatcher: ((packet: ParsedPacket) => boolean) | null = null;
  private boundInputReportDevices = new WeakSet<HIDDevice>();
  private isGlobalMonitoringSetup = false;

  constructor() {
    this.setupGlobalHidMonitoring();
  }

  private setupGlobalHidMonitoring(): void {
    if (this.isGlobalMonitoringSetup || typeof navigator === 'undefined' || !('hid' in navigator)) {
      return;
    }
    this.isGlobalMonitoringSetup = true;

    navigator.hid.addEventListener('disconnect', (event: HIDConnectionEvent) => {
      if (event.device === this.device) {
        this.log('warn', `Device disconnected: ${event.device.productName || 'keyboard'}`);
        this.device = null;
      }
    });

    navigator.hid.addEventListener('connect', (event: HIDConnectionEvent) => {
      this.log(
        'info',
        `Device attached to USB: ${event.device.productName || 'device'} (VID: 0x${event.device.vendorId.toString(16).toUpperCase()})`,
      );
    });
  }

  public onLog(listener: LogListener): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  private log(type: 'tx' | 'rx' | 'info' | 'warn' | 'error', message: string, hex?: string) {
    const timestamp =
      new Date().toLocaleTimeString('en-US', { hour12: false }) +
      '.' +
      String(Date.now() % 1000).padStart(3, '0');
    this.logListeners.forEach((fn) => fn({ timestamp, type, message, hex }));
  }

  public isConnected(): boolean {
    return this.device !== null && this.device.opened;
  }

  public getDeviceInfo(): DeviceInfo | null {
    if (!this.device) return null;
    const configCol =
      this.device.collections?.find((c) => c.usagePage === 0xffb0 || c.usagePage === 0xffa0) ||
      this.device.collections?.[0];

    return {
      productName: this.device.productName || 'Everglide AE64 Pro',
      vendorId: this.device.vendorId,
      productId: this.device.productId,
      usagePage: configCol?.usagePage,
      usage: configCol?.usage,
      opened: this.device.opened,
    };
  }

  public async requestDevice(filterSpecific = true): Promise<DeviceInfo> {
    if (!('hid' in navigator)) {
      throw new Error('WebHID is not supported in this browser. Please use Google Chrome, MS Edge, or Opera.');
    }

    const filters: HIDDeviceFilter[] = [];

    if (filterSpecific) {
      filters.push(
        { vendorId: 0x1ca6, usagePage: 0xffb0 },
        { vendorId: 0x1ca6, usagePage: 0xffa0 },
        { vendorId: 0x1ca3, usagePage: 0xffb0 },
        { vendorId: 0x1ca3, usagePage: 0xffa0 },
        { vendorId: 7331, usagePage: 0xffb0 },
      );
    }

    this.log('info', `Opening browser HID picker (filter: ${filterSpecific ? 'SparkLink Config 0xFFB0' : 'all devices'})...`);

    const selectedDevices = await navigator.hid.requestDevice({ filters });
    if (!selectedDevices || selectedDevices.length === 0) {
      throw new Error('No device selected.');
    }

    const allDevices = await navigator.hid.getDevices();
    const configDevice =
      allDevices.find((d) =>
        d.collections.some((c) => c.usagePage === 0xffb0 || c.usagePage === 0xffa0),
      ) ||
      selectedDevices.find((d) =>
        d.collections.some((c) => c.usagePage === 0xffb0 || c.usagePage === 0xffa0),
      ) ||
      selectedDevices[0];

    await this.attachDevice(configDevice);
    return this.getDeviceInfo()!;
  }

  public async getPairedDevices(): Promise<HIDDevice[]> {
    if (!('hid' in navigator)) return [];
    const all = await navigator.hid.getDevices();
    return all.sort((a, b) => {
      const aIsConfig = a.collections.some((c) => c.usagePage === 0xffb0 || c.usagePage === 0xffa0) ? 1 : 0;
      const bIsConfig = b.collections.some((c) => c.usagePage === 0xffb0 || c.usagePage === 0xffa0) ? 1 : 0;
      return bIsConfig - aIsConfig;
    });
  }

  public async attachDevice(device: HIDDevice): Promise<void> {
    this.setupGlobalHidMonitoring();

    if (!device.opened) {
      this.log(
        'info',
        `Opening connection to ${device.productName || 'device'} (VID: 0x${device.vendorId.toString(16).toUpperCase()}, PID: 0x${device.productId.toString(16).toUpperCase()})...`,
      );
      await device.open();
    }

    this.device = device;

    if (device.collections && device.collections.length > 0) {
      device.collections.forEach((c, idx) => {
        const inR = c.inputReports?.map((r) => `id:0x${(r.reportId ?? 0).toString(16)}`).join(', ') || 'none';
        const outR = c.outputReports?.map((r) => `id:0x${(r.reportId ?? 0).toString(16)}`).join(', ') || 'none';
        const featR = c.featureReports?.map((r) => `id:0x${(r.reportId ?? 0).toString(16)}`).join(', ') || 'none';
        this.log(
          'info',
          `Endpoint #${idx}: UsagePage=0x${c.usagePage?.toString(16).toUpperCase()}, Usage=0x${c.usage?.toString(16)} | Input=[${inR}], Output=[${outR}], Feature=[${featR}]`,
        );
      });
    }

    // Only attach inputreport listener once per HIDDevice instance
    if (!this.boundInputReportDevices.has(device)) {
      this.boundInputReportDevices.add(device);
      device.addEventListener('inputreport', (event: HIDInputReportEvent) => {
        const raw = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
        const parsed = parseV2Packet(raw);

        this.log(
          'rx',
          `RECV [0x${parsed.protocol.toString(16).padStart(2, '0').toUpperCase()} 0x${parsed.subCommand.toString(16).padStart(2, '0').toUpperCase()}] ${parsed.isValid ? '✓' : '⚠️ ERR'}`,
          toHex(parsed.raw),
        );

        if (this.pendingResolver) {
          if (!this.pendingMatcher || this.pendingMatcher(parsed)) {
            const resolver = this.pendingResolver;
            this.pendingResolver = null;
            this.pendingMatcher = null;
            resolver(parsed);
          }
        }
      });
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.opened) {
      try {
        await this.device.close();
      } catch {
        // ignore
      }
      this.log('info', 'Device disconnected.');
    }
    this.device = null;
    this.pendingResolver = null;
    this.pendingMatcher = null;
  }

  /**
   * Polls navigator.hid.getDevices() to automatically re-acquire and attach
   * to the keyboard when it reboots between App and Bootloader mode.
   * Includes an initial delay to allow Windows to complete USB deregistration.
   */
  public async waitForReconnection(timeoutMs = 15000, initialDelayMs = 2500): Promise<boolean> {
    const start = Date.now();
    this.log('info', `Waiting for device to re-enumerate on USB bus (timeout: ${timeoutMs / 1000}s)...`);

    if (initialDelayMs > 0) {
      await new Promise((r) => setTimeout(r, initialDelayMs));
    }

    while (Date.now() - start < timeoutMs) {
      try {
        const devices = await navigator.hid.getDevices();
        const match = devices.find(
          (d) =>
            d.collections.some((c) => c.usagePage === 0xffb0 || c.usagePage === 0xffa0) ||
            d.vendorId === 0x1ca6 ||
            d.vendorId === 0x1ca3 ||
            d.vendorId === 7331,
        );
        if (match) {
          await this.attachDevice(match);
          this.log('info', `Successfully reconnected to ${match.productName || 'keyboard'} after USB reset.`);
          return true;
        }
      } catch {
        // Retry
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    this.log('warn', 'Reconnection timeout elapsed without re-acquiring device handle.');
    return false;
  }

  /**
   * Send a Protocol v2 command packet and wait for response.
   * Supports an optional matcher to ensure response matches exact subcommand/row.
   */
  public async sendCommand(
    cmdBytes: number[] | Uint8Array,
    timeoutMs: number = HID_CONFIG.COMMAND_TIMEOUT_MS,
    matcher?: (parsed: ParsedPacket) => boolean,
  ): Promise<ParsedPacket> {
    if (!this.isConnected() || !this.device) {
      throw new Error('Keyboard is not connected.');
    }

    return new Promise((resolve, reject) => {
      this.queue = this.queue
        .then(async () => {
          const packet = buildV2Packet(cmdBytes);
          const headerPreview = Array.from(packet.slice(0, 4))
            .map((b) => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
          this.log('tx', `SEND [${headerPreview}]`, toHex(packet));

          // Firmware upgrade commands (0x08) strictly expect reportId 0,
          // matching vendor SDK (this.device.sendReport(0, data)).
          const isUpgradeCmd = (cmdBytes instanceof Uint8Array ? cmdBytes[0] : cmdBytes[0]) === 0x08;
          const configCol =
            this.device!.collections?.find((c) => c.usagePage === 0xffb0 || c.usagePage === 0xffa0) ||
            this.device!.collections?.[0];

          const outReportId = isUpgradeCmd ? 0 : (configCol?.outputReports?.[0]?.reportId ?? 0);

          const responsePromise = new Promise<ParsedPacket>((res, rej) => {
            const timer = setTimeout(() => {
              if (this.pendingResolver === res) {
                this.pendingResolver = null;
                this.pendingMatcher = null;
              }
              rej(new Error(`Timeout waiting for response to [${headerPreview}] after ${timeoutMs}ms`));
            }, timeoutMs);

            this.pendingResolver = (parsed) => {
              clearTimeout(timer);
              res(parsed);
            };
            this.pendingMatcher = matcher || null;
          });

          try {
            await this.device!.sendReport(outReportId, packet as unknown as BufferSource);
            const result = await responsePromise;
            // Pacing delay between consecutive reports to prevent USB buffer overrun
            await new Promise((r) => setTimeout(r, 8));
            resolve(result);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log('error', `Send failed: ${msg}`);
            reject(err);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

export const keyboardHID = new KeyboardHID();
