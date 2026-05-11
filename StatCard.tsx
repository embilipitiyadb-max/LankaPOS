import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  change?: number;
  changeType?: 'up' | 'down';
  color?: string;
}

export default function StatCard({ title, value, icon, change, changeType, color = 'text-primary-500' }: StatCardProps) {
  return (
    <div className="glass-light rounded-2xl p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-dark-300 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {changeType === 'up' ? (
                <svg className="w-4 h-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
              <span className={`text-sm font-medium ${changeType === 'up' ? 'text-success-400' : 'text-primary-500'}`}>
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
        <div className={`${color} opacity-50`}>{icon}</div>
      </div>
    </div>
  );
}
