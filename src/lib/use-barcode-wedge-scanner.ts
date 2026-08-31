import { useEffect, useRef } from "react";

const MAX_KEY_INTERVAL_MS = 50; // far faster than any human can type consistently
const MIN_CODE_LENGTH = 4;

/**
 * Listens for input from a "keyboard wedge" barcode scanner — hardware that
 * emulates a keyboard, typing the scanned code as a fast burst of keystrokes
 * followed by Enter. Works regardless of what's focused on the page, since
 * the scanner doesn't know or care what element has focus.
 *
 * Distinguishes a scan from normal typing purely by speed: keystrokes more
 * than MAX_KEY_INTERVAL_MS apart reset the buffer, so genuine human typing
 * (even fast typing) never accidentally triggers it.
 */
export function useBarcodeWedgeScanner(onScan: (code: string) => void, enabled = true) {
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const now = performance.now();
      const elapsedSinceLastKey = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current;
        bufferRef.current = "";
        if (code.length >= MIN_CODE_LENGTH && elapsedSinceLastKey <= MAX_KEY_INTERVAL_MS) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(code);
        }
        return;
      }

      if (e.key.length !== 1) return; // ignore Shift, Tab, arrow keys, etc.

      if (elapsedSinceLastKey > MAX_KEY_INTERVAL_MS) {
        bufferRef.current = ""; // gap too long to be the same scan — start over
      }
      bufferRef.current += e.key;

      // Once a fast sequence is clearly underway, stop it from also landing
      // in whatever text field happens to be focused.
      if (bufferRef.current.length >= 3) {
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled]);
}
