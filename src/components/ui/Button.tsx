import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth, children, ...props }, ref) => {
    
    const baseStyles = 'font-sans font-semibold inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none';
    
    const variants = {
      primary: 'bg-white text-zinc-950 hover:bg-zinc-200 border border-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_0_12px_rgba(255,255,255,0.12)]',
      secondary: 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-white/10 hover:border-white/20 shadow-sm',
      danger: 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 hover:border-rose-500/50',
      ghost: 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] border border-transparent'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
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
