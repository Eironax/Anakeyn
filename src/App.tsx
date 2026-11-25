import React, { useState, useEffect } from 'react';
import {
  Usb,
  RefreshCw,
} from 'lucide-react';

import { keyboardHID, type DeviceInfo, type LogEntry } from './core/hid/connection';
import { runHardwareProbe, type V2ProbeResult } from './core/hid/probe';
import { PROTOCOL_V2, GLOBAL_CMD, CRW } from './core/hid/constants';
import { keyLayoutController, type KeyMatrixItem } from './core/keys/layout';
import { getKeyLabel } from './core/keys/keycodes';

import { Sidebar, type NavTabId } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { PacketDrawer } from './components/devtools/PacketDrawer';
import { KeyboardCanvas } from './components/keyboard/KeyboardCanvas';
import { KeyPalette } from './components/remap/KeyPalette';
import { PerformanceView, type PerformanceSubTab } from './components/performance/PerformanceView';
import { performanceController } from './core/performance/performanceController';
import { LightingView } from './components/lighting/LightingView';
import { AdvancedView } from './components/advanced/AdvancedView';
import { MacroView } from './components/macro/MacroView';
import { ConfigsView } from './components/configs/ConfigsView';
import { SettingsView } from './components/settings/SettingsView';

export const App: React.FC = () => {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeData, setProbeData] = useState<V2ProbeResult | null>(null);
  const [overridePollingRate, setOverridePollingRate] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);

  // Layout & Navigation State
  const [activeTab, setActiveTab] = useState<NavTabId>('remap');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Keymap state
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [keymapRows, setKeymapRows] = useState<KeyMatrixItem[][] | null>(null);
  const [isLoadingKeymap, setIsLoadingKeymap] = useState(false);
  const [selectedKey, setSelectedKey] = useState<KeyMatrixItem | null>(null);

  // Performance (HE & RT) multi-selection & overlay badges state
  const [perfSubTab, setPerfSubTab] = useState<PerformanceSubTab>('trigger');
  const [selectedKeySet, setSelectedKeySet] = useState<Set<string>>(
    new Set(['2-2', '3-1', '3-2', '3-3']), // Default to WASD selected
  );
  const [perfBadges, setPerfBadges] = useState<Record<string, import('./components/keyboard/KeyboardCanvas').KeyBadgeOverlay>>({});

  // RGB Lighting State (managed self-contained within LightingView)

  // Subscribe to hardware logging stream
  useEffect(() => {
    const unsub = keyboardHID.onLog((entry) => {
      setLogs((prev) => [
        ...prev.slice(-300),
        { ...entry, id: Math.random().toString(36).substring(2, 9) },
      ]);
    });

    keyboardHID.getPairedDevices().then(async (devices) => {
      if (devices.length > 0) {
        try {
          await keyboardHID.attachDevice(devices[0]);
          setDevice(keyboardHID.getDeviceInfo());
        } catch {
          // ignore auto-connect failures on fresh load
        }
      }
    });

    return () => unsub();
  }, []);

  const handleConnect = async (filterSpecific: boolean) => {
    try {
      const dev = await keyboardHID.requestDevice(filterSpecific);
      setDevice(dev);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Connect aborted/failed:', msg);
    }
  };

  const handleDisconnect = async () => {
    await keyboardHID.disconnect();
    performanceController.clearCalibrationState();
    setDevice(null);
    setProbeData(null);
    setKeymapRows(null);
    setSelectedKey(null);
  };

  const handleRunProbe = async () => {
    if (!keyboardHID.isConnected()) return;
    setIsProbing(true);
    try {
      const result = await runHardwareProbe();
      setProbeData(result);
    } catch (err: unknown) {
      console.error('Probe failed:', err);
    } finally {
      setIsProbing(false);
    }
  };

  const handleReadFullKeymap = async (layer = selectedLayer) => {
    if (!keyboardHID.isConnected()) return;
    setIsLoadingKeymap(true);
    try {
      const full = await keyLayoutController.readFullKeyboard(layer);
      setKeymapRows(full);
    } catch (err) {
      console.error('Failed to read full keymap:', err);
    } finally {
      setIsLoadingKeymap(false);
    }
  };

  const handleSelectProfile = async (slot: number) => {
    try {
      // Protocol V2: Global profile slot is 0-indexed (0=Slot 1, 1=Slot 2, ...)
      const slotIndex = slot - 1;
      await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.CONFIG_SWITCH, CRW.WRITE, slotIndex]);
      if (probeData) {
        setProbeData({ ...probeData, activeProfile: slot });
      }
      // Re-read current layer for the newly active profile
      handleReadFullKeymap(selectedLayer);
    } catch (err) {
      console.error(`Failed to switch profile to ${slot}:`, err);
    }
  };

  // When device connects or layer changes, auto-read keymap
  useEffect(() => {
    if (device) {
      handleReadFullKeymap(selectedLayer);
      if (!probeData) {
        handleRunProbe();
      }
    }
  }, [device, selectedLayer, probeData]);

  const [isRemapping, setIsRemapping] = useState(false);

  const handleRemapKey = async (newKeycode: number) => {
    if (!selectedKey || !keyboardHID.isConnected()) return;
    setIsRemapping(true);
    try {
      const ok = await keyLayoutController.remapKey(
        selectedKey.layer,
        selectedKey.row,
        selectedKey.col,
        newKeycode,
      );
      if (ok) {
        // Auto-persist layout parameter to flash (Protocol 0x02, GlobalCmd 0x02, CRW 0x02, 0x04)
        try {
          await keyboardHID.sendCommand([PROTOCOL_V2.GLOBAL, GLOBAL_CMD.SAVE_PARAM, CRW.WRITE, 0x04]);
        } catch {
          // non-blocking
        }

        const updatedKey: KeyMatrixItem = {
          ...selectedKey,
          keycode: newKeycode,
          label: getKeyLabel(newKeycode),
        };
        setSelectedKey(updatedKey);

        setKeymapRows((prev) => {
          if (!prev) return prev;
          return prev.map((row) =>
            row.map((k) =>
              k.row === selectedKey.row && k.col === selectedKey.col ? updatedKey : k,
            ),
          );
        });
      }
    } catch (err) {
      console.error('Failed to remap key:', err);
    } finally {
      setIsRemapping(false);
    }
  };

  const allMatrixKeys = React.useMemo(() => {
    if (!keymapRows) return [];
    return keymapRows.flat();
  }, [keymapRows]);

  const handleSelectWASD = () => {
    setSelectedKeySet(new Set(['2-2', '3-1', '3-2', '3-3']));
  };

  const handleSelectAll = () => {
    const allSet = new Set<string>();
    allMatrixKeys.forEach((k) => allSet.add(`${k.row}-${k.col}`));
    setSelectedKeySet(allSet);
  };

  const handleReverse = () => {
    setSelectedKeySet((prev) => {
      const rev = new Set<string>();
      allMatrixKeys.forEach((k) => {
        const id = `${k.row}-${k.col}`;
        if (!prev.has(id)) rev.add(id);
      });
      return rev;
    });
  };

  const handleCancel = () => {
    setSelectedKeySet(new Set());
  };

  const packetCount = {
    tx: logs.filter((l) => l.type === 'tx' || l.type.toUpperCase() === 'TX').length,
    rx: logs.filter((l) => l.type === 'rx' || l.type.toUpperCase() === 'RX').length,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((o) => !o)}
        packetCount={packetCount}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Fixed Top Header (Never pushed up or scrolls) */}
        <Header
          activeTab={activeTab}
          isConnected={!!device}
          deviceName={device?.productName || 'AE64 Pro'}
          activeProfile={probeData?.activeProfile ?? 1}
          pollingRateText={overridePollingRate || probeData?.pollingRate || '4000 Hz'}
          isConnecting={false}
          onConnect={() => handleConnect(true)}
          onDisconnect={handleDisconnect}
          onSelectProfile={handleSelectProfile}
        />

        {/* Scrollable Page Body */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px 48px',
            maxWidth: 1400,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {!device ? (
            /* Disconnected Welcome Card */
            <div
              className="glass-panel-elevated"
              style={{
                padding: '48px 40px',
                textAlign: 'center',
                maxWidth: 680,
                margin: '60px auto',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 8px 30px var(--accent-indigo-glow)',
                }}
              >
                <Usb size={32} color="#fff" />
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 12 }}>
                Connect your Everglide AE64 Pro
              </h2>
              <p
                style={{
                  fontSize: '0.94rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  marginBottom: 28,
                }}
              >
                Plug in your keyboard via USB-C or 2.4G wireless dongle, then click below to grant WebHID access to the <code>0xFFB0</code> configuration interface.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                <button
                  onClick={() => handleConnect(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))',
                    color: '#fff',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    boxShadow: '0 6px 20px var(--accent-indigo-glow)',
                  }}
                >
                  <Usb size={18} />
                  Connect AE64 Pro (Auto-Filter 0xFFB0)
                </button>

                <button
                  onClick={() => handleConnect(false)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    padding: '14px 20px',
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  Show All Devices
                </button>
              </div>
            </div>
          ) : (
            /* Connected Content by Tab */
            <div>
              {/* TAB 1: KEY REMAPPING & MATRIX */}
              {activeTab === 'remap' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Top Bar: Layer Switcher & Matrix Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 16,
                    }}
                  >
                    {/* Layer Switcher Tabs */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-secondary)',
                        padding: 4,
                        borderRadius: 10,
                        border: '1px solid var(--border-subtle)',
                        gap: 4,
                      }}
                    >
                      {[
                        { id: 0, label: 'Main Layer' },
                        { id: 1, label: 'FN1 Layer' },
                        { id: 2, label: 'FN2 Layer' },
                        { id: 3, label: 'FN3 Layer' },
                      ].map((layer) => {
                        const isActive = selectedLayer === layer.id;
                        return (
                          <button
                            key={layer.id}
                            onClick={() => setSelectedLayer(layer.id)}
                            style={{
                              background: isActive
                                ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))'
                                : 'transparent',
                              color: isActive ? '#fff' : 'var(--text-muted)',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: 8,
                              fontSize: '0.84rem',
                              fontWeight: isActive ? 700 : 500,
                              boxShadow: isActive ? '0 2px 10px var(--accent-indigo-glow)' : 'none',
                            }}
                          >
                            {layer.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handleReadFullKeymap(selectedLayer)}
                      disabled={isLoadingKeymap}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-subtle)',
                        padding: '9px 16px',
                        borderRadius: 8,
                        fontSize: '0.84rem',
                        fontWeight: 600,
                      }}
                    >
                      <RefreshCw size={15} className={isLoadingKeymap ? 'spin' : ''} />
                      {isLoadingKeymap ? 'Reading Matrix...' : 'Refresh Matrix'}
                    </button>
                  </div>

                  {/* 64-Key Keyboard Visualizer Canvas */}
                  <KeyboardCanvas
                    keymapRows={keymapRows}
                    selectedKey={selectedKey}
                    onSelectKey={setSelectedKey}
                    isLoading={isLoadingKeymap}
                  />

                  {/* Interactive Key Palette */}
                  <KeyPalette
                    selectedKey={selectedKey}
                    onRemapKey={handleRemapKey}
                    isRemapping={isRemapping}
                  />
                </div>
              )}

              {/* TAB 2: PERFORMANCE & HALL EFFECT */}
              {activeTab === 'performance' && (() => {
                const isDiagnosticSubTab = perfSubTab === 'calibration' || perfSubTab === 'travel';
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <KeyboardCanvas
                      keymapRows={keymapRows}
                      selectedKeySet={isDiagnosticSubTab ? undefined : selectedKeySet}
                      onToggleKey={
                        isDiagnosticSubTab
                          ? undefined
                          : (key) => {
                              const keyId = `${key.row}-${key.col}`;
                              setSelectedKeySet((prev) => {
                                const next = new Set(prev);
                                if (next.has(keyId)) next.delete(keyId);
                                else next.add(keyId);
                                return next;
                              });
                            }
                      }
                      isLoading={isLoadingKeymap}
                      badges={perfBadges}
                      batchActions={
                        isDiagnosticSubTab
                          ? undefined
                          : {
                              onSelectWASD: handleSelectWASD,
                              onSelectAll: handleSelectAll,
                              onReverse: handleReverse,
                              onCancel: handleCancel,
                            }
                      }
                    />

                    <PerformanceView
                      selectedKeySet={selectedKeySet}
                      allKeys={allMatrixKeys}
                      onUpdateBadges={setPerfBadges}
                      onSubTabChange={setPerfSubTab}
                    />
                  </div>
                );
              })()}

              {/* TAB 3: RGB LIGHTING */}
              {activeTab === 'lighting' && (
                <LightingView
                  keymapRows={keymapRows}
                  isLoadingKeymap={isLoadingKeymap}
                />
              )}

              {/* TAB 4: ADVANCED KEYS (SOCD / DKS / MT / TGL) */}
              {activeTab === 'advanced' && (
                <AdvancedView
                  keymapRows={keymapRows}
                  isLoadingKeymap={isLoadingKeymap}
                  selectedLayer={selectedLayer}
                  onSelectLayer={setSelectedLayer}
                />
              )}

              {/* TAB 5: MACRO */}
              {activeTab === 'macro' && (
                <MacroView
                  keymapRows={keymapRows}
                  isLoadingKeymap={isLoadingKeymap}
                  selectedLayer={selectedLayer}
                  onSelectLayer={setSelectedLayer}
                  onRemapKey={async (layer, row, col, keycode) => {
                    const ok = await keyLayoutController.remapKey(layer, row, col, keycode);
                    if (ok) {
                      await handleReadFullKeymap(layer);
                    }
                    return ok;
                  }}
                />
              )}

              {/* TAB 6: CONFIGS & PROFILES */}
              {activeTab === 'configs' && (
                <ConfigsView
                  probeData={probeData}
                  onProfileSwitched={(slot) => handleSelectProfile(slot)}
                />
              )}

              {/* TAB 5: DEVICE & HARDWARE SETTINGS */}
              {activeTab === 'settings' && (
                <SettingsView
                  probeData={probeData}
                  isProbing={isProbing}
                  onProbe={handleRunProbe}
                  onPollingRateChange={(rate) => setOverridePollingRate(rate)}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Slide-out Packet Inspector Drawer */}
      <PacketDrawer
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll((a) => !a)}
      />
    </div>
  );
};

export default App;
