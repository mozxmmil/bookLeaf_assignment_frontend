'use client';
import Link from 'next/link';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi, useTicketStream } from '@/lib/hooks';
import { CATEGORY_LABEL, date, dateTime, inr, PRIORITY_LABEL, STATUS_LABEL, timeAgo } from '@/lib/format';
import type { AdminTicket, Category, Priority, TicketStatus } from '@/lib/types';
import { ErrorBanner, LiveDot, PageLoader, PriorityBadge, Spinner, StatusBadge } from '@/components/ui';

type DraftState = { status: 'idle' | 'loading' | 'ready' | 'unavailable'; reason?: string };

export default function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: t, error, loading, reload, setData } = useApi<AdminTicket>(`/admin/tickets/${id}`);
  const [reply, setReply] = useState('');
  const [draft, setDraft] = useState<DraftState>({ status: 'idle' });
  const aiText = useRef<string | null>(null); // last AI draft, to tell if the admin sent it (edited or not)
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { connected } = useTicketStream((e) => { if (e.ticketId === Number(id) || e.ticketId === -1) reload(true); });

  const loadDraft = useCallback(async (refresh = false) => {
    setDraft({ status: 'loading' });
    try {
      const r = await api<{ draft: string | null; aiAvailable: boolean; reason?: string }>(`/admin/tickets/${id}/draft${refresh ? '?refresh=true' : ''}`, { method: 'POST' });
      if (r.data.draft) { aiText.current = r.data.draft; setReply(r.data.draft); setDraft({ status: 'ready' }); }
      else setDraft({ status: 'unavailable', reason: r.data.reason });
    } catch (e) {
      setDraft({ status: 'unavailable', reason: e instanceof ApiError ? e.message : undefined });
    }
  }, [id]);

  // Auto-draft when the ticket opens and still needs a reply (not for resolved/closed tickets).
  const autoDrafted = useRef(false);
  useEffect(() => {
    if (!t || autoDrafted.current) return;
    autoDrafted.current = true;
    const needsReply = (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && t.messages.at(-1)?.from !== 'bookleaf';
    if (needsReply) loadDraft();
  }, [t, loadDraft]);

  async function act(label: string, fn: () => Promise<{ data: AdminTicket } | unknown>, ok?: string) {
    setBusy(label); setActionError(null);
    try {
      const r = (await fn()) as { data?: AdminTicket };
      if (r?.data && 'messages' in r.data) setData(r.data); else await reload(true);
      if (ok) { setToast(ok); setTimeout(() => setToast(null), 2500); }
    } catch (e) { setActionError(e instanceof ApiError ? e.message : 'Action failed'); }
    finally { setBusy(null); }
  }

  const patch = (body: Partial<{ status: TicketStatus; category: Category; priority: Priority }>) =>
    act('patch', () => api<AdminTicket>(`/admin/tickets/${id}`, { method: 'PATCH', body }), 'Ticket updated');

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error.status === 404 ? 'Ticket not found.' : error.message} onRetry={() => reload()} />;
  if (!t) return null;

  const closed = t.status === 'CLOSED';
  const sendReply = () => act('reply', async () => {
    await api(`/admin/tickets/${id}/messages`, { method: 'POST', body: { body: reply, isAiAssisted: aiText.current !== null && draft.status === 'ready' } });
    setReply(''); aiText.current = null; setDraft({ status: 'idle' });
  }, 'Reply sent to author');

  return (
    <div>
      <Link href="/admin/tickets" className="text-sm text-slate-500 hover:text-slate-700">← Ticket queue</Link>
      <div className="mt-3 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t.subject}</h1>
          <p className="mt-1 text-sm text-slate-500">#{t.id} · opened {dateTime(t.createdAt)} ({timeAgo(t.createdAt)})</p>
        </div>
        <div className="flex items-center gap-3"><LiveDot connected={connected} /><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></div>
      </div>
      {toast && <div className="fixed right-6 bottom-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg" role="status">{toast}</div>}
      {actionError && <div className="mb-4"><ErrorBanner message={actionError} /></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Conversation + reply */}
        <div className="space-y-4">
          <Msg who={t.author.name} role="Author" at={t.createdAt} body={t.description} attachment={t.attachmentName} />
          {t.messages.map((m) => (
            <Msg key={m.id} who={m.senderName} role={m.from === 'author' ? 'Author' : 'BookLeaf'} at={m.createdAt} body={m.body} ai={m.isAiAssisted} staff={m.from === 'bookleaf'} />
          ))}

          {closed ? (
            <div className="card p-4 text-sm text-slate-500">This ticket is closed. Reopen it to reply.</div>
          ) : (
            <div className="card p-4" data-testid="reply-box">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="reply" className="text-sm font-medium text-slate-700">Reply to {t.author.name.split(' ')[0]}</label>
                <div className="flex items-center gap-2">
                  {draft.status === 'ready' && <span className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-700">🤖 AI draft — review before sending</span>}
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => loadDraft(true)} disabled={draft.status === 'loading'}>
                    {draft.status === 'loading' ? <Spinner className="h-3 w-3" /> : '↻'} {draft.status === 'idle' ? 'Generate AI draft' : 'Regenerate'}
                  </button>
                </div>
              </div>
              {draft.status === 'unavailable' && (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="ai-unavailable">
                  AI draft unavailable right now — please write the reply manually.{' '}
                  <button className="font-medium underline" onClick={() => loadDraft(true)}>Try again</button>
                </div>
              )}
              <div className="relative">
                <textarea id="reply" className="input min-h-56 leading-relaxed" value={reply} onChange={(e) => setReply(e.target.value)}
                  placeholder={draft.status === 'loading' ? '' : 'Write your reply…'} disabled={draft.status === 'loading'} />
                {draft.status === 'loading' && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-white/70 text-sm text-slate-500"><Spinner /> Drafting a reply from the knowledge base…</div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-400">Sending moves an Open ticket to In Progress and notifies the author instantly.</span>
                <button className="btn-primary" disabled={busy === 'reply' || reply.trim().length < 2} onClick={sendReply}>
                  {busy === 'reply' && <Spinner className="h-4 w-4 text-white" />} Send reply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Context panel */}
        <aside className="space-y-4" data-testid="context-panel">
          <Panel title="Triage">
            <Row label="Status">
              <select aria-label="Status" className="input" value={t.status} onChange={(e) => patch({ status: e.target.value as TicketStatus })} disabled={busy === 'patch'}>
                {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Row>
            <Row label={<>Category {aiTag(t.ai.categoryOverridden, t.ai.source)}</>}>
              <select aria-label="Category" className="input" value={t.category ?? ''} onChange={(e) => patch({ category: e.target.value as Category })}>
                {!t.category && <option value="">Unclassified</option>}
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </Row>
            <Row label={<>Priority {aiTag(t.ai.priorityOverridden, t.ai.source)}</>}>
              <select aria-label="Priority" className="input" value={t.priority ?? ''} onChange={(e) => patch({ priority: e.target.value as Priority })}>
                {!t.priority && <option value="">Unscored</option>}
                {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </Row>
            {t.ai.reason && <p className="text-xs text-slate-500">🤖 {t.ai.reason}</p>}
            {(t.ai.categoryOverridden || t.ai.priorityOverridden) && t.ai.category && (
              <p className="text-xs text-slate-400">AI suggested: {CATEGORY_LABEL[t.ai.category]} / {t.ai.priority && PRIORITY_LABEL[t.ai.priority]}</p>
            )}
            {t.ai.source !== 'llm' && (
              <button className="text-xs font-medium text-leaf-600 underline" onClick={() => act('reclassify', () => api(`/admin/tickets/${id}/reclassify`, { method: 'POST' }), 'Re-classified')}>
                {busy === 'reclassify' ? 'Re-classifying…' : 'Retry AI classification'}
              </button>
            )}
            <Row label="Assignee">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{t.assignee?.name ?? 'Unassigned'}</span>
                {t.assignee?.id !== user?.id && (
                  <button className="btn-secondary px-3 py-1 text-xs" onClick={() => act('assign', () => api(`/admin/tickets/${id}/assign`, { method: 'POST' }), 'Assigned to you')}>Assign to me</button>
                )}
              </div>
            </Row>
          </Panel>

          <Panel title="Author">
            <p className="text-sm font-medium text-slate-800">{t.author.name}</p>
            <p className="text-xs text-slate-500">{t.author.email}{t.author.city && ` · ${t.author.city}`}</p>
            {t.otherOpenTickets.length > 0 && (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <p className="text-xs text-slate-500">Other open tickets:</p>
                {t.otherOpenTickets.map((o) => <Link key={o.id} href={`/admin/tickets/${o.id}`} className="block truncate text-xs text-leaf-600 hover:underline">#{o.id} {o.subject}</Link>)}
              </div>
            )}
          </Panel>

          <Panel title="Book">
            {t.book ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt className="col-span-2 text-sm font-medium text-slate-800">{t.book.title}</dt>
                <Dt k="Status" v={t.book.status} /><Dt k="ISBN" v={t.book.isbn ?? '— (in production)'} />
                <Dt k="Published" v={date(t.book.publicationDate)} /><Dt k="MRP" v={inr(t.book.mrp)} />
                <Dt k="Copies sold" v={t.book.copiesSold.toLocaleString('en-IN')} /><Dt k="Earned" v={inr(t.book.royaltyEarned)} />
                <Dt k="Paid" v={inr(t.book.royaltyPaid)} /><Dt k="Pending" v={inr(t.book.royaltyPending)} />
              </dl>
            ) : <p className="text-sm text-slate-500">General / account-level query</p>}
          </Panel>

          <NotesPanel ticket={t} onAdd={(body) => act('note', () => api(`/admin/tickets/${id}/notes`, { method: 'POST', body: { body } }), 'Note added')} busy={busy === 'note'} />
        </aside>
      </div>
    </div>
  );
}

const aiTag = (overridden: boolean, source: string | null) =>
  overridden ? <span className="ml-1 rounded bg-slate-100 px-1.5 text-[10px] font-normal text-slate-500">edited</span>
    : source === 'llm' ? <span className="ml-1 rounded bg-violet-50 px-1.5 text-[10px] font-normal text-violet-600">AI</span>
    : source === 'rules' ? <span className="ml-1 rounded bg-amber-50 px-1.5 text-[10px] font-normal text-amber-600">auto (rules)</span> : null;

function Msg({ who, role, at, body, attachment, ai, staff }: { who: string; role: string; at: string; body: string; attachment?: string | null; ai?: boolean; staff?: boolean }) {
  return (
    <div className={`card p-4 ${staff ? 'border-leaf-100 bg-leaf-50/40' : ''}`}>
      <p className="mb-1.5 text-xs text-slate-500"><strong className="text-slate-700">{who}</strong> · {role} · {dateTime(at)}{ai && ' · 🤖 AI-assisted'}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{body}</p>
      {attachment && <p className="mt-2 text-xs text-slate-500">📎 {attachment} (attachment upload not enabled in demo)</p>}
    </div>
  );
}

function NotesPanel({ ticket, onAdd, busy }: { ticket: AdminTicket; onAdd: (b: string) => Promise<void>; busy: boolean }) {
  const [note, setNote] = useState('');
  return (
    <Panel title="🔒 Internal notes">
      <p className="-mt-1 mb-2 text-xs text-slate-400">Visible to BookLeaf staff only.</p>
      <div className="space-y-2">
        {ticket.notes.length === 0 && <p className="text-xs text-slate-400">No notes yet.</p>}
        {ticket.notes.map((n) => (
          <div key={n.id} className="rounded-lg bg-amber-50 px-3 py-2 text-xs"><p className="text-slate-700">{n.body}</p><p className="mt-1 text-slate-400">{n.adminName} · {timeAgo(n.createdAt)}</p></div>
        ))}
      </div>
      <textarea aria-label="New internal note" className="input mt-2 min-h-16 text-xs" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team…" />
      <button className="btn-secondary mt-2 w-full py-1.5 text-xs" disabled={busy || !note.trim()} onClick={async () => { await onAdd(note); setNote(''); }}>Add note</button>
    </Panel>
  );
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="card space-y-3 p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>{children}</section>
);
const Row = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div><p className="mb-1 text-xs text-slate-500">{label}</p>{children}</div>
);
const Dt = ({ k, v }: { k: string; v: string }) => (<div><dt className="text-slate-400">{k}</dt><dd className="font-medium text-slate-700">{v}</dd></div>);
