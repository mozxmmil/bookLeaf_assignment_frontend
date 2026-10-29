'use client';
import Link from 'next/link';
import { useApi } from '@/lib/hooks';
import { date, inr, PRODUCTION_STAGES, stageIndex } from '@/lib/format';
import type { Book, BookTotals } from '@/lib/types';
import { EmptyState, ErrorBanner, PageHeader, PageLoader } from '@/components/ui';

export default function MyBooksPage() {
  const { data: books, meta, error, loading, reload } = useApi<Book[]>('/books');
  const totals: BookTotals | undefined = meta?.totals;

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error.message} onRetry={() => reload()} />;

  return (
    <>
      <PageHeader title="My Books" subtitle="Sales and royalty details for every title you've published with BookLeaf." />
      {totals && books!.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Copies sold" value={totals.copiesSold.toLocaleString('en-IN')} />
          <Stat label="Royalty earned" value={inr(totals.royaltyEarned)} />
          <Stat label="Royalty paid" value={inr(totals.royaltyPaid)} />
          <Stat label="Royalty pending" value={inr(totals.royaltyPending)} highlight />
        </div>
      )}
      {books!.length === 0 ? (
        <EmptyState title="No books yet" body="Once your first book enters production it will appear here." />
      ) : (
        <div className="space-y-4">{books!.map((b) => <BookCard key={b.id} book={b} />)}</div>
      )}
      <p className="mt-6 text-xs text-slate-400">
        Royalties are calculated quarterly and paid within 45 days of the quarter ending. Balances under ₹1,000 roll over to the next quarter.
      </p>
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card p-4 ${highlight ? 'border-leaf-100 bg-leaf-50' : ''}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${highlight ? 'text-leaf-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function BookCard({ book: b }: { book: Book }) {
  const stage = stageIndex(b.status);
  return (
    <div className="card p-5" data-testid="book-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{b.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {b.genre ?? '—'} · ISBN {b.isbn ?? <span className="italic">assigned during production</span>}
            {b.mrp > 0 && <> · MRP {inr(b.mrp)}</>}
            {b.publicationDate && <> · Published {date(b.publicationDate)}</>}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{b.status}</span>
      </div>

      {b.isPublished ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm md:grid-cols-4">
            <Field label="Copies sold" value={b.copiesSold.toLocaleString('en-IN')} />
            <Field label="Royalty earned" value={inr(b.royaltyEarned)} />
            <Field label="Royalty paid" value={inr(b.royaltyPaid)} />
            <Field label="Royalty pending" value={inr(b.royaltyPending)}
              hint={b.belowPayoutThreshold ? 'Below ₹1,000 minimum — rolls over to next quarter' : b.copiesSold === 0 ? 'No sales recorded yet' : undefined} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {[
              b.royaltyPerCopy !== null && `${inr(b.royaltyPerCopy)} royalty per copy`,
              `Last payout: ${b.lastPayoutDate ? date(b.lastPayoutDate) : 'none yet'}`,
              b.printPartner && `Printed by ${b.printPartner}`,
            ].filter(Boolean).join(' · ')}
          </p>
          {b.availableOn.length > 0 && <p className="mt-1 text-xs text-slate-500">Available on {b.availableOn.join(', ')}</p>}
        </>
      ) : (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex gap-1" aria-label={`Production stage ${stage + 1} of ${PRODUCTION_STAGES.length}`}>
            {PRODUCTION_STAGES.map((s, i) => (
              <div key={s} title={s} className={`h-1.5 flex-1 rounded-full ${i <= stage ? 'bg-leaf-500' : 'bg-slate-200'}`} />
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Currently in <strong className="text-slate-700">{stage >= 0 ? PRODUCTION_STAGES[stage] : b.status}</strong>. Sales and royalty figures will appear once your book is live.
          </p>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Link href={`/author/tickets/new?bookId=${b.id}`} className="text-sm font-medium text-leaf-600 hover:text-leaf-700">Ask about this book →</Link>
      </div>
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-amber-600">{hint}</p>}
    </div>
  );
}
