import React, { useEffect, useRef } from 'react';

interface CalibrationWaveformCanvasProps {
  latestStrokeRef: React.MutableRefObject<number>;
  isCalibrating: boolean;
}

export const CalibrationWaveformCanvas: React.FC<CalibrationWaveformCanvasProps> = ({
  latestStrokeRef,
  isCalibrating,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferSize = 300;
    const history: number[] = new Array(bufferSize).fill(0);
    let currentDisplayStroke = 0;
    let lastPushTime = performance.now();

    // Generate static stars for starry atmosphere
    const stars = Array.from({ length: 45 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.7 + 0.3,
    }));

    const render = (now: number) => {
      const width = canvas.width;
      const height = canvas.height;

      // Smooth interpolation towards latest target stroke (fast attack, smooth decay)
      const targetStroke = latestStrokeRef.current || 0;
      const lerpSpeed = targetStroke > currentDisplayStroke ? 0.35 : 0.18;
      currentDisplayStroke += (targetStroke - currentDisplayStroke) * lerpSpeed;
      if (Math.abs(currentDisplayStroke) < 0.015) {
        currentDisplayStroke = 0;
      }

      // Advance history buffer at controlled rate (~28 Hz = ~36ms) to slow down wave movement
      if (now - lastPushTime >= 36) {
        lastPushTime = now;
        history.push(currentDisplayStroke);
        if (history.length > bufferSize) {
          history.shift();
        }
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Deep Space Cosmic Planet / Horizon Gradient Background
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 1.3,
        10,
        width * 0.5,
        height * 1.3,
        height * 1.5
      );
      bgGrad.addColorStop(0, 'rgba(30, 58, 138, 0.55)');
      bgGrad.addColorStop(0.4, 'rgba(15, 23, 42, 0.95)');
      bgGrad.addColorStop(1, '#060913');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw faint stars in background
      stars.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Y-Axis Grid & Ruler Marks (0 mm to 4 mm)
      const leftMargin = 60;
      const rightMargin = 20;
      const topMargin = 25;
      const bottomMargin = 25;
      const plotWidth = width - leftMargin - rightMargin;
      const plotHeight = height - topMargin - bottomMargin;

      const yTicks = [
        { label: '4 mm', val: 4.0 },
        { label: '3.5 mm', val: 3.5 },
        { label: '3 mm', val: 3.0 },
        { label: '2.5 mm', val: 2.5 },
        { label: '2 mm', val: 2.0 },
        { label: '1.5 mm', val: 1.5 },
        { label: '1 mm', val: 1.0 },
        { label: '0.5 mm', val: 0.5 },
        { label: '0 mm', val: 0.0 },
      ];

      ctx.font = '600 11px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      yTicks.forEach((tick) => {
        const y = topMargin + plotHeight * (1 - tick.val / 4.0);

        // Tick Label
        ctx.fillStyle = '#0ea5e9';
        ctx.fillText(tick.label, leftMargin - 10, y);

        // Horizontal Guide Line
        ctx.strokeStyle = tick.val === 0 ? '#0284c7' : 'rgba(14, 165, 233, 0.12)';
        ctx.lineWidth = tick.val === 0 ? 1.5 : 0.75;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - rightMargin, y);
        ctx.stroke();
      });

      // Y-axis main vertical line
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftMargin, topMargin);
      ctx.lineTo(leftMargin, height - bottomMargin);
      ctx.stroke();

      // 3. Draw Real-time Keystroke Waveform Spline & Area
      const stepX = plotWidth / (bufferSize - 1);

      ctx.save();
      // Clip to plotting area
      ctx.beginPath();
      ctx.rect(leftMargin, topMargin - 5, plotWidth, plotHeight + 10);
      ctx.clip();

      const points = history.map((val, idx) => {
        const clamped = Math.max(0, Math.min(4.0, val));
        const px = leftMargin + idx * stepX;
        const py = topMargin + plotHeight * (1 - clamped / 4.0);
        return { x: px, y: py };
      });

      // Fill area beneath curve
      ctx.beginPath();
      ctx.moveTo(points[0].x, height - bottomMargin);
      points.forEach((p) => {
        ctx.lineTo(p.x, p.y);
      });
      ctx.lineTo(points[points.length - 1].x, height - bottomMargin);
      ctx.closePath();

      const areaGrad = ctx.createLinearGradient(0, topMargin, 0, height - bottomMargin);
      areaGrad.addColorStop(0, 'rgba(2, 132, 199, 0.55)');
      areaGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.25)');
      areaGrad.addColorStop(1, 'rgba(2, 132, 199, 0.0)');
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Draw glowing stroke line
      ctx.beginPath();
      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.restore();

      // 4. Current real-time displacement pill tag at leading edge
      const latestPoint = points[points.length - 1];
      if (latestPoint && currentDisplayStroke > 0.08) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(latestPoint.x, latestPoint.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${currentDisplayStroke.toFixed(2)} mm`, latestPoint.x - 8, latestPoint.y - 12);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [latestStrokeRef, isCalibrating]);

  return (
    <div
      style={{
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(14, 165, 233, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
        background: '#060913',
        position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        width={900}
        height={240}
        style={{
          width: '100%',
          height: 240,
          display: 'block',
        }}
      />
    </div>
  );
};
