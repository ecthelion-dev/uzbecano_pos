/**
 * Oflayn ssenariy stendi: kassaning HAQIQIY navbat kodi HAQIQIY serverga.
 *
 * 2026-10-02 va 2026-10-08 dagi xatolarni mijoz topdi, biz emas. Har biri
 * bir zanjir edi: internet uzildi → kassa amallarni navbatga yozdi → aloqa
 * qaytdi → server bitta amalni rad etdi → keyingilari ham qotdi. Birlik
 * testlari `send` ni soxtalashtiradi, ya'ni serverning qaysi amalni rad
 * etishini bilmaydi — zanjirning aynan o'sha bo'g'ini ko'rinmay qoladi.
 *
 * Bu yerda:
 *   - baza — mahalliy Postgres, sxema `../uzbecano/prisma` dan (`db push`);
 *   - server — `../uzbecano/apps/api/dist` (oldin `npm run build`);
 *   - navbat — `runSyncCycle` va `buildSyncRequest`, kassadagi bilan bir xil.
 *
 * Tokenlar API ning o'z `createSessionToken` i bilan, umumiy SESSION_SECRET
 * ostida chiqariladi: server ularni haqiqiy imzo sifatida tekshiradi.
 */
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runSyncCycle, type QueuedItem, type SyncOutcome } from '../../src/lib/syncCycle';
import { buildSyncRequest } from '../../src/lib/syncRequest';

export const API_REPO = resolve(process.env.INCOME_API_REPO || resolve(__dirname, '../../../uzbecano'));
export const DB_NAME = process.env.OFFLINE_TEST_DB || 'income_offline_test';
export const CAFE = 'offline-test';
const PORT = Number(process.env.OFFLINE_TEST_PORT || 4517);
const SESSION_SECRET = 'offline-harness-secret-at-least-32-characters';
export const BASE_URL = `http://127.0.0.1:${PORT}`;

const DB_URL = `postgresql://${process.env.USER}@localhost:5432/${DB_NAME}`;

export function harnessAvailable(): boolean {
  return existsSync(resolve(API_REPO, 'apps/api/dist/main.js'));
}

function psql(sql: string): string {
  return execFileSync('psql', ['-d', DB_NAME, '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { encoding: 'utf8' });
}

export function query(sql: string): string[][] {
  return psql(sql)
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('|'));
}

/**
 * API repo `.env` ni o'zi o'qiydi va BO'SH bo'lmagan kalitni ustidan
 * yozmaydi. Telegram tokeni kabi kalitlar sinovda haqiqiy chatga xabar
 * yuborib yubormasligi uchun har biri oldindan zararsiz qiymat bilan band
 * qilinadi.
 */
function neutralisedEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const file of ['.env', '.env.local']) {
    const path = resolve(API_REPO, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const eq = line.indexOf('=');
      const key = line.slice(0, eq).trim();
      if (eq > 0 && /^[A-Z_][A-Z0-9_]*$/.test(key)) env[key] = 'offline-harness-disabled';
    }
  }
  return env;
}

export function resetDatabase(): void {
  execFileSync('dropdb', ['--if-exists', DB_NAME]);
  execFileSync('createdb', [DB_NAME]);
  execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: API_REPO,
    env: { ...process.env, DATABASE_URL: DB_URL, DIRECT_URL: DB_URL },
    stdio: 'ignore',
  });
}

export const PRODUCTS = {
  fruitMix: { id: 'p-fruit-mix', name: 'Fruit mix (Choynak)', price: 45000 },
  cappuccino: { id: 'p-cappuccino', name: 'Iced Cappuccino', price: 30000 },
  latte: { id: 'p-latte', name: 'Latte', price: 25000 },
} as const;

export const TABLES = ['Terassa 1', 'Terassa 2', 'Bar 4'] as const;

export function seed(): void {
  const products = Object.values(PRODUCTS)
    .map((p) => `('${p.id}', '${CAFE}', '${p.name}', 'Ichimliklar', '', ${p.price}, '', now())`)
    .join(',');
  const tables = TABLES.map((name, i) => `('t-${i}', '${CAFE}', '${name}', now())`).join(',');
  psql(`
    -- Xizmat haqi 0: ssenariy summalari taom narxlarining o'zi bo'lsin.
    INSERT INTO "Cafe" (id, slug, name, "serviceFeePercent", "subscriptionEnd", "createdAt", "updatedAt")
      VALUES ('cafe-offline', '${CAFE}', 'Oflayn sinov', 0, now() + interval '30 days', now(), now());
    INSERT INTO "Product" (id, "cafeId", name, category, description, price, image, "createdAt") VALUES ${products};
    INSERT INTO "Table" (id, "cafeId", name, "createdAt") VALUES ${tables};
  `);
}

