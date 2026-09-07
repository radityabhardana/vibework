import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  bg?: 'white' | 'yellow' | 'blue' | 'red' | 'black';
  noPadding?: boolean;
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', bg = 'white', noPadding = false, children, ...props }, ref) => {
    
    const bgStyles = {
      white: 'bg-white/[0.03] border-white/10 text-white hover:border-white/25 hover:bg-white/[0.05]',
      yellow: 'bg-white/[0.03] border-amber-500/20 text-white hover:border-amber-500/40 hover:bg-amber-500/[0.03]',
      blue: 'bg-white/[0.03] border-blue-500/20 text-white hover:border-blue-500/40 hover:bg-blue-500/[0.03]',
      red: 'bg-white/[0.03] border-rose-500/20 text-white hover:border-rose-500/40 hover:bg-rose-500/[0.03]',
      black: 'bg-black/60 border-white/[0.08] text-white hover:border-white/20'
    };

    const classes = [
      'border rounded-2xl backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300',
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
