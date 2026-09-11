import Link from 'next/link';
import { House } from '@phosphor-icons/react';

export function ReturnHomeLink({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-3">
      <Link
        href="/"
        aria-label={label}
        className="group inline-flex items-center gap-1.5 rounded-md py-1.5 pr-1 font-sans text-xs font-medium text-zinc-500 transition-all active:translate-y-px hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <House weight="regular" className="size-4 transition-transform group-hover:-translate-y-px" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
      <span aria-hidden className="h-5 w-px bg-white/[0.1]" />
    </span>
  );
}
