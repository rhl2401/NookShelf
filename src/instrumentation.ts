export async function register() {
  // Only run in the actual Node.js server process, not the edge runtime or build step.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runNotificationChecks } = await import("@/lib/notifications");
  const HOUR_MS = 60 * 60 * 1000;

  const globalForScheduler = globalThis as unknown as { notificationSchedulerStarted?: boolean };
  if (globalForScheduler.notificationSchedulerStarted) return;
  globalForScheduler.notificationSchedulerStarted = true;

  const run = () => {
    runNotificationChecks().catch((err) => {
      console.error("Notification check failed:", err);
    });
  };

  setTimeout(run, 30_000);
  setInterval(run, HOUR_MS);
}
