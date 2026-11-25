/**
 * Anakeyn — Everglide AE64 Pro (64-Key 60%) Matrix & Layout Controller
 * Physical Rows 1 to 5 mapped to exact 64-key geometry and visual keycap widths.
 */

import { PROTOCOL_V2 } from '../hid/constants';
import { keyboardHID } from '../hid/connection';
import { getKeyLabel } from './keycodes';

export interface KeyMatrixItem {
  layer: number;
  row: number;
  col: number;
  keycode: number;
  label: string;
  width: number; // width in key units 'u' (e.g. 1u, 1.5u, 2u, 6.25u)
}

export interface RowLayoutResult {
  layer: number;
  row: number;
  keys: KeyMatrixItem[];
}

/**
 * Everglide AE64 Pro Physical Key Dimensions (64-key 60% layout):
 * Row 1: Esc, 1..= (13x 1u) + Backspace (2u) = 14 keys (15u total width)
 * Row 2: Tab (1.5u), Q..] (12x 1u) + \ (1.5u) = 14 keys (15u total width)
 * Row 3: Caps (1.75u), A..' (11x 1u) + Enter (2.25u) = 13 keys (15u total width)
 * Row 4: LShift (2u), Z..? (10x 1u) + RShift (1u) + Up (1u) + Fn (1u) = 14 keys (15u total width)
 * Row 5: LCtrl(1.25u), LWin(1.25u), LAlt(1.25u), Space(6.25u), RAlt(1u), RCtrl(1u), Left(1u), Down(1u), Right(1u) = 9 keys (15u total width)
 * Total: 14 + 14 + 13 + 14 + 9 = 64 Keys!
 */
export interface KeyDefinition {
  col: number;      // hardware matrix column index
  width: number;    // key width in 'u' (e.g. 1u, 1.5u, 2u, 6.25u)
}

/**
 * Everglide AE64 Pro Physical Key Dimensions (64-key 60% layout):
 * Row 1: Esc, 1..= (13x 1u) + Backspace (2u) = 14 keys (15u total width)
 * Row 2: Tab (1.5u), Q..] (12x 1u) + \ (1.5u) = 14 keys (15u total width)
 * Row 3: Caps (1.75u), A..' (11x 1u) + Enter (2.25u) = 13 keys (15u total width, skipping unpopulated col 12)
 * Row 4: LShift (2u), Z..? (10x 1u) + RShift (1u) + Up (1u) + Fn1 (1u) = 14 keys (15u total width, skipping unpopulated col 1)
 * Row 5: LCtrl(1.25u), LWin(1.25u), LAlt(1.25u), Space(6.25u), RAlt(1u), RCtrl(1u), Left(1u), Down(1u), Right(1u) = 9 keys (15u total width, skipping unpopulated cols 3, 4, 5, 7, 8, 11)
 * Total: 14 + 14 + 13 + 14 + 9 = 64 Keys!
 */
export const AE64_ROW_MAPPINGS: Record<number, KeyDefinition[]> = {
  1: [
    { col: 0, width: 1 },
    { col: 1, width: 1 },
    { col: 2, width: 1 },
    { col: 3, width: 1 },
    { col: 4, width: 1 },
    { col: 5, width: 1 },
    { col: 6, width: 1 },
    { col: 7, width: 1 },
    { col: 8, width: 1 },
    { col: 9, width: 1 },
    { col: 10, width: 1 },
    { col: 11, width: 1 },
    { col: 12, width: 1 },
    { col: 13, width: 2 },
  ],
  2: [
    { col: 0, width: 1.5 },
    { col: 1, width: 1 },
    { col: 2, width: 1 },
    { col: 3, width: 1 },
    { col: 4, width: 1 },
    { col: 5, width: 1 },
    { col: 6, width: 1 },
    { col: 7, width: 1 },
    { col: 8, width: 1 },
    { col: 9, width: 1 },
    { col: 10, width: 1 },
    { col: 11, width: 1 },
    { col: 12, width: 1 },
    { col: 13, width: 1.5 },
  ],
  3: [
    { col: 0, width: 1.75 },
    { col: 1, width: 1 },
    { col: 2, width: 1 },
    { col: 3, width: 1 },
    { col: 4, width: 1 },
    { col: 5, width: 1 },
    { col: 6, width: 1 },
    { col: 7, width: 1 },
    { col: 8, width: 1 },
    { col: 9, width: 1 },
    { col: 10, width: 1 },
    { col: 11, width: 1 },
    { col: 13, width: 2.25 }, // Enter is at Col 13 (Col 12 is unpopulated ISO pad)
  ],
  4: [
    { col: 0, width: 2 },    // LShift (Col 1 is unpopulated ISO pad)
    { col: 2, width: 1 },    // Z
    { col: 3, width: 1 },    // X
    { col: 4, width: 1 },    // C
    { col: 5, width: 1 },    // V
    { col: 6, width: 1 },    // B
    { col: 7, width: 1 },    // N
    { col: 8, width: 1 },    // M
    { col: 9, width: 1 },    // ,
    { col: 10, width: 1 },   // .
    { col: 11, width: 1 },   // /
    { col: 12, width: 1 },   // RShift
    { col: 13, width: 1 },   // Up
    { col: 14, width: 1 },   // Fn1
  ],
  5: [
    { col: 0, width: 1.25 }, // LCtrl
    { col: 1, width: 1.25 }, // LWin
    { col: 2, width: 1.25 }, // LAlt
    // Cols 3, 4, 5 are unpopulated split-space pads
    { col: 6, width: 6.25 }, // Space
    // Cols 7, 8 are unpopulated pads
    { col: 9, width: 1 },    // RAlt (Col 8 is unpopulated)
    { col: 10, width: 1 },   // RCtrl
    // Col 11 is unpopulated pad
    { col: 12, width: 1 },   // Left (Col 11 is unpopulated)
    { col: 13, width: 1 },   // Down
    { col: 14, width: 1 },   // Right
  ],
};

