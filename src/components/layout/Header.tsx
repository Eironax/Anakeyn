import React from 'react';
import {
  Usb,
  Layers,
  Zap,
  Power,
} from 'lucide-react';
import type { NavTabId } from './Sidebar';

interface HeaderProps {
  activeTab: NavTabId;
  isConnected: boolean;
  deviceName?: string;
  activeProfile: number;
  pollingRateText?: string;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectProfile: (profile: number) => void;
}

const TAB_TITLES: Record<NavTabId, { title: string; subtitle: string }> = {
  remap: {
    title: 'Key Remapping & Matrix',
    subtitle: 'Configure base layers, FN combos, and layer pass-through',
  },
  performance: {
    title: 'Hall Effect & Rapid Trigger',
    subtitle: 'Ultra-low latency analog travel calibration and dynamic sensitivity',
  },
  lighting: {
    title: 'RGB Backlight & Effects',
    subtitle: 'Full-spectrum RGB lighting modes, brightness, and animations',
  },
  advanced: {
    title: 'Advanced Keys (HE Features)',
    subtitle: 'Hardware SOCD (Snap Tap), Dynamic Keystrokes (DKS), and Mod-Tap',
  },
  macro: {
    title: 'Hardware Macro Studio',
    subtitle: 'Program keystroke sequences with millisecond delay timing and trigger loops',
  },
  configs: {
    title: 'Configs & Profile Schemes',
    subtitle: 'Manage onboard hardware schemes, backup profiles, and export/import configs',
  },
  settings: {
    title: 'Device Settings & Restore',
    subtitle: 'Polling rate, sleep timers, factory restore, and firmware updates',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  isConnected,
  deviceName = 'AE64 Pro',
  activeProfile,
  pollingRateText = '4000 Hz',
  isConnecting,
  onConnect,
  onDisconnect,
  onSelectProfile,
}) => {
  const meta = TAB_TITLES[activeTab];

  return (
    <header
      style={{
        height: 'var(--header-height)',
        background: 'rgba(10, 12, 16, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      {/* Current Page Title */}
      <div>
        <h1
          style={{
            fontSize: '1.08rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          {meta.title}
        </h1>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: 1 }}>
          {meta.subtitle}
        </div>
      </div>

      {/* Right Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {isConnected ? (
          <>
            {/* Profile Slot Switcher */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 8,
                padding: '3px 4px',
                border: '1px solid var(--border-subtle)',
                gap: 2,
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Layers size={13} />
                Profile
              </div>

              {[1, 2, 3, 4].map((slot) => {
                const isActive = activeProfile === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => onSelectProfile(slot)}
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))'
                        : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-dim)',
                      border: 'none',
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 700 : 500,
                      boxShadow: isActive ? '0 2px 8px var(--accent-indigo-glow)' : 'none',
                    }}
                  >
                    P{slot}
                  </button>
                );
              })}
            </div>

            {/* Polling Rate Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                color: 'var(--accent-cyan)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Zap size={14} />
              {pollingRateText}
            </div>

            {/* Device Connected Status Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--accent-emerald)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.80rem',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--accent-emerald)',
                  boxShadow: '0 0 10px var(--accent-emerald)',
                }}
              />
              <span>{deviceName}</span>
            </div>

            {/* Disconnect Button */}
            <button
              onClick={onDisconnect}
              title="Disconnect Keyboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                color: 'var(--accent-rose)',
              }}
            >
              <Power size={15} />
            </button>
          </>
        ) : (
          /* Connect Button */
          <button
            onClick={onConnect}
            disabled={isConnecting}
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
              fontSize: '0.86rem',
              boxShadow: '0 4px 16px var(--accent-indigo-glow)',
              opacity: isConnecting ? 0.7 : 1,
            }}
          >
            <Usb size={16} />
            {isConnecting ? 'Connecting...' : 'Connect AE64 Pro'}
          </button>
        )}
      </div>
    </header>
  );
};
