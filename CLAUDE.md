@AGENTS.md

# uzbecano_pos — the till (Tauri desktop + PWA)

React 18 + Vite 6 + TypeScript + Tailwind 3; Tauri 2 wraps the same build for
Windows. Talks only to the backend in `../uzbecano` (`API_BASE_URL`,
`src/constants/`). When a change needs a new API field, the backend deploys
first — an old server ignores unknown fields and the till fails silently.

The café's real till is the **desktop app** (nginx sees `Referer:
http://tauri.localhost/`). Waiters' phones use the PWA.

## Commands
- Tests: `npm test` · one file: `npx vitest run src/lib/<name>.test.ts`
- Types: `npm run typecheck` · Build: `npm run build`
- Receipt preview without a printer: `npm run chek`
- CI (`.github/workflows/ci.yml`) runs typecheck, test, build on `main`.

## Where things live
`src/App.tsx` is ~3.5k lines and owns state and network calls. Rules do NOT
go there — a rule inside the component is untestable and drifts from its
copies. Put them in `src/lib/` with a colocated `*.test.ts`, and let App wire
ports in:

| Rule | File |
|---|---|
| Offline sync cycle (retry / park / done) | `syncCycle.ts`, `syncQueue.ts` |
| Server-rejected actions: who/why/when | `failedActions.ts` + `RejectedActionsModal` |
| Merging server orders with local ones | `orderMerge.ts` |
| Table busy / locked / not-yet-synced | `floorPlan.ts` |
| Outgoing item shape, add-items body | `orderItems.ts` (`appendItemsPatch`) |
| Payment split, promo, cash report | `payment.ts`, `promo.ts`, `cashReport.ts` |
| Storage (never `localStorage` directly) | `storage.ts`, `kvStore.ts` |
| i18n | `src/lib/i18n/dictionaries/{uz,ru,en}.ts` — uz defines the key type, so `tsc` catches a missing translation |

## Invariants that have cost money when broken
- `sync_queue` = retryable; `sync_failed` = rejected by the server, never
  auto-retried. Read BOTH when deciding whether an order exists only locally
  (`unsyncedOrderIds`). A local order still in either list is never deleted.
- `409` from the server is retryable, not a rejection.
- Adding items to an open order sends only the new items
  (`{ addItems, appendKey }`); the key is queued with the body so a retry
  cannot add twice. Never send the full list for an addition.
- Every enqueue records `actor` (the logged-in waiter) — staff disputes are
  settled from it.
- Totals shown for payment must equal the server's; prefer the server's
  order from the response over the local estimate.

## Release — two independent paths
1. **Desktop**: `npm version X.Y.Z --no-git-tag-version`, commit
   `chore(release): X.Y.Z`, push, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
   Only a `v*` tag publishes; tills install it on their own. Tills on 1.4.2 or
   older cannot self-update. Confirm with
   `curl -sL https://github.com/ecthelion-dev/uzbecano_pos/releases/latest/download/latest.json`
   (GitHub API is often rate-limited here; `releases/expanded_assets/vX.Y.Z` works).
2. **PWA**: on the VPS, `bash /var/www/uzbecano_pos/scripts/deploy-pwa.sh`.
   A tag does not touch it; `vercel.json` is unused.
Tagging auto-installs on every till — ask before tagging.

## Git
- Conventional commits: `type(scope): english summary`, body in Uzbek with
  the incident behind the change. Work lands on `main`.
