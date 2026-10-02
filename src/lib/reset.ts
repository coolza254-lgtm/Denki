// Wipe selected data and the photos that belonged to it.
import { resetData, type ResetPart } from './db';
import { deleteImage } from './images';
import { cancelReminder } from './notify';

export const RESET_LABEL: Record<ResetPart, string> = {
  meter: 'เลขมิเตอร์',
  ac1: 'ข้อมูลแอร์ของฉัน',
  ac2: 'ข้อมูลแอร์พี่ชาย',
  receipts: 'ใบเสร็จ + สลิป',
  bills: 'บิล กฟน.',
  settings: 'การตั้งค่า (อัตราค่าไฟ, พร้อมเพย์, แจ้งเตือน)',
};

export async function reset(parts: ResetPart[]) {
  const images = await resetData(parts);
  for (const p of images) {
    try { deleteImage(p); } catch { /* already gone */ }
  }
  if (parts.includes('settings')) await cancelReminder();
}
