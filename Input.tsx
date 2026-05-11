import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export default function Input({ label, icon, error, className, id, ...rest }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-dark-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white',
            'placeholder:text-dark-400 focus:outline-none focus:border-primary-600/50 focus:ring-1 focus:ring-primary-600/30',
            'transition-all duration-200',
            icon ? 'pl-10' : '',
            error ? 'border-primary-500 ring-1 ring-primary-500/30' : '',
            className
          )}
          {...rest}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-primary-400">{error}</p>}
    </div>
  );
}
