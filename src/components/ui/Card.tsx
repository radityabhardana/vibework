import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  bg?: 'white' | 'red' | 'black';
  noPadding?: boolean;
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', bg = 'white', noPadding = false, children, ...props }, ref) => {
    
    const bgStyles = {
      white: 'bg-[var(--surface)] border-white/10 text-white hover:border-white/20 hover:bg-[var(--surface-raised)]',
      red: 'bg-[var(--surface)] border-rose-500/20 text-white hover:border-rose-500/40 hover:bg-rose-500/[0.03]',
      black: 'bg-[#0d1011] border-white/[0.08] text-white hover:border-white/20'
    };

    const classes = [
      'border rounded-2xl shadow-[var(--shadow-brutal-sm)] overflow-hidden transition-all duration-200',
      !noPadding ? 'p-6 md:p-8' : '',
      bgStyles[bg],
      className
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
