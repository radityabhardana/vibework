import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth, children, ...props }, ref) => {
    
    const baseStyles = 'font-sans uppercase font-black inline-flex items-center justify-center transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active focus:outline-none focus-visible:ring-4 focus-visible:ring-brutal-blue';
    const borderStyles = 'border-4 border-brutal-black shadow-brutal';
    
    const variants = {
      primary: 'bg-brutal-yellow text-brutal-black hover:bg-yellow-400',
      secondary: 'bg-brutal-white text-brutal-black hover:bg-gray-100',
      danger: 'bg-brutal-red text-brutal-white hover:bg-red-600',
      ghost: 'bg-transparent text-brutal-black border-transparent shadow-none hover:bg-gray-100 active:translate-x-0 active:translate-y-0 active:shadow-none'
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg md:text-xl',
    };

    const classes = [
      baseStyles,
      variant !== 'ghost' ? borderStyles : '',
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
