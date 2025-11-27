/**
 * CitySectorMap Component
 * 
 * 2.5D карта міста з секторами
 */

import type { CitySnapshot } from '../types/city';

interface CitySectorMapProps {
  snapshot: CitySnapshot;
}

const SECTORS = [
  { id: 'education', name: 'Education', color: '#10b981', x: 50, y: 50 },
  { id: 'gamedev', name: 'GameDev', color: '#8b5cf6', x: 150, y: 50 },
  { id: 'governance', name: 'Governance', color: '#06b6d4', x: 100, y: 120 },
  { id: 'energy', name: 'Energy', color: '#f59e0b', x: 50, y: 190 },
  { id: 'research', name: 'Research', color: '#3b82f6', x: 150, y: 190 },
];

export function CitySectorMap({ snapshot }: CitySectorMapProps) {
  const viewBoxWidth = 250;
  const viewBoxHeight = 250;

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
          Sector Map
        </h3>
        <span className="text-xs text-gray-400">
          {snapshot.nodes.length} nodes active
        </span>
      </div>

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="h-full w-full"
      >
        {/* Background grid */}
        <defs>
          <pattern
            id="city-grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#city-grid)" />

        {/* Sectors */}
        {SECTORS.map((sector) => {
          // Activity mock: 0.3 - 0.9
          const activity = Math.random() * 0.6 + 0.3;

          return (
            <g key={sector.id} className="cursor-pointer hover:opacity-80 transition-opacity">
              {/* Glow */}
              <circle
                cx={sector.x}
                cy={sector.y}
                r={25}
                fill={sector.color}
                opacity={activity * 0.3}
              />
              
              {/* Core */}
              <circle
                cx={sector.x}
                cy={sector.y}
                r={15}
                fill={sector.color}
                opacity={0.6}
                stroke={sector.color}
                strokeWidth="2"
              />

              {/* Label */}
              <text
                x={sector.x}
                y={sector.y + 35}
                textAnchor="middle"
                className="fill-white text-[10px] font-semibold"
              >
                {sector.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}





