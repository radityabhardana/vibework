import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth, children, ...props }, ref) => {
    
    const baseStyles = 'font-mono font-medium -tracking-[0.2px] inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none';
    
    const variants = {
      primary: 'bg-[var(--accent)] text-[#102016] hover:bg-[#d0f2d9] shadow-[0_10px_25px_-14px_rgba(184,231,199,0.8)]',
      secondary: 'bg-white/[0.06] text-white ring-1 ring-white/15 hover:bg-white/10 hover:ring-white/30 shadow-sm',
      danger: 'bg-rose-950/40 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-900/50 hover:ring-rose-500/50',
      ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.06]'
    };

    const sizes = {
      sm: 'px-4 py-2 text-xs',
      md: 'px-6 py-3 text-sm leading-5',
      lg: 'px-8 py-3.5 text-base leading-5',
    };

    const classes = [
      baseStyles,
      variants[variant],
      sizes[size],
      fullWidth ? 'w-full' : '',
      className
    ].filter(Boolean).join(' ');

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
