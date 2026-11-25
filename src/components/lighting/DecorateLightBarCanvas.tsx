import React, { useRef } from 'react';

interface DecorateLightBarCanvasProps {
  ledColors: Record<number, string>; // LED Index (0..28) -> Hex string
  onPaintLed: (ledIndex: number, isClear: boolean) => void;
  onPaintEnd?: () => void;
}

export const DecorateLightBarCanvas: React.FC<DecorateLightBarCanvasProps> = ({
  ledColors,
  onPaintLed,
  onPaintEnd,
}) => {
  const isPaintingRef = useRef<null | 'paint' | 'clear'>(null);

  // Row 1: 17 LEDs (0..16)
  const row1 = Array.from({ length: 17 }, (_, i) => i);
  // Row 2: 12 LEDs (17..28)
  const row2 = Array.from({ length: 12 }, (_, i) => i + 17);

  const handleMouseUp = () => {
    if (isPaintingRef.current) {
      isPaintingRef.current = null;
      onPaintEnd?.();
    }
  };

  const renderCell = (ledIndex: number) => {
    const customHex = ledColors[ledIndex];
    const isPainted = Boolean(customHex);

    return (
      <div
        key={ledIndex}
        onMouseDown={(e) => {
          e.preventDefault();
          if (e.button === 0) {
            isPaintingRef.current = 'paint';
            onPaintLed(ledIndex, false);
          } else if (e.button === 2) {
            isPaintingRef.current = 'clear';
            onPaintLed(ledIndex, true);
          }
        }}
        onMouseEnter={() => {
          if (isPaintingRef.current) {
            onPaintLed(ledIndex, isPaintingRef.current === 'clear');
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: 42,
          height: 34,
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isPainted
            ? `2px solid ${customHex}`
            : '1.5px solid rgba(255, 255, 255, 0.22)',
          background: isPainted
            ? `${customHex}33`
            : 'rgba(255, 255, 255, 0.03)',
          boxShadow: isPainted
            ? `0 0 14px ${customHex}88, inset 0 0 8px ${customHex}66`
            : 'inset 0 1px 2px rgba(255, 255, 255, 0.05)',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: isPainted ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
            fontFamily: 'var(--font-mono)',
            textShadow: isPainted ? '0 1px 3px rgba(0,0,0,0.8)' : 'none',
            pointerEvents: 'none',
          }}
        >
          {ledIndex + 1}
        </span>
      </div>
    );
  };

  return (
    <div
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        margin: '10px 0 16px',
        position: 'relative',
      }}
    >
      {/* Decorative Bezel Case */}
      <div
        style={{
          background: 'linear-gradient(180deg, #161922 0%, #0d0f15 100%)',
          borderRadius: 18,
          padding: '24px 28px',
          border: '1.5px solid rgba(255, 255, 255, 0.10)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-start',
        }}
      >
        {/* Row 1: 17 cells */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {row1.map(renderCell)}
        </div>

        {/* Row 2: 12 cells */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {row2.map(renderCell)}
        </div>
      </div>
    </div>
  );
};

