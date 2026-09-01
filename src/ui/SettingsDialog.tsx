import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { normalizeBaseUrl } from '../api/youtrack';
import type { Settings } from '../auth/storage';

/** Mounted fresh every time the dialog opens, so the draft always starts from the saved settings. */
function SettingsForm({ onClose }: { onClose(): void }) {
  const { settings, update } = useSettingsStore();
  const [draft, setDraft] = useState<Settings>(settings);

  const save = () => {
    update({
      baseUrl: draft.baseUrl.trim() ? normalizeBaseUrl(draft.baseUrl) : '',
      clientId: draft.clientId.trim(),
      permanentToken: draft.permanentToken.trim(),
    });
    onClose();
  };

  const field = (label: string, key: keyof Settings, placeholder: string, type = 'text') => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={draft[key]}
        placeholder={placeholder}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        className="w-full rounded border px-2 py-1 font-mono"
      />
    </label>
  );

  return (
    <>
      {field('YouTrack URL', 'baseUrl', 'https://example.youtrack.cloud')}
      {field('OAuth client ID (Hub service id)', 'clientId', 'xxxxxxxx-xxxx-…')}
      <div className="border-t pt-3">
        {field('…or permanent token (used instead of OAuth)', 'permanentToken', 'perm-…', 'password')}
      </div>
      <div className="flex justify-end gap-2">
        <Dialog.Close asChild>
          <button type="button" className="rounded border px-3 py-1">
            Cancel
          </button>
        </Dialog.Close>
        <button type="button" onClick={save} className="rounded bg-blue-600 px-3 py-1 text-white">
          Save
        </button>
      </div>
    </>
  );
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange(v: boolean): void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[28rem] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded bg-white p-5 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Settings</Dialog.Title>
          <Dialog.Description className="text-xs text-gray-500">Stored only in this browser.</Dialog.Description>
          <SettingsForm onClose={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
