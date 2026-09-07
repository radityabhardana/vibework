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
          <label className="font-sans font-medium text-zinc-300 text-xs tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`font-sans text-sm rounded-lg border border-white/10 px-3.5 py-2.5 bg-zinc-900/90 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50 disabled:bg-zinc-900/40 transition-all ${
            error ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="font-sans text-rose-400 text-xs font-medium mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
