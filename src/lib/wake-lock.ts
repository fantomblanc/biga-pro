import { useEffect, useRef, useState } from "react";

// Minimal Wake Lock hook. Silently no-ops on unsupported browsers.
export function useWakeLock(active: boolean) {
  const [supported, setSupported] = useState(false);
  const [locked, setLocked] = useState(false);
  const sentinelRef = useRef<any>(null);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "wakeLock" in navigator);
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;

    async function acquire() {
      try {
        const s = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<any> } }).wakeLock.request("screen");
        if (cancelled) {
          s.release();
          return;
        }
        sentinelRef.current = s;
        setLocked(true);
        s.addEventListener("release", () => setLocked(false));
      } catch {
        setLocked(false);
      }
    }

    async function release() {
      if (sentinelRef.current) {
        try {
          await sentinelRef.current.release();
        } catch { /* noop */ }
        sentinelRef.current = null;
        setLocked(false);
      }
    }

    const onVisibility = () => {
      if (active && document.visibilityState === "visible") acquire();
    };

    if (active) acquire();
    else release();

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [active, supported]);

  return { supported, locked };
}
