// Reads an AC app screenshot (monthly calendar of daily kWh) with Claude.
import Anthropic from '@anthropic-ai/sdk';
import * as SecureStore from 'expo-secure-store';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const KEY_NAME = 'anthropic_api_key';
const MODEL = 'claude-opus-5-5';

export const getApiKey = () => SecureStore.getItemAsync(KEY_NAME);
export const setApiKey = (key: string) =>
  key ? SecureStore.setItemAsync(KEY_NAME, key.trim()) : SecureStore.deleteItemAsync(KEY_NAME);

import type { Extracted } from './acCheck';

export type { Extracted };

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['year', 'month', 'days', 'notes'],
  properties: {
    year: { type: 'integer', description: 'Gregorian year shown on screen, e.g. 2026' },
    month: { type: 'integer', description: '1-12' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'kwh'],
        properties: {
          day: { type: 'integer' },
          kwh: { type: ['number', 'null'] },
        },
      },
    },
    notes: { type: 'string', description: 'Anything unclear or unreadable; empty if none' },
  },
};

const PROMPT = `This is a screenshot from an air conditioner app showing a monthly calendar.
Each calendar cell has a day number and, below it, that day's energy use in kWh.

Return:
- year and month from the month label under the calendar (e.g. "9/2026" = month 9, year 2026).
- one entry per day number visible in the calendar, with its kWh exactly as printed
  (e.g. "4" -> 4, "3.3" -> 3.3). If a day has no kWh value under it, use null.
- Ignore the summary numbers at the top ("Usage today", "Usage this month"); only read the calendar cells.
- In notes, mention any digit you were unsure about. Leave notes empty if everything was clear.`;

export class ExtractError extends Error {}

export async function extractAcScreenshot(uri: string): Promise<Extracted> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new ExtractError('ยังไม่ได้ใส่ Claude API key (ไปที่ ตั้งค่า)');

  // Downscale so the image stays within the model's native resolution.
  const ref = await ImageManipulator.manipulate(uri).resize({ height: 1568 }).renderAsync();
  const img = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true });
  if (!img.base64) throw new ExtractError('อ่านไฟล์รูปไม่ได้');

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.base64 } },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  });

  if (res.stop_reason === 'refusal') throw new ExtractError('ระบบอ่านภาพปฏิเสธคำขอ ลองภาพอื่น');
  if (res.stop_reason === 'max_tokens') throw new ExtractError('คำตอบยาวเกิน ลองใหม่อีกครั้ง');
  const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  let data: Extracted;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ExtractError('อ่านผลลัพธ์ไม่ได้ ลองใหม่อีกครั้ง');
  }
  return data;
}
