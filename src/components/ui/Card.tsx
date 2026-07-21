import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  bg?: 'white' | 'yellow' | 'blue' | 'red' | 'black';
  noPadding?: boolean;
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', bg = 'white', noPadding = false, children, ...props }, ref) => {
    
    const bgColors = {
      white: 'bg-brutal-white text-brutal-black',
      yellow: 'bg-brutal-yellow text-brutal-black',
      blue: 'bg-brutal-blue text-brutal-white',
      red: 'bg-brutal-red text-brutal-white',
      black: 'bg-brutal-black text-brutal-white'
    };

    const classes = [
      'border-4 border-brutal-black shadow-brutal overflow-hidden',
      !noPadding ? 'p-6 md:p-8' : '',
      bgColors[bg],
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
