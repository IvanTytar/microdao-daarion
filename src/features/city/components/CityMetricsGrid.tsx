/**
 * CityMetricsGrid Component
 * 
 * Сітка метрик міста
 */

import type { CityMetrics } from '../types/city';

interface CityMetricsGridProps {
  metrics: CityMetrics;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  color?: string;
}

function MetricCard({ label, value, unit, trend, color = 'cyan' }: MetricCardProps) {
  const colorClasses = {
    cyan: 'text-cyan-400 border-cyan-500/20',
    purple: 'text-purple-400 border-purple-500/20',
    green: 'text-green-400 border-green-500/20',
    yellow: 'text-yellow-400 border-yellow-500/20',
    red: 'text-red-400 border-red-500/20',
    blue: 'text-blue-400 border-blue-500/20',
  };

  const trendColor = trend && trend > 0 ? 'text-green-400' : trend && trend < 0 ? 'text-red-400' : '';

  return (
    <div className={`rounded-xl border bg-slate-900/40 p-4 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.cyan}`}>
      <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <div className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses]?.split(' ')[0] || 'text-cyan-400'}`}>
          {value}
        </div>
        {unit && (
          <div className="text-sm text-gray-500">{unit}</div>
        )}
      </div>
      {trend !== undefined && (
        <div className={`text-xs mt-1 ${trendColor}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export function CityMetricsGrid({ metrics }: CityMetricsGridProps) {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90 mb-4">
        Global Metrics
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Activity Index"
          value={metrics.activityIndex.toFixed(1)}
          color="cyan"
          trend={Math.random() * 20 - 10}
        />
        <MetricCard
          label="Agent Latency"
          value={metrics.avgAgentLatencyMs.toFixed(0)}
          unit="ms"
          color="purple"
          trend={Math.random() * 20 - 10}
        />
        <MetricCard
          label="NATS Throughput"
          value={metrics.natsTps.toFixed(0)}
          unit="TPS"
          color="green"
          trend={Math.random() * 20 - 10}
        />
        <MetricCard
          label="Node Avg Load"
          value={(metrics.nodeAvgLoad * 100).toFixed(0)}
          unit="%"
          color="yellow"
          trend={Math.random() * 20 - 10}
        />
        <MetricCard
          label="Error Rate"
          value={(metrics.errorRate * 100).toFixed(2)}
          unit="%"
          color="red"
          trend={Math.random() * 20 - 10}
        />
        <MetricCard
          label="Quest Engagement"
          value={(metrics.questEngagement * 100).toFixed(0)}
          unit="%"
          color="blue"
          trend={Math.random() * 20 - 10}
        />
      </div>
    </div>
  );
}





