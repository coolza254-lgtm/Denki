// In-app updates without any paid service: each build is published as a
// GitHub Release (tag build-<n>) with the APK attached. The app compares
// that number with its own and, on tap, downloads and opens the installer.
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

const REPO = 'coolza254-lgtm/Denki';

/** 0 for development builds, which never offer updates. */
export const currentBuild = Number(Constants.expoConfig?.extra?.build ?? 0);

export type Release = { build: number; apkUrl: string; notes: string; publishedAt: string };

type GhRelease = {
  tag_name: string;
  body: string | null;
  published_at: string;
  assets: { name: string; browser_download_url: string }[];
};

export async function latestRelease(): Promise<Release | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  const r: GhRelease = await res.json();
  const m = /^build-(\d+)$/.exec(r.tag_name);
  const apk = r.assets.find((a) => a.name.endsWith('.apk'));
  if (!m || !apk) return null;
  return { build: Number(m[1]), apkUrl: apk.browser_download_url, notes: r.body ?? '', publishedAt: r.published_at };
}

/** The newer release, or null when up to date (or offline). */
export async function checkForUpdate(): Promise<Release | null> {
  if (currentBuild === 0) return null;
  try {
    const r = await latestRelease();
    return r && r.build > currentBuild ? r : null;
  } catch {
    return null;
  }
}

/**
 * Download the APK and hand it to Android's installer. The first time,
 * Android asks to allow installs from this app.
 */
export async function installRelease(r: Release) {
  const dest = new File(Paths.cache, `denki-${r.build}.apk`);
  if (dest.exists) dest.delete();
  const apk = await File.downloadFileAsync(r.apkUrl, dest);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: apk.contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}
