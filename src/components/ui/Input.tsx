import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="font-mono font-medium text-zinc-300 text-xs tracking-tight">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`font-mono text-sm rounded-lg border border-white/15 px-4 py-3 bg-white/[0.03] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 disabled:opacity-40 disabled:bg-white/[0.01] transition-all duration-300 ${
            error ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="font-mono text-rose-400 text-xs font-medium mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
