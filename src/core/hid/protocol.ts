/**
 * Anakeyn — SparkLink Protocol V2 Packet Engine
 * 64-byte frame building, parsing, and data extractors.
 */

import { HID_CONFIG } from './constants';

export interface ParsedPacket {
  protocol: number;
  subCommand: number;
  raw: Uint8Array;
  isValid: boolean;
  data: Uint8Array;
}

/**
 * Build a 64-byte Protocol v2 command packet.
 * Protocol v2 fills unused bytes with 0x00 and does NOT use a checksum byte at 63.
 */
export function buildV2Packet(bytes: number[] | Uint8Array): Uint8Array {
  const packet = new Uint8Array(HID_CONFIG.REPORT_SIZE).fill(0);
  for (let i = 0; i < bytes.length && i < HID_CONFIG.REPORT_SIZE; i++) {
    packet[i] = bytes[i];
  }
  return packet;
}

/**
 * Parse an incoming 64-byte report from the keyboard.
 */
export function parseV2Packet(raw: Uint8Array): ParsedPacket {
  const protocol = raw[0];
  const subCommand = raw[1];
  // An error packet from keyboard firmware starts with FF FF
  const isError = raw[0] === 0xff && raw[1] === 0xff;

  return {
    protocol,
    subCommand,
    raw,
    isValid: !isError,
    data: raw.slice(2),
  };
}

/**
 * Format bytes into a spaced hex string (e.g. "01 02 00 00 ...")
 */
export function toHex(data: Uint8Array, maxBytes = 64): string {
  const slice = data.slice(0, maxBytes);
  return Array.from(slice)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

/**
 * Extract clean string from null-terminated UTF-8/ASCII bytes.
 */
export function decodeString(data: Uint8Array): string {
  const nonNull = Array.from(data).filter((b) => b !== 0x00);
  if (nonNull.length === 0) return '';
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(nonNull)).trim();
  } catch {
    return '';
  }
}
