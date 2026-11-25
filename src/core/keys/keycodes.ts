/**
 * Anakeyn — Complete SparkLink Protocol V2 Keycode Dictionary
 * Reverse-engineered from SparkLink SDK & xsyd.top driver.
 */

export const KEYCODE_MAP: Record<number, string> = {
  // Special / Transparent
  0: '',
  1: '△', // Pass-through to base layer (穿透键)

  // Standard Letters
  4: 'A',
  5: 'B',
  6: 'C',
  7: 'D',
  8: 'E',
  9: 'F',
  10: 'G',
  11: 'H',
  12: 'I',
  13: 'J',
  14: 'K',
  15: 'L',
  16: 'M',
  17: 'N',
  18: 'O',
  19: 'P',
  20: 'Q',
  21: 'R',
  22: 'S',
  23: 'T',
  24: 'U',
  25: 'V',
  26: 'W',
  27: 'X',
  28: 'Y',
  29: 'Z',

  // Digits
  30: '1 !',
  31: '2 @',
  32: '3 #',
  33: '4 $',
  34: '5 %',
  35: '6 ^',
  36: '7 &',
  37: '8 *',
  38: '9 (',
  39: '0 )',

  // Controls & Punctuation
  40: 'Enter',
  41: 'Esc',
  42: 'Backspace',
  43: 'Tab',
  44: 'Space',
  45: '- _',
  46: '= +',
  47: '[ {',
  48: '] }',
  49: '\\ |',
  51: '; :',
  52: '\' "',
  53: '~ `',
  54: ', <',
  55: '. >',
  56: '/ ?',
  57: 'Caps Lock',

  // Function Row
  58: 'F1',
  59: 'F2',
  60: 'F3',
  61: 'F4',
  62: 'F5',
  63: 'F6',
  64: 'F7',
  65: 'F8',
  66: 'F9',
  67: 'F10',
  68: 'F11',
  69: 'F12',

  // Navigation & Editing
  70: 'PrtSc',
  71: 'Scroll',
  72: 'Pause',
  73: 'Insert',
  74: 'Home',
  75: 'PgUp',
  76: 'Delete',
  77: 'End',
  78: 'PgDn',
  79: '→',
  80: '←',
  81: '↓',
  82: '↑',

  // Keypad / Numpad
  83: 'NumLock',
  84: 'KP /',
  85: 'KP *',
  86: 'KP -',
  87: 'KP +',
  88: 'KP Enter',
  89: 'KP 1',
  90: 'KP 2',
  91: 'KP 3',
  92: 'KP 4',
  93: 'KP 5',
  94: 'KP 6',
  95: 'KP 7',
  96: 'KP 8',
  97: 'KP 9',
  98: 'KP 0',
  99: 'KP .',
  100: 'ISO \\',
  101: 'Menu',
  102: 'Power',
  103: 'KP =',
  104: 'F13',
  105: 'F14',
  106: 'F15',
  107: 'F16',
  108: 'F17',
  109: 'F18',
  110: 'F19',
  111: 'F20',
  112: 'F21',
  113: 'F22',
  114: 'F23',
  115: 'F24',

  // Standard Modifiers
  224: 'L-Ctrl',
  225: 'L-Shift',
  226: 'L-Alt',
  227: 'L-Gui',
  228: 'R-Ctrl',
  229: 'R-Shift',
  230: 'R-Alt',
  231: 'R-Gui',

  // System shortcuts (OEM pre-encoded combination keys)
  0x1152: 'Mac Console',
  0x1329: 'Task Manager', // Ctrl+Shift+Esc
  0x1807: 'Desktop',      // Win+D
  0x1808: 'Explorer',     // Win+E
  0x1815: 'Run',          // Win+R

  // Media & Consumer Keys (HID Usage Page 0x0C)
  0x20CD: '⏯ Play',     // 8397 (Play/Pause 播放/暂停)
  0x20E9: '🔊 Vol+',     // 8425 (Volume Increment 音量+)
  0x20EA: '🔉 Vol-',     // 8426 (Volume Decrement 音量-)
  0x20E2: '🔇 Mute',     // 8418 (Mute 静音)
  0x20B5: '⏭ Next',     // 8373 (Scan Next Track 下一曲)
  0x20B6: '⏮ Prev',     // 8374 (Scan Previous Track 上一曲)
  0x20B7: '⏹ Stop',     // 8375 (Stop 停止)
  0x2192: '🧮 Calc',     // 8594 (Calculator 计算器)
  0x2194: '💻 PC',       // 8596 (My Computer 我的电脑)
  0x2183: '🎵 Music',    // 8579 (Media Player 音乐)
  0x218A: '✉️ Mail',     // 8586 (Email 邮件)
  0x2223: '🌐 Browser',  // 8739 (Web Browser 浏览器)

  // SparkLink Layer & Function Keys (0xF100 - 0xF1FF)
  0xF100: 'Fn0',
  0xF101: 'Fn1',
  0xF102: 'Fn2',
  0xF103: 'Fn3',

  // SparkLink System & Control (0xF200 - 0xF2FF) - Verified from keyboard.md
  0xF200: '⚠️ Reset',     // 61952: 恢复出厂设置 (Factory Reset)
  0xF201: '⊞ Win Mode',  // 61953: 切换至Windows布局 (Switch to Windows Layout)
  0xF202: ' Mac Mode',  // 61954: 切换至Mac布局 (Switch to Mac Layout)
  0xF203: '⟲ Calibrate', // 61955: 校准磁轴 (Calibrate Magnetic Axis)
  0xF205: 'Prof 1',      // 61957: 切换配置1 (Profile 1)
  0xF206: 'Prof 2',      // 61958: 切换配置2 (Profile 2)
  0xF207: 'Prof 3',      // 61959: 切换配置3 (Profile 3)
  0xF208: 'Prof 4',      // 61960: 切换配置4 (Profile 4)
  0xF209: '🔒 Win Lock', // 61961: 锁Win键 (Lock Windows Key)
  0xF20A: '⟲ Calibrate', // (Legacy alias)

  // SparkLink Keyboard Lighting Control (0xF300 - 0xF30F) - Verified from keyboard.md
  0xF300: '💡 Light Mode',   // 62208: 灯效模式切换 (Cycle Light Mode)
  0xF301: '🎨 Color',        // 62209: 灯效颜色切换 (Cycle Light Color)
  0xF302: '🔆 Bri +',        // 62210: 灯效亮度+ (Backlight Brightness +)
  0xF303: '🔅 Bri -',        // 62211: 灯效亮度- (Backlight Brightness -)
  0xF304: '⚡ Speed +',      // 62212: 灯效速度+ (Backlight Speed +)
  0xF305: '⚡ Speed -',      // 62213: 灯效速度- (Backlight Speed -)
  0xF306: '⏮ Prev Mode',    // 62214: 灯效上一个模式 (Previous Light Mode)
  0xF307: '💡 Light On/Off', // 62215: 开关灯光 (Toggle Backlight On/Off)
  0xF308: '↔️ Light Dir',    // 62216: 灯效方向 (Light Direction)

  // SparkLink Decorative Lighting 1 (0xF310 - 0xF31F)
  0xF310: '✨ D1 Mode',
  0xF311: '🎨 D1 Color',
  0xF312: '🔆 D1 Bri +',
  0xF313: '🔅 D1 Bri -',
  0xF314: '⚡ D1 Spd +',
  0xF315: '⚡ D1 Spd -',
  0xF316: '⏮ D1 Prev',
  0xF317: '✨ D1 On/Off',
  0xF318: '↔️ D1 Dir',

  // SparkLink Decorative Lighting 2 (0xF320 - 0xF32F)
  0xF320: '✨ D2 Mode',
  0xF327: '✨ D2 On/Off',

  // Wireless 3-Mode (0xF400 - 0xF4FF)
  0xF401: 'USB',
  0xF402: '2.4G',
  0xF403: 'BT 1',
  0xF404: 'BT 2',
  0xF405: 'BT 3',
  0xF406: 'Pair Reset',
  0xF407: '🔋 Battery',

  // Screen Brightness (Consumer 0x206F, 0x2070)
  0x206F: '☀️ Bri+',
  0x2070: '🔅 Bri-',

  // Mouse Keys (0x4000 - 0x4B01)
  0x4000: 'M-Release',
  0x4100: 'M-Left',
  0x4200: 'M-Right',
  0x4300: 'M-Mid',
  0x4400: 'M-Fwd',
  0x4500: 'M-Back',
  0x4600: 'M-Left X',
  0x4700: 'M-Right X',
  0x4800: 'M-Up Y',
  0x4900: 'M-Down Y',
  0x4A01: 'Wheel ↑',
  0x4B01: 'Wheel ↓',

  // SparkLink Macro Keys (0xF500 - 0xF50F)
  0xF500: 'M0',
  0xF501: 'M1',
  0xF502: 'M2',
  0xF503: 'M3',
  0xF504: 'M4',
  0xF505: 'M5',
  0xF506: 'M6',
  0xF507: 'M7',
  0xF508: 'M8',
  0xF509: 'M9',
  0xF50A: 'M10',
  0xF50B: 'M11',
  0xF50C: 'M12',
  0xF50D: 'M13',
  0xF50E: 'M14',
  0xF50F: 'M15',
};

