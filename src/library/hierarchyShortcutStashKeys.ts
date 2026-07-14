/**
 * Pure PNC hierarchy shortcut stash key helpers.
 * Kept free of ShortcutsUtils / UiuxManager imports to avoid TDZ cycles at module init.
 */

/**
 * PNC shortcut stash keys after `withHierarchyStamp`:
 * `Joined_items|Unjoined_items|Escrowed_items-<unixSeconds>-<webappIndex>-<hierarchyIndex>`.
 */
const JOIN_UNJOIN_HIERARCHY_STASH_KEY =
  /^(Joined_items|Unjoined_items|Escrowed_items)-(\d+)-(\d+)-(\d+)$/;

export const parseHierarchyStampedStashKey = (
  timestamp: string
): { base: string; webappIndex: number; hierarchyIndex: number } | null => {
  const m = timestamp.match(JOIN_UNJOIN_HIERARCHY_STASH_KEY);
  if (!m) return null;
  const [, flavor, sec, webapp, hierarchy] = m;
  return {
    base: `${flavor}-${sec}`,
    webappIndex: Number(webapp),
    hierarchyIndex: Number(hierarchy),
  };
};

/** Unix seconds embedded in `Joined_items|Unjoined_items|Escrowed_items-<seconds>-…` stash bases. */
export const hierarchyShortcutStashBaseUnixSeconds = (base: string): number => {
  const m = base.match(/^(?:Joined_items|Unjoined_items|Escrowed_items)-(\d+)$/i);
  return m ? Number(m[1]) : 0;
};

/** `parseHierarchyStampedStashKey` base is a Ctrl+Shift+U unjoin stash (`Unjoined_items-<seconds>`). */
export const isUnjoinedItemsShortcutStashBase = (base: string): boolean =>
  /^Unjoined_items-\d+$/i.test(base);

/** `parseHierarchyStampedStashKey` base is a Ctrl+Shift+J join stash (`Joined_items-<seconds>`). */
export const isJoinedItemsShortcutStashBase = (base: string): boolean =>
  /^Joined_items-\d+$/i.test(base);

/** `Escrowed_items-<seconds>` from UiuxManager `newShortcutEscrowStashTimestamp`. */
export const isEscrowedItemsShortcutStashBase = (base: string): boolean =>
  /^Escrowed_items-\d+$/i.test(base);

/** PNC Ctrl+Shift+Z: `Unjoined_items` (D) and `Escrowed_items` (Y) only — not join stash. */
export const isUnstashEligibleShortcutStashBase = (base: string): boolean =>
  isUnjoinedItemsShortcutStashBase(base) || isEscrowedItemsShortcutStashBase(base);

/** PNC Ctrl+Shift+X: all hierarchy shortcut stash flavors including `Joined_items` (J). */
export const isDeleteEligibleShortcutStashBase = (base: string): boolean =>
  isUnstashEligibleShortcutStashBase(base) || isJoinedItemsShortcutStashBase(base);

/**
 * Sort key for Ctrl+Shift+Z PNC unstash: newest of `Unjoined_items` (D) or `Escrowed_items` (Y) by unix seconds.
 */
export const shortcutUnstashStashBaseSortKey = (base: string): number => {
  const u = base.match(/^Unjoined_items-(\d+)$/i);
  if (u) return Number(u[1]);
  const e = base.match(/^Escrowed_items-(\d+)$/i);
  return e ? Number(e[1]) : -1;
};
