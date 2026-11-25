import React, { useRef, useEffect } from 'react';
import {
  X,
  Trash2,
  Terminal,
} from 'lucide-react';
import type { LogEntry } from '../../core/hid/connection';
import { keyboardHID } from '../../core/hid/connection';
import { PROTOCOL_V2 } from '../../core/hid/constants';

interface PacketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
}

export const PacketDrawer: React.FC<PacketDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  autoScroll,
  onToggleAutoScroll,
}) => {
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && isOpen) {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isOpen]);

  if (!isOpen) return null;

  const handleQuickCommand = async (name: string, bytes: number[]) => {
    try {
      await keyboardHID.sendCommand(bytes);
    } catch (err) {
      console.error(`Quick opcode ${name} error:`, err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 520,
        height: '100vh',
        background: 'rgba(10, 13, 20, 0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderLeft: '1px solid var(--border-medium)',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Terminal size={18} color="var(--accent-cyan)" />
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)' }}>
              WebHID Packet Inspector
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>
              Protocol v2 (64-byte raw HID packets)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onClearLogs}
            title="Clear logs"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={onClose}
            title="Close Inspector"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Quick Opcode Tester Strip */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.25)',
        }}
      >
        <div
          style={{
            fontSize: '0.68rem',
            color: 'var(--text-dim)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}
        >
          Quick Protocol v2 Query Tester
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'Version', cmd: [PROTOCOL_V2.DEVICE, 0x01] },
            { label: 'Device Info', cmd: [PROTOCOL_V2.DEVICE, 0x02] },
            { label: 'Features (HE)', cmd: [PROTOCOL_V2.DEVICE, 0x03] },
            { label: 'OS Mode', cmd: [PROTOCOL_V2.GLOBAL, 0x04] },
            { label: 'Polling Rate', cmd: [PROTOCOL_V2.GLOBAL, 0x05] },
            { label: 'Profile Slot', cmd: [PROTOCOL_V2.GLOBAL, 0x03] },
            { label: 'Row 1 Keys', cmd: [PROTOCOL_V2.LAYOUT_AND_KEY, 0x01, 0x00, 0x01] },
            { label: 'Row 5 Keys', cmd: [PROTOCOL_V2.LAYOUT_AND_KEY, 0x01, 0x00, 0x05] },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickCommand(item.label, item.cmd)}
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                padding: '4px 8px',
                borderRadius: 5,
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              [{item.cmd.map((b) => b.toString(16).padStart(2, '0')).join(' ')}] {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: '#07090e',
        }}
      >
        {logs.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.80rem',
            }}
          >
            No packets transmitted yet.
          </div>
        ) : (
          logs.map((log) => {
            const upperType = log.type.toUpperCase();
            const isTx = upperType === 'TX';
            const isRx = upperType === 'RX';
            const isErr = upperType === 'ERROR' || upperType === 'ERR';

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: isTx
                    ? 'rgba(6, 182, 212, 0.04)'
                    : isRx
                    ? 'rgba(16, 185, 129, 0.04)'
                    : isErr
                    ? 'rgba(244, 63, 94, 0.08)'
                    : 'rgba(255, 255, 255, 0.02)',
                  borderLeft: `2px solid ${
                    isTx
                      ? 'var(--accent-cyan)'
                      : isRx
                      ? 'var(--accent-emerald)'
                      : isErr
                      ? 'var(--accent-rose)'
                      : 'var(--text-dim)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                    {log.timestamp}
                  </span>

                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '1px 4px',
                      borderRadius: 3,
                      color: isTx
                        ? 'var(--accent-cyan)'
                        : isRx
                        ? 'var(--accent-emerald)'
                        : isErr
                        ? 'var(--accent-rose)'
                        : 'var(--text-muted)',
                      background: 'rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {upperType}
                  </span>

                  <span style={{ color: '#fff', fontWeight: 600 }}>{log.message}</span>
                </div>

                {log.hex && (
                  <div
                    style={{
                      color: isTx
                        ? 'rgba(6, 182, 212, 0.85)'
                        : isRx
                        ? 'rgba(16, 185, 129, 0.85)'
                        : 'var(--text-dim)',
                      lineHeight: 1.4,
                      wordBreak: 'break-all',
                      paddingLeft: 4,
                      fontSize: '0.68rem',
                    }}
                  >
                    {log.hex}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={terminalBottomRef} />
      </div>

      {/* Footer Controls */}
      <div
        style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: 'var(--text-dim)',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={onToggleAutoScroll}
            style={{ accentColor: 'var(--accent-cyan)' }}
          />
          Auto-scroll to bottom
        </label>

        <span>{logs.length} packet entries</span>
      </div>
    </div>
  );
};
