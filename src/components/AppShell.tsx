'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth, useRequireRole } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { PageLoader } from './ui';

const NAV: Record<Role, { href: string; label: string; icon: string }[]> = {
  AUTHOR: [
    { href: '/author/books', label: 'My Books', icon: '📚' },
    { href: '/author/tickets', label: 'My Tickets', icon: '💬' },
    { href: '/author/tickets/new', label: 'Raise a Query', icon: '＋' },
  ],
  ADMIN: [{ href: '/admin/tickets', label: 'Ticket Queue', icon: '📥' }],
};

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useRequireRole(role);
  const { logout } = useAuth();
  const pathname = usePathname();

  if (loading || !user) return <PageLoader />;

  const active = (href: string) => (href === '/author/tickets' ? pathname === href || /^\/author\/tickets\/\d+/.test(pathname) : pathname.startsWith(href));

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:fixed md:inset-y-0 md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-leaf-700">🍃 BookLeaf</Link>
          <p className="text-xs text-slate-400 md:mt-0.5">{role === 'ADMIN' ? 'Support Console' : 'Author Portal'}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV[role].map((n) => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active(n.href) ? 'bg-leaf-50 font-medium text-leaf-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span className="w-5 text-center">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-slate-100 px-5 py-4 md:absolute md:bottom-0 md:block md:w-full">
          <p className="truncate text-sm font-medium text-slate-700">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <button onClick={logout} className="mt-2 text-xs font-medium text-slate-500 hover:text-red-600">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:ml-60 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
        <button onClick={logout} className="mt-10 text-xs text-slate-400 md:hidden">Sign out</button>
      </main>
    </div>
  );
}
