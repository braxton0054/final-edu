# In-app communication channel

The platform's own messaging: staff write to audiences, parents read and reply
in their inbox. This is the system of record — WhatsApp/email are delivery
channels on top (see `lib/notifications`).

## Model

- `Conversation` — one thread: school, title, audience (`all_parents`/`class`/`users`), author.
- `ConversationMember` — who sees the thread + `lastReadAt` (drives unread counts).
- `ConversationMessage` — the posts, ordered oldest-first.
- `StudentGuardian` — links parent logins to children; audience targeting
  resolves through it. Membership is snapshotted at send time.

Migration: `packages/database/prisma/migrations/*_messaging/migration.sql`.

## Flow

1. School admin creates parent logins at **Parents** (email + temporary
   password, children linked by admission number). Parents sign in through the
   normal login page and land in **Parent Portal → Inbox**.
2. Staff compose at **Messages**: subject + audience (whole school, one class,
   resolved live) + body. The first post creates the thread; everyone in the
   audience becomes a member.
3. Parents open threads, read, and reply. Both sides poll every few seconds;
   opening a thread marks it read.
4. Feature modules call `notify({ schoolId, event, parentUserId?, audience?, … })`
   which posts to the inbox by default (`channels: ["inapp"]`, WhatsApp kept
   for later via `channels: ["whatsapp"]`).

## Teacher portal (assignment-scoped)

Teachers sign in with `TEACHER` logins (created on the staff Teachers page and
linked to a teacher row). Everything they see resolves via `TeacherAssignment`
(class + learning area + class/subject role): assigned classes, rosters,
member-only threads, and compose limited to their classes' parents. No
assignment = no access — never whole-school fallback. Staff manage assignments
on the Teachers page.

## Parent portal (mobile-first)

Bottom-tab layout: Home (greeting, children with live fee balances, quick
actions, recent threads), Children (profiles + per-child invoices/payments),
Fees (per-child and total statements — online payment arrives with the
school's M-Pesa setup), Messages (existing inbox), Profile (account, children,
sign out). Every read filters by the parent's linked children; attendance,
results, assignments, and report cards arrive with those modules.

## Isolation

- Every query filters by `schoolId` from the verified session.
- Staff (`SCHOOL_ADMIN`/`STAFF`) see their school's threads; parents see only
  threads they belong to (`getConversationFor` enforces this on every read
  and write, API and UI alike).
- Parent accounts are created by the school — no self-registration, no
  cross-school visibility. Rate limits apply to compose and replies.
