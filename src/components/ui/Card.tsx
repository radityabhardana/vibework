import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  bg?: 'white' | 'yellow' | 'blue' | 'red' | 'black';
  noPadding?: boolean;
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', bg = 'white', noPadding = false, children, ...props }, ref) => {
    
    const bgStyles = {
      white: 'bg-zinc-900/70 border-white/10 text-zinc-100 hover:border-white/20',
      yellow: 'bg-zinc-900/80 border-amber-500/20 text-zinc-100 hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)]',
      blue: 'bg-zinc-900/80 border-cyan-500/20 text-zinc-100 hover:border-cyan-500/40 hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.15)]',
      red: 'bg-zinc-900/80 border-rose-500/20 text-zinc-100 hover:border-rose-500/40 hover:shadow-[0_0_25px_-5px_rgba(244,63,94,0.15)]',
      black: 'bg-zinc-950/90 border-white/[0.08] text-zinc-100 hover:border-white/15'
    };

    const classes = [
      'border rounded-2xl backdrop-blur-md shadow-lg overflow-hidden transition-all duration-200',
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
