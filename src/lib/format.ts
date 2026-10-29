import type { Category, Priority, TicketStatus } from './types';

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const date = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const dateTime = (s: string) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function timeAgo(s: string) {
  const mins = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
export const hoursSince = (s: string) => (Date.now() - new Date(s).getTime()) / 3600_000;

export const STATUS_LABEL: Record<TicketStatus, string> = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed' };
export const STATUS_STYLE: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-50 text-blue-700 ring-blue-200', IN_PROGRESS: 'bg-violet-50 text-violet-700 ring-violet-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200', CLOSED: 'bg-slate-100 text-slate-600 ring-slate-200',
};
export const PRIORITY_LABEL: Record<Priority, string> = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
export const PRIORITY_STYLE: Record<Priority, string> = {
  CRITICAL: 'bg-red-50 text-red-700 ring-red-200', HIGH: 'bg-orange-50 text-orange-700 ring-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200', LOW: 'bg-slate-100 text-slate-600 ring-slate-200',
};
export const CATEGORY_LABEL: Record<Category, string> = {
  ROYALTY_PAYMENTS: 'Royalty & Payments', ISBN_METADATA: 'ISBN & Metadata', PRINTING_QUALITY: 'Printing & Quality',
  DISTRIBUTION_AVAILABILITY: 'Distribution & Availability', BOOK_STATUS_PRODUCTION: 'Book Status & Production', GENERAL_INQUIRY: 'General Inquiry',
};

export const PRODUCTION_STAGES = ['Manuscript Received', 'Editing', 'Cover Design', 'Typesetting', 'Proofreading', 'ISBN Assignment', 'Printing', 'Distribution Setup', 'Published & Live'];
/** Works for a bare stage ("Typesetting") and the dataset's form ("In Production - Typesetting"). */
export function stageIndex(status: string) {
  const i = PRODUCTION_STAGES.findIndex((s) => status.toLowerCase().includes(s.toLowerCase()));
  return i >= 0 ? i : /published|live/i.test(status) ? PRODUCTION_STAGES.length - 1 : -1;
}
