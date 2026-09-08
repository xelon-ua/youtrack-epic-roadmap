import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueIdInput } from '../../src/ui/IssueIdInput';
import { useRoadmapStore } from '../../src/store/roadmapStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { DEFAULT_SETTINGS } from '../../src/auth/storage';

const HISTORY = [
  { id: 'WMS-42', summary: 'Warehouse rollout' },
  { id: 'PLM-7', summary: 'Catalogue cleanup' },
  { id: 'WMS-9', summary: '' },
];

type Build = (issueId: string) => Promise<void>;
let build: Mock<Build>;

beforeEach(() => {
  localStorage.clear();
  build = vi.fn<Build>(async () => {});
  useRoadmapStore.setState({ issueId: '', status: 'idle', roadmap: null, error: null, progress: 0, build });
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
});

const withHistory = () =>
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, recentIssues: HISTORY } });

const input = () => screen.getByLabelText('Issue ID');
const open = () => fireEvent.focus(input());

describe('IssueIdInput', () => {
  it('builds the typed issue id on submit', () => {
    render(<IssueIdInput />);
    fireEvent.change(input(), { target: { value: 'wms-1' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(build).toHaveBeenCalledWith('wms-1');
  });

  it('prefills the input with the most recently built issue', () => {
    withHistory();
    render(<IssueIdInput />);
    expect(input()).toHaveValue('WMS-42');
  });

  it('prefers the issue id already in the store over the remembered one', () => {
    withHistory();
    useRoadmapStore.setState({ issueId: 'WMS-1' });
    render(<IssueIdInput />);
    expect(input()).toHaveValue('WMS-1');
  });

  it('lists the remembered issues with their summaries when the input is focused', () => {
    withHistory();
    render(<IssueIdInput />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    open();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('WMS-42');
    expect(options[0]).toHaveTextContent('Warehouse rollout');
    expect(options[1]).toHaveTextContent('PLM-7');
  });

  it('offers no list when nothing has been built yet', () => {
    render(<IssueIdInput />);
    open();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters the list by id or summary, ignoring case', () => {
    withHistory();
    render(<IssueIdInput />);
    open();

    fireEvent.change(input(), { target: { value: 'wms' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toHaveLength(2);

    fireEvent.change(input(), { target: { value: 'catalogue' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('PLM-7');
  });

  it('hides the list when nothing matches what was typed', () => {
    withHistory();
    render(<IssueIdInput />);
    open();
    fireEvent.change(input(), { target: { value: 'nothing-like-this' } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('builds the issue picked from the list and closes it', () => {
    withHistory();
    render(<IssueIdInput />);
    open();
    fireEvent.mouseDown(screen.getByRole('option', { name: /PLM-7/ }));

    expect(build).toHaveBeenCalledWith('PLM-7');
    expect(input()).toHaveValue('PLM-7');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('builds the issue highlighted with the arrow keys on Enter', () => {
    withHistory();
    render(<IssueIdInput />);
    open();
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(screen.getByRole('option', { name: /WMS-42/ })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(build).toHaveBeenCalledWith('WMS-42');
  });

  it('submits what was typed when Enter is pressed with nothing highlighted', () => {
    withHistory();
    render(<IssueIdInput />);
    open();
    fireEvent.change(input(), { target: { value: 'WMS-99' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(build).toHaveBeenCalledWith('WMS-99');
  });

  it('closes the list on Escape without building', () => {
    withHistory();
    render(<IssueIdInput />);
    open();
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(build).not.toHaveBeenCalled();
  });

  it('closes the list when the input loses focus', () => {
    withHistory();
    render(<IssueIdInput />);
    open();
    fireEvent.blur(input());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('tells assistive technology whether the list is open', () => {
    withHistory();
    render(<IssueIdInput />);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    open();
    expect(input()).toHaveAttribute('aria-expanded', 'true');
  });
});
