import { useCallback, useEffect, useRef, useState } from "react";
import type { BannerClipboardKind } from "../library/EncodingVerifierUtils";
import { getClipboardHasBannerToken } from "../library/EncodingVerifierUtils";

const CLIPBOARD_GESTURE_SESSION_KEY = "banner-clipboard-gesture-ok";
/** Minimum time after a clipboard read starts before the UI may show the copy icon (reduces flash). */
const CLIPBOARD_COPY_ICON_REVEAL_DELAY_MS = 1000;

function readGestureUnlockedFromSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CLIPBOARD_GESTURE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markGestureUnlockedInSession(): void {
  try {
    sessionStorage.setItem(CLIPBOARD_GESTURE_SESSION_KEY, "1");
  } catch {
    /* private mode / quota */
  }
}

/**
 * Tracks whether this banner’s id token is already on the clipboard (comma‑separated list).
 * The first clipboard read in a tab waits for a user gesture (pointer or key) so the browser
 * does not prompt for permission on cold load. That unlock is stored for the session so
 * navigating away and back still re-reads the clipboard without another gesture.
 *
 * `clipboardCheckComplete` is false until the in-flight read for the current banner finishes
 * and at least {@link CLIPBOARD_COPY_ICON_REVEAL_DELAY_MS} ms have passed since the read started,
 * so the copy icon appears only after a steady delay when it should be shown.
 *
 * When {@link showCopyIcons} is false or clipboard consent was not given, the clipboard is never read.
 */
export function useBannerIdOnClipboard(
  kind: BannerClipboardKind,
  id: number,
  showCopyIcons: boolean,
  aquiredClipboardConsent: boolean,
) {
  const [isOnClipboard, setIsOnClipboard] = useState(false);
  const [clipboardCheckComplete, setClipboardCheckComplete] = useState(false);
  const hasInteractedRef = useRef(readGestureUnlockedFromSession());
  const kindIdRef = useRef({ kind, id });
  kindIdRef.current = { kind, id };

  const canReadClipboard = showCopyIcons && aquiredClipboardConsent;

  const recheck = useCallback(() => {
    if (!canReadClipboard || !hasInteractedRef.current) return;
    const { kind: k, id: i } = kindIdRef.current;
    void getClipboardHasBannerToken(k, i, showCopyIcons, aquiredClipboardConsent).then(setIsOnClipboard);
  }, [canReadClipboard, showCopyIcons, aquiredClipboardConsent]);

  useEffect(() => {
    if (!canReadClipboard) {
      setIsOnClipboard(false);
      setClipboardCheckComplete(true);
      return;
    }
    if (!hasInteractedRef.current) return;
    setClipboardCheckComplete(false);
    let cancelled = false;
    let revealTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    void getClipboardHasBannerToken(kind, id, showCopyIcons, aquiredClipboardConsent)
      .then((on) => {
        if (!cancelled) setIsOnClipboard(on);
      })
      .catch(() => {
        if (!cancelled) setIsOnClipboard(false);
      })
      .finally(() => {
        if (cancelled) return;
        const wait = Math.max(
          0,
          CLIPBOARD_COPY_ICON_REVEAL_DELAY_MS - (Date.now() - startedAt),
        );
        revealTimeoutId = setTimeout(() => {
          if (!cancelled) setClipboardCheckComplete(true);
        }, wait);
      });
    return () => {
      cancelled = true;
      if (revealTimeoutId !== undefined) clearTimeout(revealTimeoutId);
    };
  }, [kind, id, canReadClipboard, showCopyIcons, aquiredClipboardConsent]);

  useEffect(() => {
    if (!canReadClipboard) return;
    if (hasInteractedRef.current) return;

    let effectCancelled = false;
    let revealTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const unlock = () => {
      if (hasInteractedRef.current) return;
      hasInteractedRef.current = true;
      markGestureUnlockedInSession();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      const { kind: k, id: i } = kindIdRef.current;
      const startedAt = Date.now();
      void getClipboardHasBannerToken(k, i, showCopyIcons, aquiredClipboardConsent)
        .then((on) => {
          if (!effectCancelled) setIsOnClipboard(on);
        })
        .catch(() => {
          if (!effectCancelled) setIsOnClipboard(false);
        })
        .finally(() => {
          if (effectCancelled) return;
          const wait = Math.max(
            0,
            CLIPBOARD_COPY_ICON_REVEAL_DELAY_MS - (Date.now() - startedAt),
          );
          revealTimeoutId = setTimeout(() => {
            if (!effectCancelled) setClipboardCheckComplete(true);
          }, wait);
        });
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);

    return () => {
      effectCancelled = true;
      if (revealTimeoutId !== undefined) clearTimeout(revealTimeoutId);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [canReadClipboard, showCopyIcons, aquiredClipboardConsent]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", recheck);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", recheck);
    };
  }, [recheck]);

  return { isOnClipboard, recheck, clipboardCheckComplete };
}
