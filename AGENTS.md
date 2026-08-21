<!-- BEGIN:pos-agent-rules -->
# POS System Engineering Rules (uzbecano_pos)

SYSTEM MODE: TOKEN OPTIMIZATION

Your primary goal is to minimize token usage.

Rules:
- Do exactly what I ask—nothing more.
- Never explain your reasoning.
- Never summarize.
- Never generate documentation unless explicitly requested.
- Never create README, markdown files, or implementation plans.
- Never repeat code already shown.
- Never regenerate unchanged files.
- Modify only the necessary code.
- Prefer editing existing code over creating new files.
- Reuse existing functions and components whenever possible.
- Do not refactor unrelated code.
- Do not suggest improvements unless requested.
- Do not add comments unless necessary.
- Do not include introductions or conclusions.
- If a command or code snippet is sufficient, output only that.
- If the request is ambiguous, ask one short clarifying question.
- Keep responses as short as possible while remaining correct.
- Assume the existing project structure and previous context are valid unless told otherwise.

Priority:
1. Correctness
2. Minimal output
3. Minimal token usage
<!-- END:pos-agent-rules -->

# POS Client Architecture Guidelines (uzbecano_pos)

## 1. Stack & Architecture
- **Delivery**: installable PWA (React, Vite, TypeScript) served from pos.orderplus.uz. No native shell — a fix reaches every till on the next reload.
- **Offline**: service worker for the app shell, `localStorage` for the menu cache and the sync queue. `/api/` is never cached: a stale answer about orders or tables is worse than a visible error.
- **Printing**: ESC/POS over Web Serial or Web Bluetooth (`src/lib/printer.ts`), with the browser print dialog as the fallback for a printer the operating system owns.

## 2. Local-First, Schema Migration & Offline Synchronization
- **Offline First**: All critical POS functions (cart, checkout, receipt generation, table management) must operate smoothly without active internet.
- **SQLite Versioning & Migrations**: Schema versioning and deterministic local migrations are mandatory.
- **Backup, Integrity & Rollback**: Automatic backup before app updates, integrity checks (`PRAGMA integrity_check`) after migration, and an explicit rollback/recovery strategy are required.
- **Zero Data Loss**: Migrations must never cause data loss; never overwrite existing local/production user databases without verified backups.
- **Sync Engine & Conflict Resolution**: Mutations performed offline must be queued locally with deterministic IDs and synced idempotently when online. Resolve general conflicts with server-authoritative timestamps.
- **Payment/Refund Conflicts**: Payment and refund conflicts must never be automatically overwritten and must retain a manual review status.
- **Mandatory Offline Testing**: Offline network drops, retries, duplicate submission prevention, sync conflicts, unexpected app restarts, and printer failures must be thoroughly tested.

## 3. Hardware & Peripheral Safety
- **Printer & Hardware**: Isolate receipt/kitchen printer drivers and ESC-POS formatting routines. Handle printer disconnections, paper-out errors, and timeouts gracefully without crashing the renderer.
- **Cash Drawer & Barcode Scanner**: Handle serial/USB scanner inputs cleanly with debouncing and focus-independent listener safety.

## 4. Security, Auth & Data Integrity Rules
- **Operator Auth & Session Policy**: Cashier PIN authentication, waiter switching, lock screen, and idle timeouts must strictly adhere to server and session policies.
- **Lock & Logout Sanitization**: On lock or logout, sensitive order, payment, and operator session state must be cleared from the active renderer so it is never exposed to the next user.
- **No Direct Secrets**: Never store unencrypted sensitive tokens or private keys in localStorage or plaintext config files.
- **Calculation Integrity**: Verify calculations, discounts, split bills, and totals with strict arithmetic validation.
- **Idempotency & Audit Logs**: Local transactions, refunds, cancellations, discount overrides, and cash register open/close events must be logged with timestamp and user ID.
- **Production Data Protection**: Never run destructive operations against local databases or backend sync targets.
- **Minimal Scope**: Keep code changes scoped strictly to the requested feature or fix.
