import React from 'react';
import {
  Keyboard,
  Zap,
  Palette,
  Crosshair,
  Workflow,
  FolderArchive,
  Settings,
  Terminal,
  Sparkles,
} from 'lucide-react';

export type NavTabId =
  | 'remap'
  | 'performance'
  | 'lighting'
  | 'advanced'
  | 'macro'
  | 'configs'
  | 'settings';

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  packetCount: { tx: number; rx: number };
}

interface NavItem {
  id: NavTabId;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'remap',
    label: 'Key Remap',
    icon: Keyboard,
    description: 'Layers, FN combos & custom keys',
  },
  {
    id: 'performance',
    label: 'Hall Effect & RT',
    badge: 'HE',
    icon: Zap,
    description: 'Actuation & Rapid Trigger',
  },
  {
    id: 'lighting',
    label: 'RGB Lighting',
    icon: Palette,
    description: 'Dynamic effects & colors',
  },
  {
    id: 'advanced',
    label: 'Advanced Keys',
    badge: 'SOCD',
    icon: Crosshair,
    description: 'Snap Tap, DKS, Mod-Tap, TGL',
  },
  {
    id: 'macro',
    label: 'Macro',
    icon: Workflow,
    description: 'M0-M15 keystroke sequences',
  },
  {
    id: 'configs',
    label: 'Configs',
    icon: FolderArchive,
    description: 'Profile schemes, import & export',
  },
  {
    id: 'settings',
    label: 'Device Settings',
    icon: Settings,
    description: 'Firmware, polling & restore',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isInspectorOpen,
  onToggleInspector,
  packetCount,
}) => {
  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        height: '100vh',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        userSelect: 'none',
      }}
    >
      {/* Brand & Logo Header (aligned with main Header 70px) */}
      <div>
        <div
          style={{
            height: 'var(--header-height)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(15, 18, 25, 0.4)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px var(--accent-indigo-glow)',
            }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div
              style={{
                fontSize: '1.12rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-display)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                lineHeight: 1.15,
              }}
            >
              ANAKEYN
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))',
                  color: '#fff',
                  letterSpacing: '0.04em',
                }}
              >
                PRO
              </span>
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontWeight: 500, lineHeight: 1.2 }}>
              Everglide AE64 Pro
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div style={{ padding: '16px 14px 0' }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-dim)',
              padding: '6px 12px',
            }}
          >
            Driver Controls
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 12px',
                  borderRadius: 10,
                  border: isActive
                    ? '1px solid var(--border-active)'
                    : '1px solid transparent',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))'
                    : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div
                    style={{
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-dim)',
                      transition: 'color 0.18s ease',
                    }}
                  >
                    <Icon size={19} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#fff' : 'var(--text-main)',
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 5,
                      background: isActive
                        ? 'rgba(6, 182, 212, 0.2)'
                        : 'rgba(255, 255, 255, 0.06)',
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-dim)',
                      border: `1px solid ${isActive ? 'rgba(6, 182, 212, 0.3)' : 'transparent'}`,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        </div>
      </div>

      {/* Footer / DevTools Toggle */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <button
          onClick={onToggleInspector}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 8,
            background: isInspectorOpen
              ? 'rgba(6, 182, 212, 0.12)'
              : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${
              isInspectorOpen ? 'var(--accent-cyan)' : 'var(--border-subtle)'
            }`,
            color: isInspectorOpen ? 'var(--accent-cyan)' : 'var(--text-muted)',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Terminal size={16} />
            <span style={{ fontSize: '0.80rem', fontWeight: 600 }}>WebHID Inspector</span>
          </div>

          <div
            style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '2px 5px',
              borderRadius: 4,
              color: 'var(--text-dim)',
            }}
          >
            TX:{packetCount.tx} RX:{packetCount.rx}
          </div>
        </button>

        <div
          style={{
            fontSize: '0.68rem',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px',
          }}
        >
          <span>SparkLink v2 Protocol</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>0xFFB0</span>
        </div>
      </div>
    </aside>
  );
};
