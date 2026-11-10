const {
  compareSemver,
  buildPlatformDownloadUrl,
  formatUpdatePayload,
  checkRemoteRelease
} = require('../src/services/UpdateService');

describe('UpdateService', () => {
  test('compareSemver compares versions with or without v prefix', () => {
    expect(compareSemver('v1.5.0', '1.4.24')).toBe(1);
    expect(compareSemver('1.4.9', 'v1.4.10')).toBe(-1);
    expect(compareSemver('v1.5.0', '1.5.0')).toBe(0);
    expect(compareSemver('1.6.0-beta.1', '1.5.9')).toBe(1);
  });

  test('buildPlatformDownloadUrl returns platform-specific installer URLs', () => {
    expect(buildPlatformDownloadUrl('v1.5.0', 'darwin')).toBe(
      'https://github.com/Seabass2333/DeskMate/releases/download/v1.5.0/DeskMate-1.5.0-mac-universal.dmg'
    );
    expect(buildPlatformDownloadUrl('1.5.0', 'win32')).toBe(
      'https://github.com/Seabass2333/DeskMate/releases/download/v1.5.0/DeskMate-1.5.0-win-x64.exe'
    );
  });

  test('checkRemoteRelease picks highest version between GitHub API and static manifest', async () => {
    const mockFetch = jest.fn(async (url) => {
      if (url.includes('version.json')) {
        return {
          ok: true,
          json: async () => ({
            version: '1.5.0',
            tag: 'v1.5.0',
            macUrl: 'https://example.com/DeskMate-1.5.0.dmg'
          })
        };
      }
      if (url.includes('/releases/latest')) {
        return {
          ok: true,
          json: async () => ({
            tag_name: 'v1.6.0',
            body: 'New features [CRITICAL]',
            assets: [
              {
                name: 'DeskMate-1.6.0-mac-universal.dmg',
                browser_download_url: 'https://github.com/Seabass2333/DeskMate/releases/download/v1.6.0/DeskMate-1.6.0-mac-universal.dmg'
              }
            ]
          })
        };
      }
      return { ok: false };
    });

    const res = await checkRemoteRelease('1.5.0', {
      fetchFn: mockFetch,
      platform: 'darwin'
    });

    expect(res.hasUpdate).toBe(true);
    expect(res.version).toBe('1.6.0');
    expect(res.isCritical).toBe(true);
    expect(res.downloadUrl).toContain('DeskMate-1.6.0-mac-universal.dmg');
  });

  test('checkRemoteRelease falls back to static manifest when GitHub API is rate-limited', async () => {
    const mockFetch = jest.fn(async (url) => {
      if (url.includes('version.json')) {
        return {
          ok: true,
          json: async () => ({
            version: '1.5.2',
            tag: 'v1.5.2',
            macUrl: 'https://github.com/Seabass2333/DeskMate/releases/download/v1.5.2/DeskMate-1.5.2-mac-universal.dmg'
          })
        };
      }
      // Simulate 403 rate limit on api.github.com
      return { ok: false, status: 403 };
    });

    const res = await checkRemoteRelease('1.5.0', {
      fetchFn: mockFetch,
      platform: 'darwin'
    });

    expect(res.hasUpdate).toBe(true);
    expect(res.version).toBe('1.5.2');
    expect(res.source).toBe('manifest');
  });
});
