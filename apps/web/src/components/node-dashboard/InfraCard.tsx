'use client';

import { InfraMetrics, formatBytes, formatPercent } from '@/lib/node-dashboard';
import { ProgressBar } from './ProgressBar';

interface InfraCardProps {
  infra: InfraMetrics;
}

export function InfraCard({ infra }: InfraCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>📊</span> Infrastructure
      </h3>
      
      <div className="space-y-4">
        {/* CPU */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/70">CPU</span>
            <span className="text-white font-medium">{formatPercent(infra.cpu_usage_pct)}</span>
          </div>
          <ProgressBar value={infra.cpu_usage_pct} max={100} showPercent={false} />
        </div>
        
        {/* RAM */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/70">RAM</span>
            <span className="text-white font-medium">
              {formatBytes(infra.ram.used_gb)} / {formatBytes(infra.ram.total_gb)}
            </span>
          </div>
          <ProgressBar value={infra.ram.used_gb} max={infra.ram.total_gb} showPercent={false} />
        </div>
        
        {/* Disk */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/70">Disk</span>
            <span className="text-white font-medium">
              {formatBytes(infra.disk.used_gb)} / {formatBytes(infra.disk.total_gb)}
            </span>
          </div>
          <ProgressBar 
            value={infra.disk.used_gb} 
            max={infra.disk.total_gb} 
            showPercent={false}
            colorClass="bg-blue-500"
          />
        </div>
        
        {/* GPUs */}
        {infra.gpus && infra.gpus.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">GPU</p>
            {infra.gpus.map((gpu, idx) => (
              <div key={idx} className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/70 truncate">{gpu.name}</span>
                  <span className="text-white font-medium">
                    {formatBytes(gpu.used_gb)} / {formatBytes(gpu.vram_gb)}
                  </span>
                </div>
                <ProgressBar 
                  value={gpu.used_gb} 
                  max={gpu.vram_gb} 
                  showPercent={false}
                  colorClass="bg-purple-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

