export const OAUTH_RELAY_MESSAGE = 'yer:oauth-callback';

interface RelayMessage {
  type: typeof OAUTH_RELAY_MESSAGE;
  hash: string;
}

function isRelayMessage(data: unknown): data is RelayMessage {
  return typeof data === 'object' && data !== null && (data as RelayMessage).type === OAUTH_RELAY_MESSAGE;
}

/**
 * When the app is loaded inside our own silent-refresh iframe, hand the OAuth fragment
 * to the parent window and report that nothing else should render.
 */
export function relayFragmentToParent(): boolean {
  if (window.parent === window) return false;
  const hash = window.location.hash;
  if (!/(^|[#&])(access_token|error)=/.test(hash)) return false;
  const message: RelayMessage = { type: OAUTH_RELAY_MESSAGE, hash };
  window.parent.postMessage(message, window.location.origin);
  return true;
}

/** Load the Hub auth URL in a hidden iframe and resolve with the fragment it relays back. */
export function silentRefresh(authUrl: string, timeoutMs = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');

    const cleanup = (): void => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      iframe.remove();
    };
    const onMessage = (event: MessageEvent): void => {
      if (event.origin !== window.location.origin || !isRelayMessage(event.data)) return;
      cleanup();
      resolve(event.data.hash);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Silent token refresh timed out'));
    }, timeoutMs);

    window.addEventListener('message', onMessage);
    iframe.src = authUrl;
    document.body.appendChild(iframe);
  });
}
