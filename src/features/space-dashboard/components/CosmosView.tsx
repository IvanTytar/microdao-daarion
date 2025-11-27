import { memo, useMemo } from 'react';
import type { SpaceScene, SpaceObjectBase } from '../types/space';

interface CosmosViewProps {
  scene: SpaceScene;
  onSelect?: (object: SpaceObjectBase) => void;
}

/**
 * CosmosView — простий SVG-рендер космічної сцени
 * (поки що 2D, потім можна винести до Canvas/WebGL)
 */
function Component({ scene, onSelect }: CosmosViewProps) {
  const stars = scene.stars ?? [];
  const planets = scene.planets ?? [];
  const moons = scene.moons ?? [];
  const gateways = scene.gateways ?? [];
  const anomalies = scene.anomalies ?? [];

  const viewBox = useMemo(() => ({ width: 960, height: 600 }), []);

  const statusColor = (status?: string) => {
    switch (status) {
      case 'warning':
        return '#facc15';
      case 'critical':
        return '#f87171';
      default:
        return '#4ade80';
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl shadow-purple-500/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">Режим</p>
          <h3 className="text-xl font-semibold text-white">Космос</h3>
        </div>
        <div className="text-sm text-slate-400">Галактика DAARION</div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          className="h-[520px] w-full"
        >
          <defs>
            <radialGradient id="star-glow">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#a78bfa" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background grid */}
          <g stroke="#1e293b" strokeWidth={0.5} opacity={0.3}>
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={(viewBox.width / 12) * i}
                y1={0}
                x2={(viewBox.width / 12) * i}
                y2={viewBox.height}
              />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={(viewBox.height / 8) * i}
                x2={viewBox.width}
                y2={(viewBox.height / 8) * i}
              />
            ))}
          </g>

          {/* Orbits */}
          {planets.map((planet) => (
            <circle
              key={`orbit-${planet.id}`}
              cx={
                stars.find((star) => star.id === planet.starId)?.position.x ??
                planet.position.x
              }
              cy={
                stars.find((star) => star.id === planet.starId)?.position.y ??
                planet.position.y
              }
              r={planet.orbitRadius}
              stroke="#94a3b8"
              strokeDasharray="4 6"
              strokeOpacity={0.3}
              fill="none"
            />
          ))}

          {/* Stars */}
          {stars.map((star) => (
            <g
              key={star.id}
              onClick={() => onSelect?.(star)}
              className="cursor-pointer"
            >
              <circle
                cx={star.position.x}
                cy={star.position.y}
                r={star.position.radius ?? 46}
                fill="url(#star-glow)"
              />
              <circle
                cx={star.position.x}
                cy={star.position.y}
                r={(star.position.radius ?? 46) / 2}
                fill={statusColor(star.status)}
                opacity={0.8}
              />
              <text
                x={star.position.x}
                y={(star.position.y ?? 0) + 6}
                textAnchor="middle"
                className="fill-white text-sm font-semibold"
              >
                {star.name}
              </text>
            </g>
          ))}

          {/* Planets */}
          {planets.map((planet) => (
            <g
              key={planet.id}
              onClick={() => onSelect?.(planet)}
              className="cursor-pointer"
            >
              <circle
                cx={planet.position.x}
                cy={planet.position.y}
                r={Math.max(planet.population / 4, 16)}
                fill="#0ea5e9"
                opacity={0.7}
              />
              <text
                x={planet.position.x}
                y={planet.position.y + 4}
                textAnchor="middle"
                className="fill-white text-xs"
              >
                {planet.name}
              </text>
            </g>
          ))}

          {/* Moons */}
          {moons.map((moon) => (
            <g
              key={moon.id}
              onClick={() => onSelect?.(moon)}
              className="cursor-pointer"
            >
              <circle
                cx={moon.position.x}
                cy={moon.position.y}
                r={8}
                fill="#f472b6"
              />
              <text
                x={moon.position.x + 12}
                y={moon.position.y}
                className="fill-white text-[11px]"
              >
                {moon.name}
              </text>
            </g>
          ))}

          {/* Gateways */}
          {gateways.map((gateway) => (
            <g
              key={gateway.id}
              onClick={() => onSelect?.(gateway)}
              className="cursor-pointer"
            >
              <rect
                x={gateway.position.x - 12}
                y={gateway.position.y - 12}
                width={24}
                height={24}
                rx={6}
                fill="#22d3ee"
                opacity={0.8}
              />
              <text
                x={gateway.position.x}
                y={gateway.position.y + 32}
                textAnchor="middle"
                className="fill-white text-xs"
              >
                {gateway.name}
              </text>
            </g>
          ))}

          {/* Anomalies */}
          {anomalies.map((anomaly) => (
            <g key={anomaly.id} onClick={() => onSelect?.(anomaly)}>
              <polygon
                points={`${anomaly.position.x},${anomaly.position.y - 16}
                        ${anomaly.position.x + 14},${anomaly.position.y + 12}
                        ${anomaly.position.x - 14},${anomaly.position.y + 12}`}
                fill="#f87171"
                opacity={0.8}
              />
              <text
                x={anomaly.position.x}
                y={anomaly.position.y + 28}
                textAnchor="middle"
                className="fill-white text-xs"
              >
                {anomaly.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export const CosmosView = memo(Component);





