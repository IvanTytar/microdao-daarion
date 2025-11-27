/**
 * CityMap Component
 *
 * Інтерактивна 2D карта DAARION.city
 */

import React, { useState, useCallback } from 'react';
import type { CityZoneInfo, CityZone } from '../types/city';

interface CityMapProps {
  zones: CityZoneInfo[];
  selectedZone: CityZone | null;
  onZoneSelect: (zone: CityZone | null) => void;
  onZoneClick: (zone: CityZone) => void;
}

export function CityMap({ zones, selectedZone, onZoneSelect, onZoneClick }: CityMapProps) {
  const [hoveredZone, setHoveredZone] = useState<CityZone | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleZoneClick = useCallback((zoneId: CityZone) => {
    onZoneSelect(selectedZone === zoneId ? null : zoneId);
    onZoneClick(zoneId);
  }, [selectedZone, onZoneSelect, onZoneClick]);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-lg overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(59,130,246,0.1),transparent_25%,rgba(139,92,246,0.1),transparent_75%)]" />
      </div>

      {/* Zones */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 700"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center',
        }}
      >
        {zones.map((zone) => {
          const isSelected = selectedZone === zone.id;
          const isHovered = hoveredZone === zone.id;

          return (
            <g key={zone.id}>
              {/* Zone Shape */}
              <rect
                x={zone.position.x - zone.size.width / 2}
                y={zone.position.y - zone.size.height / 2}
                width={zone.size.width}
                height={zone.size.height}
                fill={zone.color}
                fillOpacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.4}
                stroke={zone.color}
                strokeWidth={isSelected ? 4 : isHovered ? 3 : 2}
                strokeOpacity={isSelected ? 1 : isHovered ? 0.8 : 0.6}
                className="cursor-pointer transition-all duration-200 hover:stroke-opacity-100"
                onClick={() => handleZoneClick(zone.id)}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                rx={8}
              />

              {/* Zone Glow Effect */}
              {(isSelected || isHovered) && (
                <rect
                  x={zone.position.x - zone.size.width / 2 - 10}
                  y={zone.position.y - zone.size.height / 2 - 10}
                  width={zone.size.width + 20}
                  height={zone.size.height + 20}
                  fill="none"
                  stroke={zone.color}
                  strokeWidth={2}
                  strokeOpacity={0.3}
                  rx={12}
                />
              )}

              {/* Zone Label */}
              <text
                x={zone.position.x}
                y={zone.position.y + zone.size.height / 2 + 25}
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="600"
                className="pointer-events-none"
              >
                {zone.name}
              </text>

              {/* Zone Count Badge */}
              <circle
                cx={zone.position.x + zone.size.width / 2 - 15}
                cy={zone.position.y - zone.size.height / 2 + 15}
                r={12}
                fill="white"
                stroke={zone.color}
                strokeWidth={2}
              />
              <text
                x={zone.position.x + zone.size.width / 2 - 15}
                y={zone.position.y - zone.size.height / 2 + 20}
                textAnchor="middle"
                fill={zone.color}
                fontSize="12"
                fontWeight="bold"
                className="pointer-events-none"
              >
                {zone.count}
              </text>

              {/* Status Indicator */}
              <circle
                cx={zone.position.x - zone.size.width / 2 + 15}
                cy={zone.position.y - zone.size.height / 2 + 15}
                r={6}
                fill={zone.status === 'active' ? '#10b981' : zone.status === 'building' ? '#f59e0b' : '#6b7280'}
              />
            </g>
          );
        })}
      </svg>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => handleZoom(0.2)}
          className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => setZoom(1)}
          className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors text-xs"
          title="Reset Zoom"
        >
          ↺
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <div className="font-semibold mb-2">Легенда</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Активна зона</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Будується</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Заплановано</span>
          </div>
        </div>
      </div>

      {/* Zone Tooltip */}
      {hoveredZone && zones.find(z => z.id === hoveredZone) && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white max-w-xs">
          <h3 className="font-bold text-lg mb-2">
            {zones.find(z => z.id === hoveredZone)?.name}
          </h3>
          <p className="text-sm text-gray-300 mb-2">
            {zones.find(z => z.id === hoveredZone)?.description}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span>Елементів: {zones.find(z => z.id === hoveredZone)?.count}</span>
            <span className={`px-2 py-1 rounded text-xs ${
              zones.find(z => z.id === hoveredZone)?.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : zones.find(z => z.id === hoveredZone)?.status === 'building'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {zones.find(z => z.id === hoveredZone)?.status === 'active' ? 'Активна' :
               zones.find(z => z.id === hoveredZone)?.status === 'building' ? 'Будується' : 'Заплановано'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

