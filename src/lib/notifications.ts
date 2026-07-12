// Web notifications helper. All local, no service worker required for foreground.

export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  const p = await Notification.requestPermission();
  return p;
}

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
}

interface ScheduledTimer {
  id: string;
  timeoutId: ReturnType<typeof setTimeout>;
}

const scheduled: Map<string, ScheduledTimer[]> = new Map();

export function scheduleNotification(recipeId: string, key: string, timeISO: string, title: string, body: string) {
  if (!canNotify()) return;
  const delay = new Date(timeISO).getTime() - Date.now();
  if (delay <= 0) return;
  // Browsers cap timeouts around ~24.8 days
  if (delay > 2_000_000_000) return;
  const timeoutId = setTimeout(() => {
    try {
      new Notification(title, { body, tag: `${recipeId}-${key}` });
    } catch { /* noop */ }
  }, delay);
  const list = scheduled.get(recipeId) ?? [];
  list.push({ id: key, timeoutId });
  scheduled.set(recipeId, list);
}

export function clearScheduled(recipeId: string) {
  const list = scheduled.get(recipeId);
  if (!list) return;
  list.forEach((t) => clearTimeout(t.timeoutId));
  scheduled.delete(recipeId);
}
