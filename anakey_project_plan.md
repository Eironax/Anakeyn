# 🎹 Anakey — Project Plan
### A Better Web Driver for the Everglide AE64 Pro

---

## The Big Picture

You're **not** wrong about the general approach, but I'd flip the order. Here's why:

> [!IMPORTANT]
> **Don't build the UI first.** Build the **communication layer first**, then wrap UI around it.
>
> If you build UI first, you're guessing at data shapes, state flows, and what's actually possible. You'll end up rewriting half of it. The protocol layer is the foundation — everything else is a skin over it.

The correct order is:

```
1. Reverse-engineer the protocol  →  2. Build the HID communication layer  →  3. Build UI page-by-page, wiring in real data as you go
```

---

## What You Already Have (It's a Lot)

### SparkLink `keyboard-docs` repo — **This is gold**
The repo you downloaded is the **official SDK documentation** from SparkLink (星闪悦动), the OEM behind your keyboard's firmware. It documents the JavaScript API that `xsyd.top` uses internally. This is essentially a **reverse-engineering shortcut** — you don't need to sniff raw HID bytes for most features because they've documented the high-level API.

Key files and what they contain:

| File | What It Documents |
|------|------------------|
| [`keyboardv2/api/info.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/api/info.md) | Device detection, init, firmware info, polling rate, USB mode, sleep time, calibration |
| [`keyboardv2/api/performance.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/api/performance.md) | Per-key RT settings, actuation points, dead zones, ADC sampling, travel test, axis/switch config |
| [`keyboardv2/api/key.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/api/key.md) | Key remapping across layers (Main, Fn1, Fn2, Fn3) |
| [`keyboardv2/api/lighting.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/api/lighting.md) | RGB lighting modes, per-key custom colors, brightness, speed, decorative lighting |
| [`keyboardv2/api/higherKey.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/api/higherKey.md) | Advanced keys — SOCD, DKS, MPT, MT, TGL, END |
| [`keyboardv2/api/macro.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/api/macro.md) | Macro recording, playback modes, per-key macro binding |
| [`keyboardv2/api/handle.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/api/handle.md) | Gamepad emulation modes |
| [`keyboard/model.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboard/model.md) | Data models — Device, BaseInfo, LightMode, DKS, SOCD, Macro types |
| [`keyboard/type.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboard/type.md) | All HID command opcodes (0x01–0x76) |
| [`keyboardv2/keyboard.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/keyboard.md) | Complete keycode map (2000+ entries) |

### Screenshots of xsyd.top
You have 8 screenshots covering every page of the original driver:
- **Custom Key** — key remapping with layer switching and drag-to-assign
- **Performance** — Rapid Trigger, Dead Zone, Magnetic Switch, Calibration, Travel Test
- **Lighting** — color picker, 20 lighting modes, brightness/speed, decorative lighting tabs
- **Advanced Key** — SOCD, DKS, MPT, MT, TGL, END with key binding UI
- **Macro** — M0–M15 macro slots, recording, repeat modes
- **My Config** — 4 profile slots (配置一–四), cloud config import
- **Update/Restore** — firmware update (online/local), factory restore, sleep time, report rate

---

## The Plan — 5 Phases

### Phase 0: Research & Protocol Mapping *(~2–3 days)*

**Goal:** Understand exactly how xsyd.top talks to your keyboard, and validate the SparkLink docs against your specific board.

#### 0.1 — Sniff the xsyd.top Web Driver
1. Open `hub.xsyd.top` in Chrome with your keyboard connected
2. Open DevTools → **Console** and run:
   ```js
   // List all HID devices the page has access to
   navigator.hid.getDevices().then(d => console.log(d));
   ```
3. Note your keyboard's **vendorId**, **productId**, and **usagePage** / **usage** values
4. Open DevTools → **Sources** → find the bundled JS and search for:
   - `sendFeatureReport` / `receiveFeatureReport` — these are the raw HID calls
   - `ServiceKeyboard` — the SDK class the docs describe
   - The npm packages `@sparklinkplayjoy/protocol-keyboard` and `@sparklinkplayjoy/sdk-keyboard-v2`

#### 0.2 — Build a Minimal HID Probe Script
Create a simple HTML page that:
1. Requests HID access with `navigator.hid.requestDevice()` using your keyboard's vendor/product filters
2. Opens the device
3. Sends a known-safe read command (e.g., opcode `0x01` = get protocol version)
4. Logs the raw 64-byte response

