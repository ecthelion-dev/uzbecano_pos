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
- **Delivery, two ways from one codebase**: a React + Vite + TypeScript app shipped both as an installable PWA at pos.orderplus.uz and as a Tauri 2 desktop build (`src-tauri/`, Windows NSIS/MSI and macOS dmg, released on a git tag). The web build is the fast path — a fix reaches every till on the next reload; the desktop build exists for tills that need a real window and OS-owned printers. Anything added must work in both, and the desktop origins (`tauri://localhost`, `http://tauri.localhost`) are on the backend CORS allowlist for exactly that reason.
- **Offline**: service worker for the app shell, `localStorage` for the menu cache and the sync queue. `/api/` is never cached: a stale answer about orders or tables is worse than a visible error.
- **Printing**: ESC/POS over Web Serial or Web Bluetooth (`src/lib/printer.ts`), with the browser print dialog as the fallback for a printer the operating system owns.

## 2. Local-First & Offline Synchronization
- **Offline First**: All critical POS functions (cart, checkout, receipt generation, table management) must operate smoothly without active internet.
- **There is no local SQLite**: local state is `localStorage` only — the menu cache, the sync queue, the offline credential cache (`src/lib/offlineAuth.ts`), and the printer settings. This section used to mandate SQLite schema versioning, deterministic migrations and `PRAGMA integrity_check`; none of that exists or applies, and writing to a rule that describes no code is how a checklist stops being read. If a local database is ever introduced, restore those rules with it.
- **Versioned local records**: a stored shape that can change carries a version number and is discarded rather than guessed at when it does not match — `offlineAuth.ts` `SCHEMA_VERSION` is the pattern. Dropping a stale record is safe here precisely because none of this is the system of record; the server is.
- **Zero Data Loss where it counts**: the sync queue is the one local store whose loss costs money. Never clear it except after a confirmed server acknowledgement.
- **Sync Engine & Conflict Resolution**: Mutations performed offline must be queued locally with deterministic IDs (`crypto.randomUUID()` at creation, reused as the `idempotencyKey`) and synced idempotently when online. Resolve general conflicts with server-authoritative timestamps.
- **Payment/Refund Conflicts**: Payment and refund conflicts must never be automatically overwritten and must retain a manual review status.
- **Mandatory Offline Testing**: Offline network drops, retries, duplicate submission prevention, sync conflicts, unexpected app restarts, and printer failures must be tested. Run with `npm test`; pure logic (offline auth, sync queue, receipt math) is tested directly, and anything that cannot be reached without a browser is stated as such rather than skipped silently.

## 3. Hardware & Peripheral Safety
- **Printer & Hardware**: Isolate receipt/kitchen printer drivers and ESC-POS formatting routines. Handle printer disconnections, paper-out errors, and timeouts gracefully without crashing the renderer.
- **Cash Drawer & Barcode Scanner**: Handle serial/USB scanner inputs cleanly with debouncing and focus-independent listener safety.

## 4. Security, Auth & Data Integrity Rules
- **Operator Auth & Session Policy**: Cashier PIN authentication and waiter switching must strictly adhere to server and session policies. There is deliberately **no idle auto-logout**: a till left alone for a few minutes is normal service, and the timer only ever fired mid-order. The session is bounded by `sessionStorage` (dies when the app closes) and the server token's own lifetime — do not reintroduce an inactivity timer.
- **Logout Sanitization**: On logout, sensitive order, payment, and operator session state must be cleared from the active renderer so it is never exposed to the next user.
- **No Direct Secrets**: Never store unencrypted sensitive tokens or private keys in localStorage or plaintext config files.
- **Calculation Integrity**: Verify calculations, discounts, split bills, and totals with strict arithmetic validation.
- **Idempotency & Audit Logs**: Local transactions, refunds, cancellations, discount overrides, and cash register open/close events must be logged with timestamp and user ID.
- **Production Data Protection**: Never run destructive operations against local databases or backend sync targets.
- **Minimal Scope**: Keep code changes scoped strictly to the requested feature or fix.

## Yetkazish

Kassa ikki yo'l bilan yetkaziladi va ular **mustaqil**:

- **Windows ilovasi** — `v*` tegi qo'yilganda GitHub Actions yig'adi, avtomatik
  yangilanish orqali kassaga tushadi. Faqat teg qo'yish kifoya.
- **PWA** (`pos.orderplus.uz`) — VPS'dagi `/var/www/uzbecano_pos/dist-react`
  papkasini nginx statik tarqatadi. Uni `scripts/deploy-pwa.sh` yig'adi va
  boshqa hech nima yig'maydi.

Reliz teglash PWA'ga **tegmaydi**. Ikkinchisini yurgizmaslik bir kunda PWA'ni
o'n to'rt commit orqada qoldirdi: ilovada chek tuzatilgan, PWA'da eskisi.
Repo ildizidagi `vercel.json` chalg'itadi — jonli manzil Vercel emas.

## Chop etish navbati

Telefondagi PWA kassadagi termal printerga **tega olmaydi**: brauzer na tizim
printerini, na xom TCP ulanishini beradi, va sahifa HTTPS bo'lgani uchun
mahalliy tarmoqdagi printerga ham ulanolmaydi.

Shuning uchun `IS_DESKTOP_APP` bo'lmaganda chek `POST /api/print-jobs` ga
yoziladi (`src/lib/printQueue.ts`), desktop kassa esa har 5 soniyada navbatni
o'qib chop etadi va yopadi. Desktop o'z amallarini navbatga YOZMAYDI — u
chekni o'zi bosa oladi va serverga borib kelish faqat kechikish qo'shardi.

Brauzerdagi kassa navbatni bo'shatmaydi: u ham printerga tega olmaydi, ya'ni
topshiriqni olib, bosa olmay, navbatdan o'chirib tashlagan bo'lardi.

Oshxona kvitansiyasi tarkibi topshiriq bilan ketadi: kvitansiya buyurtmaning
hammasini emas, o'sha safar qo'shilgan taomlarni bosadi.

## Kvitansiya raqami

Oshxona kvitansiyasidagi raqam — buyurtmaning **serverdagi** kunlik tartib
raqami (`Order.dailyNumber`), ya'ni mijoz chekidagi raqam bilan bir xil.
Oshxonadagi qog'oz, kassadagi ekran va chek bitta narsani aytadi.

Kassa uni O'ZI hisoblamaydi. Ilgari shunday edi va bitta kassa bilan
ishlardi; ikkinchi qurilma qo'shilganda har biri o'z hisobini yuritib, bir
kunda ikkita "No 7" chiqardi, yangi kassada esa hisob birdan boshlanardi.

Oflayn buyurtmada raqam hali yo'q — o'shanda id ning oxirgi to'rt belgisi
bosiladi. Raqamsiz qog'oz bo'lishi mumkin, noto'g'ri raqamli qog'oz esa yo'q.
