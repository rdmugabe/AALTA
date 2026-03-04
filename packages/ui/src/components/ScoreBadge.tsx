import * as React from 'react';
import { cn } from '../utils/cn';

export interface ScoreBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-500';
  if (score >= 85) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 65) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function getScoreLabel(score: number | null): string {
  if (score === null) return 'Not Rated';
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-lg',
  lg: 'w-20 h-20 text-2xl',
};

function ScoreBadge({ score, size = 'md', showLabel = false, className, ...props }: ScoreBadgeProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)} {...props}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full border-2 font-bold',
          sizeClasses[size],
          getScoreColor(score)
        )}
      >
        {score !== null ? Math.round(score) : '—'}
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', getScoreColor(score).split(' ')[1])}>
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
}

export { ScoreBadge, getScoreColor, getScoreLabel };
