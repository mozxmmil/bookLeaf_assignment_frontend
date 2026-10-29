# BookLeaf Author Support Portal: Frontend

Next.js web app for the BookLeaf Author Support & Communication Portal. It contains the **author portal** (books, royalties, support tickets) and the **admin portal** (ticket queue, AI-assisted triage and replies).

> **Full project documentation is in the backend repo:** [`bookLeaf_assignment_backend`](https://github.com/mozxmmil/bookLeaf_assignment_backend).
> It has the README (features, architecture, AI design), `WRITEUP.md`, `DEPLOYMENT.md` and the API docs.

| | |
|---|---|
| **Live demo** | https://book-leaf-assignment-frontend.vercel.app |
| **Live API** | https://api-assignments.muzammil.live · [Swagger docs](https://api-assignments.muzammil.live/api/docs) |
| **Backend / API** | [`bookLeaf_assignment_backend`](https://github.com/mozxmmil/bookLeaf_assignment_backend) |
| **Stack** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4 |

### Test credentials

Sign in on the live demo with any of these:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@bookleaf.com` | `admin123` |
| Author (2 published books) | `priya.sharma@email.com` | `author123` |
| Author (one book in production, one under the ₹1,000 payout minimum) | `kavita.deshmukh@email.com` | `author123` |

## Run locally

Start the backend first (see its README). It serves the API on `http://localhost:4000`.

```bash
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` is the only setting. It is read in `src/lib/api.ts`.

## Structure

```
src/
├── app/
│   ├── login/                  # sign in (redirects by role)
│   ├── author/books/           # My Books: royalties, production stage tracker
│   ├── author/tickets/         # My Tickets, new ticket form, ticket thread
│   └── admin/tickets/          # ticket queue with filters, ticket detail with AI draft
├── components/                 # AppShell (nav + role guard), shared UI pieces
└── lib/
    ├── api.ts                  # fetch wrapper: base URL, Bearer token, error handling
    ├── auth.tsx                # auth context, role-based redirects
    ├── hooks.ts                # useApi (data loading), useTicketStream (live updates over SSE)
    ├── format.ts               # currency/date formatting, labels, production stages
    └── types.ts                # API response types
```

- **Auth:** the JWT from `/auth/login` is kept in `localStorage` and sent as a `Bearer` header. This works when the frontend and API are on different domains (Vercel and the API's own domain) without third-party cookies.
- **Live updates:** `useTicketStream` opens an `EventSource` to `/api/v1/stream`. New tickets, replies and status changes appear without a refresh. If the stream drops, the hook polls every 15 s until it reconnects.

## Deploy on Vercel

1. Import this repo in Vercel. The framework (Next.js) is detected automatically; leave the root directory as is.
2. Add the environment variable `NEXT_PUBLIC_API_URL=https://api-assignments.muzammil.live` (your backend's HTTPS URL).
3. Deploy. `NEXT_PUBLIC_*` values are built into the bundle, so **redeploy** after changing one.
4. Set the backend's `CLIENT_ORIGIN` to this Vercel URL exactly, or the browser will block requests (CORS).

Backend and VPS setup: see `DEPLOYMENT.md` in the backend repo.

## Keep this repo private
The assignment must not be public. Add BookLeaf as a collaborator: GitHub → Settings → Collaborators.
