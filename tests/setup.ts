import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { installMatchMedia, resetMatchMedia } from './matchMedia';

installMatchMedia();

// Testing Library only auto-cleans when vitest globals are enabled; do it explicitly.
afterEach(() => {
  cleanup();
  resetMatchMedia();
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
});
