import * as React from 'react';
import { cn } from '../utils/cn';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RiskBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  risk: RiskLevel | null;
  size?: 'sm' | 'md';
}

const riskColors: Record<RiskLevel, string> = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
};

const riskLabels: Record<RiskLevel, string> = {
  LOW: 'Low Risk',
  MODERATE: 'Moderate Risk',
  HIGH: 'High Risk',
  CRITICAL: 'Critical Risk',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

function RiskBadge({ risk, size = 'md', className, ...props }: RiskBadgeProps) {
  if (!risk) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full border font-medium',
          'bg-gray-100 text-gray-500 border-gray-200',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        Not Assessed
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        riskColors[risk],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {riskLabels[risk]}
    </div>
  );
}

export { RiskBadge, riskColors, riskLabels };
