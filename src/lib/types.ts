export type Role = 'AUTHOR' | 'ADMIN';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Category = 'ROYALTY_PAYMENTS' | 'ISBN_METADATA' | 'PRINTING_QUALITY' | 'DISTRIBUTION_AVAILABILITY' | 'BOOK_STATUS_PRODUCTION' | 'GENERAL_INQUIRY';

export interface User { id: string; role: Role; name: string; email: string; authorId: string | null }

export interface Book {
  id: string; title: string; isbn: string | null; genre: string | null; publicationDate: string | null;
  status: string; isPublished: boolean; mrp: number; copiesSold: number;
  royaltyEarned: number; royaltyPaid: number; royaltyPending: number; belowPayoutThreshold: boolean;
  royaltyPerCopy: number | null; lastPayoutDate: string | null; printPartner: string | null; availableOn: string[];
}
export interface BookTotals { copiesSold: number; royaltyEarned: number; royaltyPaid: number; royaltyPending: number }

export interface Message { id: number; from: 'author' | 'bookleaf'; senderName: string; body: string; isAiAssisted?: boolean; createdAt: string }

export interface AuthorTicketSummary {
  id: number; subject: string; status: TicketStatus; createdAt: string; updatedAt: string;
  book: { id: string; title: string } | null; replyCount: number; lastMessageAt: string | null;
}
export interface AuthorTicket {
  id: number; subject: string; description: string; status: TicketStatus; attachmentName: string | null;
  book: { id: string; title: string } | null; createdAt: string; updatedAt: string; messages: Message[];
}

export interface AdminTicketSummary {
  id: number; subject: string; status: TicketStatus; category: Category | null; priority: Priority | null;
  aiStatus: 'PENDING' | 'DONE' | 'FAILED'; author: { id: string; name: string; email: string };
  book: { id: string; title: string } | null; assignee: { id: string; name: string } | null;
  awaitingReply: boolean; createdAt: string; updatedAt: string;
}
export interface AdminTicket {
  id: number; subject: string; description: string; status: TicketStatus; attachmentName: string | null;
  category: Category | null; priority: Priority | null;
  ai: { status: string; source: 'llm' | 'rules' | null; category: Category | null; priority: Priority | null; reason: string | null;
        categoryOverridden: boolean; priorityOverridden: boolean; enabled: boolean; hasCachedDraft: boolean };
  author: { id: string; name: string; email: string; city: string | null; country: string | null; joinedDate: string | null };
  book: Book | null; assignee: { id: string; name: string } | null;
  messages: Message[]; notes: { id: number; body: string; adminName: string; createdAt: string }[];
  otherOpenTickets: { id: number; subject: string; status: TicketStatus }[];
  createdAt: string; updatedAt: string; resolvedAt: string | null;
}
export interface Stats {
  byStatus: Record<TicketStatus, number>; openByPriority: Record<Priority | 'UNCLASSIFIED', number>;
  assignedToMe: number; olderThan48h: number; ai: { enabled: boolean; classified: number; catOverrides: number; prioOverrides: number };
}
