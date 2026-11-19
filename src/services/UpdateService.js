/**
 * DeskMate Update Service
 * Provides resilient multi-source version checking (electron-updater + GitHub Releases API + Static Manifest)
 * and platform-aware update delivery (Windows NSIS auto-install + macOS unsigned one-click installer download).
 */

const GITHUB_OWNER = 'Seabass2333';
const GITHUB_REPO = 'DeskMate';
const LANDING_PAGE_URL = `https://seabass2333.github.io/${GITHUB_REPO}/`;
const LANDING_MANIFEST_URL = `${LANDING_PAGE_URL}version.json`;
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const GITHUB_API_LATEST = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const GITHUB_API_LIST = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=5`;

/**
 * Compare two semantic version strings (e.g. "v1.5.1" vs "1.5.0")
 * Returns 1 if vA > vB, -1 if vA < vB, 0 if equal
 */
function compareSemver(vA, vB) {
  const parse = (v) =>
    String(v || '0.0.0')
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const a = parse(vA);
  const b = parse(vB);
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff > 0) return 1;
    if (diff < 0) return -1;
  }
  return 0;
}

/**
 * Build deterministic direct installer download URL for a given version and platform
 */
function buildPlatformDownloadUrl(version, platform = process.platform, assets = []) {
  const cleanVer = String(version || '1.5.0').trim().replace(/^v/i, '');
  const tag = `v${cleanVer}`;
  const assetList = Array.isArray(assets) ? assets : [];

  if (platform === 'darwin') {
    const dmgAsset = assetList.find((a) => a.name && a.name.endsWith('.dmg'));
    return (
      dmgAsset?.browser_download_url ||
      `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/DeskMate-${cleanVer}-mac-universal.dmg`
    );
  }

  if (platform === 'win32') {
    const exeAsset = assetList.find((a) => a.name && a.name.endsWith('.exe'));
    return (
      exeAsset?.browser_download_url ||
      `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/DeskMate-${cleanVer}-win-x64.exe`
    );
  }

  const linuxAsset = assetList.find((a) => a.name && a.name.endsWith('.AppImage'));
  return (
    linuxAsset?.browser_download_url ||
    `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/DeskMate-${cleanVer}-linux.AppImage`
  );
}

/**
 * Normalize raw release info into unified DeskMate update payload
 */
function formatUpdatePayload(currentVersion, remoteVersion, options = {}) {
  const cleanCurrent = String(currentVersion || '0.0.0').trim().replace(/^v/i, '');
  const cleanRemote = String(remoteVersion || cleanCurrent).trim().replace(/^v/i, '');
  const hasUpdate = compareSemver(cleanRemote, cleanCurrent) > 0;
  const platform = options.platform || process.platform;
  const releaseNotes = options.releaseNotes || '';
  const isCritical =
    typeof releaseNotes === 'string' &&
    (releaseNotes.includes('[FORCE_UPDATE]') || releaseNotes.includes('[CRITICAL]'));

  return {
    hasUpdate,
    currentVersion: cleanCurrent,
    version: cleanRemote,
    tag: `v${cleanRemote}`,
    downloadUrl:
      options.downloadUrl || buildPlatformDownloadUrl(cleanRemote, platform, options.assets),
    githubUrl: GITHUB_RELEASES_URL,
    landingUrl: LANDING_PAGE_URL,
    releaseNotes,
    isCritical,
    source: options.source || 'remote'
  };
}

/**
 * Fetch helper with timeout so a blocked endpoint never stalls the fallback
 */
async function fetchWithTimeout(fetchFn, url, fetchOptions = {}, timeoutMs = 8000) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetchFn(url, {
      ...fetchOptions,
      ...(controller ? { signal: controller.signal } : {})
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Fetch latest version from GitHub Releases API + Static Landing Page Manifest in parallel
 */
async function checkRemoteRelease(currentVersion, options = {}) {
  const fetchFn = options.fetchFn || global.fetch;
  const platform = options.platform || process.platform;
  const timeoutMs = options.timeoutMs || 8000;

  if (typeof fetchFn !== 'function') {
    return formatUpdatePayload(currentVersion, currentVersion, { platform, source: 'none' });
  }

  const checkManifest = async () => {
    const res = await fetchWithTimeout(
      fetchFn,
      `${LANDING_MANIFEST_URL}?t=${Date.now()}`,
      { headers: { Accept: 'application/json' } },
      timeoutMs
    );
    if (res && res.ok) {
      const data = await res.json();
      if (data && (data.version || data.tag)) {
        const ver = String(data.version || data.tag).replace(/^v/i, '');
        const directUrl =
          platform === 'darwin'
            ? data.macUrl
            : platform === 'win32'
            ? data.winUrl
            : undefined;
        return formatUpdatePayload(currentVersion, ver, {
          platform,
          downloadUrl: directUrl,
          releaseNotes: data.releaseNotes || '',
          source: 'manifest'
        });
      }
    }
    return null;
  };

  const checkGitHubApi = async () => {
    let res = await fetchWithTimeout(
      fetchFn,
      GITHUB_API_LATEST,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DeskMate-AutoUpdater'
        }
      },
      timeoutMs
    );

    let releaseObj = null;
    if (res && res.ok) {
      releaseObj = await res.json();
    } else {
      const listRes = await fetchWithTimeout(
        fetchFn,
        GITHUB_API_LIST,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'DeskMate-AutoUpdater'
          }
        },
        timeoutMs
      );
      if (listRes && listRes.ok) {
        const list = await listRes.json();
        if (Array.isArray(list)) {
          releaseObj = list.find((r) => !r.draft && r.tag_name) || null;
        }
      }
    }

    if (releaseObj && releaseObj.tag_name) {
      return formatUpdatePayload(currentVersion, releaseObj.tag_name, {
        platform,
        assets: releaseObj.assets || [],
        releaseNotes: releaseObj.body || '',
        source: 'github-api'
      });
    }
    return null;
  };

  const [manifestRes, githubRes] = await Promise.allSettled([
    checkManifest(),
    checkGitHubApi()
  ]);

  const manifestCandidate = manifestRes.status === 'fulfilled' ? manifestRes.value : null;
  const githubCandidate = githubRes.status === 'fulfilled' ? githubRes.value : null;

  if (githubCandidate && manifestCandidate) {
    return compareSemver(githubCandidate.version, manifestCandidate.version) >= 0
      ? githubCandidate
      : manifestCandidate;
  }

  if (githubCandidate || manifestCandidate) {
    return githubCandidate || manifestCandidate;
  }

  throw new Error('Unable to reach update server');
}

module.exports = {
  GITHUB_OWNER,
  GITHUB_REPO,
  LANDING_PAGE_URL,
  GITHUB_RELEASES_URL,
  compareSemver,
  buildPlatformDownloadUrl,
  formatUpdatePayload,
  checkRemoteRelease
};
