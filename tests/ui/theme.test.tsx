import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { applyTheme, nextThemePreference, resolveTheme, useResolvedTheme, useTheme } from '../../src/ui/theme';
import { ThemeProvider } from '../../src/ui/ThemeProvider';
import { useSettingsStore } from '../../src/store/settingsStore';
import { DEFAULT_SETTINGS } from '../../src/auth/storage';
import { setPrefersDark } from '../matchMedia';

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
});

describe('resolveTheme', () => {
  it('follows the system for the system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
  it('pins the theme for an explicit preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('nextThemePreference', () => {
  it('cycles system → light → dark → system', () => {
    expect(nextThemePreference('system')).toBe('light');
    expect(nextThemePreference('light')).toBe('dark');
    expect(nextThemePreference('dark')).toBe('system');
  });
});

describe('applyTheme', () => {
  it('marks the document so both Tailwind and native controls follow', () => {
    applyTheme('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});

describe('useResolvedTheme', () => {
  it('resolves the stored preference and applies it to the document', () => {
    useSettingsStore.getState().update({ theme: 'dark' });
    const { result } = renderHook(() => useResolvedTheme());
    expect(result.current).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('follows a system change while the preference is system', () => {
    const { result } = renderHook(() => useResolvedTheme());
    expect(result.current).toBe('light');
    act(() => setPrefersDark(true));
    expect(result.current).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('ignores a system change once the preference is explicit', () => {
    useSettingsStore.getState().update({ theme: 'light' });
    const { result } = renderHook(() => useResolvedTheme());
    act(() => setPrefersDark(true));
    expect(result.current).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

describe('ThemeProvider', () => {
  it('hands the resolved theme to the tree below it, so nodes need no listener of their own', () => {
    useSettingsStore.getState().update({ theme: 'dark' });
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current).toBe('dark');
  });

  it('falls back to light without a provider', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current).toBe('light');
  });
});
