// Data lives only on this phone, so backup = one JSON file (data + images)
// the user saves to Google Drive / LINE Keep, and restore reads it back.
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from './db';
import { imagesRoot } from './images';
import { today } from './dates';

const TABLES = ['meter_readings', 'screenshots', 'ac_daily', 'bills', 'receipts', 'settings'] as const;

type Backup = {
  app: 'denki';
  version: 1;
  createdAt: string;
  tables: Record<string, Record<string, unknown>[]>;
  images: Record<string, string>; // relative path -> base64
};

function listFiles(dir: Directory, prefix: string, out: { rel: string; file: File }[]) {
  if (!dir.exists) return;
  for (const item of dir.list()) {
    if (item instanceof Directory) listFiles(item, `${prefix}${item.name}/`, out);
    else out.push({ rel: `${prefix}${item.name}`, file: item });
  }
}

export async function exportBackup() {
  const db = await getDb();
  const tables: Backup['tables'] = {};
  for (const t of TABLES) tables[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  const files: { rel: string; file: File }[] = [];
  listFiles(imagesRoot(), 'images/', files);
  const images: Backup['images'] = {};
  for (const f of files) images[f.rel] = await f.file.base64();

  const backup: Backup = { app: 'denki', version: 1, createdAt: new Date().toISOString(), tables, images };
  const out = new File(Paths.cache, `denki-backup-${today()}.json`);
  if (out.exists) out.delete();
  out.create();
  out.write(JSON.stringify(backup));
  await Sharing.shareAsync(out.uri, { mimeType: 'application/json', dialogTitle: 'บันทึกไฟล์สำรอง' });
}

/** Pick a backup file. Returns a summary to confirm, and a function to apply it. */
export async function pickBackup(): Promise<{ summary: string; apply: () => Promise<void> } | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (r.canceled) return null;
  const data = JSON.parse(await new File(r.assets[0].uri).text()) as Backup;
  if (data.app !== 'denki') throw new Error('ไม่ใช่ไฟล์สำรองของแอปนี้');
  const t = data.tables;
  const summary =
    `สำรองเมื่อ ${data.createdAt.slice(0, 10)}\n` +
    `เลขมิเตอร์ ${t.meter_readings?.length ?? 0} รายการ, แอร์ ${t.ac_daily?.length ?? 0} วัน, ` +
    `ใบเสร็จ ${t.receipts?.length ?? 0} ใบ, รูป ${Object.keys(data.images).length} รูป`;
  return { summary, apply: () => restore(data) };
}

async function restore(data: Backup) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of TABLES) {
      await db.runAsync(`DELETE FROM ${t}`);
      for (const row of data.tables[t] ?? []) {
        const cols = Object.keys(row);
        await db.runAsync(
          `INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
          cols.map((c) => row[c] as string | number | null),
        );
      }
    }
  });
  const root = imagesRoot();
  if (root.exists) root.delete();
  for (const [rel, b64] of Object.entries(data.images)) {
    const f = new File(Paths.document, rel);
    f.parentDirectory.create({ intermediates: true, idempotent: true });
    f.create({ overwrite: true });
    f.write(b64, { encoding: 'base64' });
  }
}
