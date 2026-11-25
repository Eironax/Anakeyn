import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type { KeyMatrixItem } from '../../core/keys/layout';
import { getKeyLabel } from '../../core/keys/keycodes';
import { KeyboardCanvas, type KeyBadgeOverlay } from '../keyboard/KeyboardCanvas';
import {
  higherKeyController,
  HigherKeyType,
  SOCDMode,
} from '../../core/higherKey/higherKeyController';
import { keyboardHID } from '../../core/hid/connection';

interface AdvancedViewProps {
  keymapRows: KeyMatrixItem[][] | null;
  isLoadingKeymap?: boolean;
  selectedLayer: number;
  onSelectLayer: (layer: number) => void;
}

type AdvancedSubTab = 'socd' | 'dks' | 'mpt' | 'mt' | 'tgl' | 'end' | 'rs';

export interface AppliedHigherKey {
  row: number;
  col: number;
  label: string;
  type: AdvancedSubTab;
  data: {
    // MT
    tapKc?: number;
    holdKc?: number;
    timeMs?: number;
    // DKS
    kcs?: [number, number, number, number];
    dbs?: [number, number];
    trps?: [number, number, number, number];
    // MPT
    mptKcs?: [number, number, number];
    mptDbs?: [number, number, number];
    // TGL
    tglKc?: number;
    // END
    endPressKc?: number;
    endReleaseKc?: number;
    endDelay?: number;
    // RS
    linkedRow?: number;
    linkedCol?: number;
    linkedLabel?: string;
    rsDelay?: number;
    // SOCD
    socdPartnerRow?: number;
    socdPartnerCol?: number;
    socdPartnerLabel?: string;
    socdRole?: 'A' | 'B';
    socdMode?: SOCDMode;
    socdDelay?: number;
  };
}

interface SocdPairConfig {
  id: string;
  keyA: { row: number; col: number; label: string; keycode: number };
  keyB: { row: number; col: number; label: string; keycode: number };
  mode: SOCDMode;
  delay: number;
}

const SOCD_MODES = [
  {
    mode: SOCDMode.LastOverride,
    label: 'Last Override',
    labelZh: '后覆盖',
    tag: 'Snap Tap',
    desc: 'The latest pressed key overrides the previous key instantly. Releasing the latest key restores the held key with zero delay.',
  },
  {
    mode: SOCDMode.PriorityA,
    label: 'A Priority',
    labelZh: 'A优先',
    tag: 'A-Win',
    desc: 'Key A always wins and remains active whenever both keys are pressed simultaneously.',
  },
  {
    mode: SOCDMode.PriorityB,
    label: 'B Priority',
    labelZh: 'B优先',
    tag: 'B-Win',
    desc: 'Key B always wins and remains active whenever both keys are pressed simultaneously.',
  },
  {
    mode: SOCDMode.Neutralize,
    label: 'Neutralize',
    labelZh: '中性',
    tag: 'Cancel',
    desc: 'Both keys cancel out to neutral (zero output) when pressed simultaneously.',
  },
];

// Character Palettes for Basic and Extended characters
const BASIC_CHARACTERS: { label: string; code: number }[] = [
  { label: 'A', code: 4 }, { label: 'B', code: 5 }, { label: 'C', code: 6 }, { label: 'D', code: 7 },
  { label: 'E', code: 8 }, { label: 'F', code: 9 }, { label: 'G', code: 10 }, { label: 'H', code: 11 },
  { label: 'I', code: 12 }, { label: 'J', code: 13 }, { label: 'K', code: 14 }, { label: 'L', code: 15 },
  { label: 'M', code: 16 }, { label: 'N', code: 17 }, { label: 'O', code: 18 }, { label: 'P', code: 19 },
  { label: 'Q', code: 20 }, { label: 'R', code: 21 }, { label: 'S', code: 22 }, { label: 'T', code: 23 },
  { label: 'U', code: 24 }, { label: 'V', code: 25 }, { label: 'W', code: 26 }, { label: 'X', code: 27 },
  { label: 'Y', code: 28 }, { label: 'Z', code: 29 },
  { label: '1', code: 30 }, { label: '2', code: 31 }, { label: '3', code: 32 }, { label: '4', code: 33 },
  { label: '5', code: 34 }, { label: '6', code: 35 }, { label: '7', code: 36 }, { label: '8', code: 37 },
  { label: '9', code: 38 }, { label: '0', code: 39 },
  { label: 'Space', code: 44 }, { label: 'Enter', code: 40 }, { label: 'Esc', code: 41 }, { label: 'Tab', code: 43 },
  { label: 'Back', code: 42 }, { label: 'Caps', code: 57 }, { label: 'Ctrl', code: 0xE0 }, { label: 'Shift', code: 0xE1 },
  { label: 'Alt', code: 0xE2 }, { label: 'Win', code: 0xE3 }, { label: '-', code: 45 }, { label: '=', code: 46 },
  { label: '[', code: 47 }, { label: ']', code: 48 }, { label: '\\', code: 49 }, { label: ';', code: 51 },
  { label: "'", code: 52 }, { label: '`', code: 53 }, { label: ',', code: 54 }, { label: '.', code: 55 },
  { label: '/', code: 56 },
];

const EXTENDED_CHARACTERS: { label: string; code: number }[] = [
  { label: 'F1', code: 58 }, { label: 'F2', code: 59 }, { label: 'F3', code: 60 }, { label: 'F4', code: 61 },
  { label: 'F5', code: 62 }, { label: 'F6', code: 63 }, { label: 'F7', code: 64 }, { label: 'F8', code: 65 },
  { label: 'F9', code: 66 }, { label: 'F10', code: 67 }, { label: 'F11', code: 68 }, { label: 'F12', code: 69 },
  { label: '↑', code: 82 }, { label: '↓', code: 81 }, { label: '←', code: 80 }, { label: '→', code: 79 },
  { label: 'Insert', code: 73 }, { label: 'Delete', code: 76 }, { label: 'Home', code: 74 }, { label: 'End', code: 77 },
  { label: 'PgUp', code: 75 }, { label: 'PgDn', code: 78 },
  { label: 'PrtSc', code: 70 }, { label: 'ScrLk', code: 71 }, { label: 'Pause', code: 72 },
  { label: 'Mute', code: 127 }, { label: 'Vol+', code: 128 }, { label: 'Vol-', code: 129 },
];

