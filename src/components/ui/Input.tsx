import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    
    return (
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label className="font-sans font-black text-brutal-black uppercase text-sm tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`font-mono border-4 border-brutal-black px-4 py-3 bg-brutal-white text-brutal-black focus:outline-none focus:ring-4 focus:ring-brutal-blue disabled:opacity-50 disabled:bg-gray-100 transition-shadow ${
            error ? 'border-brutal-red ring-4 ring-red-200' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="font-mono text-brutal-red text-xs font-bold uppercase mt-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