export function clearOrders(): void {
  psql(`DELETE FROM "PrintJob"; DELETE FROM "AuditLog"; DELETE FROM "Order";`);
}

let api: ChildProcess | null = null;

export async function startApi(): Promise<void> {
  api = spawn('node', ['dist/main.js'], {
    cwd: resolve(API_REPO, 'apps/api'),
    env: {
      PATH: process.env.PATH || '',
      HOME: process.env.HOME || '',
      ...neutralisedEnv(),
      NODE_ENV: 'test',
      API_PORT: String(PORT),
      DATABASE_URL: DB_URL,
      DIRECT_URL: DB_URL,
      SESSION_SECRET,
      JWT_SECRET: SESSION_SECRET,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  api.stdout?.on('data', (d) => { output += d; });
  api.stderr?.on('data', (d) => { output += d; });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (api.exitCode !== null) throw new Error(`API yiqildi:\n${output}`);
    try {
      const res = await fetch(`${BASE_URL}/api/tables?cafeId=${CAFE}`);
      if (res.status < 500) return;
    } catch { /* hali ko'tarilmagan */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`API 30 soniyada ko'tarilmadi:\n${output}`);
}

export function stopApi(): void {
  api?.kill();
  api = null;
}

type Role = 'waiter' | 'manager';

export function tokenFor(role: Role, name = role === 'waiter' ? 'Dilsora' : 'Rahbar'): string {
  process.env.SESSION_SECRET = SESSION_SECRET;
  const require = createRequire(import.meta.url);
  const jwt = require(resolve(API_REPO, 'apps/api/dist/common/auth/jwt.util.js'));
  return jwt.createSessionToken({ userId: `u-${role}`, cafeId: CAFE, role, name });
}

/**
 * Kassaning diskdagi navbati — xotirada. `commit` kassadagidek bitta
 * qadamda ikkalasini yozadi.
 */
export class TillQueue {
  queue: QueuedItem[] = [];
  failed: QueuedItem[] = [];
  private seq = 0;

  push(item: QueuedItem): void {
    this.seq += 1;
    this.queue = [...this.queue, { qid: `q${this.seq}`, queuedAt: Date.now(), ...item }];
  }

  /** Aloqa tiklandi: kassa navbatni bir marta yuboradi. */
  async drain(token: string): Promise<SyncOutcome | null> {
    return runSyncCycle(
      {
        readQueue: () => this.queue,
        readFailed: () => this.failed,
        commit: (queue, failed) => {
          this.queue = queue;
          if (failed) this.failed = failed;
          return true;
        },
        send: (item) => {
          const { url, init } = buildSyncRequest(item, {
            baseUrl: BASE_URL,
            cafeId: CAFE,
            headers: (approvalToken) => ({
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              ...(approvalToken ? { 'X-Approval-Token': approvalToken } : {}),
            }),
          });
          return fetch(url, init);
        },
        isFrozen: async () => false,
        label: (item) => (item.kind === 'create' ? String(item.order?.tableNumber) : String((item as any).label ?? item.kind)),
      },
      token,
    );
  }

  /** Navbat bo'shaguncha (yoki o'zgarmay qolguncha) qayta-qayta yuboradi. */
  async drainUntilSettled(token: string, maxRounds = 5): Promise<void> {
    for (let i = 0; i < maxRounds && this.queue.length > 0; i += 1) {
      const before = this.queue.length;
      await this.drain(token);
      if (this.queue.length === before) break;
    }
  }
}

export interface ServerOrder {
  id: string;
  tableNumber: string;
  status: string;
  total: number;
}

export function serverOrders(): ServerOrder[] {
  return query(`SELECT id, "tableNumber", status, total FROM "Order" WHERE "cafeId" = '${CAFE}' ORDER BY "createdAt"`).map(
    ([id, tableNumber, status, total]) => ({ id, tableNumber, status, total: Number(total) }),
  );
}
