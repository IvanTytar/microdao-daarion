'use client';

import { getStatusColor, getStatusBgColor } from '@/lib/node-dashboard';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeClasses[size]}
        ${getStatusBgColor(status)}
        ${getStatusColor(status)}
      `}
    >
      <span className={`w-2 h-2 rounded-full ${status === 'up' || status === 'online' ? 'bg-green-500' : status === 'degraded' ? 'bg-yellow-500' : status === 'down' || status === 'offline' ? 'bg-red-500' : 'bg-gray-500'}`} />
      {label || status}
    </span>
  );
}

