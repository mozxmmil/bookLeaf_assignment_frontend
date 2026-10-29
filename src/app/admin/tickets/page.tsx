'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApi, useTicketStream } from '@/lib/hooks';
import { CATEGORY_LABEL, hoursSince, PRIORITY_LABEL, STATUS_LABEL, timeAgo } from '@/lib/format';
import type { AdminTicketSummary, Category, Priority, Stats, TicketStatus } from '@/lib/types';
import { CategoryBadge, EmptyState, ErrorBanner, LiveDot, PageHeader, PageLoader, PriorityBadge, Spinner, StatusBadge } from '@/components/ui';

type Filters = { status: string; category: string; priority: string; assignee: string; from: string; to: string; q: string; sort: string };
const DEFAULTS: Filters = { status: 'OPEN,IN_PROGRESS', category: '', priority: '', assignee: '', from: '', to: '', q: '', sort: 'priority' };

export default function TicketQueuePage() {
  const [f, setF] = useState<Filters>(DEFAULTS);
  const [page, setPage] = useState(1);
  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
    p.set('page', String(page));
    return `/admin/tickets?${p}`;
  }, [f, page]);

  const { data, meta, error, loading, reload } = useApi<AdminTicketSummary[]>(query);
  const stats = useApi<Stats>('/admin/stats');
  const [flash, setFlash] = useState<number | null>(null);
  const { connected } = useTicketStream((e) => {
    reload(true); stats.reload(true);
    if (e.type === 'ticket.created') { setFlash(e.ticketId); setTimeout(() => setFlash(null), 4000); }
  });
  const set = (k: keyof Filters, v: string) => { setF((p) => ({ ...p, [k]: v })); setPage(1); };
  const s = stats.data;

  return (
    <>
      <PageHeader title="Ticket Queue" subtitle={<LiveDot connected={connected} />}
        action={s && !s.ai.enabled && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700">AI offline — keyword triage & manual replies active</span>} />

      {s && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Open" value={s.byStatus.OPEN} onClick={() => set('status', 'OPEN')} />
          <StatCard label="In progress" value={s.byStatus.IN_PROGRESS} onClick={() => set('status', 'IN_PROGRESS')} />
          <StatCard label="Critical / High open" value={s.openByPriority.CRITICAL + s.openByPriority.HIGH} tone="red" onClick={() => setF({ ...DEFAULTS, priority: 'CRITICAL,HIGH' })} />
          <StatCard label="Unresolved > 48h" value={s.olderThan48h} tone="amber" onClick={() => setF({ ...DEFAULTS, sort: 'oldest' })} />
          <StatCard label="Assigned to me" value={s.assignedToMe} onClick={() => set('assignee', 'me')} />
        </div>
      )}

      <div className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-4 lg:grid-cols-8">
        <input className="input col-span-2" placeholder="Search subject, author…" value={f.q} onChange={(e) => set('q', e.target.value)} aria-label="Search" />
        <Select label="Status" value={f.status} onChange={(v) => set('status', v)}
          options={[['OPEN,IN_PROGRESS', 'Active'], ['', 'All statuses'], ...(Object.keys(STATUS_LABEL) as TicketStatus[]).map((k) => [k, STATUS_LABEL[k]] as [string, string])]} />
        <Select label="Category" value={f.category} onChange={(v) => set('category', v)}
          options={[['', 'All categories'], ...(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => [k, CATEGORY_LABEL[k]] as [string, string])]} />
        <Select label="Priority" value={f.priority} onChange={(v) => set('priority', v)}
          options={[['', 'All priorities'], ['CRITICAL,HIGH', 'Critical + High'], ...(Object.keys(PRIORITY_LABEL) as Priority[]).map((k) => [k, PRIORITY_LABEL[k]] as [string, string])]} />
        <Select label="Assignee" value={f.assignee} onChange={(v) => set('assignee', v)} options={[['', 'Anyone'], ['me', 'Assigned to me'], ['unassigned', 'Unassigned']]} />
        <input type="date" className="input" value={f.from} onChange={(e) => set('from', e.target.value)} aria-label="From date" />
        <input type="date" className="input" value={f.to} onChange={(e) => set('to', e.target.value)} aria-label="To date" />
        <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-4 lg:col-span-8">
          <div className="w-52"><Select label="Sort" value={f.sort} onChange={(v) => set('sort', v)} options={[['priority', 'Most urgent first'], ['oldest', 'Oldest first'], ['newest', 'Newest first']]} /></div>
          <button className="btn-ghost text-xs" onClick={() => { setF(DEFAULTS); setPage(1); }}>Reset filters</button>
        </div>
      </div>

      {loading ? <PageLoader /> : error ? <ErrorBanner message={error.message} onRetry={() => reload()} /> : data!.length === 0 ? (
        <EmptyState title="No tickets match these filters" body="Inbox zero for this view 🎉 Try widening the filters." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Author</th><th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data!.map((t) => {
                const stale = hoursSince(t.createdAt) > 48 && (t.status === 'OPEN' || t.status === 'IN_PROGRESS');
                return (
                  <tr key={t.id} className={`hover:bg-slate-50 ${flash === t.id ? 'bg-emerald-50' : ''} ${t.priority === 'CRITICAL' && t.status !== 'CLOSED' && t.status !== 'RESOLVED' ? 'border-l-4 border-l-red-400' : ''}`} data-testid="queue-row">
                    <td className="max-w-xs px-4 py-3">
                      <Link href={`/admin/tickets/${t.id}`} className="block">
                        <span className="font-medium text-slate-900 hover:text-leaf-700">{t.subject}</span>
                        <span className="block text-xs text-slate-500">#{t.id} · {t.book?.title ?? 'General / Account'}{t.awaitingReply && <span className="ml-1 font-medium text-blue-600">· awaiting reply</span>}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><span className="block text-slate-800">{t.author.name}</span><span className="text-xs text-slate-400">{t.author.email}</span></td>
                    <td className="px-4 py-3">{t.aiStatus === 'PENDING' ? <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Spinner className="h-3 w-3" /> classifying</span> : <CategoryBadge category={t.category} />}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{t.assignee?.name.split(' ')[0] ?? <span className="text-slate-400">—</span>}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${stale ? 'font-medium text-amber-600' : 'text-slate-500'}`}>{stale && '⚠ '}{timeAgo(t.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {meta && meta.total > meta.limit && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>Page {meta.page} of {Math.ceil(meta.total / meta.limit)} · {meta.total} tickets</span>
              <div className="flex gap-2">
                <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button className="btn-secondary" disabled={page * meta.limit >= meta.total} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, tone, onClick }: { label: string; value: number; tone?: 'red' | 'amber'; onClick: () => void }) {
  const color = tone === 'red' && value > 0 ? 'text-red-600' : tone === 'amber' && value > 0 ? 'text-amber-600' : 'text-slate-900';
  return (
    <button onClick={onClick} className="card p-4 text-left transition hover:border-leaf-500">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </button>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select aria-label={label} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => <option key={v + l} value={v}>{l}</option>)}
    </select>
  );
}
