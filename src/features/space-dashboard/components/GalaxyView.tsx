import { useEffect, useMemo, useRef } from 'react';
import type { SpaceCluster, SpaceScene } from '../types/space';

interface GalaxyViewProps {
  scene: SpaceScene;
  onSelect?: (cluster: SpaceCluster) => void;
}

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 520;

interface StarParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export function GalaxyView({ scene, onSelect }: GalaxyViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const starField = useMemo<StarParticle[]>(
    () =>
      Array.from({ length: 180 }).map(() => ({
        x: Math.random() * VIEW_WIDTH,
        y: Math.random() * VIEW_HEIGHT,
        size: 0.6 + Math.random() * 1.6,
        opacity: 0.35 + Math.random() * 0.45,
      })),
    [],
  );

  const summary = useMemo(() => {
    const clusters = scene.clusters ?? [];
    return clusters.reduce(
      (acc, cluster) => {
        acc.nodes += cluster.nodes;
        acc.microDaos += cluster.microDaos;
        acc.agents += cluster.agents;
        acc.density = Math.max(acc.density, cluster.density);
        return acc;
      },
      { nodes: 0, microDaos: 0, agents: 0, density: 0 },
    );
  }, [scene.clusters]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = VIEW_WIDTH * dpr;
    canvas.height = VIEW_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Background gradient
    const bgGradient = ctx.createRadialGradient(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      60,
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      520,
    );
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(0.5, '#111827');
    bgGradient.addColorStop(1, '#020617');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Starfield
    starField.forEach((star) => {
      ctx.beginPath();
      ctx.globalAlpha = star.opacity;
      ctx.fillStyle = '#f8fafc';
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Cluster halos
    (scene.clusters ?? []).forEach((cluster) => {
      const radius = cluster.position.radius ?? 160;
      const gradient = ctx.createRadialGradient(
        cluster.position.x,
        cluster.position.y,
        radius * 0.1,
        cluster.position.x,
        cluster.position.y,
        radius,
      );
      const baseColor =
        cluster.status === 'warning'
          ? '#facc15'
          : cluster.status === 'critical'
            ? '#f87171'
            : '#818cf8';

      gradient.addColorStop(0, `${baseColor}EE`);
      gradient.addColorStop(0.45, `${baseColor}55`);
      gradient.addColorStop(1, `${baseColor}00`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cluster.position.x, cluster.position.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Constellation lines (simple circle arcs)
      ctx.strokeStyle = `${baseColor}AA`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(
        cluster.position.x,
        cluster.position.y,
        radius * (0.55 + cluster.density * 0.2),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, [scene.clusters, starField]);

  const metricCards = [
    { label: 'Ноди', value: summary.nodes },
    { label: 'microDAO', value: summary.microDaos },
    { label: 'Агенти', value: summary.agents },
    {
      label: 'Макс. щільність',
      value: `${Math.round(summary.density * 100)}%`,
    },
  ];

  const clusterButtonPosition = (cluster: SpaceCluster) => ({
    left: `${(cluster.position.x / VIEW_WIDTH) * 100}%`,
    top: `${(cluster.position.y / VIEW_HEIGHT) * 100}%`,
  });

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-[0_20px_120px_rgba(59,7,100,0.25)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase text-indigo-300/70">Режим</p>
          <h3 className="text-2xl font-semibold text-white">Galaxy View</h3>
        </div>
        <div className="flex gap-3">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-sm text-white backdrop-blur"
            >
              <p className="text-xs uppercase tracking-widest text-white/60">
                {card.label}
              </p>
              <p className="text-lg font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          className="h-[520px] w-full rounded-2xl"
        />

        {(scene.clusters ?? []).map((cluster) => (
          <button
            key={cluster.id}
            style={clusterButtonPosition(cluster)}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-slate-900/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-lg backdrop-blur hover:border-indigo-400 hover:text-indigo-200"
            onClick={() => onSelect?.(cluster)}
          >
            {cluster.name}
          </button>
        ))}
      </div>
    </div>
  );
}




