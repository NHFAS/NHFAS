import React from 'react';
import { cn } from '../lib/utils';

export const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  as: Component = 'button',
  children, 
  ...props 
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-brand-green text-white hover:bg-brand-green/90 focus:ring-brand-green",
    secondary: "bg-brand-navy text-white hover:bg-brand-navy/90 focus:ring-brand-navy",
    outline: "border-2 border-brand-navy text-brand-navy hover:bg-slate-50 focus:ring-brand-navy",
    ghost: "text-slate-600 hover:text-brand-navy hover:bg-slate-100 focus:ring-slate-200",
    white: "bg-white text-brand-navy hover:bg-slate-50 focus:ring-white"
  };

  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg"
  };

  return (
    <Component
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </Component>
  );
});

Button.displayName = 'Button';
