import { describe, it, expect, afterEach } from 'vitest';
import { silentRefresh, OAUTH_RELAY_MESSAGE } from '../../src/auth/silentRefresh';

afterEach(() => {
  document.querySelectorAll('iframe').forEach((f) => f.remove());
});

describe('silentRefresh', () => {
  it('mounts a hidden iframe and resolves with the relayed hash', async () => {
    const promise = silentRefresh('https://hub.example/auth', 5000);
    const iframe = document.querySelector('iframe')!;
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('src')).toBe('https://hub.example/auth');
    expect(iframe.style.display).toBe('none');

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: OAUTH_RELAY_MESSAGE, hash: '#access_token=t&state=s' },
      }),
    );
    await expect(promise).resolves.toBe('#access_token=t&state=s');
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('ignores messages from other origins and times out', async () => {
    const promise = silentRefresh('https://hub.example/auth', 30);
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        data: { type: OAUTH_RELAY_MESSAGE, hash: '#access_token=bad' },
      }),
    );
    await expect(promise).rejects.toThrow(/timed out/);
  });
});
