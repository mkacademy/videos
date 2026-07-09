/** Inserts `text` at the current selection in `textarea`, or at the end if none. Empty `text` removes the selection. No-op when `textarea` is null. */
export function insertTextAtTextareaCursor(
  textarea: HTMLTextAreaElement | null,
  text: string,
): void {
  if (!textarea) return;
  const wasDisabled = textarea.disabled;
  if (wasDisabled) textarea.disabled = false;
  try {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = before + text + after;
    const caret = start + text.length;
    textarea.setSelectionRange(caret, caret);
    textarea.focus();
  } finally {
    if (wasDisabled) textarea.disabled = true;
  }
}