export const AdvancedView: React.FC<AdvancedViewProps> = ({
  keymapRows,
  isLoadingKeymap = false,
  selectedLayer,
  onSelectLayer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdvancedSubTab>('socd');
  const [showSocdInfoModal, setShowSocdInfoModal] = useState<boolean>(false);

  // Common Target Selection state
  const [activeTargetBox, setActiveTargetBox] = useState<string>('socd_A');

  // Currently bound/selected key on the matrix
  const [boundKey, setBoundKey] = useState<KeyMatrixItem | null>(null);

  // Persistent map of all applied higher keys (MT, DKS, MPT, TGL, END, RS, SOCD)
  const [appliedHigherKeys, setAppliedHigherKeys] = useState<Record<string, AppliedHigherKey>>(() => {
    try {
      const saved = localStorage.getItem('anakeyn_higher_keys_map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // SOCD Specific State
  const [selectedSocdKeyA, setSelectedSocdKeyA] = useState<KeyMatrixItem | null>(null);
  const [selectedSocdKeyB, setSelectedSocdKeyB] = useState<KeyMatrixItem | null>(null);
  const [socdMode, setSocdMode] = useState<SOCDMode>(SOCDMode.LastOverride);
  const [socdDelay, setSocdDelay] = useState<number>(0);
  const [socdPairs, setSocdPairs] = useState<SocdPairConfig[]>(() => {
    try {
      const saved = localStorage.getItem('anakeyn_socd_pairs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // DKS State (Matching media_1793813651828_4a0bb9bf.png)
  const [dksKcs, setDksKcs] = useState<[number, number, number, number]>([0x04, 0x1A, 0x16, 0x07]); // A, W, S, D
  const [dksDbs, setDksDbs] = useState<[number, number]>([1.5, 3.0]); // Press shallow & deep depths
  const [dksNodes, setDksNodes] = useState<[boolean[], boolean[], boolean[], boolean[]]>([
    [true, true, false, false],
    [false, true, true, false],
    [false, false, true, true],
    [true, false, false, true],
  ]);

  // MPT State (Matching media_1793813651849_bf9e6bf3.png)
  const [mptKcs, setMptKcs] = useState<[number, number, number]>([0x04, 0x1A, 0x16]);
  const [mptDbs, setMptDbs] = useState<[number, number, number]>([0.5, 1.0, 1.5]);

  // MT State (Matching media_1793813651850_ebd50a27.png)
  const [mtTapKc, setMtTapKc] = useState<number>(0x2C); // Space
  const [mtHoldKc, setMtHoldKc] = useState<number>(0xE1); // L-Shift
  const [mtTimeMs, setMtTimeMs] = useState<number>(200);

  // TGL State (Matching media_1793813651851_d1057949.png)
  const [tglKc, setTglKc] = useState<number>(0x1A); // W

  // END State (Matching media_1793813651852_0f2decae.png)
  const [endPressKc, setEndPressKc] = useState<number>(0x04);
  const [endReleaseKc, setEndReleaseKc] = useState<number>(0x07);
  const [endDelay, setEndDelay] = useState<number>(0);

  // RS (Rapid Strike) State
  const [rsKeyA, setRsKeyA] = useState<KeyMatrixItem | null>(null);
  const [rsKeyB, setRsKeyB] = useState<KeyMatrixItem | null>(null);
  const [rsDelay, setRsDelay] = useState<number>(0);

  // Accordion open states for Character Palette
  const [isBasicOpen, setIsBasicOpen] = useState<boolean>(true);
  const [isExtendedOpen, setIsExtendedOpen] = useState<boolean>(false);

  // Status feedback toasts & loading spinners
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Live Key Test Area state
  const [activeHeldKeys, setActiveHeldKeys] = useState<string[]>([]);

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Flatten all keys for lookups
  const allMatrixKeys = useMemo(() => {
    if (!keymapRows) return [];
    return keymapRows.flat();
  }, [keymapRows]);

  // Derived A + D selection fallback if user hasn't selected custom keys
  const socdKeyA = useMemo(() => {
    if (selectedSocdKeyA) return selectedSocdKeyA;
    return allMatrixKeys.find((k) => k.label.toUpperCase() === 'A') || null;
  }, [selectedSocdKeyA, allMatrixKeys]);

  const socdKeyB = useMemo(() => {
    if (selectedSocdKeyB) return selectedSocdKeyB;
    return allMatrixKeys.find((k) => k.label.toUpperCase() === 'D') || null;
  }, [selectedSocdKeyB, allMatrixKeys]);

  // Save Applied Higher Keys to LocalStorage
  const persistAppliedHigherKeys = (keys: Record<string, AppliedHigherKey>) => {
    setAppliedHigherKeys(keys);
    try {
      localStorage.setItem('anakeyn_higher_keys_map', JSON.stringify(keys));
    } catch {}
  };

  // Save SOCD pairs to LocalStorage
  const persistSocdPairs = (pairs: SocdPairConfig[]) => {
    setSocdPairs(pairs);
    try {
      localStorage.setItem('anakeyn_socd_pairs', JSON.stringify(pairs));
    } catch {}
  };

  // Scan Hardware for saved HigherKey configurations
  const handleScanHardware = useCallback(async () => {
    if (!keyboardHID.isConnected()) {
      showToast('Connect keyboard to scan hardware bindings');
      return;
    }
    setIsScanning(true);
    try {
      const scanned: Record<string, AppliedHigherKey> = { ...appliedHigherKeys };
      for (const key of allMatrixKeys) {
        const info = await higherKeyController.getHigherKey(key.row, key.col);
        const keyId = `${key.row}-${key.col}`;
        if (info.mode === HigherKeyType.NONE) {
          delete scanned[keyId];
        } else if (info.mode === HigherKeyType.MT && info.mt) {
          scanned[keyId] = {
            row: key.row,
            col: key.col,
            label: key.label,
            type: 'mt',
            data: { tapKc: info.mt.kcs[0], holdKc: info.mt.kcs[1], timeMs: info.mt.time },
          };
        } else if (info.mode === HigherKeyType.DKS && info.dks) {
          scanned[keyId] = {
            row: key.row,
            col: key.col,
            label: key.label,
            type: 'dks',
            data: { kcs: info.dks.kcs, dbs: info.dks.dbs, trps: info.dks.trps },
          };
        } else if (info.mode === HigherKeyType.MPT && info.mpt) {
          scanned[keyId] = {
            row: key.row,
            col: key.col,
            label: key.label,
            type: 'mpt',
            data: { mptKcs: info.mpt.kcs, mptDbs: info.mpt.dbs },
          };
        } else if (info.mode === HigherKeyType.TGL && info.tgl) {
          scanned[keyId] = {
            row: key.row,
            col: key.col,
            label: key.label,
            type: 'tgl',
            data: { tglKc: info.tgl.kcs },
          };
        } else if (info.mode === HigherKeyType.END && info.end) {
          scanned[keyId] = {
            row: key.row,
            col: key.col,
            label: key.label,
            type: 'end',
            data: { endPressKc: info.end.kcs[0], endReleaseKc: info.end.kcs[1], endDelay: info.end.delay },
          };
        } else if (info.mode === HigherKeyType.SOCD && info.socd) {
          scanned[keyId] = {
            row: key.row,
            col: key.col,
            label: key.label,
            type: 'socd',
            data: {
              socdPartnerRow: info.socd.row2,
              socdPartnerCol: info.socd.col2,
              socdMode: info.socd.socdMode,
              socdDelay: info.socd.delay,
            },
          };
        } else if (info.mode === HigherKeyType.RS && info.rs) {
          scanned[keyId] = {
            row: key.row,
            col: key.col,
            label: key.label,
            type: 'rs',
            data: {
              linkedRow: info.rs.row2,
              linkedCol: info.rs.col2,
              rsDelay: info.rs.delay,
            },
          };
        }
      }
      persistAppliedHigherKeys(scanned);
      showToast(`Scanned hardware: synchronized ${Object.keys(scanned).length} advanced key(s)`);
    } catch {
      showToast('Hardware scan timed out or failed');
    } finally {
      setIsScanning(false);
    }
  }, [allMatrixKeys, appliedHigherKeys]);

  // Handle matrix key clicks on the Keyboard Canvas
  const handleKeyClick = (key: KeyMatrixItem | null) => {
    if (!key) return;
    setBoundKey(key);

    // If key already has an applied higher key, automatically inspect and load its parameters!
    const keyId = `${key.row}-${key.col}`;
    const existing = appliedHigherKeys[keyId];
    if (existing) {
      setActiveSubTab(existing.type);
      if (existing.type === 'mt' && existing.data.tapKc && existing.data.holdKc) {
        setMtTapKc(existing.data.tapKc);
        setMtHoldKc(existing.data.holdKc);
        if (existing.data.timeMs) setMtTimeMs(existing.data.timeMs);
      } else if (existing.type === 'tgl' && existing.data.tglKc) {
        setTglKc(existing.data.tglKc);
      } else if (existing.type === 'dks' && existing.data.kcs) {
        setDksKcs(existing.data.kcs);
        if (existing.data.dbs) setDksDbs(existing.data.dbs);
      } else if (existing.type === 'mpt' && existing.data.mptKcs && existing.data.mptDbs) {
        setMptKcs(existing.data.mptKcs);
        setMptDbs(existing.data.mptDbs);
      } else if (existing.type === 'end' && existing.data.endPressKc && existing.data.endReleaseKc) {
        setEndPressKc(existing.data.endPressKc);
        setEndReleaseKc(existing.data.endReleaseKc);
        if (existing.data.endDelay !== undefined) setEndDelay(existing.data.endDelay);
      }
      return;
    }

    // Otherwise assign to active slot according to sub-tab
    if (activeSubTab === 'socd') {
      if (activeTargetBox === 'socd_A') {
        setSelectedSocdKeyA(key);
        setActiveTargetBox('socd_B');
      } else if (activeTargetBox === 'socd_B') {
        setSelectedSocdKeyB(key);
      } else {
        setSelectedSocdKeyA(key);
        setActiveTargetBox('socd_B');
      }
    } else if (activeSubTab === 'dks') {
      if (activeTargetBox.startsWith('dks_')) {
        const idx = parseInt(activeTargetBox.replace('dks_', '')) || 0;
        const next = [...dksKcs] as [number, number, number, number];
        next[idx] = key.keycode;
        setDksKcs(next);
      }
    } else if (activeSubTab === 'mpt') {
      if (activeTargetBox.startsWith('mpt_')) {
        const idx = parseInt(activeTargetBox.replace('mpt_', '')) || 0;
        const next = [...mptKcs] as [number, number, number];
        next[idx] = key.keycode;
        setMptKcs(next);
      }
    } else if (activeSubTab === 'mt') {
      if (activeTargetBox === 'mt_tap') {
        setMtTapKc(key.keycode);
      } else if (activeTargetBox === 'mt_hold') {
        setMtHoldKc(key.keycode);
      }
    } else if (activeSubTab === 'tgl') {
      setTglKc(key.keycode);
    } else if (activeSubTab === 'end') {
      if (activeTargetBox === 'end_press') {
        setEndPressKc(key.keycode);
      } else {
        setEndReleaseKc(key.keycode);
      }
    } else if (activeSubTab === 'rs') {
      if (activeTargetBox === 'rs_A') {
        setRsKeyA(key);
        setActiveTargetBox('rs_B');
      } else {
        setRsKeyB(key);
      }
    }
  };

  // Right-click unbind handler on keyboard canvas: directly removes any higher-key binding!
  const handleKeyContextMenu = async (key: KeyMatrixItem, e: React.MouseEvent) => {
    e.preventDefault();
    const keyId = `${key.row}-${key.col}`;
    const existing = appliedHigherKeys[keyId];
    if (!existing) return;

    setIsApplying(true);
    try {
      if (keyboardHID.isConnected()) {
        await higherKeyController.deleteHigherKey(key.row, key.col);
        if (existing.type === 'socd' && existing.data.socdPartnerRow !== undefined && existing.data.socdPartnerCol !== undefined) {
          await higherKeyController.deleteHigherKey(existing.data.socdPartnerRow, existing.data.socdPartnerCol);
        }
      }

      const next = { ...appliedHigherKeys };
      delete next[keyId];
      if (existing.type === 'socd' && existing.data.socdPartnerRow !== undefined && existing.data.socdPartnerCol !== undefined) {
        delete next[`${existing.data.socdPartnerRow}-${existing.data.socdPartnerCol}`];
        setSocdPairs((prev) =>
          prev.filter(
            (p) =>
              !(
                (p.keyA.row === key.row && p.keyA.col === key.col) ||
                (p.keyB.row === key.row && p.keyB.col === key.col)
              ),
          ),
        );
      }

      persistAppliedHigherKeys(next);
      showToast(`Unbound ${existing.type.toUpperCase()} from ${key.label}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Handle character selection from the right-hand Character Palettes
  const handleAssignCharacter = (code: number, label: string) => {
    if (activeSubTab === 'socd') {
      const found = allMatrixKeys.find((k) => k.keycode === code);
      const targetItem: KeyMatrixItem = found || {
        layer: selectedLayer,
        row: 0,
        col: 0,
        keycode: code,
        label,
        width: 1,
      };
      if (activeTargetBox === 'socd_B') {
        setSelectedSocdKeyB(targetItem);
      } else {
        setSelectedSocdKeyA(targetItem);
        setActiveTargetBox('socd_B');
      }
    } else if (activeSubTab === 'dks') {
      const idx = parseInt(activeTargetBox.replace('dks_', '')) || 0;
      const next = [...dksKcs] as [number, number, number, number];
      next[idx] = code;
      setDksKcs(next);
    } else if (activeSubTab === 'mpt') {
      const idx = parseInt(activeTargetBox.replace('mpt_', '')) || 0;
      const next = [...mptKcs] as [number, number, number];
      next[idx] = code;
      setMptKcs(next);
    } else if (activeSubTab === 'mt') {
      if (activeTargetBox === 'mt_tap') {
        setMtTapKc(code);
      } else {
        setMtHoldKc(code);
      }
    } else if (activeSubTab === 'tgl') {
      setTglKc(code);
    } else if (activeSubTab === 'end') {
      if (activeTargetBox === 'end_press') {
        setEndPressKc(code);
      } else {
        setEndReleaseKc(code);
      }
    } else if (activeSubTab === 'rs') {
      const found = allMatrixKeys.find((k) => k.keycode === code);
      const item: KeyMatrixItem = found || {
        layer: selectedLayer,
        row: 0,
        col: 0,
        keycode: code,
        label,
        width: 1,
      };
      if (activeTargetBox === 'rs_A') {
        setRsKeyA(item);
        setActiveTargetBox('rs_B');
      } else {
        setRsKeyB(item);
      }
    }
  };

  // Toggle node in DKS track
  const toggleDksNode = (rowIdx: number, colIdx: number) => {
    const next = dksNodes.map((r, rI) =>
      rI === rowIdx ? r.map((c, cI) => (cI === colIdx ? !c : c)) : [...r],
    ) as [boolean[], boolean[], boolean[], boolean[]];
    setDksNodes(next);
  };

  // Compute trps for DKS from nodes bitmask
  const computeDksTrps = (): [number, number, number, number] => {
    return dksNodes.map((row) => {
      let mask = 0;
      if (row[0]) mask |= 0x01;
      if (row[1]) mask |= 0x02;
      if (row[2]) mask |= 0x04;
      if (row[3]) mask |= 0x08;
      return mask || 0x0F;
    }) as [number, number, number, number];
  };

  // Apply SOCD Binding to Hardware
  const handleApplySOCD = async () => {
    if (!socdKeyA || !socdKeyB) {
      showToast('Please select both Key A and Key B');
      return;
    }
    if (socdKeyA.row === socdKeyB.row && socdKeyA.col === socdKeyB.col) {
      showToast('Key A and Key B must be different keys');
      return;
    }

    setIsApplying(true);
    try {
      if (keyboardHID.isConnected()) {
        const ok = await higherKeyController.setSOCD(socdKeyA, socdKeyB, socdMode, socdDelay);
        if (!ok) {
          showToast('Failed to write SOCD to keyboard');
          return;
        }
      }

      const pairId = `${socdKeyA.row}-${socdKeyA.col}_${socdKeyB.row}-${socdKeyB.col}`;
      const newPair: SocdPairConfig = {
        id: pairId,
        keyA: { row: socdKeyA.row, col: socdKeyA.col, label: socdKeyA.label, keycode: socdKeyA.keycode },
        keyB: { row: socdKeyB.row, col: socdKeyB.col, label: socdKeyB.label, keycode: socdKeyB.keycode },
        mode: socdMode,
        delay: socdDelay,
      };

      const filtered = socdPairs.filter(
        (p) =>
          !(
            (p.keyA.row === socdKeyA.row && p.keyA.col === socdKeyA.col) ||
            (p.keyB.row === socdKeyA.row && p.keyB.col === socdKeyA.col) ||
            (p.keyA.row === socdKeyB.row && p.keyA.col === socdKeyB.col) ||
            (p.keyB.row === socdKeyB.row && p.keyB.col === socdKeyB.col)
          ),
      );
      persistSocdPairs([...filtered, newPair]);

      // Add to appliedHigherKeys map for real-time visual canvas badges
      const nextKeys = { ...appliedHigherKeys };
      nextKeys[`${socdKeyA.row}-${socdKeyA.col}`] = {
        row: socdKeyA.row,
        col: socdKeyA.col,
        label: socdKeyA.label,
        type: 'socd',
        data: {
          socdPartnerRow: socdKeyB.row,
          socdPartnerCol: socdKeyB.col,
          socdPartnerLabel: socdKeyB.label,
          socdRole: 'A',
          socdMode,
          socdDelay,
        },
      };
      nextKeys[`${socdKeyB.row}-${socdKeyB.col}`] = {
        row: socdKeyB.row,
        col: socdKeyB.col,
        label: socdKeyB.label,
        type: 'socd',
        data: {
          socdPartnerRow: socdKeyA.row,
          socdPartnerCol: socdKeyA.col,
          socdPartnerLabel: socdKeyA.label,
          socdRole: 'B',
          socdMode,
          socdDelay,
        },
      };
      persistAppliedHigherKeys(nextKeys);

      showToast(`SOCD (Snap Tap) applied to ${socdKeyA.label} + ${socdKeyB.label}!`);
    } finally {
      setIsApplying(false);
    }
  };

  // Delete SOCD Binding
  const handleDeleteSOCD = async (pair?: SocdPairConfig) => {
    const targetA = pair ? pair.keyA : socdKeyA;
    const targetB = pair ? pair.keyB : socdKeyB;

    if (!targetA) return;

    setIsApplying(true);
    try {
      if (keyboardHID.isConnected()) {
        await higherKeyController.deleteSOCD(targetA, targetB || undefined);
      }

      const filtered = socdPairs.filter(
        (p) =>
          !(
            (p.keyA.row === targetA.row && p.keyA.col === targetA.col) ||
            (p.keyB.row === targetA.row && p.keyB.col === targetA.col)
          ),
      );
      persistSocdPairs(filtered);

      const nextKeys = { ...appliedHigherKeys };
      delete nextKeys[`${targetA.row}-${targetA.col}`];
      if (targetB) delete nextKeys[`${targetB.row}-${targetB.col}`];
      persistAppliedHigherKeys(nextKeys);

      showToast(`Deleted SOCD binding for ${targetA.label}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Apply DKS Configuration
  const handleApplyDKS = async () => {
    const target = boundKey || allMatrixKeys.find((k) => k.label.toUpperCase() === 'W');
    if (!target) {
      showToast('Please click a key on the matrix above to bind DKS');
      return;
    }
    setIsApplying(true);
    try {
      const trps = computeDksTrps();
      if (keyboardHID.isConnected()) {
        await higherKeyController.setDKS(target.row, target.col, dksKcs, trps, dksDbs);
      }

      const keyId = `${target.row}-${target.col}`;
      const nextKeys = {
        ...appliedHigherKeys,
        [keyId]: {
          row: target.row,
          col: target.col,
          label: target.label,
          type: 'dks' as const,
          data: { kcs: dksKcs, dbs: dksDbs, trps },
        },
      };
      persistAppliedHigherKeys(nextKeys);
      showToast(`Applied DKS to key ${target.label}!`);
    } finally {
      setIsApplying(false);
    }
  };

  // Apply MPT Configuration
  const handleApplyMPT = async () => {
    const target = boundKey || allMatrixKeys.find((k) => k.label.toUpperCase() === 'W');
    if (!target) {
      showToast('Please click a key on the matrix above to bind MPT');
      return;
    }
    setIsApplying(true);
    try {
      if (keyboardHID.isConnected()) {
        await higherKeyController.setMPT(target.row, target.col, mptKcs, mptDbs);
      }

      const keyId = `${target.row}-${target.col}`;
      const nextKeys = {
        ...appliedHigherKeys,
        [keyId]: {
          row: target.row,
          col: target.col,
          label: target.label,
          type: 'mpt' as const,
          data: { mptKcs, mptDbs },
        },
      };
      persistAppliedHigherKeys(nextKeys);
      showToast(`Applied MPT to key ${target.label}!`);
    } finally {
      setIsApplying(false);
    }
  };

  // Apply Mod-Tap (MT)
  const handleApplyMT = async () => {
    const target = boundKey || allMatrixKeys.find((k) => k.label.toUpperCase() === 'SPACE');
    if (!target) {
      showToast('Please click a key on the matrix above to bind Mod-Tap');
      return;
    }
    setIsApplying(true);
    try {
      if (keyboardHID.isConnected()) {
        await higherKeyController.setMT(target.row, target.col, mtTapKc, mtHoldKc, mtTimeMs);
      }

      const keyId = `${target.row}-${target.col}`;
      const nextKeys = {
        ...appliedHigherKeys,
        [keyId]: {
          row: target.row,
          col: target.col,
          label: target.label,
          type: 'mt' as const,
          data: { tapKc: mtTapKc, holdKc: mtHoldKc, timeMs: mtTimeMs },
        },
      };
      persistAppliedHigherKeys(nextKeys);
      showToast(`Applied Mod-Tap to key ${target.label} (Tap: ${getKeyLabel(mtTapKc)}, Hold: ${getKeyLabel(mtHoldKc)})!`);
    } finally {
      setIsApplying(false);
    }
  };

  // Apply Toggle Key (TGL)
  const handleApplyTGL = async () => {
    const target = boundKey || allMatrixKeys.find((k) => k.label.toUpperCase() === 'W');
    if (!target) {
      showToast('Please click a key on the matrix above to bind Toggle Key');
      return;
    }
    setIsApplying(true);
    try {
      if (keyboardHID.isConnected()) {
        await higherKeyController.setTGL(target.row, target.col, tglKc);
      }

      const keyId = `${target.row}-${target.col}`;
      const nextKeys = {
        ...appliedHigherKeys,
        [keyId]: {
          row: target.row,
          col: target.col,
          label: target.label,
          type: 'tgl' as const,
          data: { tglKc },
        },
      };
      persistAppliedHigherKeys(nextKeys);
      showToast(`Applied Toggle Key to ${target.label}!`);
    } finally {
      setIsApplying(false);
    }
  };

  // Apply END Key
  const handleApplyEND = async () => {
    const target = boundKey || allMatrixKeys.find((k) => k.label.toUpperCase() === 'A');
    if (!target) {
      showToast('Please click a key on the matrix above to bind END key');
      return;
    }
    setIsApplying(true);
    try {
      if (keyboardHID.isConnected()) {
        await higherKeyController.setEND(target.row, target.col, [endPressKc, endReleaseKc], endDelay);
      }

      const keyId = `${target.row}-${target.col}`;
      const nextKeys = {
        ...appliedHigherKeys,
        [keyId]: {
          row: target.row,
          col: target.col,
          label: target.label,
          type: 'end' as const,
          data: { endPressKc, endReleaseKc, endDelay },
        },
      };
      persistAppliedHigherKeys(nextKeys);
      showToast(`Applied END Interlock to key ${target.label}!`);
    } finally {
      setIsApplying(false);
    }
  };

  // Apply RS (Rapid Strike)
  const handleApplyRS = async () => {
    if (!rsKeyA || !rsKeyB) {
      showToast('Please select both Key A and Key B for Rapid Strike');
      return;
    }
    setIsApplying(true);
    try {
      if (keyboardHID.isConnected()) {
        await higherKeyController.setRS(rsKeyA, rsKeyB, rsDelay);
      }

      const keyIdA = `${rsKeyA.row}-${rsKeyA.col}`;
      const keyIdB = `${rsKeyB.row}-${rsKeyB.col}`;
      const nextKeys = {
        ...appliedHigherKeys,
        [keyIdA]: {
          row: rsKeyA.row,
          col: rsKeyA.col,
          label: rsKeyA.label,
          type: 'rs' as const,
          data: { linkedRow: rsKeyB.row, linkedCol: rsKeyB.col, linkedLabel: rsKeyB.label, rsDelay },
        },
        [keyIdB]: {
          row: rsKeyB.row,
          col: rsKeyB.col,
          label: rsKeyB.label,
          type: 'rs' as const,
          data: { linkedRow: rsKeyA.row, linkedCol: rsKeyA.col, linkedLabel: rsKeyA.label, rsDelay },
        },
      };
      persistAppliedHigherKeys(nextKeys);
      showToast(`Applied Rapid Strike (RS) to ${rsKeyA.label} + ${rsKeyB.label}!`);
    } finally {
      setIsApplying(false);
    }
  };

  // Delete generic higher key on bound key
  const handleDeleteBoundKey = async () => {
    if (!boundKey) return;
    setIsApplying(true);
    try {
      if (keyboardHID.isConnected()) {
        await higherKeyController.deleteHigherKey(boundKey.row, boundKey.col);
      }

      const keyId = `${boundKey.row}-${boundKey.col}`;
      const nextKeys = { ...appliedHigherKeys };
      delete nextKeys[keyId];
      persistAppliedHigherKeys(nextKeys);

      showToast(`Cleared advanced configuration for key ${boundKey.label}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Live Key Test Area key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let keyName = e.key;
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') keyName = 'Control';
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keyName = 'Shift';
      if (e.code === 'AltLeft' || e.code === 'AltRight') keyName = 'Alt';
      if (e.code === 'MetaLeft' || e.code === 'MetaRight') keyName = 'Win';

      setActiveHeldKeys((prev) => {
        if (!prev.includes(keyName)) {
          return [...prev, keyName];
        }
        return prev;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let keyName = e.key;
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') keyName = 'Control';
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keyName = 'Shift';
      if (e.code === 'AltLeft' || e.code === 'AltRight') keyName = 'Alt';
      if (e.code === 'MetaLeft' || e.code === 'MetaRight') keyName = 'Win';

      setActiveHeldKeys((prev) => prev.filter((k) => k !== keyName));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Compute Visual Badges for KeyboardCanvas across ALL applied higher keys in real-time!
  const canvasBadges = useMemo(() => {
    const badges: Record<string, KeyBadgeOverlay> = {};

    // 1. Render all configured higher keys from the persistent map
    Object.values(appliedHigherKeys).forEach((item) => {
      const keyId = `${item.row}-${item.col}`;

      if (item.type === 'mt') {
        const tapLabel = item.data.tapKc ? getKeyLabel(item.data.tapKc) : 'Tap';
        const holdLabel = item.data.holdKc ? getKeyLabel(item.data.holdKc) : 'Hold';
        badges[keyId] = {
          top: 'MT',
          topColor: '#10b981',
          bottom: `${tapLabel}/${holdLabel}`,
          bottomColor: '#34d399',
          border: '1.5px solid #10b981',
          bg: 'rgba(16, 185, 129, 0.20)',
        };
      } else if (item.type === 'dks') {
        badges[keyId] = {
          top: 'DKS',
          topColor: '#f59e0b',
          bottom: '4-Stage',
          bottomColor: '#fbbf24',
          border: '1.5px solid #f59e0b',
          bg: 'rgba(245, 158, 11, 0.20)',
        };
      } else if (item.type === 'mpt') {
        badges[keyId] = {
          top: 'MPT',
          topColor: '#818cf8',
          bottom: '3-Point',
          bottomColor: '#a5b4fc',
          border: '1.5px solid #818cf8',
          bg: 'rgba(129, 140, 248, 0.20)',
        };
      } else if (item.type === 'tgl') {
        const toggleLabel = item.data.tglKc ? getKeyLabel(item.data.tglKc) : 'TGL';
        badges[keyId] = {
          top: 'TGL',
          topColor: '#ec4899',
          bottom: toggleLabel,
          bottomColor: '#f472b6',
          border: '1.5px solid #ec4899',
          bg: 'rgba(236, 72, 153, 0.20)',
        };
      } else if (item.type === 'end') {
        badges[keyId] = {
          top: 'END',
          topColor: '#f97316',
          bottom: 'Lock',
          bottomColor: '#fb923c',
          border: '1.5px solid #f97316',
          bg: 'rgba(249, 115, 22, 0.20)',
        };
      } else if (item.type === 'rs') {
        badges[keyId] = {
          top: 'RS',
          topColor: '#fb7185',
          bottom: 'Strike',
          bottomColor: '#f43f5e',
          border: '1.5px solid #fb7185',
          bg: 'rgba(251, 113, 133, 0.20)',
        };
      } else if (item.type === 'socd') {
        const isA = item.data.socdRole === 'A';
        badges[keyId] = {
          top: 'SOCD',
          topColor: isA ? '#38bdf8' : '#c084fc',
          bottom: isA ? 'Key A' : 'Key B',
          bottomColor: isA ? '#38bdf8' : '#c084fc',
          border: isA ? '1.5px solid #38bdf8' : '1.5px solid #c084fc',
          bg: isA ? 'rgba(56, 189, 248, 0.20)' : 'rgba(192, 132, 252, 0.20)',
        };
      }
    });

    // 2. Active editor target highlights
    if (activeSubTab === 'socd') {
      if (socdKeyA) {
        badges[`${socdKeyA.row}-${socdKeyA.col}`] = {
          top: 'SOCD A',
          topColor: '#38bdf8',
          bottom: 'Key A',
          bottomColor: '#38bdf8',
          border: '2px solid #38bdf8',
          bg: 'rgba(56, 189, 248, 0.30)',
        };
      }
      if (socdKeyB) {
        badges[`${socdKeyB.row}-${socdKeyB.col}`] = {
          top: 'SOCD B',
          topColor: '#c084fc',
          bottom: 'Key B',
          bottomColor: '#c084fc',
          border: '2px solid #c084fc',
          bg: 'rgba(192, 132, 252, 0.30)',
        };
      }
    } else if (boundKey) {
      const activeColor =
        activeSubTab === 'mt'
          ? '#10b981'
          : activeSubTab === 'dks'
            ? '#f59e0b'
            : activeSubTab === 'mpt'
              ? '#818cf8'
              : activeSubTab === 'tgl'
                ? '#ec4899'
                : '#f97316';

      badges[`${boundKey.row}-${boundKey.col}`] = {
        top: activeSubTab.toUpperCase(),
        topColor: activeColor,
        border: `2.5px solid ${activeColor}`,
        bg: 'rgba(255, 255, 255, 0.15)',
      };
    }

    return badges;
  }, [appliedHigherKeys, activeSubTab, socdKeyA, socdKeyB, boundKey]);

  // Helper renderer for interactive dark square key boxes
  const renderKeyBox = (
    boxId: string,
    label: string,
    sublabel?: string,
    onDropKey?: (code: number, lbl: string) => void,
    size: 'normal' | 'large' = 'normal',
  ) => {
    const isTargeted = activeTargetBox === boxId;
    const width = size === 'large' ? 68 : 52;
    const height = size === 'large' ? 68 : 52;

    return (
      <div
        onClick={() => setActiveTargetBox(boxId)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (onDropKey) {
              onDropKey(data.code, data.label);
            } else {
              handleAssignCharacter(data.code, data.label);
            }
          } catch {}
        }}
        style={{
          width,
          height,
          borderRadius: 8,
          background: isTargeted
            ? 'rgba(56, 189, 248, 0.20)'
            : label
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.45)',
          border: isTargeted ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          boxShadow: isTargeted ? '0 0 14px rgba(56, 189, 248, 0.4)' : 'none',
        }}
      >
        <span style={{ fontSize: size === 'large' ? '1.25rem' : '1.05rem', fontWeight: 800 }}>
          {label}
        </span>
        {sublabel && (
          <span style={{ fontSize: '0.60rem', color: '#94a3b8' }}>
            {sublabel}
          </span>
        )}
      </div>
    );
  };

  const activeKeysList = useMemo(() => {
    return Object.values(appliedHigherKeys);
  }, [appliedHigherKeys]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
        maxWidth: 1080,
        margin: '0 auto',
      }}
    >
      {/* 1. TOP KEYBOARD CANVAS WITH LAYER CONTROLS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 16,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Layer Selector */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginTop: 20,
            zIndex: 2,
          }}
        >
          {['Main Layer', 'Fn1 Layer', 'Fn2 Layer', 'Fn3 Layer'].map((label, idx) => {
            const isSelected = selectedLayer === idx;
            return (
              <button
                key={label}
                onClick={() => onSelectLayer(idx)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 18,
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isSelected
                    ? '1.5px solid var(--accent-cyan)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3))'
                    : 'rgba(15, 18, 26, 0.85)',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  boxShadow: isSelected ? '0 0 12px rgba(6, 182, 212, 0.35)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Keyboard Visualizer */}
        <div style={{ flex: 1, maxWidth: 940 }}>
          <KeyboardCanvas
            keymapRows={keymapRows}
            selectedKey={boundKey}
            onSelectKey={handleKeyClick}
            onKeyContextMenu={handleKeyContextMenu}
            isLoading={isLoadingKeymap}
            badges={canvasBadges}
          />
        </div>
      </div>

      {/* Top Controls: Instructions, Scan Hardware button, and Active Chips */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          marginTop: -6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
            🖱️ Click key to edit • Right-click key to unbind
          </span>

          <button
            onClick={handleScanHardware}
            disabled={isScanning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 14,
              padding: '3px 10px',
              color: '#cbd5e1',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: isScanning ? 'wait' : 'pointer',
            }}
            title="Scan keyboard hardware to sync any previously saved advanced keys"
          >
            <RefreshCw size={11} className={isScanning ? 'spin' : ''} />
            {isScanning ? 'Scanning...' : 'Scan Hardware'}
          </button>
        </div>

        {/* Active Configured Higher Keys Chips Bar */}
        {activeKeysList.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
              Active Bindings ({activeKeysList.length}):
            </span>
            {activeKeysList.map((item) => {
              const chipColor =
                item.type === 'mt'
                  ? '#10b981'
                  : item.type === 'dks'
                    ? '#f59e0b'
                    : item.type === 'mpt'
                      ? '#818cf8'
                      : item.type === 'tgl'
                        ? '#ec4899'
                        : item.type === 'socd'
                          ? '#38bdf8'
                          : '#f97316';

              let detailText = item.type.toUpperCase();
              if (item.type === 'mt' && item.data.tapKc && item.data.holdKc) {
                detailText = `MT (${getKeyLabel(item.data.tapKc)}/${getKeyLabel(item.data.holdKc)})`;
              } else if (item.type === 'tgl' && item.data.tglKc) {
                detailText = `TGL (${getKeyLabel(item.data.tglKc)})`;
              } else if (item.type === 'socd') {
                detailText = `SOCD (${item.data.socdRole === 'A' ? 'A' : 'B'})`;
              }

              return (
                <div
                  key={`${item.row}-${item.col}`}
                  onClick={() => {
                    const found = allMatrixKeys.find((k) => k.row === item.row && k.col === item.col);
                    if (found) handleKeyClick(found);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${chipColor}66`,
                    fontSize: '0.70rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={`Click to inspect ${item.label}`}
                >
                  <strong style={{ color: '#fff' }}>{item.label}</strong>
                  <span style={{ color: chipColor, fontWeight: 700 }}>{detailText}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const found = allMatrixKeys.find((k) => k.row === item.row && k.col === item.col);
                      if (found) handleKeyContextMenu(found, e);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                    }}
                    title="Remove binding"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            alignSelf: 'center',
            padding: '5px 18px',
            borderRadius: 20,
            background: 'rgba(16, 185, 129, 0.25)',
            border: '1px solid #10b981',
            color: '#34d399',
            fontSize: '0.82rem',
            fontWeight: 700,
            boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* 2. MAIN ADVANCED STUDIO PANEL */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 24px',
          display: 'grid',
          gridTemplateColumns: '150px 1fr 290px',
          gap: 20,
          background: 'rgba(13, 17, 26, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          minHeight: 480,
        }}
      >
        {/* COLUMN 1: SUB-TAB SWITCHER PILLS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { id: 'socd', label: 'SOCD', hasInfo: true },
            { id: 'dks', label: 'DKS' },
            { id: 'mpt', label: 'MPT' },
            { id: 'mt', label: 'MT' },
            { id: 'tgl', label: 'TGL' },
            { id: 'end', label: 'END' },
            { id: 'rs', label: '迅击 (RS)' },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <div
                key={tab.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                }}
              >
                <button
                  onClick={() => {
                    setActiveSubTab(tab.id as AdvancedSubTab);
                    if (tab.id === 'socd') setActiveTargetBox('socd_A');
                    if (tab.id === 'dks') setActiveTargetBox('dks_0');
                    if (tab.id === 'mpt') setActiveTargetBox('mpt_0');
                    if (tab.id === 'mt') setActiveTargetBox('mt_tap');
                    if (tab.id === 'tgl') setActiveTargetBox('tgl');
                    if (tab.id === 'end') setActiveTargetBox('end_press');
                    if (tab.id === 'rs') setActiveTargetBox('rs_A');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isActive
                      ? '1.5px solid #0284c7'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isActive
                      ? '#0284c7'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? '#fff' : '#cbd5e1',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    boxShadow: isActive ? '0 0 14px rgba(2, 132, 199, 0.45)' : 'none',
                  }}
                >
                  {tab.label}
                </button>

                {tab.hasInfo && (
                  <button
                    onClick={() => setShowSocdInfoModal(true)}
                    title="SOCD Information"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Info size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* COLUMN 2: CENTER CONFIGURATION WORKSPACE */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '0 20px',
          }}
        >
          {/* ======================= 1. SOCD SUBSECTION ======================= */}
          {activeSubTab === 'socd' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Bind Key
                  </span>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: socdKeyA ? '#38bdf8' : '#64748b',
                    }}
                  >
                    {socdKeyA ? socdKeyA.label : ''}
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: socdKeyB ? '#c084fc' : '#64748b',
                    }}
                  >
                    {socdKeyB ? socdKeyB.label : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleApplySOCD}
                    disabled={isApplying || !socdKeyA || !socdKeyB}
                    style={{
                      padding: '7px 22px',
                      borderRadius: 18,
                      background: '#0284c7',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: socdKeyA && socdKeyB ? 'pointer' : 'not-allowed',
                      boxShadow: '0 0 14px rgba(2, 132, 199, 0.4)',
                    }}
                  >
                    {isApplying ? 'Saving...' : 'Confirm'}
                  </button>

                  <button
                    onClick={() => handleDeleteSOCD()}
                    disabled={isApplying || !socdKeyA}
                    style={{
                      padding: '7px 20px',
                      borderRadius: 18,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: socdKeyA ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Main Body */}
              <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 24, marginTop: 10 }}>
                {/* 4 Mode Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SOCD_MODES.map((m) => {
                    const isSelected = socdMode === m.mode;
                    return (
                      <button
                        key={m.mode}
                        onClick={() => setSocdMode(m.mode)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 20,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isSelected
                            ? '1.5px solid #0284c7'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isSelected
                            ? '#0284c7'
                            : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#fff' : '#cbd5e1',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          boxShadow: isSelected ? '0 0 12px rgba(2, 132, 199, 0.4)' : 'none',
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {/* Key A and Key B boxes */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Key A</span>
                      {renderKeyBox('socd_A', socdKeyA ? socdKeyA.label : '', socdKeyA ? `(${socdKeyA.row}, ${socdKeyA.col})` : undefined, undefined, 'large')}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Key B</span>
                      {renderKeyBox('socd_B', socdKeyB ? socdKeyB.label : '', socdKeyB ? `(${socdKeyB.row}, ${socdKeyB.col})` : undefined, undefined, 'large')}
                    </div>
                  </div>

                  {/* Delay 0ms */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: '0.80rem', color: '#94a3b8' }}>Delay</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={socdDelay}
                      onChange={(e) => setSocdDelay(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        width: 44,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        padding: '2px 4px',
                      }}
                    />
                    <span style={{ fontSize: '0.80rem', color: '#94a3b8' }}>ms</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= 2. DKS SUBSECTION ======================= */}
          {activeSubTab === 'dks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Bind Key
                  </span>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: boundKey ? '#f59e0b' : '#64748b',
                    }}
                  >
                    {boundKey ? boundKey.label : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleApplyDKS}
                    disabled={isApplying}
                    style={{
                      padding: '7px 22px',
                      borderRadius: 18,
                      background: '#0284c7',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleDeleteBoundKey}
                    disabled={isApplying || !boundKey}
                    style={{
                      padding: '7px 20px',
                      borderRadius: 18,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: boundKey ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* DKS Matrix */}
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ height: 26 }} />
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} style={{ height: 44, display: 'flex', alignItems: 'center' }}>
                      {renderKeyBox(`dks_${idx}`, getKeyLabel(dksKcs[idx]))}
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', height: 26 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.70rem', color: '#e2e8f0', fontWeight: 700 }}>Key Press</span>
                      <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{dksDbs[0].toFixed(2)}mm</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.70rem', color: '#e2e8f0', fontWeight: 700 }}>Key Press</span>
                      <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{dksDbs[1].toFixed(2)}mm</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.70rem', color: '#e2e8f0', fontWeight: 700 }}>Key Release</span>
                      <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{dksDbs[1].toFixed(2)}mm</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.70rem', color: '#e2e8f0', fontWeight: 700 }}>Key Release</span>
                      <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{dksDbs[0].toFixed(2)}mm</span>
                    </div>
                  </div>

                  {[0, 1, 2, 3].map((rowIdx) => (
                    <div
                      key={rowIdx}
                      style={{
                        height: 44,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        alignItems: 'center',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: '12%',
                          right: '12%',
                          height: 2,
                          background: 'rgba(255, 255, 255, 0.15)',
                          zIndex: 1,
                        }}
                      />

                      {[0, 1, 2, 3].map((colIdx) => {
                        const isActive = dksNodes[rowIdx][colIdx];
                        return (
                          <div
                            key={colIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 2,
                            }}
                          >
                            <button
                              onClick={() => toggleDksNode(rowIdx, colIdx)}
                              style={{
                                width: isActive ? 16 : 14,
                                height: isActive ? 16 : 14,
                                borderRadius: colIdx === 0 || colIdx === 2 ? 3 : 8,
                                background: isActive ? '#fff' : 'rgba(255, 255, 255, 0.25)',
                                border: isActive ? '2px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: isActive ? '0 0 8px #0284c7' : 'none',
                                padding: 0,
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================= 3. MPT SUBSECTION ======================= */}
          {activeSubTab === 'mpt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Bind Key
                  </span>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: boundKey ? '#818cf8' : '#64748b',
                    }}
                  >
                    {boundKey ? boundKey.label : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleApplyMPT}
                    disabled={isApplying}
                    style={{
                      padding: '7px 22px',
                      borderRadius: 18,
                      background: '#0284c7',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleDeleteBoundKey}
                    disabled={isApplying || !boundKey}
                    style={{
                      padding: '7px 20px',
                      borderRadius: 18,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: boundKey ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
                {[0, 1, 2].map((idx) => {
                  const depth = mptDbs[idx];
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {renderKeyBox(`mpt_${idx}`, getKeyLabel(mptKcs[idx]))}

                      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <input
                          type="range"
                          min="0.1"
                          max="4.0"
                          step="0.1"
                          value={depth}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.5;
                            const next = [...mptDbs] as [number, number, number];
                            next[idx] = val;
                            setMptDbs(next);
                          }}
                          style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: 'rgba(0, 0, 0, 0.45)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 6,
                          overflow: 'hidden',
                        }}
                      >
                        <button
                          onClick={() => {
                            const next = [...mptDbs] as [number, number, number];
                            next[idx] = Math.max(0.1, Math.round((depth - 0.1) * 10) / 10);
                            setMptDbs(next);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            padding: '4px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ minWidth: 54, textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                          {depth.toFixed(1)} mm
                        </span>
                        <button
                          onClick={() => {
                            const next = [...mptDbs] as [number, number, number];
                            next[idx] = Math.min(4.0, Math.round((depth + 0.1) * 10) / 10);
                            setMptDbs(next);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            padding: '4px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================= 4. MT (MOD-TAP) SUBSECTION ======================= */}
          {activeSubTab === 'mt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Bind Key
                  </span>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: boundKey ? '#10b981' : '#64748b',
                    }}
                  >
                    {boundKey ? boundKey.label : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleApplyMT}
                    disabled={isApplying}
                    style={{
                      padding: '7px 22px',
                      borderRadius: 18,
                      background: '#0284c7',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleDeleteBoundKey}
                    disabled={isApplying || !boundKey}
                    style={{
                      padding: '7px 20px',
                      borderRadius: 18,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: boundKey ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Click Trigger</span>
                  <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Trigger time &lt; {mtTimeMs}ms</span>
                  {renderKeyBox('mt_tap', getKeyLabel(mtTapKc), undefined, undefined, 'large')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Long Press Trigger</span>
                  <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Trigger time &gt; {mtTimeMs}ms</span>
                  {renderKeyBox('mt_hold', getKeyLabel(mtHoldKc), undefined, undefined, 'large')}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem', color: '#cbd5e1' }}>
                  <span>Hold Threshold:</span>
                  <strong style={{ color: '#0284c7' }}>{mtTimeMs} ms</strong>
                </div>
                <input
                  type="range"
                  min="50"
                  max="600"
                  step="10"
                  value={mtTimeMs}
                  onChange={(e) => setMtTimeMs(parseInt(e.target.value) || 200)}
                  style={{ width: 220, accentColor: '#0284c7' }}
                />
              </div>
            </div>
          )}

          {/* ======================= 5. TGL SUBSECTION ======================= */}
          {activeSubTab === 'tgl' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Bind Key
                  </span>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: boundKey ? '#ec4899' : '#64748b',
                    }}
                  >
                    {boundKey ? boundKey.label : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleApplyTGL}
                    disabled={isApplying}
                    style={{
                      padding: '7px 22px',
                      borderRadius: 18,
                      background: '#0284c7',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleDeleteBoundKey}
                    disabled={isApplying || !boundKey}
                    style={{
                      padding: '7px 20px',
                      borderRadius: 18,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: boundKey ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 24 }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                  Click and Hold Trigger
                </span>
                {renderKeyBox('tgl', getKeyLabel(tglKc), undefined, undefined, 'large')}
                <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontStyle: 'italic', marginTop: 4 }}>
                  Tap once to lock key on, tap again to release
                </span>
              </div>
            </div>
          )}

          {/* ======================= 6. END SUBSECTION ======================= */}
          {activeSubTab === 'end' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Bind Key
                  </span>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: boundKey ? '#f97316' : '#64748b',
                    }}
                  >
                    {boundKey ? boundKey.label : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleApplyEND}
                    disabled={isApplying}
                    style={{
                      padding: '7px 22px',
                      borderRadius: 18,
                      background: '#0284c7',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleDeleteBoundKey}
                    disabled={isApplying || !boundKey}
                    style={{
                      padding: '7px 20px',
                      borderRadius: 18,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: boundKey ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Press Trigger</span>
                  <div style={{ height: 16 }} />
                  {renderKeyBox('end_press', getKeyLabel(endPressKc), undefined, undefined, 'large')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Release Trigger</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 16 }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Trigger Delay</span>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={endDelay}
                      onChange={(e) => setEndDelay(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        width: 38,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '0.72rem',
                        textAlign: 'center',
                        padding: '1px 2px',
                      }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>ms</span>
                  </div>
                  {renderKeyBox('end_release', getKeyLabel(endReleaseKc), undefined, undefined, 'large')}
                </div>
              </div>
            </div>
          )}

          {/* ======================= 7. RS (RAPID STRIKE) SUBSECTION ======================= */}
          {activeSubTab === 'rs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Bind Key
                  </span>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: rsKeyA ? '#fb7185' : '#64748b',
                    }}
                  >
                    {rsKeyA ? rsKeyA.label : ''}
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: rsKeyB ? '#f43f5e' : '#64748b',
                    }}
                  >
                    {rsKeyB ? rsKeyB.label : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleApplyRS}
                    disabled={isApplying || !rsKeyA || !rsKeyB}
                    style={{
                      padding: '7px 22px',
                      borderRadius: 18,
                      background: '#0284c7',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: rsKeyA && rsKeyB ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleDeleteBoundKey}
                    disabled={isApplying || !rsKeyA}
                    style={{
                      padding: '7px 20px',
                      borderRadius: 18,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: rsKeyA ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Primary Key A</span>
                  <div style={{ height: 16 }} />
                  {renderKeyBox('rs_A', rsKeyA ? rsKeyA.label : '', undefined, undefined, 'large')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Linked Key B</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 16 }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Trigger Delay</span>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={rsDelay}
                      onChange={(e) => setRsDelay(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        width: 38,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '0.72rem',
                        textAlign: 'center',
                        padding: '1px 2px',
                      }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>ms</span>
                  </div>
                  {renderKeyBox('rs_B', rsKeyB ? rsKeyB.label : '', undefined, undefined, 'large')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 3: RIGHT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
            ⓘ Drag characters below to the key box on the left
          </div>

          {/* Key Test Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#e2e8f0' }}>
                Key Test Area
              </span>
              <button
                onClick={() => {
                  setActiveHeldKeys([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <RotateCcw size={10} /> Clear
              </button>
            </div>

            <div
              style={{
                minHeight: 40,
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              {activeHeldKeys.length === 0 ? (
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontStyle: 'italic' }}>
                  Press keys to test...
                </span>
              ) : (
                activeHeldKeys.map((k) => (
                  <span
                    key={k}
                    style={{
                      padding: '2px 10px',
                      borderRadius: 14,
                      background: '#0284c7',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.74rem',
                      boxShadow: '0 0 10px rgba(2, 132, 199, 0.4)',
                    }}
                  >
                    {k}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Collapsible Accordions: Basic Characters & Extended Characters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto', maxHeight: 340 }}>
            {/* Accordion 1: Basic Characters */}
            <div
              style={{
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setIsBasicOpen(!isBasicOpen)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: 'none',
                  color: '#e2e8f0',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>Basic Characters</span>
                {isBasicOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isBasicOpen && (
                <div
                  style={{
                    padding: 8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}
                >
                  {BASIC_CHARACTERS.map((item) => (
                    <button
                      key={item.label}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify(item));
                      }}
                      onClick={() => handleAssignCharacter(item.code, item.label)}
                      style={{
                        padding: '4px 6px',
                        minWidth: 26,
                        height: 26,
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f1f5f9',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                      title={`Click or drag ${item.label}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 2: Extended Characters */}
            <div
              style={{
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setIsExtendedOpen(!isExtendedOpen)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: 'none',
                  color: '#e2e8f0',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>Extended Characters</span>
                {isExtendedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isExtendedOpen && (
                <div
                  style={{
                    padding: 8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}
                >
                  {EXTENDED_CHARACTERS.map((item) => (
                    <button
                      key={item.label}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify(item));
                      }}
                      onClick={() => handleAssignCharacter(item.code, item.label)}
                      style={{
                        padding: '4px 6px',
                        minWidth: 26,
                        height: 26,
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f1f5f9',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                      title={`Click or drag ${item.label}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SOCD INFO MODAL */}
      {showSocdInfoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowSocdInfoModal(false)}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 520,
              width: '100%',
              borderRadius: 16,
              background: '#0d111a',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={20} color="#38bdf8" />
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                  What is SOCD (Snap Tap)?
                </span>
              </div>
              <button
                onClick={() => setShowSocdInfoModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
              <strong>Simultaneous Opposite Cardinal Direction (SOCD)</strong>, famously known as <em>Snap Tap</em>,
              resolves conflicts when pressing opposing directional keys (like <code style={{ color: '#38bdf8' }}>A</code> and <code style={{ color: '#c084fc' }}>D</code>) at the same time in FPS games.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SOCD_MODES.map((m) => (
                <div
                  key={m.mode}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: '0.82rem', color: '#38bdf8' }}>{m.label} ({m.labelZh}):</strong>
                    <span style={{ fontSize: '0.70rem', color: '#94a3b8', padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                      {m.tag}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2, display: 'block', lineHeight: 1.35 }}>
                    {m.desc}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setShowSocdInfoModal(false)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 8,
                  background: '#0284c7',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
