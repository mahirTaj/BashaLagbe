import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const buttonVariants = cva(
  'relative group inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        // Premium indigo → violet gradient (high-contrast, attractive)
        default:
          [
            'border border-indigo-400/40',
            'bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 text-slate-50',
            'shadow-[0_8px_24px_rgba(67,56,202,0.35)] hover:shadow-[0_16px_36px_rgba(91,33,182,0.45)]',
            'hover:-translate-y-0.5 active:translate-y-0',
            'focus-visible:ring-2 focus-visible:ring-violet-400/50'
          ].join(' '),
        // Clean outline that warms up with the same palette
        outline:
          [
            'border border-slate-300 text-slate-800',
            'bg-white hover:bg-indigo-50 hover:border-indigo-400/70 hover:text-slate-900',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.6),_0_2px_6px_rgba(2,6,23,0.06)] hover:shadow-[0_6px_14px_rgba(2,6,23,0.12)]',
            'hover:-translate-y-0.5 active:translate-y-0',
            'focus-visible:ring-2 focus-visible:ring-indigo-400/35'
          ].join(' '),
        // Minimal ghost with indigo tint (great on light surfaces)
        ghost:
          [
            'text-slate-700 hover:text-slate-900',
            'hover:bg-indigo-50 active:bg-indigo-100',
            'hover:-translate-y-0.5 active:translate-y-0'
          ].join(' '),
        // Destructive stays deep red with elegant depth
        destructive:
          [
            'border border-rose-500/40',
            'bg-gradient-to-b from-[#7f1d1d] to-[#991b1b] text-rose-50',
            'shadow-[0_8px_24px_rgba(127,29,29,0.22)] hover:shadow-[0_16px_36px_rgba(127,29,29,0.28)]',
            'hover:-translate-y-0.5 active:translate-y-0',
            'focus-visible:ring-2 focus-visible:ring-rose-400/40'
          ].join(' ')
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
);

export const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={twMerge(
        buttonVariants({ variant, size }),
  // sheen overlay
  'before:content-["\""] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:opacity-50 before:pointer-events-none before:transition-opacity before:duration-300 group-hover:before:opacity-80'
      , className)}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { buttonVariants };
