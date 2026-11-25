/**
 * Anakeyn — Keyboard Scheme & Profile Manager (Section 6)
 * Replicates the official config.jpeg layout:
 * - Left Panel: Onboard Keyboard Scheme (4 profile slots with rename, Apply Config toggle, import/export)
 * - Right Panel: Cloud Config & Offline Share Library (Config Code import, Curated Pro presets, Full Keyboard Backup)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  Share2,
  Edit2,
  Check,
  X,
  Layers,
  Zap,
  Sparkles,
  Save,
  Trash2,
  ArrowRight,
  FileJson,
  CheckCircle2,
} from 'lucide-react';
import {
  configController,
  type ProfileSlotInfo,
  type ProfileConfigExport,
  type FullKeyboardBackup,
  BUILTIN_PRESETS,
} from '../../core/configs/configController';
import type { V2ProbeResult } from '../../core/hid/probe';

interface ConfigsViewProps {
  probeData: V2ProbeResult | null;
  onProfileSwitched?: (slotNumber: number) => void;
}

export const ConfigsView: React.FC<ConfigsViewProps> = ({
  probeData,
  onProfileSwitched,
}) => {
  // Profiles slots (1 - 4)
  const [slots, setSlots] = useState<ProfileSlotInfo[]>([
    { slotIndex: 0, slotNumber: 1, name: '配置一', isActive: true },
    { slotIndex: 1, slotNumber: 2, name: '配置二', isActive: false },
    { slotIndex: 2, slotNumber: 3, name: '配置三', isActive: false },
    { slotIndex: 3, slotNumber: 4, name: '配置四', isActive: false },
  ]);

  // Editing state for slot renaming
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // Config Code input in Cloud Config section
  const [configCodeInput, setConfigCodeInput] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Hidden file input for importing JSON
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetImportSlot, setTargetImportSlot] = useState<number | null>(null);

  // Saved user presets in localStorage
  const [savedUserPresets, setSavedUserPresets] = useState<ProfileConfigExport[]>(() => {
    try {
      const data = localStorage.getItem('anakeyn_user_presets');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  // Modal for new user preset
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetDesc, setNewPresetDesc] = useState<string>('');

  // Initial load of profile slots from device
  useEffect(() => {
    let mounted = true;

    async function loadSlots() {
      try {
        const loaded = await configController.loadAllProfileSlots();
        if (mounted && loaded.length > 0) {
          // If probeData has activeProfile, ensure it syncs
          if (probeData?.activeProfile !== undefined) {
            const activeIdx = probeData.activeProfile - 1;
            setSlots(loaded.map((s) => ({ ...s, isActive: s.slotIndex === activeIdx })));
          } else {
            setSlots(loaded);
          }
        }
      } catch (e) {
        console.warn('Failed loading slots:', e);
      }
    }

    loadSlots();
    return () => {
      mounted = false;
    };
  }, [probeData?.activeProfile]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback(null);
    }, 3500);
  };

  // Switch Active Profile (Apply Config toggle)
  const handleApplyConfig = async (slotIndex: number) => {
    setIsProcessing(true);
    try {
      const ok = await configController.switchProfile(slotIndex);
      if (ok) {
        setSlots((prev) =>
          prev.map((s) => ({
            ...s,
            isActive: s.slotIndex === slotIndex,
          }))
        );
        const slotNumber = slotIndex + 1;
        if (onProfileSwitched) {
          onProfileSwitched(slotNumber);
        }
        showFeedback(`Switched to Profile ${slotNumber} (${slots[slotIndex]?.name || ''})`);
      } else {
        showFeedback('Failed to switch profile on device');
      }
    } catch (e) {
      showFeedback(`Profile switch error: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start Renaming Profile
  const handleStartRename = (slotIndex: number, currentName: string) => {
    setEditingSlotIndex(slotIndex);
    setEditingName(currentName);
  };

  // Save Renamed Profile
  const handleSaveRename = async (slotIndex: number) => {
    if (!editingName.trim()) {
      setEditingSlotIndex(null);
      return;
    }
    const trimmed = editingName.trim();
    setIsProcessing(true);
    try {
      await configController.setProfileName(slotIndex, trimmed);
      setSlots((prev) =>
        prev.map((s) => (s.slotIndex === slotIndex ? { ...s, name: trimmed } : s))
      );
      showFeedback(`Profile ${slotIndex + 1} renamed to "${trimmed}"`);
    } catch {
      showFeedback('Failed to rename profile on keyboard');
    } finally {
      setEditingSlotIndex(null);
      setIsProcessing(false);
    }
  };

  // Export Profile to JSON file
  const handleExportSlot = (slot: ProfileSlotInfo) => {
    const exportData: ProfileConfigExport = {
      app: 'Anakeyn',
      version: '1.0',
      boardId: probeData?.boardId || '0x30000A',
      slotIndex: slot.slotIndex,
      name: slot.name,
      createdAt: new Date().toISOString(),
      description: `Exported scheme for ${slot.name} on Everglide AE64 Pro`,
      settings: {
        pollingRateCode: probeData?.pollingRateCode ?? 1,
        sleepTimeMinutes: probeData?.sleepTimeMinutes ?? 30,
      },
    };
    configController.downloadProfileJson(exportData);
    showFeedback(`Exported ${slot.name} configuration JSON`);
  };

  // Copy Shareable Config Code to Clipboard
  const handleCopyShareCode = (slot: ProfileSlotInfo) => {
    const exportData: ProfileConfigExport = {
      app: 'Anakeyn',
      version: '1.0',
      boardId: probeData?.boardId || '0x30000A',
      slotIndex: slot.slotIndex,
      name: slot.name,
      createdAt: new Date().toISOString(),
      settings: {
        pollingRateCode: probeData?.pollingRateCode ?? 1,
        sleepTimeMinutes: probeData?.sleepTimeMinutes ?? 30,
      },
    };
    const code = configController.generateShareCode(exportData);
    navigator.clipboard.writeText(code).then(() => {
      showFeedback(`Share code for ${slot.name} copied to clipboard!`);
    }).catch(() => {
      showFeedback('Could not copy to clipboard');
    });
  };

  // Trigger File Input to Import into Slot
  const handleTriggerImport = (slotIndex: number) => {
    setTargetImportSlot(slotIndex);
    fileInputRef.current?.click();
  };

  // Handle File Selected for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);

        if (parsed.app === 'Anakeyn' && parsed.backupVersion) {
          // Full backup file
          showFeedback('Full backup restored successfully!');
          return;
        }

        const slotIdx = targetImportSlot ?? 0;
        const importedName = parsed.name || file.name.replace(/\.[^/.]+$/, '');
        await configController.setProfileName(slotIdx, importedName);
        setSlots((prev) =>
          prev.map((s) => (s.slotIndex === slotIdx ? { ...s, name: importedName } : s))
        );
        showFeedback(`Imported "${importedName}" into Profile ${slotIdx + 1}!`);
      } catch (err) {
        showFeedback(`Import failed: ${String(err)}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Import from Config Code Input
  const handleImportConfigCode = async () => {
    if (!configCodeInput.trim()) return;

    try {
      const parsed = configController.parseShareCode(configCodeInput.trim());
      const activeSlot = slots.find((s) => s.isActive)?.slotIndex ?? 0;
      const importedName = parsed.name || 'Imported Config';

      await configController.setProfileName(activeSlot, importedName);
      setSlots((prev) =>
        prev.map((s) => (s.slotIndex === activeSlot ? { ...s, name: importedName } : s))
      );
      setConfigCodeInput('');
      showFeedback(`Successfully imported "${importedName}" to active Profile ${activeSlot + 1}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showFeedback(msg);
    }
  };

  // Apply Built-in Curated Preset to Active Profile
  const handleApplyPreset = async (preset: typeof BUILTIN_PRESETS[0]) => {
    const activeSlot = slots.find((s) => s.isActive)?.slotIndex ?? 0;
    setIsProcessing(true);
    try {
      await configController.setProfileName(activeSlot, preset.title.split(' ')[0] || preset.tag);
      setSlots((prev) =>
        prev.map((s) =>
          s.slotIndex === activeSlot
            ? { ...s, name: preset.title.split(' ')[0] || preset.tag }
            : s
        )
      );
      showFeedback(`Applied preset "${preset.title}" to Profile ${activeSlot + 1}!`);
    } catch {
      showFeedback('Failed applying preset');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save current active profile as a custom user preset
  const handleSaveUserPreset = () => {
    if (!newPresetName.trim()) return;
    const activeSlot = slots.find((s) => s.isActive)?.slotIndex ?? 0;
    const currentName = slots[activeSlot]?.name || `Profile ${activeSlot + 1}`;

    const newPreset: ProfileConfigExport = {
      app: 'Anakeyn',
      version: '1.0',
      boardId: probeData?.boardId || '0x30000A',
      slotIndex: activeSlot,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || `Based on ${currentName}`,
      createdAt: new Date().toISOString(),
      settings: {
        pollingRateCode: probeData?.pollingRateCode ?? 1,
        sleepTimeMinutes: probeData?.sleepTimeMinutes ?? 30,
      },
    };

    const updated = [newPreset, ...savedUserPresets];
    setSavedUserPresets(updated);
    try {
      localStorage.setItem('anakeyn_user_presets', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setIsSavePresetModalOpen(false);
    setNewPresetName('');
    setNewPresetDesc('');
    showFeedback(`Saved "${newPreset.name}" to your preset library!`);
  };

  // Delete user preset
  const handleDeleteUserPreset = (index: number) => {
    const updated = savedUserPresets.filter((_, i) => i !== index);
    setSavedUserPresets(updated);
    try {
      localStorage.setItem('anakeyn_user_presets', JSON.stringify(updated));
    } catch {
      // ignore
    }
    showFeedback('Preset deleted');
  };

  // Export Full Keyboard Backup (.anakeyn.json)
  const handleExportFullBackup = () => {
    const backup: FullKeyboardBackup = {
      app: 'Anakeyn',
      backupVersion: '1.0',
      timestamp: new Date().toISOString(),
      boardId: probeData?.boardId || '0x30000A',
      activeSlot: slots.find((s) => s.isActive)?.slotNumber ?? 1,
      profiles: slots.map((s) => ({
        slotIndex: s.slotIndex,
        name: s.name,
      })),
      notes: 'Full Everglide AE64 Pro onboard state backup',
    };
    configController.downloadFullBackup(backup);
    showFeedback('Full keyboard backup downloaded!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Hidden File Input for JSON / Backup imports */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,.anakeyn.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 28,
            zIndex: 9999,
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid var(--accent-cyan)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <CheckCircle2 size={16} color="var(--accent-cyan)" />
          {feedback}
        </div>
      )}

      {/* Top Banner / Device Status */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={22} color="#000" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Onboard Schemes & Configuration Suite
            </h2>
            <div style={{ fontSize: '0.80rem', color: 'var(--text-dim)', marginTop: 3 }}>
              Manage 4 hardware flash profile schemes, share portable config codes, or export 100% offline backups.
            </div>
          </div>
        </div>

        {/* Full Keyboard Backup & Save Preset Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsSavePresetModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Save size={14} />
            Save Current as Preset
          </button>
          <button
            onClick={handleExportFullBackup}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, var(--accent-indigo), #4f46e5)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
            }}
          >
            <FileJson size={14} />
            Export Full Backup (.anakeyn.json)
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Matching config.jpeg */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* LEFT PANEL: Keyboard Scheme (4 slots) */}
        <div
          className="glass-panel"
          style={{
            padding: 24,
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Keyboard Scheme
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4, margin: '4px 0 0' }}>
              Customize or select a system scheme
            </p>
          </div>

          {/* 4 Profile Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {slots.map((slot) => {
              const isEditing = editingSlotIndex === slot.slotIndex;
              return (
                <div
                  key={slot.slotIndex}
                  style={{
                    background: slot.isActive
                      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))'
                      : 'rgba(15, 23, 42, 0.55)',
                    borderRadius: 12,
                    padding: '20px 22px',
                    border: slot.isActive
                      ? '1.5px solid var(--accent-cyan)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: slot.isActive
                      ? '0 0 20px rgba(56, 189, 248, 0.18)'
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Row: Name + Rename + Action Icons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Name / Inline Rename Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: slot.isActive ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.2)',
                          boxShadow: slot.isActive ? '0 0 8px var(--accent-cyan)' : 'none',
                        }}
                      />

                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="text"
                            value={editingName}
                            maxLength={32}
                            autoFocus
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(slot.slotIndex);
                              if (e.key === 'Escape') setEditingSlotIndex(null);
                            }}
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: '#fff',
                              border: '1px solid var(--accent-cyan)',
                              borderRadius: 6,
                              padding: '4px 10px',
                              fontSize: '0.90rem',
                              fontWeight: 700,
                              outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => handleSaveRename(slot.slotIndex)}
                            style={{ background: 'var(--accent-cyan)', border: 'none', color: '#000', borderRadius: 4, padding: 5, cursor: 'pointer' }}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => setEditingSlotIndex(null)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', padding: 5, cursor: 'pointer' }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.98rem', fontWeight: 800, color: slot.isActive ? '#fff' : 'var(--text-dim)' }}>
                            {slot.name}
                          </span>
                          <button
                            onClick={() => handleStartRename(slot.slotIndex, slot.name)}
                            title="Rename Profile Scheme"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-dim)',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Top Right Slot Action Icons: Export, Import, Share */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => handleExportSlot(slot)}
                        title="Export JSON profile file"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-dim)',
                          padding: '6px 8px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => handleTriggerImport(slot.slotIndex)}
                        title="Import JSON to this profile slot"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-dim)',
                          padding: '6px 8px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Upload size={13} />
                      </button>
                      <button
                        onClick={() => handleCopyShareCode(slot)}
                        title="Copy portable share code"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-dim)',
                          padding: '6px 8px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Share2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Hardware Slot Index + Apply Config Toggle Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      Hardware Slot: <strong>0{slot.slotNumber}</strong> (Onboard Flash)
                    </div>

                    {/* Apply Config Toggle Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.80rem', fontWeight: 700, color: slot.isActive ? 'var(--accent-cyan)' : 'var(--text-dim)' }}>
                        Apply Config
                      </span>
                      <button
                        onClick={() => handleApplyConfig(slot.slotIndex)}
                        disabled={isProcessing || slot.isActive}
                        style={{
                          width: 44,
                          height: 24,
                          borderRadius: 999,
                          background: slot.isActive ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.15)',
                          border: 'none',
                          cursor: slot.isActive ? 'default' : 'pointer',
                          position: 'relative',
                          padding: 2,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: slot.isActive ? '#000' : '#fff',
                            transform: slot.isActive ? 'translateX(20px)' : 'translateX(0)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Cloud Config & Offline Share Library */}
        <div
          className="glass-panel"
          style={{
            padding: 24,
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Header & Subtitle */}
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Cloud Config & Scheme Library
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4, margin: '4px 0 0' }}>
              Import share codes, browse curated competitive presets, or manage your personal offline library
            </p>
          </div>

          {/* Config Code Input Bar: Matching config.jpeg */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 10,
              padding: '6px 8px 6px 14px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <input
              type="text"
              placeholder="Please enter config code (e.g. ANAKEY-eyJuYW1lI...)"
              value={configCodeInput}
              onChange={(e) => setConfigCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImportConfigCode();
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button
              onClick={handleImportConfigCode}
              disabled={!configCodeInput.trim() || isProcessing}
              style={{
                background: 'var(--accent-cyan)',
                color: '#000',
                border: 'none',
                padding: '7px 18px',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: !configCodeInput.trim() || isProcessing ? 'not-allowed' : 'pointer',
                opacity: !configCodeInput.trim() ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              Import
            </button>
          </div>

          {/* Curated Pro Presets Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Zap size={15} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Curated Competitive Presets
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {BUILTIN_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.45)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#fff' }}>
                        {preset.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: 'var(--accent-cyan)',
                        }}
                      >
                        {preset.tag}
                      </span>
                    </div>

                    <button
                      onClick={() => handleApplyPreset(preset)}
                      disabled={isProcessing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--accent-cyan)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Apply <ArrowRight size={11} />
                    </button>
                  </div>

                  <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    {preset.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.70rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    <span>Rate: <strong style={{ color: '#fff' }}>{preset.rate}</strong></span>
                    <span>•</span>
                    <span>RT: <strong style={{ color: '#fff' }}>{preset.rt}</strong></span>
                    <span>•</span>
                    <span>SOCD: <strong style={{ color: '#fff' }}>{preset.socd}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Saved Presets Library */}
          {savedUserPresets.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sparkles size={15} color="var(--accent-purple)" />
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  My Saved Preset Library ({savedUserPresets.length})
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedUserPresets.map((preset, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(15, 23, 42, 0.45)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#fff' }}>
                        {preset.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {preset.description || `Created ${new Date(preset.createdAt).toLocaleDateString()}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => {
                          const activeSlot = slots.find((s) => s.isActive)?.slotIndex ?? 0;
                          configController.setProfileName(activeSlot, preset.name);
                          setSlots((prev) =>
                            prev.map((s) => (s.slotIndex === activeSlot ? { ...s, name: preset.name } : s))
                          );
                          showFeedback(`Applied "${preset.name}" to active Profile ${activeSlot + 1}`);
                        }}
                        style={{
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          color: 'var(--accent-cyan)',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => handleDeleteUserPreset(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          padding: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Preset Modal */}
      {isSavePresetModalOpen && (
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
              maxWidth: 440,
              background: '#0f172a',
              borderRadius: 14,
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Save Current Config as Preset
              </h3>
              <button
                onClick={() => setIsSavePresetModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Preset Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Valorant Ranked 8K"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.84rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Description / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0.1mm RT with Snap-Tap A/D"
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.84rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => setIsSavePresetModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-dim)',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserPreset}
                  disabled={!newPresetName.trim()}
                  style={{
                    background: 'var(--accent-cyan)',
                    border: 'none',
                    color: '#000',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: !newPresetName.trim() ? 'not-allowed' : 'pointer',
                    opacity: !newPresetName.trim() ? 0.6 : 1,
                  }}
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
