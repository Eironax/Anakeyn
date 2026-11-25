import React, { useState, useEffect } from 'react';
import {
  Zap,
  Sliders,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import type { KeyMatrixItem } from '../../core/keys/layout';
import {
  performanceController,
  type KeyPerformanceConfig,
  DEFAULT_KEY_PERFORMANCE,
} from '../../core/performance/performanceController';
import {
  SWITCH_DATABASE,
  findSwitchById,
  type MagneticSwitchProfile,
} from '../../core/performance/switchDatabase';

import type { KeyBadgeOverlay } from '../keyboard/KeyboardCanvas';
import { CalibrationWaveformCanvas } from './CalibrationWaveformCanvas';
import { TravelTestGauge } from './TravelTestGauge';

export type PerformanceSubTab = 'trigger' | 'deadzone' | 'switch' | 'calibration' | 'travel';

interface PerformanceViewProps {
  selectedKeySet: Set<string>;
  allKeys: KeyMatrixItem[];
  onUpdateBadges: (badges: Record<string, KeyBadgeOverlay>) => void;
  onSubTabChange?: (tab: PerformanceSubTab) => void;
}

function getSavedSwitchId(): number | null {
  try {
    const saved =
      localStorage.getItem('anakeyn_active_switch') ||
      localStorage.getItem('anakey_active_switch');
    return saved ? Number(saved) : null;
  } catch {
    return null;
  }
}

function getSavedSwitchAssignments(): Record<string, number> {
  try {
    const raw =
      localStorage.getItem('anakeyn_switch_assignments') ||
      localStorage.getItem('anakey_switch_assignments');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  selectedKeySet,
  allKeys,
  onUpdateBadges,
  onSubTabChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PerformanceSubTab>('trigger');

  useEffect(() => {
    onSubTabChange?.(activeSubTab);
  }, [activeSubTab, onSubTabChange]);

  // Trigger State for selected keys
  const [isRtEnabled, setIsRtEnabled] = useState(false);
  const [actuationPoint, setActuationPoint] = useState<number>(2.0); // mm
  const [rtFirstTouch, setRtFirstTouch] = useState<number>(0.5); // mm
  const [rtPress, setRtPress] = useState<number>(0.3); // mm
  const [rtRelease, setRtRelease] = useState<number>(0.3); // mm

  // Dead Zone State for selected keys
  const [pressDeadStroke, setPressDeadStroke] = useState<number>(0.2); // mm (Top Deadzone)
  const [releaseDeadStroke, setReleaseDeadStroke] = useState<number>(0.2); // mm (Bottom Deadzone)
  const [shakeOptimization, setShakeOptimization] = useState<boolean>(true);
  const [isApplyingDeadZone, setIsApplyingDeadZone] = useState(false);

  // Magnetic Switch State
  const [selectedSwitchProfile, setSelectedSwitchProfile] = useState<MagneticSwitchProfile>(() => {
    const savedId = getSavedSwitchId();
    if (savedId) {
      return findSwitchById(savedId);
    }
    return findSwitchById(1001); // Default to stock White Wukong
  });

  const [selectedBrand, setSelectedBrand] = useState<'Everglide' | 'Gateron' | 'TTC' | 'Other'>(() => {
    const savedId = getSavedSwitchId();
    if (savedId) {
      return findSwitchById(savedId).brand;
    }
    return 'Everglide';
  });

  const [isApplyingSwitch, setIsApplyingSwitch] = useState(false);

  // Hardware sync & saving states
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingFlash, setIsSavingFlash] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Per-key performance cache: keyId -> KeyPerformanceConfig
  const [perfCache, setPerfCache] = useState<Record<string, KeyPerformanceConfig>>({});

  // Calibration Subsection State
  const [isCalibrating, setIsCalibrating] = useState<boolean>(() => {
    return (
      performanceController.isCalibrating ||
      (() => {
        try {
          return (
            localStorage.getItem('anakeyn_is_calibrating') === 'true' ||
            localStorage.getItem('anakey_is_calibrating') === 'true'
          );
        } catch {
          return false;
        }
      })()
    );
  });
  const [hwCalibratedMap, setHwCalibratedMap] = useState<Record<string, boolean>>(
    () => ({ ...performanceController.hwCalibratedMap })
  );
  const [hwAdcMap, setHwAdcMap] = useState<Record<string, number>>(
    () => ({ ...performanceController.hwAdcMap })
  );
  const [hwPressedMap, setHwPressedMap] = useState<Record<string, boolean>>({});
  const [isSavingCalib, setIsSavingCalib] = useState<boolean>(false);
  const [calibSaveSuccess, setCalibSaveSuccess] = useState<boolean>(false);
  const [isResettingCalib, setIsResettingCalib] = useState<boolean>(false);
  const [calibResetSuccess, setCalibResetSuccess] = useState<boolean>(false);

  const latestStrokeRef = React.useRef<number>(0);
  const keyDisplacementRef = React.useRef<Record<string, number>>({});

  // Travel Test Subsection State
  const [isTravelTestActive, setIsTravelTestActive] = useState<boolean>(true);
  const [activeTravelKey, setActiveTravelKey] = useState<string>('');
  const [activeTravelMm, setActiveTravelMm] = useState<number>(0);
  const [hwTravelMap, setHwTravelMap] = useState<Record<string, number>>({});

  // Query anti-jitter optimization switch from keyboard on mount
  useEffect(() => {
    performanceController
      .getShakeOptimization()
      .then((enabled) => setShakeOptimization(enabled))
      .catch(() => {});
  }, []);

  // Synchronize calibration toggle and live switch statuses whenever switching to calibration
  useEffect(() => {
    if (activeSubTab !== 'calibration') return;

    // 1. Re-sync calibration toggle state if it was active
    const active =
      performanceController.isCalibrating ||
      (() => {
        try {
          return (
            localStorage.getItem('anakeyn_is_calibrating') === 'true' ||
            localStorage.getItem('anakey_is_calibrating') === 'true'
          );
        } catch {
          return false;
        }
      })();

    setIsCalibrating((prev) => (prev !== active ? active : prev));

    // 2. Fetch live calibration status & ADC baseline from keyboard hardware across all 5 rows
    let cancelled = false;
    performanceController.syncCalibrationData().then(({ calibratedMap, adcMap }) => {
      if (!cancelled) {
        setHwCalibratedMap({ ...calibratedMap });
        setHwAdcMap({ ...adcMap });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSubTab]);

  // Background hardware scan: read all keys' performance on mount/connect
  useEffect(() => {
    if (!allKeys || allKeys.length === 0) return;

    let cancelled = false;
    let initialSwitchDetected = false;

    performanceController.readAllKeyPerformance(
      allKeys,
      (keyId, conf) => {
        if (!cancelled) {
          setPerfCache((prev) => ({ ...prev, [keyId]: conf }));
          if (!initialSwitchDetected && conf.axisV2Id) {
            initialSwitchDetected = true;
            const map = getSavedSwitchAssignments();
            const localPref = map[keyId];
            const sw = findSwitchById(conf.axisV2Id, localPref, conf.axisRangeMax);
            setSelectedSwitchProfile(sw);
            setSelectedBrand(sw.brand);
          }
        }
      },
      () => cancelled,
    );

    return () => {
      cancelled = true;
    };
  }, [allKeys]);

  // Sync badges to keyboard:
  // - In 'trigger' mode: top badge shows actuation mm (red/cyan)
  // - In 'deadzone' mode: top badge shows top deadzone mm, bottom badge shows bottom deadzone mm (amber)
  useEffect(() => {
    const badges: Record<string, KeyBadgeOverlay> = {};

    allKeys.forEach((k) => {
      const keyId = `${k.row}-${k.col}`;
      const conf = perfCache[keyId];
      const isSelected = selectedKeySet.has(keyId);

      if (activeSubTab === 'deadzone') {
        const topDz = isSelected ? pressDeadStroke : (conf?.pressDeadStroke ?? 0.2);
        const botDz = isSelected ? releaseDeadStroke : (conf?.releaseDeadStroke ?? 0.2);
        badges[keyId] = {
          top: `${topDz.toFixed(1)}`,
          topColor: '#fbbf24',
          bottom: `${botDz.toFixed(1)}`,
          bottomColor: '#f59e0b',
        };
      } else if (activeSubTab === 'switch') {
        const map = getSavedSwitchAssignments();
        const localSwProfileId = map[keyId];
        const swId = conf?.axisV2Id || 19504;
        const sw = findSwitchById(swId, localSwProfileId, conf?.axisRangeMax);
        badges[keyId] = {
          top: sw.nameEn,
          topColor: sw.stemColor && sw.stemColor !== '#' && sw.stemColor !== '#1e293b' ? sw.stemColor : '#38bdf8',
        };
      } else if (activeSubTab === 'calibration') {
        const isPressed = hwPressedMap[keyId];
        const isCalibrated = hwCalibratedMap[keyId];
        const adcVal = hwAdcMap[keyId] || 3200;

        if (isPressed) {
          // Completed / Pressed state: Solid Blue Keycap with white text
          badges[keyId] = {
            top: 'Completed',
            topColor: '#ffffff',
            bottom: String(adcVal),
            bottomColor: '#ffffff',
            bg: '#1d4ed8',
            border: '1.5px solid #60a5fa',
          };
        } else if (isCalibrated) {
          // Calibrated state: Blue text, orange ADC meter
          badges[keyId] = {
            top: 'Calibrated',
            topColor: '#38bdf8',
            bottom: String(adcVal),
            bottomColor: '#f97316',
            bg: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
          };
        } else {
          // Pending state: Red text, red border, orange ADC meter
          badges[keyId] = {
            top: 'Pending',
            topColor: '#ef4444',
            bottom: String(adcVal),
            bottomColor: '#f97316',
            bg: 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, #0f172a 100%)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
          };
        }
      } else if (activeSubTab === 'travel') {
        const routeMm = hwTravelMap[keyId] || 0;
        const isPressed = hwPressedMap[keyId] || routeMm > 0.15;
        const confAct = conf?.normalPress ?? 2.0;
        const isActuated = routeMm >= confAct && routeMm > 0.15;

        badges[keyId] = {
          top: routeMm > 0.05 ? `${routeMm.toFixed(1)}mm` : undefined,
          topColor: isActuated ? '#06b6d4' : '#38bdf8',
          bg: isActuated
            ? '#1d4ed8'
            : isPressed
            ? 'rgba(37, 99, 235, 0.4)'
            : undefined,
          border: isActuated
            ? '1.5px solid #60a5fa'
            : isPressed
            ? '1px solid rgba(56, 189, 248, 0.6)'
            : undefined,
        };
      } else {
        const act = isSelected ? actuationPoint : (conf?.normalPress ?? 2.0);
        const isRt = isSelected ? isRtEnabled : (conf ? conf.mode === 1 : false);
        badges[keyId] = {
          top: `${act.toFixed(1)}`,
          topColor: isRt ? '#06b6d4' : '#ef4444',
        };
      }
    });

    onUpdateBadges(badges);
  }, [
    allKeys,
    perfCache,
    selectedKeySet,
    actuationPoint,
    isRtEnabled,
    pressDeadStroke,
    releaseDeadStroke,
    selectedSwitchProfile,
    activeSubTab,
    hwPressedMap,
    hwCalibratedMap,
    hwAdcMap,
    hwTravelMap,
    onUpdateBadges,
  ]);

  // Physical key press listeners for instant visual keycap feedback
  useEffect(() => {
    if (activeSubTab !== 'calibration' && activeSubTab !== 'travel') return;

    const findKeyForEvent = (e: KeyboardEvent) => {
      // Direct label match
      const match = allKeys.find((k) => k.label.toLowerCase() === e.key.toLowerCase());
      if (match) return match;

      // Special & modifier keys matching physical keyboard
      if (e.code === 'ControlLeft') return allKeys.find((k) => k.label === 'L-Ctrl');
      if (e.code === 'ControlRight') return allKeys.find((k) => k.label === 'R-Ctrl');
      if (e.code === 'AltLeft') return allKeys.find((k) => k.label === 'L-Alt');
      if (e.code === 'AltRight') return allKeys.find((k) => k.label === 'R-Alt');
      if (e.code === 'MetaLeft' || e.code === 'MetaRight') return allKeys.find((k) => k.label === 'L-Gui' || k.label === 'Win');
      if (e.code === 'Space') return allKeys.find((k) => k.label === 'Space');
      if (e.code === 'ShiftLeft') return allKeys.find((k) => k.label === 'L-Shift');
      if (e.code === 'ShiftRight') return allKeys.find((k) => k.label === 'R-Shift');
      if (e.code === 'ArrowLeft') return allKeys.find((k) => k.label === '←');
      if (e.code === 'ArrowDown') return allKeys.find((k) => k.label === '↓');
      if (e.code === 'ArrowRight') return allKeys.find((k) => k.label === '→');
      if (e.code === 'ArrowUp') return allKeys.find((k) => k.label === '↑');
      if (e.code === 'Backspace') return allKeys.find((k) => k.label === 'Backspace');
      if (e.code === 'Enter') return allKeys.find((k) => k.label === 'Enter');
      if (e.code === 'Tab') return allKeys.find((k) => k.label === 'Tab');
      if (e.code === 'CapsLock') return allKeys.find((k) => k.label === 'Caps' || k.label === 'Caps Lock');

      const stripped = e.code.replace('Key', '').replace('Digit', '').toLowerCase();
      return allKeys.find((k) => k.label.toLowerCase() === stripped);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Prevent OS key-repeat jitter

      const target = findKeyForEvent(e);
      if (target) {
        const id = `${target.row}-${target.col}`;
        setHwPressedMap((prev) => ({ ...prev, [id]: true }));
        if (activeSubTab === 'calibration' && isCalibrating) {
          performanceController.hwCalibratedMap[id] = true;
          setHwCalibratedMap((prev) => ({ ...prev, [id]: true }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = findKeyForEvent(e);
      if (target) {
        const id = `${target.row}-${target.col}`;
        setHwPressedMap((prev) => ({ ...prev, [id]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeSubTab, allKeys, isCalibrating]);

  // Unified Hardware Telemetry Polling Engine (Shared across Calibration and Travel Test)
  const isTelemetryActive =
    (activeSubTab === 'calibration' && isCalibrating) ||
    (activeSubTab === 'travel' && isTravelTestActive);

  useEffect(() => {
    if (!isTelemetryActive) {
      keyDisplacementRef.current = {};
      latestStrokeRef.current = 0;
      setActiveTravelMm(0);
      setActiveTravelKey('');
      return;
    }

    let cancelled = false;
    const VALID_ROWS = [1, 2, 3, 4, 5];
    let rowIndex = 0;
    let cycleCount = 0;

    // Initial full-board sync for calibration status & ADC baseline (in calibration mode)
    if (activeSubTab === 'calibration') {
      (async () => {
        for (const r of VALID_ROWS) {
          if (cancelled) return;
          try {
            const [calibList, adcList] = await Promise.all([
              performanceController.getRowCalibrateStatus(r),
              performanceController.getRowAdcData(r),
            ]);
            if (!cancelled) {
              if (calibList && calibList.length > 0) {
                setHwCalibratedMap((prev) => {
                  const next = { ...prev };
                  calibList.forEach((val, c) => {
                    next[`${r}-${c}`] = val > 0;
                  });
                  return next;
                });
              }
              if (adcList && adcList.length > 0) {
                setHwAdcMap((prev) => {
                  const next = { ...prev };
                  adcList.forEach((val, c) => {
                    if (val > 0) next[`${r}-${c}`] = val;
                  });
                  return next;
                });
              }
            }
          } catch {}
        }
      })();
    }

    const pollStep = async () => {
      if (cancelled) return;
      const r = VALID_ROWS[rowIndex];
      rowIndex = (rowIndex + 1) % VALID_ROWS.length;
      if (rowIndex === 0) cycleCount++;

      try {
        // High-frequency route polling (real-time analog stroke in micrometers)
        const routeList = await performanceController.getRowRouteData(r);

        if (!cancelled && routeList && routeList.length > 0) {
          // Update displacement for all columns in this row
          routeList.forEach((val, c) => {
            const mm = val / 1000;
            keyDisplacementRef.current[`${r}-${c}`] = mm;
          });

          // Compute max displacement and active key across the ENTIRE keyboard
          let boardMaxMm = 0;
          let boardActiveKey = '';

          for (const [id, mm] of Object.entries(keyDisplacementRef.current)) {
            if (mm > boardMaxMm) {
              boardMaxMm = mm;
              const [rStr, cStr] = id.split('-');
              const match = allKeys.find((k) => k.row === Number(rStr) && k.col === Number(cStr));
              if (match) boardActiveKey = match.label;
            }
          }

          // If noise floor < 0.04mm, treat as 0
          if (boardMaxMm < 0.04) {
            boardMaxMm = 0;
            boardActiveKey = '';
          }

          // Update real-time displacement targets
          latestStrokeRef.current = boardMaxMm;
          setActiveTravelMm(boardMaxMm);
          if (boardActiveKey) {
            setActiveTravelKey(boardActiveKey);
          }

          // Update key pressed states
          setHwPressedMap((prev) => {
            let changed = false;
            const next = { ...prev };
            routeList.forEach((val, c) => {
              const isDown = val > 150;
              const id = `${r}-${c}`;
              if (next[id] !== isDown) {
                next[id] = isDown;
                changed = true;
              }
            });
            return changed ? next : prev;
          });

          // In Calibration mode, if switch is pressed down, immediately flag as calibrated
          if (activeSubTab === 'calibration' && isCalibrating) {
            routeList.forEach((val, c) => {
              if (val > 1500) {
                const id = `${r}-${c}`;
                if (!performanceController.hwCalibratedMap[id]) {
                  performanceController.hwCalibratedMap[id] = true;
                  setHwCalibratedMap((prev) => ({ ...prev, [id]: true }));
                }
              }
            });
          }

          // In Travel Test mode, also update per-key travel badges
          if (activeSubTab === 'travel') {
            setHwTravelMap((prev) => {
              let changed = false;
              const next = { ...prev };
              routeList.forEach((val, c) => {
                const mm = val / 1000;
                const id = `${r}-${c}`;
                if (Math.abs((next[id] || 0) - mm) > 0.04) {
                  next[id] = mm;
                  changed = true;
                }
              });
              return changed ? next : prev;
            });
          }
        }

        // Periodic calibration status & ADC check (only in calibration mode, every 4th cycle = ~400ms)
        if (!cancelled && activeSubTab === 'calibration' && cycleCount % 4 === 0) {
          const [calibList, adcList] = await Promise.all([
            performanceController.getRowCalibrateStatus(r),
            performanceController.getRowAdcData(r),
          ]);
          if (!cancelled) {
            if (calibList && calibList.length > 0) {
              setHwCalibratedMap((prev) => {
                let changed = false;
                const next = { ...prev };
                calibList.forEach((val, c) => {
                  const isCal = val > 0;
                  const id = `${r}-${c}`;
                  if (next[id] !== isCal) {
                    next[id] = isCal;
                    changed = true;
                  }
                });
                if (changed) performanceController.hwCalibratedMap = { ...next };
                return changed ? next : prev;
              });
            }
            if (adcList && adcList.length > 0) {
              setHwAdcMap((prev) => {
                let changed = false;
                const next = { ...prev };
                adcList.forEach((val, c) => {
                  if (val > 0 && next[`${r}-${c}`] !== val) {
                    next[`${r}-${c}`] = val;
                    changed = true;
                  }
                });
                if (changed) performanceController.hwAdcMap = { ...next };
                return changed ? next : prev;
              });
            }
          }
        }
      } catch {}

      if (!cancelled) {
        timer = setTimeout(pollStep, 16);
      }
    };

    let timer = setTimeout(pollStep, 30);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isTelemetryActive, activeSubTab, isCalibrating, isTravelTestActive, allKeys]);

  const prevSelectionKeyRef = React.useRef<string>('');

  // When selection changes, sync controls to the selected key(s)
  useEffect(() => {
    if (selectedKeySet.size === 0) {
      prevSelectionKeyRef.current = '';
      return;
    }

    const currentSelectionSignature = Array.from(selectedKeySet).sort().join(',');
    if (prevSelectionKeyRef.current === currentSelectionSignature) {
      return;
    }
    prevSelectionKeyRef.current = currentSelectionSignature;

    const selectedIds = Array.from(selectedKeySet);
    const firstCached = selectedIds.map((id) => perfCache[id]).find(Boolean);

    if (firstCached) {
      setIsRtEnabled(firstCached.mode === 1);
      setActuationPoint(firstCached.normalPress);
      setRtFirstTouch(firstCached.rtFirstTouch);
      setRtPress(firstCached.rtPress);
      setRtRelease(firstCached.rtRelease);
      setPressDeadStroke(firstCached.pressDeadStroke ?? 0.2);
      setReleaseDeadStroke(firstCached.releaseDeadStroke ?? 0.2);
      let assignedSwId = firstCached.axisV2Id;
      const localPref = getSavedSwitchAssignments()[selectedIds[0]];
      if (assignedSwId) {
        const sw = findSwitchById(assignedSwId, localPref, firstCached.axisRangeMax);
        setSelectedSwitchProfile(sw);
        setSelectedBrand(sw.brand);
      }
    } else {
      const [rStr, cStr] = selectedIds[0].split('-');
      performanceController
        .getKeyPerformance(Number(rStr), Number(cStr))
        .then((conf) => {
          setPerfCache((prev) => ({ ...prev, [selectedIds[0]]: conf }));
          setIsRtEnabled(conf.mode === 1);
          setActuationPoint(conf.normalPress);
          setRtFirstTouch(conf.rtFirstTouch);
          setRtPress(conf.rtPress);
          setRtRelease(conf.rtRelease);
          setPressDeadStroke(conf.pressDeadStroke ?? 0.2);
          setReleaseDeadStroke(conf.releaseDeadStroke ?? 0.2);
          let assignedSwId = conf.axisV2Id;
          const localPref = getSavedSwitchAssignments()[selectedIds[0]];
          if (assignedSwId) {
            const sw = findSwitchById(assignedSwId, localPref, conf.axisRangeMax);
            setSelectedSwitchProfile(sw);
            setSelectedBrand(sw.brand);
          }
        })
        .catch(() => {});
    }
  }, [selectedKeySet, perfCache]);

  const handleApplyToSelected = async (
    targetRt = isRtEnabled,
    targetAct = actuationPoint,
    targetFirst = rtFirstTouch,
    targetPress = rtPress,
    targetRelease = rtRelease,
  ) => {
    if (selectedKeySet.size === 0) return;
    setIsApplying(true);

    try {
      const keysToUpdate = allKeys.filter((k) => selectedKeySet.has(`${k.row}-${k.col}`));
      const newCache = { ...perfCache };

      for (const key of keysToUpdate) {
        const keyId = `${key.row}-${key.col}`;
        const existing = newCache[keyId] || {
          ...DEFAULT_KEY_PERFORMANCE,
          row: key.row,
          col: key.col,
        };

        const updated: KeyPerformanceConfig = {
          ...existing,
          mode: targetRt ? 1 : 0,
          normalPress: targetAct,
          normalRelease: targetAct,
          rtFirstTouch: targetFirst,
          rtPress: targetPress,
          rtRelease: targetRelease,
        };

        await performanceController.setKeyPerformance(updated);
        newCache[keyId] = updated;
      }

      setPerfCache(newCache);
    } catch (err) {
      console.error('Failed to apply performance settings:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveToFlash = async () => {
    setIsSavingFlash(true);
    try {
      await performanceController.savePerformanceToFlash();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save to flash:', err);
    } finally {
      setIsSavingFlash(false);
    }
  };

  const applyPreset = (preset: 'esports' | 'balanced' | 'typing') => {
    if (preset === 'esports') {
      setIsRtEnabled(true);
      setActuationPoint(0.8);
      setRtFirstTouch(0.3);
      setRtPress(0.15);
      setRtRelease(0.15);
      handleApplyToSelected(true, 0.8, 0.3, 0.15, 0.15);
    } else if (preset === 'balanced') {
      setIsRtEnabled(true);
      setActuationPoint(1.2);
      setRtFirstTouch(0.5);
      setRtPress(0.3);
      setRtRelease(0.3);
      handleApplyToSelected(true, 1.2, 0.5, 0.3, 0.3);
    } else if (preset === 'typing') {
      setIsRtEnabled(false);
      setActuationPoint(2.0);
      setRtFirstTouch(0.5);
      setRtPress(0.3);
      setRtRelease(0.3);
      handleApplyToSelected(false, 2.0, 0.5, 0.3, 0.3);
    }
  };

  const handleApplyDeadZoneToSelected = async (
    targetPressDead = pressDeadStroke,
    targetReleaseDead = releaseDeadStroke,
  ) => {
    if (selectedKeySet.size === 0) return;
    setIsApplyingDeadZone(true);

    try {
      const keysToUpdate = allKeys.filter((k) => selectedKeySet.has(`${k.row}-${k.col}`));
      const newCache = { ...perfCache };

      for (const key of keysToUpdate) {
        const keyId = `${key.row}-${key.col}`;
        const existing = newCache[keyId] || {
          ...DEFAULT_KEY_PERFORMANCE,
          row: key.row,
          col: key.col,
        };

        const updated: KeyPerformanceConfig = {
          ...existing,
          pressDeadStroke: targetPressDead,
          releaseDeadStroke: targetReleaseDead,
        };

        await performanceController.setKeyPerformance(updated);
        newCache[keyId] = updated;
      }

      setPerfCache(newCache);
    } catch (err) {
      console.error('Failed to apply deadzone settings:', err);
    } finally {
      setIsApplyingDeadZone(false);
    }
  };

  const applyDeadZonePreset = (preset: 'standard' | 'minimal' | 'zero_top') => {
    if (preset === 'standard') {
      setPressDeadStroke(0.2);
      setReleaseDeadStroke(0.2);
      handleApplyDeadZoneToSelected(0.2, 0.2);
    } else if (preset === 'minimal') {
      setPressDeadStroke(0.05);
      setReleaseDeadStroke(0.05);
      handleApplyDeadZoneToSelected(0.05, 0.05);
    } else if (preset === 'zero_top') {
      setPressDeadStroke(0.0);
      setReleaseDeadStroke(0.15);
      handleApplyDeadZoneToSelected(0.0, 0.15);
    }
  };

  const handleApplySwitchToSelected = async (profile = selectedSwitchProfile) => {
    if (selectedKeySet.size === 0) return;
    setIsApplyingSwitch(true);

    try {
      const keysToUpdate = allKeys.filter((k) => selectedKeySet.has(`${k.row}-${k.col}`));
      const newCache = { ...perfCache };

      for (const key of keysToUpdate) {
        const keyId = `${key.row}-${key.col}`;
        const existing = newCache[keyId] || {
          ...DEFAULT_KEY_PERFORMANCE,
          row: key.row,
          col: key.col,
        };

        const updated: KeyPerformanceConfig = {
          ...existing,
          axis: 0, // MUST BE 0 in v2 unlimited axis mode (non-zero triggers v1 ROM lookup)
          axisV2Id: profile.axisV2Id,
          axisRangeMax: profile.axisRangeMax,
          axisCoefficient: profile.axisCoefficient,
        };

        await performanceController.setKeyPerformance(updated);
        newCache[keyId] = updated;
      }

      // Persist switch assignments to client storage so custom profiles are never lost
      try {
        const stored = getSavedSwitchAssignments();
        for (const key of keysToUpdate) {
          stored[`${key.row}-${key.col}`] = profile.id;
        }
        localStorage.setItem('anakeyn_switch_assignments', JSON.stringify(stored));
        localStorage.setItem('anakeyn_active_switch', String(profile.id));
      } catch {}

      setPerfCache(newCache);
    } catch (err) {
      console.error('Failed to apply switch profile:', err);
    } finally {
      setIsApplyingSwitch(false);
    }
  };

  const handleToggleCalibration = async () => {
    if (!isCalibrating) {
      try {
        await performanceController.startCalibration();
        setIsCalibrating(true);
        setCalibSaveSuccess(false);
      } catch (err) {
        console.error('Failed to start calibration:', err);
      }
    } else {
      setIsSavingCalib(true);
      try {
        await performanceController.finishCalibration();
        await performanceController.saveCalibrationToFlash();
        setIsCalibrating(false);
        setCalibSaveSuccess(true);
        setTimeout(() => setCalibSaveSuccess(false), 3000);
      } catch (err) {
        console.error('Failed to finish calibration:', err);
      } finally {
        setIsSavingCalib(false);
      }
    }
  };

  const handleResetCalibration = async () => {
    setIsResettingCalib(true);
    try {
      await performanceController.resetCalibration();
      setHwCalibratedMap({});
      setCalibResetSuccess(true);
      setTimeout(() => setCalibResetSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to reset calibration:', err);
    } finally {
      setIsResettingCalib(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
        maxWidth: 1040,
        margin: '0 auto',
      }}
    >
      {/* Helper prompt banner matching xsyd.top */}
      {activeSubTab === 'calibration' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: '#cbd5e1',
            fontSize: '0.88rem',
            padding: '2px 0',
          }}
        >
          <span style={{ fontSize: '1rem' }}>🖱</span>
          <span style={{ fontStyle: 'italic', letterSpacing: '0.02em', color: '#94a3b8' }}>
            {isCalibrating
              ? 'Please press keys firmly until bottom-out to calibrate'
              : 'Please turn on calibration and press keys to calibrate'}
          </span>
        </div>
      )}

      {activeSubTab === 'travel' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: '#cbd5e1',
            fontSize: '0.88rem',
            padding: '2px 0',
          }}
        >
          <span style={{ fontSize: '0.90rem', color: '#94a3b8' }}>⌃</span>
          <span style={{ fontStyle: 'italic', letterSpacing: '0.02em', color: '#94a3b8' }}>
            Click the keyboard above to inspect or press keys to test analog travel
          </span>
        </div>
      )}

      {/* Subtabs Switcher (Trigger | Dead Zone | Magnetic Switch | Calibration | Travel Test) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: 'rgba(15, 18, 26, 0.85)',
          padding: '6px 10px',
          borderRadius: 30,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          width: 'fit-content',
          margin: '0 auto',
          backdropFilter: 'blur(10px)',
        }}
      >
        {[
          { id: 'trigger', label: 'Trigger' },
          { id: 'deadzone', label: 'Dead Zone' },
          { id: 'switch', label: 'Magnetic Switch' },
          { id: 'calibration', label: 'Calibration' },
          { id: 'travel', label: 'Travel Test' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as PerformanceSubTab)}
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, #0284c7, #2563eb)'
                  : 'transparent',
                color: isActive ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 22px',
                borderRadius: 20,
                fontSize: '0.84rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 4px 14px rgba(2, 132, 199, 0.4)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Panel Content */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          borderRadius: 16,
          background: 'linear-gradient(180deg, rgba(20, 24, 35, 0.85) 0%, rgba(13, 16, 23, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        {/* SUBSECTION 1: TRIGGER */}
        {activeSubTab === 'trigger' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header / Selection Info & Save Action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: isRtEnabled
                      ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(99, 102, 241, 0.2))'
                      : 'rgba(255, 255, 255, 0.06)',
                    border: `1px solid ${isRtEnabled ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isRtEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  }}
                >
                  <Zap size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                    Trigger & Rapid Trigger Configuration
                  </h3>
                  <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {selectedKeySet.size > 0 ? (
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {selectedKeySet.size} key{selectedKeySet.size > 1 ? 's' : ''} selected
                      </span>
                    ) : (
                      'Select keys on the keyboard to configure actuation travel'
                    )}
                  </div>
                </div>
              </div>

              {/* Hardware Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => handleApplyToSelected()}
                  disabled={isApplying || selectedKeySet.size === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: selectedKeySet.size === 0 ? 'not-allowed' : 'pointer',
                    opacity: selectedKeySet.size === 0 ? 0.5 : 1,
                    boxShadow: '0 2px 10px var(--accent-indigo-glow)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Check size={16} />
                  {isApplying ? 'Applying...' : 'Apply to Selected'}
                </button>

                <button
                  onClick={handleSaveToFlash}
                  disabled={isSavingFlash}
                  title="Burn performance parameters permanently into keyboard onboard flash memory"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: saveSuccess
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'var(--bg-tertiary)',
                    color: saveSuccess ? '#fff' : 'var(--text-main)',
                    border: `1px solid ${saveSuccess ? '#10b981' : 'var(--border-subtle)'}`,
                    padding: '9px 16px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {saveSuccess ? <Check size={16} /> : <Save size={16} />}
                  {saveSuccess ? 'Saved to Flash!' : isSavingFlash ? 'Saving...' : 'Save to Flash'}
                </button>
              </div>
            </div>

            {/* Rapid Trigger (RT) Toggle Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '16px 20px',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#fff' }}>
                    Rapid Trigger (RT)
                  </span>
                  {isRtEnabled && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: 'rgba(6, 182, 212, 0.2)',
                        color: 'var(--accent-cyan)',
                        border: '1px solid rgba(6, 182, 212, 0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Continuously calculates physical stroke reversals for zero-latency counter-strafing and instant resets.
                </div>
              </div>

              {/* Modern Switch Component */}
              <button
                onClick={() => {
                  const nextVal = !isRtEnabled;
                  setIsRtEnabled(nextVal);
                  handleApplyToSelected(nextVal, actuationPoint, rtFirstTouch, rtPress, rtRelease);
                }}
                style={{
                  width: 52,
                  height: 28,
                  borderRadius: 14,
                  background: isRtEnabled
                    ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                    : 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 2,
                  boxShadow: isRtEnabled ? '0 0 12px rgba(6, 182, 212, 0.5)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: '#fff',
                    position: 'absolute',
                    top: 2,
                    left: isRtEnabled ? 26 : 2,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                  }}
                />
              </button>
            </div>

            {/* Slider 1: Actuation Point / Trigger Travel Setting */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#fff' }}>
                    Trigger Travel Setting (Actuation Point)
                  </span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Depth threshold required to register a keypress (0.10 mm – 4.00 mm)
                  </div>
                </div>

                {/* Fine-Tuning Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => {
                      const next = Math.max(0.1, Number((actuationPoint - 0.05).toFixed(3)));
                      setActuationPoint(next);
                      handleApplyToSelected(isRtEnabled, next, rtFirstTouch, rtPress, rtRelease);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.90rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    -
                  </button>

                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: '0.84rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--accent-cyan)',
                      minWidth: 70,
                      textAlign: 'center',
                    }}
                  >
                    {actuationPoint.toFixed(2)} mm
                  </div>

                  <button
                    onClick={() => {
                      const next = Math.min(4.0, Number((actuationPoint + 0.05).toFixed(3)));
                      setActuationPoint(next);
                      handleApplyToSelected(isRtEnabled, next, rtFirstTouch, rtPress, rtRelease);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.90rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Range Slider */}
              <input
                type="range"
                min="0.10"
                max="4.00"
                step="0.05"
                value={actuationPoint}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setActuationPoint(val);
                }}
                onMouseUp={() => handleApplyToSelected()}
                onTouchEnd={() => handleApplyToSelected()}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent-indigo)',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Rapid Trigger Dynamic Sensitivity Sliders (Visible when RT is ON) */}
            {isRtEnabled && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                  padding: '18px 20px',
                  borderRadius: 14,
                  background: 'rgba(6, 182, 212, 0.04)',
                  border: '1px solid rgba(6, 182, 212, 0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-cyan)' }}>
                  <Sparkles size={16} />
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Rapid Trigger Continuous Sensitivity
                  </span>
                </div>

                {/* RT Press Sensitivity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Press Dynamic Sensitivity (Stroke down to actuate)
                    </span>
                    <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      {rtPress.toFixed(2)} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="2.50"
                    step="0.02"
                    value={rtPress}
                    onChange={(e) => setRtPress(parseFloat(e.target.value))}
                    onMouseUp={() => handleApplyToSelected()}
                    onTouchEnd={() => handleApplyToSelected()}
                    style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                  />
                </div>

                {/* RT Release Sensitivity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Release Dynamic Sensitivity (Stroke lift to reset)
                    </span>
                    <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#a855f7', fontWeight: 700 }}>
                      {rtRelease.toFixed(2)} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="2.50"
                    step="0.02"
                    value={rtRelease}
                    onChange={(e) => setRtRelease(parseFloat(e.target.value))}
                    onMouseUp={() => handleApplyToSelected()}
                    onTouchEnd={() => handleApplyToSelected()}
                    style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            {/* Quick Esports Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Fast Presets:
              </span>
              {[
                { id: 'esports', label: '⚡ Ultra Esports (0.8mm Act, 0.15mm RT)' },
                { id: 'balanced', label: '🎯 Balanced FPS (1.2mm Act, 0.30mm RT)' },
                { id: 'typing', label: '⌨️ Clean Typing (2.0mm Act, RT Off)' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id as any)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SUBSECTION 2: DEAD ZONE */}
        {activeSubTab === 'deadzone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header / Selection Info & Save Action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                  }}
                >
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                    Dead Zone & Anti-Jitter Configuration
                  </h3>
                  <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {selectedKeySet.size > 0 ? (
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                        {selectedKeySet.size} key{selectedKeySet.size > 1 ? 's' : ''} selected
                      </span>
                    ) : (
                      'Select keys on the keyboard to configure top & bottom stroke deadzones'
                    )}
                  </div>
                </div>
              </div>

              {/* Hardware Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => handleApplyDeadZoneToSelected()}
                  disabled={isApplyingDeadZone || selectedKeySet.size === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: selectedKeySet.size === 0 ? 'not-allowed' : 'pointer',
                    opacity: selectedKeySet.size === 0 ? 0.5 : 1,
                    boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Check size={16} />
                  {isApplyingDeadZone ? 'Applying...' : 'Apply to Selected'}
                </button>

                <button
                  onClick={handleSaveToFlash}
                  disabled={isSavingFlash}
                  title="Burn performance parameters permanently into keyboard onboard flash memory"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: saveSuccess
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'var(--bg-tertiary)',
                    color: saveSuccess ? '#fff' : 'var(--text-main)',
                    border: `1px solid ${saveSuccess ? '#10b981' : 'var(--border-subtle)'}`,
                    padding: '9px 16px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {saveSuccess ? <Check size={16} /> : <Save size={16} />}
                  {saveSuccess ? 'Saved to Flash!' : isSavingFlash ? 'Saving...' : 'Save to Flash'}
                </button>
              </div>
            </div>

            {/* Slider 1: Initially press the dead zone (Top Deadzone) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#fff' }}>
                    Initially press the dead zone (Top Deadzone)
                  </span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Initial stroke buffer to eliminate finger resting weight and housing play (0.00 mm – 0.50 mm)
                  </div>
                </div>

                {/* Fine-Tuning Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => {
                      const next = Math.max(0.0, Number((pressDeadStroke - 0.02).toFixed(3)));
                      setPressDeadStroke(next);
                      handleApplyDeadZoneToSelected(next, releaseDeadStroke);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.90rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    -
                  </button>

                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: '0.84rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: '#fbbf24',
                      minWidth: 70,
                      textAlign: 'center',
                    }}
                  >
                    {pressDeadStroke.toFixed(2)} mm
                  </div>

                  <button
                    onClick={() => {
                      const next = Math.min(0.5, Number((pressDeadStroke + 0.02).toFixed(3)));
                      setPressDeadStroke(next);
                      handleApplyDeadZoneToSelected(next, releaseDeadStroke);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.90rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Range Slider */}
              <input
                type="range"
                min="0.00"
                max="0.50"
                step="0.01"
                value={pressDeadStroke}
                onChange={(e) => setPressDeadStroke(parseFloat(e.target.value))}
                onMouseUp={() => handleApplyDeadZoneToSelected()}
                onTouchEnd={() => handleApplyDeadZoneToSelected()}
                style={{
                  width: '100%',
                  accentColor: '#f59e0b',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Slider 2: Hit the bottom and lift the dead zone (Bottom Deadzone) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#fff' }}>
                    Hit the bottom and lift the dead zone (Bottom Deadzone)
                  </span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Rebound buffer off bottom-out impact to prevent vibration / bounce double-taps (0.00 mm – 0.50 mm)
                  </div>
                </div>

                {/* Fine-Tuning Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => {
                      const next = Math.max(0.0, Number((releaseDeadStroke - 0.02).toFixed(3)));
                      setReleaseDeadStroke(next);
                      handleApplyDeadZoneToSelected(pressDeadStroke, next);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.90rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    -
                  </button>

                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: '0.84rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: '#d97706',
                      minWidth: 70,
                      textAlign: 'center',
                    }}
                  >
                    {releaseDeadStroke.toFixed(2)} mm
                  </div>

                  <button
                    onClick={() => {
                      const next = Math.min(0.5, Number((releaseDeadStroke + 0.02).toFixed(3)));
                      setReleaseDeadStroke(next);
                      handleApplyDeadZoneToSelected(pressDeadStroke, next);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.90rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Range Slider */}
              <input
                type="range"
                min="0.00"
                max="0.50"
                step="0.01"
                value={releaseDeadStroke}
                onChange={(e) => setReleaseDeadStroke(parseFloat(e.target.value))}
                onMouseUp={() => handleApplyDeadZoneToSelected()}
                onTouchEnd={() => handleApplyDeadZoneToSelected()}
                style={{
                  width: '100%',
                  accentColor: '#d97706',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Anti-Jitter Optimization Toggle Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '16px 20px',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#fff' }}>
                    Anti-Jitter Optimization (Anti-Shake / 防抖优化)
                  </span>
                  {shakeOptimization && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Digital MCU hardware low-pass filter preventing analog Hall Effect sensor jitter, electromagnetic noise, and desk vibration.
                </div>
              </div>

              {/* Modern Switch Component */}
              <button
                onClick={async () => {
                  const nextVal = !shakeOptimization;
                  setShakeOptimization(nextVal);
                  try {
                    await performanceController.setShakeOptimization(nextVal);
                  } catch (err) {
                    console.error('Failed to set shake optimization:', err);
                  }
                }}
                style={{
                  width: 52,
                  height: 28,
                  borderRadius: 14,
                  background: shakeOptimization
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 2,
                  boxShadow: shakeOptimization ? '0 0 12px rgba(245, 158, 11, 0.5)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: '#fff',
                    position: 'absolute',
                    top: 2,
                    left: shakeOptimization ? 26 : 2,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                  }}
                />
              </button>
            </div>

            {/* Quick Deadzone Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Fast Presets:
              </span>
              {[
                { id: 'standard', label: '🛡️ Recommended Esports (0.20mm Top, 0.20mm Bottom)' },
                { id: 'minimal', label: '⚡ Ultra-Low Filter (0.05mm Top, 0.05mm Bottom)' },
                { id: 'zero_top', label: '🪶 Zero Top Deadzone (0.00mm Top, 0.15mm Bottom)' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyDeadZonePreset(p.id as any)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = '#fbbf24';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PLACEHOLDERS FOR NEXT SUBSECTIONS */}

        {/* SUBSECTION 3: MAGNETIC SWITCH LIBRARY */}
        {activeSubTab === 'switch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header / Selection Info & Save Action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                    Magnetic Switch Profiles (轴体库)
                  </h3>
                  <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {selectedKeySet.size > 0 ? (
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {selectedKeySet.size} key{selectedKeySet.size > 1 ? 's' : ''} selected — Select a switch below, then click "Assign {selectedSwitchProfile.nameEn}"
                      </span>
                    ) : (
                      'Select keys on the keyboard to assign switch profiles and travel calibration'
                    )}
                  </div>
                </div>
              </div>

              {/* Hardware Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => handleApplySwitchToSelected(selectedSwitchProfile)}
                  disabled={isApplyingSwitch || selectedKeySet.size === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: selectedKeySet.size === 0 ? 'not-allowed' : 'pointer',
                    opacity: selectedKeySet.size === 0 ? 0.5 : 1,
                    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Check size={16} />
                  {isApplyingSwitch ? 'Assigning...' : `Assign ${selectedSwitchProfile.nameEn}`}
                </button>

                <button
                  onClick={handleSaveToFlash}
                  disabled={isSavingFlash}
                  title="Burn switch configuration permanently into keyboard onboard flash memory"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: saveSuccess
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'var(--bg-tertiary)',
                    color: saveSuccess ? '#fff' : 'var(--text-main)',
                    border: `1px solid ${saveSuccess ? '#10b981' : 'var(--border-subtle)'}`,
                    padding: '9px 16px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {saveSuccess ? <Check size={16} /> : <Save size={16} />}
                  {saveSuccess ? 'Saved to Flash!' : isSavingFlash ? 'Saving...' : 'Save to Flash'}
                </button>
              </div>
            </div>

            {/* Live Hardware Telemetry Sniffer Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderRadius: 10,
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                fontSize: '0.80rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span
                  style={{
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: '#10b981',
                      boxShadow: '0 0 8px #10b981',
                    }}
                  />
                  LIVE HARDWARE SNIFFER
                </span>
                {selectedKeySet.size > 0 ? (
                  <>
                    <span>
                      Key: <strong style={{ color: '#fff' }}>[{Array.from(selectedKeySet)[0]}]</strong>
                    </span>
                    <span>
                      Axis V2 ID: <strong style={{ color: '#fbbf24' }}>{perfCache[Array.from(selectedKeySet)[0]]?.axisV2Id ?? 'Reading...'}</strong>
                    </span>
                    <span>
                      Hardware Profile: <strong style={{ color: '#38bdf8' }}>
                        {(() => {
                          const targetKeyId = Array.from(selectedKeySet)[0];
                          const localPref = getSavedSwitchAssignments()[targetKeyId];
                          const targetConf = perfCache[targetKeyId];
                          const sw = findSwitchById(targetConf?.axisV2Id || 0, localPref, targetConf?.axisRangeMax);
                          return `${sw.nameEn} (${sw.nameZh})`;
                        })()}
                      </strong>
                    </span>
                    <span>
                      Max Travel: <strong style={{ color: '#a78bfa' }}>
                        {((perfCache[Array.from(selectedKeySet)[0]]?.axisRangeMax || 0) / 1000).toFixed(2)} mm
                      </strong>
                    </span>
                    <span>
                      Coeff: <strong style={{ color: '#f472b6' }}>
                        {perfCache[Array.from(selectedKeySet)[0]]?.axisCoefficient ?? 0}
                      </strong>
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>
                    Select any key (e.g. Esc or W/A/S/D) to inspect live on-chip hardware telemetry.
                  </span>
                )}
              </div>
            </div>

            {/* Main Switch Library Layout: Brand Sidebar + Switch Cards Grid */}
            <div style={{ display: 'flex', gap: 20 }}>
              {/* Brand Filter Buttons (matching OEM magnetic switch.png) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  width: 140,
                  flexShrink: 0,
                }}
              >
                {(
                  [
                    { id: 'Everglide', label: 'Jiang Wan', sub: 'Everglide / 江湾' },
                    { id: 'Gateron', label: 'GATERON', sub: '佳达隆' },
                    { id: 'TTC', label: 'TTC', sub: '正牌科电' },
                    { id: 'Other', label: 'Other', sub: '其它' },
                  ] as const
                ).map((b) => {
                  const isActive = selectedBrand === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBrand(b.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 10px',
                        borderRadius: 12,
                        background: isActive
                          ? 'linear-gradient(135deg, #0284c7, #2563eb)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isActive
                          ? '1px solid var(--accent-cyan)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{b.label}</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: 2 }}>{b.sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* Switches Grid */}
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 12,
                  maxHeight: 420,
                  overflowY: 'auto',
                  padding: '8px 8px 12px 4px',
                }}
              >
                {SWITCH_DATABASE.filter((s) => s.brand === selectedBrand).map((sw) => {
                  const isSelected = selectedSwitchProfile.id === sw.id;
                  return (
                    <div
                      key={sw.id}
                      onClick={() => {
                        setSelectedSwitchProfile(sw);
                      }}
                      style={{
                        background: isSelected
                          ? 'linear-gradient(180deg, rgba(2, 132, 199, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected
                          ? '1.5px solid var(--accent-cyan)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 12,
                        padding: '14px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        boxShadow: isSelected
                          ? '0 0 16px rgba(6, 182, 212, 0.35)'
                          : '0 2px 6px rgba(0, 0, 0, 0.25)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.transform = 'none';
                        }
                      }}
                    >
                      {/* Stylized 3D Switch Icon */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          background: sw.housingColor,
                          border: '1.5px solid rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 10,
                          boxShadow: `0 4px 12px ${sw.housingColor}`,
                          position: 'relative',
                        }}
                      >
                        {/* Switch Cross Stem */}
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            background: sw.stemColor,
                            borderRadius: 2,
                            position: 'relative',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                          }}
                        >
                          {/* Horizontal Cross Bar */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 5,
                              left: -2,
                              right: -2,
                              height: 4,
                              background: sw.stemColor,
                            }}
                          />
                          {/* Vertical Cross Bar */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 5,
                              top: -2,
                              bottom: -2,
                              width: 4,
                              background: sw.stemColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Switch Names */}
                      <span
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          color: '#fff',
                          lineHeight: 1.2,
                        }}
                      >
                        {sw.nameEn}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginTop: 2,
                        }}
                      >
                        {sw.nameZh}
                      </span>

                      {/* Travel Distance Pill */}
                      <span
                        style={{
                          fontSize: '0.70rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--accent-cyan)',
                          border: '1px solid rgba(6, 182, 212, 0.3)',
                          marginTop: 8,
                        }}
                      >
                        {sw.maxTravelMm.toFixed(2)} mm
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Switch Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Stock Presets:
              </span>
              {[
                {
                  label: '🌊 Everglide Siren V4 (3.40mm)',
                  profileId: 100,
                },
                {
                  label: '⚡ Stock AE64 (White Wukong 3.39mm)',
                  profileId: 253,
                },
                {
                  label: '🎯 Esports Standard (Magnetic Jade 3.43mm)',
                  profileId: 200,
                },
              ].map((p) => {
                const sw = SWITCH_DATABASE.find((s) => s.id === p.profileId) || SWITCH_DATABASE[0];
                return (
                  <button
                    key={p.label}
                    onClick={() => {
                      setSelectedSwitchProfile(sw);
                      setSelectedBrand(sw.brand);
                    }}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBSECTION 4: HARDWARE SENSOR CALIBRATION */}
        {activeSubTab === 'calibration' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header Control Panel with "Keyboard Adjusting" switch */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderRadius: 12,
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              {/* Left: Keyboard Adjusting Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Keyboard Adjusting
                </span>

                <button
                  type="button"
                  onClick={handleToggleCalibration}
                  disabled={isSavingCalib}
                  title={isCalibrating ? 'Click to finish calibration and burn to flash' : 'Click to start calibration'}
                  style={{
                    width: 52,
                    height: 28,
                    borderRadius: 14,
                    background: isCalibrating ? '#2563eb' : '#334155',
                    border: 'none',
                    position: 'relative',
                    cursor: isSavingCalib ? 'wait' : 'pointer',
                    transition: 'background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isCalibrating ? '0 0 12px rgba(37, 99, 235, 0.5)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 3,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: '#ffffff',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                      transform: isCalibrating ? 'translateX(24px)' : 'translateX(0px)',
                      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </button>

                {isSavingCalib && (
                  <span style={{ fontSize: '0.80rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RotateCcw size={14} className="animate-spin" />
                    Burning to Flash...
                  </span>
                )}

                {calibSaveSuccess && (
                  <span style={{ fontSize: '0.80rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={15} />
                    Calibration Burned to Flash!
                  </span>
                )}
              </div>

              {/* Right: Verified Stats & Factory Reset */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    fontSize: '0.80rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Calibrated Keys:{' '}
                  <strong style={{ color: '#38bdf8' }}>
                    {Object.values(hwCalibratedMap).filter(Boolean).length}
                  </strong>{' '}
                  / {allKeys.length || 64}
                </div>

                <button
                  type="button"
                  onClick={handleResetCalibration}
                  disabled={isResettingCalib || isCalibrating}
                  title="Reset Hall Effect calibration back to factory baseline"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: calibResetSuccess ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: calibResetSuccess ? '#ef4444' : 'var(--text-muted)',
                    border: `1px solid ${calibResetSuccess ? '#ef4444' : 'var(--border-subtle)'}`,
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: '0.80rem',
                    cursor: isCalibrating ? 'not-allowed' : 'pointer',
                    opacity: isCalibrating ? 0.4 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RotateCcw size={14} className={isResettingCalib ? 'animate-spin' : ''} />
                  {calibResetSuccess ? 'Reset Complete!' : isResettingCalib ? 'Resetting...' : 'Factory Reset'}
                </button>
              </div>
            </div>

            {/* Real-time Keystroke Waveform Graph with Space / Earth Nebula theme */}
            <CalibrationWaveformCanvas
              latestStrokeRef={latestStrokeRef}
              isCalibrating={isCalibrating}
            />
          </div>
        )}

        {/* SUBSECTION 5: PHYSICAL TRAVEL TEST */}
        {activeSubTab === 'travel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header / Toggle Row matching xsyd.top */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderRadius: 12,
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Travel Test:
                </span>

                <button
                  type="button"
                  onClick={() => setIsTravelTestActive(!isTravelTestActive)}
                  title={isTravelTestActive ? 'Click to pause Travel Test' : 'Click to start Travel Test'}
                  style={{
                    width: 52,
                    height: 28,
                    borderRadius: 14,
                    background: isTravelTestActive ? '#2563eb' : '#334155',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isTravelTestActive ? '0 0 12px rgba(37, 99, 235, 0.5)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 3,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: '#ffffff',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                      transform: isTravelTestActive ? 'translateX(24px)' : 'translateX(0px)',
                      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </button>

                <span
                  style={{
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: isTravelTestActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                    color: isTravelTestActive ? '#10b981' : '#94a3b8',
                    border: `1px solid ${isTravelTestActive ? '#10b981' : 'rgba(100, 116, 139, 0.3)'}`,
                  }}
                >
                  {isTravelTestActive ? 'LIVE MONITORING ACTIVE' : 'PAUSED'}
                </span>
              </div>

              {/* Monitored Switch Model & Range */}
              <div
                style={{
                  fontSize: '0.80rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Physical Switch Limit:{' '}
                <strong style={{ color: 'var(--accent-cyan)' }}>
                  {(selectedSwitchProfile?.maxTravelMm || 3.4).toFixed(2)} mm
                </strong>{' '}
                ({selectedSwitchProfile?.nameEn || 'Siren V4'})
              </div>
            </div>

            {/* Vertical Analog Keystroke Displacement Gauge Component */}
            <TravelTestGauge
              currentTravelMm={activeTravelMm}
              maxTravelMm={selectedSwitchProfile?.maxTravelMm || 3.4}
              activeKeyLabel={activeTravelKey}
              isTesting={isTravelTestActive}
              actuationPoint={actuationPoint}
            />
          </div>
        )}
      </div>
    </div>
  );
};
