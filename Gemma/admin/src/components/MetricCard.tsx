/**
 * MetricCard - Compact metric display with value, trend, and label
 * Designed for information-dense dashboard layouts
 */

import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: ReactNode;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const colorClasses = {
  default: 'bg-gray-800 border-gray-700',
  success: 'bg-emerald-900/30 border-emerald-700/50',
  warning: 'bg-amber-900/30 border-amber-700/50',
  error: 'bg-red-900/30 border-red-700/50',
  info: 'bg-blue-900/30 border-blue-700/50',
};

const valueColorClasses = {
  default: 'text-white',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  info: 'text-blue-400',
};

const trendIcons = {
  up: '↑',
  down: '↓',
  stable: '→',
};

const trendColors = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  stable: 'text-gray-400',
};

export function MetricCard({
  label,
  value,
  sublabel,
  trend,
  trendValue,
  icon,
  color = 'default',
  size = 'md',
  onClick,
}: MetricCardProps) {
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div
      className={`
        ${colorClasses[color]}
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:brightness-110 transition-all' : ''}
        rounded-lg border
      `}
      onClick={onClick}
    >
      {/* Header row with icon and label */}
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-gray-400 text-sm">{icon}</span>}
        <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          {label}
        </span>
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-2">
        <span className={`${valueSizeClasses[size]} ${valueColorClasses[color]} font-bold tabular-nums`}>
          {value}
        </span>

        {trend && (
          <span className={`text-sm ${trendColors[trend]} flex items-center gap-0.5`}>
            <span>{trendIcons[trend]}</span>
            {trendValue && <span>{trendValue}</span>}
          </span>
        )}
      </div>

      {/* Sublabel */}
      {sublabel && (
        <span className="text-xs text-gray-500 mt-0.5 block">
          {sublabel}
        </span>
      )}
    </div>
  );
}

/**
 * MetricGrid - Grid layout for MetricCards
 */
interface MetricGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
}

export function MetricGrid({
  children,
  columns = 3,
  gap = 'md',
}: MetricGridProps) {
  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]}`}>
      {children}
    </div>
  );
}
