import * as Dialog from '@radix-ui/react-dialog';
import { useId, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { normalizeBaseUrl } from '../api/youtrack';
import type { Settings } from '../auth/storage';
import { PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_INPUT } from './controls';
import { CloseIcon } from './icons';

// Only the connection settings are typed in here; the rest are toolbar controls.
type TextSetting = 'baseUrl' | 'clientId' | 'permanentToken';

function Field({
  label,
  hint,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  type?: string;
  onChange(value: string): void;
}) {
  const hintId = useId();
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? hintId : undefined}
        className={`${TEXT_INPUT} w-full font-mono`}
      />
      {hint && (
        <span id={hintId} className="mt-1 block text-xs text-muted">
          {hint}
        </span>
      )}
    </label>
  );
}

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

  const set = (key: TextSetting) => (value: string) => setDraft({ ...draft, [key]: value });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label="YouTrack URL" value={draft.baseUrl} placeholder="https://example.youtrack.cloud" onChange={set('baseUrl')} />
      <Field
        label="OAuth client ID (Hub service id)"
        hint="Lets you sign in with your YouTrack account. See docs/setup-youtrack.md."
        value={draft.clientId}
        placeholder="xxxxxxxx-xxxx-…"
        onChange={set('clientId')}
      />
      <div className="border-t border-line pt-4">
        <Field
          label="…or permanent token"
          hint="Used instead of OAuth when set. Create one in YouTrack under Profile → Account Security."
          value={draft.permanentToken}
          placeholder="perm-…"
          type="password"
          onChange={set('permanentToken')}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Dialog.Close asChild>
          <button type="button" className={SECONDARY_BUTTON}>
            Cancel
          </button>
        </Dialog.Close>
        <button type="submit" className={PRIMARY_BUTTON}>
          Save
        </button>
      </div>
    </form>
  );
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange(v: boolean): void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-raised p-5 text-fg shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Settings</Dialog.Title>
              <Dialog.Description className="text-xs text-muted">Stored only in this browser.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="-mr-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-fg focus-visible:outline-2 focus-visible:outline-focus"
              >
                <CloseIcon size={16} />
              </button>
            </Dialog.Close>
          </div>
          <SettingsForm onClose={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
