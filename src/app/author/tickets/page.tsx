'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useApi, useTicketStream } from '@/lib/hooks';
import { STATUS_LABEL, timeAgo } from '@/lib/format';
import type { AuthorTicketSummary, TicketStatus } from '@/lib/types';
import { EmptyState, ErrorBanner, LiveDot, PageHeader, PageLoader, StatusBadge } from '@/components/ui';

const FILTERS: (TicketStatus | 'ALL')[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function MyTicketsPage() {
  const [filter, setFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const { data, error, loading, reload } = useApi<AuthorTicketSummary[]>(`/tickets${filter === 'ALL' ? '' : `?status=${filter}`}`);
  const { connected } = useTicketStream(() => reload(true));

  return (
    <>
      <PageHeader title="My Tickets" subtitle={<LiveDot connected={connected} />}
        action={<Link href="/author/tickets/new" className="btn-primary">＋ Raise a query</Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm ${filter === f ? 'bg-leaf-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {f === 'ALL' ? 'All' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      {loading ? <PageLoader /> : error ? <ErrorBanner message={error.message} onRetry={() => reload()} /> : data!.length === 0 ? (
        <EmptyState title={filter === 'ALL' ? "You haven't raised any queries yet" : 'No tickets with this status'}
          body="Questions about royalties, ISBNs, printing or your book's status? Our team usually replies within one business day."
          action={<Link href="/author/tickets/new" className="btn-primary">Raise a query</Link>} />
      ) : (
        <div className="card divide-y divide-slate-100">
          {data!.map((t) => (
            <Link key={t.id} href={`/author/tickets/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50" data-testid="ticket-row">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{t.subject}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  #{t.id} · {t.book?.title ?? 'General / Account'} · opened {timeAgo(t.createdAt)}
                  {t.replyCount > 0 && <> · <span className="font-medium text-leaf-600">{t.replyCount} {t.replyCount === 1 ? 'reply' : 'replies'}</span></>}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
