'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

/** Atalho pro admin trocar rápido entre a visão de admin e a própria agenda de operador. */
export default function AlternarModo() {
  const { profile } = useAuth();
  const pathname = usePathname();
  if (profile?.role !== 'admin') return null;

  const noAdmin = pathname.startsWith('/admin');

  return (
    <div className="flex shrink-0 rounded-full bg-slate-800 p-0.5 text-xs font-bold">
      <Link
        href="/admin"
        className={`rounded-full px-3 py-1.5 ${noAdmin ? 'bg-brand-500 text-white' : 'text-slate-400'}`}
      >
        Admin
      </Link>
      <Link
        href="/"
        className={`rounded-full px-3 py-1.5 ${!noAdmin ? 'bg-brand-500 text-white' : 'text-slate-400'}`}
      >
        Operador
      </Link>
    </div>
  );
}
