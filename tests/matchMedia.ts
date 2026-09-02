/*
 * jsdom ships no `matchMedia`, and the theme code asks it for the OS colour scheme. This is a
 * controllable stand-in: `setPrefersDark` flips the answer and notifies the live listeners, so a
 * test can simulate the user changing the system theme while the app is open.
 */

type Listener = (event: MediaQueryListEvent) => void;

const listeners = new Set<Listener>();
let prefersDark = false;

export function setPrefersDark(value: boolean): void {
  prefersDark = value;
  for (const listener of [...listeners]) listener({ matches: value } as MediaQueryListEvent);
}

export function resetMatchMedia(): void {
  prefersDark = false;
  listeners.clear();
}

export function installMatchMedia(): void {
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return prefersDark;
    },
    onchange: null,
    addEventListener: (_type: string, listener: Listener) => void listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => void listeners.delete(listener),
    addListener: (listener: Listener) => void listeners.add(listener),
    removeListener: (listener: Listener) => void listeners.delete(listener),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
