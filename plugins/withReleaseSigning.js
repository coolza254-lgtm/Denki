// Signs release builds with the key from DENKI_KEYSTORE / DENKI_KEYSTORE_PASSWORD
// (set by the GitHub workflow). Without them it falls back to the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            if (System.getenv('DENKI_KEYSTORE')) {
                storeFile file(System.getenv('DENKI_KEYSTORE'))
                storePassword System.getenv('DENKI_KEYSTORE_PASSWORD')
                keyAlias 'denki'
                keyPassword System.getenv('DENKI_KEYSTORE_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes("keyAlias 'denki'")) return cfg;
    src = src.replace(/signingConfigs\s*\{/, (m) => m + RELEASE_CONFIG);
    src = src.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig System.getenv('DENKI_KEYSTORE') ? signingConfigs.release : signingConfigs.debug",
    );
    if (!src.includes('signingConfigs.release :')) throw new Error('withReleaseSigning: build.gradle layout changed');
    cfg.modResults.contents = src;
    return cfg;
  });
};
