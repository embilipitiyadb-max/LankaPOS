import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  success: 'bg-success-500/15 text-success-400 border-success-500/20',
  warning: 'bg-warning-500/15 text-warning-400 border-warning-500/20',
  danger: 'bg-primary-500/15 text-primary-400 border-primary-500/20',
  info: 'bg-info-500/15 text-info-400 border-info-500/20',
  default: 'bg-dark-600/50 text-dark-300 border-dark-500/30',
};

export default function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant]
      )}
    >
      {children}
    </span>
  );
}