/**
 * Standard Browser event.code to USB HID Keycode map for Macro recording
 */
export const BROWSER_CODE_TO_HID: Record<string, number> = {
  // Letters A-Z
  KeyA: 0x04, KeyB: 0x05, KeyC: 0x06, KeyD: 0x07, KeyE: 0x08,
  KeyF: 0x09, KeyG: 0x0A, KeyH: 0x0B, KeyI: 0x0C, KeyJ: 0x0D,
  KeyK: 0x0E, KeyL: 0x0F, KeyM: 0x10, KeyN: 0x11, KeyO: 0x12,
  KeyP: 0x13, KeyQ: 0x14, KeyR: 0x15, KeyS: 0x16, KeyT: 0x17,
  KeyU: 0x18, KeyV: 0x19, KeyW: 0x1A, KeyX: 0x1B, KeyY: 0x1C,
  KeyZ: 0x1D,

  // Numbers 1-0
  Digit1: 0x1E, Digit2: 0x1F, Digit3: 0x20, Digit4: 0x21, Digit5: 0x22,
  Digit6: 0x23, Digit7: 0x24, Digit8: 0x25, Digit9: 0x26, Digit0: 0x27,

  // Controls & Whitespace
  Enter: 0x28, Escape: 0x29, Backspace: 0x2A, Tab: 0x2B, Space: 0x2C,
  Minus: 0x2D, Equal: 0x2E, BracketLeft: 0x2F, BracketRight: 0x30,
  Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35,
  Comma: 0x36, Period: 0x37, Slash: 0x38, CapsLock: 0x39,

  // Function keys F1-F12
  F1: 0x3A, F2: 0x3B, F3: 0x3C, F4: 0x3D, F5: 0x3E, F6: 0x3F,
  F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43, F11: 0x44, F12: 0x45,

  // Navigation & Editing
  PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48, Insert: 0x49,
  Home: 0x4A, PageUp: 0x4B, Delete: 0x4C, End: 0x4D, PageDown: 0x4E,
  ArrowRight: 0x4F, ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52,

  // Modifiers
  ControlLeft: 0xE0, ShiftLeft: 0xE1, AltLeft: 0xE2, MetaLeft: 0xE3,
  ControlRight: 0xE4, ShiftRight: 0xE5, AltRight: 0xE6, MetaRight: 0xE7,
};

export function getKeyLabel(keycode: number): string {
  // Direct match
  if (KEYCODE_MAP[keycode] !== undefined) {
    return KEYCODE_MAP[keycode] || '·';
  }

  // SparkLink Combination Key Protocol: 0x1000 | (modifiers << 8) | baseKeycode
  // Modifiers: 0x01 = Ctrl, 0x02 = Shift, 0x04 = Alt, 0x08 = Win
  if ((keycode & 0xF000) === 0x1000) {
    const mods = (keycode >> 8) & 0x0F;
    const baseCode = keycode & 0xFF;
    const modParts: string[] = [];
    if (mods & 0x01) modParts.push('Ctrl');
    if (mods & 0x02) modParts.push('Shift');
    if (mods & 0x04) modParts.push('Alt');
    if (mods & 0x08) modParts.push('Win');
    const baseLabel = KEYCODE_MAP[baseCode] || `0x${baseCode.toString(16).toUpperCase()}`;
    return modParts.length > 0 ? `${modParts.join('+')}+${baseLabel}` : baseLabel;
  }

  return `0x${keycode.toString(16).toUpperCase()}`;
}
