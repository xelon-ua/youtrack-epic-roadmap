/*
 * Shared looks for the chrome's controls, so they line up at one height (32 px) and share their
 * hover and keyboard focus treatment.
 */

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const BUTTON = `inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;

export const PRIMARY_BUTTON = `${BUTTON} bg-primary text-primary-fg hover:bg-primary-hover`;

export const SECONDARY_BUTTON = `${BUTTON} border border-line bg-raised text-fg hover:bg-sunken`;

export const ICON_BUTTON = `inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-raised text-muted hover:bg-sunken hover:text-fg motion-safe:transition-colors ${FOCUS}`;

export const TEXT_INPUT = `h-8 rounded-md border border-line-strong bg-sunken px-2 text-sm text-fg placeholder:text-muted/70 focus-visible:border-focus ${FOCUS}`;

export const LINK_BUTTON = `cursor-pointer font-medium underline underline-offset-2 hover:no-underline rounded-sm ${FOCUS}`;
