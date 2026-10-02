// Local SQLite storage. Everything lives on the phone; see backup.ts.
import * as SQLite from 'expo-sqlite';
import type { MeterReading } from './usage';
import { DEFAULT_TARIFF, type Tariff } from './tariff';

export type AcId = 1 | 2;

export type AcDay = { ac: AcId; date: string; kwh: number; screenshotId: number | null };

export type Screenshot = { id: number; ac: AcId; month: string; path: string; hash: string; createdAt: string };

export type Bill = {
  id: number;
  periodEnd: string; // meter reading date on the bill
  kwh: number;
  energy: number;
  ftRate: number;
  service: number;
  vat: number;
  total: number;
  photoPath: string | null;
  createdAt: string;
};

export type Receipt = {
  id: number;
  ac: AcId;
  startDate: string;
  endDate: string;
  kwh: number;
  total: number;
  breakdown: string; // JSON of Share
  promptpayId: string;
  payeeName: string;
  paid: boolean;
  paidAt: string | null;
  slipPath: string | null;
  createdAt: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

async function open() {
  const db = await SQLite.openDatabaseAsync('denki.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS meter_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      read_at TEXT NOT NULL,
      value REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ac INTEGER NOT NULL,
      month TEXT NOT NULL,
      path TEXT NOT NULL,
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ac_daily (
      ac INTEGER NOT NULL,
      date TEXT NOT NULL,
      kwh REAL NOT NULL,
      screenshot_id INTEGER,
      PRIMARY KEY (ac, date)
    );
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_end TEXT NOT NULL,
      kwh REAL NOT NULL,
      energy REAL NOT NULL,
      ft_rate REAL NOT NULL,
      service REAL NOT NULL,
      vat REAL NOT NULL,
      total REAL NOT NULL,
      photo_path TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ac INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      kwh REAL NOT NULL,
      total REAL NOT NULL,
      breakdown TEXT NOT NULL,
      promptpay_id TEXT NOT NULL,
      payee_name TEXT NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      paid_at TEXT,
      slip_path TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

const nowIso = () => new Date().toISOString();

// ---------- meter readings ----------

export async function listReadings(): Promise<MeterReading[]> {
  const db = await getDb();
  return db.getAllAsync<MeterReading>(
    'SELECT id, read_at AS readAt, value FROM meter_readings ORDER BY read_at',
  );
}

export async function addReading(readAt: string, value: number) {
  const db = await getDb();
  await db.runAsync('INSERT INTO meter_readings (read_at, value) VALUES (?, ?)', readAt, value);
}

export async function deleteReading(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM meter_readings WHERE id = ?', id);
}

// ---------- AC ----------

export async function listAcDays(ac?: AcId): Promise<AcDay[]> {
  const db = await getDb();
  const sql = 'SELECT ac, date, kwh, screenshot_id AS screenshotId FROM ac_daily';
  return ac
    ? db.getAllAsync<AcDay>(`${sql} WHERE ac = ? ORDER BY date`, ac)
    : db.getAllAsync<AcDay>(`${sql} ORDER BY date`);
}

export async function upsertAcDays(ac: AcId, days: { date: string; kwh: number }[], screenshotId: number | null) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const d of days) {
      await db.runAsync(
        `INSERT INTO ac_daily (ac, date, kwh, screenshot_id) VALUES (?, ?, ?, ?)
         ON CONFLICT(ac, date) DO UPDATE SET kwh = excluded.kwh, screenshot_id = excluded.screenshot_id`,
        ac, d.date, d.kwh, screenshotId,
      );
    }
  });
}

export async function deleteAcDay(ac: AcId, date: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM ac_daily WHERE ac = ? AND date = ?', ac, date);
}

export async function findScreenshotByHash(hash: string): Promise<Screenshot | null> {
  const db = await getDb();
  return db.getFirstAsync<Screenshot>(
    'SELECT id, ac, month, path, hash, created_at AS createdAt FROM screenshots WHERE hash = ?',
    hash,
  );
}

export async function getScreenshot(id: number): Promise<Screenshot | null> {
  const db = await getDb();
  return db.getFirstAsync<Screenshot>(
    'SELECT id, ac, month, path, hash, created_at AS createdAt FROM screenshots WHERE id = ?',
    id,
  );
}

export async function addScreenshot(ac: AcId, month: string, path: string, hash: string): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    'INSERT INTO screenshots (ac, month, path, hash, created_at) VALUES (?, ?, ?, ?, ?)',
    ac, month, path, hash, nowIso(),
  );
  return r.lastInsertRowId;
}

// ---------- MEA bills ----------

export async function listBills(): Promise<Bill[]> {
  const db = await getDb();
  return db.getAllAsync<Bill>(
    `SELECT id, period_end AS periodEnd, kwh, energy, ft_rate AS ftRate, service, vat, total,
            photo_path AS photoPath, created_at AS createdAt
     FROM bills ORDER BY period_end DESC`,
  );
}