> [!CAUTION]
> **Safety rule: READ BEFORE WRITE.** Never send unknown opcodes. Stick to the documented ones from [`type.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboard/type.md). Some opcodes (like `0x11` = factory reset) are destructive.

#### 0.3 — Create a Protocol Reference Document
Map every opcode from the docs to:
- What it does
- Request format (which bytes mean what)
- Response format
- Whether it's safe (read) or dangerous (write/erase)

---

### Phase 1: Communication Layer *(~1 week)*

**Goal:** Build a clean JavaScript HID abstraction that can talk to the keyboard — your own version of `ServiceKeyboard`.

#### Tech Stack Decision

| Option | Pros | Cons |
|--------|------|------|
| **Pure WebHID (browser-only)** | No install, works like xsyd.top, Chrome/Edge compatible | Needs HTTPS or localhost, no system tray |
| **Electron + WebHID** | Desktop app feel, system tray, auto-launch | Heavier, more setup |
| **Vite + WebHID** | Fast dev, hot reload, modern tooling | Still browser-based |

**Recommendation:** Start with **Vite + vanilla JS/TS** for fast iteration. You can wrap it in Electron later if you want a desktop app.

#### 1.1 — HID Connection Manager
```
src/
  hid/
    connection.js    — requestDevice(), open(), close(), reconnect logic
    protocol.js      — packet builder/parser, checksum calc, opcode constants
    commands.js      — high-level command functions (getDeviceInfo, getPerformance, etc.)
    constants.js     — vendorId, productId, opcodes, keycode maps
```

Key implementation details from the docs:
- **Report type:** 64-byte HID Feature Reports, Report ID `0`
- **Packet structure:** Byte 0 = opcode, remaining bytes = payload
- **Checksum:** `0xFF - (sum of all bytes & 0xFF)`
- **Response pattern:** Send request → wait ~10ms → read response (opcode echoed in byte 0)
- **Usage page filter:** `0xFF00` (65280) or `0xFFA0` (65440) — check your specific device

#### 1.2 — Command Implementation (in order of safety/usefulness)

**Safe reads first (Phase 1a):**
1. `getProtocolVersion()` — opcode `0x01`
2. `getDevicesInfo()` — board ID, firmware version, SN
3. `getRateOfReturn()` — current polling rate
4. `getConfig()` — current profile
5. `getPerformance({row, col})` — per-key RT/actuation settings
6. `getKeyLayout()` — current key mappings per layer
7. `getLightingMode()` — current RGB settings
8. `getCalibrationStatus()` — per-key calibration state
9. `getADCSample({row})` — raw hall effect ADC values (live!)
10. `getRoute({row})` — key travel distance (live!)

**Writes (Phase 1b — after reads are solid):**
1. `setConfig()` — switch profiles
2. `setPerformance()` — per-key RT settings
3. `setKeyMapping()` — remap keys
4. `setLightingMode()` — change RGB
5. `setRateOfReturn()` — change polling rate
6. `savingParameter()` — persist changes to flash

---

### Phase 2: Core UI Shell *(~1 week)*

**Goal:** Build the app skeleton with navigation, device connection UI, and the keyboard visualizer component — the thing every page shares.

#### 2.1 — Project Setup
```bash
npx -y create-vite@latest ./ --template vanilla
# or --template vanilla-ts if you prefer TypeScript
```

#### 2.2 — App Architecture
```
src/
  index.html
  index.css           — design system, dark theme, variables
  main.js             — app entry, router
  
  hid/                — from Phase 1
  
  components/
    keyboard-viz.js   — interactive AE64 layout SVG/canvas
    sidebar.js        — left nav menu
    connection-bar.js — device status, SN, firmware version
    
  pages/
    performance.js    — RT settings, dead zone, calibration, travel test
    lighting.js       — RGB control
    custom-key.js     — key remapping per layer
    advanced-key.js   — SOCD, DKS, MPT, etc.
    macro.js          — macro editor
    my-config.js      — profile management
    settings.js       — firmware update, sleep time, polling rate, factory reset
```

#### 2.3 — The Keyboard Visualizer (Most Important Component)
This is the centerpiece — every page uses it. It needs to:
- Render the exact AE64 Pro layout (64 keys + arrows, GH60 compatible)
- Support click-to-select (single key, WASD group, select-all)
- Show per-key data overlays (actuation values, colors, keycodes)
- Highlight selected keys
- Support drag-and-drop for key remapping

Build this as a reusable component with different "modes":
- `performance` mode — shows actuation values, click to edit
- `lighting` mode — shows key colors, click/drag to paint
- `remapping` mode — click key → assign new keycode
- `advanced` mode — click key → configure SOCD/DKS
- `macro` mode — click key → bind macro

---

### Phase 3: Feature Pages *(~2–3 weeks, one page at a time)*

**Build each page in this order** (easiest → hardest, most impactful → niche):

#### 3.1 — Performance Page ⚡ *(Start here — this is why people use the driver)*
- **Trigger tab:** Rapid Trigger toggle, per-key actuation point slider (0.001mm precision!)
- **Dead Zone tab:** Press/release dead zone sliders
- **Magnetic Switch tab:** Switch type selection (axis list from SparkLink API)
- **Calibration tab:** Start/end calibration, per-key status visualization
- **Travel Test tab:** Live ADC + travel distance visualization (the coolest feature — shows real-time key press depth)

> [!TIP]
> The Travel Test is where you can **surpass** xsyd.top. Add a real-time graph/waveform showing key press depth over time — the original doesn't have this. This is your "killer feature" opportunity.

#### 3.2 — Custom Key Page 🔤
- Layer selector (Main, Fn1, Fn2, Fn3)
- Click key on visualizer → shows current assignment
- Drag-from keycode palette below (Basic, Special, Media, Lighting, Control, Combine, Mouse tabs)
- Restore button to reset layer

#### 3.3 — Lighting Page 💡
- Color picker (HSV/RGB/HEX)
- 20 lighting modes (L1–L20) + custom mode
- Brightness and speed sliders
- Decorative lighting tabs (if your board supports them)
- Per-key color painting on the keyboard viz

#### 3.4 — Advanced Key Page 🎮
- Sub-pages: SOCD, DKS, MPT, MT, TGL, END
- SOCD: bind key pair → select mode (Last Override, A Priority, B Priority, Neutralize) + delay
- DKS: 4-position dynamic keystroke editor
- Key test area for validation

#### 3.5 — Macro Page 📝
- M0–M15 macro slot grid
- Recording interface (start/stop, keystroke capture)
- Playback mode selector (repeat N times, hold-to-repeat, toggle)
- Default delay setting
- Drag macro key to keyboard viz to bind

#### 3.6 — My Config / Settings Page ⚙️
- 4 profile cards with rename, apply, export/import
- Polling rate dropdown (125Hz → 8KHz)
- Sleep time setting
- Firmware version display
- Factory restore (with confirmation dialog!)

---

### Phase 4: Polish & "Better Than Original" Features *(Ongoing)*

This is where Anakey becomes **better** than xsyd.top:

#### Improvements over the original:
| Feature | xsyd.top | Anakey (your version) |
|---------|----------|-----------------------|
| Language | Chinese-first, broken English | English-first, clean UI |
| Travel Test | Basic numbers | Real-time waveform graph |
| Profile management | Basic 4 slots | Export/import as JSON files, shareable |
| Settings backup | Cloud-only (needs login) | Local file export, no account needed |
| Batch operations | Limited | "Apply RT settings to all keys" one-click |
| UI/UX | Functional but dated | Modern, responsive, premium feel |
| Offline | Needs internet for some features | Fully offline-capable |

#### Bonus features to consider:
- **Config diff view** — see what changed between profiles
- **Keyboard heatmap** — visualize which keys have highest actuation points
- **Preset library** — "FPS Gaming", "Typing", "Valorant SOCD" presets
- **ADC health check** — detect keys with abnormal hall sensor readings
- **Multiple keyboard support** — if you ever get another Sparklink board, it should just work

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Build tool** | Vite |
| **Language** | JavaScript (or TypeScript) |
| **Styling** | Vanilla CSS with custom properties (dark theme) |
| **HID communication** | WebHID API (browser-native) |
| **Keyboard viz** | SVG or Canvas |
| **State management** | Simple module-level stores (no framework needed) |
| **Charts** (travel test) | Canvas 2D or a lightweight lib |
| **Packaging** (later) | Electron (optional, for desktop app) |

---

## Risk Checklist

> [!WARNING]
> Things that could go wrong and how to mitigate:

| Risk | Mitigation |
|------|-----------|
| **Bricking the keyboard** | Never send undocumented opcodes. Always `getPerformance` before `setPerformance`. Keep a "known good" config backup. |
| **Protocol mismatch** | The SparkLink docs may not 100% match your specific firmware version (V1.0.0.6). Verify each command's response before relying on it. |
| **WebHID browser support** | Only works in Chromium (Chrome, Edge). Firefox/Safari won't work. This is the same limitation as xsyd.top. |
| **Firmware updates break things** | Version-gate features (check `getProtocolVersion()` before using newer API calls). |
| **The SDK packages are obfuscated** | The `@sparklinkplayjoy` npm packages exist but may be minified. The docs repo is your best reference. |

---

## Immediate Next Steps

1. **Read the remaining API docs** — especially [`higherKey.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/api/higherKey.md) and [`lighting.md`](file:///d:/Projects/Anakey/keyboard-docs-main/keyboard-docs-main/keyboardv2/api/lighting.md)
2. **Run the HID probe** — connect to your keyboard and verify the vendorId/productId/usagePage
3. **Start Phase 1.1** — build the connection manager
4. **Get one command working end-to-end** — `getProtocolVersion()` is the safest starting point

When you're ready to start coding, just say the word and we'll begin with the HID connection layer. 🚀