export class KeyLayoutController {
  /**
   * Read keycodes for an entire row on a given layer.
   * Packet: [0x03, 0x01, layer, row]
   * Ensures the response matches the exact queried layer and row.
   */
  public async readRow(layer = 0, row = 1): Promise<RowLayoutResult> {
    const cmd = [PROTOCOL_V2.LAYOUT_AND_KEY, 0x01, layer, row];

    // Response matcher to ensure no cross-talk from other reports
    const matcher = (p: { protocol: number; subCommand: number; raw: Uint8Array }) =>
      p.protocol === 0x03 &&
      p.subCommand === 0x01 &&
      p.raw[2] === layer &&
      p.raw[3] === row;

    const res = await keyboardHID.sendCommand(cmd, 2500, matcher);

    if (!res.isValid || res.raw.length < 6) {
      throw new Error(`Failed to read key layout for layer ${layer}, row ${row}`);
    }

    const respLayer = res.raw[2];
    const respRow = res.raw[3];
    const rowMappings = AE64_ROW_MAPPINGS[respRow] || [];
    const keys: KeyMatrixItem[] = [];

    // Keycodes start at index 4 (16-bit low, high)
    const keyData = res.raw.slice(4);
    for (const def of rowMappings) {
      const low = keyData[def.col * 2] ?? 0;
      const high = keyData[def.col * 2 + 1] ?? 0;
      const keycode = (high << 8) | low;

      keys.push({
        layer: respLayer,
        row: respRow,
        col: def.col,
        keycode,
        label: getKeyLabel(keycode),
        width: def.width,
      });
    }

    return {
      layer: respLayer,
      row: respRow,
      keys,
    };
  }

  /**
   * Read the full 64-key keyboard matrix across physical rows 1 through 5.
   */
  public async readFullKeyboard(layer = 0): Promise<KeyMatrixItem[][]> {
    const rows: KeyMatrixItem[][] = [];
    for (const r of [1, 2, 3, 4, 5]) {
      const rowResult = await this.readRow(layer, r);
      rows.push(rowResult.keys);
    }
    return rows;
  }

  /**
   * Remap a single key to a new keycode.
   * Packet: [0x03, 0x04, layer, row, col, lowByte, highByte]
   */
  public async remapKey(
    layer: number,
    row: number,
    col: number,
    newKeycode: number,
  ): Promise<boolean> {
    if (layer < 0 || layer > 3) throw new Error('Layer must be between 0 and 3');
    if (row < 1 || row > 5) throw new Error('AE64 Pro rows must be between 1 and 5');
    if (col < 0 || col > 21) throw new Error('Column must be between 0 and 21');
    if (newKeycode < 0 || newKeycode > 0xffff) throw new Error('Invalid keycode');

    const lowByte = newKeycode & 0xff;
    const highByte = (newKeycode >> 8) & 0xff;

    const cmd = [PROTOCOL_V2.LAYOUT_AND_KEY, 0x04, layer, row, col, lowByte, highByte];
    const res = await keyboardHID.sendCommand(cmd);
    return res.isValid;
  }
}

export const keyLayoutController = new KeyLayoutController();
