# Anakeyn

An open-source, offline-first **WebHID** driver and configurator for the **Everglide AE64 Pro** Hall Effect magnetic-switch keyboard (SparkLink Protocol v2).

Anakeyn runs locally in your browser with no account, no cloud dependency, and full control over your hardware via WebHID (`0xFFB0` configuration interface).

---

## Screenshots

### Connect Screen
![Connect your Everglide AE64 Pro](Screenshots%20(UI)/Anakeyn/Intro.png)

### Key Remapping & Matrix
![Key Remapping & Matrix](Screenshots%20(UI)/Anakeyn/Remap.png)

---

## Features

- **Key Remap & Matrix Layers** — Remap keys across `Main`, `FN1`, `FN2`, and `FN3` layers with support for Basic, Special, Media, Lighting, Control, Mouse, Macro, and Combine bindings.
- **Hall Effect & Rapid Trigger** — Configure per-key actuation points, Rapid Trigger (RT) sensitivity, dead zones, live travel testing, key calibration, and magnetic switch profiles (including Everglide Siren V4, Cullinan, Wukong, Gateron, and TTC).
- **RGB Lighting** — Customize keyboard and decorative light-bar effects, brightness, speed, and per-key colors.
- **Advanced Keys** — Configure `SOCD` (Snap-Tap), `DKS` (Dynamic Keystroke), `MPT` (Multi-Point Trigger), `MT` (Mod-Tap), `TGL` (Toggle), `END` (End Trigger), and `RS`.
- **Macro Editor** — Record, edit, and bind multi-step keystroke and delay macros.
- **Onboard Configs** — Switch between the 4 onboard hardware profile slots (`P1`–`P4`), rename slots, and import/export configurations.
- **Device Settings & Firmware Update** — Inspect hardware specs, adjust polling rate (up to 8000 Hz) and sleep timer, factory reset, and flash `.bin` firmware updates directly over WebHID.
- **WebHID Packet Inspector** — Built-in live TX/RX protocol packet drawer for debugging SparkLink v2 frames.

---

## Requirements

- **Browser:** A Chromium-based browser with WebHID support (**Google Chrome**, **Microsoft Edge**, or **Opera**).
- **Runtime:** Node.js (v18+) and `pnpm` (or `npm`).

---

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```
   *(or `npm install`)*

2. **Start the local development server:**
   ```bash
   pnpm dev
   ```
   *(or `npm run dev`)*

3. **Open in Chrome/Edge:**
   Navigate to the local URL printed by Vite (typically `http://localhost:5173`), plug in your Everglide AE64 Pro (or 2.4G dongle), and click **Connect AE64 Pro**.

4. **Production build:**
   ```bash
   pnpm build
   ```

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Lucide Icons
- **Hardware Communication:** Browser WebHID API (`navigator.hid`)
- **Protocol Reference:** `@sparklinkplayjoy/protocol-keyboard-v2` / `@sparklinkplayjoy/sdk-keyboard-v2`

---

## License

Licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See [LICENSE](LICENSE) for details.
