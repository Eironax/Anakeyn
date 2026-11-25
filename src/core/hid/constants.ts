/**
 * Anakeyn — SparkLink Protocol V2 Constants & Enums
 * Derived from @sparklinkplayjoy/protocol-keyboard-v2
 */

export interface KnownDevice {
  vendorId: number;
  productId: number;
  name: string;
}

export const KNOWN_DEVICES: KnownDevice[] = [
  { vendorId: 0x1ca6, productId: 0x300a, name: 'Everglide AE64 Pro' },
  { vendorId: 0x1ca3, productId: 0x0801, name: 'AE64 Series (Legacy VID)' },
  { vendorId: 7331, productId: 2049, name: 'SparkLink ET65 / AE64 Series' },
];

export const HID_CONFIG = {
  REPORT_ID: 0x00,
  REPORT_SIZE: 64, // 64-byte reports
  RESPONSE_DELAY_MS: 15,
  COMMAND_TIMEOUT_MS: 2000,
} as const;

/**
 * Protocol Categories (Byte 0)
 */
export const PROTOCOL_V2 = {
  DEVICE: 0x01,           // Device identification
  GLOBAL: 0x02,           // Global settings (system, report rate, reset, save)
  LAYOUT_AND_KEY: 0x03,   // Key layout & remapping
  PERFORMANCE: 0x04,      // Hall Effect & Rapid Trigger performance
  LIGHTING: 0x05,         // RGB Lighting
  HIGHER_KEY: 0x06,       // DKS, MT, TGL advanced keys
  MACRO: 0x07,            // Macros
  FIRMWARE_UPGRADE: 0x08, // OTA / Firmware
  CUSTOM_COMMAND: 0x0a,   // Custom commands
  DISPLAYER: 0x0c,        // Screen / GIF
  THREE_MODE: 0x0d,       // Wireless 3-mode
  VOICE: 0x0e,            // Audio / Voice
  TOUCH: 0x0f,            // Haptic touch
  HANDLE: 0x10,           // Controller / Gamepad mode
  THREE_D: 0x11,          // 3D Hall Effect
} as const;

/**
 * Device Sub-commands (Byte 1 when Byte 0 == 0x01)
 */
export const DEVICE_CMD = {
  PROTOCOL_VERSION: 0x01, // Read protocol version
  DEVICE_INFO: 0x02,      // Read Board ID, App Version, PCB Version, SN
  DEVICE_FEATURE: 0x03,   // Read Switch type (Hall Effect), connection modes
} as const;

/**
 * Global Feature Sub-commands (Byte 1 when Byte 0 == 0x02)
 */
export const GLOBAL_CMD = {
  RESET_FACTORY: 0x01,
  SAVE_PARAM: 0x02,
  CONFIG_SWITCH: 0x03,
  SYSTEM_SETTING: 0x04,       // Win / Mac mode
  REPORT_RATE_SETTING: 0x05,  // Polling rate
  CALIBRATION_SETTING: 0x06,
  AXIS_LIBRARY_QUERY: 0x07,
  LIGHT_AREA_QUERY: 0x08,
  MODIFY_DEFAULT_AXIS: 0x09,
  RT_PRECISION_QUERY: 0x0c,   // Rapid trigger min precision
  SLEEP_TIME: 0x0d,           // Sleep time query/setting
  SHAKE_OPTIMIZATION: 0x10,   // Anti-shake optimization switch
  HIGH_POLLING_RATE_RESET: 0x0f, // 16K/8K reset
} as const;

/**
 * Command Access Mode (CRW - Byte 2 in Global commands)
 */
export const CRW = {
  READ_LIST: 0x00,
  READ: 0x01,
  WRITE: 0x02,
} as const;

export const POLLING_RATE_LABELS: Record<number, string> = {
  0: '8000 Hz (0.125ms)',
  1: '4000 Hz (0.25ms)',
  2: '2000 Hz (0.5ms)',
  3: '1000 Hz (1.0ms)',
  4: '500 Hz (2.0ms)',
  5: '250 Hz (4.0ms)',
  6: '125 Hz (8.0ms)',
};
