import React from 'react';

interface TravelTestGaugeProps {
  currentTravelMm: number;
  maxTravelMm: number;
  activeKeyLabel?: string;
  isTesting: boolean;
  actuationPoint?: number;
}

export const TravelTestGauge: React.FC<TravelTestGaugeProps> = ({
  currentTravelMm,
  maxTravelMm,
  activeKeyLabel,
  isTesting,
  actuationPoint = 2.0,
}) => {
  // Clamped travel between 0 and 4.00 mm
  const displayTravel = Math.max(0, Math.min(4.0, currentTravelMm));
  const fillPercentage = Math.min(100, (displayTravel / 4.0) * 100);
  const actuationPercentage = Math.min(100, (actuationPoint / 4.0) * 100);
  const maxTravelPercentage = Math.min(100, (maxTravelMm / 4.0) * 100);
  const isActuated = displayTravel >= actuationPoint && displayTravel > 0.05;
  const isBottomedOut = displayTravel >= Math.max(3.2, maxTravelMm - 0.15);

  const yTicks = [
    { label: '0.00 mm', val: 0.0 },
    { label: '0.50 mm', val: 0.5 },
    { label: '1.00 mm', val: 1.0 },
    { label: '1.50 mm', val: 1.5 },
    { label: '2.00 mm', val: 2.0 },
    { label: '2.50 mm', val: 2.5 },
    { label: '3.00 mm', val: 3.0 },
    { label: '3.50 mm', val: 3.5 },
    { label: '4.00 mm', val: 4.0 },
  ];

  // Minor tick marks every 0.1 mm
  const minorTicks = Array.from({ length: 41 }, (_, i) => i * 0.1);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 420,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 120%, rgba(30, 58, 138, 0.6) 0%, rgba(15, 23, 42, 0.95) 45%, #060913 100%)',
        border: '1px solid rgba(14, 165, 233, 0.25)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
      }}
    >
      {/* Curved Planet Earth Atmosphere Glow in Background */}
      <div
        style={{
          position: 'absolute',
          bottom: -220,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, rgba(37, 99, 235, 0.15) 50%, transparent 75%)',
          boxShadow: '0 0 80px 20px rgba(56, 189, 248, 0.18)',
          pointerEvents: 'none',
        }}
      />

      {/* Atmospheric Rim Line */}
      <div
        style={{
          position: 'absolute',
          bottom: -60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 720,
          height: 180,
          borderRadius: '50%',
          borderTop: '2px solid rgba(125, 211, 252, 0.45)',
          boxShadow: '0 -4px 30px rgba(56, 189, 248, 0.5)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Meter Unit */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          zIndex: 2,
        }}
      >
        {/* Left Side: Fine Millimeter Tick Ruler */}
        <div
          style={{
            height: 260,
            width: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingRight: 6,
          }}
        >
          {minorTicks.map((val) => {
            const isMajor = Math.abs(val % 0.5) < 0.01;
            const isFull = Math.abs(val % 1.0) < 0.01;
            return (
              <div
                key={val}
                style={{
                  height: 1,
                  width: isFull ? 18 : isMajor ? 12 : 6,
                  background: isFull
                    ? '#38bdf8'
                    : isMajor
                    ? 'rgba(56, 189, 248, 0.65)'
                    : 'rgba(56, 189, 248, 0.25)',
                  boxShadow: isFull ? '0 0 6px rgba(56, 189, 248, 0.8)' : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Center: Vertical Analog Keystroke Displacement Stem (Pill Bar) */}
        <div
          style={{
            position: 'relative',
            width: 38,
            height: 260,
            borderRadius: 19,
            background: 'rgba(241, 245, 249, 0.92)',
            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.25), 0 0 20px rgba(56, 189, 248, 0.2)',
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.85)',
          }}
        >
          {/* Actuation Threshold Marker (Dashed Line) */}
          <div
            style={{
              position: 'absolute',
              top: `${actuationPercentage}%`,
              left: 0,
              right: 0,
              height: 2,
              borderTop: '2px dashed rgba(239, 68, 68, 0.85)',
              zIndex: 3,
              pointerEvents: 'none',
            }}
            title={`Actuation Point: ${actuationPoint.toFixed(2)} mm`}
          />

          {/* Physical Bottom-Out Limit Marker */}
          {maxTravelMm < 4.0 && (
            <div
              style={{
                position: 'absolute',
                top: `${maxTravelPercentage}%`,
                left: 0,
                right: 0,
                height: 2,
                borderTop: '2px dotted rgba(245, 158, 11, 0.75)',
                zIndex: 3,
                pointerEvents: 'none',
              }}
              title={`Switch Bottom-Out: ${maxTravelMm.toFixed(2)} mm`}
            />
          )}

          {/* Real-time Blue Downward Travel Fill */}
          <div
            style={{
              width: '100%',
              height: `${fillPercentage}%`,
              background: isActuated
                ? 'linear-gradient(180deg, #2563eb 0%, #0284c7 80%, #06b6d4 100%)'
                : 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
              transition: 'height 0.05s ease-out',
              boxShadow: isActuated ? '0 4px 14px rgba(6, 182, 212, 0.6)' : 'none',
            }}
          />
        </div>

        {/* Right Side: Exact Millimeter Labels */}
        <div
          style={{
            height: 260,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            color: '#93c5fd',
            fontWeight: 600,
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {yTicks.map((tick) => {
            const isNearCurrent = Math.abs(displayTravel - tick.val) < 0.25 && displayTravel > 0.05;
            return (
              <span
                key={tick.label}
                style={{
                  color: isNearCurrent ? '#38bdf8' : '#94a3b8',
                  fontWeight: isNearCurrent ? 800 : 600,
                  transition: 'color 0.1s ease',
                  textShadow: isNearCurrent ? '0 0 8px rgba(56, 189, 248, 0.7)' : 'none',
                }}
              >
                {tick.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Floating Precision Telemetry Badge */}
      <div
        style={{
          marginTop: 26,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 22px',
          borderRadius: 30,
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          zIndex: 2,
        }}
      >
        {/* Active Key Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Key:
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.96rem',
              fontWeight: 800,
              color: activeKeyLabel ? '#fff' : 'var(--text-muted)',
            }}
          >
            {activeKeyLabel || '—'}
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* Real-time Depth Number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Displacement:
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.15rem',
              fontWeight: 800,
              color: isActuated ? '#06b6d4' : displayTravel > 0.05 ? '#38bdf8' : '#94a3b8',
              minWidth: 70,
            }}
          >
            {displayTravel.toFixed(2)} mm
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* Actuation Status Pill */}
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: 12,
            letterSpacing: '0.04em',
            background: isBottomedOut
              ? 'rgba(245, 158, 11, 0.2)'
              : isActuated
              ? 'rgba(6, 182, 212, 0.2)'
              : displayTravel > 0.05
              ? 'rgba(56, 189, 248, 0.15)'
              : 'rgba(255, 255, 255, 0.05)',
            color: isBottomedOut
              ? '#fbbf24'
              : isActuated
              ? '#06b6d4'
              : displayTravel > 0.05
              ? '#38bdf8'
              : '#64748b',
            border: `1px solid ${
              isBottomedOut
                ? '#f59e0b'
                : isActuated
                ? '#06b6d4'
                : displayTravel > 0.05
                ? 'rgba(56, 189, 248, 0.3)'
                : 'rgba(255, 255, 255, 0.1)'
            }`,
          }}
        >
          {isBottomedOut
            ? `BOTTOM-OUT (${maxTravelMm.toFixed(2)}mm)`
            : isActuated
            ? 'ACTUATED (TRIGGERED)'
            : displayTravel > 0.05
            ? 'PRESSING'
            : 'IDLE'}
        </div>
      </div>

      {/* Helper Text */}
      <div
        style={{
          marginTop: 14,
          fontSize: '0.78rem',
          color: '#64748b',
          fontStyle: 'italic',
          zIndex: 2,
        }}
      >
        {isTesting
          ? 'Press any physical key to measure its live analog switch travel depth'
          : 'Turn on Travel Test above to enable live stem depth measurement'}
      </div>
    </div>
  );
};
