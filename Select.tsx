import type { SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  icon?: ReactNode;
}

export default function Select({ label, options, error, icon, className, id, ...rest }: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-dark-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <select
          id={selectId}
          className={cn(
            'w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white',
            'focus:outline-none focus:border-primary-600/50 focus:ring-1 focus:ring-primary-600/30',
            'transition-all duration-200 appearance-none',
            'bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%23737373%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E")] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat',
            icon ? 'pl-10' : '',
            error ? 'border-primary-500 ring-1 ring-primary-500/30' : '',
            className
          )}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-dark-800 text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1.5 text-xs text-primary-400">{error}</p>}
    </div>
  );
}
