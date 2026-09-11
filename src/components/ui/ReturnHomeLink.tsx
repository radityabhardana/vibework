import Link from 'next/link';
import { House } from '@phosphor-icons/react';

export function ReturnHomeLink({ label }: { label: string }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-sans text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      <House weight="bold" className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
