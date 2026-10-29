'use client';
import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import type { Book } from '@/lib/types';
import { PageHeader, Spinner } from '@/components/ui';

function NewTicketForm() {
  const router = useRouter();
  const preselected = useSearchParams().get('bookId') ?? 'general';
  const { data: books } = useApi<Book[]>('/books');
  const [bookId, setBookId] = useState(preselected);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true); setErrors({}); setFormError(null);
    try {
      const r = await api<{ id: number }>('/tickets', {
        method: 'POST',
        // Attachment is UI-only per the brief: we record the file name; real upload would go to object storage.
        body: { bookId: bookId === 'general' ? null : bookId, subject, description, attachmentName: file?.name ?? null },
      });
      router.push(`/author/tickets/${r.data.id}?created=1`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setErrors(err.fieldErrors());
      setFormError(err instanceof ApiError ? err.message : 'Could not submit your query');
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Raise a query" subtitle="Tell us what's going on — the more detail you share, the faster we can help." />
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-5 p-6" noValidate>
        <div>
          <label className="label" htmlFor="book">Which book is this about?</label>
          <select id="book" className="input" value={bookId} onChange={(e) => setBookId(e.target.value)}>
            <option value="general">General / Account level</option>
            {books?.map((b) => <option key={b.id} value={b.id}>{b.title}{b.isPublished ? '' : ` (${b.status})`}</option>)}
          </select>
          {errors.bookId && <p className="field-error">{errors.bookId}</p>}
        </div>
        <div>
          <label className="label" htmlFor="subject">Subject</label>
          <input id="subject" className="input" maxLength={150} placeholder="e.g. Royalty for last quarter not received"
            value={subject} onChange={(e) => setSubject(e.target.value)} />
          {errors.subject && <p className="field-error">{errors.subject}</p>}
        </div>
        <div>
          <label className="label" htmlFor="description">Details</label>
          <textarea id="description" className="input min-h-40" maxLength={5000}
            placeholder="Describe the issue — dates, order numbers, platform (Amazon/Flipkart), what you expected vs what happened."
            value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex justify-between">
            {errors.description ? <p className="field-error">{errors.description}</p> : <span />}
            <span className="mt-1 text-xs text-slate-400">{description.length}/5000</span>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="file">Attachment <span className="font-normal text-slate-400">(optional — e.g. photo of a misprint)</span></label>
          <input id="file" type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-leaf-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-leaf-700" />
        </div>
        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting && <Spinner className="h-4 w-4 text-white" />} Submit query</button>
        </div>
      </form>
    </>
  );
}

export default function NewTicketPage() {
  return <Suspense><NewTicketForm /></Suspense>;
}
