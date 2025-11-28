'use client';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercent?: boolean;
  colorClass?: string;
}

export function ProgressBar({ 
  value, 
  max, 
  label, 
  showPercent = true,
  colorClass = 'bg-cyan-500'
}: ProgressBarProps) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  
  // Color based on usage
  const getBarColor = () => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 75) return 'bg-yellow-500';
    return colorClass;
  };
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-white/70">{label}</span>
          {showPercent && (
            <span className="text-white/50">{percent.toFixed(1)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

