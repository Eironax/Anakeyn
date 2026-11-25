/**
 * Anakeyn — Device Settings, Hardware Specs & Firmware Update Suite
 * Combines hardware inspection specs with the official 3-step Firmware Update workflow,
 * history version rollback selector, granular factory restore, sleep timer, and polling rate controls.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RefreshCw,
  Download,
  Upload,
  History,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  FileCode,
  Sliders,
  ShieldAlert,
  HardDrive,
  Cloud,
  Info,
  X,
  Zap,
} from 'lucide-react';
import {
  deviceSettingsController,
  type FirmwareVersionInfo,
  type UpgradeProgress,
  type ResetTarget,
  KNOWN_AE64_FIRMWARES,
} from '../../core/settings/deviceSettingsController';
import type { V2ProbeResult } from '../../core/hid/probe';

interface SettingsViewProps {
  probeData: V2ProbeResult | null;
  isProbing: boolean;
  onProbe: () => void;
  onPollingRateChange?: (rate: string) => void;
}

const SLEEP_TIME_OPTIONS = [
  { label: 'Never (Always On)', value: 0 },
  { label: '1 Minute', value: 1 },
  { label: '2 Minutes', value: 2 },
  { label: '3 Minutes', value: 3 },
  { label: '5 Minutes', value: 5 },
  { label: '10 Minutes', value: 10 },
  { label: '15 Minutes', value: 15 },
  { label: '20 Minutes', value: 20 },
  { label: '25 Minutes', value: 25 },
  { label: '30 Minutes (Default)', value: 30 },
  { label: '45 Minutes', value: 45 },
  { label: '60 Minutes', value: 60 },
  { label: '120 Minutes', value: 120 },
];

const POLLING_RATE_OPTIONS = [
  { code: 0, label: '8000 Hz (0.125ms Ultra)', short: '8KHz' },
  { code: 1, label: '4000 Hz (0.25ms Extreme)', short: '4KHz' },
  { code: 2, label: '2000 Hz (0.50ms Fast)', short: '2KHz' },
  { code: 3, label: '1000 Hz (1.0ms Standard)', short: '1KHz' },
  { code: 4, label: '500 Hz (2.0ms)', short: '500Hz' },
  { code: 5, label: '250 Hz (4.0ms)', short: '250Hz' },
  { code: 6, label: '125 Hz (8.0ms Legacy)', short: '125Hz' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  probeData,
  isProbing,
  onProbe,
  onPollingRateChange,
}) => {
  // Device Controls State (Initialized from probeData if available)
  const [sleepTime, setSleepTime] = useState<number>(() => probeData?.sleepTimeMinutes ?? 30);
  const [pollingRateCode, setPollingRateCode] = useState<number>(() => {
    if (probeData?.pollingRateCode !== undefined) return probeData.pollingRateCode;
    if (probeData?.rawDetails?.['POLLING_RATE_CODE']) {
      const c = Number(probeData.rawDetails['POLLING_RATE_CODE']);
      if (!isNaN(c)) return c;
    }
    return 3;
  });
  const [isSavingControls, setIsSavingControls] = useState<boolean>(false);
  const [controlFeedback, setControlFeedback] = useState<string | null>(null);

  // Firmware Update Mode: online vs local
  const [updateMode, setUpdateMode] = useState<'online' | 'local'>('online');
  const [availableFirmwares, setAvailableFirmwares] = useState<FirmwareVersionInfo[]>(KNOWN_AE64_FIRMWARES);
  const [selectedFirmware, setSelectedFirmware] = useState<FirmwareVersionInfo>(KNOWN_AE64_FIRMWARES[0]);
  const [localBinFile, setLocalBinFile] = useState<{ name: string; size: number; data: Uint8Array } | null>(null);
  const [isFetchingFirmwares, setIsFetchingFirmwares] = useState<boolean>(false);

  // Flashing State
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [progress, setProgress] = useState<UpgradeProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    status: 'Ready to flash',
    phase: 'idle',
  });

  // Modals
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [tempSelectedHistoryVer, setTempSelectedHistoryVer] = useState<string>(KNOWN_AE64_FIRMWARES[0].firmware_version);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);
  const [restoreTarget, setRestoreTarget] = useState<ResetTarget>('All');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isStartWarningModalOpen, setIsStartWarningModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current firmware string displayed cleanly
  const currentAppVersion = useMemo(() => {
    if (probeData?.appVersion && probeData.appVersion !== 'Unknown') {
      return probeData.appVersion.startsWith('v') ? probeData.appVersion : `v${probeData.appVersion}`;
    }
    return 'v0.0.7.0';
  }, [probeData]);

  // Synchronize live hardware values whenever probeData changes
  useEffect(() => {
    if (probeData) {
      if (probeData.pollingRateCode !== undefined && probeData.pollingRateCode >= 0) {
        setPollingRateCode(probeData.pollingRateCode);
      } else if (probeData.rawDetails?.['POLLING_RATE_CODE'] !== undefined) {
        const c = Number(probeData.rawDetails['POLLING_RATE_CODE']);
        if (!isNaN(c) && c >= 0 && c <= 6) {
          setPollingRateCode(c);
        }
      }
      if (probeData.sleepTimeMinutes !== undefined && probeData.sleepTimeMinutes >= 0) {
        setSleepTime(probeData.sleepTimeMinutes);
      }
    }
  }, [probeData]);

  // Initial load of sleep time, polling rate, and online firmware catalog
  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      try {
        const [sleep, rate] = await Promise.all([
          deviceSettingsController.getSleepTime(),
          deviceSettingsController.getPollingRate(),
        ]);
        if (mounted) {
          if (sleep !== undefined && sleep !== null) setSleepTime(sleep);
          if (rate !== undefined && rate !== null && rate >= 0 && rate <= 6) setPollingRateCode(rate);
        }
      } catch (e) {
        console.warn('Failed loading settings initial values:', e);
      }

      // Query online firmwares
      if (mounted) {
        setIsFetchingFirmwares(true);
        try {
          const list = await deviceSettingsController.fetchFirmwareVersions(
            probeData?.boardId,
            '1ca6',
            '300a'
          );
          if (mounted && list && list.length > 0) {
            setAvailableFirmwares(list);
            setSelectedFirmware(list[0]);
            setTempSelectedHistoryVer(list[0].firmware_version);
          }
        } catch (e) {
          console.warn('Failed loading online firmwares:', e);
        } finally {
          if (mounted) setIsFetchingFirmwares(false);
        }
      }
    }

    loadInitial();
    return () => {
      mounted = false;
    };
  }, [probeData?.boardId]);

  // Handle Sleep Time change
  const handleSleepTimeChange = async (minutes: number) => {
    setSleepTime(minutes);
    setIsSavingControls(true);
    try {
      await deviceSettingsController.setSleepTime(minutes);
      showFeedback(`Sleep time updated to ${minutes === 0 ? 'Never' : `${minutes} min`}`);
    } catch {
      showFeedback('Failed to update sleep time');
    } finally {
      setIsSavingControls(false);
    }
  };

  // Handle Polling Rate change
  const handlePollingRateChange = async (code: number) => {
    setPollingRateCode(code);
    setIsSavingControls(true);
    try {
      await deviceSettingsController.setPollingRate(code);
      const opt = POLLING_RATE_OPTIONS.find(o => o.code === code);
      if (opt && onPollingRateChange) {
        onPollingRateChange(opt.short);
      }
      showFeedback(`Polling rate updated to ${opt?.short || code}`);
    } catch {
      showFeedback('Failed to update polling rate');
    } finally {
      setIsSavingControls(false);
    }
  };

  // High Polling Rate Reset
  const handleHighPollingRateReset = async () => {
    setIsSavingControls(true);
    try {
      await deviceSettingsController.highPollingRateReset();
      showFeedback('High polling rate buffer reset successfully');
    } catch {
      showFeedback('Failed to reset high polling rate');
    } finally {
      setIsSavingControls(false);
    }
  };

  // Factory Restore execution
  const handleExecuteRestore = async () => {
    setIsRestoring(true);
    try {
      const ok = await deviceSettingsController.restoreFactory(restoreTarget);
      if (ok) {
        showFeedback(`Factory restore (${restoreTarget}) completed!`);
        setIsRestoreModalOpen(false);
        onProbe();
      } else {
        showFeedback('Factory restore returned error from device');
      }
    } catch (e) {
      showFeedback(`Restore failed: ${String(e)}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Local File Upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.bin')) {
      alert('Only .bin firmware files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        const uint8 = new Uint8Array(reader.result);
        setLocalBinFile({
          name: file.name,
          size: file.size,
          data: uint8,
        });
        showFeedback(`Loaded local binary: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Trigger file browser
  const handleBrowseLocalFile = () => {
    fileInputRef.current?.click();
  };

  // Confirm selected version from History Modal
  const handleConfirmHistoryVersion = () => {
    const match = availableFirmwares.find(f => f.firmware_version === tempSelectedHistoryVer);
    if (match) {
      setSelectedFirmware(match);
      setUpdateMode('online');
      showFeedback(`Selected firmware version ${match.firmware_version}`);
    }
    setIsHistoryModalOpen(false);
  };

  // Start Firmware Update runner
  const handleStartUpgrade = async () => {
    setIsStartWarningModalOpen(false);
    setIsUpgrading(true);

    try {
      let binData: Uint8Array | null = null;

      if (updateMode === 'local') {
        if (!localBinFile) {
          throw new Error('Please select a local .bin firmware file first.');
        }
        binData = localBinFile.data;
      } else {
        setProgress({
          current: 0,
          total: 0,
          percentage: 0,
          status: `Downloading ${selectedFirmware.firmware_version} (${selectedFirmware.firmware_name})...`,
          phase: 'bootloader',
        });
        binData = await deviceSettingsController.downloadFirmwareBin(selectedFirmware.firmware_file);
      }

      deviceSettingsController.setPendingBin(binData);

      const ok = await deviceSettingsController.flashFirmware(binData, (p) => {
        setProgress(p);
      });

      if (ok) {
        showFeedback('Firmware flashed successfully! Please re-probe device.');
        onProbe();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProgress((prev) => ({
        ...prev,
        status: `Upgrade failed: ${msg}`,
        phase: 'error',
      }));
      showFeedback(`Upgrade error: ${msg}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Resume flashing after user clicks to connect bootloader in browser picker
  const handleResumeBootloaderFlash = async () => {
    setIsUpgrading(true);
    try {
      const ok = await deviceSettingsController.resumeFlashAfterUserGesture((p) => {
        setProgress(p);
      });
      if (ok) {
        showFeedback('Firmware flashed successfully! Please re-probe device.');
        onProbe();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProgress((prev) => ({
        ...prev,
        status: `Upgrade failed: ${msg}`,
        phase: 'error',
      }));
      showFeedback(`Upgrade error: ${msg}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Retry flashing (works whether keyboard is currently in bootloader or rebooted into normal mode)
  const handleRetryFlash = async () => {
    const bin = deviceSettingsController.getPendingBin();
    if (!bin) {
      handleStartUpgrade();
      return;
    }
    setIsUpgrading(true);
    try {
      const ok = await deviceSettingsController.flashFirmware(bin, (p) => {
        setProgress(p);
      });
      if (ok) {
        showFeedback('Firmware flashed successfully! Please re-probe device.');
        onProbe();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProgress((prev) => ({
        ...prev,
        status: `Upgrade failed: ${msg}`,
        phase: 'error',
      }));
      showFeedback(`Upgrade error: ${msg}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  const showFeedback = (msg: string) => {
    setControlFeedback(msg);
    setTimeout(() => {
      setControlFeedback(null);
    }, 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Toast Feedback Notification */}
      {controlFeedback && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 28,
            zIndex: 9999,
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid var(--accent-cyan)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '0.85rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Zap size={16} color="var(--accent-cyan)" />
          {controlFeedback}
        </div>
      )}

      {/* Hidden File Input for local .bin uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".bin"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Top Header Card: Title, Status, Version, History & Restore Buttons */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85))',
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              Device Settings & Firmware Update
            </h2>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--accent-emerald)',
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)' }} />
              Connected
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            <span>
              Device: <strong style={{ color: '#fff' }}>Everglide AE64 Pro (1CA6:300A)</strong>
            </span>
            <span>•</span>
            <span>
              Current Version: <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{currentAppVersion}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons: History Version & Restore Factory */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            disabled={isUpgrading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '9px 18px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: isUpgrading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <History size={15} />
            History Version
          </button>

          <button
            onClick={() => setIsRestoreModalOpen(true)}
            disabled={isUpgrading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '9px 18px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: isUpgrading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCcw size={15} />
            Restore Factory
          </button>
        </div>
      </div>

      {/* Hardware Specs Grid (Non-redundant: removed Firmware/PCB, Report Rate, Switch Technology) */}
      <div className="glass-panel" style={{ padding: 24, borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={18} color="var(--accent-indigo)" />
              Everglide AE64 Pro Hardware Specs
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Real-time handshake diagnostics retrieved directly via SparkLink Protocol v2
            </p>
          </div>
          <button
            onClick={onProbe}
            disabled={isProbing || isUpgrading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, var(--accent-indigo), #4f46e5)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.80rem',
              cursor: isProbing || isUpgrading ? 'not-allowed' : 'pointer',
              opacity: isProbing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} className={isProbing ? 'spin' : ''} />
            {isProbing ? 'Probing...' : 'Re-Probe Hardware'}
          </button>
        </div>

        {probeData ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
            {[
              { label: 'Protocol Version', val: probeData.protocolVersion },
              { label: 'Board ID', val: String(probeData.boardId) },
              { label: 'Operating Mode', val: probeData.osMode },
              { label: 'Device Serial Number', val: probeData.serialNumber || 'N/A' },
              { label: 'Firmware Build Date', val: probeData.buildDate || 'N/A' },
            ].map((spec, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  padding: '14px 18px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 5, fontWeight: 600 }}>
                  {spec.label}
                </div>
                <div style={{ fontSize: '0.90rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {spec.val}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Hardware probe data not yet loaded. Click &quot;Re-Probe Hardware&quot; to inspect connected controller.
          </div>
        )}
      </div>

      {/* Firmware Update 3-Step Workflow (From update.jpeg) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* STEP 1: SELECT FIRMWARE */}
        <div
          className="glass-panel"
          style={{
            padding: 24,
            borderRadius: 14,
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--accent-cyan)',
                  color: '#000',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.90rem',
                }}
              >
                1
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Select Firmware</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Support bin file update or online update (only .bin supported)
                </div>
              </div>
            </div>

            {/* Online vs Local Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.8)',
                padding: 4,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: 16,
              }}
            >
              <button
                onClick={() => setUpdateMode('online')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: updateMode === 'online' ? 'var(--accent-cyan)' : 'transparent',
                  color: updateMode === 'online' ? '#000' : 'var(--text-dim)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Cloud size={14} />
                Online Update
              </button>
              <button
                onClick={() => setUpdateMode('local')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: updateMode === 'local' ? 'var(--accent-cyan)' : 'transparent',
                  color: updateMode === 'local' ? '#000' : 'var(--text-dim)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <HardDrive size={14} />
                Local Update (.bin)
              </button>
            </div>

            {/* Content for Online Mode */}
            {updateMode === 'online' ? (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 10,
                  padding: 16,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Selected Cloud Firmware
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {selectedFirmware.firmware_version}
                    </div>
                  </div>
                  {selectedFirmware.isLatest && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: 'var(--accent-emerald)',
                      }}
                    >
                      Latest
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--text-dim)',
                    marginBottom: 12,
                    lineHeight: 1.4,
                    wordBreak: 'break-all',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {selectedFirmware.firmware_name || selectedFirmware.description}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '7px 12px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <History size={13} />
                    Choose Other Version
                  </button>

                  {/* Direct Download .bin link */}
                  {selectedFirmware.firmware_file && (
                    <a
                      href={
                        selectedFirmware.firmware_file.startsWith('http')
                          ? selectedFirmware.firmware_file
                          : `https://api.sparklinkplayjoy.com${selectedFirmware.firmware_file}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      download={selectedFirmware.firmware_name}
                      title="Direct download .bin file"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        color: 'var(--accent-cyan)',
                        padding: '7px 10px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={13} />
                    </a>
                  )}

                  <button
                    onClick={async () => {
                      setIsFetchingFirmwares(true);
                      try {
                        const list = await deviceSettingsController.fetchFirmwareVersions(probeData?.boardId);
                        setAvailableFirmwares(list);
                        showFeedback(`Found ${list.length} available firmware releases`);
                      } finally {
                        setIsFetchingFirmwares(false);
                      }
                    }}
                    disabled={isFetchingFirmwares}
                    title="Check online API for newest updates"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--text-dim)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '7px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={13} className={isFetchingFirmwares ? 'spin' : ''} />
                  </button>
                </div>
              </div>
            ) : (
              /* Content for Local Mode */
              <div
                onClick={handleBrowseLocalFile}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 10,
                  padding: 20,
                  border: localBinFile ? '1px solid var(--accent-emerald)' : '1px dashed rgba(255, 255, 255, 0.15)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {localBinFile ? (
                  <div>
                    <FileCode size={28} color="var(--accent-emerald)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', wordBreak: 'break-all' }}>
                      {localBinFile.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: 4 }}>
                      {(localBinFile.size / 1024).toFixed(1)} KB • Ready to flash
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBrowseLocalFile();
                      }}
                      style={{
                        marginTop: 10,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: 6,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Re-select .bin
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={28} color="var(--text-dim)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Click to select firmware</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
                      Drag and drop local .bin file here or click Browse
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: ENTER UPDATE MODE */}
        <div
          className="glass-panel"
          style={{
            padding: 24,
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--accent-indigo)',
                  color: '#fff',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.90rem',
                }}
              >
                2
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Enter Update Mode</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Update time approx 1–2 minutes • Do not disconnect
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-amber)', fontWeight: 700, fontSize: '0.82rem', marginBottom: 6 }}>
                <AlertTriangle size={15} />
                Crucial Flash Instructions
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                <li>Do not unplug the USB cable during bootloader flashing.</li>
                <li>Ensure connected via stable motherboard USB port.</li>
                <li>Device will automatically restart once validation succeeds.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setIsStartWarningModalOpen(true)}
            disabled={isUpgrading || (updateMode === 'local' && !localBinFile)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: isUpgrading
                ? 'rgba(255, 255, 255, 0.1)'
                : 'linear-gradient(135deg, var(--accent-cyan), #0284c7)',
              color: isUpgrading ? 'var(--text-dim)' : '#000',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: isUpgrading || (updateMode === 'local' && !localBinFile) ? 'not-allowed' : 'pointer',
              boxShadow: isUpgrading ? 'none' : '0 4px 16px rgba(56, 189, 248, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={16} />
            {isUpgrading ? 'Flashing in Progress...' : 'Start Update'}
          </button>
        </div>

        {/* STEP 3: START UPDATE & PROGRESS */}
        <div
          className="glass-panel"
          style={{
            padding: 24,
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: progress.phase === 'complete' ? 'var(--accent-emerald)' : 'var(--bg-tertiary)',
                  color: progress.phase === 'complete' ? '#fff' : 'var(--text-dim)',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.90rem',
                }}
              >
                3
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Update Status</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Device will reboot after completion
                </div>
              </div>
            </div>

            {/* Progress Bar Container */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  {progress.phase === 'complete' ? 'Update Complete' : progress.phase === 'idle' ? 'Waiting for update' : 'Updating...'}
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {progress.percentage}%
                </span>
              </div>

              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  height: 10,
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${progress.percentage}%`,
                    height: '100%',
                    background:
                      progress.phase === 'complete'
                        ? 'linear-gradient(90deg, var(--accent-emerald), #10b981)'
                        : progress.phase === 'error'
                        ? '#ef4444'
                        : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-indigo))',
                    borderRadius: 999,
                    transition: 'width 0.25s ease',
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: '0.74rem',
                  color: progress.phase === 'error' ? '#ef4444' : progress.phase === 'needs_reconnect' ? 'var(--accent-amber)' : 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {progress.phase === 'complete' ? (
                  <CheckCircle2 size={14} color="var(--accent-emerald)" />
                ) : isUpgrading ? (
                  <RefreshCw size={12} className="spin" color="var(--accent-cyan)" />
                ) : progress.phase === 'needs_reconnect' ? (
                  <AlertTriangle size={14} color="var(--accent-amber)" />
                ) : null}
                <span>{progress.status}</span>
              </div>

              {/* Action when Chrome permission gesture is needed for bootloader */}
              {progress.phase === 'needs_reconnect' && (
                <div style={{ marginTop: 14 }}>
                  <button
                    onClick={handleResumeBootloaderFlash}
                    disabled={isUpgrading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)',
                      color: '#000',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 15px rgba(56, 189, 248, 0.35)',
                    }}
                  >
                    <Download size={15} />
                    Select Bootloader & Continue Flash
                  </button>
                  <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                    Click above to choose the bootloader device in Chrome&apos;s popup
                  </p>
                </div>
              )}

              {/* Action when flashing failed midway (MCU is safely sitting in bootloader) */}
              {progress.phase === 'error' && (
                <div style={{ marginTop: 14 }}>
                  <button
                    onClick={handleRetryFlash}
                    disabled={isUpgrading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#000',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <RotateCcw size={15} />
                    Retry Flashing (Keyboard is in Bootloader)
                  </button>
                  <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--accent-amber)', textAlign: 'center' }}>
                    Keyboard remains safe in Bootloader mode. You do not need to unplug the USB cable.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.4 }}>
            Do not close browser during update.
          </div>
        </div>
      </div>

      {/* Safety Notice Cards (Preparation, Update Time, Update Failed from update.jpeg) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 8,
              borderRadius: 8,
              background: 'rgba(56, 189, 248, 0.1)',
              color: 'var(--accent-cyan)',
            }}
          >
            <ShieldAlert size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: 4 }}>Preparation</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
              Ensure keyboard connection is stable and do not disconnect during update.
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 8,
              borderRadius: 8,
              background: 'rgba(245, 158, 11, 0.1)',
              color: 'var(--accent-amber)',
            }}
          >
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: 4 }}>Update Time</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
              Update takes approximately 1–2 minutes, please wait patiently.
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 8,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
            }}
          >
            <Info size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: 4 }}>Hardware Recovery Mode</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
              If disconnected or stuck in bootloader: unplug USB for 15s, then hold <strong>ESC</strong> while plugging back in.
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Device Controls Bar (Bottom of update.jpeg) */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          borderRadius: 14,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Keyboard Sleep Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} color="var(--accent-cyan)" />
              Keyboard Sleep Time:
            </span>
            <select
              value={sleepTime}
              disabled={isSavingControls || isUpgrading}
              onChange={(e) => handleSleepTimeChange(Number(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: '#fff',
                border: '1px solid var(--border-subtle)',
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: '0.80rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {!SLEEP_TIME_OPTIONS.some((opt) => opt.value === sleepTime) && (
                <option value={sleepTime}>{sleepTime} Minutes (Device Value)</option>
              )}
              {SLEEP_TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Report Rate (Polling Rate) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sliders size={15} color="var(--accent-indigo)" />
              Report Rate:
            </span>
            <select
              value={pollingRateCode}
              disabled={isSavingControls || isUpgrading}
              onChange={(e) => handlePollingRateChange(Number(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: '#fff',
                border: '1px solid var(--border-subtle)',
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: '0.80rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {!POLLING_RATE_OPTIONS.some((opt) => opt.code === pollingRateCode) && (
                <option value={pollingRateCode}>Code {pollingRateCode} (Device Value)</option>
              )}
              {POLLING_RATE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* High Polling Rate Reset Button */}
        <button
          onClick={handleHighPollingRateReset}
          disabled={isSavingControls || isUpgrading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-dim)',
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={12} />
          Reset High Polling Buffer
        </button>
      </div>

      {/* MODAL 1: History Version Selection Modal */}
      {isHistoryModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: 580,
              background: '#0f172a',
              borderRadius: 16,
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                  Select Firmware Version (历史固件选择)
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Version List */}
            <div style={{ padding: 20, maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 4 }}>
                Choose any available firmware build or rollback version for Everglide AE64 Pro:
              </div>

              {availableFirmwares.map((ver) => {
                const isSelected = tempSelectedHistoryVer === ver.firmware_version;
                const isCurrent = ver.firmware_version === currentAppVersion;

                return (
                  <div
                    key={ver.firmware_version}
                    onClick={() => setTempSelectedHistoryVer(ver.firmware_version)}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: 10,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'var(--font-mono)', color: isSelected ? 'var(--accent-cyan)' : '#fff' }}>
                          {ver.firmware_version}
                        </span>
                        {ver.isLatest && (
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', fontSize: '0.68rem', fontWeight: 700 }}>
                            Latest
                          </span>
                        )}
                        {isCurrent && (
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-indigo)', fontSize: '0.68rem', fontWeight: 700 }}>
                            Current Installed
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
                        {ver.description || ver.firmware_name}
                      </div>
                      {ver.firmware_time && (
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                          Release Date: {ver.firmware_time}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: isSelected ? '5px solid var(--accent-cyan)' : '2px solid rgba(255, 255, 255, 0.3)',
                        background: '#0f172a',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHistoryVersion}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)',
                  color: '#000',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Load Version into Updater
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Factory Restore Confirmation Modal */}
      {isRestoreModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#0f172a',
              borderRadius: 16,
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertTriangle size={20} color="#f87171" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                Restore Factory Settings (恢复出厂设置)
              </h3>
            </div>

            <div style={{ padding: 22 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.5 }}>
                Are you sure you want to restore factory settings? This will reset parameters back to default.
                Choose whether to reset everything or a specific subsystem:
              </div>

              {/* Reset Scope Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {(
                  [
                    { id: 'All', title: 'All Settings (Full Wipe)' },
                    { id: 'Performance', title: 'Performance & RT' },
                    { id: 'Lighting', title: 'RGB Lighting' },
                    { id: 'Layout', title: 'Key Remap Layout' },
                    { id: 'HigherKey', title: 'Advanced Keys (SOCD/DKS)' },
                    { id: 'Macro', title: 'Macros Data' },
                    { id: 'Calibration', title: 'Hall Calibration' },
                    { id: 'Axis', title: 'Switch Axis Data' },
                  ] as const
                ).map((scope) => (
                  <button
                    key={scope.id}
                    onClick={() => setRestoreTarget(scope.id)}
                    style={{
                      background: restoreTarget === scope.id ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: restoreTarget === scope.id ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: restoreTarget === scope.id ? '#f87171' : 'var(--text-dim)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {scope.title}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                disabled={isRestoring}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: isRestoring ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <RotateCcw size={14} className={isRestoring ? 'spin' : ''} />
                {isRestoring ? 'Restoring...' : `Confirm Reset (${restoreTarget})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Start Update Confirmation Dialog */}
      {isStartWarningModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#0f172a',
              borderRadius: 16,
              border: '1px solid rgba(245, 158, 11, 0.4)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertTriangle size={20} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                Confirm Firmware Upgrade
              </h3>
            </div>

            <div style={{ padding: 22, fontSize: '0.84rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 12px', color: '#fff', fontWeight: 600 }}>
                You are about to flash:
              </p>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.80rem',
                  color: 'var(--accent-cyan)',
                  wordBreak: 'break-all',
                }}
              >
                {updateMode === 'local'
                  ? `Local File: ${localBinFile?.name} (${((localBinFile?.size || 0) / 1024).toFixed(1)} KB)`
                  : `Cloud Version: ${selectedFirmware.firmware_version} (${selectedFirmware.firmware_name})`}
              </div>
              <p style={{ margin: 0, color: 'var(--accent-amber)' }}>
                ⚠ Do NOT disconnect the USB cable or close the browser tab until flashing completes and the device reboots.
              </p>
            </div>

            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <button
                onClick={() => setIsStartWarningModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartUpgrade}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)',
                  color: '#000',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Proceed with Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