export async function saveBill(b: Omit<Bill, 'id' | 'createdAt'> & { id?: number }) {
  const db = await getDb();
  if (b.id) {
    await db.runAsync(
      `UPDATE bills SET period_end=?, kwh=?, energy=?, ft_rate=?, service=?, vat=?, total=?, photo_path=? WHERE id=?`,
      b.periodEnd, b.kwh, b.energy, b.ftRate, b.service, b.vat, b.total, b.photoPath, b.id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO bills (period_end, kwh, energy, ft_rate, service, vat, total, photo_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      b.periodEnd, b.kwh, b.energy, b.ftRate, b.service, b.vat, b.total, b.photoPath, nowIso(),
    );
  }
}

export async function deleteBill(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM bills WHERE id = ?', id);
}

// ---------- receipts ----------

type ReceiptRow = Omit<Receipt, 'paid'> & { paid: number };

const RECEIPT_COLS = `id, ac, start_date AS startDate, end_date AS endDate, kwh, total, breakdown,
  promptpay_id AS promptpayId, payee_name AS payeeName, paid, paid_at AS paidAt,
  slip_path AS slipPath, created_at AS createdAt`;

const toReceipt = (r: ReceiptRow): Receipt => ({ ...r, paid: !!r.paid });

export async function listReceipts(): Promise<Receipt[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReceiptRow>(`SELECT ${RECEIPT_COLS} FROM receipts ORDER BY created_at DESC`);
  return rows.map(toReceipt);
}

export async function getReceipt(id: number): Promise<Receipt | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<ReceiptRow>(`SELECT ${RECEIPT_COLS} FROM receipts WHERE id = ?`, id);
  return r ? toReceipt(r) : null;
}

export async function addReceipt(r: Omit<Receipt, 'id' | 'createdAt' | 'paid' | 'paidAt' | 'slipPath'>): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO receipts (ac, start_date, end_date, kwh, total, breakdown, promptpay_id, payee_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.ac, r.startDate, r.endDate, r.kwh, r.total, r.breakdown, r.promptpayId, r.payeeName, nowIso(),
  );
  return res.lastInsertRowId;
}

export async function setReceiptPaid(id: number, paid: boolean) {
  const db = await getDb();
  await db.runAsync('UPDATE receipts SET paid = ?, paid_at = ? WHERE id = ?', paid ? 1 : 0, paid ? nowIso() : null, id);
}

export async function setReceiptSlip(id: number, slipPath: string | null) {
  const db = await getDb();
  await db.runAsync('UPDATE receipts SET slip_path = ? WHERE id = ?', slipPath, id);
}

export async function deleteReceipt(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM receipts WHERE id = ?', id);
}

// ---------- settings ----------

export type Settings = {
  tariff: Tariff;
  cycleEndDay: number;
  promptpayId: string;
  payeeName: string;
  reminderEnabled: boolean;
  reminderTime: string; // 'HH:mm'
};

export const DEFAULT_SETTINGS: Settings = {
  tariff: DEFAULT_TARIFF,
  cycleEndDay: 22,
  promptpayId: '',
  payeeName: '',
  reminderEnabled: false,
  reminderTime: '20:00',
};

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = JSON.parse(r.value);
  return s as Settings;
}

export async function saveSettings(patch: Partial<Settings>) {
  const db = await getDb();
  for (const [k, v] of Object.entries(patch)) {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      k, JSON.stringify(v),
    );
  }
}

// ---------- reset ----------

export type ResetPart = 'meter' | 'ac1' | 'ac2' | 'receipts' | 'bills' | 'settings';

/** Deletes the chosen data. Returns image paths that are no longer used. */
export async function resetData(parts: ResetPart[]): Promise<string[]> {
  const db = await getDb();
  const images: string[] = [];
  const paths = async (sql: string, ...args: (string | number)[]) =>
    (await db.getAllAsync<{ p: string | null }>(sql, ...args)).forEach((r) => r.p && images.push(r.p));

  await db.withTransactionAsync(async () => {
    if (parts.includes('meter')) await db.runAsync('DELETE FROM meter_readings');
    for (const ac of [1, 2] as const) {
      if (!parts.includes(ac === 1 ? 'ac1' : 'ac2')) continue;
      await paths('SELECT path AS p FROM screenshots WHERE ac = ?', ac);
      await db.runAsync('DELETE FROM screenshots WHERE ac = ?', ac);
      await db.runAsync('DELETE FROM ac_daily WHERE ac = ?', ac);
    }
    if (parts.includes('receipts')) {
      await paths('SELECT slip_path AS p FROM receipts');
      await db.runAsync('DELETE FROM receipts');
    }
    if (parts.includes('bills')) {
      await paths('SELECT photo_path AS p FROM bills');
      await db.runAsync('DELETE FROM bills');
    }
    if (parts.includes('settings')) await db.runAsync('DELETE FROM settings');
  });
  return images;
}
