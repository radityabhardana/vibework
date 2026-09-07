import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth, children, ...props }, ref) => {
    
    const baseStyles = 'font-mono font-medium -tracking-[0.2px] inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-300 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none';
    
    const variants = {
      primary: 'bg-white text-black hover:bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_15px_rgba(255,255,255,0.15)] ring ring-transparent',
      secondary: 'bg-white/[0.04] text-white ring ring-white/30 hover:bg-white/10 hover:ring-white/50 shadow-sm',
      danger: 'bg-rose-950/40 text-rose-300 ring ring-rose-500/40 hover:bg-rose-900/50 hover:ring-rose-500/60',
      ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.06] ring-0'
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
