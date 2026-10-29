'use client';
import Link from 'next/link';
import { use, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useApi, useTicketStream } from '@/lib/hooks';
import { dateTime } from '@/lib/format';
import type { AuthorTicket } from '@/lib/types';
import { ErrorBanner, LiveDot, PageLoader, Spinner, StatusBadge } from '@/components/ui';

export default function AuthorTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const justCreated = useSearchParams().get('created');
  const { data: t, error, loading, reload } = useApi<AuthorTicket>(`/tickets/${id}`);
  // Live updates: refetch silently whenever this ticket changes (admin reply, status change).
  const { connected } = useTicketStream((e) => { if (e.ticketId === Number(id) || e.ticketId === -1) reload(true); });

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error.status === 404 ? 'Ticket not found.' : error.message} onRetry={() => reload()} />;
  if (!t) return null;

  return (
    <div className="max-w-3xl">
      <Link href="/author/tickets" className="text-sm text-slate-500 hover:text-slate-700">← All tickets</Link>
      {justCreated && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Thanks — we&apos;ve received your query. You&apos;ll see our reply here as soon as it&apos;s sent (no need to refresh).
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t.subject}</h1>
          <p className="mt-1 text-sm text-slate-500">#{t.id} · {t.book?.title ?? 'General / Account'} · opened {dateTime(t.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3"><LiveDot connected={connected} /><StatusBadge status={t.status} /></div>
      </div>

      <div className="mt-6 space-y-4" data-testid="thread">
        <Bubble from="author" name="You" at={t.createdAt} body={t.description} attachment={t.attachmentName} />
        {t.messages.map((m) => <Bubble key={m.id} from={m.from} name={m.from === 'author' ? 'You' : m.senderName} at={m.createdAt} body={m.body} />)}
        {t.messages.every((m) => m.from === 'author') && t.status !== 'CLOSED' && (
          <p className="text-center text-sm text-slate-400">Our support team will reply here shortly.</p>
        )}
      </div>

      {t.status !== 'CLOSED' ? <ReplyBox ticketId={t.id} onSent={() => reload(true)} /> : (
        <p className="mt-6 text-center text-sm text-slate-500">This ticket is closed. <Link href="/author/tickets/new" className="text-leaf-600 underline">Raise a new query</Link> if you need more help.</p>
      )}
    </div>
  );
}

function Bubble({ from, name, at, body, attachment }: { from: 'author' | 'bookleaf'; name: string; at: string; body: string; attachment?: string | null }) {
  const mine = from === 'author';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'bg-leaf-600 text-white' : 'card'}`} data-testid={`msg-${from}`}>
        <p className={`mb-1 text-xs ${mine ? 'text-leaf-100' : 'text-slate-500'}`}>{name} · {dateTime(at)}</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
        {attachment && <p className={`mt-2 text-xs ${mine ? 'text-leaf-100' : 'text-slate-500'}`}>📎 {attachment}</p>}
      </div>
    </div>
  );
}

function ReplyBox({ ticketId, onSent }: { ticketId: number; onSent: () => void }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true); setErr(null);
    try {
      await api(`/tickets/${ticketId}/messages`, { method: 'POST', body: { body } });
      setBody(''); onSent();
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not send'); }
    finally { setSending(false); }
  }
  return (
    <form onSubmit={send} className="card mt-6 p-4">
      <label htmlFor="reply" className="label">Add more details</label>
      <textarea id="reply" className="input min-h-24" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a follow-up message…" />
      {err && <p className="field-error">{err}</p>}
      <div className="mt-2 flex justify-end">
        <button className="btn-primary" disabled={sending || body.trim().length < 2}>{sending && <Spinner className="h-4 w-4 text-white" />} Send</button>
      </div>
    </form>
  );
}
