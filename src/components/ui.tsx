import type { ReactNode } from 'react';
import { CATEGORY_LABEL, PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE } from '@/lib/format';
import type { Category, Priority, TicketStatus } from '@/lib/types';

const pill = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

export const StatusBadge = ({ status }: { status: TicketStatus }) => <span className={`${pill} ${STATUS_STYLE[status]}`} data-testid="status-badge">{STATUS_LABEL[status]}</span>;

export const PriorityBadge = ({ priority }: { priority: Priority | null }) =>
  priority ? <span className={`${pill} ${PRIORITY_STYLE[priority]}`}>{priority === 'CRITICAL' && '●'} {PRIORITY_LABEL[priority]}</span>
    : <span className={`${pill} bg-slate-50 text-slate-400 ring-slate-200`}>Unscored</span>;

export const CategoryBadge = ({ category }: { category: Category | null }) =>
  <span className={`${pill} bg-white text-slate-600 ring-slate-200`}>{category ? CATEGORY_LABEL[category] : 'Unclassified'}</span>;

export const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={`animate-spin text-leaf-600 ${className}`} viewBox="0 0 24 24" fill="none" aria-label="Loading">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const PageLoader = () => <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 text-4xl">🍃</div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {body && <p className="mt-1 max-w-md text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      <span>{message}</span>
      {onRetry && <button className="font-medium underline" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LiveDot({ connected }: { connected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" title={connected ? 'Live updates on' : 'Reconnecting…'}>
      <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      {connected ? 'Live' : 'Reconnecting'}
    </span>
  );
}
