// Photos and screenshots are copied into the app's own folder so they stay
// available (and get included in backups). Paths in the DB are relative.
import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

export type ImageFolder = 'ac' | 'bills' | 'slips';

export function imagesRoot(): Directory {
  return new Directory(Paths.document, 'images');
}

/** Copy an image into app storage; returns a path relative to documents. */
export function storeImage(srcUri: string, folder: ImageFolder): string {
  const dir = new Directory(imagesRoot(), folder);
  dir.create({ intermediates: true, idempotent: true });
  const src = new File(srcUri);
  const ext = src.extension || '.jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  src.copy(new File(dir, name));
  return `images/${folder}/${name}`;
}

export function imageUri(relPath: string): string {
  return new File(Paths.document, relPath).uri;
}

export function deleteImage(relPath: string | null) {
  if (!relPath) return;
  const f = new File(Paths.document, relPath);
  if (f.exists) f.delete();
}

/** SHA-256 of the file bytes, used to spot the same screenshot twice. */
export async function fileHash(uri: string): Promise<string> {
  const bytes = await new File(uri).bytes();
  const buf = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Pick from gallery or take a photo. Returns a temporary URI or null. */
export async function pickImage(source: 'library' | 'camera'): Promise<string | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    return r.canceled ? null : r.assets[0].uri;
  }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  return r.canceled ? null : r.assets[0].uri;
}
