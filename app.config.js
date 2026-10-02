// Build number comes from the GitHub workflow run (DENKI_BUILD). Each build
// gets a higher versionCode so Android installs it as an update.
module.exports = ({ config }) => {
  const build = Number(process.env.DENKI_BUILD || 0);
  return {
    ...config,
    version: `1.0.${build}`,
    android: { ...config.android, versionCode: Math.max(build, 1) },
    extra: { ...config.extra, build },
  };
};
