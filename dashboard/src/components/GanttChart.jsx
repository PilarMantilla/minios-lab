import { useRef, useEffect, useState } from 'react';

const DEFAULT_COLOR = '#22c55e';
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 16.0;
const ZOOM_STEP = 1.5;

export default function GanttChart({ processes, getRelativeTime }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isFollowingRight, setIsFollowingRight] = useState(true);
  const followRightRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atRight =
        container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;
      followRightRef.current = atRight;
      setIsFollowingRight(atRight);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');

    const draw = () => {
      const procs = Object.values(processes).sort((a, b) => {
        if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
        return a.pid - b.pid;
      });
      const containerWidth = container.clientWidth;
      const canvasWidth = Math.max(containerWidth, containerWidth * zoomLevel);
      canvas.width = canvasWidth;
      canvas.height = Math.max(200, procs.length * 40 + 40);

      const now = getRelativeTime();
      const timeWindow = Math.max(now, 10);
      const w = canvas.width;
      const h = canvas.height;
      const rowH = 30;
      const labelW = 100;
      const chartW = w - labelW - 20;
      const topMargin = 30;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, w, h);

      const numTicks = Math.max(5, Math.floor(chartW / 100));
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px monospace';
      for (let i = 0; i <= numTicks; i++) {
        const x = labelW + (chartW * i / numTicks);
        const t = (timeWindow * i / numTicks).toFixed(1);
        ctx.fillText(`${t}s`, x, 15);
        ctx.strokeStyle = '#1f2937';
        ctx.beginPath();
        ctx.moveTo(x, topMargin);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      if (procs.length === 0) {
        ctx.fillStyle = '#4b5563';
        ctx.font = '13px sans-serif';
        ctx.fillText('Esperando eventos del scheduler...', 12, 58);
      }

      procs.forEach((proc, i) => {
        const y = topMargin + i * (rowH + 5);
        const procColor = proc.color || DEFAULT_COLOR;

        ctx.fillStyle = procColor;
        ctx.fillRect(2, y + 8, 5, rowH - 12);

        ctx.fillStyle = '#d1d5db';
        ctx.font = '12px monospace';
        ctx.fillText(`${proc.pid}`, 12, y + 18);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px monospace';
        ctx.fillText(proc.name || 'process', 12, y + 28);

        (proc.segments || []).forEach(seg => {
          const startX = labelW + (seg.start / timeWindow) * chartW;
          const segEnd = seg.end ?? (proc.state === 'TERMINATED' ? seg.start : now);
          const endX = labelW + (segEnd / timeWindow) * chartW;
          const segW = Math.max(endX - startX, 1);

          ctx.fillStyle = procColor;
          ctx.fillRect(startX, y + 2, segW, rowH - 4);
        });

        ctx.strokeStyle = '#1f2937';
        ctx.beginPath();
        ctx.moveTo(labelW, y + rowH + 2);
        ctx.lineTo(w, y + rowH + 2);
        ctx.stroke();
      });

      if (followRightRef.current && container.scrollWidth > container.clientWidth) {
        container.scrollLeft = container.scrollWidth - container.clientWidth;
      }
    };

    draw();
    const interval = setInterval(draw, 200);
    return () => clearInterval(interval);
  }, [processes, getRelativeTime, zoomLevel]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * ZOOM_STEP, ZOOM_MAX));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / ZOOM_STEP, ZOOM_MIN));
  const handleZoomReset = () => {
    setZoomLevel(1.0);
    followRightRef.current = true;
    setIsFollowingRight(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={handleZoomOut}
          disabled={zoomLevel <= ZOOM_MIN}
          className="h-8 w-8 rounded-md bg-gray-800 font-mono text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-30"
          title="Alejar"
        >
          -
        </button>
        <button
          onClick={handleZoomIn}
          disabled={zoomLevel >= ZOOM_MAX}
          className="h-8 w-8 rounded-md bg-gray-800 font-mono text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-30"
          title="Acercar"
        >
          +
        </button>
        <button
          onClick={handleZoomReset}
          className="rounded-md bg-gray-800 px-2 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700"
          title="Restablecer zoom"
        >
          Reset
        </button>
        <span className="ml-1 font-mono text-gray-500">{zoomLevel.toFixed(1)}x</span>
        {!isFollowingRight && zoomLevel > 1.0 && (
          <span className="ml-2 text-yellow-600">(scroll derecha para volver al ahora)</span>
        )}
      </div>

      <div
        ref={containerRef}
        className="overflow-x-auto rounded-md bg-gray-950"
        style={{ minHeight: '200px' }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    </div>
  );
}
