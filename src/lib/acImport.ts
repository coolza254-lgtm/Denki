// Free, offline reading of AC screenshots with Google ML Kit (on-device OCR).
import { recognizeText, type Text } from '@infinitered/react-native-mlkit-text-recognition';
import { parseCalendar, type Box } from './acOcr';
import type { Extracted } from './acCheck';

const toBox = (t: { text: string; frame: { left: number; top: number; right: number; bottom: number } }): Box => ({
  text: t.text, left: t.frame.left, top: t.frame.top, right: t.frame.right, bottom: t.frame.bottom,
});

/** Try word-level boxes first, then whole lines; keep whichever finds more days. */
export function parseOcr(result: Text): Extracted | null {
  const lines = result.blocks.flatMap((b) => b.lines);
  const byElement = parseCalendar(lines.flatMap((l) => l.elements.map(toBox)));
  const byLine = parseCalendar(lines.map(toBox));
  if (!byElement) return byLine;
  if (!byLine) return byElement;
  return byLine.days.length > byElement.days.length ? byLine : byElement;
}

export async function readScreenshotOnDevice(uri: string): Promise<Extracted | null> {
  return parseOcr(await recognizeText(uri));
}
